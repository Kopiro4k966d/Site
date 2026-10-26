/* Серверная защита админ-API Crysea (Node, Vercel Functions).
   Подключите в каждом обработчике /api/admin/*:
     const guard = require('../../server/admin-guard');
     module.exports = guard.wrap(async (req, res) => { ... });
   Всё, что выполняется в браузере, — лишь удобство. Граница доступа — только здесь. */
const crypto = require('crypto');

const MIN_KEY_LEN = 32;          // ADMIN_KEY должен быть длинным случайным значением
const MAX_BODY = 16 * 1024;      // 16 КБ — больше админке не нужно
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const FAIL_LIMIT = 5;

/* Хранилище попыток. В serverless-окружении память не общая между экземплярами,
   поэтому в продакшене подключите Redis / Vercel KV через тот же интерфейс. */
const mem = new Map();
const store = {
  async get(k) { const v = mem.get(k); if (v && v.exp > Date.now()) return v; mem.delete(k); return null; },
  async set(k, v, ttl) { mem.set(k, { ...v, exp: Date.now() + ttl }); },
  async del(k) { mem.delete(k); }
};

/* Журнал действий. Замените sink на запись в таблицу audit_log. */
const audit = {
  sink: (entry) => console.log('[admin-audit]', JSON.stringify(entry)),
  log(action, req, details) {
    this.sink({ t: new Date().toISOString(), action, ip: clientIp(req), ua: String(req.headers['user-agent'] || '').slice(0, 120), details: details || null });
  }
};

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function secureHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
}

function send(res, status, obj) {
  secureHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function safeEqualSecret(given, expected) {
  // сравниваем хэши фиксированной длины: время не зависит от длины и содержимого ключа
  const a = crypto.createHash('sha256').update(String(given || '')).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

async function checkAdmin(req, res) {
  const expected = process.env.ADMIN_KEY || '';
  if (expected.length < MIN_KEY_LEN) {         // без нормального ключа доступ закрыт полностью
    send(res, 503, { error: 'misconfigured' });
    return false;
  }
  const ip = clientIp(req);
  const failKey = 'fail:' + ip;
  const rec = await store.get(failKey);
  if (rec && rec.n >= FAIL_LIMIT) {
    send(res, 429, { error: 'ratelimit' });
    return false;
  }
  const given = req.headers['x-admin-key'];
  if (!given || !safeEqualSecret(given, expected)) {
    await new Promise((r) => setTimeout(r, 600)); // замедляем перебор
    await store.set(failKey, { n: (rec ? rec.n : 0) + 1 }, FAIL_WINDOW_MS);
    audit.log('admin_auth_failed', req);
    send(res, 401, { error: 'admin' });
    return false;
  }
  await store.del(failKey);
  return true;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    if (!String(req.headers['content-type'] || '').includes('application/json')) return reject(Object.assign(new Error('ct'), { status: 415 }));
    let size = 0, data = '';
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('big'), { status: 413 })); req.destroy(); } else data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(Object.assign(new Error('json'), { status: 400 })); } });
    req.on('error', reject);
  });
}

/* Оборачивает обработчик: заголовки, проверка ключа, журнал, ошибки. */
function wrap(handler, opts = {}) {
  return async (req, res) => {
    secureHeaders(res);
    if (opts.methods && !opts.methods.includes(req.method)) return send(res, 405, { error: 'method' });
    try {
      if (!(await checkAdmin(req, res))) return;
      req.body = req.method === 'POST' ? await readJson(req) : undefined;
      await handler(req, res);
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error('admin error', e);
      send(res, status, { error: status === 500 ? 'server' : 'bad_request' });
    }
  };
}

/* Правила для финансовых операций: выдача подписки, оплата за видео, выплаты. */
const LIMITS = { plans: ['pro', 'plus'], maxMonths: 12 };

function validateGrant(body) {
  const plan = String(body.plan || '');
  const months = Number(body.months);
  if (!LIMITS.plans.includes(plan)) throw Object.assign(new Error('plan'), { status: 400 });
  if (!Number.isInteger(months) || months < 1 || months > LIMITS.maxMonths) throw Object.assign(new Error('months'), { status: 400 });
  if (typeof body.userId !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(body.userId)) throw Object.assign(new Error('user'), { status: 400 });
  if (body.confirm !== 'GRANT') throw Object.assign(new Error('confirm'), { status: 400 });
  return { plan, months, userId: body.userId };
}

/* Идемпотентность: повтор того же запроса с тем же Idempotency-Key не выдаёт подписку дважды. */
async function once(req, scope, fn) {
  const key = String(req.headers['idempotency-key'] || '');
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(key)) throw Object.assign(new Error('idem'), { status: 400 });
  const k = 'idem:' + scope + ':' + key;
  if (await store.get(k)) return { replayed: true };
  await store.set(k, { done: true }, 24 * 60 * 60 * 1000);
  try { return await fn(); } catch (e) { await store.del(k); throw e; }
}

module.exports = { wrap, validateGrant, once, audit, clientIp, secureHeaders, safeEqualSecret, LIMITS };
