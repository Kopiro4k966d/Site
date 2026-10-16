/* Crysea: кабинет. Тот же API и тот же токен, что и на главной (auth.js). */
(function () {
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const K = 'crysea_token';
  const tok = () => { try { return localStorage.getItem(K); } catch (e) { return null; } };
  const setTok = (t) => { try { t ? localStorage.setItem(K, t) : localStorage.removeItem(K); } catch (e) {} };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (id) => `<svg class="ic"><use href="#i-${id}"/></svg>`;

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
      s1: 'Аккаунт создан', s2: 'Вход в приложении', s3: 'Тариф выбран',
      crH: 'Код автора', crP: 'Из видео автора или из Discord. Скидка применится к цене тарифа сама, на странице оплаты вводить ничего не нужно.',
      crPh: 'Код автора', crB: 'Применить', crOn: (c, p) => `Код ${c} активен: скидка ${p}% на тариф.`, crOff: 'Убрать код',
      crBad: 'Такого кода нет', crUsed: 'Лимит использований кода исчерпан', crEmpty: 'Введите код',
      sPlan: 'Тариф', sUntil: 'Действует до', sSince: 'Регистрация', chg: 'Сменить тариф',
      rn: 'Имя', clr: 'Цвет аватара', save: 'Сохранить', saved: 'Сохранено', out: 'Выйти', lg: 'Оферта и конфиденциальность',
      hello: (n) => 'Привет, ' + n, per: ' / мес', best: 'Самый популярный', yours: 'Ваш тариф',
      until: (d) => 'Активен до ' + d, left: (n) => `Осталось ${n} дн.`, buy: (n, p) => `Купить ${n} · ${p} ₽`, ext: (n) => 'Продлить ' + n,
      toPlus: (p) => `Перейти на Plus · ${p} ₽ / мес`, orPlus: (p) => `или Plus · ${p} ₽ / мес`,
      a4: 'Всё из Free', a5: 'Профили игр и свой прицел', a6: 'Инструменты для Rust', a8: 'Всё из Pro', a9: 'Авто-режим Rust', a10: 'Рейд-калькулятор',
      free: 'Free', never: '—',
      noPre: 'Пока нет пресетов', noPreD: 'Профили игр появятся здесь после синхронизации из приложения Crysea. Войдите в приложении с этим аккаунтом.',
      sat: (v) => 'Насыщенность ' + v + '%', preGen: 'Пресет',
      noPay: 'Платежей пока нет', noPayD: 'Здесь появится история покупок.', paid: 'Оплачен', pending: 'Ожидает', canceled: 'Отменён', demo: 'Тест',
      m: { sbp: 'СБП', card: 'Карта', sber: 'SberPay', ym: 'ЮMoney', usdt: 'USDT' },
      net: 'Нет связи с сервером', name: 'Введите имя', auth: 'Сессия истекла, войдите снова'
    },
    en: {
      n1: 'Features', n2: 'Updates', n3: 'Pricing', n4: 'Reviews', kick: 'Dashboard',
      tOv: 'Overview', tPr: 'Presets', tBi: 'Billing', tSe: 'Settings',
      dlH: 'Download Crysea',
      dlP: 'Saturation to 300% and before / after comparison come with this account: no card, no subscription. Game profiles, crosshair and Rust tools are part of a paid plan.',
      dlB: 'Download for Windows', dlN: 'Sign in inside the app with this account and everything syncs.', dlNo: 'The download link will appear after release.',
      s1: 'Account created', s2: 'Signed in to the app', s3: 'Plan chosen',
      crH: 'Creator code', crP: 'From a creator’s video or Discord. The discount is applied to the plan price automatically, nothing to type at checkout.',
      crPh: 'Creator code', crB: 'Apply', crOn: (c, p) => `Code ${c} is active: ${p}% off your plan.`, crOff: 'Remove code',
      crBad: 'This code does not exist', crUsed: 'This code has reached its usage limit', crEmpty: 'Enter a code',
      sPlan: 'Plan', sUntil: 'Valid until', sSince: 'Joined', chg: 'Change plan',
      rn: 'Name', clr: 'Avatar color', save: 'Save', saved: 'Saved', out: 'Sign out', lg: 'Terms & Privacy',
      hello: (n) => 'Hey, ' + n, per: ' / mo', best: 'Most popular', yours: 'Your plan',
      until: (d) => 'Active until ' + d, left: (n) => `${n} days left`, buy: (n, p) => `Get ${n} · ${p} ₽`, ext: (n) => 'Renew ' + n,
      toPlus: (p) => `Upgrade to Plus · ${p} ₽ / mo`, orPlus: (p) => `or Plus · ${p} ₽ / mo`,
      a4: 'Everything in Free', a5: 'Game profiles and custom crosshair', a6: 'Rust toolkit', a8: 'Everything in Pro', a9: 'Rust auto mode', a10: 'Raid calculator',
      free: 'Free', never: '—',
      noPre: 'No presets yet', noPreD: 'Your game profiles show up here after syncing from the Crysea app. Sign in inside the app with this account.',
      sat: (v) => 'Saturation ' + v + '%', preGen: 'Preset',
      noPay: 'No payments yet', noPayD: 'Your purchase history will appear here.', paid: 'Paid', pending: 'Pending', canceled: 'Canceled', demo: 'Test',
      m: { sbp: 'SBP', card: 'Card', sber: 'SberPay', ym: 'YooMoney', usdt: 'USDT' },
      net: 'Cannot reach the server', name: 'Enter your name', auth: 'Session expired, sign in again'
    }
  };
  const PLANS = { pro: { name: 'Pro', price: 199 }, plus: { name: 'Plus', price: 399 } };
  const COLORS = ['#ffffff', '#9a9a9a', '#5865f2', '#2bb6a8', '#e2b04a', '#e8704f', '#d65d9a', '#7ec86b'];
  let lang = 'ru'; try { lang = localStorage.getItem('crysea_lang') === 'en' ? 'en' : 'ru'; } catch (e) {}
  const T = () => D[lang];
  const fmtDate = (d) => new Date(d).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  let user = null, payments = [], syncData = null, color = null;
  const priceOf = (id) => { const b = PLANS[id].price, pc = user && user.promo ? user.promo.percent : 0; return pc ? Math.max(1, Math.round(b * (100 - pc) / 100)) : b; };
  const priceHtml = (id) => (user.promo ? `<s>${PLANS[id].price}</s>` : '') + priceOf(id);

  /* ---------- Отрисовка ---------- */
  function paintStatic() {
    document.documentElement.lang = lang;
    $$('[data-t]').forEach((e) => { const v = T()[e.dataset.t]; if (typeof v === 'string') e.textContent = v; });
    $$('[data-ph]').forEach((e) => (e.placeholder = T()[e.dataset.ph]));
    $('#lang').textContent = lang === 'ru' ? 'EN' : 'RU';
  }

  function bullets(list) {
    return '<ul>' + list.map((k) => `<li>${ic('ok')}<span>${esc(T()[k])}</span></li>`).join('') + '</ul>';
  }

  function paintPlan() {
    const t = T(), p = user.plan, card = $('#planCard');
    if (p === 'free') {
      card.innerHTML = `<span class="tag">${esc(t.best)}</span>
        <div class="ac-price">${priceHtml('pro')} ₽<small>${esc(t.per)}</small></div>
        <h2 style="font-size:1.4rem;margin:6px 0 0">Pro</h2>
        ${bullets(['a4', 'a5', 'a6'])}<div class="grow"></div>
        <div class="ac-btns"><a class="btn p w" href="/?buy=pro">${esc(t.buy('Pro', priceOf('pro')))}</a>
        <a class="btn w" href="/?buy=plus">${esc(t.orPlus(priceOf('plus')))}</a></div>`;
      return;
    }
    const name = PLANS[p].name, days = Math.max(0, Math.ceil((Date.parse(user.until) - Date.now()) / 864e5));
    card.innerHTML = `<span class="tag">${esc(t.yours)}</span>
      <div class="ac-price">${esc(name)}</div>
      <div class="left"><div><span>${esc(t.until(fmtDate(user.until)))}</span><span>${esc(t.left(days))}</span></div><span class="bar"><i data-w="${Math.min(100, Math.round(days / 31 * 100))}"></i></span></div>
      ${bullets(p === 'plus' ? ['a8', 'a9', 'a10'] : ['a4', 'a5', 'a6'])}<div class="grow"></div>
      <div class="ac-btns"><a class="btn p w" href="/?buy=${p}">${esc(t.ext(name))}</a>
      ${p === 'pro' ? `<a class="btn w" href="/?buy=plus">${esc(t.toPlus(priceOf('plus')))}</a>` : ''}</div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.left i').forEach((i) => (i.style.width = i.dataset.w + '%'))));
  }

  function paintSteps() {
    const t = T(), synced = !!(syncData && Object.keys(syncData).length);
    const s = [[t.s1, true], [t.s2, synced], [t.s3, user.plan !== 'free']];
    $('#steps').innerHTML = s.map(([l, d], i) => `<div class="step ${d ? 'done' : ''}"><b>${d ? ic('ok') : i + 1}</b><span>${esc(l)}</span></div>`).join('');
    $$('#steps b .ic').forEach((e) => { e.style.cssText = 'width:15px;height:15px;stroke-width:2.6'; });
  }

  function paintCreator() {
    const t = T(), box = $('#creator'), pm = user.promo, msg = $('#crMsg');
    box.classList.toggle('on', !!pm);
    if (pm) {
      msg.className = 'msg good'; msg.textContent = t.crOn(pm.code, pm.percent);
      $('#crIn').value = pm.code; $('#crBtn').textContent = t.crOff; $('#crBtn').dataset.mode = 'off'; $('#crIn').readOnly = true;
    } else {
      if (msg.className.indexOf('bad') < 0) { msg.className = 'msg'; msg.textContent = ''; }
      $('#crBtn').textContent = t.crB; $('#crBtn').dataset.mode = 'on'; $('#crIn').readOnly = false;
    }
  }

  function paintUser() {
    const t = T(), L = (user.name || user.email)[0].toUpperCase();
    $('#profAv').textContent = $('#av').textContent = L;
    if (user.color) $('#profAv').style.background = $('#av').style.background = user.color;
    $('#hello').textContent = t.hello(user.name);
    $('#mail').textContent = user.email; $('#sMail').value = user.email;
    if (document.activeElement !== $('#sName')) $('#sName').value = user.name;
    const ch = $('#chip'); ch.className = 'chip' + (user.plan !== 'free' ? ' pro' : '');
    ch.innerHTML = ic(user.plan === 'free' ? 'user' : 'spark') + esc(user.plan === 'free' ? t.free : PLANS[user.plan].name);
    $('#bPlan').textContent = user.plan === 'free' ? t.free : PLANS[user.plan].name;
    $('#bUntil').textContent = user.until ? fmtDate(user.until) : t.never;
    $('#bSince').textContent = fmtDate(user.created);
    if (color === null) color = user.color || COLORS[0];
    paintSwatches(); paintPlan(); paintDownload(); paintPresets(); paintHistory(); paintSteps(); paintCreator();
  }

  function paintSwatches() {
    $('#swatches').innerHTML = COLORS.map((c) => `<button type="button" style="background:${c}" data-c="${c}" aria-label="${c}" aria-pressed="${c === color}"></button>`).join('');
    $$('#swatches button').forEach((b) => (b.onclick = () => { color = b.dataset.c; $('#av').style.background = $('#profAv').style.background = color; paintSwatches(); }));
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
  const empty = (icon, a, b) => `<div class="ac-empty"><div class="dl-ico">${ic(icon)}</div><b>${esc(a)}</b><span>${esc(b)}</span></div>`;
  function paintPresets() {
    const t = T(), list = presetList(syncData), box = $('#presets');
    if (!list.length) { box.innerHTML = `<div class="card">${empty('layers', t.noPre, t.noPreD)}</div>`; return; }
    box.innerHTML = '<div class="ac-presets">' + list.map((x) => {
      const sat = [x.saturation, x.sat, x.saturate].find((v) => typeof v === 'number');
      return `<article class="card"><span class="tag">${esc(t.preGen)}</span><h3>${esc(String(x.name || x.game || x.id || t.preGen).slice(0, 40))}</h3>${sat != null ? `<p>${esc(t.sat(Math.round(sat)))}</p>` : ''}</article>`;
    }).join('') + '</div>';
  }

  function paintHistory() {
    const t = T(), box = $('#history');
    if (!payments.length) { box.innerHTML = empty('receipt', t.noPay, t.noPayD); return; }
    box.innerHTML = payments.map((p) => `<div class="ac-row"><b>Crysea ${esc(PLANS[p.plan] ? PLANS[p.plan].name : p.plan)}</b><span>${esc(fmtDate(p.date))}</span><span>${esc(t.m[p.method] || p.method || '')} · ${esc(p.amount)} ₽</span><em class="st ${p.status === 'paid' ? 'paid' : ''}">${esc(t[p.status] || p.status)}</em></div>`).join('');
  }

  /* ---------- Вкладки с «ползущим» индикатором ---------- */
  function moveSeg() {
    const on = $('#tabs .on'); if (!on) return;
    const s = $('#tabs').style; s.setProperty('--x', on.offsetLeft + 'px'); s.setProperty('--w', on.offsetWidth + 'px');
  }
  function setTab(id) {
    if (!$(`[data-pane="${id}"]`)) id = 'overview';
    $$('#tabs button').forEach((b) => { const on = b.dataset.tab === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $$('.ac-pane').forEach((p) => (p.hidden = p.dataset.pane !== id));
    moveSeg();
    if (location.hash.slice(1) !== id) history.replaceState(null, '', id === 'overview' ? location.pathname : '#' + id);
  }
  $$('#tabs button').forEach((b) => (b.onclick = () => setTab(b.dataset.tab)));
  addEventListener('hashchange', () => setTab(location.hash.slice(1)));
  addEventListener('resize', moveSeg);

  /* ---------- Действия ---------- */
  const toLogin = () => location.replace('/?login=1');
  $('#lang').onclick = () => { lang = lang === 'ru' ? 'en' : 'ru'; try { localStorage.setItem('crysea_lang', lang); } catch (e) {} paintStatic(); if (user) paintUser(); moveSeg(); };
  $('#menu').onclick = () => $('#nav').classList.toggle('open');
  $('#dlBtn').onclick = (e) => { if ($('#dlBtn').getAttribute('aria-disabled')) e.preventDefault(); };
  $('#sOut').onclick = async () => { try { await call('POST', '/logout'); } catch (e) {} setTok(null); location.href = '/'; };
  $('#sSave').onclick = async () => {
    const E = $('#sErr'), B = $('#sSave'), n = $('#sName').value.trim(); E.textContent = '';
    if (!n) return (E.textContent = T().name);
    B.disabled = true;
    try {
      user = (await call('PUT', '/me', { name: n, color })).user; paintUser();
      B.textContent = T().saved; setTimeout(() => (B.textContent = T().save), 1600);
    } catch (e) { E.textContent = T()[e.message] || e.message; }
    B.disabled = false;
  };
  $('#crForm').onsubmit = async (e) => {
    e.preventDefault();
    const B = $('#crBtn'), msg = $('#crMsg'), off = B.dataset.mode === 'off', code = $('#crIn').value.trim();
    if (!off && !code) { msg.className = 'msg bad'; msg.textContent = T().crEmpty; return; }
    B.disabled = true; msg.className = 'msg'; msg.textContent = '';
    try {
      user = (await call('POST', '/promo', { code: off ? '' : code })).user;
      if (off) $('#crIn').value = '';
      paintUser();
    } catch (err) { msg.className = 'msg bad'; msg.textContent = T()[err.message === 'promo_bad' ? 'crBad' : err.message === 'promo_used' ? 'crUsed' : err.message] || err.message; }
    B.disabled = false;
  };

  /* ---------- Старт ---------- */
  paintStatic();
  if (!tok()) return toLogin();
  (async function () {
    try { user = (await call('GET', '/me')).user; }
    catch (e) {
      if (e.status === 401) { setTok(null); return toLogin(); }
      $('#skel').hidden = true; $('#app').hidden = false; $('#hello').textContent = T().net; return;
    }
    const [pm, sy] = await Promise.all([call('GET', '/payments').catch(() => null), call('GET', '/sync').catch(() => null)]);
    payments = (pm && pm.payments) || []; syncData = sy && sy.data;
    $('#skel').hidden = true; $('#app').hidden = false;
    paintUser(); setTab(location.hash.slice(1));
  })();
})();
