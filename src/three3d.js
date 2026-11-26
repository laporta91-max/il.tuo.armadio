/* ===== Manichino 3D (Three.js) ===== */
let T3 = null; // THREE quando caricato
const threeReady = new Promise(res => {
  if (window.THREE) { T3 = window.THREE; res(T3); return; }
  window.addEventListener('three-ready', () => { T3 = window.THREE; res(T3); }, { once: true });
  setTimeout(() => res(null), 15000);
});

/* --- Proporzioni del corpo (altezza totale = 1) --- */
function body3D(m = S.profile.measures) {
  const masc = m.shape / 100, wt = clamp((m.weight - 45) / 75, 0, 1), ht = clamp((m.height - 150) / 50, 0, 1);
  const b = 0.88 + wt * 0.45 - ht * 0.08;
  const sh = (0.104 + masc * 0.026 + (m.shoulders - 50) * 0.0006) * b;
  const ch = (0.084 + masc * 0.012 + (m.chest - 50) * 0.0006) * b, chZ = ch * 0.7 + (1 - masc) * 0.008;
  const wa = (0.064 + masc * 0.012 + (m.waist - 50) * 0.0006) * b * (0.9 + wt * 0.25), waZ = wa * 0.82;
  const hi = (0.092 - masc * 0.01 + (m.hips - 50) * 0.0006) * b, hiZ = hi * 0.74;
  const L = (a, c, t) => a + (c - a) * t;
  const torso = [
    [0.468, hi * 0.5, hiZ * 0.6], [0.5, hi * 0.97, hiZ * 0.95], [0.53, hi, hiZ], [0.58, L(hi, wa, .6), L(hiZ, waZ, .6)],
    [0.61, wa, waZ], [0.66, L(wa, ch, .6), L(waZ, chZ, .6)], [0.715, ch, chZ], [0.76, ch * 1.02, chZ * .95],
    [0.795, sh * 0.92, chZ * 0.78], [0.82, sh * 0.55, chZ * 0.58], [0.84, 0.034 * Math.sqrt(b), 0.036], [0.878, 0.029, 0.031]
  ].map(([y, rx, rz]) => ({ y, cx: 0, cz: 0, rx, rz }));
  const leg = s => [
    [0.53, hi * 0.5, hiZ * 0.9, hi * 0.48], [0.46, 0.062 * b, 0.064 * b, hi * 0.47], [0.38, 0.054 * b, 0.056 * b, hi * 0.45],
    [0.29, 0.038 * b, 0.04 * b, hi * 0.42], [0.25, 0.041 * b, 0.043 * b, hi * 0.42], [0.18, 0.044 * b, 0.046 * b, hi * 0.42],
    [0.1, 0.03 * b, 0.032 * b, hi * 0.42], [0.055, 0.022, 0.024, hi * 0.42], [0.035, 0.022, 0.024, hi * 0.42]
  ].map(([y, rx, rz, cx]) => ({ y, cx: s * cx, cz: 0, rx, rz }));
  const arm = s => [
    [0.805, 0.038 * b, sh - 0.012], [0.765, 0.036 * b, sh + 0.002], [0.69, 0.033 * b, sh + 0.012], [0.635, 0.027 * b, sh + 0.02],
    [0.58, 0.029 * b, sh + 0.028], [0.5, 0.02 * b, sh + 0.036], [0.485, 0.019 * b, sh + 0.037]
  ].map(([y, r, cx]) => ({ y, cx: s * cx, cz: 0, rx: r, rz: r * 0.95 }));
  return { torso, legL: leg(-1), legR: leg(1), armL: arm(-1), armR: arm(1), sh, ch, wa, hi, b, height: m.height / 100 };
}

/* --- Geometria per "loft" di anelli ellittici --- */
function loftGeo(rings, { seg = 40, capTop = false, capBot = false } = {}) {
  const T = T3, pos = [], uv = [], idx = [];
  let acc = [0]; for (let i = 1; i < rings.length; i++) acc.push(acc[i - 1] + Math.abs(rings[i].y - rings[i - 1].y));
  const tot = acc[acc.length - 1] || 1;
  rings.forEach((r, i) => {
    for (let j = 0; j <= seg; j++) {
      const th = -Math.PI + (j / seg) * Math.PI * 2;
      pos.push(r.cx + r.rx * Math.sin(th), r.y, r.cz + r.rz * Math.cos(th));
      uv.push(j / seg, 1 - acc[i] / tot);
    }
  });
  const row = seg + 1;
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * row + j, b = a + row;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const cap = (r, top) => {
    const c = pos.length / 3; pos.push(r.cx, r.y, r.cz); uv.push(0.5, top ? 1 : 0);
    const base = (top ? 0 : rings.length - 1) * row;
    for (let j = 0; j < seg; j++) top ? idx.push(c, base + j + 1, base + j) : idx.push(c, base + j, base + j + 1);
  };
  if (capTop) cap(rings[0], true);
  if (capBot) cap(rings[rings.length - 1], false);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// gli anelli del corpo sono dall'alto o dal basso: li ordino dall'alto in basso
const topDown = rs => [...rs].sort((a, b) => b.y - a.y);
function inflate(rings, e, opts = {}) {
  return rings.map(r => {
    let rx = r.rx + e, rz = r.rz + e * 0.9;
    if (opts.boxyBelow != null && r.y < opts.boxyBelow) { rx = Math.max(rx, opts.boxyRx); rz = Math.max(rz, opts.boxyRz); }
    return { ...r, rx, rz };
  });
}
function cutRings(rings, yTop, yBot) {
  // tiene gli anelli tra yTop e yBot, interpolando gli estremi
  const out = []; const rs = topDown(rings);
  const at = y => { for (let i = 0; i < rs.length - 1; i++) { const a = rs[i], b = rs[i + 1]; if (y <= a.y && y >= b.y) { const t = (a.y - y) / (a.y - b.y || 1); return { y, cx: a.cx + (b.cx - a.cx) * t, cz: 0, rx: a.rx + (b.rx - a.rx) * t, rz: a.rz + (b.rz - a.rz) * t }; } } return null; };
  const t0 = at(Math.min(yTop, rs[0].y)); if (t0) out.push(t0);
  rs.forEach(r => { if (r.y < yTop && r.y > yBot) out.push(r); });
  const b0 = at(Math.max(yBot, rs[rs.length - 1].y)); if (b0) out.push(b0);
  return out;
}

/* --- Texture dei capi dalla foto --- */
const texCache = new Map();
function fabricPatch(img, cx = 0.5, cy = 0.72, size = 0.14) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d', { willReadFrequently: true });
  // cerca una zona piena di tessuto vicino a (cx,cy)
  const s = Math.max(8, Math.round(Math.min(img.width, img.height) * size));
  const probe = document.createElement('canvas'); probe.width = img.width; probe.height = img.height; const px = probe.getContext('2d', { willReadFrequently: true }); px.drawImage(img, 0, 0);
  let best = null;
  for (const [dx, dy] of [[0, 0], [-0.15, 0], [0.15, 0], [0, -0.15], [0, 0.1], [-0.2, -0.2], [0.2, -0.2]]) {
    const sx = Math.round((cx + dx) * img.width - s / 2), sy = Math.round((cy + dy) * img.height - s / 2);
    if (sx < 0 || sy < 0 || sx + s > img.width || sy + s > img.height) continue;
    const d = px.getImageData(sx, sy, s, s).data; let op = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 200) op++;
    const f = op / (d.length / 16); if (!best || f > best.f) best = { f, sx, sy };
    if (f > 0.97) break;
  }
  if (best && best.f > 0.6) x.drawImage(img, best.sx, best.sy, s, s, 0, 0, 128, 128);
  else { x.fillStyle = '#888'; x.fillRect(0, 0, 128, 128); }
  // tessera speculare: niente cuciture
  const t = document.createElement('canvas'); t.width = t.height = 256; const tx = t.getContext('2d');
  tx.drawImage(c, 0, 0); tx.save(); tx.translate(256, 0); tx.scale(-1, 1); tx.drawImage(c, 0, 0); tx.restore();
  tx.save(); tx.translate(0, 256); tx.scale(1, -1); tx.drawImage(t, 0, 0, 256, 128, 0, 0, 256, 128); tx.restore();
  return t;
}
function fillPattern(x, patch, w, hgt, dark = 0) {
  x.fillStyle = x.createPattern(patch, 'repeat'); x.fillRect(0, 0, w, hgt);
  if (dark) { x.fillStyle = `rgba(0,0,0,${dark})`; x.fillRect(0, 0, w, hgt); }
}
function mkTex(canvas) { const t = new T3.CanvasTexture(canvas); t.colorSpace = T3.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t; }

async function garmentTextures(it) {
  const key = it.id + ':' + (it.img || '').length + ':' + JSON.stringify(it.fit || {});
  if (texCache.has(key)) return texCache.get(key);
  const img = await getImg(it.img); if (!img) return null;
  const W = img.width, H = img.height, A = anchorsOf(it);
  const patch = fabricPatch(img, 0.5, isTop(it) ? 0.62 : it.cat === 'Pantaloni' ? 0.5 : 0.6);
  const out = { patch: mkTex(patch) };
  out.patch.wrapS = out.patch.wrapT = T3.RepeatWrapping; out.patch.repeat.set(2, 3);
  const C = (w, hh) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; return c; };
  if (isTop(it)) {
    const c = C(1024, 1024), x = c.getContext('2d');
    fillPattern(x, patch, 1024, 1024, 0.06);
    const x0 = Math.max(0, (A.shL[0] - 0.03)) * W, x1 = Math.min(1, (A.shR[0] + 0.03)) * W;
    const y0 = Math.max(0, A.shL[1] - 0.06) * H, y1 = (A.hem || 0.98) * H;
    x.drawImage(img, x0, y0, x1 - x0, y1 - y0, 256, 0, 512, 1024);
    out.torso = mkTex(c);
  } else if (it.cat === 'Pantaloni') {
    const crotchY = 0.3;
    const band = C(1024, 256), bx = band.getContext('2d'); fillPattern(bx, patch, 1024, 256, 0.06);
    bx.drawImage(img, 0, 0, W, H * crotchY, 256, 0, 512, 256); out.band = mkTex(band);
    for (const [k, sx] of [['legL', 0], ['legR', 0.5]]) {
      const c = C(512, 1024), x = c.getContext('2d'); fillPattern(x, patch, 512, 1024, 0.06);
      x.drawImage(img, sx * W, H * (crotchY - 0.06), W * 0.5, H * (1 - crotchY + 0.06), 128, 0, 256, 1024);
      out[k] = mkTex(c);
    }
  } else if (it.cat === 'Scarpe') {
    const c = C(512, 256), x = c.getContext('2d'); fillPattern(x, patch, 512, 256, 0);
    x.drawImage(img, 0, 0, W / 2, H, 128, 0, 256, 256); out.shoe = mkTex(c);
  }
  texCache.set(key, out);
  return out;
}

/* --- Testa con il viso dalla foto --- */
let faceTexKey = null, faceTex = null;
async function faceTexture() {
  const p = S.profile; if (!(p.avatarMode === 'photo' && p.avatarPhoto && p.avatarKp)) return null;
  const key = p.avatarPhoto.length + JSON.stringify(p.avatarKp.head);
  if (faceTexKey === key) return faceTex;
  const img = await getImg(p.avatarPhoto); if (!img) return null;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = p.skin || '#d9b59a'; x.fillRect(0, 0, 1024, 512);
  // viso: riquadro attorno al punto testa
  const [hx, hy] = p.avatarKp.head, nk = p.avatarKp.neck;
  const fh = Math.abs((nk[1] - hy) * FIG_H) * 2.1, fw = fh * 0.8;
  const sx = hx * FIG_W - fw / 2, sy = hy * FIG_H - fh * 0.62;
  const f = document.createElement('canvas'); f.width = 300; f.height = 380; const fx = f.getContext('2d');
  fx.drawImage(img, sx, sy, fw, fh, 0, 0, 300, 380);
  // sfumatura dei bordi
  fx.globalCompositeOperation = 'destination-in';
  const g = fx.createRadialGradient(150, 190, 90, 150, 190, 190); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  fx.fillStyle = g; fx.fillRect(0, 0, 300, 380);
  // sulla sfera il davanti è al centro (u=0.5)
  x.drawImage(f, 512 - 150, 40, 300, 420);
  faceTex = mkTex(c); faceTexKey = key; return faceTex;
}

/* --- Costruzione della scena --- */
function makeShadowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return mkTex(c);
}
const TOP_HEM = it => {
  const t = ((it.type || '') + ' ' + it.name).toLowerCase();
  if (it.cat === 'Giacche e Cappotti') return /cappott|parka/.test(t) ? 0.33 : 0.445;
  if (/crop/.test(t)) return 0.57;
  if (it.cat === 'Camicie') return 0.48;
  return 0.495;
};
async function buildModel(outfit) {
  const T = await threeReady; if (!T) return null;
  const B = body3D(); const group = new T.Group();
  const photo = S.profile.avatarMode === 'photo' && S.profile.avatarPhoto;
  const skinCol = photo && S.profile.skin ? S.profile.skin : '#d6d9df';
  const skin = new T.MeshStandardMaterial({ color: skinCol, roughness: photo ? 0.62 : 0.45, metalness: 0 });
  const add = (geo, mat) => { const m = new T.Mesh(geo, mat); group.add(m); return m; };
  // corpo
  add(loftGeo(topDown(B.torso), { capTop: true, capBot: true }), skin);
  for (const k of ['legL', 'legR', 'armL', 'armR']) add(loftGeo(topDown(B[k]), { capTop: true, capBot: true }), skin);
  for (const s of [-1, 1]) {
    const sj = new T.Mesh(new T.SphereGeometry(0.04 * B.b, 24, 16), skin); sj.position.set(s * (B.sh - 0.012), 0.8, 0); group.add(sj);
    const hand = new T.Mesh(new T.SphereGeometry(1, 20, 14), skin); hand.scale.set(0.016 * B.b, 0.04, 0.026); hand.position.set(s * (B.sh + 0.038), 0.45, 0.004); group.add(hand);
    const foot = new T.Mesh(new T.SphereGeometry(1, 20, 14), skin); foot.scale.set(0.03, 0.022, 0.065); foot.position.set(s * B.hi * 0.42, 0.022, 0.028); group.add(foot);
  }
  const face = await faceTexture();
  const headMat = face ? new T.MeshStandardMaterial({ map: face, roughness: 0.6 }) : skin;
  const head = new T.Mesh(new T.SphereGeometry(1, 48, 32), headMat); head.scale.set(0.056, 0.072, 0.066); head.position.set(0, 0.935, 0.004);
  head.rotation.y = -Math.PI / 2; // la u=0.5 della sfera guarda in avanti
  group.add(head);

  const fabric = (map, extra = {}) => new T.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0, side: T.DoubleSide, ...extra });
  // pantaloni
  const bot = itemById(outfit.bottom);
  if (bot) {
    const tx = await garmentTextures(bot);
    const shorts = /short|bermuda/i.test((bot.type || '') + bot.name);
    const e = 0.008;
    if (tx) {
      add(loftGeo(inflate(cutRings(B.torso, 0.625, 0.468), e)), fabric(tx.band));
      for (const k of ['legL', 'legR']) add(loftGeo(inflate(cutRings(B[k], 0.53, shorts ? 0.33 : 0.05), e + 0.004, { boxyBelow: 0.3, boxyRx: 0.036, boxyRz: 0.038 })), fabric(tx[k]));
    }
  }
  // scarpe
  const shoe = itemById(outfit.shoes);
  if (shoe) {
    const tx = await garmentTextures(shoe);
    const boot = /stival|boot/i.test((shoe.type || '') + shoe.name);
    for (const s of [-1, 1]) {
      const m = new T.Mesh(new T.SphereGeometry(1, 28, 18), fabric(tx ? tx.shoe : null, { color: tx ? '#ffffff' : shoe.color }));
      m.scale.set(0.036, 0.03, 0.075); m.position.set(s * B.hi * 0.42, 0.026, 0.03); group.add(m);
      if (boot) add(loftGeo(inflate(cutRings(B[s < 0 ? 'legL' : 'legR'], 0.12, 0.03), 0.01)), fabric(tx ? tx.patch : null));
    }
  }
  // strati sopra, dall'interno all'esterno
  const tops = (outfit.tops || []).map(itemById).filter(Boolean);
  for (let li = 0; li < tops.length; li++) {
    const it = tops[li], tx = await garmentTextures(it); if (!tx) continue;
    const st = sleeveType(it), loose = ['Felpe e Maglioni', 'Giacche e Cappotti'].includes(it.cat);
    const e = 0.007 + li * 0.009 + (loose ? 0.008 : 0);
    const hem = TOP_HEM(it);
    let rings = cutRings(B.torso, 0.838, hem);
    if (st === 'none') rings = rings.map(r => r.y > 0.79 ? { ...r, rx: r.rx * 0.72 } : r);
    rings = inflate(rings, e, loose ? { boxyBelow: 0.7, boxyRx: B.ch * 1.02 + e, boxyRz: B.ch * 0.74 + e } : {});
    if (bot) rings = rings.map(r => r.y < 0.62 ? { ...r, rx: r.rx + 0.006, rz: r.rz + 0.006 } : r); // sopra i pantaloni
    add(loftGeo(rings), fabric(tx.torso));
    if (st !== 'none') {
      for (const k of ['armL', 'armR']) {
        const end = st === 'long' ? 0.495 : 0.7;
        const sl = inflate(cutRings(B[k], 0.802, end), e + (st === 'short' ? 0.006 : 0.002));
        add(loftGeo(sl), fabric(tx.patch));
      }
    }
  }
  // ombra a terra
  const sh = new T.Mesh(new T.PlaneGeometry(0.7, 0.7), new T.MeshBasicMaterial({ map: makeShadowTex(), transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.001; group.add(sh);
  return group;
}
function makeScene(T) {
  const scene = new T.Scene();
  scene.add(new T.HemisphereLight(0xffffff, 0xb9bcc4, 1.15));
  const key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(1.2, 2.2, 2.4); scene.add(key);
  const rim = new T.DirectionalLight(0xffffff, 0.6); rim.position.set(-1.5, 1.4, -2); scene.add(rim);
  const camera = new T.PerspectiveCamera(20, 600 / 1100, 0.1, 20);
  camera.position.set(0, 0.52, 3.35); camera.lookAt(0, 0.5, 0);
  return { scene, camera };
}

/* --- Vista interattiva nella scheda Outfit --- */
const V3 = { renderer: null, scene: null, camera: null, model: null, rotY: 0, vel: 0, building: 0, canvas: null };
async function show3D(canvas, outfit) {
  const T = await threeReady; if (!T) return false;
  if (!V3.renderer || V3.canvas !== canvas) {
    V3.canvas = canvas;
    V3.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    V3.renderer.outputColorSpace = T.SRGBColorSpace;
    Object.assign(V3, makeScene(T));
    const loop = () => {
      requestAnimationFrame(loop);
      if (!V3.model || !canvas.isConnected || canvas.offsetParent === null) return;
      if (!V3.drag) { V3.rotY += V3.vel; V3.vel *= 0.94; if (Math.abs(V3.vel) < 0.0004) { V3.vel = 0; V3.rotY += (Math.round(V3.rotY / (Math.PI * 2)) * Math.PI * 2 - V3.rotY) * (V3.snap ? 0.06 : 0); } }
      V3.model.rotation.y = V3.rotY;
      V3.renderer.render(V3.scene, V3.camera);
    };
    loop();
  }
  const r = canvas.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (r.width) { V3.renderer.setPixelRatio(dpr); V3.renderer.setSize(r.width, r.height, false); V3.camera.aspect = r.width / r.height; V3.camera.updateProjectionMatrix(); }
  const my = ++V3.building;
  const model = await buildModel(outfit);
  if (my !== V3.building || !model) return true;
  if (V3.model) { V3.scene.remove(V3.model); disposeGroup(V3.model); }
  V3.model = model; V3.scene.add(model);
  return true;
}
function disposeGroup(g) { g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && !o.material.map?.isShared) o.material.dispose(); }); }

/* --- Istantanea per miniature (Abbina, preferiti) --- */
let snapR = null;
const snapCache = new Map(); let snapQueue = Promise.resolve();
function snapshot3D(target, outfit, rotY = 0) {
  const key = JSON.stringify([[...(outfit.tops || []), outfit.bottom, outfit.shoes].map(id => { const it = itemById(id); return it ? id + (it.img || '').length + JSON.stringify(it.fit || '') : ''; }), S.profile.measures, S.profile.avatarMode, (S.profile.avatarPhoto || '').length, S.profile.skin, rotY]);
  const job = snapQueue.then(async () => {
    let url = snapCache.get(key);
    if (!url) { const c = document.createElement('canvas'); c.width = 300; c.height = 550; if (!(await snapshot3DRaw(c, outfit, rotY))) return false; url = c; snapCache.set(key, c); if (snapCache.size > 60) snapCache.delete(snapCache.keys().next().value); }
    const x = target.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, target.width, target.height); x.drawImage(url, 0, 0, target.width, target.height);
    return true;
  });
  snapQueue = job.catch(() => false);
  return job;
}
async function snapshot3DRaw(target, outfit, rotY = 0) {
  const T = await threeReady; if (!T) return false;
  if (!snapR) {
    const c = document.createElement('canvas'); c.width = 300; c.height = 550;
    snapR = { renderer: new T.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true }), ...makeScene(T), c };
    snapR.renderer.outputColorSpace = T.SRGBColorSpace;
  }
  const model = await buildModel(outfit); if (!model) return false;
  model.rotation.y = rotY; snapR.scene.add(model);
  snapR.renderer.setSize(300, 550, false); snapR.camera.aspect = 300 / 550; snapR.camera.updateProjectionMatrix();
  snapR.renderer.render(snapR.scene, snapR.camera);
  const x = target.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, target.width, target.height);
  x.drawImage(snapR.c, 0, 0, target.width, target.height);
  snapR.scene.remove(model); disposeGroup(model);
  return true;
}
