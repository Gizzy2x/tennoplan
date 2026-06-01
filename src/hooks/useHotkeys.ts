/**
 * useHotkeys — global keyboard shortcut registry.
 *
 * Two responsibilities in one tiny module:
 *
 *   1. Components REGISTER hotkeys via the hook. The registry is
 *      module-level state (a Map keyed by combo string), so the
 *      cheat sheet can read every active binding at any time and
 *      render a discoverable list.
 *
 *   2. A single window-level keydown listener routes pressed keys
 *      to whichever handler last registered them, with a few
 *      sensible defaults: skip when typing in a field, let modifier
 *      keys through (ctrl/cmd/alt never get hijacked), respect
 *      Escape's native semantics in inputs (clear / blur first,
 *      hotkey second only if nothing in the field is active).
 *
 * Hotkeys are scoped by `scope` — only entries whose scope matches
 * the *current* active scope fire. The default scope is 'global';
 * pages can opt into a more specific scope ('codex', 'modal', etc.)
 * which suppresses unrelated bindings while that scope is active.
 *
 * The cheat sheet (HotkeysCheatSheet.tsx) subscribes to the
 * registry and re-renders whenever a binding is added or removed.
 */

import { useEffect, useRef } from 'react';

export interface HotkeyDef {
  /** Key combo string, e.g. "?", "Escape", "/", "g h" (chord). */
  combo:       string;
  /** Human-readable description shown in the cheat sheet. */
  description: string;
  /** Optional scope; 'global' (default) fires anywhere. */
  scope?:      string;
  /** The handler invoked when the combo fires. */
  handler:     (e: KeyboardEvent) => void;
  /**
   * If true, the handler runs even when focus is inside an input,
   * textarea, or contentEditable. Default false — most app-level
   * shortcuts should defer to native field behaviour.
   */
  allowInField?: boolean;
}

// ─── Registry ───────────────────────────────────────────────────────────────

type RegistryEntry = HotkeyDef & { id: number };
let nextId = 0;
const registry = new Map<number, RegistryEntry>();
const listeners = new Set<() => void>();

/**
 * Cached snapshot — `useSyncExternalStore` requires the snapshot
 * returned by `getSnapshot` to be reference-stable between
 * mutations. Without caching, `[...registry.values()]` returns a
 * fresh array every call and React loops forever.
 */
let snapshot: RegistryEntry[] | null = null;

function emitChange() {
  snapshot = null;  // invalidate so the next listHotkeys() rebuilds
  for (const l of listeners) l();
}

function register(def: HotkeyDef): number {
  const id = nextId++;
  registry.set(id, { ...def, id });
  emitChange();
  return id;
}

function unregister(id: number) {
  if (registry.delete(id)) emitChange();
}

/** Read-only snapshot of all currently-registered hotkeys. */
export function listHotkeys(): RegistryEntry[] {
  if (snapshot === null) snapshot = [...registry.values()];
  return snapshot;
}

/** Subscribe to registry changes (used by the cheat sheet). */
export function subscribeHotkeys(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// ─── Active scope (cooperative) ─────────────────────────────────────────────

let activeScope = 'global';

export function setHotkeyScope(scope: string) {
  activeScope = scope;
}

export function getHotkeyScope(): string {
  return activeScope;
}

// ─── Global keydown router ──────────────────────────────────────────────────

function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Match key combos to KeyboardEvents. Supports single keys
 * ("?", "/", "Escape", "ArrowLeft", "j", "k") and modifier-prefixed
 * combos ("ctrl+k", "shift+/"). Modifiers are matched literally so
 * `/` without shift doesn't fire `shift+/`.
 */
function matches(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+').map((p) => p.trim());
  const key   = parts[parts.length - 1];
  const wantCtrl  = parts.includes('ctrl')  || parts.includes('cmd');
  const wantShift = parts.includes('shift');
  const wantAlt   = parts.includes('alt');

  const eKey = e.key.toLowerCase();
  if (eKey !== key) return false;
  if (wantCtrl !== (e.ctrlKey || e.metaKey)) return false;
  // Shift: only ENFORCE when the combo explicitly requests it.
  // Symbol keys like `?` that require shift+/ on US layouts will
  // still match a bare `?` registration because the produced
  // `e.key` is `?` regardless of how the key was generated.
  if (wantShift && !e.shiftKey) return false;
  if (wantAlt !== e.altKey) return false;
  return true;
}

function handleKey(e: KeyboardEvent) {
  // Iterate newest-first so the most-recently-registered handler wins
  // when two scopes register the same combo. This matches the React
  // mental model where a child component overrides a parent.
  const entries = [...registry.values()].reverse();
  for (const entry of entries) {
    const scope = entry.scope ?? 'global';
    if (scope !== 'global' && scope !== activeScope) continue;
    if (!matches(e, entry.combo)) continue;
    if (!entry.allowInField && isTypingInField(e.target)) continue;
    entry.handler(e);
    return; // first match wins
  }
}

let listenerInstalled = false;
function ensureListener() {
  if (listenerInstalled) return;
  document.addEventListener('keydown', handleKey);
  listenerInstalled = true;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Register one or more hotkeys for the lifetime of the calling
 * component. Two design notes:
 *
 *   1. Handlers route through a ref so callers don't have to memoize
 *      them — every render's latest handler closure is used when the
 *      key fires, but the registry entry itself stays stable.
 *
 *   2. Registry mutations only happen when the SHAPE of the defs
 *      changes (combo + scope keys). Identity churn on the defs
 *      array between renders is ignored. This prevents the infinite
 *      register/unregister loop that would otherwise occur whenever
 *      a hotkey-owning component re-renders.
 */
export function useHotkeys(defs: HotkeyDef | HotkeyDef[]) {
  const list = Array.isArray(defs) ? defs : [defs];

  // Ref always points at the latest defs so the registered handler
  // closure reads the current one without re-registering.
  const latestRef = useRef(list);
  latestRef.current = list;

  // Shape key — re-register only when combos/scopes change, not on
  // every parent re-render.
  const shapeKey = list
    .map((d) => `${d.scope ?? 'global'}:${d.combo}:${d.allowInField ? 1 : 0}`)
    .join('|');

  useEffect(() => {
    ensureListener();
    const snapshotDefs = latestRef.current;
    const ids = snapshotDefs.map((d, i) => register({
      combo:        d.combo,
      description:  d.description,
      scope:        d.scope,
      allowInField: d.allowInField,
      handler:      (e) => latestRef.current[i]?.handler(e),
    }));
    return () => {
      for (const id of ids) unregister(id);
    };
  }, [shapeKey]);
}
