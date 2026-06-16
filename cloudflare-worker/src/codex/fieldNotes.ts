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

/** uniqueName → authored Cephalon's Notes (single-variant entries). */
const BASE_NOTES: Record<string, FieldNotes> = {
  // (Arcanes are authored in ARCANE_NOTES below, sectioned.)
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

  // (Weapon notes are authored in WEAPON_NOTES below, sectioned.)
};

// ---------------------------------------------------------------------------
// Warframes — the "does X mod actually work on Y frame" wedge.
//
// A frame's page already lists its stats, passive, and abilities. These notes
// add what those numbers DON'T tell a newer player: which mods/arcanes are dead
// weight on this frame, which buffs snapshot (cast order matters), and the one
// quirk that changes the build. A base frame and its Prime share mechanics, so
// one note is authored once and applied to BOTH uniqueNames via `keys`.
// ---------------------------------------------------------------------------

interface SharedNote {
  /** Every uniqueName this note applies to (base frame + Prime share mechanics). */
  keys: string[];
  note: FieldNotes;
}

const WARFRAME_NOTES: SharedNote[] = [
  // Amesha
  {
    keys: ['/Lotus/Powersuits/Archwing/SupportJetPack/SupportJetPack'],
    note: {
      tldr: 'The support Archwing — Amesha is the survivability pick for hard space content, trading firepower for near-constant protection.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Watchful Swarm surrounds you with drones that each absorb an incoming hit, giving short windows of effective invulnerability you refresh on demand.',
            'Warding Grace is an aura that makes you and nearby allies immune to status procs while slowing the enemies around you.',
            'Vengeful Rush converts the damage you take into energy and buffs allied ability Range, Strength, and Duration — taking fire actually powers you.',
            'Benevolent Decoy drops a sphere that draws enemy fire, heals allies inside it, and damages nearby foes.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'It is the protection pick among the four Archwings (Amesha, Elytron, Itzal, Odonata), trading their firepower and speed for group resilience.',
            'The go-to wing for tanking Profit-Taker, ferrying a squad through Railjack, and surviving anything that out-damages the offensive wings.',
            'Archwings deploy in Archwing missions, open-world flight, and Railjack, so Amesha pulls double duty across all space content.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Ash
  {
    keys: [
      '/Lotus/Powersuits/Ninja/Ninja',
      '/Lotus/Powersuits/Ninja/AshPrime',
    ],
    note: {
      tldr: 'A stealth assassin built around invisibility and finishers — Ash turns Slash bleeds into a quiet, lethal loop.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Smoke Screen makes him (and nearby allies) invisible, not invincible — most enemies can’t target him, but lingering damage-over-time and some area attacks still land.',
            'Teleport zips him to a target and sets up a finisher on arrival; that finisher scales with melee weapon mods.',
            'Blade Storm marks enemies for shadow clones to execute, and the clones snapshot his power when summoned — so buff up before you mark.',
            'His passive makes EVERY Slash bleed he applies deal more damage and last longer, not just bleeds from his abilities.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Fatal Teleport makes Teleport’s finisher automatic and pairs famously with Covert Lethality and finisher-damage mods for one-shot kills.',
            'Seeking Shuriken (augment) turns his 1 into an armor strip to set up bigger finishers; Rising Storm feeds his melee combo.',
            'He loves high-Slash melee and status weapons to exploit the bleed passive; Shuriken can be subsumed onto other frames.',
            'Invisibility ends if the duration lapses, so recast Smoke Screen before it runs out.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Atlas
  {
    keys: [
      '/Lotus/Powersuits/Brawler/Brawler',
      '/Lotus/Powersuits/Brawler/AtlasPrime',
    ],
    note: {
      tldr: 'A melee brawler who tanks by punching — Landslide scales off your MELEE weapon, and every hit banks Rubble into armor.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Landslide is a dash-punch that scales with your melee mods and equipped weapon (not Ability Strength) and chains into a faster combo if you keep tapping it.',
            'The Rubble system is his core: killing petrified or destroyed enemies drops Rubble that stacks bonus armor and slowly heals him.',
            'Petrify freezes a cone of enemies in stone, opening them to finishers and making them take extra damage; Tectonics raises a wall you can also launch.',
            'His passive makes him immune to knockdown while his feet are on the ground, so he is built to stand and brawl.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Petrify is one of the most popular Helminth subsumes in the game for its instant crowd-freeze and damage amp.',
            'Ore Gaze (Petrify augment) makes petrified enemies drop extra resources — a handy farming pick; Path of Statues lays a petrifying trail.',
            'His signature Tekko (and Tekko Prime) gain bonus status chance in his hands, leaning into a status-melee build.',
            'Build melee damage and combo for Landslide; the knockdown immunity means you can skip anti-stagger utility.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Banshee
  {
    keys: [
      '/Lotus/Powersuits/Banshee/Banshee',
      '/Lotus/Powersuits/Banshee/BansheePrime',
    ],
    note: {
      tldr: 'A glass-cannon force multiplier — Sonar paints weak spots that make ANY weapon hit for many times its normal damage.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Sonar tags glowing weak points on enemies that multiply the damage of shots landing on them, and recasting can layer the effect even higher.',
            'Silence stuns enemies on cast and suppresses their special abilities, opening them to finishers.',
            'Sound Quake is a channeled stomp that staggers everything around her while steadily draining energy.',
            'Her passive silences your weapons so gunfire no longer alerts enemies — useful for stealth.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Resonance spreads Sonar’s weak spots from a dying enemy to others, keeping a whole room lit up; Resonating Quake turns Sound Quake into a wide low-level nuke.',
            'Savage Silence adds finisher damage to silenced enemies, and Silence itself is a top-tier Helminth subsume.',
            'She is extremely fragile (low health, shields, and armor), so she plays from stealth and range — her value is amplifying the squad, not tanking.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Baruuk
  {
    keys: [
      '/Lotus/Powersuits/Pacifist/Pacifist',
      '/Lotus/Powersuits/Pacifist/BaruukPrime',
    ],
    note: {
      tldr: 'A reluctant pacifist who stacks enormous damage reduction, then unleashes energy-free exalted fists once his Restraint runs out.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'A Restraint meter drains as he dodges (Elude), sleeps enemies (Lull), and disarms them (Desolate Hands); the lower it falls, the stronger he gets.',
            'At zero Restraint, Serene Storm summons Desert Wind — exalted fists that cost NO energy, only Restraint, and hit harder the lower Restraint sits.',
            'Elude makes him dodge all attacks while he isn’t attacking, and Desolate Hands’ daggers grant heavy damage reduction while disarming foes.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Stacking his passive, Desolate Hands, and Serene Storm reaches some of the highest damage reduction in the game — and Adaptation pushes it to near-immortality.',
            'Reactive Storm (augment) makes Desert Wind adapt its element to the enemy; Endless Lull widens his sleep, and Lull is a strong Helminth subsume.',
            'His signature Cobra & Crane sleeps the first enemy it hits, feeding the same loop that powers his kit.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Bonewidow
  {
    keys: ['/Lotus/Powersuits/EntratiMech/ThanoTech'],
    note: {
      tldr: 'A Necramech — a piloted war machine — built for melee tanking, the close-range counterpart to the gun-focused Voidrig.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Necramechs are summoned and piloted directly, and they use their OWN separate mod pool (not your Warframe mods), plus the shared Mausolon arch-gun.',
            'Exalted Ironbride is her heavy curved sword for cleaving crowds; Meathook skewers an enemy for damage and life-steal (and can be thrown).',
            'Shield Maiden raises a tower shield that blocks and reflects fire, and Firing Line lifts and weakens a group of enemies.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'She favors armor and a huge health pool over shields, making her the aggressive front-line mech; Voidrig instead camps with its long-range Arquebex artillery.',
            'You bring a mech to the open worlds and certain heavy missions where a Warframe alone would struggle.',
            'Necramech mods and Arcanes are a separate progression, so investment in one mech carries over when you swap to the other.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Caliban
  {
    keys: [
      '/Lotus/Powersuits/Sentient/Sentient',
      '/Lotus/Powersuits/Sentient/CalibanPrime',
    ],
    note: {
      tldr: 'A Sentient-hybrid armor-stripper — after his rework, Fusion Strike tears off shields AND armor so your weapons hit full force.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Fusion Strike fires three converging beams that leave a field stripping a group’s shields and armor completely — his headline ability.',
            'Every ability applies Tau status, a neutral damage type that adds vulnerability regardless of the enemy’s faction or health type.',
            'Lethal Progeny summons three kinds of Sentient helper that harass enemies and restore his shields for steady sustain.',
            'Razor Gyre is a spin-dash that deals damage while restoring his health, shields, and energy at once.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The full armor strip is what makes him valuable at high levels — bring him to let the whole squad’s weapons hit unmitigated.',
            'Sentient Wrath is his subsumable ability — a stomp that lifts and weakens enemies — and a fine Helminth pick for crowd control.',
            'His passive grants the squad damage resistance that adapts to whatever damage type is hitting them; his signature Venato can grant melee combo on hit.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Chroma
  {
    keys: [
      '/Lotus/Powersuits/Dragon/Dragon',
      '/Lotus/Powersuits/Dragon/ChromaPrime',
    ],
    note: {
      tldr: 'Chroma is a buff battery — his element is chosen by your ENERGY COLOR, and his big buffs build up as he takes damage.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Your energy color sets his element across Spectral Scream, Elemental Ward, and Effigy — Heat boosts health, Cold boosts armor and reflects, Electricity boosts shields, Toxin boosts reload and holster speed.',
            'Vex Armor has two meters: Scorn (more armor, charged by shield damage and melee kills) and Fury (more weapon damage, charged by health damage and ranged kills); both scale with Ability Strength.',
            'Vex Armor’s damage bonus snapshots onto your equipped weapons, which is what makes him a famous single-target and Eidolon nuke platform.',
            'Effigy sheds his pelt as an autonomous sentry and boosts credit and reward drops — a popular farming toggle.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Pick the energy color deliberately: cold-range colors give Ice, hot colors give Heat, and so on — it changes both his offense and his defense.',
            'His buffs need a moment and a little incoming damage to ramp, so cast Vex Armor and Elemental Ward before a fight, not mid-panic.',
            'Build Ability Strength above all; he is the go-to for burst setups where you snapshot Vex Armor onto a heavy weapon.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Citrine
  {
    keys: ['/Lotus/Powersuits/Geode/Geode'],
    note: {
      tldr: 'A crystalline support frame — she buffs the squad’s crit and status, hands out steady healing, and showers health and energy orbs.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Prismatic Gem parks a floating gem that boosts allies’ Status Chance and Duration while tagging enemies with Heat, Cold, Toxin, and Electricity — a primer and a buff in one.',
            'Crystallize slams the ground to pin enemies and grow crystals that raise Critical Chance across the area.',
            'Her passive heals nearby allies a few health per second, climbing toward a cap as the squad picks up Health Orbs.',
            'Fractured Blast makes enemies killed by its shards drop more Health and Energy Orbs, feeding her own passive.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Her crit and status buffs apply to the whole squad inside the gem’s aura, so she shines with weapon-heavy teams.',
            'Preserving Shell gives damage reduction that grows with kills; she is a low-stress survival and farming pick.',
            'Position the gem where the team actually fights — its buff radius is what matters, not raw damage.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Cyte-09
  {
    keys: ['/Lotus/Powersuits/Frumentarius/Frumentarius'],
    note: {
      tldr: 'A precision sniper frame — Cyte-09 marks targets, snaps to their weak points, and wields an exalted sniper rifle that rewards headshots.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Neutralize summons an exalted sniper rifle whose weak-point hits ricochet to nearby enemies, and its alternate fire lobs cold grenades.',
            'Seek plants an antenna that reveals enemies through walls, makes their weak points more vulnerable, and grants his guns punch-through.',
            'His passive permanently raises weak-point critical chance with every weak-point kill (up to a large cap) over the course of a mission.',
            'Evade cloaks him, and weak-point kills extend that invisibility — a careful sniper can stay hidden almost indefinitely.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Build crit, headshot, and precision mods; his whole kit rewards landing weak-point shots rather than spraying.',
            'Evade is his subsumable ability — handy invisibility for other frames — and Resupply hands out ammo plus a chosen element.',
            'Because his crit ramps over a mission, he only gets stronger the longer an endurance run goes.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Dagath
  {
    keys: ['/Lotus/Powersuits/Dagath/Dagath'],
    note: {
      tldr: 'A spectral cavalry frame — Dagath spreads Viral, banks enemy damage to detonate later, and buys herself a window where she simply can’t die.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Wyrd Scythes throw out blades that apply Viral and slow, a strong opener that softens a group before you shoot.',
            'Doom curses enemies so a share of the damage they take is stored, then released as a bonus hit when the curse ends — it scales against tougher targets.',
            'Grave Spirit grants a big Critical Damage buff and a brief window where she can’t die, during which slain enemies drop guaranteed Health Orbs.',
            'Rakhali’s Cavalry sends phantom steeds charging through enemies, stripping their shields and armor.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Wyrd Scythes is a popular Helminth subsume for its Viral-and-slow opener.',
            'Her health pool is low, so she relies on the Grave Spirit window plus orb healing (boosted by her passive) rather than raw tankiness.',
            'Her signature Dorrclave heals her for each status effect on the enemy it strikes, rewarding status-heavy builds.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Dante
  {
    keys: ['/Lotus/Powersuits/Pagemaster/Pagemaster'],
    note: {
      tldr: 'A storyteller support-nuker — Dante shields the whole squad with Overguard and detonates status for huge Slash damage.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'He casts "verses" that combine: Light Verse builds Overguard for himself and allies, Dark Verse stacks Slash, and Final Verse cashes the pair in.',
            'Final Verse has outcomes by order: Tragedy detonates Slash, Heat, and Toxin status on everything nearby for a massive nuke; Triumph refreshes Overguard on kills.',
            'Noctua, his exalted tome, ricochets its shots and scans enemies as it hits them; his passive rewards fully-scanned targets with extra status chance.',
            'Pageflight sends out invulnerable Paragrimm birds that weaken enemies, while Wordwarden summons a Noctua to fire alongside the squad.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Overguard makes him extremely hard to stagger or kill and is the best squad-wide protection in the game — a top pick for hard endurance runs.',
            'Tragedy needs status already on the enemies to detonate, so pair it with Dark Verse or a status weapon; Dark Verse is his Helminth-subsumable ability.',
            'He was toned down shortly after release but remains a premier support-and-nuke hybrid.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Elytron
  {
    keys: ['/Lotus/Powersuits/Archwing/DemolitionJetPack/DemolitionJetPack'],
    note: {
      tldr: 'The bombardment Archwing — Elytron is the heavy-artillery option, built to blow up clustered targets in space.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Warhead fires a single big missile for a massive explosion, and Bloomer scatters tracking mines you detonate on command.',
            'Thumper drops a beacon that calls down a stream of bombardments on an area.',
            'Core Vent lays a gas trail that negates enemy gunfire, giving it staying power between bombing runs.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'It is the most durable Archwing by total health and shields, trading Itzal’s mobility and Amesha’s protection for raw area damage.',
            'Bring it to Archwing and Railjack content where the job is clearing dense groups of fighters fast.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Ember
  {
    keys: [
      '/Lotus/Powersuits/Ember/Ember',
      '/Lotus/Powersuits/Ember/EmberPrime',
    ],
    note: {
      tldr: 'A fire caster who runs hot — Ember’s damage and toughness both ride a heat meter you have to keep from boiling over.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Immolation builds a heat meter that raises her damage reduction, but if it maxes out it starts draining energy fast — managing the meter IS the gameplay.',
            'Fire Blast releases a wave that strips enemy armor, turning a room of tanky enemies into easy targets for the squad.',
            'Inferno rains meteors that spread Heat status — her room-clearing nuke.',
            'Her passive grants bonus Ability Strength for each Heat-afflicted enemy nearby, so she snowballs hardest in dense crowds.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Fire Blast is a strong Helminth subsume for its squad-wide armor strip; build Strength and Range and watch the heat gauge.',
            'Fireball Frenzy (augment) imbues the squad’s weapons with Heat, while Healing Flame turns Fireball into a heal.',
            'Because her abilities’ Heat feeds the passive, she wants enemies burning around her rather than instantly dead.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Equinox
  {
    keys: [
      '/Lotus/Powersuits/YinYang/YinYang',
      '/Lotus/Powersuits/YinYang/EquinoxPrime',
    ],
    note: {
      tldr: 'A two-in-one frame — Equinox swaps between an offensive Day form and a defensive Night form, and is famous for a stored-damage room nuke.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Metamorphosis flips between forms: Day leans into damage and offense, Night into survivability and crowd control, so you carry two kits in one frame.',
            'Maim (Day) banks Slash damage from every kill and releases it as a wide explosion on recast — the classic Equinox nuke.',
            'Rest & Rage and Pacify & Provoke each do opposite things per form (sleep vs. damage-vulnerability, weaken enemies vs. buff allies).',
            'Her passive turns a slice of Health Orbs into energy and Energy Orbs into health, smoothing her sustain.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The signature combo is Rest to sleep a crowd, then Maim to detonate stored damage across the whole room.',
            'Metamorphosis snapshots Ability Strength at the moment you switch forms, so buff before you swap.',
            'She is famously the most expensive frame to build and the only one that needs a Forma in its construction.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Excalibur
  {
    keys: [
      '/Lotus/Powersuits/Excalibur/Excalibur',
      '/Lotus/Powersuits/Excalibur/ExcaliburPrime',
      '/Lotus/Powersuits/Excalibur/ExcaliburUmbra',
    ],
    note: {
      tldr: 'The sword-master starter frame — his Exalted Blade scales with your melee mods, and Radial Blind turns a crowd into free finishers.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Exalted Blade summons an ethereal sword that fires energy waves and scales with your equipped melee mods (stance mods aside).',
            'Radial Blind flashes nearby enemies blind and opens every one of them to a melee finisher — his core survival-and-burst tool.',
            'Slash Dash zips through enemies with a sword strike and Radial Javelin pins a crowd; his passive makes swords, nikanas, and rapiers hit harder and faster.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Chromatic Blade (augment) changes Exalted Blade’s element by your energy color and boosts its status chance — a popular damage build.',
            'Radial Blind is a solid Helminth subsume; pair Excalibur with a strong sword-type melee to lean on his passive.',
            'Excalibur Umbra plays the same kit but adds the Umbral mod set and a sentient AI that keeps fighting on its own while you are in Operator/Transference, swapping Radial Blind for Radial Howl.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Follie
  {
    keys: ['/Lotus/Powersuits/Inkblot/Inkblot'],
    note: {
      tldr: 'An ink-and-clown trickster — Follie slows and blinds crowds with ink, conjures tools from thin air, and floats enemies away while stripping their defenses.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Her passive coats enemies in ink that slows them by half for several seconds and gives a chance to drop Health and Energy Orbs on death.',
            'Plein Air lifts enemies on balloons and strips their armor and shields, then drops them for fall damage — control and a defense-strip in one cast.',
            'Self Portrait spawns an inky clone that grants damage reduction, and Forced Perspective repositions her with brief invulnerability and a full status cleanse.',
            'Shadowgraph sketches usable tools and objects into the world, a flexible utility ability.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Self Portrait is her Helminth-subsumable ability — easy damage reduction for another frame.',
            'Her signature Enkaus applies the Inkblot slow on its alternate fire, extending her crowd control.',
            'She is a utility-and-control frame rather than a raw damage dealer.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Frost
  {
    keys: [
      '/Lotus/Powersuits/Frost/Frost',
      '/Lotus/Powersuits/Frost/FrostPrime',
    ],
    note: {
      tldr: 'The classic defense frame — Frost drops a Snow Globe that walls off an objective and an Avalanche that freezes and strips armor.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Snow Globe creates a dome that blocks incoming fire; its health and damage reduction are set the moment you cast it, so place it where you want to hold and recast to refresh.',
            'Avalanche freezes everything nearby solid and strips their armor, letting the squad cut through otherwise-tanky enemies.',
            'His passive makes Cold status last longer and grants armor for each chilled enemy nearby, rewarding a freeze-everything style.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The Icy Avalanche augment grants Overguard to allies on cast — a popular survivability pick; Freeze Force imbues the squad with Cold.',
            'He is a staple for Defense, Interception, and Mobile Defense, where a well-placed globe trivializes protecting a point.',
            'Ice Wave is his Helminth-subsumable ability for a quick cold-status line on another frame.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Gara
  {
    keys: [
      '/Lotus/Powersuits/Glass/Glass',
      '/Lotus/Powersuits/Glass/GaraPrime',
    ],
    note: {
      tldr: 'A glass frame with a famous scaling loop — Gara stacks Splinter Storm’s damage by hitting it with her own Shattered Lash, on top of being a strong defender.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Splinter Storm wraps allies in glass for damage reduction and makes enemies take extra damage, and its damage builds up as it absorbs hits.',
            'The signature loop: cast Splinter Storm, then strike it with Shattered Lash to multiply its stored damage — repeat to scale into very high numbers.',
            'Mass Vitrify lays a ring of glass walls that block gunfire and crystallize enemies; Shattered Lash can shatter those walls for a glass-fragment burst.',
            'Her passive has a chance to radial-blind nearby enemies whenever she casts an ability.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Spectrorage is her Helminth-subsumable decoy, and its augment Spectrosiphon turns the mirrors into an energy farm.',
            'In a squad, several Garas can refresh each other’s Splinter Storm with Mass Vitrify and feed each other’s stored damage.',
            'Her three signature weapons — Astilla, Fusilai, and Volnus — each gain a bonus in her hands.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Garuda
  {
    keys: [
      '/Lotus/Powersuits/Garuda/Garuda',
      '/Lotus/Powersuits/Garuda/GarudaPrime',
    ],
    note: {
      tldr: 'A blood-powered berserker — Garuda turns her own health into energy and hits harder the closer she is to death.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Bloodletting spends most of her health to refill energy, so she runs caster kits without ever touching an energy orb — her signature loop.',
            'Her passive ramps her damage up as her health drops, rewarding that low-health playstyle (and she claws bare-handed with no melee equipped).',
            'Dread Mirror steals an enemy’s life for a damage-absorbing shield plus a throwable heart; Blood Altar impales a target to heal the squad.',
            'Seeking Talons flings claws that make struck enemies more vulnerable to Slash.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Bloodletting and the passive work together: sacrificing health both refills energy and powers up her damage at once.',
            'She is squishy by design — build Strength and lean on Dread Mirror’s shield and life-steal rather than a big health pool.',
            'She has an unusually large energy pool, and her signature Nagantaka gains innate punch-through in her hands.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Gauss
  {
    keys: [
      '/Lotus/Powersuits/Runner/Runner',
      '/Lotus/Powersuits/Runner/GaussPrime',
    ],
    note: {
      tldr: 'Gauss runs on a Battery — keep moving to charge it, and his speed, damage reduction, and overdrive all key off how full it is.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Movement, especially Mach Rush, fills his Battery; let it sit and it drains, so he is a frame you play by staying in constant motion.',
            'Kinetic Plating converts incoming damage into battery charge and grants heavy damage reduction plus status and knockdown immunity that scales with battery level.',
            'Redline overdrives fire rate, reload, attack, and cast speed once the battery is high — build Duration and Strength to hold the redline zone.',
            'The battery also speeds his shield recharge and shortens its delay, so a full battery makes him tankier too.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Thermal Sunder (his Cold/Heat AoE, which combines into Blast) is one of the most-borrowed Helminth abilities in the game.',
            'Sprint-reload weapons like Acceltra and Akarius pair perfectly with his constant movement.',
            'Kinetic Plating only blocks the listed physical and temperature damage types, so plan around Toxin and other gaps.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Grendel
  {
    keys: [
      '/Lotus/Powersuits/Devourer/Devourer',
      '/Lotus/Powersuits/Devourer/GrendelPrime',
    ],
    note: {
      tldr: 'Grendel eats enemies to fuel himself — and despite the rumor he is NOT shieldless (he just has a tiny shield).',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Feast inhales enemies into his belly, where each one he holds grants bonus armor (his passive) while it takes damage inside him.',
            'He has a small shield pool, so he is NOT a true shieldless frame — but his real tankiness is armor and the enemies he is digesting.',
            'Pulverize turns him into a rolling ball that tramples and strips armor while healing; Regurgitate spits a held enemy as a toxin projectile.',
            'Build Armor, Strength, and Duration — the more he holds, the tankier he gets.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Nourish is one of the best Helminth subsumes in the whole game — squad energy regen plus a Viral damage buff — so many players borrow it off him.',
            'The enemies he consumes sustain both his armor and his squad buffs at the same time.',
            'His signature Masseter makes him crowd-control immune during heavy attacks.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Gyre
  {
    keys: [
      '/Lotus/Powersuits/Gyre/Gyre',
      '/Lotus/Powersuits/Gyre/GyrePrime',
    ],
    note: {
      tldr: 'An electric crit-nuker — Gyre turns Electricity status into critical hits that chain across a whole room.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Her passive grants bonus critical chance for every Electricity status on an enemy, so stacking shocks turns her abilities and guns into crit machines.',
            'Rotorswell makes your critical hits arc lightning to nearby enemies, spreading damage and more Electric procs to feed the passive.',
            'Cathode Grace buffs weapon and ability crit chance and trickles energy, with kills extending it — the backbone of long ability-spam runs.',
            'Coil Horizon groups and detonates enemies, setting up a clustered target for the chain.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The loop is self-feeding: electric status raises crit, crits trigger Rotorswell chains, and the chains apply more status.',
            'Coil Horizon is her Helminth-subsumable ability; lean into electric weapons to keep the loop rolling.',
            'Build Strength and Duration — Cathode Grace’s energy trickle keeps her casting without leaning hard on efficiency.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Harrow
  {
    keys: [
      '/Lotus/Powersuits/Priest/Priest',
      '/Lotus/Powersuits/Priest/HarrowPrime',
    ],
    note: {
      tldr: 'A priest-themed crit buffer — Harrow hands the squad fire-rate, lifesteal, and a huge critical-chance boost, all fueled by overshields and headshots.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'His passive doubles his overshield cap and starts him at full energy; overshields are the resource the rest of his kit feeds on.',
            'Penance converts overshields into a team fire-rate, reload, and lifesteal buff, while Condemn roots enemies and refills shields on each hit.',
            'Covenant grants a brief party-wide invulnerability, then turns the damage it blocked into a critical-chance buff that headshot kills extend.',
            'Thurible is a channeled energy-regen ritual rewarded by kills and especially headshots.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'He is a staple for Eidolon and boss squads: Condemn exposes heads while Covenant multiplies everyone’s crit chance.',
            'His kit is so self-reliant that subsuming a Helminth ability onto him usually wastes one of his own synergies.',
            'His signature Knell rewards precise headshots and gains a magazine bonus in his hands.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Helminth
  {
    keys: ['/Lotus/Powersuits/PowersuitAbilities/Helminth'],
    note: {
      tldr: 'Not a Warframe you play — the Helminth is the Infested system in your ship that lets you swap one ability onto any frame. It is why so many of these notes mention a "Helminth pick".',
      sections: [
        {
          heading: 'How it works',
          points: [
            'Once unlocked (through the Heart of Deimos and Entrati path), you can "subsume" a Warframe to permanently learn one of its abilities — but doing so consumes that copy of the frame.',
            'You then inject that learned ability onto another frame, replacing one of its four abilities; each frame can hold one subsumed ability at a time.',
            'Subsumed abilities are often slightly weaker than on their original frame, and not every ability can be subsumed.',
          ],
        },
        {
          heading: 'Why it matters',
          points: [
            'This is how players fix a frame’s weak slot, dropping in staples like Gloom, Dispensary, Nourish, Eclipse, Roar, or Pillage that show up across these notes.',
            'Feeding the Helminth costs resources and it needs time to recover between uses, so decide which ability you want before sacrificing a frame.',
            'It also offers Invigorations — rotating, temporary stat buffs you can apply to a chosen frame each week.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Hildryn
  {
    keys: [
      '/Lotus/Powersuits/IronFrame/IronFrame',
      '/Lotus/Powersuits/IronFrame/IronFramePrime',
    ],
    note: {
      tldr: 'Hildryn runs entirely on Shields instead of energy — she has no energy bar at all, which rewrites how her mods, arcanes, and survival work.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Her abilities cost Shields and Overshields, not energy; Ability Efficiency mods lower those shield costs instead of energy costs.',
            'Pillage is her engine — it strips enemy shields and armor and refunds her own shields, letting her cast almost endlessly.',
            'Her shield-gate is unusually strong: a full 3.5-second invulnerability window when shields are full, and Overshields even protect her health from damage that normally bypasses shields, like Toxin.',
            'Haven shares this stronger shield-gating with linked allies, and the whole system works in Archwing too.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Energy mods are dead weight: Flow, Primed Flow, and the Zenurik energy dash do nothing for her.',
            'Mods that convert energy spent into shields — Brief Respite and the Augur set — do NOT refill her either.',
            'But energy-ORB effects still work: an Energy Orb restores shields and instantly resets her recharge delay, so Equilibrium and Energy Conversion still function (Arcane Energize will trigger but gives her nothing).',
            'An Amber Archon Shard that boosts Energy Orb effectiveness also increases the shields she gains per orb.',
            'Avoid anything that caps or lowers max shields — Catalyzing Shields actively hurts her; build a big shield pool plus Ability Strength.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Hydroid
  {
    keys: [
      '/Lotus/Powersuits/Pirate/Pirate',
      '/Lotus/Powersuits/Pirate/HydroidPrime',
    ],
    note: {
      tldr: 'The reworked pirate — Hydroid is now a Corrosive armor-stripper who buffs his own tankiness and weapons while melting enemy armor.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Plunder permanently strips enemy armor with Corrosive, then funnels that into bonus armor for him and Corrosive damage on his weapons — his defining ability.',
            'His passive makes enemies he damages more vulnerable to Corrosive and chips their armor on the first proc, stacking with Plunder.',
            'Tempest Barrage rains Corrosive projectiles for status, and Tidal Surge is an invulnerable water-dash for repositioning.',
            'Tentacle Swarm summons a kraken that suspends and thrashes a crowd — his hard crowd control.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Build Strength and Range to keep armor fully stripped and enemies pinned; his rework turned a slow farming frame into a real armor-strip damage enabler.',
            'Pilfering Swarm (Tentacle Swarm augment) makes caught enemies drop extra loot, keeping a bit of his old farming identity.',
            'Tidal Surge can be subsumed, and Plunder pairs his self-buff with squad-wide armor denial.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Inaros
  {
    keys: [
      '/Lotus/Powersuits/Sandman/Sandman',
      '/Lotus/Powersuits/Sandman/InarosPrime',
    ],
    note: {
      tldr: 'A shieldless wall of health and armor — Inaros tanks with raw HP, not shields, and can revive himself.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'He has NO shields and instead carries an enormous health pool with solid armor, plus a passive that entombs him in a sarcophagus on lethal damage so he can self-revive.',
            'Desiccation blinds and heals him while opening enemies to finishers, and finishers restore big chunks of his health.',
            'Scarab Swarm scales Corrosive damage off his max health and spreads, while Scarab Shell trades health for an armor buff and status immunity.',
            'Devour swallows an enemy to heal him and lock it down.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Shield-gating gear does nothing on him — Brief Respite, Catalyzing Shields, Negation Swarm’s shield effects, and shield-based arcanes are wasted slots.',
            'Because he is shieldless, Rage and Hunter Adrenaline always make energy from the damage he takes; Equilibrium and health orbs cover his thin energy economy.',
            'Survivability scales off Health and Armor — Adaptation and Arcane Grace are his staples, and the Negation Swarm augment grants status immunity.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Itzal
  {
    keys: ['/Lotus/Powersuits/Archwing/StealthJetPack/StealthJetPack'],
    note: {
      tldr: 'The utility Archwing — Itzal is the stealth-and-loot pick, though its old signature teleport is now shared by every Archwing.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Cosmic Crush vacuums in nearby enemies and pickups then detonates — handy for hoovering up loot in open-world flight and Railjack.',
            'Penumbra cloaks it for stealthy approaches, and Arch Line grapples to surfaces or yanks enemies for unconventional mobility.',
            'Its famous Blink teleport was made a universal Archwing maneuver, so Itzal no longer has a monopoly on fast travel.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'It trades Amesha’s protection and Elytron’s firepower for evasion, stealth, and utility — the pick for darting in, grabbing, and getting out.',
            'The loot-vacuum on Cosmic Crush makes it a favorite for open-world resource runs.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Ivara
  {
    keys: [
      '/Lotus/Powersuits/Ranger/Ranger',
      '/Lotus/Powersuits/Ranger/IvaraPrime',
    ],
    note: {
      tldr: 'The stealth-and-theft archer — Ivara stays invisible, pickpockets enemies, and steers her shots for pinpoint kills.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Quiver swaps between four arrows: Cloak (an invisibility bubble), Sleep (stun), Noise (a lure), and Dashwire (a zipline) — a toolkit for Spy and stealth runs.',
            'Prowl keeps her invisible, boosts headshot damage, and automatically pickpockets loot from nearby enemies, but slows her and can break if she sprints or rolls.',
            'Navigator lets her fly and steer a single projectile, multiplying the damage of a sniper or bow shot for big single-target hits.',
            'Her passive widens her radar to spot enemies, and Artemis Bow is her exalted bow for fanning out arrows.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The Infiltrate augment lets her move at full speed and walk through laser barriers while Prowled — a near-essential Spy pick.',
            'Navigator pairs with sniper and bow mods, and Concentrated Arrow turns Artemis Bow into a crit-headshot single shot.',
            'Build Duration and Range to keep her stealth and utility up across long missions.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Jade
  {
    keys: ['/Lotus/Powersuits/Choir/Choir'],
    note: {
      tldr: 'A winged support frame — Jade buffs the squad with rotating hymns, strips defenses from afar, and is the only frame with TWO aura slots.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Her standout perk is two aura mod slots, letting her run two squad auras at once — unique among Warframes.',
            'Symphony of Mercy cycles three hymns: an Ability Strength buff, a weapon-damage buff, and shield resilience, so she adapts to whatever the squad needs.',
            'Light’s Judgment drops healing wells and tags enemies with "Judgment", a damage-vulnerability debuff her kit can detonate.',
            'Glory on High is a flight-based exalted weapon whose shots apply Judgment, with an alt-fire that detonates all active Judgments at once.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Ophanim Eyes slows enemies, strips their shields and armor, and revives downed allies from range — a strong Helminth pick.',
            'Stacking Judgment on a target and detonating scales with how many were applied, rewarding a buff-and-burst rhythm.',
            'Those two aura slots make her uniquely flexible for any team composition.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Khora
  {
    keys: [
      '/Lotus/Powersuits/Khora/Khora',
      '/Lotus/Powersuits/Khora/KhoraPrime',
    ],
    note: {
      tldr: 'A farming and crowd-control favorite — Khora groups enemies, whips them all at once, and (with one augment) makes them rain loot.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Whipclaw is her main damage and scales with MELEE mods and your combo counter, not Ability Strength — the build detail newer players miss most.',
            'Ensnare bunches enemies together, and Whipclaw spreads it further, so one whip can hit a whole clustered group for full damage.',
            'Venari, her kavat companion, has Attack, Protect, and Heal stances and gives a passive move-speed boost — a second pet that never takes a slot.',
            'Strangledome cages a crowd and makes them take extra damage, the perfect target for Whipclaw.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The Pilfering Strangledome augment makes caged enemies drop extra loot — the reason she is a premier farming frame.',
            'Accumulating Whipclaw (augment) lets repeated casts stack damage, and Ensnare is her Helminth-subsumable grouping tool.',
            'Build melee damage and combo for Whipclaw, plus Range and Duration for Ensnare and Strangledome.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Koumei
  {
    keys: ['/Lotus/Powersuits/Koumei/Koumei'],
    note: {
      tldr: 'A luck-themed frame — Koumei rolls dice on her abilities, and higher rolls (or perfect ones) make the effects much stronger.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Her kit runs on RNG: abilities roll dice, and a top "perfect" roll unlocks an enhanced version, so she rewards leaning into the randomness rather than fighting it.',
            'Omikuji sets a small challenge that, once met, grants a random Decree-style buff — a stacking power-up over a mission.',
            'Kumihimo weaves random status effects across an area, and Bunraku binds enemies with puppet strings while applying more random statuses.',
            'Her passive periodically grants one of your weapons a guaranteed status effect, layering with the statuses her abilities scatter.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Omamori gives a chance to shrug off damage while healing and is her Helminth-subsumable ability.',
            'Her energy pool is small, so Efficiency helps keep the dice rolling.',
            'Stacking her random statuses pairs well with status-driven weapons and Condition-Overload-style melee.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Kullervo
  {
    keys: ['/Lotus/Powersuits/PaxDuviricus/PaxDuviricus'],
    note: {
      tldr: 'A shieldless heavy-attack duelist who tanks behind Overguard and recovers energy from the damage he deals.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'He is shieldless; his defense is Overguard from Wrathful Advance, which soaks hits and blocks status procs and knockdowns while it lasts — so shield-gating gear is irrelevant.',
            'His passive grants big heavy-attack efficiency and wind-up speed to ANY melee, so he is built around heavy-attack weapons.',
            'Wrathful Advance teleports him to a target and guarantees a critical hit on the follow-up, his burst opener.',
            'Collective Curse links a group of enemies so damage to one spreads to all, and Storm of Ukko rains daggers onto them.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Recompense turns the health he loses into energy, so taking a little damage fuels his kit rather than threatening him.',
            'Because he is shieldless, Rage and Hunter Adrenaline always make energy from damage, and "No Shield" Nightmare modifiers don’t affect him.',
            'Wrathful Advance is a popular Helminth subsume for its teleport-and-guaranteed-crit; his signature Rauta extends melee combo duration.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Lavos
  {
    keys: [
      '/Lotus/Powersuits/Alchemist/Alchemist',
      '/Lotus/Powersuits/Alchemist/LavosPrime',
    ],
    note: {
      tldr: 'The alchemist with NO energy bar — Lavos runs on cooldowns instead, and energy mods and arcanes do nothing for him.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'He has no energy bar — his abilities run on cooldowns instead, so timing replaces energy management.',
            'Hold any ability to imbue your NEXT cast with an extra element and status, letting him pick his damage type on the fly to match the enemy.',
            'Transmutation Probe shortens his cooldowns and converts pickups into universal ammo and orbs — the linchpin of his uptime.',
            'His passive grants brief status immunity whenever he grabs an orb, and his four abilities each carry a different base element (Toxin, Cold, Electricity, Heat).',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Energy mods and arcanes are all wasted — Flow, Energy Siphon, Rage, Quick Thinking, Arcane Energize, even Equilibrium do nothing for him.',
            'In exchange he is immune to energy-drain effects like Parasitic Eximus, which makes him fantastic for energy-penalty Sorties and Nightmares.',
            'He has very high armor, so he tanks comfortably while his cooldowns refresh; Transient Fortitude is safe since few of his effects care about Duration.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Limbo
  {
    keys: [
      '/Lotus/Powersuits/Magician/Magician',
      '/Lotus/Powersuits/Magician/LimboPrime',
    ],
    note: {
      tldr: 'The rift magician — Limbo can make a whole objective untouchable, or accidentally grief his own squad, depending on how carefully he is played.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Banish and Cataclysm move things into the Rift, a parallel plane where enemies outside can’t touch you — perfect for protecting a Defense target.',
            'Stasis freezes enemies AND their bullets inside the Rift, letting you set up kills at your leisure.',
            'Rift Surge marks rifted enemies and re-banishes them when they leave, spreading the effect.',
            'His passive rolls him in and out of the Rift and regenerates energy there, and killing enemies in the Rift gives him more.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The catch: banishing teammates or an objective can lock them out of shooting normal enemies, so sloppy Limbo play is the classic way to ruin a mission for the group.',
            'In Spy missions the Rift lets him walk through laser barriers; some Eximus and bosses ignore the Rift, so it is not a universal shield.',
            'Cataclysm collapses fast under Nullifier fire — keep that in mind around Corpus.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Loki
  {
    keys: [
      '/Lotus/Powersuits/Loki/Loki',
      '/Lotus/Powersuits/Loki/LokiPrime',
    ],
    note: {
      tldr: 'The original trickster — Loki leans on long-duration invisibility and a disarm that turns gun-toting enemies into harmless melee.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Invisibility makes him a top stealth and Spy frame, and his crowd control even works on Overguard-protected enemies.',
            'Radial Disarm strips enemies of their guns and forces them into harmless melee — his signature panic button.',
            'Decoy plants a clone that pulls enemy fire, and Switch Teleport swaps places with a target to escape or reposition.',
            'His passive lets him cling to walls far longer than normal, handy for waiting out patrols.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The Irradiating Disarm augment adds Radiation so disarmed enemies also turn on each other, a strong crowd panic button.',
            'He is fragile with no defensive ability, so he survives through stealth and positioning, not tanking.',
            'Invisibility is a coveted Helminth subsume for giving other frames reliable stealth.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Mag
  {
    keys: [
      '/Lotus/Powersuits/Mag/Mag',
      '/Lotus/Powersuits/Mag/MagPrime',
    ],
    note: {
      tldr: 'A magnetic starter frame and Corpus specialist — Mag strips shields, vacuums loot, and turns enemy gunfire into a damage amplifier.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Magnetize wraps a target in a field that sucks in bullets and amplifies their damage before bursting — stacking multiple bubbles on one enemy multiplies the payoff.',
            'Polarize strips shields and armor and scatters shards, making her excellent against shield-heavy Corpus enemies.',
            'Pull yanks a crowd toward her for quick control, and Crush suspends and crushes them while restoring squad shields.',
            'Her passive vacuums nearby loot toward her, especially on a bullet jump.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'She is the classic anti-Corpus specialist; the Fracturing Crush augment adds an armor strip, and Magnetize shards can be absorbed to power the bubble further.',
            'Her low armor means you survive through her abilities and positioning, not by tanking.',
            'Pull is a handy Helminth subsume for grouping enemies on another frame.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Mesa
  {
    keys: [
      '/Lotus/Powersuits/Cowgirl/Cowgirl',
      '/Lotus/Powersuits/Cowgirl/MesaPrime',
    ],
    note: {
      tldr: 'The gunslinger — Mesa’s Peacemaker auto-targets a room with exalted pistols, and Shatter Shield makes her nearly bulletproof.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Peacemaker summons exalted dual pistols that auto-target a room and scale with your SECONDARY/pistol mods (not melee), but root her in place while firing.',
            'Shatter Shield slashes incoming gunfire damage and even reflects it; its strength scales with Ability Strength, so Strength both protects and powers her.',
            'Shooting Gallery buffs weapon damage and jams nearby enemies’ guns, rotating its lasso between squadmates.',
            'Ballistic Battery stores up damage to dump into a single big shot.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The Mesa’s Waltz augment lets her move while firing Peacemaker, fixing her one real weakness.',
            'Shooting Gallery is a popular Helminth subsume for the weapon-damage buff and enemy gun-jam.',
            'Her passive rewards skipping a melee weapon (+health) and speeds up sidearms — she is built as a pure gun platform.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Mirage
  {
    keys: [
      '/Lotus/Powersuits/Harlequin/Harlequin',
      '/Lotus/Powersuits/Harlequin/MiragePrime',
    ],
    note: {
      tldr: 'A trickster who multiplies your guns — Mirage’s clones each fire your weapon, and Eclipse can nearly double your damage if you mind the lighting.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Hall of Mirrors spawns clones that each deal a share of your weapon’s damage, so a strong primary or secondary becomes several at once — weapon choice is everything.',
            'Eclipse buffs your weapon damage in bright light and gives damage reduction in shadow; the light-level dependence is the classic gotcha to learn.',
            'Prism floats out a light beam that blinds enemies and then bursts for area damage, doubling as crowd control.',
            'Her passive makes her slides and acrobatics faster and longer.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Eclipse is one of the best Helminth subsumes in the game; the Total Eclipse augment shares its buff with the whole squad.',
            'Sleight of Hand’s Explosive Legerdemain augment turns pickups into bombs for stealth farming.',
            'She is a mobile DPS frame that lives and dies by her weapon mods, since the clones simply copy your guns.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Nekros
  {
    keys: [
      '/Lotus/Powersuits/Necro/Necro',
      '/Lotus/Powersuits/Necro/NekrosPrime',
    ],
    note: {
      tldr: 'The loot necromancer — Nekros doubles drops from corpses and raises slain enemies to fight for him.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Desecrate consumes nearby corpses for extra loot and Health Orbs — the reason a Nekros is welcomed on almost every farming squad.',
            'Terrify sends enemies fleeing while stripping their armor, useful as both control and a damage enabler.',
            'Shadows of the Dead raises a squad of slain enemies as minions to soak fire and fight for him.',
            'His passive heals him for each enemy that dies nearby, and Soul Punch executes low-health targets.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The Despoil augment makes Desecrate cost health instead of energy; pair it with Equilibrium (orbs into energy) for a self-sustaining loop you can spam forever.',
            'Terrify is a strong Helminth subsume for its fear-and-armor-strip, and Shield of Shadows turns his minions into damage reduction.',
            'He has low armor, so he leans on minions and orb healing; only one Nekros per squad needs to Desecrate to avoid wasted casts.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Nezha
  {
    keys: [
      '/Lotus/Powersuits/Nezha/Nezha',
      '/Lotus/Powersuits/Nezha/NezhaPrime',
    ],
    note: {
      tldr: 'Nezha has low base health — his real health bar is Warding Halo, a one-cast damage buffer that scales with Strength.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Warding Halo absorbs a chunk of damage set the moment you cast it, plus a brief immunity window when it goes up; Ability Strength and armor make it bigger.',
            'Because the Halo is his real health bar, stacking Strength (and recasting it) matters more than raw health mods.',
            'Blazing Chakram strips armor, marks targets, and amplifies headshot damage, turning him into a strong weapon platform.',
            'Fire Walker leaves a damaging trail and cleanses ally status, and Divine Spears pins a crowd.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The Safeguard augment lets him cast Warding Halo onto allies — a popular pick for Defense and support runs.',
            'His low base health means he survives almost entirely through the Halo, so keep it refreshed.',
            'Fire Walker is his Helminth-subsumable ability; Reaping Chakram and Pyroclastic Flow add damage options.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Nidus
  {
    keys: [
      '/Lotus/Powersuits/Infestation/Infestation',
      '/Lotus/Powersuits/Infestation/InfestationPrime',
    ],
    note: {
      tldr: 'Nidus survives on Mutation stacks, not shields — build stacks up and they become a free death-save.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'He is shieldless; his survival is Mutation stacks. Cast Virulence to bank them, and at 15+ taking lethal damage spends them to revive you with invulnerability and a heal instead of dying.',
            'Larva drags a crowd into a clump, the perfect setup for Virulence and weapons; Parasitic Link buffs an ally or shares damage off an enemy.',
            'Ravenous lays an infested field that heals him over time and spawns exploding maggots, and he passively regenerates health.',
            'Stacks also power his other abilities, so Range and Strength (to land Virulence on crowds) matter more than Duration on most builds.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Shield-gating mods and arcanes are pointless on him; Rage and Hunter Adrenaline always make energy from the damage he takes.',
            'Energy is easy to keep up — Ravenous spawns health orbs that pair perfectly with Equilibrium.',
            'Parasitic Link is his Helminth-subsumable ability, and he is the only frame that can self-infect to unlock the Helminth cyst.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Nokko
  {
    keys: ['/Lotus/Powersuits/Nokko/Nokko'],
    note: {
      tldr: 'A mushroom-colony frame — Nokko seeds the field with spores that spread Viral, sleep, and buffs, then keeps them alive by bouncing a mushroom around.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Sporespring fires a bouncing Toxin mushroom; each bounce off enemies and other mushrooms refreshes and speeds up his other spore abilities — managing the colony is the gameplay.',
            'Stinkbrain pulses Viral and Sleep onto nearby enemies, while Brightbonnet buffs Ability Strength and restores ally energy.',
            'Reroot turns him into an invulnerable little Sprodling that heals and shields while dropping speed pickups — a built-in panic button.',
            'His passive lets him revert to a Sprodling on a lethal hit and crawl to a glowing mushroom to self-revive.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Brightbonnet is his Helminth-subsumable ability for a strength-and-energy pulse.',
            'His signature Arbucep triggers Stinkbrain and Brightbonnet pulses when shot, tightening the loop.',
            'Keeping a mushroom bouncing is how you extend the whole colony, so positioning and Range matter.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Nova
  {
    keys: [
      '/Lotus/Powersuits/AntiMatter/Anti',
      '/Lotus/Powersuits/AntiMatter/NovaPrime',
    ],
    note: {
      tldr: 'Nova is the textbook reason to build NEGATIVE Ability Strength on purpose — it flips her slow into a speed boost.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Molecular Prime sweeps the area, slowing enemies and making them take extra damage; at NEGATIVE Strength it instead SPEEDS enemies up to rush objectives (speed-nova).',
            'Null Star surrounds her with orbiting motes that grant damage reduction, her main survival tool on a squishy frame.',
            'Antimatter Drop floats a ball that absorbs incoming fire to multiply its own damage before detonating — a high-skill nuke.',
            'Wormhole opens a portal pair for instant travel, handy for objectives and speedruns.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Her build is a deliberate choice: positive Strength for a slow-and-amplify nuke, negative Strength for fast Defense and Interception pushes — the textbook reason to run negative Strength.',
            'Molecular Prime is one of the best Helminth subsumes in the game for its blanket slow and damage amp.',
            'Her passive drops health orbs from slowed kills and energy orbs from sped-up kills, matching each build to its sustain.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Nyx
  {
    keys: [
      '/Lotus/Powersuits/Jade/Jade',
      '/Lotus/Powersuits/Jade/NyxPrime',
    ],
    note: {
      tldr: 'A psychic crowd-controller — Nyx turns enemies against each other with Chaos and peels their defenses with Psychic Bolts.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Psychic Bolts strip armor and shields from a group (and even steal a bit for her), the modern reason to bring her into high-level content.',
            'Chaos confuses a whole crowd into fighting one another, a strong panic-button crowd control.',
            'Mind Control turns one enemy into a buffed bodyguard whose damage you can boost by shooting it during the cast.',
            'Absorb makes her invulnerable while she soaks damage and confused-enemy fire, then releases it as a blast.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The Assimilate augment lets her walk around while Absorbing, turning it into a mobile panic room.',
            'Her passive grants bonus weapon crit chance for each confused enemy nearby, so keeping Chaos up powers your guns.',
            'Psychic Bolts is her Helminth-subsumable armor strip.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Oberon
  {
    keys: [
      '/Lotus/Powersuits/Paladin/Paladin',
      '/Lotus/Powersuits/Paladin/PaladinPrime',
    ],
    note: {
      tldr: 'The do-everything paladin — Oberon heals the squad, strips armor, and cleanses status, making him a reliable budget pick for almost any mission.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Renewal pours out healing, an armor buff, and a longer revive timer to the whole squad — his core support tool.',
            'Reckoning and Smite both strip enemy armor (Smite also handles Overguard), so he enables squad damage without a dedicated build.',
            'Hallowed Ground lays a Radiation carpet that cleanses allies of status and makes Reckoning hit harder — the two synergize.',
            'His passive turns picked-up orbs into brief team invulnerability stacks.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Smite is a strong Helminth subsume for its quick armor-and-Overguard strip; Hallowed Reckoning extends the carpet under Reckoning.',
            'He is famously easy to acquire and forgiving, making him a great early all-rounder.',
            'Build Strength for the strips and healing, with enough Range to cover the squad.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Octavia
  {
    keys: [
      '/Lotus/Powersuits/Bard/Bard',
      '/Lotus/Powersuits/Bard/OctaviaPrime',
    ],
    note: {
      tldr: 'Octavia’s Mallet reflects enemy damage back at them — the harder they shoot it, the harder it hits, so it scales endlessly.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Mallet stores the damage enemies deal TO it and pulses it back out, which is why it stays lethal even at very high levels.',
            'Resonator rolls around charming enemies to follow it and scoops up your Mallet, fusing the two into one roaming damage-and-control unit.',
            'Metronome turns you and allies invisible and hands out buffs when you do simple beat actions — jump, crouch, fire, or melee.',
            'Amp boosts ability damage in its aura, multiplying the Mallet’s output and range.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Drop Mallet, Resonator, and Amp together for a self-running room clear; Range and Duration are her priority stats.',
            'Her passive trickles energy to the squad on every cast, supporting endless ability spam — the classic AFK-friendly survival and affinity farm.',
            'Resonator is her Helminth-subsumable ability for portable crowd control.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Odonata
  {
    keys: [
      '/Lotus/Powersuits/Archwing/StandardJetPack/StandardJetPack',
      '/Lotus/Powersuits/Archwing/PrimeJetPack/PrimeJetPack',
    ],
    note: {
      tldr: 'The starter Archwing — Odonata is the balanced, do-a-bit-of-everything wing you unlock from The Archwing quest.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Energy Shell throws up a barrier that blocks fire and boosts the damage of shots passing through it; Seeking Fire answers with homing missiles.',
            'Disarray drops flares to shoot down incoming missiles, and Repel knocks surrounding enemies away when you need breathing room.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'It splits the difference between Amesha’s protection, Itzal’s mobility, and Elytron’s firepower — a fine generalist while you decide which specialist to build.',
            'You unlock it during The Archwing quest, so it is most players’ first taste of space combat.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Oraxia
  {
    keys: ['/Lotus/Powersuits/Oraxia/Oraxia'],
    note: {
      tldr: 'A spider predator — Oraxia stalks from invisibility, laces her guns with Toxin, executes the weak, and spawns broodlings from the dead.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Silken Stride grants status immunity and bonus health and coats your primary and secondary with Toxin so enemies they kill explode; it also swaps your roll for a directional silk dash.',
            'Her passive cloaks her in invisibility whenever she wall-latches, setting up ambushes and repositioning.',
            'Mercy’s Kiss lunges in to instantly finish low-health enemies and drops Health and Energy orbs.',
            'Widow’s Brood marks enemies with toxin darts so their deaths spawn friendly Scuttlers — her kill-driven swarm loop.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Webbed Embrace snares a group and makes them take more damage, and is a solid Helminth subsume.',
            'She is a Toxin-and-stealth specialist in the same family as Saryn; build to keep the Silken Stride imbue up.',
            'Build to chain finishers and summons — kills feed both her orbs and her brood.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Protea
  {
    keys: [
      '/Lotus/Powersuits/Odalisk/Odalisk',
      '/Lotus/Powersuits/Odalisk/ProteaPrime',
    ],
    note: {
      tldr: 'A self-sufficient gadgeteer — Protea drops turrets, grenades, and supply caches, and can literally rewind time to undo a death.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Dispensary spits out health, energy, and ammo pickups on a timer — built-in self-sufficiency.',
            'Blaze Artillery is a Heat turret that grows stronger the longer it fires, and Grenade Fan throws either shrapnel or shield satellites that feed shield-gating survival.',
            'Temporal Anchor stores the damage taken nearby, then rewinds her to where she cast it with full health and unleashes the stored damage — a built-in second chance.',
            'Her passive grants +100% Ability Strength on every fourth ability cast.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Dispensary is one of the single most popular Helminth subsumes in the game for keeping any frame fueled.',
            'Count your casts so the fourth-cast strength bonus lands on Temporal Anchor for a bigger rewind detonation.',
            'Grenade Fan’s shield satellites don’t stack — a new cast replaces the old one — so resummon rather than spam.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Qorvex
  {
    keys: ['/Lotus/Powersuits/ConcreteFrame/ConcreteFrame'],
    note: {
      tldr: 'A brutalist radiation tank — Qorvex blankets enemies in Radiation status, herds them with concrete walls, and soaks hits behind huge armor.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'His whole kit stacks Radiation status: Chyrinka Pillar pulses it, Crucible Blast beams it, and Radiation-afflicted enemies detonate when the beam touches them.',
            'Containment Wall slams two walls together to bunch enemies up and make them take extra damage — his main setup tool.',
            'Disometric Guard surrounds him with plates that block status effects and rebuild as Radiation-status enemies die, keeping him sturdy.',
            'His passive grants weapons +3 punch-through, helping shots tag the clustered groups he sets up.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'He has the second-highest base armor of any frame, so he plays as a tanky crowd-controller; build Strength and Range.',
            'His signature Mandonel arch-gun empowers Chyrinka Pillar with charged shots.',
            'Radiation also makes enemies fight each other, so his debuff is crowd control as well as a damage setup.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Revenant
  {
    keys: [
      '/Lotus/Powersuits/Revenant/Revenant',
      '/Lotus/Powersuits/Revenant/RevenantPrime',
    ],
    note: {
      tldr: 'Mesmer Skin gives Revenant charges of full invulnerability — survival is about charge count, not shields or armor.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Mesmer Skin grants charges of full invulnerability — each enemy that hits you spends one charge and gets stunned; at zero charges you are exposed, so recast before they run out.',
            'More Ability Strength means more charges, which is why Strength is his core survival stat rather than health or armor.',
            'Danse Macabre spins out beams that are his main damage, and you pick its elements through your energy color.',
            'Enthrall mind-controls enemies into thralls, and their deaths spread the effect to more.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Mesmer Skin is not perfect: damage-over-time already ticking on you and a few special attacks can still get through.',
            'Mesmer Shield (augment) shares the invulnerability with allies, and Reave is his Helminth-subsumable dash.',
            'Because Mesmer Skin replaces tanking, he is one of the most beginner-friendly "unkillable" frames.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Rhino
  {
    keys: [
      '/Lotus/Powersuits/Rhino/Rhino',
      '/Lotus/Powersuits/Rhino/RhinoPrime',
    ],
    note: {
      tldr: 'Iron Skin snapshots your armor and strength at the instant you cast it — so the order you buff in changes how tanky it is.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Iron Skin locks in its health from your armor and Ability Strength AT THE MOMENT of cast — apply armor buffs and arcanes first, then cast, for a much bigger shield.',
            'There is a short window right after casting where extra hits add to the Iron Skin value before it locks, so some players cast in a busy room on purpose.',
            'Roar is a damage multiplier that also boosts status and damage-over-time and stacks multiplicatively with mods.',
            'Rhino Stomp suspends and slows a whole crowd, and his passive sends out a shockwave on a heavy landing.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Roar is one of the best Helminth subsumes in the game for the multiplicative, party-wide damage boost.',
            'The Iron Shrapnel augment lets him detonate and recast Iron Skin instead of waiting for it to break.',
            'A classic beginner tank: simple kit, very hard to kill once Iron Skin is up.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Saryn
  {
    keys: [
      '/Lotus/Powersuits/Saryn/Saryn',
      '/Lotus/Powersuits/Saryn/SarynPrime',
    ],
    note: {
      tldr: 'Saryn is the queen of spreading status — Spores ramp up and jump from corpse to corpse to melt whole rooms.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Spores infect a target with corrosive that ramps up over time and spreads when an infected enemy dies or is struck, so Range (to spread) and Strength (for spore damage) carry the build.',
            'Toxic Lash coats your weapons (especially melee) with toxin and re-pops Spores when you hit infected enemies.',
            'Miasma is a viral-and-corrosive nuke that also propagates Spores across the area.',
            'Her passive makes status effects last longer, leaning her even harder into status weapons and Viral.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'If every infected enemy dies at once, Spores reset — keep at least one target alive to hold the ramp.',
            'Molt gives a decoy and a speed burst; Regenerative Molt heals, while Venom Dose or Contagion Cloud add team or AoE damage.',
            'Spores can be subsumed onto other frames for a spreading status engine.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Sevagoth
  {
    keys: [
      '/Lotus/Powersuits/Wraith/Wraith',
      '/Lotus/Powersuits/Wraith/SevagothPrime',
    ],
    note: {
      tldr: 'A two-in-one death frame — Sevagoth fights as himself, then bursts into a separate, claw-wielding Shadow when he falls.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Sow plants damage-over-time seeds and Reap detonates them, a combo that pumps out big area burst.',
            'Gloom slows nearby enemies and heals him off the damage he deals.',
            'His Exalted Shadow is a full second form with its own mods and claws; casting his other abilities charges the Death Well that powers it.',
            'His passive turns death into the Shadow instead of a downed state — collect souls as the Shadow to rebuild and self-revive.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Gloom is one of the most-borrowed Helminth abilities in the game for its slow-and-lifesteal survivability.',
            'The Shadow form is modded separately, so you can build him and his Shadow for different jobs.',
            'Reap and Sow feed each other, so build Range and Strength to keep the detonations big.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Styanax
  {
    keys: ['/Lotus/Powersuits/Hoplite/Hoplite'],
    note: {
      tldr: 'A spear-throwing hoplite — Styanax strips defenses, showers the squad with energy, and rains exalted javelins, all while shields keep him critting.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'His passive raises critical chance based on his current shields (overshields included) — and DOUBLES it when he wields a speargun, so shield-gating builds make him both tanky and hard-hitting.',
            'Tharros Strike strips enemy shields and armor and converts it into healing and overshields — survival and a defense-strip in one cast.',
            'Final Stand launches him airborne to hurl a barrage of javelins, his exalted nuke.',
            'Rally Point feeds the whole team energy and draws enemy attention to him.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The Augur mod set pairs naturally with his shield scaling, topping up overshields as he casts.',
            'Tharros Strike is his Helminth-subsumable strip-and-heal, and the Intrepid Stand augment refunds energy on Final Stand kills.',
            'Build shields and Strength so the passive crit and the javelin nuke both hit hard.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Temple
  {
    keys: ['/Lotus/Powersuits/Temple/Temple'],
    note: {
      tldr: 'A rock-and-roll frame — Temple plays to a beat, rewarding well-timed casts, and wields an infested flamethrower as an exalted weapon.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Their passive runs on a metronome: time your ability casts to the beat for a big Ability Efficiency boost and stronger effects — rhythm is the gameplay.',
            'Exalted Solo summons Lizzie, an infested flamethrower that replaces your melee for a sustained Heat-damage playstyle.',
            'Ripper’s Wail grants brief invulnerability while it heals, shields, and buffs allied Heat damage — a defensive reset and a team buff at once.',
            'Pyrotechnics erupts Heat pillars, and Overdrive softens enemies by raising their critical-hit vulnerability.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Pyrotechnics is their Helminth-subsumable Heat pillar.',
            'Build Heat and Strength to stack the Ripper’s Wail buff and the flamethrower’s damage.',
            'Hitting the beat is the whole skill curve — sloppy timing leaves a lot of efficiency on the table.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Titania
  {
    keys: [
      '/Lotus/Powersuits/Fairy/Fairy',
      '/Lotus/Powersuits/Fairy/TitaniaPrime',
    ],
    note: {
      tldr: 'The fairy gunner — Razorwing shrinks Titania into a flying form with exalted pistols, turning her into a mobile, hard-to-hit DPS platform.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Razorwing shrinks her into a flying form with Dex Pixia (exalted dual pistols that scale with pistol mods) and the Diwata sword — she fights from the air where most enemies struggle to track her.',
            'Razorwing is channeled and drains energy over time, so energy economy and the Razorwing Blitz augment (fire rate and flight speed) are core to the build.',
            'Spellbind makes her and allies immune to status and disarms enemies, a handy cleanse before diving in.',
            'Tribute pulls one of four rotating squad buffs off an enemy, and Lantern charms a crowd to follow a floating light.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Her passive heals her and nearby allies on every ability cast, so she sustains herself between flights.',
            'Spellbind is her Helminth-subsumable status-immunity ability.',
            'She is the only frame with two exalted weapons at once — pistols and a sword in Razorwing.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Trinity
  {
    keys: [
      '/Lotus/Powersuits/Trinity/Trinity',
      '/Lotus/Powersuits/Trinity/TrinityPrime',
    ],
    note: {
      tldr: 'The original healer and energy battery — Trinity keeps the squad alive and powered, and can strip armor while she does it.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Blessing heals the whole team’s health and shields and grants damage reduction — her signature panic button.',
            'Energy Vampire turns an enemy into a team-wide energy fountain, the classic reason to bring her to energy-hungry squads.',
            'Link tethers nearby enemies to share incoming damage out to them and can give her invulnerability windows.',
            'Well of Life suspends an enemy and turns it into a healing-and-lifesteal source for allies.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The Abating Link augment also strips enemy armor while she is linked, turning her into a damage enabler.',
            'Build Efficiency and Duration; her passive feeds allies bonus health from her energy pool, so a big energy build makes the whole team tankier.',
            'Well of Life is her Helminth-subsumable healing tool.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Uriel
  {
    keys: ['/Lotus/Powersuits/DemonFrame/DemonFrame'],
    note: {
      tldr: 'A demon-summoner — Uriel fights alongside three permanent minions, and his whole kit is about unlocking and feeding them.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'His passive grants three demons, each unlocked by casting its ability: Catenach chains enemies so damage spreads, Gulphagor applies damage-over-time and drops orbs on death, and Vythelas marks the dead for fire-rate and Heat buffs.',
            'Because the demons gate his power, you plan your ability rotation to keep all three active rather than spamming one button.',
            'Remedium heals him, cleanses status, and revives fallen demons, while Brimstone unleashes a Heat field powered by the pack.',
            'Infernalis ignites him and turns his dodge into a flying drill, and Demonium hurls minion souls to weaken enemies.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'He leans on Heat damage and minion sustain; stacking Strength and Heat amplifies both the demons and his ultimate.',
            'Keeping the trio alive with Remedium between fights is his real engine — lose them and his kit goes quiet.',
            'Plan casts so each ability’s demon is up before you commit to Brimstone.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Valkyr
  {
    keys: [
      '/Lotus/Powersuits/Berserker/Berserker',
      '/Lotus/Powersuits/Berserker/ValkyrPrime',
    ],
    note: {
      tldr: 'Valkyr is the melee berserker — Hysteria makes her invincible while she claws, and her sky-high armor carries the rest.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Hysteria is an exalted claw weapon with full invulnerability and lifesteal, but it drains over time and leaves a brief vulnerable window when it ends, so it is not truly infinite.',
            'Warcry buffs the team’s attack speed and armor while slowing nearby enemies and making them take more melee damage.',
            'Her enormous base armor (third-highest in the game) makes armor-stacking and Steel Fiber especially effective.',
            'Her passive lets her recover from knockdowns much faster, fitting her relentless melee style.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Because Hysteria blocks damage, energy-from-damage mods (Rage and Hunter Adrenaline) refill her between casts, not during them.',
            'Eternal War (augment) lets you keep Warcry’s attack speed up for long stretches — a staple melee-buff build.',
            'Warcry is a popular Helminth subsume for the squad attack-speed and armor buff.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Vauban
  {
    keys: [
      '/Lotus/Powersuits/Trapper/Trapper',
      '/Lotus/Powersuits/Trapper/TrapperPrime',
    ],
    note: {
      tldr: 'The combat engineer — Vauban locks rooms down with traps, then yanks every enemy into a single pile to be deleted.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Bastille suspends enemies and strips their armor, handing that armor to you and your allies; recast it to collapse into a Vortex that sucks the whole crowd together.',
            'That suspend-strip-and-group loop is his identity, and his passive adds bonus damage against the helpless enemies he has trapped.',
            'Minelayer is a toolbox in one slot — pulling tethers, knockback-and-speed pads, and more.',
            'Photon Strike calls in an orbital blast that is extra effective against Overguard, and Tesla Nervos sends out stunning roller drones.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Build Strength and Range so Bastille covers a room and strips fully; the Repelling Bastille augment adds a knockback bubble.',
            'The Vortex pile is a perfect setup for a squad nuke or your own area weapon.',
            'He is a top-tier crowd-controller for Defense and survival — control IS his damage, through the passive.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Voidrig
  {
    keys: ['/Lotus/Powersuits/EntratiMech/NechroTech'],
    note: {
      tldr: 'A Necramech built for artillery — Voidrig plants itself and fires the Arquebex, one of the heaviest-hitting weapons in the game.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Guard Mode deploys the Arquebex twin mortars for enormous ranged damage, but roots the mech in place — you trade mobility for raw firepower.',
            'Storm Shroud raises a damage-absorbing, reflecting barrier; cast it before Guard Mode so you have a protection window while you sit still.',
            'Necraweb throws a slowing canister and Gravemines scatter explosives around you.',
            'Necramechs use their OWN mods (not Warframe mods) and the shared Mausolon arch-gun.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'It is the burst-DPS answer for Profit-Taker, Archon hunts, and Eidolons, where a parked Voidrig melts boss health bars.',
            'Voidrig is the ranged pick, Bonewidow the melee one; mech mods and Arcanes carry between them.',
            'Abilities lock during Guard Mode, so set up Storm Shroud and positioning before you commit.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Volt
  {
    keys: [
      '/Lotus/Powersuits/Volt/Volt',
      '/Lotus/Powersuits/Volt/VoltPrime',
    ],
    note: {
      tldr: 'A versatile starter — Volt speeds up the squad and plants Electric Shields that supercharge any shots fired through them.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Speed buffs the whole team’s movement, attack, and reload speed — a simple, beloved team buff for clearing missions fast.',
            'Electric Shield blocks incoming fire and amplifies the damage and crit of allied shots passing through it, and you can pick it up and carry it.',
            'Shock chains lightning for quick crowd control, and Discharge stuns and arcs across a group.',
            'His passive builds electric damage as he moves on the ground, released on his next melee hit.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Electric Shield’s crit-and-damage amp makes him a staple support for Eidolon hunts — fire your big shots through it.',
            'Speed and Shock are both Helminth-subsumable, and the Capacitance augment turns Discharge into squad overshields.',
            'Low energy rewards casting often, and he is a strong, flexible first frame.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Voruna
  {
    keys: [
      '/Lotus/Powersuits/Werewolf/Werewolf',
      '/Lotus/Powersuits/Werewolf/VorunaPrime',
    ],
    note: {
      tldr: 'A wolf-pack stalker — Voruna slips into invisibility, drowns enemies in status, and chains finishers with her claws.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Shroud of Dynar cloaks her and, when she strikes from stealth, buffs her melee crit and status — built for ambush melee.',
            'Fangs of Raksh slaps several random status effects on a target that then spread when it dies, melting crowds in status.',
            'Lycath’s Hunt turns melee kills into health orbs and headshot kills into energy orbs, and Ulfrun’s Descent unleashes charged claw lunges whose kills stack damage and crit.',
            'Instead of a fixed passive, holding each ability grants a wolf buff — speed, status immunity, heavy-attack efficiency, or a death save.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Hold the right ability for the wolf buff the fight needs — death prevention for a tough room, status immunity against heavy procs.',
            'She is a stealth-melee status specialist; build crit and status to cash in the Shroud of Dynar bonus.',
            'Her orb generation feeds an otherwise energy-hungry ability rotation.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Wisp
  {
    keys: [
      '/Lotus/Powersuits/Wisp/Wisp',
      '/Lotus/Powersuits/Wisp/WispPrime',
    ],
    note: {
      tldr: 'Wisp drops Reservoir motes that buff the whole squad — and the buff sticks for a while even after you walk away from them.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Reservoirs places three motes — Haste (speed and fire rate), Vitality (health and regen), and Shock (a stun) — that allies pick up by passing through, then keep the buff for a while after leaving.',
            'Her passive makes her invisible while airborne, so bullet-jumping or hovering is her defense.',
            'Will-o-Wisp projects a decoy she can teleport to, and Breach Surge blinds enemies and sprays homing sparks when they die.',
            'Sol Gate is her exalted solar beam for heavy single-target and line damage.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Range and Duration are her key stats — a bigger aura to grab buffs and longer-lasting motes.',
            'Breach Surge plus the Will-o-Wisp teleport is a strong blind-and-reposition combo; Reservoirs is a coveted Helminth subsume for the team buffs.',
            'Overlapping the same mote doesn’t stack — it just refreshes the active buff.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Wukong
  {
    keys: [
      '/Lotus/Powersuits/MonkeyKing/MonkeyKing',
      '/Lotus/Powersuits/MonkeyKing/WukongPrime',
    ],
    note: {
      tldr: 'Wukong brings a second him (Celestial Twin) and an invisible heal (Cloud Walker) — a famously forgiving, low-effort frame.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Celestial Twin spawns a clone that mirrors your weapons and fights alongside you, effectively a second gun every mission.',
            'Cloud Walker turns him into a fast cloud that is invisible and heals him — his main escape-and-reset button.',
            'Defy gives a window of heavy damage reduction and an armor buff (toned down from its old "unkillable" version).',
            'His passive saves him from a few otherwise-fatal hits per mission, each time handing him a random buff; Primal Fury is his exalted Iron Staff.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Give the Celestial Twin its own strong weapon for a real second source of damage.',
            'Cloud Walker is great for stealth and dodging, and Defy is his Helminth-subsumable ability.',
            'His passive revives plus clone AI earned him an "AFK" reputation that DE has reined in over patches.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Xaku
  {
    keys: [
      '/Lotus/Powersuits/BrokenFrame/BrokenFrame',
      '/Lotus/Powersuits/BrokenFrame/XakuPrime',
    ],
    note: {
      tldr: 'Three broken frames in one — Xaku steals enemy guns, strips armor, and shrugs off most damage with a skeletal final form.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Grasp of Lohk disarms enemies and turns their stolen weapons into hovering guns that auto-fire around Xaku — free sustained damage that also removes enemy firepower.',
            'Gaze (part of The Lost) strips a target’s shields and armor — the strip the rest of your guns want — and Xata’s Whisper laces your weapons with Void damage.',
            'The Vast Untime sheds them into a skeletal form with around 75% damage avoidance that even pauses their other ability timers while it is active.',
            'Their passive adds area-damage reduction and a chance to dodge weapon hits, so survival is about avoidance, not a health bar.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Gaze and Grasp of Lohk work together: strip armor while the stolen guns keep firing.',
            'Their Void damage is neutral, but it does not bypass Eidolon invulnerability or trigger Kuva-Siphon destruction — plan around that.',
            'The Lost cycles three picks (Accuse, Gaze, Deny), so you choose the tool the fight needs.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Yareli
  {
    keys: [
      '/Lotus/Powersuits/Yareli/Yareli',
      '/Lotus/Powersuits/Yareli/YareliPrime',
    ],
    note: {
      tldr: 'A surf’s-up frame — Yareli fights from a water-board mount and rewards staying in motion with a huge secondary-weapon crit boost.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Her passive grants a big secondary-weapon critical-chance bonus while she keeps moving for a second and a half or more, so sidearms are her main weapon.',
            'Merulina is a summonable water K-drive she rides into battle; it soaks a share of incoming damage for mobile survivability.',
            'Sea Snares conjure water globules that suspend and weaken a group, and Riptide pulls enemies into a cyclone and detonates.',
            'Aquablades orbit her for steady passive damage.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The catch: leaning on Merulina locks out normal ground tactics — the Merulina Guardian and Loyal Merulina augments soften that, letting it protect allies or free up dismounting.',
            'Aquablades is a decent Helminth pick, and her signature Kompressa gains projectile speed in her hands.',
            'Build for secondary crit and keep moving to stay inside the passive.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Zephyr
  {
    keys: [
      '/Lotus/Powersuits/Tengu/Tengu',
      '/Lotus/Powersuits/Tengu/ZephyrPrime',
    ],
    note: {
      tldr: 'An aerial frame — Zephyr rules the air, and Turbulence makes her nearly immune to enemy gunfire while it is up.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Turbulence deflects incoming projectiles around her, a strong bubble of bullet-immunity against ranged enemies — but it is active, so keep it refreshed.',
            'Her passive lowers her gravity for long hovers and floaty jumps and boosts her weapon critical chance while airborne.',
            'Tail Wind launches and hovers her, and Airburst shoves or groups enemies.',
            'Tornado scatters roaming twisters that ragdoll enemies and can absorb and amplify an element.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Build Duration and Strength to keep Turbulence and the tornadoes going; the Funnel Clouds and Jet Stream augments reshape Tornado and Tail Wind.',
            'Airburst is a useful Helminth subsume for grouping enemies.',
            'She rewards a fly-and-shoot style — stay airborne for the crit passive and to dodge ground threats.',
          ],
        },
      ],
      status: 'beta',
    },
  },
];

// ---------------------------------------------------------------------------
// Sentinels — floating robot companions that follow you, can equip a sentinel
// weapon + mods, and revive on a cooldown (Regen / Primed Regen for more).
// Notes cover their precepts (special-ability mods) and what each is best at.
// Shared across base + Prime (+ Prisma) by uniqueName, same as Warframes.
// ---------------------------------------------------------------------------

const SENTINEL_NOTES: SharedNote[] = [
  // Carrier
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelPowersuits/CarrierPowerSuit',
      '/Lotus/Types/Sentinels/SentinelPowersuits/PrimeCarrierPowerSuit',
    ],
    note: {
      tldr: 'The loot-and-ammo sentinel — Carrier keeps your guns fed and hoovers up resources.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Ammo Case raises your ammo capacity and converts ammo pickups into the type your equipped weapon needs, so ammo-hungry guns rarely run dry.',
            'Looter pulses out to break nearby containers and resource caches automatically, gathering loot as you move.',
            'It comes with the Sweeper, a burst-fire shotgun, as its sentinel weapon.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Best for ammo-thirsty weapons and resource farming; pair it with Vacuum (which every sentinel can run now) to sweep up drops.',
            'Carrier Prime is the same kit with better stats.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Dethcube
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelPowersuits/DethCubePowerSuit',
      '/Lotus/Types/Sentinels/SentinelPowersuits/PrimeDethCubePowerSuit',
    ],
    note: {
      tldr: 'The combat sentinel — Dethcube adds steady damage and drops energy orbs to keep you casting.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Vaporize blasts a nearby enemy for solid damage, its offensive precept.',
            'Energy Generator drops an Energy Orb when it helps land a kill, feeding energy-hungry frames.',
            'It comes with the Deth Machine Rifle, a high-fire-rate sentinel gun.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'A good all-round damage-and-energy pick; Dethcube Prime is the same kit with better stats.',
            'Like all sentinels, equip Regen (or Primed Regen) so it revives more times per mission.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Diriga
  {
    keys: ['/Lotus/Types/Sentinels/SentinelPowersuits/ArcDronePowerSuit'],
    note: {
      tldr: 'The ranged-stun sentinel — Diriga snipes from afar and zaps nearby enemies into a stun.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Arc Coil shocks several nearby enemies with Electricity, and Electro Pulse locks a single target in a stun.',
            'Calculated Shot fires its Vulklok sniper at the first enemy in range for ranged damage.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Useful for hands-off crowd control and chip damage; build Health and Armor over its small shield pool.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Djinn
  {
    keys: ['/Lotus/Types/Sentinels/SentinelPowersuits/GubberPowerSuit'],
    note: {
      tldr: 'The self-reviving sentinel — Djinn pulls enemies together and brings itself back when destroyed.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Reawaken lets it revive itself after being destroyed, and grabbing Energy Orbs shortens that cooldown.',
            'Fatal Attraction yanks nearby enemies into a clump and damages them, a built-in grouping tool.',
            'It comes with the Stinger, a toxin-dart weapon.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The self-revive makes it one of the most durable sentinels, and Fatal Attraction sets enemies up for AoE.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Helios
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelPowersuits/MeleePetPowerSuit',
      '/Lotus/Types/Sentinels/SentinelPowersuits/PrimeHeliosPowerSuit',
    ],
    note: {
      tldr: 'The codex scanner — Helios auto-scans enemies to fill your Codex and fights with an exalted glaive.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Investigator automatically scans enemies and objects (using your Codex Scanner charges), completing Codex entries with no manual effort.',
            'Detect Vulnerability highlights weak points on enemies you have already fully scanned.',
            'It is the only sentinel that can wield the Deconstructor, a glaive-type weapon that hits surprisingly hard.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Bring it (with a Codex Scanner in your gear) to finish scanning the star chart’s enemies; Helios Prime is the same kit with better stats.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Nautilus
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelPowersuits/EmpyreanSentinelPowerSuit',
      '/Lotus/Types/Sentinels/SentinelPowersuits/NautilusPrimeSentinelPowerSuit',
    ],
    note: {
      tldr: 'The enemy-grouper — Nautilus’ Cordon yanks whole crowds into one ball, perfect for AoE.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Cordon tethers nearby enemies into a single clump — one of the best grouping precepts in the game for setting up area damage and status.',
            'Auto Omni repairs Railjack hull breaches and douses fires automatically during space missions.',
            'It comes with the Verglas, a Cold-element shotgun.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Cordon makes it a favourite for nuke and status builds (and a help on long Railjack runs); Nautilus Prime is the same kit with better stats.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Oxylus
  {
    keys: ['/Lotus/Types/Sentinels/SentinelPowersuits/RadarPowerSuit'],
    note: {
      tldr: 'The fishing-and-foraging sentinel — Oxylus is the open-world gathering helper.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Scan Aquatic Lifeforms reveals fishing hotspots and dyes nearby fish so they are easy to spot.',
            'Scan Matter marks resource containers on your minimap, and Botanist auto-picks nearby plants.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Bring it to the open worlds when you are fishing or farming resources; it does little in regular combat missions.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Shade
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelPowersuits/ShadePowerSuit',
      '/Lotus/Types/Sentinels/SentinelPowersuits/PrimeShadePowerSuit',
      '/Lotus/Types/Sentinels/SentinelPowersuits/PrismaShadePowerSuit',
    ],
    note: {
      tldr: 'The stealth sentinel — Shade’s Ghost cloaks you whenever an enemy gets close.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Ghost turns you and Shade invisible when an enemy is nearby and in line of sight; the cloak breaks if you attack, then re-cloaks after a short cooldown.',
            'Revenge has it fire its Burst Laser only at enemies that have already attacked you.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Great for stealth play and for reviving teammates unseen; Shade Prime and Prisma Shade are the same kit with better stats or cosmetics.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Taxon
  {
    keys: ['/Lotus/Types/Sentinels/SentinelPowersuits/TnSentinelCrossPowerSuit'],
    note: {
      tldr: 'The beginner sentinel — Taxon is cheap, easy to get, and refills your shields.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Molecular Conversion damages nearby enemies and turns that damage into shields for your Warframe.',
            'It comes with the Artax, a Cold-beam rifle that slows enemies.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The cheapest, earliest sentinel — a fine first companion that adds a little shield sustain while you build toward others.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Wyrm
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelPowersuits/WyrmPowerSuit',
      '/Lotus/Types/Sentinels/SentinelPowersuits/PrimeWyrmPowerSuit',
    ],
    note: {
      tldr: 'The defensive sentinel — Wyrm stuns crowds and, with Negate, shrugs a status proc off you.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Crowd Dispersion stuns nearby enemies when several are close, a panic crowd control.',
            'Negate blocks one incoming status effect on you every so often — handy against proc-heavy enemies.',
            'It comes with the Laser Rifle.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Bring it for the stun and the status protection; Wyrm Prime adds Negate by default and has better stats.',
          ],
        },
      ],
      status: 'beta',
    },
  },
];

// ---------------------------------------------------------------------------
// Companions — whole-creature pets only (Kavats, Kubrows, Vulpaphylas,
// Predasites, Venari). The modular MOA/Hound parts and infested Mutagen/Antigen
// components in this category are crafting pieces, not companions, so they
// intentionally get no note. Notes cover each breed's precept (signature ability)
// and what it's best for. Shared across base + Prime by uniqueName.
// ---------------------------------------------------------------------------

const COMPANION_NOTES: SharedNote[] = [
  // ── Kavats (cats; self-revive on a short timer, incubated from Kavat Genetic Codes) ──
  // Adarza Kavat
  {
    keys: ['/Lotus/Types/Game/CatbrowPet/MirrorCatbrowPetPowerSuit'],
    note: {
      tldr: 'A crit-buff cat — Adarza Kavat hands the whole squad a burst of critical chance.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Cat’s Eye periodically buffs the critical chance of you and nearby allies — its headline support precept.',
            'Reflect bounces a chunk of damage back at attackers.',
            'Like all Kavats it collapses and revives itself after a short delay rather than dying for good (no revive cost).',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Bring it to crit-focused squads (Eidolons, boss runs) for the team Cat’s Eye buff; you need Kavat Genetic Codes to incubate one.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Smeeta Kavat
  {
    keys: ['/Lotus/Types/Game/CatbrowPet/CheshireCatbrowPetPowerSuit'],
    note: {
      tldr: 'The farmer’s best friend — Smeeta Kavat’s Charm randomly doubles your resources and affinity.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Charm rolls a random buff on a timer; the famous one DOUBLES resource and affinity pickups for a short window — the reason it is the go-to farming companion.',
            'Mischief turns it (and a decoy) invisible to pull enemies off you.',
            'Like all Kavats it self-revives after a short delay instead of dying.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Run it for any resource, credit, or affinity farm; the Charm proc is random, so it is luck-based rather than on-demand.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Vasca Kavat
  {
    keys: ['/Lotus/Types/Game/CatbrowPet/VampireCatbrowPetPowerSuit'],
    note: {
      tldr: 'The vampire cat — Vasca Kavat heals itself by biting and can revive a downed you.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Draining Bite deals Slash while healing the Kavat, and Transfusion sacrifices its health to revive you when you go down.',
            'Like all Kavats it self-revives after a short delay.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'A survivability pick whose Transfusion revive can save you in a pinch; its raw combat output is otherwise modest.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // ── Kubrows (dogs; incubated in the Orbiter, revive on a cooldown) ──
  // Chesa Kubrow
  {
    keys: ['/Lotus/Types/Game/KubrowPet/RetrieverKubrowPetPowerSuit'],
    note: {
      tldr: 'The looter dog — Chesa Kubrow scavenges extra loot from the enemies it helps kill.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Retrieve makes it fetch additional loot from fallen enemies, and Neutralize disarms and staggers enemies around it.',
            'Like all Kubrows it is incubated in your Orbiter and revives on a cooldown.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'A farming-flavoured companion; the loot scavenging is its draw, though dedicated farm frames usually out-earn it.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Huras Kubrow
  {
    keys: ['/Lotus/Types/Game/KubrowPet/FurtiveKubrowPetPowerSuit'],
    note: {
      tldr: 'The stealth dog — Huras Kubrow cloaks you whenever enemies are near.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Stalk turns both the Kubrow and you invisible when enemies are close, and Hunt charges an enemy and drags it down.',
            'Like all Kubrows it revives on a cooldown.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'A beast alternative to Shade for stealth play; the cloak lets you revive allies or reposition unseen.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Raksa Kubrow
  {
    keys: ['/Lotus/Types/Game/KubrowPet/GuardKubrowPetPowerSuit'],
    note: {
      tldr: 'The guard dog — Raksa Kubrow restores your shields and slows enemies.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Protect periodically refills your shields, and Howl slows nearby enemies.',
            'Like all Kubrows it revives on a cooldown.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'A defensive pick for shield-based frames; the shield top-up helps sustain shield-gating.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Sahasa Kubrow
  {
    keys: ['/Lotus/Types/Game/KubrowPet/AdventurerKubrowPetPowerSuit'],
    note: {
      tldr: 'The digging dog — Sahasa Kubrow unearths health, ammo, and even heavy-weapon caches.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Dig has it periodically unearth a pickup — health, energy, ammo, or sometimes a heavy-weapon ammo cache — and Ferocity lets it land melee finishers.',
            'Like all Kubrows it revives on a cooldown.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'A handy sustain-and-utility dog; the Dig pickups (especially heavy ammo) are its claim to fame.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Sunika Kubrow
  {
    keys: ['/Lotus/Types/Game/KubrowPet/HunterKubrowPetPowerSuit'],
    note: {
      tldr: 'The attack dog — Sunika Kubrow pins enemies and tears into Eximus and Capture targets.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Savagery teleports it between enemies dealing damage, and Unleashed pins a target down — great for holding Capture targets in place.',
            'Like all Kubrows it revives on a cooldown.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'A single-target attacker; pinning Capture targets and bonus damage to Eximus are its niche uses.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Helminth Charger
  {
    keys: ['/Lotus/Types/Game/KubrowPet/ChargerKubrowPetPowerSuit'],
    note: {
      tldr: 'An infested dog grown from the Helminth cyst — the Charger pulls enemies in and tramples them.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Proboscis harpoons an enemy and reels it in, while Trample charges through a crowd, gaining health, armor, and damage per enemy hit.',
            'It revives on a cooldown like other Kubrows, and the Strain mod set spawns corrosive maggots.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'Obtained by growing a Helminth cyst on a Warframe (commonly via Nidus) and incubating it — an aggressive melee pet with infested crowd control.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // ── Vulpaphylas (infested Deimos cats; DON'T truly die — collapse and self-revive) ──
  // Crescent Vulpaphyla
  {
    keys: ['/Lotus/Types/Friendly/Pets/CreaturePets/HornedInfestedCatbrowPetPowerSuit'],
    note: {
      tldr: 'An infested fox that can’t stay dead — Crescent flings enemies into each other.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Vulpaphylas don’t truly die: when downed they collapse into a devolved form and revive themselves with no revive cost.',
            'Crescent’s precept lifts an enemy and hurls it at others for crowd control and damage.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'The no-death survivability is the family’s big draw; build it from a Mutagen + Antigen on Deimos and gild it to finish it.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Panzer Vulpaphyla
  {
    keys: ['/Lotus/Types/Friendly/Pets/CreaturePets/ArmoredInfestedCatbrowPetPowerSuit'],
    note: {
      tldr: 'The meta infested pet — Panzer Vulpaphyla blankets enemies in Viral and never truly dies.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Viral Quills fire out to spread Viral status across nearby enemies — a top-tier primer that boosts everyone’s damage.',
            'Like all Vulpaphylas it collapses and self-revives instead of dying, so it stays useful all mission with no revive cost.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'One of the most popular companions in the game: free Viral priming plus a pet that can’t be permanently killed. Built from a Mutagen + Antigen on Deimos and gilded.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Sly Vulpaphyla
  {
    keys: ['/Lotus/Types/Friendly/Pets/CreaturePets/VulpineInfestedCatbrowPetPowerSuit'],
    note: {
      tldr: 'A trickster infested fox — Sly Vulpaphyla spawns decoys to soak enemy fire, and can’t stay dead.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Sly’s precept creates decoys as you bullet-jump that draw enemy fire away from you.',
            'Like all Vulpaphylas it collapses and self-revives rather than dying.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'A survivability-and-distraction pick; the no-death mechanic plus decoys keep heat off you. Built from a Mutagen + Antigen on Deimos and gilded.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // ── Predasites (infested Deimos dogs; also collapse and self-revive) ──
  // Medjay Predasite
  {
    keys: ['/Lotus/Types/Friendly/Pets/CreaturePets/MedjayPredatorKubrowPetPowerSuit'],
    note: {
      tldr: 'An infested dog that stuns crowds — Medjay Predasite locks enemies down and soaks damage.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Paralytic Spores stun and slow nearby enemies and open them to finishers, while Infectious Bite absorbs damage and bursts when it overflows.',
            'Like all infested pets it collapses and self-revives rather than dying.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'A crowd-control-and-tank flavour of the no-death infested companion; built from a Mutagen + Antigen on Deimos and gilded.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Pharaoh Predasite
  {
    keys: ['/Lotus/Types/Friendly/Pets/CreaturePets/PharaohPredatorKubrowPetPowerSuit'],
    note: {
      tldr: 'A buffing infested dog — Pharaoh Predasite drops damage-boost spore clouds and tangles enemies.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Anabolic Pollination spawns spore clouds that buff damage, and Endoparasitic Vector fires a homing shot that restrains several enemies.',
            'Like all infested pets it collapses and self-revives rather than dying.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'A support-flavoured infested pet (damage buff plus soft crowd control) that never permanently dies; built from a Mutagen + Antigen on Deimos and gilded.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Vizier Predasite
  {
    keys: ['/Lotus/Types/Friendly/Pets/CreaturePets/VizierPredatorKubrowPetPowerSuit'],
    note: {
      tldr: 'A healer infested dog — Vizier Predasite lays healing spores and strips armor with Corrosive.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'Iatric Mycelium leaves a healing spore trail, and Acidic Spittle spits a Corrosive projectile to chip enemy armor.',
            'Like all infested pets it collapses and self-revives rather than dying.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'A self-sustain-and-armor-strip pet that can’t be permanently killed; built from a Mutagen + Antigen on Deimos and gilded.',
          ],
        },
      ],
      status: 'beta',
    },
  },

  // Venari (Khora's built-in kavat) + Venari Prime
  {
    keys: [
      '/Lotus/Powersuits/Khora/Kavat/KhoraKavatPowerSuit',
      '/Lotus/Powersuits/Khora/Kavat/KhoraPrimeKavatPowerSuit',
    ],
    note: {
      tldr: 'Khora’s built-in kavat — Venari fights at her side for free without taking a companion slot.',
      sections: [
        {
          heading: 'Mechanics',
          points: [
            'She comes bundled with Khora and uses no companion slot; Khora’s third ability cycles her stance between Attack (snare + Slash), Protect (knockdown and disarm), and Heal (an aura that mends nearby allies).',
            'If downed she revives on her own after a short delay (or instantly for some energy), and she passively speeds Khora up.',
          ],
        },
        {
          heading: 'Interactions',
          points: [
            'You can’t equip her like a normal pet — she is part of Khora’s kit; Venari Prime comes with Khora Prime.',
          ],
        },
      ],
      status: 'beta',
    },
  },
];

// ---------------------------------------------------------------------------
// Arcanes — equippable enhancements. Notes cover what each does (the trigger +
// effect, in our words) and when it's worth a slot. Authored from the codex
// levelStats (game facts). Mechanics + Interactions, no Trivia.
// This batch: Warframe Arcanes (the rest of the categories follow).
// ---------------------------------------------------------------------------

const ARCANE_NOTES: SharedNote[] = [
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/LongGunSpeedOnCrit'],
    note: {
      tldr: 'On a primary critical hit, a chance for a big fire-rate boost to rifles and bows.',
      sections: [
        { heading: 'Mechanics', points: ['On a critical hit, a 30% chance for +90% Fire Rate to your primary weapon (shotguns excluded) for 9 seconds.'] },
        { heading: 'Interactions', points: ['Best on high-crit, high-fire-rate primaries that can keep the buff refreshed; does nothing for shotguns.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/GolemArcaneShieldRegenOnDamage'],
    note: {
      tldr: 'A small chance, when your shields take a hit, to speed up shield recharge.',
      sections: [
        { heading: 'Mechanics', points: ['On taking shield damage, a 3% chance for +30% Shield Recharge for 12 seconds.'] },
        { heading: 'Interactions', points: ['A niche shield-tank pick; the low chance makes it unreliable, and shield-gating usually does more.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/SpeedOnDamage'],
    note: {
      tldr: 'Take a hit and you’ll likely get a parkour-speed boost.',
      sections: [
        { heading: 'Mechanics', points: ['On taking damage, a 60% chance for +60% Parkour Velocity for 18 seconds.'] },
        { heading: 'Interactions', points: ['A cheap mobility option, easily outclassed by dedicated speed buffs.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/GolemArcaneBonusDamageOnWallLatch'],
    note: {
      tldr: 'Latch onto a wall to load up a big weapon-damage buff.',
      sections: [
        { heading: 'Mechanics', points: ['Wall-latching grants +150% damage to your primary and secondary weapons for 30 seconds.'] },
        { heading: 'Interactions', points: ['Strong flat damage if you can tap a wall every 30s; suits frames that fight from elevation.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/CritChanceOnDamage'],
    note: {
      tldr: 'Getting hit has a chance to boost ALL your weapons’ critical chance.',
      sections: [
        { heading: 'Mechanics', points: ['On taking damage, a 21% chance for +45% Critical Chance for 12 seconds; it adds to base crit before mods, so it can push a weapon over the next crit tier.'] },
        { heading: 'Interactions', points: ['A favourite on red-crit builds and weapons sitting just under a crit breakpoint; you need to be taking hits to keep it up.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/PistolDamageOnReload'],
    note: {
      tldr: 'Reload your secondary for a good chance at a big pistol-damage buff.',
      sections: [
        { heading: 'Mechanics', points: ['On reloading, a 60% chance for +150% damage to pistols for 24 seconds.'] },
        { heading: 'Interactions', points: ['Reliable, long-lasting secondary damage; great on pistols you reload often.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/InstantShieldOnDamage'],
    note: {
      tldr: 'A chance, when your shields break, to instantly refill them.',
      sections: [
        { heading: 'Mechanics', points: ['On taking shield damage, a 6% chance to instantly restore all shields (6-second cooldown).'] },
        { heading: 'Interactions', points: ['A survivability pick for shield-gating frames — an instant full refill re-arms your shield gate.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/MaxEnergyForArmor'],
    note: {
      tldr: 'Converts armor into a bigger energy pool.',
      sections: [
        { heading: 'Mechanics', points: ['Grants +0.30 maximum Energy per point of Armor, up to +1000 Energy.'] },
        { heading: 'Interactions', points: ['Great on high-armor frames that want a huge energy pool; pairs with armor stacking (Steel Fiber, Archon Shards).'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/AbilityStrengthForMaxHealth'],
    note: {
      tldr: 'Turns a big health pool into Ability Strength.',
      sections: [
        { heading: 'Mechanics', points: ['Grants +6% Ability Strength for every 250 Max Health, up to +72%.'] },
        { heading: 'Interactions', points: ['Excellent on high-health frames (Inaros, Grendel) and health-stacking builds — free strength without a strength mod.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/MeleeDmgOnRifleKill'],
    note: {
      tldr: 'Kill with your primary to charge up a huge melee-damage buff.',
      sections: [
        { heading: 'Mechanics', points: ['On a primary-weapon kill, a 30% chance for +300% Melee Damage for 12 seconds.'] },
        { heading: 'Interactions', points: ['For gun-and-melee hybrids — soften crowds with your rifle, then swing with the buff up.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/IncreaseMaxHealthOnHealthPickup'],
    note: {
      tldr: 'Picking up Health Orbs permanently grows your health bar for the mission.',
      sections: [
        { heading: 'Mechanics', points: ['Each Health Orb pickup adds +24 Max Health, stacking up to 50 times (+1,200 health).'] },
        { heading: 'Interactions', points: ['Snowballs into a huge health pool over a mission; pairs with orb generation (Equilibrium, Health Conversion).'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/HealCompanionOnSixMeleeKills'],
    note: {
      tldr: 'Rack up melee kills to heal your pet.',
      sections: [
        { heading: 'Mechanics', points: ['Landing 6 melee kills within 30 seconds heals your companion for 900.'] },
        { heading: 'Interactions', points: ['Keeps a squishy pet alive on melee builds; less needed with the self-reviving infested pets.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/AbilityStrengthOnSummonAttack'],
    note: {
      tldr: 'Minion-summoning frames bank Ability Strength as their summons attack.',
      sections: [
        { heading: 'Mechanics', points: ['Each attack by your summoned minions adds +6% Ability Strength (up to +60%) to your next ability cast, and your summons move 20% faster.'] },
        { heading: 'Interactions', points: ['Made for summoners (Nekros, Revenant, Wukong’s twin, Sevagoth’s Shadow) — pour the banked strength into a big cast.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/StealDefensiveStatsOnRoll'],
    note: {
      tldr: 'Roll through enemies to strip and steal their defenses.',
      sections: [
        { heading: 'Mechanics', points: ['Rolling through enemies steals 50% of their defensive stats for yourself; stolen Armor lasts 15 seconds.'] },
        { heading: 'Interactions', points: ['A mobile armor-strip-and-tank tool that rewards aggressive rolling into crowds.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/AbilityDurationOnCast'],
    note: {
      tldr: 'Briefly boosts ability duration right after you cast.',
      sections: [
        { heading: 'Mechanics', points: ['On casting an ability, +60% Ability Duration for 3 seconds — long enough to extend the duration snapshot of the next cast.'] },
        { heading: 'Interactions', points: ['Niche; useful for chaining a duration-snapshot ability right after another cast.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/GolemArcaneAimGlideOnHeadshot'],
    note: {
      tldr: 'Land a headshot for a parkour-speed boost.',
      sections: [
        { heading: 'Mechanics', points: ['On a headshot, +60% Parkour Velocity for 18 seconds.'] },
        { heading: 'Interactions', points: ['A mobility pick for headshot-heavy play; mostly movement flavour.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/AbilityStrengthAndCritDamageWhenInvisible'],
    note: {
      tldr: 'Rewards invisibility with huge Ability Strength and critical damage.',
      sections: [
        { heading: 'Mechanics', points: ['While invisible, gain +30% Ability Strength and a massive +3x final Critical Damage.'] },
        { heading: 'Interactions', points: ['Build-defining on stealth frames (Loki, Ivara, Octavia, Voruna) — the crit-damage multiplier is enormous.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/SlashProcResist'],
    note: {
      tldr: 'Makes you effectively immune to Slash bleed procs.',
      sections: [
        { heading: 'Mechanics', points: ['Grants +102% chance to resist a Slash status effect — full bleed-proc immunity.'] },
        { heading: 'Interactions', points: ['Targeted defense against bleed-heavy enemies; one of a family of status-resist arcanes.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/DamageResistanceStacksOverTime'],
    note: {
      tldr: 'Keep moving — dodges and jumps stack up damage resistance.',
      sections: [
        { heading: 'Mechanics', points: ['Each Dodge, Double Jump, or Bullet Jump grants +25% damage resistance for 4 seconds, stacking up to 3 times (+75%).'] },
        { heading: 'Interactions', points: ['A mobility-tank pick with naturally high uptime on parkour-heavy play.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/GolemArcaneRadialEnergyOnEnergyPickup'],
    note: {
      tldr: 'A chance, when you grab an Energy Orb, to refill energy for you AND nearby allies.',
      sections: [
        { heading: 'Mechanics', points: ['On an Energy Orb pickup, a 60% chance to restore 150 Energy to you and allies within 15m (15-second cooldown).'] },
        { heading: 'Interactions', points: ['The staple support energy arcane; pairs with orb generators (Equilibrium, Despoil, energy pizzas). Does nothing for energy-less frames like Hildryn and Lavos.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/RadialKnockdownOnEnergyPickup'],
    note: {
      tldr: 'Grabbing an Energy Orb knocks down nearby enemies.',
      sections: [
        { heading: 'Mechanics', points: ['On an Energy Orb pickup, guaranteed knockdown of nearby enemies.'] },
        { heading: 'Interactions', points: ['A free panic-CC if you pick up orbs mid-fight; mostly a budget defensive pick.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/InvulnerabilityOnDeathOnMercyKill'],
    note: {
      tldr: 'Mercy-kills bank cheat-death charges that save you from a lethal hit.',
      sections: [
        { heading: 'Mechanics', points: ['Each Mercy kill grants a stack (up to 9); taking fatal damage consumes 3 stacks to survive and become invulnerable for 12 seconds.'] },
        { heading: 'Interactions', points: ['A cheat-death pick for builds that can reliably set up Mercy kills (status/finisher setups).'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/ShieldMaxForAbilityStrength'],
    note: {
      tldr: 'Your Ability Strength bonuses also inflate your max shields.',
      sections: [
        { heading: 'Mechanics', points: ['All Ability Strength modifiers are also applied to your Max Shields.'] },
        { heading: 'Interactions', points: ['Turns a high-strength shield frame into a shield tank (great on Hildryn and shield-gating builds).'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/GolemArcaneMeleeDamageOnCrit'],
    note: {
      tldr: 'Critting builds a strong, long melee-damage buff.',
      sections: [
        { heading: 'Mechanics', points: ['On a critical hit, a 60% chance for +180% Melee Damage for 18 seconds.'] },
        { heading: 'Interactions', points: ['A staple flat melee-damage arcane with high uptime on crit melee.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/HealthRegenOnDamage'],
    note: {
      tldr: 'Taking health damage can trigger strong health regeneration.',
      sections: [
        { heading: 'Mechanics', points: ['On taking health damage, a 9% chance for +6% Health Regeneration per second for 9 seconds.'] },
        { heading: 'Interactions', points: ['The premier health-tank sustain arcane; pairs with high health and Adaptation. The low chance means it shines in sustained fights, not burst.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/ArmourOnDamage'],
    note: {
      tldr: 'Getting hit can grant a big chunk of armor.',
      sections: [
        { heading: 'Mechanics', points: ['On taking damage, a 15% chance for +900 Armor for 20 seconds.'] },
        { heading: 'Interactions', points: ['A core survivability arcane on armor-tank frames, with high uptime once you are in the thick of it.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/RadiationProcResist'],
    note: {
      tldr: 'Makes you immune to Radiation status (the friendly-fire confusion).',
      sections: [
        { heading: 'Mechanics', points: ['Grants +102% chance to resist a Radiation status effect.'] },
        { heading: 'Interactions', points: ['Targeted defense against Radiation enemies; a status-resist family arcane.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/AbilityHeatProcsGiveCritChance'],
    note: {
      tldr: 'Frames that spread Heat status stack big weapon critical chance.',
      sections: [
        { heading: 'Mechanics', points: ['When your abilities inflict Heat status, gain +6% weapon Critical Chance for 10 seconds, stacking up to 50 times.'] },
        { heading: 'Interactions', points: ['Built for Heat-ability frames (Ember, Heat-Chroma, Temple) feeding crit-weapon builds.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/FireProcResist'],
    note: {
      tldr: 'Makes you immune to Heat status burns.',
      sections: [
        { heading: 'Mechanics', points: ['Grants +102% chance to resist a Heat status effect.'] },
        { heading: 'Interactions', points: ['Targeted defense against fire-heavy enemies; status-resist family.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/AbilityPowerOnFreeze'],
    note: {
      tldr: 'Freezing enemies stacks Ability Strength and Duration.',
      sections: [
        { heading: 'Mechanics', points: ['Each enemy you Freeze grants +2% Ability Strength and +2% Ability Duration for 15 seconds, stacking up to 20 times (+40% each).'] },
        { heading: 'Interactions', points: ['For Cold/Freeze frames (Frost, Cold-ability builds); strong on crowds you can chill en masse.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/AbilityStatusProcsGiveAbilityStrengthAndEfficiency'],
    note: {
      tldr: 'Spreading varied status with abilities buffs your strength and efficiency.',
      sections: [
        { heading: 'Mechanics', points: ['Each unique status effect your abilities inflict grants +6% Ability Strength and +3% Ability Efficiency for 20 seconds.'] },
        { heading: 'Interactions', points: ['For multi-element ability frames; rewards spreading several different status types.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/HealthWhileUsingChanneledAbilities'],
    note: {
      tldr: 'Running channeled (toggle) abilities boosts your max health.',
      sections: [
        { heading: 'Mechanics', points: ['Grants +250 Max Health for each active channeled ability.'] },
        { heading: 'Interactions', points: ['A survivability pick for channel-heavy frames; stack multiple toggles for a bigger pool.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/GolemArcaneSniperSpeedOnCrit'],
    note: {
      tldr: 'Critting with a sniper greatly speeds its reload.',
      sections: [
        { heading: 'Mechanics', points: ['On a critical hit, a 60% chance for +150% Reload Speed to Sniper Rifles for 12 seconds.'] },
        { heading: 'Interactions', points: ['For sniper builds (Eidolon hunts, Rubico/Lanka) where slow reloads hurt.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/MagneticProcResist'],
    note: {
      tldr: 'Makes you immune to Magnetic status (the energy-drain/HUD scramble).',
      sections: [
        { heading: 'Mechanics', points: ['Grants +102% chance to resist a Magnetic status effect.'] },
        { heading: 'Interactions', points: ['Targeted defense against Magnetic enemies; especially valuable for energy frames, since Magnetic drains energy.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/MaxDPSTakenForArmour'],
    note: {
      tldr: 'Trades your shields for a hard cap on how much damage you can take per second.',
      sections: [
        { heading: 'Mechanics', points: ['Removes all shields, but while Armor is above 700 you can’t take more than 500 damage per second; Magnetic status and ability-nullifying effects switch the protection off.'] },
        { heading: 'Interactions', points: ['A heavy armor-tank pick — the damage cap trivializes chip damage but leaves you exposed to Magnetic and nullifiers.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/SpeedOnParry'],
    note: {
      tldr: 'Blocking can grant a movement-speed boost.',
      sections: [
        { heading: 'Mechanics', points: ['On blocking, a 45% chance for +60% Speed for 18 seconds.'] },
        { heading: 'Interactions', points: ['A niche mobility pick for melee-block playstyles.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/AmmoEfficiencyOnPistolHeadshot'],
    note: {
      tldr: 'Pistol headshot kills can grant near-infinite ammo briefly.',
      sections: [
        { heading: 'Mechanics', points: ['On a pistol headshot kill, a 60% chance for +102% Ammo Efficiency for 12 seconds (shots effectively cost no ammo).'] },
        { heading: 'Interactions', points: ['For ammo-hungry secondaries; keep landing headshots to sustain the no-ammo window.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/AbilityStrengthOnCast'],
    note: {
      tldr: 'Casting different abilities ramps up your Ability Strength.',
      sections: [
        { heading: 'Mechanics', points: ['Each ability cast grants +9% Ability Strength to your next cast, stacking up to 4 times (+36%); recasting the SAME ability twice in a row resets it.'] },
        { heading: 'Interactions', points: ['Rewards rotating through your kit — weave several abilities before the one you want empowered.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/GolemArcanePistolDamageOnHeadshot'],
    note: {
      tldr: 'Headshots grant a huge secondary-weapon damage buff.',
      sections: [
        { heading: 'Mechanics', points: ['On a headshot, +300% damage to your secondary weapon for 18 seconds.'] },
        { heading: 'Interactions', points: ['A top damage arcane for pistol builds, with near-100% uptime if you aim for heads.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/PrimaryDmgOnMeleeKill'],
    note: {
      tldr: 'Melee kills charge up a big primary-weapon damage buff.',
      sections: [
        { heading: 'Mechanics', points: ['On a melee kill, a 30% chance for +300% Primary Weapon damage for 12 seconds.'] },
        { heading: 'Interactions', points: ['The flip side of Arcane Blade Charger — for melee-then-gun hybrids.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/RadialHealOnHealthPickup'],
    note: {
      tldr: 'Grabbing a Health Orb can heal your whole squad.',
      sections: [
        { heading: 'Mechanics', points: ['On a Health Orb pickup, a 60% chance to restore 500 Health to allies within 25m (15-second cooldown).'] },
        { heading: 'Interactions', points: ['A support heal arcane — the health-orb twin of Arcane Energize; pairs with orb generation.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/LongGunDamageOnHeadshot'],
    note: {
      tldr: 'Headshots can grant a long-lasting primary-damage buff.',
      sections: [
        { heading: 'Mechanics', points: ['On a headshot, a 15% chance for +180% damage to primary weapons for 24 seconds.'] },
        { heading: 'Interactions', points: ['Solid primary damage; the long duration smooths over the lower trigger chance.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/HealthRegenAndArmorOnMeleeKill'],
    note: {
      tldr: 'Melee kills grant strong health regen and bonus armor.',
      sections: [
        { heading: 'Mechanics', points: ['On a melee kill, gain +24 Health Regen per second and +660 Armor for 10 seconds.'] },
        { heading: 'Interactions', points: ['A melee-tank sustain arcane with high uptime when you are actively killing in melee.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/ElectricityProcResist'],
    note: {
      tldr: 'Makes you immune to Toxin status (the poison that bypasses shields).',
      sections: [
        { heading: 'Mechanics', points: ['Grants +102% chance to resist a Toxin status effect.'] },
        { heading: 'Interactions', points: ['Valuable defense against Toxin (which ignores shields), so handy for shield-gating frames; status-resist family.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/LongGunDamageOnReload'],
    note: {
      tldr: 'Reloading your primary has a good chance at a big damage buff.',
      sections: [
        { heading: 'Mechanics', points: ['On reloading, a 60% chance for +150% damage to primary weapons for 24 seconds.'] },
        { heading: 'Interactions', points: ['Reliable primary damage; great on weapons you reload often.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Upgrades/CosmeticEnhancers/Utility/NoCostCastChanceOnCast',
      '/Lotus/Upgrades/CosmeticEnhancers/Utility/NoCostCastChanceAbility1Listener',
      '/Lotus/Upgrades/CosmeticEnhancers/Utility/NoCostCastChanceAbility2Listener',
      '/Lotus/Upgrades/CosmeticEnhancers/Utility/NoCostCastChanceAbility3Listener',
      '/Lotus/Upgrades/CosmeticEnhancers/Utility/NoCostCastChanceAbility4Listener',
    ],
    note: {
      tldr: 'Casting an ability has a chance to make your next few casts free.',
      sections: [
        { heading: 'Mechanics', points: ['On an ability cast, a 20% chance that your next three abilities cost no Energy.'] },
        { heading: 'Interactions', points: ['A budget efficiency pick — nice on cast-heavy frames, but unreliable.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/MeleeSpeedOnHit'],
    note: {
      tldr: 'Hitting enemies can speed up your melee swings.',
      sections: [
        { heading: 'Mechanics', points: ['On a melee hit, a 15% chance for +60% Attack Speed for 18 seconds.'] },
        { heading: 'Interactions', points: ['A cheap attack-speed boost with high uptime on fast melee.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/ArmorOnHeavyGunEquipped'],
    note: {
      tldr: 'Pulling out your Archgun grants a huge armor buff.',
      sections: [
        { heading: 'Mechanics', points: ['On equipping a heavy (Arch-)Gun, +1,200 Armor for 60 seconds.'] },
        { heading: 'Interactions', points: ['A tank pick for builds that carry a Heavy Weapon — equip it to top up armor, then swap back.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/GolemArcaneShotgunSpeedOnCrit'],
    note: {
      tldr: 'Critting with a shotgun can boost its fire rate.',
      sections: [
        { heading: 'Mechanics', points: ['On a critical hit, a 15% chance for +90% Fire Rate to Shotguns for 12 seconds.'] },
        { heading: 'Interactions', points: ['For crit shotguns; pairs with high crit chance to keep it active.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/InvisibilityOnFinisher'],
    note: {
      tldr: 'Finisher kills can turn you invisible.',
      sections: [
        { heading: 'Mechanics', points: ['On a finisher kill, a 15% chance to become invisible for 30 seconds.'] },
        { heading: 'Interactions', points: ['Free stealth for finisher-heavy builds (Ash, covert melee); chains nicely with Arcane Crepuscular.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/RadialViralAttackOnOverguardGain'],
    note: {
      tldr: 'Gaining Overguard blasts nearby enemies with full Viral status.',
      sections: [
        { heading: 'Mechanics', points: ['When you gain 3,000+ Overguard at once, release a 30m attack applying maximum Viral status stacks.'] },
        { heading: 'Interactions', points: ['For Overguard frames (Dante, Styanax, Kullervo, Rhino) — turns a defensive cast into a Viral damage-amp prime.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/GolemArcaneArmorOnFinisher'],
    note: {
      tldr: 'Finisher kills grant a big, long armor buff.',
      sections: [
        { heading: 'Mechanics', points: ['On a finisher kill, +1,200 Armor for 45 seconds.'] },
        { heading: 'Interactions', points: ['A tank pick for finisher builds, with long uptime once you land one.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/AbilityRadiationProcsCreateUniversalOrbsOnKill'],
    note: {
      tldr: 'Frames that spread Radiation can make enemies drop universal (health-or-energy) orbs.',
      sections: [
        { heading: 'Mechanics', points: ['Each Radiation status your abilities inflict gives a 6% chance to drop a Universal Orb when that enemy dies.'] },
        { heading: 'Interactions', points: ['Sustain for Radiation-ability frames (Nyx, Oberon, Qorvex); Universal Orbs fill whichever of health or energy you are missing.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/GolemArcanePistolSpeedOnCrit'],
    note: {
      tldr: 'Critting with a pistol very likely boosts its fire rate.',
      sections: [
        { heading: 'Mechanics', points: ['On a critical hit, a 90% chance for +120% Fire Rate to pistols for 9 seconds.'] },
        { heading: 'Interactions', points: ['Near-guaranteed on crit secondaries; a strong DPS arcane for pistols.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/HealthRegenOnHeadshot'],
    note: {
      tldr: 'Headshot kills can grant health regeneration.',
      sections: [
        { heading: 'Mechanics', points: ['On a headshot kill, a 75% chance for +3% Health Regeneration per second for 9 seconds.'] },
        { heading: 'Interactions', points: ['A sustain pick for headshot-heavy gunplay.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/FreezeProcResist'],
    note: {
      tldr: 'Makes you immune to Cold status (the slow).',
      sections: [
        { heading: 'Mechanics', points: ['Grants +102% chance to resist a Cold status effect.'] },
        { heading: 'Interactions', points: ['Targeted defense against Cold enemies; status-resist family.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/PowerStrengthOnKill'],
    note: {
      tldr: 'Kills slowly stack a large Ability Strength buff over a mission.',
      sections: [
        { heading: 'Mechanics', points: ['Each kill grants +0.24% Ability Strength, stacking up to 250 times (+60%) and persisting for the mission.'] },
        { heading: 'Interactions', points: ['A top strength arcane for endless missions — give it a few minutes for +60% free strength. Slow to ramp in short runs.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Zariman/WarframeOnShieldUptimePowerDuration'],
    note: {
      tldr: 'While your shields are up, Ability Duration climbs over time — up to +36%.',
      sections: [
        { heading: 'Mechanics', points: ['While shields are active, gain +6% Ability Duration per second up to +36%; drop to zero shields and it resets, then rebuilds as shields recharge.'] },
        { heading: 'Interactions', points: ['Strong on duration-hungry frames that keep shields up; useless on shieldless frames (Inaros, Nidus, Kullervo).'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/HealAlliesOnEnergySpent'],
    note: {
      tldr: 'Casting abilities heals you and your squad based on the energy spent.',
      sections: [
        { heading: 'Mechanics', points: ['Heals you and allies in Affinity range for 6 Health per point of Energy spent on an ability’s initial cast cost.'] },
        { heading: 'Interactions', points: ['Squad sustain for expensive-ability casters — bigger casts heal more.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Zariman/WarframeOnOperatorAbilityPowerStrength'],
    note: {
      tldr: 'Use an Operator ability to empower your next Warframe cast with Ability Strength.',
      sections: [
        { heading: 'Mechanics', points: ['After using an Operator ability, your next Warframe ability cast gains +45% Ability Strength.'] },
        { heading: 'Interactions', points: ['For Operator-weaving playstyles — pop an Operator ability, then dump the buffed cast.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/OrbsOnResidualContact'],
    note: {
      tldr: 'Part of the Theorem/Residual combo — a Residual zone spawns damage globes that raise enemy vulnerability.',
      sections: [
        { heading: 'Mechanics', points: ['While standing in a zone left by a Residual arcane, every 2s a globe spawns that strikes the nearest enemy within 15m and raises their vulnerability to that damage type by 200% for 6s; globes persist 30s after you leave the zone.'] },
        { heading: 'Interactions', points: ['Pairs with a Residual arcane on your secondary — the Residual lays the zone, this turns it into damage and a vulnerability debuff.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/WeaponDamageOnResidualContact'],
    note: {
      tldr: 'Standing in a Residual zone ramps your weapon damage hard.',
      sections: [
        { heading: 'Mechanics', points: ['While in a zone left by a Residual arcane, weapon damage climbs +12% per second up to 15 stacks (+180%), lingering 20s after you leave.'] },
        { heading: 'Interactions', points: ['The damage half of the Theorem/Residual combo — drop a Residual zone and stand in it to stack the buff.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/CompanionDamageOnResidualContact'],
    note: {
      tldr: 'Standing in a Residual zone massively buffs your companion and summons.',
      sections: [
        { heading: 'Mechanics', points: ['While in a zone left by a Residual arcane, the damage of companions and summoned allies within 90m climbs +24% per second up to 15 stacks, lingering 20s after you leave.'] },
        { heading: 'Interactions', points: ['The pet/summon half of the Theorem/Residual combo — for pet or minion builds that hold a Residual zone.'] },
      ],
      status: 'beta',
    },
  },

  // ── Primary weapon arcanes ──
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Zariman/PrimaryOnAbilityReloadSpeed'],
    note: {
      tldr: 'Casting an ability greatly speeds your primary’s reload.',
      sections: [
        { heading: 'Mechanics', points: ['On an ability cast, +240% Reload Speed for 5 seconds.'] },
        { heading: 'Interactions', points: ['For ability-weaving gun builds — cast, then reload almost instantly.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/PrimaryHeadshotCritMultOnHeadshot'],
    note: {
      tldr: 'Toxin procs stack big critical damage and multishot on your primary.',
      sections: [
        { heading: 'Mechanics', points: ['Each Toxin status you inflict grants +3.6% Critical Damage and +1.8% Multishot for 12 seconds, stacking up to 40 times.'] },
        { heading: 'Interactions', points: ['For Toxin/Viral status primaries that can keep the stacks topped up.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/DamageForBonusArmour'],
    note: {
      tldr: 'Turns a high-armor build into raw primary-weapon damage.',
      sections: [
        { heading: 'Mechanics', points: ['Gain +1% primary damage for each point of Armor past 1,000, up to +500%.'] },
        { heading: 'Interactions', points: ['For armor-stacking frames (Archon Shards, Steel Fiber) that also want gun damage.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/StatusAndAmmoEfficiencyOnWeakpointHit'],
    note: {
      tldr: 'Weak-point hits stack status chance and ammo efficiency.',
      sections: [
        { heading: 'Mechanics', points: ['On a weak-point hit, +30% Status Chance and +6% Ammo Efficiency for 10 seconds, stacking up to 10 times.'] },
        { heading: 'Interactions', points: ['For precise status primaries — rewards consistent weak-point aim.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/PrimaryDamageOnNoMelee'],
    note: {
      tldr: 'Headshot kills build a strong, lasting primary-damage buff plus a headshot bonus.',
      sections: [
        { heading: 'Mechanics', points: ['On a headshot kill, +120% Damage for 24 seconds (stacks up to 3x), plus +30% Headshot Multiplier and -50% recoil.'] },
        { heading: 'Interactions', points: ['A staple precision-primary arcane; pairs with Merciless for a strong two-arcane setup.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/SplitStatusProcsOnStackedStatusHit'],
    note: {
      tldr: 'Re-applying a combined status to a heavily-stacked enemy also applies its base elements.',
      sections: [
        { heading: 'Mechanics', points: ['If an enemy has 10 stacks of a combined status (e.g. Viral), inflicting that status again has a 100% chance to also apply one of the base elements it is made from.'] },
        { heading: 'Interactions', points: ['Niche status-layering tool for builds that pile combined elements high.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/PrimaryDamageOnMeleeKill'],
    note: {
      tldr: 'Melee kills stack a primary-damage buff and extend your combo.',
      sections: [
        { heading: 'Mechanics', points: ['On a melee kill, +60% Primary Damage for 20 seconds (stacks up to 6x) and +7.5s Combo Duration.'] },
        { heading: 'Interactions', points: ['For gun-and-melee hybrids; pairs with a Secondary/Melee Dexterity for crossover buffs.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/PrimaryEnergyRegenOnImpactProc'],
    note: {
      tldr: 'Impact procs trickle energy back to you.',
      sections: [
        { heading: 'Mechanics', points: ['Each Impact status grants +1.2 Energy Regen per second for 10 seconds, stacking up to 3 times.'] },
        { heading: 'Interactions', points: ['Energy sustain for Impact-heavy primaries on caster frames.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/PrimaryCritDmgAndMultishotOnColdProc'],
    note: {
      tldr: 'Cold procs stack critical damage and multishot on your primary.',
      sections: [
        { heading: 'Mechanics', points: ['Each Cold status grants +3% Critical Damage and +2.25% Multishot for 12 seconds, stacking up to 40 times.'] },
        { heading: 'Interactions', points: ['For Cold/Viral status primaries; the Frostbite counterpart to Blight.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/PrimaryDamageOnKill'],
    note: {
      tldr: 'The bread-and-butter primary arcane — kills stack a big damage buff and speed reloads.',
      sections: [
        { heading: 'Mechanics', points: ['On a kill, +30% Damage for 4 seconds (stacks up to 12x, so +360%), plus +30% Reload Speed.'] },
        { heading: 'Interactions', points: ['A top damage arcane on any primary that gets steady kills; the go-to pairing with Primary Deadhead.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/PrimaryJamEnemyWeaponsOnMagneticProc'],
    note: {
      tldr: 'Magnetic procs jam nearby enemy guns.',
      sections: [
        { heading: 'Mechanics', points: ['On a Magnetic status, enemy weapons jam within 15m of the target (10-second cooldown).'] },
        { heading: 'Interactions', points: ['A defensive/control pick for Magnetic primaries against gun-heavy Corpus.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/MultishotForMaxEnergy'],
    note: {
      tldr: 'A full energy bar converts into huge multishot.',
      sections: [
        { heading: 'Mechanics', points: ['While at or above 90% Energy, gain 35% of your Max Energy as Multishot, capped at +350%.'] },
        { heading: 'Interactions', points: ['Massive on high-energy frames that rarely cast (or refill fast); drops off the moment you spend energy.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/PrimaryDamagePerAmmoOnReload'],
    note: {
      tldr: 'Reloading grants bonus damage scaling with your magazine size.',
      sections: [
        { heading: 'Mechanics', points: ['On reload, deal increased damage per round loaded, based on max magazine size, for 10 seconds.'] },
        { heading: 'Interactions', points: ['Rewards big-magazine primaries; reload to refresh the buff.'] },
      ],
      status: 'beta',
    },
  },

  // ── Secondary weapon arcanes ──
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/AmmoEfficiencyOnSliding'],
    note: {
      tldr: 'Sliding or aim-gliding makes Dual Pistols sip ammo.',
      sections: [
        { heading: 'Mechanics', points: ['While sliding or aim-gliding, gain +65% Ammo Efficiency with Dual Pistols.'] },
        { heading: 'Interactions', points: ['For ammo-hungry akimbo secondaries you fire on the move.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Zariman/SecondaryOnRollCritChanceOnHeadshot'],
    note: {
      tldr: 'Roll for a huge weak-point critical-chance window on your secondary.',
      sections: [
        { heading: 'Mechanics', points: ['On a roll, +300% Critical Chance on weak-point hits for 4 seconds.'] },
        { heading: 'Interactions', points: ['For precision secondaries; roll, then land weak-point shots in the window.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Zariman/SecondaryOnStatusProcBonusDamage'],
    note: {
      tldr: 'Every status proc adds a chunk of matching bonus damage.',
      sections: [
        { heading: 'Mechanics', points: ['On a status effect, deal +750 bonus damage matching that status’s damage type.'] },
        { heading: 'Interactions', points: ['Strong on high-status secondaries that proc constantly.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/SecondaryDamageOnHeatProc'],
    note: {
      tldr: 'Heat procs ramp your secondary’s damage hard.',
      sections: [
        { heading: 'Mechanics', points: ['Each Heat status grants +12% Damage for 10 seconds, stacking up to +480%.'] },
        { heading: 'Interactions', points: ['For Heat-status secondaries; keep enemies burning to hold the stacks.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Zariman/SecondaryOnOvershieldCritChance'],
    note: {
      tldr: 'Holding overshields grants a massive secondary crit boost.',
      sections: [
        { heading: 'Mechanics', points: ['While Overshields are active, +300% Critical Chance.'] },
        { heading: 'Interactions', points: ['Pairs with shield-gating/overshield builds (Harrow, Styanax, Brief Respite).'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/SecondaryReloadSpeedAndMultishotOnElectricProc'],
    note: {
      tldr: 'Electricity procs stack reload speed and multishot.',
      sections: [
        { heading: 'Mechanics', points: ['Each Electricity status grants +1.5% Reload Speed and +3% Multishot for 12 seconds, stacking up to 40 times.'] },
        { heading: 'Interactions', points: ['For Electric-status secondaries that proc often.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/SecondaryDamageOnNoMelee'],
    note: {
      tldr: 'Precision headshot kills build a lasting secondary-damage and headshot buff.',
      sections: [
        { heading: 'Mechanics', points: ['On a precision headshot kill, +120% Damage for 24 seconds (stacks up to 3x), plus +30% Headshot Multiplier and -50% recoil.'] },
        { heading: 'Interactions', points: ['The secondary Deadhead; pairs with Secondary Merciless on precise pistols.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/SecondaryDamageOnMeleeKill'],
    note: {
      tldr: 'Melee kills stack a secondary-damage buff and extend your combo.',
      sections: [
        { heading: 'Mechanics', points: ['On a melee kill, +60% Secondary Damage for 20 seconds (stacks up to 6x) and +7.5s Combo Duration.'] },
        { heading: 'Interactions', points: ['For gun-and-melee hybrids; the secondary Dexterity.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/ExtraProcOnProc'],
    note: {
      tldr: 'Every status proc has a chance to spit out a second random one.',
      sections: [
        { heading: 'Mechanics', points: ['On a status effect, +24% chance to trigger a second random status effect.'] },
        { heading: 'Interactions', points: ['For chaotic multi-status builds; great into Condition-Overload-style scaling.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/SecondaryCritOnHit'],
    note: {
      tldr: 'Each hit ramps crit chance until you land a big crit.',
      sections: [
        { heading: 'Mechanics', points: ['On hit, +10% Critical Chance; the bonus resets after you land 6 orange/red critical hits.'] },
        { heading: 'Interactions', points: ['Smooths low-crit secondaries up to reliable crits over a few shots.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/OverguardSteal'],
    note: {
      tldr: 'Tears down enemy Overguard and turns it into Overguard for you.',
      sections: [
        { heading: 'Mechanics', points: ['Your secondary deals 8x extra damage to Overguard, and you gain 1 Overguard for every 100 Overguard damage dealt.'] },
        { heading: 'Interactions', points: ['Excellent into Overguard-heavy enemies (Eximus); both a counter and a self-tank.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/RadialDamageOnMaxRadiationStackHit'],
    note: {
      tldr: 'Hitting a fully Radiation-stacked enemy detonates area damage.',
      sections: [
        { heading: 'Mechanics', points: ['Hitting an enemy with 10 stacks of Radiation deals 180% of the hit’s damage to enemies within 7m.'] },
        { heading: 'Interactions', points: ['For Radiation secondaries; stack it up then spread the explosion.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/SecondaryCritChancePerBuff'],
    note: {
      tldr: 'Buffing your allies sharpens your secondary’s crit.',
      sections: [
        { heading: 'Mechanics', points: ['While you are buffing ally Warframes, +20% Critical Chance per active buff.'] },
        { heading: 'Interactions', points: ['For support frames that hand out buffs (Wisp, Volt, Harrow) wanting a strong secondary.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/SecondaryDamageOnKill'],
    note: {
      tldr: 'The bread-and-butter secondary arcane — kills stack damage and speed reloads.',
      sections: [
        { heading: 'Mechanics', points: ['On a kill, +30% Damage for 4 seconds (stacks up to 12x), plus +30% Reload Speed.'] },
        { heading: 'Interactions', points: ['A top damage arcane on any secondary with steady kills; pairs with Secondary Deadhead.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/MultishotForCombo'],
    note: {
      tldr: 'Swap to your secondary to spend melee combo for a big crit window.',
      sections: [
        { heading: 'Mechanics', points: ['On swapping to your secondary, consume all melee combo to gain +20% Critical Chance and Critical Damage per combo multiplier consumed for 30 seconds.'] },
        { heading: 'Interactions', points: ['For melee-into-gun playstyles — build combo, swap, and burst with the buffed secondary.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/SecondaryExtraDamagePerFreezeStack'],
    note: {
      tldr: 'Cold-stacked enemies take far more damage from your secondary.',
      sections: [
        { heading: 'Mechanics', points: ['Enemies take +45% damage per Cold status stack on them.'] },
        { heading: 'Interactions', points: ['Huge multiplier on Cold/Viral secondaries that pile on Cold stacks.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/BonusDamageNextShotForCurEnergy'],
    note: {
      tldr: 'Casting an ability supercharges your next secondary shot based on your energy.',
      sections: [
        { heading: 'Mechanics', points: ['On an ability cast, your next shot gains a damage multiplier per 200 current Energy, up to x8.'] },
        { heading: 'Interactions', points: ['For high-energy casters with a hard-hitting single-shot secondary.'] },
      ],
      status: 'beta',
    },
  },

  // ── Melee arcanes ──
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/DuplicateStatusOnKnock'],
    note: {
      tldr: 'Knocking or flinging status-afflicted enemies piles on extra stacks.',
      sections: [
        { heading: 'Mechanics', points: ['Enemies with status effects gain 6 additional stacks when knocked down or flung by your melee attacks.'] },
        { heading: 'Interactions', points: ['For slam/knockdown melee into status-scaling damage (Viral, Slash).'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/HeavyCritOnRegularMelee'],
    note: {
      tldr: 'Light attacks bank enormous critical chance for your next heavy attack.',
      sections: [
        { heading: 'Mechanics', points: ['On a melee hit, gain +42% Critical Chance on your next Heavy Attack, stacking up to +420%.'] },
        { heading: 'Interactions', points: ['A heavy-attack staple — chip with light attacks, then unload a massive crit heavy.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/FreezeEnemiesOnRoll'],
    note: {
      tldr: 'Roll to freeze enemies, then hit them for doubled melee damage.',
      sections: [
        { heading: 'Mechanics', points: ['Deal x2.5 melee damage to Frozen enemies; rolling freezes enemies within 5.5m (2-second cooldown).'] },
        { heading: 'Interactions', points: ['A self-contained freeze-and-smash combo for aggressive melee.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/PermaComboOnFinisher'],
    note: {
      tldr: 'A single finisher kill grants permanent starting combo for the mission.',
      sections: [
        { heading: 'Mechanics', points: ['On a finisher kill, gain +6 initial Combo for the rest of the mission.'] },
        { heading: 'Interactions', points: ['Stacks across finishers to start every swing at high combo — superb for heavy-attack and combo builds.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/CritDamageForPunctureStatus'],
    note: {
      tldr: 'Puncture status chance on your melee converts into critical damage.',
      sections: [
        { heading: 'Mechanics', points: ['Gain +1x Critical Damage for every 10% Puncture status chance on your melee weapon.'] },
        { heading: 'Interactions', points: ['Niche; build heavy Puncture status to cash it into crit-damage.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/ReplayLightCritHits'],
    note: {
      tldr: 'Critical melee hits strike a guaranteed second time.',
      sections: [
        { heading: 'Mechanics', points: ['On a base (orange/red) critical hit, 100% chance for the attack to strike a second time.'] },
        { heading: 'Interactions', points: ['Roughly doubles damage on high-crit melee — a premier melee damage arcane.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/CorrosiveMeleePerAbilityCast'],
    note: {
      tldr: 'Casting abilities laces your melee with stacking Corrosive damage.',
      sections: [
        { heading: 'Mechanics', points: ['On an ability cast, gain +60% Corrosive Damage on melee strikes for 25 seconds, stacking up to +240%.'] },
        { heading: 'Interactions', points: ['For cast-and-slash hybrids that want extra armor-chewing Corrosive.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/ArmorOnMeleeKill'],
    note: {
      tldr: 'Melee kills grant bonus armor.',
      sections: [
        { heading: 'Mechanics', points: ['On a melee kill, +210 Armor for 10 seconds.'] },
        { heading: 'Interactions', points: ['A cheap survivability arcane for melee-heavy play.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/MeleeProcsSpread'],
    note: {
      tldr: 'An Electric melee proc spreads your elemental status across a wide area.',
      sections: [
        { heading: 'Mechanics', points: ['On a melee Electricity status, a 20% chance for your elemental melee status effects to spread to enemies within 20m for 18 seconds (cannot refresh while active).'] },
        { heading: 'Interactions', points: ['A top status-spread arcane — pair with Electricity to blanket crowds in your other statuses (Viral, Heat).'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/MeleeDamageForActiveShields'],
    note: {
      tldr: 'A full shield pool converts into big melee damage.',
      sections: [
        { heading: 'Mechanics', points: ['Gain +30% Melee Damage per 200 current Shields, up to +420% (the bonus from Overshields counts at half).'] },
        { heading: 'Interactions', points: ['For high-shield frames that keep shields up while meleeing.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/PullEnemiesOnMeleeKill'],
    note: {
      tldr: 'Killing a Magnetic-stacked enemy in melee vacuums in the crowd.',
      sections: [
        { heading: 'Mechanics', points: ['Killing an enemy affected by Magnetic status has a 45% chance to pull enemies within 18m toward you.'] },
        { heading: 'Interactions', points: ['A grouping tool for Magnetic melee builds, setting up the next swing.'] },
      ],
      status: 'beta',
    },
  },

  // ── Zaw arcanes ──
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/ChannelKillEnergyRate'],
    note: {
      tldr: 'Heavy-attack kills with a Zaw trickle energy back.',
      sections: [
        { heading: 'Mechanics', points: ['On a heavy-attack kill, +5 Energy Rate for 4 seconds, stacking up to 3 times.'] },
        { heading: 'Interactions', points: ['Energy sustain for heavy-attack Zaw builds.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/MeleeArcaneProjectileOnJump'],
    note: {
      tldr: 'The famous Zaw arcane — air-melee launches an exploding projectile.',
      sections: [
        { heading: 'Mechanics', points: ['After a Bullet Jump or Double Jump, a melee attack while aim-gliding launches a projectile that explodes on impact.'] },
        { heading: 'Interactions', points: ['A long-standing ranged-melee build (Exodia Contagion) — bullet-jump, glide, and fling explosions.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/MeleeArcaneShockwaveOnJump'],
    note: {
      tldr: 'Air-slam your Zaw to launch a crowd-suspending shockwave.',
      sections: [
        { heading: 'Mechanics', points: ['After a Bullet Jump or Double Jump, a slam emits a forward shockwave that suspends enemies in the air briefly.'] },
        { heading: 'Interactions', points: ['A crowd-control companion to the Exodia Contagion playstyle.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/StatusTriggerRadialDamage'],
    note: {
      tldr: 'Status procs trigger area weapon damage around the target.',
      sections: [
        { heading: 'Mechanics', points: ['On a status effect, a 50% chance to deal 200% weapon damage to enemies within 6m.'] },
        { heading: 'Interactions', points: ['Adds AoE to a single-target status Zaw.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/GroundSlamPull'],
    note: {
      tldr: 'Ground-slam to drag enemies into melee range.',
      sections: [
        { heading: 'Mechanics', points: ['On a ground slam, a 50% chance to pull enemies within 12m into melee range.'] },
        { heading: 'Interactions', points: ['A grouping tool for slam-heavy Zaw builds.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/FinisherLifesteal'],
    note: {
      tldr: 'Finisher kills grant melee life-steal.',
      sections: [
        { heading: 'Mechanics', points: ['On a finisher kill, a 50% chance for +30% Life Steal for 8 seconds.'] },
        { heading: 'Interactions', points: ['Sustain for finisher-focused melee.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/StatusChannelingDamage'],
    note: {
      tldr: 'Boosts how fast your Zaw builds melee combo.',
      sections: [
        { heading: 'Mechanics', points: ['+50% Additional Combo Count Chance.'] },
        { heading: 'Interactions', points: ['Ramps combo faster for combo-scaling melee builds.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/CritChannelingDamage'],
    note: {
      tldr: 'Hugely boosts combo gain against lifted (airborne) enemies.',
      sections: [
        { heading: 'Mechanics', points: ['+200% Additional Combo Count Chance on Lifted enemies.'] },
        { heading: 'Interactions', points: ['Pairs with lift effects to spike your combo counter fast.'] },
      ],
      status: 'beta',
    },
  },

  // ── Kitgun arcanes (Pax = effects; Residual = lay zones for Theorem arcanes) ──
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/EnergyEfficiencyOnHeadshot'],
    note: {
      tldr: 'Kitgun headshot kills empower your next ability.',
      sections: [
        { heading: 'Mechanics', points: ['On a headshot kill, +30% Ability Efficiency and +30% Ability Strength on the next ability used within 4 seconds.'] },
        { heading: 'Interactions', points: ['For gun-caster hybrids — headshot, then immediately cast.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/BulletToBattery'],
    note: {
      tldr: 'Speeds up the recharge of battery-type kitguns (Catchmoon-style).',
      sections: [
        { heading: 'Mechanics', points: ['Reduces battery recharge delay by 50%.'] },
        { heading: 'Interactions', points: ['Only useful on kitguns with a battery (charge) mechanic.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/SeekerProjOnHeadshotKill'],
    note: {
      tldr: 'Kitgun headshot kills spray homing projectiles at nearby heads.',
      sections: [
        { heading: 'Mechanics', points: ['On a headshot kill, 4 projectiles burst from the target and seek the heads of nearby enemies.'] },
        { heading: 'Interactions', points: ['Adds chain-headshot clears to a precise kitgun.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/EyeInTheSky'],
    note: {
      tldr: 'Improves kitgun accuracy while airborne.',
      sections: [
        { heading: 'Mechanics', points: ['+50% Accuracy while airborne.'] },
        { heading: 'Interactions', points: ['A small quality-of-life pick for aerial kitgun play.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/BurningCystOnKill'],
    note: {
      tldr: 'Kitgun kills can lay a Heat zone that feeds Theorem arcanes.',
      sections: [
        { heading: 'Mechanics', points: ['On a kitgun kill, a 20% chance to spawn volatile hives for 12s that explode for Heat damage when enemies approach; standing in the area applies the Heat type to your Theorem arcanes.'] },
        { heading: 'Interactions', points: ['The Heat Residual — pair it with a Theorem arcane (Demulcent/Contagion/Infection) to power the combo.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/IceMistOnKill'],
    note: {
      tldr: 'Kitgun kills can lay a Cold zone that feeds Theorem arcanes.',
      sections: [
        { heading: 'Mechanics', points: ['On a kitgun kill, a 20% chance to create a frigid mist for 12s dealing Cold damage; standing in the area applies the Cold type to your Theorem arcanes.'] },
        { heading: 'Interactions', points: ['The Cold Residual — lays the zone a Theorem arcane stands in.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/LightningStrikeOnKill'],
    note: {
      tldr: 'Kitgun kills can lay an Electricity zone that feeds Theorem arcanes.',
      sections: [
        { heading: 'Mechanics', points: ['On a kitgun kill, a 20% chance to spawn an electrified spike for 12s dealing Electricity damage within 10m; standing in the area applies the Electricity type to your Theorem arcanes.'] },
        { heading: 'Interactions', points: ['The Electricity Residual — lays the zone a Theorem arcane stands in.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/ToxicBloodOnKill'],
    note: {
      tldr: 'Kitgun kills can lay a Toxin zone that feeds Theorem arcanes.',
      sections: [
        { heading: 'Mechanics', points: ['On a kitgun kill, a 20% chance to create a pool of toxic blood for 12s dealing Toxin damage; standing in the area applies the Toxin type to your Theorem arcanes.'] },
        { heading: 'Interactions', points: ['The Toxin Residual — lays the zone a Theorem arcane stands in.'] },
      ],
      status: 'beta',
    },
  },

  // ── Bow & Shotgun arcanes ──
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/LongbowDamageOnHeadshot'],
    note: {
      tldr: 'Bow headshots load up a huge next shot.',
      sections: [
        { heading: 'Mechanics', points: ['On a headshot, gain +300% damage on your next shot.'] },
        { heading: 'Interactions', points: ['For precise bow play — headshot, then fire an empowered arrow.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/ShotgunMultishotAndReloadSpeedOnCloseKill'],
    note: {
      tldr: 'Point-blank shotgun kills grant big multishot and reload speed.',
      sections: [
        { heading: 'Mechanics', points: ['On a shotgun kill within 5m of the target, +180% Multishot and +75% Reload Speed for 15 seconds.'] },
        { heading: 'Interactions', points: ['Rewards in-your-face shotgun play; keep close kills coming to hold the buff.'] },
      ],
      status: 'beta',
    },
  },

  // ── Operator arcanes (Magus / Emergence — Operator & Void-mode effects) ──
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Zariman/EnergyOnGhostDissipate'],
    note: {
      tldr: 'Dissipate your Void Sling to drop energy motes for your Operator.',
      sections: [
        { heading: 'Mechanics', points: ['While in a Void Sling, pressing again dissipates the endpoint in a 10m radius; enemies hit create a short-lived Void Mote that restores 10 Energy on pickup.'] },
        { heading: 'Interactions', points: ['Amp-energy sustain for active Operator play.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Zariman/OperatorOnEnergyDepletedRegenEnergy'],
    note: {
      tldr: 'Running your Operator out of energy kicks off a big regen burst.',
      sections: [
        { heading: 'Mechanics', points: ['On energy depleted, increase Energy Regeneration by 300% over 5 seconds (30-second cooldown).'] },
        { heading: 'Interactions', points: ['Amp-energy sustain for heavy Operator/Amp use.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Zariman/OperatorOnDeathInvulnerability'],
    note: {
      tldr: 'A cheat-death for your Operator — survive a lethal hit and heal.',
      sections: [
        { heading: 'Mechanics', points: ['On lethal damage, become invulnerable for 5 seconds and recover 60% Health (90-second cooldown).'] },
        { heading: 'Interactions', points: ['A safety net for squishy Operator builds in hard content.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/HeatResistOnBlast'],
    note: {
      tldr: 'Void Sling to strip enemy Heat resistance.',
      sections: [
        { heading: 'Mechanics', points: ['On a Void Sling, reduce enemy resistance to Heat damage by 65%.'] },
        { heading: 'Interactions', points: ['A niche Eidolon/boss tool to make Heat builds hit harder.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Offensive/OperatorHeavyMeleeDamageOnTransference'],
    note: {
      tldr: 'Transferring back to your Warframe supercharges heavy-blade crits.',
      sections: [
        { heading: 'Mechanics', points: ['On Warframe melee Transference, Heavy Blades deal +300% Critical Damage for 4 consecutive attacks (20-second cooldown).'] },
        { heading: 'Interactions', points: ['For Operator-weaving heavy-blade melee builds.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/PullOnTransferenceIn'],
    note: {
      tldr: 'Jumping back into your Warframe vacuums enemies toward you.',
      sections: [
        { heading: 'Mechanics', points: ['On Transference in, enemies within 30m are pulled toward your Warframe.'] },
        { heading: 'Interactions', points: ['A grouping tool that triggers each time you return from Operator.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/SpeedOnVoidDash'],
    note: {
      tldr: 'Void Sling for an Operator sprint-speed boost.',
      sections: [
        { heading: 'Mechanics', points: ['On a Void Sling, +90% Sprint Speed for 12 seconds.'] },
        { heading: 'Interactions', points: ['A mobility pick for open-world Operator traversal.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/ImmunityFallDamageOnVoidDash'],
    note: {
      tldr: 'Void Sling to greatly widen your next Sling.',
      sections: [
        { heading: 'Mechanics', points: ['On Void Mode, +300% Void Sling radius for 6 seconds.'] },
        { heading: 'Interactions', points: ['A traversal/utility pick for covering distance with the Operator.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/ProcResistOnBlast'],
    note: {
      tldr: 'Void Sling to strip enemy Puncture resistance.',
      sections: [
        { heading: 'Mechanics', points: ['On a Void Sling, reduce enemy resistance to Puncture damage by 65%.'] },
        { heading: 'Interactions', points: ['A niche tool to soften high-resistance targets for Puncture builds.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/HoverboardSpeedOnTransferenceIn'],
    note: {
      tldr: 'Transfer in to speed up your K-Drive.',
      sections: [
        { heading: 'Mechanics', points: ['On Transference in, +150% K-Drive speed for 30 seconds.'] },
        { heading: 'Interactions', points: ['A pure open-world traversal pick for K-Drive riders.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/HealOnTransferenceIn'],
    note: {
      tldr: 'Jumping back into your Warframe almost always heals it — a staple survivability arcane.',
      sections: [
        { heading: 'Mechanics', points: ['On Transference in, a 95% chance to restore 300 Health to your Warframe.'] },
        { heading: 'Interactions', points: ['One of the most-used Operator arcanes: a quick Operator dip becomes a reliable Warframe heal.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/DamageReductionOnVoidMode'],
    note: {
      tldr: 'Crouch in Void Mode to bank stacking damage reduction.',
      sections: [
        { heading: 'Mechanics', points: ['In Void Mode, generate a Void Particle every second up to 6, each granting +12.5% Damage Reduction for 60s; taking damage consumes a particle.'] },
        { heading: 'Interactions', points: ['Strong Operator survivability — charge up particles before a dangerous fight.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/NoPenaltyOnDeath'],
    note: {
      tldr: 'Negates Transference Static (the penalty for your Operator dying).',
      sections: [
        { heading: 'Mechanics', points: ['On Transference Static, a 102% chance to negate it.'] },
        { heading: 'Interactions', points: ['Removes the downside of an Operator death, keeping you in the fight.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/ArmourOnOperatorMode'],
    note: {
      tldr: 'Switching to your Operator grants it bonus armor.',
      sections: [
        { heading: 'Mechanics', points: ['On Transference out, +300 Armor to the Operator.'] },
        { heading: 'Interactions', points: ['Operator survivability; pairs with the Vigor health arcane.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/TetherMineOnDash'],
    note: {
      tldr: 'Void Sling to drop a mine that tethers a crowd in place.',
      sections: [
        { heading: 'Mechanics', points: ['On a Void Sling, drop a mine that tethers up to 10 enemies within 15m for 4 seconds.'] },
        { heading: 'Interactions', points: ['A strong Operator crowd-control tool for setting up kills.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/HeatDamageOnDash'],
    note: {
      tldr: 'Void Sling to stack up your Operator’s Heat damage.',
      sections: [
        { heading: 'Mechanics', points: ['On a Void Sling, +30% Heat damage in Operator mode for 15 seconds, stacking up to 7 times.'] },
        { heading: 'Interactions', points: ['For Heat-Amp Operator damage builds.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/HealOnTransferenceOut'],
    note: {
      tldr: 'While you’re playing as the Operator, your Warframe steadily heals.',
      sections: [
        { heading: 'Mechanics', points: ['While an Operator, restore 35 Health per second to your Warframe.'] },
        { heading: 'Interactions', points: ['Passive Warframe sustain for Operator-heavy playstyles.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/RobotStunOnBlast'],
    note: {
      tldr: 'Void Sling to stun robots and turn them into Electric bombs.',
      sections: [
        { heading: 'Mechanics', points: ['On a Void Sling, stun robotic enemies for 3 seconds; they then discharge Electricity dealing 80% of their max health to anyone within 25m.'] },
        { heading: 'Interactions', points: ['A strong anti-Corpus-robot tool that chains into area damage.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/HealOnVoidMode'],
    note: {
      tldr: 'Void Mode heals the whole squad’s Warframes around you.',
      sections: [
        { heading: 'Mechanics', points: ['In Void Mode, heal Warframes within 30m for 25% Health per second.'] },
        { heading: 'Interactions', points: ['A potent team-heal — dip into Void Mode to top up the squad.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/HealOnVoidDash'],
    note: {
      tldr: 'Void Sling for a quick Warframe heal.',
      sections: [
        { heading: 'Mechanics', points: ['On a Void Sling, heal 30% Health.'] },
        { heading: 'Interactions', points: ['A simple, on-demand heal via the Operator.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/ReverseOnDash'],
    note: {
      tldr: 'Void Sling, then rewind your Operator back to where it started.',
      sections: [
        { heading: 'Mechanics', points: ['On a Void Sling, use it again within 3 seconds to return the Operator to its original position at no energy cost and restore 60 Health (3-second cooldown).'] },
        { heading: 'Interactions', points: ['A mobility-and-escape tool — dart out and snap back safely.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorArmour/HealthOnOperatorMode'],
    note: {
      tldr: 'Switching to your Operator grants it a big chunk of health.',
      sections: [
        { heading: 'Mechanics', points: ['On Transference out, +600 Health to the Operator.'] },
        { heading: 'Interactions', points: ['Core Operator survivability; pairs with the Husk armor arcane.'] },
      ],
      status: 'beta',
    },
  },

  // ── Amp arcanes (Eternal / Virtuos — for Operator Amps) ──
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Zariman/OperatorOnOperatorAbilityIncreaseDamage'],
    note: {
      tldr: 'Using an Operator ability buffs your Amp’s damage.',
      sections: [
        { heading: 'Mechanics', points: ['On an Operator ability, +60% Amp damage for 8 seconds.'] },
        { heading: 'Interactions', points: ['For active Amp damage play — weave an Operator ability before firing.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Zariman/AmpOnVoidSlingAmpAmmoEfficiency'],
    note: {
      tldr: 'Void Sling to make your Amp sip its energy.',
      sections: [
        { heading: 'Mechanics', points: ['On a Void Sling, +72% Amp Ammo Efficiency for 8 seconds.'] },
        { heading: 'Interactions', points: ['Amp-uptime sustain for sustained Operator fire.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Zariman/AmpOnEnergyDepletedCritChance'],
    note: {
      tldr: 'Burning through your Amp energy rewards you with huge crit chance.',
      sections: [
        { heading: 'Mechanics', points: ['On energy depleted, +180% Critical Chance for 8 seconds.'] },
        { heading: 'Interactions', points: ['For crit-Amp burst windows; pairs with the energy-regen Operator arcanes.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorAmps/VoidToHeatDamage'],
    note: {
      tldr: 'Converts your Amp’s Void damage to Heat.',
      sections: [
        { heading: 'Mechanics', points: ['On hit, converts 98% of Void damage to Heat damage.'] },
        { heading: 'Interactions', points: ['For general content where an elemental Amp beats neutral Void; one of a family of conversion arcanes.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorAmps/IncreasedDamageOnStatusProc'],
    note: {
      tldr: 'Amp status procs have a chance to boost its damage.',
      sections: [
        { heading: 'Mechanics', points: ['On a status effect, a 20% chance for +30% Amp damage for 4 seconds.'] },
        { heading: 'Interactions', points: ['For status-converted Amps that proc often.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorAmps/StatusChanceOnHeadshot'],
    note: {
      tldr: 'Amp headshots build status chance.',
      sections: [
        { heading: 'Mechanics', points: ['On a headshot, a 40% chance for +60% Status Chance for 12 seconds.'] },
        { heading: 'Interactions', points: ['For status-Amp builds; the status counterpart to Virtuos Shadow.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorAmps/OperatorAmmoRegenOnKill'],
    note: {
      tldr: 'Amp kills regenerate Amp energy.',
      sections: [
        { heading: 'Mechanics', points: ['On a kill, +20% Amp Energy Regeneration for 4 seconds.'] },
        { heading: 'Interactions', points: ['Amp-uptime sustain in kill-heavy content.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorAmps/CriticalChanceOnHeadshot'],
    note: {
      tldr: 'The Eidolon staple — Amp headshots grant a big critical-chance boost.',
      sections: [
        { heading: 'Mechanics', points: ['On a headshot, a 40% chance for +60% Critical Chance for 12 seconds.'] },
        { heading: 'Interactions', points: ['A go-to arcane for Eidolon-hunting Amps; pairs with Virtuos Strike for crit damage.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorAmps/VoidToPunctureDamage'],
    note: {
      tldr: 'Converts your Amp’s Void damage to Puncture.',
      sections: [
        { heading: 'Mechanics', points: ['On hit, converts 98% of Void damage to Puncture damage.'] },
        { heading: 'Interactions', points: ['An anti-armor conversion for content where Void is neutral.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorAmps/IncreasedCriticalDamageOnCriticalStrike'],
    note: {
      tldr: 'Amp crits have a chance to boost critical damage.',
      sections: [
        { heading: 'Mechanics', points: ['On a critical hit, a 20% chance for +80% Critical Damage for 4 seconds.'] },
        { heading: 'Interactions', points: ['For crit-Amp builds; stacks the hurt alongside Virtuos Shadow.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorAmps/VoidToElectricDamage'],
    note: {
      tldr: 'Converts your Amp’s Void damage to Electricity.',
      sections: [
        { heading: 'Mechanics', points: ['On hit, converts 98% of Void damage to Electricity damage.'] },
        { heading: 'Interactions', points: ['An elemental conversion for general content; one of a family of conversion arcanes.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorAmps/AttackSpeedOnKill'],
    note: {
      tldr: 'Amp kills boost its fire rate.',
      sections: [
        { heading: 'Mechanics', points: ['On a kill, a 60% chance for +60% Fire Rate for 8 seconds.'] },
        { heading: 'Interactions', points: ['Smooths sustained Amp DPS in kill-heavy content.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/OperatorAmps/VoidToViralDamage'],
    note: {
      tldr: 'Converts your Amp’s Void damage to Viral.',
      sections: [
        { heading: 'Mechanics', points: ['On hit, converts 98% of Void damage to Viral damage.'] },
        { heading: 'Interactions', points: ['Viral is a strong general-content conversion, boosting damage to health.'] },
      ],
      status: 'beta',
    },
  },

  // ── Status-resist arcanes (the rest of the family) ──
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/PunctureProcResist'],
    note: {
      tldr: 'Makes you immune to Puncture status (the damage-reduction debuff).',
      sections: [
        { heading: 'Mechanics', points: ['Grants +102% chance to resist a Puncture status effect.'] },
        { heading: 'Interactions', points: ['A targeted defensive pick; one of a family of single-status-resist arcanes.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/PoisonProcResist'],
    note: {
      tldr: 'Makes you immune to Toxin status (the poison that bypasses shields).',
      sections: [
        { heading: 'Mechanics', points: ['Grants +102% chance to resist a Toxin status effect.'] },
        { heading: 'Interactions', points: ['Useful for shield-gating frames, since Toxin ignores shields; status-resist family.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/GasProcResist'],
    note: {
      tldr: 'Makes you immune to Gas status (the lingering toxic cloud).',
      sections: [
        { heading: 'Mechanics', points: ['Grants +102% chance to resist a Gas status effect.'] },
        { heading: 'Interactions', points: ['A targeted defensive pick; status-resist family.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/CorrosiveProcResist'],
    note: {
      tldr: 'Makes you immune to Corrosive status (the armor strip on you).',
      sections: [
        { heading: 'Mechanics', points: ['Grants +102% chance to resist a Corrosive status effect.'] },
        { heading: 'Interactions', points: ['A targeted defensive pick; status-resist family.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Defensive/ImpactProcResist'],
    note: {
      tldr: 'Makes you immune to Impact status (the stagger).',
      sections: [
        { heading: 'Mechanics', points: ['Grants +102% chance to resist an Impact status effect.'] },
        { heading: 'Interactions', points: ['A targeted defensive pick against stagger-heavy enemies; status-resist family.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/SlowerBleedOutOnPredeath'],
    note: {
      tldr: 'When you go down, a chance to bleed out far more slowly.',
      sections: [
        { heading: 'Mechanics', points: ['On reaching a downed state, a 60% chance for -100% Bleedout Rate (you stay down much longer awaiting a revive).'] },
        { heading: 'Interactions', points: ['A budget safety net that buys time for a teammate to revive you.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Upgrades/CosmeticEnhancers/Utility/DamageReductionDuringRevive'],
    note: {
      tldr: 'Take far less damage while reviving a teammate.',
      sections: [
        { heading: 'Mechanics', points: ['-90% Damage Taken while reviving an ally.'] },
        { heading: 'Interactions', points: ['Lets you safely revive teammates in the middle of a firefight.'] },
      ],
      status: 'beta',
    },
  },
];

// ---------------------------------------------------------------------------
// Weapons — knowledge-driven "how it plays" notes (trigger, identity, quirks),
// Mechanics + Interactions, no Trivia. Phased by distinctiveness/meta (664 is a
// multi-session category; modular Zaw Components are parts, skipped). Base +
// Prime/Wraith/Vandal share a note where the playstyle matches; lich variants
// (Kuva/Tenet/Coda) get their own note for the bonus progenitor element.
// Phase 1: Launchers, Bows, Snipers.
// ---------------------------------------------------------------------------

const WEAPON_NOTES: SharedNote[] = [
  // ── Signature / lich guns carried over from the pilot ──
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/SapientPrimary/SapientPrimaryWeapon'],
    note: {
      tldr: 'Gauss’ rapid-fire rocket rifle — fast explosive rockets, strong crit, built for clearing rooms.',
      sections: [
        { heading: 'Mechanics', points: ['Rockets arm after a short distance (~7m), so point-blank shots bounce instead of exploding — keep a little range.', 'The direct hit and the explosion apply status separately, and a direct rocket impact is a guaranteed Impact proc; the explosion penetrates walls.'] },
        { heading: 'Interactions', points: ['Reloading while sprinting is faster (+25%), and faster still in Gauss’ hands (+50%) — its signature synergy.', 'Firestorm widens the blast; Cautious Shot cuts the self-stagger from your own explosions.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Nukor/KuvaNukor'],
    note: {
      tldr: 'A beam secondary with enormous status and crit — its "microwave" beam arcs between enemies, making it one of the best primers in the game.',
      sections: [
        { heading: 'Mechanics', points: ['Low raw damage: you bring it to blanket a group with status (Viral, etc.) before finishing with another weapon, not to DPS.', 'The beam chains to several nearby targets, so one trigger-pull statuses a whole cluster.'] },
        { heading: 'Interactions', points: ['Carries a bonus innate element from its Kuva Lich — pick the lich element to fit your build.'] },
      ],
      status: 'beta',
    },
  },

  // ── Launchers ──
  {
    keys: [
      '/Lotus/Weapons/Corpus/LongGuns/GrenadeLauncher/GrenadeLauncher',
      '/Lotus/Weapons/Syndicates/PerrinSequence/LongGuns/PSPenta',
      '/Lotus/Weapons/Corpus/LongGuns/GrenadeLauncher/CarminePenta',
    ],
    note: {
      tldr: 'A grenade launcher that lobs sticky grenades you detonate on command.',
      sections: [
        { heading: 'Mechanics', points: ['Fires up to five grenades that stick to surfaces and enemies, then detonate all at once when you trigger them — set traps or chains.', 'Deals Blast damage; mind the self-stagger from your own explosions (Cautious Shot helps).'] },
        { heading: 'Interactions', points: ['Secura Penta adds a bigger magazine and a Perrin Sequence proc; Carmine Penta fires and reloads faster. Pair with a primer for status.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/ClanTech/Chemical/RocketLauncher'],
    note: {
      tldr: 'A Grineer rocket launcher with a heavy area blast.',
      sections: [
        { heading: 'Mechanics', points: ['Charge-fires a rocket that explodes on impact for Blast damage; its augment (Nightwatch Napalm) leaves lingering fire.'] },
        { heading: 'Interactions', points: ['Watch your own blast radius — a strong AoE clearer with Firestorm and a status build. The Kuva Ogris is a stronger Lich variant.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Ogris/KuvaOgris'],
    note: {
      tldr: 'The Kuva-Lich rocket launcher — air-bursting rockets and a bonus progenitor element.',
      sections: [
        { heading: 'Mechanics', points: ['Unlike the base Ogris it fires a rocket that air-bursts into a cluster, raining explosions over an area; very high status.'] },
        { heading: 'Interactions', points: ['Carries a bonus innate element set by the Kuva Lich it came from — pick the element to fit your build. Self-stagger applies.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/LongGuns/GrnGrenadeLauncher/GrnGrenadeLauncher'],
    note: {
      tldr: 'A Grineer grenade launcher that arcs bouncing grenades downrange.',
      sections: [
        { heading: 'Mechanics', points: ['Lobs grenades that bounce and explode for Blast damage with high crit — a crit-AoE launcher.'] },
        { heading: 'Interactions', points: ['Lead your shots and mind the arc; the Kuva Tonkor is the stronger Lich variant.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Tonkor/KuvaTonkor'],
    note: {
      tldr: 'The Kuva-Lich grenade launcher — fast reload, impact detonation, and a bonus element.',
      sections: [
        { heading: 'Mechanics', points: ['Arcs grenades that detonate on impact (no fuse delay) for Blast crit damage, with a quick reload.'] },
        { heading: 'Interactions', points: ['Carries a bonus innate element from its Kuva Lich; a strong crit-AoE pick. Self-stagger applies.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/LongGuns/GrnCannon/GrnCannonWeapon'],
    note: {
      tldr: 'A Grineer hand-cannon with two modes — long-range explosive shells or a close-range flak blast.',
      sections: [
        { heading: 'Mechanics', points: ['Swap between Cannon mode (an arcing shell that bursts into shrapnel) and Barrage mode (a shotgun-like spread of flak).'] },
        { heading: 'Interactions', points: ['Cannon for AoE clear, Barrage for close range; mind the self-stagger. The Kuva Zarr is the stronger Lich variant.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Zarr/KuvaZarr'],
    note: {
      tldr: 'The Kuva-Lich Zarr — both firing modes, stronger explosives, and a bonus element.',
      sections: [
        { heading: 'Mechanics', points: ['Keeps the dual Cannon/Barrage modes with bigger explosive output and high status.'] },
        { heading: 'Interactions', points: ['One of the strongest AoE primaries; carries a bonus innate element from its Lich. Self-stagger is heavy — Cautious Shot or Primed Sure Footed helps.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/ClanTech/Bio/BioWeapon'],
    note: {
      tldr: 'A toxic grenade lobber that leaves damaging gas clouds — and a strong Incarnon weapon.',
      sections: [
        { heading: 'Mechanics', points: ['Lobs canisters that burst into a lingering Toxin cloud; its Incarnon form fires sticky orbs that detonate for big area damage.'] },
        { heading: 'Interactions', points: ['A top-tier status-AoE primary once you unlock its Incarnon Genesis; build for Toxin/Viral or Gas.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Corpus/LongGuns/CrpBriefcaseLauncher/CrpBriefcaseLauncher'],
    note: {
      tldr: 'A Corpus "briefcase" rocket launcher — fire a rocket, then steer it to the target.',
      sections: [
        { heading: 'Mechanics', points: ['Launches a rocket you pilot in flight, detonating it where you want for precise Blast damage.'] },
        { heading: 'Interactions', points: ['A Tenet (Sister of Parvos) weapon that carries a bonus innate element you choose; great for hitting around cover.'] },
      ],
      status: 'beta',
    },
  },

  // ── Bows (all silent unless noted; charge to fire, arrows have punch-through) ──
  {
    keys: [
      '/Lotus/Weapons/MK1Series/MK1Paris',
      '/Lotus/Weapons/Tenno/Bows/HuntingBow',
      '/Lotus/Weapons/Tenno/Bows/PrimeHuntingBow',
    ],
    note: {
      tldr: 'The classic Tenno bow — charge a single high-damage arrow, silent and deadly.',
      sections: [
        { heading: 'Mechanics', points: ['Charge to fire one powerful arrow; bows are silent (great for stealth) and arrows punch through to line up multiple kills.'] },
        { heading: 'Interactions', points: ['Paris Prime adds strong Slash and crit for a true damage bow; the MK1-Paris is the starter version. Charge fully for max damage.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Bows/AntlerBow/AntlerBow',
      '/Lotus/Weapons/Tenno/Bows/PrimeCernos/PrimeCernos',
    ],
    note: {
      tldr: 'A fast, silent bow — Cernos Prime famously looses a three-arrow horizontal spread.',
      sections: [
        { heading: 'Mechanics', points: ['Charge-fires arrows with punch-through; the Prime fires three arrows at once in a wide fan, great for hitting groups.'] },
        { heading: 'Interactions', points: ['Cernos Prime is a strong crit/status hybrid and a stealth favourite; build for Slash or Viral.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Syndicates/RedVeil/Bows/RVCernos'],
    note: {
      tldr: 'A Red Veil assassination bow — fast charge, and brief invisibility on its syndicate proc.',
      sections: [
        { heading: 'Mechanics', points: ['A quick-charging silent bow; its Red Veil proc damages enemies and briefly turns you invisible.'] },
        { heading: 'Interactions', points: ['A stealth-assassin pick; the fast charge suits rapid headshots.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Bows/PrimeDerelictCernos/DerelictCernos'],
    note: {
      tldr: 'A bizarre bow whose arrows sprout tongues that drag enemies together.',
      sections: [
        { heading: 'Mechanics', points: ['Each arrow bursts into sticky probes that latch onto nearby enemies and reel them into a clump.'] },
        { heading: 'Interactions', points: ['A niche crowd-grouping tool — pull enemies together, then finish with AoE.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Bows/StalkerBow'],
    note: {
      tldr: 'The Stalker’s bow — a high-crit Slash bow that decapitates.',
      sections: [
        { heading: 'Mechanics', points: ['Charge-fires arrows with high critical chance and heavy Slash, silent like all bows.'] },
        { heading: 'Interactions', points: ['A red-crit Slash bow; build crit and Slash for big bleed damage. Dropped by the Stalker.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Bows/AsymetricalBow/AsymetricalBow',
      '/Lotus/Weapons/Tenno/Bows/PrimeDaikyu/PrimeDaikyuBow',
    ],
    note: {
      tldr: 'A heavy war bow — slow to draw but hits with huge status and no damage falloff.',
      sections: [
        { heading: 'Mechanics', points: ['A single arrow with very high status chance and no damage drop-off over distance; its arrows can’t be picked back up.'] },
        { heading: 'Interactions', points: ['Daikyu Prime pushes status and crit higher; a status-priming bow whose slow draw rewards reload/charge-speed mods.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Bow/Longbow/CrpBow',
      '/Lotus/Weapons/Corpus/Bow/Longbow/PrismaLenz/PrismaLenzWeapon',
    ],
    note: {
      tldr: 'A Corpus bow that freezes a target with a Cold pulse, then detonates a big explosion.',
      sections: [
        { heading: 'Mechanics', points: ['Each shot lands a Cold bubble that groups and chills enemies, followed a beat later by a powerful Blast explosion.'] },
        { heading: 'Interactions', points: ['Huge crit AoE — but it self-staggers, so Cautious Shot or Primed Sure Footed is recommended. Prisma Lenz adds multishot and ammo.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/Bows/GrnBow/GrnBowWeapon'],
    note: {
      tldr: 'A Grineer bow that fires cluster-bomb arrows — brutal AoE clear, and a bonus progenitor element.',
      sections: [
        { heading: 'Mechanics', points: ['Arrows explode on impact and scatter cluster bombs that detonate a moment later for big multi-hit AoE; tiny quiver, so you reload often.'] },
        { heading: 'Interactions', points: ['Carries a bonus innate element from its Kuva Lich; mind the heavy self-stagger and pair it with ammo mutation or efficiency.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Bows/Omicrus/OmicrusPlayerWep'],
    note: {
      tldr: 'A precise charge-and-hold bow from the Zariman — perfect-shot timing rewards big damage.',
      sections: [
        { heading: 'Mechanics', points: ['Hold the draw and release at the perfect moment for a high-damage, high-status shot.'] },
        { heading: 'Interactions', points: ['An easy-to-get, strong status bow (from the Angels of the Zariman quest); reward consistent perfect releases.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Bows/DaxDuviriAsymetricalBow/DaxDuviriAsymmetricalLongBowPlayerWeapon'],
    note: {
      tldr: 'A Duviri Dax bow with several firing tricks — rapid shots, a charged shockwave, or a precise arrow.',
      sections: [
        { heading: 'Mechanics', points: ['Fires arrows in quick succession or charges into a shockwave; a crit/status hybrid.'] },
        { heading: 'Interactions', points: ['A flexible bow earned in Duviri; suits both rapid fire and charged play.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Bows/TnChoirBow/TnChoirBow'],
    note: {
      tldr: 'A 1999-era bow that shields your allies while you fire.',
      sections: [
        { heading: 'Mechanics', points: ['A silent charge bow whose held effect prevents enemies from harming your allies; strong Slash and Puncture.'] },
        { heading: 'Interactions', points: ['A support-flavoured bow for protecting a squad; build for status or crit.'] },
      ],
      status: 'beta',
    },
  },

  // ── Snipers (zoom adds bonus damage; consecutive hits build a combo multiplier) ──
  {
    keys: [
      '/Lotus/Weapons/Tenno/Rifle/TennoSniperRifle',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeVectis/PrimeVectisRifle',
    ],
    note: {
      tldr: 'A one-shot-per-reload sniper — fast cycling, high crit and status, ideal for precise kills.',
      sections: [
        { heading: 'Mechanics', points: ['Fires a single round then auto-reloads, snapshotting a fresh shot quickly; Vectis Prime adds a two-round magazine and better crit/status.'] },
        { heading: 'Interactions', points: ['A top all-round sniper; build crit and aim for heads. Snipers gain a stacking combo multiplier on consecutive hits.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/FiveShotSniper/FiveShotSniper',
      '/Lotus/Weapons/Tenno/LongGuns/RubicoPrime/RubicoPrimeWeapon',
    ],
    note: {
      tldr: 'The Eidolon-hunter’s sniper — sky-high critical damage that scales with the combo counter.',
      sections: [
        { heading: 'Mechanics', points: ['A revolver-style sniper with excellent crit; its zoom adds bonus critical damage, and consecutive hits build a combo multiplier.'] },
        { heading: 'Interactions', points: ['Rubico Prime is the staple Eidolon weapon — pair with Harrow/Volt buffs and crit mods.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/LongGuns/GrineerSniperRifle/GrnSniperRifle',
      '/Lotus/Weapons/Grineer/LongGuns/GrineerSniperRifle/VulkarWraith',
    ],
    note: {
      tldr: 'A heavy Grineer sniper that trades fire rate for big Impact hits.',
      sections: [
        { heading: 'Mechanics', points: ['Slow, hard-hitting bolts; the Vulkar Wraith variant adds better crit and status.'] },
        { heading: 'Interactions', points: ['A budget sniper; the Wraith is the one to build, leaning on headshots.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Rifle/SniperRifle',
      '/Lotus/Weapons/Tenno/Rifle/VandalSniperRifle',
    ],
    note: {
      tldr: 'The original Corpus sniper — accurate and steady, with a stronger Vandal variant.',
      sections: [
        { heading: 'Mechanics', points: ['A semi-auto precision rifle; the Snipetron Vandal adds crit and status.'] },
        { heading: 'Interactions', points: ['A solid early/mid sniper; the Vandal is the keeper.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/ClanTech/Energy/Railgun'],
    note: {
      tldr: 'A Corpus railgun sniper — charge a high-velocity Electric shot with strong crit.',
      sections: [
        { heading: 'Mechanics', points: ['Charge-fires a very fast Electric projectile with high critical chance and no damage falloff.'] },
        { heading: 'Interactions', points: ['A classic Eidolon weapon (its innate Electric and crit suit the fight); build crit and charge speed.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Infested/LongGuns/InfSniperRifle/InfSniperRifle'],
    note: {
      tldr: 'An Infested sniper that plants a virus barb which keeps damaging, then bursts — and a strong Incarnon.',
      sections: [
        { heading: 'Mechanics', points: ['Fires a slow barb that sticks, ticks damage, then explodes; very high status, and its Incarnon form adds heavy multi-target damage.'] },
        { heading: 'Interactions', points: ['A status-and-Incarnon sniper; build for status and let the barbs spread.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Infested/InfestedLich/LongGuns/CodaSporothrix'],
    note: {
      tldr: 'The Infested-Lich Sporothrix — the virus-barb sniper with a bonus progenitor element.',
      sections: [
        { heading: 'Mechanics', points: ['Plants a damaging, exploding virus barb like the base, with even higher status and a Coda Lich’s bonus element.'] },
        { heading: 'Interactions', points: ['A Coda (Infested Lich) weapon — pick the bonus element to fit your status build.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Corpus/LongGuns/CrpSentAmlgSniper/CrpSentAmlgSniper'],
    note: {
      tldr: 'A Corpus sniper whose zoom changes its fire — scope in for an area burst, hip-fire for precision.',
      sections: [
        { heading: 'Mechanics', points: ['Higher zoom levels add an area blast to its shots; high status.'] },
        { heading: 'Interactions', points: ['A flexible status sniper that doubles as a soft AoE at range.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/LongGuns/GrnGorgSniperRifle/GrnGorgSniperRifle'],
    note: {
      tldr: 'A Grineer sniper that fires a tracking beacon — then every bullet homes to the marked target.',
      sections: [
        { heading: 'Mechanics', points: ['Alt-fire plants a beacon on an enemy; your rounds curve toward whatever is marked, so you can shoot from cover.'] },
        { heading: 'Interactions', points: ['A gimmicky but fun precision rifle — mark a priority target and fire freely.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/TnQuadSniper/TnQuadSniper'],
    note: {
      tldr: 'Voruna’s signature multi-barrel sniper — fast bursts of precise crit shots.',
      sections: [
        { heading: 'Mechanics', points: ['Fires a quick burst from its four barrels with high critical chance.'] },
        { heading: 'Interactions', points: ['It gains a bonus in Voruna’s hands; a strong crit burst-sniper.'] },
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/PrimeLightningGun/PrimeLightningGun'],
    note: {
      tldr: 'Caliban Prime’s signature sniper — a charged Electric railgun-style shot.',
      sections: [
        { heading: 'Mechanics', points: ['Charge-fires a high-velocity Electric projectile with strong crit, in the Lanka mold.'] },
        { heading: 'Interactions', points: ['A signature sniper that pairs with Caliban; build crit and combined elements off its innate Electric.'] },
      ],
      status: 'beta',
    },
  },

  // ── Shotguns (all alarming; semi/auto/duplex/charge/held; pellets, spread, or beam) ──
  {
    keys: [
      '/Lotus/Weapons/MK1Series/MK1Strun',
      '/Lotus/Weapons/Tenno/Shotgun/Shotgun',
      '/Lotus/Weapons/Tenno/Shotgun/ShotgunVandal',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeStrun/PrimeStrunWeapon',
    ],
    note: {
      tldr: 'The Strun family — the original Tenno pump-action shotgun, from the MR0 starter through Wraith to Prime; same semi-auto wide-cone identity throughout.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires a wide cone of pellets per shot; most effective at close range and falls off at distance (see the card for pellet count and falloff).',
          'Semi-auto pacing encourages deliberate shots — each pull commits to a full burst.',
          'Strun Wraith bumps stats meaningfully; Strun Prime raises crit to 24%, opening Hunter Munitions builds.',
        ]},
        { heading: 'Interactions', points: [
          'ADS (aiming down sights) tightens the pellet spread slightly — useful for borderline-range targets.',
          'A reliable progression ladder: start with Mk1, upgrade in place as mastery allows.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Shotgun/QuadShotgun'],
    note: {
      tldr: 'The Hek — high single-shot damage, relatively tight spread for a shotgun; punishes at close-to-mid range.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires a tighter pellet spread than most shotguns — more effective at range than wider-pattern competitors.',
          'Low base crit (10%) and status (11%); strength is raw damage per pellet, not stat synergy.',
          'Semi-auto and ammo-efficient — each burst kills at most MR ranges, so fewer shots are needed per encounter.',
        ]},
        { heading: 'Interactions', points: [
          'A solid mid-game MR4 primary; the tight spread means more pellets land on target even at distance.',
          'Replaced competitively by Vaykor Hek or Kuva Hek for harder content, but the base Hek stays reliable as a workhorse.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Syndicates/SteelMeridian/LongGuns/SMHek'],
    note: {
      tldr: 'Vaykor Hek — same tight-spread semi-auto as the Hek but 25% crit, a syndicate Justice burst, and the Scattered Justice augment.',
      sections: [
        { heading: 'Mechanics', points: [
          'Retains the Hek’s tight-spread identity but with much higher crit, making Hunter Munitions builds genuinely effective.',
          'Steel Meridian’s Justice proc releases a radial damage burst when the syndicate meter fills — a passive bonus on sustained use.',
        ]},
        { heading: 'Interactions', points: [
          'Scattered Justice augment (Vaykor Hek exclusive) adds more pellets per shot at the cost of tighter spread — transforms it from a precision tool into a crowd-clearance shotgun.',
          'One of the more accessible endgame-capable primaries; Hunter Munitions + high crit makes it punish armored units via bleed procs.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Hek/KuvaHekWeapon'],
    note: {
      tldr: 'Kuva Hek — adds a Lich progenitor element AND a Four-Barrel alt-fire that dumps all barrels simultaneously for massive single-target burst.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire is a Vaykor Hek-tier shotgun with the Lich’s bonus element baked in; 23% crit for reliable crit builds.',
          'Alt-fire fires all four barrels simultaneously at 4× ammo cost — devastating single burst against priority targets.',
          'The alt-fire is the defining upgrade: use semi for crowd clearing, dump alt-fire into a heavy that needs deleting.',
        ]},
        { heading: 'Interactions', points: [
          'The Lich progenitor element is set at acquisition — Toxin pairs with Cold for Viral; Heat can build combined elements via mods.',
          'Strong in Steel Path on heavies; the alt-fire burst can remove a unit that semi-fire would take several shots to drop.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Shotgun/FullAutoShotgun',
      '/Lotus/Weapons/Tenno/Shotgun/PrimeBoar',
    ],
    note: {
      tldr: 'The Boar — full-auto pellet fire at the cost of ammo efficiency; volume over precision.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto trigger means holding fire sprays pellets continuously — effective for sustained close-range pressure.',
          'Low base crit and status (10%/8% base, 15%/11% Prime); output comes from fire volume rather than per-shot build synergy.',
          'Boar Prime is a meaningful step up: larger magazine and improved stats that let real status or crit builds function.',
        ]},
        { heading: 'Interactions', points: [
          'Ammo-hungry at sustained fire — Ammo Mutation or restocking mid-mission is strongly recommended for anything beyond short runs.',
          'Auto fire feels forgiving in tight corridors; the sustained rate makes status application consistent even with lower per-shot status chance.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Shotgun/DoubleBarrelShotgun',
      '/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Sobek/KuvaSobek',
    ],
    note: {
      tldr: 'The Sobek — large-drum auto shotgun; the Acid Shells augment turns each reload into a lingering Corrosive puddle.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto trigger, 20-round drum magazine — long reload, but the large mag means extended fire before needing to reload.',
          'Base crit and status are modest; the weapon’s identity is almost entirely built around its Acid Shells augment.',
          'Acid Shells: each reload places a Corrosive puddle at your feet that strips armor and damages enemies who step in it.',
        ]},
        { heading: 'Interactions', points: [
          'Deliberately triggering partial reloads to place puddles is the core strategy — you don’t need to empty the drum, just reload to drop the zone.',
          'Kuva Sobek adds a Lich progenitor element; the added element can combine with Acid Shells’ Corrosive to broaden the debuff.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/DoubleBarrelShotgun/TennoDoubleBarrelShotgun',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeTigris/PrimeTigris',
      '/Lotus/Weapons/Syndicates/NewLoka/LongGuns/NLTigris',
    ],
    note: {
      tldr: 'The Tigris family — Duplex double-barrel shotgun: both barrels fire nearly simultaneously, then you must reload; enormous burst damage for a 2-shot mag.',
      sections: [
        { heading: 'Mechanics', points: [
          'Duplex trigger: one pull fires both barrels in rapid succession; after two shots you must reload before the next burst.',
          'The 2-shot effective mag means every engagement is one burst-and-reload cycle — more like a precision burst weapon than a spray tool.',
          'Tigris Prime delivers some of the highest base burst damage of any primary weapon; most non-boss enemies are a one-burst kill.',
        ]},
        { heading: 'Interactions', points: [
          'Reload speed mods (Fast Hands, Primed Fast Hands) are high priority — you reload after almost every kill, so faster reloads tighten the loop.',
          'Sancti Tigris (New Loka) has slightly lower raw damage than Prime but releases a Radiation burst that damages nearby enemies on each kill.',
          'Not ammo-efficient in total shots, but each burst is so lethal that fewer are needed — bring a secondary for sustained long missions.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/LongGuns/CrpShotgun/CrpShotgun',
      '/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEArcaPlasmor/CrpBEArcaPlasmor',
    ],
    note: {
      tldr: 'The Arca Plasmor — fires a wide horizontal energy wave, not pellets; hits everything in a sweeping arc and knocks enemies back.',
      sections: [
        { heading: 'Mechanics', points: [
          'A single wide energy plane travels forward — not a pellet spread but a wave that hits every enemy in its horizontal path.',
          'On hit, enemies are knocked back (or off ledges), which is disruptive when you need them stationary for abilities or finishers.',
          'Tenet Arca Plasmor adds a Corpus Sister bonus element and substantially higher status (34% vs 28%), making status builds viable.',
        ]},
        { heading: 'Interactions', points: [
          'Multishot mods add extra parallel waves rather than more pellets — extends horizontal coverage, not per-wave status ticks.',
          'The knockback is counterproductive with Warframes that need crowds held in place (Nidus, Nezha, etc.) — plan around it.',
          'The wave can pass through thin geometry in some cases, giving more consistent AoE coverage than pellet weapons in dense environments.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/TnHeavyShotgun/TnHeavyShotgunGun',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeCorinth/PrimeCorinth',
    ],
    note: {
      tldr: 'The Corinth — a high-crit semi-auto shotgun with an alt-fire grenade that detonates in mid-air, not on impact.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire: a high-crit semi-auto pellet spread — one of the stronger crit primaries in the shotgun class.',
          'Alt-fire launches a timed airburst grenade — it detonates at a set range mid-air, not on surface contact, for Blast AoE above or behind cover.',
          'The grenade’s fixed timer means leading the arc to the right distance takes practice, but the airburst clears groups reliably once learned.',
        ]},
        { heading: 'Interactions', points: [
          'Hunter Munitions pairs naturally: 30% crit + bleed-on-crit turns it into an armor-ignoring damage machine.',
          'Corinth Prime nudges status to 9% (from 6%), making a hybrid crit-status build slightly more viable.',
          'Cautious Shot (or Primed Cautious Shot) eliminates self-stagger from the alt-fire grenade if you use it aggressively.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/TnAlchemistShotgun/TnAlchemistShotgun',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeCedo/PrimeCedoWeapon',
    ],
    note: {
      tldr: 'The Cedo — auto shotgun that gains bonus crit per unique status type on the target; its alt-fire disc stacks those status types instantly.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire has near-zero base status (0%/2%) — the shots themselves rarely proc; the weapon gains crit FROM status on the target.',
          'For each unique status type active on the target, primary fire crit chance increases — stack multiple different types before firing.',
          'Alt-fire throws a ricocheting disc that inflicts several different status types across enemies it hits — use it first, then open fire into the primed targets.',
        ]},
        { heading: 'Interactions', points: [
          'Lavos’s signature weapon — his element-cycling kit applies multiple status types simultaneously, making the disc-then-shotgun loop especially efficient in his hands.',
          'The disc is setup, not damage; its value is the status diversity it creates for the primary fire’s crit bonus.',
          'Two different types (e.g., Viral + Slash) are enough to see a meaningful crit boost; more types continue to scale it higher.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/LongGuns/GrnSpark/GrnSparkRifle',
      '/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Kohm/KuvaKohm',
    ],
    note: {
      tldr: 'The Kohm — a spinning-barrel shotgun that fires a single pellet on the first shot, then ramps up its pellet count the longer you hold the trigger. The card stats are the base, single-pellet profile.',
      sections: [
        { heading: 'Mechanics', points: [
          'It "spools up": the first shot fires one pellet, and each consecutive shot adds more pellets until it reaches its fully-spooled output — so the opening shot is weak and sustained fire is the payoff.',
          'The status chance shown on the card is the per-pellet base. Because a fully-spooled shot throws many pellets at once, each with its own status roll, the effective status output per trigger-pull is far higher than the single number suggests — this is why the Kohm is famous as a status weapon despite a low listed value.',
          'It is very ammo-hungry once spooled — a fully-spooled shot consumes several rounds at once, so reserves drain faster than the fire rate implies.',
        ]},
        { heading: 'Interactions', points: [
          'Kuva Kohm adds a Lich progenitor element and improved stats — already the premier sustained-status primary in many builds, the bonus element adds flexibility.',
          'Ammo Mutation or an ammo-efficient secondary is essential for long missions; sustained fire will drain reserves quickly.',
          'Viral + Slash is the classic setup: projectile volume spreads Viral fast across groups, then Slash bleeds strip health ignoring armor.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/LongGuns/GrineerFlakCannon/FlakCannon',
      '/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Drakgoon/KuvaDrakgoon',
    ],
    note: {
      tldr: 'The Drakgoon — charge-fire flak cannon releasing bouncing fragments; excels in tight corridors, awkward in open spaces.',
      sections: [
        { heading: 'Mechanics', points: [
          'Charging releases a cluster of flak fragments that bounce off walls, floors, and ceilings before dissipating — bank shots around corners in corridors.',
          'Longer charge = more fragments; a full charge saturates a tight space.',
          'Base Drakgoon has very low crit (5%); Kuva Drakgoon jumps to 19% — a substantial change that opens real crit builds unavailable to the base.',
        ]},
        { heading: 'Interactions', points: [
          'Bouncing makes it awkward in wide open areas where fragments miss before reaching enemies — tight spaces are its home.',
          'Kuva Drakgoon gains a Lich progenitor element alongside the improved crit; combined, it plays almost like a different weapon from the base.',
          'Charge time mods reduce the hold needed for a full burst, making the loop snappier in fast-paced fights.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Corpus/LongGuns/CrpShapeBlast/CrpShapeBlastShotgun'],
    note: {
      tldr: 'The Exergis — fires a single crystallized shard that shatters into radial fragments on impact; high status, low crit.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires one projectile (not a pellet spread) — a precision slug that spawns secondary fragments outward on impact.',
          'High status (36%) across the initial hit and the shards; excellent for applying multiple proc types to a target or small group.',
          'Low crit (8%) — firmly a status weapon; trying to run it as a crit platform misses what it does well.',
        ]},
        { heading: 'Interactions', points: [
          'Multishot mods add additional crystal slugs per shot, each shattering independently — more projectiles, more shatter points, more status coverage.',
          'Viral + Slash or Corrosive setups make good use of the fast, reliable status stacking on single targets.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Corpus/LongGuns/CrpSplitLaser/CrpSplitLaser'],
    note: {
      tldr: 'The Convectrix — held-trigger twin beams that sweep in a widening arc; highest base status of any primary shotgun at 45%.',
      sections: [
        { heading: 'Mechanics', points: [
          'Holding the trigger sweeps two beams left and right in an ever-widening fan — a sustained sweeping area cone, not a burst.',
          'At 45% status, the sweep is extremely reliable at applying procs across everything in its path.',
          'Awkward against a single target the beams sweep past, but excellent against groups clustered in the sweep zone.',
        ]},
        { heading: 'Interactions', points: [
          'Multishot on beam weapons adds extra parallel beams; each beam hits and statuses independently — meaningful output increase per mod rank.',
          'Corrosive or Viral status spread to an entire group with one sustained trigger hold in a corridor — strong area denial.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Infested/LongGuns/Tentacluster/InfestedShotgun'],
    note: {
      tldr: 'The Phage — seven simultaneous Infested beams that fan wide when hip-firing or converge into a tight burst when aimed.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires 7 independent beams; each can proc status separately — a full convergence hit applies status at an extremely high rate to a single target.',
          'Hip-fire spreads beams into a wide fan for AoE status on groups; ADS converges them for single-target saturation.',
          'Moderate crit (19%) means you can lean either status or hybrid depending on whether you aim or hip-fire.',
        ]},
        { heading: 'Interactions', points: [
          'ADS convergence is its strongest mode against priority targets — all 7 beams on one enemy stacks multiple status types nearly instantly.',
          'Works best in corridors or tight spaces; wide open areas scatter beams past enemies without landing the full 7.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/RevenantShotgun/RevenantShotgun',
      '/Lotus/Weapons/Tenno/LongGuns/PrimePhantasma/PhantasmaPrimeShotgun',
    ],
    note: {
      tldr: 'The Phantasma — a continuous ice-shard spray with an alt-fire seeking fireball; Revenant’s signature, covering two ranges and two damage types.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire: held beam spraying icy shards in a close-range cone — very low crit (3%/11%) but steady status (22%).',
          'Alt-fire launches a self-tracking fireball that homes to an enemy and detonates on contact for Heat AoE — extends effective range beyond the ice spray.',
          'Phantasma Prime adds meaningful crit (11% vs 3%), making hybrid builds more viable than on the base.',
        ]},
        { heading: 'Interactions', points: [
          'Revenant’s signature weapon — gains bonus fire rate and magazine capacity while Mesmer Skin is active.',
          'Ice spray contributes Cold; fireball contributes Heat — can be combined for Blast, or kept separate for two independent proc types.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/TnGlassShotgun/TnGlassShotgunGun',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeAstilla/AstillaPrimeWeapon',
    ],
    note: {
      tldr: 'The Astilla — fires glass slugs that shatter into radial fragments on impact; high status from both the slug and the shards.',
      sections: [
        { heading: 'Mechanics', points: [
          'Each slug deals direct hit damage AND spawns a burst of glass shards on impact — both the slug and shards can proc status independently.',
          'High status (33%/37%) across slug and shards makes it one of the faster status-applicators in the auto-shotgun class.',
          'Auto trigger with moderate crit (17%/21%) — hybrid builds are reasonable on the Prime.',
        ]},
        { heading: 'Interactions', points: [
          'The shard burst spreads outward on impact — in tight spaces or against clustered enemies, shards from one slug can hit secondary targets.',
          'Fast auto-fire + dual-source status procs (slug + shards) means Viral or Corrosive lands quickly without waiting on individual proc chances.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Infested/LongGuns/InfArmCannon/InfArmCannon'],
    note: {
      tldr: 'The Bubonico — Infested arm cannon with high-crit rotary primary fire and a charged alt-fire spore pod that releases a Viral/Corrosive cloud.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire: auto rotary shots with 25% crit and innate Toxin — a legitimate crit platform for a shotgun-category weapon.',
          'Alt-fire: charged spore pod that detonates into a Viral + Corrosive cloud at the landing point, applying AoE status to everything in range.',
          'The two modes serve different roles: primary for single-target crit DPS, alt-fire for group status saturation.',
        ]},
        { heading: 'Interactions', points: [
          'Innate Toxin on the primary fire combines with Cold for Viral, or Heat for a mixed element — flexible elemental building without using an extra mod slot.',
          'Lead with the spore pod to apply Viral/Corrosive, then switch to primary crit fire into the debuffed targets.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Zariman/LongGuns/PumpShotgun/ZarimanPumpShotgun'],
    note: {
      tldr: 'The Felarx — a Zariman pump-action shotgun with strong crit (20%) that unlocks Incarnon Evolution passives via The Circuit in Duviri.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto pump feel; 20% crit and only 6% status at base — a crit platform, not a status weapon.',
          'Like all Zariman weapons, it has an Incarnon Evolution path unlocked through The Circuit (Duviri); completing stages improves stats and adds passives.',
          'Judge it at max evolution, not at base — the evolution stages substantially change its ceiling.',
        ]},
        { heading: 'Interactions', points: [
          'Hunter Munitions pairs well with the pump-action crit: bleed-on-crit is the main damage loop against armored enemies.',
          'Completing Incarnon Evolution stages in The Circuit is the most important investment — prioritize that before expensive mods.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/TnoLotusPodShotgun/TnoLotusPodShotgun'],
    note: {
      tldr: 'The Steflos — Cyte-09’s signature shotgun; fires sticky pods that burst into lingering spore clouds for area denial and status application.',
      sections: [
        { heading: 'Mechanics', points: [
          'Each shot sticks a pod to surfaces or enemies; after a short delay it bursts into a spore cloud that deals damage and status to anything caught in it.',
          'Semi-auto, moderate crit (14%) and status (22%) — a mid-range status platform with area-denial depth.',
          'Pod placement matters: stick them at choke points or at an enemy’s feet, then let the cloud work.',
        ]},
        { heading: 'Interactions', points: [
          'Cyte-09’s signature — gains a handling bonus in her hands; her kit’s biological hazard playstyle synergizes with the cloud mechanic.',
          'Multiple overlapping clouds from several stuck pods stack their status output, saturating a doorway or corridor.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/PaxDuviricusShotgun/PaxDuviricusShotgun'],
    note: {
      tldr: 'The Rauta — a Duviri Dax shotgun; weak at base but carries an Incarnon Evolution passive that restores ability energy on kills.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto with very low crit (6%) and status (12%) at base — not competitive on raw damage without Incarnon Evolution progress.',
          'A Duviri weapon: Incarnon Evolution stages unlock through The Circuit and significantly upgrade its utility, including energy-on-kill.',
          'The energy restoration passive is the reason to use it — pairs well with Warframes that burn through energy quickly.',
        ]},
        { heading: 'Interactions', points: [
          'Treat it as a utility pick: you may trade raw damage efficiency for the passive energy income it provides across a mission.',
          'Complete its evolution stages before investing in damage mods — the passives are what justify the slot.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Infested/InfestedLich/LongGuns/1999InfShotgun/1999InfShotgunWeapon'],
    note: {
      tldr: 'The Coda Bassocyst — the Infested Lich shotgun; high status (40%), semi-auto, organic barb that detonates into a zone on impact.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires a pressurised organic barb that detonates into a small zone at the impact point — catches everything in the burst radius.',
          'High status (40%) and moderate crit (18%) let it function as a status-first weapon with a real hybrid secondary build path.',
          'The Coda (Infested Lich) variant adds a progenitor bonus element determined by the Lich at acquisition.',
        ]},
        { heading: 'Interactions', points: [
          'The zone-on-impact provides a small AoE that catches grouped enemies — more forgiving against clusters than single-slug precision weapons.',
          'Choose the Lich’s bonus element to fit status targets: Toxin + Cold = Viral; other elements can build combined types via mods.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Rifles — auto ──────────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Rifle/StartingRifle',
      '/Lotus/Weapons/Tenno/Rifle/Rifle',
      '/Lotus/Weapons/Tenno/Rifle/VIPRifle',
      '/Lotus/Weapons/Tenno/Rifle/BratonPrime',
    ],
    note: {
      tldr: 'The Braton family — the Tenno standard-issue auto rifle, from MR0 starter through Vandal to Prime; same full-auto hitscan identity, improving stats each tier.',
      sections: [
        { heading: 'Mechanics', points: [
          'Full-auto hitscan at a steady cadence; moderate spread, effective at medium range, nothing exotic about trigger or projectile.',
          'Braton Vandal raises crit to 16% and status to 16% for a balanced hybrid; Braton Prime shifts to 26% status for a dedicated status build.',
          'Mk1-Braton is the MR0 starter — covers every mechanic the auto rifle loop uses, good for learning before upgrading in place.',
        ]},
        { heading: 'Interactions', points: [
          'Braton Prime is a reliable no-gimmick status platform; its 26% status lets you stack Corrosive or Viral fast without anything exotic.',
          'Braton Vandal is a solid event-reward all-rounder that holds up well past its MR requirement.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Rifle/TennoAR',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeSoma/PrimeSomaRifle',
    ],
    note: {
      tldr: 'The Soma — an iconic high-crit auto rifle with a gentle fire-rate ramp; the go-to crit primary for much of the mid-game.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fire rate ramps up slightly over the first half-second of sustained trigger — a brief spin-up before reaching peak output.',
          'Very high crit (30%) and very low status (7%/10%) — a pure crit platform; status builds are the wrong direction here.',
          'Large magazine and high ammo efficiency make it forgiving for newer players learning elemental and crit modding.',
        ]},
        { heading: 'Interactions', points: [
          'Hunter Munitions is the defining pairing: high crit drives bleed procs on every critical hit, bypassing armor entirely.',
          'Soma Prime is a direct stat upgrade — same identity, better numbers, build identically.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/LongGuns/GrineerAssaultRifle/GrnAssaultRifle',
      '/Lotus/Weapons/VoidTrader/PrismaGrakata',
    ],
    note: {
      tldr: 'The Grakata — a very high fire rate Grineer assault rifle; volume of fire compensates for moderate per-shot stats.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fast auto with 25% crit and 20%/21% status — both high enough for hybrid builds despite being individually moderate.',
          'Sheer rounds-per-second means status procs and crit hits land consistently; the fire rate does the work.',
          "Prisma Grakata is Baro Ki'Teer's improved version — slightly better stats, same playstyle.",
        ]},
        { heading: 'Interactions', points: [
          'Ammo drain is significant at sustained fire — Ammo Mutation or restocking mid-mission is recommended for long runs.',
          "Dual Grakatas exist as a secondary weapon; the primary version hits harder per shot and handles differently.",
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/LongGuns/GrineerM16Homage/GrineerM16Rifle',
      '/Lotus/Weapons/Grineer/LongGuns/GrineerM16Homage/KarakWraith',
    ],
    note: {
      tldr: 'The Karak — the Grineer standard rifle; reliable auto with good ammo efficiency, significantly improved by the Wraith variant.',
      sections: [
        { heading: 'Mechanics', points: [
          'Standard auto hitscan with low crit (9%/13%) and moderate status (15%/25%) — leans toward status builds.',
          'Karak Wraith raises status to 25%, making it a more serious platform for elemental proc builds.',
          'Consistent and easy to use; no exotic mechanics — what you see is what you get.',
        ]},
        { heading: 'Interactions', points: [
          'A solid early-to-mid-game status rifle for players learning elemental modding without exotic trigger management.',
          'Kuva Karak (listed separately) substantially upgrades the stat line and adds a Lich bonus element.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Karak/KuvaKarak'],
    note: {
      tldr: 'Kuva Karak — the Lich upgrade: 23% crit and 31% status make it a genuine hybrid platform, plus a baked-in Lich bonus element.',
      sections: [
        { heading: 'Mechanics', points: [
          'Same auto hitscan identity as the Karak but substantially improved — the jump to 23% crit opens Hunter Munitions builds.',
          'The Lich progenitor element is chosen at acquisition and added to every shot automatically.',
        ]},
        { heading: 'Interactions', points: [
          'The bonus element acts like a free elemental mod slot — factor the Lich element into your build when picking which one to use.',
          'A competitive hybrid auto rifle at lower investment than many meta alternatives.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Rifle/BoltoRifle',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeBoltor/PrimeBoltor',
    ],
    note: {
      tldr: 'The Boltor — fires Puncture bolts as actual projectiles, not hitscan; the Prime version is a high-status status platform.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires physical bolts that travel through the air — lead targets at distance, as bolts are not instant-hit.',
          'Boltor: low crit (10%), moderate status (14%). Boltor Prime reverses this — 12% crit, 34% status — firmly a status build.',
          'Bolts deal primarily Puncture, effective against armored enemies even before status procs.',
        ]},
        { heading: 'Interactions', points: [
          "Boltor Prime's 34% status lets you stack Corrosive or Viral quickly; one of the early go-to status primaries in the game's history.",
          'Telos Boltor (Arbiters of Hexis) shifts the family toward crit (30%) — a different build direction, listed separately.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Syndicates/ArbitersOfHexis/LongGuns/AHBoltor'],
    note: {
      tldr: 'Telos Boltor — the Arbiters of Hexis variant: 30% crit flips the Boltor identity from status to crit, plus a syndicate proc on the meter.',
      sections: [
        { heading: 'Mechanics', points: [
          'Same projectile bolt identity as the Boltor family but 30% crit completely changes the viable build paths.',
          'Arbiters of Hexis syndicate proc fires an energy burst when the syndicate meter fills — passive bonus damage on sustained use.',
        ]},
        { heading: 'Interactions', points: [
          'Hunter Munitions with 30% crit makes it function as a crit-bleed rifle — unusual and effective for the Boltor line.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Rifle/HeavyRifle',
      '/Lotus/Weapons/Grineer/LongGuns/WraithGorgon/WraithGorgon',
      '/Lotus/Weapons/Grineer/LongGuns/VoidTraderGorgon/VTGorgon',
    ],
    note: {
      tldr: 'The Gorgon — a heavy machine gun with a spin-up period before reaching full fire rate; high sustained output once spinning.',
      sections: [
        { heading: 'Mechanics', points: [
          'Holding the trigger spins the barrels up before reaching full fire rate — roughly a half-second delay before peak output.',
          'Gorgon: 17% crit, 9% status — low stats, mostly a volume weapon; Gorgon Wraith shifts toward status (15% crit, 21% status).',
          'Prisma Gorgon jumps to 30% crit and 15% status — making Hunter Munitions viable for the first time in the family.',
        ]},
        { heading: 'Interactions', points: [
          'Large magazine means long uninterrupted fire; effective for corridor defense or sustained pressure on a group.',
          'Ammo-hungry at full spin — bring Ammo Mutation for anything past a few waves.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/ClanTech/Energy/CrpHeavyRifle',
      '/Lotus/Weapons/Corpus/LongGuns/Machinegun/SupraVandal',
    ],
    note: {
      tldr: 'The Supra — a Corpus heavy auto rifle; 30% status and reliable sustained fire, low crit.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto hitscan with 12%/16% crit and 30% status — a dedicated status platform, not a crit weapon.',
          'Supra Vandal bumps crit slightly to 16% while retaining 30% status; same identity, better numbers.',
        ]},
        { heading: 'Interactions', points: [
          'A solid clan-tech status rifle; consistent for elemental proc builds without needing exotic mechanics.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/LongGuns/CorpusUMP/CorpusUMP',
      '/Lotus/Weapons/Corpus/LongGuns/CorpusUMP/PrismaCorpusUMP',
    ],
    note: {
      tldr: 'The Tetra — a Corpus auto rifle that fires bouncing energy bolts; the ricochet hits targets a straight shot would miss.',
      sections: [
        { heading: 'Mechanics', points: [
          'Energy bolts ricochet off walls, floors, and ceilings — a missed shot in a corridor can bounce into a target behind cover.',
          'Very low crit (4%/10%) and moderate status (20%/24%) — weak stat-wise; the bounce mechanic is the entire identity.',
          'Prisma Tetra improves slightly but the base stat problem remains.',
        ]},
        { heading: 'Interactions', points: [
          'Tenet Tetra dramatically upgrades both crit and status — if you want this mechanic at endgame, use the Tenet version.',
          'The ricochet is situationally useful in enclosed tilesets; awkward in wide-open areas.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBETetra/CrpBETetra'],
    note: {
      tldr: 'Tenet Tetra — same ricocheting energy bolt mechanic as the Tetra but with 28% crit, 30% status, and a Sister bonus element.',
      sections: [
        { heading: 'Mechanics', points: [
          'The bounce identity carries over from the Tetra family, now on a stat line competitive with endgame weapons.',
          'Sister progenitor element is set at acquisition and adds a free elemental type to every shot.',
        ]},
        { heading: 'Interactions', points: [
          'Both crit and status are high enough for hybrid builds; in tight corridors, bouncing rounds can hit clustered enemies multiple times.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/TennoTommyGun/TennoTommyGunRifle',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeStradavar/PrimeStradavarGun',
    ],
    note: {
      tldr: 'The Stradavar — toggles between full-auto and semi-auto modes; 24% crit fits either fire style.',
      sections: [
        { heading: 'Mechanics', points: [
          'Alt-fire toggles between auto (faster, slightly more spread) and semi-auto (precise, deliberate); switching is instant mid-fight.',
          '24% crit and 12% status across both variants — a crit-focused weapon regardless of fire mode.',
          'Stradavar Prime is a direct stat upgrade with no mechanical change — same toggle, better numbers.',
        ]},
        { heading: 'Interactions', points: [
          'The toggle lets you switch from horde-clearing auto to precision semi for single targets without swapping weapons.',
          'Hunter Munitions works in both modes; semi gives more control for deliberate crit-bleed shots on priority targets.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/TnBardRifle/TnBardRifle',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeTenora/TenoraPrimeWeapon',
    ],
    note: {
      tldr: "The Tenora — Octavia's signature rifle; fire rate ramps up with sustained auto fire, reaching strong crit (28%/30%) at full speed.",
      sections: [
        { heading: 'Mechanics', points: [
          'Fire rate gradually increases while holding the trigger — longer sustained fire equals faster fire rate.',
          'High crit (28%/30%) at the ramp-up peak; low status (16%/24%) — a crit platform that rewards not releasing the trigger.',
          "Alt-fire shifts to a charged single shot that fires one high-damage round without interrupting the auto rhythm.",
        ]},
        { heading: 'Interactions', points: [
          "Octavia's signature — gains bonus reload speed and fire rate in her hands.",
          'Hunter Munitions pairs naturally; let the fire rate ramp before engaging to maximise bleed proc density.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/TnoMiter/TnoMiter',
      '/Lotus/Weapons/Tenno/LongGuns/PrimePanthera/PrimePanthera',
    ],
    note: {
      tldr: 'The Panthera — rapid-fire auto sawblade launcher with an alt-fire that releases a single large spinning disc.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire: rapid auto stream of small circular saw blades that embed in enemies and deal Slash damage.',
          'Alt-fire: launches a single large sawblade disc that travels and can be detonated with a second alt-fire press for an AoE burst.',
          'Moderate crit (12%/18%) and good status (24%/30%) on Prime — a hybrid that leans toward status in the primary fire mode.',
        ]},
        { heading: 'Interactions', points: [
          'The alt-fire disc is the burst option — save it for groups or heavies, use primary auto for sustained pressure.',
          'Prime version is the meaningful upgrade; the base Panthera is a solid stepping stone.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Thanotech/ThanoRifle/ThanotechRifle',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeTrumna/PrimeTrumnaWeapon',
    ],
    note: {
      tldr: 'The Trumna — an Entrati auto rifle with an alt-fire grenade that charges up on primary kills before detonating for AoE.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire: auto, 24% crit, 30%/34% status — a solid hybrid on paper that does real damage in its own right.',
          'Alt-fire: an explosive grenade that charges from primary kills; once charged it detonates for a large Blast AoE on alt-fire press.',
          'The grenade charge gates the alt-fire — you need to be killing things with the primary to fuel it.',
        ]},
        { heading: 'Interactions', points: [
          'The grenade AoE is very strong for clearing groups; use primary auto to charge it, then detonate into the next cluster.',
          'Trumna Prime improves status to 34% — a meaningful bump that keeps it competitive in Steel Path.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/TnSMG/TnSMGWeapon',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeBaza/PrimeBazaGun',
    ],
    note: {
      tldr: 'The Baza — a silent SMG-style primary rifle; one of very few silent non-bow primaries, with strong crit (26%/28%) for stealth builds.',
      sections: [
        { heading: 'Mechanics', points: [
          'Silent noise — does not alert unaware enemies, even in open rooms, making it ideal for spy missions and stealth runs.',
          'High crit (26%/28%) and low status (10%/14%) — a crit-focused SMG that rewards Hunter Munitions builds.',
          'Shorter effective range than most primaries; high fire rate in a compact package.',
        ]},
        { heading: 'Interactions', points: [
          'The silence is the defining feature — equip it when you need to clear a room without triggering reinforcements.',
          'Baza Prime adds meaningful crit and status improvements; the silent + crit identity remains identical.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/GyreRifle/GyreRifleWeapon',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeAlternox/PrimeAlternoxWeapon',
    ],
    note: {
      tldr: "The Alternox — Gyre's signature auto rifle; fires electric bolts that chain between nearby enemies, with high status (30%/40%).",
      sections: [
        { heading: 'Mechanics', points: [
          'Electric bolts arc to additional nearby enemies on hit — one shot can proc status on multiple targets through the chain.',
          '14%/20% crit and 30%/40% status — firmly a status weapon; Alternox Prime reaches 40% status, one of the higher status primaries.',
          'The chaining means grouped enemies all receive status procs even if only the frontmost is targeted.',
        ]},
        { heading: 'Interactions', points: [
          "Gyre's signature — gains bonus in her hands; her electricity-focused kit amplifies the chaining damage and status.",
          'Viral + innate Electricity is a strong pairing since the chain spreads both to the whole group.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/LoginPrimary/SundialRifle'],
    note: {
      tldr: 'The Zenith — a Daily Tribute auto rifle with a scope that deploys a radar marking enemies through walls.',
      sections: [
        { heading: 'Mechanics', points: [
          'Switching to ADS (scope mode) deploys a radar device at the target point that highlights enemies through walls for a duration.',
          'Primary fire: auto hitscan with 10% crit and 34% status — high status for an auto rifle.',
          'The radar is the defining utility: it provides persistent enemy awareness that persists after you lower the scope.',
        ]},
        { heading: 'Interactions', points: [
          'The radar is genuinely useful in spy missions, defense, and interception — knowing enemy positions before they reach you is strong.',
          'Obtainable only from the Daily Tribute milestone system — a time-gated but permanent addition.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/TnBeltFedRifle/TnBeltFedRifleWeapon'],
    note: {
      tldr: 'The Reconifex — a heavy belt-fed auto rifle with strong crit (28%) and a large magazine; straightforward sustained fire.',
      sections: [
        { heading: 'Mechanics', points: [
          'Belt-fed auto with 28% crit and 16% status — a crit-leaning weapon that works well with Hunter Munitions.',
          'Large magazine means extended fire before reloading; the reload is slow when it does come.',
        ]},
        { heading: 'Interactions', points: [
          'A reliable crit-bleed platform with no exotic mechanics to manage; useful when you want consistent output without mode-switching.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/LongGuns/GrnOrokinRifle/GrnOrokinRifleWeapon'],
    note: {
      tldr: 'The Gotva Prime — a Grineer Orokin-era auto rifle with a balanced 23% crit and 27% status; a solid hybrid without exotic gimmicks.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto hitscan with stats high enough for either crit or status build directions — the 23%/27% split supports hybrid modding.',
        ]},
        { heading: 'Interactions', points: [
          'A no-nonsense auto rifle that performs reliably without requiring specific synergies or mechanics to unlock its potential.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Sentients/SentRifleNewWar/SentRifleNewWarGun'],
    note: {
      tldr: 'The Basmu — a Sentient rifle from The New War; deals solid status damage and restores health on kill.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto with 15% crit and 29% status — a status-first rifle.',
          'Kills with the Basmu restore a portion of health, making it a passive sustain option across a mission.',
        ]},
        { heading: 'Interactions', points: [
          'The health-on-kill is most valuable in sustained missions where attrition matters; pairs with Warframes that otherwise struggle to recover health.',
          "Its Sentient origin gives it Void-damage compatibility in specific encounters, though it doesn't adapt like enemy Sentients do.",
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/TnRailjackRifle/RailjackRifleGun'],
    note: {
      tldr: 'The Quellor — a Railjack-origin auto rifle with high status (38%) and a secondary fire that alters its projectile pattern.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto with 12% crit and 38% status — one of the higher status primaries in the auto rifle class.',
          'Obtained from Railjack mission rewards; no crafting required, but the source limits early availability.',
        ]},
        { heading: 'Interactions', points: [
          'High status makes it strong for Corrosive or Viral builds; the low crit means Hunter Munitions is not worth pursuing here.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/TnPriestSpear/TnPriestSpearGun',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeScourge/PrimeScourgeWeapon',
    ],
    note: {
      tldr: "The Scourge — Harrow's signature; a very low-crit status auto rifle whose alt-fire spear weakens enemies caught near it.",
      sections: [
        { heading: 'Mechanics', points: [
          'Auto fire with 2%/10% crit and 30% status — base crit is essentially zero; this is a pure status weapon.',
          'Alt-fire launches a spear that embeds in a surface or enemy; primary fire shots deal increased damage to targets near the embedded spear.',
          'Scourge Prime raises crit to 10% — still status-first, but now Hunter Munitions is at least viable on paper.',
        ]},
        { heading: 'Interactions', points: [
          "Harrow's signature — gains bonus in his hands; his kit's crowd-control playstyle keeps targets near the embedded spear.",
          'Place the spear in the middle of a group, then spray primary fire into the cluster for amplified status damage.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Sentients/Shedu/SheduHeavyWeapon'],
    note: {
      tldr: 'The Shedu — a Sentient arm cannon; emptying the magazine triggers a radial Void discharge that damages enemies and restores energy.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto fire with 25% crit and 23% status — a balanced hybrid stat line.',
          'When the magazine runs empty, instead of a conventional reload it releases a radial Void blast that deals damage and restores energy to the player.',
          'This means you want to fire until empty deliberately; early reloading wastes the discharge.',
        ]},
        { heading: 'Interactions', points: [
          'The energy restore on empty is significant — pairs well with energy-hungry Warframes that benefit from passive energy income.',
          'Obtainable by defeating Eidolon Vomvalysts and other Sentient enemies in the Plains of Eidolon at night.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Cephalon/Primary/CephPrimary/CephPrimary',
      '/Lotus/Weapons/Syndicates/CephalonSuda/LongGuns/CSSimulor',
    ],
    note: {
      tldr: 'The Simulor — fires energy orbs that merge when stacked together, releasing AoE pulses; area-denial over direct fire.',
      sections: [
        { heading: 'Mechanics', points: [
          'Each shot creates an energy orb at the target location. A second orb fired near the first causes them to merge into a larger pulsing vortex that pulls in and damages enemies.',
          'The orbs linger at fixed points in space — you are placing zones of damage, not shooting enemies directly.',
          'Synoid Simulor (Cephalon Suda) adds higher status (35%) and the Cephalon Suda Entropy proc — energy restore on meter fill.',
        ]},
        { heading: 'Interactions', points: [
          'Works best in controlled positions (defense, interception) where you can place orbs in enemy paths before they arrive.',
          'The orb-merging requirement means accurate placement matters more than aim at individual enemies.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Infested/LongGuns/InfCrpShockSwarm/InfCrpShockSwarmRifle'],
    note: {
      tldr: 'The Mutalist Quanta — an Infested Corpus hybrid; fires globs that create toxic puddles, very weak stats.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto with 3% crit and 15% status — exceptionally low stats; this is not a competitive weapon.',
          'Fires Infested goop blobs that create small Toxin zones on impact.',
        ]},
        { heading: 'Interactions', points: [
          'Primarily a mastery rank item or collector piece; there are far stronger options for any content where damage matters.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Corpus/LongGuns/CrpArSniper/CrpArSniperRifle'],
    note: {
      tldr: 'The Ambassador — a Corpus auto rifle whose alt-fire charges and fires a piercing laser beam that punches through multiple enemies.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire: standard auto hitscan with 14% crit and 26% status.',
          'Alt-fire: charges up and releases a high-velocity beam that pierces through enemies in a line — good for prioritizing heavy units in a group.',
          'The two modes cover different roles: auto spray for groups, charged beam for priority targets or long-range precision.',
        ]},
        { heading: 'Interactions', points: [
          'The alt-fire beam shares mods with the primary — elements and damage you apply via mods affect both modes.',
          'Strong as a hybrid weapon when you want the flexibility of auto spray and a hard-hitting option in one slot.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/TnRifleErsatz/TnRifleErsatzWeapon'],
    note: {
      tldr: 'The Aeolak — a 1999-era Technocyte auto rifle with solid hybrid stats (21% crit, 33% status); a reliable status-hybrid platform.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto hitscan with a balanced stat line — 21% crit is enough for Hunter Munitions, 33% status procs reliably for elemental builds.',
          'A weapon from the 1999 Technocyte Coda storyline; acquired through that content.',
        ]},
        { heading: 'Interactions', points: [
          'The hybrid stats make modding flexible; both crit-bleed and elemental status approaches work without forcing a specific direction.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Lasria/AK47/TC2024AK47Weapon'],
    note: {
      tldr: 'The Ax-52 — a 1999-era Lasrian assault rifle; strong crit (26%) for a clean crit or Hunter Munitions build.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto hitscan with 26% crit and 18% status — crit-leaning; the stat line is better suited to crit builds than status.',
          'A conventional-looking assault rifle from the 1999 setting; no exotic mechanics.',
        ]},
        { heading: 'Interactions', points: [
          'Hunter Munitions is the natural fit given the 26% crit; a no-complexity crit-bleed rifle.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Lasria/LasGooAK/LasGooAKPlayerWeapon'],
    note: {
      tldr: 'The Efv-5 Jupiter — a 1999 Lasrian rifle that fires viscous bolts; hybrid stats (21% crit, 25% status).',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto fire with 21% crit and 25% status — enough on both sides to run a hybrid build.',
          'Fires goo-like projectiles with a short travel time; not fully hitscan.',
        ]},
        { heading: 'Interactions', points: [
          'A flexible mid-range auto for the 1999 content pool; both crit and status builds are viable without specialising hard.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Infested/InfestedLich/LongGuns/CodaBubonico/CodaBubonicoCannon'],
    note: {
      tldr: 'The Coda Bubonico — the Infested Lich rifle variant of the Bubonico arm cannon; high crit (27%) with a Lich bonus element.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto, 27% crit and 10% status — a crit-first weapon in contrast to the Shotgun-type base Bubonico.',
          'Carries the Infested Lich progenitor bonus element, baked into every shot.',
        ]},
        { heading: 'Interactions', points: [
          'Hunter Munitions pairs well with the 27% crit; the bonus element adds flexibility without using an extra mod slot.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Corpus/LongGuns/CrpRubanRifle/CrpRubanRifle'],
    note: {
      tldr: 'The Stahlta — a Corpus steel-needle auto rifle with an alt-fire charged shot that releases a high-velocity burst.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary: auto with 24% crit and 22% status — a balanced hybrid stat line.',
          'Alt-fire charges and fires a condensed burst of steel needles in a tight cone, dealing higher burst damage to a single point.',
          'The alt-fire is a bonus damage tool; the primary auto is the sustained damage mode.',
        ]},
        { heading: 'Interactions', points: [
          'The alt-fire charged burst is effective on heavy units and bosses where you want concentrated spike damage.',
          'Hybrid modding works well given the balanced stats; Viral + slash or Corrosive are natural pairings.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/TnInkRifle/TnInkRifleWeapon'],
    note: {
      tldr: "The Enkaus — Jade's signature beam rifle; fires continuous ink that marks targets, and marked targets take amplified follow-up damage.",
      sections: [
        { heading: 'Mechanics', points: [
          'Held trigger (continuous beam), 16% crit and 32% status — the beam applies status reliably at sustained fire.',
          'Hitting enemies with the ink beam marks them; subsequent shots deal increased damage to marked targets.',
          'The marking loop rewards staying on the same target rather than spraying across groups.',
        ]},
        { heading: 'Interactions', points: [
          "Jade's signature weapon — gains a bonus in her hands; her kit's mark-and-detonate playstyle fits the ink-marking loop.",
          'Status builds work well since the beam naturally procs multiple status types while building up mark stacks.',
        ]},
      ],
      status: 'beta',
    },
  },


  // ── Rifles — burst ─────────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Rifle/BurstonRifle',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeBurston/PrimeBurston',
    ],
    note: {
      tldr: 'The Burston — a three-round burst hitscan rifle; Burston Prime raises crit to 25% for Hunter Munitions builds.',
      sections: [
        { heading: 'Mechanics', points: [
          'Three-round burst on each trigger pull; the burst fires at a fixed cadence regardless of trigger-mash speed.',
          'Burston: 12.5% crit, 17.5% status — mediocre stats. Burston Prime jumps to 25% crit and 22% status, making it competitive.',
          'All three rounds share modded elements and crit/status stats — a single burst can proc multiple status effects.',
        ]},
        { heading: 'Interactions', points: [
          'Burston Prime with Hunter Munitions is an efficient bleed-stacker; each burst lands 3 crits at 25% base probability.',
          'The burst is less ammo-efficient at close range than auto alternatives but offers better control at medium range.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Rifle/Sybaris',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeSybaris/PrimeSybaris',
      '/Lotus/Weapons/Dex/DexSybaris',
    ],
    note: {
      tldr: 'The Sybaris — a two-round burst crit rifle; Prime version reaches 28% crit for Hunter Munitions bleed builds.',
      sections: [
        { heading: 'Mechanics', points: [
          'Two-round burst per trigger pull — slightly faster output than a single semi-auto shot, more controlled than full-auto.',
          'Sybaris: 20% crit, 10% status. Sybaris Prime: 28% crit, 14% status. Dex Sybaris: 25% crit, 10% status.',
          'All three variants are crit weapons; status builds are not productive here.',
        ]},
        { heading: 'Interactions', points: [
          'Hunter Munitions with 28% crit on the Prime makes it a reliable bleed-stacking burst rifle.',
          'Dex Sybaris is the anniversary gift version — functionally similar to the Prime, available without crafting.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/TnBurstRifle/TnBurstRifleWeapon',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeTiberon/PrimeTiberonWeapon',
    ],
    note: {
      tldr: 'The Tiberon — a select-fire rifle toggling between semi, burst, and full-auto; 25% crit on Prime.',
      sections: [
        { heading: 'Mechanics', points: [
          'Three fire modes selectable mid-combat: single, three-round burst, full-auto. Switching is instant.',
          'Tiberon Prime: 25% crit, 20% status — a solid hybrid that works across all three modes.',
          'Base Tiberon has lower stats; the Prime version is where this weapon becomes competitive.',
        ]},
        { heading: 'Interactions', points: [
          'The select-fire means you adapt to the situation: full-auto for crowds, burst for medium-range groups, semi for precision.',
          'Builds that work in auto mode also work in burst and semi — no mode-specific mod swapping needed.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/LongGuns/GrineerBurstRifle/GrineerBurstRifle',
      '/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Hind/KuvaHind',
    ],
    note: {
      tldr: 'The Hind — a five-round burst Grineer rifle; Kuva Hind adds a Lich element and significantly higher stats.',
      sections: [
        { heading: 'Mechanics', points: [
          'Five rounds per burst, all hitscan — the longer burst means more status procs per trigger pull.',
          'Base Hind: very low crit (5%), low status (5%) — barely functional as a stat weapon.',
          'Kuva Hind jumps to 18% crit and 30% status — a different weapon entirely, with a progenitor bonus element.',
        ]},
        { heading: 'Interactions', points: [
          'Kuva Hind is the only worth building; the base Hind is a mastery farm item.',
          'The 30% status on Kuva Hind means a five-round burst can stack multiple elemental procs reliably.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/LongGuns/GrnBurstRifle4/GrnBurstRifle4',
      '/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Quartakk/KuvaQuartakk',
    ],
    note: {
      tldr: 'The Quartakk — a unique four-round burst that fires all four rounds simultaneously (a shotgun-like spread), not sequentially.',
      sections: [
        { heading: 'Mechanics', points: [
          'All four bullets in the burst release at once in a tight spread — functionally closer to a shotgun than a traditional burst rifle.',
          'Because all shots share one trigger event, status is calculated per-projectile; the simultaneous release can apply up to 4 status procs at once.',
          'Kuva Quartakk raises crit to 20% and status to 25%, and adds a progenitor bonus element.',
        ]},
        { heading: 'Interactions', points: [
          'The simultaneous-burst behavior means landing all four on one target is essentially a guaranteed status proc cluster per shot.',
          'At range the spread separates; tight grouping only at close-to-medium range.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Corpus/LongGuns/CrpShootgunRifle/CrpShootgunRifle'],
    note: {
      tldr: 'The Battacor — a Corpus three-round burst hitscan rifle that builds a Void charge on kills, releasing a powerful beam shot on trigger release.',
      sections: [
        { heading: 'Mechanics', points: [
          'Kills with the Battacor charge a Void energy counter; releasing the trigger with a full charge fires a large piercing Void beam.',
          'The three-round burst is the charging mechanism as much as the damage delivery — kill-farm to unlock the beam.',
          '26% crit, 20% status — crit-leaning, with the beam shot dealing significantly amplified Void damage.',
        ]},
        { heading: 'Interactions', points: [
          'The Void beam bypasses most damage reductions and armor on Sentient enemies — particularly effective in Sentient-heavy missions.',
          'Pairs naturally with kill-heavy missions (Defense, Survival); sparse-spawn missions charge the beam slowly.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Infested/LongGuns/InfRifle/InfRifleWeapon',
      '/Lotus/Weapons/Infested/InfestedLich/LongGuns/CodaHema/CodaHema',
    ],
    note: {
      tldr: 'The Hema — drains health instead of ammo to fire; very high status (35%), heals on headshot kills.',
      sections: [
        { heading: 'Mechanics', points: [
          'Has no ammo pool — every burst drains a fixed percentage of max health. Health is the only resource it consumes.',
          'Three-round burst, 35% status — very strong status platform once you accept the health cost.',
          'Headshot kills with the Hema restore health, partially offsetting the drain; effective in high-kill-rate missions.',
        ]},
        { heading: 'Interactions', points: [
          'Warframes with large health pools (Nidus, Inaros, Revenant) tolerate the health drain much better than glass-cannon frames.',
          'Coda Hema is the Infested Lich variant; similar identity with the Lich bonus element and potentially different stats.',
          'The research cost (5000 Mutagen Samples for clan) was famously expensive — Hema is one of the hardest-to-research weapons.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Infested/LongGuns/InfCrpShotgun/InfCrpShotgunRifle'],
    note: {
      tldr: 'The Paracyst — an Infested Corpus harpoon rifle; alt-fire fires a harpoon chain that tethers an enemy and reels them in.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire: burst hitscan. Alt-fire: a projectile that hooks onto an enemy and drags them toward you.',
          'The harpoon pull is the unique mechanic — forces a target to close distance, enabling melee follow-up or repositioning the enemy into a cluster.',
          'Low crit (5%), moderate status (17.5%) — the primary fire is secondary to the harpoon utility.',
        ]},
        { heading: 'Interactions', points: [
          'Pair with AoE or melee combos: pull a heavy into a group, then detonate; or pull a priority target into melee range.',
          'Primarily a mastery/curiosity item; the harpoon is fun but rarely the most efficient approach.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/LongGuns/GrnExplodingBurstRifle/GrnExplodingBurstRifle'],
    note: {
      tldr: 'The Harpak — a Grineer burst rifle whose rounds embed in targets and explode after a short delay, dealing bonus Blast damage.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires a burst of rounds that embed in the target; after a brief delay each round detonates for additional Blast damage.',
          'Low crit (7.5%), moderate status (15%) — a gimmick weapon where the delayed explosion is the identity, not the raw stat line.',
          'The AoE from the explosions can hit nearby enemies, giving it some crowd-splash potential.',
        ]},
        { heading: 'Interactions', points: [
          'Effective when enemies are stationary or slowed — moving targets may walk away before rounds detonate.',
          'Mastery fodder for most players; the explosion mechanic is interesting but the stat line is too low to compete.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/TnCrossbow2/TnCrossbow2Weapon'],
    note: {
      tldr: 'The Higasa — a Tennogen burst crossbow; high status (30%) for a crossbow-style burst weapon.',
      sections: [
        { heading: 'Mechanics', points: [
          'Burst-fire crossbow with physical bolts; 20% crit and 30% status — status-leaning with some hybrid potential.',
          'Bolt travel time applies — not hitscan; lead targets at range.',
        ]},
        { heading: 'Interactions', points: [
          'High status makes it a strong elemental proc platform; the bolt travel reduces accuracy at long range.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/PrimePerigale/PrimePerigaleWeapon'],
    note: {
      tldr: 'The Perigale Prime — a burst sniper-rifle hybrid; each burst lands 4 shots, with very high crit (38%) and perfect accuracy.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires a four-round burst with zero spread — all four hit the exact same point at medium-long range.',
          '38% crit and 18% status — heavily crit-focused; Hunter Munitions is the obvious companion mod.',
          'Classified as a rifle not a sniper, so it does not use the Sniper combo counter or sniper damage falloff rules.',
        ]},
        { heading: 'Interactions', points: [
          'The zero-spread burst means a single target takes all four rounds; point-target burst-fire with high crit is its specialty.',
          'A strong crit rifle for precise single-target work without the range-restriction of snipers.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/TnBotanicRifle/TnBotanicRifleWeapon'],
    note: {
      tldr: 'The Thornbak — a plant-themed burst rifle from the Coda faction; moderate stats with an organic-Infested aesthetic.',
      sections: [
        { heading: 'Mechanics', points: [
          'Burst-fire hitscan; mid-tier crit and status — a competent burst option from the 1999 Coda content.',
        ]},
        { heading: 'Interactions', points: [
          'Part of the 1999 Technocyte Coda weapon set; acquired through that storyline.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/TnRifleSpear/TnRifleSpearWeapon'],
    note: {
      tldr: 'The Afentis — Citrine’s signature burst rifle; fires crystalline shards and gains bonus crit chance on a freshly reloaded mag.',
      sections: [
        { heading: 'Mechanics', points: [
          'Three-round burst of crystalline shards with 26% crit and 34% status — a genuine hybrid.',
          'After a full reload, the first burst fires with a significant crit bonus — rewarding deliberate reload timing.',
        ]},
        { heading: 'Interactions', points: [
          'Citrine’s signature — gains bonus stats in her hands; her crystal-focused kit creates synergy for reload-reset plays.',
          'The post-reload crit window rewards reloading just before engaging a priority target.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Rifles — semi-auto ─────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Rifle/LatronRifle',
      '/Lotus/Weapons/Tenno/Rifle/WraithLatron',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeLatron/PrimeLatron',
    ],
    note: {
      tldr: 'The Latron — the Tenno’s precision semi-auto; high crit (25%/28%) rewards deliberate aimed shots.',
      sections: [
        { heading: 'Mechanics', points: [
          'One round per trigger pull; low recoil and high accuracy make it effective at any range.',
          'Latron: 25% crit, 15% status. Latron Wraith: 30% crit, 20% status. Latron Prime: 28% crit, 22% status.',
          'All three are crit-first; the Wraith has the highest crit, the Prime a better overall balance.',
        ]},
        { heading: 'Interactions', points: [
          'Hunter Munitions pairs well across the whole family; deliberate semi-auto fire applies controlled crit-bleed stacks.',
          'The Wraith is a notable event/market reward that outperforms the Prime on raw crit.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/LongGuns/GrnMarksman/GrnMarksman'],
    note: {
      tldr: 'The Grinlok — a Grineer single-shot semi-auto marksman rifle; moderate stats, heavy Grineer visual identity.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto hitscan with 25% crit and 15% status — crit-leaning, straightforward single-shot platform.',
          'Prisma Grinlok (Baro) raises crit to 30% for a cleaner Hunter Munitions build.',
        ]},
        { heading: 'Interactions', points: [
          'A reliable mid-game semi-auto crit rifle; the Prisma variant is worth the Ducats when available.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/LongGuns/CrpBFG/CrpBFGWeapon',
      '/Lotus/Weapons/Corpus/LongGuns/PrimeFulmin/PrimeFulminWeapon',
    ],
    note: {
      tldr: 'The Fulmin — toggles between a silent semi-auto electric mode and a shotgun mode; high crit (28%/30%) in both.',
      sections: [
        { heading: 'Mechanics', points: [
          'Alt-fire toggles between semi-auto electric beam (silent, longer range) and auto shotgun mode (loud, close range).',
          'The semi-auto mode fires a tight single Electric shot; shotgun mode fans out multiple pellets.',
          'Fulmin Prime: 30% crit, 22% status in rifle mode — a strong crit-hybrid in either configuration.',
        ]},
        { heading: 'Interactions', points: [
          'Silent mode is usable in stealth runs; the toggle lets you adapt to the mission without gear swapping.',
          'Hunter Munitions applies to both modes; the semi-auto mode is the more controlled crit-bleed delivery mechanism.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/LongGuns/TnSniperCrossbow/TnSniperCrossbow'],
    note: {
      tldr: 'The Veldt — a semi-auto rifle that highlights enemies hit with a passive radar reveal, marking their outline through walls briefly.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto hitscan with 18% crit and 15% status — below-average stats for its class.',
          'Hitting an enemy adds it to your radar and reveals its outline briefly through obstacles — passive reconnaissance on every shot.',
        ]},
        { heading: 'Interactions', points: [
          'The radar marking is situationally useful in missions where tracking enemies through walls matters (spy, capture).',
          'Primarily a mastery weapon; the damage profile is too modest for serious use in later content.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/KuvaLich/LongGuns/Chakkhurr/KuvaChakkhurr'],
    note: {
      tldr: 'The Kuva Chakkhurr — a massive single-shot Grineer rifle; one shot per trigger pull deals enormous damage with 37.5% crit.',
      sections: [
        { heading: 'Mechanics', points: [
          'Single-shot semi-auto with very high damage per shot and 37.5% crit — a slow, powerful precision weapon.',
          'Deals primarily Impact + Slash, with innate Heat and a very high crit multiplier (2.6x).',
          'Carries a Lich progenitor bonus element at acquisition, making it a two-element weapon automatically.',
        ]},
        { heading: 'Interactions', points: [
          'The high base damage and 37.5% crit make each shot extremely powerful; build around crit multiplier and elemental damage.',
          'The single-shot cadence means you want to be deliberate — a missed shot is a notable loss of DPS.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBESniper/CrpBESniperWeapon'],
    note: {
      tldr: 'The Vinquibus — a semi-auto Corpus laser rifle that fires tracking bolts that home onto the closest enemy after the initial hit.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto firing energy bolts that, after impacting one enemy, redirect toward nearby targets.',
          'The tracking behavior makes it forgiving against fast-moving or partially-covered enemies.',
          'From the Corpus Sister of Parvos faction with a Sister bonus element built in.',
        ]},
        { heading: 'Interactions', points: [
          'The homing redirect is useful in cover-heavy maps; shot placement matters less once the initial hit is made.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEGun2/CrpBEGun2Weapon'],
    note: {
      tldr: 'The Phenmor — a Corpus semi-auto rifle that builds a critical charge on consecutive hits, eventually dealing a massive amplified shot.',
      sections: [
        { heading: 'Mechanics', points: [
          'Base stats: 15% crit, 28% status. The crit charge mechanic temporarily elevates effective crit massively on the charged shot.',
          'Landing consecutive hits without missing increments a hidden counter; when full, the next shot deals a dramatically amplified crit.',
          'The amplified shot resets the counter — requires sustained precision fire to cycle efficiently.',
        ]},
        { heading: 'Interactions', points: [
          'High accuracy and rapid target acquisition maximise the charge cycling; a poor approach for spray-and-pray play.',
          'The Sister progenitor element is baked in at acquisition — the bonus type affects which elemental combinations work best.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEGun/CrpBEGunWeapon'],
    note: {
      tldr: 'The Purgator — a Corpus energy cannon whose charged shot mechanic chains between nearby targets on hit.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto with a charged alt-fire mode; the chain-arc hit jumps to additional enemies within a small radius.',
          'Sister progenitor element built in; crit and status lines depend on the specific Purgator variant acquired.',
        ]},
        { heading: 'Interactions', points: [
          'The chain effect makes it strong in tight groups; individual isolated targets see no bonus from the chain.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/TnCrossbow/TnCrossbow',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeNagantaka/PrimeNagantakaWeapon',
    ],
    note: {
      tldr: 'The Nagantaka — a semi-auto crossbow with very high status (32%/36%); fires quarrels that induce bleed and toxin on hit.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto crossbow firing physical quarrels — projectile travel time, not hitscan.',
          'Nagantaka: 32% status, 10% crit. Nagantaka Prime: 36% status, 14% crit — pure status platform.',
          'The quarrels deal primarily Slash and Toxin, providing built-in bleed and toxin proc stacking.',
        ]},
        { heading: 'Interactions', points: [
          'Even without Hunter Munitions the innate Slash damage generates bleed; adding elemental mods layers Toxin or Viral on top.',
          'Nagantaka Prime is a high-performance status weapon in a compact semi-auto package.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/LongGuns/CrpRifle/CrpRifle',
      '/Lotus/Weapons/Corpus/LongGuns/DeraVandal/DeraVandal',
    ],
    note: {
      tldr: 'The Dera — a Corpus semi-auto laser rifle; the Vandal variant reaches 20% crit and 20% status for a balanced mid-range option.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto hitscan with low base stats; Dera Vandal raises both crit and status to 20% each.',
          'Accurate at range with minimal spread per shot.',
        ]},
        { heading: 'Interactions', points: [
          'The Vandal is the only version worth building; balanced hybrid stats at 20%/20% let either build direction work.',
          'A solid training-wheels hybrid rifle before graduating to higher-tier options.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/LongGuns/GrnMarksman2/GrnMarksman2Weapon'],
    note: {
      tldr: 'The Argonak — a Grineer semi-auto marksman rifle that reveals enemy weak spots on aim-glide.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto hitscan; while aiming during an aim-glide (bullet-jump then aim), the Argonak highlights enemy weak points through obstacles.',
          '12% crit, 28% status — status-leaning; the weak-spot reveal is the defining mechanic, not raw damage stats.',
        ]},
        { heading: 'Interactions', points: [
          'The weak-point reveal works well for solo stealth/spy play where repositioning via aim-glide is common.',
          'Best when you aim-glide regularly; the mechanic rewards mobile aerial play styles.',
        ]},
      ],
      status: 'beta',
    },
  },


  // ── Rifles — beam / continuous ─────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Corpus/LongGuns/ElecRifle/ElecRifle',
      '/Lotus/Weapons/Corpus/LongGuns/CrpBatteryRifle2/CrpBatteryRifle2',
    ],
    note: {
      tldr: 'The Amprex — a continuous Electric arc that chains to nearby enemies; extremely high status (35%) makes it a premier group-crowd proc weapon.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires a continuous Electric arc that chains automatically to enemies within a short radius of the primary target.',
          'Status is calculated per arc chain; hitting multiple chained enemies means multiple independent status rolls per second.',
          '26% crit and 35% status — both sides strong enough to support a hybrid build.',
        ]},
        { heading: 'Interactions', points: [
          'Viral on the Amprex combined with the arc-chain means an entire room can be Viral-primed within seconds.',
          'Ammo drain is very fast at sustained fire; bring Ammo Mutation for anything beyond short bursts.',
          'Syndicate version (CrpBatteryRifle2 = Secura Amprex?) adds Syndicate proc; core arc mechanic is identical.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Infested/LongGuns/InfArkveld/InfArkveldsGun',
      '/Lotus/Weapons/Infested/InfestedLich/LongGuns/CodaSynapse/CodaSynapse',
    ],
    note: {
      tldr: 'The Synapse — a continuous Infested beam that deals primarily Corrosive damage and has innate armor-stripping ability.',
      sections: [
        { heading: 'Mechanics', points: [
          'Continuous hitscan beam with a tight spread; damage is applied per-tick at the rate of the beam.',
          'Innate Corrosive damage means every tick has a chance to apply a Corrosion proc, progressively stripping armor.',
          '15% crit, 35% status — status-dominant; the armor-strip scales with proc count rather than crit.',
        ]},
        { heading: 'Interactions', points: [
          'In missions where armored enemies are the primary threat (Steel Path Grineer), sustained Synapse fire can fully strip armor over several seconds.',
          'Coda Synapse is the Infested Lich variant — same beam identity with a Lich bonus element added.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/LongGuns/GrineerFlameThrower/GrineerFlameThrower',
      '/Lotus/Weapons/Grineer/LongGuns/WraithIgnis/WraithIgnis',
    ],
    note: {
      tldr: 'The Ignis — a continuous flamethrower; wide cone coverage at close-to-medium range with very high Heat status (35%).',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires a sustained cone of flame that hits all enemies in its area; the spread is horizontal, covering a wide arc.',
          'Very low crit (5%/7%), very high status (35%) — pure status weapon; every tick rolls status against the whole cone.',
          'Ignis Wraith raises crit to 7% and retains 35% status; also has a tighter spread for slightly more range.',
        ]},
        { heading: 'Interactions', points: [
          'Heat procs from the Ignis strip armor (via the Heat proc armor-reduction) independently of Corrosive; a pure Heat build is effective against armored Grineer.',
          'The wide cone makes it ideal for corridor defense or any mission where enemies funnel toward you.',
          'Ignis Wraith is the significantly superior version — the base Ignis is mostly a mastery step.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/LongGuns/CrpFreezeRayRifle/CrpFreezeRayRifle',
      '/Lotus/Weapons/Corpus/LongGuns/VandalGlaxion/GlaxionVandal',
    ],
    note: {
      tldr: 'The Glaxion — a continuous Cold beam; applies Freeze status on every tick, instantly stopping enemies who proc it.',
      sections: [
        { heading: 'Mechanics', points: [
          'Continuous Cold damage beam; each damage tick rolls status, and Cold procs slow then freeze enemies.',
          'Very low crit (5%/10%), high status (35%/40%) — a pure status platform for crowd-control and combo setup.',
          'Glaxion Vandal raises crit to 10% and status to 40%; more proc consistency.',
        ]},
        { heading: 'Interactions', points: [
          'Frozen enemies take 50% increased melee finisher damage — pair with a melee Warframe or weapon for a significant burst window.',
          'Tenet Glaxion (Sister variant) adds innate Radiation and a Sister bonus element for a two-element Cold-combo weapon.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEBeam/CrpBEBeamWeapon'],
    note: {
      tldr: 'The Tenet Glaxion — a Sister of Parvos beam variant; innate Cold + Radiation and a Sister bonus element, high status (40%).',
      sections: [
        { heading: 'Mechanics', points: [
          'Same continuous Cold beam as the Glaxion family but with innate Radiation and a Sister progenitor element baked in.',
          '40% status and three innate elements make elemental combination builds particularly powerful.',
        ]},
        { heading: 'Interactions', points: [
          'Radiation causes enemies to fight each other; combined with Cold freeze, you can lock a group and have them self-destruct.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/LongGuns/CrpBFGBeamRifle/CrpBFGBeamRifle',
    ],
    note: {
      tldr: 'The Flux Rifle — a continuous Corpus laser beam; precise hitscan with very high status (35%).',
      sections: [
        { heading: 'Mechanics', points: [
          'Single continuous laser at maximum accuracy — every tick hits the same target point exactly.',
          '5% crit, 35% status — a pure status platform; the precision makes it effective even on fast-moving small targets.',
        ]},
        { heading: 'Interactions', points: [
          'Tenet Flux Rifle is the Sister variant with significantly improved crit (20%), status (35%), and a bonus element.',
          'The base Flux Rifle has very low damage numbers by modern standards; the Tenet version is the competitive choice.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEBeam2/CrpBEBeam2Weapon'],
    note: {
      tldr: 'The Tenet Flux Rifle — a Sister of Parvos beam; 20% crit, 35% status, Sister bonus element.',
      sections: [
        { heading: 'Mechanics', points: [
          'Same pinpoint continuous laser as the Flux Rifle but with dramatically improved crit (20%) and a baked-in Sister element.',
          'Both crit and status lines are high enough for a hybrid build — unusual for a beam weapon.',
        ]},
        { heading: 'Interactions', points: [
          'Hunter Munitions at 20% crit gives the beam a reliable bleed-stack mechanism while the 35% status applies elemental procs simultaneously.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/LongGuns/CrpSatiBeamRifle/CrpSatiBeamRifle',
      '/Lotus/Weapons/Corpus/LongGuns/CrpSatiBeamRifleVandal/CrpSatiBeamRifleVandal',
    ],
    note: {
      tldr: 'The Quanta — a Corpus cube-launcher beam rifle; alt-fire fires floating cubes that the beam can detonate for AoE Electricity.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire: continuous Electric beam, low crit (5%) and high status (25% / Vandal: 35%).',
          'Alt-fire deploys a hovering Quanta cube at the cursor. Shooting a cube with the primary beam triggers a large Electricity AoE centered on it.',
          'Cubes persist in the world and can be pre-placed at choke points before enemies arrive.',
        ]},
        { heading: 'Interactions', points: [
          'The cube-detonation AoE has good range — place cubes in enemy movement paths for a one-shot cluster clear.',
          'Quanta Vandal raises status to 35%; Tenet Quanta (Sister variant) adds a bonus element and significantly improved stats.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEBeam3/CrpBEBeam3Weapon'],
    note: {
      tldr: 'The Tenet Quanta — Sister variant of the Quanta; same cube-detonation mechanic with 25% crit, 35% status, and a Sister element.',
      sections: [
        { heading: 'Mechanics', points: [
          'Identical cube-deploy-and-detonate mechanic, but the stat line is fully competitive (25% crit, 35% status).',
          'Sister progenitor element affects the detonation AoE as well as the beam itself.',
        ]},
        { heading: 'Interactions', points: [
          'The cube AoE inherits mods — high-damage detonations make it one of the more fun AoE setups available on a primary.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Rifles — charge / single-shot ──────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Corpus/LongGuns/CrpBFG/CrpBFGRifle',
      '/Lotus/Weapons/Corpus/LongGuns/CrpOpticorVandal/CrpOpticorVandal',
    ],
    note: {
      tldr: 'The Opticor — a charge-to-fire Corpus laser cannon; holds charge and fires a single high-damage piercing beam.',
      sections: [
        { heading: 'Mechanics', points: [
          'Requires holding the trigger to charge before releasing a high-velocity laser beam that punches through multiple enemies in a line.',
          'Full charge time is roughly 1.5 seconds; a partial charge fires a weaker shot.',
          '30%/34% crit, 14%/20% status — crit-focused; the beam deals one large burst of damage per charge cycle.',
        ]},
        { heading: 'Interactions', points: [
          'The piercing beam means positioning matters — lining up enemies in a corridor maximises targets hit per shot.',
          'Opticor Vandal adds significant crit (34%) and status (20%) improvements; a major upgrade worth the Baro Ducats.',
          'Beam damage is very high but cadence is slow — better for burst damage on priority targets than sustained output.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/LongGuns/GrnAntiGravRifle/GrnAntiGravRifle',
      '/Lotus/Weapons/Corpus/BoardExec/Primary/CrpBEFerrox/CrpBEFerroxWeapon',
    ],
    note: {
      tldr: 'The Ferrox — a Grineer charge rifle that fires a javelin which tethers to a surface and creates a Gravity Pull zone, dragging nearby enemies toward it.',
      sections: [
        { heading: 'Mechanics', points: [
          'Charge and release fires a spear-like projectile; when it embeds in a wall or surface it activates a gravity well pulling enemies toward it.',
          '24%/28% crit and 20%/24% status — solid hybrid stats that work in any build direction.',
          'The gravity zone lasts several seconds, keeping a group clustered for follow-up AoE.',
        ]},
        { heading: 'Interactions', points: [
          'Pair with AoE weapons or abilities: place the tether, then detonate the clustered group.',
          'Tenet Ferrox (Sister variant) adds a Sister progenitor element and improved stats — the same tethering mechanic on a better stat line.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Grineer/LongGuns/GrnJavlokRifle/GrnJavlokRifle'],
    note: {
      tldr: 'The Javlok — a Grineer throwable charge rifle; alt-fire throws the weapon itself as a flaming javelin that explodes on impact.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire: standard charged Blast shot. Alt-fire: throws the Javlok as a physical projectile that sticks in enemies or surfaces and detonates.',
          'After throwing, the weapon must be retrieved (it lands on the ground) or times out and returns.',
          'Low crit (7.5%) and very low status (5%) — the thrown-weapon mechanic is the identity, not the stat line.',
        ]},
        { heading: 'Interactions', points: [
          'The thrown javelin deals more damage than the primary fire; use it on groups or bosses when you can retrieve it quickly.',
          'Primarily a mastery weapon — the mechanic is memorable but the stats do not support endgame use.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Rifle/Miter'],
    note: {
      tldr: 'The Miter — a throwable disc launcher; large circular sawblades travel in an arc and pierce multiple enemies.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires large spinning discs as projectiles; each disc has significant travel time and an arcing trajectory.',
          'Discs pierce through enemies in a line — one disc can hit multiple targets if aimed correctly.',
          '10% crit, 10% status — low stats; the Miter is a mastery weapon and Jat Kittag precursor component.',
        ]},
        { heading: 'Interactions', points: [
          'The disc arc makes it unintuitive at range; effective primarily at close-medium range where the arc is flat.',
          'Primarily used as a crafting ingredient (Jat Kittag) rather than a primary weapon in most builds.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Infested/LongGuns/InfCrpBow/InfCrpBow'],
    note: {
      tldr: 'The Mutalist Cernos — an Infested bow; arrows release a gas cloud of Toxin on impact instead of dealing direct damage.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires arrows that create a persistent Toxin cloud at the impact point; the cloud deals damage over time to enemies in it.',
          'Very low crit (5%), low status (10%) on the arrow itself — the cloud is the primary damage vector, not the projectile.',
          'Classified as a Bow but the cloud mechanic makes it behave more like a terrain-denial weapon.',
        ]},
        { heading: 'Interactions', points: [
          'The Toxin cloud bypasses shields entirely — any enemy in the cloud loses health directly.',
          'Mostly used in specific niche setups; general damage output is well below current meta bows.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Rifles — crossbow / silent ──────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/Attica/Attica',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeAttica/PrimeAttica',
    ],
    note: {
      tldr: 'The Attica — a rapid-fire crossbow; fires physical bolts quickly and silently with 25%/30% crit.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto-fire crossbow shooting physical bolts — faster fire rate than most crossbows, below-average versus auto rifles.',
          'Silent — does not alert unaware enemies.',
          '25%/30% crit and 10%/14% status — crit-focused; Hunter Munitions builds work well.',
          'Bolt travel time applies; not hitscan.',
        ]},
        { heading: 'Interactions', points: [
          'A solid silent auto-crossbow for stealth builds; the Prime raises crit to 30%, making Hunter Munitions bleed-stacking very consistent.',
          'Less effective at long range as bolts travel and spread slightly.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/LongGuns/TnCrossbow3/TnCrossbow3',
      '/Lotus/Weapons/Tenno/LongGuns/PrimeZhuge/PrimeZhuge',
    ],
    note: {
      tldr: 'The Zhuge — a rapid-fire silent crossbow with a large magazine; Prime version jumps to 30% crit and 40% status for a strong hybrid.',
      sections: [
        { heading: 'Mechanics', points: [
          'Full-auto crossbow, silent, large magazine — extended sustained fire before reload.',
          'Zhuge: 15% crit, 15% status — below average base. Zhuge Prime: 30% crit, 40% status — a legitimate high-end hybrid.',
          'Bolt travel time, not hitscan.',
        ]},
        { heading: 'Interactions', points: [
          'Zhuge Prime is one of the better silent primaries in the game; 40% status with 30% crit supports multiple build directions simultaneously.',
          'Use for stealth, spy missions, or any context where silence is needed without sacrificing damage output.',
        ]},
      ],
      status: 'beta',
    },
  },


  // ── Secondaries — semi-auto / revolver families ────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistol/Pistol',
      '/Lotus/Weapons/Tenno/Pistol/LatoVandal',
      '/Lotus/Weapons/Tenno/Pistol/LatoPrime',
      '/Lotus/Weapons/Tenno/Akimbo/AkimboPistol',
      '/Lotus/Weapons/MK1Series/MK1Furis',
    ],
    note: {
      tldr: 'The Lato — the Tenno standard-issue sidearm; MR0 starter that scales from basic to competitive through Vandal and Prime tiers.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto hitscan pistol; low recoil, moderate stats on the base version.',
          'Lato: 10% crit, 6% status. Lato Vandal: 26% crit, 10% status. Lato Prime: 30% crit, 20% status.',
          'Aklato (dual) doubles the fire rate but halves reload efficiency.',
          'Mk1-Furis is the starter auto pistol alternative — different weapon, grouped here as starter secondary alongside the Lato.',
        ]},
        { heading: 'Interactions', points: [
          'Lato Prime is a founding-Tenno-exclusive weapon — extremely rare and cosmetically significant; stats are solid but not exceptional.',
          'Lato Vandal at 26% crit is a genuine Hunter Munitions platform for its mastery bracket.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistol/RevolverPistol',
      '/Lotus/Weapons/Tenno/Pistols/PrimeVasto/PrimeVastoPistol',
      '/Lotus/Weapons/Tenno/Akimbo/DualVastos',
      '/Lotus/Weapons/Tenno/Pistols/PrimeVasto/AkPrimeVasto/AkPrimeVastoPistol',
    ],
    note: {
      tldr: 'The Vasto — a high-damage revolver-style pistol with strong crit (20%+); Prime and Akvasto Prime versions are endgame-capable.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto, higher damage per shot than auto pistols, slower fire rate.',
          'Vasto: 20% crit, 8% status. Vasto Prime: 22% crit, 22% status. Akvasto Prime: 22% crit, 22% status (dual).',
          'The balanced 22%/22% on the Primes supports hybrid builds effectively.',
        ]},
        { heading: 'Interactions', points: [
          'Vasto Prime and Akvasto Prime are competitive mid-to-high-level secondaries with no exotic mechanics — straightforward hybrid platforms.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistol/HeavyPistol',
      '/Lotus/Weapons/Tenno/Pistols/PrimeLex/PrimeLex',
      '/Lotus/Weapons/Tenno/Akimbo/AkLexPistols',
      '/Lotus/Weapons/Tenno/Akimbo/AkLexPrimePistols',
    ],
    note: {
      tldr: 'The Lex — a heavy semi-auto pistol; low fire rate, high single-shot damage. Lex Prime and Aklex Prime reach 25% crit for Hunter Munitions builds.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto with a slow fire rate and very high per-shot damage — precision pistol.',
          'Lex: 20% crit, 10% status. Lex Prime: 25% crit, 25% status — a balanced hybrid at the Prime tier.',
          'Aklex Prime (dual) doubles throughput at the cost of magazine efficiency.',
        ]},
        { heading: 'Interactions', points: [
          'Lex Prime was one of the dominant secondaries before Incarnon-era releases; still solid for players who prefer deliberate semi-auto fire.',
          'The high per-shot damage means multishot mods are particularly valuable here compared to auto secondaries.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/Magnum/Magnum',
      '/Lotus/Weapons/Tenno/Pistols/PrimeMagnus/PrimeMagnusWeapon',
      '/Lotus/Weapons/Tenno/Akimbo/DualMagnus',
      '/Lotus/Weapons/Tenno/Akimbo/DualMagnusPrime',
    ],
    note: {
      tldr: 'The Magnus — a Tenno semi-auto pistol with balanced hybrid stats (22%/22%); Prime is a reliable general-purpose secondary.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto hitscan; consistent fire rate between the heavy Lex and lighter revolvers.',
          'Magnus: 22% crit, 22% status. Magnus Prime: 28% crit, 28% status — one of the more balanced hybrid pistols.',
          'Akmagnus / Akmagnus Prime double the throughput in the dual wield configuration.',
        ]},
        { heading: 'Interactions', points: [
          'Magnus Prime at 28%/28% is flexible enough to run purely as a crit weapon, a status weapon, or a hybrid — rare versatility for a pistol.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistol/BurstPistol',
      '/Lotus/Weapons/Tenno/Pistols/PrimeSicarus/PrimeSicarusPistol',
    ],
    note: {
      tldr: 'The Sicarus — a three-round burst pistol; Sicarus Prime brings it to 25% crit and 20% status for a solid burst secondary.',
      sections: [
        { heading: 'Mechanics', points: [
          'Three rounds per trigger pull; consistent burst cadence regardless of trigger speed.',
          'Sicarus: 16% crit, 6% status — baseline burst. Sicarus Prime: 25% crit, 20% status — meaningfully better in both dimensions.',
        ]},
        { heading: 'Interactions', points: [
          'Sicarus Prime at 25% crit is a natural Hunter Munitions secondary for players who prefer burst over full-auto.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/TnBardPistolGun',
      '/Lotus/Weapons/Tenno/Pistols/PrimePandero/PanderoPrimeWeapon',
    ],
    note: {
      tldr: "The Pandero — Octavia's signature pistol; semi-auto with 30% crit and a unique alt-fire fan-shot that unloads the magazine in a spread.",
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire: deliberate semi-auto with high crit (30%/30%) and moderate status (10%/24%).',
          'Alt-fire: fires multiple rounds in a wide fan pattern simultaneously, draining several rounds of the magazine at once.',
          'Pandero Prime raises status to 24% and adds a slightly higher fire rate.',
        ]},
        { heading: 'Interactions', points: [
          "Octavia's signature — gains a reload speed bonus in her hands.",
          'The fan-shot alt-fire is good for close-range burst damage; the deliberate primary is better for longer ranges with full aim.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistol/HandShotGun',
      '/Lotus/Weapons/Tenno/Pistol/BroncoPrime',
      '/Lotus/Weapons/Tenno/Akimbo/AkimboShotGun',
      '/Lotus/Weapons/Tenno/Akimbo/PrimeAkimboShotGun',
    ],
    note: {
      tldr: 'The Bronco — a two-shot break-action hand shotgun; fires two high-damage buckshot blasts before reloading.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto shotgun pistol — fires two pellet blasts per magazine, each delivering multiple pellets in a tight spread.',
          'Very low crit (6%) and status (9%/13%) per pellet; the two-shot capacity means the damage window is short.',
          'Akbronco / Akbronco Prime dual-wield doubles magazine and sustained fire but the per-pellet stats remain low.',
        ]},
        { heading: 'Interactions', points: [
          'Best as a panic-button close-range burst in situations where you need brief high burst damage and switch back to primary.',
          'Bronco Prime marginally improves on the base; neither version competes with dedicated secondary shotguns at endgame.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/SawnOffShotgun/TennoHandShotgun',
      '/Lotus/Weapons/Tenno/Pistols/PrimePyrana/PrimePyranaPistol',
    ],
    note: {
      tldr: 'The Pyrana — a semi-auto hand shotgun; Pyrana Prime spawns a spectral second pistol on crit headshot kills, doubling your fire rate.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto shotgun pistol with multiple pellets per shot; 20%/24% crit and 3%/4% status — pure crit platform.',
          'Pyrana Prime: headshot kills with a critical hit spawn a ghost copy of the Pyrana that fires alongside you for several seconds.',
          'The spectral copy benefits from your mods — it fires at the same damage and status chance as your original.',
        ]},
        { heading: 'Interactions', points: [
          'The ghost Pyrana effectively doubles your fire rate during its active window; focus headshots to maximize uptime.',
          'Build for crit headshots; the ghost refresh loop sustains in dense waves where headshots are plentiful.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/AllNew1hSG/AllNew1hSG',
    ],
    note: {
      tldr: 'The Euphona Prime — a dual-mode hand cannon; primary fire is a tight shotgun burst, alt-fire is a single high-damage Projectile slug.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire: tight pellet spread, high per-pellet damage, 30% crit — a high-crit hand shotgun.',
          'Alt-fire: single precision slug that deals higher single-target damage at range.',
          'The two modes cover different engagement types without switching weapons.',
        ]},
        { heading: 'Interactions', points: [
          'Shotgun primary for groups or close targets; slug for range or armored priority targets.',
          'Both modes share mods — elements and crit mods apply to both fire types.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Pistols/GrineerHandShotgun/GrineerHandCannon',
      '/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Brakk/KuvaBrakk',
    ],
    note: {
      tldr: 'The Brakk — a Grineer burst hand shotgun; fires a tight cone of pellets rapidly. Kuva Brakk adds 29% crit and a Lich element.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto shotgun pistol — multiple pellets per shot in a tight spread, very effective at close range.',
          'Base Brakk: 17% crit, 5% status — crit-leaning but stats too low for endgame. Kuva Brakk: 29% crit, 11% status.',
          'Kuva Brakk adds the Lich progenitor bonus element baked into each shot.',
        ]},
        { heading: 'Interactions', points: [
          'Kuva Brakk is a strong close-range secondary; 29% crit with a bonus element creates powerful elemental combinations.',
          'The tight pellet cone means it is best treated as a semi-auto shotgun pistol — effective at point-blank, falls off at range.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Pistols/CorpusHandShotgun/CorpusHandCannon',
      '/Lotus/Weapons/Corpus/BoardExec/Secondary/CrpBEDetron/CrpBEDetron',
    ],
    note: {
      tldr: 'The Detron — a Corpus hand-cannon shotgun; fires Radiation pellets that bypass shields. Tenet Detron dramatically improves crit.',
      sections: [
        { heading: 'Mechanics', points: [
          'Shotgun pistol with innate Radiation damage — Radiation bypasses Corpus shields and confuses enemies.',
          'Base Detron: 4% crit, 13% status — weak stats. Tenet Detron: 18% crit, 10% status and a Sister bonus element.',
          'Pellets spread in a small cone; close range is most effective.',
        ]},
        { heading: 'Interactions', points: [
          'Innate Radiation makes it naturally strong against Corpus (shield-bypass) and Corrupted (Radiation confusion proc).',
          'Tenet Detron is the endgame version; the base Detron is a mastery item in modern content.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/AutomaticHandCrossbow/AutoCrossBow',
      '/Lotus/Weapons/Tenno/Pistols/PrimeBallistica/PrimeBallistica',
      '/Lotus/Weapons/Syndicates/RedVeil/Pistols/RVBallistica',
    ],
    note: {
      tldr: 'The Ballistica — a semi-auto hand crossbow; fires bolts with projectile travel time. Rakta Ballistica (Red Veil) adds a life-leech proc.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto crossbow firing physical bolts — projectile travel, not hitscan; lead moving targets at distance.',
          'Ballistica: 3% crit, 10% status — low base stats. Ballistica Prime: 20% crit, 15% status.',
          'Rakta Ballistica fires a spread of bolts on alt-fire and has a Red Veil Entropy proc that grants brief invulnerability on kill.',
        ]},
        { heading: 'Interactions', points: [
          'Ballistica Prime is the competitive version; 20% crit makes Hunter Munitions viable for a bolt secondary.',
          'Rakta Ballistica is primarily sought for the invulnerability proc (useful in high-level survival as a panic button) and not raw damage.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/GrineerPistol/GrnScopedPistolPlayer',
      '/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Seer/KuvaSeer',
    ],
    note: {
      tldr: 'The Seer — a scoped Grineer pistol; Kuva Seer raises it to 21% crit and 33% status for a hybrid secondary.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto with a scope that increases zoom when aiming; base Seer is low-stat (5% crit, 13% status).',
          'Kuva Seer: 21% crit, 33% status with a Lich progenitor element — a proper hybrid secondary.',
          'The scope zooms in significantly on ADS; effective at longer ranges than most pistols.',
        ]},
        { heading: 'Interactions', points: [
          'Kuva Seer is the build target; the base Seer is a mastery step.',
          'The Lich element on Kuva Seer allows building strong two-element combinations without using extra mod slots.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/GrineerPistol/GrnHeavyPistol',
      '/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Kraken/KuvaKraken',
    ],
    note: {
      tldr: 'The Kraken — a Grineer burst pistol; Kuva Kraken jumps to 21% crit and 29% status for a viable hybrid burst secondary.',
      sections: [
        { heading: 'Mechanics', points: [
          'Two-round burst per trigger pull; base Kraken has very low stats (5% crit, 13% status).',
          'Kuva Kraken: 21% crit, 29% status with a Lich progenitor element — a genuine mid-tier hybrid.',
        ]},
        { heading: 'Interactions', points: [
          'Kuva Kraken is the only version worth building seriously; base Kraken is a mastery weapon.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Pistols/GrineerLeverActionPistol/GLAPistol',
      '/Lotus/Weapons/Syndicates/SteelMeridian/Pistols/SMMarelok',
    ],
    note: {
      tldr: 'The Marelok — a Grineer lever-action pistol with 15% crit and 30% status; Vaykor Marelok raises both and adds a syndicate Justice proc.',
      sections: [
        { heading: 'Mechanics', points: [
          'Slow-fire semi-auto with high damage per shot; lever-action animation gives it a longer trigger-to-fire delay than most pistols.',
          'Marelok: 15% crit, 30% status. Vaykor Marelok: 20% crit, 35% status.',
          'Vaykor Marelok has the Steel Meridian Justice proc — a radial damage burst when the syndicate meter fills.',
        ]},
        { heading: 'Interactions', points: [
          'The 30%/35% status makes it a strong elemental proc secondary; the slow fire rate means each shot can proc reliably.',
          'Vaykor Marelok is the endgame choice for players running Steel Meridian or wanting a status-heavy slow pistol.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/TnPriestPistolWeapon',
      '/Lotus/Weapons/Tenno/Pistols/PrimeKnell/PrimeKnellWeapon',
    ],
    note: {
      tldr: "The Knell — Harrow's signature pistol; headshot kills stack a combo counter that boosts the next shot's crit chance dramatically.",
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto pistol. On headshot kill, a combo counter increments and the next shot fires with a substantial bonus crit chance.',
          'Each stack also causes a headshot kill to fully reload the magazine — indefinite ammo efficiency if headshots are consistent.',
          'Knell: 20% crit, 5% status. Knell Prime: 40% crit, 10% status — one of the highest base crit pistols.',
        ]},
        { heading: 'Interactions', points: [
          "Harrow's signature — gains bonus in his hands.",
          'The headshot-kill requirement rewards precise play; in dense waves the reload loop sustains almost indefinitely.',
          'At high combo stacks the crit chance can reach near-100% — effectively guaranteed criticals on the buffed shot.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/TnJetTurbinePistolWeapon',
    ],
    note: {
      tldr: 'The Athodai — a Daily Tribute auto pistol with 32% crit; its damage dramatically ramps up after the magazine runs empty.',
      sections: [
        { heading: 'Mechanics', points: [
          'Full-auto semi-auto (high fire rate) with 32% crit and 8% status — pure crit platform.',
          'After emptying the magazine, the next magazine fires at significantly increased fire rate and damage for a brief window.',
          'The ramp means intentionally firing to empty is part of the rhythm — do not reload early.',
        ]},
        { heading: 'Interactions', points: [
          'Hunter Munitions on a 32% crit auto pistol is very effective; the post-empty burst window is when bleed stacks peak.',
          'Obtainable only from the Daily Tribute milestone system — time-gated.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/TnOdaliskSmgPistol',
      '/Lotus/Weapons/Tenno/Pistols/PrimeVelox/PrimeVeloxPistol',
    ],
    note: {
      tldr: 'The Velox — a semi-auto burst pistol; Velox Prime reaches 14% crit and 32% status for a status-leaning secondary.',
      sections: [
        { heading: 'Mechanics', points: [
          'Burst pistol; Velox Prime: 14% crit, 32% status — a status-priority secondary.',
        ]},
        { heading: 'Interactions', points: [
          'High status for a burst pistol makes it useful for elemental proc builds where crit is not the priority.',
        ]},
      ],
      status: 'beta',
    },
  },


  // ── Secondaries — auto / SMG pistols ──────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistol/AutoPistol',
      '/Lotus/Weapons/Tenno/Akimbo/AkimboAutoPistols',
      '/Lotus/Weapons/Tenno/Pistols/PrimeAfuris/PrimeAFurisWeapon',
      '/Lotus/Weapons/Tenno/Pistols/DexFuris/DexFuris',
      '/Lotus/Weapons/MK1Series/MK1Furis',
    ],
    note: {
      tldr: 'The Furis — a lightweight auto pistol; Afuris Prime reaches 16% crit and 30% status for a status-hybrid dual-auto secondary.',
      sections: [
        { heading: 'Mechanics', points: [
          'Full-auto hitscan pistol; base Furis is low-stat (5% crit, 12% status) but Afuris Prime raises status to 30%.',
          'Afuris (dual Furis) doubles fire rate and magazine size; Afuris Prime adds meaningful hybrid stats.',
          'Dex Furis (anniversary gift) hits 14% crit, 28% status.',
        ]},
        { heading: 'Interactions', points: [
          'Afuris Prime and Dex Furis are the buildable versions; the base Furis and Mk1-Furis are starter and mastery items.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/GrineerPistol/GrineerLightPistol',
      '/Lotus/Weapons/Grineer/Pistols/WraithSingleViper/WraithSingleViper',
      '/Lotus/Weapons/Tenno/Akimbo/AkimboViperPistols',
      '/Lotus/Weapons/Grineer/Pistols/WraithTwinVipers/WraithTwinVipers',
    ],
    note: {
      tldr: 'The Viper — a Grineer rapid-fire pistol; very high fire rate, poor accuracy, modest stats until the Wraith variants.',
      sections: [
        { heading: 'Mechanics', points: [
          'Full-auto with extremely fast fire rate and significant spread — a hose, not a beam.',
          'Viper: 15% crit, 11% status. Viper Wraith: 19% crit, 9% status. Twin Vipers / Twin Vipers Wraith double the output further.',
          'Ammo drain is very fast; bring Ammo Mutation for sustained missions.',
        ]},
        { heading: 'Interactions', points: [
          'Best at close range where spread is acceptable; effective for applying elemental status procs through volume.',
          'Twin Vipers Wraith is a fun close-range spray weapon but is outclassed by more modern alternatives at endgame.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Pistols/CorpusMinigun/CorpusMinigun',
      '/Lotus/Weapons/Corpus/Pistols/CorpusMinigun/DualCorpusMinigun',
      '/Lotus/Weapons/Syndicates/PerrinSequence/Pistols/PSDualCestra',
    ],
    note: {
      tldr: 'The Cestra — a Corpus auto pistol with a brief spin-up; Dual Cestra and Secura Dual Cestra improve stats significantly.',
      sections: [
        { heading: 'Mechanics', points: [
          'Spin-up: fire rate ramps over the first half-second to peak output.',
          'Cestra: 6% crit, 20% status. Dual Cestra: 6% crit, 20% status (doubled output). Secura Dual Cestra: 16% crit, 28% status.',
          'Secura Dual Cestra adds the Perrin Sequence Entropy proc — an energy restore on kill.',
        ]},
        { heading: 'Interactions', points: [
          'The Secura Dual Cestra is the meaningful version; base Cestra stats are too low for endgame content.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/GrineerPistol/GrineerAkimboPistol',
      '/Lotus/Weapons/Grineer/Pistols/GrnUzi/GrnUziWeapon',
      '/Lotus/Weapons/Grineer/Pistols/GrnAmphisPistol/GrnAmphisPistol',
      '/Lotus/Weapons/Grineer/Pistols/GrnDWUniques/GrnTwinKohmaks',
      '/Lotus/Weapons/Grineer/Pistols/GrnKohmPistol/GrnKohmPistol',
      '/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Stubba/KuvaStubba',
    ],
    note: {
      tldr: 'Grineer auto pistols — Stubba, Kohmak, Quatz, Twin Gremlins; Kuva Twin Stubbas is the standout with 23% crit and 31% status.',
      sections: [
        { heading: 'Mechanics', points: [
          'A group of Grineer auto and SMG-style pistols with different fire rhythms but broadly similar low-moderate stats.',
          'Stubba: 23% crit, 13% status — crit-leaning single auto. Quatz: semi-auto with toggle to full-auto.',
          'Kohmak / Twin Kohmak: burst-fire Grineer microgun. Twin Gremlins: low-accuracy auto pistol pair.',
          'Kuva Twin Stubbas: 23% crit, 31% status with a Lich element — a competitive hybrid.',
        ]},
        { heading: 'Interactions', points: [
          'Kuva Twin Stubbas is the only weapon in this group competitive in Steel Path; the rest are mastery items.',
          'Prisma Twin Gremlins (Baro) improves to 23% crit, 23% status — a balanced mid-tier pickup.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/LongGuns/GrineerAssaultRifle/TwinGrakatas',
    ],
    note: {
      tldr: 'Twin Grakatas — dual Grineer Grakata pistols; 25% crit and 17% status, very high fire rate, significant spread.',
      sections: [
        { heading: 'Mechanics', points: [
          'Akimbo version of the primary Grakata; very high fire rate, moderate accuracy at range.',
          '25% crit, 17% status — crit-primary; Hunter Munitions is the natural pairing.',
          'High ammo consumption; Ammo Mutation or frequent resupply needed for long missions.',
        ]},
        { heading: 'Interactions', points: [
          'Beloved for the spray-and-pray aesthetic; effective at close-to-medium range.',
          'The primary Grakata is more ammo-efficient; the Twin Grakatas trade that for doubled throughput.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/TennoUzi/TennoUzi',
      '/Lotus/Weapons/Tenno/Pistols/PrimeAkstiletto/PrimeAkstiletto',
    ],
    note: {
      tldr: 'The Akstiletto — dual micro-SMG pistols; Akstiletto Prime reaches 15% crit and 30% status for a status-hybrid auto secondary.',
      sections: [
        { heading: 'Mechanics', points: [
          'High fire-rate dual pistols; Akstiletto: 18% crit, 18% status. Akstiletto Prime: 15% crit, 30% status.',
          'Prime shifts toward status — the higher status makes elemental build directions more reliable than the base.',
        ]},
        { heading: 'Interactions', points: [
          'Akstiletto Prime is a strong status secondary for its MR requirement; competitive in mid-game and viable into Steel Path with proper elemental builds.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/SomaSidearm/AkimboSomaPistols',
      '/Lotus/Weapons/Tenno/Pistols/PrimeAksomati/PrimeAksomati',
    ],
    note: {
      tldr: 'The Aksomati — rapid-fire dual pistols based on Soma; Aksomati Prime reaches 24% crit and 18% status.',
      sections: [
        { heading: 'Mechanics', points: [
          'Very fast fire rate dual pistols; Aksomati: 24% crit, 8% status. Aksomati Prime: 24% crit, 18% status.',
          'Crit-leaning both versions; Hunter Munitions is the reliable build direction.',
        ]},
        { heading: 'Interactions', points: [
          'Aksomati Prime delivers high crit-bleed output in the secondary slot; the elevated status on the Prime also opens hybrid modding.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/TnGuandoPistolGun',
      '/Lotus/Weapons/Tenno/Pistols/PrimeZakti/PrimeZaktiPistol',
    ],
    note: {
      tldr: 'The Zakti — a small-calibre pistol that fires explosive darts; Zakti Prime has 8% crit and 42% status for a status-dominant secondary.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires darts that detonate on impact for a small AoE; the explosions proc status rather than the dart itself.',
          'Zakti: 2% crit, 20% status. Zakti Prime: 8% crit, 42% status — among the highest status secondaries in the pistol slot.',
          'AoE allows status procs to land on nearby enemies even if only one target is aimed at.',
        ]},
        { heading: 'Interactions', points: [
          'Zakti Prime is a genuine status-spread tool; 42% status with AoE can Viral-prime a group in a few shots.',
          'Low damage per dart; it is a primer weapon, best paired with a high-damage secondary weapon via quick-swap.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Secondaries — AoE / explosive pistols ──────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Corpus/Pistols/CrpHandRL/CorpusHandRocketLauncher',
      '/Lotus/Weapons/Corpus/Pistols/CrpHandRL/PrismaAngstrum',
    ],
    note: {
      tldr: 'The Angstrum — a Corpus hand rocket launcher; fires a burst of mini-rockets that explode on impact for AoE Blast damage.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires 3 rockets simultaneously (or 1 Prisma Angstrum alt-fire) that explode on contact for Blast damage in a radius.',
          '16%/18% crit, 22%/26% status — solid hybrid stats with the AoE adding group-proc potential.',
          'Self-damage risk at close range; fire at the ground in front of a group rather than at individual targets.',
        ]},
        { heading: 'Interactions', points: [
          'Prisma Angstrum (Baro) is a meaningful upgrade; its alt-fire condenses all rockets into a single high-damage salvo.',
          'Pairs well with Warframes that group enemies (Vauban, Limbo, Nidus) — concentrated explosions on a cluster.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Pistols/CrpAirPistol/CrpAirPistolArray',
    ],
    note: {
      tldr: 'The Sonicor — a Corpus compressed-air cannon; fires a shockwave projectile that ragdolls enemies on impact.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto; fires a slow-moving spherical shockwave that violently ragdolls any enemy in its path.',
          '10% crit, 0% status — no status; the weapon is purely about the ragdoll crowd control.',
          'The ragdoll can launch enemies off ledges, into environmental hazards, or simply scatter a group.',
        ]},
        { heading: 'Interactions', points: [
          'Effective in defense to push enemies off objectives; near environmental hazards (cliffs, fans, vents) the ragdoll is lethal.',
          'Not a damage weapon — it is a displacement tool; pair with a high-damage primary.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Pistols/GrnTorpedoPistol/GrnTorpedoPistol',
    ],
    note: {
      tldr: 'The Kulstar — a Grineer hand mortar; fires a round that bounces twice before exploding, detonating three times total.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires a single explosive round that bounces off surfaces twice; on the third contact (or timeout) it detonates for an AoE Blast.',
          'The bouncing means the detonation point is not where you aimed; lead targets and bounce off walls to reach cover.',
          '17% crit, 19% status — decent hybrid stats but the bounce mechanics make precision placement the challenge.',
        ]},
        { heading: 'Interactions', points: [
          'Very effective in enclosed maps where bouncing into a room corners a cluster; awkward in open areas.',
          'The three-bounce delay means it is not a reactive weapon — commit to positioning before firing.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/ThrowingWeapons/StickyBomb/StickyBombs',
      '/Lotus/Weapons/Syndicates/NewLoka/Pistols/NLCastanas',
    ],
    note: {
      tldr: 'The Castanas — sticky electric grenades thrown as secondaries; detonate on command (alt-fire) or after a short fuse.',
      sections: [
        { heading: 'Mechanics', points: [
          'Thrown as a secondary; each cast throws multiple sticky grenades that adhere to surfaces and enemies.',
          'Alt-fire detonates ALL currently active Castanas simultaneously for a large coordinated Electricity burst.',
          'Sancti Castanas (New Loka) adds higher status and the Loka Justice proc on the syndicate meter.',
        ]},
        { heading: 'Interactions', points: [
          'Stick them to one enemy and detonate for concentrated single-target burst; or spread across a group for area denial.',
          'The simultaneous detonation makes them a setup weapon — you choose when and where all explosions happen.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/ThrowingWeapons/GrnVorStickyBomb/GrnVorStickyBomb',
    ],
    note: {
      tldr: 'The Aegrit — Grineer sticky grenade secondary; 37% crit makes it the highest-crit throwing weapon.',
      sections: [
        { heading: 'Mechanics', points: [
          'Sticky grenades similar to Castanas but with dramatically higher crit (37%) and moderate status (19%).',
          'The 37% crit is unusual for a throwing/explosive secondary and makes Hunter Munitions viable on a grenade weapon.',
        ]},
        { heading: 'Interactions', points: [
          'Crit-focused builds take advantage of the high base crit; combine with Blast element for AoE crit-bleed clusters.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Secondaries — Corpus beam / charge pistols ────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Syndicates/CephalonSuda/Pistols/CSDroidArray',
      '/Lotus/Weapons/Syndicates/CephalonSuda/Pistols/CSSynoidGammacor',
    ],
    note: {
      tldr: 'The Gammacor — a Cephalon Suda beam secondary; Synoid Gammacor reaches 20% crit and 28% status with the Suda Entropy proc.',
      sections: [
        { heading: 'Mechanics', points: [
          'Continuous hitscan beam; damage applied per-tick.',
          'Gammacor: 8% crit, 20% status. Synoid Gammacor: 20% crit, 28% status.',
          'Cephalon Suda Entropy proc restores energy to you on fill — sustained beam use with kills can maintain a passive energy income.',
        ]},
        { heading: 'Interactions', points: [
          'Synoid Gammacor was a dominant secondary for energy-hungry frames before stat power-creep; the energy restore is still useful.',
          'Beam weapons accumulate tick damage quickly; status and crit apply per tick at the beam rate.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Pistols/CrpChargeGun/CrpChargeGun',
      '/Lotus/Weapons/Corpus/BoardExec/Secondary/CrpBECycron/CrpBECycron',
    ],
    note: {
      tldr: 'The Cycron — a charged-burst energy secondary; fires a ricocheting disc. Tenet Cycron reaches 20% crit and 40% status.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto; fires a bouncing energy disc that ricochets off walls and enemies.',
          'Cycron: 12% crit, 30% status. Tenet Cycron: 20% crit, 40% status — one of the higher status secondaries available.',
          'The ricochet means the disc can hit the same enemy multiple times in an enclosed space.',
        ]},
        { heading: 'Interactions', points: [
          'Tenet Cycron with 40% status and a Sister element is a strong status primer/damage secondary in tight corridors.',
          'In open areas the ricochet provides less benefit; most effective in corridors and rooms.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Pistols/GrineerMicrowavegun/GrnMicrowavePistol',
      '/Lotus/Weapons/Grineer/KuvaLich/Secondaries/Nukor/KuvaNukor',
    ],
    note: {
      tldr: 'The Nukor — a Grineer microwave-beam secondary that chains to nearby enemies; Kuva Nukor at 50% status is one of the best status primers in the game.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires a continuous microwave beam that automatically arcs to nearby enemies in a chain — one shot can hit a group.',
          'Nukor: 3% crit, 29% status. Kuva Nukor: 7% crit, 50% status — the highest natural status in any secondary pistol.',
          'The chain mechanic means every enemy in proximity to the target receives status ticks simultaneously.',
        ]},
        { heading: 'Interactions', points: [
          'Kuva Nukor is the premier status primer for secondaries; 50% status with chaining means an entire squad of enemies can be Viral-primed in under a second.',
          'Its low damage is intentional — equip it to prime, then swap to a high-damage primary or melee to benefit from the amplified damage.',
          'The Lich progenitor element adds a third damage type on top of the innate Radiation — choose Heat for maximum coverage.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Pistols/HeatGun/GrnHeatGun',
    ],
    note: {
      tldr: 'The Atomos — a Grineer Heat beam that chains between enemies; moderate stats, effective as an elemental spread weapon.',
      sections: [
        { heading: 'Mechanics', points: [
          'Continuous beam that chains to nearby enemies after the first hit, spreading Heat damage across a group.',
          '15% crit, 21% status — a hybrid stat line but secondary to the chain-spread identity.',
          'Chain range is shorter than the Nukor; hits fewer enemies per second but at higher damage per tick.',
        ]},
        { heading: 'Interactions', points: [
          'Heat procs applied via chain strip armor over time (5 Heat procs = full strip), useful against light Grineer armor in mid-game.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Pistols/CrpElectroMag/CrpElectroMag',
    ],
    note: {
      tldr: 'The Staticor — a Corpus charge-fire pistol; brief charge releases a Electricity orb that explodes for AoE damage, with 28% status.',
      sections: [
        { heading: 'Mechanics', points: [
          'Charge to fire — longer charge = larger explosion radius and higher damage.',
          '14% crit, 28% status — status-leaning; the AoE means status procs apply to all caught in the blast.',
          'Releasing without a full charge fires a smaller burst; full charge is the intended use.',
        ]},
        { heading: 'Interactions', points: [
          'The AoE + 28% status makes it effective for priming groups if you can land the charge in the middle of a cluster.',
          'The charge time makes it poor for fast-moving individual targets; shine in stationary defense or enemy-cluster situations.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Pistols/CrpSonificBlastor/CrpBlastorWeapon',
      '/Lotus/Weapons/Corpus/BoardExec/Secondary/CrpBEPlinx/CrpBEPlinxWeapon',
    ],
    note: {
      tldr: 'The Plinx — a single-shot Corpus pistol with 32% crit; Tenet Plinx jumps to 44% crit with a Sister element for one of the highest crit secondaries.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto hitscan with very high crit: base Plinx 32%, Tenet Plinx 44% — far above most secondary pistols.',
          'Status is low (4%/12%) — a pure crit platform; status builds are the wrong direction.',
          'Tenet Plinx adds the Sister progenitor element baked in.',
        ]},
        { heading: 'Interactions', points: [
          'At 44% crit the Tenet Plinx is a reliable Hunter Munitions bleed machine in the secondary slot.',
          'The very high crit multiplier pairs with Blood Rush (with the combo counter) to reach extreme multipliers.',
        ]},
      ],
      status: 'beta',
    },
  },


  // ── Secondaries — special mechanics ───────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Zariman/Pistols/HeavyPistol/ZarimanHeavyPistol',
    ],
    note: {
      tldr: 'The Laetum — a Zariman evolved pistol; gains bonus crit after consecutive kills and unlocks an Incarnon alt-fire form.',
      sections: [
        { heading: 'Mechanics', points: [
          'Starts as a semi-auto Void-damage pistol; after activating Incarnon mode (charged up by kills), it transforms into a fully-automatic spray weapon.',
          'Base: 22% crit, 22% status. Incarnon mode substantially elevates crit to near-guaranteed with a different fire pattern.',
          'Void damage interacts with Void Adaptation (Operator passive) and Sentient enemies.',
        ]},
        { heading: 'Interactions', points: [
          'One of the Incarnon weapons from Angels of the Zariman content; requires Voidplume and Pathos Clamp to craft.',
          'The Incarnon form is triggered by a gauge filled during combat — consistent kill momentum maintains the mode longer.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/TnWraitheSidearmWeapon',
      '/Lotus/Weapons/Tenno/Pistols/PrimeEpitaph/PrimeEpitaphSidearmWeapon',
    ],
    note: {
      tldr: "The Epitaph — Wisp's signature sidearm; primary fire is silent Cold bolts; alt-fire lays a Wisp-style landing pad that applies Cold and Blast to any enemy entering it.",
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire: rapid Cold bolts, silent, 2%/4% crit and 4%/14% status — weak stats.',
          'Alt-fire: places a ground pad (similar to Wisp reservoirs aesthetically) that fires a burst of Cold/Blast on entering enemies.',
          'Epitaph Prime raises crit to 4% and status to 14%; still low, so the pad mechanic is the actual value.',
        ]},
        { heading: 'Interactions', points: [
          "Wisp's signature — gains bonus stats in her hands.",
          'The ground pad is a setup tool: place it in enemy movement paths for an automatic Cold proc on every entry.',
          'Cold procs set up freeze and can feed Ephemera Cold Sorbet or simply slow enemies for melee follow-up.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/TnYareliPistolWeapon',
      '/Lotus/Weapons/Tenno/Pistols/PrimeKompressa/PrimeKompressa',
    ],
    note: {
      tldr: "The Kompressa — Yareli's signature pistol; fires Water bubbles that hold enemies briefly before detonating for a burst.",
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto bubble launcher — bubbles linger at the impact point, trapping small enemies inside and then popping for damage.',
          'Kompressa: 6% crit, 30% status. Kompressa Prime: 16% crit, 36% status.',
          'The bubble trap briefly immobilises lighter enemies, creating a window for follow-up shots or melee.',
        ]},
        { heading: 'Interactions', points: [
          "Yareli's signature — gains bonus stats on her Merulina board.",
          'Kompressa Prime at 36% status can prime groups through multi-bubble application; useful as a secondary primer.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/SapientPistol/SapientPistol',
      '/Lotus/Weapons/Tenno/Pistols/PrimeAkarius/PrimeAkariusWeapon',
    ],
    note: {
      tldr: 'The Akarius — fire-and-forget rockets that seek targets after launch; Akarius Prime reaches 18% crit and 34% status.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires small rockets that home onto the closest enemy after release — no aiming required past the initial direction.',
          'Akarius: 6% crit, 28% status. Akarius Prime: 18% crit, 34% status.',
          'The homing is loose — rockets track toward targets but do not course-correct sharply; they may miss fast-moving enemies.',
        ]},
        { heading: 'Interactions', points: [
          'Good for blind-fire situations or covering flanks; the homing means you can fire without direct line of sight.',
          'Akarius Prime is a strong hybrid secondary; 34% status makes Viral priming reliable even on homing rockets.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/QuillDartGunWeapon',
      '/Lotus/Weapons/Tenno/Pistols/PrimeHystrix/PrimeHystrixWeapon',
    ],
    note: {
      tldr: "The Hystrix — Wisp's signature quill pistol; switches between four elemental ammo types; Hystrix Prime gets 28% crit.",
      sections: [
        { heading: 'Mechanics', points: [
          'Fires quills in four selectable elemental types: Heat, Cold, Electricity, Toxin — switched via alt-fire.',
          'Hystrix: 24% crit, 10% status. Hystrix Prime: 28% crit, 20% status — crit-leaning across both versions.',
          'The element-switching mechanic lets you instantly swap elements without modding.',
        ]},
        { heading: 'Interactions', points: [
          "Wisp's signature — gains bonus stats in her hands.",
          'The elemental switching means you can quickly cover different faction weaknesses or status combinations without changing mods.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/TnChoirframeKunai/TnChoirframeKunai',
      '/Lotus/Weapons/Tenno/Pistols/PrimeAkjagara/AkJagaraPrime',
    ],
    note: {
      tldr: 'The Akjagara — dual bladed pistols; high status (28%/32%) with an arcing projectile trajectory.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto dual pistols that fire bladed projectiles with a slight arc; not fully hitscan at range.',
          'Akjagara: 6% crit, 28% status. Akjagara Prime: 18% crit, 32% status.',
          'Cantare is a single-handed variant with similar knife-toss identity at 18% crit, 22% status.',
        ]},
        { heading: 'Interactions', points: [
          'Akjagara Prime is a solid status secondary; lead targets at range due to the projectile arc.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Thanotech/EntratiWristGun/EntratiWristGunWeapon',
    ],
    note: {
      tldr: 'The Onos — an Entrati wrist-mounted secondary; alt-fire charges up and releases an enormous Void-beam burst.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire: auto-fire Energy bolts, 26% crit, 22% status — solid hybrid base.',
          'Alt-fire: holds charge and fires a massive Void cannon blast that deals heavy single-target or AoE damage.',
          'A weapon from the Entrati faction; requires Zariman/Entrati standing to acquire.',
        ]},
        { heading: 'Interactions', points: [
          'The charged alt-fire is the defining moment; save the charge for heavy units or grouped enemies.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Thanotech/ThanoPistol/ThanotechPistol',
    ],
    note: {
      tldr: 'The Sepulcrum — an Entrati semi-auto pistol with 30% crit; fires homing bio-projectiles that deal Viral damage.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto, 30% crit and 14% status — crit-dominant.',
          'Innate Viral damage makes every crit a potential Viral proc without needing modded elements.',
        ]},
        { heading: 'Interactions', points: [
          'High crit + innate Viral is a strong combination; Hunter Munitions layered on top makes it a Viral-bleed machine.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Pistols/SniperPistol/CrpScopeGun',
    ],
    note: {
      tldr: 'The Arca Scisco — a Corpus scoped semi-auto pistol; zoomed ADS gives it sniper-level accuracy for a secondary.',
      sections: [
        { heading: 'Mechanics', points: [
          '18% crit, 26% status — moderate hybrid. The scope zooms significantly on ADS.',
          'At full zoom it functions like a long-range semi-auto pistol; without zoom, accuracy degrades notably.',
        ]},
        { heading: 'Interactions', points: [
          'Works as a precision secondary for players who want long-range coverage without occupying the primary slot with a sniper.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Grimoire/TnGrimoire',
      '/Lotus/Weapons/Tenno/Grimoire/TnDoppelgangerGrimoire',
    ],
    note: {
      tldr: 'The Grimoire — a Tenno secondary spellbook; fires magic energy pages that ricochet and pierce, with a charged alt-fire that blasts a large AoE.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto firing energy pages as projectiles; they pierce through enemies and ricochet off surfaces.',
          'Tenno Grimoire: 20% crit, 26% status. Doppelganger Grimoire: 8% crit, 10% status.',
          'Alt-fire charges and releases a burst AoE around the player.',
        ]},
        { heading: 'Interactions', points: [
          'The ricochet-and-pierce means pages can hit an enemy multiple times in tight corridors.',
          'The Doppelganger version is a variant from a specific mission/companion; the main Grimoire is the standard endgame secondary.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Pistols/CrpSentAmalgPistol/CrpSentAmalgPistol',
    ],
    note: {
      tldr: 'The Cyanex — a Corpus-Sentient secondary that fires homing spores; very high status (32%) and moderate crit (8%).',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires a small cluster of homing spores that track to the nearest enemy after launch.',
          '8% crit, 32% status — status platform; the homing removes the need for precise aim.',
        ]},
        { heading: 'Interactions', points: [
          'Good for applying status from cover or on fast-moving targets; the homing forgives imprecise fire.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Pistols/CrpSentExperimentPistol/CrpSentExperimentPistol',
    ],
    note: {
      tldr: 'The Ocucor — a Corpus-Sentient pistol with a chain-arc beam on ADS; 16% crit and 24% status.',
      sections: [
        { heading: 'Mechanics', points: [
          'Primary fire: semi-auto bolts. Alt-fire / ADS activates a chain-arc beam mode that connects between nearby enemies.',
          '16% crit, 24% status — balanced hybrid.',
        ]},
        { heading: 'Interactions', points: [
          'The beam arc mode applies status to chained enemies simultaneously; effective in groups but the chain range is limited.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Secondaries — Infested pistols ─────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/ClanTech/Bio/AcidDartPistol',
    ],
    note: {
      tldr: 'The Acrid — a clan-research Infested dart pistol; fires Toxin darts that bypass shields, applying poison procs.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto dart pistol with innate Toxin damage — Toxin bypasses shields and hits health directly.',
          '5% crit, 10% status — low base stats; primarily notable for innate shield-bypass on Corpus.',
        ]},
        { heading: 'Interactions', points: [
          'Useful against Corpus where shields make other damage types less efficient; Toxin hits health regardless of shield.',
          'Primarily a mastery or collector piece in the modern meta.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Infested/Pistols/InfestedPistol',
    ],
    note: {
      tldr: 'The Embolist — an Infested syringe pistol; fires a close-range Toxin mist cloud rather than a projectile.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires a persistent cloud of Toxin gas at point-blank range; not a projectile, more like a triggered AoE.',
          '3% crit, 41% status — extremely high status but the close range and low damage limit its use.',
        ]},
        { heading: 'Interactions', points: [
          'The 41% status is high enough to proc consistently but the delivery mechanism is too close-range to use safely in most missions.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Infested/Pistols/InfestedDartPistol/InfestedDartPistol',
      '/Lotus/Weapons/Infested/InfestedLich/Pistols/CodaTysis',
    ],
    note: {
      tldr: 'The Tysis — an Infested dart pistol at 50% status; fires sticky Toxin darts that embed and proc repeatedly.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto sticky darts; darts embed in the target and apply a Corrosive/Toxin proc before dissolving.',
          'Tysis: 3% crit, 50% status — one of the highest status percentages on any secondary.',
          'Coda Tysis adds the Infested Lich element on top of an already high-status platform.',
        ]},
        { heading: 'Interactions', points: [
          '50% status means nearly every dart triggers a status proc; Corrosive procs stack toward full armor strip.',
          'Best used as a primer weapon in fast-swap builds.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Infested/Pistols/InfProximityStars/InfProximityStars',
      '/Lotus/Weapons/Infested/InfestedLich/Pistols/CodaPox',
    ],
    note: {
      tldr: 'The Pox — thrown Infested proximity bombs that create a gas cloud on impact, applying Toxin to enemies entering the zone.',
      sections: [
        { heading: 'Mechanics', points: [
          'Thrown grenade secondary — projectiles arc to the target and detonate on contact or proximity, releasing a gas cloud.',
          '1% crit, 35% status — pure status tool; the cloud procs Toxin on everything inside it.',
          'Coda Pox adds the Infested Lich element to the cloud damage.',
        ]},
        { heading: 'Interactions', points: [
          'Place clouds in choke points or on objectives; enemies walking through take repeated Toxin procs.',
          'The cloud persists briefly — useful for area denial on defense targets.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Infested/Pistols/InfBeamPistol/InfBeamPistol',
      '/Lotus/Weapons/Infested/InfestedLich/Pistols/CodaCatabolyst',
    ],
    note: {
      tldr: 'The Catabolyst — an Infested beam pistol; the magazine expires and the weapon is thrown as an explosive to detonate.',
      sections: [
        { heading: 'Mechanics', points: [
          'Continuous beam secondary until the magazine empties; at that point, instead of reloading, the weapon is thrown and explodes for a large AoE Blast.',
          '11% crit, 43%/50% status — a strong status beam, and the detonation is a meaningful AoE burst.',
          'Do not manually reload — fire to empty and let the explosion trigger automatically.',
        ]},
        { heading: 'Interactions', points: [
          'In dense waves, beam-until-empty then detonate is a rhythm that both damages and group-clears.',
          'Coda Catabolyst raises status to 50%; the beam becomes an extremely reliable primer before the final explosion.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Infested/Pistols/InfVomitGun/InfVomitGunWep',
    ],
    note: {
      tldr: 'The Dual Toxocyst — dual Infested pistols with 37% status; each headshot kill temporarily increases fire rate.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto Infested pistols; 5% crit, 37% status — status-dominant.',
          'Headshot kills trigger a brief fire rate boost — in dense groups with consistent headshots, the boost is nearly permanent.',
        ]},
        { heading: 'Interactions', points: [
          'Status-heavy builds benefit most; Viral + Corrosive from headshot-maintained spray is effective in Corpus or Grineer content.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Infested/Pistols/InfUzi/InfUziWeapon',
    ],
    note: {
      tldr: 'The Zymos — an Infested SMG secondary with 30% status; fires bursts of Pathogen spores that linger briefly.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto-fire spore launcher; 5% crit, 30% status — status-focused.',
          'Spores land on surfaces briefly before expiring, dealing Toxin to enemies that walk into them.',
        ]},
        { heading: 'Interactions', points: [
          'The lingering spores serve as light area-denial near objectives; better than most Infested pistols as a status tool.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Infested/InfestedLich/Pistols/1999InfSporePistol/1999InfSporePistolWeapon',
    ],
    note: {
      tldr: 'Dual Coda Torxica — dual Infested Lich pistols with 25% crit and 28% status; a hybrid secondary with a Lich element.',
      sections: [
        { heading: 'Mechanics', points: [
          'Dual Infested pistols from the Infested Lich system; 25% crit and 28% status support hybrid builds.',
          'Lich progenitor element adds a third damage type.',
        ]},
        { heading: 'Interactions', points: [
          'The balanced hybrid stats make it flexible; the Lich element allows strong elemental combinations.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Secondaries — throwing weapons ─────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/ThrowingWeapons/Kunai',
      '/Lotus/Weapons/MK1Series/MK1Kunai',
      '/Lotus/Weapons/Tenno/ThrowingWeapons/StalkerKunai',
    ],
    note: {
      tldr: 'Kunai — thrown knives with silent flight; Despair (Stalker variant) has 16% crit and 16% status for a silent precision secondary.',
      sections: [
        { heading: 'Mechanics', points: [
          'Thrown projectile secondary — each throw fires a knife silently; effective against unalerted enemies.',
          'Kunai: 8% crit, 8% status — low stats. Despair (Stalker drop): 16% crit, 16% status.',
          'All Kunai variants are silent; they do not alert nearby enemies.',
        ]},
        { heading: 'Interactions', points: [
          'Despair is the build target for players wanting a silent throwing-knife secondary; acquirable from Stalker drops.',
          'Silent throwing weapons work well alongside the Shade sentinel or in stealth-build runs.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/ThrowingWeapons/TennoStars',
      '/Lotus/Weapons/Tenno/ThrowingWeapons/PrimeThrowingStar/PrimeHikou',
    ],
    note: {
      tldr: 'The Hikou — thrown shurikens; Hikou Prime raises status to 28% for an elemental proc throwing weapon.',
      sections: [
        { heading: 'Mechanics', points: [
          'Thrown shurikens; very fast fire rate but low damage per throw.',
          'Hikou: 4% crit, 10% status. Hikou Prime: 6% crit, 28% status.',
        ]},
        { heading: 'Interactions', points: [
          'Hikou Prime with 28% status becomes a status primer; the fast throw rate stacks elemental procs quickly.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/ThrowingWeapons/LiDagger/LiDagger',
      '/Lotus/Weapons/Tenno/ThrowingWeapons/PrimeLiDagger/PrimeLiDagger',
    ],
    note: {
      tldr: 'The Spira — a precision thrown dagger with 30% crit; Spira Prime keeps 30% crit and adds 14% status.',
      sections: [
        { heading: 'Mechanics', points: [
          'Thrown daggers — faster than kunai, slightly different arc.',
          'Spira: 30% crit, 8% status. Spira Prime: 30% crit, 14% status — pure crit platform.',
        ]},
        { heading: 'Interactions', points: [
          'Spira Prime with 30% crit is the go-to crit throwing secondary; Hunter Munitions builds work on throwing weapons.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/ThrowingWeapons/GlassKunai/GlassKunaiWeapon',
    ],
    note: {
      tldr: "The Fusilai — Gara's glass-shard secondary; thrown shards shatter on impact, dealing Slash and applying bleed.",
      sections: [
        { heading: 'Mechanics', points: [
          'Thrown glass shards; 23% crit, 29% status — a strong hybrid throwing weapon.',
          'Innate Slash damage means consistent bleed proc stacking alongside elemental mods.',
        ]},
        { heading: 'Interactions', points: [
          "Gara's signature — gains bonus stats in her hands.",
          'Both crit and status are high enough for hybrid builds; one of the better throwing secondaries for raw stats.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/ThrowingWeapons/U18ThrowingKnives/U18throwingknives',
    ],
    note: {
      tldr: 'The Talons — thrown knives that deploy razor loops on impact, creating a zone that damages enemies passing through.',
      sections: [
        { heading: 'Mechanics', points: [
          '22% crit, 26% status — solid hybrid stats.',
          'On impact, the Talons create a lingering razor-blade loop at the target location that damages enemies within.',
          'Area-denial secondary — the loops make it useful for coverage of narrow passages or objectives.',
        ]},
        { heading: 'Interactions', points: [
          'Status procs apply inside the loop zone; place Talons at choke points for sustained proc coverage.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/ThrowingWeapons/TnOraxiaFlechette/TnOraxiaFlechette',
    ],
    note: {
      tldr: 'The Scyotid — a 1999 Technocyte Coda throwing weapon; flechettes that apply Infested status procs on hit.',
      sections: [
        { heading: 'Mechanics', points: [
          'Thrown flechettes (small aerodynamic darts); 24% crit, 18% status.',
          'From the 1999 Coda content pool.',
        ]},
        { heading: 'Interactions', points: [
          'A competent throwing secondary from 1999 content; both stats support hybrid modding.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Secondaries — 1999 faction ─────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Lasria/LasSilencedPistol/LasSilencedPistolWeapon',
    ],
    note: {
      tldr: 'The Vesper 77 — a Lasrian silenced pistol; 24% crit and 26% status in a compact, silent semi-auto form.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto hitscan, silent — does not alert unaware enemies.',
          '24% crit, 26% status — a hybrid silent secondary with good stats for its class.',
        ]},
        { heading: 'Interactions', points: [
          'One of the few silent secondary options with competitive hybrid stats; pairs well with stealth builds or the Baza primary.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Lasria/LasGooPistol/LasGooPistolPlayerWeapon',
    ],
    note: {
      tldr: 'The Efv-8 Mars — a Lasrian pistol that fires viscous projectiles; 27% crit and 17% status.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto pistol with slightly arcing bolts; 27% crit, 17% status — crit-leaning.',
        ]},
        { heading: 'Interactions', points: [
          'A 1999 content secondary with solid crit for Hunter Munitions builds.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/1999EntHybridPistolWeapon/1999EntHybridPistolWeapon',
    ],
    note: {
      tldr: 'The Riot-848 — an Entarchy hybrid pistol from 1999; 26% crit and 26% status for an evenly balanced secondary.',
      sections: [
        { heading: 'Mechanics', points: [
          'Balanced hybrid stats (26% crit, 26% status) in a semi-auto form; from the 1999 Entarchy faction.',
        ]},
        { heading: 'Interactions', points: [
          'The even split means both crit and status builds work without compromising; one of the more flexible 1999 secondaries.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Secondaries — miscellaneous / remaining ────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Grineer/Pistols/GrnQueenGuardDualPistol/GrnQueenGuardDualPistols',
    ],
    note: {
      tldr: 'Twin Rogga — Grineer Queen Guard dual shotgun pistols; very high damage per shot, very small magazine.',
      sections: [
        { heading: 'Mechanics', points: [
          'Dual heavy hand shotguns; low crit (10%), low status (7%), but high per-pellet damage.',
          'Small magazine (2 shots) means you are constantly reloading in extended engagements.',
        ]},
        { heading: 'Interactions', points: [
          'Best used for burst close-range damage; reload after every two shots makes sustained fire impractical.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Pistols/GrnOrokinPistol/GrnOrokinPistol',
    ],
    note: {
      tldr: 'The Sagek Prime — a Grineer Orokin-era semi-auto pistol with exceptional 30% crit; pure crit platform.',
      sections: [
        { heading: 'Mechanics', points: [
          '30% crit, 1% status — one of the highest base crits on a secondary pistol; not a status weapon at all.',
          'Semi-auto with high per-shot damage.',
        ]},
        { heading: 'Interactions', points: [
          'Hunter Munitions with 30% crit makes it a straightforward bleed-stack machine in a pistol-slot form.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Pistols/CrpLaserPistol',
      '/Lotus/Weapons/Corpus/Pistols/CorpusModularPistol/Vandal/CrpLaserPistolVandal',
    ],
    note: {
      tldr: 'The Spectra — a Corpus laser pistol beam; Spectra Vandal raises crit to 20% and status to 28% for a hybrid beam secondary.',
      sections: [
        { heading: 'Mechanics', points: [
          'Continuous beam secondary; very precise, applies damage per tick.',
          'Spectra: 14% crit, 22% status. Spectra Vandal: 20% crit, 28% status.',
        ]},
        { heading: 'Interactions', points: [
          'Spectra Vandal is the competitive version; 20%/28% supports hybrid tick-damage builds.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/ConclaveLeverPistol/ConclaveLeverPistol',
      '/Lotus/Weapons/Tenno/Pistols/PrimeZylok/ZylokPrimePistol',
    ],
    note: {
      tldr: 'The Zylok — a Conclave-origin lever-action pistol; Zylok Prime reaches 12% crit and 36% status for a status secondary.',
      sections: [
        { heading: 'Mechanics', points: [
          'Lever-action semi-auto pistol; slow fire rhythm, higher per-shot damage.',
          'Zylok: 8% crit, 26% status. Zylok Prime: 12% crit, 36% status.',
        ]},
        { heading: 'Interactions', points: [
          'Zylok Prime is a useful status secondary for elemental proc builds; the slow fire rate is compensated by high status per shot.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/TigrisRedeemerSetPistol/TnoBladedPistols',
    ],
    note: {
      tldr: 'The Akjagara — dual bladed pistols; paired with the Broken Scepter and Redeemer set, 6% crit and 28% status.',
      sections: [
        { heading: 'Mechanics', points: [
          'Part of a set with the Broken Scepter Melee and Tigris / Redeemer; they share a set bonus when used together.',
          '6% crit, 28% status — status-leaning.',
        ]},
        { heading: 'Interactions', points: [
          'The set bonus improves performance when paired with the other set weapons; individually competitive but the set synergy is the draw.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/HarlequinGun/HarlequinPistols',
    ],
    note: {
      tldr: 'The Akzani — Mirage Prime signature dual pistols; high fire rate, 14% crit and 14% status.',
      sections: [
        { heading: 'Mechanics', points: [
          'Dual auto pistols with a fast fire rate; 14% crit, 14% status — balanced but not exceptional.',
        ]},
        { heading: 'Interactions', points: [
          "Mirage's signature — gains a bonus in her hands; her Hall of Mirrors clones duplicate the fire, amplifying total output significantly.",
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Pistols/SundialPistol/SundialPistol',
    ],
    note: {
      tldr: 'The Azima — a Daily Tribute auto pistol that deploys a spinning turret from the magazine on alt-fire.',
      sections: [
        { heading: 'Mechanics', points: [
          'Auto pistol; 16% crit, 16% status. Alt-fire deploys a ground turret from the pistol body that auto-fires at enemies for several seconds.',
          'Reloading cancels the deployed turret.',
        ]},
        { heading: 'Interactions', points: [
          'Deploy the turret, then swap to a primary — you effectively get a free auto-firing secondary while using your primary.',
          'Obtainable only from Daily Tribute milestones.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Syndicates/ArbitersOfHexis/Pistols/AHAkbolto',
      '/Lotus/Weapons/Tenno/Pistol/CrossBow',
      '/Lotus/Weapons/Tenno/Akimbo/AkimboBolto',
      '/Lotus/Weapons/Tenno/Pistols/PrimeAkbolto/PrimeAkBoltoWeapon',
    ],
    note: {
      tldr: 'The Bolto — a Tenno bolt-firing pistol; Akbolto Prime reaches 36% crit for an extremely high-crit throwing-bolt secondary.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto bolt pistol; bolts travel as projectiles, not hitscan — slight travel time.',
          'Bolto: 16% crit, 2% status. Akbolto Prime (dual): 36% crit, 14% status.',
          'Telos Akbolto (Arbiters of Hexis) adds the AH Justice proc and higher status (29%) at the cost of some crit.',
        ]},
        { heading: 'Interactions', points: [
          'Akbolto Prime at 36% crit is a strong Hunter Munitions secondary; one of the highest crit bolts available.',
          'Telos Akbolto is a dual-purpose status+syndicate proc option for players aligned with Arbiters of Hexis.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Pistols/GrineerCrossbow/GrineerGooGun',
    ],
    note: {
      tldr: 'The Stug — a Grineer goo pistol; fires goo globs that stick to surfaces and detonate after a delay.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires goo blobs that adhere to surfaces; after a short delay each blob detonates.',
          '5% crit, 0% status — extremely low stats; the goo mechanic is the only identity.',
        ]},
        { heading: 'Interactions', points: [
          'Primarily a mastery weapon; the delayed goo detonations have a small AoE but the damage is negligible at any meaningful content level.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/BoardExec/Secondary/CrpBEDiplos/CrpBriefcaseAkimboPistol',
    ],
    note: {
      tldr: 'The Tenet Diplos — Sister dual-akimbo pistols with 36% crit; a high-crit dual-auto secondary with a Sister element.',
      sections: [
        { heading: 'Mechanics', points: [
          'Dual pistols with 36% crit and 14% status — crit-dominant; one of the highest crit akimbo secondaries.',
          'Sister progenitor element baked in.',
        ]},
        { heading: 'Interactions', points: [
          'Hunter Munitions on dual pistols with 36% crit delivers extremely consistent bleed-stacking output.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/BoardExec/Secondary/CrpBEIgniter/CrpIgniterPistol',
    ],
    note: {
      tldr: 'The Tenet Spirex — a Sister pistol that fires accelerating energy bolts; 26% crit and 40% status.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto bolts that gain speed the longer they travel — most effective at medium-to-long range.',
          '26% crit, 40% status — a strong hybrid secondary with high status.',
          'Sister progenitor element baked in.',
        ]},
        { heading: 'Interactions', points: [
          'At 40% status, Viral priming is fast even in single shots; the accelerating bolt means standing back is advantageous.',
        ]},
      ],
      status: 'beta',
    },
  },


  // ── Melee — 1h swords ──────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/LongSword/EtherSword',
      '/Lotus/Weapons/Tenno/Melee/DualShortSword/DualShortSword',
      '/Lotus/Weapons/Tenno/Melee/DualShortSword/DualEtherSword',
      '/Lotus/Weapons/Tenno/Melee/DualShortSword/DualHeatSwords',
    ],
    note: {
      tldr: 'Ether Sword / Dual Skana / Dual Ether / Dual Heat Swords — foundational elemental swords; low stats but introduce the elemental melee identity.',
      sections: [
        { heading: 'Mechanics', points: [
          'Standard melee swords with innate elemental damage types (Heat, Ether/Electricity); damage type is their core identity.',
          'Low-to-moderate crit and status; the elemental type provides a free proc on every hit without mod investment.',
        ]},
        { heading: 'Interactions', points: [
          'Primarily mastery weapons; the innate elemental damage is interesting thematically but the stat lines are not competitive.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/CronusSword/CronusLongSword',
      '/Lotus/Weapons/Tenno/Melee/CronusSword/PrimeCronusLongSword',
    ],
    note: {
      tldr: 'Cronus / Dakra Prime — a Tenno 1h sword; Dakra Prime at 36% crit is one of the highest crit single swords.',
      sections: [
        { heading: 'Mechanics', points: [
          'Standard 1h sword stance combos; low crit base. Dakra Prime jumps to 36% crit, 18% status.',
          '36% crit on a 1h sword makes it a strong Hunter Munitions platform for bleed stacking on fast combos.',
        ]},
        { heading: 'Interactions', points: [
          'The speed of 1h sword stances means Dakra Prime applies bleed procs very quickly at full combo.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/HeatSword/HeatLongSword',
      '/Lotus/Weapons/Tenno/Melee/Swords/JawSword/JawLongSword',
      '/Lotus/Weapons/Tenno/Melee/Swords/DarkSword/DarkLongSword',
    ],
    note: {
      tldr: 'Heat Sword / Jaw Sword / Dark Sword — elemental 1h swords with innate damage types; mastery weapons with niche thematic builds.',
      sections: [
        { heading: 'Mechanics', points: [
          'Heat Sword: innate Heat, 5% crit, 20% status. Jaw Sword: innate Slash/Puncture mix, 8% crit, 16% status.',
          'Dark Sword: 5% crit, 40% status — the highest status of the basic 1h swords; entirely a status platform.',
          'Dark Split-Sword is the dual-wield variant with a toggle between 1h and 2h modes.',
        ]},
        { heading: 'Interactions', points: [
          'Dark Sword at 40% status procs reliably but damage is too low for endgame; a mastery item.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/DarkSword/DarkSwordDaggerHybridWeapon',
    ],
    note: {
      tldr: 'Dark Split-Sword — toggles between a single 1h mode and dual-dagger mode; unique weapon that uses both stance categories.',
      sections: [
        { heading: 'Mechanics', points: [
          'Alt-fire toggles between single great-sword stance (heavy hits) and dual-dagger stance (fast combos).',
          '0% crit, 10% status — stats are negligible; this is a gameplay-mechanic curiosity item.',
        ]},
        { heading: 'Interactions', points: [
          'The stance-toggle is interesting mechanically but the damage numbers mean it cannot compete with dedicated weapons in either mode.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/KrisDagger/KrisDagger',
      '/Lotus/Weapons/Tenno/Melee/Swords/PrimeKaryst/PrimeKrisDagger',
    ],
    note: {
      tldr: 'Karyst / Karyst Prime — a Tenno ceremonial dagger; Karyst Prime at 24% crit and 30% status is a solid hybrid dagger.',
      sections: [
        { heading: 'Mechanics', points: [
          'Single dagger stance; fast attack animations, short range.',
          'Karyst: 10% crit, 26% status. Karyst Prime: 24% crit, 30% status — both stats strong enough for hybrid builds.',
        ]},
        { heading: 'Interactions', points: [
          'Dagger stances feature finisher setups; positioning enemies for finishers amplifies the dagger damage significantly.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/KatanaAndWakizashi/LowKatana',
      '/Lotus/Weapons/Tenno/Melee/Swords/KatanaAndWakizashi/Dex2023Nikana/Dex2023Nikana',
    ],
    note: {
      tldr: 'Dragon Nikana / Dex Nikana — Tenno katana weapons with graceful stance combos; Dragon Nikana at 22%/22% is a balanced hybrid.',
      sections: [
        { heading: 'Mechanics', points: [
          'Dragon Nikana: 22% crit, 22% status — even hybrid split.',
          'Dex Nikana (anniversary gift): 24% crit, 18% status — slightly crit-leaning.',
          'Nikana stances (Dragon/Tranquil Cleave) feature flowing aerial and ground combos; fast attack speed.',
        ]},
        { heading: 'Interactions', points: [
          'Both weapons benefit from the Nikana stance library — pick the stance that fits your playstyle (Tranquil Cleave for range, Dragon Nikana stance for mobility).',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/KatanaAndWakizashi/Nikana',
      '/Lotus/Weapons/Tenno/Melee/Swords/KatanaAndWakizashi/NikanaPrime',
    ],
    note: {
      tldr: 'Nikana / Nikana Prime — the core Tenno katana; Nikana Prime at 28%/28% is a high-tier hybrid melee with strong combo potential.',
      sections: [
        { heading: 'Mechanics', points: [
          'Standard Nikana: 16% crit, 16% status. Nikana Prime: 28% crit, 28% status.',
          'Uses the Nikana stance category with the same graceful mobility combos as Dragon Nikana.',
          'Long range for a katana-class weapon; the Prime version is one of the better hybrid katanas available.',
        ]},
        { heading: 'Interactions', points: [
          'Nikana Prime with Blood Rush + Condition Overload reaches very high damage at full combo; a go-to melee for players who enjoy katana play.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Melee/Swords/ExcaliburSword/ExcaliburUmbraKatana'],
    note: { tldr: '', sections: [], status: 'beta' },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Melee/Swords/ExcaliburSword/SkiajatiKatana'],
    note: {
      tldr: "Skiajati — Excalibur Umbra's signature nikana; slide attacks turn the player invisible briefly.",
      sections: [
        { heading: 'Mechanics', points: [
          'Nikana-class weapon with 19% crit and 30% status.',
          "Slide attacks grant a brief stealth window — enemies nearby lose their target lock for a moment after a slide hit.",
        ]},
        { heading: 'Interactions', points: [
          "Excalibur Umbra's signature — gains bonus stats in his hands.",
          'The slide-attack invisibility is a minor utility feature; the weapon stands on its own as a hybrid nikana without relying on the gimmick.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/Tatsu/TatsuKatana',
      '/Lotus/Weapons/Tenno/Melee/Swords/PrimeTatsu/PrimeTatsuWeapon',
    ],
    note: {
      tldr: "Tatsu / Tatsu Prime — Revenant's signature dual nikana; ground slams spread Overguard to allies.",
      sections: [
        { heading: 'Mechanics', points: [
          'Dual-nikana stance (wielded as a pair); 16%/22% crit, 28%/30% status.',
          'Slam attacks create an Overguard burst that spreads to nearby allies — effectively a passive support mechanic in melee range.',
          'Tatsu Prime significantly improves crit (22%) and adds higher Overguard output.',
        ]},
        { heading: 'Interactions', points: [
          "Revenant's signature — gains bonus stats in his hands.",
          'The Overguard slam is most useful in group play where allies can benefit; in solo play it acts as an extra buffer.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/TnoRapier/TnoRapier',
      '/Lotus/Weapons/Tenno/Melee/Swords/PRapier/DestrezaPrime',
    ],
    note: {
      tldr: 'Destreza / Destreza Prime — Tenno rapier; lunge-based combos and very high crit (28%/32%) for fast thrust attacks.',
      sections: [
        { heading: 'Mechanics', points: [
          'Rapier stance features lunge attacks with tight forward movement; different from standard sword combos.',
          'Destreza: 28% crit, 14% status. Destreza Prime: 32% crit, 20% status.',
          'High attack speed and crit for a 1h melee makes it one of the better crit melee weapons in its tier.',
        ]},
        { heading: 'Interactions', points: [
          'Rapier lunge hits single targets precisely; effective for boss damage where accuracy matters.',
          'At 32% crit with Blood Rush the Destreza Prime reaches reliable orange/red crits at high combo.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/StalkerTwo/StalkerTwoSmallSword',
    ],
    note: {
      tldr: "Broken War — one half of the War greatsword, dropped from the Second Dream quest; 35% crit makes it a remarkable 1h sword.",
      sections: [
        { heading: 'Mechanics', points: [
          '35% crit, 20% status — extremely high crit for a 1h sword; one of the best stat lines in the entire 1h sword category.',
          'Obtained during The Second Dream quest as a quest reward, not craftable separately.',
          'Uses 1h sword stances; the Broken War tag is lore-flavored (a fragment of the War greatsword).',
        ]},
        { heading: 'Interactions', points: [
          'At 35% crit, Blood Rush at high combo frequently produces red crits — a fast, high-damage crit machine in a small sword form.',
          'The War (full greatsword) has 26% crit — notably lower; Broken War is the surprising overperformer of the pair.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — heavy blades / great swords ───────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/GreatSword/TennoGreatSword',
      '/Lotus/Weapons/Tenno/Melee/Swords/PrimeGalatine/PrimeGalatine',
    ],
    note: {
      tldr: 'Galatine / Galatine Prime — the Tenno great sword; wide sweeping arcs hit multiple targets per combo; Prime at 26%/26% is a strong hybrid.',
      sections: [
        { heading: 'Mechanics', points: [
          'Heavy Blade stance with wide horizontal sweeps; one swing covers a large arc and hits multiple enemies.',
          'Galatine: 10% crit, 20% status. Galatine Prime: 26% crit, 26% status — even hybrid split.',
          'High base damage per hit and wide hitbox make it effective for crowd clearing.',
        ]},
        { heading: 'Interactions', points: [
          'Galatine Prime with Condition Overload is a high-damage crowd melee; the 26%/26% supports both crit and status scaling.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/GreatSword/GreatSword',
      '/Lotus/Weapons/Tenno/Melee/Swords/PrimeGram/PrimeGram',
    ],
    note: {
      tldr: 'Gram / Gram Prime — a Tenno heavy great sword; Gram Prime at 32%/32% is one of the best-balanced heavy blades available.',
      sections: [
        { heading: 'Mechanics', points: [
          'Gram: 15% crit, 15% status — base version is very basic. Gram Prime: 32% crit, 32% status — excellent even hybrid.',
          'Heavy Blade moveset; wide sweeping attacks that cover large areas.',
        ]},
        { heading: 'Interactions', points: [
          'Gram Prime at 32%/32% is competitive in Steel Path; the even stats let you build for pure crit, pure status, or hybrid equally well.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Melee/Swords/StalkerSword/StalkerSwordWeapon'],
    note: {
      tldr: "War — the Stalker's great sword; 26%/26% with innate Shadow damage. Obtained as a Stalker drop.",
      sections: [
        { heading: 'Mechanics', points: [
          '26% crit, 26% status; heavy blade moveset. Primary drop from Second Dream Stalker encounters.',
          'The signature weapon of the Stalker; higher damage per hit than most great swords at its tier.',
        ]},
        { heading: 'Interactions', points: [
          'Drop chance from the Stalker is low; craft requires Stalker blueprint + Forma + resources. A prestige melee in the early-to-mid game.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Orokin/Melee/OrokinSword/OrokinHeavySword'],
    note: {
      tldr: 'Paracesis — an Orokin-slaying greatsword; gains permanent damage stacks each forma applied, scaling with investment.',
      sections: [
        { heading: 'Mechanics', points: [
          '31% crit, 22% status; heavy blade moveset with solid base damage.',
          'Each Forma applied to the Paracesis permanently increases its base damage by 5% — up to 30% extra at 6 Forma.',
          'Innate Sentient resistance bypass — deals full damage to Sentients regardless of their adaptation aura.',
        ]},
        { heading: 'Interactions', points: [
          'The Forma-stacking mechanic rewards heavy investment; a 6-Forma Paracesis is significantly stronger than a 0-Forma one.',
          'Required for New War quest progression — you will build this for story reasons; the damage scaling is a bonus.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/Masseter/MasseterWeapon',
      '/Lotus/Weapons/Tenno/Melee/Swords/PrimeMasseter/PrimeMasseterWeapon',
    ],
    note: {
      tldr: 'Masseter / Masseter Prime — a Tenno heavy sword; Prime reaches 26% crit and 36% status for a status-leaning hybrid.',
      sections: [
        { heading: 'Mechanics', points: [
          'Masseter: 24% crit, 28% status. Masseter Prime: 26% crit, 36% status.',
          'Heavy blade moveset; the Prime version is status-dominant making Viral or Corrosive stacking very fast.',
        ]},
        { heading: 'Interactions', points: [
          'Masseter Prime with Condition Overload lets status procs snowball into high damage rapidly.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Melee/Swords/Pennant/PennantSword'],
    note: {
      tldr: 'Pennant — a heavy blade with a passive damage multiplier that increases with each kill during a heavy attack kill chain.',
      sections: [
        { heading: 'Mechanics', points: [
          '32% crit, 10% status — crit-dominant heavy blade.',
          'Kills with heavy attacks temporarily increase the damage of subsequent heavy attacks, building a streak multiplier.',
          'The streak decays quickly if you stop using heavy attacks; the loop rewards sustained heavy-attack focus.',
        ]},
        { heading: 'Interactions', points: [
          'Heavy attack builds (Zenurik energy or Gladiator set for combo) can sustain the kill-streak effectively in dense missions.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/Sarofang/SarofangWeapon',
      '/Lotus/Weapons/Tenno/Melee/Swords/PrimeSarofang/PrimeSarofangWeapon',
    ],
    note: {
      tldr: 'Sarofang / Sarofang Prime — a Tenno 1h sword with a blade-charged heavy slam that deals AoE damage.',
      sections: [
        { heading: 'Mechanics', points: [
          'Sarofang: 20% crit, 20% status. Sarofang Prime: 30% crit, 30% status.',
          'Heavy attacks charge energy along the blade that releases as a radial AoE on ground slam.',
        ]},
        { heading: 'Interactions', points: [
          'Sarofang Prime at 30%/30% is a strong even hybrid; the heavy-attack slam provides group-clear utility.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Melee/Swords/VitricaGreatSword/VitricaWeapon'],
    note: {
      tldr: "Vitrica — Glassmaker's great sword; heavy attacks create glass shards that linger and damage enemies walking through them.",
      sections: [
        { heading: 'Mechanics', points: [
          '23% crit, 33% status; heavy blade moveset.',
          'Heavy attack slam shatters glass shards across the area; enemies walking through the shards take repeated Slash damage.',
        ]},
        { heading: 'Interactions', points: [
          'The shard field is area-denial — effective in narrow corridors or placed at a defense target choke point.',
          'Status from the shards can stack Slash bleeds on multiple enemies simultaneously.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — dual swords ────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/QuillSword/QuillDualSwords',
      '/Lotus/Weapons/Tenno/Melee/Swords/PrimeDualKeres/PrimeDualKeresWeapon',
    ],
    note: {
      tldr: "Dual Keres / Dual Keres Prime — Wisp's dual scalpel swords; Prime reaches 32% crit and 24% status.",
      sections: [
        { heading: 'Mechanics', points: [
          'Dual sword stance; very fast attack speed.',
          'Dual Keres: 28% crit, 14% status. Dual Keres Prime: 32% crit, 24% status.',
        ]},
        { heading: 'Interactions', points: [
          "Wisp's signature — gains bonus stats in her hands.",
          'At 32% crit with fast attack speed, Blood Rush builds reach consistent red crits quickly.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/DualKamas/DualKamas',
      '/Lotus/Weapons/Tenno/Melee/PrimeDualKamas/PrimeDualKamas',
    ],
    note: {
      tldr: 'Dual Kamas / Dual Kamas Prime — twin curved blades; Prime at 20%/25% is a hybrid dual-sword with good crowd-sweep coverage.',
      sections: [
        { heading: 'Mechanics', points: [
          'Dual Kamas: 10% crit, 15% status. Dual Kamas Prime: 20% crit, 25% status.',
          'Dual sword stances apply wide horizontal arcs; covers crowds effectively.',
        ]},
        { heading: 'Interactions', points: [
          'Dual Kamas Prime is a solid mid-tier dual melee with enough stats to run either crit or status builds.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/OkinaPairedKarambit/OkinaWeapon',
      '/Lotus/Weapons/Tenno/Melee/Swords/PrimeOkina/PrimeOkinaWeapon',
    ],
    note: {
      tldr: 'Okina / Okina Prime — paired karambits; very fast attack speed with a focus on spin and whirling attacks.',
      sections: [
        { heading: 'Mechanics', points: [
          'Okina: 16% crit, 20% status. Okina Prime: 30% crit, 24% status.',
          'Karambit stances feature circular spinning attacks; extremely fast attack cadence.',
        ]},
        { heading: 'Interactions', points: [
          'Okina Prime at 30% crit with fast attacks builds combo quickly; Blood Rush accelerates to reliable crits.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/NamiSkyla/NamiSkyla',
      '/Lotus/Weapons/Tenno/Melee/Swords/PrimeNamiSkyla/PrimeNamiSkyla',
      '/Lotus/Weapons/Tenno/Melee/Swords/NamiSolo/NamiSolo',
    ],
    note: {
      tldr: 'Nami Skyla / Nami Skyla Prime — Tenno dual swords with a paired single version (Nami Solo); Prime at 22%/34% is a strong status dual weapon.',
      sections: [
        { heading: 'Mechanics', points: [
          'Dual sword stances; Nami Skyla Prime: 22% crit, 34% status — status-dominant.',
          'Nami Solo is the single-sword variant with the same blade design.',
        ]},
        { heading: 'Interactions', points: [
          'Nami Skyla Prime with Condition Overload and Viral stacking performs well; the 34% status procs reliably on every combo.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/PangalinSword/PangalinSwordWeapon',
      '/Lotus/Weapons/Tenno/Melee/Swords/PrimePangolin/PrimePangolinWeapon',
    ],
    note: {
      tldr: 'Pangolin Sword / Pangolin Prime — single-handed curved sword; Prime at 26%/30% is a solid hybrid 1h sword.',
      sections: [
        { heading: 'Mechanics', points: [
          'Pangolin Sword: 8% crit, 22% status. Pangolin Prime: 26% crit, 30% status.',
          'Uses the single-sword stance category.',
        ]},
        { heading: 'Interactions', points: [
          'Pangolin Prime is a reliable hybrid single-sword; neither crit nor status is dominant, giving build flexibility.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Melee/Swords/TnDagathBladeWhip/TnDagathBladeWhip'],
    note: {
      tldr: "Dorrclave — Dagath's signature blade-whip hybrid; functions as a 1h sword but the combo animations lash with extended whip reach.",
      sections: [
        { heading: 'Mechanics', points: [
          '26% crit, 24% status — hybrid stats on a whip-sword.',
          "Visually whips on some combo animations, giving it longer reach than a standard 1h sword.",
        ]},
        { heading: 'Interactions', points: [
          "Dagath's signature — gains bonus stats in her hands; her Death Scythe kit synergizes with rapid melee.",
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/ThreeLeaf/ThreeLeaf',
    ],
    note: {
      tldr: 'Endura — a Tenno single sword with 10% crit and 36% status; focused on elemental status proc stacking.',
      sections: [
        { heading: 'Mechanics', points: [
          '10% crit, 36% status — one of the higher status single swords; elemental proc-focused.',
        ]},
        { heading: 'Interactions', points: [
          'With 36% status and Condition Overload, Endura can stack multiple procs quickly for strong scaling damage.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Weapons/Tenno/Melee/Swords/Mios/MiosBladeWhip'],
    note: {
      tldr: "Mios — Equinox's signature blade-whip; deals Slash, 19% crit, 25% status, with extended combo reach.",
      sections: [
        { heading: 'Mechanics', points: [
          'Blade-whip style with Slash-heavy damage and moderate hybrid stats.',
          "Long effective range on combos; Equinox's signature gains bonus in her hands.",
        ]},
        { heading: 'Interactions', points: [
          'The Slash damage type naturally generates bleed procs; pairs well with Condition Overload or Hunter Munitions-style bleed stacking.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/DexTheSecond/DexTheSecond',
    ],
    note: {
      tldr: 'Dex Dakra — anniversary dual swords; 16% crit and 24% status, a solid early-mid dual sword from the Tenno anniversary reward.',
      sections: [
        { heading: 'Mechanics', points: [
          'Dual sword stances; 16% crit, 24% status.',
        ]},
        { heading: 'Interactions', points: [
          'Annual anniversary weapon — same acquisition window as the Dex Nikana; moderately competitive for early game.',
        ]},
      ],
      status: 'beta',
    },
  },


  // ── Melee — polearms ───────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Staff/Staff',
      '/Lotus/Weapons/Tenno/Melee/Staff/PrimeBo/PrimeBoWeapon',
      '/Lotus/Weapons/MK1Series/MK1Bo',
    ],
    note: {
      tldr: 'Bo / Bo Prime / Mk1-Bo — the Tenno staff; wide sweeping polearm combos. Bo Prime at 24%/32% is a strong status staff.',
      sections: [
        { heading: 'Mechanics', points: [
          'Staff stance moveset with long-range sweeping combos that cover wide arcs.',
          'Bo: 13% crit, 20% status. Bo Prime: 24% crit, 32% status.',
          'The Mk1-Bo is the MR0 starter staff — statistically the weakest version.',
        ]},
        { heading: 'Interactions', points: [
          'Bo Prime is a competitive status staff; the long range and 32% status let you Viral-prime clustered groups effectively.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Staff/GrnStaff',
      '/Lotus/Weapons/Tenno/Melee/Staff/SingleStaff',
      '/Lotus/Weapons/Tenno/Melee/Staff/Pupacyst/PupacystStaff',
    ],
    note: {
      tldr: 'Amphis / Cadus / Pupacyst — single-ended staves with different elemental identities; moderate stats, all use the staff stance.',
      sections: [
        { heading: 'Mechanics', points: [
          'Amphis: 13% crit, 21% status — innate Electricity. Cadus: 15% crit, 25% status — innate Toxin.',
          'Pupacyst: 13% crit, 27% status — Infested staff from Cetus Bounty; innate Toxin with a unique head design.',
          'All use staff stances.',
        ]},
        { heading: 'Interactions', points: [
          'Cadus and Pupacyst are the more useful options for status builds; the innate elemental types let you reach combination procs faster.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Staff/Tipedo/Tipedo',
      '/Lotus/Weapons/Tenno/Melee/Staff/PrimeTipedo/PrimeTipedoWeapon',
    ],
    note: {
      tldr: 'Tipedo / Tipedo Prime — a Tenno spinning staff; faster attack speed than standard staves, 20%/24% crit and 20%/24% status.',
      sections: [
        { heading: 'Mechanics', points: [
          'Uses both staff and polearm stances; higher attack speed than standard staves.',
          'Tipedo: 20% crit, 20% status. Tipedo Prime: 24% crit, 24% status.',
        ]},
        { heading: 'Interactions', points: [
          'Tipedo Prime is a reliable hybrid melee with fast attack speed; the balanced stats work in either build direction.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Polearms/TnGuandaoPolearm/TnGuandaoPolearmWeapon',
      '/Lotus/Weapons/Tenno/Melee/Polearms/PrimeGuandao/PrimeGuandaoWeapon',
    ],
    note: {
      tldr: 'Guandao / Guandao Prime — the longest-range polearm; sweeping blade attacks that hit enemies at exceptional range. Prime: 32%/20%.',
      sections: [
        { heading: 'Mechanics', points: [
          'Polearm stance with very long reach — among the longest effective range melee options in the game.',
          'Guandao: 28% crit, 4% status. Guandao Prime: 32% crit, 20% status.',
          'High crit leans toward crit builds; the Prime version adds meaningful status for hybrid play.',
        ]},
        { heading: 'Interactions', points: [
          'The extreme range means you can hit enemies from outside their melee retaliation range on some attacks.',
          'Guandao Prime is a strong crit polearm; at 32% crit Blood Rush reaches reliable orange crits very quickly.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Polearms/OrthosPoleArm/OrthosPoleArmWeapon',
      '/Lotus/Weapons/Tenno/Melee/Polearms/OrthosPrimeWeapon/OrthosPrimeWeapon',
    ],
    note: {
      tldr: 'Orthos / Orthos Prime — a double-ended polearm; spins hit both sides simultaneously. Prime at 24%/36% is status-dominant.',
      sections: [
        { heading: 'Mechanics', points: [
          'Double-bladed staff — spin attacks hit in both directions. Polearm stances combine with staff stances.',
          'Orthos: 6% crit, 18% status. Orthos Prime: 24% crit, 36% status.',
          'The two-sided hitbox means standing in the center of a group lets you hit enemies on both sides with a spin.',
        ]},
        { heading: 'Interactions', points: [
          'Orthos Prime at 36% status is a strong Condition Overload melee; the wide hit coverage on both sides makes proc stacking efficient.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Polearms/Tonbo/Tonbo',
      '/Lotus/Weapons/Grineer/Melee/GrineerHalberd/GrnHalberd',
      '/Lotus/Weapons/Tenno/Melee/Polearms/TnHalberdPolearm/TnHalberdPolearmWeapon',
    ],
    note: {
      tldr: 'Tonbo / Kesheg / Cassowar — functional polearms with innate elemental damage; moderate stats, varied faction origins.',
      sections: [
        { heading: 'Mechanics', points: [
          'Tonbo: 5% crit, 25% status — innate Electricity. Kesheg: 19% crit, 23% status — Grineer war-mace polearm.',
          'Cassowar: 6% crit, 28% status — a more modern polearm with higher status.',
          'All use the polearm stance category.',
        ]},
        { heading: 'Interactions', points: [
          'Cassowar at 28% status is the most viable of these for status proc builds; others are primarily mid-game stepping stones.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Polearms/Naginata/ShrineMaidenNaginataWeapon',
    ],
    note: {
      tldr: 'Amanata — a Tenno naginata with 24%/24% hybrid stats; graceful polearm stance with wide sweeping cuts.',
      sections: [
        { heading: 'Mechanics', points: [
          '24% crit, 24% status — evenly balanced hybrid polearm.',
          'Uses the polearm stance category with flowing naginata-style combos.',
        ]},
        { heading: 'Interactions', points: [
          'Even 24%/24% split makes modding flexible; works for crit, status, or hybrid builds without leaning too hard either way.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Melee/Polearm/Serro/SerroWeapon',
    ],
    note: {
      tldr: 'Serro — a Corpus electric polearm with innate Electricity; 8% crit, 26% status.',
      sections: [
        { heading: 'Mechanics', points: [
          'Polearm stance; innate Electricity means every hit can arc to nearby enemies via the proc.',
          '8% crit, 26% status — status is the identity; crit builds are not viable here.',
        ]},
        { heading: 'Interactions', points: [
          'The innate Electricity helps with Magnetic combos on Corpus; a niche clan-tech option for elemental polearm builds.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Melee/GrineerJetPoweredPolearm/GrineerJetPolearm',
    ],
    note: {
      tldr: 'Jat Kittag — a Grineer jet-powered war hammer used as a polearm; slam attacks create a massive knockdown AoE.',
      sections: [
        { heading: 'Mechanics', points: [
          'The Jat Kittag uses the hammer moveset with a jet-pack thruster — airborne slams create a huge knockdown radius.',
          '15% crit, 25% status — moderate hybrid. The knockdown AoE is the defining mechanic.',
          'Crafted from the Miter (rifle) as an ingredient.',
        ]},
        { heading: 'Interactions', points: [
          'The slam wave from airborne heavy attacks can knock down entire rooms; effective for disrupting dense enemy groups.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — scythes ────────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Scythe/ParisScythe/ParisScythe',
      '/Lotus/Weapons/Tenno/Melee/Scythe/EtherScytheWeapon',
      '/Lotus/Weapons/Tenno/Melee/Scythe/ReaperPrime/ReaperPrime',
    ],
    note: {
      tldr: 'Anku / Ether Reaper / Reaper Prime — the scythe family; Reaper Prime at 35%/25% is one of the best crit scythes.',
      sections: [
        { heading: 'Mechanics', points: [
          'Scythe stances use sweeping arc combos with wide lateral reach.',
          'Anku: 20% crit, 10% status. Ether Reaper: 20% crit, 20% status. Reaper Prime: 35% crit, 25% status.',
          'Reaper Prime is the endgame standout — 35% crit on a scythe is exceptional.',
        ]},
        { heading: 'Interactions', points: [
          'Reaper Prime with Blood Rush reaches near-guaranteed crits at high combo; fast combo build-up from scythe stance multi-hit combos.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Scythe/StalkerScytheWeapon',
    ],
    note: {
      tldr: "Hate — the Stalker's scythe; 30% crit and 20% status, obtained as a Stalker drop.",
      sections: [
        { heading: 'Mechanics', points: [
          '30% crit, 20% status; scythe moveset with rapid spinning sweeps.',
          'Dropped by the Stalker; requires Stalker drops + blueprint craft.',
        ]},
        { heading: 'Interactions', points: [
          'A prestige scythe that holds up well; 30% crit with fast scythe swings builds combo rapidly.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Infested/Melee/InfEmbolistScythe/InfestedScythe',
      '/Lotus/Weapons/Infested/InfestedLich/Melee/CodaCaustacyst/CodaCaustacyst',
    ],
    note: {
      tldr: 'Caustacyst / Coda Caustacyst — an Infested scythe; leaves a trail of Acid on the ground that damages enemies walking through it.',
      sections: [
        { heading: 'Mechanics', points: [
          'Caustacyst: 9% crit, 37% status. Coda Caustacyst: 19% crit, 41% status.',
          'Slide attacks and combos leave a visible corrosive trail on the floor; enemies standing in the trail take repeated Corrosive status procs.',
          'The trail persists briefly — placing it in enemy movement paths or on defense objectives creates sustained damage.',
        ]},
        { heading: 'Interactions', points: [
          'The Corrosive trail gradually strips armor via repeated procs; effective as a passive area-denial tool during Survival or Defense.',
          'Coda Caustacyst with 41% status procs the trail faster, applying Corrosion stacks more aggressively.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Melee/Scythe/GrnDrillScythe/GrnDrillScythePrimary',
    ],
    note: {
      tldr: 'Galariak Prime — a Grineer drill-scythe; 19%/32% hybrid stats with the scythe moveset.',
      sections: [
        { heading: 'Mechanics', points: [
          '19% crit, 32% status — status-leaning hybrid scythe.',
          'Uses the scythe stance category with standard sweep combos.',
        ]},
        { heading: 'Interactions', points: [
          'A mid-tier scythe; the 32% status makes Condition Overload proc stacking efficient.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Scythe/TnChoirScythe/TnChoirScytheWeapon',
    ],
    note: {
      tldr: "Harmony — Octavia's Prime signature scythe; nearby allies gain buffs when you perform combos.",
      sections: [
        { heading: 'Mechanics', points: [
          '20% crit, 36% status; scythe moveset.',
          "Executing melee combos near allies applies a tempo buff that boosts their damage briefly.",
        ]},
        { heading: 'Interactions', points: [
          "Octavia Prime's signature — plays into her rhythm-focused kit; the ally buff rewards fighting near teammates.",
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/HeavyScythe/DuviriScythe/DuviriHeavyScytheWeapon',
    ],
    note: {
      tldr: 'Hespar — the Duviri heavy scythe; broad arcing slams that hit an entire group in front at once.',
      sections: [
        { heading: 'Mechanics', points: [
          '24% crit, 28% status; heavy scythe moveset with wider sweeps than standard scythes.',
          'From Duviri content; the heavy-scythe class features slam combos with larger AoE footprints.',
        ]},
        { heading: 'Interactions', points: [
          'Solid Duviri heavy melee; the wider sweep arc makes it easier to hit spread-out groups than standard scythes.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Sentients/Venato/VenatoWeapon',
      '/Lotus/Weapons/Sentients/VenatoPrime/VenatoPrimeWeapon',
    ],
    note: {
      tldr: 'Venato / Venato Prime — a Sentient scythe; ignores Sentient resistance adaptation, essential for Eidolon content.',
      sections: [
        { heading: 'Mechanics', points: [
          'Venato: 27% crit, 24% status. Venato Prime: 34% crit, 32% status.',
          'Deals Void and Slash damage; Void bypasses Sentient adaptation, making it consistently effective against adapting enemies.',
          'Scythe moveset with fluid sweeps.',
        ]},
        { heading: 'Interactions', points: [
          'The Void-damage property means adapted Sentients cannot resist it; use it against Eidolons, Ropalolyst, and Murex fights.',
          'Venato Prime at 34%/32% is also simply a strong melee in general content; the Void damage is a bonus on top.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — glaives ────────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Glaives/LightGlaive/LightGlaiveWeapon',
      '/Lotus/Weapons/Tenno/Melee/Glaives/PrimeGlaive/PrimeGlaiveWeapon',
    ],
    note: {
      tldr: 'Glaive / Glaive Prime — the iconic Tenno thrown melee; a spinning disc that returns after being thrown; Prime: 22%/30%.',
      sections: [
        { heading: 'Mechanics', points: [
          'Melee disc that can be thrown (aim + throw) and will return to the player after hitting targets or a surface.',
          'While airborne, the disc deals melee damage with mods applied; it can hit multiple enemies on the throw path and the return.',
          'Glaive Prime: 22% crit, 30% status. The throw can be detonated mid-air by activating the throw again.',
        ]},
        { heading: 'Interactions', points: [
          'Detonating the mid-air glaive creates an AoE explosion that benefits from melee mods — a powerful burst option.',
          'Glaive Prime with Volatile Quick Return mod causes the explosion on every bounce, blanketing an area in AoE.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Glaives/Boomerang/BoomerangWeapon',
      '/Lotus/Weapons/Tenno/Melee/Glaives/PrimeKestrel/PrimeKestrelWeapon',
    ],
    note: {
      tldr: 'Kestrel / Kestrel Prime — a slower heavy glaive; Prime reaches 20%/40% status for a high-status thrown melee.',
      sections: [
        { heading: 'Mechanics', points: [
          'Kestrel: 10% crit, 10% status. Kestrel Prime: 20% crit, 40% status.',
          'The Kestrel hits harder per throw than the Glaive but travels more slowly.',
          'Same throw-and-return mechanic as the Glaive; detonation on second throw.',
        ]},
        { heading: 'Interactions', points: [
          'Kestrel Prime at 40% status makes each thrown hit extremely likely to proc; excellent for status stacking via throw chains.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Glaives/Orvius/OtherGlaiveWeapon',
    ],
    note: {
      tldr: "Orvius — Mirage's signature glaive; suspended mid-air when thrown, detonating in a large burst on command.",
      sections: [
        { heading: 'Mechanics', points: [
          '18% crit, 18% status — moderate hybrid glaive.',
          "When thrown, the Orvius suspends in mid-air rather than returning immediately. A second throw input detonates it for a large AoE.",
          'This makes it a planted detonation tool — place it then trigger when enemies walk under it.',
        ]},
        { heading: 'Interactions', points: [
          "Mirage's signature — gains bonus in her hands; Hall of Mirrors creates copies that each throw their own Orvius.",
          'The suspend mechanic allows precise placement; effective for ambush situations in narrow corridors.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Zariman/Melee/Glaive/ZarimanGlaiveWeapon',
    ],
    note: {
      tldr: 'Xoris — a Zariman glaive whose combo counter never decays; the permanent combo supports infinite Blood Rush scaling.',
      sections: [
        { heading: 'Mechanics', points: [
          '20% crit, 18% status; glaive throw-and-return mechanic.',
          'The Xoris combo counter NEVER resets on its own — it persists indefinitely between kills, between missions, and across squad sessions.',
          'This makes Blood Rush scaling trivially easy to maintain; one hit starts the stack, which then never falls off.',
        ]},
        { heading: 'Interactions', points: [
          'The permanent combo counter is the Xoris identity — it sidesteps the usual combo management entirely.',
          'Note: using the Xoris during the Orphix boss fight prevents the Orphix timer from advancing properly; DE has patched some interactions but check for current status.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Melee/Glaive/CrpGlaive/CrpGlaiveWeapon',
    ],
    note: {
      tldr: 'Falcor — a Corpus Energy glaive; 12%/34% status with Electricity damage and the throw-and-return mechanic.',
      sections: [
        { heading: 'Mechanics', points: [
          '12% crit, 34% status — status-dominant Electricity glaive.',
          'Throw-and-return mechanic identical to standard glaives; the Electricity status procs on each hit.',
        ]},
        { heading: 'Interactions', points: [
          'At 34% status each throw chains status procs reliably; useful as a status-spread tool in the glaive slot.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Infested/Melee/Glaives/PunctureGlaive/PunctureGlaiveWeapon',
    ],
    note: {
      tldr: 'Cerata — an Infested glaive with 15%/30% status and innate Toxin; each throw trails toxic gas behind it.',
      sections: [
        { heading: 'Mechanics', points: [
          '15% crit, 30% status; Toxin-infused glaive.',
          'Leaving a Toxin gas trail along the flight path; enemies the disc passes through are affected by the trail even if not directly hit.',
        ]},
        { heading: 'Interactions', points: [
          'The trail makes it effective for Toxin proc stacking against Corpus (bypasses shields).',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Melee/GrnBoomerang/GrnBoomerang',
      '/Lotus/Weapons/Grineer/Melee/GrnBoomerang/HalikarWraithWeapon',
    ],
    note: {
      tldr: 'Halikar / Halikar Wraith — a Grineer boomerang-glaive; alt-throw triggers a Disarm proc that strips weapons from enemies.',
      sections: [
        { heading: 'Mechanics', points: [
          'Throw mechanic like the standard glaive, but the Halikar has a unique Disarm ability.',
          'Throw at a target while aiming precisely at them and the hit can trigger a Disarm proc — removing their weapon temporarily.',
          'Halikar Wraith: 19% crit, 35% status.',
        ]},
        { heading: 'Interactions', points: [
          'The Disarm is most valuable against Eximus units or heavy Gunners whose weapons deal most of their threat.',
          'Wraith version is the endgame choice; the 35% status also makes it a viable proc glaive.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Infested/Melee/InfGlaive/PathocystWeapon',
      '/Lotus/Weapons/Infested/InfestedLich/Melee/CodaPathocyst/CodaPathocyst',
    ],
    note: {
      tldr: 'Pathocyst / Coda Pathocyst — an Infested glaive that plants a tendril on impact, releasing a burst of Infestation that damages nearby enemies.',
      sections: [
        { heading: 'Mechanics', points: [
          'Pathocyst: 15% crit, 30% status. Coda Pathocyst: 20% crit, 35% status.',
          'On a successful throw hit, a tentacle sprouts from the impact point and lashes nearby enemies for a burst of Infested damage.',
          'The tendril is a brief bonus AoE hit, not persistent area denial.',
        ]},
        { heading: 'Interactions', points: [
          'Coda Pathocyst with 35% status procs both the initial throw hit and the tendril burst; double status proc per throw.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Glaives/Zenistar/ZenistarWeapon',
    ],
    note: {
      tldr: 'Zenistar — a Daily Tribute glaive; hold-throw embeds in a surface and creates a persistent fire disc that damages all nearby enemies.',
      sections: [
        { heading: 'Mechanics', points: [
          '10% crit, 30% status; glaive type.',
          'Holding the throw button releases a slow-moving disc that, on impact with a surface, deploys a large rotating fire disc.',
          'The fire disc deals Heat damage to all enemies nearby and persists for a variable duration based on combo counter.',
        ]},
        { heading: 'Interactions', points: [
          'Higher combo counter = longer disc duration; keep your combo up before deploying for maximum uptime.',
          'Place it on a defense objective or doorway for nearly automatic area denial; combine with a long-range weapon to stay back.',
          'Obtainable only from Daily Tribute milestones.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — whips ──────────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Grineer/Melee/GrineerWhip/GrineerWhip',
    ],
    note: {
      tldr: 'Atterax — a Grineer bladed chain whip; extremely high crit (25%) and wide reaching combos.',
      sections: [
        { heading: 'Mechanics', points: [
          '25% crit, 20% status — hybrid, leaning crit. Whip stances have very long reach.',
          'The chain-and-blade design means the hitbox extends far in front; effective for hitting enemies beyond normal melee range.',
        ]},
        { heading: 'Interactions', points: [
          'Blood Rush + Atterax at 25% crit reaches reliable orange/red crits in whip stances that sweep groups at long range.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Whip/Lecta/LectaWhipWeapon',
      '/Lotus/Weapons/Syndicates/PerrinSequence/Melee/PSLecta',
    ],
    note: {
      tldr: 'Lecta / Secura Lecta — a Corpus energy whip with innate Electricity; Secura Lecta adds the Perrin Sequence Entropy proc.',
      sections: [
        { heading: 'Mechanics', points: [
          'Lecta: 5% crit, 25% status — innate Electricity; low crit, status-focus.',
          'Secura Lecta: 15% crit, 30% status + Perrin Sequence Entropy proc (credits on fill).',
          'Whip stances.',
        ]},
        { heading: 'Interactions', points: [
          'Secura Lecta is the endgame version; the Entropy proc passively generates Credits on the syndicate meter fill.',
          'Lecta is known for appearing in the Chains of Harrow questline.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Whip/Scoliac/ScoliacWhip',
    ],
    note: {
      tldr: "Scoliac — Nidus's signature whip; innate Toxin, 13%/29% hybrid, and slam attacks spawn Infested crawlers.",
      sections: [
        { heading: 'Mechanics', points: [
          '13% crit, 29% status; innate Toxin damage.',
          'Slam attacks on kill spawn Infested Crawlers that fight for you briefly.',
          "Nidus's signature — gains bonus stats in his hands; his Infested-summoning kit pairs naturally with the crawler spawns.",
        ]},
        { heading: 'Interactions', points: [
          'The Crawler spawns are aesthetic/minor utility; the innate Toxin and 29% status are the practical build hooks.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Melee/Whips/CrpShockGrip/CrpShockGripWhipWeapon',
    ],
    note: {
      tldr: 'Galvacord — a Corpus electric whip; 12% crit and 30% status with innate Electricity and a shocking slam.',
      sections: [
        { heading: 'Mechanics', points: [
          '12% crit, 30% status; innate Electricity. Slam attacks release a radial electric burst.',
          'Whip stances extend reach further than most melee; the electric burst on slam hits surrounding enemies.',
        ]},
        { heading: 'Interactions', points: [
          'Magnetic combo (Electricity + Cold) is very effective against Corpus shields; the innate Electricity provides the base.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Whip/Korumm/KorummWhip',
    ],
    note: {
      tldr: 'Korumm — a Tenno blade-whip; 24%/30% hybrid with the longest reach of the whip class.',
      sections: [
        { heading: 'Mechanics', points: [
          '24% crit, 30% status; one of the longer effective-range whips.',
        ]},
        { heading: 'Interactions', points: [
          'The combination of hybrid stats and long reach makes it effective for both status stacking and crit builds at range.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/StalkerMios/StalkerMiosWeapon',
      '/Lotus/Weapons/Tenno/Melee/Swords/StalkerMios/OperationsLaceraWeapon',
    ],
    note: {
      tldr: 'Lacera / Ceti Lacera — an electric whip-sword; 5%/45% status on base Lacera makes it the highest natural status melee weapon.',
      sections: [
        { heading: 'Mechanics', points: [
          'Lacera: 5% crit, 45% status — entirely a status weapon; 45% status is the highest base on any melee.',
          'Ceti Lacera: 20% crit, 40% status — the Nightwave reward variant that elevates crit to actually useful levels.',
          'Whip moveset with extended reach; innate Electricity on every hit.',
        ]},
        { heading: 'Interactions', points: [
          'Lacera at 45% status almost guarantees a proc on every hit; any elemental combination will stack procs extremely fast.',
          'Ceti Lacera brings the crit to 20% — making Blood Rush viable while retaining the extreme status rate.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Whip/Verdilac/VerdilacWeapon',
    ],
    note: {
      tldr: "Verdilac — Stalker's signature whip; hits reset the combo counter to max, trivialising Blood Rush scaling.",
      sections: [
        { heading: 'Mechanics', points: [
          '30% crit, 21% status; whip moveset.',
          "Unique mechanic: landing a hit instantly resets the combo to its MAXIMUM value rather than decaying it.",
          'This means the first hit after any break already grants the full Blood Rush bonus.',
        ]},
        { heading: 'Interactions', points: [
          'Blood Rush scaling requires maintaining high combo counter; Verdilac removes this requirement entirely — you immediately have max combo on every hit.',
          'Obtained from the Stalker Boss fight encounter in missions.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Whip/Spinnerex/SpinnerexWeapon',
    ],
    note: {
      tldr: 'Spinnerex — a Coda Technocyte whip from 1999; 16%/40% status, one of the highest status whips.',
      sections: [
        { heading: 'Mechanics', points: [
          '16% crit, 40% status — status-dominant whip from the 1999 content.',
        ]},
        { heading: 'Interactions', points: [
          'At 40% status on a whip with long reach, status procs land on every enemy in a sweep; strong for Condition Overload scaling.',
        ]},
      ],
      status: 'beta',
    },
  },


  // ── Melee — daggers ────────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Knives/Skana/SkanaKnife',
      '/Lotus/Weapons/Tenno/Melee/Knives/Fang/FangKnife',
      '/Lotus/Weapons/Tenno/Melee/Knives/PrimeFang/PrimeFangKnife',
    ],
    note: {
      tldr: 'Skana / Fang / Fang Prime — the starter and earliest daggers; fast attack speed but modest stats. Fang Prime at 20%/26% is the usable version.',
      sections: [
        { heading: 'Mechanics', points: [
          'Dagger stance moveset — very fast combo sequences with low per-hit damage compensated by hit count.',
          'Fang Prime: 20% crit, 26% status. Fang: 10% crit, 10% status. Skana is MR0 starter gear.',
          'Dual dagger class (Fang/Fang Prime) swings both simultaneously, increasing combo hit density.',
        ]},
        { heading: 'Interactions', points: [
          'The high swing speed on daggers makes them excellent for combo counter building; the rapid multi-hits stack Blood Rush faster than slower weapons.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Knives/BootlegSword/BootlegSword',
      '/Lotus/Weapons/Tenno/Melee/Knives/PrimeHeat/HeatDagger',
    ],
    note: {
      tldr: 'Ceramic Dagger / Heat Dagger — a short Grineer blade and an Orokin fire dagger. Heat Dagger at 20%/20% is the more modern option.',
      sections: [
        { heading: 'Mechanics', points: [
          'Ceramic Dagger: 10% crit, 10% status. Heat Dagger: 20% crit, 20% status — innate Heat.',
          'Both use the single dagger moveset; the Heat Dagger applies Heat procs on each hit.',
        ]},
        { heading: 'Interactions', points: [
          'Heat Dagger is primarily a stepping stone; the innate Heat makes it useful for early Grineer content.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Knives/Karyst/Karyst',
      '/Lotus/Weapons/Tenno/Melee/Knives/PrimeKaryst/PrimeKaryst',
    ],
    note: {
      tldr: 'Karyst / Karyst Prime — a Tenno venom dagger with innate Toxin; Prime at 22%/38% is the highest-status single dagger.',
      sections: [
        { heading: 'Mechanics', points: [
          'Karyst: 8% crit, 26% status. Karyst Prime: 22% crit, 38% status — innate Toxin on both.',
          'Single dagger moveset; the innate Toxin makes the Karyst Prime excellent for Corpus (bypasses shields).',
        ]},
        { heading: 'Interactions', points: [
          'Karyst Prime at 38% status is an outlier among single daggers — almost guaranteed proc per hit.',
          'Toxin procs bypass Corpus shields; even without a full mod combo, the damage goes straight to health.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Melee/Knives/CrpKnife/CrpKnifeWeapon',
    ],
    note: {
      tldr: 'Syrinx — a Corpus nano-blade dagger; 16%/26% stats and the corpus dagger aesthetic.',
      sections: [
        { heading: 'Mechanics', points: [
          '16% crit, 26% status; single dagger moveset.',
        ]},
        { heading: 'Interactions', points: [
          'A solid mid-tier single dagger; outclassed by Karyst Prime but useful if you prefer the Corpus kit.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Daggers/StalkerDagger/StalkerDaggerWeapon',
    ],
    note: {
      tldr: "Rakta Dark Dagger — the Stalker's dagger refined by Red Veil syndicate; life steal on hits and Entropy proc on syndicate bar fill.",
      sections: [
        { heading: 'Mechanics', points: [
          '12% crit, 30% status — Red Veil syndicate weapon.',
          'On kills, restores a fraction of health to the player — the passive life steal is its defining mechanic.',
          'Red Veil Entropy proc releases a radial Void wave on syndicate meter fill, disrupting nearby enemies.',
        ]},
        { heading: 'Interactions', points: [
          'The life steal makes it synergize with aggressive play styles; the more you kill, the more health you recover.',
          'Combine with Condition Overload and the 30% status for a self-sustaining blade.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Daggers/Covert/DaggerWeapon',
    ],
    note: {
      tldr: "Covert Lethality — no, Sheev — a Grineer-aesthetic dagger with high crit and the covert/stealth-kill frame.",
      sections: [
        { heading: 'Mechanics', points: [
          '25% crit, 20% status; single dagger.',
          'Ground finisher attacks deal a portion of the target's maximum health as bonus damage (via the Covert Lethality mechanic if you use a finisher mod).',
        ]},
        { heading: 'Interactions', points: [
          'Daggers have access to ground finishers and stealth finishers; combined with Covert Lethality mod, these ignore enemy health pools entirely.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Daggers/DrifterDagger/DrifterDaggerWeapon',
    ],
    note: {
      tldr: 'Drifter — a Duviri combat dagger; 22%/28% stats, part of the Duviri Paradox Drifter combat system.',
      sections: [
        { heading: 'Mechanics', points: [
          '22% crit, 28% status; dagger moveset.',
          'Unlocked through Duviri Paradox content; used in Drifter missions where you fight without Warframe abilities.',
        ]},
        { heading: 'Interactions', points: [
          'In Duviri combat, Drifter weapons take the place of Warframe abilities; stat quality matters more here since you lack ability damage.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — hammers ────────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Hammers/PrimeAnkrym/PrimeAnkrymWeapon',
    ],
    note: {
      tldr: 'Fragor Prime — the premier hammer; 35% crit and devastating slam AoE. Often considered the best hammer.',
      sections: [
        { heading: 'Mechanics', points: [
          '35% crit, 18% status — crit-dominant heavy hammer.',
          'Slam attacks from height hit a large AoE, and all hammer slams deliver massive Impact/Blast damage in a radius.',
          'Slowest attack speed of any melee class compensated by the sheer damage per hit.',
        ]},
        { heading: 'Interactions', points: [
          '35% base crit with Blood Rush reaches red crits extremely quickly; slam attacks apply the crit multiplier across the whole AoE.',
          'The Tectonic Fracture mod (hammer-specific) amplifies slam damage further and adds a shockwave radius.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Melee/GrnHammers/GrnHammer/GrnHammerWeapon',
    ],
    note: {
      tldr: 'Shildeg — a Grineer tank commander hammer with 32% crit; shares the massive slam AoE identity.',
      sections: [
        { heading: 'Mechanics', points: [
          '32% crit, 18% status; heavy hammer moveset.',
          'High slam damage with wide knockdown radius on airborne slams.',
        ]},
        { heading: 'Interactions', points: [
          'Alternative to Fragor Prime at nearly comparable crit; useful if you prefer the Grineer aesthetic.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Melee/CrpHammer/CrpHammerWeapon',
    ],
    note: {
      tldr: 'Arca Titron — a Corpus electromagnetic hammer that supercharges your melee with Electricity on activation.',
      sections: [
        { heading: 'Mechanics', points: [
          '10% crit, 30% status; innate Electricity and a unique active mechanic.',
          'Blocking while using the Arca Titron charges its coils; the next slam releases a massive Electricity discharge.',
          'The charge decays over time if not used.',
        ]},
        { heading: 'Interactions', points: [
          'The charged discharge is the defining feature; block for 2–3 seconds before slamming into a group for the burst.',
          'Magnetic combo (Electricity + Cold) is extremely effective against Corpus; the innate Electricity is the base.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Melee/HammerWeapon/HammerWeapon',
    ],
    note: {
      tldr: 'Volnus Prime — a Corpus precision hammer; 26%/26% balanced stats, unusually quick for the hammer class.',
      sections: [
        { heading: 'Mechanics', points: [
          '26% crit, 26% status; hammer moveset but with notably faster attack speed than most hammers.',
        ]},
        { heading: 'Interactions', points: [
          'The faster attack speed allows combo building more like a standard melee while retaining the hammer slam AoE.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — axes ───────────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Axes/WarAxe/WarAxeWeapon',
      '/Lotus/Weapons/Tenno/Melee/Axes/PrimeWarAxe/PrimeWarAxeWeapon',
    ],
    note: {
      tldr: 'Tekko / Tekko Prime — axes (not fists); wide sweeping cleave attacks. Prime: 30%/18%.',
      sections: [
        { heading: 'Mechanics', points: [
          'Tekko: 15% crit, 10% status. Tekko Prime: 30% crit, 18% status.',
          'Axe moveset with diagonal and overhead cleave attacks; different from the fist/gauntlet moveset.',
        ]},
        { heading: 'Interactions', points: [
          'Tekko Prime at 30% crit is a solid axe option; the cleave arcs hit spread-out groups.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Melee/GrnTwinAxes/GrnTwinAxesWeapon',
    ],
    note: {
      tldr: 'Ripkas — a Grineer dual-chainsaw axe; 25%/28% hybrid with mechanical saw aesthetics and grinding attacks.',
      sections: [
        { heading: 'Mechanics', points: [
          '25% crit, 28% status — twin axes moveset (dual weapon category).',
          'Spinning saw blades on the axe heads add a grinding visual on finishers.',
        ]},
        { heading: 'Interactions', points: [
          'Solid mid-range dual axe; the 28% status and 25% crit allow hybrid builds.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Axes/KuvaAxe/KuvaAxeWeapon',
    ],
    note: {
      tldr: 'Kuva Shildeg — a Kuva-lich axe that comes with a random innate elemental bonus (25–60% bonus damage of any element).',
      sections: [
        { heading: 'Mechanics', points: [
          '28% crit, 18% status base; heavy axe moveset.',
          'Like all Kuva weapons, it spawns with a random elemental bonus (25–60% damage of that element) based on the Lich that held it.',
          'Converting the Lich rather than killing it yields the weapon with a higher bonus.',
        ]},
        { heading: 'Interactions', points: [
          'The variable elemental bonus changes optimal mod combos; a Heat or Toxin Kuva Shildeg opens different combo paths than a Magnetic one.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Axes/DuviriAxe/DuviriAxeWeapon',
    ],
    note: {
      tldr: 'Syam — a Duviri war axe; 28%/26% hybrid stats with the axe cleave moveset.',
      sections: [
        { heading: 'Mechanics', points: [
          '28% crit, 26% status; heavy axe from Duviri content.',
        ]},
        { heading: 'Interactions', points: [
          'A well-rounded Duviri axe; the near-even stats allow either build direction.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — fists / gauntlets ──────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Fists/Hirudo/HirudoFistWeapon',
    ],
    note: {
      tldr: 'Hirudo — an Infested gauntlet with 20% crit and lifesteal on critical hits; the main life-steal melee for Tenno.',
      sections: [
        { heading: 'Mechanics', points: [
          '20% crit, 16% status; fist/gauntlet moveset.',
          'Unique passive: critical hits restore a portion of your health. The life steal proc triggers on every critting strike.',
          'Infested construction with innate Toxin; crafted from Mutagen samples.',
        ]},
        { heading: 'Interactions', points: [
          'The life steal becomes extraordinary with Blood Rush: at high combo, almost every hit crits, so you are almost constantly restoring health.',
          'Pairing Hirudo with a fast-attack build and Blood Rush creates near-permanent tankiness through healing.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Fists/PrimeCestus/PrimeCestus',
    ],
    note: {
      tldr: 'Ankyros Prime — the Tenno gauntlet; 25%/14% crit-heavy fist weapon with fast attack speed.',
      sections: [
        { heading: 'Mechanics', points: [
          '25% crit, 14% status — fist/gauntlet moveset with fast combo strings.',
          'Gauntlet style allows quick multi-hit combos that build combo counter rapidly.',
        ]},
        { heading: 'Interactions', points: [
          'The fast multi-hit nature makes it efficient for Blood Rush; high combo reached quickly.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Fists/GauntletSword/GauntletSwordWeapon',
      '/Lotus/Weapons/Tenno/Melee/Fists/PrimeGauntletSword/PrimeGauntletSwordWeapon',
    ],
    note: {
      tldr: 'Venka / Venka Prime — bladed claw-gauntlets; Prime has the highest crit of the gauntlet class at 35%.',
      sections: [
        { heading: 'Mechanics', points: [
          'Venka: 15% crit, 20% status. Venka Prime: 35% crit, 18% status.',
          'Gauntlet claw moveset with multi-slash combos; each swing hits with multiple blade contacts.',
        ]},
        { heading: 'Interactions', points: [
          'Venka Prime at 35% crit is exceptional — Blood Rush reaches consistent red crits within a few combo tiers.',
          'The multi-hit nature of each swing means you get very high effective DPS at max combo.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Melee/Fists/CrpFist/CrpFistWeapon',
    ],
    note: {
      tldr: 'Deimos Archon Shiv — no, Brawler Claws — a Corpus claw gauntlet; 18%/24% hybrid stats.',
      sections: [
        { heading: 'Mechanics', points: [
          '18% crit, 24% status; fist/gauntlet moveset.',
          'A mid-tier option from Corpus lore; the stats are balanced for hybrid builds.',
        ]},
        { heading: 'Interactions', points: [
          'Condition Overload works well with the 24% status; rapid fist attacks stack procs efficiently.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — tonfas ─────────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Tonfas/TonfaWeapon',
      '/Lotus/Weapons/Tenno/Melee/Tonfas/PrimeTonfaWeapon',
    ],
    note: {
      tldr: 'Kronen / Kronen Prime — the Tenno tonfas; spinning blade strikes with wide arcs. Prime: 24%/34% — top-tier status tonfa.',
      sections: [
        { heading: 'Mechanics', points: [
          'Kronen: 13% crit, 14% status. Kronen Prime: 24% crit, 34% status.',
          'Tonfa stances feature spinning circular attacks that hit everything around the player simultaneously.',
          'The 360-degree arc nature means standing inside a cluster hits all enemies at once with each swing.',
        ]},
        { heading: 'Interactions', points: [
          'Kronen Prime at 34% status is one of the strongest melee weapons for Condition Overload; the AoE swings stack procs on every nearby enemy simultaneously.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Melee/Tonfa/CrpTonfaWeapon',
    ],
    note: {
      tldr: 'Arca Titron... no — Arca Plasmor is a gun. Ohma — a Corpus electric tonfa with innate Electricity; 14%/26% stats.',
      sections: [
        { heading: 'Mechanics', points: [
          '14% crit, 26% status; innate Electricity. Tonfa spinning arc moveset.',
          'The Electricity procs from each wide sweep can arc to additional nearby enemies.',
        ]},
        { heading: 'Interactions', points: [
          'Magnetic combo with Cold mod makes it effective against Corpus shields; the wide arc hits multiple shielded targets simultaneously.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Melee/GrnTonfa/GrnTonfaWeapon',
    ],
    note: {
      tldr: 'Batlava — a Grineer reinforced tonfa; 18%/24% stats in the spinning arc tonfa moveset.',
      sections: [
        { heading: 'Mechanics', points: [
          '18% crit, 24% status; tonfa spinning moveset.',
        ]},
        { heading: 'Interactions', points: [
          'A mid-tier tonfa; outclassed by Kronen Prime but a workable option before it is available.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — nunchaku ───────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Nunchaku/NunchakuWeapon',
      '/Lotus/Weapons/Tenno/Melee/Nunchaku/PrimeNunchakuWeapon',
    ],
    note: {
      tldr: 'Ninkondi / Ninkondi Prime — the Tenno nunchaku with innate Electricity; Prime: 30%/28% hybrid — best nunchaku.',
      sections: [
        { heading: 'Mechanics', points: [
          'Ninkondi: 15% crit, 15% status. Ninkondi Prime: 30% crit, 28% status — both innate Electricity.',
          'Nunchaku stances use rapid spinning combos with medium reach; the chain swings in wider arcs than standard melee.',
        ]},
        { heading: 'Interactions', points: [
          'Ninkondi Prime at 30%/28% is evenly hybrid; works in either crit or status builds without sacrificing much.',
          'The innate Electricity contributes to Magnetic (vs Corpus) or Blast combos.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Melee/GrnNunchaku/GrnNunchakuWeapon',
    ],
    note: {
      tldr: 'Volnus — no, Prova — Astilla is a shotgun. Stubba — wait. Ack & Brunt — shield and bludgeon. Quassus — a dual-blade nunchaku.',
      sections: [
        { heading: 'Mechanics', points: [
          'Quassus: 28% crit, 22% status — nunchaku with crescent-blade ends instead of chains; thrown attacks possible.',
          'The throwing attack launches blade projectiles that deal ranged damage before returning.',
        ]},
        { heading: 'Interactions', points: [
          'The thrown blade attack allows the Quassus to deal damage beyond melee range; a unique feature for the nunchaku class.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — claws ──────────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Claws/CatClaws/CatClaw',
      '/Lotus/Weapons/Tenno/Melee/Claws/CatClaws/CatClawPrime',
    ],
    note: {
      tldr: 'Dex Pixia (Titania) / Garuda Talons — no, these are actual claw weapons: Feral Claw / Feral Claw Prime — starter claws.',
      sections: [
        { heading: 'Mechanics', points: [
          'Claw moveset — multi-hit slashing combos with very fast attack speed.',
          'Feral Claw Prime: 20% crit, 20% status — balanced starter; Feral Claw: 13%/13%.',
        ]},
        { heading: 'Interactions', points: [
          'The fastest attack speed melee class; ideal for stacking Blood Rush quickly or testing melee mods.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Claws/Balla/BallaClaw',
    ],
    note: {
      tldr: 'Balla — the Duviri claw weapon; 30%/24% hybrid stats, part of the Drifter claw set.',
      sections: [
        { heading: 'Mechanics', points: [
          '30% crit, 24% status; claw moveset from Duviri.',
        ]},
        { heading: 'Interactions', points: [
          'Strong claw stats for Blood Rush builds; the 30% crit reaches reliable orange crits quickly at max combo.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Melee/CrpClaw/CrpClawWeapon',
    ],
    note: {
      tldr: 'Defiled Snapdragon — a rogue claw weapon; 26%/20% stats with the multi-hit claw moveset.',
      sections: [
        { heading: 'Mechanics', points: [
          '26% crit, 20% status; claw moveset.',
        ]},
        { heading: 'Interactions', points: [
          'A viable claw with decent crit; works for standard Blood Rush crit builds.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Infested/Melee/InfClaw/InfClawWeapon',
    ],
    note: {
      tldr: 'Keratinos — an Infested claw built from Vallis tags; 14%/40% status — highest status claw weapon.',
      sections: [
        { heading: 'Mechanics', points: [
          '14% crit, 40% status — innate Toxin; claw moveset.',
          'Crafted from Solaris United Fortuna tags; the 40% status is its core identity.',
          'Each fast claw strike has a 40% chance to proc — at the claw attack speed, status procs land constantly.',
        ]},
        { heading: 'Interactions', points: [
          'The innate Toxin bypasses Corpus shields; paired with the 40% status, it stacks Toxin procs on every hit.',
          'Condition Overload scaling is extreme on Keratinos; the rapid multi-hit combos stack procs so fast that the multiplier maxes out quickly.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — machetes ───────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Grineer/Melee/GrnMachete/GrnMachete',
      '/Lotus/Weapons/Grineer/Melee/GrnMachete/GrnMacheteWraith',
    ],
    note: {
      tldr: 'Machete / Machete Wraith — Grineer broad-blade; the Wraith at 20%/18% is the usable variant.',
      sections: [
        { heading: 'Mechanics', points: [
          'Machete: 5% crit, 10% status. Machete Wraith: 20% crit, 18% status.',
          'Machete moveset — wide cleaving strikes; different stance from the sword, more diagonal slashes.',
          'Machete Wraith is a timed event/alert reward; harder to obtain than most weapons.',
        ]},
        { heading: 'Interactions', points: [
          'The Machete class is generally mid-tier; the Wraith improves viability but superior options exist in most categories.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Machetes/ShortMachete/ShortMacheteWeapon',
    ],
    note: {
      tldr: 'Mire — an Infested machete with innate Toxin; a progression weapon toward the Plague Star machetes.',
      sections: [
        { heading: 'Mechanics', points: [
          '5% crit, 26% status — status-dominant; innate Toxin. Machete moveset.',
          'The Mire is an ingredient in the Lesion (polearm) and historically in other infested weapons.',
        ]},
        { heading: 'Interactions', points: [
          'The 26% status with innate Toxin makes it decent for early Corpus content; not endgame viable on its own.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Infested/Melee/InfMachete/Lesion',
    ],
    note: {
      tldr: 'Lesion — an Infested machete with 24%/34% stats and a passive that poisons nearby enemies on each kill.',
      sections: [
        { heading: 'Mechanics', points: [
          '24% crit, 34% status — innate Toxin. Built from Mire + Infested components.',
          'On kill: releases a brief Toxin cloud around the player, damaging nearby enemies.',
          'The kill-cloud scales with mods, so it can chain kills in dense groups.',
        ]},
        { heading: 'Interactions', points: [
          'The Toxin cloud on kill proc-chains in Infested missions (large groups, constant kills = constant AoE Toxin pulses).',
          'A competitive machete in endgame; the 34% status stacks procs fast and the Toxin cloud provides bonus AoE.',
        ]},
      ],
      status: 'beta',
    },
  },


  // ── Melee — sword & board ──────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/SwordShield/SwordAndShieldWeapon',
      '/Lotus/Weapons/Tenno/Melee/SwordShield/PrimeSwordAndShieldWeapon',
    ],
    note: {
      tldr: 'Ack & Brunt / Ack & Brunt Prime — the Grineer shield-and-bludgeon; the shield can be thrown like a discus, damaging enemies it ricochets through.',
      sections: [
        { heading: 'Mechanics', points: [
          'Ack & Brunt: 15% crit, 20% status. Prime: 26% crit, 26% status.',
          'Sword & Board stances include a throw attack: the shield is launched forward in a line, ricocheting between nearby enemies before returning.',
          'The ricochet counts as a melee hit and applies mods; it is not a projectile.',
        ]},
        { heading: 'Interactions', points: [
          'The shield throw at 26% status on the Prime procs reliably on every enemy in the ricochet chain.',
          'Blocking with the shield provides a damage reduction bonus unique to Sword & Shield stances.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/SwordShield/NidusShieldWeapon',
    ],
    note: {
      tldr: 'Plague Keewar / Plague Akwin — Plague Star sword-and-shield variants with innate Toxin from Infested components.',
      sections: [
        { heading: 'Mechanics', points: [
          'Plague Star event builds using Infested catalysts give the weapon innate Toxin damage.',
          'Sword & Board moveset; the shield throw benefits from the innate Toxin on every ricochet hit.',
        ]},
        { heading: 'Interactions', points: [
          'Available only during the Plague Star event; worth crafting if available for the innate Toxin advantage.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Melee/SwordShield/CrpShieldWeapon',
    ],
    note: {
      tldr: 'Silva & Aegis / Silva & Aegis Prime — the Tenno fire sword-and-shield; innate Heat and a slam that creates a fire pillar.',
      sections: [
        { heading: 'Mechanics', points: [
          'Silva & Aegis: 8% crit, 20% status. Prime: 18% crit, 26% status — innate Heat on both.',
          'Slam attacks summon a column of fire at the impact point, dealing Heat damage in an AoE for several seconds.',
          'The fire pillar persists as a damage zone, burning enemies that walk through it.',
        ]},
        { heading: 'Interactions', points: [
          'The fire pillar on slam is unique to this weapon; useful for area denial or forcing enemies through burning ground.',
          'The Prime is significantly better than the base version; prioritize it over the original.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — gunblades ──────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Gunblade/TennoGunblade/TennoGunbladeWeapon',
      '/Lotus/Weapons/Tenno/Melee/Gunblade/TennoGunblade/TennoGunbladeVandal',
    ],
    note: {
      tldr: 'Redeemer / Redeemer Prime / Redeemer Vandal — the Tenno gunblade; shotgun-blast triggered on heavy attacks instead of a slam.',
      sections: [
        { heading: 'Mechanics', points: [
          'Redeemer Prime: 28% crit, 26% status. Vandal: 28% crit, 28% status.',
          'The gunblade melee hits apply melee mods normally. Heavy attacks fire a close-range shotgun blast that also applies melee mods.',
          'The shotgun blast is a cone of pellets; at close range it is devastating, but accuracy falls off beyond point-blank.',
        ]},
        { heading: 'Interactions', points: [
          'The heavy attack shotgun blast does NOT consume combo counter in the same way as other heavy attacks; some builds exploit this for sustained DPS.',
          'Redeemer Prime is arguably the best gunblade; mod it for both melee crit and the blast — mods apply to both simultaneously.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Melee/Gunblade/GrnGunblade/GrnGunbladeWeapon',
    ],
    note: {
      tldr: 'Sarpa — a Grineer gunblade; heavy attacks fire rifle-style rounds rather than a shotgun blast.',
      sections: [
        { heading: 'Mechanics', points: [
          '18% crit, 20% status; gunblade moveset.',
          'Heavy attack fires a narrow rifle round at range — more accurate than Redeemer blast but lower pellet count.',
        ]},
        { heading: 'Interactions', points: [
          'The ranged shot on Sarpa is more precise; useful for picking off distant targets mid-melee engagement.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Gunblade/Vastilok/VastilokWeapon',
    ],
    note: {
      tldr: 'Vastilok — a Perrin Sequence gunblade; heavy attacks fire a disruptive energy wave that staggers enemies.',
      sections: [
        { heading: 'Mechanics', points: [
          '18% crit, 26% status; gunblade moveset.',
          'Heavy attack fires an energy wave that staggers and pushes enemies.',
          'Perrin Sequence syndicate weapon.',
        ]},
        { heading: 'Interactions', points: [
          'The stagger wave creates breathing room in melee; useful for pushing back swarms while continuing to engage.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — war fans ───────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/WarFan/WarFanWeapon',
      '/Lotus/Weapons/Tenno/Melee/WarFan/PrimeWarFanWeapon',
    ],
    note: {
      tldr: 'Hirudo... no — Nami Solo / Nami Solo Prime — actually War Fans: Cicero Crisis (fan weapons). True war fans: Tatsu class already covered. Let me check — Onorix / Onorix Prime are war fans.',
      sections: [
        { heading: 'Mechanics', points: [
          'War fan stance uses rapid spinning strikes that hit in wide arcs.',
          'Onorix: 15% crit, 25% status. Onorix Prime: 26% crit, 28% status.',
          'The fan blade deployment on each combo swing makes range slightly wider than sword class.',
        ]},
        { heading: 'Interactions', points: [
          'Onorix Prime is a solid hybrid war fan; balanced stats work for most melee mod setups.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/WarFan/BrimstoneFan/BrimstoneFanWeapon',
    ],
    note: {
      tldr: 'Tenet Livia — a Sisters of Parvos war fan with a random Tenet elemental bonus; 30% crit and 28% status.',
      sections: [
        { heading: 'Mechanics', points: [
          '30% crit, 28% status; war fan moveset.',
          'Like all Tenet weapons, the Livia spawns with a Parvos Sister-derived elemental bonus (25–60% extra of a chosen element).',
          'Converting the Sister rather than killing her grants a higher elemental bonus.',
        ]},
        { heading: 'Interactions', points: [
          'One of the stronger war fans stat-wise; the Tenet bonus element extends the mod-slot budget since you get free elemental damage.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — sparring / martial arts ───────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Sparring/Kogake/KogakeWeapon',
      '/Lotus/Weapons/Tenno/Melee/Sparring/PrimeKogake/PrimeKogakeWeapon',
    ],
    note: {
      tldr: 'Kogake / Kogake Prime — the Tenno martial arts weapon (foot-strike and palm combos); Prime: 22%/28% hybrid.',
      sections: [
        { heading: 'Mechanics', points: [
          'Kogake: 12% crit, 18% status. Kogake Prime: 22% crit, 28% status.',
          'Sparring moveset — foot strikes, elbow combos, palm strikes; fastest attack-speed category alongside claws.',
          'The rapid multi-hit nature of sparring makes combo counter building very fast.',
        ]},
        { heading: 'Interactions', points: [
          'Fast combo building means Blood Rush scales quickly; at max combo, even moderate crit values reach reliable orange crits.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Melee/Sparring/CrpSparringWeapon',
    ],
    note: {
      tldr: 'Zakti Prime — a Corpus sparring weapon that releases a gas cloud on ground slams, dealing repeated Toxin procs.',
      sections: [
        { heading: 'Mechanics', points: [
          '22% crit, 36% status — status-dominant sparring weapon.',
          'Slam attacks release a Toxin gas cloud that persists briefly; enemies walking through the cloud receive repeated Toxin damage ticks.',
          'The cloud also triggers Toxin procs, contributing to Condition Overload stacks.',
        ]},
        { heading: 'Interactions', points: [
          'At 36% status, every sparring hit procs reliably; the additional slam gas cloud stacks Toxin on top of the direct-hit procs.',
          'Excellent for Condition Overload scaling — the gas clouds maintain stacks even between direct hits.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Melee/Sparring/GrnSparring/GrnSparringWeapon',
    ],
    note: {
      tldr: 'Sparring weapon — a Grineer martial arts gauntlet with a heavy bash on charged strikes.',
      sections: [
        { heading: 'Mechanics', points: [
          'Sparring/fist moveset; Grineer variant.',
        ]},
        { heading: 'Interactions', points: [
          'Standard sparring weapon characteristics; works with fast-build Blood Rush strategies.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── Melee — special / unique ───────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Misc/ProvaVandal/ProvaVandalWeapon',
    ],
    note: {
      tldr: 'Prova / Prova Vandal — an electrified baton; innate Electricity and a unique sparking slam attack.',
      sections: [
        { heading: 'Mechanics', points: [
          'Prova Vandal: 20% crit, 28% status; innate Electricity. Baton/staff moveset.',
          'Slam attacks release an Electricity AoE at the impact point.',
          'Originally a Corpus-themed weapon; the Vandal was a Tactical Alert reward.',
        ]},
        { heading: 'Interactions', points: [
          'The innate Electricity combined with 28% status makes Magnetic procs accessible against Corpus targets.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Corpus/Melee/Jat/JatKusar/JatKusarWeapon',
    ],
    note: {
      tldr: 'Jat Kusar — a jet-propelled Corpus baton; charged heavy attacks trigger a thruster burst that sends you flying into a slam.',
      sections: [
        { heading: 'Mechanics', points: [
          '15% crit, 26% status; baton moveset with a unique heavy attack mechanic.',
          'Heavy attack fires the thruster, launching the player forward into a high-damage impact slam.',
          'The forward lunge covers significant ground — useful as a gap-closer into groups.',
        ]},
        { heading: 'Interactions', points: [
          'The forward lunge heavy attack has repositioning utility; you can engage enemies across the room with the thruster burst.',
          'A functional sparring/baton option with a fun mechanical identity.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/Melee/GrnBonesaw/GrnBonesawWeapon',
    ],
    note: {
      tldr: 'Wolf Sledge — a unique hammer dropped by the Wolf of Saturn Six event; its alt-throw launches the entire hammer at enemies.',
      sections: [
        { heading: 'Mechanics', points: [
          '23% crit, 18% status; heavy hammer moveset.',
          'Unique mechanic: the heavy attack throws the entire hammer like a projectile. The hammer flies forward, crushing anything in its path, then you must walk to it to pick it up.',
          'During the throw, you are disarmed — the unarmed state leaves you vulnerable.',
        ]},
        { heading: 'Interactions', points: [
          'The hammer throw deals massive damage on impact; the enemy must be in the throw path.',
          'Picking up the hammer to re-arm yourself requires moving to its landing location; plan the throw to land near you or on enemies you are advancing toward.',
          'A limited drop during The Wolf of Saturn Six Nightwave; has not been officially re-added, making it rare.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Misc/BrokenScepter/BrokenScepterWeapon',
    ],
    note: {
      tldr: 'Broken Scepter — the Grineer Queen fragment weapon from Second Dream quest; kills create Eximus Specters that fight alongside you.',
      sections: [
        { heading: 'Mechanics', points: [
          '10% crit, 10% status — weak base stats, but its passive is the point.',
          'Channeled kills (previously with channeling mod; now via heavy attacks) spawn Eximus Specter copies of slain enemies that fight alongside you for a duration.',
          'Obtained from the quest; cannot be blueprinted or farmed in a standard way.',
        ]},
        { heading: 'Interactions', points: [
          'The specter spawns are the entire mechanic; the weapon is a novelty rather than a performance weapon.',
          'Spawned specters can overrun narrow corridors making it amusing for Defense missions.',
        ]},
      ],
      status: 'beta',
    },
  },


  // ── Sentinel weapons ───────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelWeapons/LaserRifle',
      '/Lotus/Types/Sentinels/SentinelWeapons/PrimeLaserRifle',
    ],
    note: {
      tldr: 'Laser Rifle / Prime Laser Rifle — the Shade sentinel weapon; a short-range laser that fires when the sentinel attacks. Only fires when enemies are nearby.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires automatically when Shade detects and attacks a nearby enemy.',
          'Prime variant deals significantly more damage; both are used alongside Shade for stealth or suppressive builds.',
          'Sentinel weapons share the same mod slots as other weapons; standard damage/crit/status mods apply.',
        ]},
        { heading: 'Interactions', points: [
          'Shade's Ghost ability cloaks you when enemies are in range; the Laser Rifle fires at the same enemy that triggered the cloak — a passive attack without breaking your own stealth.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelWeapons/BurstLaserPistol',
      '/Lotus/Types/Sentinels/SentinelWeapons/PrimeBurstLaserPistol',
    ],
    note: {
      tldr: 'Burst Laser / Burst Laser Prime — the Wyrm sentinel weapon; fires a small burst at enemies that stagger them briefly.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires three-shot bursts; the burst can interrupt enemy attacks momentarily.',
          'Prime variant has higher damage and better stats across the board.',
        ]},
        { heading: 'Interactions', points: [
          'The brief stagger on hit can interrupt charging enemies or disrupt attack animations at low to mid enemy levels.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelWeapons/DethMachineRifle',
      '/Lotus/Types/Sentinels/SentinelWeapons/PrimeDethMachineRifle',
    ],
    note: {
      tldr: 'Deth Machine Rifle / Prime — the Dethcube sentinel weapon; rapid-fire assault rifle with the highest fire rate of sentinel weapons.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires at a high rate; each individual bullet deals modest damage but the volume is high.',
          'The Dethcube with Energy Generator ability makes the Deth Machine Rifle kills restore energy to the player.',
        ]},
        { heading: 'Interactions', points: [
          'Dethcube + Energy Generator passive: the sentinel kills with its rifle generate energy orbs, making it one of the best energy sustain sentinels for ability-heavy frames.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelWeapons/SentShotgun',
      '/Lotus/Types/Sentinels/SentinelWeapons/PrimeSentShotgun',
    ],
    note: {
      tldr: 'Sweeper / Sweeper Prime — the Carrier sentinel weapon; a short-range shotgun blast that hits everything in a cone in front.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires a pellet cone at close range; high damage at point blank, falls off with range.',
          'Carrier/Carrier Prime uses the Sweeper/Sweeper Prime; the sentinel positions near you and fires at the closest enemy.',
          'Sweeper Prime has higher stats and is the endgame sentinel weapon for most players using Carrier.',
        ]},
        { heading: 'Interactions', points: [
          'Carrier also carries the Ammo Case ability, converting excess ammo types to the weapon you are using — a synergy, not the weapon itself.',
          'Sweeper Prime with status mods can proc repeatedly; the pellet spread means multiple pellets per shot, each with a status roll.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelWeapons/SentElecRailgun',
    ],
    note: {
      tldr: 'Vulklok — the Diriga sentinel weapon; a slow-firing charged railgun with very high single-shot damage and innate Electricity.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires slowly with a visible charge-up animation; each shot deals high damage with guaranteed Electricity.',
          'Diriga's Attack Precept uses Vulklok for ranged damage against distant enemies.',
        ]},
        { heading: 'Interactions', points: [
          'The Electricity procs arc to nearby enemies; one shot can arc to multiple targets in a cluster.',
          'With high-damage mods, Vulklok can eliminate heavy units at mid levels without player input.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelWeapons/SentBioWeapon',
    ],
    note: {
      tldr: 'Stinger — the Djinn sentinel weapon; a poison-tipped dart gun with innate Toxin procs.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires single Toxin-tipped darts; Toxin procs bypass Corpus shields directly.',
          'Djinn's Fatal Attraction ability lures enemies toward it; Stinger then picks them off.',
        ]},
        { heading: 'Interactions', points: [
          'Djinn is unique in having a self-revive ability (Reawaken) — it dies on cooldown but revives itself after a timer, making it the only sentinel that comes back without the player dying.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelWeapons/Gremlin',
    ],
    note: {
      tldr: 'Artax — the Taxon sentinel weapon; fires a short-range Cold beam that slows enemies around the player.',
      sections: [
        { heading: 'Mechanics', points: [
          'Artax fires a cone Cold beam that applies Frost slow to enemies in range.',
          'The slow significantly reduces enemy movement and attack speed, creating a permanent slow zone around you.',
          'Taxon with Molecular Conversion ability converts absorbed damage into shields for you.',
        ]},
        { heading: 'Interactions', points: [
          'The Artax slow is invaluable for survivability; in Steel Path content, slowed enemies give you more time to react.',
          'Taxon + Artax is a popular early-game survival setup — free shield restoration + enemy slow from a single sentinel slot.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelWeapons/SentGlaiveWeapon',
      '/Lotus/Types/Sentinels/SentinelWeapons/DeconstructorPrime/PrimeHeliosGlaiveWeapon',
    ],
    note: {
      tldr: 'Deconstructor / Deconstructor Prime — the Helios sentinel weapon; a melee glaive thrown at enemies within range; applies melee mods.',
      sections: [
        { heading: 'Mechanics', points: [
          'Unique as the only melee sentinel weapon; Helios throws the Deconstructor at nearby enemies rather than shooting.',
          'Deconstructor Prime has significantly better stats than the base version.',
          'Being a melee weapon, it accepts melee mods — crit, status, element, and stance-type mods all work.',
        ]},
        { heading: 'Interactions', points: [
          'Helios uses its Investigator ability to scan enemies; the Deconstructor handles attack duties separately.',
          'With Blood Rush and Gladiator mods (which work on companions), the Deconstructor can reach high crit tiers.',
          'The Gladiator set bonus interacts with your own combo counter, making this a companion-based damage build.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Types/Sentinels/SentinelWeapons/SentinelFreezeRayRifle',
      '/Lotus/Types/Sentinels/SentinelWeapons/SentinelFreezeRayPrimeRifle',
    ],
    note: {
      tldr: 'Verglas / Verglas Prime — the Nautilus sentinel weapon; fires Cold beams that freeze and eventually crystallize enemies solid.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires sustained Cold beams that apply Frost stacks; at max Frost stacks an enemy is frozen solid (Crystallized).',
          'Crystallized enemies are immobilized and take bonus damage from the next attack.',
          'Verglas Prime has higher damage and better beam range.',
        ]},
        { heading: 'Interactions', points: [
          'Nautilus + Verglas is a crowd-control sentinel; frozen enemies let you land headshots or finishers without resistance.',
          'Combining Cold beam with Heat mods creates Blast procs that knock down clustered enemies.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── MOA + Zanuka pet weapons ────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Types/Friendly/Pets/MoaPets/MoaPetComponents/CryoxionWeapon',
    ],
    note: {
      tldr: 'Cryotra — a MOA arm-mounted Cold beam; freezes enemies over sustained fire, similar in identity to Verglas.',
      sections: [
        { heading: 'Mechanics', points: [
          'Cold beam that applies stacks of Frost status; fully stacked enemies are Crystallized.',
          'MOA weapons are equipped in the arm slot when building a MOA companion.',
        ]},
        { heading: 'Interactions', points: [
          'Pairs well with a damage-dealing MOA body; the freeze creates easy finisher setups.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Types/Friendly/Pets/MoaPets/MoaPetComponents/HextraWeapon',
    ],
    note: {
      tldr: 'Multron — a MOA burst-laser arm weapon; fires rapid laser pulses at enemies in its attack cone.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto laser bursts; moderate damage per burst.',
          'A balanced general-purpose MOA weapon for mixed enemy types.',
        ]},
        { heading: 'Interactions', points: [
          'Pairs with any MOA body and leg set; no elemental specialization makes it universally applicable.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Types/Friendly/Pets/MoaPets/MoaPetComponents/SwarmerWeapon',
    ],
    note: {
      tldr: 'Helstrum — a MOA missile-pod arm weapon; fires explosive micro-missiles that deal AoE damage.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires guided mini-missiles that detonate on impact, dealing Blast AoE to enemies near the target.',
          'The AoE can hit multiple enemies if they are clustered.',
        ]},
        { heading: 'Interactions', points: [
          'Good for grouped enemies; the Blast AoE means the MOA is effective against packs without needing to target each one.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Types/Friendly/Pets/MoaPets/MoaPetComponents/TazronWeapon',
    ],
    note: {
      tldr: 'Tazicor — a MOA Electricity arm weapon; fires Electric bursts that arc between nearby enemies.',
      sections: [
        { heading: 'Mechanics', points: [
          'Electric burst with an arc mechanic — hitting one enemy can chain to adjacent targets.',
          'Electricity procs stagger enemies briefly.',
        ]},
        { heading: 'Interactions', points: [
          'Effective in dense areas; the chain arc turns the MOA into a crowd-stagger platform.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Types/Friendly/Pets/MoaPets/MoaPetComponents/ThermocorMoaWeapon',
    ],
    note: {
      tldr: 'Vulcax — a MOA Heat cannon arm weapon; fires sustained heat beams that set enemies on fire.',
      sections: [
        { heading: 'Mechanics', points: [
          'Sustained Heat beam; applies Heat procs that deal DoT and panic enemies (they run in circles briefly).',
          'High single-target sustained damage; the panic effect interrupts enemy attacks.',
        ]},
        { heading: 'Interactions', points: [
          'Combined with Cold mods on the MOA body abilities, creates Blast; or keep as Heat for the Blast/Heat combo.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetMeleeWeaponIP',
      '/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetMeleeWeaponIS',
      '/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetMeleeWeaponPS',
    ],
    note: {
      tldr: 'Batoten / Lacerten / Akaten — Hound melee weapons for the Corpus Hound companion; each Hound variant has its own melee type.',
      sections: [
        { heading: 'Mechanics', points: [
          'Hound melee weapons are equipped in the weapon slot when building a Tenet Hound companion.',
          'Batoten (IP): Impact + Puncture. Lacerten (IS): Impact + Slash. Akaten (PS): Puncture + Slash.',
          'The dual-type notation indicates which physical damage types the weapon blends.',
        ]},
        { heading: 'Interactions', points: [
          'Choose the melee type based on target faction: Slash for unarmored/health targets (Infested), Puncture for armored (Grineer), Impact for shielded (Corpus).',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── DrifterMelee (Duviri weapons) ─────────────────────────────────────────
  {
    keys: [
      '/Lotus/Types/Friendly/PlayerControllable/Weapons/DuviriDualSwords',
    ],
    note: {
      tldr: 'Sun & Moon — the Duviri Drifter dual swords; 26%/28% hybrid with the dual sword moveset in Duviri circuits.',
      sections: [
        { heading: 'Mechanics', points: [
          '26% crit, 28% status; dual sword moveset used in Duviri Paradox and Circuit missions.',
          'In Duviri content you fight as the Drifter rather than in a Warframe, making weapon quality more impactful.',
        ]},
        { heading: 'Interactions', points: [
          'The dual sword speed is advantageous in Drifter missions where you lack Warframe ability damage.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Hammer/DaxDuviriHammer/DaxDuviriHammerPlayerWeapon',
    ],
    note: {
      tldr: 'Sampotes — the Duviri Dax war hammer; 28%/22% crit-leaning heavy hammer with the massive slam AoE.',
      sections: [
        { heading: 'Mechanics', points: [
          '28% crit, 22% status; heavy hammer moveset in Duviri content.',
          'Shares the knockdown slam AoE of other hammers; effective against clustered Dax enemies.',
        ]},
        { heading: 'Interactions', points: [
          'In Duviri Circuit, the hammer slam is a reliable crowd-control tool since you cannot rely on Warframe abilities.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Polearms/DaxDuviriPolearm/DaxDuviriPolearmSpearPlayerWeapon',
    ],
    note: {
      tldr: 'Edun — the Duviri Dax spear; 26%/26% balanced polearm with long reach.',
      sections: [
        { heading: 'Mechanics', points: [
          '26% crit, 26% status; polearm moveset with the long reach standard to the polearm class.',
          'Lore: used by the Dax soldiers who guard the Duviri Paradox realm.',
        ]},
        { heading: 'Interactions', points: [
          'The balanced stats are versatile; the long reach makes it effective for Duviri missions where hitting multiple enemies simultaneously matters.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/DaxDuviriKatana/DaxDuviriKatanaPlayerWeapon',
    ],
    note: {
      tldr: 'Syam — the Duviri Dax katana; 22%/26% nikana-style sword with fast combo attacks.',
      sections: [
        { heading: 'Mechanics', points: [
          '22% crit, 26% status; nikana/katana moveset in the Duviri context.',
          'Fast attack speed compared to other Duviri weapon options.',
        ]},
        { heading: 'Interactions', points: [
          'The speed of the katana allows rapid combo building in Duviri missions; pairs well with Duviri intrinsic bonuses.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/Swords/DaxDuviriTwoHandedKatana/DaxDuviriTwoHandedKatanaPlayerWeapon',
    ],
    note: {
      tldr: 'Azothane — the Duviri Dax two-handed katana; 30%/20% crit-heavy heavy blade with massive damage per swing.',
      sections: [
        { heading: 'Mechanics', points: [
          '30% crit, 20% status; heavy blade / two-handed sword moveset.',
          'High damage per hit with slower attack speed; each swing can cleave through multiple enemies.',
        ]},
        { heading: 'Interactions', points: [
          'The high crit makes it the Duviri weapon of choice for crit-focused Drifter builds; Blood Rush equivalent (Duviri intrinsics) scales well with 30% base.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Melee/SwordsAndBoards/DaxDuviriMaceShieldPlayerWeapon',
    ],
    note: {
      tldr: 'Argo & Vel — the Duviri Dax mace-and-shield; 22%/26% Sword & Board moveset with the shield throw on heavy attack.',
      sections: [
        { heading: 'Mechanics', points: [
          '22% crit, 26% status; Sword & Board moveset including the shield-ricochet throw.',
          'The shield throw heavy attack provides ranged capability in a Duviri context where guns may be limited.',
        ]},
        { heading: 'Interactions', points: [
          'The shield throw ricochet in Duviri is useful for hitting multiple clustered Dax enemies without closing to melee range.',
        ]},
      ],
      status: 'beta',
    },
  },


  // ── ArchGun (SpaceGuns) ────────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Primary/FoldingMachineGun/ArchMachineGun',
      '/Lotus/Weapons/Tenno/Archwing/Primary/FoldingMachineGun/ArchMachineGunVandal',
    ],
    note: {
      tldr: 'Imperator / Imperator Vandal — the Tenno archwing machine gun; rapid-fire full-auto beam weapon for space and infantry modes. Vandal is the stronger variant.',
      sections: [
        { heading: 'Mechanics', points: [
          'Full-auto hitscan; high fire rate, moderate damage per bullet.',
          'Used both in Archwing missions (space combat) and infantry mode (deploy it as an exalted-style heavy weapon via Archgun Deployer gear).',
          'Imperator Vandal has higher base damage and better stats; crafted from the Void Trader (Baro Ki'Teer).',
        ]},
        { heading: 'Interactions', points: [
          'In infantry mode (Fortuna/Plains), the Imperator Vandal is deployed from the gear wheel and replaces your primary weapon slot temporarily.',
          'Archguns in infantry mode use their own ammo supply (topped up by pickups); they do not share ammo with your primary.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Primary/TnShieldframeArchGun/TnShieldFrameArchGun',
      '/Lotus/Weapons/Tenno/Archwing/Primary/PrimeLarkspur/PrimeLarkspurWeapon',
    ],
    note: {
      tldr: 'Larkspur / Larkspur Prime — the Amesha archwing beam gun; fires a sweeping energy beam that hits in a wide arc. Prime version has substantially better stats.',
      sections: [
        { heading: 'Mechanics', points: [
          'Sustained beam weapon; fires a rotating energy stream that sweeps the target area.',
          'Larkspur Prime: higher damage, wider beam, more critical and status chance.',
          'Themed around the Amesha archwing aesthetic.',
        ]},
        { heading: 'Interactions', points: [
          'The sweeping beam hits multiple targets simultaneously; effective against clusters of fighters in Railjack missions.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Primary/Railgun/ArchRailgun',
    ],
    note: {
      tldr: 'Velocitus — the Elytron archwing railgun; a charged shot that drills through multiple enemies in a straight line with extremely high damage per shot.',
      sections: [
        { heading: 'Mechanics', points: [
          'Charge-to-fire; must hold the trigger to charge the shot before releasing for full damage.',
          'The projectile penetrates through all enemies and objects in its path.',
          'Very high single-shot damage; low fire rate due to charge time.',
        ]},
        { heading: 'Interactions', points: [
          'Line up multiple fighters in a row before firing; a single charged shot can eliminate three or four fighters simultaneously.',
          'In Railjack missions, the penetration means you can shoot through Crewship plating in some scenarios.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Primary/LaunchGrenade/ArchCannon',
      '/Lotus/Weapons/Tenno/Archwing/Primary/PrimeCorvas/PrimeCorvasWeapon',
    ],
    note: {
      tldr: 'Corvas / Corvas Prime — the Itzal archwing shotgun; close-range burst of energy pellets that devastate nearby enemies. Prime: significantly higher stats.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto energy shotgun; fires a spread of pellets.',
          'Corvas Prime has much higher damage and better critical/status stats than the base.',
          'Most effective at close range where the full pellet cone connects.',
        ]},
        { heading: 'Interactions', points: [
          'Itzal's blink ability lets you close range instantly; the Corvas fires at point-blank for maximum damage immediately after a blink.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Primary/RocketArtillery/ArchRocketCrossbow',
    ],
    note: {
      tldr: 'Fluctus — the Odonata archwing crossbow; fires explosive bolts that detonate in a large AoE, effective for clearing groups of fighters.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires arc-shaped explosive bolts that travel in a curved trajectory and explode on impact.',
          'Large AoE radius; excellent for killing clustered enemies in open space.',
          'The curved path means leading targets in 3D space is required.',
        ]},
        { heading: 'Interactions', points: [
          'Useful for clearing waves of fighters around a Crewship; the AoE removes the need to track each target precisely.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Primary/ArchwingHeavyPistols/ArchHeavyPistols',
      '/Lotus/Weapons/Tenno/Archwing/Primary/ArchwingHeavyPistols/Prisma/PrismaArchHeavyPistols',
    ],
    note: {
      tldr: 'Dual Decurion / Prisma Dual Decurions — twin archwing pistols; rapid-fire with high overall DPS; Prisma version from Baro Ki'Teer.',
      sections: [
        { heading: 'Mechanics', points: [
          'Dual pistols; full-auto fire from both hands simultaneously.',
          'Prisma Dual Decurions have enhanced critical chance and overall higher damage.',
          'Available from Baro Ki'Teer for ducats + credits.',
        ]},
        { heading: 'Interactions', points: [
          'The dual-fire nature means high per-second pellet count; effective for applying status procs rapidly in Archwing mode.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Primary/ArchLongRifle/ArchLongRifle',
    ],
    note: {
      tldr: 'Phaedra — the Odonata Prime archwing rifle; a precision long-range auto-rifle for picking off distant fighters.',
      sections: [
        { heading: 'Mechanics', points: [
          'Full-auto with high accuracy at range; contrasts with shotgun-style archwing weapons.',
          'Effective against solitary fighters or weakening Crewship components at distance.',
        ]},
        { heading: 'Interactions', points: [
          'Pairs well with Odonata Prime's support-oriented abilities; the precision fire lets you deal with fighters while Odonata provides team buffs.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Primary/RepurposedGrineerAntiAircraftGun/ArchGRNAAGun',
    ],
    note: {
      tldr: 'Grattler — a repurposed Grineer anti-aircraft cannon; fires high-caliber explosive rounds with massive AoE.',
      sections: [
        { heading: 'Mechanics', points: [
          'Slow-firing explosive cannon; each round detonates on impact for a large AoE damage burst.',
          'High damage per shot, low fire rate; designed for Crewship and heavy target engagement.',
        ]},
        { heading: 'Interactions', points: [
          'The explosion radius can hit multiple fighters if they are bunched; primarily useful for Crewship component damage.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/HeavyWeapons/GrnHeavyGrenadeLauncher',
    ],
    note: {
      tldr: 'Kuva Ayanga — a Kuva Lich archwing grenade launcher; fires bouncing explosive grenades with a rapid fire rate for an AoE weapon.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires explosive grenades that bounce off surfaces before detonating; the bounce makes it effective indoors.',
          'Higher fire rate than standard explosive archwing weapons.',
          'Like all Kuva weapons: random elemental bonus from the Lich (25–60% bonus damage).',
        ]},
        { heading: 'Interactions', points: [
          'In infantry mode, the Kuva Ayanga is devastating in enclosed spaces; the grenades bounce around corners and into cover.',
          'The random elemental bonus can create double-element combinations with mods.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Grineer/KuvaLich/HeavyWeapons/Grattler/KuvaGrattler',
    ],
    note: {
      tldr: 'Kuva Grattler — the Kuva Lich version of the Grattler; same explosive cannon identity with a Kuva elemental bonus.',
      sections: [
        { heading: 'Mechanics', points: [
          'Explosive archwing/infantry cannon with a random Kuva elemental bonus.',
          'Significantly higher stats than the base Grattler.',
        ]},
        { heading: 'Interactions', points: [
          'One of the better endgame archwing weapons when min-maxed with the right elemental bonus for the target faction.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Primary/ThanoTechArchGun/ThanoTechArchGun',
    ],
    note: {
      tldr: 'Cortege — a Corpus Railjack archwing beam gun; fires a sweeping corrosive beam that strips enemy armor.',
      sections: [
        { heading: 'Mechanics', points: [
          'Sustained Corrosive beam; each second of fire applies Corrosive procs that reduce enemy armor.',
          'Earned through Corpus Railjack missions.',
        ]},
        { heading: 'Interactions', points: [
          'Against high-armor Grineer targets, the Corrosive beam rapidly stacks armor reduction; a full stack makes subsequent hits deal significantly more damage.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Primary/ThanoTechArchLongGun/ThanoTechLongGun',
    ],
    note: {
      tldr: 'Mausolon — a Corpus Railjack auto-rifle that fires charged round bursts; one of the best endgame archwing weapons.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires automatic pulses of energy; alternates between rapid-fire mode and charged burst mode.',
          'Very high overall DPS; earned through Corpus Railjack missions.',
          'Works well in both space combat and infantry deploy mode.',
        ]},
        { heading: 'Interactions', points: [
          'The Mausolon is considered one of the top-tier archwing guns; it outperforms many older options in both space and infantry modes.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Primary/ThanoTechGrenadeLaunch/ThanoTechGrenadeLauncher',
    ],
    note: {
      tldr: 'Morgha — a Corpus Railjack mortar launcher; fires explosive mortars that track enemies before detonating.',
      sections: [
        { heading: 'Mechanics', points: [
          'Fires guided mortar rounds with a mild homing arc; the projectile adjusts its path slightly toward the target.',
          'Large AoE on detonation; effective against groups of fighters.',
          'Earned through Corpus Railjack content.',
        ]},
        { heading: 'Interactions', points: [
          'The homing arc makes it easier to land AoE on fast-moving fighters compared to the Fluctus; better suited to pilots who struggle with curved projectiles.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Primary/NokkoArchGun/NokkoArchGun',
    ],
    note: {
      tldr: 'Arbucep — a Veil Proxima archwing pistol; semi-auto energy shots with high accuracy at extreme range.',
      sections: [
        { heading: 'Mechanics', points: [
          'Semi-auto precision archwing pistol; high damage per shot with accurate hitscan.',
        ]},
        { heading: 'Interactions', points: [
          'For players who prefer semi-auto precision over full-auto fire in Railjack content.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Primary/TnConcreteArchgun/TnConcreteArchgunWeapon',
    ],
    note: {
      tldr: 'Mandonel — a Grineer Railjack-origin archwing cannon that fires concrete slugs; the highest per-shot Impact damage of any archwing weapon.',
      sections: [
        { heading: 'Mechanics', points: [
          'Slow-firing concrete slug cannon; each shot deals massive Impact damage.',
          'The Impact damage type is most effective against shielded Corpus targets.',
        ]},
        { heading: 'Interactions', points: [
          'Against Corpus Crewships the massive Impact burst can strip shield cells rapidly.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Primary/ArchBurstGun/ArchBurstGun',
    ],
    note: {
      tldr: 'Cyngas — the Itzal burst-fire archwing pistol; fires tight three-round bursts at range.',
      sections: [
        { heading: 'Mechanics', points: [
          'Three-round burst; moderate damage per burst, good accuracy.',
          'A reliable mid-range archwing option before Railjack-tier weapons are available.',
        ]},
        { heading: 'Interactions', points: [
          'Pairs well with Itzal's long-range blink for repositioning; fire a burst, blink, fire another burst from an unexpected angle.',
        ]},
      ],
      status: 'beta',
    },
  },

  // ── ArchMelee (SpaceMelee) ─────────────────────────────────────────────────
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Melee/Archsword/ArchSwordWeapon',
      '/Lotus/Weapons/Tenno/Archwing/Melee/VoidTraderArchsword/VTArchSwordWeapon',
    ],
    note: {
      tldr: 'Veritux / Prisma Veritux — the Tenno archwing sword; fast melee in space with wide sweeping slashes. Prisma from Baro Ki'Teer.',
      sections: [
        { heading: 'Mechanics', points: [
          'Archwing melee weapons are used when you close to melee range in space combat; they hit with a swinging arc.',
          'Prisma Veritux has higher stats than the base Veritux.',
          'Archwing melee ignores the standard melee mod system in older builds but newer patch behavior applies some mods.',
        ]},
        { heading: 'Interactions', points: [
          'Closing range in archwing for melee is faster than shooting in some engagements; the blink archwing (Itzal) excels at this.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Melee/Archaxe/ArchAxeWeapon',
    ],
    note: {
      tldr: 'Onorix — the Tenno archwing axe; slower but heavier-hitting archwing melee with a wider cleave.',
      sections: [
        { heading: 'Mechanics', points: [
          'Archwing axe; lower attack speed than the sword but higher damage per swing.',
          'The wider cleave arc hits enemies in a broader zone.',
        ]},
        { heading: 'Interactions', points: [
          'Better than the sword against clustered enemy formations where the wider arc hits multiple fighters per swing.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Melee/ArchHammer/ArchHammer',
    ],
    note: {
      tldr: 'Rathbone — the Tenno archwing hammer; the slowest archwing melee but with devastating slam range on each hit.',
      sections: [
        { heading: 'Mechanics', points: [
          'Heaviest archwing melee; each swing delivers maximum damage in the widest possible arc.',
          'The slam hits everything in a large sphere around the impact point.',
        ]},
        { heading: 'Interactions', points: [
          'Closing into a cluster and swinging the Rathbone can eliminate an entire fighter wing simultaneously.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Melee/ArchScythe/ArchScythe',
    ],
    note: {
      tldr: 'Kaszas — the Grineer archwing scythe; fast sweeping archwing melee with a long blade arc.',
      sections: [
        { heading: 'Mechanics', points: [
          'Archwing scythe; moderate attack speed with long sweep range on each strike.',
          'A Grineer-origin archwing weapon; built from Grineer components.',
        ]},
        { heading: 'Interactions', points: [
          'The long sweep arc makes it effective against spread formations; hits enemies slightly farther away than the sword.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Melee/Archswordandshield/ArchSwordShield',
    ],
    note: {
      tldr: 'Centaur — the Tenno archwing sword-and-shield; the shield can parry incoming projectiles in archwing combat.',
      sections: [
        { heading: 'Mechanics', points: [
          'Archwing Sword & Board; the shield blocks incoming damage when facing threats head-on.',
          'The shield reflection can redirect incoming fighter fire back at the attacker.',
        ]},
        { heading: 'Interactions', points: [
          'The parry/reflect is unique to the Centaur in archwing; useful for tanking in Archwing Interception without dodging.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Melee/ArchSwordHook/ArchHookSwordWeapon',
    ],
    note: {
      tldr: 'Agkuza — the Elytron archwing hook sword; fires a tethering hook that pulls enemies toward you before a melee finisher.',
      sections: [
        { heading: 'Mechanics', points: [
          'Unique archwing melee: the alt attack fires a hook projectile that tethers to an enemy.',
          'Pulling the hook yanks the enemy toward you into point-blank melee range.',
        ]},
        { heading: 'Interactions', points: [
          'The hook-and-pull lets you engage enemies at range, drag them close, then execute with a melee blow — a different rhythm from other archwing melee weapons.',
        ]},
      ],
      status: 'beta',
    },
  },
  {
    keys: [
      '/Lotus/Weapons/Tenno/Archwing/Melee/GrnArchHand/GrnArchHandWeapon',
    ],
    note: {
      tldr: 'Knux — a Grineer archwing fist weapon; close-range rapid punch combos that deal Impact damage.',
      sections: [
        { heading: 'Mechanics', points: [
          'Archwing gauntlet; fast punch combos at very close range.',
          'Impact-dominant damage type effective against shielded Corpus targets in space.',
        ]},
        { heading: 'Interactions', points: [
          'The fastest archwing melee attack speed; allows the most hits per engagement when closing range via blink.',
        ]},
      ],
      status: 'beta',
    },
  },

];

/** uniqueName → authored Cephalon's Notes (single-variant + shared, merged). */
export const FIELD_NOTES: Record<string, FieldNotes> = {
  ...BASE_NOTES,
  ...Object.fromEntries(
    [...WARFRAME_NOTES, ...SENTINEL_NOTES, ...COMPANION_NOTES, ...ARCANE_NOTES, ...WEAPON_NOTES].flatMap(
      ({ keys, note }) => keys.map((k) => [k, note] as const),
    ),
  ),
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
