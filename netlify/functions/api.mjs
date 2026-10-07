/* Crysea API (Netlify Function). Один и тот же адрес /api используют сайт и приложение.
   Хранилище: PostgreSQL (DATABASE_URL). Схема: db/schema.sql */
import crypto from 'node:crypto';

export const config = { path: '/api/*' };

const PLANS = { pro: { name: 'Pro', price: 199 }, plus: { name: 'Plus', price: 399 } };
const YK_METHODS = { sbp: 'sbp', card: 'bank_card', sber: 'sberbank', ym: 'yoo_money' };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const scrypt = (p, salt) => new Promise((res, rej) => crypto.scrypt(p, salt, 64, (e, k) => (e ? rej(e) : res(k.toString('hex')))));

/* ---------- Хранилище PostgreSQL ---------- */
export function pgStore(env = process.env) {
  let pool;
  const q = async (text, params) => {
    if (!pool) {
      const { default: pg } = await import('pg');
      pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 1, idleTimeoutMillis: 10000,
        ssl: env.DATABASE_SSL === 'off' ? false : { rejectUnauthorized: false } });
    }
    return (await pool.query(text, params)).rows;
  };
  const norm = (r) => r && ({ id: r.id, email: r.email, name: r.name, color: r.color, salt: r.pass_salt, hash: r.pass_hash, plan: r.plan,
    until: r.plan_until ? new Date(r.plan_until).toISOString() : null, data: r.data, updated: Number(r.data_updated), created: new Date(r.created_at).toISOString() });
  return {
    async userByEmail(email) { return norm((await q('select * from users where email=$1', [email]))[0]); },
    async createUser(u) {
      return norm((await q('insert into users(email,name,pass_salt,pass_hash) values($1,$2,$3,$4) returning *', [u.email, u.name, u.salt, u.hash]))[0]);
    },
    async createSession(userId, tokenHash, expires) { await q('insert into sessions(token_hash,user_id,expires_at) values($1,$2,$3)', [tokenHash, userId, expires]); },
    async sessionUser(tokenHash) {
      return norm((await q('select u.* from sessions s join users u on u.id=s.user_id where s.token_hash=$1 and s.expires_at>now()', [tokenHash]))[0]);
    },
    async deleteSession(tokenHash) { await q('delete from sessions where token_hash=$1', [tokenHash]); },
    async saveData(id, data, updated, name, color) {
      return norm((await q('update users set data=$2, data_updated=$3, name=$4, color=$5 where id=$1 returning *', [id, JSON.stringify(data), updated, name, color]))[0]);
    },
    async hit(key) {
      return (await q(`insert into rate_limits(key,n,reset_at) values($1,1,now()+interval '10 minutes')
        on conflict(key) do update set
          n = case when rate_limits.reset_at < now() then 1 else rate_limits.n+1 end,
          reset_at = case when rate_limits.reset_at < now() then now()+interval '10 minutes' else rate_limits.reset_at end
        returning n`, [key]))[0].n;
    },
    async payments(userId) {
      return (await q('select plan,amount_rub,method,status,created_at from payments where user_id=$1 order by created_at desc limit 20', [userId]))
        .map((r) => ({ plan: r.plan, amount: r.amount_rub, method: r.method, status: r.status, date: new Date(r.created_at).toISOString() }));
    },
    async createPayment(p) {
      return (await q('insert into payments(user_id,plan,amount_rub,method,provider,status) values($1,$2,$3,$4,$5,$6) returning id', [p.userId, p.plan, p.amount, p.method, p.provider, p.status]))[0].id;
    },
    async setProviderId(id, providerId) { await q('update payments set provider_id=$2 where id=$1', [id, providerId]); },
    async markPaid(providerId) { // атомарно: вернёт строку только при первом подтверждении
      return (await q(`update payments set status='paid', paid_at=now() where provider_id=$1 and status<>'paid' returning user_id, plan`, [providerId]))[0] || null;
    },
    async activatePlan(userId, plan) {
      return norm((await q(`update users set plan=$2,
        plan_until=(case when plan_until is not null and plan_until>now() then plan_until else now() end)+interval '1 month'
        where id=$1 returning *`, [userId, plan]))[0]);
    },
  };
}

/* ---------- Логика API ---------- */
export function makeHandler(db, env = process.env) {
  const J = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  const fail = (s, e) => J(s, { error: e });
  const livePay = () => !!(env.YOOKASSA_SHOP_ID && env.YOOKASSA_SECRET);
  // Демо-оплата включается ТОЛЬКО явно (DEMO_PAY=1). Если переменной нет, платежи выключены, а не бесплатны.
  const payMode = () => (livePay() ? 'live' : env.DEMO_PAY === '1' ? 'demo' : 'off');
  const plan = (u) => (u.plan !== 'free' && u.until && Date.parse(u.until) > Date.now() ? u.plan : 'free');
  const pub = (u) => ({ email: u.email, name: u.name, color: u.color || null, plan: plan(u), until: plan(u) === 'free' ? null : u.until, created: u.created });
  function license(u) {
    if (!env.LICENSE_PRIVATE_KEY) return null;
    const payload = JSON.stringify({ email: u.email, plan: plan(u), until: plan(u) === 'free' ? null : u.until, iat: Date.now(), exp: Date.now() + 7 * 864e5 });
    const key = crypto.createPrivateKey({ key: Buffer.from(env.LICENSE_PRIVATE_KEY, 'base64'), format: 'der', type: 'pkcs8' });
    return { payload, sig: crypto.sign(null, Buffer.from(payload), key).toString('base64') };
  }
  const yk = (method, path, body, idem) => fetch('https://api.yookassa.ru/v3' + path, { method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(env.YOOKASSA_SHOP_ID + ':' + env.YOOKASSA_SECRET).toString('base64'), ...(idem ? { 'Idempotence-Key': idem } : {}) },
    body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());
  async function newSession(u) {
    const t = crypto.randomBytes(32).toString('hex');
    await db.createSession(u.id, sha(t), new Date(Date.now() + 90 * 864e5)); return t;
  }

  return async function handle(req, ctx = {}) {
    const url = new URL(req.url), p = url.pathname.replace(/^\/api/, '') || '/', m = req.method;
    const ip = (ctx && ctx.ip) || req.headers.get('x-nf-client-connection-ip') || 'x';
    if (Number(req.headers.get('content-length') || 0) > 400000) return fail(413, 'big');
    let b = {}; if (m !== 'GET') b = await req.json().catch(() => ({}));

    if (m === 'GET' && p === '/config') return J(200, { pay: payMode(), plans: PLANS });

    if (m === 'POST' && (p === '/register' || p === '/login')) {
      if (await db.hit(p + ':' + ip) > 20) return fail(429, 'limit');
      const email = String(b.email || '').trim().toLowerCase(), pass = String(b.password || '');
      if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 120) return fail(400, 'mail');
      if (pass.length < 6 || pass.length > 100) return fail(400, 'pass');
      if (p === '/register') {
        const name = String(b.name || '').trim().slice(0, 24); if (!name) return fail(400, 'name');
        if (await db.userByEmail(email)) return fail(409, 'taken');
        const salt = crypto.randomBytes(16).toString('hex');
        let u; try { u = await db.createUser({ email, name, salt, hash: await scrypt(pass, salt) }); } catch { return fail(409, 'taken'); }
        return J(200, { token: await newSession(u), user: pub(u) });
      }
      const u = await db.userByEmail(email);
      const ok = u && crypto.timingSafeEqual(Buffer.from(await scrypt(pass, u.salt)), Buffer.from(u.hash));
      if (!ok) return fail(401, 'bad');
      return J(200, { token: await newSession(u), user: pub(u) });
    }

    /* webhook ЮKassa: не доверяем телу, перепроверяем платёж через API */
    if (m === 'POST' && p === '/webhook/yookassa') {
      const id = b && b.object && b.object.id;
      if (!livePay() || !id) return J(200, {});
      const pay = await yk('GET', '/payments/' + encodeURIComponent(id));
      if (pay.status === 'succeeded' && pay.paid) { const row = await db.markPaid(id); if (row) await db.activatePlan(row.user_id, row.plan); }
      return J(200, {});
    }

    const t = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
    const u = t && await db.sessionUser(sha(t));
    if (!u) return fail(401, 'auth');

    if (m === 'POST' && p === '/logout') { await db.deleteSession(sha(t)); return J(200, {}); }
    if (m === 'GET' && p === '/me') return J(200, { user: pub(u), license: license(u) });
    if (m === 'PUT' && p === '/me') {
      const name = String(b.name || '').trim().slice(0, 24); if (!name) return fail(400, 'name');
      const data = { ...(u.data || {}), profile: { ...((u.data || {}).profile || {}), name } };
      return J(200, { user: pub(await db.saveData(u.id, data, Date.now(), name, u.color)) });
    }
    if (m === 'GET' && p === '/payments') return J(200, { payments: await db.payments(u.id) });
    if (m === 'GET' && p === '/sync') return J(200, { data: u.data, updated: u.updated });
    if (m === 'PUT' && p === '/sync') {
      if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data)) return fail(400, 'data');
      if (Number(b.updated) < u.updated) return J(200, { conflict: true, data: u.data, updated: u.updated });
      const pr = b.data.profile || {}, upd = Number(b.updated) || Date.now();
      await db.saveData(u.id, b.data, upd, String(pr.name || u.name).slice(0, 24), pr.color || u.color);
      return J(200, { updated: upd });
    }

    if (m === 'POST' && p === '/pay') {
      const pl = PLANS[b.plan]; if (!pl) return fail(400, 'plan');
      const mode = payMode();
      if (mode === 'off') return fail(501, 'pay_off');
      const method = String(b.method || 'card');
      if (mode === 'demo') {
        await db.createPayment({ userId: u.id, plan: b.plan, amount: pl.price, method, provider: 'demo', status: 'demo' });
        return J(200, { user: pub(await db.activatePlan(u.id, b.plan)) });
      }
      if (!YK_METHODS[method]) return fail(400, 'method_off');
      const pid = await db.createPayment({ userId: u.id, plan: b.plan, amount: pl.price, method, provider: 'yookassa', status: 'pending' });
      const site = String(env.SITE_URL || url.origin).replace(/\/$/, '');
      const r = await yk('POST', '/payments', { amount: { value: pl.price.toFixed(2), currency: 'RUB' }, capture: true,
        confirmation: { type: 'redirect', return_url: site + '/?paid=1' }, description: `Crysea ${pl.name}, 1 месяц`,
        payment_method_data: { type: YK_METHODS[method] }, metadata: { payment_id: pid, user: u.email } }, pid);
      if (!r.id || !r.confirmation) return fail(502, 'pay_fail');
      await db.setProviderId(pid, r.id);
      return J(200, { url: r.confirmation.confirmation_url });
    }
    return fail(404, 'nf');
  };
}

const handler = makeHandler(pgStore());
export default (req, ctx) => handler(req, ctx).catch((e) => { console.error(e); return new Response(JSON.stringify({ error: 'server' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); });
