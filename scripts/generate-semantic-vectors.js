#!/usr/bin/env node

// Register ts-node to allow requiring TypeScript modules from JS
require("ts-node").register({ transpileOnly: true });

const { SemanticVectorService } = require("../src/lib/semantic-vector.ts");

async function generateSemanticVectors() {
  try {
    console.log("🚀 Starting semantic vector generation...");

    await SemanticVectorService.batchUpdateSemanticVectors();

    console.log("🎉 Semantic vector generation completed!");
  } catch (error) {
    console.error("❌ Semantic vector generation failed:", error);
    process.exit(1);
  }
}

generateSemanticVectors();
