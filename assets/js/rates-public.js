(function () {
  const SUPABASE_URL = 'https://axampuprcnauxbbijmmt.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4YW1wdXByY25hdXhiYmlqbW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDgyNjUsImV4cCI6MjA5MzMyNDI2NX0.Er1hMQbaXnR4hzHfR2my0SmtwUcUs49HaCVqYwMBHuQ';
  const optionLookup = new Map();

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function money(value) {
    return Number.parseFloat(value || 0).toFixed(2);
  }

  function imageMarkup(path, alt) {
    const fallbackPath = 'assets/images/no-image.jpg';
    const src = window.WarmRightImages?.imageUrl(path || fallbackPath) || (path || fallbackPath);
    const raw = window.WarmRightImages?.githubRawUrl(path || '') || '';
    return `<img class="rate-card-image" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" data-github-fallback="${escapeHtml(raw)}" onerror="if(this.dataset.githubFallback && this.dataset.githubFallback !== this.src){this.src=this.dataset.githubFallback;this.dataset.githubFallback='';}else{this.src='${fallbackPath}';}">`;
  }

  function legacyOption(rate) {
    return {
      id: `legacy-${rate.id}`,
      rate_id: rate.id,
      subtitle: '',
      price_ex_vat: rate.price_ex_vat,
      vat_amount: rate.vat_amount,
      price_inc_vat: rate.price_inc_vat,
      read_more_type: rate.read_more_type || 'modal',
      read_more_url: rate.read_more_url || '',
      read_more_content: rate.read_more_content || '',
      sort_order: 0
    };
  }

  function renderAction(rate, option) {
    if (option.read_more_type === 'link') {
      return `<a class="rate-read-more" href="${escapeHtml(option.read_more_url || '#')}">Read More</a>`;
    }
    return `<button class="rate-read-more" type="button" data-rate-id="${escapeHtml(rate.id)}" data-option-id="${escapeHtml(option.id)}">Read More</button>`;
  }

  function renderOption(rate, option, index, total) {
    optionLookup.set(String(option.id), { rate, option });
    const title = option.subtitle || (total > 1 ? `Option ${index + 1}` : '');
    return `
      <div class="rate-option">
        ${title ? `<h3 class="rate-option-title">${escapeHtml(title)}</h3>` : ''}
        <span class="rate-option-price">£${money(option.price_inc_vat)} <small>inc VAT</small></span>
        <span class="rate-option-ex-vat">(£${money(option.price_ex_vat)} ex VAT)</span>
        ${renderAction(rate, option)}
      </div>`;
  }

  async function loadRates() {
    const lib = window.supabase || window.Supabase;
    if (!lib) return setTimeout(loadRates, 50);
    const db = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: rates, error } = await db.from('rates').select('*').eq('is_hidden', false).order('sort_order', { ascending: true });
    const container = document.getElementById('rates-container');
    if (!container) return;
    if (error) {
      console.error('Unable to load rates:', error);
      container.innerHTML = '<p>Current rates are temporarily unavailable.</p>';
      return;
    }

    const rateIds = (rates || []).map(rate => rate.id);
    let options = [];
    if (rateIds.length) {
      const result = await db.from('rate_options').select('*').in('rate_id', rateIds).order('sort_order', { ascending: true });
      if (!result.error) options = result.data || [];
    }
    const grouped = new Map();
    for (const option of options) {
      if (!grouped.has(option.rate_id)) grouped.set(option.rate_id, []);
      grouped.get(option.rate_id).push(option);
    }

    optionLookup.clear();
    container.innerHTML = (rates || []).map((rate, index) => {
      const rateOptionList = (grouped.get(rate.id) || [legacyOption(rate)]).slice(0, 3);
      const suspended = rate.is_suspended
        ? '<div class="suspended-overlay"><div class="suspended-ribbon">Currently Unavailable</div></div>'
        : '';
      return `
        <article class="rate-card card ${index % 2 ? 'rate-card-image-right' : ''} ${rate.is_suspended ? 'is-suspended' : ''}" id="rate-${escapeHtml(rate.id)}">
          ${suspended}
          ${imageMarkup(rate.image_url, rate.title)}
          <div class="rate-card-content">
            <div class="rate-card-copy">
              <h2>${escapeHtml(rate.title)}</h2>
              <p>${escapeHtml(rate.description || '')}</p>
            </div>
            <div class="rate-options" data-option-count="${rateOptionList.length}" style="--rate-option-count:${rateOptionList.length}">
              ${rateOptionList.map((option, optionIndex) => renderOption(rate, option, optionIndex, rateOptionList.length)).join('')}
            </div>
          </div>
        </article>`;
    }).join('');

    if (window.observeRevealCards) window.observeRevealCards(container);
  }

  function openRateModal(optionId) {
    const entry = optionLookup.get(String(optionId));
    if (!entry) return;
    const { rate, option } = entry;
    const title = option.subtitle ? `${rate.title} - ${option.subtitle}` : rate.title;
    document.getElementById('rate-modal-title').textContent = title;
    document.getElementById('rate-modal-body').innerHTML = option.read_more_content || 'Additional information will be available soon.';
    document.getElementById('rate-info-modal').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeRateModal() {
    document.getElementById('rate-info-modal').classList.remove('is-open');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-option-id]');
    if (trigger) openRateModal(trigger.dataset.optionId);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeRateModal();
  });

  window.closeRateModal = closeRateModal;
  loadRates();
}());
