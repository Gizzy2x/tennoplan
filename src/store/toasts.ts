/**
 * Toast store — global toast queue.
 *
 * Anywhere in the app can call `pushToast({ message, ... })` to drop
 * a notification into the bottom-right stack. The Toaster component
 * (mounted once in AppShell) subscribes and renders the live list.
 *
 * Toasts auto-dismiss on a per-toast timer; dismissal is also
 * available via the close affordance or by calling `dismissToast`.
 *
 * Keep this surface intentionally small: just info / success /
 * warning / error variants and a stable id. Anything fancier
 * (action buttons, undo, multi-line bodies) is a future add — we
 * resist the temptation to ship a toast framework, since the bulk
 * of in-app feedback should be in-context, not corner-stack.
 */

import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id:        number;
  message:   string;
  variant:   ToastVariant;
  /** ms until auto-dismiss. 0 = never. Default 6000. */
  durationMs: number;
}

interface ToastState {
  toasts:        Toast[];
  push:          (input: { message: string; variant?: ToastVariant; durationMs?: number }) => number;
  dismiss:       (id: number) => void;
  clearAll:      () => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: ({ message, variant = 'info', durationMs = 6000 }) => {
    const id = ++nextId;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant, durationMs }] }));
    return id;
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clearAll: () => set({ toasts: [] }),
}));

// Convenience export for non-React call sites (services, error
// handlers) that don't have hooks available.
export function pushToast(input: { message: string; variant?: ToastVariant; durationMs?: number }): number {
  return useToastStore.getState().push(input);
}

export function dismissToast(id: number): void {
  useToastStore.getState().dismiss(id);
}
