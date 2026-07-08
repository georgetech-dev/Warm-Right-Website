(function () {
  const DEFAULT_TITLE = 'Privacy Policy and Customer Privacy Notice';
  const DEFAULT_REVIEW_DATE = '2026-07-05';
  const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'A', 'UL', 'OL', 'LI', 'H3', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD']);
  let publicPolicyLoading = false;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function normalizeBrand(value) {
    return String(value || '').replace(/\bWarmRight\b/g, 'Warm Right');
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
      if (/^•\s*/.test(line)) {
        listItems.push(line.replace(/^•\s*/, ''));
        return;
      }

      flushList();
      const next = meaningful.slice(index + 1).find(Boolean) || '';
      const clean = normalizeBrand(line);
      if (clean.length <= 90 && !/[.!?:;]$/.test(clean) && /^•\s*/.test(next)) {
        output.push(`<h3>${escapeHtml(clean)}</h3>`);
      } else if (clean.length <= 90 && /:$/.test(clean) && /^•\s*/.test(next)) {
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
    const reviewLine = lines.find(line => /^Last updated:/i.test(line.trim())) || '';
    const reviewDateText = reviewLine.replace(/^Last updated:\s*/i, '').trim();
    const sections = [];
    let current = null;

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const heading = line.trim().match(/^(\d+)\.\s+(.+)$/);
      if (heading) {
        if (current) sections.push(current);
        current = { originalNumber: Number(heading[1]), subtitle: heading[2].trim(), lines: [] };
      } else if (current) {
        current.lines.push(line);
      }
    }
    if (current) sections.push(current);

    return {
      title,
      reviewDate: parseReviewDate(reviewDateText) || DEFAULT_REVIEW_DATE,
      sections: sections.map((section, index) => ({
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

  async function fetchDraft() {
    const root = window.location.pathname.includes('/admin/') ? '../' : '';
    const response = await fetch(`${root}assets/data/privacy-policy-draft.txt`, { cache: 'no-store' });
    if (!response.ok) throw new Error('The privacy policy draft could not be loaded.');
    return parseDraft(await response.text());
  }

  async function waitForDatabase(maxAttempts = 50) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (window.db) return window.db;
      await new Promise(resolve => window.setTimeout(resolve, 50));
    }
    return null;
  }

  async function loadPublicPolicy() {
    const container = document.getElementById('privacy-sections');
    if (!container || publicPolicyLoading) return;
    publicPolicyLoading = true;

    try {
      let policy = null;
      const db = await waitForDatabase();
      if (db) {
        const [settingsResult, sectionsResult] = await Promise.all([
          db.from('site_settings').select('setting_key, setting_value').in('setting_key', ['privacy_page_title', 'privacy_review_date']),
          db.from('privacy_policy_sections').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        ]);
        if (!sectionsResult.error && sectionsResult.data?.length) {
          const settings = Object.fromEntries((settingsResult.data || []).map(row => [row.setting_key, row.setting_value]));
          policy = {
            title: settings.privacy_page_title || DEFAULT_TITLE,
            reviewDate: settings.privacy_review_date || DEFAULT_REVIEW_DATE,
            sections: sectionsResult.data,
          };
        }
      }

      if (!policy) policy = await fetchDraft();
      document.getElementById('privacy-title').textContent = policy.title || DEFAULT_TITLE;
      document.getElementById('privacy-review-date').textContent = `Review date: ${formatReviewDate(policy.reviewDate || DEFAULT_REVIEW_DATE)}`;
      container.innerHTML = policy.sections.map((section, index) => `
        <section class="privacy-section" id="section-${index + 1}">
          <h2><span aria-hidden="true">${index + 1}.</span> ${escapeHtml(section.subtitle)}</h2>
          <div class="privacy-section-content">${sanitizeHtml(section.body_html)}</div>
        </section>
      `).join('');
    } catch (error) {
      container.innerHTML = '<p class="privacy-loading">The privacy notice could not be loaded. Please contact info@warmright.uk.</p>';
      console.error('Privacy policy load failed:', error);
    } finally {
      publicPolicyLoading = false;
    }
  }

  window.WarmRightPrivacy = {
    DEFAULT_TITLE,
    DEFAULT_REVIEW_DATE,
    escapeHtml,
    fetchDraft,
    formatReviewDate,
    parseDraft,
    sanitizeHtml,
  };

  document.addEventListener('DOMContentLoaded', loadPublicPolicy);
  document.addEventListener('includesLoaded', () => {
    if (!document.querySelector('#privacy-sections .privacy-section')) loadPublicPolicy();
  });
}());
