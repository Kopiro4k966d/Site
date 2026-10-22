/* Crysea: окно «Партнёрство» и вкладка в кабинете. Тот же API и токен, что и сайт. */
(function () {
  const $ = (s) => document.querySelector(s);
  const K = 'crysea_token';
  const tok = () => { try { return localStorage.getItem(K); } catch (e) { return null; } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rub = (n) => Number(n || 0).toLocaleString('ru-RU') + ' ₽';
  const ic = (id) => `<svg class="ic"><use href="#i-${id}"/></svg>`;
  const ERR = {
    platform: 'Ссылка должна вести на TikTok или YouTube', channel: 'Нужна ссылка на профиль или канал (https://…)',
    nums: 'Введите числа', low: 'Пока не подходит: нужно от 500 подписчиков и от 2 000 просмотров на видео',
    payout: 'Укажите реквизиты для выплат', contact: 'Укажите, как с вами связаться',
    agree: 'Отметьте оба пункта, чтобы отправить заявку', code_fmt: 'Промокод: от 3 до 16 латинских букв или цифр',
    limit: 'Слишком много попыток, попробуйте позже', not_approved: 'Заявка ещё не одобрена',
    has_code: 'Промокод уже закреплён за вами', code_taken: 'Этот промокод уже занят, выберите другой',
    auth: 'Сессия истекла, войдите снова', net: 'Нет связи с сервером'
  };

  let state = null;   // ответ GET /partner
  let section = 'apply';

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
  const loggedIn = () => !!tok();
  const refresh = async () => { if (!loggedIn()) { state = { partner: null, rules: null }; return; } state = await call('GET', '/partner'); };

  /* ---------- Окно ---------- */
  function ensureModal() {
    if (document.getElementById('pmodal')) return;
    const el = document.createElement('div');
    el.className = 'mo'; el.id = 'pmodal'; el.hidden = true;
    el.innerHTML = `<div class="pm" role="dialog" aria-modal="true" aria-labelledby="pmT">
      <button class="x" type="button" id="pmX" aria-label="Закрыть">${ic('x')}</button>
      <div class="pm-top"><span class="pm-kick" id="pmT">— Партнёрство</span></div>
      <div class="pm-body">
        <nav class="pm-nav" id="pmNav"></nav>
        <div class="pm-main" id="pmMain"></div>
      </div></div>`;
    document.body.appendChild(el);
    $('#pmX').onclick = closeModal;
    el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  }
  const NAV = [
    { id: 'apply', t: 'Стать партнёром', i: 'spark' },
    { id: 'req', t: 'Требования', i: 'shield' },
    { id: 'prog', t: 'Программа', i: 'gift' },
    { id: 'pay', t: 'Выплаты', i: 'wallet' }
  ];
  function renderNav() {
    $('#pmNav').innerHTML = '<span class="pm-lbl">Начало</span>' + NAV.map((n) =>
      `<button type="button" data-sec="${n.id}" class="${n.id === section ? 'on' : ''}">${ic(n.i)}${n.t}</button>`).join('');
    $$('#pmNav button').forEach((b) => (b.onclick = () => { section = b.dataset.sec; renderModal(); }));
  }
  const $$ = (s) => [...document.querySelectorAll(s)];

  async function openModal(sec) {
    ensureModal();
    if (sec) section = sec;
    $('#pmodal').hidden = false; document.body.style.overflow = 'hidden';
    renderModal();
    try { await refresh(); renderModal(); } catch (e) { renderModal(e.message); }
    setTimeout(() => { const f = $('#pmMain input'); if (f && section === 'apply') f.focus(); }, 60);
  }
  function closeModal() {
    const m = $('#pmodal'); if (m) m.hidden = true;
    document.body.style.overflow = '';
  }

  function renderModal(errMsg) {
    renderNav();
    const main = $('#pmMain');
    if (section === 'req') main.innerHTML = requirementsHtml();
    else if (section === 'prog') main.innerHTML = programHtml();
    else if (section === 'pay') main.innerHTML = payoutHtml();
    else main.innerHTML = applyHtml(errMsg);
    bindModal();
  }

  function requirementsHtml() {
    return `<h2>Минимальные требования</h2>
      <p>Пороги для подключения к программе. Проверяем канал вручную.</p>
      <div class="pm-tiles">
        <div class="pm-tile"><b>500+ подписчиков</b><span>На канале TikTok или YouTube</span></div>
        <div class="pm-tile"><b>2 000+ просмотров</b><span>В среднем на видео за последние ролики</span></div>
        <div class="pm-tile"><b>Контент про Rust</b><span>Тематика канала: игра, гайды, геймплей</span></div>
        <div class="pm-tile"><b>Регулярные ролики</b><span>Канал живой, а не забытый</span></div>
      </div>`;
  }
  function programHtml() {
    return `<h2>Партнёрская программа</h2>
      <p>Вы рекомендуете Crysea, а мы начисляем вознаграждение за оплаты по вашему промокоду.</p>
      <div class="pm-tiles">
        <div class="pm-tile"><b>10% скидка</b><span>Покупатель вводит ваш промокод</span></div>
        <div class="pm-tile"><b>5% вам</b><span>От каждой оплаты по вашему коду</span></div>
      </div>
      <p class="pm-note">Собственные покупки партнёра по своему коду не начисляются. Промокод закрепляется за вами один раз.</p>`;
  }
  function payoutHtml() {
    return `<h2>Выплаты</h2>
      <p>Выплачиваем деньгами на карту, в СБП или на ЮMoney. Перевод делаем вручную после проверки оплат по вашему коду.</p>
      <div class="pm-tiles">
        <div class="pm-tile"><b>Баланс в кабинете</b><span>Вкладка «Партнёрка»: начислено, выплачено, к выплате</span></div>
        <div class="pm-tile"><b>Реквизиты</b><span>Указываются в заявке, их можно поменять</span></div>
      </div>`;
  }

  function applyHtml(errMsg) {
    if (!loggedIn()) {
      return `<h2>Стать партнёром</h2>
        <p>Чтобы подать заявку, войдите в аккаунт. Ответ появится в кабинете.</p>
        <div class="pm-banner">Вход нужен, чтобы выплаты пришли на ваш аккаунт.</div>
        <button class="btn p w" type="button" id="pmLogin">Войти</button>`;
    }
    const pa = state && state.partner;
    if (pa && pa.status === 'approved') {
      return `<h2>Вы уже партнёр</h2>
        <p>Промокод, начисления и выплаты смотрите в кабинете, во вкладке «Партнёрка».</p>
        <button class="btn p w" type="button" id="pmToAcc">Открыть кабинет</button>`;
    }
    const v = (k) => (pa && pa[k] != null ? esc(pa[k]) : '');
    const banner = pa && pa.status === 'pending'
      ? '<div class="pm-banner">Заявка на проверке. Изменить данные можно ниже.</div>'
      : pa && pa.status === 'rejected'
        ? '<div class="pm-banner">Прошлая заявка не прошла проверку. Исправьте данные и отправьте снова.</div>' : '';
    return `<h2>Подать заявку на партнёрство</h2>
      <p>Расскажите о своём канале. Проверим его вручную и ответим в кабинете на этом же аккаунте.</p>
      ${banner}
      <form id="pmForm" novalidate>
        <label class="pm-field"><span>Ссылка на канал</span>
          <input name="channel" value="${v('channel')}" placeholder="https://www.tiktok.com/@yourchannel" maxlength="200" autocomplete="off"></label>
        <div class="pm-row2">
          <label class="pm-field"><span>Подписчиков</span>
            <input name="followers" type="number" min="0" inputmode="numeric" value="${v('followers')}"></label>
          <label class="pm-field"><span>Средние просмотры на видео</span>
            <input name="views" type="number" min="0" inputmode="numeric" value="${v('views')}"></label>
        </div>
        <div class="pm-row2">
          <label class="pm-field"><span>Желаемый промокод</span>
            <input name="desired" value="${v('desired')}" placeholder="Например, IVAN" maxlength="16" autocomplete="off" style="text-transform:uppercase"></label>
          <label class="pm-field"><span>Ссылка для связи</span>
            <input name="contact" value="${v('contact')}" placeholder="@telegram или discord:username" maxlength="100" autocomplete="off"></label>
        </div>
        <label class="pm-field"><span>Реквизиты для выплат</span>
          <input name="payout" value="${v('payout')}" placeholder="Карта, СБП или ЮMoney" maxlength="200" autocomplete="off"></label>
        <div class="pm-checks">
          <label class="pm-check"><input type="checkbox" name="read"> Ознакомился с программой</label>
          <label class="pm-check"><input type="checkbox" name="terms"> Принимаю условия выплат</label>
        </div>
        <div class="err" id="pmErr" role="alert">${errMsg ? esc(ERR[errMsg] || errMsg) : ''}</div>
        <button class="btn p w" type="submit" id="pmSubmit">Подать заявку →</button>
        <p class="pm-note">Заявка с сайта. Ответ придёт в кабинет на этом же аккаунте.</p>
      </form>`;
  }

  function bindModal() {
    const login = $('#pmLogin');
    if (login) login.onclick = () => { closeModal(); if (window.openAuth) window.openAuth('login'); else location.href = '/'; };
    const acc = $('#pmToAcc');
    if (acc) acc.onclick = () => { location.href = '/account#partner'; };
    const f = $('#pmForm');
    if (!f) return;
    f.onsubmit = async (e) => {
      e.preventDefault();
      const err = $('#pmErr'), btn = $('#pmSubmit');
      const fd = Object.fromEntries(new FormData(f).entries());
      const channel = String(fd.channel || '').trim();
      const platform = platformOf(channel);
      err.textContent = '';
      if (!platform) return (err.textContent = ERR.platform);
      if (!f.read.checked || !f.terms.checked) return (err.textContent = ERR.agree);
      btn.disabled = true;
      try {
        await call('POST', '/partner/apply', {
          platform, channel,
          followers: Number(fd.followers), views: Number(fd.views),
          desired: String(fd.desired || '').trim().toUpperCase(),
          payout: String(fd.payout || '').trim(), contact: String(fd.contact || '').trim(),
          agreed: f.read.checked, terms: f.terms.checked
        });
        await refresh();
        renderTab();
        const main = $('#pmMain');
        main.innerHTML = `<div class="pm-done"><div class="ok">${ic('ok')}</div><h2>Заявка отправлена</h2>
          <p>Проверим канал вручную. Статус и промокод появятся в кабинете, во вкладке «Партнёрка».</p>
          <button class="btn p w" type="button" id="pmClose">Понятно</button></div>`;
        $('#pmClose').onclick = closeModal;
      } catch (x) {
        err.textContent = ERR[x.message] || x.message;
        btn.disabled = false;
      }
    };
  }

  /* ---------- Вкладка «Партнёрка» в кабинете ---------- */
  function tabBox() { return document.getElementById('partnerBox'); }
  function renderTab() {
    const box = tabBox(); if (!box) return;
    if (!loggedIn()) { box.innerHTML = '<div class="card pt-card"><h3>Партнёрка</h3><p>Войдите в аккаунт, чтобы подать заявку.</p></div>'; return; }
    const pa = state && state.partner;
    if (!pa) {
      box.innerHTML = `<div class="card pt-card"><span class="tag">Партнёрка</span><h3>Станьте партнёром Crysea</h3>
        <p>Рекомендуйте Crysea в TikTok или YouTube. Покупатель получает 10% по вашему коду, вы получаете 5% от каждой оплаты.</p>
        <button class="btn p" type="button" data-partner-open>Подать заявку</button></div>`;
    } else if (pa.status === 'pending' || pa.status === 'rejected') {
      box.innerHTML = `<div class="card pt-card"><span class="tag">${pa.status === 'pending' ? 'На проверке' : 'Отклонено'}</span>
        <h3>${pa.status === 'pending' ? 'Заявка отправлена' : 'Заявка не прошла проверку'}</h3>
        <p>${pa.status === 'pending' ? 'Проверим канал вручную. Когда одобрим, здесь появится выбор промокода.' : 'Исправьте данные и отправьте заявку снова.'}</p>
        <button class="btn" type="button" data-partner-open>Изменить данные</button></div>`;
    } else if (!pa.code) {
      box.innerHTML = `<div class="card pt-card"><span class="tag">Одобрено</span><h3>Выберите промокод</h3>
        <p>Покупатели вводят его и получают ${pa.percent}% скидки. Вам начисляется 5% от каждой оплаты. Промокод закрепляется за вами, поменять его можно только через поддержку.</p>
        <div class="pt-row"><input id="ptCodeIn" maxlength="16" placeholder="Например, IVAN" autocomplete="off" aria-label="Промокод" value="${esc(pa.desired || '')}"><button class="btn p" type="button" id="ptCodeBtn">Сохранить</button></div>
        <div class="pt-err" id="ptErr" role="alert"></div></div>`;
      $('#ptCodeBtn').onclick = async () => {
        const err = $('#ptErr'), btn = $('#ptCodeBtn');
        err.textContent = ''; btn.disabled = true;
        try { await call('POST', '/partner/code', { code: $('#ptCodeIn').value.trim() }); await refresh(); renderTab(); }
        catch (x) { err.textContent = ERR[x.message] || x.message; btn.disabled = false; }
      };
    } else {
      const s = pa.stats || { orders: 0, sales: 0, earned: 0, paid: 0 };
      box.innerHTML = `<div class="card pt-card"><span class="tag">Партнёр</span><h3>Ваш промокод</h3>
        <div class="pt-code">${esc(pa.code)}</div>
        <p>Покупатели получают ${pa.percent}% скидки. Вам начисляется 5% от их оплат.</p>
        <div class="pt-stats">
          <div><small>Покупок</small><b>${s.orders}</b></div>
          <div><small>Оборот по коду</small><b>${rub(s.sales)}</b></div>
          <div><small>Начислено</small><b>${rub(s.earned)}</b></div>
          <div><small>Выплачено</small><b>${rub(s.paid)}</b></div>
          <div><small>К выплате</small><b>${rub(s.earned - s.paid)}</b></div>
        </div>
        <p class="pt-small">Выплаты переводим на ваши реквизиты вручную. Баланс обновляется после каждой выплаты.</p></div>`;
    }
  }

  /* ---------- Старт ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-partner-open]');
    if (t) { e.preventDefault(); openModal(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  (async () => {
    if (tabBox()) {
      try { await refresh(); } catch (e) { state = null; }
      renderTab();
      document.querySelectorAll('[data-tab="partner"]').forEach((b) => b.addEventListener('click', async () => {
        try { await refresh(); } catch (e) {}
        renderTab();
      }));
    }
  })();
  window.CRYSEA_PARTNER = { open: openModal };
})();
