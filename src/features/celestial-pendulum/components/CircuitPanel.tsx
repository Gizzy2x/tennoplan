/**
 * CircuitPanel — Duviri's weekly Circuit rotation.
 *
 * Stands in for the bounty board on Duviri (which has no open-world bounties).
 * Two rotations — normal (Warframes) and Steel Path (Incarnon weapons) — each
 * a grid of quick-look-able tiles using the same codex-access pattern as bounty
 * rewards: click → smart window → full entry. Tiles resolve to codex items by
 * name (with light normalisation for upstream camelCase ids); unresolved names
 * render as plain, non-linkable tiles.
 */

import { memo, useMemo } from 'react';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { findByName } from '@/adapters/items/itemsAdapter';
import { useQuickLook } from '@/store/quickLook';
import type { WarframeItem } from '@/core/domain/items';
import type { DuviriCircuit } from '../hooks/useDuviriCircuit';
import styles from '../CelestialPendulum.module.css';

/** Best-effort resolution: raw, then camelCase-split, then "And" → "&". */
function resolveItem(raw: string): WarframeItem | undefined {
  const direct = findByName(raw);
  if (direct) return direct;
  const spaced = raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  const bySpaced = findByName(spaced);
  if (bySpaced) return bySpaced;
  const amp = spaced.replace(/\bAnd\b/g, '&');
  return findByName(amp);
}

type OpenPreview = (uniqueName: string, name: string) => void;

const CircuitTile = memo(function CircuitTile({ raw, onPreview }: { raw: string; onPreview: OpenPreview }) {
  const found    = useMemo(() => resolveItem(raw), [raw]);
  const label    = found?.name ?? raw;
  const linkable = Boolean(found?.uniqueName);

  const inner = (
    <>
      <span className={styles.rewardIcon}>
        {found?.imageName ? (
          <ItemIcon imageName={found.imageName} name={label} size={40} />
        ) : (
          <span className={styles.iconFallback} />
        )}
      </span>
      <span className={styles.rewardName}>{label}</span>
    </>
  );

  if (linkable && found) {
    return (
      <button
        type="button"
        className={styles.circuitTile}
        data-link
        title={`${label} — Click to preview`}
        onClick={() => onPreview(found.uniqueName, label)}
        aria-label={`${label} — preview`}
      >
        {inner}
      </button>
    );
  }
  return (
    <div className={styles.circuitTile} title={label}>
      {inner}
    </div>
  );
});

function CircuitSection({ title, subtitle, items, onPreview }: {
  title: string; subtitle: string; items: string[]; onPreview: OpenPreview;
}) {
  if (items.length === 0) return null;
  return (
    <div className={styles.circuitSection}>
      <div className={styles.circuitHead}>
        <span className="typo-section-label">{title}</span>
        <span className={styles.circuitSub}>{subtitle}</span>
      </div>
      <div className={styles.circuitGrid}>
        {items.map((raw) => (
          <CircuitTile key={raw} raw={raw} onPreview={onPreview} />
        ))}
      </div>
    </div>
  );
}

interface CircuitPanelProps {
  circuit: DuviriCircuit | null;
  accent:  string;
}

export const CircuitPanel = memo(function CircuitPanel({ circuit, accent }: CircuitPanelProps) {
  const openQuickLook = useQuickLook((s) => s.open);

  if (!circuit || (circuit.normal.length === 0 && circuit.hard.length === 0)) {
    return (
      <div className={styles.bountyEmpty}>
        <span className={styles.bountyEmptyGlyph} aria-hidden="true">◇</span>
        <span className={styles.bountyEmptyText}>
          The Circuit rotation isn’t loaded yet — tap Refresh, or check back after the next worldstate sync.
        </span>
      </div>
    );
  }

  return (
    <div className={styles.circuit} style={{ ['--accent' as string]: accent } as React.CSSProperties}>
      <div className={styles.bountyHead}>
        <span className="typo-section-label">THE CIRCUIT</span>
        <span className={styles.bountyRep}>Weekly rotation</span>
      </div>
      <CircuitSection title="NORMAL" subtitle="Warframes" items={circuit.normal} onPreview={openQuickLook} />
      <CircuitSection title="STEEL PATH" subtitle="Incarnon weapons" items={circuit.hard} onPreview={openQuickLook} />
    </div>
  );
});
