import { pipeline } from "@xenova/transformers";
// Use explicit file path to avoid ESM directory import issues under ts-node
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

export class SemanticVectorService {
  private static embedder: any = null;

  static async initialize() {
    if (!this.embedder) {
      console.log("Initializing semantic embedder...");
      this.embedder = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );
      console.log("Semantic embedder initialized successfully");
    }
  }

  static async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();

    // Prepare text for embedding while preserving Markdown structure
    const preparedText = text
      .replace(/\n+/g, " ") // Replace multiple newlines with single space
      .trim()
      .substring(0, 1000); // Increased limit to capture more content with structure

    const result = await this.embedder(preparedText, {
      pooling: "mean",
      normalize: true,
    });

    return Array.from(result.data);
  }

  static async updateSemanticVector(fileId: number, content: string) {
    try {
      if (!content || content.trim().length === 0) {
        console.log(
          `Skipping semantic vector update for file ${fileId} - no content`
        );
        return;
      }

      const embedding = await this.generateEmbedding(content);

      await prisma.$executeRaw`
        UPDATE file_list 
        SET semantic_vector = ${embedding}::vector
        WHERE id = ${fileId}
      `;

      console.log(`✅ Updated semantic vector for file ${fileId}`);
    } catch (error) {
      console.error(
        `❌ Failed to update semantic vector for file ${fileId}:`,
        error
      );
      throw error;
    }
  }

  static async semanticSearch(
    query: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const SIMILARITY_THRESHOLD = 0.3; // Only return results with >30% similarity

      const results = (await prisma.$queryRaw`
        SELECT 
          id,
          file_no,
          category,
          title,
          note,
          entry_date_real,
          1 - (semantic_vector <=> ${queryEmbedding}::vector) as similarity
        FROM file_list 
        WHERE semantic_vector IS NOT NULL
          AND (1 - (semantic_vector <=> ${queryEmbedding}::vector)) > ${SIMILARITY_THRESHOLD}
        ORDER BY semantic_vector <=> ${queryEmbedding}::vector
      `) as any[];

      console.log(
        `🔍 Semantic search found ${results.length} results for query: "${query}" (threshold: ${SIMILARITY_THRESHOLD}, no limit)`
      );

      // Log similarity scores for debugging
      if (results.length > 0) {
        console.log(
          `   Similarity scores: ${results
            .map((r) => `${r.file_no}:${(r.similarity * 100).toFixed(1)}%`)
            .join(", ")}`
        );
      }

      return results;
    } catch (error) {
      console.error("Semantic search error:", error);
      return [];
    }
  }

  static async batchUpdateSemanticVectors() {
    try {
      console.log("🔄 Starting batch semantic vector update (NULL-only, with fallbacks)...");

      // Count rows missing semantic_vector before
      const missingBeforeRes = (await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS c FROM file_list WHERE semantic_vector IS NULL`
      )) as Array<{ c: number }>;
      const missingBefore = missingBeforeRes[0]?.c ?? 0;
      console.log(`📊 Missing semantic_vector before: ${missingBefore}`);

      // Fetch only rows where semantic_vector is NULL, use raw SQL since Prisma can't filter Unsupported(vector)
      const records = (await prisma.$queryRawUnsafe(
        `SELECT id, note, title, category, file_no, entry_date FROM file_list WHERE semantic_vector IS NULL`
      )) as Array<{
        id: number;
        note: string | null;
        title?: string | null;
        category?: string | null;
        file_no?: string | null;
        entry_date?: string | null;
      }>;

      console.log(`📦 Rows to process: ${records.length}`);

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        // Build fallback content: prefer note (rich), else plain text, then metadata
        const parts = [r.note, r.title, r.category, r.file_no, r.entry_date]
          .filter((v) => !!v && String(v).trim().length > 0) as string[];
        const content = parts.join(" ").trim();

        if (content.length === 0) {
          console.log(
            `Skipping file ${r.id} — no usable text (note/note_plain_text/title/category/file_no all empty)`
          );
          continue;
        }

        await this.updateSemanticVector(r.id, content);

        if ((i + 1) % 10 === 0) {
          console.log(`Progress: ${i + 1}/${records.length} records processed`);
        }
      }

      // Count rows missing semantic_vector after
      const missingAfterRes = (await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS c FROM file_list WHERE semantic_vector IS NULL`
      )) as Array<{ c: number }>;
      const missingAfter = missingAfterRes[0]?.c ?? 0;
      console.log(`✅ Batch semantic vector update completed. Remaining NULL: ${missingAfter}`);
    } catch (error) {
      console.error("❌ Batch update failed:", error);
      throw error;
    }
  }
}
