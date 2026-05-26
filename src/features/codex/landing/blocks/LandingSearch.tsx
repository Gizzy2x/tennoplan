/**
 * LandingSearch — the visual promise of a global codex search.
 *
 * The engine arrives in Phase B (federated search with category chips).
 * For now the bar is fully interactive: focusable, accepts typing,
 * shows an inline hint on submit pointing the user to Collections
 * below. This keeps the page's "single starting point" feel without
 * delivering a broken Enter key.
 *
 * The placement (directly below the hero tagline) mirrors MDN, Stripe
 * Docs, and Algolia DocSearch — the strongest pattern for reference
 * surfaces.
 */

import { useCallback, useState } from 'react';
import { Search } from 'lucide-react';
import styles from './LandingSearch.module.css';

export function LandingSearch() {
  const [value, setValue]               = useState('');
  const [showHint, setShowHint]         = useState(false);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().length === 0) return;
    setShowHint(true);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.currentTarget.value);
    if (showHint) setShowHint(false);
  }, [showHint]);

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.root}>
        <span className={styles.icon} aria-hidden="true">
          <Search size={18} strokeWidth={1.75} />
        </span>
        <input
          className={styles.input}
          type="search"
          value={value}
          onChange={handleChange}
          placeholder="Search the entire codex…"
          aria-label="Search the entire codex"
          autoComplete="off"
          spellCheck={false}
        />
        <span className={styles.affordance} aria-hidden="true">
          Global · soon
        </span>
      </div>

      {showHint && (
        <p className={styles.hint} role="status">
          Global codex search is{' '}
          <span className={styles.hintAccent}>coming next.</span>{' '}
          For now, browse a collection below to find what you're looking for.
        </p>
      )}
    </form>
  );
}
