import { create } from 'zustand';
import type { DesignTokens, TypographyRoleName, TypographyRole } from '@/tokens/index';
import { defaultTokens, compactTokens } from '@/tokens/index';

// ─────────────────────────────────────────────────────────────────────────────
// Supporting types
// ─────────────────────────────────────────────────────────────────────────────

export interface CardOverride {
  translateX: number;   // px
  translateY: number;   // px
  scaleX:     number;   // unitless
  scaleY:     number;   // unitless
  rotate:     number;   // degrees
  bodyScale:  number;   // em multiplier for per-card font scaling
}

interface HistoryEntry {
  tokens:    DesignTokens;
  overrides: Record<string, Partial<TypographyRole>>;
}

const MAX_HISTORY = 20;

const DEFAULT_CARD_OVERRIDE: CardOverride = {
  translateX: 0,
  translateY: 0,
  scaleX:     1,
  scaleY:     1,
  rotate:     0,
  bodyScale:  1,
};

// ─────────────────────────────────────────────────────────────────────────────
// Store interface
// ─────────────────────────────────────────────────────────────────────────────

interface ThemeState {
  tokens:             DesignTokens;
  modes:              Record<string, DesignTokens>;
  activeMode:         string;
  overrides:          Record<string, Partial<TypographyRole>>;
  cardOverrides:      Record<string, CardOverride>;
  past:               HistoryEntry[];
  future:             HistoryEntry[];
  cardEditModeEnabled: boolean;
  selectedCardId:     string | null;

  // Token mutations
  updateToken:         (path: string, value: unknown) => void;
  updateNested:        (updates: Partial<DesignTokens>) => void;
  updateRoleProperty:  (role: TypographyRoleName, property: keyof TypographyRole, value: unknown) => void;
  updateRoleTransform: (role: TypographyRoleName, key: keyof NonNullable<TypographyRole['transforms']>, value: number) => void;
  setBodyScale:        (multiplier: number) => void;

  // Override system (unique elements)
  markAsUnique:   (overrideId: string, partialRole: Partial<TypographyRole>) => void;
  updateOverride: (overrideId: string, property: keyof TypographyRole, value: unknown) => void;
  removeOverride: (overrideId: string) => void;

  // History
  undo: () => void;
  redo: () => void;

  // Modes
  resetTokens:    () => void;
  setActiveMode:  (mode: string) => void;
  addMode:        (name: string, modeTokens: DesignTokens) => void;

  // Card editing
  updateCardOverride: (cardId: string, override: Partial<CardOverride>) => void;
  removeCardOverride: (cardId: string) => void;
  toggleCardEditMode: () => void;
  setSelectedCardId:  (id: string | null) => void;

  // Import / export
  exportJSON: () => string;
  importJSON: (json: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function snapshot(tokens: DesignTokens, overrides: Record<string, Partial<TypographyRole>>): HistoryEntry {
  return { tokens: deepClone(tokens), overrides: deepClone(overrides) };
}

function pushPast(past: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [...past.slice(-(MAX_HISTORY - 1)), entry];
}

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function generateCSSVars(tokens: DesignTokens): string {
  const lines: string[] = [':root {'];

  Object.entries(tokens.colors).forEach(([k, v]) => {
    lines.push(`  --color-${camelToKebab(k)}: ${v};`);
  });

  Object.entries(tokens.typography.roles).forEach(([role, r]) => {
    lines.push(`  --typo-${role}-family: ${r.fontFamily};`);
    lines.push(`  --typo-${role}-size: ${r.size};`);
    lines.push(`  --typo-${role}-weight: ${r.weight};`);
    lines.push(`  --typo-${role}-spacing: ${r.letterSpacing};`);
    lines.push(`  --typo-${role}-transform: ${r.textTransform};`);
    if (r.lineHeight !== undefined) lines.push(`  --typo-${role}-line-height: ${r.lineHeight};`);
    if (r.color) lines.push(`  --typo-${role}-color: ${r.color};`);
  });

  lines.push(`  --typo-scale: ${tokens.typography.bodyScaleMultiplier};`);

  Object.entries(tokens.spacing).forEach(([k, v]) => {
    lines.push(`  --space-${camelToKebab(k)}: ${v};`);
  });

  Object.entries(tokens.borders).forEach(([k, v]) => {
    lines.push(`  --border-${camelToKebab(k)}: ${v};`);
  });

  lines.push('}');
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useThemeStore = create<ThemeState>((set, get) => ({
  tokens:              deepClone(defaultTokens),
  modes:               { 'Orokin Default': deepClone(defaultTokens), 'Compact': deepClone(compactTokens) },
  activeMode:          'Orokin Default',
  overrides:           {},
  cardOverrides:       {},
  past:                [],
  future:              [],
  cardEditModeEnabled: false,
  selectedCardId:      null,

  // ── Generic token path update ──────────────────────────────────────────
  updateToken: (path, value) => {
    set((state) => {
      const entry = snapshot(state.tokens, state.overrides);
      const newTokens = deepClone(state.tokens);
      const keys = path.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cur: any = newTokens;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = value;
      return { tokens: newTokens, past: pushPast(state.past, entry), future: [] };
    });
  },

  // ── Nested partial update (used by legacy ColorInput) ─────────────────
  updateNested: (updates) => {
    set((state) => {
      const entry = snapshot(state.tokens, state.overrides);
      return {
        tokens: {
          ...state.tokens,
          ...updates,
          colors:     { ...state.tokens.colors,     ...updates.colors },
          typography: { ...state.tokens.typography, ...updates.typography },
          spacing:    { ...state.tokens.spacing,    ...updates.spacing },
          borders:    { ...state.tokens.borders,    ...updates.borders },
          effects:    { ...state.tokens.effects,    ...updates.effects },
          animations: { ...state.tokens.animations, ...updates.animations },
        },
        past:   pushPast(state.past, entry),
        future: [],
      };
    });
  },

  // ── Update a single property of a typography role ─────────────────────
  updateRoleProperty: (role, property, value) => {
    set((state) => {
      const entry = snapshot(state.tokens, state.overrides);
      const newTokens = deepClone(state.tokens);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (newTokens.typography.roles[role] as any)[property] = value;
      return { tokens: newTokens, past: pushPast(state.past, entry), future: [] };
    });
  },

  // ── Update a 4-axis transform on a role ───────────────────────────────
  updateRoleTransform: (role, key, value) => {
    set((state) => {
      const entry = snapshot(state.tokens, state.overrides);
      const newTokens = deepClone(state.tokens);
      const existing = newTokens.typography.roles[role].transforms ?? { translateX: 0, translateY: 0, scale: 1, rotate: 0 };
      newTokens.typography.roles[role].transforms = { ...existing, [key]: value };
      return { tokens: newTokens, past: pushPast(state.past, entry), future: [] };
    });
  },

  // ── Global body scale multiplier ──────────────────────────────────────
  setBodyScale: (multiplier) => {
    set((state) => {
      const entry = snapshot(state.tokens, state.overrides);
      const newTokens = deepClone(state.tokens);
      newTokens.typography.bodyScaleMultiplier = Math.min(2.0, Math.max(0.5, multiplier));
      return { tokens: newTokens, past: pushPast(state.past, entry), future: [] };
    });
  },

  // ── Unique element overrides ──────────────────────────────────────────
  markAsUnique: (overrideId, partialRole) => {
    set((state) => {
      const entry = snapshot(state.tokens, state.overrides);
      return {
        overrides: { ...state.overrides, [overrideId]: partialRole },
        past:      pushPast(state.past, entry),
        future:    [],
      };
    });
  },

  updateOverride: (overrideId, property, value) => {
    set((state) => {
      const entry = snapshot(state.tokens, state.overrides);
      const existing = state.overrides[overrideId] ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {
        overrides: { ...state.overrides, [overrideId]: { ...existing, [property]: value } },
        past:      pushPast(state.past, entry),
        future:    [],
      };
    });
  },

  removeOverride: (overrideId) => {
    set((state) => {
      const entry = snapshot(state.tokens, state.overrides);
      const newOverrides = { ...state.overrides };
      delete newOverrides[overrideId];
      return { overrides: newOverrides, past: pushPast(state.past, entry), future: [] };
    });
  },

  // ── Undo / Redo ───────────────────────────────────────────────────────
  undo: () => {
    set((state) => {
      if (state.past.length === 0) return {};
      const prev  = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      const currentEntry = snapshot(state.tokens, state.overrides);
      return {
        tokens:    prev.tokens,
        overrides: prev.overrides,
        past:      newPast,
        future:    [currentEntry, ...state.future].slice(0, MAX_HISTORY),
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return {};
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      const currentEntry = snapshot(state.tokens, state.overrides);
      return {
        tokens:    next.tokens,
        overrides: next.overrides,
        past:      pushPast(state.past, currentEntry),
        future:    newFuture,
      };
    });
  },

  // ── Mode management ───────────────────────────────────────────────────
  resetTokens: () => {
    set((state) => {
      const entry = snapshot(state.tokens, state.overrides);
      return {
        tokens:    deepClone(defaultTokens),
        overrides: {},
        past:      pushPast(state.past, entry),
        future:    [],
      };
    });
  },

  setActiveMode: (mode) => {
    set((state) => {
      if (!state.modes[mode]) return {};
      // save current state back into active mode
      const updatedModes = { ...state.modes, [state.activeMode]: deepClone(state.tokens) };
      return {
        modes:      updatedModes,
        tokens:     deepClone(updatedModes[mode]),
        activeMode: mode,
        past:       [],
        future:     [],
      };
    });
  },

  addMode: (name, modeTokens) => {
    set((state) => ({
      modes: { ...state.modes, [name]: deepClone(modeTokens) },
    }));
  },

  // ── Card editing ──────────────────────────────────────────────────────
  updateCardOverride: (cardId, override) => {
    set((state) => {
      const existing = state.cardOverrides[cardId] ?? { ...DEFAULT_CARD_OVERRIDE };
      return { cardOverrides: { ...state.cardOverrides, [cardId]: { ...existing, ...override } } };
    });
  },

  removeCardOverride: (cardId) => {
    set((state) => {
      const next = { ...state.cardOverrides };
      delete next[cardId];
      return { cardOverrides: next };
    });
  },

  toggleCardEditMode: () => {
    set((state) => ({
      cardEditModeEnabled: !state.cardEditModeEnabled,
      selectedCardId: state.cardEditModeEnabled ? null : state.selectedCardId,
    }));
  },

  setSelectedCardId: (id) => {
    set({ selectedCardId: id });
  },

  // ── Import / export ───────────────────────────────────────────────────
  exportJSON: () => {
    const state = get();
    const currentModes = { ...state.modes, [state.activeMode]: deepClone(state.tokens) };
    const payload = {
      version:      '3.5.0',
      activeMode:   state.activeMode,
      modes:        currentModes,
      overrides:    state.overrides,
      historySummary: {
        undoDepth:  state.past.length,
        redoDepth:  state.future.length,
      },
      cssVariables: generateCSSVars(state.tokens),
    };
    return JSON.stringify(payload, null, 2);
  },

  importJSON: (json) => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.modes && parsed.activeMode && parsed.modes[parsed.activeMode]) {
        set({
          modes:      parsed.modes,
          tokens:     deepClone(parsed.modes[parsed.activeMode]),
          activeMode: parsed.activeMode,
          overrides:  parsed.overrides ?? {},
          past:       [],
          future:     [],
        });
      } else if (parsed.colors && parsed.typography) {
        // bare DesignTokens object
        set({ tokens: parsed as DesignTokens, past: [], future: [] });
      }
    } catch (err) {
      console.error('Failed to import tokens:', err);
    }
  },
}));
