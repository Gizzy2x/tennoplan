import type { DataSource, DataQuality } from '../types';

export async function makeEtag(blob: string): Promise<string> {
  const encoded    = new TextEncoder().encode(blob);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  const hex        = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  return `"${hex}"`;
}

export function makeVersion(source: DataSource, now = Date.now()): string {
  const d   = new Date(now);
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `${source}-${ymd}`;
}

export function scoreQuality(itemCount: number, errorCount: number): DataQuality {
  if (errorCount > 0 || itemCount < 100) return 'low';
  if (itemCount < 1_000)                 return 'medium';
  return 'high';
}
