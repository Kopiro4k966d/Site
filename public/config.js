/* Настройки сайта. Впишите свою ссылку-приглашение Discord и ссылку на установщик. */
window.CRYSEA = {
  discord: 'https://discord.gg/YOUR_INVITE',
  download: '' /* прямая ссылка на установщик для Windows, например https://.../Crysea-Setup.exe */
};
document.querySelectorAll('[data-discord]').forEach(function (a) { a.href = window.CRYSEA.discord; });

/* Кнопки «Скачать» ведут на установщик, как только ссылка заполнена */
if (window.CRYSEA.download) document.querySelectorAll('[data-dl]').forEach(function (a) { a.href = window.CRYSEA.download; a.setAttribute('download', ''); });
