export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url, limit = 30, matchType = 'prefix' } = req.method === 'GET' ? req.query : (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {});
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const r = await fetch(`https://s5nljp-e30alwvda-arcadawebapps2.vercel.app/api/deep-search?url=${encodeURIComponent(url)}&limit=${limit}&matchType=${matchType}`, {
      signal: AbortSignal.timeout(15000)
    });
    return res.json(await r.json());
  } catch (e) {
    try {
      const r = await fetch(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&matchType=${matchType}&output=json&limit=${limit}&fl=timestamp,original,statuscode,mimetype&collapse=urlkey`, { signal: AbortSignal.timeout(10000) });
      const d = await r.json(); const [,...rows] = d;
      return res.json({ results: rows.map(r => ({ timestamp: r[0], original: r[1], status: r[2], mimetype: r[3], archiveUrl: `https://web.archive.org/web/${r[0]}/${r[1]}` })), total: rows.length, query: url });
    } catch { return res.json({ results: [], total: 0, query: url, error: e.message }); }
  }
}
