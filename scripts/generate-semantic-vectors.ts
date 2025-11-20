import { SemanticVectorService } from "../src/lib/semantic-vector";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function run() {
  try {
    console.log("🚀 Starting semantic vector generation...\n");

    // 1. Update file-level vectors
    console.log("📄 Step 1: Updating file-level vectors...");
    await SemanticVectorService.batchUpdateSemanticVectors();
    console.log("✅ File-level vectors updated\n");

    // 2. Update chunk-level vectors for all files
    console.log("📦 Step 2: Updating chunk-level vectors...");
    const files = await prisma.fileList.findMany({
      select: { id: true },
    });

    console.log(`Found ${files.length} files to process...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await SemanticVectorService.generateChunkVectors(file.id);
        if ((i + 1) % 10 === 0) {
          console.log(`  ✓ Processed ${i + 1}/${files.length} files...`);
        }
      } catch (error) {
        console.error(`  ❌ Error processing file ${file.id}:`, error);
      }
    }

    console.log("\n✅ Chunk-level vectors updated");
    console.log("\n🎉 Semantic vector generation completed!");
  } catch (error) {
    console.error("❌ Semantic vector generation failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
