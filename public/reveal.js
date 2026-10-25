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
})();
