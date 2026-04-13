import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const upstream = await fetch('https://api.warframestat.us/pc');
    if (!upstream.ok) throw new Error(`Upstream HTTP ${upstream.status}`);

    const data = await upstream.json() as unknown;

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch Worldstate' });
  }
}
