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
  // ── Shieldless frames (shield-gating gear is dead weight) ──
  {
    keys: ['/Lotus/Powersuits/Sandman/Sandman', '/Lotus/Powersuits/Sandman/InarosPrime'],
    note: {
      tldr: 'A shieldless wall of health and armor — Inaros tanks with raw HP, not shields, and can revive himself.',
      points: [
        'He has NO shields, so shield-gating gear does nothing: Brief Respite, Catalyzing Shields, and shield-based arcanes are wasted slots.',
        'Survivability scales off Health and Armor instead — think Adaptation, Arcane Grace, and armor/health mods.',
        'His energy economy is thin, so most builds lean on Equilibrium plus health-orb generation (or Arcane Energize) to stay powered.',
        'The self-revive passive only triggers from a sarcophagus; you still need to finish a nearby enemy (or be revived) to get back up.',
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Powersuits/Infestation/Infestation', '/Lotus/Powersuits/Infestation/InfestationPrime'],
    note: {
      tldr: 'Nidus survives on Mutation stacks, not shields — build stacks up and they become a free death-save.',
      points: [
        'He is shieldless, so shield-gating mods and arcanes are pointless; his defense is stacks, armor, and Parasitic Link.',
        'Cast Virulence repeatedly to bank Mutation stacks — at 15+, taking lethal damage spends them to revive you with invulnerability instead of dying.',
        'Stacks also power his other abilities, so range and strength (to land Virulence on crowds) matter more than duration on most builds.',
        'Energy is easy to keep up: Ravenous spawns health orbs, pairing perfectly with Equilibrium.',
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Powersuits/PaxDuviricus/PaxDuviricus'],
    note: {
      tldr: 'A shieldless heavy-attack duelist who tanks behind Overguard and recovers energy from the damage he deals.',
      points: [
        'No shields — but Wrathful Advance grants Overguard, which soaks hits AND blocks status procs and knockdowns while it lasts, so shield-gating gear is irrelevant.',
        'His passive gives big heavy-attack efficiency and wind-up speed to ANY melee, so he is built around heavy-attack weapons.',
        'Recompense converts the health you lose into energy, so taking some damage is part of his loop rather than a problem.',
        'Storm of Ukko marks enemies; hitting marked targets is how he heals and sustains in a fight.',
      ],
      status: 'beta',
    },
  },
  // ── Resource quirks (energy gear that does nothing) ──
  {
    keys: ['/Lotus/Powersuits/IronFrame/IronFrame', '/Lotus/Powersuits/IronFrame/IronFramePrime'],
    note: {
      tldr: 'Hildryn pays for abilities with SHIELDS, not energy — so every energy mod and arcane is dead weight on her.',
      points: [
        'She has no energy bar for abilities: Flow, Streamline, Arcane Energize, and the Zenurik energy dash do nothing for her.',
        'Pillage is her engine — it strips enemy shields/armor and refunds her shields, letting her cast almost endlessly.',
        'Build for a big shield pool plus shield regen and Ability Strength; survivability comes from her unusually long shield-gate.',
        'Because casting drains shields, anything that caps or lowers max shields (like Catalyzing Shields) actively hurts her.',
      ],
      status: 'beta',
    },
  },
  // ── Invulnerability mechanics (not shield-gating) ──
  {
    keys: ['/Lotus/Powersuits/Revenant/Revenant', '/Lotus/Powersuits/Revenant/RevenantPrime'],
    note: {
      tldr: 'Mesmer Skin gives Revenant charges of full invulnerability — survival is about charge count, not shields or armor.',
      points: [
        'Each enemy that hits you spends one Mesmer Skin charge and gets stunned; when charges hit zero you are exposed, so recast before they run out.',
        'More Ability Strength = more charges, which is why strength is his core survival stat rather than health or armor.',
        'It is not perfect: damage-over-time already ticking on you, and some special attacks, can still get through.',
        'Danse Macabre is his main damage; Mesmer Shield (augment) shares the invulnerability with allies.',
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Powersuits/Nezha/Nezha', '/Lotus/Powersuits/Nezha/NezhaPrime'],
    note: {
      tldr: 'Nezha has low base health — his real health bar is Warding Halo, a one-cast damage buffer that scales with Strength.',
      points: [
        'Warding Halo absorbs a chunk of damage set at the moment you cast it, plus a brief immunity window when it pops; Ability Strength makes it bigger.',
        'Because the buffer is the build, stacking Strength (and recasting the Halo) matters more than raw health mods.',
        'Blazing Chakram strips armor and amplifies headshot damage, turning him into a strong weapon-platform frame.',
        'The Safeguard augment lets you cast Warding Halo onto allies — a popular pick for defense and support runs.',
      ],
      status: 'beta',
    },
  },
  // ── Snapshot buffs (cast order matters) ──
  {
    keys: ['/Lotus/Powersuits/Rhino/Rhino', '/Lotus/Powersuits/Rhino/RhinoPrime'],
    note: {
      tldr: 'Iron Skin snapshots your armor and strength at the instant you cast it — so the order you buff in changes how tanky it is.',
      points: [
        'Iron Skin locks in its health from your armor and Ability Strength AT CAST. Apply armor buffs/arcanes first, then cast, for a much bigger shield.',
        'There is a short window right after casting where extra hits add to the Iron Skin value before it locks — many players cast in a busy room on purpose.',
        'Roar is a damage multiplier that also boosts status and damage-over-time, and it stacks multiplicatively with mods — a top-tier party buff.',
        'A classic, beginner-friendly frame: simple kit, very hard to kill once Iron Skin is up.',
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Powersuits/Dragon/Dragon', '/Lotus/Powersuits/Dragon/ChromaPrime'],
    note: {
      tldr: 'Chroma is a buff battery — his element is chosen by your ENERGY COLOR, and his big buffs build up as he takes damage.',
      points: [
        'Energy color sets his element for Elemental Ward and Spectral Scream/Effigy (e.g. cold-range colors = Ice, hot colors = Heat) — pick the color deliberately.',
        'Vex Armor has two meters, Fury (more damage) and Scorn (more armor), that you charge by TAKING and DEALING damage; both scale with Ability Strength.',
        'Vex Armor’s damage bonus snapshots onto your weapons, which is why he is a famous single-target/Eidolon nuke platform.',
        'He has no resource quirk — just remember the buffs need a moment (and a little incoming damage) to ramp before they are at full power.',
      ],
      status: 'beta',
    },
  },
  // ── Caster / status identity ──
  {
    keys: ['/Lotus/Powersuits/Saryn/Saryn', '/Lotus/Powersuits/Saryn/SarynPrime'],
    note: {
      tldr: 'Saryn is the queen of spreading status — Spores ramp up and jump from corpse to corpse to melt whole rooms.',
      points: [
        'Spores grow stronger over time and spread when an infected enemy dies or you pop them, so Range (to spread) and Strength (for spore damage) carry the build.',
        'Her passive makes your status effects last longer, leaning her even harder into status-stacking weapons and Viral.',
        'Toxic Lash boosts melee and helps re-pop Spores; Molt gives a decoy plus a speed buff (Regenerative Molt for healing).',
        'If every infected enemy dies at once, Spores reset — keep at least one target alive to hold the ramp.',
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Powersuits/Runner/Runner', '/Lotus/Powersuits/Runner/GaussPrime'],
    note: {
      tldr: 'Gauss runs on a Battery — keep moving to charge it, and his speed, damage reduction, and overdrive all key off how full it is.',
      points: [
        'Movement (especially Mach Rush) fills the battery; let it sit and the battery drains, so this is a frame you play by staying in motion.',
        'Kinetic Plating turns incoming damage into battery charge and grants heavy damage reduction plus status/knockdown immunity that scales with battery level.',
        'Redline overdrives fire rate, reload, and more once the battery is high — built for Duration and Strength to hold the redline zone.',
        'Thermal Sunder (Cold/Heat AoE) is a huge part of his kit and one of the most-borrowed Helminth abilities in the game.',
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Powersuits/AntiMatter/Anti', '/Lotus/Powersuits/AntiMatter/NovaPrime'],
    note: {
      tldr: 'Nova is the textbook reason to build NEGATIVE Ability Strength on purpose — it flips her slow into a speed boost.',
      points: [
        'Molecular Prime slows enemies and makes them take extra damage; at NEGATIVE Strength it instead SPEEDS enemies up to rush objectives (speed-nova).',
        'So her build is a deliberate choice: positive Strength for a slow-and-amplify nuke setup, negative Strength for fast Defense/Interception pushes.',
        'Null Star gives orbiting motes that grant damage reduction, her main survival tool on a squishy frame.',
        'Antimatter Drop is a high-skill nuke that absorbs incoming fire to multiply its own damage.',
      ],
      status: 'beta',
    },
  },
  // ── Survival / utility identity ──
  {
    keys: ['/Lotus/Powersuits/Berserker/Berserker', '/Lotus/Powersuits/Berserker/ValkyrPrime'],
    note: {
      tldr: 'Valkyr is the melee berserker — Hysteria makes her invincible while she claws, and her sky-high armor carries the rest.',
      points: [
        'Hysteria is an exalted melee with invulnerability, but it drains and leaves a brief vulnerable window when it ends, so it is not truly infinite.',
        'Her enormous base armor (and Warcry’s armor/attack-speed buff) makes armor-stacking and Steel Fiber especially effective.',
        'Because Hysteria blocks damage, energy-from-damage mods (Rage/Hunter Adrenaline) sustain her between casts, not during them.',
        'Eternal War (augment) lets you keep Warcry’s attack speed up for long stretches — a staple melee buff build.',
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Powersuits/MonkeyKing/MonkeyKing', '/Lotus/Powersuits/MonkeyKing/WukongPrime'],
    note: {
      tldr: 'Wukong brings a second him (Celestial Twin) and an invisible heal (Cloud Walker) — a famously forgiving, low-effort frame.',
      points: [
        'Celestial Twin fights alongside you with its own weapon, effectively adding a second gun to every mission.',
        'Cloud Walker turns you invisible while moving and heals you, his main escape-and-reset button.',
        'Defy still gives a window of heavy damage reduction and an armor buff, though it was toned down from the old "unkillable" version.',
        'Primal Fury is his exalted Iron Staff — long reach and strong crit scaling for melee builds.',
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Powersuits/Wisp/Wisp', '/Lotus/Powersuits/Wisp/WispPrime'],
    note: {
      tldr: 'Wisp drops Reservoir motes that buff the whole squad — and the buff sticks for a while even after you walk away from them.',
      points: [
        'Place all three motes (Haste for speed/fire-rate, Vitality for health/regen, Shock for stun); allies pick them up by passing through, then keep the buff for a duration.',
        'Her passive makes her invisible while airborne — bullet-jump or hover and enemies lose track of her, so positioning is her defense.',
        'Range and Duration are the key stats: bigger aura to grab buffs, longer-lasting motes.',
        'Breach Surge pairs with her teleport for blinds and chain damage; Sol Gate is her exalted beam.',
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Powersuits/Bard/Bard', '/Lotus/Powersuits/Bard/OctaviaPrime'],
    note: {
      tldr: 'Octavia’s Mallet reflects enemy damage back at them — the harder they shoot it, the harder it hits, so it scales endlessly.',
      points: [
        'Mallet stores the damage enemies deal TO it and pulses it back out, which is why it stays lethal even at very high levels.',
        'Metronome turns you (and allies) invisible and hands out buffs when you do simple actions like jumping or crouching to the beat.',
        'Range and Duration are the priority stats; she is the classic AFK-friendly survival and affinity-farm frame.',
        'Amp boosts ability damage in its aura and Resonator drags enemies onto the Mallet — drop all three together for a self-running room clear.',
      ],
      status: 'beta',
    },
  },
  {
    keys: ['/Lotus/Powersuits/Devourer/Devourer', '/Lotus/Powersuits/Devourer/GrendelPrime'],
    note: {
      tldr: 'Grendel eats enemies to fuel himself — and despite the rumor he is NOT shieldless (he just has a tiny shield).',
      points: [
        'Feast swallows enemies into his belly; each one he holds grants bonus armor (his passive) while they take damage inside him.',
        'He does have a small shield pool, so he is not a true shieldless frame — but his real tankiness is armor and the enemies he is digesting.',
        'Build for Armor, Strength, and Duration; the more he holds, the tankier he gets.',
        'Nourish is one of the most popular Helminth abilities in the whole game (energy sustain plus a Viral damage buff) — many players borrow it off him.',
      ],
      status: 'beta',
    },
  },

  // ===== Alphabetical sweep (wiki-researched, our own words) =====

  // Amesha (Archwing)
  {
    keys: ['/Lotus/Powersuits/Archwing/SupportJetPack/SupportJetPack'],
    note: {
      tldr: 'The support Archwing — Amesha is the survivability pick for hard space content, trading firepower for near-constant protection.',
      points: [
        'Watchful Swarm spawns drones that each soak an incoming hit outright — the closest thing to on-demand invulnerability in Archwing combat.',
        'Warding Grace makes you and nearby allies immune to status procs and slows the enemies around you — a lifesaver in messy Railjack and open-world fights.',
        'Vengeful Rush turns the damage you take into energy and buffs allied ability range, strength, and duration, so getting shot actually fuels you.',
        'It is the go-to Archwing for tanking Profit-Taker, ferrying a squad through Railjack, and outlasting anything that out-damages the offensive wings.',
      ],
      status: 'beta',
    },
  },

  // Ash
  {
    keys: ['/Lotus/Powersuits/Ninja/Ninja', '/Lotus/Powersuits/Ninja/AshPrime'],
    note: {
      tldr: 'A stealth assassin built around invisibility and finishers — Ash turns Slash bleeds into a quiet, lethal loop.',
      points: [
        'Smoke Screen makes him invisible, not invincible — most enemies can’t target him, but lingering damage-over-time and some area attacks still land.',
        'Teleport drops him next to a target set up for a finisher; the Fatal Teleport augment makes that finisher automatic and pairs famously with finisher-damage mods.',
        'His passive makes the Slash bleeds he applies hit harder and last longer, so he loves high-Slash melee and status weapons.',
        'Blade Storm marks enemies for shadow clones to execute, and the clones lock in their power when summoned — buff up before you mark.',
      ],
      status: 'beta',
    },
  },

  // Atlas
  {
    keys: ['/Lotus/Powersuits/Brawler/Brawler', '/Lotus/Powersuits/Brawler/AtlasPrime'],
    note: {
      tldr: 'A melee brawler who tanks by punching — Landslide scales off your MELEE weapon, and every hit banks Rubble into armor.',
      points: [
        'Landslide is a punch that scales with melee mods and your equipped weapon, not Ability Strength, and chains into a faster combo if you keep tapping it.',
        'Killing petrified or destroyed enemies showers Rubble, which stacks bonus armor and slowly heals you — the heart of his survivability.',
        'Petrify is one of the best Helminth picks in the game: it freezes a crowd, opens them to finishers, and makes them take extra damage.',
        'His passive makes him immune to knockdown while on the ground, so he is built to stand and fight rather than reposition.',
      ],
      status: 'beta',
    },
  },

  // Banshee
  {
    keys: ['/Lotus/Powersuits/Banshee/Banshee', '/Lotus/Powersuits/Banshee/BansheePrime'],
    note: {
      tldr: 'A glass-cannon force multiplier — Sonar paints weak spots that make ANY weapon hit for many times its normal damage.',
      points: [
        'Sonar tags glowing weak points that multiply your damage; the Resonance augment spreads those spots on kills to keep a whole room lit up.',
        'She is extremely fragile, so she plays from stealth and range — her job is amplifying the squad’s damage, not soaking hits.',
        'Silence is a top-tier Helminth ability: it staggers enemies on cast and shuts off their special abilities and Eximus auras.',
        'Sound Quake channels a stagger that drains energy fast; the Resonating Quake augment turns it into a wide nuke for low-level farming.',
      ],
      status: 'beta',
    },
  },

  // Baruuk
  {
    keys: ['/Lotus/Powersuits/Pacifist/Pacifist', '/Lotus/Powersuits/Pacifist/BaruukPrime'],
    note: {
      tldr: 'A reluctant pacifist who stacks enormous damage reduction, then unleashes energy-free exalted fists once his Restraint runs out.',
      points: [
        'His abilities drain a Restraint meter: dodging with Elude, putting enemies to sleep with Lull, and disarming them with Desolate Hands all erode it.',
        'At zero Restraint, Serene Storm summons Desert Wind — exalted fists that cost NO energy, only Restraint, and grow stronger the lower Restraint sits.',
        'Between his passive, the Desolate Hands daggers, and Serene Storm he reaches some of the highest damage reduction in the game — a perfect Adaptation partner.',
        'Elude dodges all attacks while you aren’t attacking, so he tanks standing still and turns into a melee monster once wound up; Reactive Storm (augment) makes his fists match the enemy’s weakness.',
      ],
      status: 'beta',
    },
  },

  // Bonewidow (Necramech)
  {
    keys: ['/Lotus/Powersuits/EntratiMech/ThanoTech'],
    note: {
      tldr: 'A Necramech — a piloted war machine — built for melee tanking, the close-range counterpart to the gun-focused Voidrig.',
      points: [
        'Necramechs use their OWN separate mods (not your Warframe mods); you summon and pilot them in the open worlds and certain heavy-duty missions.',
        'Ironbride is her exalted curved sword for wading into crowds; Meathook skewers an enemy and heals her, and Shield Maiden raises a tower shield that blocks and reflects fire.',
        'She favors armor and health over shields, making her the aggressive front-line mech — Voidrig instead camps with the long-range Arquebex cannon.',
        'Both mechs share the Mausolon arch-gun, so the choice comes down to melee brawling (Bonewidow) versus ranged artillery (Voidrig).',
      ],
      status: 'beta',
    },
  },

  // Caliban
  {
    keys: ['/Lotus/Powersuits/Sentient/Sentient', '/Lotus/Powersuits/Sentient/CalibanPrime'],
    note: {
      tldr: 'A Sentient-hybrid armor-stripper — after his rework, Fusion Strike tears off shields AND armor so your weapons hit full force.',
      points: [
        'Fusion Strike is the centerpiece: a full shield-and-armor strip on a group, exactly what high-level enemies need to become killable.',
        'All of his abilities apply Tau status, a neutral damage type that opens enemies up no matter their faction.',
        'Lethal Progeny summons Sentient helpers that restore your shields and harass enemies, giving him steady on-field sustain.',
        'His passive grants the squad adaptive damage resistance that adjusts to whatever damage type is hitting you — a quiet team-wide buff.',
      ],
      status: 'beta',
    },
  },

  // Citrine
  {
    keys: ['/Lotus/Powersuits/Geode/Geode'],
    note: {
      tldr: 'A crystalline support frame — she buffs the squad’s crit and status, hands out steady healing, and showers health and energy orbs.',
      points: [
        'Prismatic Gem parks a floating gem that boosts allies’ status chance and duration while tagging enemies with several elements — a primer and a buff in one.',
        'Crystallize locks enemies in place and grows crystals that raise Critical Chance, turning a room into a crit-boosted shooting gallery.',
        'Her passive heals nearby allies over time and ramps up as the squad collects Health Orbs — which her abilities generate plenty of.',
        'She is a low-stress survival and farming pick: drop the gem, hold ground, and keep the team topped up and critting.',
      ],
      status: 'beta',
    },
  },
];

/** uniqueName → authored Cephalon's Notes (single-variant + shared, merged). */
export const FIELD_NOTES: Record<string, FieldNotes> = {
  ...BASE_NOTES,
  ...Object.fromEntries(
    WARFRAME_NOTES.flatMap(({ keys, note }) => keys.map((k) => [k, note] as const)),
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
