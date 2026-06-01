/**
 * CodexQuickLook — the universal "smart window".
 *
 * Step 1 of the two-step codex access pattern: any surface outside the codex
 * (bounty reward, drop row, recipe component, …) calls quickLook.open(); this
 * sheet resolves the item from Dexie and shows the sweet-sauce — icon, identity,
 * a sanitised description, category-aware key stats, and the best place to farm
 * it. Step 2 is the footer's "Open full entry →", which hands off to the full
 * codex detail page (and a Back affordance returns the user to where they came
 * from).
 *
 * Mounted once at the app root so it floats over every tab. Mods keep their
 * own ModDetailModal inside the codex; this is the generalised preview for
 * everything reached from outside.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Sheet } from '@/components/common/Sheet';
import { db } from '@/adapters/storage/db';
import { useQuickLook } from '@/store/quickLook';
import { useNavigationStore } from '@/store/navigation';
import type { TennoplanItem } from '@/core/domain/tennoplanApi';
import styles from './CodexQuickLook.module.css';

// Strip residual game markup: <DT_..> tags, |TOKEN| placeholders, escaped newlines.
function sanitize(text?: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\|[A-Z0-9_]+\|/g, '')
    .replace(/\\[rn]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type Tint = 'health' | 'shield' | 'energy';
interface Fact { label: string; value: string; tint?: Tint; }

function keyFacts(item: TennoplanItem): Fact[] {
  const f: Fact[] = [];
  const s = item.stats;

  if (item.category === 'Warframe' && s) {
    if (s.health) f.push({ label: 'Health', value: String(s.health), tint: 'health' });
    if (s.shield) f.push({ label: 'Shield', value: String(s.shield), tint: 'shield' });
    if (s.energy) f.push({ label: 'Energy', value: String(s.energy), tint: 'energy' });
    if (s.armor)  f.push({ label: 'Armor',  value: String(s.armor) });
  } else if (item.category === 'Weapon' && s) {
    if (s.damage)       f.push({ label: 'Damage', value: String(Math.round(s.damage)) });
    if (s.critChance)   f.push({ label: 'Crit',   value: `${Math.round(s.critChance * 100)}%` });
    if (s.statusChance) f.push({ label: 'Status', value: `${Math.round(s.statusChance * 100)}%` });
    if (item.weaponTrigger) f.push({ label: 'Trigger', value: item.weaponTrigger });
  }

  if (item.masteryRank) f.push({ label: 'MR',     value: String(item.masteryRank) });
  if (item.rarity)      f.push({ label: 'Rarity', value: item.rarity });
  return f.slice(0, 5);
}

function bestFarm(item: TennoplanItem): { where: string; chance: string } | null {
  const bf = item.bestFarms?.[0];
  if (bf) return { where: bf.location.location, chance: `${(bf.location.chance * 100).toFixed(1)}%` };
  const dl = item.dropLocations?.[0];
  if (dl) return { where: dl.location, chance: `${(dl.chance * 100).toFixed(1)}%` };
  return null;
}

type LoadState = 'loading' | 'ready' | 'missing';

export function CodexQuickLook() {
  const link           = useQuickLook((s) => s.link);
  const close          = useQuickLook((s) => s.close);
  const openCodexEntry = useNavigationStore((s) => s.openCodexEntry);

  const [item,  setItem]  = useState<TennoplanItem | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    setItem(null);
    setState('loading');
    (async () => {
      const byId  = await db.tennoplanItems.get(link.uniqueName);
      const found = byId ?? (link.name
        ? await db.tennoplanItems.filter((i) => i.name.toLowerCase() === link.name!.toLowerCase()).first()
        : undefined);
      if (cancelled) return;
      if (found) { setItem(found); setState('ready'); }
      else       { setItem(null);  setState('missing'); }
    })();
    return () => { cancelled = true; };
  }, [link]);

  const handleOpenFull = useCallback(() => {
    if (!item) return;
    close();
    openCodexEntry(item.uniqueName, item.name);
  }, [item, close, openCodexEntry]);

  const facts = useMemo(() => (item ? keyFacts(item) : []), [item]);
  const farm  = useMemo(() => (item ? bestFarm(item) : null), [item]);
  const desc  = useMemo(() => sanitize(item?.description), [item]);

  const footer = state === 'ready' && item ? (
    <button type="button" className={styles.openFull} onClick={handleOpenFull}>
      Open full entry <span aria-hidden="true">→</span>
    </button>
  ) : undefined;

  return (
    <Sheet
      open={!!link}
      onClose={close}
      size="md"
      title={item?.name ?? link?.name ?? 'Loading…'}
      ariaLabel={item?.name ?? 'Item preview'}
      footer={footer}
    >
      {state === 'loading' && <div className={styles.status}>Loading…</div>}
      {state === 'missing' && <div className={styles.status}>This item isn’t in the codex yet.</div>}

      {state === 'ready' && item && (
        <div className={styles.body}>
          <div className={styles.hero}>
            {item.iconUrl
              ? <img src={item.iconUrl} alt="" width={72} height={72} className={styles.icon} loading="lazy" />
              : <span className={styles.iconFallback} aria-hidden="true" />}
            <div className={styles.identity}>
              <span className={styles.cat}>{[item.category, item.type].filter(Boolean).join(' · ')}</span>
              {item.rarity && (
                <span className={styles.rarity} data-rarity={item.rarity.toLowerCase()}>{item.rarity}</span>
              )}
            </div>
          </div>

          {desc && <p className={styles.desc}>{desc}</p>}

          {facts.length > 0 && (
            <div className={styles.facts}>
              {facts.map((f) => (
                <div key={f.label} className={styles.fact}>
                  <span className={styles.factVal} data-tint={f.tint}>{f.value}</span>
                  <span className={styles.factLabel}>{f.label}</span>
                </div>
              ))}
            </div>
          )}

          {farm && (
            <div className={styles.farm}>
              <span className={styles.farmLabel}>BEST FARM</span>
              <span className={styles.farmWhere}>{farm.where}</span>
              <span className={styles.farmChance}>{farm.chance}</span>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
