/**
 * quickLook — global "smart window" channel.
 *
 * Two-step codex access from anywhere outside the codex:
 *   1. Click an item/resource → quickLook.open(uniqueName, name) pops a compact
 *      preview (the CodexQuickLook sheet) with the most relevant info.
 *   2. The preview's "Open full entry →" hands off to navigation.openCodexEntry,
 *      which routes to the full codex detail page (and back to origin).
 *
 * Mirrors the ModCard → ModDetailModal feel, generalised to every category.
 * One store, mounted once at the app root, callable from any surface.
 */

import { create } from 'zustand';
import type { CodexDeepLink } from './navigation';

/** One contextual drop row — e.g. "Stage 1 · Rot A" at 12.5%. */
export interface QuickLookDropRow {
  /** Where in the source, e.g. "Stage 1 · Rot A". */
  label:  string;
  /** Drop chance as a percentage (0–100). */
  chance: number;
}

/**
 * Optional context about WHERE an item was opened from — lets the smart window
 * show source-specific drop rates (e.g. this bounty's per-stage %) on top of the
 * item's general codex info. Generic, so any surface can supply it.
 */
export interface QuickLookContext {
  /** Source heading, e.g. "Konzu · Lv 5–15 Bounty". */
  source?: string;
  /** Per-occurrence drop rows for THIS item in that source. */
  drops?:  QuickLookDropRow[];
}

interface QuickLookState {
  /** The item currently previewed, or null when closed. */
  link: CodexDeepLink | null;
  /** Where it was opened from (source-specific drop rates), or null. */
  context: QuickLookContext | null;
  /** Open the preview for a codex item. `name` is a resolution fallback;
   *  `context` adds source-specific drop info (e.g. a bounty's per-stage %). */
  open: (uniqueName: string, name?: string, context?: QuickLookContext) => void;
  /** Close the preview. */
  close: () => void;
}

export const useQuickLook = create<QuickLookState>((set) => ({
  link: null,
  context: null,
  open: (uniqueName, name, context) => set({ link: { uniqueName, name }, context: context ?? null }),
  close: () => set({ link: null, context: null }),
}));
