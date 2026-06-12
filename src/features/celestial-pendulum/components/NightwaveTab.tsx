/**
 * NightwaveTab — battle-pass-style Nightwave surface.
 *
 * Mirrors the in-game Nightwave: a rank/tier ladder you progress, this week's
 * acts (live challenges) feed it, and a Cred shop.
 *
 * LIVE vs CURATED — honest split (do not fabricate):
 *   • Live (from worldstate `ParsedWorldstate.nightwave: NightwaveInfo`):
 *       - season   → header tag
 *       - tier     → highlighted current rank on the ladder
 *       - expiry   → season "ends in X"
 *       - challenges[] (NightwaveChallenge) → this week's acts:
 *           title · description · reputation (standing) · daily flag ·
 *           expiry (per-act "ends in X") · isElite/isHard
 *   • Curated / NOT available yet (rendered as muted "coming" notes, never faked):
 *       - per-rank REWARD ladder (what each tier gives)
 *       - per-player standing-WITHIN-rank (no progress %, so no fake meter)
 *       - Nora's Cred shop catalog
 *
 * Reads worldstate internally; no required props. Handles loading (null) and
 * the no-active-season case (nightwave missing) with a quiet empty state.
 */

import { memo } from 'react';
import { useWorldstate }  from '@/hooks/useWorldstate';
import { useGameClock }   from '@/hooks/useGameClock';
import { formatMsHuman }  from '@/core/services/cycleService';
import type { NightwaveChallenge } from '@/core/domain/tennoplanApi';
import styles from './NightwaveTab.module.css';

// The in-game Nightwave ladder runs ranks 0..30 (Prestige tiers above the
// base set are still part of the same scale). We render a fixed tier scale and
// only HIGHLIGHT the live `tier`; we never invent the rewards each tier grants.
const LADDER_RANKS = 30;

function ActRow({ act, now }: { act: NightwaveChallenge; now: number }) {
  const remaining = Math.max(0, act.expiry - now);
  const elite = act.isElite || act.isHard;
  return (
    <div className={styles.act}>
      <div className={styles.actMain}>
        <span className={styles.actTitle}>
          {act.title}
          {elite && <span className={styles.eliteTag}>elite</span>}
        </span>
        {act.description && <span className={styles.actDesc}>{act.description}</span>}
        {act.expiry > 0 && (
          <span className={styles.actEnds}>ends in {formatMsHuman(remaining)}</span>
        )}
      </div>
      <span className={styles.actStanding}>
        {act.reputation.toLocaleString()}
        <small>standing</small>
      </span>
    </div>
  );
}

function NightwaveTabBase() {
  const { data: ws, isLoading } = useWorldstate();
  const now = useGameClock();

  const nightwave = ws?.nightwave;

  // Loading — quiet, no skeleton noise.
  if (isLoading && !ws) {
    return (
      <div className={styles.root}>
        <div className={styles.empty}>
          <div className={styles.emptyLead}>Nightwave</div>
          <div className={styles.emptyNote}>Reading live world state…</div>
        </div>
      </div>
    );
  }

  // No active season (or worldstate has no nightwave block).
  if (!nightwave) {
    return (
      <div className={styles.root}>
        <div className={styles.empty}>
          <div className={styles.emptyLead}>No active Nightwave season</div>
          <div className={styles.emptyNote}>
            When a season is live, its rank ladder and this week's acts appear here.
          </div>
        </div>
      </div>
    );
  }

  const { season, tier, expiry, challenges } = nightwave;
  const seasonRemaining = Math.max(0, expiry - now);

  // Split live challenges into daily vs weekly via the `daily` flag.
  const daily   = challenges.filter((c) => c.daily);
  const weekly  = challenges.filter((c) => !c.daily);

  // `tier` is the live season rank. We treat ranks at or below it as "earned"
  // (jade) and the exact tier as the current node (gold). We do NOT have the
  // player's standing-within-rank, so no progress percentage is rendered.
  const hasRank = typeof tier === 'number' && tier > 0;

  return (
    <div className={styles.root}>
      {/* ── Season header ──────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.headerTitle}>Nightwave</h2>
          <div className={styles.headerSub}>
            {Number.isFinite(season) ? `Season ${season}` : 'Active season'}
            {expiry > 0 && ` · season ends in ${formatMsHuman(seasonRemaining)}`}
          </div>
        </div>
        {hasRank && (
          <div className={styles.headerMeta}>
            <span className={styles.rankBadge}>
              <small>Rank</small>
              {tier}
            </span>
          </div>
        )}
      </div>

      {/* ── Rank ladder (centrepiece) ──────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span className="typo-section-label">Rank ladder</span>
        </div>
        <div className={styles.card}>
          <div className={styles.ladderScroll}>
            <div className={styles.ladder}>
              {Array.from({ length: LADDER_RANKS }).map((_, i) => {
                const rank = i + 1;
                const isCurrent = hasRank && rank === tier;
                const isEarned  = hasRank && rank < tier;
                return (
                  <div
                    key={rank}
                    className={[
                      styles.node,
                      isCurrent ? styles.nodeCurrent : isEarned ? styles.nodeEarned : '',
                    ].join(' ').trim()}
                    title={isCurrent ? `Current rank ${rank}` : `Rank ${rank}`}
                  >
                    {rank}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Standing-within-rank is not exposed by worldstate, so we render
              NO progress meter (a faked % would lie). Note that clearly. */}
          {hasRank ? (
            <div className={styles.muted}>
              Current rank highlighted from live world state. <b>Standing toward next
              rank</b> — per-player progress, tracking comes later.
            </div>
          ) : (
            <div className={styles.muted}>
              Tier scale shown. <b>Rank &amp; ownership tracking</b> comes later — the
              live feed doesn't expose your personal standing yet.
            </div>
          )}
          <div className={styles.muted}>
            <b>Rank rewards</b> — curated data, coming. The ladder shows tiers only.
          </div>
        </div>
      </div>

      {/* ── This week's acts (live) ────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span className="typo-section-label">This week's acts</span>
          {expiry > 0 && (
            <span className={styles.endsIn}>
              season ends in <b>{formatMsHuman(seasonRemaining)}</b>
            </span>
          )}
        </div>

        {challenges.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyNote}>No active acts right now.</div>
          </div>
        ) : (
          <div className={styles.acts}>
            <div className={styles.actGroup}>
              <span className="typo-section-label">Daily</span>
              {daily.length === 0 ? (
                <div className={styles.muted}>No daily acts active.</div>
              ) : (
                daily.map((c) => <ActRow key={c.id} act={c} now={now} />)
              )}
            </div>
            <div className={styles.actGroup}>
              <span className="typo-section-label">Weekly</span>
              {weekly.length === 0 ? (
                <div className={styles.muted}>No weekly acts active.</div>
              ) : (
                weekly.map((c) => <ActRow key={c.id} act={c} now={now} />)
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Cred shop (curated, coming) ────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span className="typo-section-label">Cred offerings</span>
        </div>
        <div className={styles.stub}>
          <div className={styles.stubLead}>Nora's Cred shop — curated catalog, coming.</div>
          <div className={styles.stubNote}>
            The Cred-shop rotation isn't in live world state; it's a curated dataset
            we haven't wired yet. No items are shown rather than faking them.
          </div>
        </div>
      </div>
    </div>
  );
}

export const NightwaveTab = memo(NightwaveTabBase);
