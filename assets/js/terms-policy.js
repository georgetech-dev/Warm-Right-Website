(function () {
  const DEFAULT_TITLE = 'Terms and Conditions';
  const DEFAULT_REVIEW_DATE = '2026-07-13';
  const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'A', 'UL', 'OL', 'LI', 'H3', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD']);
  const TARGET_STORAGE_KEY = 'warmright_terms_target';
  let publicTermsLoading = false;
  let publicTermsLoadedOnce = false;
  let includesReady = false;

  if (window.location.hash && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function normalizeBrand(value) {
    return String(value || '').replace(/\bWarmRight\b/g, 'Warm Right');
  }

  function slugifyKey(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function bodyLinesToHtml(lines) {
    const output = [];
    let listItems = [];

    const flushList = () => {
      if (!listItems.length) return;
      output.push(`<ul>${listItems.map(item => `<li>${escapeHtml(normalizeBrand(item))}</li>`).join('')}</ul>`);
      listItems = [];
    };

    const meaningful = lines.map(line => line.trim());
    meaningful.forEach((line, index) => {
      if (!line) {
        flushList();
        return;
      }
      if (/^[•*-]\s*/.test(line)) {
        listItems.push(line.replace(/^[•*-]\s*/, ''));
        return;
      }

      flushList();
      const next = meaningful.slice(index + 1).find(Boolean) || '';
      const clean = normalizeBrand(line);
      if (clean.length <= 90 && !/[.!?:;]$/.test(clean) && /^[•*-]\s*/.test(next)) {
        output.push(`<h3>${escapeHtml(clean)}</h3>`);
      } else if (clean.length <= 90 && /:$/.test(clean) && /^[•*-]\s*/.test(next)) {
        output.push(`<p><strong>${escapeHtml(clean)}</strong></p>`);
      } else {
        output.push(`<p>${escapeHtml(clean)}</p>`);
      }
    });
    flushList();
    return output.join('');
  }

  function parseDraft(text) {
    const lines = normalizeBrand(text).replace(/\r/g, '').split('\n');
    const title = lines.find(line => line.trim())?.trim() || DEFAULT_TITLE;
    const reviewLine = lines.find(line => /^Review date:/i.test(line.trim())) || '';
    const reviewDateText = reviewLine.replace(/^Review date:\s*/i, '').trim();
    const sections = [];
    let current = null;

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const heading = line.trim().match(/^(\d+)\.\s+(.+)$/);
      if (heading) {
        if (current) sections.push(current);
        current = { subtitle: heading[2].trim(), lines: [] };
      } else if (current) {
        current.lines.push(line);
      }
    }
    if (current) sections.push(current);

    return {
      title,
      reviewDate: parseReviewDate(reviewDateText) || DEFAULT_REVIEW_DATE,
      sections: sections.map((section, index) => ({
        section_key: slugifyKey(section.subtitle) || `section-${index + 1}`,
        subtitle: section.subtitle,
        body_html: bodyLinesToHtml(section.lines),
        sort_order: (index + 1) * 10,
        is_active: true,
      })),
    };
  }

  function parseReviewDate(value) {
    const match = String(value || '').trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (!match) return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : '';
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const month = months.indexOf(match[2].toLowerCase());
    if (month < 0) return '';
    return `${match[3]}-${String(month + 1).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  }

  function formatReviewDate(value) {
    if (!value) return '';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function sanitizeHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    template.content.querySelectorAll('*').forEach(element => {
      if (!ALLOWED_TAGS.has(element.tagName)) {
        element.replaceWith(...element.childNodes);
        return;
      }
      [...element.attributes].forEach(attribute => {
        const allowedHref = element.tagName === 'A' && attribute.name === 'href';
        if (!allowedHref) element.removeAttribute(attribute.name);
      });
      if (element.tagName === 'A') {
        const href = element.getAttribute('href') || '';
        if (!/^(https?:|mailto:|tel:|\/|#)/i.test(href)) element.removeAttribute('href');
        if (/^https?:/i.test(href)) {
          element.setAttribute('target', '_blank');
          element.setAttribute('rel', 'noopener noreferrer');
        }
      }
    });
    return template.innerHTML;
  }

  function currentHeaderOffset() {
    const navBar = document.querySelector('#header #main-nav-bar.header, #main-nav-bar.header');
    const headerHeight = navBar ? Math.ceil(navBar.getBoundingClientRect().height) : 0;
    return headerHeight + 12;
  }

  function getRequestedTargetId() {
    const search = new URLSearchParams(window.location.search);
    const fromQuery = search.get('section');
    if (fromQuery) return decodeURIComponent(fromQuery);
    const rawHash = window.location.hash || '';
    if (rawHash && rawHash !== '#') return decodeURIComponent(rawHash.slice(1));
    try {
      return sessionStorage.getItem(TARGET_STORAGE_KEY) || '';
    } catch (_) {
      return '';
    }
  }

  function clearStoredTarget() {
    try {
      sessionStorage.removeItem(TARGET_STORAGE_KEY);
    } catch (_) {
      // ignore storage failures
    }
  }

  function syncLocationHash(targetId) {
    if (!targetId) return;
    const encoded = `#${encodeURIComponent(targetId)}`;
    if (window.location.hash !== encoded) {
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}${encoded}`);
    }
  }

  function scrollToHashTarget(behavior = 'auto') {
    const id = getRequestedTargetId();
    if (!id) return false;
    const target = document.getElementById(id);
    if (!target) return false;
    const top = Math.max(0, window.pageYOffset + target.getBoundingClientRect().top - currentHeaderOffset());
    window.scrollTo({ top, behavior });
    document.documentElement.scrollTop = top;
    document.body.scrollTop = top;
    syncLocationHash(id);
    clearStoredTarget();
    return true;
  }

  function queueHashScroll(behavior = 'auto', attempt = 0) {
    if (!getRequestedTargetId()) return;
    window.requestAnimationFrame(() => {
      const didScroll = scrollToHashTarget(behavior);
      if (!didScroll && attempt < 8) {
        window.setTimeout(() => queueHashScroll(behavior, attempt + 1), 120);
      }
    });
  }

  async function fetchDraft() {
    const root = window.location.pathname.includes('/admin/') ? '../' : '';
    const response = await fetch(`${root}assets/data/terms-policy-draft.txt`, { cache: 'no-store' });
    if (!response.ok) throw new Error('The starter terms draft could not be loaded.');
    return parseDraft(await response.text());
  }

  async function waitForDatabase(maxAttempts = 50) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (window.db) return window.db;
      await new Promise(resolve => window.setTimeout(resolve, 50));
    }
    return null;
  }

  async function loadPublicTerms() {
    const container = document.getElementById('terms-sections');
    if (!container || publicTermsLoading) return;
    publicTermsLoading = true;

    try {
      let policy = null;
      const db = await waitForDatabase();
      if (db) {
        const [settingsResult, sectionsResult] = await Promise.all([
          db.from('site_settings').select('setting_key, setting_value').in('setting_key', ['terms_page_title', 'terms_review_date']),
          db.from('terms_policy_sections').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        ]);
        if (!sectionsResult.error && sectionsResult.data?.length) {
          const settings = Object.fromEntries((settingsResult.data || []).map(row => [row.setting_key, row.setting_value]));
          policy = {
            title: settings.terms_page_title || DEFAULT_TITLE,
            reviewDate: settings.terms_review_date || DEFAULT_REVIEW_DATE,
            sections: sectionsResult.data,
          };
        }
      }

      if (!policy) policy = await fetchDraft();
      document.getElementById('terms-title').textContent = policy.title || DEFAULT_TITLE;
      document.getElementById('terms-review-date').textContent = `Review date: ${formatReviewDate(policy.reviewDate || DEFAULT_REVIEW_DATE)}`;
      container.innerHTML = policy.sections.map((section, index) => {
        const key = slugifyKey(section.section_key || section.subtitle || `section-${index + 1}`) || `section-${index + 1}`;
        return `
          <section class="privacy-section" id="${escapeHtml(key)}">
            <h2><span aria-hidden="true">${index + 1}.</span> ${escapeHtml(section.subtitle)}</h2>
            <div class="privacy-section-content">${sanitizeHtml(section.body_html)}</div>
          </section>
        `;
      }).join('');
      publicTermsLoadedOnce = true;
      if (includesReady) queueHashScroll('auto');
    } catch (error) {
      container.innerHTML = '<p class="privacy-loading">The terms page could not be loaded. Please contact info@warmright.uk.</p>';
      console.error('Terms policy load failed:', error);
    } finally {
      publicTermsLoading = false;
    }
  }

  window.WarmRightTerms = {
    DEFAULT_TITLE,
    DEFAULT_REVIEW_DATE,
    TARGET_STORAGE_KEY,
    escapeHtml,
    fetchDraft,
    formatReviewDate,
    parseDraft,
    sanitizeHtml,
    slugifyKey,
  };

  document.addEventListener('DOMContentLoaded', loadPublicTerms);
  document.addEventListener('includesLoaded', () => {
    includesReady = true;
    if (!publicTermsLoadedOnce && !publicTermsLoading) loadPublicTerms();
    if (publicTermsLoadedOnce) {
      window.requestAnimationFrame(() => queueHashScroll('auto'));
    }
  });
  window.addEventListener('hashchange', () => scrollToHashTarget('smooth'));
}());
