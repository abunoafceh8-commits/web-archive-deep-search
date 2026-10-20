export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const params = req.method === 'POST' 
    ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {})
    : req.query;
  
  const url = params.url || params.q || params.query || '';
  const limit = Math.min(parseInt(params.limit || 30), 100);
  const matchType = params.matchType || 'prefix';
  
  if (!url) return res.status(400).json({ error: 'URL required (use ?url= or ?q= parameter)' });

  try {
    // Primary: CDX API
    const r = await fetch(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&matchType=${matchType}&output=json&limit=${limit}&fl=timestamp,original,statuscode,mimetype,length,digest&collapse=urlkey`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000)
    });
    const data = await r.json();
    const [, ...rows] = data;
    
    const results = rows.map(r => {
      const ts = r[0];
      const orig = r[1];
      const date = `${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)} ${ts.slice(8,10)}:${ts.slice(10,12)}`;
      return {
        timestamp: ts,
        original: orig,
        status: r[2],
        mimetype: r[3],
        length: r[4],
        digest: r[5],
        archiveUrl: `https://web.archive.org/web/${ts}/${orig}`,
        formattedDate: date
      };
    });

    // Also check availability
    let availability = null;
    try {
      const ar = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(5000)
      });
      availability = await ar.json();
    } catch {}

    res.json({ 
      results, 
      total: results.length, 
      query: url,
      matchType,
      availability: availability?.archived_snapshots || null,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.json({ results: [], total: 0, query: url, error: e.message });
  }
}
