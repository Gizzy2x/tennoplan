export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin':   '*',
  'Access-Control-Allow-Methods':  'GET, OPTIONS',
  'Access-Control-Allow-Headers':  'If-None-Match',
  'Access-Control-Expose-Headers': 'ETag, X-Data-Source, X-Data-Age, X-Tennoplan-Source',
};

export function corsResponse(body: string | null, init: ResponseInit): Response {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(body, { ...init, headers });
}

export function handleOptions(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
