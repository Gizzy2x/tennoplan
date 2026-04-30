import type { Env } from '../types';
import { handleHealth } from './handlers/health';
import { handleWorldstate } from './handlers/worldstate';
import { corsResponse, handleOptions } from '../middleware/cors';

// Phase C will import: handleCodex from './handlers/codex'

export function route(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return Promise.resolve(handleOptions());
  }

  if (request.method !== 'GET') {
    return Promise.resolve(
      corsResponse(
        JSON.stringify({ success: false, error: 'Method Not Allowed', code: 'INVALID_REQUEST' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } },
      ),
    );
  }

  const { pathname } = new URL(request.url);

  if (pathname === '/v1/health')                 return handleHealth(request, env);
  if (pathname.startsWith('/v1/worldstate'))     return handleWorldstate(request, env);

  // Phase C:
  // if (pathname.startsWith('/v1/codex')) return handleCodex(request, env);

  return Promise.resolve(
    corsResponse(
      JSON.stringify({ success: false, error: 'Not Found', code: 'INVALID_REQUEST' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    ),
  );
}
