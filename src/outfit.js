/* ===== Outfit ===== */
const O = { tops: [], bottom: null, shoes: null, acc: null };
let slot = 'top', layerIdx = 0;
const BASE_TOPS = ['Maglie', 'Camicie', 'Canotte', 'Felpe e Maglioni'];
const OUTER_TOPS = ['Felpe e Maglioni', 'Giacche e Cappotti', 'Camicie'];
const avail = () => visibleItems().filter(i => !i.laundry);
const cName = it => it.colorName || nameColor(it.color);
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

function candidates(sl = slot, li = layerIdx) {
  const curId = slotValue(sl, li);
  const a = visibleItems().filter(i => !i.laundry || i.id === curId); // un capo nel bucato resta solo se lo stai provando
  if (sl === 'top') {
    const others = O.tops.filter((_, i) => i !== li);
    return a.filter(i => (li === 0 ? BASE_TOPS : OUTER_TOPS).includes(i.cat) && !others.includes(i.id));
  }
  if (sl === 'bottom') return a.filter(i => i.cat === 'Pantaloni');
  if (sl === 'shoes') return a.filter(i => i.cat === 'Scarpe');
  return a.filter(i => i.cat === 'Accessori');
}
const slotValue = (sl = slot, li = layerIdx) => sl === 'top' ? O.tops[li] : O[sl === 'acc' ? 'acc' : sl];
function setSlot(id, sl = slot, li = layerIdx) { if (sl === 'top') O.tops[li] = id; else O[sl] = id; }
const outfitItems = (o = O) => [...(o.tops || []), o.bottom, o.shoes, o.acc].map(itemById).filter(Boolean);

function sanitizeOutfit() {
  const ok = id => { const it = itemById(id); return it && !(it.sample && S.profile.hideSamples); };
  O.tops = O.tops.filter(ok); ['bottom', 'shoes', 'acc'].forEach(k => { if (!ok(O[k])) O[k] = null; });
  if (!O.tops.length) { const t = candidates('top', 0)[0]; if (t) O.tops = [t.id]; }
  if (!O.bottom) O.bottom = candidates('bottom')[0]?.id || null;
  if (!O.shoes) O.shoes = candidates('shoes')[0]?.id || null;
  layerIdx = clamp(layerIdx, 0, Math.max(0, O.tops.length - 1));
}
function renderOutfitIfVisible() { if (S.tab === 'outfit') renderOutfit(); }

function renderOutfit(dir) {
  sanitizeOutfit();
  // strati
  const lt = $('#layer-tabs'); lt.innerHTML = '';
  if (O.tops.length > 1) O.tops.forEach((id, i) => {
    lt.append(h('div', { class: 'layer-tab' + (slot === 'top' && layerIdx === i ? ' on' : '') },
      h('span', { onclick: () => { slot = 'top'; layerIdx = i; renderOutfit(); } }, `Strato ${i + 1}`),
      h('button', { class: 'x', 'aria-label': 'Togli strato', onclick: () => removeLayer(i) }, icon('i-x'))));
  });
  // chip
  const ch = $('#slot-chips'); ch.innerHTML = '';
  [['top', 'Sopra'], ['bottom', 'Sotto'], ['shoes', 'Scarpe'], ['acc', 'Accessori']].forEach(([k, l]) =>
    ch.append(h('button', { class: 'chip' + (slot === k ? ' on' : ''), onclick: () => { slot = k; if (k === 'top') layerIdx = O.tops.length - 1; renderOutfit(); } }, l)));
  // miniature
  const th = $('#slot-thumbs'); th.innerHTML = '';
  const cands = candidates();
  if (slot === 'acc' || (slot === 'top' && layerIdx > 0)) th.append(h('button', { class: 'thumb none' + (!slotValue() ? ' on' : ''), onclick: () => { if (slot === 'top') removeLayer(layerIdx); else { O.acc = null; renderOutfit(); } } }, 'Nessuno'));
  if (!cands.length) th.append(h('div', { class: 'sub', style: { padding: '20px 0' } }, 'Nessun capo disponibile in questa categoria.'));
  cands.forEach(it => th.append(h('button', { class: 'thumb' + (slotValue() === it.id ? ' on' : ''), onclick: () => { const prev = cands.findIndex(c => c.id === slotValue()); const ni = cands.indexOf(it); setSlot(it.id); renderOutfit(ni > prev ? 'l' : 'r'); } }, h('img', { src: it.img, alt: it.name }))));
  const on = th.querySelector('.thumb.on'); if (on) th.scrollTo({ left: on.offsetLeft - th.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' });
  // lati sfocati
  const cur = cands.findIndex(c => c.id === slotValue());
  const pv = cands[(cur - 1 + cands.length) % cands.length], nx = cands[(cur + 1) % cands.length];
  $('#side-prev').innerHTML = ''; $('#side-next').innerHTML = '';
  if (cands.length > 1) { $('#side-prev').append(h('img', { src: pv.img })); $('#side-next').append(h('img', { src: nx.img })); }
  // figura
  const fw = $('#figure-wrap');
  if (dir) { fw.classList.remove('slide-l', 'slide-r'); void fw.offsetWidth; fw.classList.add(dir === 'l' ? 'slide-l' : 'slide-r'); }
  drawFigure($('#outfit-canvas'), O);
  // punteggio
  const sc = outfitScore(outfitItems());
  $('#outfit-score').innerHTML = `<b>${sc.pct}%</b> · ${scoreLabel(sc.pct)}`;
  $('#outfit-score').style.color = sc.pct >= 78 ? 'var(--ok)' : sc.pct >= 65 ? 'var(--warn)' : 'var(--bad)';
  // preferito?
  const key = outfitKey(O); const isFav = S.outfits.some(f => outfitKey(f.outfit) === key);
  const fb = $('#btn-outfit-fav'); fb.classList.toggle('on', isFav); fb.innerHTML = ''; fb.append(icon(isFav ? 'i-heart-f' : 'i-heart'));
  renderShopList();
}
const outfitKey = o => [...(o.tops || []), '|', o.bottom, o.shoes, o.acc].join(',');

function stepSlot(d) {
  const c = candidates(); if (c.length < 2 && !(c.length === 1 && !slotValue())) return;
  const i = c.findIndex(x => x.id === slotValue());
  setSlot(c[(i + d + c.length) % c.length].id); renderOutfit(d > 0 ? 'l' : 'r');
}
function addLayer() {
  if (O.tops.length >= 3) return toast('Massimo 3 strati');
  const c = candidates('top', O.tops.length).filter(i => i.cat !== 'Camicie' || O.tops.length);
  const prefer = c.find(i => i.cat === (O.tops.length === 1 ? 'Felpe e Maglioni' : 'Giacche e Cappotti')) || c.find(i => i.cat !== 'Camicie') || c[0];
  if (!prefer) return toast('Non hai capi da mettere sopra (felpe, giacche)');
  O.tops.push(prefer.id); slot = 'top'; layerIdx = O.tops.length - 1;
  navigator.vibrate && navigator.vibrate(20);
  renderOutfit(); toast(`Strato ${O.tops.length} aggiunto: ${prefer.name}`);
}
function removeLayer(i) {
  if (O.tops.length <= 1) return;
  const [rem] = O.tops.splice(i, 1); layerIdx = Math.min(layerIdx, O.tops.length - 1); renderOutfit();
  toast('Strato tolto', { action: 'Annulla', onAction: () => { O.tops.splice(i, 0, rem); renderOutfit(); } });
}
function applyOutfit(o) {
  O.tops = [...(o.tops || [])]; O.bottom = o.bottom || null; O.shoes = o.shoes || null; O.acc = o.acc || null;
  slot = 'top'; layerIdx = 0;
}
function tryOn(id) {
  const it = itemById(id); if (!it) return;
  if (it.laundry) toast('Attenzione: questo capo è nel bucato');
  if (isTop(it)) {
    if (!O.tops.includes(it.id)) {
      if (it.cat === 'Giacche e Cappotti' && O.tops.length) O.tops[O.tops.length > 1 ? O.tops.length - 1 : 1] = it.id;
      else O.tops[0] = it.id;
    }
    O.tops = O.tops.filter(Boolean); slot = 'top'; layerIdx = O.tops.indexOf(it.id);
  } else if (it.cat === 'Pantaloni') { O.bottom = it.id; slot = 'bottom'; }
  else if (it.cat === 'Scarpe') { O.shoes = it.id; slot = 'shoes'; }
  else { O.acc = it.id; slot = 'acc'; }
  if (S.tab !== 'outfit') goTab('outfit'); else renderOutfit();
}

/* Gesti sulla figura: scorri e tieni premuto */
function initOutfitGestures() {
  const st = $('#outfit-stage'); const ring = $('#hold-ring');
  let x0, y0, t, moved, pid = null;
  st.addEventListener('pointerdown', e => {
    if (e.target.closest('.match-badge')) return;
    pid = e.pointerId; x0 = e.clientX; y0 = e.clientY; moved = false;
    ring.classList.add('on');
    t = setTimeout(() => { ring.classList.remove('on'); pid = null; addLayer(); }, 700);
  });
  st.addEventListener('pointermove', e => {
    if (pid !== e.pointerId) return;
    if (Math.abs(e.clientX - x0) > 10 || Math.abs(e.clientY - y0) > 10) { moved = true; clearTimeout(t); ring.classList.remove('on'); }
  });
  const end = e => {
    if (pid !== e.pointerId) return; pid = null; clearTimeout(t); ring.classList.remove('on');
    const dx = e.clientX - x0;
    if (moved && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(e.clientY - y0)) stepSlot(dx < 0 ? 1 : -1);
  };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  st.addEventListener('contextmenu', e => e.preventDefault());
}

/* Preferiti */
async function figureThumb(o, w = 300) {
  const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w * FIG_H / FIG_W);
  await drawFigure(c, o); return c.toDataURL('image/webp', 0.85);
}
function openSaveFav(o = O, presetName) {
  const key = outfitKey(o); const ex = S.outfits.find(f => outfitKey(f.outfit) === key);
  if (ex && o === O) {
    return confirmSheet('Togliere dai preferiti?', `"${ex.name}" non sarà più tra i preferiti.`, 'Togli').then(async ok => {
      if (!ok) return; S.outfits = S.outfits.filter(f => f !== ex); await DB.del('outfits', ex.id); renderOutfit(); toast('Tolto dai preferiti', { action: 'Annulla', onAction: async () => { S.outfits.push(ex); await DB.put('outfits', ex); renderOutfit(); } });
    });
  }
  const sc = outfitScore(outfitItems(o));
  const its = outfitItems(o);
  const sh = openSheet({
    title: 'Salva nei preferiti', body: b => {
      const cv = h('canvas', { width: 220, height: 403, style: { width: '110px', height: '202px', background: '#fafbfc', borderRadius: '14px' } });
      drawFigure(cv, o);
      const name = h('input', { value: presetName || its.slice(0, 2).map(cName).map(cap).join(' + ') });
      const common = sc.common && sc.common[0];
      const style = h('select', {}, ...STYLES.map(s => h('option', { value: s, selected: s === (common || 'Casual') }, s)));
      b.append(h('div', { class: 'row gap', style: { alignItems: 'flex-start' } }, cv, h('div', { class: 'flex1' },
        h('div', { class: 'field', style: { marginTop: 0 } }, h('label', {}, 'Nome'), name),
        h('div', { class: 'field' }, h('label', {}, 'Stile'), style),
        h('p', { class: 'tiny' }, `${sc.pct}% · ${scoreLabel(sc.pct)}`))),
        h('button', { class: 'btn primary full', style: { marginTop: '12px' }, onclick: async () => {
          const fav = { id: uid(), name: name.value.trim() || 'Outfit', style: style.value, outfit: JSON.parse(JSON.stringify(o)), thumb: await figureThumb(o), created: Date.now() };
          S.outfits.push(fav); await DB.put('outfits', fav); sh.close(); renderOutfitIfVisible(); toast('Salvato nei preferiti ♥');
        } }, icon('i-heart'), 'Salva'));
    }
  });
}

/* Indossato oggi */
async function wearToday(o = O, date = todayKey()) {
  const prev = S.calendar.find(c => c.id === date);
  const entry = { id: date, date, items: outfitItems(o).map(i => i.id), outfit: JSON.parse(JSON.stringify(o)) };
  S.calendar = S.calendar.filter(c => c.id !== date); S.calendar.push(entry); await DB.put('calendar', entry);
  toast(date === todayKey() ? 'Segnato nel calendario di oggi' : 'Segnato nel calendario', { action: 'Annulla', onAction: async () => { S.calendar = S.calendar.filter(c => c.id !== date); if (prev) { S.calendar.push(prev); await DB.put('calendar', prev); } else await DB.del('calendar', date); } });
}

/* Ricerca nell'outfit */
function openOutfitSearch() {
  const sh = openSheet({
    title: 'Cerca un capo', full: true, body: b => {
      const inp = h('input', { type: 'search', placeholder: 'Nome o colore', autocomplete: 'off' });
      const list = h('div', { class: 'grid', style: { padding: 0, marginTop: '12px' } });
      const run = () => {
        const q = inp.value.trim().toLowerCase(); list.innerHTML = '';
        visibleItems().filter(i => !q || i.name.toLowerCase().includes(q) || cName(i).includes(q) || i.cat.toLowerCase().includes(q)).forEach((it, k) =>
          list.append(h('button', { class: 'card', style: { animationDelay: k * 30 + 'ms' }, onclick: () => { sh.close(); tryOn(it.id); } }, h('div', { class: 'ph' }, h('img', { src: it.img })), h('div', { class: 'meta' }, h('div', { class: 'nm' }, it.name), h('div', { class: 'ct' }, it.cat)))));
      };
      inp.oninput = run;
      b.append(h('div', { class: 'search-bar', style: { margin: 0 } }, icon('i-search'), inp), list); run();
      setTimeout(() => inp.focus(), 350);
    }
  });
}

/* Da comprare per questo look */
const SHOP_COLORS = ['#111111', '#f7f7f5', '#8c8f94', '#d8c7a6', '#1d2a4a', '#b88a55', '#6b4429', '#4a6a92', '#9cad8f', '#6e1a2b', '#8fbbe8', '#6b6b34'];
const SHOP_ITEMS = [
  { cat: 'Giacche e Cappotti', type: 'Giacca', slotK: 'outer' }, { cat: 'Felpe e Maglioni', type: 'Cardigan', slotK: 'outer' },
  { cat: 'Scarpe', type: 'Sneakers', slotK: 'shoes' }, { cat: 'Scarpe', type: 'Mocassini', slotK: 'shoes' },
  { cat: 'Accessori', type: 'Cintura', slotK: 'acc' }, { cat: 'Accessori', type: 'Borsa', slotK: 'acc' },
  { cat: 'Pantaloni', type: 'Chino', slotK: 'bottom' }, { cat: 'Camicie', type: 'Camicia', slotK: 'outer' }
];
function shopSuggestions() {
  const base = outfitItems().filter(i => i.cat !== 'Accessori');
  if (!base.length) return [];
  const owned = visibleItems(); const res = [];
  for (const si of SHOP_ITEMS) {
    if (si.slotK === 'outer' && O.tops.length > 1) continue;
    let best = null;
    for (const c of [...SHOP_COLORS, ...((S.profile.palette && SEASONS[S.profile.palette].colors) || [])]) {
      if (owned.some(o => o.cat === si.cat && colorDist(o.color, c) < 90)) continue; // lo possiedi già
      const fake = { cat: si.cat, color: c, styles: [] };
      const others = si.slotK === 'outer' ? base : base.filter(i => !(si.slotK === 'shoes' && i.cat === 'Scarpe') && !(si.slotK === 'bottom' && i.cat === 'Pantaloni'));
      const sc = outfitScore([...others, fake]).pct;
      if (!best || sc > best.sc) best = { ...si, color: c, sc };
    }
    if (best && best.sc >= 80) res.push(best);
  }
  res.sort((a, b) => b.sc - a.sc);
  const seen = new Set(); return res.filter(r => !seen.has(r.slotK) && seen.add(r.slotK)).slice(0, 3);
}
function renderShopList() {
  const box = $('#shop-list'); box.innerHTML = '';
  const list = shopSuggestions();
  if (!list.length) { box.append(h('p', { class: 'sub' }, 'Il tuo armadio copre già questo look. 👌')); return; }
  for (const s of list) {
    const q = `${s.type} ${nameColor(s.color)}`; const label = `${s.type} · ${nameColor(s.color)}`;
    const L = (n, u) => h('a', { href: u + encodeURIComponent(q), target: '_blank', rel: 'noopener' }, n);
    box.append(h('div', { class: 'shop' }, h('i', { class: 'sw', style: { background: s.color } }),
      h('div', { class: 'tx' }, h('b', {}, label), h('span', {}, `Con questo look: ${s.sc}%`),
        h('div', { class: 'links' }, L('Zalando', 'https://www.zalando.it/catalogo/?q='), L('Amazon', 'https://www.amazon.it/s?k='), L('Google Shopping', 'https://www.google.com/search?tbm=shop&q=')))));
  }
}

/* ===== Abbina: generatore di outfit ===== */
function generateOutfits({ startId = null, style = null, limit = 10, minTemp = null, rain = false } = {}) {
  const a = avail();
  const bases = a.filter(i => BASE_TOPS.includes(i.cat)), bottoms = a.filter(i => i.cat === 'Pantaloni'),
    shoes = a.filter(i => i.cat === 'Scarpe'), outers = a.filter(i => ['Felpe e Maglioni', 'Giacche e Cappotti'].includes(i.cat));
  const start = startId ? itemById(startId) : null;
  const res = [];
  const fits = it => !style || (it.styles || []).includes(style) || it.cat === 'Scarpe' && !(it.styles || []).length;
  const warmthOk = (tops, bottom) => {
    if (minTemp == null) return true;
    const w = tops.reduce((s, id) => s + (WARMTH[itemById(id).cat] || 0), 0);
    const shorts = /short|gonna/i.test(bottom.type || '');
    if (minTemp < 10) return w >= 3 && !shorts;
    if (minTemp < 16) return w >= 2 && !shorts;
    if (minTemp > 24) return w <= 1;
    return w <= 3;
  };
  const shoeList = shoes.length ? shoes : [null];
  for (const t of bases) for (const b of bottoms) for (const sh of shoeList) {
    const layerOpts = [[t.id]];
    if (t.cat !== 'Felpe e Maglioni') for (const o of outers) layerOpts.push([t.id, o.id]);
    for (const tops of layerOpts) {
      const ids = [...tops, b.id, sh && sh.id];
      if (start && !ids.includes(start.id)) continue;
      const its = ids.map(itemById).filter(Boolean);
      if (style && !its.every(fits)) continue;
      if (!warmthOk(tops, b)) continue;
      if (rain && sh && /sandal|tela/i.test(sh.type || '')) continue;
      const sc = outfitScore(its);
      if (sc.pct < 66 || sc.rule === 'stonano') continue; // scarta i capi che non si abbinano
      res.push({ outfit: { tops, bottom: b.id, shoes: sh ? sh.id : null, acc: null }, sc, its });
    }
  }
  res.sort((x, y) => y.sc.pct - x.sc.pct);
  // varietà: ogni capo al massimo 2 volte
  const use = new Map(), out = [];
  for (const r of res) {
    if (r.its.some(i => i.id !== startId && (use.get(i.id) || 0) >= 2)) continue;
    r.its.forEach(i => use.set(i.id, (use.get(i.id) || 0) + 1)); out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}
const outfitTitle = r => { const t = itemById(r.outfit.tops[r.outfit.tops.length - 1]) || r.its[0], b = itemById(r.outfit.bottom); return cap(cName(t)) + ' + ' + cName(b || r.its[1]); };

let abbinaStart = null, abbinaStyle = null;
function setAbbinaStart(id) { abbinaStart = id; renderAbbina(); }
function renderAbbina() {
  const st = abbinaStart && itemById(abbinaStart);
  const si = $('#abbina-start-img'); si.innerHTML = ''; if (st) si.append(h('img', { src: st.img }));
  $('#abbina-start-txt').textContent = st ? `Parto da: ${st.name}` : 'Parti da un capo (facoltativo)';
  const chips = $('#abbina-styles'); chips.innerHTML = '';
  [null, ...STYLES].forEach(s => chips.append(h('button', { class: 'chip' + (abbinaStyle === s ? ' on' : ''), onclick: () => { abbinaStyle = s; renderAbbina(); } }, s || 'Tutti gli stili')));
  if (st) chips.prepend(h('button', { class: 'chip', onclick: () => setAbbinaStart(null) }, '✕ Togli capo'));
  const list = $('#abbina-list'); list.innerHTML = '';
  const res = generateOutfits({ startId: abbinaStart, style: abbinaStyle, limit: 12 });
  if (!res.length) {
    list.append(h('div', { class: 'empty' }, h('p', {}, st && st.laundry ? 'Questo capo è nel bucato.' : 'Nessun abbinamento convincente con i capi disponibili. Prova senza filtro di stile o aggiungi altri capi.'), h('button', { class: 'btn primary', onclick: openAddSheet }, 'Aggiungi un capo')));
    return;
  }
  res.forEach((r, i) => list.append(suggestionCard(r, i)));
}
function suggestionCard(r, i = 0) {
  const cv = h('canvas', { width: 208, height: 380 });
  drawFigure(cv, r.outfit);
  return h('div', { class: 'sugg', style: { animationDelay: i * 60 + 'ms' } }, cv,
    h('div', { class: 'body' },
      h('span', { class: 'pct' + (r.sc.pct < 80 ? ' mid' : '') }, `${r.sc.pct}% · ${scoreLabel(r.sc.pct)}`),
      h('h3', {}, outfitTitle(r)),
      h('p', {}, r.sc.text),
      h('div', { class: 'its' }, ...r.its.map(it => h('img', { src: it.img, title: it.name }))),
      h('div', { class: 'bt' },
        h('button', { class: 'btn primary sm flex1', onclick: () => { applyOutfit(r.outfit); goTab('outfit'); renderOutfit(); } }, 'Prova'),
        h('button', { class: 'btn ghost sm flex1', onclick: () => openSaveFav(r.outfit, outfitTitle(r)) }, 'Salva'))));
}
function pickItemSheet(title, filter, onPick) {
  const sh = openSheet({
    title, full: true, body: b => {
      const g = h('div', { class: 'grid', style: { padding: 0 } });
      visibleItems().filter(filter || (() => true)).forEach((it, k) => g.append(h('button', { class: 'card' + (it.laundry ? ' laundry' : ''), style: { animationDelay: k * 30 + 'ms' }, onclick: () => { sh.close(); onPick(it); } },
        h('div', { class: 'ph' }, h('img', { src: it.img })), it.laundry ? h('span', { class: 'tag' }, 'Nel bucato') : null, h('div', { class: 'meta' }, h('div', { class: 'nm' }, it.name), h('div', { class: 'ct' }, it.cat)))));
      b.append(g);
    }
  });
}
