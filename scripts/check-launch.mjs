// Проверка перед выкладкой сайта: npm run check. Не даёт запустить продажи с заглушками.
import fs from 'node:fs';
const rd = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const bad = [];
const cfg = rd('public/config.js');
if (/YOUR_INVITE/.test(cfg)) bad.push('public/config.js: впишите ссылку-приглашение Discord вместо YOUR_INVITE');
if (/download:\s*''/.test(cfg)) bad.push('public/config.js: впишите прямую ссылку на установщик (download)');
const legal = rd('public/legal.html');
const slots = [...new Set((legal.replace(/<style[\s\S]*?<\/style>/g, '').match(/\[[^\]\n<]{2,300}\]/g) || []))];
if (slots.length) bad.push('public/legal.html: остались поля для заполнения: ' + slots.join(', '));
if (/class="warn"/.test(legal)) bad.push('public/legal.html: удалите жёлтый блок «Шаблон» после заполнения и проверки юристом');
if (fs.existsSync(new URL('../.env', import.meta.url))) bad.push('.env лежит рядом с проектом: не выкладывайте и не отправляйте его, задайте переменные в панели хостинга');
if (/data-m="usdt"/.test(rd('public/index.html'))) console.log('ℹ Способ «Криптовалюта» на боевой оплате скрыт автоматически: USDT в ЮKassa не принимается.');
if (bad.length) { console.error('\n❌ Запуск остановлен:\n'); bad.forEach((b) => console.error(' • ' + b)); console.error(''); process.exit(1); }
console.log('✓ Заглушек не осталось');
