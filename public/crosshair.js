/* Превью прицелов на главной: рисует прицел по настройкам так же, как он выглядит в приложении.
   Одна функция draw() используется и для большого превью, и для миниатюр пресетов. */
(function () {
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const COLORS = ['#ffffff', '#3dff7a', '#ff5a5a', '#48e5ff', '#ffd84d'];

  /* p: { shape, size, thick, gap, dot, color, opacity }; k — множитель толщины и размеров для миниатюр */
  function draw(p, k) {
    k = k || 1;
    const c = p.color, t = p.thick * k, g = p.gap * k, s = p.size * k, o = p.opacity / 100;
    const line = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${t}"/>`;
    let parts = '';
    if (p.shape === 'cross') parts += line(-g - s, 0, -g, 0) + line(g, 0, g + s, 0) + line(0, -g - s, 0, -g) + line(0, g, 0, g + s);
    if (p.shape === 'tee') parts += line(-g - s, 0, -g, 0) + line(g, 0, g + s, 0) + line(0, g, 0, g + s);
    if (p.shape === 'circle') parts += `<circle r="${s / 2}" fill="none" stroke="${c}" stroke-width="${t}"/>`;
    if (p.shape === 'dot') parts += `<circle r="${Math.max(1.6, t)}" fill="${c}"/>`;
    if (p.dot && p.shape !== 'dot') parts += `<circle r="${t / 2 + 0.6 * k}" fill="${c}"/>`;
    return `<svg viewBox="-50 -50 100 100" width="100%" height="100%" style="opacity:${o}" aria-hidden="true">${parts}</svg>`;
  }

  const PRESETS = {
    cross:  { shape: 'cross',  size: 10, thick: 1.6, gap: 4,  dot: true,  color: '#ffffff', opacity: 100 },
    dot:    { shape: 'dot',    size: 0,  thick: 2,   gap: 0,  dot: false, color: '#ffffff', opacity: 100 },
    circle: { shape: 'circle', size: 18, thick: 1.2, gap: 0,  dot: true,  color: '#ffffff', opacity: 100 },
    tee:    { shape: 'tee',    size: 8,  thick: 2,   gap: 5,  dot: false, color: '#3dff7a', opacity: 100 },
    wide:   { shape: 'cross',  size: 14, thick: 1,   gap: 10, dot: false, color: '#48e5ff', opacity: 90 },
    bold:   { shape: 'cross',  size: 6,  thick: 3,   gap: 2,  dot: true,  color: '#ff5a5a', opacity: 100 }
  };
  const PROFILES = [
    PRESETS.cross,
    { shape: 'circle', size: 22, thick: 1, gap: 0, dot: true, color: '#3dff7a', opacity: 100 },
    { shape: 'tee', size: 9, thick: 2.4, gap: 6, dot: false, color: '#ff5a5a', opacity: 100 }
  ];

  const state = Object.assign({}, PRESETS.cross);
  const clone = (o) => Object.assign({}, o);

  function paintSliders() {
    const map = [['#xsz', 'size', '#xszv', 0], ['#xth', 'thick', '#xthv', 1], ['#xgp', 'gap', '#xgpv', 0], ['#xop', 'opacity', '#xopv', 0]];
    map.forEach(([inp, key, out, d]) => {
      const el = $(inp); el.value = state[key];
      $(out).textContent = Number(state[key]).toFixed(d);
      const min = +el.min, max = +el.max;
      el.style.setProperty('--p', ((state[key] - min) / (max - min) * 100) + '%');
    });
    $('#xdot').checked = !!state.dot;
    $$('[data-s]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.s === state.shape));
    $$('[data-c]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.c === state.color));
    $$('[data-profile]').forEach((b) => b.setAttribute('aria-pressed', JSON.stringify(PROFILES[+b.dataset.profile]) === JSON.stringify(stateView())));
    $('#xch').innerHTML = draw(state, 1);
  }
  function stateView() { return { shape: state.shape, size: state.size, thick: state.thick, gap: state.gap, dot: state.dot, color: state.color, opacity: state.opacity }; }

  function apply(p) { Object.assign(state, clone(p)); paintSliders(); }

  /* ползунки */
  [['#xsz', 'size'], ['#xth', 'thick'], ['#xgp', 'gap'], ['#xop', 'opacity']].forEach(([sel, key]) => {
    $(sel).addEventListener('input', (e) => { state[key] = +e.target.value; paintSliders(); });
  });
  $('#xdot').addEventListener('change', (e) => { state.dot = e.target.checked; paintSliders(); });
  $$('[data-s]').forEach((b) => b.addEventListener('click', () => { state.shape = b.dataset.s; if (state.shape === 'dot') state.size = 0; else if (!state.size) state.size = 10; paintSliders(); }));
  $$('[data-c]').forEach((b) => b.addEventListener('click', () => { state.color = b.dataset.c; paintSliders(); }));
  $$('[data-profile]').forEach((b) => b.addEventListener('click', () => apply(PROFILES[+b.dataset.profile])));

  /* пресеты: миниатюры и применение */
  const box = $('#xpresets');
  if (box) {
    box.innerHTML = Object.keys(PRESETS).map((k) =>
      `<button type="button" class="xpreset" data-preset="${k}" aria-label="${k}"><span class="xmini">${draw(PRESETS[k], 1.8)}</span></button>`).join('');
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-preset]'); if (!b) return;
      apply(PRESETS[b.dataset.preset]);
      $$('.xpreset').forEach((x) => x.setAttribute('aria-pressed', x === b));
    });
  }

  paintSliders();
})();
