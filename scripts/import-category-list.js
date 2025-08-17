#!/usr/bin/env node
/*
Parses sql/category_list_postgres.sql and upserts rows into the Prisma-managed
`category_list` table by unique `file_no`.
- Does NOT drop or recreate tables.
- Preserves timestamps and Prisma constraints.
*/

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env for DATABASE_URL if present
dotenv.config();

const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const sqlPath = path.resolve(__dirname, '..', 'sql', 'category_list_postgres.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found at ${sqlPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(sqlPath, 'utf8');

  // Extract tuples of (id, 'file_no', 'category') from the VALUES list
  const tupleRegex = /\(\s*\d+\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/g;
  let match;
  const rows = [];
  while ((match = tupleRegex.exec(content)) !== null) {
    const file_no = match[1].trim();
    const category = match[2].trim();
    if (file_no && category) {
      rows.push({ file_no, category });
    }
  }

  if (rows.length === 0) {
    console.error('No rows parsed from SQL file. Make sure it contains INSERT VALUES with (id, \"file_no\", \"category\").');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const doTruncate = args.includes('--truncate');
  const doUpsert = args.includes('--upsert');

  console.log(`Parsed ${rows.length} rows. Options: truncate=${doTruncate}, upsert=${doUpsert}`);

  if (doTruncate) {
    console.log('Truncating category_list...');
    await prisma.categoryList.deleteMany({});
  }

  if (doUpsert) {
    console.log('Import mode: upsert by file_no (deduplicate by last occurrence).');
    const byFileNo = new Map();
    for (const r of rows) byFileNo.set(r.file_no, r.category);
    const deduped = Array.from(byFileNo.entries()).map(([file_no, category]) => ({ file_no, category }));
    if (deduped.length !== rows.length) {
      console.log(`Found ${rows.length - deduped.length} duplicate file_no entries. Using last occurrence per file_no.`);
    }
    let processed = 0;
    for (const { file_no, category } of deduped) {
      try {
        await prisma.categoryList.upsert({ where: { file_no }, create: { file_no, category }, update: { category } });
      } catch (e) {
        try {
          await prisma.categoryList.update({ where: { file_no }, data: { category } });
        } catch (e2) {
          await prisma.categoryList.create({ data: { file_no, category } });
        }
      }
      processed += 1;
      if (processed % 50 === 0 || processed === deduped.length) {
        console.log(`Imported ${processed} / ${deduped.length}...`);
      }
    }
  } else {
    console.log('Import mode: insert-all (duplicates allowed).');
    // Insert in batches
    const batchSize = 200;
    let processed = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await prisma.categoryList.createMany({ data: batch, skipDuplicates: false });
      processed += batch.length;
      console.log(`Imported ${processed} / ${rows.length}...`);
    }
  }

  console.log('Import complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
