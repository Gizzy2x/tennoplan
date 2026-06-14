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

  // Cyte-09
  {
    keys: ['/Lotus/Powersuits/Frumentarius/Frumentarius'],
    note: {
      tldr: 'A precision sniper frame — Cyte-09 marks targets, snaps to their weak points, and wields an exalted sniper rifle that rewards headshots.',
      points: [
        'Seek plants a beacon that highlights enemies through walls, makes their weak points more vulnerable, and gives your guns punch-through.',
        'Neutralize summons an exalted sniper rifle whose weak-point hits ricochet to nearby enemies — built around crit, headshot, and precision mods.',
        'His passive stacks weak-point critical chance with every precision kill across a mission, so accuracy snowballs the longer you play.',
        'Evade grants invisibility that weak-point kills refresh, letting a careful sniper stay hidden almost indefinitely; Resupply hands out ammo and a chosen element.',
      ],
      status: 'beta',
    },
  },

  // Dagath
  {
    keys: ['/Lotus/Powersuits/Dagath/Dagath'],
    note: {
      tldr: 'A spectral cavalry frame — Dagath spreads Viral, banks enemy damage to detonate later, and buys herself a window where she simply can’t die.',
      points: [
        'Wyrd Scythes apply Viral and slow — a strong opener (and a popular Helminth pick) that softens a group before you shoot.',
        'Doom curses enemies so part of the damage they take is stored and dumped back out when the curse ends, scaling up against tougher targets.',
        'Grave Spirit grants a big Critical Damage buff plus a brief no-death window, and enemies killed during it drop guaranteed Health Orbs to keep her going.',
        'Her health pool is low, so she leans on that invulnerability window and orb healing rather than raw tankiness; Rakhali’s Cavalry strips shields and armor on the charge.',
      ],
      status: 'beta',
    },
  },

  // Dante
  {
    keys: ['/Lotus/Powersuits/Pagemaster/Pagemaster'],
    note: {
      tldr: 'A storyteller support-nuker — Dante shields the whole squad with Overguard and detonates status for huge Slash damage.',
      points: [
        'He casts "verses" that combine: Light Verse builds Overguard for you and allies, Dark Verse stacks Slash, and Final Verse cashes them in.',
        'The Tragedy finish detonates Slash, Heat, and Toxin status on everything nearby for a massive area nuke; Triumph instead refreshes Overguard on kills.',
        'Overguard makes him extremely hard to stagger or kill and is the best squad-wide protection in the game — a top pick for hard endurance runs.',
        'Noctua, his exalted tome, scans enemies as it hits them, and his passive rewards those scans with extra status chance.',
      ],
      status: 'beta',
    },
  },

  // Elytron (Archwing)
  {
    keys: ['/Lotus/Powersuits/Archwing/DemolitionJetPack/DemolitionJetPack'],
    note: {
      tldr: 'The bombardment Archwing — Elytron is the heavy-artillery option, built to blow up clustered targets in space.',
      points: [
        'Warhead fires a single big missile for a massive explosion, while Bloomer scatters tracking mines you can detonate on command.',
        'It is the most durable offensive wing, trading Itzal’s mobility and Amesha’s protection for raw area damage.',
        'Core Vent lays a gas trail that soaks up enemy fire, giving it a little staying power between bombing runs.',
        'You bring it to Archwing and Railjack content where the goal is clearing dense groups of fighters fast.',
      ],
      status: 'beta',
    },
  },

  // Ember
  {
    keys: ['/Lotus/Powersuits/Ember/Ember', '/Lotus/Powersuits/Ember/EmberPrime'],
    note: {
      tldr: 'A fire caster who runs hot — Ember’s damage and toughness both ride a heat meter you have to keep from boiling over.',
      points: [
        'Immolation builds heat that raises her damage reduction, but let it max out and it drains energy fast — managing that meter IS the gameplay.',
        'Fire Blast strips enemy armor, turning a room of tanky enemies into easy targets for the whole squad.',
        'Her passive grants bonus Ability Strength for each heat-afflicted enemy nearby, so she snowballs hardest in dense crowds.',
        'Inferno is her room-clearing nuke; build Strength and Range and keep one eye on the heat gauge.',
      ],
      status: 'beta',
    },
  },

  // Equinox
  {
    keys: ['/Lotus/Powersuits/YinYang/YinYang', '/Lotus/Powersuits/YinYang/EquinoxPrime'],
    note: {
      tldr: 'A two-in-one frame — Equinox swaps between an offensive Day form and a defensive Night form, and is famous for a stored-damage room nuke.',
      points: [
        'Metamorphosis flips between forms: Day leans into damage and offense, Night into survivability and crowd control, so you carry two kits in one frame.',
        'Maim (Day) banks Slash damage from every kill and releases it as a wide explosion on recast — the classic Equinox nuke, usually set up by sleeping a crowd with Rest first.',
        'Rest & Rage and Pacify & Provoke each do opposite things per form (sleep vs. damage-vulnerability, weaken enemies vs. buff allies), making her a flexible support.',
        'She is one of the more complex and expensive frames to build, but rewards players who learn to juggle her two halves.',
      ],
      status: 'beta',
    },
  },

  // Excalibur (+ Prime, + Umbra)
  {
    keys: [
      '/Lotus/Powersuits/Excalibur/Excalibur',
      '/Lotus/Powersuits/Excalibur/ExcaliburPrime',
      '/Lotus/Powersuits/Excalibur/ExcaliburUmbra',
    ],
    note: {
      tldr: 'The sword-master starter frame — his Exalted Blade scales with your melee mods, and Radial Blind turns a crowd into free finishers.',
      points: [
        'Exalted Blade summons an ethereal sword that fires energy waves and scales with your equipped melee mods; the Chromatic Blade augment swaps its element by energy color and boosts status.',
        'Radial Blind blinds nearby enemies and opens every one of them to a melee finisher — his core survival-and-burst tool.',
        'His passive makes swords, nikanas, rapiers and similar melee hit harder and faster, so he loves sword-type weapons.',
        'Excalibur Umbra plays the same but adds the Umbral mod set and a sentient AI that keeps fighting on its own while you are in Operator/Transference.',
      ],
      status: 'beta',
    },
  },

  // Follie
  {
    keys: ['/Lotus/Powersuits/Inkblot/Inkblot'],
    note: {
      tldr: 'An ink-and-clown trickster — Follie slows and blinds crowds with ink, conjures tools from thin air, and floats enemies away while stripping their defenses.',
      points: [
        'Her passive coats enemies in ink that slows them and gives a chance to drop Health and Energy Orbs on death — built-in crowd control and sustain.',
        'Plein Air lifts enemies on balloons and strips their armor and shields, then drops them for fall damage — control and a defense-strip in one cast.',
        'Self Portrait spawns an inky clone that grants damage reduction (and is a handy Helminth pick); Forced Perspective repositions her with brief invulnerability and a status cleanse.',
        'Shadowgraph even sketches usable tools and objects into the world — she is a utility-and-control frame rather than a raw damage dealer.',
      ],
      status: 'beta',
    },
  },

  // Frost
  {
    keys: ['/Lotus/Powersuits/Frost/Frost', '/Lotus/Powersuits/Frost/FrostPrime'],
    note: {
      tldr: 'The classic defense frame — Frost drops a Snow Globe that walls off an objective and an Avalanche that freezes and strips armor.',
      points: [
        'Snow Globe creates a dome that blocks incoming fire; its strength is set when you cast it, so place it where you want to hold and recast to refresh.',
        'Avalanche freezes everything nearby and strips their armor, letting the squad cut through otherwise-tanky enemies — the Icy Avalanche augment also hands out Overguard.',
        'His passive makes Cold status last longer and grants armor for each chilled enemy nearby, rewarding a freeze-everything playstyle.',
        'He is a staple for Defense, Interception, and Mobile Defense, where a well-placed globe trivializes protecting a point.',
      ],
      status: 'beta',
    },
  },

  // Gara
  {
    keys: ['/Lotus/Powersuits/Glass/Glass', '/Lotus/Powersuits/Glass/GaraPrime'],
    note: {
      tldr: 'A glass frame with a famous scaling loop — Gara stacks Splinter Storm’s damage by hitting it with her own Shattered Lash, on top of being a strong defender.',
      points: [
        'Splinter Storm wraps allies in glass for damage reduction and makes enemies take extra damage; its damage builds up as it absorbs hits.',
        'The signature loop: cast Splinter Storm, then strike it with Shattered Lash to multiply its stored damage — repeat to scale into very high numbers.',
        'Mass Vitrify lays a ring of glass walls that block gunfire and crystallize enemies, great for sealing off an objective.',
        'Her passive can radial-blind enemies when she casts; Spectrorage (with its augment) is a popular energy-farming and decoy subsume.',
      ],
      status: 'beta',
    },
  },

  // Garuda
  {
    keys: ['/Lotus/Powersuits/Garuda/Garuda', '/Lotus/Powersuits/Garuda/GarudaPrime'],
    note: {
      tldr: 'A blood-powered berserker — Garuda turns her own health into energy and hits harder the closer she is to death.',
      points: [
        'Bloodletting spends most of her health to refill energy, so she runs casters’ kits without ever touching an energy orb — her signature loop.',
        'Her passive ramps her damage up as her health drops, rewarding that low-health playstyle (and she claws bare-handed with no melee equipped).',
        'Dread Mirror steals an enemy’s life for a damage-absorbing shield plus a throwable heart; Blood Altar impales a target to heal the squad.',
        'She is squishy by design — build Strength and lean on Dread Mirror’s shield and life-steal rather than a big health pool.',
      ],
      status: 'beta',
    },
  },

  // Gyre
  {
    keys: ['/Lotus/Powersuits/Gyre/Gyre', '/Lotus/Powersuits/Gyre/GyrePrime'],
    note: {
      tldr: 'An electric crit-nuker — Gyre turns Electricity status into critical hits that chain across a whole room.',
      points: [
        'Her passive grants bonus critical chance for every Electricity status on an enemy, so stacking shocks turns her abilities and guns into crit machines.',
        'Rotorswell makes your critical hits arc lightning to nearby enemies, spreading damage and more Electric procs to feed the passive.',
        'Cathode Grace buffs weapon and ability crit chance and trickles energy, with kills extending it — the backbone of long ability-spam runs.',
        'Coil Horizon groups and detonates enemies; build Strength and Duration and lean into electric weapons to keep the crit-status loop rolling.',
      ],
      status: 'beta',
    },
  },

  // Harrow
  {
    keys: ['/Lotus/Powersuits/Priest/Priest', '/Lotus/Powersuits/Priest/HarrowPrime'],
    note: {
      tldr: 'A priest-themed crit buffer — Harrow hands the squad fire-rate, lifesteal, and a huge critical-chance boost, all fueled by overshields and headshots.',
      points: [
        'His passive doubles his overshield cap and starts him with full energy; overshields are the resource the rest of his kit feeds on.',
        'Penance converts overshields into a team fire-rate, reload, and lifesteal buff, while Condemn roots enemies and refills shields on each hit.',
        'Covenant gives a brief party-wide invulnerability, then turns the damage it blocked into a critical-chance buff that headshot kills extend — the reason he is a staple for Eidolon and boss squads.',
        'Thurible is a channeled energy-regen ritual rewarded by headshot kills; his kit is so self-reliant that subsuming a Helminth ability onto him is tricky.',
      ],
      status: 'beta',
    },
  },

  // Hydroid
  {
    keys: ['/Lotus/Powersuits/Pirate/Pirate', '/Lotus/Powersuits/Pirate/HydroidPrime'],
    note: {
      tldr: 'The reworked pirate — Hydroid is now a Corrosive armor-stripper who buffs his own tankiness and weapons while melting enemy armor.',
      points: [
        'Plunder permanently strips enemy armor with Corrosive, then funnels that into bonus armor for him and Corrosive damage on his weapons — his defining ability.',
        'His passive makes enemies he damages more vulnerable to Corrosive and chips their armor on the first proc, stacking with Plunder.',
        'Tempest Barrage rains Corrosive projectiles for status, and Tidal Surge is an invulnerable water-dash for getting around or repositioning.',
        'Tentacle Swarm is his hard crowd control; build Strength and Range to keep armor stripped and enemies pinned.',
      ],
      status: 'beta',
    },
  },

  // Itzal (Archwing)
  {
    keys: ['/Lotus/Powersuits/Archwing/StealthJetPack/StealthJetPack'],
    note: {
      tldr: 'The utility Archwing — Itzal is the stealth-and-loot pick, though its old signature teleport is now shared by every Archwing.',
      points: [
        'Cosmic Crush vacuums in nearby enemies and pickups then detonates — handy for hoovering up loot in open-world flight and Railjack.',
        'Penumbra cloaks it for stealthy approaches, and Arch Line grapples to surfaces or yanks enemies for unconventional mobility.',
        'Blink — its famous instant teleport — was made a universal Archwing maneuver, so Itzal no longer has a monopoly on fast travel.',
        'It trades Amesha’s protection and Elytron’s firepower for evasion and utility, favored by players who want to dart in, grab, and go.',
      ],
      status: 'beta',
    },
  },

  // Ivara
  {
    keys: ['/Lotus/Powersuits/Ranger/Ranger', '/Lotus/Powersuits/Ranger/IvaraPrime'],
    note: {
      tldr: 'The stealth-and-theft archer — Ivara stays invisible, pickpockets enemies, and steers her shots for pinpoint kills.',
      points: [
        'Quiver swaps between four arrows: Cloak (an invisibility bubble), Sleep (stun), Noise (a lure), and Dashwire (a zipline) — a toolkit for Spy and stealth runs.',
        'Prowl keeps her invisible, boosts headshot damage, and automatically pickpockets loot from nearby enemies, but slows her and can break if she moves too fast (the Infiltrate augment fixes that).',
        'Navigator lets her fly and steer a single projectile, multiplying the damage of a sniper or bow shot for big single-target hits.',
        'Artemis Bow is her exalted bow for fanning out arrows; build Duration and Range to keep stealth and utility up.',
      ],
      status: 'beta',
    },
  },

  // Jade
  {
    keys: ['/Lotus/Powersuits/Choir/Choir'],
    note: {
      tldr: 'A winged support frame — Jade buffs the squad with rotating hymns, strips defenses from afar, and is the only frame with TWO aura slots.',
      points: [
        'Her standout perk is two aura mod slots, letting her run two squad auras at once for unmatched team-buff flexibility.',
        'Symphony of Mercy cycles three hymns — an Ability Strength buff, a weapon-damage buff, and shield resilience — so she adapts to whatever the squad needs.',
        'Ophanim Eyes slows enemies, strips their shields and armor, and revives downed allies from range, making it a strong Helminth pick too.',
        'Glory on High is a flight-based exalted weapon that tags enemies with a damage-vulnerability "Judgment" and detonates them; she is obtained from the Jade Shadows quest.',
      ],
      status: 'beta',
    },
  },

  // Khora
  {
    keys: ['/Lotus/Powersuits/Khora/Khora', '/Lotus/Powersuits/Khora/KhoraPrime'],
    note: {
      tldr: 'A farming and crowd-control favorite — Khora groups enemies, whips them all at once, and (with one augment) makes them rain loot.',
      points: [
        'Whipclaw is her main damage and scales with MELEE mods and your combo counter, not Ability Strength — a key build detail newer players miss.',
        'Ensnare bunches enemies together and Whipclaw spreads it further, so one whip can hit a whole clustered group for full damage.',
        'Venari, her kavat companion, has Attack, Protect, and Heal stances and gives a passive move-speed boost — she is a second pet that never takes a slot.',
        'Strangledome cages a crowd, and the Pilfering Strangledome augment makes caged enemies drop extra loot — the reason she is a go-to farming frame.',
      ],
      status: 'beta',
    },
  },

  // Koumei
  {
    keys: ['/Lotus/Powersuits/Koumei/Koumei'],
    note: {
      tldr: 'A luck-themed frame — Koumei rolls dice on her abilities, and higher rolls (or perfect ones) make the effects much stronger.',
      points: [
        'Her kit runs on RNG: abilities roll dice, and a top roll unlocks an enhanced version, so she rewards leaning into the randomness rather than fighting it.',
        'Omikuji sets a small challenge that, once met, grants a random Decree-style buff — a stacking power-up over a mission.',
        'Her passive periodically grants one of your weapons a guaranteed status effect, layering with the statuses her abilities scatter.',
        'Omamori provides a chance to shrug off damage while healing; her energy pool is small, so efficiency helps keep the dice rolling.',
      ],
      status: 'beta',
    },
  },

  // Lavos
  {
    keys: ['/Lotus/Powersuits/Alchemist/Alchemist', '/Lotus/Powersuits/Alchemist/LavosPrime'],
    note: {
      tldr: 'The alchemist with NO energy bar — Lavos runs on cooldowns instead, and energy mods and arcanes do nothing for him.',
      points: [
        'He has no energy, so Flow, Energy Siphon, Rage/Hunter Adrenaline, Quick Thinking, and Arcane Energize are all wasted — his abilities are on timers.',
        'Because of that, he is immune to energy-drain effects (like Parasitic Eximus), which makes him fantastic for energy-penalty Sorties and Nightmare runs.',
        'Hold any ability to imbue your NEXT cast with an extra element and status — he picks his damage type on the fly to match the enemy.',
        'Transmutation Probe shortens his cooldowns and turns pickups into universal ammo and orbs; he has very high armor, so he tanks well while you wait on timers.',
      ],
      status: 'beta',
    },
  },

  // Limbo
  {
    keys: ['/Lotus/Powersuits/Magician/Magician', '/Lotus/Powersuits/Magician/LimboPrime'],
    note: {
      tldr: 'The rift magician — Limbo can make a whole objective untouchable, or accidentally grief his own squad, depending on how carefully he is played.',
      points: [
        'Banish and Cataclysm move things into the Rift, a parallel plane where enemies outside can’t touch you — perfect for protecting a Defense target.',
        'Stasis freezes enemies AND their bullets inside the Rift, letting you set up kills at your leisure.',
        'The catch: banishing teammates or an objective can lock them out of shooting normal enemies, so sloppy Limbo play is the classic way to ruin a mission for the group.',
        'His passive rolls him in and out of the Rift and regenerates energy there; in Spy missions the Rift even lets him walk through laser barriers.',
      ],
      status: 'beta',
    },
  },

  // Loki
  {
    keys: ['/Lotus/Powersuits/Loki/Loki', '/Lotus/Powersuits/Loki/LokiPrime'],
    note: {
      tldr: 'The original trickster — Loki leans on long-duration invisibility and a disarm that turns gun-toting enemies into harmless melee.',
      points: [
        'Invisibility makes him a top stealth and Spy frame; Decoy pulls enemy fire and Switch Teleport swaps places with a target to escape or reposition.',
        'Radial Disarm strips enemies of their guns and forces them into melee — and his crowd control works even on Overguard-protected units.',
        'The Irradiating Disarm augment adds Radiation so disarmed enemies also turn on each other, a strong panic button for big crowds.',
        'He is fragile with no defensive ability, so he survives through stealth and positioning — his passive also lets him cling to walls far longer than normal.',
      ],
      status: 'beta',
    },
  },

  // Mag
  {
    keys: ['/Lotus/Powersuits/Mag/Mag', '/Lotus/Powersuits/Mag/MagPrime'],
    note: {
      tldr: 'A magnetic starter frame and Corpus specialist — Mag strips shields, vacuums loot, and turns enemy gunfire into a damage amplifier.',
      points: [
        'Magnetize wraps a target in a field that sucks in bullets and amplifies their damage before bursting — stacking multiple bubbles on one enemy multiplies the payoff.',
        'Polarize strips shields and armor and scatters shards, making her excellent against shield-heavy Corpus enemies.',
        'Crush suspends and crushes a crowd while restoring squad shields; the Fracturing Crush augment adds an armor strip on top.',
        'Her passive pulls nearby loot toward her on a bullet jump, and her low armor means you survive through her abilities, not by tanking.',
      ],
      status: 'beta',
    },
  },

  // Mesa
  {
    keys: ['/Lotus/Powersuits/Cowgirl/Cowgirl', '/Lotus/Powersuits/Cowgirl/MesaPrime'],
    note: {
      tldr: 'The gunslinger — Mesa’s Peacemaker auto-targets a room with exalted pistols, and Shatter Shield makes her nearly bulletproof.',
      points: [
        'Peacemaker summons exalted dual pistols that scale with your SECONDARY/pistol mods (not melee), but root her in place while firing — the Mesa’s Waltz augment lets her move.',
        'Shatter Shield reduces incoming gunfire dramatically and even reflects it; its strength scales with Ability Strength, so Strength protects and powers her at once.',
        'Shooting Gallery buffs weapon damage and jams nearby enemies’ guns, and is a popular Helminth pick for other frames.',
        'Her passive rewards skipping a melee weapon (+health) and speeds up sidearms — she is built to be a pure gun platform.',
      ],
      status: 'beta',
    },
  },

  // Mirage
  {
    keys: ['/Lotus/Powersuits/Harlequin/Harlequin', '/Lotus/Powersuits/Harlequin/MiragePrime'],
    note: {
      tldr: 'A trickster who multiplies your guns — Mirage’s clones each fire your weapon, and Eclipse can nearly double your damage if you mind the lighting.',
      points: [
        'Hall of Mirrors spawns clones that each deal a share of your weapon’s damage, so a strong primary or secondary becomes several at once — weapon choice is everything.',
        'Eclipse buffs your weapon damage in bright light and gives damage reduction in shadow; the light-level dependence is the classic gotcha to learn (and one of the best Helminth subsumes).',
        'Prism floats out a light beam that blinds enemies and then bursts for area damage, doubling as crowd control.',
        'Her passive makes her slides and acrobatics faster and longer — she is a mobile DPS frame that lives and dies by her weapon mods.',
      ],
      status: 'beta',
    },
  },

  // Nekros
  {
    keys: ['/Lotus/Powersuits/Necro/Necro', '/Lotus/Powersuits/Necro/NekrosPrime'],
    note: {
      tldr: 'The loot necromancer — Nekros doubles drops from corpses and raises slain enemies to fight for him.',
      points: [
        'Desecrate consumes nearby corpses for extra loot and Health Orbs — the reason a Nekros is welcomed on almost every farming squad.',
        'The Despoil augment makes Desecrate cost health instead of energy; pair it with Equilibrium (orbs into energy) for a self-sustaining loop you can spam forever.',
        'Terrify sends enemies fleeing while stripping their armor, a strong pick to subsume onto other frames too.',
        'Shadows of the Dead raises a squad of dead enemies as minions; he has low armor, so he leans on those distractions and orb healing.',
      ],
      status: 'beta',
    },
  },

  // Nokko
  {
    keys: ['/Lotus/Powersuits/Nokko/Nokko'],
    note: {
      tldr: 'A mushroom-colony frame — Nokko seeds the field with spores that spread Viral, sleep, and buffs, then keeps them alive by bouncing a mushroom around.',
      points: [
        'Sporespring fires a bouncing Toxin mushroom; each bounce off enemies and other mushrooms refreshes and speeds up his other spore abilities — managing the colony is the gameplay.',
        'Stinkbrain pulses Viral and Sleep onto nearby enemies, while Brightbonnet buffs Ability Strength and restores ally energy (a handy Helminth pick).',
        'Reroot turns him into an invulnerable little Sprodling that heals and shields while dropping speed pickups — a built-in panic button.',
        'His passive lets him revert to a Sprodling on a lethal hit and crawl back to a glowing mushroom to self-revive.',
      ],
      status: 'beta',
    },
  },

  // Nyx
  {
    keys: ['/Lotus/Powersuits/Jade/Jade', '/Lotus/Powersuits/Jade/NyxPrime'],
    note: {
      tldr: 'A psychic crowd-controller — Nyx turns enemies against each other with Chaos and peels their defenses with Psychic Bolts.',
      points: [
        'Psychic Bolts strip armor and shields from a group (and even steal a bit for her), which is the modern reason to bring her into high-level content.',
        'Chaos confuses a whole crowd into fighting one another, a strong panic-button crowd control; Mind Control turns one enemy into a buffed bodyguard.',
        'Her passive grants bonus weapon critical chance for each confused enemy nearby, rewarding keeping Chaos up.',
        'Absorb makes her invulnerable while she soaks damage to release it as a blast — the Assimilate augment lets her walk around while doing it.',
      ],
      status: 'beta',
    },
  },

  // Oberon
  {
    keys: ['/Lotus/Powersuits/Paladin/Paladin', '/Lotus/Powersuits/Paladin/PaladinPrime'],
    note: {
      tldr: 'The do-everything paladin — Oberon heals the squad, strips armor, and cleanses status, making him a reliable budget pick for almost any mission.',
      points: [
        'Renewal pours out healing, an armor buff, and a longer revive timer to the whole squad, his core support tool.',
        'Reckoning and Smite both strip enemy armor (Smite also handles Overguard), so he provides damage-enabling strips without a dedicated build.',
        'Hallowed Ground lays a Radiation carpet that cleanses allies of status and makes Reckoning hit harder — the two synergize.',
        'His passive turns picked-up orbs into brief team invulnerability, and he is famously easy to acquire, making him a great early all-rounder.',
      ],
      status: 'beta',
    },
  },

  // Odonata (Archwing, + Prime)
  {
    keys: [
      '/Lotus/Powersuits/Archwing/StandardJetPack/StandardJetPack',
      '/Lotus/Powersuits/Archwing/PrimeJetPack/PrimeJetPack',
    ],
    note: {
      tldr: 'The starter Archwing — Odonata is the balanced, do-a-bit-of-everything wing you unlock from The Archwing quest.',
      points: [
        'Energy Shell throws up a barrier that blocks fire and boosts the damage of shots passing through it; Seeking Fire answers back with homing missiles.',
        'Disarray drops flares to shoot down incoming missiles, and Repel knocks surrounding enemies away when you need breathing room.',
        'It splits the difference between Amesha’s protection, Itzal’s mobility, and Elytron’s firepower — a fine generalist while you decide which specialist to build.',
        'You get it during The Archwing quest, so it is most players’ first taste of space combat.',
      ],
      status: 'beta',
    },
  },

  // Oraxia
  {
    keys: ['/Lotus/Powersuits/Oraxia/Oraxia'],
    note: {
      tldr: 'A spider predator — Oraxia stalks from invisibility, laces her guns with Toxin, executes the weak, and spawns broodlings from the dead.',
      points: [
        'Silken Stride grants status immunity and bonus health and coats your primary and secondary with Toxin so enemies they kill explode; it also swaps your roll for a silk dash.',
        'Her passive cloaks her in invisibility whenever she wall-latches, setting up ambushes and repositioning.',
        'Mercy’s Kiss lunges in to instantly finish low-health enemies and drops Health and Energy orbs, while Webbed Embrace snares a group and makes them take more damage (a solid Helminth pick).',
        'Widow’s Brood marks enemies with toxin darts so their deaths spawn friendly Scuttlers — her kill-driven swarm loop.',
      ],
      status: 'beta',
    },
  },

  // Protea
  {
    keys: ['/Lotus/Powersuits/Odalisk/Odalisk', '/Lotus/Powersuits/Odalisk/ProteaPrime'],
    note: {
      tldr: 'A self-sufficient gadgeteer — Protea drops turrets, grenades, and supply caches, and can literally rewind time to undo a death.',
      points: [
        'Dispensary spits out health, energy, and ammo pickups on a timer — it is one of the single most popular Helminth subsumes in the game for keeping any frame fueled.',
        'Blaze Artillery is a Heat turret that grows stronger the longer it fires, and Grenade Fan can throw shield satellites that feed shield-gating survival.',
        'Temporal Anchor stores the damage you take, then rewinds you to where you cast it with full health and unleashes the stored damage — a built-in second chance.',
        'Her passive grants +100% Ability Strength on every fourth ability cast, which lines up perfectly with detonating Temporal Anchor.',
      ],
      status: 'beta',
    },
  },

  // Qorvex
  {
    keys: ['/Lotus/Powersuits/ConcreteFrame/ConcreteFrame'],
    note: {
      tldr: 'A brutalist radiation tank — Qorvex blankets enemies in Radiation status, herds them with concrete walls, and soaks hits behind huge armor.',
      points: [
        'His whole kit stacks Radiation status: Chyrinka Pillar pulses it, Crucible Blast beams it, and Radiation-afflicted enemies detonate when his beam touches them.',
        'Containment Wall slams two walls together to bunch enemies up and make them take extra damage — his main setup tool.',
        'Disometric Guard surrounds him with plates that block status effects and rebuild as Radiation-status enemies die, keeping him sturdy.',
        'He has the second-highest base armor of any frame and grants weapons punch-through, so he plays as a tanky crowd-controller; build Strength and Range.',
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
