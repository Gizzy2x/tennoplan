/**
 * ActivitiesTab — live rotating missions from worldstate.
 *
 * Sections: Alerts · Invasions (with progress bars) · Sortie · Archon Hunt ·
 * Arbitration · Persistent Enemies. Everything here rotates on its own live
 * timer; data comes from `useWorldstate()` (ParsedWorldstate). Countdowns tick
 * via `useGameClock` and items past expiry are dropped.
 *
 * Rewards follow the standard Codex access pattern: each reward STRING from
 * worldstate is resolved to a codex `uniqueName` via the shared `dropResolver`
 * (the same deterministic name→uniqueName cascade the bounty board uses —
 * quantity-strip, synthetics, blueprint/component fallbacks), then rendered as
 * an <ItemTile>. That gives every reward its real icon + the app-wide quick-look
 * (click → smart window → "Open full entry → codex"). Unresolved strings still
 * render as a non-linkable tile so nothing is lost.
 */

import { memo, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useWorldstate } from '@/hooks/useWorldstate';
import { useGameClock } from '@/hooks/useGameClock';
import { formatMsHuman } from '@/core/services/cycleService';
import { ItemTile, type ItemTag } from '@/components/ui/ItemTile';
import { getDropResolver } from '@/adapters/items/dropResolverAdapter';
import type { DropResolver } from '@/core/services/dropResolver';
import { useSortieRewardPool, type SortieReward } from '../hooks/useSortieRewardPool';
import type {
  Alert,
  Invasion,
  Sortie,
  ArchonHunt,
  ArbitrationInfo,
  PersistentEnemy,
} from '@/core/domain/tennoplanApi';
import styles from './ActivitiesTab.module.css';

/** "ends in X" label from an absolute expiry; null once expired. */
function endsInLabel(expiry: number | undefined, now: number): string | null {
  if (expiry == null) return null;
  const ms = expiry - now;
  if (ms <= 0) return null;
  return `ends in ${formatMsHuman(ms)}`;
}

// ── Reward tiles ──────────────────────────────────────────────────────────────

/** One worldstate reward string → ItemTile (icon + quick-look). Resolves the
 *  string to a codex uniqueName via the shared resolver; unresolved strings
 *  render as a non-linkable tile (ItemTile still tries a name→icon lookup). */
function RewardTile({
  raw,
  resolver,
  source,
  tags,
}: {
  raw: string;
  resolver: DropResolver | null;
  source?: string;
  tags?: ItemTag[];
}) {
  const uniqueName = resolver?.resolve(raw)?.uniqueName;
  return (
    <ItemTile
      name={raw}
      uniqueName={uniqueName}
      tags={tags}
      context={source ? { source } : undefined}
    />
  );
}

/** DropReward rarity string → ItemTile rarity tint. Legendary has no distinct
 *  ItemTile tone, so it folds into the strongest tint (rare). */
function tileRarity(rarity: string): 'rare' | 'uncommon' | 'common' | 'unknown' {
  switch (rarity.toLowerCase()) {
    case 'legendary':
    case 'rare':     return 'rare';
    case 'uncommon': return 'uncommon';
    case 'common':   return 'common';
    default:         return 'unknown';
  }
}

/** One reward from a static POOL (sortie/…), already resolved to a uniqueName
 *  with a known drop chance — the chance surfaces in the quick-look. */
function PoolRewardTile({ reward, source }: { reward: SortieReward; source: string }) {
  return (
    <ItemTile
      name={reward.itemName}
      uniqueName={reward.uniqueName}
      rarity={tileRarity(reward.rarity)}
      context={{ source, drops: [{ label: source, chance: reward.chance }] }}
    />
  );
}

// ── Card shell ──────────────────────────────────────────────────────────────

function Card({
  title,
  count,
  endsIn,
  wide,
  children,
}: {
  title: string;
  count?: number;
  endsIn?: string | null;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`${styles.card}${wide ? ` ${styles.spanWide}` : ''}`}>
      <div className={styles.cardHead}>
        <div className={styles.cardTitleRow}>
          <span className="typo-section-label">{title}</span>
          {count != null && count > 0 && <span className={styles.count}>{count}</span>}
        </div>
        {endsIn && <span className={styles.endsIn}>{endsIn}</span>}
      </div>
      {children}
    </section>
  );
}

// ── Alerts ──────────────────────────────────────────────────────────────────

function AlertsCard({ alerts, now, resolver }: { alerts: Alert[]; now: number; resolver: DropResolver | null }) {
  const live = alerts.filter((a) => (a.expiry ?? 0) > now);
  return (
    <Card title="Alerts" count={live.length}>
      {live.length === 0 ? (
        <span className={styles.empty}>No active alerts</span>
      ) : (
        <div className={styles.rows}>
          {live.map((a) => (
            <div key={a.id} className={styles.row}>
              <span className={styles.node}>{a.node}</span>
              <span className={styles.meta}>
                {a.missionType}
                {a.level ? ` · ${a.level}` : ''}
              </span>
              <div className={styles.rowFoot}>
                {endsInLabel(a.expiry, now) && (
                  <span className={styles.endsIn}>{endsInLabel(a.expiry, now)}</span>
                )}
              </div>
              {a.reward && (
                <div className={styles.rewardTiles}>
                  <RewardTile raw={a.reward} resolver={resolver} source={`Alert · ${a.node}`} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Invasions (with progress bars) ──────────────────────────────────────────

function InvasionsCard({ invasions, now, resolver }: { invasions: Invasion[]; now: number; resolver: DropResolver | null }) {
  // Drop completed and (when an expiry is present) expired invasions.
  const live = invasions.filter(
    (inv) => !inv.completed && (inv.expiry == null || inv.expiry > now),
  );
  return (
    <Card title="Invasions" count={live.length} wide>
      {live.length === 0 ? (
        <span className={styles.empty}>No active invasions</span>
      ) : (
        <div className={styles.rows}>
          {live.map((inv) => {
            const pct = Math.max(0, Math.min(100, Math.round(inv.progress)));
            return (
              <div key={inv.id} className={styles.invasion}>
                <div className={styles.invasionHead}>
                  <span className={styles.factions}>
                    <span className={styles.faction}>{inv.attacking}</span>
                    <span className={styles.vs}>vs</span>
                    <span className={styles.faction}>{inv.defending}</span>
                  </span>
                  <span className={styles.pct}>{pct}%</span>
                </div>

                <div
                  className={styles.bar}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${inv.node} — ${pct}% complete`}
                >
                  <div className={styles.barFill} style={{ width: `${pct}%` }} />
                </div>

                <div className={styles.rowFoot}>
                  <span className={styles.meta}>{inv.node}</span>
                </div>

                {(inv.attackerReward || inv.defenderReward) && (
                  <div className={styles.rewardTiles}>
                    {inv.attackerReward && (
                      <RewardTile
                        raw={inv.attackerReward}
                        resolver={resolver}
                        source={`Invasion · ${inv.node}`}
                        tags={[{ label: 'ATTACK', tone: 'muted' }]}
                      />
                    )}
                    {inv.defenderReward && (
                      <RewardTile
                        raw={inv.defenderReward}
                        resolver={resolver}
                        source={`Invasion · ${inv.node}`}
                        tags={[{ label: 'DEFEND', tone: 'muted' }]}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Sortie / Archon Hunt (shared mission-list shape) ────────────────────────

function MissionBoard({
  title,
  heading,
  endsIn,
  missions,
  rewards,
  rewardLabel,
}: {
  title: string;
  /** boss / faction line shown under the title. */
  heading?: string;
  endsIn: string | null;
  missions: { node: string; missionType: string; modifier?: string }[];
  /** Static reward POOL (resolved to codex identities). Empty → no pool shown. */
  rewards: SortieReward[];
  /** Quick-look source/label for each pool tile (e.g. "Sortie pool"). */
  rewardLabel: string;
}) {
  return (
    <Card title={title} endsIn={endsIn} wide>
      {heading && <span className={styles.boss}>{heading}</span>}
      <ul className={styles.missionList}>
        {missions.map((m, i) => (
          <li key={`${m.node}-${i}`} className={styles.mission}>
            <span className={styles.missionMain}>
              <span className={styles.missionNode}>{m.node}</span>
              <span className={styles.missionType}>{m.missionType}</span>
            </span>
            {m.modifier && <span className={styles.modifier}>{m.modifier}</span>}
          </li>
        ))}
      </ul>
      {rewards.length > 0 && (
        <>
          <span className="typo-section-label">{rewardLabel}</span>
          <div className={styles.rewardTiles}>
            {rewards.map((r) => (
              <PoolRewardTile key={r.uniqueName ?? r.itemName} reward={r} source={rewardLabel} />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function SortieCard({ sortie, now }: { sortie: Sortie; now: number }) {
  // Sortie's three missions pair missionTypes[] with modifiers[] positionally.
  const missions = sortie.missionTypes.map((missionType, i) => ({
    node: `Mission ${i + 1}`,
    missionType,
    modifier: sortie.modifiers[i],
  }));
  // The reward POOL is static (drop tables), not the live placeholder string.
  const rewards = useSortieRewardPool();
  return (
    <MissionBoard
      title="Sortie"
      heading={sortie.faction ? `${sortie.faction}` : undefined}
      endsIn={endsInLabel(sortie.expiry, now)}
      missions={missions}
      rewards={rewards}
      rewardLabel="Sortie pool"
    />
  );
}

function ArchonHuntCard({ hunt, now }: { hunt: ArchonHunt; now: number }) {
  const heading = [hunt.boss, hunt.faction].filter(Boolean).join(' · ') || undefined;
  return (
    <MissionBoard
      title="Archon Hunt"
      heading={heading}
      endsIn={endsInLabel(hunt.expiry, now)}
      missions={hunt.missions.map((m) => ({
        node: m.node,
        missionType: m.missionType,
        modifier: m.modifier,
      }))}
      // Archon Hunt rewards (Archon Shards) aren't a static drop-table pool — no
      // tiles for now; the live shards model can hook in later.
      rewards={[]}
      rewardLabel="Archon rewards"
    />
  );
}

// ── Arbitration ─────────────────────────────────────────────────────────────

function ArbitrationCard({ arb, now }: { arb: ArbitrationInfo; now: number }) {
  return (
    <Card title="Arbitration" endsIn={endsInLabel(arb.expiry, now)}>
      <div className={styles.row}>
        <span className={styles.node}>{arb.node}</span>
        <span className={styles.meta}>
          {arb.missionType}
          {arb.enemy ? ` · ${arb.enemy}` : ''}
        </span>
        {arb.modifier && <span className={styles.modifier}>{arb.modifier}</span>}
      </div>
    </Card>
  );
}

// ── Persistent Enemies ──────────────────────────────────────────────────────

function PersistentEnemiesCard({ enemies }: { enemies: PersistentEnemy[] }) {
  return (
    <Card title="Persistent Enemies" count={enemies.length}>
      {enemies.length === 0 ? (
        <span className={styles.empty}>No tracked enemies</span>
      ) : (
        <div className={styles.rows}>
          {enemies.map((e) => (
            <div key={`${e.name}-${e.location}`} className={styles.row}>
              <span className={styles.node}>{e.name}</span>
              <span className={styles.meta}>
                {e.location}
                {e.level != null ? ` · level ${e.level}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Tab ─────────────────────────────────────────────────────────────────────

export const ActivitiesTab = memo(function ActivitiesTab() {
  const { data: ws, isLoading } = useWorldstate();
  const now = useGameClock();

  // Codex name→uniqueName resolver, reactive to codex syncs. Drives every
  // reward tile's icon + quick-look. `null` until the codex index is primed
  // (first paint / cold cache) — tiles degrade to non-linkable until then.
  const resolver = useLiveQuery(() => getDropResolver(), []) ?? null;

  // Stable empty references so cards don't churn when a slice is absent.
  const persistentEnemies = useMemo(() => ws?.persistentEnemies ?? [], [ws?.persistentEnemies]);

  if (isLoading || !ws) {
    return (
      <div className={styles.board}>
        <Card title="Activities">
          <span className={styles.empty}>Reading the worldstate…</span>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.board}>
      <AlertsCard alerts={ws.alerts} now={now} resolver={resolver} />
      <InvasionsCard invasions={ws.invasions} now={now} resolver={resolver} />
      {ws.sortie && <SortieCard sortie={ws.sortie} now={now} />}
      {ws.archonHunt && <ArchonHuntCard hunt={ws.archonHunt} now={now} />}
      {ws.arbitration && <ArbitrationCard arb={ws.arbitration} now={now} />}
      <PersistentEnemiesCard enemies={persistentEnemies} />
    </div>
  );
});
