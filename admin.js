/* Админка партнёров Crysea.
   Ключ хранится только в памяти вкладки: сбрасывается при выходе, блокировке по простою
   (10 минут), при скрытии вкладки и при закрытии страницы. Серверная проверка ключа обязательна:
   всё, что здесь, — только удобство и защита от случайных кликов, а не граница доступа. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let KEY = '';
  let PARTNERS = [];
  let FILTER = 'all';
  const IDLE_MS = 10 * 60 * 1000;
  let idleT, tickT, lastAct = Date.now();

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RUB = (n) => Number(n || 0).toLocaleString('ru-RU') + ' ₽';
  const NUM = (n) => Number(n || 0).toLocaleString('ru-RU');
  const ST = { pending: 'Ожидает', active: 'Активен', paused: 'На паузе', rejected: 'Отклонён' };
  const ERR = {
    admin: 'Неверный ключ', requirements: 'Не хватает подписчиков или просмотров: нужно 500 и 2 000',
    code_taken: 'Такой промокод уже занят', discount: 'Скидка покупателю от 1 до 90%',
    commission: 'Комиссия от 1 до 50%', code: 'Код: 3–24 символа, латиница, цифры, _ и -',
    period: 'Месяц в формате ГГГГ-ММ', amount: 'Сумма должна быть больше нуля', status: 'Неверный статус',
    nf: 'Партнёр не найден', id: 'Нет id партнёра', net: 'Нет связи с сервером', ratelimit: 'Слишком много попыток. Подождите несколько минут.'
  };

  /* ---------- сеть ---------- */
  async function api(path, body) {
    let r;
    try {
      r = await fetch('/api' + path, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': KEY },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer'
      });
    } catch (e) { throw new Error('net'); }
    if (r.status === 429) throw new Error('ratelimit');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'net');
    return j;
  }

  /* ---------- уведомления ---------- */
  let toastT;
  function toast(text, bad) {
    const t = $('#toast');
    t.textContent = text; t.className = 'adm-toast show ' + (bad ? 'bad' : 'good');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------- блокировка и простой ---------- */
  function lock(reason) {
    KEY = '';
    PARTNERS = [];
    $('#list').innerHTML = '';
    $('#kpis').innerHTML = '';
    $('#panel').hidden = true;
    $('#login').hidden = false;
    $('#key').value = '';
    $('#loginErr').textContent = reason || '';
    clearInterval(tickT);
  }
  function touch() { lastAct = Date.now(); }
  function tick() {
    const left = IDLE_MS - (Date.now() - lastAct);
    if (!KEY) return;
    if (left <= 0) { lock('Сессия завершена из-за простоя. Войдите снова.'); return; }
    const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    $('#idle').textContent = `Автовыход через ${m}:${String(s).padStart(2, '0')}`;
  }
  ['pointerdown', 'keydown', 'input', 'scroll'].forEach((ev) => addEventListener(ev, touch, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) lock('Вкладка скрыта, ключ сброшен.'); });
  addEventListener('pagehide', () => { KEY = ''; });

  /* ---------- отрисовка ---------- */
  function kpis(list) {
    const active = list.filter((p) => p.status === 'active').length;
    const pending = list.filter((p) => p.status === 'pending').length;
    const due = list.reduce((s, p) => s + Number(p.due || 0), 0);
    const sales = list.reduce((s, p) => s + Number(p.sales || 0), 0);
    $('#kpis').innerHTML = [
      ['Партнёров', list.length], ['Активных', active], ['Ожидают проверки', pending], ['К выплате', RUB(due)]
    ].map(([k, v]) => `<div class="adm-kpi"><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('');
  }

  function card(p) {
    const subsOk = p.subs >= 500, viewsOk = p.views >= 2000;
    const statusOpts = Object.entries(ST).map(([k, v]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${v}</option>`).join('');
    return `<article class="adm-card" data-id="${esc(p.id)}">
      <div class="adm-head">
        <div>
          <h3>${esc(p.name)}</h3>
          <small>${esc(p.email)} · ${p.channel ? `<a href="${esc(p.channel)}" target="_blank" rel="noopener noreferrer">канал</a>` : 'канал не указан'}</small>
        </div>
        <span class="chip ${p.status === 'active' ? 'pro' : ''}">${esc(ST[p.status] || p.status)}</span>
      </div>

      <div class="adm-metrics">
        <div><small>Подписчики</small><b class="${subsOk ? '' : 'low'}">${NUM(p.subs)}</b></div>
        <div><small>Ср. просмотры</small><b class="${viewsOk ? '' : 'low'}">${NUM(p.views)}</b></div>
        <div><small>Продаж по коду</small><b>${NUM(p.sales)}</b></div>
        <div><small>Комиссия к выплате</small><b>${RUB(p.due)}</b></div>
        <div><small>Выплачено</small><b>${RUB(p.paid)}</b></div>
        <div><small>Оплата за видео</small><b>${RUB(p.feeTotal)}</b></div>
      </div>

      <div class="adm-group">
        <h4>Статус и метрики</h4>
        <div class="adm-grid">
          <label>Статус<select data-k="status">${statusOpts}</select></label>
          <label>Подписчики<input data-k="subs" type="number" min="0" value="${esc(p.subs)}"></label>
          <label>Ср. просмотры<input data-k="views" type="number" min="0" value="${esc(p.views)}"></label>
        </div>
      </div>

      <div class="adm-group">
        <h4>Промокод и комиссия</h4>
        <div class="adm-grid">
          <label>Промокод партнёра<input data-k="code" value="${esc(p.code || '')}" placeholder="CR…" maxlength="24"></label>
          <label>Скидка покупателю, %<input data-k="discount" type="number" min="1" max="90" value="${p.discount == null ? 10 : esc(p.discount)}"></label>
          <label>Комиссия партнёру, %<input data-k="commission" type="number" min="1" max="50" value="${esc(p.commission)}"></label>
        </div>
      </div>

      <div class="adm-group">
        <h4>Оплата за видео и выплаты</h4>
        <div class="adm-grid">
          <label>Оплата за видео, ₽ в месяц<input data-k="fee" type="number" min="0" value="${esc(p.fee)}"></label>
          <label>Месяц начисления<input data-k="period" placeholder="ГГГГ-ММ" maxlength="7"></label>
        </div>
        <div class="adm-acts">
          <button class="btn p s" type="button" data-act="save">Сохранить</button>
          <button class="btn s" type="button" data-act="fee">Начислить оплату</button>
          <button class="btn s" type="button" data-act="paid">Отметить комиссии выплаченными</button>
        </div>
      </div>
    </article>`;
  }

  function render() {
    const list = FILTER === 'all' ? PARTNERS : PARTNERS.filter((p) => p.status === FILTER);
    $('#list').innerHTML = list.length
      ? list.map(card).join('')
      : `<p class="adm-empty">${PARTNERS.length ? 'В этом фильтре никого нет.' : 'Заявок пока нет.'}</p>`;
    kpis(PARTNERS);
    $$('#filters button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === FILTER)));
  }

  async function load() {
    const j = await api('/admin/partners');
    PARTNERS = Array.isArray(j.partners) ? j.partners : [];
    $('#login').hidden = true; $('#panel').hidden = false;
    render();
  }

  /* ---------- вход ---------- */
  $('#go').onclick = async () => {
    const k = $('#key').value.trim();
    if (!k) { $('#loginErr').textContent = 'Введите ключ'; return; }
    KEY = k; $('#loginErr').textContent = '';
    try {
      await load();
      touch(); clearInterval(tickT); tickT = setInterval(tick, 1000); tick();
    } catch (e) { KEY = ''; $('#loginErr').textContent = ERR[e.message] || e.message; }
    $('#key').value = '';
  };
  $('#key').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#go').click(); });
  $('#lock').onclick = () => lock('');
  $('#reload').onclick = () => load().then(() => toast('Список обновлён')).catch((e) => toast(ERR[e.message] || e.message, true));
  $('#filters').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-f]'); if (!b) return;
    FILTER = b.dataset.f; render();
  });

  /* ---------- действия ---------- */
  $('#list').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const card = b.closest('.adm-card'), id = card.dataset.id;
    const val = (k) => card.querySelector(`[data-k="${k}"]`).value.trim();
    const name = card.querySelector('h3').textContent;
    let body, path;

    if (b.dataset.act === 'save') {
      path = '/admin/partner';
      body = { id, status: val('status'), subs: val('subs'), views: val('views'), code: val('code'),
        discount: val('discount'), commission: val('commission'), fee: val('fee') };
      if (body.status === 'active' && !window.confirm(`Активировать партнёра «${name}»? Проверьте канал и метрики.`)) return;
    } else if (b.dataset.act === 'fee') {
      const period = val('period'), amount = val('fee');
      if (!period) { toast('Укажите месяц в формате ГГГГ-ММ', true); return; }
      if (!window.confirm(`Начислить оплату за видео ${RUB(amount)} партнёру «${name}» за ${period}? Повторное начисление за тот же месяц невозможно.`)) return;
      path = '/admin/fee'; body = { id, period, amount };
    } else if (b.dataset.act === 'paid') {
      if (!window.confirm(`Отметить все начисленные комиссии партнёра «${name}» выплаченными? Действие необратимо из интерфейса.`)) return;
      path = '/admin/paid'; body = { id };
    } else return;

    b.disabled = true;
    try {
      const r = await api(path, body);
      if (b.dataset.act === 'save') toast('Сохранено');
      else if (b.dataset.act === 'fee') toast(r.created ? 'Оплата за видео начислена' : 'За этот месяц оплата уже начислена');
      else toast('Комиссии отмечены выплаченными');
      await load();
    } catch (err) { toast(ERR[err.message] || err.message, true); }
    finally { b.disabled = false; }
  });

  lock('');
  // отдельный ход: блокировка при загрузке, если сессия не начата
  $('#login').hidden = false;
})();
