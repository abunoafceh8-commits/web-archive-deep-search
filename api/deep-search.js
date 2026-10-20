export default async function handler(req, res) {
  const { url, matchType = 'prefix', limit = 50 } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&matchType=${matchType}&output=json&limit=${Math.min(parseInt(limit), 30)}&fl=timestamp,original,statuscode,mimetype,length&collapse=urlkey`;
    const r = await fetch(cdxUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    const data = await r.json();
    const [headers, ...rows] = data;
    const results = rows.map(row => ({
      timestamp: row[0],
      original: row[1],
      status: row[2],
      mimetype: row[3],
      length: row[4],
      archiveUrl: `https://web.archive.org/web/${row[0]}/${row[1]}`
    }));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300');
    return res.json({ results, total: results.length, query: url });
  } catch (e) {
    // If CDX fails, try wayback availability API as fallback
    try {
      const r2 = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(5000)
      });
      const d2 = await r2.json();
      if (d2.archived_snapshots?.closest) {
        const snap = d2.archived_snapshots.closest;
        return res.json({
          results: [{
            timestamp: snap.timestamp,
            original: url,
            status: snap.status,
            archiveUrl: snap.url
          }],
          total: 1,
          query: url,
          note: 'Limited results - CDX timeout'
        });
      }
    } catch {}
    return res.json({ results: [], total: 0, query: url, error: e.message });
  }
}
