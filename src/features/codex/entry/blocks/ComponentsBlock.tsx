/**
 * ComponentsBlock — sub-cards for a crafted entry's component parts.
 *
 * For a Prime Warframe (or Prime Weapon, Companion, …), the assembled
 * item is built from 3–6 component pieces — each itself a codex entry
 * with its own drop sources and vaulted state. This block resolves
 * those components via the entry's `buildRequirements`, then renders
 * a clickable sub-card per component so the player can drill into the
 * one they need without leaving the codex.
 *
 * Resolution strategy:
 *   1. Walk entry.buildRequirements (display-name + count tuples).
 *   2. For each, look the item up in Dexie by name.
 *   3. Keep only matches that look like obtainable components — they
 *      have at least one drop location and aren't pure Resource /
 *      Ingredient rows (which are sub-ingredients, not components).
 *
 * The "by name" lookup is a full table filter because db.tennoplanItems
 * isn't indexed by `name`. With ~8k rows it resolves in single-digit ms;
 * the result is memoized via useLiveQuery so it only re-fetches when
 * the requirements change.
 *
 * Render: null when the entry has no qualifying components — non-Prime
 * Warframes typically buy their BPs and have no part drops to surface.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/adapters/storage/db';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';
import type { CodexEntry } from '../../types';
import { getPlanetArt, planetFromDropLocation } from '@/lib/planets/planetArt';
import styles from './ComponentsBlock.module.css';

const MAX_DROPS_PER_CARD = 2;

interface ComponentsBlockProps {
  entry:          CodexEntry;
  /** Click handler — opens the component as its own entry. */
  onSelectEntry?: (entry: TennoplanItem) => void;
}

interface ResolvedComponent {
  item:  TennoplanItem;
  count: number;
}

export function ComponentsBlock({ entry, onSelectEntry }: ComponentsBlockProps) {
  const reqs = entry.buildRequirements;

  const components = useLiveQuery(
    async () => {
      if (!reqs || reqs.length === 0) return [];
      const names = new Set(reqs.map((r) => r.item));
      // Single pass through tennoplanItems — cheaper than N independent
      // lookups by name (which isn't indexed). Filter once, keep
      // qualifying rows.
      const all = await db.tennoplanItems.toArray();
      const matched = new Map<string, TennoplanItem>();
      for (const item of all) {
        if (names.has(item.name) && qualifiesAsComponent(item) && !matched.has(item.name)) {
          matched.set(item.name, item);
        }
      }
      const out: ResolvedComponent[] = [];
      for (const req of reqs) {
        const item = matched.get(req.item);
        if (item) out.push({ item, count: req.count });
      }
      return out;
    },
    [reqs],
  );

  if (!components || components.length === 0) return null;

  return (
    <section className={styles.root} aria-labelledby="codex-components-label">
      <h2 id="codex-components-label" className={styles.label}>Components</h2>
      <div className={styles.grid}>
        {components.map((c) => (
          <ComponentCard
            key={c.item.uniqueName}
            component={c}
            onClick={() => onSelectEntry?.(c.item)}
          />
        ))}
      </div>
    </section>
  );
}

interface ComponentCardProps {
  component: ResolvedComponent;
  onClick:   () => void;
}

function ComponentCard({ component, onClick }: ComponentCardProps) {
  const { item, count } = component;
  const topDrops = pickTopDrops(item.dropLocations, MAX_DROPS_PER_CARD);
  const overflow = item.dropLocations.length - topDrops.length;

  return (
    <button
      type="button"
      className={styles.card}
      onClick={onClick}
      aria-label={`Open ${item.name} in codex`}
    >
      <div className={styles.cardHeader}>
        {item.iconUrl && (
          // Per-component-type icon — chassis / helmet / systems / blueprint /
          // resource glyph, sourced from each component's own imageName in
          // the worker enricher. Decorative; the cardName carries the label.
          <img
            src={item.iconUrl}
            alt=""
            className={styles.cardIcon}
            draggable={false}
            decoding="async"
          />
        )}
        <h3 className={styles.cardName}>{item.name}</h3>
        {item.vaulted === true && (
          <span className={styles.vaultedPill}>Vaulted</span>
        )}
      </div>

      {topDrops.length > 0 && (
        <ul className={styles.drops}>
          {topDrops.map((d, i) => {
            const planet = planetFromDropLocation(d);
            const planetArt = getPlanetArt(planet);
            return (
              <li key={`${d.location}-${i}`} className={styles.dropRow}>
                {planetArt && (
                  <span
                    className={styles.dropPlanet}
                    style={{ backgroundImage: `url(${planetArt})` }}
                    aria-hidden="true"
                    title={planet ?? undefined}
                  />
                )}
                <span className={styles.dropLocation}>{d.location}</span>
                <span className={styles.dropChance}>{(d.chance * 100).toFixed(1)}%</span>
              </li>
            );
          })}
        </ul>
      )}

      <div className={styles.cardFooter}>
        {count > 1 && <span className={styles.cardFooterAccent}>{count}× needed</span>}
        {count > 1 && overflow > 0 && ' · '}
        {overflow > 0 && <span>+{overflow} more source{overflow === 1 ? '' : 's'}</span>}
        {count === 1 && overflow === 0 && topDrops.length > 0 && (
          <span>Tap to inspect</span>
        )}
        {topDrops.length === 0 && count === 1 && (
          <span>Crafted from sub-recipe</span>
        )}
      </div>
    </button>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * A "component" is an item referenced from buildRequirements. Most rows
 * qualify — the buildRequirements list is already curated upstream. The
 * exception is the Resource category: it holds both warframe parts
 * (e.g. "Ash Chassis", which we DO want to show as a component) AND raw
 * materials (Orokin Cells, Plastids, which we do NOT). We distinguish
 * by name suffix — parts end in Blueprint / Chassis / Neuroptics / etc.,
 * which materials never do.
 */
const PART_SUFFIXES = [
  'Blueprint', 'Chassis', 'Neuroptics', 'Systems',
  'Harness', 'Wings', 'Carapace', 'Cerebrum',
  'Stock', 'Barrel', 'Receiver', 'Link', 'Grip',
];

function qualifiesAsComponent(item: TennoplanItem): boolean {
  if (item.category === 'Ingredient') return false;
  if (item.category === 'Fish')       return false;
  if (item.category === 'Resource') {
    // Surface parts (named "X Chassis", "X Blueprint", …) — skip raw
    // materials (Orokin Cells, Plastids, …) which would just clutter
    // the components row.
    return PART_SUFFIXES.some((s) => item.name.endsWith(s));
  }
  return true;
}

function pickTopDrops(
  drops: TennoplanItem['dropLocations'],
  cap: number,
): TennoplanItem['dropLocations'] {
  return [...drops]
    .sort((a, b) => b.chance - a.chance)
    .slice(0, cap);
}
