/**
 * CelestialWireframe — LOW-FI, DEV-ONLY click-through of the re-planned
 * Celestial Pendulum hub. Grey boxes + labels + data-source tags; no real data
 * or final styling. Purpose: feel the IA + the detail-page layouts/interactions
 * before building. Mounted behind a dev toggle (import.meta.env.DEV).
 *
 * Data-source legend: live = live worldstate · codex = needs codex · curated =
 * hand-maintained ⚠ · track = user completion/ownership.
 */

import { useState } from 'react';
import { PageHero } from '@/components/ui/PageHero';
import styles from './CelestialWireframe.module.css';

type Src = 'live' | 'codex' | 'curated' | 'track';
type TabKey = 'overview' | 'worlds' | 'activities' | 'nightwave' | 'market' | 'events';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview',   label: 'Overview' },
  { key: 'worlds',     label: 'Worlds' },
  { key: 'activities', label: 'Activities' },
  { key: 'nightwave',  label: 'Nightwave' },
  { key: 'market',     label: 'Vendors & Syndicates' },
  { key: 'events',     label: 'Events' },
];

const SRC_LABEL: Record<Src, string> = { live: 'live worldstate', codex: 'codex', curated: 'curated ⚠', track: 'tracking' };
const Tags = ({ src }: { src: Src[] }) => (
  <div className={styles.tags}>{src.map((s) => <span key={s} className={styles.tag} data-src={s}>{SRC_LABEL[s]}</span>)}</div>
);
function Box({ label, sub, src, onClick }: { label: string; sub?: string; src?: Src[]; onClick?: () => void }) {
  return (
    <div className={styles.box} data-click={onClick ? '' : undefined} onClick={onClick}>
      <span className={styles.boxLabel}>{label}</span>
      {sub && <span className={styles.boxSub}>{sub}</span>}
      {src && <Tags src={src} />}
    </div>
  );
}
function Section({ label, lead, children }: { label: string; lead?: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>{label}</div>
      {lead && <p className={styles.lead}>{lead}</p>}
      {children}
    </div>
  );
}

// ── Mock app-wide header ──────────────────────────────────────────────────────
const HEADER_WORLDS = [
  { id: 'cetus',   label: 'Cetus',   t: '33m', prime: false },
  { id: 'vallis',  label: 'Fortuna', t: '2m',  prime: false },
  { id: 'cambion', label: 'Deimos',  t: '33m', prime: true },
];
function HeaderPills({ onDailies, dailiesOpen }: { onDailies: () => void; dailiesOpen: boolean }) {
  return (
    <div className={styles.pills}>
      <span className={styles.pillsTag}>app-wide header →</span>
      {HEADER_WORLDS.map((w) => (
        <span key={w.id} className={styles.pill} data-prime={w.prime || undefined} title={w.label}>
          <span className={styles.pillDot} />{w.label} <em>{w.t}</em>
        </span>
      ))}
      <span className={styles.baro}>◆ Baro 8d</span>
      <span
        className={styles.baro}
        style={{ marginLeft: 6, color: dailiesOpen ? 'var(--color-bg-primary)' : 'var(--color-accent-jade)', background: dailiesOpen ? 'var(--color-accent-jade)' : 'transparent', borderColor: 'color-mix(in oklab, var(--color-accent-jade) 35%, transparent)' }}
        onClick={onDailies}
      >
        ◷ Dailies / Weeklies
      </span>
    </div>
  );
}

// ── Dailies & Weeklies = app-wide header panel (the tracker) ──────────────────
const DAILY = [
  { t: 'Sortie', meta: '3 missions' }, { t: 'Archon Hunt (this week)', meta: 'shard' },
  { t: 'Syndicate dailies ×6', meta: 'standing cap' }, { t: 'Nightwave dailies', meta: '3 acts' },
  { t: 'Teshin / Steel Path', meta: 'Steel Essence' },
];
const WEEKLY = [
  { t: 'Nightwave weeklies', meta: '7 acts' }, { t: 'Netracell ×5', meta: 'arcanes' },
  { t: 'Deep/Temporal Archimedea', meta: 'research' }, { t: "Kahl's Garrison", meta: 'Stock' },
  { t: 'Circuit (Duviri)', meta: 'Incarnon' },
];
function DailiesPanel({ onClose }: { onClose: () => void }) {
  const [done, setDone] = useState<Set<string>>(new Set(['Archon Hunt (this week)', "Kahl's Garrison"]));
  const toggle = (t: string) => setDone((prev) => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
  const total = DAILY.length + WEEKLY.length;
  const Row = ({ t, meta }: { t: string; meta: string }) => (
    <div className={styles.checkRow} data-done={done.has(t) || undefined} onClick={() => toggle(t)}>
      <span className={styles.check} data-done={done.has(t) || undefined}>{done.has(t) ? '✓' : ''}</span>
      {t}<span className={styles.checkMeta}>{meta}</span>
    </div>
  );
  return (
    <div className={styles.flyout} style={{ marginBottom: 16 }}>
      <div className={styles.flyoutHead}>
        <span className={styles.boxLabel}>Dailies &amp; Weeklies — app-wide tracker panel</span>
        <button className={styles.chip} onClick={onClose}>close</button>
      </div>
      <p className={styles.boxSub}>Opens from the header on ANY page. Pulls live state from the detail tabs; tick things off here (try it). Later: rewards / streaks for completion.</p>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0', flexWrap: 'wrap' }}>
        <span className={styles.resetChip}>◷ Daily reset 6h 12m</span>
        <span className={styles.resetChip}>◷ Weekly reset 2d 6h</span>
        <span className={styles.resetChip} style={{ marginLeft: 'auto' }}>{done.size} / {total} done</span>
      </div>
      <div className={`${styles.grid} ${styles.cols2}`}>
        <div><div className={styles.colHead}>Daily</div>{DAILY.map((d) => <Row key={d.t} {...d} />)}</div>
        <div><div className={styles.colHead}>Weekly</div>{WEEKLY.map((d) => <Row key={d.t} {...d} />)}</div>
      </div>
      <div style={{ marginTop: 10 }}><Tags src={['live', 'track']} /></div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function OverviewTab() {
  return (
    <Section label="Overview — only the most important need-to-know" lead="Built LAST. NOT the tracker (that's the header panel). A tight at-a-glance dashboard; only links once the other tabs exist.">
      <div className={`${styles.grid} ${styles.cols2}`}>
        <Box label="Open now" sub="Active prime windows — mirror of the header pulse." src={['live']} />
        <Box label="Today's high-value" sub="Sortie + Archon Hunt → Activities." src={['live']} />
        <Box label="Active event (if any)" sub="Shows only when an event is live." src={['live']} />
        <Box label="Baro / arriving traders" sub="Countdown + 'here now' → Vendors." src={['live']} />
      </div>
    </Section>
  );
}

const WORLD_FACETS = ['Cetus', 'Fortuna', 'Deimos', 'Zariman', 'Duviri', 'Sanctum', 'Höllvania'];
function WorldsTab() {
  const [place, setPlace] = useState('Cetus');
  return (
    <>
      <div className={styles.chips}>
        {WORLD_FACETS.map((p) => <button key={p} className={styles.chip} data-active={p === place || undefined} onClick={() => setPlace(p)}>{p}</button>)}
      </div>
      <Section label={`${place} — live`} lead="No big hero block (the header pills carry the timer). A slim live strip, then the deep dossier.">
        <div className={`${styles.grid} ${styles.cols3}`}>
          <Box label="State + clock (slim)" sub="Current state, countdown, key resources." src={['live']} />
          <Box label="Cycle forecast" sub="Dated upcoming windows + a lazy 'Next 6 hours' glance." src={['live']} />
          <Box label="Conservation / mining" sub="What this place offers (reference)." src={['codex', 'curated']} />
        </div>
      </Section>
      <Section label={`${place} — bounties`} lead="Per-stage reward tables. DIM tiles; click → drop detail (same pattern as Vendors).">
        <div className={`${styles.grid} ${styles.colsTiles}`}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.tile}>reward {i + 1}</div>)}</div>
        <div style={{ marginTop: 8 }}><Tags src={['live', 'codex']} /></div>
      </Section>
      <Section label={`${place} — fishing`} lead="Fish by current state; rare-fish 'next window' ties to the forecast.">
        <Box label="Fishing table (by state)" sub="Fish · where · spear · cycle state. ⚠ likely needs a curated fish dataset — confirm a low-maintenance source first." src={['curated', 'codex']} />
      </Section>
    </>
  );
}

function ActivitiesTab() {
  return (
    <Section label="Activities — live rotating missions" lead="Everything that rotates on the world clock, moved from Solar Rail Feed.">
      <div className={`${styles.grid} ${styles.cols2}`}>
        <Box label="Alerts" sub="Active alerts + rewards + timers." src={['live']} />
        <div className={styles.box}>
          <span className={styles.boxLabel}>Invasions (with progress)</span>
          <span className={styles.boxSub}>Grineer vs Corpus · reward · live %.</span>
          <div className={styles.bar}><div className={styles.barFill} /></div>
          <div className={styles.bar} style={{ marginTop: 4 }}><div className={styles.barFill} style={{ width: '38%' }} /></div>
          <Tags src={['live', 'codex']} />
        </div>
        <Box label="Sortie" sub="3 missions, modifiers, boss, reward pool." src={['live', 'codex']} />
        <Box label="Archon Hunt" sub="Weekly Archon, 3 missions + shard." src={['live', 'codex']} />
        <Box label="Arbitration" sub="Current node + rotation." src={['live']} />
        <Box label="Persistent enemies" sub="Acolytes / Zariman Angels." src={['live']} />
      </div>
    </Section>
  );
}

function NightwaveTab() {
  return (
    <Section label="Nightwave — battle-pass style" lead="Mirrors the in-game Nightwave: a tier ladder you progress, this week's acts feed it, and the Cred shop.">
      <div className={styles.box} style={{ marginBottom: 12 }}>
        <span className={styles.boxLabel}>Rank ladder (battle-pass tiers)</span>
        <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} style={{ width: 30, height: 30, borderRadius: 6, border: '1px dashed var(--color-border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--color-text-muted)', background: i < 6 ? 'color-mix(in oklab, var(--color-accent-jade) 14%, transparent)' : 'transparent' }}>{i + 1}</div>
          ))}
        </div>
        <div className={styles.meter} style={{ marginTop: 10 }}><div className={styles.meterFill} style={{ width: '34%' }} /></div>
        <span className={styles.boxSub} style={{ marginTop: 4 }}>Rank 6 · 3,400 / 10,000 to next</span>
        <Tags src={['live', 'track']} />
      </div>
      <div className={`${styles.grid} ${styles.cols2}`}>
        <Box label="This week's acts" sub="Daily + weekly challenges with standing; tick off (feeds header tracker)." src={['live', 'track']} />
        <Box label="Cred offerings" sub="Nora's shop — DIM tiles + cost detail." src={['live', 'codex']} />
      </div>
    </Section>
  );
}

const MARKET_CATS = ['Traders', 'Syndicates', 'Event vendors'] as const;
const SYNDICATES = ['Steel Meridian', 'Arbiters of Hexis', 'Cephalon Suda', 'The Perrin Sequence', 'Red Veil', 'New Loka', 'Ostron', 'Solaris United', 'Entrati', 'The Holdfasts', 'Cavia', 'The Hex'];
const MARKET_SECTIONS = ['Offerings', 'Augments', 'Ranks'] as const;
const AUG_FRAMES = ['Ash', 'Banshee', 'Excalibur', 'Frost'];

function MarketTab() {
  const [cat, setCat] = useState<(typeof MARKET_CATS)[number]>('Syndicates');
  const [entity, setEntity] = useState('Steel Meridian');
  const [sec, setSec] = useState<(typeof MARKET_SECTIONS)[number]>('Offerings');
  const [openItem, setOpenItem] = useState<number | null>(null);
  const isSynd = cat === 'Syndicates';
  const entities = isSynd ? SYNDICATES : cat === 'Traders' ? ["Baro Ki'Teer", 'Teshin (Steel Path)', 'Cephalon Simaris', 'Iron Wake'] : ['Plague Star', 'Operation Supply', 'Thermia Fractures'];

  return (
    <Section label="Vendors & Syndicates — merged, smart nav + detail pages" lead="Syndicates ARE vendors, so they live together. Category → entity → detail PAGE. Syndicate pages are extensive (ranks, Warframe Augments, offerings) so each gets its own page with sub-sections. DIM tiles; rotation A/B/C; click → cost or per-stage drop rates. Goal: every vendor + faction.">
      <div className={styles.chips}>
        {MARKET_CATS.map((c) => <button key={c} className={styles.chip} data-active={c === cat || undefined} onClick={() => { setCat(c); setEntity((c === 'Syndicates' ? SYNDICATES : c === 'Traders' ? ["Baro Ki'Teer"] : ['Plague Star'])[0]); setSec('Offerings'); }}>{c}</button>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {entities.map((e) => <button key={e} className={styles.chip} data-active={e === entity || undefined} style={{ textAlign: 'left', textTransform: 'none', letterSpacing: 0 }} onClick={() => setEntity(e)}>{e}</button>)}
        </div>

        <div>
          <div className={styles.boxLabel} style={{ marginBottom: 8 }}>{entity} — detail page</div>

          {isSynd && (
            <div className={styles.box} style={{ marginBottom: 12 }}>
              <span className={styles.boxSub}>Your standing</span>
              <div className={styles.meter}><div className={styles.meterFill} style={{ width: '62%' }} /></div>
              <span className={styles.boxSub} style={{ marginTop: 4 }}>Rank 3 (Believer) · 28,000 / 44,000 to next</span>
            </div>
          )}

          {/* sub-section nav within the detail page (the "smart nav") */}
          {isSynd && (
            <div className={styles.subTabs}>
              {MARKET_SECTIONS.map((s) => <button key={s} className={styles.subTab} data-active={s === sec || undefined} onClick={() => setSec(s)}>{s}</button>)}
            </div>
          )}

          {isSynd && sec === 'Ranks' ? (
            <div className={styles.box}>
              <span className={styles.boxSub}>Rank ladder · standing thresholds · rank-up sacrifices</span>
              {['Neutral · 0', 'Neophyte · +5,000', 'Disciple · +22,000', 'Believer · +44,000', 'Maxim · +70,000', 'Genius · +99,000'].map((r) => (
                <div key={r} className={styles.dropRow}><span>{r.split(' · ')[0]}</span><span className={styles.dropRuns}>sacrifice: medallions / item</span><span className={styles.dropPct}>{r.split(' · ')[1]}</span></div>
              ))}
              <Tags src={['curated', 'track']} />
            </div>
          ) : isSynd && sec === 'Augments' ? (
            <div>
              <span className={styles.boxSub}>Warframe Augment mods grouped by frame — the extensive part of a syndicate page.</span>
              {AUG_FRAMES.map((f) => (
                <div key={f}>
                  <div className={styles.augGroup}>{f}</div>
                  <div className={`${styles.grid} ${styles.colsTiles}`}>{Array.from({ length: 3 }).map((_, i) => <div key={i} className={styles.tile} onClick={() => setOpenItem(i)}>{f} aug {i + 1}</div>)}</div>
                </div>
              ))}
              <div style={{ marginTop: 8 }}><Tags src={['codex', 'curated']} /></div>
            </div>
          ) : (
            <>
              <span className={styles.boxSub} style={{ marginBottom: 6, display: 'block' }}>Offerings (mods · arcanes · weapons · cosmetics)</span>
              <div className={`${styles.grid} ${styles.colsTiles}`}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={styles.tile} onClick={() => setOpenItem(i)}>{i % 3 === 0 && <span className={styles.tileRot}>A·C</span>}item {i + 1}</div>
                ))}
              </div>
              <div style={{ marginTop: 8 }}><Tags src={['codex', 'curated']} /></div>
            </>
          )}

          {openItem !== null && (
            <div className={styles.flyout}>
              <div className={styles.flyoutHead}>
                <span className={styles.boxLabel}>Item {openItem + 1} — detail</span>
                <button className={styles.chip} onClick={() => setOpenItem(null)}>close</button>
              </div>
              <p className={styles.boxSub}>Purchasable → standing/ducat cost + what it is. Drop-based → per-stage chances so you know your runs. (Mods shown DIM-style: image alone reads it; click to enlarge.)</p>
              {[
                { stage: 'Stage 1 · Rot A', pct: '12.50%', runs: '~8 runs' },
                { stage: 'Stage 2 · Rot B', pct: '8.33%', runs: '~12 runs' },
                { stage: 'Final · Rot C', pct: '6.00%', runs: '~17 runs' },
              ].map((r) => <div key={r.stage} className={styles.dropRow}><span>{r.stage}</span><span className={styles.dropRuns}>expected {r.runs}</span><span className={styles.dropPct}>{r.pct}</span></div>)}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function EventsTab({ mock, setMock }: { mock: boolean; setMock: (v: boolean) => void }) {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <button className={styles.devToggle} data-on={mock || undefined} onClick={() => setMock(!mock)}>
          {mock ? '● DEV: Plague Star ACTIVE (simulated)' : '○ DEV: simulate Plague Star active'}
        </button>
      </div>
      {mock ? (
        <Section label="Operation: Plague Star — ACTIVE" lead="When live, an event surfaces like any timed activity (timer, how-to, offerings) AND flags on the header + Overview. The dev switch builds/previews this with no live event; stripped from the live build.">
          <div className={styles.box} style={{ marginBottom: 12 }}>
            <span className={styles.boxLabel}>Operational standing</span>
            <div className={styles.meter}><div className={styles.meterFill} style={{ width: '45%' }} /></div>
            <span className={styles.boxSub} style={{ marginTop: 4 }}>Ends in 6d 4h · earn standing → spend on offerings below</span>
            <Tags src={['live']} />
          </div>
          <div className={`${styles.grid} ${styles.cols2}`}>
            <Box label="Offerings (event vendor)" sub="Plague mods, arcanes, cosmetics as DIM tiles → cost detail." src={['codex', 'curated']} />
            <Box label="How-to / GIF slot" sub="Short cheap GIF explaining the run (added later)." src={['curated']} />
          </div>
        </Section>
      ) : (
        <>
          <div className={styles.empty} style={{ marginBottom: 16 }}>
            <span className={styles.boxLabel}>No event active</span>
            <span className={styles.boxSub}>Events are intermittent. Use the dev switch above to preview the active look.</span>
          </div>
          <Section label="Recurring events — reference index" lead="When nothing is live, we still index the known recurring events + their offerings so you can plan.">
            <div className={`${styles.grid} ${styles.cols2}`}>
              {[
                { t: 'Plague Star', m: 'Returns periodically · ~2 weeks · Plague mods, arcanes' },
                { t: 'Operation: Scarlet Spear', m: 'Past op · Arcanes via Stalker/Crewman standing' },
                { t: 'Thermia Fractures', m: 'Recurring · Vallis · Exploiter Orb cosmetics' },
                { t: 'Operation: Belly of the Beast', m: 'Past op · Reference only' },
              ].map((e) => <Box key={e.t} label={e.t} sub={e.m} src={['codex', 'curated']} />)}
            </div>
          </Section>
        </>
      )}
    </>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────
export function CelestialWireframe() {
  const [tab, setTab] = useState<TabKey>('market');
  const [plagueStar, setPlagueStar] = useState(false);
  const [dailiesOpen, setDailiesOpen] = useState(false);

  return (
    <div className={styles.wf}>
      <div className={styles.banner}>⚠ LOW-FI WIREFRAME (dev-only) — structure &amp; placement, not final design. Tags show data source per box.</div>
      <PageHero prefix="CELESTIAL" title="PENDULUM" />
      <HeaderPills onDailies={() => setDailiesOpen((v) => !v)} dailiesOpen={dailiesOpen} />
      {dailiesOpen && <DailiesPanel onClose={() => setDailiesOpen(false)} />}

      <div className={styles.tabs} role="tablist" aria-label="Celestial sections">
        {TABS.map((t) => <button key={t.key} role="tab" aria-selected={t.key === tab} className={styles.tab} data-active={t.key === tab || undefined} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {tab === 'overview'   && <OverviewTab />}
      {tab === 'worlds'     && <WorldsTab />}
      {tab === 'activities' && <ActivitiesTab />}
      {tab === 'nightwave'  && <NightwaveTab />}
      {tab === 'market'     && <MarketTab />}
      {tab === 'events'     && <EventsTab mock={plagueStar} setMock={setPlagueStar} />}
    </div>
  );
}
