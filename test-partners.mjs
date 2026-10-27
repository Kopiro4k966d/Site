import crypto from 'node:crypto';
import { makeHandler } from '../netlify/functions/api.mjs';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
// ---- фейковая БД с той же логикой, что и в pgStore ----
const users = new Map(), sessions = new Map(), promos = new Map(), payments = new Map(), partners = new Map(), ledger = [];
let seq = 0; const id = () => crypto.randomUUID();
const addUser = (email, name) => { const u = { id: id(), email, name, plan: 'free', promo: null, verified: true, until: null, data: null, updated: 0, created: new Date().toISOString(), salt: 's', hash: 'h' }; users.set(u.id, u); return u; };
const pView = (p) => { const u = users.get(p.user_id); const pr = promos.get(p.code);
  const sum = (f) => ledger.filter(f).reduce((a, l) => a + l.amount_rub, 0);
  return { id: p.id, user_id: p.user_id, email: u.email, name: u.name, channel: p.channel, subs: p.subs, avg_views: p.avg_views, status: p.status, code: p.code,
    commission_pct: p.commission_pct, fee_rub: p.fee_rub, created_at: p.created_at, discount: pr ? pr.percent : null,
    comm_due: sum(l => l.partner_id === p.id && l.kind === 'commission' && l.status === 'accrued'),
    comm_paid: sum(l => l.partner_id === p.id && l.kind === 'commission' && l.status === 'paid'),
    fee_total: sum(l => l.partner_id === p.id && l.kind === 'fee'),
    sales: [...payments.values()].filter(x => x.promo === p.code && ['paid', 'demo'].includes(x.status)).length }; };
const db = {
  async sessionUser(h) { const s = sessions.get(h); return s ? users.get(s) : null; },
  async userById(i) { return users.get(i) || null; },
  async userByEmail(e) { return [...users.values()].find(u => u.email === e) || null; },
  async deleteSession() {}, async hit() { return 1; },
  async promoByCode(c) { const p = promos.get(c); if (!p || !p.active) return null; const uses = [...payments.values()].filter(x => x.promo === c && ['paid','demo'].includes(x.status)).length; return { code: c, percent: p.percent, max: null, uses }; },
  async setPromo(uid, c) { const u = users.get(uid); u.promo = c; return u; },
  async createPayment(p) { const i = id(); payments.set(i, { id: i, ...p, status: p.status }); return i; },
  async markPaid(pid) { const x = [...payments.values()].find(v => v.provider_id === pid); return null; },
  async activatePlan(uid, plan) { const u = users.get(uid); u.plan = plan; u.until = new Date(Date.now() + 864e5 * 30).toISOString(); return u; },
  async payments() { return []; },
  async partner(col, val) { const p = [...partners.values()].find(x => (col === 'id' ? x.id : x.user_id) === val); if (!p) return null; const v = pView(p);
    return { id: v.id, userId: v.user_id, email: v.email, name: v.name, channel: v.channel, subs: v.subs, views: v.avg_views, status: v.status, code: v.code, discount: v.discount, commission: v.commission_pct, fee: v.fee_rub, due: v.comm_due, paid: v.comm_paid, feeTotal: v.fee_total, sales: v.sales, created: v.created_at, ledger: ledger.filter(l => l.partner_id === p.id) }; },
  async partners() { return [...partners.values()].map(p => { const v = pView(p); return { id: v.id, userId: v.user_id, email: v.email, name: v.name, channel: v.channel, subs: v.subs, views: v.avg_views, status: v.status, code: v.code, discount: v.discount, commission: v.commission_pct, fee: v.fee_rub, due: v.comm_due, paid: v.comm_paid, feeTotal: v.fee_total, sales: v.sales, created: v.created_at }; }); },
  async partnerApply(uid, channel, subs, views) { if ([...partners.values()].some(p => p.user_id === uid)) throw new Error('dup');
    partners.set(id(), { id: null, user_id: uid, channel, subs, avg_views: views, status: 'pending', code: null, commission_pct: 10, fee_rub: 0, created_at: new Date().toISOString() }); [...partners.values()].forEach(p => p.id ??= id()); },
  async partnerSave(pid, f) { const p = partners.get([...partners.keys()].find(k => partners.get(k).id === pid)); Object.assign(p, { status: f.status, subs: f.subs, avg_views: f.views, fee_rub: f.fee, commission_pct: f.commission, code: f.code }); },
  async codeFree(code, pid) { return !(promos.has(code) && ![...partners.values()].some(p => p.code === code && p.id === pid)); },
  async promoUpsert(code, percent, creator, active) { promos.set(code, { percent, creator, active }); },
  async ledgerFee(pid, period, amount) { if (ledger.some(l => l.partner_id === pid && l.kind === 'fee' && l.period === period)) return false; ledger.push({ partner_id: pid, kind: 'fee', amount_rub: amount, period, status: 'accrued', payment_id: null, created_at: new Date().toISOString() }); return true; },
  async ledgerPaid(pid) { ledger.forEach(l => { if (l.partner_id === pid && l.status === 'accrued') { l.status = 'paid'; l.paid_at = new Date().toISOString(); } }); },
  async accrueCommission(payId) { const pay = payments.get(payId); if (!pay || !['paid', 'demo'].includes(pay.status) || !pay.promo) return;
    const p = [...partners.values()].find(x => x.code === pay.promo); if (!p || p.status !== 'active' || p.user_id === pay.user_id) return;
    if (ledger.some(l => l.payment_id === payId)) return;
    ledger.push({ partner_id: p.id, kind: 'commission', amount_rub: Math.round(pay.amount * p.commission_pct / 100), period: null, status: 'accrued', payment_id: payId, created_at: new Date().toISOString() }); },
};
const env = { DEMO_PAY: '1', ADMIN_KEY: 'x'.repeat(32) };
const H = makeHandler(db, env);
const call = async (method, path, body, token, admin) => {
  const headers = { 'content-type': 'application/json' }; if (token) headers.authorization = 'Bearer ' + token; if (admin) headers['x-admin-key'] = admin;
  const r = await H(new Request('https://x/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), { ip: '1.1.1.1' });
  return { s: r.status, j: await r.json() };
};
const log = (name, ok) => console.log((ok ? 'PASS ' : 'FAIL ') + name);

// пользователи
const pu = addUser('partner@x.ru', 'Анна'); const bu = addUser('buyer@x.ru', 'Борис'); const tokP = 'tp', tokB = 'tb';
sessions.set(sha(tokP), pu.id); sessions.set(sha(tokB), bu.id);

let r = await call('GET', '/partner', null, tokP); log('партнёра ещё нет -> partner:null', r.s === 200 && r.j.partner === null && r.j.terms.subs === 500);
r = await call('POST', '/partner/apply', { channel: 'ftp://bad', subs: 800, views: 3000 }, tokP); log('плохая ссылка отклонена', r.s === 400);
r = await call('POST', '/partner/apply', { channel: 'https://youtube.com/@anna', subs: 800, views: 3000 }, tokP); log('заявка создана', r.s === 200 && r.j.partner.status === 'pending');
r = await call('POST', '/partner/apply', { channel: 'https://youtube.com/@anna', subs: 800, views: 3000 }, tokP); log('повторная заявка -> 409', r.s === 409);
const pid = [...partners.values()][0].id;

r = await call('POST', '/admin/partners', null, null, 'wrong'); log('без админ-ключа -> 401', r.s === 401);
r = await call('GET', '/admin/partners', null, null, env.ADMIN_KEY); log('админ видит список', r.s === 200 && r.j.partners.length === 1);
r = await call('POST', '/admin/partner', { id: pid, status: 'active', subs: 300, views: 2500 }, null, env.ADMIN_KEY); log('активация с 300 подписчиками отклонена (422)', r.s === 422);
r = await call('POST', '/admin/partner', { id: pid, status: 'active', subs: 600, views: 1900 }, null, env.ADMIN_KEY); log('активация с 1900 просмотров отклонена (422)', r.s === 422);
r = await call('POST', '/admin/partner', { id: pid, status: 'active', subs: 600, views: 2500, fee: 15000 }, null, env.ADMIN_KEY);
const code = r.j.partner && r.j.partner.code; log('активация с 600/2500 -> код выдан', r.s === 200 && /^CR[0-9A-F]{6}$/.test(code || ''));
r = await call('POST', '/admin/partner', { id: pid, status: 'active', code: 'ANNA' }, null, env.ADMIN_KEY); log('смена кода на ANNA', r.s === 200 && r.j.partner.code === 'ANNA');
r = await call('POST', '/admin/partner', { id: pid, status: 'active', code: 'ANNA', discount: 15 }, null, env.ADMIN_KEY); log('скидка покупателю 15% выставлена', r.s === 200 && r.j.partner.discount === 15);

// покупатель вводит код и платит (демо)
r = await call('POST', '/promo', { code: 'ANNA' }, tokB); log('покупатель применил код ANNA', r.s === 200 && r.j.user.promo.code === 'ANNA');
r = await call('POST', '/pay', { plan: 'pro', method: 'sbp' }, tokB); log('оплата Pro со скидкой: 199 -> 169', r.s === 200 && [...payments.values()].at(-1).amount === 169);
r = await call('GET', '/partner', null, tokP);
log('комиссия 10% от 169 = 17 ₽ начислена', r.j.partner.due === 17 && r.j.partner.sales === 1);

// двойной вызов начисления не дублирует
const pay = [...payments.values()].at(-1); await db.accrueCommission(pay.id);
log('повторное начисление не дублирует', ledger.filter(l => l.kind === 'commission').length === 1);

// самопокупка партнёра не даёт комиссии
await db.setPromo(pu.id, 'ANNA'); const selfId = id(); payments.set(selfId, { id: selfId, user_id: pu.id, promo: 'ANNA', amount: 1000, status: 'paid' }); await db.accrueCommission(selfId);
log('самопокупка партнёра без комиссии', ledger.filter(l => l.kind === 'commission').length === 1);

// оплата за видео
r = await call('POST', '/admin/fee', { id: pid, period: '2026-10' }, null, env.ADMIN_KEY); log('оплата за видео за октябрь начислена (15000)', r.s === 200 && r.j.created === true);
r = await call('POST', '/admin/fee', { id: pid, period: '2026-10' }, null, env.ADMIN_KEY); log('второй раз за тот же месяц не дублируется', r.j.created === false);
r = await call('POST', '/admin/fee', { id: pid, period: '2026-13' }, null, env.ADMIN_KEY); log('кривой месяц отклонён', r.s === 400);
r = await call('GET', '/partner', null, tokP); log('кабинет партнёра: fee 15000 в журнале', r.j.partner.feeTotal === 15000 && r.j.partner.ledger.length >= 2);

// выплата
r = await call('POST', '/admin/paid', { id: pid }, null, env.ADMIN_KEY); r = await call('GET', '/partner', null, tokP);
log('после выплаты due=0, paid=17', r.j.partner.due === 0 && r.j.partner.paid === 17);

// пауза отключает начисления и код
r = await call('POST', '/admin/partner', { id: pid, status: 'paused' }, null, env.ADMIN_KEY);
log('пауза: статус paused', r.j.partner.status === 'paused');
log('пауза: код ANNA деактивирован', promos.get('ANNA').active === false);
// занятый код
r = await call('POST', '/admin/partner', { id: pid, code: 'Q-COLD' }, null, env.ADMIN_KEY); log('код Q-COLD (не занят) сохранён', r.s === 200);
r = await call('POST', '/admin/partner', { id: pid, code: 'XYZ' }, null, env.ADMIN_KEY); log('код XYZ сохранён', r.s === 200);
promos.set('TAKEN', { percent: 10, active: true });
r = await call('POST', '/admin/partner', { id: pid, code: 'TAKEN' }, null, env.ADMIN_KEY); log('занятый код TAKEN -> 409', r.s === 409);
console.log('done');
