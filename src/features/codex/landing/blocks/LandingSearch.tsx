/**
 * LandingSearch — codex search affordance.
 *
 * Visible promise of a global codex search. Engine arrives later;
 * for now the bar is interactive but inert on submit (typing + Enter
 * shows a "coming soon" hint pointing to the Collections rail).
 *
 * Scale-down: at narrow container widths (`@container codex-landing
 * (max-width: 540px)`), the input collapses to a magnifying-glass
 * button. Tapping the button reveals the full input + auto-focuses
 * it. Escape collapses back. Wide widths render the input inline
 * unconditionally — the toggle just doesn't apply.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Search } from 'lucide-react';
import styles from './LandingSearch.module.css';

interface LandingSearchProps {
  /** External handle on the input — CodexPage's `/` shortcut focuses through this. */
  inputRef?: RefObject<HTMLInputElement | null>;
}

export function LandingSearch({ inputRef: externalRef }: LandingSearchProps = {}) {
  const localRef                = useRef<HTMLInputElement | null>(null);
  const [value, setValue]       = useState('');
  const [showHint, setShowHint] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Compose external ref + internal ref so we can also auto-focus
  // on expand from the collapse-to-icon flow.
  const setRefs = useCallback((el: HTMLInputElement | null) => {
    localRef.current = el;
    if (externalRef) externalRef.current = el;
  }, [externalRef]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().length === 0) return;
    setShowHint(true);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.currentTarget.value);
    if (showHint) setShowHint(false);
  }, [showHint]);

  // Collapse on Escape from the input. Wide-width users get the
  // same Esc behaviour — it just blurs and clears; the expanded
  // state is moot when there's no collapsed alternative.
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setValue('');
      setShowHint(false);
      setExpanded(false);
      localRef.current?.blur();
    }
  }, []);

  const handleExpand = useCallback(() => {
    setExpanded(true);
    // Defer focus until after the input mounts (it's display:none
    // until expanded at narrow widths).
    requestAnimationFrame(() => localRef.current?.focus());
  }, []);

  // Auto-collapse if the user blurs the input without typing anything.
  // Keeps the bar honest — empty field shouldn't keep its full width.
  const handleBlur = useCallback(() => {
    if (value.trim().length === 0) setExpanded(false);
  }, [value]);

  // External `/` shortcut: when CodexPage focuses the input via the
  // ref, also flip expanded=true so the input is actually visible
  // even at narrow widths.
  useEffect(() => {
    const input = localRef.current;
    if (!input) return;
    const onFocus = () => setExpanded(true);
    input.addEventListener('focus', onFocus);
    return () => input.removeEventListener('focus', onFocus);
  }, []);

  return (
    <div className={styles.wrap} data-expanded={expanded || value.length > 0}>
      <button
        type="button"
        className={styles.toggleBtn}
        onClick={handleExpand}
        aria-label="Open search"
      >
        <Search size={16} strokeWidth={1.75} />
      </button>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.root}>
          <span className={styles.glyph} aria-hidden="true">▢</span>
          <span className={styles.icon} aria-hidden="true">
            <Search size={16} strokeWidth={1.75} />
          </span>
          <input
            ref={setRefs}
            className={styles.input}
            type="search"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Search codex…"
            aria-label="Codex search (coming soon — browse collections below)"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className={styles.kbd} aria-hidden="true">/</kbd>
        </div>

        {showHint && (
          <p className={styles.hint} role="status">
            Global codex search is{' '}
            <span className={styles.hintAccent}>coming next.</span>{' '}
            For now, browse a collection below.
          </p>
        )}
      </form>
    </div>
  );
}
