/* ===== Colori ===== */
const NAMED_COLORS = [
  ['nero', '#111111'], ['bianco', '#f7f7f5'], ['grigio', '#8c8f94'], ['grigio chiaro', '#c9cbcf'], ['antracite', '#3a3d42'],
  ['beige', '#d8c7a6'], ['panna', '#efe6d2'], ['cammello', '#b88a55'], ['marrone', '#6b4429'], ['cioccolato', '#4a2c1d'],
  ['blu navy', '#1d2a4a'], ['blu', '#2850a8'], ['azzurro', '#8fbbe8'], ['denim', '#4a6a92'], ['celeste', '#bcd8f2'],
  ['rosso', '#c4262e'], ['bordeaux', '#6e1a2b'], ['rosa', '#ef9fb5'], ['cipria', '#e3bcb5'], ['corallo', '#f07b5f'],
  ['arancione', '#ef7a1a'], ['senape', '#d1a128'], ['giallo', '#f2d33b'], ['verde', '#2f8a4c'], ['verde oliva', '#6b6b34'],
  ['verde salvia', '#9cad8f'], ['verde bottiglia', '#1f4a35'], ['menta', '#a8dcc4'], ['viola', '#6e3c9a'], ['lilla', '#c3a7dc'],
  ['petrolio', '#1f5d66'], ['turchese', '#2db3b0'], ['kaki', '#a69a6a'], ['tortora', '#a3958a']
];
function hexToRgb(hex) { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let hh = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60;
  }
  return [hh, s, l];
}
const hexHsl = hex => rgbToHsl(...hexToRgb(hex));
function colorDist(a, b) { // distanza percettiva semplice
  const [r1, g1, b1] = hexToRgb(a), [r2, g2, b2] = hexToRgb(b); const rm = (r1 + r2) / 2;
  return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2);
}
function nameColor(hex) {
  let best = NAMED_COLORS[0], bd = 1e9;
  for (const c of NAMED_COLORS) { const d = colorDist(hex, c[1]); if (d < bd) { bd = d; best = c; } }
  return best[0];
}
const NEUTRAL_NAMES = ['nero', 'bianco', 'grigio', 'grigio chiaro', 'antracite', 'beige', 'panna', 'cammello', 'blu navy', 'denim', 'tortora', 'kaki', 'marrone', 'cioccolato'];
function isNeutral(hex) {
  const [, s, l] = hexHsl(hex);
  return s < 0.16 || l < 0.13 || l > 0.93 || NEUTRAL_NAMES.includes(nameColor(hex));
}

// Colore dominante dei pixel non trasparenti
function dominantColor(img) {
  const c = document.createElement('canvas'); const W = 64, H = Math.max(1, Math.round(64 * img.height / img.width));
  c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data; const bins = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4);
    const b = bins.get(k) || [0, 0, 0, 0]; b[0] += d[i]; b[1] += d[i + 1]; b[2] += d[i + 2]; b[3]++; bins.set(k, b);
  }
  let best = null; for (const b of bins.values()) if (!best || b[3] > best[3]) best = b;
  if (!best) return '#888888';
  return rgbToHex(best[0] / best[3], best[1] / best[3], best[2] / best[3]);
}

/* ===== Stagioni cromatiche ===== */
const SEASONS = {
  primavera: { name: 'Primavera calda', desc: 'Carnagione chiara e calda: colori luminosi e caldi.', colors: ['#f07b5f', '#f2d33b', '#2db3b0', '#efe6d2', '#b88a55', '#8fbbe8', '#a8dcc4', '#ef9fb5'] },
  estate: { name: 'Estate fredda', desc: 'Carnagione chiara e fredda: colori polverosi e morbidi.', colors: ['#bcd8f2', '#c3a7dc', '#e3bcb5', '#9cad8f', '#8c8f94', '#4a6a92', '#1d2a4a', '#f7f7f5'] },
  autunno: { name: 'Autunno caldo', desc: 'Carnagione media o scura e calda: colori terrosi e profondi.', colors: ['#6b6b34', '#b88a55', '#d1a128', '#6b4429', '#1f5d66', '#ef7a1a', '#d8c7a6', '#1f4a35'] },
  inverno: { name: 'Inverno freddo', desc: 'Contrasto alto e sottotono freddo: colori decisi e puri.', colors: ['#111111', '#f7f7f5', '#c4262e', '#2850a8', '#6e3c9a', '#6e1a2b', '#1d2a4a', '#2db3b0'] }
};
function seasonFromSkin(hex) {
  const [r, g, b] = hexToRgb(hex); const [, , l] = rgbToHsl(r, g, b);
  const warm = (r - b) > 62 || (g - b) > 34; // più giallo/dorato
  if (l > 0.6) return warm ? 'primavera' : 'estate';
  return warm ? 'autunno' : 'inverno';
}

/* ===== Abbinamento ===== */
const WARMTH = { 'Canotte': 0, 'Maglie': 1, 'Camicie': 1, 'Felpe e Maglioni': 2, 'Giacche e Cappotti': 3 };
function hueDiff(a, b) { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

// Valuta una coppia di colori: {score, rule}
function pairScore(c1, c2) {
  const n1 = isNeutral(c1), n2 = isNeutral(c2);
  const [h1, s1, l1] = hexHsl(c1), [h2, s2, l2] = hexHsl(c2);
  const ld = Math.abs(l1 - l2);
  if (n1 && n2) return { score: 84 + Math.min(8, ld * 14), rule: 'neutri' };
  if (n1 || n2) return { score: 90 + Math.min(5, ld * 8), rule: 'accento' };
  const hd = hueDiff(h1, h2);
  if (hd < 16) return ld > 0.18 ? { score: 90, rule: 'tono su tono' } : { score: 74, rule: 'tono su tono' };
  if (hd < 45) return { score: 85, rule: 'analoghi' };
  if (hd > 150) return { score: (s1 > .55 && s2 > .55 && ld < .15) ? 70 : 84, rule: 'complementari' };
  if (ld > 0.38) return { score: 78, rule: 'contrasto' };
  // tonalità lontane, entrambe sature, luminosità simile → stonano
  const clash = Math.min(s1, s2) > 0.45 ? 48 : 64;
  return { score: clash, rule: 'stonano' };
}
const RULE_TEXT = {
  'neutri': 'Tutti colori neutri: un look pulito che funziona sempre.',
  'accento': 'Un colore d\'accento acceso da una base neutra: il capo colorato diventa protagonista.',
  'tono su tono': 'Tono su tono: stessa famiglia di colore con luminosità diverse, elegante e coerente.',
  'analoghi': 'Colori analoghi, vicini sulla ruota cromatica: armonia naturale e morbida.',
  'complementari': 'Colori complementari, opposti sulla ruota: contrasto vivace ma equilibrato.',
  'contrasto': 'Contrasto chiaro/scuro: i capi si staccano bene tra loro.',
  'stonano': 'Questi colori tendono a stonare tra loro.'
};

// Punteggio di un outfit (lista di capi)
function outfitScore(items) {
  items = items.filter(Boolean);
  if (items.length < 2) return { pct: items.length ? 75 : 0, rule: 'neutri', text: 'Aggiungi altri capi per valutare l\'abbinamento.' };
  let total = 0, n = 0, worst = { score: 100 }, mainRule = null;
  const prio = items.filter(i => i.cat !== 'Accessori');
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const w = (items[i].cat === 'Scarpe' || items[j].cat === 'Scarpe' || items[i].cat === 'Accessori' || items[j].cat === 'Accessori') ? .6 : 1;
    const p = pairScore(items[i].color, items[j].color);
    total += p.score * w; n += w;
    if (p.score < worst.score) worst = p;
    if (!mainRule && prio.includes(items[i]) && prio.includes(items[j])) mainRule = p.rule;
  }
  let pct = total / n;
  if (worst.score < 60) pct = Math.min(pct, worst.score + 8);
  // stili in comune
  const styleSets = items.map(i => new Set(i.styles || []));
  const common = [...(styleSets[0] || [])].filter(s => styleSets.every(ss => ss.has(s)));
  if (common.length) pct += 3; else if (styleSets.every(s => s.size)) pct -= 4;
  // palette personale
  const pal = S.profile && S.profile.palette && SEASONS[S.profile.palette];
  let palBonus = false;
  if (pal) {
    const inPal = items.filter(i => isNeutral(i.color) || pal.colors.some(c => colorDist(c, i.color) < 120)).length;
    if (inPal === items.length) { pct += 4; palBonus = true; }
  }
  pct = Math.round(clamp(pct, 30, 98));
  const rule = worst.score < 60 ? 'stonano' : (mainRule || worst.rule);
  let text = RULE_TEXT[rule];
  if (common.length && rule !== 'stonano') text += ` Stile in comune: ${common.join(', ').toLowerCase()}.`;
  if (palBonus) text += ' Tutti i colori rientrano nella tua palette.';
  return { pct, rule, text, common };
}
const scoreLabel = p => p >= 88 ? 'ottimo abbinamento' : p >= 78 ? 'buon abbinamento' : p >= 65 ? 'abbinamento discreto' : 'colori che stonano';
