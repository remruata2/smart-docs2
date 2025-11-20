// semantic-vector.ts
import { pipeline } from "@xenova/transformers";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

// Define the model we want to use. 
// 'Xenova/all-MiniLM-L6-v2' is standard for RAG: fast, small (23MB), and accurate.
const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

export class SemanticVectorService {
	// Singleton instance of the embedder pipeline to avoid reloading model on every call
	private static embedder: any = null;

	/**
	 * Initialize the local embedding pipeline.
	 * This downloads the model files (once) and caches them.
	 */
	static async initialize() {
		if (!this.embedder) {
			console.log(`[SEMANTIC] Initializing local embedder model: ${EMBEDDING_MODEL}...`);
			this.embedder = await pipeline("feature-extraction", EMBEDDING_MODEL);
			console.log("[SEMANTIC] Embedder initialized successfully");
		}
	}

	/**
	 * Generates a vector embedding locally using Transformers.js
	 * No API limits, no costs.
	 */
	static async generateEmbedding(text: string): Promise<number[]> {
		await this.initialize();

		if (!text || !text.trim()) {
			throw new Error("Text is required for embedding generation");
		}

		// 1. Pre-process text: 
		// Replace newlines to keep semantic meaning consistent and trim
		const cleanedText = text.replace(/\n+/g, " ").trim();

		// 2. Truncate text to avoid model limits (512 tokens approx ~2000 chars)
		// We truncate to 2000 characters to be safe. 
		// For full document search, you should ideally chunk the document and average the vectors,
		// but for a simple file-level vector, truncating the first 2000 chars (header + summary) works well.
		const truncatedText = cleanedText.substring(0, 2000);

		try {
			// 3. Run inference
			const result = await this.embedder(truncatedText, {
				pooling: "mean", // Average the token vectors to get one sentence vector
				normalize: true, // Important for cosine similarity
			});

			// 4. Convert Float32Array to regular number array
			return Array.from(result.data);
		} catch (error) {
			console.error("[SEMANTIC] Error generating embedding:", error);
			throw error;
		}
	}

	/**
	 * Updates the semantic vector for a specific file.
	 */
	static async updateSemanticVector(fileId: number) {
		try {
			const file = await prisma.fileList.findUnique({
				where: { id: fileId },
				select: { title: true, category: true, note: true },
			});

			if (!file) {
				throw new Error(`File with ID ${fileId} not found`);
			}

			// Combine fields. 
			// Tip: Put the most important keywords (Title/Category) FIRST 
			// because truncation happens at the end.
			const textToEmbed = `Title: ${file.title}. Category: ${file.category}. Content: ${file.note || ""}`;

			console.log(`[SEMANTIC] Generating vector for file ${fileId} (${textToEmbed.length} chars)...`);

			const embedding = await this.generateEmbedding(textToEmbed);

			// Update DB using raw query for pgvector compatibility
			await prisma.$executeRaw`
				UPDATE file_list
				SET semantic_vector = ${JSON.stringify(embedding)}::vector
				WHERE id = ${fileId}
			`;

			console.log(`[SEMANTIC] Successfully updated vector for file ${fileId}`);
		} catch (error) {
			console.error(`[SEMANTIC] Failed to update vector for file ${fileId}:`, error);
			// Don't throw here if this is part of a background batch job, just log it.
			// throw error; 
		}
	}

	/**
	 * Generate semantic vectors for file chunks
	 */
	static async generateChunkVectors(fileId: number) {
		try {
			// Get all chunks for this file
			const chunks = await prisma.fileChunk.findMany({
				where: { file_id: fileId },
				select: { id: true, content: true },
			});

			console.log(`[SEMANTIC] Generating vectors for ${chunks.length} chunks of file ${fileId}...`);

			for (const chunk of chunks) {
				try {
					const embedding = await this.generateEmbedding(chunk.content);

					// Update chunk's semantic vector
					await prisma.$executeRaw`
						UPDATE file_chunks
						SET semantic_vector = ${JSON.stringify(embedding)}::vector
						WHERE id = ${chunk.id}
					`;
				} catch (err) {
					console.error(`[SEMANTIC] Failed to generate vector for chunk ${chunk.id}:`, err);
					// Continue with other chunks
				}
			}

			console.log(`[SEMANTIC] Successfully updated vectors for file ${fileId} chunks`);
		} catch (error) {
			console.error(`[SEMANTIC] Failed to generate chunk vectors for file ${fileId}:`, error);
		}
	}

	/**
	 * Batch/Repair function: Find all files missing vectors and generate them.
	 */
	static async batchUpdateSemanticVectors() {
		console.log("[SEMANTIC] Starting batch update for missing vectors...");

		// Find IDs where vector is NULL
		const records = await prisma.$queryRaw<{ id: number }[]>`
			SELECT id FROM file_list WHERE semantic_vector IS NULL
		`;

		console.log(`[SEMANTIC] Found ${records.length} records to update.`);

		for (const record of records) {
			await this.updateSemanticVector(record.id);
		}

		console.log("[SEMANTIC] Batch update completed.");
	}
}
