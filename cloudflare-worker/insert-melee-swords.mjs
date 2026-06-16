// Melee Batch A: Swords (1h, nikana, dual, heavy blade/great sword)
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'C:\\Users\\Nuclear Spaceship\\Main_Vault\\Main_Vault\\tennoplan\\cloudflare-worker\\src\\codex\\fieldNotes.ts';
let src = readFileSync(filePath, 'utf8');

const MARKER = '\r\n];\r\n\r\n/** uniqueName';
const idx = src.lastIndexOf(MARKER);
if (idx === -1) throw new Error('Marker not found');

const insert = `

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
      '/Lotus/Weapons/Tenno/Melee/DualShortSword/DualShortSword',
    ],
    note: { tldr: '', sections: [], status: 'beta' },
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
      '/Lotus/Weapons/Tenno/Melee/DualShortSword/DualHeatSwords',
    ],
    note: { tldr: '', sections: [], status: 'beta' },
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
`;

// Strip duplicate key placeholders from the template — same keys were added twice above
// Let me filter them out by removing the empty-note stubs (DualShortSword and DualHeatSwords appear twice)
// Actually the stubs are separate entries, let me just clean the insert text:
const cleanInsert = insert
  .replace(/\s*\{[\s\r\n]*keys:\s*\[[\s\r\n]*'\/Lotus\/Weapons\/Tenno\/Melee\/DualShortSword\/DualShortSword',[\s\r\n]*\],[\s\r\n]*note:\s*\{\s*tldr:\s*'',\s*sections:\s*\[\],\s*status:\s*'beta'\s*\},[\s\r\n]*\},/g, '')
  .replace(/\s*\{[\s\r\n]*keys:\s*\[[\s\r\n]*'\/Lotus\/Weapons\/Tenno\/Melee\/DualShortSword\/DualHeatSwords',[\s\r\n]*\],[\s\r\n]*note:\s*\{\s*tldr:\s*'',\s*sections:\s*\[\],\s*status:\s*'beta'\s*\},[\s\r\n]*\},/g, '')
  .replace(/\s*\{[\s\r\n]*keys:\s*\[[\s\r\n]*'\/Lotus\/Weapons\/Tenno\/Melee\/Swords\/ExcaliburSword\/ExcaliburUmbraKatana',[\s\r\n]*\],[\s\r\n]*note:\s*\{\s*tldr:\s*'',\s*sections:\s*\[\],\s*status:\s*'beta'\s*\},[\s\r\n]*\},/g, '');

const insertWithCRLF = cleanInsert.replace(/\n/g, '\r\n');
src = src.slice(0, idx) + insertWithCRLF + src.slice(idx);
writeFileSync(filePath, src, 'utf8');
console.log('Done — inserted melee swords section');
