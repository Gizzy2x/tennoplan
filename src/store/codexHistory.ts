/**
 * codexHistory — persisted "recently inspected" log for the Codex landing.
 *
 * Powers the Continue Browsing strip. One entry per uniqueName (deduped:
 * re-opening an item moves it to the front rather than creating a duplicate).
 * Capped at MAX_HISTORY most-recent entries so the strip stays compact.
 *
 * Persistence: localStorage via Zustand's `persist` middleware. Survives
 * refreshes and app restarts. The store is category-agnostic — it keeps
 * a minimal shape (uniqueName / name / category / iconUrl / openedAt) so
 * any code path (mod modal, warframe entry, spotlight) can push with
 * the same call.
 *
 * Why a store and not Dexie: this is small ephemeral UI state, not codex
 * data. It belongs in localStorage where it's instant to read, and
 * persist middleware handles serialization for us.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ItemCategory } from '@/core/domain/tennoplanApi';

export interface CodexHistoryEntry {
  uniqueName: string;
  name:       string;
  category:   ItemCategory;
  iconUrl?:   string;
  /** Unix ms when this entry was opened. */
  openedAt:   number;
}

interface CodexHistoryState {
  entries: CodexHistoryEntry[];
  /** Push an entry to the top of history. Re-opens dedup to the new position. */
  push: (entry: Omit<CodexHistoryEntry, 'openedAt'>) => void;
  /** Clear history — used by the settings reset path and tests. */
  clear: () => void;
}

const MAX_HISTORY = 5;

export const useCodexHistory = create<CodexHistoryState>()(
  persist(
    (set) => ({
      entries: [],
      push: (entry) =>
        set((state) => {
          // Dedup by uniqueName, then prepend the fresh open. Slice to the cap
          // so the persisted payload stays tiny (5 small objects).
          const without = state.entries.filter((e) => e.uniqueName !== entry.uniqueName);
          const next: CodexHistoryEntry[] = [
            { ...entry, openedAt: Date.now() },
            ...without,
          ].slice(0, MAX_HISTORY);
          return { entries: next };
        }),
      clear: () => set({ entries: [] }),
    }),
    {
      name:    'tennoplan:codex-history',
      // Persist only the entries array, not function refs.
      partialize: (state) => ({ entries: state.entries }),
      version: 1,
    },
  ),
);
