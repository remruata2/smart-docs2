import { SemanticVectorService } from "../src/lib/semantic-vector";

async function run() {
  try {
    console.log("🚀 Starting semantic vector generation...");
    await SemanticVectorService.batchUpdateSemanticVectors();
    console.log("🎉 Semantic vector generation completed!");
  } catch (error) {
    console.error("❌ Semantic vector generation failed:", error);
    process.exit(1);
  }
}

run();
