/* Crysea: кабинет. Тот же API и тот же токен, что и на главной (auth.js). */
(function () {
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const K = 'crysea_token';
  const tok = () => { try { return localStorage.getItem(K); } catch (e) { return null; } };
  const setTok = (t) => { try { t ? localStorage.setItem(K, t) : localStorage.removeItem(K); } catch (e) {} };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function call(method, path, data) {
    let r;
    try {
      r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok() }, body: data ? JSON.stringify(data) : undefined });
    } catch (e) { throw new Error('net'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const err = new Error(j.error || 'net'); err.status = r.status; throw err; }
    return j;
  }

  /* ---------- Тексты ---------- */
  const D = {
    ru: {
      n1: 'Возможности', n2: 'Обновления', n3: 'Тарифы', n4: 'Отзывы', kick: 'Кабинет',
      tOv: 'Обзор', tPr: 'Пресеты', tBi: 'Оплата', tSe: 'Настройки',
      dlH: 'Скачать Crysea',
      dlP: 'Насыщенность до 300% и сравнение до / после доступны с этим аккаунтом: без карты и без подписки. Профили игр, прицел и инструменты для Rust входят в платный тариф.',
      dlB: 'Скачать для Windows', dlN: 'Войдите в приложении с этим аккаунтом, и всё подтянется.', dlNo: 'Ссылка на скачивание появится после релиза.',
      sPlan: 'Тариф', sUntil: 'Действует до', sSince: 'Регистрация', chg: 'Сменить тариф',
      rn: 'Имя', save: 'Сохранить', saved: 'Сохранено ✓', out: 'Выйти', lg: 'Оферта и конфиденциальность',
      hello: (n) => 'Привет, ' + n, per: ' / мес', best: 'Самый популярный', yours: 'Ваш тариф',
      until: (d) => 'Активен до ' + d, buy: (n, p) => `Купить ${n} · ${p} ₽`, ext: (n) => 'Продлить ' + n,
      toPlus: (p) => `Перейти на Plus · ${p} ₽ / мес`, orPlus: (p) => `или Plus · ${p} ₽ / мес`,
      a4: 'Всё из Free', a5: 'Профили игр и свой прицел', a6: 'Инструменты для Rust', a8: 'Всё из Pro', a9: 'Авто-режим Rust', a10: 'Рейд-калькулятор',
      free: 'Free', never: '—',
      noPre: 'Пока нет пресетов', noPreD: 'Профили игр появятся здесь после синхронизации из приложения Crysea. Войдите в приложении с этим аккаунтом.',
      sat: (v) => 'Насыщенность ' + v + '%', preGen: 'Пресет',
      noPay: 'Платежей пока нет.', paid: 'Оплачен', pending: 'Ожидает', canceled: 'Отменён', demo: 'Тест',
      m: { sbp: 'СБП', card: 'Карта', sber: 'SberPay', ym: 'ЮMoney', usdt: 'USDT' },
      net: 'Нет связи с сервером', name: 'Введите имя', auth: 'Сессия истекла, войдите снова'
    },
    en: {
      n1: 'Features', n2: 'Updates', n3: 'Pricing', n4: 'Reviews', kick: 'Dashboard',
      tOv: 'Overview', tPr: 'Presets', tBi: 'Billing', tSe: 'Settings',
      dlH: 'Download Crysea',
      dlP: 'Saturation to 300% and before / after comparison come with this account: no card, no subscription. Game profiles, crosshair and Rust tools are part of a paid plan.',
      dlB: 'Download for Windows', dlN: 'Sign in inside the app with this account and everything syncs.', dlNo: 'The download link will appear after release.',
      sPlan: 'Plan', sUntil: 'Valid until', sSince: 'Joined', chg: 'Change plan',
      rn: 'Name', save: 'Save', saved: 'Saved ✓', out: 'Sign out', lg: 'Terms & Privacy',
      hello: (n) => 'Hey, ' + n, per: ' / mo', best: 'Most popular', yours: 'Your plan',
      until: (d) => 'Active until ' + d, buy: (n, p) => `Get ${n} · ${p} ₽`, ext: (n) => 'Renew ' + n,
      toPlus: (p) => `Upgrade to Plus · ${p} ₽ / mo`, orPlus: (p) => `or Plus · ${p} ₽ / mo`,
      a4: 'Everything in Free', a5: 'Game profiles and custom crosshair', a6: 'Rust toolkit', a8: 'Everything in Pro', a9: 'Rust auto mode', a10: 'Raid calculator',
      free: 'Free', never: '—',
      noPre: 'No presets yet', noPreD: 'Your game profiles show up here after syncing from the Crysea app. Sign in inside the app with this account.',
      sat: (v) => 'Saturation ' + v + '%', preGen: 'Preset',
      noPay: 'No payments yet.', paid: 'Paid', pending: 'Pending', canceled: 'Canceled', demo: 'Test',
      m: { sbp: 'SBP', card: 'Card', sber: 'SberPay', ym: 'YooMoney', usdt: 'USDT' },
      net: 'Cannot reach the server', name: 'Enter your name', auth: 'Session expired, sign in again'
    }
  };
  const PLANS = { pro: { name: 'Pro', price: 199 }, plus: { name: 'Plus', price: 399 } };
  let lang = 'ru'; try { lang = localStorage.getItem('crysea_lang') === 'en' ? 'en' : 'ru'; } catch (e) {}
  const T = () => D[lang];
  const fmtDate = (d) => new Date(d).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  let user = null, payments = [], syncData = null;

  /* ---------- Отрисовка ---------- */
  function paintStatic() {
    document.documentElement.lang = lang;
    $$('[data-t]').forEach((e) => { const v = T()[e.dataset.t]; if (typeof v === 'string') e.textContent = v; });
    $('#lang').textContent = lang === 'ru' ? 'EN' : 'RU';
  }

  function bullets(list) {
    return '<ul>' + list.map((k) => `<li><svg class="ic"><use href="#i-ok"/></svg><span>${esc(T()[k])}</span></li>`).join('') + '</ul>';
  }

  function paintPlan() {
    const t = T(), p = user.plan, card = $('#planCard');
    if (p === 'free') {
      card.innerHTML = `<span class="tag">${esc(t.best)}</span>
        <div class="ac-price">${PLANS.pro.price} ₽<small>${esc(t.per)}</small></div>
        <h2 style="font-size:1.4rem;margin:6px 0 0">Pro</h2>
        ${bullets(['a4', 'a5', 'a6'])}<div class="grow"></div>
        <div class="ac-btns"><a class="btn p w" href="index.html?buy=pro">${esc(t.buy('Pro', PLANS.pro.price))}</a>
        <a class="btn w" href="index.html?buy=plus">${esc(t.orPlus(PLANS.plus.price))}</a></div>`;
      return;
    }
    const name = PLANS[p].name;
    card.innerHTML = `<span class="tag">${esc(t.yours)}</span>
      <div class="ac-price">${esc(name)}</div>
      <p style="margin:4px 0 0;color:var(--muted)">${esc(user.until ? t.until(fmtDate(user.until)) : '')}</p>
      ${bullets(p === 'plus' ? ['a8', 'a9', 'a10'] : ['a4', 'a5', 'a6'])}<div class="grow"></div>
      <div class="ac-btns"><a class="btn p w" href="index.html?buy=${p}">${esc(t.ext(name))}</a>
      ${p === 'pro' ? `<a class="btn w" href="index.html?buy=plus">${esc(t.toPlus(PLANS.plus.price))}</a>` : ''}</div>`;
  }

  function paintUser() {
    const t = T(), L = (user.name || user.email)[0].toUpperCase();
    $('#profAv').textContent = $('#av').textContent = L;
    if (user.color) $('#profAv').style.background = $('#av').style.background = user.color;
    $('#hello').textContent = t.hello(user.name);
    $('#mail').textContent = user.email; $('#sMail').value = user.email;
    if (document.activeElement !== $('#sName')) $('#sName').value = user.name;
    $('#bPlan').textContent = user.plan === 'free' ? t.free : PLANS[user.plan].name;
    $('#bUntil').textContent = user.until ? fmtDate(user.until) : t.never;
    $('#bSince').textContent = fmtDate(user.created);
    paintPlan(); paintDownload(); paintPresets(); paintHistory();
  }

  function paintDownload() {
    const url = (window.CRYSEA && window.CRYSEA.download) || '', b = $('#dlBtn');
    if (url) { b.href = url; b.removeAttribute('aria-disabled'); b.classList.add('p'); $('#dlNote').textContent = T().dlN; }
    else { b.href = '#'; b.setAttribute('aria-disabled', 'true'); $('#dlNote').textContent = T().dlNo; }
  }

  function presetList(d) {
    const raw = d && (d.profiles || d.games || d.presets);
    if (!raw || typeof raw !== 'object') return [];
    const arr = Array.isArray(raw) ? raw : Object.entries(raw).map(([k, v]) => (v && typeof v === 'object' ? { name: k, ...v } : { name: k }));
    return arr.filter((x) => x && typeof x === 'object');
  }
  function paintPresets() {
    const t = T(), list = presetList(syncData), box = $('#presets');
    if (!list.length) { box.innerHTML = `<div class="card ac-empty"><b style="color:#fff">${esc(t.noPre)}</b><p style="margin:6px 0 0">${esc(t.noPreD)}</p></div>`; return; }
    box.innerHTML = '<div class="ac-presets">' + list.map((x) => {
      const sat = [x.saturation, x.sat, x.saturate].find((v) => typeof v === 'number');
      return `<article class="card"><span class="tag">${esc(t.preGen)}</span><h3>${esc(String(x.name || x.game || x.id || t.preGen).slice(0, 40))}</h3>${sat != null ? `<p>${esc(t.sat(Math.round(sat)))}</p>` : ''}</article>`;
    }).join('') + '</div>';
  }

  function paintHistory() {
    const t = T(), box = $('#history');
    if (!payments.length) { box.innerHTML = `<div class="ac-empty">${esc(t.noPay)}</div>`; return; }
    box.innerHTML = payments.map((p) => `<div class="ac-row"><b>Crysea ${esc(PLANS[p.plan] ? PLANS[p.plan].name : p.plan)}</b><span>${esc(fmtDate(p.date))}</span><span>${esc(t.m[p.method] || p.method || '')} · ${esc(p.amount)} ₽</span><em class="st ${p.status === 'paid' ? 'paid' : ''}" style="font-style:normal">${esc(t[p.status] || p.status)}</em></div>`).join('');
  }

  /* ---------- Вкладки ---------- */
  function setTab(id) {
    if (!$(`[data-pane="${id}"]`)) id = 'overview';
    $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
    $$('.ac-pane').forEach((p) => (p.hidden = p.dataset.pane !== id));
    if (location.hash.slice(1) !== id) history.replaceState(null, '', id === 'overview' ? location.pathname : '#' + id);
  }
  $$('#tabs button').forEach((b) => (b.onclick = () => setTab(b.dataset.tab)));
  addEventListener('hashchange', () => setTab(location.hash.slice(1)));

  /* ---------- Действия ---------- */
  const toLogin = () => location.replace('index.html?login=1');
  $('#lang').onclick = () => { lang = lang === 'ru' ? 'en' : 'ru'; try { localStorage.setItem('crysea_lang', lang); } catch (e) {} paintStatic(); if (user) paintUser(); };
  $('#menu').onclick = () => $('#nav').classList.toggle('open');
  $('#dlBtn').onclick = (e) => { if ($('#dlBtn').getAttribute('aria-disabled')) e.preventDefault(); };
  $('#sOut').onclick = async () => { try { await call('POST', '/logout'); } catch (e) {} setTok(null); location.href = 'index.html'; };
  $('#sSave').onclick = async () => {
    const E = $('#sErr'), B = $('#sSave'), n = $('#sName').value.trim(); E.textContent = '';
    if (!n) return (E.textContent = T().name);
    B.disabled = true;
    try {
      user = (await call('PUT', '/me', { name: n })).user; paintUser();
      B.textContent = T().saved; setTimeout(() => (B.textContent = T().save), 1600);
    } catch (e) { E.textContent = T()[e.message] || e.message; }
    B.disabled = false;
  };

  /* ---------- Старт ---------- */
  paintStatic();
  if (!tok()) return toLogin();
  (async function () {
    try { user = (await call('GET', '/me')).user; }
    catch (e) { if (e.status === 401) { setTok(null); return toLogin(); } $('#app').hidden = false; $('#hello').textContent = T().net; return; }
    const [pm, sy] = await Promise.all([call('GET', '/payments').catch(() => null), call('GET', '/sync').catch(() => null)]);
    payments = (pm && pm.payments) || []; syncData = sy && sy.data;
    paintUser(); setTab(location.hash.slice(1)); $('#app').hidden = false;
  })();
})();
