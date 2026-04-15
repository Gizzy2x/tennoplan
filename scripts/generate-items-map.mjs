/**
 * Prebuild script: generates src/lib/icons/items-map.json
 *
 * Uses @wfcd/items (Node.js-only, reads local JSON files) to produce a
 * slim lookup map of { [uniqueName]: { name, category, imageName } }.
 * The browser app imports this static JSON — zero runtime cost, works offline.
 *
 * Run: node scripts/generate-items-map.mjs
 * Or:  npm run generate-items
 */

import Items from '@wfcd/items';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../src/lib/icons/items-map.json');

console.log('📦 Loading @wfcd/items...');
const all = new Items();
console.log(`   Loaded ${all.length} items.`);

/** @type {Record<string, { name: string; category: string; imageName: string }>} */
const map = {};
let skipped = 0;

for (const item of all) {
  if (!item.imageName) {
    skipped++;
    continue;
  }
  map[item.uniqueName] = {
    name: item.name,
    category: item.category ?? 'Misc',
    imageName: item.imageName,
  };
}

const count = Object.keys(map).length;
console.log(`   Mapped ${count} items (${skipped} skipped — no imageName).`);

mkdirSync(resolve(__dirname, '../src/lib/icons'), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(map, null, 0), 'utf-8');

const kb = Math.round(Buffer.byteLength(JSON.stringify(map)) / 1024);
console.log(`✅ Written to src/lib/icons/items-map.json (${kb} KB, ${count} entries)`);
