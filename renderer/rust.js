/* Вкладка Rust: параметры запуска, консоль, свои модули оптимизации, таймер вайпа, рейд-калькулятор. */
let rsub = 'launch', rsys = null, raid = [{ t: 'stone', q: 1 }], wipeT = null, emod = null, edraft = null, rsaveT;
const RSUBS = [['launch', 'Запуск'], ['console', 'Консоль'], ['modules', 'Модули'], ['wipe', 'Вайп'], ['raid', 'Рейд']];
const R = () => S.settings.rust;
const rcard = (t, body, right = '') => `<div class="card"><div class="cch"><b class="ct">${t}</b>${right}</div>${body}</div>`;
const rsel = (id, opts, cur, attr = '') => `<select ${id ? `id="${id}"` : ''} ${attr}>${opts.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
function rsave() { clearTimeout(rsaveT); rsaveT = setTimeout(() => api.rust({ kind: 'save', rust: R() }).then((r) => { if (r && r.state) S = r.state; }), 350); }
const msg = (id, t, ok) => { const e = $('#' + id); if (e) { e.textContent = t || ''; e.classList.toggle('ok', !!ok); } };
const modsOpt = () => [['', 'Не выбран'], ...S.settings.modules.map((m) => [m.id, m.name])];

/* ---------- Запуск ---------- */
function launchLine() {
  const o = R().lo, a = [];
  if (o.window) a.push('-window-mode ' + o.window);
  for (const [k, flag] of LO_FLAGS) if (o[k]) a.push(flag);
  if (o.maxMem) a.push('-maxMem=' + o.maxMem);
  if (o.cpuCount) a.push('-cpuCount=' + o.cpuCount);
  if (o.exThreads) a.push('-exThreads=' + o.exThreads);
  if (o.gc) a.push('-gc.buffer ' + o.gc);
  if (o.extra) a.push(o.extra);
  return a.join(' ');
}
function lLaunch() {
  const r = R(), o = r.lo, path = r.path;
  const play = rcard('Играть', `<div class="rrow"><div class="grow"><span class="lbl">Модуль перед запуском</span>${rsel('pm', modsOpt(), r.main)}</div>
    <div>${sw('pbp', r.beforePlay, 'Выполнять перед запуском')}</div></div>
    <div class="acl"><button class="btn p" data-act="play">Запустить Rust через Steam</button></div><pre class="mres" id="pmsg"></pre>
    <p class="tip">Запуск идёт через Steam, поэтому EasyAntiCheat работает как обычно. Crysea ничего не внедряет в игру.</p>`,
    `<span class="pillb ${rsys && rsys.running ? 'ok' : ''}" id="rrun"><i></i>${rsys && rsys.running ? 'Rust запущен' : 'Rust не запущен'}</span>`);
  const opts = rcard('Параметры запуска Steam', `
    <div class="g2"><div><span class="lbl">Режим окна</span>${rsel('lw', [['', 'Не указывать'], ['exclusive', 'Эксклюзивный (обычно больше FPS)'], ['borderless', 'Без рамки']], o.window)}</div>
    <div><span class="lbl">Буфер сборщика мусора (-gc.buffer)</span>${rsel('lg', [[0, 'Не указывать'], [1024, '1024'], [2048, '2048'], [4096, '4096'], [8192, '8192']], o.gc)}</div></div>
    <div class="flags">${LO_FLAGS.map(([k, f, d]) => sw('', o[k], `<code>${f}</code>`, `<small>${d}</small>`, `data-lo="${k}"`)).join('')}</div>
    <div class="g3"><div><span class="lbl">-maxMem (МБ)</span><input type="number" min="0" id="lm" placeholder="не указывать" value="${o.maxMem || ''}"></div>
    <div><span class="lbl">-cpuCount</span><input type="number" min="0" id="lc" placeholder="не указывать" value="${o.cpuCount || ''}"></div>
    <div><span class="lbl">-exThreads</span><input type="number" min="0" id="le" placeholder="не указывать" value="${o.exThreads || ''}"></div></div>
    <div class="acl"><button class="btn" data-act="tune">Подобрать под мой ПК</button><span class="tip" id="sysinfo" style="margin:auto 0">${rsys ? `${rsys.cpus} потоков, ${(rsys.ramMB / 1024).toFixed(0)} ГБ RAM` : ''}</span></div>
    <span class="lbl" style="margin-top:12px">Свои параметры (добавятся в конец)</span><input type="text" id="lx" maxlength="200" placeholder="-параметр1 -параметр2=3" value="${esc(o.extra)}">
    <span class="lbl" style="margin-top:12px">Итоговая строка</span><pre class="code" id="lout">${esc(launchLine()) || 'пусто'}</pre>
    <div class="acl"><button class="btn p" data-act="copylo">Копировать</button></div>
    <p class="tip">Steam → Библиотека → Rust → Свойства → Общие → Параметры запуска. Это рекомендации сообщества: выигрыш зависит от ПК, поэтому включайте по одному и проверяйте FPS.</p>`);
  const win = rcard('Windows-настройки для Rust', `<div class="rrow"><div class="grow"><span class="lbl">Путь к RustClient.exe</span><input type="text" id="rp" readonly placeholder="не указан" value="${esc(path)}"></div>
    <button class="btn" data-act="detect">Найти</button><button class="btn" data-act="browse">Выбрать…</button></div>
    ${Object.entries({ fso: ['Отключить оптимизацию во весь экран', 'Убирает лишний слой Windows над игрой, иногда снижает задержку'], gpu: ['Высокопроизводительная видеокарта', 'Для ноутбуков: Rust всегда на дискретной видеокарте'] })
      .map(([id, [t, d]]) => `<div class="setr"><div>${t}<span>${d}</span></div><div class="acl" style="margin:0"><button class="btn" data-reg="${id}" data-on="1">Применить</button><button class="btn" data-reg="${id}" data-on="0">Сбросить</button></div></div>`).join('')}
    <pre class="mres" id="rgm"></pre>`);
  return play + opts + win;
}
function bLaunch() {
  const upd = () => { const e = $('#lout'); if (e) e.textContent = launchLine() || 'пусто'; };
  V.onchange = V.oninput = (e) => {
    const t = e.target, o = R().lo;
    if (t.dataset.lo) o[t.dataset.lo] = t.checked;
    else if (t.id === 'lw') o.window = t.value; else if (t.id === 'lg') o.gc = +t.value;
    else if (t.id === 'lm') o.maxMem = Math.max(0, +t.value || 0); else if (t.id === 'lc') o.cpuCount = Math.max(0, +t.value || 0); else if (t.id === 'le') o.exThreads = Math.max(0, +t.value || 0);
    else if (t.id === 'lx') o.extra = t.value;
    else if (t.id === 'pm') R().main = t.value; else if (t.id === 'pbp') R().beforePlay = t.checked; else return;
    upd(); rsave();
  };
  V.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'tune' && rsys) {
      const o = R().lo; o.maxMem = Math.floor(rsys.ramMB * 0.75 / 1024) * 1024; o.cpuCount = Math.max(2, Math.round(rsys.cpus / 2)); o.exThreads = rsys.cpus; rsave(); render();
    } else if (b.dataset.act === 'copylo') { await api.copy(launchLine()); b.textContent = 'Скопировано'; setTimeout(() => (b.textContent = 'Копировать'), 1400); }
    else if (b.dataset.act === 'play') { b.disabled = true; msg('pmsg', 'Запускаем…', true); const r = await api.rust({ kind: 'play' }); b.disabled = false; msg('pmsg', r.msg, r.ok); }
    else if (b.dataset.act === 'detect' || b.dataset.act === 'browse') {
      const r = await api.rust({ kind: b.dataset.act }); if (r.state) S = r.state; render(); if (r.msg) msg('rgm', r.msg, r.ok);
    } else if (b.dataset.reg) { b.disabled = true; const r = await api.rust({ kind: 'reg', id: b.dataset.reg, on: b.dataset.on === '1' }); b.disabled = false; msg('rgm', r.msg, r.ok); }
  };
}

/* ---------- Консоль ---------- */
const cmdKey = (l) => l.split(/\s+/)[0];
function lConsole() {
  const rows = R().cmds.map((c, i) => `<div class="cmd"><label class="tg"><input type="checkbox" data-ci="${i}" ${c.on ? 'checked' : ''}><i></i></label>
    <div class="grow"><input type="text" data-cl="${i}" maxlength="80" value="${esc(c.line)}"><small>${esc(CMD_DESC[cmdKey(c.line)] || 'Своя команда')}</small></div>
    <button class="btn" data-cc="${i}" title="Копировать">Копировать</button><button class="btn" data-cd="${i}" aria-label="Удалить">×</button></div>`).join('');
  return rcard('Команды консоли (F1)', `${rows || '<p class="tip">Список пуст.</p>'}
    <div class="rrow" style="margin-top:12px"><div class="grow"><input type="text" id="cn" maxlength="80" placeholder="Своя команда, например: graphics.fov 85"></div><button class="btn" data-act="cadd">Добавить</button></div>
    <div class="acl"><button class="btn p" data-act="call">Копировать включённые</button><button class="btn" data-act="creset">Сбросить к рекомендуемым</button></div>
    <p class="tip">Откройте консоль клавишей F1 в игре и вставьте команду. Если консоль не принимает несколько строк сразу, вставляйте по одной (кнопка «Копировать» у каждой). Значения можно менять под себя.</p>`);
}
function bConsole() {
  V.onchange = (e) => { const t = e.target; if (t.dataset.ci != null) R().cmds[+t.dataset.ci].on = t.checked; else if (t.dataset.cl != null) R().cmds[+t.dataset.cl].line = t.value.replace(/[^\x20-\x7E]/g, ''); else return; rsave(); };
  V.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.cc != null) { await api.copy(R().cmds[+b.dataset.cc].line); b.textContent = 'Готово'; setTimeout(() => (b.textContent = 'Копировать'), 1200); }
    else if (b.dataset.cd != null) { R().cmds.splice(+b.dataset.cd, 1); rsave(); render(); }
    else if (b.dataset.act === 'cadd') { const v = $('#cn').value.replace(/[^\x20-\x7E]/g, '').trim(); if (v && R().cmds.length < 40) { R().cmds.push({ line: v.slice(0, 80), on: true }); rsave(); render(); } }
    else if (b.dataset.act === 'call') { await api.copy(R().cmds.filter((c) => c.on).map((c) => c.line).join('\n')); b.textContent = 'Скопировано'; setTimeout(() => (b.textContent = 'Копировать включённые'), 1400); }
    else if (b.dataset.act === 'creset') { R().cmds = JSON.parse(JSON.stringify(CMD_DEFAULT)); rsave(); render(); }
  };
  V.onkeydown = (e) => { if (e.key === 'Enter' && e.target.id === 'cn') V.querySelector('[data-act=cadd]').click(); };
}

/* ---------- Модули ---------- */
function lModules() {
  const mods = S.settings.modules, r = R();
  const list = mods.map((m) => `<div class="mod"><div class="grow"><b>${esc(m.name)}</b><small>${m.actions.length} действий${m.procs.length ? `, программ: ${m.procs.length}` : ''}${r.main === m.id ? ' · основной' : ''}</small></div>
    <button class="btn p" data-mr="${esc(m.id)}">Запустить</button><button class="btn" data-me="${esc(m.id)}">Изменить</button><button class="btn" data-md="${esc(m.id)}" aria-label="Удалить">×</button></div>`).join('');
  let ed = '';
  if (edraft) ed = rcard(emod === 'new' ? 'Новый модуль' : 'Редактирование модуля', `<span class="lbl">Название</span><input type="text" id="mn" maxlength="30" value="${esc(edraft.name)}">
    <span class="lbl" style="margin-top:12px">Действия</span><div class="flags">${Object.entries(MOD_LABELS).map(([k, t]) => sw('', edraft.actions.includes(k), t, '', `data-ma="${k}"`)).join('')}</div>
    <span class="lbl" style="margin-top:12px">Свои программы</span>
    ${edraft.procs.map((p, i) => `<div class="proc"><code>${esc(p.exe)}</code>${rsel('', [['lower', 'Понизить приоритет'], ['close', 'Закрыть']], p.mode, `data-pm="${i}"`)}<button class="btn" data-pd="${i}" aria-label="Удалить">×</button></div>`).join('') || '<p class="tip" style="margin:0 0 8px">Можно закрывать или замедлять фоновые программы (браузер, мессенджеры). Системные процессы защищены.</p>'}
    <div class="rrow"><div class="grow"><input type="text" id="mpx" maxlength="60" placeholder="например chrome.exe"></div>${rsel('mpl', [['', 'Из запущенных…']], '')}<button class="btn" data-act="padd">Добавить</button></div>
    <div class="acl"><button class="btn p" data-act="msave">Сохранить</button><button class="btn" data-act="mcancel">Отмена</button></div><em class="am" id="mem"></em>`);
  const auto = rcard('Основной модуль', `<div class="rrow"><div class="grow"><span class="lbl">Используется для «Играть», горячей клавиши и авто-режима</span>${rsel('mmain', modsOpt(), r.main)}</div></div>
    <div class="setr"><div>Авто-режим Rust ${S.can.rustAuto ? '' : '<span class="pill-plan">Plus</span>'}<span>Основной модуль запускается сам, когда стартует RustClient.exe (Crysea должен быть запущен, можно в трее)</span></div>${S.can.rustAuto ? sw('mauto', r.autoStart, '') : `<button class="btn p" data-act="buy">Открыть Plus</button>`}</div>`);
  return rcard('Мои модули оптимизации', `${list || '<p class="tip">Модулей нет.</p>'}<div class="acl"><button class="btn" data-act="mnew">Создать модуль</button></div><pre class="mres" id="mres"></pre>`) + ed + auto;
}
function bModules() {
  const mods = () => S.settings.modules, saveMods = async () => { const s = await api.modules(mods()); if (s && s.settings) S = s; };
  if (edraft) api.rust({ kind: 'procs' }).then((r) => { const e = $('#mpl'); if (e && r.list) e.innerHTML = '<option value="">Из запущенных…</option>' + r.list.filter((x) => !/^(system|registry|idle)/.test(x)).map((x) => `<option>${esc(x)}</option>`).join(''); });
  V.onchange = (e) => {
    const t = e.target;
    if (t.dataset.ma) { const a = edraft.actions, k = t.dataset.ma; if (t.checked && !a.includes(k)) a.push(k); if (!t.checked) edraft.actions = a.filter((x) => x !== k); }
    else if (t.dataset.pm != null) edraft.procs[+t.dataset.pm].mode = t.value;
    else if (t.id === 'mpl' && t.value) $('#mpx').value = t.value;
    else if (t.id === 'mn') edraft.name = t.value;
    else if (t.id === 'mmain') { R().main = t.value; rsave(); render(); }
    else if (t.id === 'mauto') { R().autoStart = t.checked; rsave(); }
  };
  V.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.mr) { b.disabled = true; msg('mres', 'Выполняется…', true); const r = await api.rust({ kind: 'run', id: d.mr }); b.disabled = false; msg('mres', r.msg, r.ok); }
    else if (d.me) { emod = d.me; edraft = JSON.parse(JSON.stringify(mods().find((m) => m.id === d.me))); render(); }
    else if (d.md) { if (!confirm('Удалить модуль?')) return; S.settings.modules = mods().filter((m) => m.id !== d.md); if (R().main === d.md) R().main = ''; await saveMods(); rsave(); render(); }
    else if (d.act === 'mnew') { emod = 'new'; edraft = { id: 'm_' + Date.now().toString(36), name: 'Мой модуль', actions: ['power', 'gamemode'], procs: [] }; render(); }
    else if (d.act === 'mcancel') { emod = edraft = null; render(); }
    else if (d.act === 'padd') {
      const v = ($('#mpx').value || '').trim();
      if (!/^[\w.\- ]{1,60}\.exe$/i.test(v)) return msg('mem', 'Введите имя программы, например chrome.exe');
      if (edraft.procs.some((p) => p.exe.toLowerCase() === v.toLowerCase())) return;
      edraft.procs.push({ exe: v, mode: 'lower' }); edraft.name = $('#mn').value; render();
    }
    else if (d.pd != null) { edraft.procs.splice(+d.pd, 1); edraft.name = $('#mn').value; render(); }
    else if (d.act === 'msave') {
      edraft.name = $('#mn').value.trim() || 'Мой модуль';
      const i = mods().findIndex((m) => m.id === edraft.id); if (i < 0) mods().push(edraft); else mods()[i] = edraft;
      if (!R().main) R().main = edraft.id;
      emod = edraft = null; await saveMods(); rsave(); render();
    }
    else if (d.act === 'buy') api.open('buy');
  };
}

/* ---------- Вайп ---------- */
function nextWipe(from = new Date()) {
  for (let i = 0; i < 3; i++) {
    const y = from.getUTCFullYear(), mo = from.getUTCMonth() + i;
    const off = (4 - new Date(Date.UTC(y, mo, 1)).getUTCDay() + 7) % 7;   // первый четверг
    let t = Date.UTC(y, mo, 1 + off, 19);                                   // 14:00 по зимнему времени США = 19:00 UTC
    const h = +new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(t);
    t += (14 - h) * 3600000;                                                // поправка на летнее время
    if (t > from.getTime()) return t;
  }
}
const leftStr = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400); return `${d} д ${String(Math.floor(s % 86400 / 3600)).padStart(2, '0')}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
function lWipe() {
  const w = nextWipe(), r = R();
  return rcard('Следующий форс-вайп', `<div class="wipe"><b id="wc">${leftStr(w - Date.now())}</b><span>${new Date(w).toLocaleString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} (ваше время)</span></div>
    <div class="rrow" style="margin-top:14px"><div class="grow"><span class="lbl">Напомнить уведомлением за</span>${rsel('wr', [[0, 'Не напоминать'], [30, '30 минут'], [60, '1 час'], [180, '3 часа'], [1440, '1 день']], r.remind)}</div></div>
    <p class="tip">Форс-вайп Rust проходит в первый четверг месяца около 14:00 по восточному времени США. Facepunch иногда сдвигает время, сверяйтесь с их анонсами. Напоминание придёт, пока Crysea запущен (можно в трее).</p>`);
}
function bWipe() {
  const w = nextWipe(); wipeT = setInterval(() => { const e = $('#wc'); if (e) e.textContent = leftStr(w - Date.now()); }, 1000);
  V.onchange = (e) => { if (e.target.id === 'wr') { R().remind = +e.target.value; rsave(); } };
}
const rustCleanup = () => clearInterval(wipeT);
setInterval(() => {   // напоминание о вайпе работает и при скрытом окне
  if (typeof S === 'undefined' || !S || !S.can || !S.can.rust) return;
  const r = R(), w = nextWipe();
  if (r.remind && w - Date.now() <= r.remind * 60000 && r.lastRemind !== w) {
    r.lastRemind = w; rsave();
    try { new Notification('Crysea: вайп Rust', { body: 'Форс-вайп через ' + leftStr(w - Date.now()).replace(/^0 д /, '') }); } catch {}
  }
}, 30000);

/* ---------- Рейд ---------- */
function lRaid() {
  if (!S.can.raid) return paywall('raid');
  const T = RUST_RAID.targets, tools = RUST_RAID.tools;
  const rows = raid.map((r, i) => `<div class="rr"><select data-rt="${i}">${T.map((t) => `<option value="${t[0]}" ${t[0] === r.t ? 'selected' : ''}>${t[1]}</option>`).join('')}</select>
    <input type="number" min="1" max="99" data-rq="${i}" value="${r.q}" aria-label="Количество"><button class="btn" data-rdel="${i}" aria-label="Убрать">×</button></div>`).join('');
  const tot = tools.map(([name, s], ti) => { const n = raid.reduce((a, r) => a + T.find((t) => t[0] === r.t)[2][ti] * r.q, 0); return { name, n, sulfur: n * s }; });
  const best = Math.min(...tot.map((x) => x.sulfur));
  return rcard('Рейд-калькулятор', `${rows}<div class="acl"><button class="btn" data-act="radd">Добавить цель</button></div>
    <table class="rt2"><thead><tr><th>Чем взрывать</th><th>Штук</th><th>Серы</th></tr></thead><tbody>${tot.map((x) => `<tr class="${x.sulfur === best ? 'best' : ''}"><td>${x.name}</td><td>${x.n}</td><td>${x.sulfur.toLocaleString('ru-RU')}${x.sulfur === best ? ' ★' : ''}</td></tr>`).join('')}</tbody></table>
    <p class="tip">Расчёт для твёрдой (внешней) стороны, без промахов и недорвавшихся зарядов. ★ — самый дешёвый по сере вариант. Числа лежат в renderer/rust-data.js: после патчей их можно поправить.</p>`);
}
function bRaid() {
  V.onchange = (e) => { const t = e.target; if (t.dataset.rt != null) raid[+t.dataset.rt].t = t.value; else if (t.dataset.rq != null) raid[+t.dataset.rq].q = Math.min(99, Math.max(1, +t.value || 1)); else return; render(); };
  V.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.act === 'radd' && raid.length < 12) raid.push({ t: 'stone', q: 1 }); else if (b.dataset.rdel != null && raid.length > 1) raid.splice(+b.dataset.rdel, 1); else return; render(); };
}

/* ---------- Вкладка целиком ---------- */
const RVIEWS = { launch: [lLaunch, bLaunch], console: [lConsole, bConsole], modules: [lModules, bModules], wipe: [lWipe, bWipe], raid: [lRaid, bRaid] };
function vRust() {
  return `<header class="ph"><div><h2>Rust</h2><p>Всё под себя: запуск, консоль, свои модули оптимизации, вайп и рейд.</p></div>
    <div class="seg" id="rsub">${RSUBS.map(([k, t]) => `<button data-s="${k}" class="${rsub === k ? 'on' : ''}">${t}</button>`).join('')}</div></header>${RVIEWS[rsub][0]()}`;
}
function bRust() {
  if (!rsys) api.rust({ kind: 'sys' }).then((r) => { if (!r.ok) return; rsys = r; const e = $('#sysinfo'); if (e) e.textContent = `${r.cpus} потоков, ${(r.ramMB / 1024).toFixed(0)} ГБ RAM`; const p = $('#rrun'); if (p) { p.classList.toggle('ok', r.running); p.lastChild.textContent = r.running ? 'Rust запущен' : 'Rust не запущен'; } });
  $('#rsub').onclick = (e) => { const b = e.target.closest('button'); if (b) { rsub = b.dataset.s; emod = edraft = null; render(); } };
  RVIEWS[rsub][1]();
}
