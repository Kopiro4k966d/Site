/* Crysea: окно «Партнёрство» в стиле Apple и вкладка «Партнёрка» в кабинете.
   Пороги и доли совпадают с сервером (netlify/functions/api.mjs, PARTNER). Сервер проверяет всё ещё раз. */
(function () {
  const K = 'crysea_token';
  const tok = () => { try { return localStorage.getItem(K); } catch (e) { return null; } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rub = (n) => Number(n || 0).toLocaleString('ru-RU') + ' ₽';
  const num = (n) => Number(n || 0).toLocaleString('ru-RU');
  const ic = (id) => `<svg class="ic"><use href="#i-${id}"/></svg>`;
  const glyph = (id) => `<span class="ap-glyph">${ic(id)}</span>`;

  const MIN = { tiktok: { views: 1000, followers: 50, label: 'TikTok' }, youtube: { views: 300, followers: 50, label: 'YouTube' } };
  const RATE = 5, BUYER = 10;
  const ERR = {
    platform: 'Ссылка должна вести на TikTok или YouTube',
    low: 'Пока не подходит: TikTok — от 1 000 просмотров и 50 подписчиков, YouTube — от 300 и 50',
    agree: 'Включите переключатель, чтобы отправить заявку',
    payout: 'Укажите реквизиты для выплат', contact: 'Укажите, как с вами связаться',
    code_fmt: 'Промокод: от 3 до 16 латинских букв или цифр',
    code_taken: 'Этот промокод уже занят, выберите другой', has_code: 'Промокод уже закреплён за вами',
    not_approved: 'Заявка ещё не одобрена', limit: 'Слишком много попыток, попробуйте позже',
    auth: 'Сессия истекла, войдите снова', net: 'Нет связи с сервером'
  };

  const NAV = [
    { g: 'Начало' },
    { id: 'apply', t: 'Стать партнёром', i: 'plus' },
    { id: 'prog', t: 'Программа', i: 'coin' },
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

  /* ---------- Кирпичики: группы, строки, поля ---------- */
  const group = (...rows) => `<div class="ap-group">${rows.join('')}</div>`;
  const row = (label, value) => `<div class="ap-row"><span>${esc(label)}</span><b>${value}</b></div>`;
  const textRow = (title, text) => `<div class="ap-row ap-text"><b>${esc(title)}</b>${esc(text)}</div>`;
  const stepRow = (n, text) => `<div class="ap-row ap-step"><i class="ap-idx">${n}</i><span>${esc(text)}</span></div>`;
  const head = (kick, title, sub) => `<header class="ap-head">${kick ? `<p class="ap-eyebrow">${esc(kick)}</p>` : ''}<h2 class="ap-title">${esc(title)}</h2>${sub ? `<p class="ap-sub">${esc(sub)}</p>` : ''}</header>`;
  const statCards = (items) => `<div class="ap-stats">${items.map(([k, v]) => `<div class="ap-stat"><small>${esc(k)}</small><b>${v}</b></div>`).join('')}</div>`;
  const field = (name, label, value, attrs = '') => `<label class="ap-field${attrs.includes('uppercase') ? ' ap-up' : ''}"><span>${esc(label)}</span><input name="${name}" value="${value}" autocomplete="off" ${attrs.replace('uppercase', '')}></label>`;
  const btn = (cls, text, attrs = '') => `<button class="ap-btn ${cls}" type="button" ${attrs}>${esc(text)}</button>`;

  /* ---------- Окно ---------- */

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'mo ap-mo'; modal.hidden = true;
    modal.innerHTML = `<div class="ap-win" role="dialog" aria-modal="true" aria-label="Партнёрство">
      <aside class="ap-side">
        <div class="ap-side-title">Партнёрство</div>
        <nav class="ap-nav" id="apNav"></nav>
      </aside>
      <section class="ap-main" id="apMain">
        <button class="ap-close" type="button" data-close aria-label="Закрыть">${ic('x')}</button>
      </section></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
    return modal;
  }

  function renderNav() {
    document.getElementById('apNav').innerHTML = NAV.map((n) => n.g
      ? `<span class="ap-lbl">${esc(n.g)}</span>`
      : `<button type="button" data-sec="${n.id}" class="${n.id === section ? 'on' : ''}">${glyph(n.i)}<span>${esc(n.t)}</span></button>`).join('');
    modal.querySelectorAll('[data-sec]').forEach((b) => (b.onclick = () => { section = b.dataset.sec; render(); }));
  }

  const VIEWS = { apply, prog, req, promo, pay };

  function render(err) {
    renderNav();
    const main = document.getElementById('apMain');
    const close = main.querySelector('[data-close]');
    main.innerHTML = `<div class="ap-pane">${VIEWS[section](err)}</div>`;
    main.prepend(close);
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

  /* ---------- Разделы ---------- */

  function prog() {
    return head('Начало', 'Партнёрская программа', 'Рекомендуйте Crysea и получайте процент с каждой оплаты по вашему коду.') +
      `<div class="ap-stats">
        <div class="ap-hero-num"><small>Покупатель получает</small><b>${BUYER}%</b><span>скидка по вашему промокоду</span></div>
        <div class="ap-hero-num"><small>Вы получаете</small><b>${RATE}%</b><span>от каждой оплаты</span></div></div>` +
      group(stepRow(1, 'Подайте заявку: канал, цифры и реквизиты для выплат.'), stepRow(2, 'После проверки выберите промокод из 3–16 латинских букв или цифр.'), stepRow(3, 'Делитесь кодом. Начисления видны в кабинете, выплаты переводим вручную.')) +
      group(textRow('Что важно', 'Покупки самого партнёра по его коду не начисляются. Выплаты переводим после подтверждения оплат.'));
  }

  function req() {
    const rows = Object.values(MIN).map((m) => row(m.label, `от ${num(m.views)} просм. · от ${num(m.followers)} подп.`)).join('');
    return head('Начало', 'Требования', 'Заявку можно подать, если последние видео стабильно набирают эти цифры.') +
      group(`<div class="ap-row"><span>Платформа</span><b>Просмотры · подписчики</b></div>`, rows) +
      `<p class="ap-caption">Проверяем по последним публикациям, а не по разовым всплескам.</p>` +
      group(
        row('Аккаунт', 'Активен, видео регулярно'),
        row('Качество', 'Монтаж, темп, подача'),
        row('Тематика', 'Ролики про Rust'),
        row('Правила', 'Crysea и платформы')
      );
  }

  function apply(err) {
    if (!tok()) {
      return head('Начало', 'Стать партнёром', 'Заявка привязывается к аккаунту, а выплаты приходят на него.') +
        btn('', 'Войти', 'data-login');
    }
    const p = partner();
    if (p && p.status === 'approved') {
      return head('Начало', 'Вы уже партнёр', 'Промокод и выплаты смотрите во вкладках «Промокод» и «Выплаты».') +
        btn('', 'Открыть промокод', 'data-go="promo"');
    }
    if (p && p.status === 'pending') {
      return head('Начало', 'Заявка на проверке', 'Проверим канал вручную. Ответ придёт в кабинет на этом же аккаунте.') +
        group(row('Статус', '<span class="ap-pill">На проверке</span>'), textRow('Что дальше', 'Когда одобрим, здесь появится выбор промокода.')) +
        btn('ghost', 'Изменить данные', 'data-edit');
    }
    const banner = p && p.status === 'rejected' ? 'Прошлая заявка не прошла проверку. Исправьте данные и отправьте снова.' : '';
    return applyForm(p, banner, err);
  }

  function applyForm(p, banner, err) {
    const v = (k) => (p && p[k] != null ? esc(p[k]) : '');
    return head('Начало', 'Подать заявку', 'Расскажите о канале. Проверим вручную и ответим в кабинете.') +
      (banner ? group(textRow('Заявка не прошла', banner)) : '') +
      `<form id="apForm" novalidate class="ap-form">
        ${group(
          field('channel', 'Ссылка на канал', v('channel'), 'placeholder="https://www.tiktok.com/@ваш_канал" maxlength="200"'),
          `<div class="ap-grid2" style="gap:0">${field('followers', 'Подписчиков', v('followers'), 'type="number" min="0" inputmode="numeric"')}${field('views', 'Средние просмотры', v('views'), 'type="number" min="0" inputmode="numeric"')}</div>`,
          field('payout', 'Реквизиты для выплат', v('payout'), 'placeholder="Карта, СБП или ЮMoney" maxlength="200"'),
          field('desired', 'Желаемый промокод (необязательно)', v('desired'), 'placeholder="IVAN" maxlength="16" uppercase'),
          field('contact', 'Связь с вами', v('contact'), 'placeholder="@telegram или discord-ник" maxlength="100"')
        )}
        <label class="ap-switch-row"><span>Я ознакомился с условиями программы и согласен с правилами выплат</span>
          <span class="ap-switch"><input type="checkbox" name="agree"><i></i></span></label>
        <div class="ap-err" id="apErr" role="alert">${errText(err)}</div>
        <button class="ap-btn block" type="submit" id="apSubmit">Отправить заявку</button>
      </form>`;
  }

  function promo(err) {
    if (!tok()) return head('Заработок', 'Промокод', 'Войдите в аккаунт, чтобы увидеть свой промокод.') + btn('', 'Войти', 'data-login');
    const p = partner();
    if (p && p.code) {
      return head('Заработок', 'Ваш промокод', `Покупатели вводят его и получают ${p.percent || BUYER}% скидки.`) +
        `<div class="ap-code">${esc(p.code)}</div>` +
        group(textRow('Закреплён за вами', 'Поменять промокод можно только через поддержку.'));
    }
    if (p && p.status === 'approved') {
      return head('Заработок', 'Выберите промокод', 'Заявка одобрена. Придумайте промокод из 3–16 латинских букв или цифр.') +
        `<div class="ap-group"><label class="ap-field ap-up"><span>Промокод</span><input id="apCode" maxlength="16" placeholder="IVAN" autocomplete="off" value="${esc(p.desired || '')}"></label></div>
         <div class="ap-err" id="apErr" role="alert">${errText(err)}</div>
         <button class="ap-btn block" type="button" id="apCodeBtn">Сохранить</button>`;
    }
    return head('Заработок', 'Промокода пока нет', 'Промокод появится после одобрения заявки.') + btn('', 'Подать заявку', 'data-go="apply"');
  }

  function pay() {
    if (!tok()) return head('Заработок', 'Выплаты', 'Войдите в аккаунт, чтобы увидеть баланс.') + btn('', 'Войти', 'data-login');
    const p = partner();
    const s = (p && p.stats) || emptyStats;
    return head('Заработок', 'Выплаты', 'Выплачиваем на карту, в СБП или на ЮMoney вручную после проверки оплат по вашему коду.') +
      statCards([['Начислено', rub(s.earned)], ['Выплачено', rub(s.paid)], ['К выплате', rub((s.earned || 0) - (s.paid || 0))], ['Покупок по коду', num(s.orders)]]) +
      group(row('Оборот по коду', rub(s.sales))) +
      `<p class="ap-caption">Баланс обновляется после каждой выплаты.</p>`;
  }

  /* ---------- Обработчики ---------- */

  function bind() {
    const main = document.getElementById('apMain');
    main.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { section = b.dataset.go; render(); }));
    main.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => { main.querySelector('.ap-pane').innerHTML = applyForm(partner(), '', ''); bind(); }));
    main.querySelectorAll('[data-login]').forEach((b) => (b.onclick = () => {
      closeModal();
      if (window.openAuth) window.openAuth('login'); else location.href = '/account';
    }));
    const f = document.getElementById('apForm');
    if (f) f.onsubmit = onApply;
    const cb = document.getElementById('apCodeBtn');
    if (cb) cb.onclick = onCode;
  }

  async function onApply(e) {
    e.preventDefault();
    const f = e.target, errEl = f.querySelector('#apErr'), btn = f.querySelector('#apSubmit');
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
    const btn = document.getElementById('apCodeBtn'), errEl = document.getElementById('apErr');
    errEl.textContent = ''; btn.disabled = true;
    try {
      await call('POST', '/partner/code', { code: document.getElementById('apCode').value.trim() });
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
    if (!tok()) { box.innerHTML = `<div class="ap-tab-card"><h3>Партнёрка</h3><p>Войдите в аккаунт, чтобы подать заявку.</p></div>`; return; }
    const p = partner();
    let pill = '', title = 'Станьте партнёром Crysea', text = `Рекомендуйте Crysea и получайте ${RATE}% с каждой оплаты по вашему коду.`, action = 'Подать заявку', extra = '';
    if (p && p.status === 'pending') { pill = '<span class="ap-pill">На проверке</span>'; title = 'Заявка отправлена'; text = 'Проверим канал вручную. Ответ придёт сюда.'; action = 'Открыть заявку'; }
    if (p && p.status === 'rejected') { pill = '<span class="ap-pill bad">Отклонено</span>'; title = 'Заявка не прошла проверку'; text = 'Исправьте данные и отправьте заявку снова.'; action = 'Исправить заявку'; }
    if (p && p.status === 'approved' && !p.code) { pill = '<span class="ap-pill ok">Одобрено</span>'; title = 'Выберите промокод'; text = 'Заявка одобрена. Выберите промокод в окне партнёрства.'; action = 'Выбрать промокод'; }
    if (p && p.status === 'approved' && p.code) {
      pill = '<span class="ap-pill ok">Партнёр</span>'; title = 'Ваш промокод'; text = `Покупатели получают ${p.percent || BUYER}% скидки. Вам — ${RATE}% от оплат.`; action = 'Открыть партнёрство';
      const s = p.stats || emptyStats;
      extra = `<div class="ap-code" style="min-height:64px;font-size:1.7rem">${esc(p.code)}</div>
        <div class="ap-stats"><div class="ap-stat"><small>Начислено</small><b style="font-size:1.25rem">${rub(s.earned)}</b></div><div class="ap-stat"><small>К выплате</small><b style="font-size:1.25rem">${rub((s.earned || 0) - (s.paid || 0))}</b></div></div>`;
    }
    box.innerHTML = `<div class="ap-tab-card">${pill}<h3>${esc(title)}</h3><p>${esc(text)}</p>${extra}
      <button class="ap-btn ${p && p.status === 'approved' ? 'ghost' : ''} block" type="button" data-partner-open>${esc(action)}</button></div>`;
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
