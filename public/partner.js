/* Crysea: партнёрская программа. Страница /partner и вкладка «Партнёрка» в кабинете.
   Пороги и доли совпадают с сервером (netlify/functions/api.mjs, PARTNER). Сервер проверяет всё ещё раз. */
(function () {
  const K = 'crysea_token';
  const tok = () => { try { return localStorage.getItem(K); } catch (e) { return null; } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rub = (n) => Number(n || 0).toLocaleString('ru-RU') + ' ₽';
  const num = (n) => Number(n || 0).toLocaleString('ru-RU');

  const MIN = { tiktok: { views: 1000, followers: 50 }, youtube: { views: 300, followers: 50 } };
  const RATE = 5;      // процент партнёру
  const BUYER = 10;    // скидка покупателю по коду

  const ERR = {
    platform: 'Ссылка должна вести на TikTok или YouTube',
    low: 'Пока не подходит: TikTok — от 1 000 просмотров и 50 подписчиков, YouTube — от 300 и 50',
    agree: 'Отметьте галочку, чтобы отправить заявку',
    payout: 'Укажите реквизиты для выплат (минимум 5 символов)',
    contact: 'Укажите, как с вами связаться',
    code_fmt: 'Промокод: от 3 до 16 латинских букв или цифр',
    code_taken: 'Этот промокод уже занят, выберите другой',
    has_code: 'Промокод уже закреплён за вами',
    not_approved: 'Заявка ещё не одобрена',
    limit: 'Слишком много попыток, попробуйте позже',
    auth: 'Сессия истекла, войдите снова',
    net: 'Нет связи с сервером'
  };

  const page = document.getElementById('partnerPage');
  const tab = document.getElementById('partnerBox');
  if (!page && !tab) return;

  let state = null;

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
  const errText = (code) => esc(ERR[code] || code || '');

  async function refresh() {
    state = tok() ? await call('GET', '/partner') : { partner: null };
  }

  const statsHtml = (s) => `<div class="pp-stats">
    <div><small>Покупок</small><b>${num(s.orders)}</b></div>
    <div><small>Оборот</small><b>${rub(s.sales)}</b></div>
    <div><small>Начислено</small><b>${rub(s.earned)}</b></div>
    <div><small>Выплачено</small><b>${rub(s.paid)}</b></div>
    <div><small>К выплате</small><b>${rub((s.earned || 0) - (s.paid || 0))}</b></div></div>`;
  const emptyStats = { orders: 0, sales: 0, earned: 0, paid: 0 };

  /* ---------- Страница /partner ---------- */

  function renderPage(err) {
    if (!page) return;
    if (!tok()) {
      page.innerHTML = `<div class="card pp-card"><h3>Войдите в аккаунт</h3>
        <p class="pp-muted">Заявка привязывается к аккаунту, а выплаты приходят на него.</p>
        <a class="btn p" href="/account">Войти</a></div>`;
      return;
    }
    const p = partner();
    if (!p || p.status === 'rejected') {
      applyForm(p, p ? 'Прошлая заявка не прошла проверку. Исправьте данные и отправьте снова.' : '', err);
    } else if (p.status === 'pending') {
      page.innerHTML = `<div class="card pp-card"><span class="pp-tag">На проверке</span>
        <h3>Заявка отправлена</h3>
        <p class="pp-muted">Проверим канал вручную. Когда одобрим, здесь появится выбор промокода.</p>
        <button class="btn" type="button" id="ppEdit">Изменить данные</button></div>`;
      page.querySelector('#ppEdit').onclick = () => applyForm(p, '', '');
    } else if (p.status === 'approved' && !p.code) {
      codeForm(p, err);
    } else if (p.status === 'approved') {
      dashboard(p);
    }
  }

  function applyForm(p, banner, err) {
    const v = (k) => (p && p[k] != null ? esc(p[k]) : '');
    page.innerHTML = `<div class="card pp-card">
      <h3>${p ? 'Измените данные и отправьте снова' : 'Подать заявку'}</h3>
      <p class="pp-muted">Ответ придёт в кабинет на этом же аккаунте.</p>
      ${banner ? `<div class="pp-banner">${esc(banner)}</div>` : ''}
      <form id="ppForm" class="pp-form" novalidate>
        <label class="pp-field"><span>Ссылка на канал</span>
          <input name="channel" value="${v('channel')}" placeholder="https://www.tiktok.com/@ваш_канал" maxlength="200" autocomplete="off"></label>
        <div class="pp-row">
          <label class="pp-field"><span>Подписчиков</span>
            <input name="followers" type="number" min="0" inputmode="numeric" value="${v('followers')}"></label>
          <label class="pp-field"><span>Средние просмотры на видео</span>
            <input name="views" type="number" min="0" inputmode="numeric" value="${v('views')}"></label>
        </div>
        <label class="pp-field"><span>Реквизиты для выплат</span>
          <input name="payout" value="${v('payout')}" placeholder="Карта, СБП или ЮMoney" maxlength="200" autocomplete="off"></label>
        <div class="pp-row">
          <label class="pp-field"><span>Желаемый промокод (необязательно)</span>
            <input name="desired" value="${v('desired')}" placeholder="IVAN" maxlength="16" autocomplete="off" class="pp-up"></label>
          <label class="pp-field"><span>Связь с вами</span>
            <input name="contact" value="${v('contact')}" placeholder="@telegram или discord-ник" maxlength="100" autocomplete="off"></label>
        </div>
        <label class="pp-check"><input type="checkbox" name="agree"><span>Я ознакомился с условиями программы и согласен с правилами выплат</span></label>
        <div class="pp-err" id="ppErr" role="alert">${errText(err)}</div>
        <button class="btn p w" type="submit" id="ppSubmit">Отправить заявку</button>
      </form></div>`;

    page.querySelector('#ppForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target, errEl = f.querySelector('#ppErr'), btn = f.querySelector('#ppSubmit');
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
        renderPage();
      } catch (x) {
        errEl.textContent = ERR[x.message] || x.message;
        btn.disabled = false;
      }
    };
  }

  function codeForm(p, err) {
    page.innerHTML = `<div class="card pp-card">
      <span class="pp-tag">Одобрено</span>
      <h3>Выберите промокод</h3>
      <p class="pp-muted">Покупатели вводят его при оплате и получают ${BUYER}% скидки. Промокод закрепляется за вами, поменять его можно только через поддержку.</p>
      <div class="pp-row1">
        <input id="ppCode" maxlength="16" placeholder="IVAN" autocomplete="off" value="${esc(p.desired || '')}" aria-label="Промокод">
        <button class="btn p" type="button" id="ppCodeBtn">Сохранить</button>
      </div>
      <div class="pp-err" id="ppErr" role="alert">${errText(err)}</div></div>`;

    page.querySelector('#ppCodeBtn').onclick = async () => {
      const btn = page.querySelector('#ppCodeBtn'), errEl = page.querySelector('#ppErr');
      errEl.textContent = ''; btn.disabled = true;
      try {
        await call('POST', '/partner/code', { code: page.querySelector('#ppCode').value.trim() });
        await refresh();
        renderPage();
      } catch (x) {
        errEl.textContent = ERR[x.message] || x.message;
        btn.disabled = false;
      }
    };
  }

  function dashboard(p) {
    const s = p.stats || emptyStats;
    page.innerHTML = `<div class="card pp-card">
      <span class="pp-tag">Партнёр</span>
      <h3>Ваш промокод</h3>
      <div class="pp-code">${esc(p.code)}</div>
      <p class="pp-muted">Покупатели получают ${esc(p.percent || BUYER)}% скидки. Вам начисляется ${RATE}% от их оплат.</p>
      ${statsHtml(s)}
      <p class="pp-small">Выплаты переводим вручную на ваши реквизиты. Баланс обновляется после каждой выплаты.</p></div>`;
  }

  /* ---------- Вкладка «Партнёрка» в кабинете ---------- */

  function renderTab() {
    if (!tab) return;
    if (!tok()) {
      tab.innerHTML = `<div class="card pp-card"><h3>Партнёрка</h3><p class="pp-muted">Войдите в аккаунт, чтобы подать заявку.</p></div>`;
      return;
    }
    const p = partner();
    let tag = 'Партнёрка', title = 'Станьте партнёром Crysea', text = 'Рекомендуйте Crysea и получайте 5% с каждой оплаты по вашему коду.', btn = 'Подать заявку', extra = '';
    if (p && p.status === 'pending') { tag = 'На проверке'; title = 'Заявка отправлена'; text = 'Проверим канал вручную. Ответ придёт сюда.'; btn = 'Открыть заявку'; }
    if (p && p.status === 'rejected') { tag = 'Отклонено'; title = 'Заявка не прошла проверку'; text = 'Исправьте данные и отправьте заявку снова.'; btn = 'Исправить заявку'; }
    if (p && p.status === 'approved' && !p.code) { tag = 'Одобрено'; title = 'Выберите промокод'; text = 'Заявка одобрена. Выберите промокод на странице партнёрки.'; btn = 'Выбрать промокод'; }
    if (p && p.status === 'approved' && p.code) {
      tag = 'Партнёр'; title = 'Ваш промокод'; text = `Покупатели получают ${p.percent || BUYER}% скидки. Вам — ${RATE}% от оплат.`; btn = 'Открыть кабинет партнёра';
      extra = `<div class="pp-code">${esc(p.code)}</div>${statsHtml(p.stats || emptyStats)}`;
    }
    tab.innerHTML = `<div class="card pp-card"><span class="pp-tag">${esc(tag)}</span><h3>${esc(title)}</h3>
      <p class="pp-muted">${esc(text)}</p>${extra}
      <a class="btn ${p && p.status === 'approved' ? '' : 'p'}" href="/partner">${esc(btn)}</a></div>`;
  }

  /* ---------- Старт ---------- */

  async function init() {
    try { await refresh(); } catch (e) { state = { partner: null }; }
    renderPage();
    renderTab();
    document.querySelectorAll('[data-tab="partner"]').forEach((b) => b.addEventListener('click', async () => {
      try { await refresh(); } catch (e) {}
      renderTab();
    }));
  }
  init();
})();
