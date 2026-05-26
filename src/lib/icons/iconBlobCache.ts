/**
 * Icon blob cache — CDN download + Cache API persistence + concurrency queue.
 *
 * Single source of truth for icon URLs across the entire app.
 *
 * Flow per icon:
 *   1. In-memory Map (instant, this session)
 *   2. Browser Cache API (fast, survives restarts)
 *   3. CDN fetch via concurrency-limited queue (max 15 parallel)
 *   4. Placeholder on failure (NOT permanently cached — retries on next call)
 *
 * Failures are tracked in a separate Set so we don't permanently mark a
 * transiently-failed URL as broken. The "Verify & Repair" button clears this.
 */

import { useState, useEffect } from 'react';
import { nativeFetch } from '@/lib/http/nativeFetch';
import { logger } from '@/adapters/logging/logger';

export const ICON_CACHE_NAME = 'tennoplan-icons-v1';
export const PLACEHOLDER = '/lotus-placeholder.svg';

// ─── In-memory state ─────────────────────────────────────────────────────────

const _resolved = new Map<string, string>();        // cdnUrl → blob:// URL (success only)
const _inflight = new Map<string, Promise<string>>(); // cdnUrl → shared download promise
const _failures = new Set<string>();                  // cdnUrl → failed this session (retryable)

// Diagnostic state — exposed for the Settings panel
let _lastError:    string | null = null;
let _failureCount: number = 0;

export function getCacheDiagnostics() {
  return {
    lastError:     _lastError,
    failureCount:  _failureCount,
    resolvedCount: _resolved.size,
    failedUrls:    Array.from(_failures).slice(0, 5), // sample for debugging
  };
}

export function clearFailureRecords(): void {
  _failures.clear();
  _lastError = null;
  _failureCount = 0;
}

// ─── Concurrency queue ───────────────────────────────────────────────────────

const MAX_CONCURRENT = 15;
let _active = 0;
const _waiting: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  return new Promise((resolve) => {
    if (_active < MAX_CONCURRENT) { _active++; resolve(); }
    else { _waiting.push(() => { _active++; resolve(); }); }
  });
}

function releaseSlot(): void {
  _active = Math.max(0, _active - 1);
  const next = _waiting.shift();
  if (next) next();
}

// ─── Core resolver ────────────────────────────────────────────────────────────

export async function resolveIconBlobUrl(cdnUrl: string): Promise<string> {
  if (!cdnUrl || cdnUrl === PLACEHOLDER) return PLACEHOLDER;

  const mem = _resolved.get(cdnUrl);
  if (mem) return mem;

  const inflight = _inflight.get(cdnUrl);
  if (inflight) return inflight;

  const promise = (async (): Promise<string> => {
    try {
      // Cache API hit — no network needed
      const cache = await caches.open(ICON_CACHE_NAME);
      const hit   = await cache.match(cdnUrl);
      if (hit) {
        const blob = await hit.blob();
        const url  = URL.createObjectURL(blob);
        _resolved.set(cdnUrl, url);
        _failures.delete(cdnUrl); // recovered
        return url;
      }

      // CDN fetch — uses Rust reqwest in Tauri (no CORS), browser fetch otherwise
      await acquireSlot();
      try {
        const res = await nativeFetch(cdnUrl);
        if (!res.ok) {
          _failures.add(cdnUrl);
          _failureCount++;
          _lastError = `HTTP ${res.status} ${res.statusText} for ${shortUrl(cdnUrl)}`;
          // Log only the first few failures per session to avoid spamming the
          // event log with 13k duplicate entries when a CDN is down.
          if (_failureCount <= 3) {
            logger.error('icons', `Icon HTTP ${res.status}`, {
              url:    cdnUrl,
              status: res.status,
              statusText: res.statusText,
            }, 'iconBlobCache');
          }
          return PLACEHOLDER;
        }
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        _resolved.set(cdnUrl, url);
        _failures.delete(cdnUrl);
        await cache.put(
          cdnUrl,
          new Response(blob.slice(0), {
            status: 200,
            headers: { 'Content-Type': blob.type },
          }),
        );
        return url;
      } finally {
        releaseSlot();
      }
    } catch (err) {
      _failures.add(cdnUrl);
      _failureCount++;
      _lastError = err instanceof Error
        ? `${err.name}: ${err.message}`
        : String(err);
      if (_failureCount <= 3) {
        logger.error('icons', `Icon fetch threw: ${_lastError}`, {
          url: cdnUrl,
          error: err,
        }, 'iconBlobCache');
      }
      return PLACEHOLDER;
    } finally {
      _inflight.delete(cdnUrl);
    }
  })();

  _inflight.set(cdnUrl, promise);
  return promise;
}

function shortUrl(u: string): string {
  return u.length > 80 ? `${u.slice(0, 77)}...` : u;
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export function prewarmIconUrl(cdnUrl: string): void {
  if (!cdnUrl || cdnUrl === PLACEHOLDER) return;
  if (_resolved.has(cdnUrl)) return;
  if (_inflight.has(cdnUrl)) return;
  void resolveIconBlobUrl(cdnUrl);
}

export async function clearIconBlobCache(): Promise<void> {
  await caches.delete(ICON_CACHE_NAME);
  _resolved.clear();
  _inflight.clear();
  _failures.clear();
  _waiting.length = 0;
  _active = 0;
  _lastError = null;
  _failureCount = 0;
}

// ─── React hook ───────────────────────────────────────────────────────────────

export function useIconBlobUrl(cdnUrl: string): string {
  const [url, setUrl] = useState<string>(() => _resolved.get(cdnUrl) ?? PLACEHOLDER);

  useEffect(() => {
    if (!cdnUrl || cdnUrl === PLACEHOLDER) {
      setUrl(PLACEHOLDER);
      return;
    }

    const hit = _resolved.get(cdnUrl);
    if (hit) { setUrl(hit); return; }

    let cancelled = false;
    resolveIconBlobUrl(cdnUrl).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => { cancelled = true; };
  }, [cdnUrl]);

  return url;
}
