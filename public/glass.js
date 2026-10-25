/* Стеклянные поверхности (порт GlassSurface из React Bits на обычный JS).
   В Chromium: backdrop-filter через SVG-фильтр с картой смещения (преломление фона).
   В Safari и Firefox: размытие + подсветка края (CSS-запасной вариант). */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const FAR = 1e20;
  const CFG = { border: 0.07, blur: 11, bright: 50, opacity: 0.93, distortion: -180, offsets: [0, 10, 20], saturation: 1 };

  const isChromium = () => {
    const ua = navigator.userAgent;
    if (/Firefox/.test(ua)) return false;
    if (/Safari/.test(ua) && !/Chrome/.test(ua)) return false;
    const d = document.createElement('div');
    d.style.backdropFilter = 'url(#probe)';
    return d.style.backdropFilter !== '';
  };
  if (!isChromium()) {
    // запасной вариант: блюр + подсветка
    document.documentElement.classList.add('glass-fallback');
    return;
  }

  const holder = document.createElementNS(NS, 'svg');
  holder.setAttribute('width', '0');
  holder.setAttribute('height', '0');
  holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  document.body.appendChild(holder);

  const mapUrl = (w, h, radius) => {
    const edge = Math.min(w, h) * (CFG.border * 0.5);
    const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="r" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient>
        <linearGradient id="b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient>
        <filter id="s" filterUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${CFG.blur}"/></filter>
      </defs>
      <rect x="0" y="0" width="${w}" height="${h}" fill="black"/>
      <rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" fill="url(#r)"/>
      <rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" fill="url(#b)" style="mix-blend-mode: difference"/>
      <rect x="${edge}" y="${edge}" width="${w - edge * 2}" height="${h - edge * 2}" rx="${radius}" fill="hsl(0 0% ${CFG.bright}% / ${CFG.opacity})" filter="url(#s)"/>
    </svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  };

  let seq = 0;
  const build = (el) => {
    const id = 'glass-f' + ++seq;
    const f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', id);
    f.setAttribute('color-interpolation-filters', 'sRGB');
    f.setAttribute('x', '0%'); f.setAttribute('y', '0%'); f.setAttribute('width', '100%'); f.setAttribute('height', '100%');
    const img = document.createElementNS(NS, 'feImage');
    img.setAttribute('x', '0'); img.setAttribute('y', '0'); img.setAttribute('width', '100%'); img.setAttribute('height', '100%');
    img.setAttribute('preserveAspectRatio', 'none'); img.setAttribute('result', 'map');
    f.appendChild(img);
    const channel = (name, offset, result) => {
      const d = document.createElementNS(NS, 'feDisplacementMap');
      d.setAttribute('in', 'SourceGraphic'); d.setAttribute('in2', 'map'); d.setAttribute('result', result);
      d.setAttribute('xChannelSelector', 'R'); d.setAttribute('yChannelSelector', 'G');
      d.setAttribute('scale', String(CFG.distortion + offset));
      d.dataset.ch = name;
      f.appendChild(d);
      return d;
    };
    const dr = channel('r', CFG.offsets[0], 'dispRed');
    const dg = channel('g', CFG.offsets[1], 'dispGreen');
    const db = channel('b', CFG.offsets[2], 'dispBlue');
    const matrix = (inp, res, m) => {
      const c = document.createElementNS(NS, 'feColorMatrix');
      c.setAttribute('in', inp); c.setAttribute('type', 'matrix'); c.setAttribute('values', m); c.setAttribute('result', res);
      f.appendChild(c);
    };
    matrix('dispRed', 'red', '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0');
    matrix('dispGreen', 'green', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0');
    matrix('dispBlue', 'blue', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0');
    const blend = (a, b, res) => { const e = document.createElementNS(NS, 'feBlend'); e.setAttribute('in', a); e.setAttribute('in2', b); e.setAttribute('mode', 'screen'); e.setAttribute('result', res); f.appendChild(e); };
    blend('red', 'green', 'rg'); blend('rg', 'blue', 'output');
    const g = document.createElementNS(NS, 'feGaussianBlur');
    g.setAttribute('in', 'output'); g.setAttribute('stdDeviation', '0.7');
    f.appendChild(g);
    holder.appendChild(f);

    const update = () => {
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h) return;
      const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 20;
      img.setAttribute('href', mapUrl(w, h, radius));
    };
    new ResizeObserver(update).observe(el);
    update();
    el.style.backdropFilter = `url(#${id}) saturate(${CFG.saturation})`;
    el.style.webkitBackdropFilter = `url(#${id}) saturate(${CFG.saturation})`;
    el.classList.add('glass');
  };

  const SELECTOR = '.app, .card, .plan, .pz, .news .rel, .faq details';
  const setup = () => document.querySelectorAll(SELECTOR).forEach((el) => { if (!el.classList.contains('glass')) build(el); });
  setup();
  // новые карточки (после рендера списков) тоже получают стекло
  new MutationObserver(setup).observe(document.body, { childList: true, subtree: true });
})();
