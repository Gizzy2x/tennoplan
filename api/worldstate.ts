// ---------------------------------------------------------------------------
// LOCAL DEV FALLBACK ONLY — not used in production.
//
// In production, Tennoplan routes through the Cloudflare Worker at
// cloudflare-worker/src/index.ts, which pulls from warframestat.us once per
// minute and caches in KV. Set VITE_WORLDSTATE_WORKER_URL in .env to activate.
//
// This Vercel function is kept for `npm run dev` environments where the Worker
// is not running. SyncService bypasses it entirely when VITE_WORLDSTATE_WORKER_URL
// is set, so it will never be invoked in a deployed build.
// ---------------------------------------------------------------------------

export default async function handler(req: any, res: any) {
  try {
    const response = await fetch('https://api.warframestat.us/pc', {
      headers: {
        'User-Agent': 'Tennoplan/1.0 (local-dev)',
        'Accept': 'application/json',
      },
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    const text = await response.text();

    if (!response.ok || !text) {
      const msg = `Upstream API failed with status ${response.status}`;
      console.error(msg);
      return res.status(response.status || 500).json({ error: msg });
    }

    try {
      res.status(200).json(JSON.parse(text));
    } catch {
      throw new Error('Failed to parse upstream JSON response');
    }
  } catch (error) {
    res.status(500).json({
      error:   'Failed to fetch worldstate',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
