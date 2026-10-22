/* Crysea: эффект «подсветка за курсором» (как в Figma): карточки подсвечивают границу и фон там, где курсор. */
(function () {
  if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
  document.querySelectorAll('.card, .plan, .rv').forEach(function (el) { el.classList.add('spot'); });
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest && e.target.closest('.spot');
    if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
})();
