/* Crysea: окно «Партнёрство» и вкладка в кабинете. Тот же API и токен, что и сайт. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const K = 'crysea_token';
  const tok = () => { try { return localStorage.getItem(K); } catch (e) { return null; } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rub = (n) => Number(n || 0).toLocaleString('ru-RU') + ' ₽';
  const num = (n) => Number(n || 0).toLocaleString('ru-RU');
  const ic = (id) => `<svg class="ic"><use href="#i-${id}"/></svg>`;
  const loggedIn = () => !!tok();

  // пороги совпадают с сервером (netlify/functions/api.mjs, PARTNER.min)
  const MIN = { tiktok: { label: 'TikTok', views: 1000, followers: 50 }, youtube: { label: 'YouTube', views: 300, followers: 50 } };
  const ERR = {
    platform: 'Ссылка должна вести на TikTok или YouTube',
    channel: 'Нужна ссылка на профиль или канал (https://…)',
    nums: 'Введите числа',
    low: 'Пока не подходит: TikTok — от 1 000 просмотров и 50 подписчиков, YouTube — от 300 и 50',
    payout: 'Укажите реквизиты для выплат', contact: 'Укажите, как с вами связаться',
    agree: 'Отметьте оба пункта, чтобы отправить заявку', code_fmt: 'Промокод: от 3 до 16 латинских букв или цифр',
    limit: 'Слишком много попыток, попробуйте позже', not_approved: 'Заявка ещё не одобрена',
    has_code: 'Промокод уже закреплён за вами', code_taken: 'Этот промокод уже занят, выберите другой',
    auth: 'Сессия истекла, войдите снова', net: 'Нет связи с сервером'
  };

  let state = null;          // ответ GET /partner
  let section = 'apply';
  let query = '';

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
  const refresh = async () => { state = loggedIn() ? await call('GET', '/partner') : { partner: null }; };

  /* ---------- Окно ---------- */
  const NAV = [
    { g: 'Начало' },
    { id: 'apply', t: 'Стать партнёром', i: 'plus' },
    { id: 'prog', t: 'Партнёрская программа', i: 'coin' },
    { id: 'req', t: 'Требования', i: 'shield' },
    { g: 'Медиа-программа' },
    { id: 'media', t: 'Медиа-программа', i: 'layers' },
    { id: 'videos', t: 'Медиа', i: 'mon', soon: true },
    { g: 'Заработок' },
    { id: 'promo', t: 'Промокод', i: 'key' },
    { id: 'ref', t: 'Реферальная ссылка', i: 'arr', soon: true },
    { id: 'pay', t: 'Выплаты', i: 'wallet' },
    { id: 'draw', t: 'Розыгрыши', i: 'bolt', soon: true },
    { g: 'Ресурсы' },
    { id: 'press', t: 'Пресс-кит', i: 'receipt', soon: true }
  ];

  function ensureModal() {
    if (document.getElementById('pmodal')) return;
    const el = document.createElement('div');
    el.className = 'mo'; el.id = 'pmodal'; el.hidden = true;
    el.innerHTML = `<div class="pm" role="dialog" aria-modal="true" aria-labelledby="pmT">
      <button class="x" type="button" id="pmX" aria-label="Закрыть">${ic('x')}</button>
      <div class="pm-top"><span class="pm-kick" id="pmT">— Партнёрство</span></div>
      <div class="pm-body">
        <aside class="pm-side">
          <label class="pm-search"><span class="pm-sr" aria-hidden="true">⌕</span><input id="pmQ" placeholder="Поиск..." autocomplete="off" aria-label="Поиск по разделам"><kbd>⌘K</kbd></label>
          <nav class="pm-nav" id="pmNav"></nav>
        </aside>
        <div class="pm-main" id="pmMain"></div>
      </div></div>`;
    document.body.appendChild(el);
    $('#pmX').onclick = closeModal;
    el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
    $('#pmQ').oninput = (e) => { query = e.target.value.trim().toLowerCase(); renderNav(); };
  }

  function renderNav() {
    const items = NAV.filter((n) => n.g || !query || n.t.toLowerCase().includes(query));
    $('#pmNav').innerHTML = items.map((n) => n.g
      ? `<span class="pm-lbl">${esc(n.g)}</span>`
      : `<button type="button" data-sec="${n.id}" class="${n.id === section ? 'on' : ''}">${ic(n.i)}<span>${esc(n.t)}</span></button>`).join('');
    $$('#pmNav button').forEach((b) => (b.onclick = () => { section = b.dataset.sec; renderModal(); }));
  }

  async function openModal(sec) {
    ensureModal();
    if (sec) section = sec;
    $('#pmodal').hidden = false; document.body.style.overflow = 'hidden';
    renderModal();
    try { await refresh(); renderModal(); } catch (e) { renderModal(e.message); }
  }
  function closeModal() {
    const m = $('#pmodal'); if (m) m.hidden = true;
    document.body.style.overflow = '';
  }

  function renderModal(errMsg) {
    renderNav();
    const main = $('#pmMain');
    const view = { apply: applyView, prog: progView, req: reqView, media: mediaView, promo: promoView, pay: payView };
    main.innerHTML = view[section] ? view[section](errMsg) : soonView();
    main.scrollTop = 0;
    bindModal();
  }

  const head = (kick, title, lead) =>
    `<div class="pm-kick pm-k">— ${esc(kick)}</div><h2 class="pm-h">${esc(title)}</h2>${lead ? `<p class="pm-lead">${lead}</p>` : ''}`;
  const tile = (ico, title, go) =>
    `<${go ? 'button type="button" data-go="' + go + '"' : 'div'} class="pm-tile">
       <span class="pm-ico">${ic(ico)}</span><span class="pm-tt">${esc(title)}</span>${go ? '<span class="pm-arr">' + ic('arr') + '</span>' : ''}
     </${go ? 'button' : 'div'}>`;

  function progView() {
    return head('Партнёрская программа', 'Зарабатывайте с рефералов',
      'Делитесь промокодом, получайте процент с каждой покупки и выводите средства из кабинета.') +
      `<div class="pm-grid2">
        ${tile('coin', 'До 20% комиссии с каждой продажи')}
        ${tile('mon', 'Записывайте видео и получайте оплату за просмотры')}
        ${tile('wallet', 'Поддерживаются несколько способов выплат')}
        ${tile('bolt', 'Статистика в реальном времени в личном кабинете')}
      </div>
      <div class="pm-box"><h4>Как это работает</h4>
        <ol class="pm-steps">
          <li>Подайте заявку и получите личный промокод.</li>
          <li>Делитесь им с аудиторией удобным способом.</li>
          <li>Отслеживайте доход и выводите средства из кабинета.</li>
        </ol>
      </div>`;
  }

  function reqView() {
    const rows = Object.values(MIN).map((m) =>
      `<div class="pm-tr"><span class="pm-strong">${m.label}</span><span>${num(m.views)}+ стабильных просмотров</span><span>${num(m.followers)}+ подписчиков</span></div>`).join('');
    const acc = [
      ['mon', 'Аккаунт активен: вы регулярно публикуете видео.'],
      ['layers', 'Контент хорошего качества: монтаж, темп, подача.'],
      ['shield', 'Контент про Rust: ролики должны быть про игру.'],
      ['user', 'Аккаунт не пустой на момент подачи заявки.']
    ].map(([i, t]) => `<div class="pm-li"><span class="pm-ico sm">${ic(i)}</span><span>${esc(t)}</span></div>`).join('');
    return head('Требования', 'Минимальные пороги', 'Подавать заявку можно, если ваши последние видео стабильно набирают эти цифры.') +
      `<div class="pm-table"><div class="pm-tr pm-th"><span>Платформа</span><span>Просмотры</span><span>Подписчики</span></div>${rows}</div>
      <p class="pm-note">Цифры должны быть стабильными на последних публикациях, а не разовыми всплесками.</p>
      <div class="pm-box"><h4>Требования к аккаунту</h4><div class="pm-list">${acc}</div></div>
      <div class="pm-box"><h4>Требования к контенту</h4>
        <p class="pm-p">Видео-контент должен продвигать проект и качественно о нём отзываться. Видео должно соответствовать правилам Crysea и правилам платформы.</p></div>`;
  }

  function mediaView() {
    return head('Медиа-программа', 'Медиа-Программа') +
      `<div class="pm-chips">
        <button type="button" data-jump="pm-pct">${ic('coin')}Процент с покупок</button>
        <button type="button" data-jump="pm-views">${ic('mon')}Выплаты за просмотры</button>
        <button type="button" data-jump="pm-content">${ic('shield')}Требования к контенту</button>
      </div>
      <div class="pm-box" id="pm-pct"><div class="pm-k">Процент с покупок по промокоду</div>
        <p class="pm-p"><b>База: 12% с первой покупки.</b> Процент растёт на +1% за каждого нового покупателя. Макс: 20%.</p>
        <div class="pm-tiers">
          <div class="pm-tier"><span class="pm-k">Покупок</span><b>1–8</b><span class="pm-k">Процент партнёру</span><b>12–19%</b></div>
          <div class="pm-tier hi"><span class="pm-k">Покупок</span><b>9+</b><span class="pm-k">Процент партнёру</span><b>20%</b></div>
        </div>
      </div>
      <div class="pm-box" id="pm-views"><div class="pm-k">Выплаты за просмотры</div>
        <p class="pm-p">Ставки за просмотры по платформам:</p>
        <div class="pm-rate">
          <div class="pm-rate-h"><span class="pm-badge">${ic('mon')}TikTok</span><b>88 ₽ – 125 ₽</b><small>за каждые 2 500 просмотров</small></div>
          <p class="pm-note">Точная ставка в этом диапазоне зависит от качества ролика. Выплаты начинаются с 5 000 просмотров.</p>
          <div class="pm-pair"><div><span class="pm-k">Начиная с</span><b>5 000 просмотров</b></div><div><span class="pm-k">Максимум</span><b>6 500 ₽</b><small>за 130 000 просмотров</small></div></div>
        </div>
        <div class="pm-rate">
          <div class="pm-rate-h"><span class="pm-badge">${ic('mon')}YouTube</span><b>175 ₽ – 250 ₽</b><small>за каждые 250 просмотров</small></div>
          <p class="pm-note">Точная ставка в этом диапазоне зависит от качества ролика. Выплаты начинаются с 500 просмотров.</p>
          <div class="pm-pair"><div><span class="pm-k">Начиная с</span><b>500 просмотров</b></div><div><span class="pm-k">Максимум</span><b>12 500 ₽</b><small>за 12 500 просмотров</small></div></div>
        </div>
        <p class="pm-note">После достижения лимита выплаты не начисляются.</p>
      </div>
      <div class="pm-box" id="pm-content"><div class="pm-k">Требования к контенту</div>
        <p class="pm-p">Видео-контент должен продвигать проект и качественно о нём отзываться. Видео должно соответствовать правилам Crysea и правилам платформы.</p>
      </div>`;
  }

  function applyView(errMsg) {
    if (!loggedIn()) {
      return head('Стать партнёром', 'Подать заявку на партнёрство',
        'Чтобы подать заявку, войдите в аккаунт. Ответ появится в кабинете.') +
        `<div class="pm-box"><p class="pm-p">Вход нужен, чтобы выплаты пришли на ваш аккаунт.</p>
         <button class="btn p w" type="button" id="pmLogin">Войти</button></div>`;
    }
    const pa = state && state.partner;
    if (pa && pa.status === 'approved') {
      return head('Стать партнёром', 'Вы уже партнёр',
        'Промокод, начисления и выплаты смотрите в разделах «Промокод» и «Выплаты».') +
        `<button class="btn p w" type="button" data-sec-go="promo">Открыть промокод</button>`;
    }
    const v = (k) => (pa && pa[k] != null ? esc(pa[k]) : '');
    const banner = pa && pa.status === 'pending' ? '<div class="pm-banner">Заявка на проверке. Изменить данные можно ниже.</div>'
      : pa && pa.status === 'rejected' ? '<div class="pm-banner">Прошлая заявка не прошла проверку. Исправьте данные и отправьте снова.</div>' : '';
    const tiles = `<div class="pm-grid2">
      ${tile('shield', 'Минимальные требования', 'req')}
      ${tile('layers', 'Медиа-программа', 'media')}
      ${tile('gift', 'Бесплатная подписка, пока вы активны')}
      ${tile('key', 'Личный промокод с долей от продаж')}
      ${tile('chat', 'Прямой доступ к поддержке и обратной связи')}
      ${tile('wallet', 'Оплата за просмотры')}
    </div>`;
    return head('Стать партнёром', 'Подать заявку на партнёрство',
      'Расскажите немного о своём канале. Проверим его вручную и ответим в кабинете на этом же аккаунте.') +
      tiles + banner +
      `<form id="pmForm" class="pm-form" novalidate>
        <label class="pm-field"><span>Ссылка на канал</span>
          <input name="channel" value="${v('channel')}" placeholder="https://www.tiktok.com/@yourchannel" maxlength="200" autocomplete="off"></label>
        <div class="pm-row2">
          <label class="pm-field"><span>Подписчиков</span>
            <input name="followers" type="number" min="0" inputmode="numeric" value="${v('followers')}"></label>
          <label class="pm-field"><span>Средние просмотры на видео</span>
            <input name="views" type="number" min="0" inputmode="numeric" value="${v('views')}"></label>
        </div>
        <label class="pm-field"><span>Реквизиты для выплат</span>
          <input name="payout" value="${v('payout')}" placeholder="Карта, СБП или ЮMoney" maxlength="200" autocomplete="off"></label>
        <div class="pm-row2">
          <label class="pm-field"><span>Желаемый промокод</span>
            <input name="desired" value="${v('desired')}" placeholder="Например, IVAN" maxlength="16" autocomplete="off" class="up"></label>
          <label class="pm-field"><span>Ссылка для связи</span>
            <input name="contact" value="${v('contact')}" placeholder="@telegram или discord:username" maxlength="100" autocomplete="off"></label>
        </div>
        <div class="pm-checks">
          <label class="pm-check"><input type="checkbox" name="read"><span>Ознакомился с программой</span></label>
          <label class="pm-check"><input type="checkbox" name="terms"><span>Принимаю условия выплат</span></label>
        </div>
        <div class="pm-err" id="pmErr" role="alert">${errMsg ? esc(ERR[errMsg] || errMsg) : ''}</div>
        <button class="btn p w pm-submit" type="submit" id="pmSubmit">Подать заявку →</button>
        <p class="pm-note">Заявка с сайта. Ответ придёт в кабинет на этом же аккаунте.</p>
      </form>`;
  }

  function promoView() {
    if (!loggedIn()) return head('Промокод', 'Промокод', 'Войдите в аккаунт, чтобы увидеть свой промокод.');
    const pa = state && state.partner;
    if (pa && pa.code) {
      return head('Промокод', 'Ваш промокод', 'Покупатели вводят его и получают ' + pa.percent + '% скидки.') +
        `<div class="pm-code">${esc(pa.code)}</div>
         <div class="pm-note">Промокод закреплён за вами. Изменить его можно только через поддержку.</div>`;
    }
    if (pa && pa.status === 'approved') {
      return head('Промокод', 'Выберите промокод', 'Заявка одобрена. Выберите промокод в разделе кабинета «Партнёрка».');
    }
    return head('Промокод', 'Промокода пока нет', 'Промокод появится после одобрения заявки.') +
      `<button class="btn p w" type="button" data-sec-go="apply">Подать заявку</button>`;
  }

  function payView() {
    if (!loggedIn()) return head('Выплаты', 'Выплаты', 'Войдите в аккаунт, чтобы увидеть баланс.');
    const pa = state && state.partner;
    const s = (pa && pa.stats) || { orders: 0, sales: 0, earned: 0, paid: 0 };
    return head('Выплаты', 'Выплаты', 'Выплачиваем на карту, в СБП или на ЮMoney вручную после проверки оплат по вашему коду.') +
      `<div class="pm-grid3">
        <div class="pm-tile2"><span class="pm-k">Начислено</span><b>${rub(s.earned)}</b></div>
        <div class="pm-tile2"><span class="pm-k">Выплачено</span><b>${rub(s.paid)}</b></div>
        <div class="pm-tile2"><span class="pm-k">К выплате</span><b>${rub(s.earned - s.paid)}</b></div>
      </div>
      <p class="pm-note">Покупок по коду: ${s.orders}, оборот: ${rub(s.sales)}.</p>`;
  }

  function soonView() {
    return `<div class="pm-kick pm-k">— Скоро</div><h2 class="pm-h">Этот раздел в разработке</h2>
      <p class="pm-lead">Пока здесь ничего нет. Основные условия доступны в «Стать партнёром», «Требования» и «Медиа-программа».</p>`;
  }

  function bindModal() {
    const login = $('#pmLogin');
    if (login) login.onclick = () => { closeModal(); if (window.openAuth) window.openAuth('login'); else location.href = '/'; };
    $$('[data-go]').forEach((b) => (b.onclick = () => { section = b.dataset.go; renderModal(); }));
    $$('[data-sec-go]').forEach((b) => (b.onclick = () => { section = b.dataset.secGo; renderModal(); }));
    $$('[data-jump]').forEach((b) => (b.onclick = () => { const t = document.getElementById(b.dataset.jump); if (t) $('#pmMain').scrollTo({ top: t.offsetTop - 16, behavior: 'smooth' }); }));
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
      const need = MIN[platform];
      const followers = Number(fd.followers), views = Number(fd.views);
      if (followers < need.followers || views < need.views) return (err.textContent = ERR.low);
      if (!f.read.checked || !f.terms.checked) return (err.textContent = ERR.agree);
      btn.disabled = true;
      try {
        await call('POST', '/partner/apply', {
          platform, channel, followers, views,
          desired: String(fd.desired || '').trim().toUpperCase(),
          payout: String(fd.payout || '').trim(), contact: String(fd.contact || '').trim(),
          agreed: f.read.checked, terms: f.terms.checked
        });
        await refresh();
        renderTab();
        $('#pmMain').innerHTML = `<div class="pm-done"><div class="ok">${ic('ok')}</div><h2 class="pm-h">Заявка отправлена</h2>
          <p class="pm-lead">Проверим канал вручную. Статус и промокод появятся в кабинете, во вкладке «Партнёрка».</p>
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
        <p>Рекомендуйте Crysea в TikTok или YouTube. Покупатель получает скидку по вашему коду, вы получаете процент от каждой оплаты.</p>
        <button class="btn p" type="button" data-partner-open>Подать заявку</button></div>`;
    } else if (pa.status === 'pending' || pa.status === 'rejected') {
      box.innerHTML = `<div class="card pt-card"><span class="tag">${pa.status === 'pending' ? 'На проверке' : 'Отклонено'}</span>
        <h3>${pa.status === 'pending' ? 'Заявка отправлена' : 'Заявка не прошла проверку'}</h3>
        <p>${pa.status === 'pending' ? 'Проверим канал вручную. Когда одобрим, здесь появится выбор промокода.' : 'Исправьте данные и отправьте заявку снова.'}</p>
        <button class="btn" type="button" data-partner-open>Изменить данные</button></div>`;
    } else if (!pa.code) {
      box.innerHTML = `<div class="card pt-card"><span class="tag">Одобрено</span><h3>Выберите промокод</h3>
        <p>Покупатели вводят его и получают скидку. Вам начисляется процент от каждой оплаты. Промокод закрепляется за вами, поменять его можно только через поддержку.</p>
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
        <p>Покупатели получают ${pa.percent}% скидки. Вам начисляется процент от их оплат.</p>
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
    if (!tabBox()) return;
    try { await refresh(); } catch (e) { state = { partner: null }; }
    renderTab();
    document.querySelectorAll('[data-tab="partner"]').forEach((b) => b.addEventListener('click', async () => {
      try { await refresh(); } catch (e) {}
      renderTab();
    }));
  })();
  window.CRYSEA_PARTNER = { open: openModal };
})();
