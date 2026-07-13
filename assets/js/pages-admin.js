(function () {
  const SUPABASE_URL = 'https://axampuprcnauxbbijmmt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_NFuFkO0tybTuMvYOQekQmA_62araOjM';
  const PUBLIC_SITE_URL_KEY = 'public_site_base_url';
  const THEME_GROUPS = [
    ['global', 'Page & Background', ['page_background', 'surface', 'text_primary', 'text_secondary', 'primary', 'accent', 'highlight', 'background_image', 'use_background_image']],
    ['navigation', 'Navigation', ['nav_background', 'nav_text', 'nav_hover_text', 'nav_dropdown_background', 'nav_dropdown_text', 'nav_dropdown_hover_background', 'nav_dropdown_hover_text']],
    ['footer', 'Footer', ['footer_background', 'footer_text']],
    ['rates', 'Schedule of Rates', ['rates_card_background', 'rates_card_text', 'rates_card_muted', 'rates_card_divider', 'rates_button_background', 'rates_button_text', 'rates_modal_background', 'rates_modal_text', 'rates_modal_muted', 'rates_modal_close_background', 'rates_modal_close_text']],
    ['offers', 'Offers', ['offers_card_background', 'offers_card_text', 'offers_card_muted', 'offers_button_background', 'offers_button_text', 'offers_modal_background', 'offers_modal_text', 'offers_modal_close_background', 'offers_modal_close_text']],
    ['testimonials', 'Testimonials', ['testimonials_card_background', 'testimonials_card_text', 'testimonials_card_muted', 'testimonials_accent']],
    ['privacy', 'Privacy Policy', ['privacy_surface', 'privacy_text', 'privacy_heading', 'privacy_subheading', 'privacy_link', 'privacy_divider']],
  ];

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
    ['homebuyers-reports', "Homebuyer's Reports", '/support/homebuyers-reports.html', 'services'],
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
    ['nav_background', 'Navigation background'], ['nav_text', 'Navigation text'], ['nav_hover_text', 'Navigation hover text'],
    ['nav_dropdown_background', 'Dropdown background'], ['nav_dropdown_text', 'Dropdown text'],
    ['nav_dropdown_hover_background', 'Dropdown hover background'], ['nav_dropdown_hover_text', 'Dropdown hover text'],
    ['footer_background', 'Footer background'], ['footer_text', 'Footer text'],
    ['rates_card_background', 'Rates card background'], ['rates_card_text', 'Rates card heading and price text'],
    ['rates_card_muted', 'Rates card body text'], ['rates_card_divider', 'Rates card dividers'],
    ['rates_button_background', 'Rates button background'], ['rates_button_text', 'Rates button text'],
    ['rates_modal_background', 'Rates modal background'], ['rates_modal_text', 'Rates modal text'],
    ['rates_modal_muted', 'Rates modal muted text'], ['rates_modal_close_background', 'Rates modal close background'],
    ['rates_modal_close_text', 'Rates modal close text'],
    ['offers_card_background', 'Offers card background'], ['offers_card_text', 'Offers card heading text'],
    ['offers_card_muted', 'Offers card body text'], ['offers_button_background', 'Offers button background'],
    ['offers_button_text', 'Offers button text'], ['offers_modal_background', 'Offers modal background'],
    ['offers_modal_text', 'Offers modal text'], ['offers_modal_close_background', 'Offers modal close background'],
    ['offers_modal_close_text', 'Offers modal close text'],
    ['testimonials_card_background', 'Testimonial card background'], ['testimonials_card_text', 'Testimonial heading text'],
    ['testimonials_card_muted', 'Testimonial body text'], ['testimonials_accent', 'Testimonial accent'],
    ['privacy_surface', 'Privacy page surface'], ['privacy_text', 'Privacy page text'],
    ['privacy_heading', 'Privacy page headings'], ['privacy_subheading', 'Privacy page subheadings'],
    ['privacy_link', 'Privacy page links'], ['privacy_divider', 'Privacy page dividers'],
  ];
  const THEME_DEFAULTS = {
    light: {
      page_background: '#f9f6f2', surface: '#ffffff', text_primary: '#0f1724', text_secondary: '#5c5c5c',
      primary: '#0a2c66', accent: '#2a6f7b', highlight: '#d97706', nav_background: '#0a2c66',
      nav_text: '#ffffff', nav_hover_text: '#ffd166', nav_dropdown_background: '#ffffff', nav_dropdown_text: '#0a2c66',
      nav_dropdown_hover_background: '#fff7e6', nav_dropdown_hover_text: '#d97706', footer_background: '#062940', footer_text: '#ffffff',
      rates_card_background: '#ffffff', rates_card_text: '#0a2c66', rates_card_muted: '#5c5c5c', rates_card_divider: '#dce4eb',
      rates_button_background: '#0a2c66', rates_button_text: '#ffffff', rates_modal_background: '#ffffff', rates_modal_text: '#334155',
      rates_modal_muted: '#64748b', rates_modal_close_background: '#eef2f6', rates_modal_close_text: '#334155',
      offers_card_background: '#ffffff', offers_card_text: '#0a2c66', offers_card_muted: '#5c5c5c',
      offers_button_background: '#0a2c66', offers_button_text: '#ffffff', offers_modal_background: '#ffffff',
      offers_modal_text: '#334155', offers_modal_close_background: '#eef2f6', offers_modal_close_text: '#334155',
      testimonials_card_background: '#fffaf5', testimonials_card_text: '#062940', testimonials_card_muted: '#5c5c5c', testimonials_accent: '#2b6777',
      privacy_surface: '#f9f6f2', privacy_text: '#26364a', privacy_heading: '#062940', privacy_subheading: '#2a6672', privacy_link: '#0a5aa1', privacy_divider: '#dce4eb',
      background_image: '', use_background_image: 'false',
    },
    dark: {
      page_background: '#181b20', surface: '#242a31', text_primary: '#f5f7fa', text_secondary: '#cbd5e1',
      primary: '#7db7ff', accent: '#5ac8c8', highlight: '#f59e0b', nav_background: '#101827',
      nav_text: '#ffffff', nav_hover_text: '#f59e0b', nav_dropdown_background: '#111827', nav_dropdown_text: '#ffffff',
      nav_dropdown_hover_background: '#1f2937', nav_dropdown_hover_text: '#fbbf24', footer_background: '#0b111b', footer_text: '#f8fafc',
      rates_card_background: '#202833', rates_card_text: '#f5f7fa', rates_card_muted: '#cbd5e1', rates_card_divider: '#3a4759',
      rates_button_background: '#2f5ea8', rates_button_text: '#ffffff', rates_modal_background: '#1c2430', rates_modal_text: '#f5f7fa',
      rates_modal_muted: '#cbd5e1', rates_modal_close_background: '#334155', rates_modal_close_text: '#f8fafc',
      offers_card_background: '#202833', offers_card_text: '#f5f7fa', offers_card_muted: '#cbd5e1',
      offers_button_background: '#2f5ea8', offers_button_text: '#ffffff', offers_modal_background: '#1c2430',
      offers_modal_text: '#f5f7fa', offers_modal_close_background: '#334155', offers_modal_close_text: '#f8fafc',
      testimonials_card_background: '#202833', testimonials_card_text: '#f5f7fa', testimonials_card_muted: '#cbd5e1', testimonials_accent: '#5ac8c8',
      privacy_surface: '#181b20', privacy_text: '#e2e8f0', privacy_heading: '#f8fafc', privacy_subheading: '#8bd7de', privacy_link: '#8fc2ff', privacy_divider: '#334155',
      background_image: '', use_background_image: 'false',
    },
  };

  let db;
  let session;
  let pages = [];
  let draggedPageId = null;
  let draggedPageGroup = null;
  let modalSource = null;

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
    bindModal();
    document.body.style.visibility = 'visible';
    await Promise.all([loadPublicSiteUrl(), loadTheme(), loadPages()]);
    renderAppearanceExamples();
  }

  async function loadPublicSiteUrl() {
    const { data, error } = await db.from('site_settings').select('setting_value').eq('setting_key', PUBLIC_SITE_URL_KEY).maybeSingle();
    if (error) return setStatus('public-site-url-status', error.message, true);
    document.getElementById('public-site-base-url').value = data?.setting_value || 'https://warmright.uk';
    renderAppearanceExamples();
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
    renderAppearanceExamples();
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
        ${THEME_GROUPS.map(([groupKey, groupLabel, fields]) => `
          <section class="theme-group" data-theme-mode-group="${mode}" data-theme-group="${groupKey}">
            <h4>${groupLabel}</h4>
            <div class="theme-field-grid">
              ${fields.map(key => renderThemeField(mode, key)).join('')}
            </div>
          </section>
        `).join('')}
        <div class="theme-preview" data-theme-preview="${mode}"><div class="theme-preview-nav"><span>Home</span><span>Services</span><span>Contact</span></div><div class="theme-preview-body"><div class="theme-preview-card"><strong>Preview heading</strong><span>Example website text and card background.</span><div class="theme-preview-accent"></div></div></div><div class="theme-preview-footer">Warm Right Ltd</div></div>
      </section>`).join('');
    document.querySelectorAll('[data-theme-mode]').forEach(input => input.addEventListener('input', () => updateThemePreview(input.dataset.themeMode)));
    document.querySelectorAll('[data-choose-theme-image]').forEach(button => button.addEventListener('click', () => chooseThemeImage(button.dataset.chooseThemeImage)));
    updateThemePreview('light'); updateThemePreview('dark');
  }

  function renderThemeField(mode, key) {
    const label = THEME_FIELDS.find(field => field[0] === key)?.[1] || key;
    if (key === 'background_image') {
      return `<label class="theme-field theme-image-field">${label}
        <span class="image-input-row"><input type="text" data-theme-mode="${mode}" data-theme-key="background_image" placeholder="assets/images/background.jpg"><button class="site-btn secondary" type="button" data-choose-theme-image="${mode}">Choose Image</button></span>
      </label>`;
    }
    if (key === 'use_background_image') {
      return `<label class="theme-check"><input type="checkbox" data-theme-mode="${mode}" data-theme-key="use_background_image"> Use the background image</label>`;
    }
    return `<label class="theme-field">${label}<input type="color" data-theme-mode="${mode}" data-theme-key="${key}" value="${THEME_DEFAULTS[mode][key]}"></label>`;
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
    renderAppearanceExamples();
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
    renderAppearanceExamples();
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
    nav.querySelectorAll('span').forEach((span, index) => { span.style.color = index === 1 ? value('nav_hover_text') : value('nav_text'); });
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
    pages = data || []; renderPages(); renderAppearanceExamples();
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

  function renderAppearanceExamples() {
    const host = document.getElementById('appearance-examples');
    if (!host) return;
    host.innerHTML = [
      renderExampleCard({
        key: 'site-url',
        title: 'Public Website Address',
        description: 'Used in emails, public links and image references.',
        body: `<div class="appearance-mini-page-list"><span>${escapeHtml(document.getElementById('public-site-base-url')?.value || 'https://warmright.uk')}<small>Live address</small></span></div>`,
      }),
      renderExampleCard({
        key: 'pages',
        title: 'Visible Pages & Menus',
        description: 'Main navigation, Services and Support order.',
        body: renderVisiblePagesPreview(),
      }),
      renderExampleCard({
        key: 'light-global',
        title: 'Light Mode',
        description: 'Page background, surfaces, text and accent colours.',
        body: renderMiniSitePreview('light'),
      }),
      renderExampleCard({
        key: 'dark-global',
        title: 'Dark Mode',
        description: 'Dark palette for the public site and accessibility mode.',
        body: renderMiniSitePreview('dark'),
      }),
      renderExampleCard({
        key: 'navigation',
        title: 'Navigation Colours',
        description: 'Desktop nav, hover text and dropdown colours.',
        body: renderMiniNavigationPreview(),
      }),
      renderExampleCard({
        key: 'footer',
        title: 'Footer',
        description: 'Footer colours and contrast.',
        body: renderMiniFooterPreview(),
      }),
      renderExampleCard({
        key: 'rates',
        title: 'Schedule of Rates',
        description: 'Rates cards, buttons and modal colours.',
        body: renderMiniRatesPreview(),
      }),
      renderExampleCard({
        key: 'offers',
        title: 'Offers Cards',
        description: 'Offer tile colours, text and modal styling.',
        body: renderMiniOffersPreview(),
      }),
      renderExampleCard({
        key: 'testimonials',
        title: 'Testimonials',
        description: 'Testimonial card colours and accent styling.',
        body: renderMiniTestimonialsPreview(),
      }),
      renderExampleCard({
        key: 'privacy',
        title: 'Privacy Policy',
        description: 'Privacy notice page colours, links and dividers.',
        body: renderMiniPrivacyPreview(),
      }),
    ].join('');

    host.querySelectorAll('[data-open-appearance]').forEach(card => {
      card.addEventListener('click', () => openAppearanceEditor(card.dataset.openAppearance));
    });
  }

  function renderExampleCard({ key, title, description, body }) {
    return `
      <article class="appearance-example-card" data-open-appearance="${escapeHtml(key)}">
        <div class="appearance-example-visual">${body}</div>
        <div class="appearance-example-copy">
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(description)}</p>
        </div>
      </article>
    `;
  }

  function renderVisiblePagesPreview() {
    const previewPages = pages
      .filter(page => ['home', 'about', 'services', 'support', 'rates', 'offers'].includes(page.page_key))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .slice(0, 6);
    return `<div class="appearance-mini-page-list">${previewPages.map(page => `
      <span>${escapeHtml(page.title)}<small>${page.is_active === false ? 'Hidden' : page.nav_group}</small></span>
    `).join('')}</div>`;
  }

  function renderMiniSitePreview(mode) {
    const value = key => themeInput(mode, key)?.value || THEME_DEFAULTS[mode][key];
    const useImage = themeInput(mode, 'use_background_image')?.checked;
    const image = value('background_image');
    const backgroundStyle = [
      `background:${escapeHtml(value('page_background'))}`,
      useImage && image ? `background-image:url('${escapeHtml(adminImageSource(image))}')` : '',
      useImage && image ? 'background-size:cover;background-position:center' : ''
    ].filter(Boolean).join(';');
    return `
      <div class="appearance-mini-site" style="${backgroundStyle}">
        <div class="appearance-mini-nav" style="background:${escapeHtml(value('nav_background'))};color:${escapeHtml(value('nav_text'))}">
          <span class="appearance-mini-brand">Warm Right</span>
          <span>Home</span>
          <span style="color:${escapeHtml(value('nav_hover_text'))}">Services</span>
          <span>Contact</span>
          <span class="appearance-mini-emergency">Emergency</span>
        </div>
        <div class="appearance-mini-body">
          <div class="appearance-mini-card" style="background:${escapeHtml(value('surface'))};color:${escapeHtml(value('text_primary'))}">
            <strong style="color:${escapeHtml(value('primary'))}">${mode === 'light' ? 'Light Mode Preview' : 'Dark Mode Preview'}</strong>
            <span style="color:${escapeHtml(value('text_secondary'))}">Hero, content cards and page surfaces use these colours.</span>
            <div class="appearance-mini-accent" style="background:${escapeHtml(value('highlight'))}"></div>
          </div>
        </div>
      </div>
    `;
  }

  function renderMiniNavigationPreview() {
    const value = key => themeInput('light', key)?.value || THEME_DEFAULTS.light[key];
    return `
      <div class="appearance-mini-site">
        <div class="appearance-mini-nav" style="background:${escapeHtml(value('nav_background'))};color:${escapeHtml(value('nav_text'))}">
          <span class="appearance-mini-brand">Brand</span>
          <span>Home</span>
          <span style="color:${escapeHtml(value('nav_hover_text'))}">Support</span>
          <span>Offers</span>
          <span class="appearance-mini-emergency">Emergency</span>
        </div>
        <div class="appearance-mini-body">
          <div class="appearance-mini-card" style="background:${escapeHtml(value('nav_dropdown_background'))};color:${escapeHtml(value('nav_dropdown_text'))}">
            <strong>Dropdown Preview</strong>
            <span style="display:inline-block;margin-top:10px;padding:8px 10px;border-radius:8px;background:${escapeHtml(value('nav_dropdown_hover_background'))};color:${escapeHtml(value('nav_dropdown_hover_text'))}">Hovered menu item</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderMiniFooterPreview() {
    const bg = themeInput('light', 'footer_background')?.value || THEME_DEFAULTS.light.footer_background;
    const text = themeInput('light', 'footer_text')?.value || THEME_DEFAULTS.light.footer_text;
    return `<div class="appearance-mini-footer" style="background:${escapeHtml(bg)};color:${escapeHtml(text)}">Warm Right footer links and contact details</div>`;
  }

  function renderMiniRatesPreview() {
    const value = key => themeInput('light', key)?.value || THEME_DEFAULTS.light[key];
    return `
      <div class="appearance-mini-card" style="background:${escapeHtml(value('rates_card_background'))};color:${escapeHtml(value('rates_card_text'))}">
        <strong>Out of Hours</strong>
        <div class="appearance-mini-rates">
          <div class="appearance-mini-rate-col" style="border-color:${escapeHtml(value('rates_card_divider'))}">
            <strong>5pm - 12am</strong>
            <span style="color:${escapeHtml(value('rates_card_text'))}">£144.00 INC VAT</span>
            <span style="color:${escapeHtml(value('rates_card_muted'))}">(£120.00 ex VAT)</span>
            <span class="appearance-mini-button" style="background:${escapeHtml(value('rates_button_background'))};color:${escapeHtml(value('rates_button_text'))}">Read More</span>
          </div>
          <div class="appearance-mini-rate-col" style="border-color:${escapeHtml(value('rates_card_divider'))}">
            <strong>12am - 9am</strong>
            <span style="color:${escapeHtml(value('rates_card_text'))}">£204.00 INC VAT</span>
            <span style="color:${escapeHtml(value('rates_card_muted'))}">(£170.00 ex VAT)</span>
            <span class="appearance-mini-button" style="background:${escapeHtml(value('rates_button_background'))};color:${escapeHtml(value('rates_button_text'))}">Read More</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderMiniOffersPreview() {
    const value = key => themeInput('light', key)?.value || THEME_DEFAULTS.light[key];
    return `
      <div class="appearance-mini-card" style="background:${escapeHtml(value('offers_card_background'))};color:${escapeHtml(value('offers_card_text'))}">
        <strong>Landlord Bundle</strong>
        <span style="color:${escapeHtml(value('offers_card_muted'))}">An all-in-one landlord package for compliance, servicing and support.</span>
        <span class="appearance-mini-button" style="background:${escapeHtml(value('offers_button_background'))};color:${escapeHtml(value('offers_button_text'))}">Read More</span>
      </div>
    `;
  }

  function renderMiniTestimonialsPreview() {
    const value = key => themeInput('light', key)?.value || THEME_DEFAULTS.light[key];
    return `
      <div class="appearance-mini-card" style="background:${escapeHtml(value('testimonials_card_background'))};color:${escapeHtml(value('testimonials_card_text'))}">
        <div class="appearance-mini-quote">
          <strong>Excellent service</strong>
          <span class="appearance-mini-stars">★★★★★</span>
          <span style="color:${escapeHtml(value('testimonials_card_muted'))}">Friendly, clear and professional from start to finish.</span>
          <div class="appearance-mini-accent" style="background:${escapeHtml(value('testimonials_accent'))}"></div>
        </div>
      </div>
    `;
  }

  function renderMiniPrivacyPreview() {
    const value = key => themeInput('light', key)?.value || THEME_DEFAULTS.light[key];
    return `
      <div class="appearance-mini-card" style="background:${escapeHtml(value('privacy_surface'))};color:${escapeHtml(value('privacy_text'))}">
        <strong style="color:${escapeHtml(value('privacy_heading'))}">Privacy Policy</strong>
        <span style="color:${escapeHtml(value('privacy_subheading'))}">How we use customer data</span>
        <span style="color:${escapeHtml(value('privacy_link'))}">privacy notice link</span>
        <div class="appearance-mini-accent" style="background:${escapeHtml(value('privacy_divider'))}"></div>
      </div>
    `;
  }

  function bindModal() {
    document.getElementById('appearance-modal-close').addEventListener('click', closeAppearanceModal);
    document.getElementById('appearance-modal-backdrop').addEventListener('click', closeAppearanceModal);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !document.getElementById('appearance-modal').classList.contains('hidden')) {
        closeAppearanceModal();
      }
    });
  }

  function openAppearanceEditor(key) {
    const config = {
      'site-url': { title: 'Public Website Address', description: 'Set the public domain used in emails, links and image references.', sourceId: 'appearance-site-url-editor' },
      'pages': { title: 'Visible Pages & Navigation', description: 'Drag pages into order and switch them on or off for desktop and mobile menus.', sourceId: 'appearance-pages-editor' },
      'light-global': { title: 'Light Mode Appearance', description: 'Edit the light-mode page, surface and accent colours.', sourceId: 'appearance-theme-editor-panel', mode: 'light', group: 'global' },
      'dark-global': { title: 'Dark Mode Appearance', description: 'Edit the dark-mode page, surface and accent colours.', sourceId: 'appearance-theme-editor-panel', mode: 'dark', group: 'global' },
      'navigation': { title: 'Navigation Colours', description: 'Desktop nav, hover text and dropdown colours.', sourceId: 'appearance-theme-editor-panel', mode: 'light', group: 'navigation' },
      'footer': { title: 'Footer Colours', description: 'Footer background and text colours.', sourceId: 'appearance-theme-editor-panel', mode: 'light', group: 'footer' },
      'rates': { title: 'Schedule of Rates Colours', description: 'Card, button and modal colours for the rates page.', sourceId: 'appearance-theme-editor-panel', mode: 'light', group: 'rates' },
      'offers': { title: 'Offers Colours', description: 'Offer cards, buttons and modal colours.', sourceId: 'appearance-theme-editor-panel', mode: 'light', group: 'offers' },
      'testimonials': { title: 'Testimonials Colours', description: 'Testimonial cards and accent colours.', sourceId: 'appearance-theme-editor-panel', mode: 'light', group: 'testimonials' },
      'privacy': { title: 'Privacy Policy Colours', description: 'Privacy page surfaces, headings, links and dividers.', sourceId: 'appearance-theme-editor-panel', mode: 'light', group: 'privacy' },
    }[key];
    if (!config) return;
    const modal = document.getElementById('appearance-modal');
    const body = document.getElementById('appearance-modal-body');
    const title = document.getElementById('appearance-modal-title');
    const description = document.getElementById('appearance-modal-description');
    const source = document.getElementById(config.sourceId);
    if (!source) return;
    closeAppearanceModal();
    modalSource = { parent: source.parentNode, source };
    title.textContent = config.title;
    description.textContent = config.description;
    body.appendChild(source);
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    highlightThemeGroup(config.mode, config.group);
  }

  function closeAppearanceModal() {
    const modal = document.getElementById('appearance-modal');
    const body = document.getElementById('appearance-modal-body');
    if (modalSource?.parent && modalSource?.source) {
      modalSource.parent.appendChild(modalSource.source);
    }
    body.innerHTML = '';
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    clearThemeGroupHighlights();
    modalSource = null;
  }

  function clearThemeGroupHighlights() {
    document.querySelectorAll('.theme-group').forEach(group => group.classList.remove('is-focus'));
  }

  function highlightThemeGroup(mode, groupKey) {
    clearThemeGroupHighlights();
    if (!mode || !groupKey) return;
    const group = document.querySelector(`.theme-group[data-theme-mode-group="${mode}"][data-theme-group="${groupKey}"]`);
    if (!group) return;
    group.classList.add('is-focus');
    group.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function setStatus(id, message, error = false) { const element = document.getElementById(id); element.textContent = message || ''; element.classList.toggle('error', error); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char])); }

  document.getElementById('save-public-site-url').addEventListener('click', savePublicSiteUrl);
  document.getElementById('save-theme').addEventListener('click', saveTheme);
  document.getElementById('seed-pages').addEventListener('click', seedPages);
  initialise();
}());
