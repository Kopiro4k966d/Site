/* Настройки сайта. Впишите свою ссылку-приглашение Discord. */
window.CRYSEA = { discord: 'https://discord.gg/YOUR_INVITE' };
document.querySelectorAll('[data-discord]').forEach(function (a) { a.href = window.CRYSEA.discord; });
