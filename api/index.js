/* Vercel-адаптер: тот же API (netlify/functions/api.mjs), та же база по DATABASE_URL.
   /api/* -> /api/index?p=* (см. vercel.json) */
import { makeHandler, pgStore } from '../netlify/functions/api.mjs';

const handle = makeHandler(pgStore());

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

export default async function (req, res) {
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const u = new URL(req.url, `${proto}://${host}`);
    const sub = u.searchParams.get('p');
    if (sub !== null) { u.pathname = '/api/' + sub.replace(/^\/+/, ''); u.searchParams.delete('p'); }

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    const hasBody = !['GET', 'HEAD'].includes(req.method);
    const request = new Request(u, { method: req.method, headers, body: hasBody ? await readBody(req) : undefined });
    const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();

    const r = await handle(request, { ip });
    res.statusCode = r.status;
    r.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'server' }));
  }
}
