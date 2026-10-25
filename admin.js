/* Админка партнёров. Ключ хранится только в памяти вкладки: после перезагрузки страницы его нужно ввести заново. */
(function () {
  const $ = (s) => document.querySelector(s);
  let KEY = '';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RUB = (n) => Number(n || 0).toLocaleString('ru-RU') + ' ₽';
  const ST = { pending: 'Ожидает', active: 'Активен', paused: 'На паузе', rejected: 'Отклонён' };
  const ERR = {
    admin: 'Неверный ключ', requirements: 'Не хватает подписчиков или просмотров: нужно 500 и 2 000', code_taken: 'Такой промокод уже занят',
    discount: 'Скидка покупателю от 1 до 90%', commission: 'Комиссия от 1 до 50%', code: 'Код: 3–24 символа, латиница, цифры, _ и -',
    period: 'Месяц в формате ГГГГ-ММ', amount: 'Сумма должна быть больше нуля', status: 'Неверный статус', nf: 'Партнёр не найден', id: 'Нет id партнёра', net: 'Нет связи с сервером', server: 'Ошибка на сервере. Откройте логи функции (Netlify: Functions → api; Vercel: Logs). Обычно это база без обновлённой схемы: выполните db/schema.sql'
  };

  async function api(path, body) {
    let r;
    try {
      r = await fetch('/api' + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'x-admin-key': KEY }, body: body ? JSON.stringify(body) : undefined });
    } catch (e) { throw new Error('net'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'net');
    return j;
  }
  const msg = (t, bad) => { const m = $('#msg'); m.textContent = t; m.className = 'msg ' + (bad ? 'bad' : 'good'); };

  function card(p) {
    const subsOk = p.subs >= 500, viewsOk = p.views >= 2000;
    return `<article class="card adm" data-id="${esc(p.id)}">
      <div class="adm-h">
        <div><h3>${esc(p.name)}</h3><small>${esc(p.email)} · <a href="${esc(p.channel)}" target="_blank" rel="noopener noreferrer">канал</a></small></div>
        <span class="chip ${p.status === 'active' ? 'pro' : ''}">${esc(ST[p.status] || p.status)}</span>
      </div>
      <div class="adm-stats">
        <div><small>Подписчики</small><b class="${subsOk ? '' : 'low'}">${p.subs}</b></div>
        <div><small>Ср. просмотры</small><b class="${viewsOk ? '' : 'low'}">${p.views}</b></div>
        <div><small>Продаж по коду</small><b>${p.sales}</b></div>
        <div><small>Комиссия к выплате</small><b>${RUB(p.due)}</b></div>
        <div><small>Выплачено</small><b>${RUB(p.paid)}</b></div>
        <div><small>Оплата за видео</small><b>${RUB(p.feeTotal)}</b></div>
      </div>
      <div class="adm-form">
        <label class="f"><span>Статус</span><select data-k="status">${Object.entries(ST).map(([k, v]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="f"><span>Подписчики</span><input data-k="subs" type="number" min="0" value="${p.subs}"></label>
        <label class="f"><span>Ср. просмотры</span><input data-k="views" type="number" min="0" value="${p.views}"></label>
        <label class="f"><span>Промокод партнёра</span><input data-k="code" value="${esc(p.code || '')}" placeholder="CR…"></label>
        <label class="f"><span>Скидка покупателю, %</span><input data-k="discount" type="number" min="1" max="90" value="${p.discount == null ? 10 : p.discount}"></label>
        <label class="f"><span>Комиссия партнёру, %</span><input data-k="commission" type="number" min="1" max="50" value="${p.commission}"></label>
        <label class="f"><span>Оплата за видео, ₽/мес</span><input data-k="fee" type="number" min="0" value="${p.fee}"></label>
      </div>
      <div class="adm-act">
        <button class="btn p s" type="button" data-act="save">Сохранить</button>
        <input class="adm-period" data-k="period" placeholder="2026-10" aria-label="Месяц оплаты">
        <button class="btn s" type="button" data-act="fee">Начислить оплату за видео</button>
        <button class="btn s" type="button" data-act="paid">Отметить комиссии выплаченными</button>
      </div>
    </article>`;
  }

  async function load() {
    const j = await api('/admin/partners');
    $('#login').hidden = true; $('#panel').hidden = false;
    $('#list').innerHTML = j.partners.length ? j.partners.map(card).join('') : '<p class="sub">Заявок пока нет.</p>';
  }

  $('#go').onclick = async () => {
    KEY = $('#key').value.trim(); $('#loginErr').textContent = '';
    try { await load(); } catch (e) { KEY = ''; $('#loginErr').textContent = ERR[e.message] || e.message; }
  };
  $('#key').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#go').click(); });

  $('#list').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const card = b.closest('.adm'), id = card.dataset.id;
    const val = (k) => card.querySelector(`[data-k="${k}"]`).value;
    b.disabled = true;
    try {
      if (b.dataset.act === 'save') {
        await api('/admin/partner', { id, status: val('status'), subs: val('subs'), views: val('views'), code: val('code'),
          discount: val('discount'), commission: val('commission'), fee: val('fee') });
        msg('Сохранено');
      } else if (b.dataset.act === 'fee') {
        const r = await api('/admin/fee', { id, period: val('period'), amount: val('fee') });
        msg(r.created ? 'Оплата за видео начислена' : 'За этот месяц оплата уже начислена');
      } else if (b.dataset.act === 'paid') {
        await api('/admin/paid', { id });
        msg('Комиссии отмечены выплаченными');
      }
      await load();
    } catch (err) { msg(ERR[err.message] || err.message, true); }
    finally { b.disabled = false; }
  });
})();
