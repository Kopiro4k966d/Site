/* Crysea: окно «Партнёрство» (вкладки слева) и вкладка «Партнёрка» в кабинете.
   Пороги и доли совпадают с сервером (netlify/functions/api.mjs, PARTNER). Сервер проверяет всё ещё раз. */
(function () {
  const K = 'crysea_token';
  const tok = () => { try { return localStorage.getItem(K); } catch (e) { return null; } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rub = (n) => Number(n || 0).toLocaleString('ru-RU') + ' ₽';
  const num = (n) => Number(n || 0).toLocaleString('ru-RU');
  const ic = (id) => `<svg class="ic"><use href="#i-${id}"/></svg>`;

  const MIN = { tiktok: { views: 1000, followers: 50, label: 'TikTok' }, youtube: { views: 300, followers: 50, label: 'YouTube' } };
  const RATE = 5, BUYER = 10;
  const ERR = {
    platform: 'Ссылка должна вести на TikTok или YouTube',
    low: 'Пока не подходит: TikTok — от 1 000 просмотров и 50 подписчиков, YouTube — от 300 и 50',
    agree: 'Отметьте галочку, чтобы отправить заявку',
    payout: 'Укажите реквизиты для выплат', contact: 'Укажите, как с вами связаться',
    code_fmt: 'Промокод: от 3 до 16 латинских букв или цифр',
    code_taken: 'Этот промокод уже занят, выберите другой', has_code: 'Промокод уже закреплён за вами',
    not_approved: 'Заявка ещё не одобрена', limit: 'Слишком много попыток, попробуйте позже',
    auth: 'Сессия истекла, войдите снова', net: 'Нет связи с сервером'
  };

  // Вкладки: группы как на макете
  const NAV = [
    { g: 'Начало' },
    { id: 'apply', t: 'Стать партнёром', i: 'plus' },
    { id: 'prog', t: 'Партнёрская программа', i: 'coin' },
    { id: 'req', t: 'Требования', i: 'shield' },
    { g: 'Заработок' },
    { id: 'promo', t: 'Промокод', i: 'key' },
    { id: 'pay', t: 'Выплаты', i: 'wallet' }
  ];

  let state = null, section = 'apply', modal = null;

  async function call(method, path, data) {
    let r;
    try {
      r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok() }, body: data ? JSON.stringify(data) : undefined });
    } catch (e) { throw new Error('net'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'net');
    return j;
  }
  const platformOf = (u) => (/tiktok\.com/i.test(u) ? 'tiktok' : /youtube\.com|youtu\.be/i.test(u) ? 'youtube' : null);
  const partner = () => (state && state.partner) || null;
  const emptyStats = { orders: 0, sales: 0, earned: 0, paid: 0 };
  const errText = (code) => esc(ERR[code] || code || '');
  async function refresh() { state = tok() ? await call('GET', '/partner') : { partner: null }; }

  const statsHtml = (s) => `<div class="pm-grid2">
    <div class="pm-stat"><small>Покупок</small><b>${num(s.orders)}</b></div>
    <div class="pm-stat"><small>Оборот по коду</small><b>${rub(s.sales)}</b></div>
    <div class="pm-stat"><small>Начислено</small><b>${rub(s.earned)}</b></div>
    <div class="pm-stat"><small>К выплате</small><b>${rub((s.earned || 0) - (s.paid || 0))}</b></div></div>`;

  /* ---------- Окно ---------- */

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'mo'; modal.hidden = true;
    modal.innerHTML = `<div class="pm-box" role="dialog" aria-modal="true" aria-labelledby="pmTitle">
      <button class="x" type="button" data-pm-close aria-label="Закрыть">${ic('x')}</button>
      <div class="pm-top"><b id="pmTitle">Партнёрство</b></div>
      <div class="pm-body">
        <aside class="pm-side"><nav class="pm-nav" id="pmNav"></nav></aside>
        <div class="pm-main" id="pmMain"></div>
      </div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-pm-close]')) closeModal(); });
    return modal;
  }

  function renderNav() {
    document.getElementById('pmNav').innerHTML = NAV.map((n) => n.g
      ? `<span class="pm-lbl">${esc(n.g)}</span>`
      : `<button type="button" data-sec="${n.id}" class="${n.id === section ? 'on' : ''}">${ic(n.i)}<span>${esc(n.t)}</span></button>`).join('');
    modal.querySelectorAll('[data-sec]').forEach((b) => (b.onclick = () => { section = b.dataset.sec; render(); }));
  }

  const VIEWS = { apply, prog, req, promo, pay };

  function render(err) {
    renderNav();
    const main = document.getElementById('pmMain');
    main.innerHTML = `<div class="pm-pane">${VIEWS[section](err)}</div>`;
    main.scrollTop = 0;
    bind();
  }

  async function openModal(sec) {
    ensureModal();
    if (sec) section = sec;
    modal.hidden = false; document.body.style.overflow = 'hidden';
    render();
    try { await refresh(); render(); } catch (e) { render(e.message); }
  }
  function closeModal() {
    if (modal) modal.hidden = true;
    document.body.style.overflow = '';
  }

  const head = (kick, title, lead) => `<p class="pm-kick">${esc(kick)}</p><h2 class="pm-h">${esc(title)}</h2>${lead ? `<p class="pm-lead">${lead}</p>` : ''}`;

  function prog() {
    return head('Начало', 'Партнёрская программа', 'Рекомендуйте Crysea и получайте процент с каждой оплаты по вашему коду.') +
      `<div class="pm-grid2">
        <div class="pm-stat"><small>Покупатель получает</small><b>${BUYER}% скидки</b></div>
        <div class="pm-stat"><small>Вы получаете</small><b>${RATE}% от оплаты</b></div></div>
      <div class="pm-card"><h4>Как это работает</h4>
        <ol class="pm-steps">
          <li><b>1</b><span>Подайте заявку: канал, цифры и реквизиты для выплат.</span></li>
          <li><b>2</b><span>После проверки выберите промокод из 3–16 латинских букв или цифр.</span></li>
          <li><b>3</b><span>Делитесь кодом. Начисления видны в кабинете, выплаты переводим вручную.</span></li>
        </ol></div>
      <div class="pm-card"><h4>Что важно</h4>
        <p>Покупки самого партнёра по его коду не начисляются. Выплаты переводим после подтверждения оплат.</p></div>`;
  }

  function req() {
    const rows = Object.values(MIN).map((m) => `<div class="pm-tr"><span>${m.label}</span><span>от ${num(m.views)} просмотров</span><span>от ${num(m.followers)} подписчиков</span></div>`).join('');
    const acc = [
      ['mon', 'Аккаунт активен: вы регулярно публикуете видео.'],
      ['layers', 'Контент хорошего качества: монтаж, темп, подача.'],
      ['shield', 'Ролики про Rust и не нарушают правила Crysea и платформы.'],
      ['user', 'Аккаунт не пустой на момент подачи заявки.']
    ].map(([i, t]) => `<div class="pm-li">${ic(i)}<span>${esc(t)}</span></div>`).join('');
    return head('Начало', 'Минимальные требования', 'Заявку можно подать, если последние видео стабильно набирают эти цифры.') +
      `<div class="pm-table"><div class="pm-tr"><span>Платформа</span><span>Просмотры на видео</span><span>Подписчики</span></div>${rows}</div>
       <p class="pm-small">Проверяем по последним публикациям, а не по разовым всплескам.</p>
       <div class="pm-card" style="margin-top:14px"><h4>Требования к аккаунту и контенту</h4>${acc}</div>`;
  }

  function apply(err) {
    if (!tok()) {
      return head('Начало', 'Стать партнёром', 'Заявка привязывается к аккаунту, а выплаты приходят на него.') +
        `<button class="btn p" type="button" data-login>Войти</button>`;
    }
    const p = partner();
    if (p && p.status === 'approved') {
      return head('Начало', 'Вы уже партнёр', 'Промокод и выплаты смотрите во вкладках «Промокод» и «Выплаты».') +
        `<button class="btn p" type="button" data-go="promo">Открыть промокод</button>`;
    }
    if (p && p.status === 'pending') {
      return head('Начало', 'Заявка на проверке', 'Проверим канал вручную. Ответ придёт в кабинет на этом же аккаунте.') +
        `<div class="pm-card"><span class="pm-tag">На проверке</span><p>Когда одобрим, здесь появится выбор промокода.</p></div>
         <button class="btn" type="button" data-edit>Изменить данные</button>`;
    }
    const banner = p && p.status === 'rejected' ? 'Прошлая заявка не прошла проверку. Исправьте данные и отправьте снова.' : '';
    return applyForm(p, banner, err);
  }

  function applyForm(p, banner, err) {
    const v = (k) => (p && p[k] != null ? esc(p[k]) : '');
    return head('Начало', 'Подать заявку', 'Расскажите о канале. Проверим вручную и ответим в кабинете.') +
      (banner ? `<div class="pm-banner">${esc(banner)}</div>` : '') +
      `<form id="pmForm" novalidate>
        <label class="pm-field"><span>Ссылка на канал</span>
          <input name="channel" value="${v('channel')}" placeholder="https://www.tiktok.com/@ваш_канал" maxlength="200" autocomplete="off"></label>
        <div class="pm-row">
          <label class="pm-field"><span>Подписчиков</span><input name="followers" type="number" min="0" inputmode="numeric" value="${v('followers')}"></label>
          <label class="pm-field"><span>Средние просмотры на видео</span><input name="views" type="number" min="0" inputmode="numeric" value="${v('views')}"></label>
        </div>
        <label class="pm-field"><span>Реквизиты для выплат</span>
          <input name="payout" value="${v('payout')}" placeholder="Карта, СБП или ЮMoney" maxlength="200" autocomplete="off"></label>
        <div class="pm-row">
          <label class="pm-field"><span>Желаемый промокод (необязательно)</span>
            <input name="desired" value="${v('desired')}" placeholder="IVAN" maxlength="16" autocomplete="off" class="pm-up"></label>
          <label class="pm-field"><span>Связь с вами</span>
            <input name="contact" value="${v('contact')}" placeholder="@telegram или discord-ник" maxlength="100" autocomplete="off"></label>
        </div>
        <label class="pm-check"><input type="checkbox" name="agree"><span>Я ознакомился с условиями программы и согласен с правилами выплат</span></label>
        <div class="pm-err" id="pmErr" role="alert">${errText(err)}</div>
        <button class="btn p w" type="submit" id="pmSubmit">Отправить заявку</button>
      </form>`;
  }

  function promo(err) {
    if (!tok()) return head('Заработок', 'Промокод', 'Войдите в аккаунт, чтобы увидеть свой промокод.') + `<button class="btn p" type="button" data-login>Войти</button>`;
    const p = partner();
    if (p && p.code) {
      return head('Заработок', 'Ваш промокод', `Покупатели вводят его и получают ${p.percent || BUYER}% скидки.`) +
        `<div class="pm-card"><div class="pm-code">${esc(p.code)}</div>
         <p>Промокод закреплён за вами. Поменять его можно только через поддержку.</p></div>`;
    }
    if (p && p.status === 'approved') {
      return head('Заработок', 'Выберите промокод', 'Заявка одобрена. Придумайте промокод из 3–16 латинских букв или цифр.') +
        `<div class="pm-row1"><input id="pmCode" maxlength="16" placeholder="IVAN" autocomplete="off" value="${esc(p.desired || '')}" aria-label="Промокод">
         <button class="btn p" type="button" id="pmCodeBtn">Сохранить</button></div>
         <div class="pm-err" id="pmErr" role="alert">${errText(err)}</div>`;
    }
    return head('Заработок', 'Промокода пока нет', 'Промокод появится после одобрения заявки.') +
      `<button class="btn p" type="button" data-go="apply">Подать заявку</button>`;
  }

  function pay() {
    if (!tok()) return head('Заработок', 'Выплаты', 'Войдите в аккаунт, чтобы увидеть баланс.') + `<button class="btn p" type="button" data-login>Войти</button>`;
    const p = partner();
    const s = (p && p.stats) || emptyStats;
    return head('Заработок', 'Выплаты', 'Выплачиваем на карту, в СБП или на ЮMoney вручную после проверки оплат по вашему коду.') +
      `<div class="pm-grid2">
        <div class="pm-stat"><small>Начислено</small><b>${rub(s.earned)}</b></div>
        <div class="pm-stat"><small>Выплачено</small><b>${rub(s.paid)}</b></div></div>
       <div class="pm-card"><p>Покупок по коду: ${num(s.orders)}. Оборот: ${rub(s.sales)}.</p></div>
       <p class="pm-small">Баланс обновляется после каждой выплаты.</p>`;
  }

  /* ---------- Обработчики ---------- */

  function bind() {
    const main = document.getElementById('pmMain');
    main.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { section = b.dataset.go; render(); }));
    main.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => { main.querySelector('.pm-pane').innerHTML = applyForm(partner(), '', ''); bind(); }));
    main.querySelectorAll('[data-login]').forEach((b) => (b.onclick = () => {
      closeModal();
      if (window.openAuth) window.openAuth('login'); else location.href = '/account';
    }));
    const f = document.getElementById('pmForm');
    if (f) f.onsubmit = onApply;
    const cb = document.getElementById('pmCodeBtn');
    if (cb) cb.onclick = onCode;
  }

  async function onApply(e) {
    e.preventDefault();
    const f = e.target, errEl = f.querySelector('#pmErr'), btn = f.querySelector('#pmSubmit');
    const d = {
      channel: f.channel.value.trim(), followers: Number(f.followers.value), views: Number(f.views.value),
      payout: f.payout.value.trim(), desired: f.desired.value.trim().toUpperCase(),
      contact: f.contact.value.trim(), agree: f.agree.checked
    };
    const platform = platformOf(d.channel);
    errEl.textContent = '';
    if (!platform) return (errEl.textContent = ERR.platform);
    if (!(d.followers >= MIN[platform].followers && d.views >= MIN[platform].views)) return (errEl.textContent = ERR.low);
    if (!d.agree) return (errEl.textContent = ERR.agree);
    btn.disabled = true;
    try {
      await call('POST', '/partner/apply', {
        platform, channel: d.channel, followers: d.followers, views: d.views,
        desired: d.desired, payout: d.payout, contact: d.contact, agreed: true, terms: true
      });
      await refresh();
      section = 'apply';
      render();
      renderTab();
    } catch (x) {
      errEl.textContent = ERR[x.message] || x.message;
      btn.disabled = false;
    }
  }

  async function onCode() {
    const btn = document.getElementById('pmCodeBtn'), errEl = document.getElementById('pmErr');
    errEl.textContent = ''; btn.disabled = true;
    try {
      await call('POST', '/partner/code', { code: document.getElementById('pmCode').value.trim() });
      await refresh();
      section = 'promo';
      render();
      renderTab();
    } catch (x) {
      errEl.textContent = ERR[x.message] || x.message;
      btn.disabled = false;
    }
  }

  /* ---------- Вкладка «Партнёрка» в кабинете ---------- */

  function renderTab() {
    const box = document.getElementById('partnerBox');
    if (!box) return;
    if (!tok()) { box.innerHTML = '<div class="card pt-card"><h3>Партнёрка</h3><p>Войдите в аккаунт, чтобы подать заявку.</p></div>'; return; }
    const p = partner();
    let tag = 'Партнёрка', title = 'Станьте партнёром Crysea', text = `Рекомендуйте Crysea и получайте ${RATE}% с каждой оплаты по вашему коду.`, btn = 'Подать заявку', extra = '';
    if (p && p.status === 'pending') { tag = 'На проверке'; title = 'Заявка отправлена'; text = 'Проверим канал вручную. Ответ придёт сюда.'; btn = 'Открыть заявку'; }
    if (p && p.status === 'rejected') { tag = 'Отклонено'; title = 'Заявка не прошла проверку'; text = 'Исправьте данные и отправьте заявку снова.'; btn = 'Исправить заявку'; }
    if (p && p.status === 'approved' && !p.code) { tag = 'Одобрено'; title = 'Выберите промокод'; text = 'Заявка одобрена. Выберите промокод в окне партнёрства.'; btn = 'Выбрать промокод'; }
    if (p && p.status === 'approved' && p.code) {
      tag = 'Партнёр'; title = 'Ваш промокод'; text = `Покупатели получают ${p.percent || BUYER}% скидки. Вам — ${RATE}% от оплат.`; btn = 'Открыть партнёрство';
      extra = `<div class="pm-code">${esc(p.code)}</div>${statsHtml(p.stats || emptyStats)}`;
    }
    box.innerHTML = `<div class="card pt-card"><span class="pm-tag">${esc(tag)}</span><h3>${esc(title)}</h3><p>${esc(text)}</p>${extra}
      <button class="btn ${p && p.status === 'approved' ? '' : 'p'}" type="button" data-partner-open>${esc(btn)}</button></div>`;
  }

  /* ---------- Старт ---------- */

  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-partner-open]');
    if (t) { e.preventDefault(); openModal(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  (async () => {
    try { await refresh(); } catch (e) { state = { partner: null }; }
    renderTab();
    document.querySelectorAll('[data-tab="partner"]').forEach((b) => b.addEventListener('click', async () => {
      try { await refresh(); } catch (e) {}
      renderTab();
    }));
    if (new URLSearchParams(location.search).has('partner')) openModal();
  })();
  window.CRYSEA_PARTNER = { open: openModal };
})();
