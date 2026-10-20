export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url, limit = 30, matchType = 'prefix' } = req.method === 'GET' ? req.query : (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {});
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const r = await fetch(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&matchType=${matchType}&output=json&limit=${Math.min(parseInt(limit), 50)}&fl=timestamp,original,statuscode,mimetype,length&collapse=urlkey`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000)
    });
    const data = await r.json();
    const [, ...rows] = data;
    const results = rows.map(r => ({
      timestamp: r[0], original: r[1], status: r[2], mimetype: r[3], length: r[4],
      archiveUrl: `https://web.archive.org/web/${r[0]}/${r[1]}`
    }));
    res.json({ results, total: results.length, query: url });
  } catch (e) {
    res.json({ results: [], total: 0, query: url, error: e.message });
  }
}
