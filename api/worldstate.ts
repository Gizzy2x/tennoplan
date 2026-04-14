export default async function handler(req: any, res: any) {
  try {
    const response = await fetch('https://api.warframestat.us/pc', {
      headers: {
        'User-Agent': 'Tennoplan/1.0',
        'Accept': 'application/json',
      },
    });

    // Set Vercel cache header: 5 minutes shared cache, plus stale-while-revalidate
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    const text = await response.text();

    if (!response.ok || !text) {
      const errorMessage = `Upstream API failed with status ${response.status}. Response: ${text.substring(0, 100)}`;
      console.error(errorMessage);
      return res.status(response.status || 500).json({
        error: 'Failed to fetch worldstate',
        details: errorMessage
      });
    }

    try {
      const data = JSON.parse(text);
      res.status(200).json(data);
    } catch (parseError) {
      console.error('JSON parsing failed. Raw response text:', text);
      throw new Error('Unexpected end of JSON input (failed to parse response)');
    }
  } catch (error) {
    console.error('worldstate function error:', error);
    res.status(500).json({
      error: 'Failed to fetch worldstate',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
