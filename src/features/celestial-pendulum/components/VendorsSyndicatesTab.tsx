/**
 * VendorsSyndicatesTab — the merged "Vendors & Syndicates" hub tab.
 *
 * DIM-style index: CATEGORY (Traders / Syndicates / Event vendors) → ENTITY
 * (left column) → DETAIL PAGE (right column). Structure mirrors the low-fi
 * `MarketTab` blueprint in wireframe/CelestialWireframe.tsx, built for real.
 *
 * LIVE vs STUBBED — an honesty contract:
 *   • LIVE — only Baro Ki'Teer's REAL inventory, sourced from worldstate
 *     (`ws.baro`). When he's at_location with inventory we render real tiles
 *     (name + "<ducats> Ducats · <credits> cr") and a "leaves in X" countdown.
 *     in_transit → "arrives in X at <location>".
 *   • STUBBED — every other trader, all syndicates, and event vendors render
 *     honest "curated — coming" notes. We NEVER fabricate an item, price,
 *     standing, rank, augment, or drop-rate. The detail flyout still opens
 *     from a placeholder tile to demonstrate the interaction pattern, but it
 *     shows a muted "curated — coming" message, not fake percentages.
 *
 * All styling lives in VendorsSyndicatesTab.module.css (tokens only).
 */

import { memo, useMemo, useState } from 'react';
import { useWorldstate }   from '@/hooks/useWorldstate';
import { useGameClock }    from '@/hooks/useGameClock';
import { formatMsHuman }   from '@/core/services/cycleService';
import type { BaroInfo, BaroItem } from '@/core/domain/tennoplanApi';
import styles from './VendorsSyndicatesTab.module.css';

// ── Static index (NAMES ONLY — no fabricated catalog data) ──────────────────
type Category = 'traders' | 'syndicates' | 'events';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'traders',    label: 'Traders' },
  { key: 'syndicates', label: 'Syndicates' },
  { key: 'events',     label: 'Event vendors' },
];

/** The void trader — his id flags the one live detail page. */
const BARO_ID = 'baro';

const TRADERS: { id: string; name: string }[] = [
  { id: BARO_ID,   name: "Baro Ki'Teer" },
  { id: 'teshin',  name: 'Teshin · Steel Path' },
  { id: 'simaris', name: 'Cephalon Simaris' },
  { id: 'palladino', name: 'Iron Wake · Palladino' },
];

const SYNDICATES: { id: string; name: string }[] = [
  { id: 'steel-meridian', name: 'Steel Meridian' },
  { id: 'arbiters',       name: 'Arbiters of Hexis' },
  { id: 'suda',           name: 'Cephalon Suda' },
  { id: 'perrin',         name: 'The Perrin Sequence' },
  { id: 'red-veil',       name: 'Red Veil' },
  { id: 'new-loka',       name: 'New Loka' },
  { id: 'ostron',         name: 'Ostron' },
  { id: 'solaris',        name: 'Solaris United' },
  { id: 'entrati',        name: 'Entrati' },
  { id: 'holdfasts',      name: 'The Holdfasts' },
  { id: 'cavia',          name: 'Cavia' },
  { id: 'hex',            name: 'The Hex' },
];

const EVENT_VENDORS: { id: string; name: string }[] = [
  { id: 'plague-star',    name: 'Plague Star' },
  { id: 'supply',         name: 'Operation Supply' },
  { id: 'thermia',        name: 'Thermia Fractures' },
];

type SyndicateSection = 'offerings' | 'augments' | 'ranks';
const SYNDICATE_SECTIONS: { key: SyndicateSection; label: string }[] = [
  { key: 'offerings', label: 'Offerings' },
  { key: 'augments',  label: 'Augments' },
  { key: 'ranks',     label: 'Ranks' },
];

const ROTATION_TAGS = ['A', 'B', 'C'] as const;

// ── Component ───────────────────────────────────────────────────────────────
function VendorsSyndicatesTabImpl() {
  const { data: ws } = useWorldstate();
  const now = useGameClock();

  const [category, setCategory]   = useState<Category>('traders');
  const [entityId, setEntityId]   = useState<string>(BARO_ID);
  const [section, setSection]     = useState<SyndicateSection>('offerings');
  const [openTile, setOpenTile]   = useState<number | null>(null);

  const entities = useMemo(() => {
    switch (category) {
      case 'traders':    return TRADERS;
      case 'syndicates': return SYNDICATES;
      case 'events':     return EVENT_VENDORS;
    }
  }, [category]);

  const entity = useMemo(
    () => entities.find((e) => e.id === entityId) ?? entities[0],
    [entities, entityId],
  );

  const baro: BaroInfo | null = ws?.baro ?? null;

  function selectCategory(next: Category) {
    setCategory(next);
    const list = next === 'traders' ? TRADERS : next === 'syndicates' ? SYNDICATES : EVENT_VENDORS;
    setEntityId(list[0].id);
    setSection('offerings');
    setOpenTile(null);
  }

  function selectEntity(id: string) {
    setEntityId(id);
    setSection('offerings');
    setOpenTile(null);
  }

  return (
    <div className={styles.root}>
      {/* ── Category nav (chips) ──────────────────────────────────────── */}
      <div className={styles.catNav} role="tablist" aria-label="Vendor categories">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={c.key === category}
            className={styles.catChip}
            data-active={c.key === category || undefined}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => selectCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ── Two-column shell: entity list + detail page ───────────────── */}
      <div className={styles.shell}>
        <div className={styles.entityList} role="tablist" aria-label="Entities">
          {entities.map((e) => (
            <button
              key={e.id}
              type="button"
              role="tab"
              aria-selected={e.id === entity.id}
              className={styles.entityItem}
              data-active={e.id === entity.id || undefined}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => selectEntity(e.id)}
            >
              {e.name}
            </button>
          ))}
        </div>

        <div className={styles.detail} key={`${category}:${entity.id}`} role="tabpanel">
          {category === 'traders' && entity.id === BARO_ID ? (
            <BaroDetail baro={baro} now={now} openTile={openTile} setOpenTile={setOpenTile} entityName={entity.name} />
          ) : category === 'traders' ? (
            <TraderStub name={entity.name} />
          ) : category === 'syndicates' ? (
            <SyndicateDetail
              name={entity.name}
              section={section}
              setSection={setSection}
              openTile={openTile}
              setOpenTile={setOpenTile}
            />
          ) : (
            <EventVendorStub name={entity.name} />
          )}
        </div>
      </div>

      {/* ── Honest overall maintenance note ───────────────────────────── */}
      <div className={styles.maintenance}>
        <p className={styles.maintenanceText}>
          Only Baro Ki&apos;Teer is live today — sourced from worldstate. Full vendor and syndicate
          catalogs (offerings, Warframe augments, rank ladders, per-stage drop rates) need a curated
          codex source we haven&apos;t wired yet. Those pages are honest placeholders until then.
        </p>
      </div>
    </div>
  );
}

// ── Baro Ki'Teer — the ONE live detail page ─────────────────────────────────
function BaroDetail({
  baro, now, openTile, setOpenTile, entityName,
}: {
  baro: BaroInfo | null;
  now: number;
  openTile: number | null;
  setOpenTile: (i: number | null) => void;
  entityName: string;
}) {
  const inventory: BaroItem[] = baro?.inventory ?? [];
  const isHere = baro?.presence === 'at_location';

  // Countdown derives from the real arrival/departure fields.
  const departMs = baro?.departureTime != null ? Math.max(0, baro.departureTime - now) : null;
  const arriveMs = baro?.arrivalTime   != null ? Math.max(0, baro.arrivalTime   - now) : null;

  const openItem = openTile != null ? inventory[openTile] ?? null : null;

  return (
    <>
      <div className={styles.detailHead}>
        <h3 className={styles.detailTitle}>{entityName}</h3>
        {baro == null ? (
          <span className={`${styles.detailKind} ${styles.muted}`}>Schedule not loaded</span>
        ) : isHere ? (
          <span className={styles.liveChip}>
            <span className={styles.liveDot} />
            {departMs != null ? `Leaves in ${formatMsHuman(departMs)}` : 'At relay now'}
          </span>
        ) : (
          <span className={`${styles.liveChip} ${styles.transitChip}`}>
            <span className={styles.liveDot} />
            {arriveMs != null ? `Arrives in ${formatMsHuman(arriveMs)}` : 'In transit'}
            {baro?.location ? ` · ${baro.location}` : ''}
          </span>
        )}
      </div>

      {baro == null ? (
        <div className={styles.card}>
          <p className={styles.cardNote}>
            Baro&apos;s schedule isn&apos;t in the current worldstate snapshot. It refreshes
            automatically in the background.
          </p>
        </div>
      ) : !isHere ? (
        <div className={styles.card}>
          <p className={styles.cardNote}>
            The Void Trader is travelling{baro.location ? ` to ${baro.location}` : ''}. His full
            inventory — names, Ducat and credit costs — appears here the moment he lands. This is
            the one live catalog in this tab.
          </p>
        </div>
      ) : inventory.length === 0 ? (
        <div className={styles.card}>
          <p className={styles.cardNote}>
            Baro is at the relay, but the snapshot hasn&apos;t carried his inventory yet. It fills
            in on the next worldstate refresh.
          </p>
        </div>
      ) : (
        <>
          <span className="typo-section-label">Live inventory · {inventory.length} items</span>
          <div className={styles.tilesGrid}>
            {inventory.map((item, i) => (
              <button
                key={`${item.name}-${i}`}
                type="button"
                className={styles.tile}
                data-active={openTile === i || undefined}
                onClick={() => setOpenTile(openTile === i ? null : i)}
              >
                <span className={styles.tileThumb} aria-hidden="true" />
                <span className={styles.tileName}>{item.name}</span>
                <span className={styles.tileCost}>
                  {item.ducats.toLocaleString()} Ducats · {item.credits.toLocaleString()} cr
                </span>
              </button>
            ))}
          </div>

          {openItem && (
            <div className={styles.flyout}>
              <div className={styles.flyoutHead}>
                <span className="typo-section-label">{openItem.name}</span>
                <button type="button" className={styles.flyoutClose} onClick={() => setOpenTile(null)}>
                  Close
                </button>
              </div>
              <p className={styles.cardNote}>Live cost from Baro&apos;s current inventory.</p>
              <div className={styles.costRow}>
                <span className={styles.costLabel}>Ducats</span>
                <span className={styles.costValue}>{openItem.ducats.toLocaleString()}</span>
              </div>
              <div className={styles.costRow}>
                <span className={styles.costLabel}>Credits</span>
                <span className={styles.costValue}>{openItem.credits.toLocaleString()} cr</span>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── Trader stub (Teshin / Simaris / Iron Wake …) ────────────────────────────
function TraderStub({ name }: { name: string }) {
  return (
    <>
      <div className={styles.detailHead}>
        <h3 className={styles.detailTitle}>{name}</h3>
        <span className={`${styles.detailKind} ${styles.muted}`}>Curated · coming</span>
      </div>
      <div className={styles.card}>
        <p className={styles.cardNote}>
          Curated catalog — coming. This trader&apos;s offerings and standing/ducat costs will render
          here once the codex source is wired. No data is shown until it&apos;s real.
        </p>
      </div>
    </>
  );
}

// ── Syndicate detail (sub-sections + standing meter, all stubbed) ───────────
function SyndicateDetail({
  name, section, setSection, openTile, setOpenTile,
}: {
  name: string;
  section: SyndicateSection;
  setSection: (s: SyndicateSection) => void;
  openTile: number | null;
  setOpenTile: (i: number | null) => void;
}) {
  const sectionNote: Record<SyndicateSection, string> = {
    offerings: 'Curated data — coming (offerings: mods, arcanes, weapons, cosmetics with standing costs).',
    augments:  'Curated data — coming (Warframe augments, grouped by frame).',
    ranks:     'Curated data — coming (rank ladder: standing thresholds and rank-up sacrifices).',
  };

  return (
    <>
      <div className={styles.detailHead}>
        <h3 className={styles.detailTitle}>{name}</h3>
        <span className={`${styles.detailKind} ${styles.muted}`}>Curated · coming</span>
      </div>

      {/* Standing meter — structure present, value stubbed (no fabricated standing). */}
      <div className={styles.card}>
        <span className="typo-section-label">Your standing</span>
        <div className={styles.standing}>
          <div className={styles.standingTrack} aria-hidden="true">
            <div className={styles.standingFill} />
          </div>
          <span className={`${styles.cardNote} ${styles.muted}`}>
            Standing tracking — coming. We won&apos;t show a number until it&apos;s real.
          </span>
        </div>
      </div>

      {/* Sub-section nav within the detail page. */}
      <div className={styles.subTabs} role="tablist" aria-label="Syndicate sections">
        {SYNDICATE_SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={s.key === section}
            className={styles.subTab}
            data-active={s.key === section || undefined}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setSection(s.key); setOpenTile(null); }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <span className="typo-section-label">{SYNDICATE_SECTIONS.find((s) => s.key === section)?.label}</span>
      <div className={styles.card}>
        <p className={`${styles.cardNote} ${styles.muted}`}>{sectionNote[section]}</p>
      </div>

      {/* DIM-style placeholder tiles — demonstrate the tile → flyout pattern. */}
      <div className={styles.tilesGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <button
            key={i}
            type="button"
            className={styles.tile}
            data-active={openTile === i || undefined}
            onClick={() => setOpenTile(openTile === i ? null : i)}
          >
            {i % 2 === 0 && <span className={styles.tileRot}>{ROTATION_TAGS[i % ROTATION_TAGS.length]}</span>}
            <span className={styles.tileThumb} aria-hidden="true" />
            <span className={`${styles.tileName} ${styles.muted}`}>Curated — coming</span>
          </button>
        ))}
      </div>

      {openTile !== null && (
        <div className={styles.flyout}>
          <div className={styles.flyoutHead}>
            <span className="typo-section-label">Item detail</span>
            <button type="button" className={styles.flyoutClose} onClick={() => setOpenTile(null)}>
              Close
            </button>
          </div>
          <p className={`${styles.cardNote} ${styles.muted}`}>
            Curated — coming. Purchasables will show their standing/ducat cost; drop-based rewards
            will show per-stage drop rates. No fake percentages until the data is real.
          </p>
        </div>
      )}
    </>
  );
}

// ── Event vendor stub ───────────────────────────────────────────────────────
function EventVendorStub({ name }: { name: string }) {
  return (
    <>
      <div className={styles.detailHead}>
        <h3 className={styles.detailTitle}>{name}</h3>
        <span className={`${styles.detailKind} ${styles.muted}`}>Event-gated</span>
      </div>
      <div className={styles.card}>
        <p className={styles.cardNote}>
          Shown when the event is live — see the Events tab. Event vendors only carry stock during
          their operation, so this page activates with the event.
        </p>
      </div>
    </>
  );
}

export const VendorsSyndicatesTab = memo(VendorsSyndicatesTabImpl);
