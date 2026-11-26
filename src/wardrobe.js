/* ===== Navigazione ===== */
function goTab(t) {
  if (S.tab === t) return;
  S.tab = t;
  $$('.screen').forEach(s => s.classList.toggle('active', s.dataset.tab === t));
  $$('#tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  if (t === 'outfit') renderOutfit();
  if (t === 'abbina') renderAbbina();
  if (t === 'profilo') renderProfile();
  $('#scr-' + t).scrollTop = 0;
}

/* ===== Armadio ===== */
const CATS = ['Tutto', 'Maglie', 'Camicie', 'Canotte', 'Felpe e Maglioni', 'Giacche e Cappotti', 'Pantaloni', 'Scarpe', 'Accessori'];
const STYLES = ['Casual', 'Elegante', 'Sport', 'Lavoro', 'Serata', 'Estate'];
const TYPES = {
  'Maglie': ['T-shirt manica corta', 'Maglia manica lunga', 'Henley manica lunga', 'Polo', 'Dolcevita'],
  'Camicie': ['Camicia manica lunga', 'Camicia manica corta', 'Camicia di lino', 'Camicia di jeans'],
  'Canotte': ['Canotta', 'Top', 'Smanicato'],
  'Felpe e Maglioni': ['Felpa girocollo', 'Felpa con cappuccio', 'Maglione', 'Cardigan'],
  'Giacche e Cappotti': ['Giacca', 'Blazer', 'Giubbotto', 'Cappotto', 'Piumino', 'Giacca di jeans'],
  'Pantaloni': ['Jeans', 'Chino', 'Pantaloni eleganti', 'Shorts', 'Pantaloni sportivi', 'Gonna'],
  'Scarpe': ['Sneakers', 'Stivaletti', 'Mocassini', 'Scarpe eleganti', 'Sandali', 'Scarpe sportive'],
  'Accessori': ['Borsa', 'Cintura', 'Cappello', 'Sciarpa', 'Orologio', 'Occhiali', 'Collana']
};
let curCat = 'Tutto', wq = '';

function renderCatTabs() {
  const nav = $('#cat-tabs');
  nav.querySelectorAll('button').forEach(b => b.remove());
  for (const c of CATS) nav.append(h('button', { class: c === curCat ? 'active' : '', onclick: e => { curCat = c; $$('#cat-tabs button').forEach(b => b.classList.toggle('active', b === e.currentTarget)); moveCatInd(); renderWardrobe(); const bt = e.currentTarget; nav.scrollTo({ left: bt.offsetLeft - nav.clientWidth / 2 + bt.offsetWidth / 2, behavior: 'smooth' }); } }, c));
  requestAnimationFrame(moveCatInd);
}
function moveCatInd() {
  const a = $('#cat-tabs button.active'); const ind = $('#cat-ind'); if (!a) return;
  ind.style.width = (a.offsetWidth - 16) + 'px'; ind.style.transform = `translateX(${a.offsetLeft + 8}px)`;
}
function filteredItems() {
  const q = wq.trim().toLowerCase();
  return visibleItems().filter(i => (curCat === 'Tutto' || i.cat === curCat) &&
    (!q || i.name.toLowerCase().includes(q) || nameColor(i.color).includes(q) || (i.colorName || '').toLowerCase().includes(q) || (i.type || '').toLowerCase().includes(q)))
    .sort((a, b) => (b.created || 0) - (a.created || 0));
}
function renderWardrobe(flyId) {
  const grid = $('#wardrobe-grid'); grid.innerHTML = '';
  const list = filteredItems();
  $('#wardrobe-empty').classList.toggle('hidden', list.length > 0);
  list.forEach((it, i) => {
    const card = h('button', { class: 'card' + (it.laundry ? ' laundry' : '') + (it.id === flyId ? ' fly' : ''), style: { animationDelay: it.id === flyId ? '0s' : Math.min(i, 12) * 45 + 'ms' }, onclick: () => openDetail(it.id) },
      h('div', { class: 'ph' }, h('img', { src: it.img, alt: it.name, loading: 'lazy' })),
      it.laundry ? h('span', { class: 'tag' }, 'Nel bucato') : (it.sample ? h('span', { class: 'tag blue' }, 'Esempio') : null),
      h('div', { class: 'meta' }, h('div', { class: 'nm' }, it.name), h('div', { class: 'ct' }, h('i', { class: 'dot', style: { background: it.color } }), it.cat)));
    grid.append(card);
  });
}
function openWardrobeSearch() { $('#wardrobe-search').classList.remove('hidden'); $('#wardrobe-q').focus(); }
function closeWardrobeSearch() { $('#wardrobe-search').classList.add('hidden'); wq = ''; $('#wardrobe-q').value = ''; renderWardrobe(); }

/* ===== Statistiche d'uso ===== */
function wearStats(id) {
  const days = S.calendar.filter(c => (c.items || []).includes(id)).map(c => c.date).sort();
  const it = itemById(id); const n = days.length;
  return { count: n, last: days[n - 1] || null, cpu: it && it.price ? it.price / Math.max(1, n) : null };
}

/* ===== Dettaglio capo ===== */
function openDetail(id) {
  const it = itemById(id); if (!it) return;
  const st = wearStats(id);
  const sh = openSheet({
    title: it.name, full: false, body: b => {
      b.append(
        h('div', { class: 'detail-img' }, h('img', { src: it.img, alt: '' })),
        h('div', { class: 'kv' }, h('span', { class: 'pill-s' }, it.cat), it.type ? h('span', { class: 'pill-s' }, it.type) : null,
          h('span', { class: 'row gap', style: { fontSize: '13px', fontWeight: 600 } }, h('i', { class: 'dot', style: { background: it.color, width: '16px', height: '16px' } }), it.colorName || nameColor(it.color))),
        h('div', { class: 'kv' }, ...(it.styles || []).map(s => h('span', { class: 'chip', style: { height: '28px', fontSize: '12.5px' } }, s))),
        h('div', { class: 'stats' },
          h('div', { class: 'stat' }, h('b', {}, String(st.count)), h('span', {}, 'volte indossato')),
          h('div', { class: 'stat' }, h('b', {}, st.last ? fmtDate(st.last) : 'Mai'), h('span', {}, 'ultima volta')),
          h('div', { class: 'stat' }, h('b', {}, it.price ? eur(st.cpu) : '—'), h('span', {}, 'costo per utilizzo'))),
        h('div', { class: 'actions' },
          h('button', { class: 'btn primary', onclick: () => { sh.close(); goTab('abbina'); setAbbinaStart(it.id); } }, icon('i-spark'), 'Con cosa lo abbino?'),
          h('button', { class: 'btn ghost', onclick: async () => { it.laundry = !it.laundry; await DB.put('items', it); sh.close(); renderWardrobe(); toast(it.laundry ? 'Messo nel bucato' : 'Tolto dal bucato', { action: 'Annulla', onAction: async () => { it.laundry = !it.laundry; await DB.put('items', it); renderWardrobe(); } }); } }, it.laundry ? 'Togli dal bucato (lavato)' : 'Metti nel bucato'),
          h('button', { class: 'btn ghost', onclick: () => { sh.close(); tryOn(it.id); } }, icon('i-body'), 'Provalo'),
          h('button', { class: 'btn ghost', onclick: () => { sh.close(); openItemForm({ item: it }); } }, 'Modifica'),
          ['Accessori'].includes(it.cat) ? null : h('button', { class: 'btn ghost', onclick: () => { sh.close(); openFitEditor(it.id); } }, 'Regola vestibilità sul corpo'),
          h('button', { class: 'btn danger', onclick: async () => { if (!await confirmSheet('Eliminare il capo?', `"${it.name}" verrà tolto dall'armadio.`, 'Elimina')) return; await deleteItem(it.id); sh.close(); } }, icon('i-trash'), 'Elimina'))
      );
    }
  });
}
async function deleteItem(id) {
  const it = itemById(id); if (!it) return;
  S.items = S.items.filter(i => i.id !== id); await DB.del('items', id);
  sanitizeOutfit(); renderWardrobe();
  toast('Capo eliminato', { action: 'Annulla', ms: 5000, onAction: async () => { S.items.push(it); await DB.put('items', it); renderWardrobe(); } });
}

/* ===== Regola vestibilità (ancore del capo) ===== */
function openFitEditor(id) {
  const it = itemById(id); if (!it) return;
  const orig = it.fit ? JSON.parse(JSON.stringify(it.fit)) : null;
  const A = anchorsOf(it);
  const labels = { shL: 'spalla sx', shR: 'spalla dx', waL: 'vita sx', waR: 'vita dx', fL: 'piede sx', fR: 'piede dx' };
  const keys = Object.keys(A).filter(k => labels[k]);
  let saved = false;
  const sh = openSheet({
    title: 'Regola vestibilità', full: true, onClose: () => { if (!saved) { it.fit = orig; } },
    body: b => {
      const wrap = h('div', { class: 'kp-wrap' }); const img = h('img', { src: it.img, style: { width: '100%', display: 'block' } });
      wrap.append(img);
      const prev = h('canvas', { width: 300, height: 550, style: { width: '45%', background: '#fafbfc', borderRadius: '16px' } });
      const update = () => { it.fit = Object.assign({}, it.fit || {}, Object.fromEntries(keys.map(k => [k, A[k]]))); drawFigure(prev, demoOutfitWith(it)); };
      const dots = keys.map(k => {
        const d = h('div', { class: 'kp', 'data-l': labels[k] }); wrap.append(d);
        const pos = () => { d.style.left = (A[k][0] * 100) + '%'; d.style.top = (A[k][1] * 100) + '%'; }; pos();
        d.addEventListener('pointerdown', e => {
          e.preventDefault(); d.setPointerCapture(e.pointerId);
          const mv = ev => { const r = wrap.getBoundingClientRect(); A[k] = [clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1)]; pos(); update(); };
          const up = () => { d.removeEventListener('pointermove', mv); d.removeEventListener('pointerup', up); };
          d.addEventListener('pointermove', mv); d.addEventListener('pointerup', up);
        });
        return { k, pos };
      });
      b.append(h('p', { class: 'sub' }, 'Trascina i punti blu sulla foto del capo: l\'anteprima si aggiorna dal vivo.'),
        h('div', { class: 'row gap', style: { alignItems: 'flex-start' } }, h('div', { style: { width: '55%' } }, wrap), prev),
        h('div', { class: 'row gap', style: { marginTop: '16px' } },
          h('button', { class: 'btn ghost flex1', onclick: () => { const D = defaultAnchors(it); const base = orig && it.sample ? orig : D; keys.forEach(k => A[k] = [...(base[k] || D[k])]); dots.forEach(d => d.pos()); update(); toast('Punti automatici ripristinati'); } }, 'Automatico'),
          h('button', { class: 'btn primary flex1', onclick: async () => { saved = true; update(); await DB.put('items', it); sh.close(); renderOutfit(); toast('Vestibilità salvata'); } }, 'Salva')));
      img.onload = update; update();
    }
  });
}
function demoOutfitWith(it) {
  const o = { tops: [], bottom: null, shoes: null, acc: null };
  const pick = (cat) => visibleItems().find(i => cat.includes(i.cat) && i.id !== it.id);
  if (isTop(it)) { o.tops = [it.id]; o.bottom = pick(['Pantaloni'])?.id; o.shoes = pick(['Scarpe'])?.id; }
  else if (it.cat === 'Pantaloni') { o.bottom = it.id; o.shoes = pick(['Scarpe'])?.id; }
  else if (it.cat === 'Scarpe') { o.shoes = it.id; o.bottom = pick(['Pantaloni'])?.id; }
  else o.acc = it.id;
  return o;
}
