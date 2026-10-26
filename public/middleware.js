/* Vercel Edge Middleware (файл в корне проекта).
   1) Прячет /admin и /api/admin от всех, кроме разрешённых IP (если ADMIN_IP_ALLOWLIST задан).
   2) Добавляет защитные заголовки. Ответ 404, а не 403: сам факт существования админки не раскрывается. */
export const config = { matcher: ['/admin', '/api/admin/:path*'] };

export default function middleware(request) {
  const allow = (process.env.ADMIN_IP_ALLOWLIST || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || '';
  if (allow.length && !allow.includes(ip)) {
    return new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  const res = new Response(null, { headers: { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Cache-Control': 'no-store' } });
  return res;
}
