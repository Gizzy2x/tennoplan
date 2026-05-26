import type { Env } from '../../types';
import { getWorldstateMeta, getCodexMeta } from '../../storage/kv';
import { ageSeconds } from '../../utils/date';
import { corsResponse } from '../../middleware/cors';

export async function handleHealth(_request: Request, env: Env): Promise<Response> {
  const [wsMeta, codexMeta] = await Promise.all([
    getWorldstateMeta(env),
    getCodexMeta(env),
  ]);

  const worldstate = wsMeta
    ? {
        lastSync:   wsMeta.lastSync,
        age:        ageSeconds(wsMeta.lastSync),
        quality:    wsMeta.quality,
        source:     wsMeta.source,
        errorCount: wsMeta.errorCount,
        ...(wsMeta.lastError ? { lastError: wsMeta.lastError } : {}),
      }
    : null;

  const codex = codexMeta
    ? {
        lastSync:   codexMeta.lastSync,
        age:        ageSeconds(codexMeta.lastSync),
        quality:    codexMeta.quality,
        itemCount:  codexMeta.itemCount ?? 0,
        errorCount: codexMeta.errorCount,
        ...(codexMeta.lastError ? { lastError: codexMeta.lastError } : {}),
      }
    : null;

  const wsErrors    = wsMeta?.errorCount    ?? 0;
  const codexErrors = codexMeta?.errorCount ?? 0;

  const status =
    !wsMeta && !codexMeta           ? 'error'    :
    wsErrors > 2 || codexErrors > 2 ? 'degraded' :
                                      'healthy';

  const body = JSON.stringify({
    success: true,
    data: { status, worldstate, codex },
  });

  return corsResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
