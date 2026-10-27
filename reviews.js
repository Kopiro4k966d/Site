/* Плавающие карточки отзывов на главной. Берём только одобренные отзывы из базы (/api/reviews).
   Если отзывов нет, блок показывает только заголовок и кнопку. Ничего не выдумываем. */
(function () {
  const box = document.getElementById('rv2Cards');
  const count = document.getElementById('rv2Count');
  const stack = document.getElementById('rv2Stack');
  const countTxt = document.getElementById('rv2CountTxt');
  if (!box) return;

  /* позиции карточек вокруг центрального блока (десктоп) */
  const SLOTS = [
    { left: '2%', top: '6%' },
    { right: '2%', top: '2%' },
    { left: '6%', top: '64%' },
    { right: '4%', top: '62%' },
    { left: '36%', top: '80%' }
  ];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isEn = () => document.documentElement.lang === 'en';
  const ruWord = (n) => {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return 'отзыв';
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'отзыва';
    return 'отзывов';
  };
  const initial = (name) => esc(String(name || '?').trim().charAt(0).toUpperCase());

  fetch('/api/reviews', { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      const list = (j && Array.isArray(j.reviews)) ? j.reviews : [];
      if (!list.length) return;
      const items = list.slice(0, SLOTS.length);
      box.innerHTML = items.map((r, i) => {
        const slot = SLOTS[i];
        const pos = Object.entries(slot).map(([k, v]) => `${k}:${v}`).join(';');
        /* откуда летит карточка: слева, справа или снизу */
        const from = slot.left ? '-140px 0' : slot.right ? '140px 0' : '0 120px';
        const [x, y] = from.split(' ');
        return `<article class="rv2-card" style="${pos};--x:${x};--y:${y};--d:${(i * 0.15).toFixed(2)}s">` +
          `<div class="rv2-who"><span class="rv2-av">${initial(r.name)}</span><div><b>${esc(r.name)}</b><small>${esc(r.date)}</small></div></div>` +
          `<p>«${esc(r.text)}»</p></article>`;
      }).join('');
      stack.innerHTML = items.slice(0, 3).map((r) => `<span>${initial(r.name)}</span>`).join('');
      const n = list.length;
      countTxt.textContent = isEn() ? `${n} ${n === 1 ? 'review' : 'reviews'}` : `${n} ${ruWord(n)}`;
      count.hidden = false;
      /* карточки стартуют, когда блок появляется в поле зрения */
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        box.querySelectorAll('.rv2-card').forEach((c) => c.classList.add('in'));
        io.disconnect();
      }, { threshold: 0.2 });
      io.observe(box);
    })
    .catch(() => {});
})();
