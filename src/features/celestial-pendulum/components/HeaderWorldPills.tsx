/**
 * HeaderWorldPills — app-wide live cycle pills + Baro chip for the top bar.
 *
 * The persistent "what's the time?" glance, AlecaFrame-style but with each world
 * shown as a mini draining ring around its planet (time made visible). Prime
 * windows (Eidolon night, Exploiter warm, Fass) glow gold + pulse. Compact by
 * default; hover reveals state + countdown + next flip. Click → Celestial hub.
 *
 * Owns its own clock subscription (useWorldCycles → useGameClock) so only THIS
 * component re-renders each second, not the whole header.
 */

import { memo } from 'react';
import { useNavigationStore } from '@/store/navigation';
import { useWorldstate } from '@/hooks/useWorldstate';
import { PressTip } from '@/components/common/PressTip';
import { formatMsHuman } from '@/core/services/cycleService';
import type { CycleId } from '@/core/domain/cycles';
import type { BaroInfo } from '@/core/domain/tennoplanApi';
import { useWorldCycles } from '../hooks/useWorldCycles';
import { getWorldMeta, getActivity, formatClock, formatCoarse } from '../cycleActivity';
import { CycleRing } from './CycleRing';
import styles from './HeaderWorldPills.module.css';

const JADE = 'var(--color-accent-jade)';
const GOLD = 'var(--color-accent-gold)';
// The three worlds most people plan around (Cetus / Fortuna / Deimos).
const HEADER_WORLDS: CycleId[] = ['cetus', 'vallis', 'cambion'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function BaroChip({ baro, onOpen }: { baro: BaroInfo | null | undefined; onOpen: () => void }) {
  if (!baro) return null;
  const here   = baro.presence === 'at_location';
  const target = here ? baro.departureTime : baro.arrivalTime;
  const ms     = target ? Math.max(0, target - Date.now()) : 0;
  const tip = here
    ? `Baro Ki'Teer is at ${baro.location ?? 'a relay'} — leaves in ${formatMsHuman(ms)}`
    : `Baro Ki'Teer arrives in ${formatMsHuman(ms)}`;
  return (
    <PressTip content={tip} placement="bottom">
      <button type="button" className={styles.baro} data-here={here || undefined} onClick={onOpen} aria-label={tip}>
        <span className={styles.baroGlyph} aria-hidden="true">◆</span>
        <span className={styles.baroLabel}>{here ? 'Here' : formatMsHuman(ms)}</span>
      </button>
    </PressTip>
  );
}

export const HeaderWorldPills = memo(function HeaderWorldPills() {
  const setActiveTab = useNavigationStore((s) => s.setActiveTab);
  const { statuses, urgency } = useWorldCycles();
  const { data: ws } = useWorldstate();

  const byId = new Map(statuses.map((s) => [s.cycle.id, s]));
  const open = () => setActiveTab('celestial-pendulum');

  return (
    <div className={styles.pills}>
      {HEADER_WORLDS.map((id) => {
        const status = byId.get(id);
        if (!status) return null;
        const meta      = getWorldMeta(id);
        const isPrime   = getActivity(id, status.cycle.state).isPrime;
        const accent    = isPrime ? GOLD : JADE;
        const nextState = urgency[id]?.nextStateKey.split('-')[1] ?? '';
        const tip =
          `${meta.label} · ${cap(status.cycle.state)} · ${formatClock(status.msRemaining)} left` +
          (nextState ? ` → ${cap(nextState)} in ${formatCoarse(status.msRemaining)}` : '');
        return (
          <PressTip key={id} content={tip} placement="bottom">
            <button type="button" className={styles.pill} data-prime={isPrime || undefined} onClick={open} aria-label={tip}>
              <CycleRing progress={status.progress} size={22} stroke={2.5} color={accent} pulse={isPrime}>
                {meta.art
                  ? <img src={meta.art} alt="" className={styles.planet} style={{ objectPosition: meta.artPosition, transform: `scale(${meta.artScale ?? 1})` }} />
                  : <span className={styles.dot} style={{ background: accent }} />}
              </CycleRing>
              <span className={styles.time}>{formatClock(status.msRemaining)}</span>
            </button>
          </PressTip>
        );
      })}
      <BaroChip baro={ws?.baro} onOpen={open} />
    </div>
  );
});
