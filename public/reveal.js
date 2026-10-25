/* Плавное появление карточек и текстов при прокрутке.
   Блоки, уже размеченные через data-rv (script.js), не трогаем. Остальным даём вариант
   появления: сверху, слева, справа, масштабом или из размытия — по очереди. */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const SEL = [
    'section h2', '.head', '.lead', '.card', '.pz', '.news .rel', '.faq details',
    '.ac-card', '.pcard', '.ac-stats > div', '.pz-stat', '.trust', '.pz-tag', '.app', '.plan'
  ].join(',');
  const VARIANTS = ['t'];
  const targets = [];
  document.querySelectorAll(SEL).forEach((el) => {
    if (el.hasAttribute('data-rv') || el.closest('[data-rv]') || el.closest('.mo')) return;
    if (el.closest('.head') && el !== el.closest('.head')) return;
    targets.push(el);
  });
  const groups = new Map();
  targets.forEach((el) => {
    const parent = el.parentElement;
    const list = groups.get(parent) || [];
    list.push(el);
    groups.set(parent, list);
  });
  groups.forEach((list) => {
    list.forEach((el, i) => {
      el.setAttribute('data-rv', VARIANTS[i % VARIANTS.length]);
      el.style.setProperty('--d', ((i % 4) * 0.08).toFixed(2) + 's');
    });
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  targets.forEach((el) => io.observe(el));

  /* 1) заголовки и лиды появляются по словам: каждое выезжает из своей маски и проясняется */
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  document.querySelectorAll('section h2, .lead').forEach((el) => {
    if (el.children.length || el.dataset.split) return;
    const words = el.textContent.trim().split(/\s+/);
    if (words.length < 2 || words.length > 40) return;
    el.dataset.split = '1';
    el.setAttribute('aria-label', words.join(' '));
    el.innerHTML = words.map((w, i) => '<span class="wsp" aria-hidden="true"><span style="--wi:' + i + '">' + esc(w) + '</span></span>').join(' ');

    io.observe(el); /* чтобы класс .in появился и слова выехали, даже если заголовок не в общем списке */
  });

  /* 2) карточки и тарифы реагируют на мышь: плавный наклон за курсором (только при наличии мыши) */
  const fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) {
    document.querySelectorAll('.card, .plan, .rv').forEach((el) => {
      el.classList.add('tilt');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateX(' + (-py * 6).toFixed(2) + 'deg) rotateY(' + (px * 8).toFixed(2) + 'deg) translateZ(0)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
})();
