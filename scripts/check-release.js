// Проверка перед сборкой установщика (запускается сама перед `npm run dist`, вручную: `npm run check`).
// Не даёт собрать версию для продажи с тестовыми значениями в config.json.
const fs = require('fs'), path = require('path');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
const bad = [];
if (!cfg.licenseKey || cfg.licenseKey.length < 40) bad.push('licenseKey пуст: без публичного ключа лицензии платные функции в собранной версии не включатся (возьмите ключ из `npm run keys` на стороне сайта).');
if (!/^https:\/\//.test(cfg.apiUrl || '') || /localhost|127\.0\.0\.1/.test(cfg.apiUrl)) bad.push('apiUrl должен быть боевым адресом по https, сейчас: ' + cfg.apiUrl);
if (!/^https:\/\//.test(cfg.siteUrl || '') || /localhost|127\.0\.0\.1/.test(cfg.siteUrl)) bad.push('siteUrl должен быть боевым адресом по https, сейчас: ' + cfg.siteUrl);
if (!/^https:\/\/discord\.(gg|com)\//.test(cfg.discordUrl || '') || /YOUR_INVITE/.test(cfg.discordUrl)) bad.push('discordUrl не заполнен: впишите ссылку-приглашение на ваш Discord.');
if (!fs.existsSync(path.join(__dirname, '..', 'build', 'icon.png'))) bad.push('Нет build/icon.png (PNG от 256×256): без него установщик получит иконку Electron.');
if (bad.length) {
  console.error('\n❌ Сборка остановлена. Исправьте config.json:\n');
  bad.forEach((b) => console.error(' • ' + b));
  console.error('');
  process.exit(1);
}
console.log('✓ config.json готов к релизу');
