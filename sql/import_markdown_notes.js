#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function pickDollarTag(content) {
  // Try tags $md$, $md1$, $md2$ ... until not found in content
  for (let i = 0; i < 10; i++) {
    const tag = i === 0 ? 'md' : `md${i}`;
    const opener = `$${tag}$`;
    if (!content.includes(opener)) return tag;
  }
  // Fallback to a longer random tag
  let suffix = Math.random().toString(36).slice(2);
  while (content.includes(`$${suffix}$`)) {
    suffix = Math.random().toString(36).slice(2);
  }
  return suffix;
}

function buildBatchSQL(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const updates = [];
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const m = ent.name.match(/^(\d+)-enhanced\.md$/);
    if (!m) continue;
    const id = Number(m[1]);
    const filePath = path.join(dir, ent.name);
    const content = fs.readFileSync(filePath, 'utf8');
    const tag = pickDollarTag(content);
    // Use PostgreSQL dollar-quoting to safely embed full markdown, preserving newlines.
    const sql = `UPDATE file_list\nSET note = $${tag}$${content}$${tag}$\nWHERE id = ${id};`;
    updates.push(sql);
  }
  const header = [
    'BEGIN;',
    "-- Ensure file_list exists and has expected columns",
    // No-op guard: if id doesn't exist, UPDATE affects 0 rows.
  ].join('\n');
  const footer = [
    'COMMIT;',
  ].join('\n');
  return [header, ...updates, footer].join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const dirArg = args[0] || path.resolve(process.cwd(), 'html');
  const dir = path.isAbsolute(dirArg) ? dirArg : path.resolve(process.cwd(), dirArg);
  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  const sql = buildBatchSQL(dir);

  const psql = spawn('psql', [
    '-h','localhost','-p','5432','-U','postgres','-d','cid_ai','-v','ON_ERROR_STOP=1'
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  psql.stdin.write(sql);
  psql.stdin.end();

  psql.on('exit', (code) => {
    if (code === 0) {
      console.log('\nNotes import completed successfully.');
    } else {
      console.error(`\npsql exited with code ${code}`);
      process.exit(code);
    }
  });
}

main();
