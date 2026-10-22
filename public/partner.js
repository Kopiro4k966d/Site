/* Crysea: партнёрка (вкладка в кабинете). Тот же API и токен, что и кабинет. */
(function () {
  const $ = (s) => document.querySelector(s);
  const K = 'crysea_token';
  const tok = () => { try { return localStorage.getItem(K); } catch (e) { return null; } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rub = (n) => Number(n || 0).toLocaleString('ru-RU') + ' ₽';
  const ERR = {
    platform: 'Выберите платформу', channel: 'Нужна ссылка на профиль или канал (https://…)',
    nums: 'Введите числа', low: 'Пока не подходит: нужно от 500 подписчиков и от 2 000 просмотров на видео',
    payout: 'Укажите реквизиты для выплат', limit: 'Слишком много попыток, попробуйте позже',
    not_approved: 'Заявка ещё не одобрена', has_code: 'Промокод уже закреплён за вами',
    code_fmt: 'Код: от 3 до 16 латинских букв или цифр', code_taken: 'Этот код уже занят, выберите другой',
    auth: 'Сессия истекла, войдите снова', net: 'Нет связи с сервером'
  };

  async function call(method, path, data) {
    let r;
    try {
      r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok() }, body: data ? JSON.stringify(data) : undefined });
    } catch (e) { throw new Error('net'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'net');
    return j;
  }

  const box = () => $('#partnerBox');

  function applyForm(pa) {
    const v = (k) => (pa && pa[k] != null ? esc(pa[k]) : '');
    const sel = (p) => (pa && pa.platform === p ? ' selected' : '');
    return `<form class="card pt-card pt-form" id="ptApply" autocomplete="off">
      <h3>${pa ? 'Изменить данные канала' : 'Подать заявку'}</h3>
      <p>Условия: от 500 подписчиков и в среднем от 2 000 просмотров на видео. Покупатели с вашим кодом получают скидку, вы получаете 5% от каждой их оплаты.</p>
      <label class="f"><span>Платформа</span>
        <select name="platform"><option value="tiktok"${sel('tiktok')}>TikTok</option><option value="youtube"${sel('youtube')}>YouTube</option></select></label>
      <label class="f"><span>Ссылка на профиль или канал</span>
        <input name="channel" value="${v('channel')}" placeholder="https://www.tiktok.com/@ваш_ник" maxlength="200" required></label>
      <label class="f"><span>Подписчиков</span>
        <input name="followers" type="number" min="0" inputmode="numeric" value="${v('followers')}" required></label>
      <label class="f"><span>Средние просмотры на видео</span>
        <input name="views" type="number" min="0" inputmode="numeric" value="${v('views')}" required></label>
      <label class="f"><span>Реквизиты для выплат</span>
        <input name="payout" value="${v('payout')}" placeholder="Карта, СБП или ЮMoney" maxlength="200" required></label>
      <div class="pt-err" id="ptErr" role="alert"></div>
      <button class="btn p w" type="submit">${pa ? 'Сохранить и отправить на проверку' : 'Отправить заявку'}</button>
    </form>`;
  }

  function statusCard(tag, title, text) {
    return `<div class="card pt-card"><span class="tag">${tag}</span><h3>${title}</h3><p>${text}</p></div>`;
  }

  function render(d) {
    const pa = d.partner;
    let html;
    if (!pa) {
      html = applyForm(null);
    } else if (pa.status === 'pending') {
      html = statusCard('На проверке', 'Заявка отправлена', 'Проверим канал вручную. Когда одобрим, здесь появится выбор промокода.') + applyForm(pa);
    } else if (pa.status === 'rejected') {
      html = statusCard('Отклонено', 'Заявка не прошла проверку', 'Если канал вырос до условий, исправьте данные и отправьте заявку снова.') + applyForm(pa);
    } else if (!pa.code) {
      html = `<div class="card pt-card"><span class="tag">Одобрено</span><h3>Выберите промокод</h3>
        <p>Этот код вводят покупатели, они получают ${pa.percent}% скидки. Вам начисляется 5% от каждой их оплаты. Код закрепляется за вами, изменить его можно только через поддержку.</p>
        <div class="pt-row"><input id="ptCodeIn" maxlength="16" placeholder="Например, IVAN" autocomplete="off" aria-label="Промокод"><button class="btn p" type="button" id="ptCodeBtn">Сохранить код</button></div>
        <div class="pt-err" id="ptErr" role="alert"></div></div>`;
    } else {
      const s = pa.stats || { orders: 0, sales: 0, earned: 0, paid: 0 };
      html = `<div class="card pt-card"><span class="tag">Партнёр</span><h3>Ваш промокод</h3>
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
    box().innerHTML = html;
    bind(d);
  }

  function bind(d) {
    const f = $('#ptApply');
    if (f) f.onsubmit = async (e) => {
      e.preventDefault();
      const err = $('#ptErr'), btn = f.querySelector('button');
      err.textContent = ''; btn.disabled = true;
      const body = Object.fromEntries(new FormData(f).entries());
      body.followers = Number(body.followers); body.views = Number(body.views);
      try { render(await call('POST', '/partner/apply', body)); }
      catch (x) { err.textContent = ERR[x.message] || x.message; btn.disabled = false; }
    };
    const cb = $('#ptCodeBtn');
    if (cb) cb.onclick = async () => {
      const err = $('#ptErr'), code = $('#ptCodeIn').value.trim();
      err.textContent = ''; cb.disabled = true;
      try { render(await call('POST', '/partner/code', { code })); }
      catch (x) { err.textContent = ERR[x.message] || x.message; cb.disabled = false; }
    };
  }

  async function load() {
    if (!box()) return;
    if (!tok()) {
      box().innerHTML = '<div class="card pt-card"><h3>Партнёрка</h3><p>Войдите в аккаунт на <a href="/">главной</a>, чтобы подать заявку.</p></div>';
      return;
    }
    try { render(await call('GET', '/partner')); }
    catch (x) { box().innerHTML = `<div class="card pt-card"><p>${esc(ERR[x.message] || ERR.net)}</p></div>`; }
  }

  load();
  document.querySelectorAll('[data-tab="partner"]').forEach((b) => b.addEventListener('click', load));
})();
