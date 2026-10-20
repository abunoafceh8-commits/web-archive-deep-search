export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });
  try {
    const r = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(10000) });
    const data = await r.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
