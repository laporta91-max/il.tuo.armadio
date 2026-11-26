'use strict';
/* ===== Utility ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDate = k => { if (!k) return '—'; const [y, m, d] = k.split('-'); return `${+d}/${+m}/${y}`; };
const eur = v => (v == null || isNaN(v)) ? '—' : v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}
const icon = id => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.innerHTML = `<use href="#${id}"/>`; return s; };

/* ===== Capacitor ===== */
const Cap = window.Capacitor;
const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
const Plug = name => (Cap && Cap.Plugins && Cap.Plugins[name]) || null;

// GET via HTTP nativo (senza CORS) quando possibile
async function httpGet(url, { type = 'text', headers = {} } = {}) {
  const http = Plug('CapacitorHttp');
  if (isNative && http) {
    const r = await http.get({ url, headers, responseType: type === 'blob' ? 'blob' : (type === 'json' ? 'json' : 'text') });
    if (r.status >= 400) throw new Error('HTTP ' + r.status);
    if (type === 'blob') {
      const ct = (r.headers && (r.headers['Content-Type'] || r.headers['content-type'])) || 'image/jpeg';
      return b64ToBlob(r.data, ct.split(';')[0]);
    }
    if (type === 'json' && typeof r.data === 'string') return JSON.parse(r.data);
    return r.data;
  }
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return type === 'blob' ? r.blob() : type === 'json' ? r.json() : r.text();
}
function b64ToBlob(b64, type) {
  const bin = atob(b64); const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return new Blob([a], { type });
}
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('Immagine non caricabile')); i.src = src; });
}
const imgCache = new Map();
function getImg(src) {
  if (!src) return Promise.resolve(null);
  if (!imgCache.has(src)) imgCache.set(src, loadImg(src).catch(() => null));
  return imgCache.get(src);
}

/* ===== IndexedDB ===== */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const rq = indexedDB.open('armadio', 1);
      rq.onupgradeneeded = () => {
        const d = rq.result;
        for (const s of ['items', 'outfits', 'calendar', 'kv']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' });
      };
      rq.onsuccess = () => { this.db = rq.result; res(); };
      rq.onerror = () => rej(rq.error);
    });
  },
  tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode); const s = t.objectStore(store); let out;
      const r = fn(s); if (r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error);
    });
  },
  all(s) { return this.tx(s, 'readonly', st => st.getAll()); },
  put(s, v) { return this.tx(s, 'readwrite', st => st.put(v)); },
  del(s, id) { return this.tx(s, 'readwrite', st => st.delete(id)); },
  clear(s) { return this.tx(s, 'readwrite', st => st.clear()); },
  async get(s, id) { return this.tx(s, 'readonly', st => st.get(id)); }
};

/* ===== Stato ===== */
const S = {
  items: [], outfits: [], calendar: [],
  profile: null,
  tab: 'armadio'
};
const DEFAULT_PROFILE = {
  id: 'profile', name: '', city: 'Milano', hideSamples: false,
  avatarMode: 'mannequin', avatarPhoto: null, avatarKp: null, skin: null,
  measures: { shape: 50, height: 170, weight: 65, shoulders: 50, chest: 50, waist: 50, hips: 50 },
  palette: null, seenIntro: false
};
async function saveProfile() { await DB.put('kv', S.profile); }
const visibleItems = () => S.items.filter(i => !(i.sample && S.profile.hideSamples));
const itemById = id => S.items.find(i => i.id === id);

/* ===== Ripple ===== */
document.addEventListener('pointerdown', e => {
  const t = e.target.closest('.btn,.icon-btn,.fab,.chip,.tabbar button,.src-btn,.tile,.li,.card');
  if (!t) return;
  const r = t.getBoundingClientRect(); const d = Math.max(r.width, r.height) * 2.2;
  const s = h('span', { class: 'rpl', style: { width: d + 'px', height: d + 'px', left: (e.clientX - r.left - d / 2) + 'px', top: (e.clientY - r.top - d / 2) + 'px' } });
  if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
  t.append(s); setTimeout(() => s.remove(), 600);
}, { passive: true });

/* ===== Toast ===== */
function toast(msg, { action, onAction, ms = 3200 } = {}) {
  const box = $('#toasts');
  const t = h('div', { class: 'toast' }, h('span', {}, msg));
  let done = false;
  const close = () => { if (done) return; done = true; t.classList.add('out'); setTimeout(() => t.remove(), 230); };
  if (action) t.append(h('button', { onclick: () => { close(); onAction && onAction(); } }, action));
  box.append(t); setTimeout(close, ms);
  while (box.children.length > 2) box.firstChild.remove();
  return close;
}

/* ===== Bottom sheet ===== */
const sheetStack = [];
function openSheet({ title, body, full = false, onClose }) {
  const root = $('#sheets');
  const scrim = h('div', { class: 'scrim' });
  const closeBtn = h('button', { class: 'icon-btn', 'aria-label': 'Chiudi' }, icon('i-x'));
  const head = h('div', { class: 'sheet-head' }, h('h2', {}, title || ''), closeBtn);
  const content = h('div', { class: 'sheet-body' });
  const sheet = h('div', { class: 'sheet' + (full ? ' full' : '') }, head, content);
  root.append(scrim, sheet);
  const api = {
    el: sheet, body: content,
    setTitle: t => { head.querySelector('h2').textContent = t; },
    close: () => {
      if (api.closed) return; api.closed = true;
      sheet.classList.remove('show'); scrim.classList.remove('show');
      sheet.style.transform = '';
      const i = sheetStack.indexOf(api); if (i >= 0) sheetStack.splice(i, 1);
      setTimeout(() => { sheet.remove(); scrim.remove(); }, 330);
      onClose && onClose();
    }
  };
  if (typeof body === 'function') body(content, api); else if (body) content.append(body);
  scrim.onclick = api.close; closeBtn.onclick = api.close;
  // Trascina giù per chiudere
  let y0 = null, dy = 0;
  const startDrag = e => { y0 = e.clientY; dy = 0; sheet.style.transition = 'none'; head.setPointerCapture && head.setPointerCapture(e.pointerId); };
  head.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; startDrag(e); });
  head.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sheet.style.transform = `translateY(${dy}px)`; });
  const end = () => {
    if (y0 == null) return; y0 = null; sheet.style.transition = '';
    if (dy > 110) api.close(); else sheet.style.transform = '';
  };
  head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
  requestAnimationFrame(() => requestAnimationFrame(() => { sheet.classList.add('show'); scrim.classList.add('show'); }));
  sheetStack.push(api);
  return api;
}
function confirmSheet(title, text, okLabel = 'Conferma', danger = true) {
  return new Promise(res => {
    let answered = false;
    const s = openSheet({
      title, onClose: () => { if (!answered) res(false); }, body: b => {
        b.append(h('p', { class: 'sub' }, text),
          h('div', { class: 'row gap' },
            h('button', { class: 'btn ghost flex1', onclick: () => { answered = true; res(false); s.close(); } }, 'Annulla'),
            h('button', { class: 'btn flex1 ' + (danger ? 'danger' : 'primary'), onclick: () => { answered = true; res(true); s.close(); } }, okLabel)));
      }
    });
  });
}

/* ===== Overlays (fotocamera) ===== */
const overlayStack = [];
function openOverlay(el, onClose) {
  $('#overlays').append(el);
  const api = { el, close: () => { if (api.closed) return; api.closed = true; el.remove(); const i = overlayStack.indexOf(api); if (i >= 0) overlayStack.splice(i, 1); onClose && onClose(); } };
  overlayStack.push(api); return api;
}

/* ===== Tasto indietro ===== */
function handleBack() {
  if (overlayStack.length) { overlayStack[overlayStack.length - 1].close(); return true; }
  if (sheetStack.length) { sheetStack[sheetStack.length - 1].close(); return true; }
  if (!$('#wardrobe-search').classList.contains('hidden')) { closeWardrobeSearch(); return true; }
  if (S.tab !== 'armadio') { goTab('armadio'); return true; }
  return false;
}
