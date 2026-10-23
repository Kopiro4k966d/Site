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
      tOv: 'Обзор', tPr: 'Пресеты', tBi: 'Оплата', tPa: 'Партнёрам', tSe: 'Настройки',
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
      toPlus: (p) => `Перейти на Plus · ${p} ₽ / мес`, orPlus: (p) => `или Plus · ${p} ₽ / мес`, or: 'или', plusBtn: (p) => `Plus · ${p} ₽ / мес`,
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
      tOv: 'Overview', tPr: 'Presets', tBi: 'Billing', tPa: 'Partners', tSe: 'Settings',
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
      toPlus: (p) => `Upgrade to Plus · ${p} ₽ / mo`, orPlus: (p) => `or Plus · ${p} ₽ / mo`, or: 'or', plusBtn: (p) => `Plus · ${p} ₽ / mo`,
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
  /* Партнёрская панель */
  const PT = {
    ru: {
      h: 'Партнёрская программа', lead: 'Для авторов видео про Crysea. Условия: от 500 подписчиков и регулярно от 2 000 просмотров на видео.',
      req: 'Условия', r1: 'От 500 подписчиков на канале', r2: 'Регулярно от 2 000 просмотров на видео', r3: 'Два видео о Crysea в неделю',
      p1: 'Оплата за видео ежемесячно', p2: 'Личный промокод: 10% с каждой покупки по нему', p3: 'Покупатель получает скидку по вашему коду',
      chL: 'Ссылка на канал', subL: 'Подписчиков', viL: 'Средние просмотры видео', apply: 'Подать заявку', sent: 'Заявка отправлена. Мы проверим канал и ответим.',
      pend: 'Заявка на проверке', pendD: 'Проверяем канал и цифры. Обычно это несколько дней.', act: 'Вы партнёр', paus: 'Партнёрство на паузе', rej: 'Заявка отклонена',
      code: 'Ваш промокод', copy: 'Копировать', copied: 'Скопировано', disc: (p) => `Покупатель получает ${p}% по коду`,
      sales: 'Продаж по коду', due: 'Комиссия к выплате', paid: 'Выплачено', fee: 'Оплата за видео', feeNo: 'по договорённости',
      hist: 'Начисления', noHist: 'Начислений пока нет', comm: 'Комиссия', feeRow: (p) => `Оплата за видео, ${p}`,
      st: { accrued: 'Начислено', paid: 'Выплачено' }, cur: (v) => v.toLocaleString('ru-RU') + ' ₽',
      okSub: 'Подписчики', okViews: 'Просмотры', done: 'выполнено', todo: 'не хватает', errCh: 'Вставьте ссылку на канал, например https://youtube.com/@name',
      errNum: 'Укажите подписчиков и просмотры числами', errExists: 'Заявка уже отправлена', errLimit: 'Слишком много попыток, попробуйте позже', errNet: 'Нет связи с сервером'
    },
    en: {
      h: 'Partner program', lead: 'For creators who make videos about Crysea. Requirements: 500+ subscribers and regularly 2,000+ views per video.',
      req: 'Requirements', r1: '500+ subscribers on the channel', r2: 'Regularly 2,000+ views per video', r3: 'Two videos about Crysea per week',
      p1: 'Monthly payment for videos', p2: 'Personal code: 10% of every purchase made with it', p3: 'Buyers get a discount with your code',
      chL: 'Channel link', subL: 'Subscribers', viL: 'Average views per video', apply: 'Apply', sent: 'Application sent. We will check the channel and get back to you.',
      pend: 'Under review', pendD: 'We are checking the channel and the numbers. This usually takes a few days.', act: 'You are a partner', paus: 'Partnership paused', rej: 'Application rejected',
      code: 'Your code', copy: 'Copy', copied: 'Copied', disc: (p) => `Buyers get ${p}% with this code`,
      sales: 'Sales with your code', due: 'Commission due', paid: 'Paid out', fee: 'Video payment', feeNo: 'by agreement',
      hist: 'Earnings', noHist: 'No earnings yet', comm: 'Commission', feeRow: (p) => `Video payment, ${p}`,
      st: { accrued: 'Accrued', paid: 'Paid' }, cur: (v) => v.toLocaleString('en-GB') + ' ₽',
      okSub: 'Subscribers', okViews: 'Views', done: 'done', todo: 'short by', errCh: 'Paste a channel link, for example https://youtube.com/@name',
      errNum: 'Enter subscribers and views as numbers', errExists: 'Application already sent', errLimit: 'Too many attempts, try again later', errNet: 'Cannot reach the server'
    }
  };
  const COLORS = ['#ffffff', '#9a9a9a', '#5865f2', '#2bb6a8', '#e2b04a', '#e8704f', '#d65d9a', '#7ec86b'];
  let lang = 'ru'; try { lang = localStorage.getItem('crysea_lang') === 'en' ? 'en' : 'ru'; } catch (e) {}
  const T = () => D[lang];
  const fmtDate = (d) => new Date(d).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  let user = null, payments = [], syncData = null, partnerData = null;
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
        <div class="ac-or"><span>${esc(t.or)}</span></div>
        <a class="btn w" href="/?buy=plus">${esc(t.plusBtn(priceOf('plus')))}</a></div>`;
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

  const pc = (n) => PT[lang].cur(Number(n) || 0);
  function paintPartner() {
    const t = PT[lang], box = $('#partner'), pt = partnerData && partnerData.partner;
    const terms = (partnerData && partnerData.terms) || { subs: 500, views: 2000, commission: 10 };
    const req = (ok, label, have, need) => `<li class="${ok ? 'met' : ''}">${ic(ok ? 'ok' : 'clock')}<span>${esc(label)}: <b>${have.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB')}</b> / ${need.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB')} ${ok ? '' : ''}</span></li>`;
    const reqBlock = (subs, views) => `<ul class="preq">${req(subs >= terms.subs, t.okSub, subs, terms.subs)}${req(views >= terms.views, t.okViews, views, terms.views)}</ul>`;
    if (!pt) {
      box.innerHTML = `<div class="card ac-card pcard">
        <h2>${esc(t.h)}</h2>
        <p>${esc(t.lead)}</p>
        <div class="pterms"><b>${esc(t.req)}</b><ul><li>${ic('ok')}<span>${esc(t.r1)}</span></li><li>${ic('ok')}<span>${esc(t.r2)}</span></li><li>${ic('ok')}<span>${esc(t.r3)}</span></li><li>${ic('ok')}<span>${esc(t.p1)}</span></li><li>${ic('ok')}<span>${esc(t.p2)}</span></li></ul></div>
        <form id="pApply" class="pform" autocomplete="off">
          <label class="f"><span>${esc(t.chL)}</span><input id="pCh" type="url" placeholder="https://youtube.com/@name" maxlength="200" required></label>
          <div class="pform-row">
            <label class="f"><span>${esc(t.subL)}</span><input id="pSub" type="number" min="0" max="1000000000" required></label>
            <label class="f"><span>${esc(t.viL)}</span><input id="pView" type="number" min="0" max="1000000000" required></label>
          </div>
          <div class="err" id="pErr" role="alert"></div>
          <button class="btn p w" type="submit">${esc(t.apply)}</button>
        </form>
      </div>`;
      return;
    }
    const st = { pending: [t.pend, t.pendD], active: [t.act, ''], paused: [t.paus, ''], rejected: [t.rej, ''] }[pt.status] || [t.pend, ''];
    const hist = (pt.ledger || []).map((l) => `<div class="ac-row"><b>${esc(l.kind === 'fee' ? t.feeRow(l.period) : t.comm)}</b><span>${esc(fmtDate(l.date))}</span><span>${esc(pc(l.amount))}</span><em class="st ${l.status === 'paid' ? 'paid' : ''}">${esc(t.st[l.status] || l.status)}</em></div>`).join('');
    box.innerHTML = `<div class="card ac-card pcard">
      <h2>${esc(st[0])}</h2>
      ${st[1] ? `<p>${esc(st[1])}</p>` : ''}
      ${pt.status === 'active' || pt.status === 'paused' ? `
        <div class="pcode"><small>${esc(t.code)}</small><div class="pcode-row"><b>${esc(pt.code || '')}</b><button class="btn s" type="button" data-copy="${esc(pt.code || '')}">${esc(t.copy)}</button></div>
        <span class="sub">${esc(t.disc(pt.discount ?? 10))}</span></div>` : ''}
      ${reqBlock(pt.subs, pt.views)}
      <div class="ac-stats">
        <div><small>${esc(t.sales)}</small><b>${pt.sales}</b></div>
        <div><small>${esc(t.due)}</small><b>${esc(pc(pt.due))}</b></div>
        <div><small>${esc(t.paid)}</small><b>${esc(pc(pt.paid))}</b></div>
      </div>
      <p class="sub">${esc(t.fee)}: ${pt.fee ? esc(pc(pt.fee)) + ' / ' + (lang === 'ru' ? 'мес' : 'mo') : esc(t.feeNo)}</p>
      <h3 class="phist">${esc(t.hist)}</h3>
      <div class="card ac-list">${hist || `<div class="ac-empty"><span>${esc(t.noHist)}</span></div>`}</div>
    </div>`;
  }

  function paintUser() {
    const t = T(), L = (user.name || user.email)[0].toUpperCase();
    $('#profAv').textContent = $('#av').textContent = L;
    $('#hello').textContent = t.hello(user.name);
    $('#mail').textContent = user.email; $('#sMail').value = user.email;
    if (document.activeElement !== $('#sName')) $('#sName').value = user.name;
    const ch = $('#chip'); ch.className = 'chip' + (user.plan !== 'free' ? ' pro' : '');
    ch.innerHTML = ic(user.plan === 'free' ? 'user' : 'spark') + esc(user.plan === 'free' ? t.free : PLANS[user.plan].name);
    $('#bPlan').textContent = user.plan === 'free' ? t.free : PLANS[user.plan].name;
    $('#bUntil').textContent = user.until ? fmtDate(user.until) : t.never;
    $('#bSince').textContent = fmtDate(user.created);
    paintPlan(); paintDownload(); paintPresets(); paintHistory(); paintSteps(); paintCreator(); paintPartner();
  }

  function paintDownload() {
    const d = (window.CRYSEA && window.CRYSEA.download) || {}, has = !!(d.setup || d.portable), b = $('#dlBtn');
    b.href = '#'; // клик открывает окно выбора Setup/exe (см. config.js), а не ведёт по прямой ссылке
    if (has) { b.removeAttribute('aria-disabled'); b.classList.add('p'); $('#dlNote').textContent = T().dlN; }
    else { b.setAttribute('aria-disabled', 'true'); $('#dlNote').textContent = T().dlNo; }
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
      user = (await call('PUT', '/me', { name: n })).user; paintUser();
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

  $('#partner').addEventListener('click', async (e) => {
    const c = e.target.closest('[data-copy]'); if (!c) return;
    try { await navigator.clipboard.writeText(c.dataset.copy); c.textContent = PT[lang].copied; setTimeout(() => (c.textContent = PT[lang].copy), 1500); } catch (err) {}
  });
  $('#partner').addEventListener('submit', async (e) => {
    if (e.target.id !== 'pApply') return;
    e.preventDefault();
    const t = PT[lang], E = $('#pErr'), B = e.target.querySelector('button'), ch = $('#pCh').value.trim();
    E.textContent = '';
    if (!/^https?:\/\/\S+\.\S+$/.test(ch)) { E.textContent = t.errCh; return; }
    const subs = $('#pSub').value, views = $('#pView').value;
    if (subs === '' || views === '') { E.textContent = t.errNum; return; }
    B.disabled = true;
    try {
      partnerData = { ...(partnerData || {}), partner: (await call('POST', '/partner/apply', { channel: ch, subs: Number(subs), views: Number(views) })).partner };
      paintPartner();
    } catch (err) {
      const map = { channel: t.errCh, numbers: t.errNum, exists: t.errExists, limit: t.errLimit, net: t.errNet };
      E.textContent = map[err.message] || t.errNet;
      B.disabled = false;
    }
  });

  /* ---------- Старт ---------- */
  paintStatic();
  if (!tok()) return toLogin();
  (async function () {
    try { user = (await call('GET', '/me')).user; }
    catch (e) {
      if (e.status === 401) { setTok(null); return toLogin(); }
      $('#skel').hidden = true; $('#app').hidden = false; $('#hello').textContent = T().net; return;
    }
    const [pm, sy, pa] = await Promise.all([call('GET', '/payments').catch(() => null), call('GET', '/sync').catch(() => null), call('GET', '/partner').catch(() => null)]);
    payments = (pm && pm.payments) || []; syncData = sy && sy.data; partnerData = pa;
    $('#skel').hidden = true; $('#app').hidden = false;
    paintUser(); setTab(location.hash.slice(1));
  })();
})();

/* шапка: сверху на всю ширину, при прокрутке — островок */
(() => { const pill = document.querySelector('.pill'); if (!pill) return;
  const lift = () => pill.classList.toggle('lift', scrollY > 12);
  addEventListener('scroll', lift, { passive: true }); lift(); })();
