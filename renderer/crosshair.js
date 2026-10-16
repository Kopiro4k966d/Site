/* Общая отрисовка прицела: и для оверлея поверх игры, и для предпросмотра в приложении.
   Все размеры в физических пикселях экрана, поэтому линии получаются чёткими. */
function drawCrosshair(cv, c) {
  const W = cv.width, H = cv.height, out = cv.getContext('2d');
  out.clearRect(0, 0, W, H);
  const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
  const g = layer.getContext('2d');
  const cx = Math.round(W / 2), cy = Math.round(H / 2), o = c.outline ? c.outlineW : 0;
  const rects = [];
  if (c.lines && c.length > 0) {
    const t = c.thickness, L = c.length, G = c.gap, a = cx - Math.floor(t / 2), b = cy - Math.floor(t / 2);
    if (!c.tStyle) rects.push([a, cy - G - L, t, L]);   // верх
    rects.push([a, cy + G, t, L]);                      // низ
    rects.push([cx - G - L, b, L, t]);                  // лево
    rects.push([cx + G, b, L, t]);                      // право
  }
  const s = c.dotSize, dr = c.dot ? (c.dotRound ? null : [cx - Math.floor(s / 2), cy - Math.floor(s / 2), s, s]) : undefined;
  const pass = (color, e) => {
    g.fillStyle = color; g.strokeStyle = color;
    for (const [x, y, w, h] of rects) g.fillRect(x - e, y - e, w + 2 * e, h + 2 * e);
    if (c.dot) {
      if (c.dotRound) { g.beginPath(); g.arc(cx, cy, s / 2 + e, 0, Math.PI * 2); g.fill(); }
      else g.fillRect(dr[0] - e, dr[1] - e, dr[2] + 2 * e, dr[3] + 2 * e);
    }
    if (c.circle) { g.lineWidth = c.ring + 2 * e; g.beginPath(); g.arc(cx, cy, c.radius, 0, Math.PI * 2); g.stroke(); }
  };
  if (o > 0) pass(c.outlineColor, o);
  pass(c.color, 0);
  out.globalAlpha = c.opacity / 100;   // прозрачность на всё целиком, чтобы контур не просвечивал
  out.drawImage(layer, 0, 0);
  out.globalAlpha = 1;
}
