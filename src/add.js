/* ===== Aggiungi un capo ===== */
function openAddSheet() {
  const sh = openSheet({
    title: 'Aggiungi un capo', body: b => {
      const src = (ic, t, sub, fn) => h('button', { class: 'src-btn', onclick: () => { sh.close(); fn(); } }, h('span', { class: 'ic' }, icon(ic)), h('span', {}, t, h('small', {}, sub)));
      b.append(h('div', { class: 'src-btns' },
        src('i-google', 'Cerca su Google', 'Trova la foto del capo e importala', openImageSearch),
        src('i-camera', 'Scatta foto', 'Usa la fotocamera dentro l\'app', () => openCamera({ facing: 'environment', onShot: blob => processImages([blob]) })),
        src('i-image', 'Scegli dalla galleria', 'Una o più foto', pickFromGallery)));
    }
  });
}
function pickFromGallery() {
  const inp = $('#file-gallery'); inp.value = '';
  inp.onchange = () => { const files = [...inp.files]; if (files.length) processImages(files); };
  inp.click();
}

/* ----- Fotocamera nell'app ----- */
async function openCamera({ facing = 'environment', onShot, guide = 'frame' }) {
  let stream = null, cur = facing;
  const video = h('video', { autoplay: true, playsinline: true, muted: true });
  const msg = h('div', { class: 'cam-msg' }, 'Inquadra il capo dentro la cornice');
  const el = h('div', { class: 'ov cam' }, video, guide === 'frame' ? h('div', { class: 'frame' }) : null, msg,
    h('button', { class: 'rb closeb', 'aria-label': 'Chiudi', onclick: () => ov.close() }, icon('i-x')),
    h('div', { class: 'bar' },
      h('button', { class: 'rb', 'aria-label': 'Galleria', onclick: () => { ov.close(); pickFromGallery(); } }, icon('i-image')),
      h('button', { class: 'shutter', 'aria-label': 'Scatta', onclick: shoot }),
      h('button', { class: 'rb', 'aria-label': 'Cambia fotocamera', onclick: () => { cur = cur === 'environment' ? 'user' : 'environment'; start(); } }, icon('i-flip'))));
  const stop = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
  const ov = openOverlay(el, stop);
  async function start() {
    stop();
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cur, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      video.srcObject = stream; video.style.transform = cur === 'user' ? 'scaleX(-1)' : '';
    } catch (e) {
      ov.close();
      toast('Fotocamera non disponibile: scegli una foto');
      const inp = $('#file-gallery'); inp.value = ''; inp.setAttribute('capture', cur);
      inp.onchange = () => { inp.removeAttribute('capture'); if (inp.files[0]) onShot(inp.files[0]); }; inp.click();
    }
  }
  async function shoot() {
    if (!video.videoWidth) return;
    el.append(h('div', { class: 'flash' }));
    const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
    const x = c.getContext('2d'); if (cur === 'user') { x.translate(c.width, 0); x.scale(-1, 1); } x.drawImage(video, 0, 0);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
    await sleep(350); ov.close(); onShot(blob);
  }
  start();
  return ov;
}

/* ----- Ricerca immagini ----- */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
async function searchImages(q) {
  const dec = s => s.replace(/\\u003d/g, '=').replace(/\\u0026/g, '&').replace(/\\\//g, '/').replace(/&amp;/g, '&');
  const out = new Set();
  try {
    const html = await httpGet('https://www.google.com/search?tbm=isch&hl=it&q=' + encodeURIComponent(q), { headers: { 'User-Agent': UA, 'Accept-Language': 'it-IT,it' } });
    const re = /\["(https?:\/\/[^"]+?)",(\d+),(\d+)\]/g; let m;
    while ((m = re.exec(html)) && out.size < 30) { const u = dec(m[1]); if (!/gstatic\.com|google\.com/.test(u) && +m[2] > 150) out.add(u); }
  } catch (e) { /* passa a Bing */ }
  if (out.size < 6) {
    try {
      const html = await httpGet('https://www.bing.com/images/search?form=HDRSC2&q=' + encodeURIComponent(q), { headers: { 'User-Agent': UA } });
      const re = /murl&quot;:&quot;(.*?)&quot;/g; let m;
      while ((m = re.exec(html)) && out.size < 30) out.add(dec(m[1]));
    } catch (e) { /* nessun risultato */ }
  }
  return [...out];
}
function openImageSearch(prefill = '') {
  const sel = new Set();
  const sh = openSheet({
    title: 'Cerca su Google', full: true, body: b => {
      const inp = h('input', { type: 'search', placeholder: 'Es. felpa nera nike', value: prefill, autocomplete: 'off', enterkeyhint: 'search' });
      const grid = h('div', { class: 'img-grid' });
      const status = h('p', { class: 'sub' }, 'Scrivi cosa cerchi: suggerimento, aggiungi "sfondo bianco" per foto più pulite.');
      const importBtn = h('button', { class: 'btn primary full', disabled: true, onclick: async () => {
        importBtn.disabled = true; importBtn.textContent = 'Importo…';
        const blobs = [];
        for (const u of sel) { try { blobs.push(await httpGet(u, { type: 'blob', headers: { 'User-Agent': UA } })); } catch (e) { /* salta */ } }
        sh.close();
        if (!blobs.length) return toast('Non sono riuscito a scaricare le immagini scelte');
        processImages(blobs);
      } }, 'Importa le foto scelte');
      const run = async () => {
        const q = inp.value.trim(); if (!q) return;
        inp.blur(); grid.innerHTML = ''; sel.clear(); importBtn.disabled = true; status.textContent = 'Cerco…';
        const urls = await searchImages(q);
        if (!urls.length) { status.textContent = isNative ? 'Nessun risultato. Controlla la connessione o prova altre parole.' : 'La ricerca immagini funziona nell\'app Android (qui il browser la blocca).'; return; }
        status.textContent = 'Tocca le foto da importare';
        for (const u of urls) {
          const im = h('img', { src: u, loading: 'lazy', referrerpolicy: 'no-referrer', alt: '' });
          const btn = h('button', { onclick: () => { sel.has(u) ? sel.delete(u) : sel.add(u); btn.classList.toggle('sel', sel.has(u)); importBtn.disabled = !sel.size; importBtn.textContent = sel.size ? `Importa ${sel.size} foto` : 'Importa le foto scelte'; } }, im);
          im.onerror = () => btn.remove(); grid.append(btn);
        }
      };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
      b.append(h('div', { class: 'search-bar', style: { margin: 0 } }, icon('i-search'), inp, h('button', { class: 'btn primary sm', onclick: run }, 'Cerca')), status, grid, h('div', { class: 'sticky-bottom' }, importBtn));
      if (prefill) run(); else setTimeout(() => inp.focus(), 350);
    }
  });
}

/* ----- Rimozione sfondo ----- */
let bgLib = null;
async function removeBackground(blob) {
  try {
    if (!bgLib) bgLib = await Promise.race([import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm'), sleep(20000).then(() => { throw new Error('timeout'); })]);
    const out = await Promise.race([
      bgLib.removeBackground(blob, { publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/', model: 'isnet_quint8', output: { format: 'image/png' } }),
      sleep(90000).then(() => { throw new Error('timeout'); })]);
    return { blob: out, ai: true };
  } catch (e) {
    console.warn('AI sfondo non disponibile:', e);
    return { blob: await floodRemove(blob), ai: false };
  }
}
// Ripiego: riempimento dal bordo con il colore di sfondo
async function floodRemove(blob) {
  const img = await loadImg(URL.createObjectURL(blob));
  const sc = Math.min(1, 900 / Math.max(img.width, img.height));
  const W = Math.round(img.width * sc), H = Math.round(img.height * sc);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, W, H); const id = x.getImageData(0, 0, W, H), d = id.data;
  // colore di sfondo = media dei bordi
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < W; i++) for (const j of [0, H - 1]) { const p = (j * W + i) * 4; r += d[p]; g += d[p + 1]; b += d[p + 2]; n++; }
  for (let j = 0; j < H; j++) for (const i of [0, W - 1]) { const p = (j * W + i) * 4; r += d[p]; g += d[p + 1]; b += d[p + 2]; n++; }
  r /= n; g /= n; b /= n;
  const tol = 46 * 46 * 3; const seen = new Uint8Array(W * H); const st = [];
  for (let i = 0; i < W; i++) st.push(i, (H - 1) * W + i); for (let j = 0; j < H; j++) st.push(j * W, j * W + W - 1);
  while (st.length) {
    const k = st.pop(); if (seen[k]) continue; seen[k] = 1; const p = k * 4;
    const dd = (d[p] - r) ** 2 + (d[p + 1] - g) ** 2 + (d[p + 2] - b) ** 2; if (dd > tol) continue;
    d[p + 3] = 0; const xx = k % W, yy = (k / W) | 0;
    if (xx > 0) st.push(k - 1); if (xx < W - 1) st.push(k + 1); if (yy > 0) st.push(k - W); if (yy < H - 1) st.push(k + W);
  }
  x.putImageData(id, 0, 0);
  return new Promise(res => c.toBlob(res, 'image/png'));
}
// Ritaglia sui pixel visibili e ridimensiona (max 800px)
async function trimImage(blob, max = 800) {
  const img = await loadImg(URL.createObjectURL(blob));
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y += 2) for (let xx = 0; xx < c.width; xx += 2) if (d[(y * c.width + xx) * 4 + 3] > 24) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 <= x0) { x0 = 0; y0 = 0; x1 = c.width; y1 = c.height; }
  const w = x1 - x0, hh = y1 - y0, s = Math.min(1, max / Math.max(w, hh));
  const o = document.createElement('canvas'); o.width = Math.round(w * s); o.height = Math.round(hh * s);
  o.getContext('2d').drawImage(c, x0, y0, w, hh, 0, 0, o.width, o.height);
  return o;
}

/* ----- Elaborazione foto in sequenza ----- */
async function processImages(blobs) {
  for (let i = 0; i < blobs.length; i++) {
    const res = await processOne(blobs[i], blobs.length > 1 ? `Capo ${i + 1} di ${blobs.length}` : '');
    if (res === 'stop') break;
  }
}
function processOne(blob, counter) {
  return new Promise(resolve => {
    let finished = false;
    const sh = openSheet({
      title: counter || 'Nuovo capo', onClose: () => { if (!finished) resolve('stop'); }, body: async b => {
        const raw = URL.createObjectURL(blob);
        const pimg = h('img', { src: raw }); const lbl = h('span', { class: 'lbl' }, 'Rimuovo lo sfondo…');
        const proc = h('div', { class: 'proc' }, pimg, h('div', { class: 'scan' }), lbl);
        b.append(proc);
        const { blob: cut, ai } = await removeBackground(blob);
        if (sh.closed) return;
        const canvas = await trimImage(cut);
        const dataUrl = canvas.toDataURL('image/png');
        const color = dominantColor(canvas);
        finished = true; sh.close();
        if (!ai) toast('Sfondo rimosso in modalità semplice (AI non disponibile)');
        openItemForm({ img: dataUrl, color, counter, onDone: resolve });
      }
    });
  });
}

/* ----- Modulo del capo ----- */
function guessCat(name) {
  const t = name.toLowerCase();
  const map = [[/camici/, 'Camicie'], [/canott|top\b/, 'Canotte'], [/felp|maglion|cardigan|hoodie/, 'Felpe e Maglioni'], [/giacc|cappott|piumin|giubb|blazer|parka/, 'Giacche e Cappotti'],
    [/jeans|pantal|chino|short|gonna|leggings/, 'Pantaloni'], [/scarp|sneaker|stival|mocassin|sandal/, 'Scarpe'], [/borsa|cintur|cappell|sciarp|orolog|occhial|collan/, 'Accessori'], [/maglia|t-shirt|tshirt|polo|henley/, 'Maglie']];
  for (const [re, c] of map) if (re.test(t)) return c;
  return null;
}
function openItemForm({ item, img, color, counter, onDone }) {
  const editing = !!item;
  const it = item ? { ...item } : { id: uid(), name: '', cat: 'Maglie', type: '', color: color || '#888888', styles: [], price: null, img, laundry: false, created: Date.now() };
  let done = false;
  const sh = openSheet({
    title: editing ? 'Modifica capo' : (counter || 'Nuovo capo'), full: true, onClose: () => { if (!done && onDone) onDone('stop'); }, body: b => {
      const name = h('input', { value: it.name, placeholder: 'Es. Felpa blu navy' });
      const cat = h('select', {}, ...CATS.slice(1).map(c => h('option', { value: c, selected: c === it.cat }, c)));
      const type = h('select', {});
      const fillTypes = () => { type.innerHTML = ''; type.append(h('option', { value: '' }, '—'), ...TYPES[cat.value].map(t => h('option', { value: t, selected: t === it.type }, t))); };
      fillTypes(); cat.onchange = fillTypes;
      name.addEventListener('input', () => { const g = guessCat(name.value); if (g && !editing && g !== cat.value) { cat.value = g; fillTypes(); } });
      const colIn = h('input', { type: 'color', value: it.color });
      const colName = h('input', { value: it.colorName || nameColor(it.color) });
      colIn.oninput = () => { colName.value = nameColor(colIn.value); };
      const styleBox = h('div', { class: 'chipwrap' }, ...STYLES.map(s => h('button', { class: 'chip' + (it.styles.includes(s) ? ' on' : ''), onclick: e => { e.currentTarget.classList.toggle('on'); } }, s)));
      const price = h('input', { type: 'number', inputmode: 'decimal', min: 0, step: '0.01', value: it.price ?? '', placeholder: 'Es. 39,90' });
      const save = h('button', { class: 'btn primary full', onclick: async () => {
        it.name = name.value.trim() || (type.value || cat.value) + ' ' + colName.value;
        it.cat = cat.value; it.type = type.value; it.color = colIn.value; it.colorName = colName.value.trim();
        it.styles = $$('.chip.on', styleBox).map(c => c.textContent);
        it.price = price.value ? parseFloat(price.value) : null;
        if (editing && item.cat !== it.cat) delete it.fit;
        await DB.put('items', it);
        const i = S.items.findIndex(x => x.id === it.id); if (i >= 0) S.items[i] = it; else S.items.push(it);
        imgCache.delete(it.img);
        done = true; sh.close();
        if (!editing) { goTab('armadio'); curCat = 'Tutto'; renderCatTabs(); }
        renderWardrobe(editing ? null : it.id); renderOutfitIfVisible();
        toast(editing ? 'Modifiche salvate' : 'Aggiunto all\'armadio');
        onDone && onDone('ok');
      } }, editing ? 'Salva modifiche' : 'Aggiungi all\'armadio');
      b.append(
        h('div', { class: 'proc', style: { aspectRatio: '1.4/1' } }, h('img', { src: it.img })),
        h('div', { class: 'field' }, h('label', {}, 'Nome del capo'), name),
        h('div', { class: 'row gap' }, h('div', { class: 'field flex1' }, h('label', {}, 'Categoria'), cat), h('div', { class: 'field flex1' }, h('label', {}, 'Tipo'), type)),
        h('div', { class: 'field' }, h('label', {}, 'Colore (rilevato dalla foto)'), h('div', { class: 'color-row' }, colIn, colName)),
        h('div', { class: 'field' }, h('label', {}, 'Stili'), styleBox),
        h('div', { class: 'field' }, h('label', {}, 'Prezzo (€)'), price),
        h('div', { class: 'sticky-bottom' }, save));
    }
  });
}
