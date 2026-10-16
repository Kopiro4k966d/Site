const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n) => `<svg class="ic"><use href="#${n}"/></svg>`;
const TABS = [['display', 'i-sat', 'Экран'], ['profiles', 'i-prof', 'Профили'], ['crosshair', 'i-aim', 'Прицел'], ['rust', 'i-rust', 'Rust'], ['optimize', 'i-bolt', 'Оптимизация'], ['settings', 'i-adv', 'Настройки']];
let S, C, tab = 'display', sendT, crT, cz = 2, cbg = 'img', csub = 'form', pend = {};
const V = $('#view');

$('#rail').innerHTML = TABS.map(([k, i, t]) => `<button class="nb" data-t="${k}" aria-label="${t}">${ic(i)}<span>${t}</span></button>`).join('');
$('#rail').onclick = (e) => { const b = e.target.closest('.nb'); if (b) { tab = b.dataset.t; render(); } };

document.querySelectorAll('[data-w]').forEach((b) => (b.onclick = () => api.win(b.dataset.w)));

/* ---------- Тарифы ---------- */
const FEAT = { profiles: 'profiles', crosshair: 'crosshair', optimize: 'optimize', rust: 'rust' };
const PAYWALL = {
  profiles: ['Профили игр', 'Автоматически меняют цвет экрана и приоритет под каждую игру.'],
  crosshair: ['Свой прицел', 'Полная настройка прицела поверх игры: форма, цвет, обводка, смещение.'],
  optimize: ['Быстрые модули оптимизации', 'Схема питания, игровой режим, очистка кэша и временных файлов.'],
  rust: ['Инструменты для Rust', 'Параметры запуска, команды консоли, свои модули оптимизации и таймер вайпа.'],
  raid: ['Рейд-калькулятор', 'Сколько C4, ракет и серы нужно на рейд. Входит в тариф Plus.'],
};
const TIER = { pro: 'Pro', plus: 'Plus' };
function paywall(k) {
  const [t, d] = PAYWALL[k], tier = TIER[(S.need && S.need[k === 'raid' ? 'raid' : k]) || 'pro'];
  return `<div class="card paywall"><div class="lockic">${tier.toUpperCase()}</div><h3>${t}</h3><p>${d}</p>
    <p class="tip">Эта функция входит в тариф <b>${tier}</b>${S.account ? '' : '. Войдите в аккаунт, если подписка уже куплена'}.</p>
    <div class="acl" style="justify-content:center"><button class="btn p" data-pw="buy">Открыть тарифы ${tier}</button>${S.account ? '' : '<button class="btn" data-pw="login">Войти в аккаунт</button>'}</div></div>`;
}
function bindPaywall() {
  V.onclick = (e) => { const b = e.target.closest('[data-pw]'); if (!b) return; if (b.dataset.pw === 'buy') api.open('buy'); else { tab = 'profile'; render(); } };
}
function markLocks() {
  document.querySelectorAll('.nb').forEach((b) => { const f = FEAT[b.dataset.t], lock = f && S.can && !S.can[f]; b.classList.toggle('lock', !!lock); if (lock) b.dataset.need = (TIER[S.need[f]] || 'Pro').toUpperCase(); });
  const m = $('#me'); if (m) m.title = 'Профиль · тариф ' + ({ free: 'Free', pro: 'Pro', plus: 'Plus' }[S.plan] || 'Free');
}

const filt = (d) => `saturate(${d.sat / 100}) contrast(${d.contrast / 100}) brightness(${1 + d.bright / 100})`;
const row = (k, l, min, max, v, u) => `<div class="rw"><div class="rt"><label>${l}</label><b id="v-${k}">${v}${u}</b></div><input type="range" data-k="${k}" min="${min}" max="${max}" value="${v}"></div>`;
const sw = (id, on, t, sub = '', attr = '') => `<label class="tg"><input type="checkbox" ${id ? `id="${id}"` : ''} ${attr} ${on ? 'checked' : ''}><i></i>${t || sub ? `<span>${t}${sub}</span>` : ''}</label>`;
const pill = () => S.supported ? `<span class="pillb ok"><i></i>${S.magOk ? 'Live' : 'Запуск…'}</span>` : `<span class="pillb"><i></i>Только предпросмотр (нужна Windows)</span>`;

/* ---------- Экран ---------- */
function vDisplay() {
  const d = S.settings.display;
  return `<header class="ph"><div><h2>Экран</h2><p>Меняет картинку на мониторе и не трогает саму игру.</p></div>${pill()}</header>
  <div class="dg"><div class="card"><div class="scene" id="scene"><img id="pv" src="../assets/before.jpg" style="filter:${filt(d)}" alt=""><div class="clip" id="clip"><img src="../assets/before.jpg" alt=""></div>
  <div class="line" id="line"><div class="knob">${ic('i-arr')}</div></div><span class="sl l">Оригинал</span><span class="sl r">С Crysea</span></div></div>
  <div class="card dc">${row('sat', 'Насыщенность', 0, 300, d.sat, '%')}${row('contrast', 'Контраст', 50, 150, d.contrast, '%')}${row('bright', 'Яркость', -30, 30, d.bright, '')}
  <div class="foot"><div class="fr">${sw('en', d.enabled, 'Эффект включён')}<kbd>Ctrl+Alt+S</kbd></div><button class="btn w" id="rs">Сбросить</button></div></div></div>`;
}
function bDisplay() {
  const scene = $('#scene'), clip = $('#clip'), line = $('#line'); let drag = false;
  const pos = (x) => { const r = scene.getBoundingClientRect(), p = Math.max(0, Math.min(100, (x - r.left) / r.width * 100)); clip.style.clipPath = `inset(0 ${100 - p}% 0 0)`; line.style.left = p + '%'; };
  scene.onpointerdown = (e) => { drag = true; scene.setPointerCapture(e.pointerId); pos(e.clientX); };
  scene.onpointermove = (e) => drag && pos(e.clientX);
  scene.onpointerup = () => (drag = false);
  const read = () => { const o = {}; V.querySelectorAll('[data-k]').forEach((i) => (o[i.dataset.k] = +i.value)); return o; };
  const upd = (o) => { for (const k in o) $('#v-' + k).textContent = o[k] + (k === 'bright' ? '' : '%'); $('#pv').style.filter = filt(o); };
  V.querySelectorAll('[data-k]').forEach((i) => (i.oninput = () => { const o = read(); upd(o); clearTimeout(sendT); sendT = setTimeout(() => api.display(o).then((s) => (S = s)), 30); }));
  $('#en').onchange = (e) => api.display({ enabled: e.target.checked }).then((s) => (S = s));
  $('#rs').onclick = () => api.display({ sat: 100, contrast: 100, bright: 0 }).then((s) => { S = s; render(); });
}

/* ---------- Профили ---------- */
function vProfiles() {
  const P = S.settings.profiles;
  return `<header class="ph"><div><h2>Профили игр</h2><p>Когда игра запущена, Crysea сам применит её настройки.</p></div>${sw('auto', S.settings.auto, 'Автоприменение')}</header>
  <div class="card add"><input type="text" id="pn" maxlength="40" placeholder="Название игры"><input type="text" id="pe" list="rl" placeholder="game.exe"><datalist id="rl"></datalist><button class="btn p" id="pa">Добавить</button></div>
  <p class="hint">Новый профиль берёт текущие значения вкладки «Экран». Список запущенных процессов подгружается в поле game.exe.<br><button class="btn" id="pr">${ic('i-plus')}Профиль для Rust (RustClient.exe)</button></p>
  ${P.map((p) => `<div class="card pf" data-id="${esc(p.id)}"><div><b>${esc(p.name)}</b>${S.active === p.id ? '<span class="on">Активен</span>' : ''}<small>${esc(p.exe)}</small></div>
  <div><input type="range" data-f="sat" min="0" max="300" value="${p.sat}"><small class="sv">Насыщенность ${p.sat}%</small></div>${sw('', p.prio, 'Приоритет', '', 'data-f="prio"')}<button class="ib" data-del title="Удалить" aria-label="Удалить">${ic('i-trash')}</button></div>`).join('') || '<div class="empty">Профилей пока нет. Добавьте игру выше.</div>'}`;
}
function bProfiles() {
  const save = (list) => api.profiles(list).then((s) => { S = s; });
  api.running().then((l) => { const d = $('#rl'); if (d) d.innerHTML = l.map((n) => `<option value="${esc(n)}">`).join(''); });
  $('#auto').onchange = (e) => api.settings({ auto: e.target.checked }).then((s) => (S = s));
  $('#pa').onclick = () => {
    const n = $('#pn').value.trim(), e = $('#pe').value.trim(); if (!e) return;
    const d = S.settings.display;
    save([...S.settings.profiles, { id: String(Date.now()), name: n || e, exe: e, sat: d.sat, contrast: d.contrast, bright: d.bright, prio: false }]).then(render);
  };
  $('#pr').onclick = () => {
    const d = S.settings.display;
    if (S.settings.profiles.some((p) => p.exe.toLowerCase() === 'rustclient.exe')) return;
    save([...S.settings.profiles, { id: String(Date.now()), name: 'Rust', exe: 'RustClient.exe', sat: d.sat, contrast: d.contrast, bright: d.bright, prio: true }]).then(render);
  };
  V.onchange = V.oninput = (e) => {
    const c = e.target.closest('.pf'); if (!c || !e.target.dataset.f) return;
    const list = S.settings.profiles.map((p) => p.id === c.dataset.id ? { ...p, [e.target.dataset.f]: e.target.type === 'checkbox' ? e.target.checked : +e.target.value } : p);
    if (e.target.dataset.f === 'sat') c.querySelector('.sv').textContent = `Насыщенность ${e.target.value}%`;
    save(list);
  };
  V.onclick = (e) => { const b = e.target.closest('[data-del]'); if (b) save(S.settings.profiles.filter((p) => p.id !== b.closest('.pf').dataset.id)).then(render); };
}

/* ---------- Палитра цвета ---------- */
const h2r = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const r2h = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); let h = 0;
  if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; }
  return [h, mx ? d / mx : 0, mx];
}
function hsv2rgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c, i = Math.floor(h / 60) % 6;
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][i];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
let pop = null;
function closePicker() {
  if (!pop) return;
  pop.el.remove(); document.removeEventListener('pointerdown', pop.out, true); document.removeEventListener('keydown', pop.key); pop = null;
}
function openPicker(anchor, hex, cb) {
  if (pop && pop.anchor === anchor) return closePicker();
  closePicker();
  let [h, s, v] = rgb2hsv(...h2r(hex));
  const el = document.createElement('div'); el.className = 'cp';
  el.innerHTML = `<div class="cp-sv"><i class="cp-h"></i></div>
  <div class="cp-mid">${window.EyeDropper ? `<button class="cp-eye" title="Пипетка" aria-label="Пипетка">${ic('i-eye')}</button>` : ''}<span class="cp-prev"></span><input class="cp-hue" type="range" min="0" max="360" step="1" aria-label="Оттенок"></div>
  <div class="cp-rgb">${['R', 'G', 'B'].map((l, i) => `<label><input type="text" inputmode="numeric" maxlength="3" data-ch="${i}" aria-label="${l}">${l}</label>`).join('')}</div>
  <div class="cp-hex">HEX<input type="text" class="cp-hx" maxlength="7" spellcheck="false"></div>`;
  document.body.appendChild(el);
  const sv = $('.cp-sv', el), hd = $('.cp-h', el), hue = $('.cp-hue', el), hx = $('.cp-hx', el), ch = [...el.querySelectorAll('[data-ch]')];
  const ui = (skip) => {
    const rgb = hsv2rgb(h, s, v).map(Math.round), hexv = r2h(...rgb);
    el.style.setProperty('--hc', r2h(...hsv2rgb(h, 1, 1))); el.style.setProperty('--cc', hexv);
    hd.style.left = s * 100 + '%'; hd.style.top = (1 - v) * 100 + '%'; hue.value = Math.round(h);
    if (skip !== 'rgb') ch.forEach((i, n) => (i.value = rgb[n]));
    if (skip !== 'hex') hx.value = hexv;
    return hexv;
  };
  const emit = (skip) => cb(ui(skip));
  const svPos = (e) => { const r = sv.getBoundingClientRect(); s = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); v = 1 - Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)); emit(); };
  let drag = false;
  sv.onpointerdown = (e) => { drag = true; sv.setPointerCapture(e.pointerId); svPos(e); };
  sv.onpointermove = (e) => drag && svPos(e);
  sv.onpointerup = sv.onpointercancel = () => (drag = false);
  hue.oninput = () => { h = +hue.value; emit(); };
  const fromRgb = (rgb, skip) => { const t = rgb2hsv(...rgb); if (t[1] > 0 && t[2] > 0) h = t[0]; s = t[1]; v = t[2]; emit(skip); };
  ch.forEach((i) => (i.oninput = () => {
    i.value = i.value.replace(/\D/g, '');
    const rgb = ch.map((x) => (x.value === '' ? NaN : +x.value));
    if (rgb.every((n) => n >= 0 && n <= 255)) fromRgb(rgb, 'rgb');
  }));
  hx.oninput = () => { if (/^#[0-9a-f]{6}$/i.test(hx.value)) fromRgb(h2r(hx.value.toLowerCase()), 'hex'); };
  const eye = $('.cp-eye', el);
  if (eye) eye.onclick = async () => { try { const r = await new window.EyeDropper().open(); fromRgb(h2r(r.sRGBHex.toLowerCase())); } catch {} };
  ui();
  const a = anchor.getBoundingClientRect(), w = el.offsetWidth, hh = el.offsetHeight;
  el.style.left = Math.max(8, Math.min(a.left, innerWidth - w - 8)) + 'px';
  el.style.top = Math.max(8, Math.min(a.bottom + 8, innerHeight - hh - 8)) + 'px';
  const out = (e) => { if (!el.contains(e.target) && !anchor.contains(e.target)) closePicker(); };
  const key = (e) => { if (e.key === 'Escape') closePicker(); };
  document.addEventListener('pointerdown', out, true); document.addEventListener('keydown', key);
  pop = { el, anchor, out, key };
}

/* ---------- Прицел ---------- */
const PRESETS = [
  ['Крест', { lines: true, tStyle: false, length: 10, thickness: 2, gap: 5, dot: false, circle: false }],
  ['Крест + точка', { lines: true, tStyle: false, length: 8, thickness: 2, gap: 4, dot: true, dotSize: 3, dotRound: false, circle: false }],
  ['Точка', { lines: false, tStyle: false, dot: true, dotSize: 5, dotRound: true, circle: false }],
  ['Круг', { lines: false, tStyle: false, dot: true, dotSize: 3, dotRound: true, circle: true, radius: 12, ring: 2 }],
  ['T-образный', { lines: true, tStyle: true, length: 10, thickness: 2, gap: 4, dot: false, circle: false }],
  ['Тонкий', { lines: true, tStyle: false, length: 6, thickness: 1, gap: 3, dot: true, dotSize: 1, dotRound: false, circle: false }],
];
// Быстрые цвета подбираются под выбранную тему
const SWATCH = {
  dark: ['#ffffff', '#ff3b30', '#34c759', '#00e5ff', '#ffd60a', '#ff2d95'],
  light: ['#111111', '#d70015', '#1a7f37', '#0066cc', '#b58900', '#c2185b'],
  soft: ['#ece8dd', '#d9847a', '#8fb08c', '#9cc3c9', '#e3b97e', '#b69bc9'],
};
const BGS = [['img', 'Игра', 'linear-gradient(#7aa4d6 50%,#5b7a3a 50%)'], ['light', 'Светлый', '#d9d9d9'], ['dark', 'Тёмный', '#111'], ['green', 'Зелёный', '#3d6b3a']];
const cr = (k, l, min, max, u = '') => `<div class="row"><label>${l}</label><input type="range" data-c="${k}" min="${min}" max="${max}" value="${C[k]}"><b id="c-${k}">${C[k]}${u}</b></div>`;
const ctg = (k) => sw('', C[k], '', '', `data-c="${k}"`);
const ctr = (k, l) => `<div class="row tr"><label>${l}</label>${ctg(k)}</div>`;
const colr = (k, l) => `<div class="colr"><button class="pk" data-pick="${k}" style="background:${C[k]}" aria-label="${l}" title="${l}"></button><input type="text" data-c="${k}" value="${C[k]}" maxlength="7" spellcheck="false"></div>`;
const pn = (id, body) => `<div class="pn" data-pn="${id}" ${csub === id ? '' : 'hidden'}>${body}</div>`;

function vCross() {
  C = { ...S.settings.crosshair };
  const sws = SWATCH[S.settings.theme] || SWATCH.dark;
  return `<header class="ph"><div><h2>Прицел</h2><p>Свой прицел поверх игры, как в Crosshair X.</p></div>${sw('cen', C.enabled, 'Показывать в игре', ' <kbd>Ctrl+Alt+C</kbd>', 'data-c="enabled"')}</header>
  <div class="cx"><div class="cxl">
    <div class="card"><div class="scene cs" id="cs" data-bg="${cbg}"><img src="../assets/before.jpg" alt=""><canvas id="cv"></canvas></div>
      <div class="pvbar"><div class="seg" id="zoom">${[1, 2, 4].map((z) => `<button data-v="${z}" class="${cz === z ? 'on' : ''}">${z}×</button>`).join('')}</div>
      <div class="seg bgs" id="bgs">${BGS.map(([v, n, c]) => `<button data-v="${v}" title="${n}" aria-label="${n}" class="${cbg === v ? 'on' : ''}"><i style="background:${c}"></i></button>`).join('')}</div></div></div>
    <div class="card"><b class="ct">Готовые прицелы</b><div class="chips">${PRESETS.map(([n], i) => `<button class="chip" data-p="${i}">${n}</button>`).join('')}</div></div>
  </div><div class="cxr">
    <div class="seg full" id="subs">${[['form', 'Форма'], ['color', 'Цвет'], ['pos', 'Позиция'], ['code', 'Код']].map(([k, n]) => `<button data-v="${k}" class="${csub === k ? 'on' : ''}">${n}</button>`).join('')}</div>
    ${pn('form', `<div class="card"><div class="cch"><b class="ct">Линии</b>${ctg('lines')}</div>${cr('length', 'Длина', 0, 60)}${cr('thickness', 'Толщина', 1, 12)}${cr('gap', 'Просвет', 0, 30)}${ctr('tStyle', 'T-образный')}</div>
      <div class="card"><div class="cch"><b class="ct">Точка</b>${ctg('dot')}</div>${cr('dotSize', 'Размер', 1, 20)}${ctr('dotRound', 'Круглая')}</div>
      <div class="card"><div class="cch"><b class="ct">Круг</b>${ctg('circle')}</div>${cr('radius', 'Радиус', 3, 80)}${cr('ring', 'Толщина', 1, 8)}</div>`)}
    ${pn('color', `<div class="card"><b class="ct">Цвет прицела</b>${colr('color', 'Цвет прицела')}<div class="sws">${sws.map((c) => `<button data-sw="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>${cr('opacity', 'Прозрачность', 10, 100, '%')}</div>
      <div class="card"><div class="cch"><b class="ct">Контур</b>${ctg('outline')}</div>${cr('outlineW', 'Ширина', 0, 4)}<div style="height:8px"></div>${colr('outlineColor', 'Цвет контура')}</div>`)}
    ${pn('pos', `<div class="card"><b class="ct">Положение</b>${cr('offX', 'Сдвиг по X', -200, 200)}${cr('offY', 'Сдвиг по Y', -200, 200)}<p class="tip">Ноль — ровно по центру главного монитора. Значения в пикселях экрана.</p></div>`)}
    ${pn('code', `<div class="card"><b class="ct">Код прицела</b><div class="code"><input type="text" id="code" placeholder="OX1:…" spellcheck="false"><button class="btn" id="cc">Копировать</button><button class="btn p" id="ci">Применить</button></div>
      <em id="cm">Скопируйте код, чтобы поделиться прицелом, или вставьте чужой и нажмите «Применить».</em>
      <p class="tip">Прицел рисуется отдельным окном поверх игры и ничего не внедряет в неё. В «настоящем» полноэкранном режиме часть игр его скрывает: переключите игру на «Оконный без рамки».</p></div>`)}
  </div></div>`;
}
function bCross() {
  const cv = $('#cv'), dpr = window.devicePixelRatio || 1; cv.width = cv.height = Math.round(400 * dpr);
  const paint = () => { drawCrosshair(cv, C); cv.style.transform = `translate(${(C.offX / dpr) * cz}px,${(C.offY / dpr) * cz}px) scale(${cz})`; };
  const send = (p) => { Object.assign(pend, p); clearTimeout(crT); crT = setTimeout(() => { const b = pend; pend = {}; api.crosshair(b).then((s) => (S = s)); }, 30); };
  const apply = (p) => api.crosshair(p).then((s) => { S = s; render(); });
  const set = (k, v, src) => {
    C[k] = v;
    const lb = $('#c-' + k); if (lb) lb.textContent = v + (k === 'opacity' ? '%' : '');
    if (k === 'color' || k === 'outlineColor') {
      V.querySelectorAll(`[data-c="${k}"]`).forEach((i) => { if (i !== src) i.value = v; });
      const b = V.querySelector(`[data-pick="${k}"]`); if (b) b.style.background = v;
    }
    paint(); send({ [k]: v });
  };
  paint();
  V.oninput = V.onchange = (e) => {
    const el = e.target.closest('[data-c]'); if (!el) return;
    const k = el.dataset.c, v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
    if ((k === 'color' || k === 'outlineColor') && !/^#[0-9a-f]{6}$/i.test(v)) return;
    set(k, typeof v === 'string' ? v.toLowerCase() : v, el);
  };
  const segOn = (box, b) => box.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  V.onclick = (e) => {
    const z = e.target.closest('#zoom button'), g = e.target.closest('#bgs button'), u = e.target.closest('#subs button'),
      p = e.target.closest('[data-p]'), w = e.target.closest('[data-sw]'), k = e.target.closest('[data-pick]');
    if (z) { cz = +z.dataset.v; segOn($('#zoom'), z); paint(); }
    else if (g) { cbg = g.dataset.v; $('#cs').dataset.bg = cbg; segOn($('#bgs'), g); }
    else if (u) { csub = u.dataset.v; closePicker(); segOn($('#subs'), u); V.querySelectorAll('.pn').forEach((n) => (n.hidden = n.dataset.pn !== csub)); }
    else if (p) apply(PRESETS[+p.dataset.p][1]);
    else if (w) apply({ color: w.dataset.sw });
    else if (k) openPicker(k, C[k.dataset.pick], (hex) => set(k.dataset.pick, hex));
  };
  const msg = (t) => ($('#cm').textContent = t);
  $('#cc').onclick = () => {
    const { enabled, ...rest } = C, code = 'OX1:' + btoa(JSON.stringify(rest)); $('#code').value = code;
    navigator.clipboard.writeText(code).then(() => msg('Код скопирован.'), () => { $('#code').select(); msg('Не удалось скопировать автоматически, код выделен: нажмите Ctrl+C.'); });
  };
  $('#ci').onclick = () => {
    const v = $('#code').value.trim(); let o;
    try { if (!v.startsWith('OX1:')) throw 0; o = JSON.parse(atob(v.slice(4))); if (!o || typeof o !== 'object') throw 0; } catch { return msg('Это не код прицела Crysea.'); }
    delete o.enabled; apply(o);
  };
}

/* ---------- Оптимизация ---------- */
const OPTS = [['power', 'i-bolt', 'Высокая производительность', 'Включает схему электропитания «Высокая производительность»'],
  ['gamemode', 'i-mod', 'Игровой режим', 'Включает автоматический игровой режим Windows'],
  ['dns', 'i-cmp', 'Очистка DNS', 'Сбрасывает кэш DNS, помогает при проблемах с соединением'],
  ['temp', 'i-trash', 'Временные файлы', 'Удаляет временные файлы пользователя, освобождает место']];
function vOptimize() {
  const mods = S.settings.modules;
  return `<header class="ph"><div><h2>Оптимизация</h2><p>Быстрые действия для игр. Работают в Windows.</p></div></header>` +
    (mods.length ? `<div class="card"><b class="ct">Мои модули</b>${mods.map((m) => `<div class="mod"><div class="grow"><b>${esc(m.name)}</b><small>${m.actions.length} действий${m.procs.length ? `, программ: ${m.procs.length}` : ''}</small></div><button class="btn p" data-om="${esc(m.id)}">Запустить</button></div>`).join('')}<pre class="mres" id="omres"></pre><p class="tip">Модули создаются и настраиваются на вкладке Rust → Модули.</p></div>` : '') +
    OPTS.map(([k, i, t, d]) => `<div class="card opt"><div class="ico">${ic(i)}</div><div><b>${t}</b><span>${d}</span><em id="r-${k}"></em></div><button class="btn p" data-o="${k}">Запустить</button></div>`).join('');
}
function bOptimize() {
  V.onclick = async (e) => {
    const m = e.target.closest('[data-om]');
    if (m) { m.disabled = true; const r = await api.rust({ kind: 'run', id: m.dataset.om }); m.disabled = false; const o = $('#omres'); if (o) o.textContent = r.msg; return; }
    const b = e.target.closest('[data-o]'); if (!b) return;
    b.disabled = true; const r = await api.opt(b.dataset.o); b.disabled = false;
    const el = $('#r-' + b.dataset.o); if (el) el.textContent = (r.ok ? 'Готово. ' : '') + r.msg;
  };
}

/* ---------- Профиль ---------- */
const AVC = ['#e5484d', '#f5a524', '#3dd68c', '#3b9eff', '#a78bfa', '#ec6aa5'];
const ini = (n) => ((n || '').trim()[0] || 'И').toUpperCase();
function updMe() {
  const p = S.settings.profile, b = $('#me'); if (!b) return;
  b.textContent = ini(p.name); b.style.background = p.color; b.classList.toggle('on', tab === 'profile');
}
$('#me').onclick = () => { tab = 'profile'; render(); };
function vProfile() {
  const p = S.settings.profile, s = S.settings, d = s.display, a = s.profiles.find((x) => x.id === S.active);
  return `<header class="ph"><div><h2>Профиль</h2><p>Ваше имя, аватар и аккаунт Crysea.</p></div></header>
  <div class="card pr"><div class="av" id="av" style="background:${p.color}">${esc(ini(p.name))}</div>
    <div><label class="l" for="pnm">Имя</label><input type="text" id="pnm" maxlength="24" value="${esc(p.name)}" placeholder="Как вас называть">
    <div class="avs" id="avs">${AVC.map((c) => `<button data-c="${c}" class="${p.color === c ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div></div></div>
  ${vAccount()}
  ${vCreator()}
  ${vPresets()}
  <div class="card"><b class="ct">Сейчас в Crysea</b><div class="stats">
    <div class="st"><span>Игровых профилей</span><b>${s.profiles.length}</b></div>
    <div class="st"><span>Активный профиль</span><b>${a ? esc(a.name) : '—'}</b></div>
    <div class="st"><span>Насыщенность</span><b>${d.enabled ? d.sat + '%' : 'выкл'}</b></div>
    <div class="st"><span>Прицел</span><b>${s.crosshair.enabled ? 'вкл' : 'выкл'}</b></div></div></div>`;
}
let amode = 'login', amsg = '', aok = false, abusy = false;
const PLAN = { free: 'Free', pro: 'Pro', plus: 'Plus' };
const ago = (t) => { if (!t) return 'ещё не было'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'только что' : m < 60 ? m + ' мин назад' : new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); };
function vAccount() {
  const a = S.account;
  if (a) return `<div class="card"><div class="cch"><b class="ct">Аккаунт Crysea</b><span class="pillb ${S.syncErr ? '' : 'ok'}"><i></i>${S.syncErr ? esc(S.syncErr) : 'Синхронизировано'}</span></div>
    <div class="stats"><div class="st"><span>Email</span><b>${esc(a.email)}</b></div><div class="st"><span>Тариф</span><b>${PLAN[S.plan] || 'Free'}</b></div>
    <div class="st"><span>Действует до</span><b>${a.until ? new Date(a.until).toLocaleDateString('ru-RU') : '—'}</b></div><div class="st"><span>Синхронизация</span><b>${ago(S.syncAt)}</b></div></div>
    <p class="tip">Профили игр, прицел, тема и имя синхронизируются с сайтом и другими вашими компьютерами.</p>
    <div class="acl"><button class="btn p" id="abuy">${S.plan === 'free' ? 'Купить тариф' : 'Продлить или сменить'}</button><button class="btn" id="asy">Синхронизировать</button><button class="btn" id="aout"><svg class="ic"><use href="#i-out"/></svg>Выйти</button></div><em class="am" id="am">${esc(amsg)}</em></div>`;
  const reg = amode === 'register';
  return `<div class="card"><b class="ct">Аккаунт Crysea</b>
    <p class="tip">Войдите, чтобы синхронизировать профили и прицел с сайтом и применить код автора.</p>
    <div class="acl amode" id="amode"><button class="btn ${!reg ? 'on' : ''}" data-v="login">Вход</button><button class="btn ${reg ? 'on' : ''}" data-v="register">Регистрация</button></div>
    <div class="lf">
      ${reg ? '<input type="text" id="an" maxlength="24" placeholder="Имя" autocomplete="nickname">' : ''}
      <input type="email" id="ae" placeholder="Email" autocomplete="off">
      <input type="password" id="ap" placeholder="Пароль (минимум 6 символов)" autocomplete="off">
      ${reg ? '<input type="password" id="ap2" placeholder="Повторите пароль" autocomplete="off">' : ''}
    </div>
    <div class="acl"><button class="btn p" id="ago">${reg ? 'Создать аккаунт' : 'Войти'}</button></div>
    <div class="acl"><button class="btn" data-oa="discord">Войти через Discord</button><button class="btn" data-oa="google">Войти через Google</button></div>
    <em class="am ${aok ? 'ok' : ''}" id="am">${esc(amsg)}</em></div>`;
}
function bAccount() {
  const msg = (t, ok) => { amsg = t; aok = !!ok; const e = $('#am'); if (e) { e.textContent = t; e.classList.toggle('ok', !!ok); } };
  const done = (r) => { if (r.state) S = r.state; abusy = false; applyTheme(); r.ok ? (amsg = '', render()) : (render(), msg(r.error)); };
  const mo = $('#amode'); if (mo) mo.onclick = (e) => { const b = e.target.closest('button'); if (b) { amode = b.dataset.v; amsg = ''; render(); } };
  const go = $('#ago');
  if (go) {
    const submit = async () => {
      if (abusy) return;
      const email = $('#ae').value.trim(), password = $('#ap').value, name = amode === 'register' ? $('#an').value.trim() : '';
      if (!/^\S+@\S+\.\S+$/.test(email)) return msg('Введите корректный email');
      if (password.length < 6) return msg('Пароль — минимум 6 символов');
      if (amode === 'register') { if (!name) return msg('Введите имя'); if (password !== $('#ap2').value) return msg('Пароли не совпадают'); }
      abusy = true; go.disabled = true; msg('Подключаемся…', true);
      done(await api.auth({ kind: amode, email, password, name }));
    };
    go.onclick = submit;
    V.onkeydown = (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'range') submit(); };
  }
  V.querySelectorAll('[data-oa]').forEach((b) => (b.onclick = async () => {
    msg('Завершите вход в браузере. Нажмите кнопку ещё раз, чтобы отменить.', true);
    if (abusy) { abusy = false; await api.auth({ kind: 'oauth-cancel' }); return msg(''); }
    abusy = true; const r = await api.auth({ kind: 'oauth', provider: b.dataset.oa }); if (!abusy && !r.ok && !r.error) return; done(r);
  }));
  const so = $('#aout'), sy = $('#asy'), by = $('#abuy'); if (by) by.onclick = () => api.open('buy');
  if (so) so.onclick = async () => done(await api.auth({ kind: 'logout' }));
  if (sy) sy.onclick = async () => { sy.disabled = true; msg('Синхронизируем…', true); done(await api.auth({ kind: 'sync' })); };
}
function bProfile() {
  bAccount(); bExtras();
  let q = {}, t;
  const save = (o) => { Object.assign(q, o); clearTimeout(t); t = setTimeout(() => { const b = q; q = {}; api.profile(b).then((s) => (S = s)); }, 200); };
  const upd = () => { const p = S.settings.profile; $('#av').textContent = ini(p.name); $('#av').style.background = p.color; updMe(); };
  $('#pnm').oninput = (e) => { S.settings.profile.name = e.target.value; upd(); save({ name: e.target.value }); };
  $('#avs').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    S.settings.profile.color = b.dataset.c; $('#avs').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); upd(); save({ color: b.dataset.c });
  };
}

/* ---------- Настройки ---------- */
function vSettings() {
  const t = S.settings.theme, th = [['dark', 'Тёмная', '#121212'], ['light', 'Светлая', '#f2f2f2'], ['soft', 'Мягкая', 'linear-gradient(135deg,#2a2b2e 50%,#cfc9b8 50%)']];
  return `<header class="ph"><div><h2>Настройки</h2><p>Оформление и поведение приложения.</p></div></header>
  <div class="card"><div class="themes">${th.map(([k, n, c]) => `<button class="th ${t === k ? 'on' : ''}" data-th="${k}"><i style="background:${c}"></i>${n}</button>`).join('')}</div></div>
  <div class="card"><div class="op"><div>Прозрачность окна<span style="display:block;color:var(--muted);font-size:.85rem">Насколько просвечивает окно Crysea: <b id="v-op" style="color:var(--text)">${S.settings.opacity}%</b></span></div><input type="range" id="op" min="40" max="100" value="${S.settings.opacity}" aria-label="Прозрачность окна"></div></div>
  <div class="card"><div class="setr"><div>Запускать вместе с Windows<span>Откроется свёрнутым в трей</span></div>${sw('as', S.settings.autostart, '')}</div>
  <div class="setr"><div>Сворачивать в трей при закрытии<span>Эффект продолжит работать</span></div>${sw('ct', S.settings.closeToTray, '')}</div></div>
  ${vHotkeys()}
  ${vSession()}`;
}
let crmsg = '', crok = false;
function vCreator() {
  const a = S.account, pm = a && a.promo;
  if (!a) return `<div class="card creator"><div class="ico"><svg class="ic"><use href="#i-gift"/></svg></div><div><b class="ct">Код автора</b><p class="tip">Войдите в аккаунт выше, чтобы применить код автора. Скидка применится к цене тарифа сама.</p></div></div>`;
  return `<div class="card creator"><div class="ico"><svg class="ic"><use href="#i-gift"/></svg></div>
  <div><b class="ct">Код автора</b><p class="tip">Из видео автора или из Discord. Скидка применится к цене тарифа сама, на странице оплаты вводить ничего не нужно.</p></div>
  <div class="crf"><input type="text" id="crin" maxlength="24" placeholder="Код автора" value="${pm ? esc(pm.code) : ''}" ${pm ? 'readonly' : ''} aria-label="Код автора"><button class="btn p" id="crbtn">${pm ? 'Убрать код' : 'Применить'}</button></div>
  <em class="am ${crok ? 'ok' : ''}" id="crm">${pm ? 'Код ' + esc(pm.code) + ': скидка ' + pm.percent + '%' : esc(crmsg)}</em></div>`;
}
function vPresets() {
  const P = S.settings.profiles;
  return `<div class="card" id="pres"><div class="cch"><b class="ct">Пресеты</b><div class="acl" style="margin:0"><button class="btn p" id="prgo">Открыть пресеты</button>${S.account ? '<button class="btn" id="prsite">На сайте</button>' : ''}</div></div>
  ${P.length ? `<div class="stats">${P.map((p) => `<div class="st"><span>${esc(p.exe)}</span><b>${esc(p.name)} · ${p.sat}%</b></div>`).join('')}</div>` : '<p class="tip">Пока нет пресетов. Игровые профили появятся здесь и на сайте в кабинете после синхронизации.</p>'}</div>`;
}
function vSession() {
  return S.account ? `<div class="card"><div class="setr"><div>Аккаунт<span>${esc(S.account.email)}</span></div><button class="btn" id="sout"><svg class="ic"><use href="#i-out"/></svg>Выйти</button></div></div>` : '';
}
const HK = [['display', 'Включить или выключить эффект экрана'], ['cross', 'Показать или скрыть прицел'], ['module', 'Запустить основной модуль Rust']];
const hkShow = (a) => (a ? a.replace('Control', 'Ctrl') : 'не задано');
function vHotkeys() {
  const h = S.settings.hotkeys;
  return `<div class="card"><b class="ct">Горячие клавиши</b>${HK.map(([k, t]) => `<div class="setr"><div>${t}${S.hkErr && S.hkErr[k] ? `<span style="color:#ff7b7b">${S.hkErr[k]}</span>` : ''}</div>
    <div class="acl" style="margin:0"><button class="btn hk" data-hk="${k}">${hkShow(h[k])}</button><button class="btn" data-hkc="${k}" aria-label="Очистить">×</button></div></div>`).join('')}
    <p class="tip">Нажмите на кнопку и введите своё сочетание, например Ctrl+Alt+K. Esc отменяет.</p></div>`;
}
const accel = (e) => {
  const c = e.code, key = /^Key[A-Z]$/.test(c) ? c.slice(3) : /^Digit\d$/.test(c) ? c.slice(5) : /^F\d{1,2}$/.test(c) ? c : null; if (!key) return null;
  const m = []; if (e.ctrlKey) m.push('Control'); if (e.altKey) m.push('Alt'); if (e.shiftKey) m.push('Shift'); if (e.metaKey) m.push('Super');
  return !m.length && !/^F/.test(key) ? null : [...m, key].join('+');
};
function bExtras() {
  const cb = $('#crbtn');
  if (cb) {
    const go = async () => {
      const off = S.account && S.account.promo, code = $('#crin').value.trim(), m = $('#crm');
      if (!off && !code) { crok = false; crmsg = 'Введите код автора'; m.textContent = crmsg; m.classList.remove('ok'); return; }
      cb.disabled = true;
      const r = await api.auth({ kind: 'promo', code: off ? '' : code });
      if (r.state) S = r.state;
      crok = !!r.ok; crmsg = r.ok ? '' : r.error; render();
    };
    cb.onclick = go; $('#crin').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  }
  const pg = $('#prgo'); if (pg) pg.onclick = () => { tab = 'profiles'; render(); };
  const ps = $('#prsite'); if (ps) ps.onclick = () => api.open('presets');
}
function bSettings() {
  document.querySelectorAll('.hk').forEach((b) => (b.onclick = () => {
    b.textContent = 'Нажмите сочетание…';
    const stop = () => document.removeEventListener('keydown', on, true);
    const on = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') { stop(); return render(); }
      const a = accel(e); if (!a) return; stop();
      api.settings({ hotkeys: { [b.dataset.hk]: a } }).then((s) => { S = s; render(); });
    };
    document.addEventListener('keydown', on, true);
  }));
  document.querySelectorAll('[data-hkc]').forEach((b) => (b.onclick = () => api.settings({ hotkeys: { [b.dataset.hkc]: '' } }).then((s) => { S = s; render(); })));
  V.onclick = (e) => { const b = e.target.closest('[data-th]'); if (b) api.settings({ theme: b.dataset.th }).then((s) => { S = s; applyTheme(); render(); }); };
  let ot; $('#op').oninput = (e) => { const v = +e.target.value; $('#v-op').textContent = v + '%'; S.settings.opacity = v; clearTimeout(ot); ot = setTimeout(() => api.settings({ opacity: v }).then((s) => (S = s)), 30); };
  $('#as').onchange = (e) => api.settings({ autostart: e.target.checked }).then((s) => (S = s));
  $('#ct').onchange = (e) => api.settings({ closeToTray: e.target.checked }).then((s) => (S = s));
  const so = $('#sout'); if (so) so.onclick = async () => { const r = await api.auth({ kind: 'logout' }); if (r.state) S = r.state; applyTheme(); render(); };
}

const VIEWS = { display: [vDisplay, bDisplay], profiles: [vProfiles, bProfiles], crosshair: [vCross, bCross], optimize: [vOptimize, bOptimize], rust: [vRust, bRust], profile: [vProfile, bProfile], settings: [vSettings, bSettings] };
const applyTheme = () => (document.documentElement.dataset.theme = S.settings.theme);
function render() {
  closePicker(); rustCleanup(); V.onclick = V.onchange = V.oninput = V.onkeydown = null;
  document.querySelectorAll('.nb').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
  const f = FEAT[tab];
  if (f && !S.can[f]) { V.innerHTML = `<header class="ph"><div><h2>${PAYWALL[f][0]}</h2></div></header>` + paywall(f); bindPaywall(); }
  else { V.innerHTML = VIEWS[tab][0](); VIEWS[tab][1](); }
  updMe(); markLocks();
}
api.state().then((s) => { S = s; applyTheme(); render(); });
api.onState((s) => {
  S = s; applyTheme();
  if (tab === 'crosshair') { const e = $('#cen'); if (e) { e.checked = s.settings.crosshair.enabled; if (C) C.enabled = e.checked; } return; }
  if (tab === 'profiles' || tab === 'display' || tab === 'settings' || tab === 'profile' || FEAT[tab]) { const f = document.activeElement; if (!f || f.tagName !== 'INPUT') render(); }
});
