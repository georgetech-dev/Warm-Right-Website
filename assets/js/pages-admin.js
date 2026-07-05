(function () {
  const SUPABASE_URL = 'https://axampuprcnauxbbijmmt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_NFuFkO0tybTuMvYOQekQmA_62araOjM';
  const PUBLIC_SITE_URL_KEY = 'public_site_base_url';

  const DEFAULT_PAGES = [
    ['home', 'Home', '/index.html', 'main'], ['about', 'About Us', '/about.html', 'main'],
    ['services', 'Services', '#services', 'main'], ['support', 'Support', '#support', 'main'],
    ['rates', 'Our Rates', '/schedule-of-rates.html', 'main'], ['offers', 'Offers', '/offers.html', 'main'],
    ['testimonials', 'Testimonials', '/testimonials.html', 'main'], ['book-a-visit', 'Book A Visit', '/book-a-visit.html', 'main'],
    ['contact', 'Contact Us', '/contact.html', 'main'],
    ['breakdowns', 'Breakdowns', '/services/breakdowns.html', 'services'], ['repairs', 'Repairs', '/services/repairs.html', 'services'],
    ['annual-servicing', 'Annual Servicing', '/services/annual-servicing.html', 'services'],
    ['landlords-certificates', "Landlord's Certificates (CP12)", '/services/landlords-certificates.html', 'services'],
    ['boiler-installation', 'Boiler Installations', '/services/boiler-installation.html', 'services'],
    ['general-maintenance', 'Plumbing', '/services/general-maintenance.html', 'services'],
    ['homebuyers-reports', "Homebuyer's Reports", '/services/homebuyers-reports.html', 'services'],
    ['kitchens-bathrooms', 'Kitchens & Bathrooms', '/services/kitchens-bathrooms.html', 'services'],
    ['powerflushing-descaling', 'Powerflushing and Descaling', '/services/powerflushing-descaling.html', 'services'],
    ['second-opinion', 'Second Opinions', '/services/second-opinion.html', 'services'],
    ['unvented-cylinders', 'Unvented Cylinders', '/services/unvented-cylinders.html', 'services'],
    ['common-faults', 'Common Faults', '/support/common-faults.html', 'support'],
    ['manuals', 'Boiler Manuals', '/support/manuals.html', 'support'],
    ['energy-efficiency', 'Energy Efficiency', '/support/energy-efficiency.html', 'support'],
    ['engineers', "Engineer's Support", '/support/engineers.html', 'support'],
  ].map((item, index, items) => ({
    page_key: item[0], title: item[1], url: item[2], nav_group: item[3],
    sort_order: (items.slice(0, index).filter(row => row[3] === item[3]).length + 1) * 10,
    is_active: true,
  }));

  const THEME_FIELDS = [
    ['page_background', 'Page background'], ['surface', 'Cards and surfaces'],
    ['text_primary', 'Primary text'], ['text_secondary', 'Secondary text'],
    ['primary', 'Headings and links'], ['accent', 'Teal accent'], ['highlight', 'Amber highlight'],
    ['nav_background', 'Navigation background'], ['nav_text', 'Navigation text'],
    ['footer_background', 'Footer background'], ['footer_text', 'Footer text'],
  ];
  const THEME_DEFAULTS = {
    light: {
      page_background: '#f9f6f2', surface: '#ffffff', text_primary: '#0f1724', text_secondary: '#5c5c5c',
      primary: '#0a2c66', accent: '#2a6f7b', highlight: '#d97706', nav_background: '#0a2c66',
      nav_text: '#ffffff', footer_background: '#062940', footer_text: '#ffffff', background_image: '', use_background_image: 'false',
    },
    dark: {
      page_background: '#181b20', surface: '#242a31', text_primary: '#f5f7fa', text_secondary: '#cbd5e1',
      primary: '#7db7ff', accent: '#5ac8c8', highlight: '#f59e0b', nav_background: '#101827',
      nav_text: '#ffffff', footer_background: '#0b111b', footer_text: '#f8fafc', background_image: '', use_background_image: 'false',
    },
  };

  let db;
  let session;
  let pages = [];
  let draggedPageId = null;
  let draggedPageGroup = null;

  async function initialise() {
    const lib = window.supabase || window.Supabase;
    if (!lib) return setTimeout(initialise, 50);
    db = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.db = db;
    const result = await db.auth.getSession();
    session = result.data.session;
    if (!session) return window.location.href = 'login.html';
    window.currentSession = session;
    await window.loadAdminHeader(session);
    renderThemeEditors();
    document.body.style.visibility = 'visible';
    await Promise.all([loadPublicSiteUrl(), loadTheme(), loadPages()]);
  }

  async function loadPublicSiteUrl() {
    const { data, error } = await db.from('site_settings').select('setting_value').eq('setting_key', PUBLIC_SITE_URL_KEY).maybeSingle();
    if (error) return setStatus('public-site-url-status', error.message, true);
    document.getElementById('public-site-base-url').value = data?.setting_value || 'https://warmright.uk';
  }

  async function savePublicSiteUrl() {
    const input = document.getElementById('public-site-base-url');
    let value;
    try { value = normalisePublicSiteUrl(input.value); }
    catch (error) { setStatus('public-site-url-status', error.message, true); input.focus(); return; }
    setStatus('public-site-url-status', 'Saving website address...');
    const { error } = await db.from('site_settings').upsert({ setting_key: PUBLIC_SITE_URL_KEY, setting_value: value, updated_at: new Date().toISOString() });
    if (error) return setStatus('public-site-url-status', error.message, true);
    input.value = value;
    setStatus('public-site-url-status', 'Website address saved. New public links and emails will use it.');
  }

  function normalisePublicSiteUrl(value) {
    let parsed;
    try { parsed = new URL(String(value || '').trim()); }
    catch { throw new Error('Enter a complete address beginning with https://'); }
    if (parsed.protocol !== 'https:') throw new Error('The public website address must begin with https://');
    if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname.toLowerCase())) throw new Error('Enter the public development or live domain, not localhost.');
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
  }

  function renderThemeEditors() {
    document.getElementById('theme-editors').innerHTML = ['light', 'dark'].map(mode => `
      <section class="theme-editor" data-theme-editor="${mode}">
        <h3>${mode === 'light' ? 'Light Mode' : 'Dark Mode'}</h3>
        <div class="theme-field-grid">
          ${THEME_FIELDS.map(([key, label]) => `<label class="theme-field">${label}<input type="color" data-theme-mode="${mode}" data-theme-key="${key}" value="${THEME_DEFAULTS[mode][key]}"></label>`).join('')}
          <label class="theme-field theme-image-field">Background image
            <span class="image-input-row"><input type="text" data-theme-mode="${mode}" data-theme-key="background_image" placeholder="assets/images/background.jpg"><button class="site-btn secondary" type="button" data-choose-theme-image="${mode}">Choose Image</button></span>
          </label>
        </div>
        <label class="theme-check"><input type="checkbox" data-theme-mode="${mode}" data-theme-key="use_background_image"> Use the background image</label>
        <div class="theme-preview" data-theme-preview="${mode}"><div class="theme-preview-nav"><span>Home</span><span>Services</span><span>Contact</span></div><div class="theme-preview-body"><div class="theme-preview-card"><strong>Preview heading</strong><span>Example website text and card background.</span><div class="theme-preview-accent"></div></div></div><div class="theme-preview-footer">Warm Right Ltd</div></div>
      </section>`).join('');
    document.querySelectorAll('[data-theme-mode]').forEach(input => input.addEventListener('input', () => updateThemePreview(input.dataset.themeMode)));
    document.querySelectorAll('[data-choose-theme-image]').forEach(button => button.addEventListener('click', () => chooseThemeImage(button.dataset.chooseThemeImage)));
    updateThemePreview('light'); updateThemePreview('dark');
  }

  async function loadTheme() {
    const { data, error } = await db.from('site_settings').select('setting_key,setting_value').like('setting_key', 'theme_%');
    if (error) return setStatus('theme-status', error.message, true);
    const settings = Object.fromEntries((data || []).map(row => [row.setting_key, row.setting_value]));
    for (const mode of ['light', 'dark']) {
      for (const key of [...THEME_FIELDS.map(field => field[0]), 'background_image', 'use_background_image']) {
        const input = themeInput(mode, key);
        const value = settings[`theme_${mode}_${key}`] ?? THEME_DEFAULTS[mode][key];
        if (input.type === 'checkbox') input.checked = String(value) === 'true'; else input.value = value;
      }
      updateThemePreview(mode);
    }
  }

  async function saveTheme() {
    const rows = [];
    const updatedAt = new Date().toISOString();
    for (const mode of ['light', 'dark']) {
      for (const key of [...THEME_FIELDS.map(field => field[0]), 'background_image', 'use_background_image']) {
        const input = themeInput(mode, key);
        rows.push({ setting_key: `theme_${mode}_${key}`, setting_value: input.type === 'checkbox' ? String(input.checked) : input.value.trim(), updated_at: updatedAt });
      }
    }
    setStatus('theme-status', 'Saving appearance...');
    const { error } = await db.from('site_settings').upsert(rows);
    setStatus('theme-status', error ? error.message : 'Appearance saved. Public pages will use the new palette on refresh.', Boolean(error));
  }

  function themeInput(mode, key) { return document.querySelector(`[data-theme-mode="${mode}"][data-theme-key="${key}"]`); }

  function updateThemePreview(mode) {
    const preview = document.querySelector(`[data-theme-preview="${mode}"]`);
    if (!preview) return;
    const value = key => themeInput(mode, key)?.value || THEME_DEFAULTS[mode][key];
    const useImage = themeInput(mode, 'use_background_image')?.checked;
    const image = value('background_image');
    preview.style.backgroundColor = value('page_background');
    preview.style.backgroundImage = useImage && image ? `url("${adminImageSource(image)}")` : 'none';
    preview.style.color = value('text_primary');
    const nav = preview.querySelector('.theme-preview-nav'); nav.style.background = value('nav_background'); nav.style.color = value('nav_text');
    const card = preview.querySelector('.theme-preview-card'); card.style.background = value('surface'); card.style.color = value('text_primary');
    card.querySelector('span').style.color = value('text_secondary'); card.querySelector('strong').style.color = value('primary');
    preview.querySelector('.theme-preview-accent').style.background = value('highlight');
    const footer = preview.querySelector('.theme-preview-footer'); footer.style.background = value('footer_background'); footer.style.color = value('footer_text');
  }

  function adminImageSource(path) {
    return window.adminImageLibrary?.imageSrcForAdmin(path) || path;
  }

  function chooseThemeImage(mode) {
    window.adminImageLibrary.open({ session, onSelect: path => { themeInput(mode, 'background_image').value = path; themeInput(mode, 'use_background_image').checked = true; updateThemePreview(mode); } });
  }

  async function loadPages() {
    const { data, error } = await db.from('site_pages').select('*').order('sort_order');
    if (error) return setStatus('page-status', error.message, true);
    pages = data || []; renderPages();
  }

  function renderPages() {
    const groups = [['main', 'Main Navigation'], ['services', 'Services Menu'], ['support', 'Support Menu']];
    document.getElementById('pages-body').innerHTML = groups.map(([key, label]) => {
      const rows = pages.filter(page => page.nav_group === key).sort((a, b) => a.sort_order - b.sort_order);
      if (!rows.length) return '';
      return `<tr class="group-row"><th colspan="6">${label}<span class="group-count">${rows.length} pages</span></th></tr>${rows.map(page => `<tr draggable="true" data-page-id="${page.id}" data-nav-group="${page.nav_group}"><td class="drag-handle" title="Drag to reorder">&#9776;</td><td><input type="checkbox" data-toggle-page="${page.id}" ${page.is_active ? 'checked' : ''}></td><td><strong>${escapeHtml(page.title)}</strong></td><td>${page.url.startsWith('#') ? 'Dropdown menu' : escapeHtml(page.url)}</td><td>${escapeHtml(page.nav_group)}</td><td><button class="site-btn secondary" type="button" data-page-active="${page.id}" data-next-active="${!page.is_active}">${page.is_active ? 'Deactivate' : 'Reinstate'}</button></td></tr>`).join('')}`;
    }).join('');
    bindPageRows();
  }

  function bindPageRows() {
    document.querySelectorAll('[data-toggle-page]').forEach(input => input.addEventListener('change', () => setPageActive(input.dataset.togglePage, input.checked)));
    document.querySelectorAll('[data-page-active]').forEach(button => button.addEventListener('click', () => setPageActive(button.dataset.pageActive, button.dataset.nextActive === 'true')));
    document.querySelectorAll('tr[data-page-id]').forEach(row => {
      row.addEventListener('dragstart', startPageDrag); row.addEventListener('dragover', dragPageOver);
      row.addEventListener('dragleave', clearPageDrag); row.addEventListener('drop', dropPage); row.addEventListener('dragend', endPageDrag);
    });
  }

  async function setPageActive(id, isActive) {
    const { error } = await db.from('site_pages').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return setStatus('page-status', error.message, true);
    await loadPages();
  }

  function startPageDrag(event) { draggedPageId = event.currentTarget.dataset.pageId; draggedPageGroup = event.currentTarget.dataset.navGroup; event.currentTarget.classList.add('dragging'); event.dataTransfer.effectAllowed = 'move'; }
  function dragPageOver(event) { event.preventDefault(); const row = event.currentTarget; if (row.dataset.pageId === draggedPageId || row.dataset.navGroup !== draggedPageGroup) return; row.classList.add('drag-over'); const moving = document.querySelector(`tr[data-page-id="${draggedPageId}"]`); const after = event.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2; row.parentNode.insertBefore(moving, after ? row.nextSibling : row); }
  function clearPageDrag(event) { event.currentTarget.classList.remove('drag-over'); }
  async function dropPage(event) { event.preventDefault(); clearPageDrag(event); await savePageOrder(); }
  function endPageDrag() { document.querySelectorAll('tr[data-page-id]').forEach(row => row.classList.remove('dragging', 'drag-over')); draggedPageId = null; draggedPageGroup = null; }

  async function savePageOrder() {
    const rows = [...document.querySelectorAll(`tr[data-nav-group="${draggedPageGroup}"]`)];
    const results = await Promise.all(rows.map((row, index) => db.from('site_pages').update({ sort_order: (index + 1) * 10, updated_at: new Date().toISOString() }).eq('id', row.dataset.pageId).eq('nav_group', draggedPageGroup)));
    const error = results.find(result => result.error)?.error;
    if (error) { setStatus('page-status', error.message, true); await loadPages(); return; }
    setStatus('page-status', 'Page order saved.'); await loadPages();
  }

  async function seedPages() {
    const { error } = await db.from('site_pages').upsert(DEFAULT_PAGES, { onConflict: 'page_key' });
    if (error) return setStatus('page-status', error.message, true);
    const keys = new Set(DEFAULT_PAGES.map(page => page.page_key));
    const { data: existing, error: readError } = await db.from('site_pages').select('id,page_key');
    if (readError) return setStatus('page-status', readError.message, true);
    const retiredIds = (existing || []).filter(page => !keys.has(page.page_key)).map(page => page.id);
    if (retiredIds.length) {
      const { error: deleteError } = await db.from('site_pages').delete().in('id', retiredIds);
      if (deleteError) return setStatus('page-status', deleteError.message, true);
    }
    setStatus('page-status', 'Current pages saved.'); await loadPages();
  }

  function setStatus(id, message, error = false) { const element = document.getElementById(id); element.textContent = message || ''; element.classList.toggle('error', error); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char])); }

  document.getElementById('save-public-site-url').addEventListener('click', savePublicSiteUrl);
  document.getElementById('save-theme').addEventListener('click', saveTheme);
  document.getElementById('seed-pages').addEventListener('click', seedPages);
  initialise();
}());
