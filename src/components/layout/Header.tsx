/**
 * Header — Tennoplan top bar.
 *
 * Single 44px horizontal bar that holds EVERY piece of app chrome —
 * no separate sidebar. Layout:
 *
 *   [≡]  [T]  [Pendulum · Reliquaries · Codex · …]   [search]  [pulse · WS]  [⚙]
 *  ^narrow ^logo  ^inline nav (wide only)              ^wide      ^always       ^always
 *
 * Container queries on the header itself drive the collapse so the
 * bar adapts to its OWN width rather than viewport width. That matters
 * in installed-PWA mode where the header is narrower than the page due
 * to window controls overlay.
 *
 *   • @container (max-width: 1200px) — inline nav hides, hamburger appears
 *   • @container (max-width:  880px) — Dailies button collapses to icon-only
 *
 * The header measures its own height into `--header-h` via
 * useElementHeightVar so pages can offset against the live value
 * (no more hardcoded 64px assumption).
 */

import { useCallback, useState } from 'react';
import { Menu as MenuIcon, ListChecks } from 'lucide-react';
import { NAV_ITEMS, useNavigationStore } from '@/store/navigation';
import { useElementHeightVar } from '@/hooks/useElementHeightVar';
import { PressTip } from '@/components/common/PressTip';
import { DataPulse } from './DataPulse';
import { HamburgerMenu } from './HamburgerMenu';
import styles from './Header.module.css';

export function Header() {
  const activeTab    = useNavigationStore((s) => s.activeTab);
  const setActiveTab = useNavigationStore((s) => s.setActiveTab);
  const [menuOpen, setMenuOpen] = useState(false);

  // Header measures itself and writes its height to --header-h so
  // pages don't have to assume a fixed value.
  const headerRef = useElementHeightVar<HTMLElement>('--header-h');

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);
  const closeMenu  = useCallback(() => setMenuOpen(false), []);

  const isDailies = activeTab === 'dailies-weeklies';

  return (
    <>
      <header ref={headerRef} className={styles.root}>
        {/* Hamburger — narrow widths only (hidden by @container) */}
        <button
          type="button"
          className={styles.hamburger}
          onClick={toggleMenu}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
        >
          <MenuIcon size={18} strokeWidth={1.75} />
        </button>

        {/* Brand mark */}
        <button
          type="button"
          className={styles.brand}
          onClick={() => setActiveTab('celestial-pendulum')}
          aria-label="Tennoplan home"
        >
          <span className={styles.brandMark}>T</span>
          <span className={styles.brandDot} aria-hidden />
        </button>

        {/* Inline nav — wide widths only (hidden by @container) */}
        <nav className={styles.inlineNav} aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={styles.navLink}
                data-active={isActive}
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.short}
              </button>
            );
          })}
        </nav>

        {/* Right-side actions */}
        <div className={styles.actions}>
          {/* Dailies & Weeklies quick-access — kept because it's a killer feature.
              PressTip surfaces the full feature name on hover/long-press; the
              visible label compresses to "Dailies" to fit the bar. */}
          <PressTip content="Dailies & Weeklies" placement="bottom">
            <button
              type="button"
              className={styles.quickBtn}
              data-active={isDailies}
              onClick={() => setActiveTab('dailies-weeklies')}
              aria-label="Dailies & Weeklies"
            >
              <ListChecks size={14} strokeWidth={1.6} />
              <span className={styles.quickBtnLabel}>Dailies</span>
            </button>
          </PressTip>

          <DataPulse onOpenDetails={() => setActiveTab('settings')} />
        </div>
      </header>

      <HamburgerMenu open={menuOpen} onClose={closeMenu} />
    </>
  );
}
