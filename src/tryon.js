/* ===== Prova realistica con AI (Hugging Face, gratuito) ===== */
const gradioReady = new Promise(res => {
  if (window.GradioClient) return res(window.GradioClient);
  window.addEventListener('gradio-ready', () => res(window.GradioClient), { once: true });
  setTimeout(() => res(window.GradioClient || null), 15000);
});
const TRYON_PROVIDERS = {
  idm: { name: 'IDM-VTON', space: 'yisol/IDM-VTON', parts: ['top'], desc: 'Molto realistico per maglie, felpe, giacche' },
  ootd: { name: 'OOTDiffusion', space: 'levihsu/OOTDiffusion', parts: ['top', 'bottom'], desc: 'Funziona anche con pantaloni e gonne' },
  kolors: { name: 'Kolors Try-On', space: 'Kwai-Kolors/Kolors-Virtual-Try-On', parts: ['top'], desc: 'Veloce, solo capi sopra' }
};
const AI_DEFAULTS = { enabled: true, top: 'idm', bottom: 'ootd', token: '', consent: false };
const aiCfg = () => Object.assign({}, AI_DEFAULTS, S.profile.ai || {});

function findUrl(o) {
  if (!o) return null;
  if (typeof o === 'string' && /^(https?:|data:)/.test(o)) return o;
  if (Array.isArray(o)) { for (const v of o) { const u = findUrl(v); if (u) return u; } return null; }
  if (typeof o === 'object') { if (o.url) return o.url; if (o.image) return findUrl(o.image); for (const v of Object.values(o)) { const u = findUrl(v); if (u) return u; } }
  return null;
}
const clients = {};
async function hfClient(space) {
  const G = await gradioReady; if (!G) throw new Error('modulo AI non caricato (serve internet)');
  const tok = aiCfg().token.trim();
  const k = space + '|' + tok;
  if (!clients[k]) clients[k] = G.Client.connect(space, tok ? { token: tok } : {}).catch(e => { delete clients[k]; throw e; });
  return clients[k];
}
async function runProvider(pid, personBlob, garmentBlob, it, part) {
  const G = await gradioReady; const P = TRYON_PROVIDERS[pid];
  const c = await hfClient(P.space); const F = G.handle_file;
  let r;
  if (pid === 'idm') r = await c.predict('/tryon', { dict: { background: F(personBlob), layers: [], composite: null }, garm_img: F(garmentBlob), garment_des: it.name, is_checked: true, is_checked_crop: false, denoise_steps: 30, seed: 42 });
  else if (pid === 'ootd') r = await c.predict('/process_dc', { vton_img: F(personBlob), garm_img: F(garmentBlob), category: part === 'bottom' ? (/gonna/i.test(it.type || '') ? 'Dress' : 'Lower-body') : 'Upper-body', n_samples: 1, n_steps: 20, image_scale: 2, seed: -1 });
  else r = await c.predict('/tryon', { person_img: F(personBlob), garment_img: F(garmentBlob), seed: 0, randomize_seed: true });
  const url = findUrl(r && r.data); if (!url) throw new Error('risposta senza immagine');
  if (url.startsWith('data:')) return b64ToBlob(url.split(',')[1], 'image/png');
  const tok = aiCfg().token.trim();
  const resp = await fetch(url, tok ? { headers: { Authorization: 'Bearer ' + tok } } : {});
  return resp.blob();
}

/* immagini su sfondo bianco, come vogliono i modelli */
async function onWhite(src, w = 768, hgt = 1024, pad = 0.04) {
  const img = await getImg(src); const c = document.createElement('canvas'); c.width = w; c.height = hgt; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, hgt);
  const s = Math.min(w * (1 - pad * 2) / img.width, hgt * (1 - pad * 2) / img.height);
  x.drawImage(img, (w - img.width * s) / 2, (hgt - img.height * s) / 2, img.width * s, img.height * s);
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
}

/* cache in IndexedDB */
function tryonKey(o) {
  const cfg = aiCfg(); const p = S.profile.avatarPhoto || '';
  const s = [p.length, p.slice(-40), cfg.top, cfg.bottom, (o.tops || []).join(','), o.bottom || ''].join('|');
  let hsh = 0; for (let i = 0; i < s.length; i++) hsh = (hsh * 31 + s.charCodeAt(i)) | 0;
  return 'to_' + (hsh >>> 0).toString(36);
}
async function cachedTryon(o) { const r = await DB.get('tryon', tryonKey(o)); return r ? r.img : null; }

const AI = { busy: false, wantKey: null, status: '' };
function aiAvailable() { const c = aiCfg(); return c.enabled && !!S.profile.avatarPhoto; }

// Genera (o recupera) la foto realistica dell'outfit. onStatus(testo) per l'avanzamento.
async function generateTryon(o, onStatus = () => { }) {
  const key = tryonKey(o);
  const hit = await DB.get('tryon', key); if (hit) return hit.img;
  if (!navigator.onLine) throw new Error('sei offline');
  const cfg = aiCfg();
  let person = await onWhite(S.profile.avatarPhoto);
  const steps = [];
  const bot = itemById(o.bottom); if (bot) steps.push([bot, 'bottom']);
  (o.tops || []).map(itemById).filter(Boolean).forEach(t => steps.push([t, 'top']));
  if (!steps.length) throw new Error('nessun capo da provare');
  // risultati parziali in cache: riparto dall'ultimo già pronto
  for (let i = 0; i < steps.length; i++) {
    const [it, part] = steps[i];
    const partial = { tops: steps.slice(0, i + 1).filter(s => s[1] === 'top').map(s => s[0].id), bottom: steps.slice(0, i + 1).find(s => s[1] === 'bottom')?.[0].id || null };
    const pk = tryonKey(partial); const ph = await DB.get('tryon', pk);
    if (ph) { person = b64ToBlob(ph.img.split(',')[1], 'image/jpeg'); continue; }
    const pid = part === 'bottom' ? cfg.bottom : cfg.top;
    onStatus(`L'AI ti sta vestendo: ${it.name} (${i + 1}/${steps.length})…`);
    const garment = await onWhite(it.img, 768, 1024, 0.08);
    let out;
    try { out = await runProvider(pid, person, garment, it, part); }
    catch (e) {
      // ripiego su un altro modello che supporta la parte
      const alt = Object.keys(TRYON_PROVIDERS).find(k => k !== pid && TRYON_PROVIDERS[k].parts.includes(part));
      if (!alt) throw e;
      onStatus(`${TRYON_PROVIDERS[pid].name} occupato, provo ${TRYON_PROVIDERS[alt].name}…`);
      out = await runProvider(alt, person, garment, it, part);
    }
    const url = await onWhiteDataURL(out);
    await DB.put('tryon', { id: pk, img: url, created: Date.now() });
    person = b64ToBlob(url.split(',')[1], 'image/jpeg');
  }
  const fin = await DB.get('tryon', key); return fin ? fin.img : null;
}
async function onWhiteDataURL(blob) {
  const img = await loadImg(URL.createObjectURL(blob)); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0); return c.toDataURL('image/jpeg', 0.9);
}
function niceAiError(e) {
  const m = String(e && e.message || e);
  if (/quota|ZeroGPU|exceeded|limit/i.test(m)) return 'Hai finito la quota gratuita di oggi. Aggiungi un token Hugging Face gratuito nel Profilo o riprova più tardi.';
  if (/offline|network|Failed to fetch|internet/i.test(m)) return 'Serve internet per la foto realistica.';
  if (/sleep|paused|building|Space/i.test(m)) return 'Il servizio AI si sta avviando o è in pausa: riprova tra un minuto o cambia modello nel Profilo.';
  return 'Foto realistica non riuscita: ' + m.slice(0, 120);
}

/* Avviso privacy, una volta sola */
function ensureAiConsent() {
  if (aiCfg().consent) return Promise.resolve(true);
  return new Promise(res => {
    let done = false;
    const sh = openSheet({
      title: 'Foto realistica con AI', onClose: () => { if (!done) res(false); }, body: b => b.append(
        h('p', { class: 'sub' }, 'Per vestirti in modo realistico l\'app invia la tua foto avatar e le foto dei capi a un servizio AI gratuito su Hugging Face (server esterno). Le immagini servono solo a generare il risultato; il risultato resta salvato solo sul telefono.'),
        h('p', { class: 'note' }, 'Consiglio: per risultati migliori usa una foto avatar con abiti aderenti (canotta e pantaloncini), in piedi e di fronte, su sfondo chiaro.'),
        h('div', { class: 'actions' },
          h('button', { class: 'btn primary', onclick: async () => { done = true; S.profile.ai = Object.assign(aiCfg(), { consent: true, enabled: true }); await saveProfile(); sh.close(); res(true); } }, 'Accetto, attiva'),
          h('button', { class: 'btn ghost', onclick: async () => { done = true; S.profile.ai = Object.assign(aiCfg(), { enabled: false }); await saveProfile(); sh.close(); res(false); renderOutfitIfVisible(); } }, 'No, usa solo il 3D')))
    });
  });
}

/* Impostazioni AI nel Profilo */
function openAiSettings() {
  const cfg = aiCfg();
  const sh = openSheet({
    title: 'Prova realistica AI', full: true, body: b => {
      const sw = h('span', { class: 'switch' + (cfg.enabled ? ' on' : '') });
      const sel = (part) => h('select', {}, ...Object.entries(TRYON_PROVIDERS).filter(([, p]) => p.parts.includes(part)).map(([k, p]) => h('option', { value: k, selected: cfg[part] === k }, `${p.name} — ${p.desc}`)));
      const sTop = sel('top'), sBot = sel('bottom');
      const tok = h('input', { type: 'password', value: cfg.token, placeholder: 'hf_… (facoltativo)', autocomplete: 'off' });
      b.append(
        h('button', { class: 'li', style: { border: '1px solid var(--line)', borderRadius: '14px' }, onclick: () => { cfg.enabled = !cfg.enabled; sw.classList.toggle('on', cfg.enabled); } }, h('span', { class: 'tx' }, 'Attiva la foto realistica', h('small', {}, 'Se spenta vedi solo il manichino 3D')), sw),
        h('div', { class: 'field' }, h('label', {}, 'Modello per maglie, felpe, giacche'), sTop),
        h('div', { class: 'field' }, h('label', {}, 'Modello per pantaloni e gonne'), sBot),
        h('div', { class: 'field' }, h('label', {}, 'Token Hugging Face gratuito (più generazioni al giorno)'), tok),
        h('p', { class: 'tiny' }, 'Crealo gratis su huggingface.co → Settings → Access Tokens (tipo "Read"). Resta salvato solo su questo telefono.'),
        h('p', { class: 'note', style: { marginTop: '10px' } }, 'Le scarpe e gli accessori non sono ancora supportati dai modelli gratuiti: nella foto realistica restano quelli della tua foto.'),
        h('div', { class: 'actions', style: { marginTop: '14px' } },
          h('button', { class: 'btn primary', onclick: async () => { S.profile.ai = Object.assign(aiCfg(), { enabled: cfg.enabled, top: sTop.value, bottom: sBot.value, token: tok.value.trim() }); await saveProfile(); for (const k in clients) delete clients[k]; sh.close(); renderProfile(); renderOutfitIfVisible(); toast('Impostazioni AI salvate'); } }, 'Salva'),
          h('button', { class: 'btn ghost', onclick: async () => { await DB.clear('tryon'); toast('Foto realistiche cancellate dalla memoria'); } }, 'Cancella le foto generate'),
          h('button', { class: 'btn ghost', onclick: async () => { S.profile.ai = Object.assign(aiCfg(), { consent: false }); await saveProfile(); toast('Consenso revocato'); } }, 'Revoca il consenso privacy')));
    }
  });
}
