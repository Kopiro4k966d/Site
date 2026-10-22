/* Crysea API (Netlify Function). Один и тот же адрес /api используют сайт и приложение.
   Хранилище: PostgreSQL (DATABASE_URL). Схема: db/schema.sql */
import crypto from 'node:crypto';

export const config = { path: '/api/*' };

const PLANS = { pro: { name: 'Pro', price: 199 }, plus: { name: 'Plus', price: 399 } };
const YK_METHODS = { sbp: 'sbp', card: 'bank_card', sber: 'sberbank', ym: 'yoo_money' };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const scrypt = (p, salt) => new Promise((res, rej) => crypto.scrypt(p, salt, 64, (e, k) => (e ? rej(e) : res(k.toString('hex')))));

const OAUTH_SQL = `
alter table users alter column pass_salt drop not null;
alter table users alter column pass_hash drop not null;
alter table users add column if not exists email_verified boolean not null default false;
create table if not exists identities (
  provider text not null check (provider in ('discord','google')),
  provider_id text not null,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (provider, provider_id)
);
create index if not exists identities_user_idx on identities(user_id);
create table if not exists oauth_pending (
  device_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null
);`;

/* ---------- Хранилище PostgreSQL ---------- */
export function pgStore(env = process.env) {
  let pool, migrated;
  const q = async (text, params) => {
    if (!pool) {
      const { default: pg } = await import('pg');
      pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 1, idleTimeoutMillis: 10000,
        ssl: env.DATABASE_SSL === 'off' ? false : { rejectUnauthorized: false } });
    }
    if (!migrated) migrated = pool.query(OAUTH_SQL).catch((e) => { console.error('oauth migrate', e); });
    await migrated;
    return (await pool.query(text, params)).rows;
  };
  const norm = (r) => r && ({ id: r.id, email: r.email, name: r.name, color: r.color, salt: r.pass_salt, hash: r.pass_hash, plan: r.plan, promo: r.promo || null, verified: !!r.email_verified,
    until: r.plan_until ? new Date(r.plan_until).toISOString() : null, data: r.data, updated: Number(r.data_updated), created: new Date(r.created_at).toISOString() });
  return {
    async userByEmail(email) { return norm((await q('select * from users where email=$1', [email]))[0]); },
    async createUser(u) {
      return norm((await q('insert into users(email,name,pass_salt,pass_hash) values($1,$2,$3,$4) returning *', [u.email, u.name, u.salt, u.hash]))[0]);
    },
    async userById(id) { return norm((await q('select * from users where id=$1', [id]))[0]); },
    async identityUser(provider, pid) {
      return norm((await q('select u.* from identities i join users u on u.id=i.user_id where i.provider=$1 and i.provider_id=$2', [provider, pid]))[0]);
    },
    async linkIdentity(userId, provider, pid) { await q('insert into identities(provider,provider_id,user_id) values($1,$2,$3) on conflict do nothing', [provider, pid, userId]); },
    async createOAuthUser(email, name) {
      return norm((await q('insert into users(email,name,email_verified) values($1,$2,true) returning *', [email, name]))[0]);
    },
    /* почта подтверждена входом через соцсеть: старый пароль (его мог поставить не владелец почты) и все сессии сбрасываются */
    async claimEmail(id) {
      await q('delete from sessions where user_id=$1', [id]);
      return norm((await q('update users set pass_salt=null, pass_hash=null, email_verified=true where id=$1 returning *', [id]))[0]);
    },
    async addPending(deviceHash, userId) {
      await q(`insert into oauth_pending(device_hash,user_id,expires_at) values($1,$2,now()+interval '5 minutes')
        on conflict(device_hash) do update set user_id=$2, expires_at=now()+interval '5 minutes'`, [deviceHash, userId]);
    },
    async takePending(deviceHash) {
      const r = (await q('delete from oauth_pending where device_hash=$1 and expires_at>now() returning user_id', [deviceHash]))[0];
      return r ? r.user_id : null;
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
      return (await q('insert into payments(user_id,plan,amount_rub,method,provider,status,promo) values($1,$2,$3,$4,$5,$6,$7) returning id', [p.userId, p.plan, p.amount, p.method, p.provider, p.status, p.promo || null]))[0].id;
    },
    /* код автора: percent и сколько раз уже использован (оплаченные покупки) */
    async promoByCode(code) {
      if (!code) return null;
      const r = (await q(`select c.code, c.percent, c.max_uses, (select count(*) from payments where promo=c.code and status in ('paid','demo')) as uses
        from promo_codes c where c.code=$1 and c.active`, [code]))[0];
      return r && { code: r.code, percent: r.percent, max: r.max_uses, uses: Number(r.uses) };
    },
    async setPromo(id, code) { return norm((await q('update users set promo=$2 where id=$1 returning *', [id, code]))[0]); },
    async reviews() {
      return (await q('select name,text,created_at from reviews where approved order by created_at desc limit 30')).map((r) => ({ name: r.name, text: r.text, date: new Date(r.created_at).toISOString().slice(0, 10) }));
    },
    async addReview(userId, name, text) { await q('insert into reviews(user_id,name,text) values($1,$2,$3)', [userId, name, text]); },
    async setProviderId(id, providerId) { await q('update payments set provider_id=$2 where id=$1', [id, providerId]); },
    async markPaid(providerId) { // атомарно: вернёт строку только при первом подтверждении
      return (await q(`update payments set status='paid', paid_at=now() where provider_id=$1 and status<>'paid' returning user_id, plan`, [providerId]))[0] || null;
    },
    /* партнёрка */
    async partnerOf(userId) {
      const r = (await q(`select p.*, c.code as code from partners p
        left join promo_codes c on c.partner_id=p.user_id where p.user_id=$1`, [userId]))[0];
      return r ? { status: r.status, platform: r.platform, channel: r.channel_url, followers: r.followers,
        views: r.avg_views, payout: r.payout_details, contact: r.contact, desired: r.desired_code, code: r.code || null } : null;
    },
    async partnerSave(userId, d) {
      await q(`insert into partners(user_id,platform,channel_url,followers,avg_views,payout_details,contact,desired_code,status) values($1,$2,$3,$4,$5,$6,$7,$8,'pending')
        on conflict(user_id) do update set platform=excluded.platform, channel_url=excluded.channel_url,
        followers=excluded.followers, avg_views=excluded.avg_views, payout_details=excluded.payout_details,
        contact=excluded.contact, desired_code=excluded.desired_code,
        status=case when partners.status='approved' then 'approved' else 'pending' end`,
        [userId, d.platform, d.channel, d.followers, d.views, d.payout, d.contact, d.desired]);
    },
    async partnerCodeCreate(userId, code, name, percent) {
      await q('insert into promo_codes(code,percent,creator,partner_id,max_uses) values($1,$2,$3,$4,null)', [code, percent, name, userId]);
    },
    /* начисление: 5% от оплаченной суммы по коду партнёра; собственные покупки партнёра не считаются */
    async partnerStats(userId) {
      const s = (await q(`select count(*) as orders, coalesce(sum(p.amount_rub),0) as sales,
          coalesce(sum(floor(p.amount_rub*5/100.0)),0) as earned
        from payments p join promo_codes c on c.code=p.promo
        where c.partner_id=$1 and p.status='paid' and (p.user_id is null or p.user_id<>$1)`, [userId]))[0];
      const paid = (await q('select coalesce(sum(amount_rub),0) as paid from partner_payouts where partner_id=$1', [userId]))[0];
      return { orders: Number(s.orders), sales: Number(s.sales), earned: Number(s.earned), paid: Number(paid.paid) };
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
  const pub = async (u) => {
    const pr = u.promo ? await db.promoByCode(u.promo) : null;
    return { email: u.email, name: u.name, color: u.color || null, plan: plan(u), until: plan(u) === 'free' ? null : u.until, created: u.created, promo: pr ? { code: pr.code, percent: pr.percent } : null };
  };
  const PARTNER = { min: { tiktok: { views: 1000, followers: 50 }, youtube: { views: 300, followers: 50 } }, rate: 5, buyerPercent: 10 };
  const partnerView = async (uid) => {
    const pa = await db.partnerOf(uid);
    const stats = await db.partnerStats(uid);
    if (!pa) return { partner: null, rules: PARTNER };
    return { partner: { status: pa.status, platform: pa.platform, channel: pa.channel, followers: pa.followers,
      views: pa.views, payout: pa.payout, contact: pa.contact, desired: pa.desired, code: pa.code, percent: PARTNER.buyerPercent, stats }, rules: PARTNER };
  };
  const priceFor = (pl, pr) => (pr ? Math.max(1, Math.round(pl.price * (100 - pr.percent) / 100)) : pl.price);
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


  /* ---------- Вход через Discord и Google ---------- */
  const UA = { 'User-Agent': 'Crysea (https://crysea.app, 1.0)', Accept: 'application/json' };
  const OAUTH = {
    discord: { auth: 'https://discord.com/oauth2/authorize', token: 'https://discord.com/api/oauth2/token', scope: 'identify email',
      id: () => env.DISCORD_CLIENT_ID, secret: () => env.DISCORD_CLIENT_SECRET,
      profile: async (at) => { const r = await fetch('https://discord.com/api/users/@me', { headers: { ...UA, Authorization: 'Bearer ' + at } }).then((x) => x.json());
        return { id: r.id, email: r.verified ? r.email : null, name: r.global_name || r.username }; } },
    google: { auth: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', scope: 'openid email profile', extra: { prompt: 'select_account' },
      id: () => env.GOOGLE_CLIENT_ID, secret: () => env.GOOGLE_CLIENT_SECRET,
      profile: async (at) => { const r = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { ...UA, Authorization: 'Bearer ' + at } }).then((x) => x.json());
        return { id: r.sub, email: r.email_verified ? r.email : null, name: r.name }; } },
  };
  const oauthOn = (k) => !!(OAUTH[k] && OAUTH[k].id() && OAUTH[k].secret() && String(env.AUTH_SECRET || '').length >= 32);
  const mac = (d) => crypto.createHmac('sha256', env.AUTH_SECRET).update(d).digest('base64url');
  const signState = (o) => { const d = Buffer.from(JSON.stringify(o)).toString('base64url'); return d + '.' + mac(d); };
  function readState(s) {
    const [d, h] = String(s || '').split('.'); if (!d || !h) return null;
    const e = mac(d); if (h.length !== e.length || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(e))) return null;
    try { const o = JSON.parse(Buffer.from(d, 'base64url').toString()); return o.exp > Date.now() ? o : null; } catch { return null; }
  }
  const cookieOf = (req, k) => { const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|; )' + k + '=([^;]*)')); return m ? m[1] : ''; };

  return async function handle(req, ctx = {}) {
    const url = new URL(req.url), p = url.pathname.replace(/^\/api/, '') || '/', m = req.method;
    const ip = (ctx && ctx.ip) || req.headers.get('x-nf-client-connection-ip') || 'x';
    if (Number(req.headers.get('content-length') || 0) > 400000) return fail(413, 'big');
    let b = {}; if (m !== 'GET') b = await req.json().catch(() => ({}));

    if (m === 'GET' && p === '/config') return J(200, { pay: payMode(), plans: PLANS, oauth: { discord: oauthOn('discord'), google: oauthOn('google') } });


    /* --- OAuth: /auth/{discord|google}/start -> провайдер -> /auth/{...}/callback; приложение забирает вход через /auth/poll --- */
    const om = p.match(/^\/auth\/(discord|google)\/(start|callback)$/);
    if (m === 'GET' && om) {
      const prov = om[1], site = String(env.SITE_URL || url.origin).replace(/\/$/, ''), O = OAUTH[prov];
      const secure = site.startsWith('https') ? '; Secure' : '';
      const cookie = (v, age) => `cr_oauth=${v}; HttpOnly; Path=/api/auth; SameSite=Lax; Max-Age=${age}${secure}`;
      const go = (to, ck) => new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store', ...(ck ? { 'Set-Cookie': ck } : {}) } });
      const back = (e) => go(site + '/oauth#error=' + e, cookie('', 0));
      const redirect = site + '/api/auth/' + prov + '/callback';
      if (!oauthOn(prov)) return back('off');
      if (await db.hit('oauth:' + ip) > 60) return back('limit');
      if (om[2] === 'start') {
        const dev = url.searchParams.get('device') || '';
        if (dev && !/^[0-9a-f]{64}$/.test(dev)) return back('state');
        const nonce = crypto.randomBytes(16).toString('hex');
        const st = signState({ n: nonce, d: dev || null, exp: Date.now() + 10 * 60000 });
        const q = new URLSearchParams({ client_id: O.id(), redirect_uri: redirect, response_type: 'code', scope: O.scope, state: st, ...(O.extra || {}) });
        return go(O.auth + '?' + q, cookie(nonce, 600));
      }
      const st = readState(url.searchParams.get('state')), nonce = cookieOf(req, 'cr_oauth');
      if (url.searchParams.get('error')) return back('denied');
      if (!st || !nonce || nonce.length !== st.n.length || !crypto.timingSafeEqual(Buffer.from(nonce), Buffer.from(st.n))) return back('state');
      const code = url.searchParams.get('code'); if (!code) return back('state');
      let prof;
      try {
        const tk = await fetch(O.token, { method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: O.id(), client_secret: O.secret(), grant_type: 'authorization_code', code, redirect_uri: redirect }) }).then((x) => x.json());
        if (!tk.access_token) return back('provider');
        prof = await O.profile(tk.access_token);
      } catch { return back('provider'); }
      const email = String(prof.email || '').trim().toLowerCase();
      if (!prof.id || !/^\S+@\S+\.\S+$/.test(email) || email.length > 120) return back('noemail');
      let u;
      try {
      u = await db.identityUser(prov, String(prof.id));
      if (!u) {
        const ex = await db.userByEmail(email);
        if (ex) u = ex.verified ? ex : await db.claimEmail(ex.id);
        else {
          const name = String(prof.name || email.split('@')[0]).replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24) || 'Игрок';
          try { u = await db.createOAuthUser(email, name); } catch { u = await db.userByEmail(email); }
        }
        if (!u) return back('provider');
        await db.linkIdentity(u.id, prov, String(prof.id));
      }
      if (st.d) { await db.addPending(st.d, u.id); return go(site + '/oauth#app=1', cookie('', 0)); }
      return go(site + '/oauth#token=' + await newSession(u), cookie('', 0));
      } catch (e) { console.error('oauth callback', e); return back('server'); }
    }
    if (m === 'POST' && p === '/auth/poll') {
      if (await db.hit('poll:' + ip) > 400) return fail(429, 'limit');
      const dev = String(b.device || ''); if (!/^[0-9a-f]{64}$/.test(dev)) return fail(400, 'state');
      const uid = await db.takePending(sha(dev)); if (!uid) return J(200, { pending: true });
      const u = await db.userById(uid); if (!u) return J(200, { pending: true });
      return J(200, { token: await newSession(u), user: await pub(u) });
    }

    if (m === 'GET' && p === '/reviews') return J(200, { reviews: await db.reviews() });

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
        return J(200, { token: await newSession(u), user: await pub(u) });
      }
      const u = await db.userByEmail(email);
      const ok = u && u.salt && u.hash && crypto.timingSafeEqual(Buffer.from(await scrypt(pass, u.salt)), Buffer.from(u.hash));
      if (!ok) return fail(401, 'bad');
      return J(200, { token: await newSession(u), user: await pub(u) });
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
    if (m === 'GET' && p === '/me') return J(200, { user: await pub(u), license: license(u) });
    if (m === 'PUT' && p === '/me') {
      const name = String(b.name || '').trim().slice(0, 24); if (!name) return fail(400, 'name');
      const color = /^#[0-9a-f]{6}$/i.test(String(b.color || '')) ? String(b.color).toLowerCase() : u.color;
      const data = { ...(u.data || {}), profile: { ...((u.data || {}).profile || {}), name, ...(color ? { color } : {}) } };
      return J(200, { user: await pub(await db.saveData(u.id, data, Date.now(), name, color)) });
    }
    if (m === 'POST' && p === '/reviews') {
      if (await db.hit('review:' + u.id) > 3) return fail(429, 'limit');
      const text = String(b.text || '').trim().slice(0, 220); if (text.length < 10) return fail(400, 'rvShort');
      await db.addReview(u.id, u.name, text); return J(200, {});
    }
    if (m === 'POST' && p === '/promo') {
      if (await db.hit('promo:' + u.id) > 15) return fail(429, 'limit');
      const code = String(b.code || '').trim().toUpperCase().slice(0, 24);
      if (!code) return J(200, { user: await pub(await db.setPromo(u.id, null)) });
      const pr = await db.promoByCode(code); if (!pr) return fail(404, 'promo_bad');
      if (pr.max && pr.uses >= pr.max) return fail(409, 'promo_used');
      return J(200, { user: await pub(await db.setPromo(u.id, pr.code)) });
    }
    if (m === 'GET' && p === '/payments') return J(200, { payments: await db.payments(u.id) });
    /* --- партнёрка: условия, заявка, выбор промокода --- */
    if (m === 'GET' && p === '/partner') return J(200, await partnerView(u.id));
    if (m === 'POST' && p === '/partner/apply') {
      if (await db.hit('partner:' + u.id) > 10) return fail(429, 'limit');
      const platform = String(b.platform || '');
      if (!['tiktok', 'youtube'].includes(platform)) return fail(400, 'platform');
      const channel = String(b.channel || '').trim().slice(0, 200);
      const host = platform === 'tiktok' ? /^https:\/\/(www\.|vm\.)?tiktok\.com\/\S+$/ : /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\/\S+$/;
      if (!host.test(channel)) return fail(400, 'channel');
      const followers = Math.floor(Number(b.followers)), views = Math.floor(Number(b.views));
      if (!Number.isFinite(followers) || !Number.isFinite(views) || followers < 0 || views < 0) return fail(400, 'nums');
      const need = PARTNER.min[platform];
      if (followers < need.followers || views < need.views) return fail(400, 'low');
      const payout = String(b.payout || '').trim().slice(0, 200);
      if (payout.length < 5) return fail(400, 'payout');
      const contact = String(b.contact || '').trim().slice(0, 100);
      if (contact.length < 3) return fail(400, 'contact');
      if (!(b.agreed === true && b.terms === true)) return fail(400, 'agree');
      const desired = String(b.desired || '').trim().toUpperCase();
      if (desired && !/^[A-Z0-9]{3,16}$/.test(desired)) return fail(400, 'code_fmt');
      await db.partnerSave(u.id, { platform, channel, followers, views, payout, contact, desired: desired || null });
      return J(200, await partnerView(u.id));
    }
    if (m === 'POST' && p === '/partner/code') {
      if (await db.hit('partnercode:' + u.id) > 10) return fail(429, 'limit');
      const pa = await db.partnerOf(u.id);
      if (!pa || pa.status !== 'approved') return fail(403, 'not_approved');
      if (pa.code) return fail(409, 'has_code');
      const code = String(b.code || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{3,16}$/.test(code)) return fail(400, 'code_fmt');
      try { await db.partnerCodeCreate(u.id, code, u.name, PARTNER.buyerPercent); }
      catch (e) { if (e.code === '23505') return fail(409, 'code_taken'); throw e; }
      return J(200, await partnerView(u.id));
    }
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
      const pr = u.promo ? await db.promoByCode(u.promo) : null, amount = priceFor(pl, pr && !(pr.max && pr.uses >= pr.max) ? pr : null);
      if (mode === 'demo') {
        await db.createPayment({ userId: u.id, plan: b.plan, amount, method, provider: 'demo', status: 'demo', promo: pr && pr.code });
        return J(200, { user: await pub(await db.activatePlan(u.id, b.plan)) });
      }
      if (!YK_METHODS[method]) return fail(400, 'method_off');
      const pid = await db.createPayment({ userId: u.id, plan: b.plan, amount, method, provider: 'yookassa', status: 'pending', promo: pr && pr.code });
      const site = String(env.SITE_URL || url.origin).replace(/\/$/, '');
      const r = await yk('POST', '/payments', { amount: { value: amount.toFixed(2), currency: 'RUB' }, capture: true,
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
