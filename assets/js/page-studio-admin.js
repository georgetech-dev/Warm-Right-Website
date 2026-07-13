(function () {
  const SUPABASE_URL = 'https://axampuprcnauxbbijmmt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_NFuFkO0tybTuMvYOQekQmA_62araOjM';
  const KNOWN_FEATURE_LIST_PAGES = new Set([
    'breakdowns',
    'repairs',
    'annual-servicing',
    'landlords-certificates',
    'boiler-installation',
    'powerflushing-descaling',
    'second-opinion',
    'unvented-cylinders',
    'common-faults'
  ]);
  const KNOWN_FAQ_PAGES = new Set([
    'boiler-installation',
    'kitchens-bathrooms'
  ]);
  const PAGE_META = {
    home: { description: 'Edit the homepage hero, welcome cards and both homepage carousels.', previewUrl: '/index.html', modulePageKey: 'home', sections: ['page-settings', 'hero', 'content-cards', 'carousel:take-a-look', 'carousel:support'] },
    about: { description: 'Manage the About Us hero and supporting content blocks.', previewUrl: '/about.html', modulePageKey: 'about', sections: ['page-settings', 'hero', 'content-cards'] },
    services: { description: 'Control the Services dropdown and the order of service pages.', sections: ['page-settings', 'nav-pages'] },
    support: { description: 'Control the Support dropdown and the order of support pages.', sections: ['page-settings', 'nav-pages'] },
    rates: { description: 'Preview the rates page and jump into the specialised rates editor.', previewUrl: '/schedule-of-rates.html', modulePageKey: 'schedule-of-rates', sections: ['page-settings', 'hero', 'special:rates'] },
    offers: { description: 'Preview the offers page and jump into the offers editor.', previewUrl: '/offers.html', modulePageKey: 'offers', sections: ['page-settings', 'hero', 'special:offers'] },
    testimonials: { description: 'Manage the testimonials page hero and supporting content.', previewUrl: '/testimonials.html', modulePageKey: 'testimonials', sections: ['page-settings', 'hero', 'content-cards'] },
    'book-a-visit': { description: 'Edit booking-page content, hero and contact tiles.', previewUrl: '/book-a-visit.html', modulePageKey: 'book-a-visit', sections: ['page-settings', 'hero', 'content-cards', 'contact-options:booking'] },
    contact: { description: 'Edit contact-page content, hero and tile options.', previewUrl: '/contact.html', modulePageKey: 'contact', sections: ['page-settings', 'hero', 'content-cards', 'contact-options:contact'] },
    breakdowns: { description: 'Manage the breakdowns page content and feature lists.', previewUrl: '/services/breakdowns.html', modulePageKey: 'breakdowns', sections: ['page-settings', 'hero', 'content-cards', 'feature-lists'] },
    repairs: { description: 'Manage the repairs page content and feature lists.', previewUrl: '/services/repairs.html', modulePageKey: 'repairs', sections: ['page-settings', 'hero', 'content-cards', 'feature-lists'] },
    'annual-servicing': { description: 'Manage the annual servicing page content and feature lists.', previewUrl: '/services/annual-servicing.html', modulePageKey: 'annual-servicing', sections: ['page-settings', 'hero', 'content-cards', 'feature-lists'] },
    'landlords-certificates': { description: 'Manage the landlord certificates page content and feature lists.', previewUrl: '/services/landlords-certificates.html', modulePageKey: 'landlords-certificates', sections: ['page-settings', 'hero', 'content-cards', 'feature-lists'] },
    'boiler-installation': { description: 'Manage the boiler installations page content, feature lists and FAQs.', previewUrl: '/services/boiler-installation.html', modulePageKey: 'boiler-installation', sections: ['page-settings', 'hero', 'content-cards', 'feature-lists', 'faq'] },
    'general-maintenance': { description: 'Manage the plumbing page content.', previewUrl: '/services/general-maintenance.html', modulePageKey: 'general-maintenance', sections: ['page-settings', 'hero', 'content-cards'] },
    'homebuyers-reports': { description: 'Manage the homebuyer reports support page content.', previewUrl: '/support/homebuyers-reports.html', modulePageKey: 'homebuyers-reports', sections: ['page-settings', 'hero', 'content-cards'] },
    'kitchens-bathrooms': { description: 'Manage the kitchens and bathrooms page content and FAQs.', previewUrl: '/services/kitchens-bathrooms.html', modulePageKey: 'kitchens-bathrooms', sections: ['page-settings', 'hero', 'content-cards', 'faq'] },
    'powerflushing-descaling': { description: 'Manage the powerflushing page content and feature lists.', previewUrl: '/services/powerflushing-descaling.html', modulePageKey: 'powerflushing-descaling', sections: ['page-settings', 'hero', 'content-cards', 'feature-lists'] },
    'second-opinion': { description: 'Manage the second opinions page content and feature lists.', previewUrl: '/services/second-opinion.html', modulePageKey: 'second-opinion', sections: ['page-settings', 'hero', 'content-cards', 'feature-lists'] },
    'unvented-cylinders': { description: 'Manage the unvented cylinders page content and feature lists.', previewUrl: '/services/unvented-cylinders.html', modulePageKey: 'unvented-cylinders', sections: ['page-settings', 'hero', 'content-cards', 'feature-lists'] },
    'common-faults': { description: 'Manage the common faults page content and feature lists.', previewUrl: '/support/common-faults.html', modulePageKey: 'common-faults', sections: ['page-settings', 'hero', 'content-cards', 'feature-lists'] },
    'boiler-fault-codes': { description: 'Manage the boiler fault codes support page.', previewUrl: '/support/boiler-fault-codes.html', modulePageKey: 'boiler-fault-codes', sections: ['page-settings', 'hero', 'content-cards'] },
    manuals: { description: 'Manage the manuals page hero and content blocks.', previewUrl: '/support/manuals.html', modulePageKey: 'manuals', sections: ['page-settings', 'hero', 'content-cards'] },
    'energy-efficiency': { description: 'Manage the energy efficiency support page.', previewUrl: '/support/energy-efficiency.html', modulePageKey: 'energy-efficiency', sections: ['page-settings', 'hero', 'content-cards'] },
    engineers: { description: 'Manage the engineers support page.', previewUrl: '/support/engineers.html', modulePageKey: 'engineers', sections: ['page-settings', 'hero', 'content-cards'] },
    'testimonial-submit': { description: 'Manage the public testimonial submission page.', previewUrl: '/testimonial-submit.html', modulePageKey: 'testimonial-submit', sections: ['page-settings', 'hero', 'content-cards'] }
  };
  const EXTRA_PAGES = [
    { page_key: 'boiler-fault-codes', title: 'Boiler Fault Codes', url: '/support/boiler-fault-codes.html', nav_group: 'support', is_active: true, sort_order: 9990 },
    { page_key: 'testimonial-submit', title: 'Submit Testimonial', url: '/testimonial-submit.html', nav_group: 'extra', is_active: true, sort_order: 10 }
  ];
  const GLOBAL_TOOLS = [
    { key: 'appearance', title: 'Appearance & Navigation', caption: 'Colours, backgrounds, public address and nav visibility.', href: 'appearance-admin.html' },
    { key: 'file-explorer', title: 'File Explorer', caption: 'Upload, rename and remove website images.', href: 'website-file-explorer.html' },
    { key: 'contact-options', title: 'Contact Options', caption: 'Manage contact tiles, emergency callbacks and mobile buttons.', href: 'contact-options-admin.html' },
    { key: 'faqs', title: 'FAQs', caption: 'Edit accordion questions and answers for FAQ pages.', href: 'faqs-admin.html' },
    { key: 'privacy', title: 'Privacy Policy', caption: 'Edit the privacy notice and review date.', href: 'privacy-admin.html' },
    { key: 'terms', title: 'Terms & Conditions', caption: 'Manage reusable offer terms and deep-link anchors.', href: 'terms-admin.html' },
    { key: 'coverage', title: 'Coverage Map', caption: 'Manage the interactive coverage map and labels.', href: 'coverage-admin.html' }
  ];

  let db;
  let session;
  let sitePages = [];
  let contentCards = [];
  let featureLists = [];
  let featureListItems = [];
  let faqSections = [];
  let faqItems = [];
  let heroes = [];
  let contactOptions = [];
  let carouselTiles = [];
  let currentSelection = { type: 'page', key: 'home' };
  let dragState = null;
  let editorModalState = null;

  async function initialise() {
    const lib = window.supabase || window.Supabase;
    if (!lib) return setTimeout(initialise, 50);
    db = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.db = db;
    const result = await db.auth.getSession();
    session = result.data.session;
    if (!session) {
      window.location.href = 'login.html';
      return;
    }
    window.currentSession = session;
    await window.loadAdminHeader(session);
    bindChrome();
    document.body.style.visibility = 'visible';
    await loadAll();
    renderGlobalTools();
    renderPageRail();
    restoreSelection();
    renderCurrentSelection();
  }

  function bindChrome() {
    document.getElementById('page-studio-reload').addEventListener('click', reloadPreview);
    document.getElementById('page-studio-editor-close').addEventListener('click', closeEditorModal);
    document.getElementById('page-studio-editor-backdrop').addEventListener('click', closeEditorModal);
    document.getElementById('page-studio-editor-refresh').addEventListener('click', async () => {
      await refreshAfterEditor();
      closeEditorModal(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !document.getElementById('page-studio-editor-modal').classList.contains('hidden')) {
        closeEditorModal();
      }
    });
  }

  async function loadAll() {
    const [pages, cards, lists, listItems, faqSectionRows, faqItemRows, heroRows, options, tiles] = await Promise.all([
      safeSelect(() => db.from('site_pages').select('*').order('sort_order')),
      safeSelect(() => db.from('site_content_cards').select('*').order('page_key').order('sort_order')),
      safeSelect(() => db.from('site_feature_lists').select('*').order('page_key').order('sort_order')),
      safeSelect(() => db.from('site_feature_list_items').select('*').order('list_key').order('sort_order')),
      safeSelect(() => db.from('site_faq_sections').select('*').order('page_key').order('sort_order')),
      safeSelect(() => db.from('site_faq_items').select('*').order('section_key').order('sort_order')),
      safeSelect(() => db.from('site_heroes').select('*').order('page_key').order('sort_order')),
      safeSelect(() => db.from('site_contact_options').select('*').order('sort_order')),
      safeSelect(() => db.from('site_carousel_tiles').select('*').order('carousel_key').order('sort_order'))
    ]);
    sitePages = pages;
    contentCards = cards;
    featureLists = lists;
    featureListItems = listItems;
    faqSections = faqSectionRows;
    faqItems = faqItemRows;
    heroes = heroRows;
    contactOptions = options;
    carouselTiles = tiles;
  }

  async function safeSelect(factory) {
    try {
      const { data, error } = await factory();
      if (error) {
        console.warn(error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.warn(error);
      return [];
    }
  }

  function getSiteRoot() {
    return window.location.hostname.includes('github.io') ? '/warm/' : '/';
  }

  function getAdminUrl(file, params) {
    const root = getSiteRoot();
    const path = file.startsWith('admin/') ? file : `admin/${file}`;
    const url = new URL(`${root}${path}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
      });
    }
    return url.pathname + url.search;
  }

  function getPublicHref(url) {
    if (!url || url.startsWith('#')) return '';
    return `${getSiteRoot()}${String(url).replace(/^\/+/, '')}`;
  }

  function restoreSelection() {
    const params = new URLSearchParams(window.location.search);
    const requestedPage = params.get('page');
    const requestedTool = params.get('tool');
    if (requestedTool && GLOBAL_TOOLS.some(tool => tool.key === requestedTool)) {
      currentSelection = { type: 'tool', key: requestedTool };
      return;
    }
    const pageKeys = new Set(allStudioPages().map(page => page.page_key));
    const fallback = sitePages.find(page => page.page_key === 'home')?.page_key || allStudioPages()[0]?.page_key || 'home';
    currentSelection = { type: 'page', key: pageKeys.has(requestedPage) ? requestedPage : fallback };
  }

  function allStudioPages() {
    const base = [...sitePages].sort(sortByOrder);
    const knownKeys = new Set(base.map(page => page.page_key));
    EXTRA_PAGES.forEach(page => {
      if (!knownKeys.has(page.page_key)) base.push(page);
    });
    return base.sort((a, b) => {
      if (a.nav_group === b.nav_group) return sortByOrder(a, b);
      return groupWeight(a.nav_group) - groupWeight(b.nav_group);
    });
  }

  function groupWeight(group) {
    return ({ main: 0, services: 1, support: 2, extra: 3 })[group] ?? 9;
  }

  function sortByOrder(a, b) {
    return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
  }

  function renderPageRail() {
    const groups = [
      ['main', 'Main navigation'],
      ['services', 'Services pages'],
      ['support', 'Support pages'],
      ['extra', 'Other website pages']
    ];
    document.getElementById('page-studio-page-list').innerHTML = groups.map(([key, label]) => {
      const pages = allStudioPages().filter(page => page.nav_group === key);
      if (!pages.length) return '';
      return `
        <section class="page-studio-rail-group">
          <h3 class="page-studio-rail-group-title">${escapeHtml(label)}</h3>
          ${pages.map(page => renderRailPageLink(page)).join('')}
        </section>
      `;
    }).join('');
    bindRailLinks();
  }

  function renderRailPageLink(page) {
    const activeClass = currentSelection.type === 'page' && currentSelection.key === page.page_key ? 'is-active' : '';
    const meta = pageMeta(page.page_key, page);
      return `
      <a class="page-studio-rail-link ${activeClass}" href="${escapeAttr(getAdminUrl('site-management.html', { page: page.page_key }))}" data-select-page="${escapeAttr(page.page_key)}" title="${escapeAttr(meta.previewUrl || page.url || page.page_key)}">
        <span>
          <strong>${escapeHtml(page.title)}</strong>
        </span>
        <small>${page.is_active === false ? 'Hidden' : 'Live'}</small>
      </a>
    `;
  }

  function renderGlobalTools() {
    document.getElementById('page-studio-global-list').innerHTML = GLOBAL_TOOLS.map(tool => `
      <a class="page-studio-rail-link ${currentSelection.type === 'tool' && currentSelection.key === tool.key ? 'is-active' : ''}" href="${escapeAttr(getAdminUrl('site-management.html', { tool: tool.key }))}" data-select-tool="${escapeAttr(tool.key)}">
        <span>
          <strong>${escapeHtml(tool.title)}</strong>
          <br>
          <small>${escapeHtml(tool.caption)}</small>
        </span>
      </a>
    `).join('');
    bindRailLinks();
  }

  function bindRailLinks() {
    document.querySelectorAll('[data-select-page]').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        currentSelection = { type: 'page', key: link.dataset.selectPage };
        syncSelectionUrl();
        renderPageRail();
        renderGlobalTools();
        renderCurrentSelection();
        scrollStudioToTop();
      });
    });
    document.querySelectorAll('[data-select-tool]').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        currentSelection = { type: 'tool', key: link.dataset.selectTool };
        syncSelectionUrl();
        renderPageRail();
        renderGlobalTools();
        renderCurrentSelection();
        scrollStudioToTop();
      });
    });
  }

  function syncSelectionUrl() {
    const url = new URL(window.location.href);
    url.search = '';
    if (currentSelection.type === 'page') url.searchParams.set('page', currentSelection.key);
    else url.searchParams.set('tool', currentSelection.key);
    window.history.replaceState({}, '', url.pathname + url.search);
  }

  function renderCurrentSelection() {
    if (currentSelection.type === 'tool') {
      renderToolSelection();
      return;
    }
    renderPageSelection();
  }

  function renderToolSelection() {
    const tool = GLOBAL_TOOLS.find(item => item.key === currentSelection.key) || GLOBAL_TOOLS[0];
    const title = document.getElementById('page-studio-title');
    const description = document.getElementById('page-studio-description');
    const kicker = document.getElementById('page-studio-kicker');
    const openLive = document.getElementById('page-studio-open-live');
    const sections = document.getElementById('page-studio-sections-list');
    const notice = document.getElementById('page-studio-notice');
    kicker.textContent = 'Site-wide tools';
    title.textContent = tool.title;
    description.textContent = tool.caption;
    notice.classList.remove('hidden');
    notice.textContent = 'These controls affect more than one page across the website.';
    openLive.classList.add('hidden');
    setPreviewState('');
    sections.innerHTML = `
      <section class="page-studio-section">
        <div class="page-studio-section-head">
          <div class="page-studio-section-copy">
            <h3>Open tool</h3>
            <p class="page-studio-section-subtitle">Jump straight into the detailed editor for this global area.</p>
          </div>
          <div class="page-studio-section-actions">
            <a class="site-btn primary" href="${escapeAttr(getAdminUrl(tool.href))}">Open ${escapeHtml(tool.title)}</a>
          </div>
        </div>
      </section>
      <section class="page-studio-section">
        <div class="page-studio-section-head">
          <div class="page-studio-section-copy">
            <h3>Other site-wide tools</h3>
            <p class="page-studio-section-subtitle">These stay available on the left rail so the customer can move around without going back to the hub.</p>
          </div>
        </div>
        <div class="page-studio-split-grid">
          ${GLOBAL_TOOLS.filter(item => item.key !== tool.key).map(item => `
            <article class="page-studio-tool-card">
              <h4>${escapeHtml(item.title)}</h4>
              <p class="page-studio-meta">${escapeHtml(item.caption)}</p>
              <div class="page-studio-inline-actions">
                <a class="site-btn secondary" href="${escapeAttr(getAdminUrl(item.href))}">Open</a>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderPageSelection() {
    const page = allStudioPages().find(item => item.page_key === currentSelection.key);
    if (!page) return;
    const meta = pageMeta(page.page_key, page);
    const title = document.getElementById('page-studio-title');
    const description = document.getElementById('page-studio-description');
    const kicker = document.getElementById('page-studio-kicker');
    const notice = document.getElementById('page-studio-notice');
    const sections = document.getElementById('page-studio-sections-list');
    const openLive = document.getElementById('page-studio-open-live');
    kicker.textContent = meta.previewUrl ? 'Public page' : 'Navigation group';
    title.textContent = page.title;
    description.textContent = meta.description || 'Manage the visible sections and content for this page.';
    notice.classList.add('hidden');
    if (meta.kind === 'nav-group') {
      notice.classList.remove('hidden');
      notice.textContent = 'This is a menu group rather than a standalone page. You can still manage its child pages and related website sections here.';
    }
    if (meta.previewUrl) {
      openLive.classList.remove('hidden');
      openLive.href = `${getPublicHref(meta.previewUrl)}?preview=${Date.now()}`;
      setPreviewState(meta.previewUrl);
    } else {
      openLive.classList.add('hidden');
      setPreviewState('');
    }
    sections.innerHTML = buildSectionsHtml(page, meta);
    bindSectionEvents(page, meta);
  }

  function scrollStudioToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function pageMeta(pageKey, page) {
    const meta = PAGE_META[pageKey] || {};
    return {
      kind: meta.sections?.includes('nav-pages') ? 'nav-group' : 'page',
      modulePageKey: meta.modulePageKey || pageKey,
      previewUrl: meta.previewUrl || (page?.url && !String(page.url).startsWith('#') ? page.url : ''),
      description: meta.description || `Manage ${page?.title || pageKey}.`,
      sections: meta.sections || defaultSectionsFor(pageKey)
    };
  }

  function defaultSectionsFor(pageKey) {
    const sections = ['page-settings', 'hero'];
    if (!['offers', 'rates', 'services', 'support'].includes(pageKey)) sections.push('content-cards');
    if (KNOWN_FEATURE_LIST_PAGES.has(pageKey)) sections.push('feature-lists');
    if (KNOWN_FAQ_PAGES.has(pageKey)) sections.push('faq');
    return sections;
  }

  function setPreviewState(previewUrl) {
    const wrap = document.getElementById('page-studio-preview-wrap');
    const frame = document.getElementById('page-studio-preview-frame');
    const label = document.getElementById('page-studio-preview-label');
    if (!previewUrl) {
      wrap.classList.add('is-empty');
      frame.removeAttribute('src');
      label.textContent = 'No preview';
      return;
    }
    wrap.classList.remove('is-empty');
    frame.src = `${getPublicHref(previewUrl)}${previewUrl.includes('?') ? '&' : '?'}preview=${Date.now()}`;
    label.textContent = previewUrl.replace(/^\//, '');
  }

  function reloadPreview() {
    if (currentSelection.type !== 'page') return;
    const page = allStudioPages().find(item => item.page_key === currentSelection.key);
    if (!page) return;
    const meta = pageMeta(page.page_key, page);
    if (!meta.previewUrl) return;
    setPreviewState(meta.previewUrl);
  }

  function buildSectionsHtml(page, meta) {
    return meta.sections.map(section => renderSection(page, meta, section)).join('');
  }

  function renderSection(page, meta, section) {
    if (section === 'page-settings') return renderPageSettingsSection(page, meta);
    if (section === 'nav-pages') return renderNavPagesSection(page);
    if (section === 'hero') return renderHeroSection(page, meta);
    if (section === 'content-cards') return renderContentCardsSection(page, meta);
    if (section === 'feature-lists') return renderFeatureListsSection(page, meta);
    if (section === 'faq') return renderFaqSection(page, meta);
    if (section.startsWith('contact-options:')) return renderContactOptionsSection(page, section.split(':')[1]);
    if (section.startsWith('carousel:')) return renderCarouselSection(section.split(':')[1]);
    if (section === 'special:rates') return renderSpecialManagerSection('rates', 'Schedule of Rates', 'Edit grouped rate cards, prices, modal content and images.', 'rates.html');
    if (section === 'special:offers') return renderSpecialManagerSection('offers', 'Offers Manager', 'Edit offers, images, read-more content and card ordering.', 'offers-admin.html');
    return '';
  }

  function renderPageSettingsSection(page, meta) {
    const badges = [
      `<span class="page-studio-badge ${page.is_active === false ? 'is-muted' : 'is-good'}">${page.is_active === false ? 'Hidden from nav' : 'Visible in nav'}</span>`,
      `<span class="page-studio-badge is-muted">${escapeHtml(page.nav_group || 'page')}</span>`
    ].join('');
    const urlMeta = meta.previewUrl ? meta.previewUrl : 'Menu group';
    const toggleControl = page.id ? `
      <label class="page-studio-item-toggle">
        <input type="checkbox" data-page-toggle="${escapeAttr(page.id || '')}" ${page.is_active === false ? '' : 'checked'}>
        Visible
      </label>
    ` : `<span class="page-studio-badge is-muted">Not in main navigation</span>`;
    return `
      <section class="page-studio-section" id="studio-section-settings">
        <div class="page-studio-section-head">
          <div class="page-studio-section-copy">
            <h3>Page Settings</h3>
            <p class="page-studio-section-subtitle">Quick visibility and routing details for this part of the site.</p>
            <div class="page-studio-meta">${badges}</div>
          </div>
          <div class="page-studio-section-actions">
            <a class="site-btn secondary" href="${escapeAttr(getAdminUrl('appearance-admin.html'))}">Navigation & Appearance</a>
          </div>
        </div>
        <div class="page-studio-list">
          <article class="page-studio-item">
            <div class="page-studio-drag">#</div>
            <div>
              <div class="page-studio-item-title">${escapeHtml(page.title)}</div>
              <div class="page-studio-item-meta">${escapeHtml(urlMeta)}</div>
            </div>
            ${toggleControl}
          </article>
        </div>
      </section>
    `;
  }

  function renderNavPagesSection(page) {
    const children = sitePages.filter(item => item.nav_group === page.page_key).sort(sortByOrder);
    return `
      <section class="page-studio-section" id="studio-section-nav-pages">
        <div class="page-studio-section-head">
          <div class="page-studio-section-copy">
            <h3>${escapeHtml(page.title)} Pages</h3>
            <p class="page-studio-section-subtitle">Drag pages into order and switch them on or off in the menu.</p>
          </div>
          <div class="page-studio-section-actions">
            <a class="site-btn secondary" href="${escapeAttr(getAdminUrl('appearance-admin.html'))}">Open full nav editor</a>
          </div>
        </div>
        ${children.length ? `
          <div class="page-studio-nav-list page-studio-list" data-sort-list="nav-pages" data-group-key="${escapeAttr(page.page_key)}">
            ${children.map(child => renderManagedItem({
              kind: 'nav-page',
              id: child.id,
              drag: true,
              title: child.title,
              meta: child.url,
              active: child.is_active !== false,
              editHref: getAdminUrl('site-management.html', { page: child.page_key }),
              openModalUrl: getAdminUrl('site-management.html', { page: child.page_key })
            })).join('')}
          </div>
        ` : '<div class="page-studio-empty">No child pages are assigned to this menu group yet.</div>'}
      </section>
    `;
  }

  function renderHeroSection(page, meta) {
    const rows = heroes.filter(item => item.page_key === meta.modulePageKey).sort(sortByOrder);
    const cards = rows.map(row => {
      const bg = row.image_url ? `style="background-image:linear-gradient(180deg, rgba(6, 41, 64, 0.1), rgba(6, 41, 64, 0.48)), url('${escapeAttr(publicAssetSrc(row.image_url))}')"` : '';
      return `
        <article class="page-studio-preview-card page-studio-clickable" data-open-editor="${escapeAttr(getAdminUrl('hero-admin.html', { page: meta.modulePageKey, heroId: row.id, embed: 1 }))}" data-editor-title="${escapeAttr(row.title || row.hero_key || 'Hero slide')}">
          <div class="page-studio-card-toolbar">
            <span class="page-studio-badge ${row.is_active === false ? 'is-muted' : 'is-good'}">${row.is_active === false ? 'Hidden' : 'Live'}</span>
            <label class="page-studio-item-toggle" data-stop-open="true">
              <input type="checkbox" data-hero-toggle="${escapeAttr(row.id)}" ${row.is_active === false ? '' : 'checked'}>
              Visible
            </label>
          </div>
          <div class="page-studio-hero-visual" ${bg}>
            <div class="page-studio-hero-copy">
              <h4>${escapeHtml(row.title || row.hero_key || 'Hero slide')}</h4>
              <p>${escapeHtml(row.subtitle || 'Click to edit the hero title, subtitle, image crop and link.')}</p>
            </div>
          </div>
        </article>
      `;
    }).join('');
    return `
      <section class="page-studio-section" id="studio-section-hero">
        <div class="page-studio-section-head">
          <div class="page-studio-section-copy">
            <h3>Hero Area</h3>
            <p class="page-studio-section-subtitle">Top page image, title, subtitle, crop and optional link.</p>
            <div class="page-studio-meta"><span class="page-studio-badge is-muted">${rows.length} hero ${rows.length === 1 ? 'slide' : 'slides'}</span></div>
          </div>
          <div class="page-studio-section-actions">
            <button class="site-btn primary" type="button" data-open-editor="${escapeAttr(getAdminUrl('hero-admin.html', { page: meta.modulePageKey, new: 1, embed: 1 }))}" data-editor-title="Add Hero">Add Hero</button>
          </div>
        </div>
        ${rows.length ? `
          <div class="page-studio-preview-grid">
            ${cards}
          </div>
        ` : '<div class="page-studio-empty">No hero records yet. Add one to start this page off visually.</div>'}
      </section>
    `;
  }

  function renderContentCardsSection(page, meta) {
    const rows = contentCards.filter(item => item.page_key === meta.modulePageKey).sort(sortByOrder);
    const cards = rows.map(row => `
      <article class="page-studio-preview-card is-content-card page-studio-clickable" draggable="true" data-sort-kind-item="content-card" data-item-id="${escapeAttr(row.id)}" data-open-editor="${escapeAttr(getAdminUrl('content-cards-admin.html', { page: meta.modulePageKey, cardId: row.id, embed: 1 }))}" data-editor-title="${escapeAttr(row.title || row.card_key || 'Content card')}">
        ${row.image_url ? `<img class="page-studio-preview-image" src="${escapeAttr(publicAssetSrc(row.image_url))}" alt="">` : ''}
        <div class="page-studio-preview-copy">
          <div class="page-studio-inline-head">
            <span class="page-studio-badge ${row.is_active === false ? 'is-muted' : 'is-good'}">${row.is_active === false ? 'Hidden' : 'Live'}</span>
            <label class="page-studio-item-toggle" data-stop-open="true">
              <input type="checkbox" data-card-toggle="${escapeAttr(row.id)}" ${row.is_active === false ? '' : 'checked'}>
              Visible
            </label>
          </div>
          <h4>${escapeHtml(row.title || row.card_key)}</h4>
          <p>${truncateRichText(row.body_html, 220)}</p>
          ${row.show_button !== false && row.button_label ? `<span class="page-studio-preview-button">${escapeHtml(row.button_label)}</span>` : ''}
        </div>
      </article>
    `).join('');
    return `
      <section class="page-studio-section" id="studio-section-content-cards">
        <div class="page-studio-section-head">
          <div class="page-studio-section-copy">
            <h3>Content Cards</h3>
            <p class="page-studio-section-subtitle">Click a card to edit it in place. Drag cards to change order.</p>
          </div>
          <div class="page-studio-section-actions">
            <button class="site-btn primary" type="button" data-open-editor="${escapeAttr(getAdminUrl('content-cards-admin.html', { page: meta.modulePageKey, new: 1, embed: 1 }))}" data-editor-title="Add Content Card">Add Card</button>
          </div>
        </div>
        ${rows.length ? `
          <div class="page-studio-content-grid page-studio-list" data-sort-list="content-cards" data-page-key="${escapeAttr(meta.modulePageKey)}">
            ${cards}
          </div>
        ` : '<div class="page-studio-empty">No content cards yet. Add one to place a visual section on this page.</div>'}
      </section>
    `;
  }

  function renderFeatureListsSection(page, meta) {
    const rows = featureLists.filter(item => item.page_key === meta.modulePageKey).sort(sortByOrder);
    const cards = rows.map(row => {
      const itemsPreview = featureListItems
        .filter(item => item.list_key === row.list_key && item.is_active !== false)
        .sort(sortByOrder)
        .slice(0, 4)
        .map(item => `<li>${truncateRichText(item.item_html, 110)}</li>`)
        .join('');
      return `
        <article class="page-studio-list-card page-studio-clickable" draggable="true" data-sort-kind-item="feature-list" data-item-id="${escapeAttr(row.list_key)}" data-open-editor="${escapeAttr(getAdminUrl('feature-lists-admin.html', { page: meta.modulePageKey, listKey: row.list_key, embed: 1 }))}" data-editor-title="${escapeAttr(row.title || row.list_key)}">
          <div class="page-studio-card-body">
            <div class="page-studio-inline-head">
              <span class="page-studio-badge ${row.is_active === false ? 'is-muted' : 'is-good'}">${row.is_active === false ? 'Hidden' : 'Live'}</span>
              <label class="page-studio-item-toggle" data-stop-open="true">
                <input type="checkbox" data-list-toggle="${escapeAttr(row.list_key)}" ${row.is_active === false ? '' : 'checked'}>
                Visible
              </label>
            </div>
            <h4>${escapeHtml(row.title || row.list_key)}</h4>
            <ul class="page-studio-list-items">${itemsPreview || '<li>Click to edit the items in this list.</li>'}</ul>
          </div>
        </article>
      `;
    }).join('');
    return `
      <section class="page-studio-section" id="studio-section-feature-lists">
        <div class="page-studio-section-head">
          <div class="page-studio-section-copy">
            <h3>Feature Lists</h3>
            <p class="page-studio-section-subtitle">Manage bullet-style service lists and custom SVG markers.</p>
          </div>
          <div class="page-studio-section-actions">
            <button class="site-btn secondary" type="button" data-open-editor="${escapeAttr(getAdminUrl('feature-lists-admin.html', { page: meta.modulePageKey, embed: 1 }))}" data-editor-title="Manage Feature Lists">Open List Editor</button>
          </div>
        </div>
        ${rows.length ? `
          <div class="page-studio-preview-grid page-studio-list" data-sort-list="feature-lists" data-page-key="${escapeAttr(meta.modulePageKey)}">
            ${cards}
          </div>
        ` : '<div class="page-studio-empty">No managed feature lists are active for this page yet.</div>'}
      </section>
    `;
  }

  function renderFaqSection(page, meta) {
    const rows = faqSections.filter(item => item.page_key === meta.modulePageKey).sort(sortByOrder);
    const cards = rows.map(row => {
      const itemsPreview = faqItems
        .filter(item => item.section_key === row.section_key && item.is_active !== false)
        .sort(sortByOrder)
        .slice(0, 4)
        .map(item => `<li>${escapeHtml(item.question || 'Untitled question')}</li>`)
        .join('');
      return `
        <article class="page-studio-list-card page-studio-clickable" data-open-editor="${escapeAttr(getAdminUrl('faqs-admin.html', { page: meta.modulePageKey, sectionKey: row.section_key, embed: 1 }))}" data-editor-title="${escapeAttr(row.title || row.section_key)}">
          <div class="page-studio-card-body">
            <div class="page-studio-inline-head">
              <span class="page-studio-badge ${row.is_active === false ? 'is-muted' : 'is-good'}">${row.is_active === false ? 'Hidden' : 'Live'}</span>
            </div>
            <h4>${escapeHtml(row.title || row.section_key)}</h4>
            <ul class="page-studio-list-items">${itemsPreview || '<li>Click to edit FAQ questions and answers.</li>'}</ul>
          </div>
        </article>
      `;
    }).join('');
    return `
      <section class="page-studio-section" id="studio-section-faq">
        <div class="page-studio-section-head">
          <div class="page-studio-section-copy">
            <h3>Frequently Asked Questions</h3>
            <p class="page-studio-section-subtitle">Edit accordion questions, answers and visibility for this page.</p>
          </div>
          <div class="page-studio-section-actions">
            <button class="site-btn secondary" type="button" data-open-editor="${escapeAttr(getAdminUrl('faqs-admin.html', { page: meta.modulePageKey, embed: 1 }))}" data-editor-title="Manage FAQs">Open FAQ Editor</button>
          </div>
        </div>
        ${rows.length ? `
          <div class="page-studio-preview-grid">
            ${cards}
          </div>
        ` : '<div class="page-studio-empty">No managed FAQ section is active for this page yet.</div>'}
      </section>
    `;
  }

  function renderContactOptionsSection(page, scope) {
    const rows = contactOptions.filter(item => scope === 'contact' ? item.show_on_contact : item.show_on_booking).sort(sortByOrder);
    const cards = rows.map(row => {
      const title = scope === 'contact' ? row.contact_title : (row.booking_title || row.contact_title);
      const body = scope === 'contact' ? row.contact_body_html : (row.booking_body_html || row.contact_body_html);
      const detail = scope === 'contact' ? row.contact_display_value : (row.booking_display_value || row.contact_display_value);
      return `
        <article class="page-studio-contact-card page-studio-clickable" data-open-editor="${escapeAttr(getAdminUrl('contact-options-admin.html', { page: scope, optionId: row.id, embed: 1 }))}" data-editor-title="${escapeAttr(title || row.option_key || 'Contact option')}">
          ${row.image_url ? `<img class="page-studio-preview-image" src="${escapeAttr(publicAssetSrc(row.image_url))}" alt="">` : ''}
          <div class="page-studio-preview-copy">
            <div class="page-studio-inline-head">
              <span class="page-studio-badge ${row.is_active === false ? 'is-muted' : 'is-good'}">${row.is_active === false ? 'Hidden' : 'Live'}</span>
              <label class="page-studio-item-toggle" data-stop-open="true">
                <input type="checkbox" data-contact-toggle="${escapeAttr(row.id)}" ${row.is_active === false ? '' : 'checked'}>
                Visible
              </label>
            </div>
            <h4>${escapeHtml(title || row.option_key)}</h4>
            <p>${truncateRichText(body, 140)}</p>
            ${detail ? `<div class="page-studio-contact-detail">${escapeHtml(detail)}</div>` : ''}
          </div>
        </article>
      `;
    }).join('');
    return `
      <section class="page-studio-section" id="studio-section-contact-options">
        <div class="page-studio-section-head">
          <div class="page-studio-section-copy">
            <h3>${scope === 'contact' ? 'Contact Us Tiles' : 'Book a Visit Tiles'}</h3>
            <p class="page-studio-section-subtitle">Tiles, wording, images, links and mobile contact buttons.</p>
          </div>
          <div class="page-studio-section-actions">
            <button class="site-btn primary" type="button" data-open-editor="${escapeAttr(getAdminUrl('contact-options-admin.html', { page: scope, new: 1, embed: 1 }))}" data-editor-title="Add Contact Option">Add Option</button>
          </div>
        </div>
        ${rows.length ? `
          <div class="page-studio-contact-grid">
            ${cards}
          </div>
        ` : '<div class="page-studio-empty">No contact options are currently assigned here.</div>'}
      </section>
    `;
  }

  function renderCarouselSection(carouselKey) {
    const rows = carouselTiles.filter(item => item.carousel_key === carouselKey).sort(sortByOrder);
    const label = carouselKey === 'take-a-look' ? 'Home Carousel' : 'Support Carousel';
    const cards = rows.map(row => `
      <article class="page-studio-carousel-card page-studio-clickable" draggable="true" data-sort-kind-item="carousel-tile" data-item-id="${escapeAttr(row.id)}" data-open-editor="${escapeAttr(getAdminUrl('carousels-admin.html', { carousel: carouselKey, tileId: row.id, embed: 1 }))}" data-editor-title="${escapeAttr(row.title || 'Carousel tile')}">
        ${row.image_url ? `<img class="page-studio-preview-image" src="${escapeAttr(publicAssetSrc(row.image_url))}" alt="">` : ''}
        <div class="page-studio-preview-copy">
          <div class="page-studio-inline-head">
            <span class="page-studio-badge ${row.is_active === false ? 'is-muted' : 'is-good'}">${row.is_active === false ? 'Hidden' : 'Live'}</span>
            <label class="page-studio-item-toggle" data-stop-open="true">
              <input type="checkbox" data-carousel-toggle="${escapeAttr(row.id)}" ${row.is_active === false ? '' : 'checked'}>
              Visible
            </label>
          </div>
          <h4>${escapeHtml(row.title || 'Carousel tile')}</h4>
          <p>${escapeHtml(row.description || row.link_url || 'Click to edit this tile.')}</p>
        </div>
      </article>
    `).join('');
    return `
      <section class="page-studio-section" id="studio-section-carousel">
        <div class="page-studio-section-head">
          <div class="page-studio-section-copy">
            <h3>${label}</h3>
            <p class="page-studio-section-subtitle">Drag tiles into order and switch them on or off.</p>
          </div>
          <div class="page-studio-section-actions">
            <button class="site-btn primary" type="button" data-open-editor="${escapeAttr(getAdminUrl('carousels-admin.html', { carousel: carouselKey, new: 1, embed: 1 }))}" data-editor-title="Add Carousel Tile">Add Tile</button>
          </div>
        </div>
        ${rows.length ? `
          <div class="page-studio-carousel-grid page-studio-list" data-sort-list="carousel" data-carousel-key="${escapeAttr(carouselKey)}">
            ${cards}
          </div>
        ` : '<div class="page-studio-empty">No carousel tiles are configured yet.</div>'}
      </section>
    `;
  }

  function renderSpecialManagerSection(kind, title, description, href) {
    return `
      <section class="page-studio-section" id="studio-section-${escapeAttr(kind)}">
        <div class="page-studio-section-head">
          <div class="page-studio-section-copy">
            <h3>${escapeHtml(title)}</h3>
            <p class="page-studio-section-subtitle">${escapeHtml(description)}</p>
          </div>
          <div class="page-studio-section-actions">
            <a class="site-btn primary" href="${escapeAttr(getAdminUrl(href))}">Open Editor</a>
          </div>
        </div>
        <div class="page-studio-empty">This page uses a specialist editor because its cards have pricing, multiple columns and modal content.</div>
      </section>
    `;
  }

  function renderManagedItem({ kind, id, title, meta, active, editHref, toggleAttr, drag }) {
    const toggle = toggleAttr ? `
      <label class="page-studio-item-toggle">
        <input type="checkbox" ${toggleAttr}="${escapeAttr(id)}" ${active ? 'checked' : ''}>
        Visible
      </label>
    ` : `<span class="page-studio-badge ${active ? 'is-good' : 'is-muted'}">${active ? 'Active' : 'Hidden'}</span>`;
    return `
      <article class="page-studio-item" ${drag ? 'draggable="true"' : ''} data-sort-kind-item="${escapeAttr(kind)}" data-item-id="${escapeAttr(id)}">
        <div class="page-studio-drag">${drag ? '&#9776;' : '&#8226;'}</div>
        <div>
          <div class="page-studio-item-title">${escapeHtml(title)}</div>
          <div class="page-studio-item-meta">${escapeHtml(meta || '')}</div>
        </div>
        <div class="page-studio-inline-actions">
          ${toggle}
          <a class="site-btn secondary" href="${escapeAttr(editHref)}">Edit</a>
        </div>
      </article>
    `;
  }

  function bindSectionEvents(page, meta) {
    document.querySelectorAll('[data-page-toggle]').forEach(input => input.addEventListener('change', () => setPageActive(input.dataset.pageToggle, input.checked)));
    document.querySelectorAll('[data-hero-toggle]').forEach(input => input.addEventListener('change', () => setToggle('site_heroes', 'id', input.dataset.heroToggle, input.checked)));
    document.querySelectorAll('[data-card-toggle]').forEach(input => input.addEventListener('change', () => setToggle('site_content_cards', 'id', input.dataset.cardToggle, input.checked)));
    document.querySelectorAll('[data-list-toggle]').forEach(input => input.addEventListener('change', () => setToggle('site_feature_lists', 'list_key', input.dataset.listToggle, input.checked)));
    document.querySelectorAll('[data-contact-toggle]').forEach(input => input.addEventListener('change', () => setToggle('site_contact_options', 'id', input.dataset.contactToggle, input.checked)));
    document.querySelectorAll('[data-carousel-toggle]').forEach(input => input.addEventListener('change', () => setToggle('site_carousel_tiles', 'id', input.dataset.carouselToggle, input.checked)));
    document.querySelectorAll('[data-open-editor]').forEach(element => {
      element.addEventListener('click', event => {
        if (event.target.closest('[data-stop-open], input, label, a, button')) return;
        event.preventDefault();
        openEditorModal(element.dataset.openEditor, element.dataset.editorTitle || 'Edit Section');
      });
    });
    document.querySelectorAll('button[data-open-editor]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        openEditorModal(button.dataset.openEditor, button.dataset.editorTitle || 'Edit Section');
      });
    });
    bindDragLists();
  }

  function openEditorModal(url, title) {
    const modal = document.getElementById('page-studio-editor-modal');
    const frame = document.getElementById('page-studio-editor-frame');
    const titleEl = document.getElementById('page-studio-editor-title');
    const openFull = document.getElementById('page-studio-editor-open-full');
    editorModalState = { url, title };
    titleEl.textContent = title;
    openFull.href = absoluteAdminHref(url);
    frame.src = absoluteAdminHref(url);
    frame.onload = () => styleEmbeddedEditor(frame);
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeEditorModal(clearFrame = true) {
    const modal = document.getElementById('page-studio-editor-modal');
    const frame = document.getElementById('page-studio-editor-frame');
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (clearFrame) frame.removeAttribute('src');
  }

  async function refreshAfterEditor() {
    await loadAll();
    renderPageRail();
    renderGlobalTools();
    renderCurrentSelection();
  }

  function absoluteAdminHref(url) {
    return new URL(url, window.location.origin).toString();
  }

  function styleEmbeddedEditor(frame) {
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const header = doc.getElementById('admin-header-container');
      if (header) header.style.display = 'none';
      doc.body.style.padding = '20px';
      doc.body.style.visibility = 'visible';
      doc.body.style.background = '#f4f7f6';
    } catch (error) {
      console.warn('Unable to restyle embedded editor.', error);
    }
  }

  function bindDragLists() {
    document.querySelectorAll('[data-sort-list]').forEach(list => {
      list.querySelectorAll('[data-item-id]').forEach(item => {
        item.addEventListener('dragstart', event => startDrag(event, list));
        item.addEventListener('dragover', dragOver);
        item.addEventListener('dragleave', event => event.currentTarget.classList.remove('is-drag-over'));
        item.addEventListener('drop', event => dropDragged(event, list));
        item.addEventListener('dragend', clearDraggedState);
      });
    });
  }

  function startDrag(event, list) {
    dragState = {
      listKind: list.dataset.sortList,
      pageKey: list.dataset.pageKey || '',
      carouselKey: list.dataset.carouselKey || '',
      groupKey: list.dataset.groupKey || '',
      id: event.currentTarget.dataset.itemId
    };
    event.currentTarget.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
  }

  function dragOver(event) {
    event.preventDefault();
    const item = event.currentTarget;
    if (!dragState || item.dataset.itemId === dragState.id) return;
    item.classList.add('is-drag-over');
    const moving = document.querySelector(`[data-item-id="${CSS.escape(dragState.id)}"]`);
    if (!moving) return;
    const after = event.clientY > item.getBoundingClientRect().top + item.offsetHeight / 2;
    item.parentNode.insertBefore(moving, after ? item.nextSibling : item);
  }

  async function dropDragged(event, list) {
    event.preventDefault();
    if (!dragState) return;
    list.querySelectorAll('.is-drag-over').forEach(item => item.classList.remove('is-drag-over'));
    const ids = [...list.querySelectorAll('[data-item-id]')].map(item => item.dataset.itemId);
    await saveOrderForList(list.dataset.sortList, ids, list.dataset.pageKey || '', list.dataset.carouselKey || '', list.dataset.groupKey || '');
    clearDraggedState();
  }

  function clearDraggedState() {
    document.querySelectorAll('.page-studio-item').forEach(item => item.classList.remove('is-dragging', 'is-drag-over'));
    dragState = null;
  }

  async function saveOrderForList(kind, ids, pageKey, carouselKey, groupKey) {
    let tasks = [];
    if (kind === 'content-cards') {
      tasks = ids.map((id, index) => db.from('site_content_cards').update({ sort_order: (index + 1) * 10, updated_at: new Date().toISOString() }).eq('id', id).eq('page_key', pageKey));
    } else if (kind === 'feature-lists') {
      tasks = ids.map((id, index) => db.from('site_feature_lists').update({ sort_order: (index + 1) * 10, updated_at: new Date().toISOString() }).eq('list_key', id).eq('page_key', pageKey));
    } else if (kind === 'carousel') {
      tasks = ids.map((id, index) => db.from('site_carousel_tiles').update({ sort_order: (index + 1) * 10, updated_at: new Date().toISOString() }).eq('id', id).eq('carousel_key', carouselKey));
    } else if (kind === 'nav-pages') {
      tasks = ids.map((id, index) => db.from('site_pages').update({ sort_order: (index + 1) * 10, updated_at: new Date().toISOString() }).eq('id', id).eq('nav_group', groupKey));
    }
    if (!tasks.length) return;
    const results = await Promise.all(tasks);
    const error = results.find(result => result.error)?.error;
    if (error) {
      alert(error.message);
      return;
    }
    await loadAll();
    renderPageRail();
    renderCurrentSelection();
  }

  async function setPageActive(id, active) {
    const { error } = await db.from('site_pages').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    await loadAll();
    renderPageRail();
    renderCurrentSelection();
  }

  async function setToggle(table, keyField, id, active) {
    const { error } = await db.from(table).update({ is_active: active, updated_at: new Date().toISOString() }).eq(keyField, id);
    if (error) {
      alert(error.message);
      return;
    }
    await loadAll();
    renderCurrentSelection();
  }

  function publicAssetSrc(path) {
    if (!path) return '';
    return getPublicHref(path);
  }

  function stripHtml(value) {
    return String(value || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function truncateRichText(value, limit) {
    const text = stripHtml(value);
    if (text.length <= limit) return text;
    return `${text.slice(0, Math.max(0, limit - 1)).trim()}…`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  initialise();
}());
