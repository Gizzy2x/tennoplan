import type { Env, SyncMetadata } from '../types';
import { config } from '../config';

// ── Generic helpers ───────────────────────────────────────────────────────────

export async function kvGet(env: Env, key: string): Promise<string | null> {
  return env.TENNOPLAN_KV.get(key, 'text');
}

export async function kvGetJson<T>(env: Env, key: string): Promise<T | null> {
  const text = await env.TENNOPLAN_KV.get(key, 'text');
  if (!text) return null;
  try { return JSON.parse(text) as T; } catch { return null; }
}

export async function kvPut(env: Env, key: string, value: string, ttlSeconds?: number): Promise<void> {
  const opts = ttlSeconds ? { expirationTtl: ttlSeconds } : undefined;
  await env.TENNOPLAN_KV.put(key, value, opts);
}

export async function kvPutJson(env: Env, key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  await kvPut(env, key, JSON.stringify(value), ttlSeconds);
}

// ── Worldstate helpers ────────────────────────────────────────────────────────

export const getWorldstateCurrent  = (env: Env) => kvGet(env, config.kv.worldstate.current);
export const getWorldstatePrevious = (env: Env) => kvGet(env, config.kv.worldstate.previous);
export const getWorldstateMeta     = (env: Env) => kvGetJson<SyncMetadata>(env, config.kv.worldstate.metadata);

export async function writeWorldstate(
  env: Env,
  blob: string,
  meta: SyncMetadata,
  /** Pre-read current blob (updater already fetched it for the pulse diff). */
  prevBlob?: string | null,
): Promise<void> {
  const prev = prevBlob !== undefined ? prevBlob : await getWorldstateCurrent(env);
  await Promise.all([
    kvPut(env, config.kv.worldstate.current, blob, config.worldstate.kvTtlSeconds),
    kvPutJson(env, config.kv.worldstate.metadata, meta),
    ...(prev ? [kvPut(env, config.kv.worldstate.previous, prev, config.worldstate.kvTtlSeconds)] : []),
  ]);
}

// ── Codex helpers ─────────────────────────────────────────────────────────────

export const getCodexCurrent  = (env: Env) => kvGet(env, config.kv.codex.current);
export const getCodexPrevious = (env: Env) => kvGet(env, config.kv.codex.previous);
export const getCodexMeta     = (env: Env) => kvGetJson<SyncMetadata>(env, config.kv.codex.metadata);
/** Phase B — raw codex chunk manifest JSON (served by /v1/codex/manifest). */
export const getCodexManifest = (env: Env) => kvGet(env, config.kv.codex.manifest);

export async function writeCodex(env: Env, blob: string, meta: SyncMetadata): Promise<void> {
  const prev = await getCodexCurrent(env);
  await Promise.all([
    kvPut(env, config.kv.codex.current, blob, config.codex.kvTtlSeconds),
    kvPutJson(env, config.kv.codex.metadata, meta),
    ...(prev ? [kvPut(env, config.kv.codex.previous, prev, config.codex.kvTtlSeconds)] : []),
  ]);
}
