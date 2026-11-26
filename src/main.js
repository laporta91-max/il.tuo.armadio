/* ===== Avvio ===== */
async function loadAll() {
  S.items = await DB.all('items'); S.outfits = await DB.all('outfits'); S.calendar = await DB.all('calendar');
  const p = await DB.get('kv', 'profile');
  S.profile = Object.assign({}, DEFAULT_PROFILE, p || {}, { measures: Object.assign({}, DEFAULT_PROFILE.measures, (p && p.measures) || {}) });
}
function renderAll() {
  renderCatTabs(); renderWardrobe();
  if (S.tab === 'outfit') renderOutfit(); if (S.tab === 'abbina') renderAbbina(); if (S.tab === 'profilo') renderProfile();
}
function bind() {
  $$('#tabbar button').forEach(b => b.onclick = () => goTab(b.dataset.tab));
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]'); if (!a) return;
    if (a.dataset.action === 'add-item') openAddSheet();
    if (a.dataset.action === 'goto-outfit') goTab('outfit');
  });
  $('#btn-search-wardrobe').onclick = () => $('#wardrobe-search').classList.contains('hidden') ? openWardrobeSearch() : closeWardrobeSearch();
  $('#wardrobe-q').oninput = e => { wq = e.target.value; renderWardrobe(); };
  $('#wardrobe-q-clear').onclick = closeWardrobeSearch;
  $('#btn-outfit-fav').onclick = () => openSaveFav();
  $('#btn-outfit-search').onclick = openOutfitSearch;
  $('#btn-wear-today').onclick = () => wearToday();
  $('#btn-outfit-random').onclick = () => {
    const r = generateOutfits({ limit: 15 }); if (!r.length) return toast('Servono più capi per una proposta');
    applyOutfit(r[Math.floor(Math.random() * r.length)].outfit); renderOutfit('l');
  };
  $('#abbina-start').onclick = () => pickItemSheet('Parti da un capo', i => i.cat !== 'Accessori', it => setAbbinaStart(it.id));
  $$('#avatar-seg button').forEach(b => b.onclick = () => { window._avView = b.dataset.av; renderAvatarCard(); });
  $('#btn-save-measures').onclick = async () => { S.profile.measures = { ...tempMeasures }; await saveProfile(); renderAvatarCard(); renderOutfitIfVisible(); toast('Misure salvate'); };
  initOutfitGestures();
  window.addEventListener('resize', moveCatInd);
  const App = Plug('App');
  if (App) App.addListener('backButton', () => { if (!handleBack()) App.exitApp(); });
  else window.addEventListener('keydown', e => { if (e.key === 'Escape') handleBack(); });
}
(async function init() {
  try {
    await DB.open();
    await loadAll();
    if (!(await DB.get('kv', 'profile'))) await saveProfile();
    await ensureSamples();
    S.items = await DB.all('items');
    bind(); renderAll();
    $('#app-version').textContent = 'Il tuo armadio · dati salvati solo sul telefono';
  } catch (e) {
    console.error(e); document.body.innerHTML = '<p style="padding:30px;font-family:sans-serif">Errore di avvio: ' + esc(e.message) + '</p>';
  }
})();
