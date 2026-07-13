(function () {
  const SUPABASE_URL = 'https://axampuprcnauxbbijmmt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_NFuFkO0tybTuMvYOQekQmA_62araOjM';
  const DEFAULT_TILES = [
    ['take-a-look','breakdowns','Breakdowns','Expert repairs for boilers, plumbing, and heating systems of all types.','assets/images/breakdowns.jpg','/services/breakdowns.html'],
    ['take-a-look','common-faults','Common Faults','Guides to help you identify and resolve common heating issues.','assets/images/common-faults.jpg','/support/common-faults.html'],
    ['take-a-look','contact','Contact Us','Get in touch easily - we are here to help with any enquiry.','assets/images/contact.jpg','/contact.html'],
    ['take-a-look','book','Book A Visit','Arrange a convenient appointment with our expert team today.','assets/images/book.png','/book-a-visit.html'],
    ['take-a-look','offers','Offers','Check out our latest deals and seasonal promotions.','assets/images/offers.png','/offers.html'],
    ['take-a-look','boiler-installations','Boiler Installations','Efficient, reliable boiler installations tailored to your property.','assets/images/boiler-installation.jpg','/services/boiler-installation.html'],
    ['take-a-look','annual-servicing','Annual Servicing','Keep your system safe and efficient with regular annual servicing.','assets/images/annual-servicing.jpg','/services/annual-servicing.html'],
    ['take-a-look','testimonials','Customer Testimonials','See what our happy customers have to say about our services.','assets/images/testimonials.jpg','/testimonials.html'],
    ['support','common-faults','Common Faults','Check our easy to follow troubleshooting. It could prevent a callout.','assets/images/common-faults.jpg','/support/common-faults.html'],
    ['support','fault-code-finder','Fault Code Finder','Not sure what that error message means? Use our Fault Code Finder.','assets/images/fault-code-mobile.png','/support/boiler-fault-codes.html'],
    ['support','second-opinion','Second Opinions','Independent advice and reports if you are unsure about another company.','assets/images/second-opinion.jpg','/services/second-opinion.html'],
    ['support','engineers','Are you an engineer?','We are here to support each other.','assets/images/engineers.jpg','/support/engineers.html'],
  ].map((item, index, all) => ({ carousel_key:item[0], tile_key:item[1], title:item[2], description:item[3], image_url:item[4], link_url:item[5], sort_order:(all.slice(0,index).filter(row => row[0] === item[0]).length + 1) * 10, is_active:true }));

  let db; let session; let tiles = []; let editingId = null; let draggedId = null;
  const pageParams = new URLSearchParams(window.location.search);

  async function initialise() {
    const lib = window.supabase || window.Supabase; if (!lib) return setTimeout(initialise, 50);
    db = lib.createClient(SUPABASE_URL, SUPABASE_KEY); window.db = db;
    session = await window.requireAdminSession();
    if (!session) return;
    window.currentSession = session; await window.loadAdminHeader(session); document.body.style.visibility = 'visible'; applyInitialFilter(); await loadTiles(); applyInitialState();
  }

  function applyInitialFilter() {
    const carousel = pageParams.get('carousel');
    if (carousel && document.getElementById('carousel-filter').querySelector(`option[value="${carousel}"]`)) {
      document.getElementById('carousel-filter').value = carousel;
    }
  }

  async function loadTiles() { const { data, error } = await db.from('site_carousel_tiles').select('*').order('sort_order'); if (error) return setStatus('tile-status', error.message, true); tiles = data || []; renderTiles(); }
  function renderTiles() {
    const key = document.getElementById('carousel-filter').value;
    const rows = tiles.filter(tile => tile.carousel_key === key).sort((a,b) => a.sort_order - b.sort_order);
    document.getElementById('tiles-body').innerHTML = rows.length ? rows.map(tile => `<tr draggable="true" data-tile-id="${tile.id}"><td class="drag-handle" title="Drag to reorder">&#9776;</td><td><input type="checkbox" data-toggle-tile="${tile.id}" ${tile.is_active ? 'checked' : ''}></td><td><img src="${escapeAttr(window.adminImageLibrary.imageSrcForAdmin(tile.image_url))}" alt=""></td><td><strong>${escapeHtml(tile.title)}</strong><br><small>${escapeHtml(tile.link_url)}</small></td><td>${escapeHtml(tile.description)}</td><td><div class="row-actions"><button class="site-btn secondary" type="button" data-edit-tile="${tile.id}">Edit</button><button class="site-btn danger" type="button" data-remove-tile="${tile.id}">Delete</button></div></td></tr>`).join('') : '<tr><td colspan="6">No tiles are configured for this carousel.</td></tr>';
    bindRows();
  }

  function applyInitialState() {
    const tileId = pageParams.get('tileId') || pageParams.get('id');
    if (tileId) {
      openEditor(tileId);
      return;
    }
    if (pageParams.get('new') === '1') openEditor();
  }

  function bindRows() {
    document.querySelectorAll('[data-toggle-tile]').forEach(input => input.addEventListener('change', () => setTileActive(input.dataset.toggleTile, input.checked)));
    document.querySelectorAll('[data-edit-tile]').forEach(button => button.addEventListener('click', () => openEditor(button.dataset.editTile)));
    document.querySelectorAll('[data-remove-tile]').forEach(button => button.addEventListener('click', () => deleteTile(button.dataset.removeTile)));
    document.querySelectorAll('tr[data-tile-id]').forEach(row => { row.addEventListener('dragstart', startDrag); row.addEventListener('dragover', dragOver); row.addEventListener('dragleave', event => event.currentTarget.classList.remove('drag-over')); row.addEventListener('drop', dropTile); row.addEventListener('dragend', endDrag); });
  }

  function showList() { document.getElementById('carousel-list-view').classList.remove('hidden'); document.getElementById('carousel-editor-view').classList.add('hidden'); resetEditor(); }
  function openEditor(id = null) {
    resetEditor(); editingId = id;
    if (id) { const tile = tiles.find(item => item.id === id); if (!tile) return; document.getElementById('tile-form-title').textContent = `Editing: ${tile.title}`; document.getElementById('tile-carousel').value = tile.carousel_key; document.getElementById('tile-title').value = tile.title; document.getElementById('tile-link').value = tile.link_url; document.getElementById('tile-image').value = tile.image_url; document.getElementById('tile-description').value = tile.description; document.getElementById('tile-active').checked = tile.is_active; document.getElementById('delete-tile').classList.remove('hidden'); }
    else { document.getElementById('tile-carousel').value = document.getElementById('carousel-filter').value; }
    updateCount(); document.getElementById('carousel-list-view').classList.add('hidden'); document.getElementById('carousel-editor-view').classList.remove('hidden');
  }
  function resetEditor() { editingId = null; document.getElementById('tile-form-title').textContent = 'Add Carousel Tile'; for (const id of ['tile-title','tile-link','tile-image','tile-description']) document.getElementById(id).value = ''; document.getElementById('tile-active').checked = true; document.getElementById('delete-tile').classList.add('hidden'); setStatus('tile-form-status',''); updateCount(); }

  async function saveTile() {
    const title = document.getElementById('tile-title').value.trim(); const description = document.getElementById('tile-description').value.trim(); const image = document.getElementById('tile-image').value.trim(); const link = document.getElementById('tile-link').value.trim();
    if (!title || !description || !image || !link) return setStatus('tile-form-status', 'Complete the tile name, link, image and description.', true);
    const carouselKey = document.getElementById('tile-carousel').value; const existing = tiles.find(item => item.id === editingId);
    const payload = { carousel_key:carouselKey, title, description, image_url:image, link_url:link, is_active:document.getElementById('tile-active').checked, sort_order:existing?.sort_order || nextOrder(carouselKey), updated_at:new Date().toISOString() };
    const result = editingId ? await db.from('site_carousel_tiles').update(payload).eq('id', editingId) : await db.from('site_carousel_tiles').insert([{ ...payload, tile_key: `${Date.now()}-${slug(title)}` }]);
    if (result.error) return setStatus('tile-form-status', result.error.message, true); await loadTiles(); showList(); setStatus('tile-status', 'Carousel tile saved.');
  }

  async function setTileActive(id, active) { const { error } = await db.from('site_carousel_tiles').update({ is_active:active, updated_at:new Date().toISOString() }).eq('id', id); if (error) return setStatus('tile-status', error.message, true); await loadTiles(); }
  async function deleteTile(id = editingId) { const tile = tiles.find(item => item.id === id); if (!tile || !window.confirm(`Delete ${tile.title}? This cannot be undone.`)) return; const { error } = await db.from('site_carousel_tiles').delete().eq('id', id); if (error) return setStatus(editingId ? 'tile-form-status' : 'tile-status', error.message, true); await loadTiles(); showList(); setStatus('tile-status', 'Carousel tile deleted.'); }
  async function seedTiles() { const { error } = await db.from('site_carousel_tiles').upsert(DEFAULT_TILES, { onConflict:'carousel_key,tile_key' }); if (error) return setStatus('tile-status', error.message, true); setStatus('tile-status', 'Current carousel tiles saved.'); await loadTiles(); }
  function chooseImage() { window.adminImageLibrary.open({ session, onSelect:path => { document.getElementById('tile-image').value = path; } }); }
  function updateCount() { document.getElementById('desc-count').textContent = document.getElementById('tile-description').value.length; }

  function startDrag(event) { draggedId = event.currentTarget.dataset.tileId; event.currentTarget.classList.add('dragging'); event.dataTransfer.effectAllowed = 'move'; }
  function dragOver(event) { event.preventDefault(); const row = event.currentTarget; if (row.dataset.tileId === draggedId) return; row.classList.add('drag-over'); const moving = document.querySelector(`tr[data-tile-id="${draggedId}"]`); const after = event.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2; row.parentNode.insertBefore(moving, after ? row.nextSibling : row); }
  async function dropTile(event) { event.preventDefault(); event.currentTarget.classList.remove('drag-over'); const rows = [...document.querySelectorAll('tr[data-tile-id]')]; const results = await Promise.all(rows.map((row,index) => db.from('site_carousel_tiles').update({ sort_order:(index+1)*10, updated_at:new Date().toISOString() }).eq('id', row.dataset.tileId))); const error = results.find(result => result.error)?.error; if (error) setStatus('tile-status', error.message, true); else setStatus('tile-status', 'Carousel order saved.'); await loadTiles(); }
  function endDrag() { document.querySelectorAll('tr[data-tile-id]').forEach(row => row.classList.remove('dragging','drag-over')); draggedId = null; }

  function nextOrder(key) { return Math.max(0, ...tiles.filter(tile => tile.carousel_key === key).map(tile => Number(tile.sort_order) || 0)) + 10; }
  function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
  function setStatus(id,message,error=false) { const el=document.getElementById(id); el.textContent=message||''; el.classList.toggle('error',error); }
  function escapeHtml(value) { return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  function escapeAttr(value) { return escapeHtml(value); }

  document.getElementById('carousel-filter').addEventListener('change', renderTiles); document.getElementById('seed-tiles').addEventListener('click', seedTiles); document.getElementById('add-tile').addEventListener('click', () => openEditor()); document.getElementById('close-tile-editor').addEventListener('click', showList); document.getElementById('choose-tile-image').addEventListener('click', chooseImage); document.getElementById('tile-description').addEventListener('input', updateCount); document.getElementById('save-tile').addEventListener('click', saveTile); document.getElementById('delete-tile').addEventListener('click', () => deleteTile());
  initialise();
}());
