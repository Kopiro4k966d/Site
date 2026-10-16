const cv = document.getElementById('c'), dpr = window.devicePixelRatio || 1;
cv.width = cv.height = Math.round(400 * dpr);
const paint = (c) => c && drawCrosshair(cv, c);
ov.get().then(paint);
ov.on(paint);
