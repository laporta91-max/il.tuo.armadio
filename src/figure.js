/* ===== Corpo, manichino e disegno dei capi ===== */
const FIG_W = 600, FIG_H = 1100;

// Modello del corpo dai cursori delle misure
function bodyModel(m = S.profile.measures) {
  const masc = m.shape / 100;                      // 0 femminile → 1 maschile
  const wt = clamp((m.weight - 45) / 75, 0, 1);    // 45..120 kg
  const ht = clamp((m.height - 150) / 50, 0, 1);   // 150..200 cm
  const bulk = 0.88 + wt * 0.42 - ht * 0.08;
  const cx = FIG_W / 2;
  const sw = (60 + masc * 22 + (m.shoulders - 50) * 0.5) * bulk;  // semi-larghezza spalle
  const cw = (52 + masc * 8 + (1 - masc) * 6 + (m.chest - 50) * 0.45) * bulk;
  const ww = (38 + masc * 10 + (m.waist - 50) * 0.45) * bulk * (0.9 + wt * 0.2);
  const hw = (60 - masc * 10 + (m.hips - 50) * 0.5) * bulk;
  const top = 40 - ht * 18;
  const yHead = top + 52, headR = 44 + (1 - masc) * -2;
  const yNeck = yHead + headR + 10, ySh = yNeck + 34, yChest = ySh + 70, yWaist = ySh + 185 + ht * 10,
    yHip = yWaist + 88, yCrotch = yHip + 62, yKnee = yCrotch + 230 + ht * 20, yAnkle = yKnee + 236 + ht * 20, yFoot = yAnkle + 34;
  const armOut = 16 + wt * 8;
  const kp = {
    head: [cx, yHead], neck: [cx, yNeck],
    shL: [cx - sw, ySh], shR: [cx + sw, ySh],
    elL: [cx - sw - armOut, ySh + 170], elR: [cx + sw + armOut, ySh + 170],
    wrL: [cx - sw - armOut - 10, ySh + 330], wrR: [cx + sw + armOut + 10, ySh + 330],
    waL: [cx - ww, yWaist], waR: [cx + ww, yWaist],
    hiL: [cx - hw, yHip], hiR: [cx + hw, yHip],
    knL: [cx - hw * 0.5, yKnee], knR: [cx + hw * 0.5, yKnee],
    anL: [cx - hw * 0.42, yAnkle], anR: [cx + hw * 0.42, yAnkle],
    ftL: [cx - hw * 0.48, yFoot], ftR: [cx + hw * 0.48, yFoot]
  };
  return { kp, sw, cw, ww, hw, headR, yChest, yCrotch, bulk, masc, cx };
}

function drawMannequin(x, M) {
  const { kp, cw, ww, hw, headR, yChest, yCrotch, bulk, cx } = M;
  const g = x.createLinearGradient(cx - 120, 0, cx + 120, 0);
  g.addColorStop(0, '#d9dce2'); g.addColorStop(.5, '#eef0f3'); g.addColorStop(1, '#d4d7dd');
  x.fillStyle = g; x.strokeStyle = '#c3c7cf'; x.lineWidth = 2; x.lineJoin = 'round'; x.lineCap = 'round';
  // braccia
  for (const s of ['L', 'R']) {
    const sh = kp['sh' + s], el = kp['el' + s], wr = kp['wr' + s];
    x.save(); x.strokeStyle = g; x.lineWidth = 34 * bulk; x.beginPath(); x.moveTo(sh[0] + (s === 'L' ? 14 : -14), sh[1] + 12); x.lineTo(el[0], el[1]); x.stroke();
    x.lineWidth = 27 * bulk; x.beginPath(); x.moveTo(el[0], el[1]); x.lineTo(wr[0], wr[1]); x.stroke(); x.restore();
  }
  // gambe
  for (const s of ['L', 'R']) {
    const sgn = s === 'L' ? -1 : 1, kn = kp['kn' + s], an = kp['an' + s];
    x.beginPath();
    x.moveTo(cx + sgn * 4, yCrotch);
    x.quadraticCurveTo(cx + sgn * hw * 1.02, kp.hiL[1] + 10, kn[0] + sgn * 30 * bulk, kn[1]);
    x.quadraticCurveTo(an[0] + sgn * 26 * bulk, (kn[1] + an[1]) / 2, an[0] + sgn * 13, an[1]);
    x.lineTo(an[0] - sgn * 13, an[1]);
    x.quadraticCurveTo(an[0] - sgn * 18 * bulk, (kn[1] + an[1]) / 2, kn[0] - sgn * 22 * bulk, kn[1]);
    x.quadraticCurveTo(cx + sgn * 10, yCrotch + 60, cx + sgn * 4, yCrotch);
    x.fill(); x.stroke();
    // piede
    const ft = kp['ft' + s];
    x.beginPath(); x.ellipse(ft[0] + sgn * 6, ft[1] - 8, 30, 14, 0, 0, Math.PI * 2); x.fill(); x.stroke();
  }
  // busto
  const [nx, ny] = kp.neck;
  x.beginPath();
  x.moveTo(nx - 20, ny - 6);
  x.quadraticCurveTo(nx - 26, kp.shL[1] - 8, kp.shL[0], kp.shL[1]);
  x.quadraticCurveTo(cx - cw - 6, yChest - 30, cx - cw, yChest);
  x.quadraticCurveTo(cx - ww - 4, (yChest + kp.waL[1]) / 2, kp.waL[0], kp.waL[1]);
  x.quadraticCurveTo(cx - hw * 1.06, kp.hiL[1] - 30, kp.hiL[0], kp.hiL[1]);
  x.quadraticCurveTo(cx - hw * .9, yCrotch - 10, cx, yCrotch);
  x.quadraticCurveTo(cx + hw * .9, yCrotch - 10, kp.hiR[0], kp.hiR[1]);
  x.quadraticCurveTo(cx + hw * 1.06, kp.hiR[1] - 30, kp.waR[0], kp.waR[1]);
  x.quadraticCurveTo(cx + ww + 4, (yChest + kp.waR[1]) / 2, cx + cw, yChest);
  x.quadraticCurveTo(cx + cw + 6, yChest - 30, kp.shR[0], kp.shR[1]);
  x.quadraticCurveTo(nx + 26, kp.shR[1] - 8, nx + 20, ny - 6);
  x.closePath(); x.fill(); x.stroke();
  // testa
  x.beginPath(); x.ellipse(kp.head[0], kp.head[1], headR * .86, headR, 0, 0, Math.PI * 2); x.fill(); x.stroke();
}
function drawHands(x, M) {
  x.fillStyle = '#e4e6ea'; x.strokeStyle = '#c3c7cf'; x.lineWidth = 2;
  for (const s of ['L', 'R']) { const w = M.kp['wr' + s]; x.beginPath(); x.ellipse(w[0], w[1] + 22, 14 * M.bulk, 24, 0, 0, Math.PI * 2); x.fill(); x.stroke(); }
}

/* --- Ancore dei capi (coordinate normalizzate nell'immagine del capo) --- */
function sleeveType(it) {
  const t = ((it.type || '') + ' ' + (it.name || '')).toLowerCase();
  if (it.cat === 'Canotte' || /canott|smanicat|gilet|top\b/.test(t)) return 'none';
  if (/manica corta|maniche corte|t-shirt|tshirt|polo|short/.test(t)) return 'short';
  if (it.cat === 'Maglie' && !/manica lunga|henley|longsleeve|dolcevita/.test(t)) return 'short';
  return 'long';
}
function defaultAnchors(it) {
  if (isTop(it)) {
    const st = sleeveType(it); const half = st === 'none' ? 0.36 : st === 'short' ? 0.27 : 0.22;
    return { shL: [0.5 - half, 0.07], shR: [0.5 + half, 0.07], hem: 0.98 };
  }
  if (it.cat === 'Pantaloni') return { waL: [0.2, 0.03], waR: [0.8, 0.03] };
  if (it.cat === 'Scarpe') return { fL: [0.25, 0.85], fR: [0.75, 0.85] };
  return { a: [0.5, 0.1] };
}
const isTop = it => ['Maglie', 'Camicie', 'Canotte', 'Felpe e Maglioni', 'Giacche e Cappotti'].includes(it.cat);
const anchorsOf = it => Object.assign(defaultAnchors(it), it.fit || {});

// Disegna un capo sul corpo con una sola scala (proporzioni mantenute)
function placeGarment(x, img, it, kp) {
  if (!img) return;
  const A = anchorsOf(it), W = img.width, H = img.height;
  const P = (p) => [p[0] * W, p[1] * H];
  let s, ox, oy;
  if (isTop(it)) {
    const [a, b] = [P(A.shL), P(A.shR)];
    const bodyW = kp.shR[0] - kp.shL[0];
    s = (bodyW * 1.1) / Math.max(4, b[0] - a[0]);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ox = (kp.shL[0] + kp.shR[0]) / 2 - mid[0] * s; oy = (kp.shL[1] + kp.shR[1]) / 2 - 6 - mid[1] * s;
  } else if (it.cat === 'Pantaloni') {
    const [a, b] = [P(A.waL), P(A.waR)];
    s = ((kp.waR[0] - kp.waL[0]) * 1.12) / Math.max(4, b[0] - a[0]);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ox = (kp.waL[0] + kp.waR[0]) / 2 - mid[0] * s; oy = (kp.waL[1] + kp.waR[1]) / 2 - 4 - mid[1] * s;
  } else if (it.cat === 'Scarpe') {
    const [a, b] = [P(A.fL), P(A.fR)];
    s = ((kp.ftR[0] - kp.ftL[0]) * 1.05) / Math.max(4, b[0] - a[0]);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ox = (kp.ftL[0] + kp.ftR[0]) / 2 - mid[0] * s; oy = (kp.ftL[1] + kp.ftR[1]) / 2 - mid[1] * s;
  } else {
    const t = ((it.type || '') + ' ' + it.name).toLowerCase();
    const a = P(A.a);
    if (/cappell|berretto|cuffia/.test(t)) { s = 120 / W; ox = kp.head[0] - a[0] * s; oy = kp.head[1] - 60 - a[1] * s; }
    else if (/sciarp|collan|foulard/.test(t)) { s = (kp.shR[0] - kp.shL[0]) * 0.8 / W; ox = kp.neck[0] - a[0] * s; oy = kp.neck[1] - a[1] * s; }
    else if (/cintur/.test(t)) { s = (kp.waR[0] - kp.waL[0]) * 1.15 / W; ox = (kp.waL[0] + kp.waR[0]) / 2 - W * s / 2; oy = kp.waL[1] - H * s / 2; }
    else { s = 150 / Math.max(W, H); ox = kp.wrR[0] - a[0] * s; oy = kp.wrR[1] + 10 - a[1] * s; }
  }
  // ombra di volume e ombra portata
  x.save();
  x.shadowColor = 'rgba(0,0,0,.18)'; x.shadowBlur = 14; x.shadowOffsetY = 6;
  x.drawImage(img, ox, oy, W * s, H * s);
  x.restore();
}

// Calcola i punti del corpo da usare: manichino o foto
function currentBody() {
  const M = bodyModel();
  if (S.profile.avatarMode === 'photo' && S.profile.avatarPhoto && S.profile.avatarKp) {
    const kp = {}; for (const [k, v] of Object.entries(S.profile.avatarKp)) kp[k] = [v[0] * FIG_W, v[1] * FIG_H];
    return { photo: true, kp, M };
  }
  return { photo: false, kp: M.kp, M };
}

// Disegna la figura vestita: outfit = {tops:[id..], bottom, shoes, acc}
async function drawFigure(canvas, outfit, { shadow = true } = {}) {
  const x = canvas.getContext('2d');
  const sx = canvas.width / FIG_W, sy = canvas.height / FIG_H;
  const B = currentBody();
  const ids = [outfit.bottom, outfit.shoes, ...(outfit.tops || []), outfit.acc];
  const imgs = await Promise.all(ids.map(id => { const it = itemById(id); return it ? getImg(it.img) : null; }));
  const photoImg = B.photo ? await getImg(S.profile.avatarPhoto) : null;
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, canvas.width, canvas.height);
  x.setTransform(sx, 0, 0, sy, 0, 0);
  if (shadow) {
    const fy = Math.max(B.kp.ftL[1], B.kp.ftR[1]) + 8;
    const g = x.createRadialGradient(FIG_W / 2, fy, 10, FIG_W / 2, fy, 170);
    g.addColorStop(0, 'rgba(0,0,0,.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.save(); x.translate(0, fy); x.scale(1, .16); x.translate(0, -fy); x.fillStyle = g; x.beginPath(); x.arc(FIG_W / 2, fy, 170, 0, Math.PI * 2); x.fill(); x.restore();
  }
  if (B.photo && photoImg) x.drawImage(photoImg, 0, 0, FIG_W, FIG_H); else drawMannequin(x, B.M);
  const order = [];
  // pantaloni, scarpe, poi strati dall'interno all'esterno
  if (outfit.bottom) order.push([outfit.bottom, imgs[0]]);
  if (outfit.shoes) order.push([outfit.shoes, imgs[1]]);
  (outfit.tops || []).forEach((id, i) => order.push([id, imgs[2 + i]]));
  for (const [id, img] of order) { const it = itemById(id); if (it) placeGarment(x, img, it, B.kp); }
  if (!B.photo) drawHands(x, B.M);
  if (outfit.acc) { const it = itemById(outfit.acc); if (it) placeGarment(x, imgs[imgs.length - 1], it, B.kp); }
  x.setTransform(1, 0, 0, 1, 0, 0);
}
