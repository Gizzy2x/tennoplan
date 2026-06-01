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

interface QuickLookState {
  /** The item currently previewed, or null when closed. */
  link: CodexDeepLink | null;
  /** Open the preview for a codex item. `name` is a resolution fallback. */
  open: (uniqueName: string, name?: string) => void;
  /** Close the preview. */
  close: () => void;
}

export const useQuickLook = create<QuickLookState>((set) => ({
  link: null,
  open: (uniqueName, name) => set({ link: { uniqueName, name } }),
  close: () => set({ link: null }),
}));
