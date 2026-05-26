export const MS_PER_SECOND = 1_000;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR   = 3_600_000;

export function ageSeconds(timestampMs: number): number {
  return Math.floor((Date.now() - timestampMs) / MS_PER_SECOND);
}

export function ageMinutes(timestampMs: number): number {
  return Math.floor((Date.now() - timestampMs) / MS_PER_MINUTE);
}

export function isOlderThan(timestampMs: number, minutes: number): boolean {
  return Date.now() - timestampMs > minutes * MS_PER_MINUTE;
}

// Phase B will add full cycle math:
//   estimateCetusCycle(), estimateVallisTemp(), estimateCambionDrift(),
//   estimateZariman(), estimateDuviri(), estimateEarthCycle()
