const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, nativeImage, screen, safeStorage, shell, clipboard, dialog } = require('electron');
const crypto = require('crypto');
const path = require('path'), fs = require('fs'), os = require('os');
const { spawn, execFile } = require('child_process');

const WIN = process.platform === 'win32';
const THEMES = ['dark', 'light', 'soft'], BG = { dark: '#121212', light: '#f2f2f2', soft: '#002d40' };
const AVC = ['#e5484d', '#f5a524', '#3dd68c', '#3b9eff', '#a78bfa', '#ec6aa5'];
const ICON = path.join(__dirname, 'build', 'icon.png');
const RUST_CMDS = [{ line: 'gc.buffer 4096', on: true }, { line: 'effects.maxgibs 0', on: true }, { line: 'graphics.fov 90', on: true },
  { line: 'graphics.lodbias 0.25', on: false }, { line: 'bind p gc.collect', on: false }];
const DEF = { theme: 'dark', opacity: 100, updated: 0,
  hotkeys: { display: 'Control+Alt+S', cross: 'Control+Alt+C', module: '' },
  modules: [{ id: 'm_rust', name: 'Rust: максимум FPS', actions: ['power', 'gamemode', 'dns', 'gamedvr', 'boost'], procs: [] }],
  rust: { lo: { window: 'exclusive', high: true, malloc: true, nolog: true, nopopup: false, d3d11: false, fl11: false, maxMem: 0, cpuCount: 0, exThreads: 0, gc: 4096, extra: '' },
    cmds: RUST_CMDS, remind: 60, lastRemind: 0, path: '', main: 'm_rust', autoStart: false, beforePlay: true }, profile: { name: 'Игрок', color: AVC[3] }, autostart: false, closeToTray: true, auto: true,
  display: { enabled: true, sat: 150, contrast: 100, bright: 0 }, profiles: [],
  crosshair: { enabled: false, color: '#ffffff', opacity: 100, lines: true, length: 10, thickness: 2, gap: 5, tStyle: false,
    dot: false, dotSize: 3, dotRound: false, circle: false, radius: 14, ring: 2,
    outline: true, outlineW: 1, outlineColor: '#000000', offX: 0, offY: 0 } };
let S, win, ov, tray, mag, active = null, quitting = false, saveT;

const file = () => path.join(app.getPath('userData'), 'settings.json');
const clamp = (v, a, b) => Math.min(b, Math.max(a, Number(v) || 0));
function load() {
  try {
    const j = JSON.parse(fs.readFileSync(file(), 'utf8'));
    return { ...DEF, ...j, display: { ...DEF.display, ...j.display }, profiles: Array.isArray(j.profiles) ? j.profiles : [],
      crosshair: cleanCross(j.crosshair || {}, DEF.crosshair),
      theme: THEMES.includes(j.theme) ? j.theme : 'dark', opacity: clamp(j.opacity ?? 100, 40, 100), updated: Number(j.updated) || 0,
      hotkeys: cleanHotkeys(j.hotkeys), modules: j.modules === undefined ? DEF.modules : cleanModules(j.modules), rust: cleanRust(j.rust, DEF.rust),
      profile: { name: String((j.profile && j.profile.name) || DEF.profile.name).slice(0, 24), color: AVC.includes(j.profile && j.profile.color) ? j.profile.color : DEF.profile.color } };
  } catch { return JSON.parse(JSON.stringify(DEF)); }
}
function save(skipSync) { if (!skipSync) { S.updated = Date.now(); queueSync(); } clearTimeout(saveT); saveT = setTimeout(() => fs.writeFile(file(), JSON.stringify(S, null, 2), () => {}), 300); }

/* ---------- Цвет экрана ---------- */
// Матрица 5x5 (строки = вход R,G,B,A,1): насыщенность -> контраст -> яркость
function matrix(sat, con, bri) {
  const s = sat / 100, c = con / 100, o = 0.5 * (1 - c) + bri / 100, L = [0.3086, 0.6094, 0.082], m = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    let v = 0;
    if (i < 3 && j < 3) v = (L[i] * (1 - s) + (i === j ? s : 0)) * c;
    else if (i === j) v = 1;
    else if (i === 4 && j < 3) v = o;
    m.push(v);
  }
  return m;
}
function startMag() {
  if (!WIN) return;
  const script = path.join(__dirname, 'native', 'mag.ps1').replace('app.asar', 'app.asar.unpacked');
  mag = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script],
    { windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] });
  mag.on('error', () => { mag = null; });
  mag.on('exit', () => { mag = null; });
  mag.stdin.on('error', () => {});
}
const send = (l) => { if (mag && mag.stdin.writable) mag.stdin.write(l + '\n'); };
const eff = () => active || (S.display.enabled ? S.display : null);
function apply() {
  const d = eff();
  send(d ? 'm ' + matrix(d.sat, d.contrast ?? 100, d.bright ?? 0).map((x) => x.toFixed(5)).join(',') : 'reset');
}
const state = () => ({ settings: S, active: active && active.id, supported: WIN, magOk: !!mag, account: acct, syncAt, syncErr,
  plan: curPlan(), can: Object.fromEntries(Object.keys(FEATURES).map((k) => [k, can(k)])), need: FEATURES, licExp: lic && lic.exp, hkErr });
function push() { if (win && !win.isDestroyed()) win.webContents.send('state', state()); trayMenu(); }
function toggle() { S.display.enabled = !S.display.enabled; apply(); save(); push(); return state(); }

/* ---------- Прицел (оверлей поверх игры) ---------- */
const CNUM = { opacity: [10, 100], length: [0, 60], thickness: [1, 12], gap: [0, 30], dotSize: [1, 20], radius: [3, 80], ring: [1, 8],
  outlineW: [0, 4], offX: [-200, 200], offY: [-200, 200] };
const CBOOL = ['enabled', 'lines', 'tStyle', 'dot', 'dotRound', 'circle', 'outline'];
const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : d);
function cleanCross(p, base) {
  const o = { ...base };
  for (const k in CNUM) if (p[k] != null) o[k] = Math.round(clamp(p[k], CNUM[k][0], CNUM[k][1]));
  for (const k of CBOOL) if (p[k] != null) o[k] = !!p[k];
  if (p.color != null) o.color = hex(p.color, o.color);
  if (p.outlineColor != null) o.outlineColor = hex(p.outlineColor, o.outlineColor);
  return o;
}
const OVSIZE = 400;
function ovBounds() {
  const d = screen.getPrimaryDisplay(), c = S.crosshair, f = d.scaleFactor || 1, b = d.bounds;
  return { x: Math.round(b.x + b.width / 2 - OVSIZE / 2 + c.offX / f), y: Math.round(b.y + b.height / 2 - OVSIZE / 2 + c.offY / f), width: OVSIZE, height: OVSIZE };
}
function overlay() {
  const c = S.crosshair;
  if (!c.enabled || !can('crosshair')) { if (ov && !ov.isDestroyed()) ov.destroy(); ov = null; return; }
  if (!ov || ov.isDestroyed()) {
    ov = new BrowserWindow({ ...ovBounds(), transparent: true, frame: false, resizable: false, movable: false, focusable: false,
      skipTaskbar: true, hasShadow: false, show: false, alwaysOnTop: true,
      webPreferences: { preload: path.join(__dirname, 'overlay-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    ov.setIgnoreMouseEvents(true);
    ov.setAlwaysOnTop(true, 'screen-saver');
    ov.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));
    ov.once('ready-to-show', () => { if (ov && !ov.isDestroyed()) ov.showInactive(); });
    ov.on('closed', () => { ov = null; });
  } else { ov.setBounds(ovBounds()); ov.webContents.send('cross', c); }
}
function toggleCross() { if (!can('crosshair')) return state(); S.crosshair.enabled = !S.crosshair.enabled; overlay(); save(); push(); return state(); }

/* ---------- Профили игр ---------- */
const procs = () => new Promise((r) => {
  if (!WIN) return r([]);
  execFile('tasklist', ['/fo', 'csv', '/nh'], { windowsHide: true, maxBuffer: 1 << 25 }, (e, o) =>
    r(e ? [] : [...new Set((o.match(/^"([^"]+)"/gm) || []).map((s) => s.slice(1, -1).toLowerCase()))].sort()));
});
function boost(exe) {
  const n = exe.replace(/\.exe$/i, '');
  execFile('powershell.exe', ['-NoProfile', '-Command',
    `Get-Process -Name '${n}' -ErrorAction SilentlyContinue | ForEach-Object { $_.PriorityClass='High' }`], { windowsHide: true }, () => {});
}
let rustWas = false;
async function watch() {
  if (!WIN) return;
  if (ov && !can('crosshair')) overlay();
  const wantP = S.auto && S.profiles.length && can('profiles'), wantR = S.rust.autoStart && can('rustAuto');
  if (!wantP && !wantR) { if (active) { active = null; apply(); push(); } rustWas = false; return; }
  const list = await procs();
  if (wantR) {
    const r = list.includes('rustclient.exe');
    if (r && !rustWas) runModule(S.modules.find((x) => x.id === S.rust.main) || null);
    rustWas = r;
  }
  const p = wantP ? S.profiles.find((x) => list.includes(x.exe.toLowerCase())) : null;
  if ((active && active.id) !== (p && p.id)) { active = p || null; apply(); if (p && p.prio) boost(p.exe); push(); }
}

const cleanProfiles = (list) => (Array.isArray(list) ? list : []).filter((p) => /^[\w.\- ]{1,60}\.exe$/i.test(p.exe || '')).slice(0, 50).map((p) => ({
  id: String(p.id || Date.now() + Math.random()), name: String(p.name || p.exe).slice(0, 40), exe: p.exe,
  sat: clamp(p.sat, 0, 300), contrast: clamp(p.contrast ?? 100, 50, 150), bright: clamp(p.bright, -30, 30), prio: !!p.prio }));

/* ---------- Аккаунт и облачная синхронизация ----------
   Тот же сервер (crysea-site/server) обслуживает и сайт. Адрес берётся из config.json. */
let CFG = { apiUrl: 'https://crysea.vercel.app/api', siteUrl: 'https://crysea.vercel.app', discordUrl: 'https://discord.gg/YOUR_INVITE', licenseKey: '' };
try { Object.assign(CFG, require('./config.json')); } catch {}
const API_URL = String(CFG.apiUrl).replace(/\/$/, '');

/* ---------- Лицензия и тарифы ----------
   Сервер подписывает тариф ключом Ed25519, приложение проверяет подпись публичным ключом из config.json.
   Подписанная лицензия живёт 7 дней офлайн; изменить тариф правкой файлов на ПК нельзя. */
const FEATURES = { profiles: 'pro', crosshair: 'pro', optimize: 'pro', rust: 'pro', rustAuto: 'plus', raid: 'plus' };
const RANK = { free: 0, pro: 1, plus: 2 };
let lic = null;
const licFile = () => path.join(app.getPath('userData'), 'license.json');
function verifyLic(l) {
  try {
    if (!l || !l.payload) return null;
    if (CFG.licenseKey) {
      const key = crypto.createPublicKey({ key: Buffer.from(CFG.licenseKey, 'base64'), format: 'der', type: 'spki' });
      if (!crypto.verify(null, Buffer.from(l.payload), key, Buffer.from(l.sig || '', 'base64'))) return null;
    }
    return JSON.parse(l.payload);
  } catch { return null; }
}
function setLic(l, user) {
  let p = verifyLic(l), raw = l;
  if (!p && !CFG.licenseKey && user) { p = { email: user.email, plan: user.plan, until: user.until, exp: Date.now() + 7 * 864e5 }; raw = { payload: JSON.stringify(p), sig: '' }; } // режим разработки без ключа
  lic = p;
  try { if (p) fs.writeFileSync(licFile(), JSON.stringify(raw)); else fs.rmSync(licFile(), { force: true }); } catch {}
}
function loadLic() { try { lic = verifyLic(JSON.parse(fs.readFileSync(licFile(), 'utf8'))); } catch { lic = null; } }
function curPlan() {
  if (!acct || !lic || lic.email !== acct.email) return 'free';
  const n = Date.now();
  if (n > lic.exp || (lic.until && n > Date.parse(lic.until))) return 'free';
  return RANK[lic.plan] != null ? lic.plan : 'free';
}
const can = (f) => RANK[curPlan()] >= RANK[FEATURES[f]];
let token = null, acct = null, syncAt = 0, syncErr = '', syncT, syncBusy = false, lastTry = 0;
const ERR = { taken: 'Этот email уже зарегистрирован', bad: 'Неверный email или пароль', mail: 'Введите корректный email', pass: 'Пароль — минимум 6 символов',
  name: 'Введите имя', limit: 'Слишком много попыток, подождите несколько минут', net: 'Нет связи с сервером', auth: 'Сессия истекла, войдите снова', promo_bad: 'Такого кода нет', promo_used: 'Лимит этого кода исчерпан' };
const tokFile = () => path.join(app.getPath('userData'), 'token.bin');
function loadToken() { try { const b = fs.readFileSync(tokFile()); token = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(b) : b.toString('utf8'); } catch { token = null; } }
function saveToken(t) {
  token = t;
  try { if (!t) return fs.rmSync(tokFile(), { force: true }); fs.writeFileSync(tokFile(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(t) : Buffer.from(t)); } catch {}
}
async function call(method, p, body) {
  let r;
  try {
    r = await fetch(API_URL + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000) });
  } catch { throw new Error('net'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'net'); e.status = r.status; throw e; }
  return j;
}
const pack = () => ({ profile: S.profile, theme: S.theme, display: S.display, profiles: S.profiles, crosshair: S.crosshair, modules: S.modules, rust: { ...S.rust, path: undefined } });
function applyCloud(d, ts) {
  if (!d || typeof d !== 'object') return;
  if (d.profile) S.profile = { name: String(d.profile.name || S.profile.name).slice(0, 24), color: AVC.includes(d.profile.color) ? d.profile.color : S.profile.color };
  if (THEMES.includes(d.theme)) S.theme = d.theme;
  if (d.display) S.display = { enabled: !!d.display.enabled, sat: clamp(d.display.sat, 0, 300), contrast: clamp(d.display.contrast ?? 100, 50, 150), bright: clamp(d.display.bright, -30, 30) };
  if (Array.isArray(d.profiles)) S.profiles = cleanProfiles(d.profiles);
  if (d.crosshair) S.crosshair = cleanCross(d.crosshair, S.crosshair);
  if (Array.isArray(d.modules)) S.modules = cleanModules(d.modules);
  if (d.rust) S.rust = cleanRust(d.rust, S.rust);
  S.updated = ts; active = active ? S.profiles.find((x) => x.id === active.id) || null : null;
  apply(); overlay(); save(true);
}
// mode: 'cloud' - облако главнее (вход), 'now' - без ограничения частоты (после изменений), без аргумента - фоновая проверка
let again = false;
async function sync(mode) {
  const preferCloud = mode === 'cloud';
  if (!token) return;
  if (syncBusy) { if (mode) again = true; return; }
  if (!mode && Date.now() - lastTry < 8000) return;
  syncBusy = true; lastTry = Date.now();
  try {
    const me = await call('GET', '/me'); acct = me.user; setLic(me.license, me.user);
    const r = await call('GET', '/sync');
    if (r.data && (preferCloud || r.updated > S.updated)) applyCloud(r.data, r.updated);
    else if (S.updated >= r.updated) { if (!S.updated) S.updated = Date.now(); await call('PUT', '/sync', { data: pack(), updated: S.updated }); }
    syncAt = Date.now(); syncErr = '';
  } catch (e) {
    syncErr = ERR[e.message] || 'Ошибка синхронизации';
    if (e.status === 401) { saveToken(null); acct = null; setLic(null); }
  }
  syncBusy = false; push();
  if (again) { again = false; sync('now'); }
}
function queueSync() { clearTimeout(syncT); if (token) syncT = setTimeout(() => sync('now'), 2500); }
let oaSeq = 0;
const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');
/* Вход через Discord/Google: открываем браузер, потом опрашиваем сервер с секретом устройства (секрет в браузер не попадает, туда уходит только его хэш) */
async function oauthLogin(prov) {
  if (!['discord', 'google'].includes(prov)) return { ok: false, error: 'Неизвестный способ входа', state: state() };
  const my = ++oaSeq;
  let cfg; try { cfg = await call('GET', '/config'); } catch { return { ok: false, error: ERR.net, state: state() }; }
  if (!(cfg.oauth && cfg.oauth[prov])) return { ok: false, error: 'Вход через ' + (prov === 'google' ? 'Google' : 'Discord') + ' пока не подключён', state: state() };
  const secret = crypto.randomBytes(32).toString('hex');
  shell.openExternal(API_URL + '/auth/' + prov + '/start?device=' + sha256(secret));
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    if (my !== oaSeq) return { ok: false, error: '', state: state() }; // начат другой вход или отмена
    let j; try { j = await call('POST', '/auth/poll', { device: secret }); } catch (e) { if (e.message === 'limit') break; continue; }
    if (j.token) {
      saveToken(j.token); acct = j.user; setLic(null);
      await sync('cloud'); push();
      return syncErr ? { ok: false, error: syncErr, state: state() } : { ok: true, state: state() };
    }
  }
  return my === oaSeq ? { ok: false, error: 'Время ожидания входа истекло, попробуйте ещё раз', state: state() } : { ok: false, error: '', state: state() };
}
async function auth(p) {
  try {
    if (p.kind === 'oauth') return await oauthLogin(p.provider);
    if (p.kind === 'oauth-cancel') { oaSeq++; return { ok: false, error: '', state: state() }; }
    if (p.kind === 'logout') { oaSeq++; try { await call('POST', '/logout'); } catch {} saveToken(null); acct = null; lic = null; setLic(null); syncAt = 0; syncErr = ''; }
    else if (p.kind === 'sync') { if (!token) return { ok: false, error: ERR.auth, state: state() }; await sync('now'); if (syncErr) return { ok: false, error: syncErr, state: state() }; }
    else if (p.kind === 'promo') {
      if (!token) return { ok: false, error: ERR.auth, state: state() };
      const j = await call('POST', '/promo', { code: String(p.code || '').trim().slice(0, 24) }); acct = j.user; syncErr = '';
    }
    else {
      const j = await call('POST', p.kind === 'register' ? '/register' : '/login', { email: p.email, name: p.name, password: p.password });
      saveToken(j.token); acct = j.user; setLic(null);
      if (p.kind === 'register') { S.profile.name = String(j.user.name).slice(0, 24); save(); await sync('now'); }
      else await sync('cloud');
      if (syncErr) return { ok: false, error: syncErr, state: state() };
    }
    push(); return { ok: true, state: state() };
  } catch (e) { return { ok: false, error: ERR[e.message] || 'Ошибка сервера', state: state() }; }
}

/* ---------- Проверка пользовательских данных ---------- */
const txt = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n);
const ascii = (s, n) => String(s == null ? '' : s).replace(/[^\x20-\x7E]/g, '').trim().slice(0, n);
const MOD_ACT = ['power', 'gamemode', 'dns', 'temp', 'gamedvr', 'boost'];
const BLOCK = new Set(['explorer.exe', 'svchost.exe', 'csrss.exe', 'winlogon.exe', 'wininit.exe', 'services.exe', 'lsass.exe', 'smss.exe', 'dwm.exe', 'taskmgr.exe',
  'powershell.exe', 'cmd.exe', 'conhost.exe', 'steam.exe', 'steamservice.exe', 'rustclient.exe', 'easyanticheat.exe', 'easyanticheat_eos.exe', 'electron.exe', 'crysea.exe', 'optix.exe']);
const okProc = (e) => /^[\w.\- ]{1,60}\.exe$/i.test(e) && !BLOCK.has(e.toLowerCase()) && e.toLowerCase() !== path.basename(process.execPath).toLowerCase();
function cleanModules(list) {
  return (Array.isArray(list) ? list : []).slice(0, 20).map((m) => ({
    id: txt(m.id, 40) || 'm_' + Math.random().toString(36).slice(2, 9), name: txt(m.name, 30) || 'Модуль',
    actions: [...new Set((Array.isArray(m.actions) ? m.actions : []).filter((a) => MOD_ACT.includes(a)))],
    procs: (Array.isArray(m.procs) ? m.procs : []).slice(0, 30).filter((p) => okProc(String(p.exe || ''))).map((p) => ({ exe: String(p.exe), mode: p.mode === 'close' ? 'close' : 'lower' })) }));
}
const WMODE = ['', 'exclusive', 'borderless'], GCV = [0, 1024, 2048, 4096, 8192], REM = [0, 30, 60, 180, 1440];
function cleanRust(r, base) {
  r = r && typeof r === 'object' ? r : {};
  const o = JSON.parse(JSON.stringify(base)), lo = r.lo && typeof r.lo === 'object' ? r.lo : {};
  if (lo.window != null) o.lo.window = WMODE.includes(lo.window) ? lo.window : '';
  for (const k of ['high', 'malloc', 'nolog', 'nopopup', 'd3d11', 'fl11']) if (lo[k] != null) o.lo[k] = !!lo[k];
  for (const k of ['maxMem', 'cpuCount', 'exThreads']) if (lo[k] != null) o.lo[k] = Math.round(clamp(lo[k], 0, 262144));
  if (lo.gc != null) o.lo.gc = GCV.includes(Number(lo.gc)) ? Number(lo.gc) : 0;
  if (lo.extra != null) o.lo.extra = ascii(lo.extra, 200);
  if (Array.isArray(r.cmds)) o.cmds = r.cmds.slice(0, 40).map((c) => ({ line: ascii(c && c.line, 80), on: !!(c && c.on) })).filter((c) => c.line);
  if (r.remind != null) o.remind = REM.includes(Number(r.remind)) ? Number(r.remind) : 0;
  if (r.lastRemind != null) o.lastRemind = Number(r.lastRemind) || 0;
  if (r.path != null) o.path = typeof r.path === 'string' && /RustClient\.exe$/i.test(r.path) && !/[\u0000-\u001f"<>|]/.test(r.path) ? r.path.slice(0, 260) : '';
  if (r.main != null) o.main = txt(r.main, 40);
  if (r.autoStart != null) o.autoStart = !!r.autoStart;
  if (r.beforePlay != null) o.beforePlay = !!r.beforePlay;
  return o;
}
const ACC = /^(?:(?:Control|Alt|Shift|Super)\+){0,3}(?:[A-Z0-9]|F(?:[1-9]|1\d|2[0-4]))$/;
function cleanHotkeys(h) {
  const o = { ...DEF.hotkeys }; h = h && typeof h === 'object' ? h : {};
  for (const k of Object.keys(o)) if (h[k] != null) o[k] = typeof h[k] === 'string' && ACC.test(h[k]) && (h[k].includes('+') || /^F\d/.test(h[k])) ? h[k] : '';
  return o;
}
let hkErr = {};
function regHotkeys() {
  globalShortcut.unregisterAll(); hkErr = {};
  const map = { display: toggle, cross: toggleCross, module: () => { if (can('rust')) runModule(S.modules.find((x) => x.id === S.rust.main) || null); } }, seen = new Set();
  for (const k in map) {
    const a = S.hotkeys[k]; if (!a) continue;
    if (seen.has(a)) { hkErr[k] = 'Уже занято другим действием'; continue; } seen.add(a);
    let ok = false; try { ok = globalShortcut.register(a, map[k]); } catch {}
    if (!ok) hkErr[k] = 'Сочетание занято другой программой';
  }
}

/* ---------- Оптимизация ---------- */
const run = (cmd, args, ok) => new Promise((r) =>
  execFile(cmd, args, { windowsHide: true }, (e) => r(e ? { ok: false, msg: 'Не удалось выполнить. Попробуйте запустить Crysea от имени администратора.' } : { ok: true, msg: ok })));
const OPT = {
  power: () => run('powercfg', ['/setactive', '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'], 'Включена схема «Высокая производительность»'),
  gamemode: () => run('reg', ['add', 'HKCU\\Software\\Microsoft\\GameBar', '/v', 'AllowAutoGameMode', '/t', 'REG_DWORD', '/d', '1', '/f'], 'Игровой режим Windows включён'),
  dns: () => run('ipconfig', ['/flushdns'], 'Кэш DNS очищен'),
  temp: async () => {
    const dir = os.tmpdir(); let n = 0;
    for (const f of fs.readdirSync(dir)) { try { fs.rmSync(path.join(dir, f), { recursive: true, force: true }); n++; } catch {} }
    return { ok: true, msg: `Временные файлы очищены: ${n} объектов` };
  },
};

const REGS = { fso: { key: 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers', data: '~ DISABLEDXMAXIMIZEDWINDOWEDMODE', t: 'Оптимизация во весь экран для Rust' },
  gpu: { key: 'HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences', data: 'GpuPreference=2;', t: 'Высокопроизводительная видеокарта для Rust' } };
const rustExe = () => (S.rust.path && /RustClient\.exe$/i.test(S.rust.path) && fs.existsSync(S.rust.path) ? S.rust.path : '');
async function rustReg(id, on) {
  const r = REGS[id], p = rustExe();
  if (!r) return { ok: false, msg: 'Неизвестная настройка' };
  if (!p) return { ok: false, msg: 'Сначала укажите путь к RustClient.exe' };
  if (on) return run('reg', ['add', r.key, '/v', p, '/t', 'REG_SZ', '/d', r.data, '/f'], 'Применено: ' + (id === 'fso' ? 'полноэкранные оптимизации Windows отключены для Rust' : 'Rust будет использовать мощную видеокарту'));
  await run('reg', ['delete', r.key, '/v', p, '/f'], ''); return { ok: true, msg: 'Сброшено к настройкам Windows по умолчанию' };
}
function detectRust() {
  const rel = 'steamapps\\common\\Rust\\RustClient.exe', bases = [];
  for (const L of 'CDEFGH') bases.push(`${L}:\\Program Files (x86)\\Steam`, `${L}:\\Steam`, `${L}:\\SteamLibrary`, `${L}:\\Games\\Steam`, `${L}:\\Games\\SteamLibrary`);
  return bases.map((b) => b + '\\' + rel).find((p) => { try { return fs.existsSync(p); } catch { return false; } }) || '';
}
const ACT = {
  power: OPT.power, gamemode: OPT.gamemode, dns: OPT.dns, temp: OPT.temp,
  gamedvr: async () => {
    const a = await run('reg', ['add', 'HKCU\\System\\GameConfigStore', '/v', 'GameDVR_Enabled', '/t', 'REG_DWORD', '/d', '0', '/f'], '');
    const b = await run('reg', ['add', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR', '/v', 'AppCaptureEnabled', '/t', 'REG_DWORD', '/d', '0', '/f'], '');
    return a.ok && b.ok ? { ok: true, msg: 'Фоновая запись игр (Game DVR) отключена' } : { ok: false, msg: 'Game DVR: не удалось изменить' };
  },
  boost: async () => { boost('RustClient.exe'); return { ok: true, msg: 'Приоритет Rust: High (если игра запущена)' }; },
};
/* Запуск пользовательского модуля: набор действий + свои программы (закрыть или понизить приоритет) */
async function runModule(m) {
  if (!WIN) return { ok: false, msg: 'Доступно только в Windows' };
  const lines = [];
  for (const a of m ? m.actions : ['power', 'gamemode', 'boost']) { if (!ACT[a]) continue; const r = await ACT[a](); lines.push((r.ok ? '✓ ' : '✕ ') + r.msg); }
  for (const p of m ? m.procs : []) {
    if (!okProc(p.exe)) continue;
    if (p.mode === 'close') { const r = await run('taskkill', ['/F', '/IM', p.exe], ''); lines.push(r.ok ? '✓ Закрыто: ' + p.exe : '— Не запущено или нет прав: ' + p.exe); }
    else {
      const n = p.exe.replace(/\.exe$/i, '').replace(/'/g, "''");
      await run('powershell.exe', ['-NoProfile', '-Command', `Get-Process -Name '${n}' -ErrorAction SilentlyContinue | ForEach-Object { $_.PriorityClass='BelowNormal' }`], '');
      lines.push('✓ Низкий приоритет: ' + p.exe);
    }
  }
  return { ok: true, msg: lines.join('\n') || 'Модуль пустой: добавьте действия' };
}

/* ---------- Окно и трей ---------- */
function showWin() { if (!win) return; win.show(); win.focus(); }
function trayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Открыть Crysea', click: showWin },
    { label: S.display.enabled ? 'Выключить эффект' : 'Включить эффект', click: toggle },
    { label: S.crosshair.enabled ? 'Выключить прицел' : 'Включить прицел', click: toggleCross },
    { type: 'separator' }, { label: 'Выход', click: () => app.quit() },
  ]));
}
function createWindow() {
  win = new BrowserWindow({ width: 1280, height: 860, useContentSize: true, resizable: false, maximizable: false, fullscreenable: false, frame: false, show: false,
    backgroundColor: BG[S.theme] || '#121212', icon: ICON,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.setOpacity(S.opacity / 100);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => { if (!process.argv.includes('--hidden')) win.show(); });
  win.on('focus', () => sync());
  win.on('close', (e) => { if (!quitting && S.closeToTray) { e.preventDefault(); win.hide(); } });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', showWin);
  app.whenReady().then(() => {
    S = load(); loadToken(); loadLic(); if (token && lic) acct = { email: lic.email, name: S.profile.name, plan: lic.plan, until: lic.until }; startMag(); apply(); createWindow(); overlay(); sync();
    screen.on('display-metrics-changed', () => { if (ov) overlay(); });
    tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
    tray.setToolTip('Crysea'); tray.on('click', showWin); trayMenu();
    regHotkeys();
    setInterval(watch, 4000); setInterval(() => sync(), 60000);

    ipcMain.handle('state', () => state());
    ipcMain.handle('display', (_, p) => {
      const d = S.display;
      if (p.sat != null) d.sat = clamp(p.sat, 0, 300);
      if (p.contrast != null) d.contrast = clamp(p.contrast, 50, 150);
      if (p.bright != null) d.bright = clamp(p.bright, -30, 30);
      if (p.enabled != null) d.enabled = !!p.enabled;
      apply(); save(); trayMenu(); return state();
    });
    ipcMain.handle('toggle', () => toggle());
    ipcMain.handle('profile', (_, p) => {
      if (p && p.name != null) S.profile.name = String(p.name).slice(0, 24);
      if (p && AVC.includes(p.color)) S.profile.color = p.color;
      save(); return state();
    });
    ipcMain.handle('cross:get', () => S.crosshair);
    ipcMain.handle('crosshair', (_, p) => { if (!can('crosshair')) return state(); S.crosshair = cleanCross(p || {}, S.crosshair); overlay(); save(); trayMenu(); return state(); });
    ipcMain.handle('profiles', (_, list) => {
      if (!can('profiles')) return state();
      S.profiles = cleanProfiles(list);
      active = active ? S.profiles.find((x) => x.id === active.id) || null : null;
      apply(); save(); return state();
    });
    ipcMain.handle('settings', (_, p) => {
      p = p || {};
      if (THEMES.includes(p.theme)) S.theme = p.theme;
      if (p.opacity != null) { S.opacity = Math.round(clamp(p.opacity, 40, 100)); if (win) win.setOpacity(S.opacity / 100); }
      if (p.closeToTray != null) S.closeToTray = !!p.closeToTray;
      if (p.auto != null) { S.auto = !!p.auto; watch(); }
      if (p.autostart != null) { S.autostart = !!p.autostart; app.setLoginItemSettings({ openAtLogin: S.autostart, args: ['--hidden'] }); }
      if (p.hotkeys) { S.hotkeys = cleanHotkeys({ ...S.hotkeys, ...p.hotkeys }); regHotkeys(); }
      save(); return state();
    });
    ipcMain.handle('opt', (_, id) => (!WIN ? { ok: false, msg: 'Доступно только в Windows' } : !can('optimize') ? { ok: false, msg: 'Нужен тариф Pro' } : OPT[id] ? OPT[id]() : { ok: false, msg: 'Неизвестное действие' }));
    ipcMain.handle('running', () => procs());
    ipcMain.handle('auth', (_, p) => auth(p || {}));
    ipcMain.handle('copy', (_, t) => { clipboard.writeText(String(t || '').slice(0, 4000)); return true; });
    ipcMain.handle('open', (_, k) => {
      const site = String(CFG.siteUrl || '').replace(/\/$/, ''), u = k === 'discord' ? CFG.discordUrl : k === 'buy' ? site + '/#pricing' : k === 'presets' ? site + '/account#presets' : k === 'site' ? site : '';
      if (!/^https?:\/\/\S+$/.test(u) || u.includes('YOUR_INVITE')) return false;
      shell.openExternal(u); return true;
    });
    ipcMain.handle('modules', (_, list) => { if (!can('rust')) return state(); S.modules = cleanModules(list); save(); return state(); });
    ipcMain.handle('rust', async (_, p) => {
      p = p || {};
      if (!can('rust')) return { ok: false, msg: 'Нужен тариф Pro', state: state() };
      switch (p.kind) {
        case 'sys': return { ok: true, cpus: os.cpus().length, ramMB: Math.round(os.totalmem() / 1048576), running: (await procs()).includes('rustclient.exe') };
        case 'save': S.rust = cleanRust(p.rust, S.rust); save(); return { ok: true, state: state() };
        case 'detect': S.rust.path = detectRust(); save(); return { ok: !!S.rust.path, msg: S.rust.path ? 'Rust найден' : 'Rust не найден, укажите путь вручную', state: state() };
        case 'browse': {
          const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'RustClient.exe', extensions: ['exe'] }] });
          if (!r.canceled && /RustClient\.exe$/i.test(r.filePaths[0] || '')) { S.rust.path = r.filePaths[0]; save(); return { ok: true, state: state() }; }
          return { ok: false, msg: r.canceled ? '' : 'Выберите файл RustClient.exe', state: state() };
        }
        case 'reg': return { ...(await rustReg(p.id, !!p.on)), state: state() };
        case 'run': return runModule(S.modules.find((x) => x.id === p.id) || null);
        case 'procs': return { ok: true, list: await procs() };
        case 'play': {
          let msg = '';
          if (S.rust.beforePlay && S.rust.main) { const m = S.modules.find((x) => x.id === S.rust.main); if (m) msg = (await runModule(m)).msg; }
          shell.openExternal('steam://rungameid/252490'); return { ok: true, msg: msg || 'Rust запускается через Steam' };
        }
      }
      return { ok: false, msg: 'Неизвестное действие' };
    });
    ipcMain.on('win', (_, a) => { if (a === 'min') win.minimize(); else if (a === 'close') win.close(); });
  });
  app.on('before-quit', () => { quitting = true; });
  app.on('will-quit', () => { globalShortcut.unregisterAll(); send('quit'); });
}
