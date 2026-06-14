/**
 * workerBase — the single source of truth for the Cloudflare Worker base URL.
 *
 * Both live sync engines (WorldstateSync, StaticDataService) talk to the same
 * "app" worker (`/v1/worldstate`, `/v1/pulse`, `/v1/codex`, `/v1/codex/...`).
 * They used to each read `import.meta.env.VITE_WORLDSTATE_WORKER_URL` directly
 * and disable themselves when it was absent.
 *
 * Why a hardcoded default matters:
 *   Vite inlines `import.meta.env.VITE_*` at BUILD time. The CI frontend build
 *   injected the URL from a GitHub Actions secret that did not exist, so the
 *   produced bundle baked in an EMPTY string → both engines saw "not
 *   configured" → codex + worldstate sync silently disabled → the Codex tab and
 *   every codex-powered surface rendered empty in production (2026-06-13).
 *   `.env` is gitignored, so CI had no local fallback either.
 *
 * The worker URL is not a secret — it ships in `.env.example` and
 * `build-codex.yml` as a literal. So the robust, low-maintenance fix is a
 * compile-time default: if the env var is set (dev `.env`, or the now-restored
 * CI secret) we honour it; otherwise we fall back to the live production worker.
 * The app can never again be bricked by a missing/empty env var.
 */

/** The live production "app" worker. Keep in sync with `.env.example`. */
const PRODUCTION_WORKER_BASE = 'https://app.tennoplan.workers.dev';

/**
 * Resolved worker base URL, trailing slash stripped. Never empty: falls back
 * to the production worker when the env var is unset or blank. Consumers can
 * treat this as always-present and build `${WORKER_BASE}/v1/...` directly.
 */
export const WORKER_BASE: string = (() => {
  const env = (import.meta.env.VITE_WORLDSTATE_WORKER_URL as string | undefined)?.trim();
  const base = env && env.length > 0 ? env : PRODUCTION_WORKER_BASE;
  return base.replace(/\/$/, '');
})();
