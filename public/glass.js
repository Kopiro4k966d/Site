/* Liquid glass: библиотека @ybouane/liquidglass (WebGL-рефракция, блик, хроматическая аберрация).
   Подключается с CDN. Если WebGL нет, CDN недоступен или библиотека упала, страница остаётся
   с CSS-стеклом из style.css: ничего не ломается.
   Требования библиотеки: стеклянные элементы — прямые дети корневого элемента.
   Поэтому корни выбраны так, чтобы в них не было других детей:
     .top  -> .pill   (шапка)
     .plans -> .plan  (тарифы) */
const CDN = 'https://cdn.jsdelivr.net/npm/@ybouane/liquidglass/dist/index.js';

(async function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl') || probe.getContext('experimental-webgl'))) return;

  const SETS = [
    { root: '.top', glass: ':scope > .pill', cfg: { cornerRadius: 40, zRadius: 30, blurAmount: 0.08, refraction: 0.6, chromAberration: 0.04, edgeHighlight: 0.14, specular: 0.45, fresnel: 1, shadowOpacity: 0.28, shadowSpread: 12 } },
    { root: '.plans', glass: ':scope > .plan', cfg: { cornerRadius: 32, zRadius: 28, blurAmount: 0.06, refraction: 0.55, chromAberration: 0.03, edgeHighlight: 0.12, specular: 0.35, fresnel: 1, shadowOpacity: 0.22, shadowSpread: 14 } }
  ];

  try {
    const { LiquidGlass } = await import(CDN);
    for (const set of SETS) {
      const root = document.querySelector(set.root);
      if (!root) continue;
      const els = [...root.querySelectorAll(set.glass)];
      if (!els.length) continue;
      els.forEach((el) => { el.dataset.config = JSON.stringify(set.cfg); });
      await LiquidGlass.init({ root, glassElements: els });
    }
    document.documentElement.classList.add('lg-on');
  } catch (e) {
    console.warn('Liquid glass не запустился, остаётся CSS-стекло:', e);
  }
})();
