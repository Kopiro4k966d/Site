/* Настройки сайта. Впишите свою ссылку-приглашение Discord и прямые ссылки на файлы Windows.
   Как получить Crysea-Setup.exe и Crysea-Portable.exe — см. README приложения, раздел «Сборка установщика». */
window.CRYSEA = {
  discord: 'https://discord.gg/YOUR_INVITE',
  download: {
    setup: 'https://github.com/Kopiro4k966d/crysea-releases/releases/latest/download/Crysea-Setup.exe',    /* прямая ссылка на Crysea-Setup.exe (установщик, npm run dist) */
    portable: 'https://github.com/Kopiro4k966d/crysea-releases/releases/latest/download/Crysea-Portable.exe'  /* прямая ссылка на Crysea-Portable.exe (отдельный exe без установки, npm run dist:portable) */
  }
};
document.querySelectorAll('[data-discord]').forEach(function (a) { a.href = window.CRYSEA.discord; });

/* ===== Окно «Скачать»: выбор Setup (установщик) или Portable (.exe без установки) =====
   Общее для главной и кабинета, само строит модалку и не зависит от auth.js. */
(function () {
  const esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  const T = {
    ru: { h: 'Скачать Crysea', s: 'Для Windows 10 и 11, 64-бит.', close: 'Закрыть',
      setT: 'Setup — установщик', setD: 'Ставит Crysea в систему: ярлык, пункт в Пуск, умеет обновляться поверх себя.', rec: 'Рекомендуем',
      porT: 'Portable — без установки', porD: 'Один exe-файл. Можно носить на флешке, ничего не меняет в системе и в реестре.',
      soon: 'Появится после релиза' },
    en: { h: 'Download Crysea', s: 'For Windows 10 and 11, 64-bit.', close: 'Close',
      setT: 'Setup — installer', setD: 'Installs Crysea properly: a shortcut, a Start menu entry, and it can update itself.', rec: 'Recommended',
      porT: 'Portable — no install', porD: 'A single exe file. Carry it on a flash drive, nothing touches the system or the registry.',
      soon: 'Available after release' },
  };
  const lang = function () { try { return localStorage.getItem('crysea_lang') === 'en' ? 'en' : 'ru'; } catch (e) { return 'ru'; } };
  let box;
  function opt(kind, title, desc, icon, rec) {
    const t = T[lang()], url = window.CRYSEA.download && window.CRYSEA.download[kind], dis = !url;
    return '<a class="dlopt' + (dis ? ' dis' : '') + '" href="' + (url ? esc(url) : '#') + '"' + (url ? ' download' : '') + ' data-go="' + kind + '" aria-disabled="' + (dis ? 'true' : 'false') + '">' +
      '<i><svg class="ic"><use href="#' + icon + '"/></svg></i>' +
      '<span><b>' + esc(title) + (rec && !dis ? '<em class="tag">' + esc(t.rec) + '</em>' : '') + '</b><small>' + esc(dis ? t.soon : desc) + '</small></span></a>';
  }
  function paint() {
    const t = T[lang()];
    box.innerHTML = '<div class="md wide dl" role="dialog" aria-modal="true" aria-labelledby="dlT">' +
      '<button class="x" type="button" data-dlx aria-label="' + esc(t.close) + '"><svg class="ic"><use href="#i-x"/></svg></button>' +
      '<h3 id="dlT">' + esc(t.h) + '</h3><p class="sub">' + esc(t.s) + '</p>' +
      '<div class="dlmeth">' + opt('setup', t.setT, t.setD, 'i-dl', true) + opt('portable', t.porT, t.porD, 'i-layers', false) + '</div></div>';
    box.querySelectorAll('[data-go]:not(.dis)').forEach(function (a) { a.addEventListener('click', close); });
    box.querySelectorAll('[data-go].dis').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); }); });
  }
  function build() {
    box = document.createElement('div'); box.className = 'mo'; box.id = 'dlM'; box.hidden = true;
    document.body.appendChild(box);
    box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('[data-dlx]')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box && !box.hidden) close(); });
  }
  function open(e) {
    const trigger = e && e.currentTarget;
    if (e && e.preventDefault) e.preventDefault();
    if (trigger && trigger.getAttribute && trigger.getAttribute('aria-disabled') === 'true') return;
    if (!box) build();
    paint();
    box.hidden = false; document.body.style.overflow = 'hidden';
  }
  function close() { if (box) box.hidden = true; document.body.style.overflow = ''; }
  document.querySelectorAll('[data-dl]').forEach(function (a) { a.addEventListener('click', open); });
  window.CRYSEA.openDownload = open;
})();
