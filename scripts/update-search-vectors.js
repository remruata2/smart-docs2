/*
  Rebuilds tsvector (search_vector) for all rows in file_list.
  Safe to run multiple times. Uses the same expression as used on create/update in
  `src/app/admin/files/actions.ts`.
*/

const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  console.log("\n🧹 Rebuilding tsvector (search_vector) for file_list...");

  const total = (await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM file_list`))[0].c;
  const missingBefore = (await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS c FROM file_list WHERE search_vector IS NULL`
  ))[0].c;
  console.log(`Total rows: ${total} | Missing search_vector before: ${missingBefore}`);

  const sql = `
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

  // Execute UPDATE (for all rows)
  const result = await prisma.$executeRawUnsafe(sql);
  console.log(`Rows updated: ${result}`);

  const missingAfter = (await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS c FROM file_list WHERE search_vector IS NULL`
  ))[0].c;
  console.log(`Missing search_vector after: ${missingAfter}`);

  console.log("✅ Done rebuilding tsvector.\n");
}

main()
  .catch((e) => {
    console.error("❌ Rebuild failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
