(function () {
  const SECTION_TABLE = 'site_faq_sections';
  const ITEM_TABLE = 'site_faq_items';

  function pageKeyFromPath() {
    const parts = window.location.pathname.toLowerCase().split('/').filter(Boolean);
    const isGitHub = window.location.hostname.includes('github.io');
    const usableParts = isGitHub && parts.length > 1 ? parts.slice(1) : parts;
    const file = usableParts[usableParts.length - 1] || 'index.html';
    const key = file.replace(/\.html$/, '') === 'index' ? 'home' : file.replace(/\.html$/, '');
    return key === 'testimonals' ? 'testimonials' : key;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  function sectionTitle(sectionEl) {
    return sectionEl.querySelector('h1, h2, h3')?.textContent?.replace(/\s+/g, ' ').trim() || 'Frequently Asked Questions';
  }

  function prepareSections() {
    const pageKey = pageKeyFromPath();
    let count = 0;
    return Array.from(document.querySelectorAll('section'))
      .filter(section => section.querySelector('.faq'))
      .map(section => {
        count += 1;
        if (!section.dataset.faqSection) section.dataset.faqSection = `${pageKey}:faq-${count}`;
        section.classList.add('faq-section');
        return section;
      });
  }

  function closeSiblings(currentFaq) {
    const section = currentFaq.closest('.faq-section') || document;
    section.querySelectorAll('.faq.open').forEach(faq => {
      if (faq !== currentFaq) {
        faq.classList.remove('open');
        faq.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function bindFaqCard(faq, index) {
    if (!faq || faq.dataset.faqBound === 'true') return;
    const question = faq.querySelector('h3');
    const answer = faq.querySelector('.faq-answer, p');
    if (!question || !answer) return;

    const answerId = faq.id || `faq-answer-${pageKeyFromPath()}-${index}`;
    faq.id = faq.id || `faq-card-${pageKeyFromPath()}-${index}`;
    answer.id = answerId;
    faq.dataset.faqBound = 'true';
    faq.setAttribute('role', 'button');
    faq.setAttribute('tabindex', '0');
    faq.setAttribute('aria-controls', answerId);
    faq.setAttribute('aria-expanded', faq.classList.contains('open') ? 'true' : 'false');

    const toggle = () => {
      const willOpen = !faq.classList.contains('open');
      closeSiblings(faq);
      faq.classList.toggle('open', willOpen);
      faq.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    };

    faq.addEventListener('click', event => {
      if (event.target.closest('a, button, input, textarea, select')) return;
      toggle();
    });

    faq.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
  }

  function activateFaqs(root = document) {
    Array.from(root.querySelectorAll('.faq')).forEach((faq, index) => bindFaqCard(faq, index));
  }

  function renderSection(sectionEl, sectionRow, items) {
    const heading = sectionEl.querySelector('h1, h2, h3');
    if (heading && sectionRow?.title) heading.textContent = sectionRow.title;

    const activeItems = (items || [])
      .filter(item => item.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    if (!activeItems.length) return;

    sectionEl.querySelectorAll('.faq').forEach(faq => faq.remove());
    const html = activeItems.map(item => {
      const safeAnswer = window.WarmRightSanitize?.sanitizeRichHtml(item.answer_html || '') || '';
      return `
        <div class="faq card">
          <h3>${escapeHtml(item.question || 'Untitled question')}</h3>
          <div class="faq-answer">${safeAnswer}</div>
        </div>
      `;
    }).join('');
    sectionEl.insertAdjacentHTML('beforeend', html);
  }

  async function loadFaqs() {
    const sections = prepareSections();
    if (!sections.length) return;

    if (!window.db) {
      activateFaqs(document);
      return;
    }

    const pageKey = pageKeyFromPath();
    const sectionKeys = sections.map(section => section.dataset.faqSection).filter(Boolean);

    const { data: sectionRows, error: sectionError } = await window.db
      .from(SECTION_TABLE)
      .select('*')
      .eq('page_key', pageKey)
      .in('section_key', sectionKeys);

    if (sectionError || !sectionRows?.length) {
      activateFaqs(document);
      return;
    }

    const activeSections = sectionRows.filter(section => section.is_active !== false);
    if (!activeSections.length) {
      activateFaqs(document);
      return;
    }

    const { data: itemRows, error: itemError } = await window.db
      .from(ITEM_TABLE)
      .select('*')
      .in('section_key', activeSections.map(section => section.section_key))
      .order('sort_order', { ascending: true });

    if (itemError) {
      activateFaqs(document);
      return;
    }

    const sectionMap = new Map(activeSections.map(section => [section.section_key, section]));
    const itemMap = itemRows.reduce((acc, item) => {
      acc[item.section_key] = acc[item.section_key] || [];
      acc[item.section_key].push(item);
      return acc;
    }, {});

    sections.forEach(sectionEl => {
      const sectionKey = sectionEl.dataset.faqSection;
      const sectionRow = sectionMap.get(sectionKey);
      if (sectionRow) renderSection(sectionEl, sectionRow, itemMap[sectionKey] || []);
    });

    activateFaqs(document);
    if (typeof window.observeRevealCards === 'function') window.observeRevealCards(document);
  }

  document.addEventListener('includesLoaded', loadFaqs);
  if (document.readyState !== 'loading') loadFaqs();
})();
