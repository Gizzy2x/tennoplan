/**
 * ActivitiesTab — live rotating missions from worldstate.
 *
 * Sections: Alerts · Invasions (with progress bars) · Sortie · Archon Hunt ·
 * Arbitration · Persistent Enemies. Everything here rotates on its own live
 * timer; data comes from `useWorldstate()` (ParsedWorldstate). Countdowns tick
 * via `useGameClock` and items past expiry are dropped.
 *
 * Rewards are rendered as TEXT only this pass — no codex resolution / quick-look
 * / icons yet. A later pass will thread `uniqueName` through reward strings and
 * wire `useQuickLook` per the standard Codex access pattern.
 */

import { memo, useMemo } from 'react';
import { useWorldstate } from '@/hooks/useWorldstate';
import { useGameClock } from '@/hooks/useGameClock';
import { formatMsHuman } from '@/core/services/cycleService';
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

function AlertsCard({ alerts, now }: { alerts: Alert[]; now: number }) {
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
                {a.reward ? <span className={styles.reward}>{a.reward}</span> : <span />}
                {endsInLabel(a.expiry, now) && (
                  <span className={styles.endsIn}>{endsInLabel(a.expiry, now)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Invasions (with progress bars) ──────────────────────────────────────────

function InvasionsCard({ invasions, now }: { invasions: Invasion[]; now: number }) {
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

                <div className={styles.invasionRewards}>
                  {inv.attackerReward && (
                    <span className={styles.invasionRewardSide}>
                      <span className={styles.sideTag}>Attack</span>
                      <span className={styles.reward}>{inv.attackerReward}</span>
                    </span>
                  )}
                  {inv.defenderReward && (
                    <span className={styles.invasionRewardSide}>
                      <span className={styles.sideTag}>Defend</span>
                      <span className={styles.reward}>{inv.defenderReward}</span>
                    </span>
                  )}
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
  rewardPool,
}: {
  title: string;
  /** boss / faction line shown under the title. */
  heading?: string;
  endsIn: string | null;
  missions: { node: string; missionType: string; modifier?: string }[];
  rewardPool: string[];
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
      {rewardPool.length > 0 && (
        <div className={styles.rewardPool}>
          {rewardPool.map((r, i) => (
            <span key={`${r}-${i}`} className={styles.rewardChip}>
              {r}
            </span>
          ))}
        </div>
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
  return (
    <MissionBoard
      title="Sortie"
      heading={sortie.faction ? `${sortie.faction}` : undefined}
      endsIn={endsInLabel(sortie.expiry, now)}
      missions={missions}
      rewardPool={sortie.rewards}
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
      rewardPool={[]}
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
      <AlertsCard alerts={ws.alerts} now={now} />
      <InvasionsCard invasions={ws.invasions} now={now} />
      {ws.sortie && <SortieCard sortie={ws.sortie} now={now} />}
      {ws.archonHunt && <ArchonHuntCard hunt={ws.archonHunt} now={now} />}
      {ws.arbitration && <ArbitrationCard arb={ws.arbitration} now={now} />}
      <PersistentEnemiesCard enemies={persistentEnemies} />
    </div>
  );
});
