#!/usr/bin/env node

import { SemanticVectorService } from "../src/lib/semantic-vector.js";

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
