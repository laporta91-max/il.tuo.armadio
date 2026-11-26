/* ===== Capi di esempio, disegnati sulla geometria del manichino standard ===== */
function shade(hex, f) { const [r, g, b] = hexToRgb(hex); return f > 0 ? rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f) : rgbToHex(r * (1 + f), g * (1 + f), b * (1 + f)); }

function renderSample(spec) {
  const M = bodyModel(DEFAULT_PROFILE.measures); const kp = M.kp;
  const R = 1.4; const c = document.createElement('canvas'); c.width = FIG_W * R; c.height = FIG_H * R;
  const x = c.getContext('2d'); x.scale(R, R); x.lineJoin = 'round'; x.lineCap = 'round';
  const col = spec.color, dark = shade(col, -0.22), light = shade(col, 0.14);
  const grad = (x0, x1) => { const g = x.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, dark); g.addColorStop(.35, light); g.addColorStop(.65, col); g.addColorStop(1, dark); return g; };
  const cx = M.cx;
  const stroke = () => { x.strokeStyle = shade(col, -0.35); x.lineWidth = 1.6; x.stroke(); };
  let anchors;
  if (spec.kind === 'top') {
    const ext = spec.ext || 1; // larghezza capo rispetto al corpo
    const sw = M.sw * 1.04 * ext, hemY = kp.hiL[1] + (spec.long || 0);
    const shY = kp.shL[1] - 4, hw = Math.max(M.cw, M.hw) * 1.05 * ext;
    // maniche
    if (spec.sleeve !== 'none') {
      for (const s of [-1, 1]) {
        const el = kp[s < 0 ? 'elL' : 'elR'], wr = kp[s < 0 ? 'wrL' : 'wrR'];
        const sh = [cx + s * sw, shY + 6];
        const end = spec.sleeve === 'long' ? wr : [sh[0] + (el[0] - sh[0]) * .5, sh[1] + (el[1] - sh[1]) * .5];
        const w0 = 30 * ext, w1 = spec.sleeve === 'long' ? 19 * ext : 25 * ext;
        x.beginPath();
        x.moveTo(sh[0] - s * 6, sh[1] - 6);
        x.lineTo(sh[0] + s * w0, sh[1] + 22);
        if (spec.sleeve === 'long') x.quadraticCurveTo(el[0] + s * (w0 - 4), el[1], end[0] + s * w1, end[1]);
        else x.lineTo(end[0] + s * w1, end[1]);
        x.lineTo(end[0] - s * w1, end[1] + 4);
        if (spec.sleeve === 'long') x.quadraticCurveTo(el[0] - s * (w0 - 10), el[1], sh[0] - s * 8, sh[1] + 60);
        else x.lineTo(sh[0] - s * 10, sh[1] + 54);
        x.closePath(); x.fillStyle = grad(end[0] - 30, end[0] + 30); x.fill(); stroke();
        if (spec.sleeve === 'long' && spec.cuff) { x.fillStyle = dark; x.beginPath(); x.moveTo(end[0] + s * w1, end[1] - 14); x.lineTo(end[0] - s * w1, end[1] - 10); x.lineTo(end[0] - s * w1, end[1] + 4); x.lineTo(end[0] + s * w1, end[1]); x.fill(); }
      }
    }
    // busto
    const neckW = spec.sleeve === 'none' ? 34 : 26;
    x.beginPath();
    x.moveTo(cx - neckW, shY - 14);
    if (spec.sleeve === 'none') { x.lineTo(cx - sw * .62, shY - 16); x.quadraticCurveTo(cx - sw * .7, shY + 60, cx - M.cw * 1.02, shY + 86); }
    else { x.lineTo(cx - sw, shY); x.lineTo(cx - M.cw * 1.04 * ext, shY + 70); }
    x.quadraticCurveTo(cx - M.ww * 1.15 * ext, (shY + hemY) / 2 + 30, cx - hw, hemY);
    x.lineTo(cx + hw, hemY);
    x.quadraticCurveTo(cx + M.ww * 1.15 * ext, (shY + hemY) / 2 + 30, cx + (spec.sleeve === 'none' ? M.cw * 1.02 : M.cw * 1.04 * ext), shY + (spec.sleeve === 'none' ? 86 : 70));
    if (spec.sleeve === 'none') { x.quadraticCurveTo(cx + sw * .7, shY + 60, cx + sw * .62, shY - 16); }
    else x.lineTo(cx + sw, shY);
    x.lineTo(cx + neckW, shY - 14);
    if (spec.open) x.lineTo(cx + 6, shY + 120), x.lineTo(cx - 6, shY + 120);
    else x.quadraticCurveTo(cx, shY + (spec.sleeve === 'none' ? 40 : 14), cx - neckW, shY - 14);
    x.closePath(); x.fillStyle = grad(cx - hw, cx + hw); x.fill(); stroke();
    // dettagli
    if (spec.collar) { x.fillStyle = light; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * neckW, shY - 16); x.lineTo(cx + s * 4, shY + 16); x.lineTo(cx + s * (neckW + 14), shY + 4); x.closePath(); x.fill(); stroke(); } }
    if (spec.buttons) { x.fillStyle = shade(col, -0.4); for (let i = 0; i < spec.buttons; i++) { x.beginPath(); x.arc(cx, shY + 26 + i * 44, 3.2, 0, 7); x.fill(); } }
    if (spec.placket) { x.strokeStyle = dark; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, shY - 2); x.lineTo(cx, shY + 70); x.stroke(); x.fillStyle = '#f0f0f0'; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(cx + 5, shY + 12 + i * 20, 3, 0, 7); x.fill(); } }
    if (spec.rib) { x.fillStyle = dark; x.fillRect(cx - hw, hemY - 18, hw * 2, 18); }
    if (spec.hood) { x.strokeStyle = dark; x.lineWidth = 7; x.beginPath(); x.ellipse(cx, shY - 6, neckW + 16, 22, 0, 0, Math.PI); x.stroke(); }
    if (spec.open) { x.strokeStyle = shade(col, -0.4); x.lineWidth = 2; x.beginPath(); x.moveTo(cx, shY + 120); x.lineTo(cx, hemY); x.stroke(); x.fillStyle = shade(col, -0.45); for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(cx - 10, shY + 150 + i * 60, 4, 0, 7); x.fill(); } }
    anchors = { shL: [cx - M.sw * 1.1, kp.shL[1] - 6], shR: [cx + M.sw * 1.1, kp.shR[1] - 6] };
  } else if (spec.kind === 'bottom') {
    const top = kp.waL[1] - 6, ww = M.ww * 1.12, hw = M.hw * 1.04, crotch = M.yCrotch + 6;
    const endY = spec.short ? kp.knL[1] - 40 : kp.anL[1] + 6;
    for (const s of [-1, 1]) {
      const kn = kp[s < 0 ? 'knL' : 'knR'], an = kp[s < 0 ? 'anL' : 'anR'];
      const bot = spec.short ? [cx + s * (hw * 0.62), endY] : an;
      const bw = spec.short ? 40 : (spec.wide ? 34 : 24);
      x.beginPath();
      x.moveTo(cx, top + 4); x.lineTo(cx + s * ww, top);
      x.quadraticCurveTo(cx + s * hw * 1.05, kp.hiL[1], cx + s * hw * .98, kp.hiL[1] + 40);
      x.quadraticCurveTo(kn[0] + s * 34, kn[1], bot[0] + s * bw, bot[1]);
      x.lineTo(bot[0] - s * bw * .8, bot[1]);
      x.quadraticCurveTo(kn[0] - s * 22, kn[1], cx + s * 4, crotch);
      x.lineTo(cx, crotch - 6);
      x.closePath(); x.fillStyle = grad(cx + s * hw * 1.05, cx); x.fill(); stroke();
    }
    x.fillStyle = dark; x.fillRect(cx - ww, top, ww * 2, 12);
    if (spec.jeans) { x.strokeStyle = '#d6a95c'; x.setLineDash([4, 4]); x.lineWidth = 1.4; x.beginPath(); x.moveTo(cx, top + 12); x.lineTo(cx, crotch - 30); x.stroke(); for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * ww * .9, top + 14); x.quadraticCurveTo(cx + s * ww * .55, top + 50, cx + s * ww * .25, top + 16); x.stroke(); } x.setLineDash([]); }
    anchors = { waL: [cx - M.ww * 1.12, kp.waL[1] - 4], waR: [cx + M.ww * 1.12, kp.waR[1] - 4] };
  } else if (spec.kind === 'shoes') {
    for (const s of [-1, 1]) {
      const ft = kp[s < 0 ? 'ftL' : 'ftR'];
      x.beginPath();
      if (spec.boot) { x.moveTo(ft[0] - s * 22, ft[1] - 70); x.lineTo(ft[0] + s * 20, ft[1] - 70); x.lineTo(ft[0] + s * 22, ft[1] - 20); x.quadraticCurveTo(ft[0] + s * 40, ft[1] - 18, ft[0] + s * 40, ft[1]); x.lineTo(ft[0] - s * 26, ft[1]); x.closePath(); }
      else { x.moveTo(ft[0] - s * 26, ft[1] - 22); x.quadraticCurveTo(ft[0] - s * 4, ft[1] - 40, ft[0] + s * 18, ft[1] - 26); x.quadraticCurveTo(ft[0] + s * 40, ft[1] - 14, ft[0] + s * 40, ft[1]); x.lineTo(ft[0] - s * 30, ft[1]); x.closePath(); }
      x.fillStyle = grad(ft[0] - 40, ft[0] + 40); x.fill(); stroke();
      x.fillStyle = spec.sole || shade(col, -0.3); x.fillRect(Math.min(ft[0] - s * 30, ft[0] + s * 40), ft[1] - 5, 70, 7);
      if (!spec.boot) { x.strokeStyle = shade(col, -0.3); x.lineWidth = 1.5; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(ft[0] + s * (2 + i * 7), ft[1] - 30 + i * 3); x.lineTo(ft[0] + s * (10 + i * 7), ft[1] - 26 + i * 3); x.stroke(); } }
    }
    anchors = { fL: [kp.ftL[0] - (kp.ftR[0] - kp.ftL[0]) * .025, kp.ftL[1]], fR: [kp.ftR[0] + (kp.ftR[0] - kp.ftL[0]) * .025, kp.ftR[1]] };
  } else { // borsa
    const w = kp.wrR; const bx = w[0] - 50, by = w[1] + 20;
    x.strokeStyle = dark; x.lineWidth = 6; x.beginPath(); x.arc(bx + 50, by + 10, 34, Math.PI, 0); x.stroke();
    x.beginPath(); x.roundRect(bx, by + 10, 100, 80, 10); x.fillStyle = grad(bx, bx + 100); x.fill(); stroke();
    anchors = null;
  }
  // ritaglio sul contenuto
  const d = x.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let yy = 0; yy < c.height; yy += 2) for (let xx = 0; xx < c.width; xx += 2) if (d[(yy * c.width + xx) * 4 + 3] > 10) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
  x0 = Math.max(0, x0 - 6); y0 = Math.max(0, y0 - 6); x1 = Math.min(c.width, x1 + 6); y1 = Math.min(c.height, y1 + 6);
  const o = document.createElement('canvas'); o.width = x1 - x0; o.height = y1 - y0;
  o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
  const fit = {};
  if (anchors) for (const [k, v] of Object.entries(anchors)) fit[k] = [(v[0] * R - x0) / o.width, (v[1] * R - y0) / o.height];
  else fit.a = [0.5, 0.05];
  return { img: o.toDataURL('image/png'), fit };
}

const SAMPLE_SPECS = [
  { name: 'T-shirt bianca', cat: 'Maglie', type: 'T-shirt manica corta', color: '#f4f4f2', styles: ['Casual', 'Estate'], price: 15, kind: 'top', sleeve: 'short' },
  { name: 'Henley grigia', cat: 'Maglie', type: 'Henley manica lunga', color: '#9a9ea4', styles: ['Casual'], price: 29, kind: 'top', sleeve: 'long', placket: true, cuff: true },
  { name: 'Camicia azzurra', cat: 'Camicie', type: 'Camicia manica lunga', color: '#9cc3ea', styles: ['Elegante', 'Lavoro'], price: 39, kind: 'top', sleeve: 'long', collar: true, buttons: 6, cuff: true },
  { name: 'Canotta nera', cat: 'Canotte', type: 'Canotta', color: '#1a1a1c', styles: ['Sport', 'Estate'], price: 12, kind: 'top', sleeve: 'none' },
  { name: 'Felpa blu navy', cat: 'Felpe e Maglioni', type: 'Felpa girocollo', color: '#1f2c4d', styles: ['Casual', 'Sport'], price: 45, kind: 'top', sleeve: 'long', rib: true, cuff: true, ext: 1.08, long: 6 },
  { name: 'Maglione bordeaux', cat: 'Felpe e Maglioni', type: 'Maglione', color: '#6e1a2b', styles: ['Casual', 'Serata'], price: 55, kind: 'top', sleeve: 'long', rib: true, cuff: true, ext: 1.07 },
  { name: 'Giacca cammello', cat: 'Giacche e Cappotti', type: 'Giacca', color: '#b88a55', styles: ['Elegante', 'Lavoro', 'Serata'], price: 120, kind: 'top', sleeve: 'long', open: true, collar: true, ext: 1.13, long: 40 },
  { name: 'Jeans denim', cat: 'Pantaloni', type: 'Jeans', color: '#4a6a92', styles: ['Casual'], price: 59, kind: 'bottom', jeans: true },
  { name: 'Chino beige', cat: 'Pantaloni', type: 'Chino', color: '#d3c19c', styles: ['Casual', 'Lavoro', 'Estate'], price: 49, kind: 'bottom' },
  { name: 'Pantaloni neri', cat: 'Pantaloni', type: 'Pantaloni eleganti', color: '#151517', styles: ['Elegante', 'Lavoro', 'Serata'], price: 69, kind: 'bottom' },
  { name: 'Sneakers bianche', cat: 'Scarpe', type: 'Sneakers', color: '#f2f2f0', styles: ['Casual', 'Sport', 'Estate'], price: 85, kind: 'shoes', sole: '#d9d9d9' },
  { name: 'Stivaletti marroni', cat: 'Scarpe', type: 'Stivaletti', color: '#5a3622', styles: ['Elegante', 'Casual', 'Serata'], price: 110, kind: 'shoes', boot: true, sole: '#2a1a10' },
  { name: 'Borsa nera', cat: 'Accessori', type: 'Borsa', color: '#1a1a1c', styles: ['Elegante', 'Lavoro', 'Serata'], price: 79, kind: 'bag' }
];

async function ensureSamples() {
  const flag = await DB.get('kv', 'samples');
  if (flag) return;
  for (const sp of SAMPLE_SPECS) {
    const r = renderSample(sp);
    const it = { id: uid(), sample: true, name: sp.name, cat: sp.cat, type: sp.type, color: sp.color, styles: sp.styles, price: sp.price, img: r.img, fit: r.fit, laundry: false, created: Date.now() };
    await DB.put('items', it);
  }
  await DB.put('kv', { id: 'samples', v: true });
}
