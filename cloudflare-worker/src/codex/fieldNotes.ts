// ---------------------------------------------------------------------------
// "Cephalon's Notes" — authored knowledge overlay (Codex Knowledge Layer, B1).
//
// The wedge underframe/Overframe don't do: the practical, own-words knowledge
// the game and most tools never surface — how a thing actually works, what it
// stacks with, what it does NOT affect, the gotchas. Keyed by uniqueName (never
// display name), applied in CI after validation.
//
// Rules:
//   • FACTS ONLY, in our OWN words. Game facts/numbers are free to use; the
//     prose here is original (do not copy wiki sentences). Aimed at new players:
//     a one-line tldr, then the things that actually change a build decision.
//   • status:'beta' until community-vetted. The UI shows a BETA tag + a
//     suggest-a-fix path; Discord feedback → fact-check → flip to 'verified'.
//   • This is the SEED/pilot. It grows over time (and eventually via the
//     community submission + Discord-vet loop, D1). Not every entry needs one —
//     write notes where there's a real interaction/gotcha worth knowing.
// ---------------------------------------------------------------------------

import type { FieldNotes, TennoplanItem } from '../types';

/** uniqueName → authored Cephalon's Notes. */
export const FIELD_NOTES: Record<string, FieldNotes> = {
  // ── Arcanes ──
  '/Lotus/Upgrades/CosmeticEnhancers/Zariman/WarframeOnShieldUptimePowerDuration': {
    tldr: 'While your shields are up, ability duration climbs over time — up to +36% at max rank. Strong on duration-hungry frames.',
    points: [
      'Only builds while you actually have shields. Drop to zero and the bonus resets, then climbs again as shields regenerate.',
      'Does nothing on shieldless frames — Nidus, Inaros, and Kullervo see no benefit.',
      'Stacks on top of your normal Ability Duration mods.',
      'The bonus even ramps up during the mission-load cinematic, so you can start near max if you don’t skip it.',
    ],
    status: 'beta',
  },
  '/Lotus/Upgrades/CosmeticEnhancers/Utility/GolemArcaneRadialEnergyOnEnergyPickup': {
    tldr: 'Arcane Energize: a chance, when you grab an Energy Orb, to restore energy to you and nearby allies.',
    points: [
      'The team-wide energy is the real draw — it’s a staple of support and group builds.',
      'There’s a short cooldown between procs, so it won’t trigger on every orb in a rapid pickup.',
      'Pairs well with anything that makes Energy Orbs (Equilibrium, Despoil, energy pizzas) to keep it firing.',
    ],
    status: 'beta',
  },

  // ── Mods ──
  '/Lotus/Upgrades/Mods/Sets/Sacrifice/MeleeSacrificeModA': {
    tldr: 'A large melee damage boost, and half of the Sacrificial set (its partner, Sacrificial Steel, adds critical chance).',
    points: [
      'The game treats it as the same mod as Pressure Point, so you can’t run it alongside Pressure Point or Primed Pressure Point — pick one.',
      'On raw melee damage alone it doesn’t quite beat Primed Pressure Point; you run it for the set’s bonus Sentient damage (great for Eidolons) plus Sacrificial Steel’s crit.',
      'It uses the Umbra polarity — few slots have it naturally (Excalibur Umbra, his Umbra Blade, Skiajati), and adding it elsewhere costs a rare Umbra Forma, so don’t spend one lightly.',
    ],
    status: 'beta',
  },
  '/Lotus/Upgrades/Mods/Melee/WeaponDamageIfVictimProcActive': {
    tldr: 'Condition Overload: the more different status effects on your target, the more melee damage you deal.',
    points: [
      'It counts the number of unique status TYPES on the enemy, not how many stacks — spreading several elements matters more than piling on one.',
      'It scales hard in status-heavy builds and does little if you aren’t applying procs.',
      'Common setup: a multi-element or Viral + Slash build to light a target up with several status types at once.',
    ],
    status: 'beta',
  },
  '/Lotus/Upgrades/Mods/Pistol/Event/Nightwave/NightwaveVeloxAugmentMod': {
    tldr: 'Velox / Velox Prime augment: each hit builds Ability Strength (up to +60% at max), released on your next ability cast.',
    points: [
      'Every pellet counts — extra hits from Multishot and Punch Through each add to the stack.',
      'The Blast status’s Detonate effect also feeds the stack.',
      'Build it up, then dump it into a strength-hungry ability for a burst.',
    ],
    status: 'beta',
  },
  '/Lotus/Upgrades/Mods/Warframe/DualStat/FixedShieldAndShieldGatingDuration': {
    tldr: 'Catalyzing Shields: caps your maximum shields at a low fixed value, but lengthens shield-gate invulnerability.',
    points: [
      'Low max shields means they refill almost instantly — this is built for shield-gating survival, not for tanking with a big shield pool.',
      'Anti-synergy with anything that wants high shields (large shield buffs, or effects that scale off your shield amount).',
      'Combos with fast shield regen (Brief Respite / Augur mods) to keep re-gating.',
    ],
    status: 'beta',
  },
  '/Lotus/Upgrades/Mods/Sets/Hunter/PrimaryHunterMunitionsMod': {
    tldr: 'On a critical hit, a chance to also apply a Slash proc — turning crit weapons into bleed machines.',
    points: [
      'It scales with how often you crit: the higher your critical chance, the more Slash procs you land.',
      'Slash procs ignore armor, so this is the go-to for chewing through heavily armored enemies on crit guns.',
      'Weak on low-crit weapons — it needs the crits to trigger.',
    ],
    status: 'beta',
  },
  '/Lotus/Upgrades/Mods/Melee/Event/ComboCritChanceMod': {
    tldr: 'Melee: your critical chance climbs with your combo counter — the more combo you build, the harder you crit.',
    points: [
      'It multiplies your weapon’s base crit, so it scales hardest on weapons that already have decent crit chance.',
      'Pairs with Weeping Wounds (combo-scaling status) as the backbone of most combo-melee builds.',
      'Let the combo drop or expire and the bonus drops with it — keep the combo alive.',
    ],
    status: 'beta',
  },
  '/Lotus/Upgrades/Mods/Melee/Event/ComboStatusChanceMod': {
    tldr: 'Melee: your status chance climbs with your combo counter — more combo, more procs.',
    points: [
      'Like Blood Rush but for status — together they turn combo melee into reliable crit and status.',
      'Great for stacking Viral or Slash, especially alongside Condition Overload (more status types = more damage).',
    ],
    status: 'beta',
  },
  '/Lotus/Upgrades/Mods/Rifle/WeaponFireIterationsSPMod': {
    tldr: 'Rifle multishot that ramps on kills — base multishot plus a stacking bonus for a few seconds after each kill.',
    points: [
      'In a steady fight the on-kill stacks make it outperform plain Split Chamber; it’s weak as an opener with no kills yet.',
      'Galvanized mods only fit their weapon type — this one is primary-rifle only.',
    ],
    status: 'beta',
  },
  '/Lotus/Upgrades/Mods/Rifle/WeaponStatusChanceSPMod': {
    tldr: 'Rifle status chance that ramps on kills — base status plus a stacking bonus per status type on the enemy you killed.',
    points: [
      'Huge for status builds in sustained fights, since the stacks refresh on every kill.',
      'Primary-rifle only, like the other Galvanized mods.',
    ],
    status: 'beta',
  },

  // ── Weapons ──
  '/Lotus/Weapons/Tenno/LongGuns/SapientPrimary/SapientPrimaryWeapon': {
    tldr: 'Gauss’ rapid-fire rocket rifle — fast explosive rockets, strong crit, built for clearing rooms.',
    points: [
      'Rockets arm after a short distance (~7m), so point-blank shots bounce instead of exploding — keep a little range.',
      'The direct hit and the explosion apply status separately, and a direct rocket impact is a guaranteed Impact proc.',
      'The explosion penetrates walls and needs no line of sight.',
      'Reloading while sprinting is faster (+25%), and faster still in Gauss’ hands (+50%) — its signature synergy.',
      'Firestorm (and Primed) widen the blast; Cautious Shot cuts the self-stagger from your own explosions.',
    ],
    status: 'beta',
  },
  '/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Nukor/KuvaNukor': {
    tldr: 'A beam secondary with enormous status and crit — its “microwave” beam arcs between enemies, making it one of the best primers in the game.',
    points: [
      'Low raw damage: you bring it to blanket a group with status (Viral, etc.) before finishing with another weapon, not to DPS.',
      'The beam chains to several nearby targets, so one trigger-pull statuses a whole cluster.',
      'Carries a bonus innate element from its Kuva Lich — pick the lich element to fit your build.',
    ],
    status: 'beta',
  },
  '/Lotus/Weapons/Grineer/Bows/GrnBow/GrnBowWeapon': {
    tldr: 'A bow that fires explosive arrows which burst into cluster bombs — brutal AoE clear.',
    points: [
      'Arrows explode on impact and scatter cluster bombs that detonate a moment later, for big multi-hit AoE.',
      'Mind the self-stagger from your own blasts; Cautious Shot helps.',
      'Tiny ammo reserve — you reload often, so pair it with ammo mutation or efficiency.',
      'Carries a bonus innate element from its Kuva Lich progenitor.',
    ],
    status: 'beta',
  },
};

/**
 * Apply authored Cephalon's Notes to the built items by uniqueName.
 * Returns the count applied (for build logging). Unmatched keys are ignored —
 * but a key that never matches usually means a stale uniqueName worth fixing.
 */
export function applyFieldNotes(items: TennoplanItem[]): { applied: number; unmatched: string[] } {
  const byUniqueName = new Set(items.map((i) => i.uniqueName));
  let applied = 0;
  for (const item of items) {
    const notes = FIELD_NOTES[item.uniqueName];
    if (notes) { item.fieldNotes = notes; applied++; }
  }
  const unmatched = Object.keys(FIELD_NOTES).filter((k) => !byUniqueName.has(k));
  return { applied, unmatched };
}
