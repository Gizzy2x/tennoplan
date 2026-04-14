export default async function handler(req: any, res: any) {
  try {
    const response = await fetch('https://api.warframestat.us/pc');
    if (!response.ok) {
      const text = await response.text().catch(() => 'no response body');
      throw new Error(`Upstream API failed with status ${response.status}: ${text}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('worldstate function error:', error);
    res.status(500).json({
      error: 'Failed to fetch worldstate',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
