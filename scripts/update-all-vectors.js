#!/usr/bin/env node

// Register ts-node to allow requiring TypeScript modules from JS
require("ts-node").register({ transpileOnly: true });

const { SemanticVectorService } = require("../src/lib/semantic-vector.ts");
const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function updateAllVectors() {
  try {
    console.log("🚀 Starting update of all vectors (tsvector and semantic)...");

    // Update tsvector
    console.log("\n🧹 Rebuilding tsvector (search_vector) for file_list...");

    const total = (await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM file_list`))[0].c;
    const missingTsvBefore = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS c FROM file_list WHERE search_vector IS NULL`
    ))[0].c;
    console.log(`Total rows: ${total} | Missing search_vector before: ${missingTsvBefore}`);

    const tsvSql = `
      UPDATE file_list
      SET search_vector = to_tsvector('english',
        COALESCE('District: ' || district, '') || ' | ' ||
        COALESCE('Title: ' || title, '') || ' | ' ||
        COALESCE('Category: ' || category, '') || ' | ' ||
        COALESCE('Content: ' || note, '') || ' | ' ||
        COALESCE(entry_date, '') || ' ' ||
        COALESCE(EXTRACT(YEAR FROM entry_date_real)::text, '')
      )
    `;

    const tsvResult = await prisma.$executeRawUnsafe(tsvSql);
    console.log(`Tsvector rows updated: ${tsvResult}`);

    const missingTsvAfter = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS c FROM file_list WHERE search_vector IS NULL`
    ))[0].c;
    console.log(`Missing search_vector after: ${missingTsvAfter}`);

    // Update semantic vectors
    await SemanticVectorService.batchUpdateSemanticVectors();

    console.log("🎉 All vector updates completed!");
  } catch (error) {
    console.error("❌ Vector update failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateAllVectors();