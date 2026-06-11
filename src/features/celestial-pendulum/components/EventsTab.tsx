/**
 * EventsTab — Operations & events surface (Plague Star, Thermia, Operation
 * Supply, …). The LAST hub tab of the Celestial Pendulum.
 *
 * DATA REALITY (important): `ParsedWorldstate` has NO `events` field yet, so
 * there is NO live event data to read. We deliberately do NOT touch worldstate
 * here and do NOT fabricate live data.
 *
 *   • Active-event view → driven by a DEV-ONLY mock toggle so we can build and
 *     preview the "an event IS live" look with nothing live. The toggle is gated
 *     behind `import.meta.env.DEV` so it is stripped from production builds.
 *   • Inactive view → a quiet "no event active" card plus a recurring-events
 *     REFERENCE INDEX (general facts about known recurring ops — not live data).
 *
 * TODO (later): real live-event detection arrives when the Cloudflare worker
 * worldstate parser surfaces an `events` block (uniqueName-keyed). At that point
 * the active view should read live state instead of the dev mock, and an active
 * event should also flag on the header + Overview.
 */

import { memo, useState } from 'react';
import styles from './EventsTab.module.css';

// Known recurring / past operations. Static REFERENCE text only — these are
// general facts about the events, NOT live "active" data. Real active detection
// comes when the worldstate parser surfaces events (see file header).
const RECURRING_EVENTS: { name: string; cadence: string }[] = [
  { name: 'Plague Star', cadence: 'Returns periodically · Plague mods & arcanes' },
  { name: 'Operation: Scarlet Spear', cadence: 'Past op · Arcanes' },
  { name: 'Thermia Fractures', cadence: 'Recurring · Vallis · Exploiter Orb cosmetics' },
  { name: 'Operation: Belly of the Beast', cadence: 'Past op · Reference only' },
];

function EventsTabBase() {
  // DEV-ONLY simulation of an active event. There is no live event data to read,
  // so this purely drives the "active look" preview during development.
  const [mock, setMock] = useState(false);

  return (
    <div className={styles.root}>
      {/* Dev mock toggle — gated by import.meta.env.DEV so it is stripped from
          the production build entirely. Dev affordance → dashed gold pill. */}
      {import.meta.env.DEV && (
        <button
          type="button"
          className={styles.devToggle}
          data-on={mock || undefined}
          onClick={() => setMock((v) => !v)}
        >
          {mock
            ? '● DEV: Plague Star ACTIVE (simulated)'
            : '○ DEV: simulate Plague Star active'}
        </button>
      )}

      {mock ? (
        // ── Active-event view (DEV mock) ───────────────────────────────────
        <>
          <div className={styles.header}>
            <div>
              <h2 className={styles.headerTitle}>Operation: Plague Star — ACTIVE</h2>
              <div className={styles.headerSub}>
                An event in progress — earn standing, spend it on the offerings below.
              </div>
            </div>
            {/* Static timer text — this is a mock; no live clock to read. */}
            <span className={styles.endsBadge}>
              <small>Ends in</small>
              6d 4h
            </span>
          </div>

          {/* Operational standing meter */}
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <span className="typo-section-label">Operational standing</span>
            </div>
            <div className={styles.card}>
              <div className={styles.meter}>
                <div className={styles.meterFill} style={{ width: '45%' }} />
              </div>
              <div className={styles.meterNote}>
                Earn standing this operation, then spend it on the event vendor wares.
              </div>
            </div>
          </div>

          {/* Offerings — quiet stub, no fabricated items/prices */}
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <span className="typo-section-label">Offerings</span>
            </div>
            <div className={styles.stub}>
              <div className={styles.stubLead}>Event vendor wares — curated catalog, coming.</div>
              <div className={styles.tileGrid} aria-hidden="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={styles.tilePlaceholder} />
                ))}
              </div>
              <div className={styles.stubNote}>
                The event-vendor rotation isn't curated yet. No items or prices are
                shown rather than faking them.
              </div>
            </div>
          </div>

          {/* How-to / GIF slot */}
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <span className="typo-section-label">How to run it</span>
            </div>
            <div className={styles.gifSlot}>
              <span className={styles.gifLabel}>GIF</span>
              <div className={styles.gifNote}>
                A short clip showing the run will go here later.
              </div>
            </div>
          </div>

          <div className={styles.simNote}>
            Simulated preview (dev only). Real active-event detection arrives when
            the worldstate parser surfaces events.
          </div>
        </>
      ) : (
        // ── Inactive view ──────────────────────────────────────────────────
        <>
          <div className={styles.empty}>
            <div className={styles.emptyLead}>No event active</div>
            <div className={styles.emptyNote}>
              Operations are intermittent. When one is live it appears here with a
              timer, standing meter, and offerings.
              {import.meta.env.DEV && ' Use the dev switch above to preview the active look.'}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <span className="typo-section-label">Recurring events — reference index</span>
            </div>
            <div className={styles.refGrid}>
              {RECURRING_EVENTS.map((e) => (
                <div key={e.name} className={styles.refCard}>
                  <div className={styles.refName}>{e.name}</div>
                  <div className={styles.refCadence}>{e.cadence}</div>
                </div>
              ))}
            </div>
            <div className={styles.refNote}>
              A reference index of known recurring operations — general facts, not
              live data. Real "active" detection comes when the worldstate parser
              surfaces events.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const EventsTab = memo(EventsTabBase);
