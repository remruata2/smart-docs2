#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function main() {
  const args = process.argv.slice(2);
  const fileArg = args[0];
  const listAll = args.includes('--list');
  const outIdx = args.indexOf('--out');
  const outPathArg = outIdx !== -1 ? args[outIdx + 1] : null;

  if (!fileArg) {
    console.error('Usage: node extract_ids.js <path-to-sqlrows.md> [--list] [--out <path>]');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  const text = fs.readFileSync(filePath, 'utf8');

  const lines = text.split(/\r?\n/);
  const idRegex = /^\(\s*(\d+)\s*,/; // capture the ID inside leading parenthesis
  const ids = [];

  for (const line of lines) {
    const m = idRegex.exec(line);
    if (m) {
      ids.push(Number(m[1]));
    }
  }

  const total = ids.length;
  const uniqSet = new Set(ids);
  const unique = uniqSet.size;
  let min = null, max = null;
  for (const id of ids) {
    if (min === null || id < min) min = id;
    if (max === null || id > max) max = id;
  }

  const freq = new Map();
  for (const id of ids) freq.set(id, (freq.get(id) || 0) + 1);
  const duplicates = Array.from(freq.entries()).filter(([_, c]) => c > 1);
  duplicates.sort((a, b) => b[1] - a[1] || a[0] - b[0]);

  const topDupSample = duplicates.slice(0, 10).map(([id, c]) => `${id}:${c}`);

  const result = {
    file: filePath,
    total_ids: total,
    unique_ids: unique,
    min_id: min,
    max_id: max,
    duplicate_id_count: duplicates.length,
    top_duplicates: topDupSample,
  };

  if (listAll) {
    result.ids = ids; // include all IDs in JSON output
  }

  // If output path is specified, write newline-separated IDs there
  if (outPathArg) {
    const outPath = path.resolve(process.cwd(), outPathArg);
    try {
      fs.writeFileSync(outPath, ids.join('\n') + '\n', 'utf8');
      result.wrote_ids_to = outPath;
    } catch (e) {
      result.write_error = String(e);
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
