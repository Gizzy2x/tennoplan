import type { CycleId } from '@/core/domain/cycles';

export interface WorldTheme {
  /** Primary brand color — WCAG AA on #080a08 */
  accent:      string;
  /** Alpha version for background tints / halos (12% opacity) */
  glowLow:     string;
  /** Alpha version for border highlights (35% opacity) */
  border:      string;
  /** Atmosphere-tinted text — 0.005–0.01 chroma shift from #e3e8de */
  textPrimary: string;
}

/**
 * World-specific semantic themes.
 * All `accent` values are calibrated for WCAG AA contrast (≥4.5:1) on #080a08.
 * Neutral tints are imperceptible by design — they create atmosphere, not contrast.
 */
export const WORLD_THEMES: Record<CycleId, WorldTheme> = {
  cetus: {
    accent:      '#00c4ff',                   // Ostron Cyan
    glowLow:     'rgba(0, 196, 255, 0.12)',
    border:      'rgba(0, 196, 255, 0.35)',
    textPrimary: '#e3e4e6',                   // Cool tilt
  },
  vallis: {
    accent:      '#00d4a8',                   // Solaris Turquoise
    glowLow:     'rgba(0, 212, 168, 0.12)',
    border:      'rgba(0, 212, 168, 0.35)',
    textPrimary: '#e3e5e4',                   // Cool-green tilt
  },
  cambion: {
    accent:      '#e8710a',                   // Entrati Orange
    glowLow:     'rgba(232, 113, 10, 0.12)',
    border:      'rgba(232, 113, 10, 0.35)',
    textPrimary: '#e6e1de',                   // Warm tilt
  },
  zariman: {
    accent:      '#00d47a',                   // Void Emerald
    glowLow:     'rgba(0, 212, 122, 0.12)',
    border:      'rgba(0, 212, 122, 0.35)',
    textPrimary: '#e3e5e3',                   // Cool-green tilt
  },
  duviri: {
    accent:      '#c4b8e8',                   // Duviri Silver
    glowLow:     'rgba(196, 184, 232, 0.12)',
    border:      'rgba(196, 184, 232, 0.35)',
    textPrimary: '#e3e2e6',                   // Slight purple tilt
  },
  earth: {
    accent:      '#52c252',                   // Earth Green
    glowLow:     'rgba(82, 194, 82, 0.12)',
    border:      'rgba(82, 194, 82, 0.35)',
    textPrimary: '#e3e5e3',                   // Natural-green tilt
  },
};

/**
 * Prestige tier per world-state key (e.g. 'cetus-night').
 * P0 = highest-value hunting windows. These trigger the Pre-heat header.
 * P1 = notable but not session-changing. No key = 'none'.
 */
export const PRESTIGE_LEVEL: Partial<Record<string, 'P0' | 'P1'>> = {
  'cetus-night':     'P0',   // Eidolon hunt window
  'vallis-warm':     'P0',   // Exploiter Orb window
  'cambion-fass':    'P0',   // Isolation Vaults / Scintillant
  'zariman-corpus':  'P1',
  'zariman-grineer': 'P1',
};

/** Pre-heat window: Master Header activates this many ms before a P0 phase starts */
export const PRE_HEAT_MS = 15 * 60_000;
