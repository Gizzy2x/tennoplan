// Scratch audit for the PE+ overlay output (Codex v2 phase A verification).
// 1) Lists synthesized items (iconUrl === '' && matched in PE+).
// 2) Field-by-field diff of blob stats vs live WFCD for sample weapons,
//    to explain the Weapon statDivergence count.
import { readFileSync } from 'node:fs';

const blob = JSON.parse(readFileSync('dist/codex/current.json', 'utf8'));
const p = 'node_modules/warframe-public-export-plus/';
const peWeapons = JSON.parse(readFileSync(p + 'ExportWeapons.json', 'utf8'));
const peMods = JSON.parse(readFileSync(p + 'ExportUpgrades.json', 'utf8'));

// ── Synthesized items ──
const synthesized = blob.filter((i) => i.iconUrl === '' && (peWeapons[i.uniqueName] || peMods[i.uniqueName] || i.category === 'Warframe' || i.category === 'Arcane'));
console.log(`synthesized (${synthesized.length}):`);
for (const s of synthesized) {
  console.log(`  [${s.category}] ${s.name}  <-  ${s.uniqueName}  (subtype: ${s.subtype ?? '-'}, mr: ${s.masteryRank ?? '-'})`);
}

// ── Stat diff vs live WFCD for sample weapons ──
const samples = ['Braton Prime', 'Lex Prime', 'Skana'];
const res = await fetch('https://api.warframestat.us/weapons?only=name,uniqueName,totalDamage,criticalChance,criticalMultiplier,procChance,fireRate,magazineSize,reloadTime,accuracy,omegaAttenuation,masteryReq');
const wfcd = await res.json();
const wfcdByName = new Map(wfcd.map((w) => [w.name, w]));

for (const name of samples) {
  const w = wfcdByName.get(name);
  if (!w) { console.log(`\n${name}: not in WFCD response`); continue; }
  const b = blob.find((i) => i.uniqueName === w.uniqueName);
  const pe = peWeapons[w.uniqueName];
  if (!b || !pe) { console.log(`\n${name}: missing blob/pe record`); continue; }
  console.log(`\n${name} (${w.uniqueName})`);
  const rows = [
    ['damage',           w.totalDamage,        pe.totalDamage,        b.stats?.damage],
    ['critChance',       w.criticalChance,     pe.criticalChance,     b.stats?.critChance],
    ['critMultiplier',   w.criticalMultiplier, pe.criticalMultiplier, b.stats?.critMultiplier],
    ['statusChance',     w.procChance,         pe.procChance,         b.stats?.statusChance],
    ['fireRate',         w.fireRate,           pe.fireRate,           b.stats?.fireRate],
    ['magazine',         w.magazineSize,       pe.magazineSize,       b.stats?.magazine],
    ['reload',           w.reloadTime,         pe.reloadTime,         b.stats?.reload],
    ['accuracy',         w.accuracy,           pe.accuracy,           b.stats?.accuracy],
    ['rivenDisposition', w.omegaAttenuation,   pe.omegaAttenuation,   b.stats?.rivenDisposition],
  ];
  console.log('  field            | WFCD       | PE+        | blob(now)');
  for (const [f, a, c, d] of rows) {
    const flag = (a !== undefined && c !== undefined && Math.abs(a - c) > 1e-9) ? '  <-- DIVERGED' : '';
    console.log(`  ${String(f).padEnd(16)} | ${String(a).padEnd(10)} | ${String(c).padEnd(10)} | ${String(d).padEnd(10)}${flag}`);
  }
}
