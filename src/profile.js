/* ===== Profilo ===== */
let tempMeasures = null;
function renderProfile() {
  const p = S.profile;
  $('#profile-hello').textContent = p.name ? `Ciao, ${p.name}!` : 'Ciao!';
  const n = visibleItems().length, f = S.outfits.length;
  $('#profile-counts').textContent = `Hai ${n} ${n === 1 ? 'capo' : 'capi'} e ${f} outfit ${f === 1 ? 'preferito' : 'preferiti'}.`;
  renderAvatarCard(); renderMeasures(); renderFavs(); renderTiles(); renderSettings();
}

/* --- Avatar --- */
function renderAvatarCard() {
  const p = S.profile, mode = p.avatarMode;
  $$('#avatar-seg button').forEach(b => b.classList.toggle('on', b.dataset.av === (window._avView || mode)));
  const view = window._avView || mode;
  $('#avatar-seg .seg-ind').style.transform = view === 'photo' ? 'translateX(0)' : 'translateX(100%)';
  const card = $('#avatar-card'); card.innerHTML = '';
  const cv = h('canvas', { class: 'av', width: 192, height: 300 });
  if (view === 'photo') {
    if (p.avatarPhoto) getImg(p.avatarPhoto).then(img => { const x = cv.getContext('2d'); const s = Math.min(192 / FIG_W, 300 / FIG_H); x.drawImage(img, (192 - FIG_W * s) / 2, 0, FIG_W * s, FIG_H * s); });
    card.append(cv, h('div', { class: 'acts' },
      mode === 'photo' ? h('span', { class: 'in-use' }, '✓ In uso') : (p.avatarPhoto ? h('button', { class: 'btn primary sm', onclick: () => setAvatarMode('photo') }, 'Usa la tua foto') : null),
      h('button', { class: 'btn ghost sm', onclick: changeAvatarPhoto }, p.avatarPhoto ? 'Cambia foto' : 'Aggiungi la tua foto'),
      p.avatarPhoto ? h('button', { class: 'btn ghost sm', onclick: openKeypointEditor }, 'Correggi i punti') : h('p', { class: 'tiny' }, 'In piedi, di fronte, braccia lungo i fianchi, abiti aderenti (canotta e pantaloncini) su sfondo chiaro.')));
  } else {
    const x = cv.getContext('2d'); x.scale(192 / FIG_W * 1.0, 300 / FIG_H); x.translate(FIG_W * 0.0, 0);
    drawMannequin(x, bodyModel());
    card.append(cv, h('div', { class: 'acts' },
      mode === 'mannequin' ? h('span', { class: 'in-use' }, '✓ In uso') : h('button', { class: 'btn primary sm', onclick: () => setAvatarMode('mannequin') }, 'Usa il manichino'),
      h('p', { class: 'tiny' }, 'Personalizza forma e misure qui sotto.')));
  }
}
async function setAvatarMode(m) { S.profile.avatarMode = m; window._avView = m; await saveProfile(); renderAvatarCard(); renderOutfitIfVisible(); toast(m === 'photo' ? 'Ora usi la tua foto' : 'Ora usi il manichino'); }
function changeAvatarPhoto() {
  const sh = openSheet({
    title: 'La tua foto', body: b => {
      b.append(h('p', { class: 'sub' }, 'Posa standard: in piedi, di fronte, braccia lungo i fianchi leggermente staccate, piedi alla larghezza delle anche.'),
        h('div', { class: 'src-btns' },
          h('button', { class: 'src-btn', onclick: () => { sh.close(); openCamera({ facing: 'user', guide: 'none', onShot: makeAvatar }); } }, h('span', { class: 'ic' }, icon('i-camera')), h('span', {}, 'Scatta una foto', h('small', {}, 'Fotocamera frontale'))),
          h('button', { class: 'src-btn', onclick: () => { sh.close(); const inp = $('#file-gallery'); inp.value = ''; inp.onchange = () => inp.files[0] && makeAvatar(inp.files[0]); inp.click(); } }, h('span', { class: 'ic' }, icon('i-image')), h('span', {}, 'Scegli dalla galleria', h('small', {}, 'Una foto a figura intera'))))) ;
    }
  });
}
async function makeAvatar(blob) {
  const sh = openSheet({ title: 'Preparo il tuo avatar', body: b => b.append(h('div', { class: 'proc', style: { aspectRatio: '0.6' } }, h('img', { src: URL.createObjectURL(blob) }), h('div', { class: 'scan' }), h('span', { class: 'lbl' }, 'Ritaglio la sagoma…'))) });
  const { blob: cut } = await removeBackground(blob);
  const trimmed = await trimImage(cut, 1400);
  // normalizza in 600×1100: testa in alto, piedi in basso
  const c = document.createElement('canvas'); c.width = FIG_W; c.height = FIG_H; const x = c.getContext('2d');
  const s = Math.min((FIG_H - 60) / trimmed.height, (FIG_W - 20) / trimmed.width);
  const w = trimmed.width * s, hh = trimmed.height * s, ox = (FIG_W - w) / 2, oy = FIG_H - 30 - hh;
  x.drawImage(trimmed, ox, oy, w, hh);
  const top = oy / FIG_H, H = hh / FIG_H, cx = 0.5;
  const P = (dx, fy) => [cx + dx * H * FIG_H / FIG_W, top + fy * H];
  const kp = {
    head: P(0, 0.065), neck: P(0, 0.13), shL: P(-0.125, 0.185), shR: P(0.125, 0.185),
    elL: P(-0.15, 0.38), elR: P(0.15, 0.38), wrL: P(-0.16, 0.52), wrR: P(0.16, 0.52),
    waL: P(-0.075, 0.40), waR: P(0.075, 0.40), hiL: P(-0.095, 0.50), hiR: P(0.095, 0.50),
    knL: P(-0.055, 0.72), knR: P(0.055, 0.72), anL: P(-0.05, 0.935), anR: P(0.05, 0.935), ftL: P(-0.06, 0.985), ftR: P(0.06, 0.985)
  };
  // carnagione dal viso
  const id = x.getImageData(FIG_W * kp.head[0] - 14, FIG_H * kp.head[1] - 8, 28, 28).data; let r = 0, g = 0, bb = 0, n = 0;
  for (let i = 0; i < id.length; i += 4) if (id[i + 3] > 200) { r += id[i]; g += id[i + 1]; bb += id[i + 2]; n++; }
  S.profile.skin = n ? rgbToHex(r / n, g / n, bb / n) : S.profile.skin;
  S.profile.avatarPhoto = c.toDataURL('image/png'); S.profile.avatarKp = kp; S.profile.avatarMode = 'photo'; window._avView = 'photo';
  await saveProfile(); sh.close(); renderProfile(); renderOutfitIfVisible();
  toast('Avatar creato: controlla i punti del corpo');
  openKeypointEditor();
}
const KP_LABELS = { head: 'testa', neck: 'collo', shL: 'spalla', shR: 'spalla', elL: 'gomito', elR: 'gomito', wrL: 'polso', wrR: 'polso', waL: 'vita', waR: 'vita', hiL: 'anca', hiR: 'anca', knL: 'ginocchio', knR: 'ginocchio', anL: 'caviglia', anR: 'caviglia', ftL: 'piede', ftR: 'piede' };
function openKeypointEditor() {
  const p = S.profile; if (!p.avatarPhoto) return;
  const kp = JSON.parse(JSON.stringify(p.avatarKp));
  const sh = openSheet({
    title: 'Correggi i punti del corpo', full: true, body: b => {
      const wrap = h('div', { class: 'kp-wrap', style: { width: '78%', margin: '0 auto', aspectRatio: FIG_W + '/' + FIG_H } }, h('img', { src: p.avatarPhoto, style: { width: '100%', height: '100%', display: 'block' } }));
      for (const k of Object.keys(kp)) {
        const d = h('div', { class: 'kp', 'data-l': KP_LABELS[k] }); wrap.append(d);
        const pos = () => { d.style.left = kp[k][0] * 100 + '%'; d.style.top = kp[k][1] * 100 + '%'; }; pos();
        d.addEventListener('pointerdown', e => {
          e.preventDefault(); d.setPointerCapture(e.pointerId);
          const mv = ev => { const r = wrap.getBoundingClientRect(); kp[k] = [clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1)]; pos(); };
          const up = () => { d.removeEventListener('pointermove', mv); d.removeEventListener('pointerup', up); };
          d.addEventListener('pointermove', mv); d.addEventListener('pointerup', up);
        });
      }
      b.append(h('p', { class: 'sub' }, 'Trascina i punti blu su testa, spalle, gomiti, polsi, vita, anche, ginocchia e caviglie.'), wrap,
        h('button', { class: 'btn primary full', style: { marginTop: '14px' }, onclick: async () => { p.avatarKp = kp; await saveProfile(); sh.close(); renderOutfitIfVisible(); toast('Punti salvati'); } }, 'Salva punti'));
    }
  });
}

/* --- Misure --- */
const MEASURES = [['shape', 'Forma del corpo', 0, 100, v => v < 35 ? 'femminile' : v > 65 ? 'maschile' : 'neutra'], ['height', 'Altezza', 150, 200, v => v + ' cm'], ['weight', 'Peso', 45, 120, v => v + ' kg'],
  ['shoulders', 'Spalle', 0, 100, v => v + '%'], ['chest', 'Petto', 0, 100, v => v + '%'], ['waist', 'Vita', 0, 100, v => v + '%'], ['hips', 'Fianchi', 0, 100, v => v + '%']];
function renderMeasures() {
  tempMeasures = { ...S.profile.measures };
  const box = $('#measure-sliders'); box.innerHTML = '';
  for (const [k, l, mn, mx, fmt] of MEASURES) {
    const val = h('span', {}, fmt(tempMeasures[k]));
    const inp = h('input', { type: 'range', min: mn, max: mx, value: tempMeasures[k] });
    inp.oninput = () => { tempMeasures[k] = +inp.value; val.textContent = fmt(+inp.value); drawMeasurePreview(); };
    box.append(h('div', { class: 'sl' }, h('label', {}, l, val), inp));
  }
  drawMeasurePreview();
}
function drawMeasurePreview() {
  const c = $('#measure-canvas'), x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
  x.scale(c.width / FIG_W, c.height / FIG_H); drawMannequin(x, bodyModel(tempMeasures));
}

/* --- Preferiti --- */
function renderFavs() {
  const box = $('#fav-groups'); box.innerHTML = '';
  if (!S.outfits.length) { box.append(h('p', { class: 'sub' }, 'Nessun outfit salvato. Nella scheda Outfit tocca il cuore per salvarne uno.')); return; }
  const by = {}; S.outfits.forEach(f => (by[f.style] = by[f.style] || []).push(f));
  for (const st of Object.keys(by)) {
    box.append(h('div', { class: 'fav-group' }, h('h3', {}, st), h('div', { class: 'fav-row' }, ...by[st].map(f => h('button', { class: 'fav', onclick: () => openFav(f) }, h('img', { src: f.thumb, alt: '' }), h('b', {}, f.name))))));
  }
}
function openFav(f) {
  const sh = openSheet({
    title: f.name, body: b => {
      const cv = h('canvas', { width: 300, height: 550, style: { width: '150px', background: '#fafbfc', borderRadius: '16px', display: 'block', margin: '0 auto' } });
      drawFigure(cv, f.outfit);
      const sc = outfitScore(outfitItems(f.outfit));
      b.append(cv, h('p', { class: 'center sub' }, `${f.style} · ${sc.pct}% ${scoreLabel(sc.pct)}`),
        h('div', { class: 'actions' },
          h('button', { class: 'btn primary', onclick: () => { sh.close(); applyOutfit(f.outfit); goTab('outfit'); renderOutfit(); } }, 'Prova'),
          h('button', { class: 'btn ghost', onclick: () => { wearToday(f.outfit); sh.close(); } }, 'Indossato oggi'),
          h('button', { class: 'btn danger', onclick: async () => { if (!await confirmSheet('Eliminare l\'outfit?', `"${f.name}" verrà tolto dai preferiti.`, 'Elimina')) return; S.outfits = S.outfits.filter(o => o !== f); await DB.del('outfits', f.id); sh.close(); renderProfile(); toast('Outfit eliminato', { action: 'Annulla', onAction: async () => { S.outfits.push(f); await DB.put('outfits', f); renderProfile(); } }); } }, icon('i-trash'), 'Elimina')));
    }
  });
}

/* --- Il mio stile --- */
function renderTiles() {
  const t = $('#style-tiles'); t.innerHTML = '';
  const inLaundry = visibleItems().filter(i => i.laundry).length;
  const tiles = [['📅', 'Calendario', 'Outfit indossati', openCalendar], ['🌤️', 'Outfit del giorno', 'In base al meteo', openWeather],
    ['📊', 'Statistiche', 'Uso e costo per utilizzo', openStats], ['🎨', 'Palette personale', S.profile.palette ? SEASONS[S.profile.palette].name : 'Scopri i tuoi colori', openPalette],
    ['🧳', 'Valigia', 'Prepara un viaggio', openSuitcase], ['🧺', 'Bucato', inLaundry ? `${inLaundry} capi da lavare` : 'Tutto pulito', openLaundry],
    ['💾', 'Backup', 'Salva e ripristina', openBackup]];
  for (const [em, tt, sub, fn] of tiles) t.append(h('button', { class: 'tile', onclick: fn }, h('span', { class: 'em' }, em), h('div', {}, h('b', {}, tt), h('br'), h('span', {}, sub))));
}

/* Calendario */
function openCalendar() {
  let d0 = new Date(); d0.setDate(1);
  const sh = openSheet({
    title: 'Calendario', full: true, body: b => {
      const head = h('div', { class: 'cal-head' }); const grid = h('div', { class: 'cal' });
      const draw = () => {
        head.innerHTML = ''; grid.innerHTML = '';
        head.append(h('button', { class: 'icon-btn', style: { transform: 'scaleX(-1)' }, onclick: () => { d0.setMonth(d0.getMonth() - 1); draw(); } }, icon('i-chevron')),
          h('b', {}, cap(d0.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }))),
          h('button', { class: 'icon-btn', onclick: () => { d0.setMonth(d0.getMonth() + 1); draw(); } }, icon('i-chevron')));
        ['L', 'M', 'M', 'G', 'V', 'S', 'D'].forEach(w => grid.append(h('div', { class: 'dw' }, w)));
        const off = (d0.getDay() + 6) % 7; for (let i = 0; i < off; i++) grid.append(h('div', { class: 'd out' }));
        const days = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= days; i++) {
          const k = todayKey(new Date(d0.getFullYear(), d0.getMonth(), i)); const e = S.calendar.find(c => c.id === k);
          grid.append(h('button', { class: 'd' + (k === todayKey() ? ' today' : ''), onclick: () => openDay(k, draw) }, String(i),
            e ? h('div', { class: 'mini' }, ...e.items.slice(0, 4).map(id => itemById(id)).filter(Boolean).map(it => h('i', { style: { background: it.color } }))) : null));
        }
      };
      draw();
      b.append(head, grid, h('p', { class: 'tiny', style: { marginTop: '12px' } }, 'Tocca un giorno per segnare cosa hai indossato.'));
    }
  });
}
function openDay(k, redraw) {
  const e = S.calendar.find(c => c.id === k);
  const sh = openSheet({
    title: fmtDate(k), body: b => {
      if (e) {
        const cv = h('canvas', { width: 300, height: 550, style: { width: '140px', display: 'block', margin: '0 auto', background: '#fafbfc', borderRadius: '16px' } });
        drawFigure(cv, e.outfit || { tops: e.items.filter(id => isTop(itemById(id) || {})), bottom: e.items.find(id => itemById(id)?.cat === 'Pantaloni') });
        b.append(cv, h('div', { class: 'actions' },
          h('button', { class: 'btn ghost', onclick: () => { sh.close(); applyOutfit(e.outfit || {}); goTab('outfit'); renderOutfit(); } }, 'Apri nell\'Outfit'),
          h('button', { class: 'btn danger', onclick: async () => { S.calendar = S.calendar.filter(c => c.id !== k); await DB.del('calendar', k); sh.close(); redraw(); toast('Giorno svuotato'); } }, 'Rimuovi')));
      } else {
        b.append(h('p', { class: 'sub' }, 'Cosa hai indossato?'), h('div', { class: 'actions' },
          h('button', { class: 'btn primary', onclick: async () => { await wearToday(O, k); sh.close(); redraw(); } }, 'L\'outfit attuale'),
          ...S.outfits.map(f => h('button', { class: 'btn ghost', onclick: async () => { await wearToday(f.outfit, k); sh.close(); redraw(); } }, '♥ ' + f.name))));
      }
    }
  });
}

/* Meteo */
const WMO = c => c === 0 ? ['☀️', 'Sereno'] : c <= 3 ? ['⛅', 'Poco nuvoloso'] : c <= 48 ? ['🌫️', 'Nebbia'] : c <= 67 ? ['🌧️', 'Pioggia'] : c <= 77 ? ['❄️', 'Neve'] : c <= 82 ? ['🌦️', 'Rovesci'] : ['⛈️', 'Temporale'];
async function getForecast(city) {
  const g = await httpGet('https://geocoding-api.open-meteo.com/v1/search?count=1&language=it&name=' + encodeURIComponent(city), { type: 'json' });
  const loc = g.results && g.results[0]; if (!loc) throw new Error('Città non trovata');
  const f = await httpGet(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16`, { type: 'json' });
  return { loc, f };
}
function openWeather() {
  const sh = openSheet({
    title: 'Outfit del giorno', full: true, body: async b => {
      const cityIn = h('input', { value: S.profile.city, placeholder: 'La tua città' });
      const out = h('div');
      const load = async () => {
        out.innerHTML = '<p class="sub">Carico il meteo…</p>';
        try {
          const { loc, f } = await getForecast(cityIn.value.trim() || 'Milano');
          if (S.profile.city !== cityIn.value.trim()) { S.profile.city = cityIn.value.trim(); saveProfile(); }
          const [em, tx] = WMO(f.current.weather_code); const d = f.daily;
          const tmin = d.temperature_2m_min[0], tmax = d.temperature_2m_max[0], rain = d.precipitation_probability_max[0] > 50;
          out.innerHTML = '';
          out.append(h('div', { class: 'weather' }, h('span', { style: { fontSize: '40px' } }, em), h('div', {}, h('div', { class: 'big' }, Math.round(f.current.temperature_2m) + '°'), h('div', {}, `${loc.name} · ${tx}`), h('div', { class: 'tiny' }, `Min ${Math.round(tmin)}° · Max ${Math.round(tmax)}° · Pioggia ${d.precipitation_probability_max[0]}%`))),
            h('div', { class: 'forecast' }, ...d.time.slice(0, 7).map((t, i) => h('div', {}, new Date(t).toLocaleDateString('it-IT', { weekday: 'short' }), h('b', {}, WMO(d.weather_code[i])[0]), `${Math.round(d.temperature_2m_max[i])}°/${Math.round(d.temperature_2m_min[i])}°`))));
          const tip = tmin < 10 ? 'Fa freddo: strati caldi e una giacca.' : tmin < 16 ? 'Fresco: aggiungi una felpa o un maglione.' : tmax > 26 ? 'Caldo: capi leggeri, una sola maglia.' : 'Temperatura mite: un solo strato va benissimo.';
          out.append(h('p', { class: 'note', style: { margin: '12px 0' } }, tip + (rain ? ' Probabile pioggia: scarpe chiuse.' : '')));
          const res = generateOutfits({ minTemp: (tmin + tmax) / 2 - 3, rain, limit: 3 });
          if (!res.length) out.append(h('p', { class: 'sub' }, 'Nessun outfit adatto a questo meteo con i capi disponibili.'));
          res.forEach((r, i) => out.append(suggestionCard(r, i)));
        } catch (e) { out.innerHTML = ''; out.append(h('p', { class: 'sub' }, 'Meteo non disponibile: ' + e.message + '. Controlla la connessione.')); }
      };
      b.append(h('div', { class: 'search-bar', style: { margin: '0 0 12px' } }, icon('i-search'), cityIn, h('button', { class: 'btn primary sm', onclick: load }, 'Aggiorna')), out);
      cityIn.addEventListener('keydown', e => e.key === 'Enter' && load());
      load();
    }
  });
}

/* Statistiche */
function openStats() {
  openSheet({
    title: 'Statistiche', full: true, body: b => {
      const its = visibleItems(); const st = its.map(i => ({ it: i, ...wearStats(i.id) }));
      const value = its.reduce((s, i) => s + (i.price || 0), 0);
      const worn = st.filter(s => s.count).sort((a, b) => b.count - a.count); const never = st.filter(s => !s.count);
      const max = worn[0] ? worn[0].count : 1;
      const row = (s, right, pct) => h('div', { class: 'bar' }, h('img', { src: s.it.img }), h('div', { class: 'flex1' }, h('div', { style: { fontSize: '13px', fontWeight: 600 } }, s.it.name), pct != null ? h('div', { class: 'tr' }, h('i', { style: { width: pct + '%' } })) : null), h('b', {}, right));
      b.append(h('div', { class: 'stats' }, h('div', { class: 'stat' }, h('b', {}, String(its.length)), h('span', {}, 'capi')), h('div', { class: 'stat' }, h('b', {}, eur(value)), h('span', {}, 'valore')), h('div', { class: 'stat' }, h('b', {}, String(S.calendar.length)), h('span', {}, 'giorni segnati'))),
        h('h3', {}, 'Più indossati'), worn.length ? h('div', { class: 'bars' }, ...worn.slice(0, 8).map(s => row(s, s.count + '×', s.count / max * 100))) : h('p', { class: 'sub' }, 'Segna gli outfit nel calendario o con "Indossato oggi".'),
        h('h3', { style: { marginTop: '18px' } }, 'Costo per utilizzo'), h('div', { class: 'bars' }, ...st.filter(s => s.it.price).sort((a, b) => b.cpu - a.cpu).slice(0, 8).map(s => row(s, eur(s.cpu)))),
        h('h3', { style: { marginTop: '18px' } }, `Mai usati (${never.length})`), h('div', { class: 'bars' }, ...never.slice(0, 20).map(s => row(s, s.it.price ? eur(s.it.price) : ''))));
    }
  });
}

/* Palette */
const SKINS = ['#f6dccb', '#efd0b6', '#e8bf9c', '#d9a77e', '#c68a5f', '#a86b45', '#83502f', '#5c3720'];
function openPalette() {
  let skin = S.profile.skin || SKINS[2]; let season = S.profile.palette || seasonFromSkin(skin);
  const sh = openSheet({
    title: 'Palette personale', full: true, body: b => {
      const res = h('div');
      const draw = () => {
        res.innerHTML = ''; const se = SEASONS[season];
        res.append(h('h3', { style: { marginTop: '16px' } }, se.name), h('p', { class: 'sub' }, se.desc), h('div', { class: 'swatches' }, ...se.colors.map(c => h('i', { style: { background: c }, title: nameColor(c) }))),
          h('h3', { style: { marginTop: '16px' } }, 'Cambia stagione'), h('div', { class: 'chipwrap' }, ...Object.keys(SEASONS).map(k => h('button', { class: 'chip' + (k === season ? ' on' : ''), onclick: () => { season = k; draw(); } }, SEASONS[k].name))));
      };
      const sw = h('div', { class: 'swatches' }, ...SKINS.map(c => h('button', { class: c === skin ? 'on' : '', style: { background: c }, onclick: e => { skin = c; season = seasonFromSkin(c); $$('button', sw).forEach(x => x.classList.toggle('on', x === e.currentTarget)); draw(); } })));
      if (S.profile.skin && !SKINS.includes(S.profile.skin)) sw.prepend(h('button', { class: 'on', style: { background: S.profile.skin }, title: 'Dalla tua foto', onclick: () => { skin = S.profile.skin; season = seasonFromSkin(skin); draw(); } }));
      b.append(h('p', { class: 'sub' }, S.profile.skin ? 'Carnagione rilevata dalla tua foto (puoi cambiarla).' : 'Scegli la tua carnagione:'), sw, res,
        h('button', { class: 'btn primary full', style: { marginTop: '18px' }, onclick: async () => { S.profile.palette = season; S.profile.skin = skin; await saveProfile(); sh.close(); renderTiles(); toast('Palette salvata: gli abbinamenti ne terranno conto'); } }, 'Usa questa palette'));
      draw();
    }
  });
}

/* Valigia */
function openSuitcase() {
  const sh = openSheet({
    title: 'Valigia', full: true, body: b => {
      const city = h('input', { value: S.profile.city, placeholder: 'Destinazione' });
      const start = h('input', { type: 'date', value: todayKey(), min: todayKey() });
      const days = h('input', { type: 'number', min: 1, max: 14, value: 3 });
      const out = h('div');
      const go = async () => {
        out.innerHTML = '<p class="sub">Preparo la valigia…</p>';
        const n = clamp(+days.value || 3, 1, 14);
        let tmin = null, tmax = null, rain = false, note = '';
        try {
          const { loc, f } = await getForecast(city.value.trim() || S.profile.city);
          const i0 = f.daily.time.indexOf(start.value);
          if (i0 >= 0) {
            const sl = (a) => a.slice(i0, i0 + n);
            tmin = Math.min(...sl(f.daily.temperature_2m_min)); tmax = Math.max(...sl(f.daily.temperature_2m_max)); rain = sl(f.daily.precipitation_probability_max).some(p => p > 50);
            note = `${loc.name}: da ${Math.round(tmin)}° a ${Math.round(tmax)}°${rain ? ', possibile pioggia' : ''}.`;
          } else note = 'Previsioni non ancora disponibili per queste date (max 16 giorni): preparo una valigia per meteo mite.';
        } catch (e) { note = 'Meteo non disponibile: preparo una valigia per meteo mite.'; }
        const looks = generateOutfits({ minTemp: tmin == null ? null : (tmin + tmax) / 2 - 2, rain, limit: n * 3 });
        const pick = new Map(); let tops = 0, bottoms = 0, shoes = 0;
        for (const r of looks) {
          for (const it of r.its) {
            if (pick.has(it.id)) continue;
            if (isTop(it) && tops < n) { pick.set(it.id, it); tops++; }
            else if (it.cat === 'Pantaloni' && bottoms < Math.ceil(n / 3) + 0) { pick.set(it.id, it); bottoms++; }
            else if (it.cat === 'Scarpe' && shoes < 2) { pick.set(it.id, it); shoes++; }
          }
        }
        out.innerHTML = '';
        out.append(h('p', { class: 'note' }, note + ` ${pick.size} capi per ${n} ${n === 1 ? 'giorno' : 'giorni'}.`));
        const extra = ['Intimo × ' + (n + 1), 'Calze × ' + (n + 1), 'Pigiama', 'Necessario per l\'igiene', 'Caricabatterie'];
        if (rain) extra.push('Ombrello'); if (tmax != null && tmax > 25) extra.push('Costume e occhiali da sole');
        const ck = (img, label) => { const c = h('span', { class: 'cbox' }, icon('i-check')); return h('button', { class: 'check', style: { width: '100%', textAlign: 'left' }, onclick: () => c.classList.toggle('on') }, img ? h('img', { src: img }) : null, h('span', { class: 'tx' }, label), c); };
        [...pick.values()].forEach(it => out.append(ck(it.img, it.name)));
        extra.forEach(e => out.append(ck(null, e)));
        if (looks.length) { out.append(h('h3', { style: { marginTop: '16px' } }, 'Combinazioni possibili')); looks.slice(0, 3).forEach((r, i) => out.append(suggestionCard(r, i))); }
      };
      b.append(h('div', { class: 'field' }, h('label', {}, 'Destinazione'), city),
        h('div', { class: 'row gap' }, h('div', { class: 'field flex1' }, h('label', {}, 'Partenza'), start), h('div', { class: 'field', style: { width: '110px' } }, h('label', {}, 'Giorni'), days)),
        h('button', { class: 'btn primary full', onclick: go }, '🧳 Prepara la valigia'), out);
    }
  });
}

/* Bucato */
function openLaundry() {
  const sh = openSheet({
    title: 'Bucato', full: true, body: b => {
      const draw = () => {
        b.innerHTML = '';
        const dirty = visibleItems().filter(i => i.laundry);
        b.append(h('p', { class: 'sub' }, dirty.length ? 'Questi capi non vengono proposti negli abbinamenti finché non li segni come lavati.' : 'Nessun capo nel bucato. Aggiungine dal dettaglio di un capo o da qui sotto.'));
        dirty.forEach(it => b.append(h('div', { class: 'check' }, h('img', { src: it.img }), h('span', { class: 'tx' }, it.name), h('button', { class: 'btn ghost sm', onclick: async () => { it.laundry = false; await DB.put('items', it); draw(); renderWardrobe(); renderTiles(); } }, 'Lavato'))));
        b.append(h('div', { class: 'row gap', style: { marginTop: '16px' } },
          h('button', { class: 'btn ghost flex1', onclick: () => pickItemSheet('Metti nel bucato', i => !i.laundry, async it => { it.laundry = true; await DB.put('items', it); draw(); renderWardrobe(); renderTiles(); }) }, '+ Aggiungi'),
          dirty.length ? h('button', { class: 'btn primary flex1', onclick: async () => { for (const it of dirty) { it.laundry = false; await DB.put('items', it); } draw(); renderWardrobe(); renderTiles(); toast('Tutto lavato! 🧺', { action: 'Annulla', onAction: async () => { for (const it of dirty) { it.laundry = true; await DB.put('items', it); } renderWardrobe(); renderTiles(); } }); } }, 'Tutto lavato') : null));
      };
      draw();
    }
  });
}

/* Backup */
async function exportBackup() {
  const data = { app: 'il-tuo-armadio', version: 1, date: new Date().toISOString(), items: S.items, outfits: S.outfits, calendar: S.calendar, profile: S.profile };
  const json = JSON.stringify(data); const name = `armadio-backup-${todayKey()}.json`;
  const FS = Plug('Filesystem'), SH = Plug('Share');
  if (isNative && FS && SH) {
    const r = await FS.writeFile({ path: name, data: json, directory: 'CACHE', encoding: 'utf8' });
    try { await SH.share({ title: 'Backup Il tuo armadio', text: 'Backup del mio armadio', files: [r.uri], dialogTitle: 'Salva su Drive o invia via email' }); }
    catch (e) { if (!/cancel/i.test(e.message || '')) throw e; }
    await FS.writeFile({ path: name, data: json, directory: 'DOCUMENTS', encoding: 'utf8' }).then(() => toast('Copia salvata anche in Documenti')).catch(() => { });
  } else {
    const a = h('a', { href: URL.createObjectURL(new Blob([json], { type: 'application/json' })), download: name }); document.body.append(a); a.click(); a.remove();
    toast('Backup scaricato');
  }
}
function importBackup() {
  const inp = $('#file-json'); inp.value = '';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    let data; try { data = JSON.parse(await f.text()); } catch (e) { return toast('File non valido'); }
    if (data.app !== 'il-tuo-armadio' || !Array.isArray(data.items)) return toast('Questo non è un backup de "Il tuo armadio"');
    if (!await confirmSheet('Ripristinare il backup?', `Sostituirà i dati attuali con ${data.items.length} capi e ${(data.outfits || []).length} outfit del ${new Date(data.date).toLocaleDateString('it-IT')}.`, 'Ripristina')) return;
    for (const s of ['items', 'outfits', 'calendar']) { await DB.clear(s); for (const v of (data[s] || [])) await DB.put(s, v); }
    if (data.profile) { S.profile = Object.assign({}, DEFAULT_PROFILE, data.profile, { id: 'profile' }); await saveProfile(); }
    await loadAll(); renderAll(); toast('Backup ripristinato');
  };
  inp.click();
}
function openBackup() {
  const sh = openSheet({
    title: 'Backup', body: b => b.append(
      h('p', { class: 'sub' }, 'Salva tutto (capi, foto, outfit, calendario e profilo) in un file JSON: condividilo su Google Drive o via email e ripristinalo quando vuoi.'),
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', onclick: async () => { try { await exportBackup(); } catch (e) { toast('Backup non riuscito: ' + e.message); } } }, '💾 Salva e condividi backup'),
        h('button', { class: 'btn ghost', onclick: () => { sh.close(); importBackup(); } }, '📂 Ripristina da file')))
  });
}

/* Impostazioni */
function renderSettings() {
  const L = $('#settings-list'); L.innerHTML = '';
  const sw = h('span', { class: 'switch' + (S.profile.hideSamples ? ' on' : '') });
  L.append(
    h('button', { class: 'li', onclick: () => editText('Il tuo nome', S.profile.name, v => { S.profile.name = v; }) }, h('span', { class: 'tx' }, 'Nome', h('small', {}, S.profile.name || 'Non impostato')), icon('i-chevron')),
    h('button', { class: 'li', onclick: () => editText('La tua città (per il meteo)', S.profile.city, v => { S.profile.city = v || 'Milano'; }) }, h('span', { class: 'tx' }, 'Città', h('small', {}, S.profile.city)), icon('i-chevron')),
    h('button', { class: 'li', onclick: openAiSettings }, h('span', { class: 'tx' }, 'Prova realistica AI', h('small', {}, aiCfg().enabled ? `Attiva · ${TRYON_PROVIDERS[aiCfg().top].name}${aiCfg().token ? ' · con token' : ''}` : 'Spenta: solo manichino 3D')), icon('i-chevron')),
    h('button', { class: 'li', onclick: async () => { S.profile.hideSamples = !S.profile.hideSamples; await saveProfile(); renderAll(); toast(S.profile.hideSamples ? 'Capi di esempio nascosti' : 'Capi di esempio visibili'); } }, h('span', { class: 'tx' }, 'Nascondi capi di esempio', h('small', {}, 'Restano disponibili se li riattivi')), sw));
}
function editText(title, val, set) {
  const sh = openSheet({
    title, body: b => {
      const inp = h('input', { value: val || '' });
      b.append(h('div', { class: 'field' }, inp), h('button', { class: 'btn primary full', onclick: async () => { set(inp.value.trim()); await saveProfile(); sh.close(); renderProfile(); } }, 'Salva'));
      setTimeout(() => inp.focus(), 350);
    }
  });
}
