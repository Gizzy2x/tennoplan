/**
 * Prebuild script: generates src/lib/mods/mods-map.json
 *
 * Uses @wfcd/items (Node.js-only, reads local JSON files) to produce a
 * slim lookup map of mod metadata including per-rank levelStats so the
 * Scholar's Arcanum mod page can render the variant rank grid offline.
 *
 * Run: node scripts/generate-mods-map.mjs
 * Or:  npm run generate-mods
 */

import Items from '@wfcd/items';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../src/lib/mods/mods-map.json');

console.log('📦 Loading @wfcd/items...');
const all = new Items();
console.log(`   Loaded ${all.length} items.`);

/** @type {Record<string, {
 *   name: string;
 *   imageName: string | null;
 *   rarity: string;
 *   drain: number;
 *   polarity: string | null;
 *   type: string;
 *   description: string;
 *   levelStats: string[][];
 *   compatName: string;
 *   tradeable: boolean;
 * }>} */
const map = {};
let skipped = 0;

/** Map mod type string → short compat label (shown at bottom of card). */
function extractCompatName(type) {
  const t = (type ?? '').toLowerCase();
  if (t.includes('shotgun'))              return 'SHOTGUN';
  if (t.includes('rifle'))               return 'RIFLE';
  if (t.includes('pistol') || t.includes('secondary')) return 'SECONDARY';
  if (t.includes('melee'))               return 'MELEE';
  if (t.includes('warframe'))            return 'WARFRAME';
  if (t.includes('companion') || t.includes('sentinel')) return 'COMPANION';
  if (t.includes('archwing'))            return 'ARCHWING';
  if (t.includes('aura'))                return 'AURA';
  if (t.includes('stance'))              return 'STANCE';
  if (t.includes('riven'))               return 'RIVEN';
  if (t.includes('exilus'))              return 'EXILUS';
  if (t.includes('arch-gun'))            return 'ARCH-GUN';
  if (t.includes('arch-melee'))          return 'ARCH-MELEE';
  return (type ?? 'MOD').toUpperCase().replace(/ MOD$/i, '').trim() || 'MOD';
}

for (const item of all) {
  if (item.category !== 'Mods') { continue; }
  if (!item.name || !item.uniqueName) { skipped++; continue; }

  // Flatten levelStats: array of { stats: string[] } → string[][]
  const levelStats = Array.isArray(item.levelStats)
    ? item.levelStats.map(ls => (Array.isArray(ls?.stats) ? ls.stats : []))
    : [];

  map[item.uniqueName] = {
    name:        item.name,
    imageName:   item.imageName ?? null,
    rarity:      item.rarity   ?? 'Common',
    drain:       typeof item.drain === 'number' ? item.drain : 0,
    polarity:    item.polarity  ?? null,
    type:        item.type      ?? 'Mod',
    description: item.description ?? '',
    levelStats,
    compatName:  extractCompatName(item.type),
    tradeable:   item.tradeable === true,
  };
}

const count = Object.keys(map).length;
console.log(`   Mapped ${count} mods (${skipped} skipped — no name/uniqueName).`);

mkdirSync(resolve(__dirname, '../src/lib/mods'), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(map, null, 0), 'utf-8');

const kb = Math.round(Buffer.byteLength(JSON.stringify(map)) / 1024);
console.log(`✅ Written to src/lib/mods/mods-map.json (${kb} KB, ${count} mods)`);
