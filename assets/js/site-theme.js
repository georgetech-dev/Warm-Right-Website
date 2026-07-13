(function () {
  const STORAGE_KEY = 'warmright-theme-preference';
  const CACHE_KEY = 'warmright-theme-settings';
  const DEFAULTS = {
    light: { page_background:'#f9f6f2', surface:'#ffffff', text_primary:'#0f1724', text_secondary:'#5c5c5c', primary:'#0a2c66', accent:'#2a6f7b', highlight:'#d97706', nav_background:'#0a2c66', nav_text:'#ffffff', nav_hover_text:'#ffd166', nav_dropdown_background:'#ffffff', nav_dropdown_text:'#0a2c66', nav_dropdown_hover_background:'#fff7e6', nav_dropdown_hover_text:'#d97706', footer_background:'#062940', footer_text:'#ffffff', feature_list_item_background:'#ffffff', feature_list_item_text:'#0f1724', feature_list_icon_tint:'#0f1724', faq_item_background:'#ffffff', faq_item_text:'#334155', faq_question_text:'#0a2c66', faq_toggle_text:'#d63c2c', faq_border:'#dbe4ef', testimonial_form_background:'#ffffff', testimonial_form_text:'#0f1724', testimonial_input_background:'#ffffff', testimonial_input_text:'#0f1724', testimonial_input_border:'#d8e2ee', testimonial_support_background:'#f8fbff', testimonial_support_text:'#344054', background_image:'', use_background_image:'false' },
    dark: { page_background:'#181b20', surface:'#242a31', text_primary:'#f5f7fa', text_secondary:'#cbd5e1', primary:'#7db7ff', accent:'#5ac8c8', highlight:'#f59e0b', nav_background:'#101827', nav_text:'#ffffff', nav_hover_text:'#f59e0b', nav_dropdown_background:'#111827', nav_dropdown_text:'#ffffff', nav_dropdown_hover_background:'#1f2937', nav_dropdown_hover_text:'#fbbf24', footer_background:'#0b111b', footer_text:'#f8fafc', feature_list_item_background:'#f8fafc', feature_list_item_text:'#0f1724', feature_list_icon_tint:'#0f1724', faq_item_background:'#f8fafc', faq_item_text:'#0f1724', faq_question_text:'#0a2c66', faq_toggle_text:'#d63c2c', faq_border:'#334155', testimonial_form_background:'#111827', testimonial_form_text:'#f8fafc', testimonial_input_background:'#0f172a', testimonial_input_text:'#f8fafc', testimonial_input_border:'#334155', testimonial_support_background:'#1b2635', testimonial_support_text:'#dbe5f2', background_image:'', use_background_image:'false' },
  };
  let settings = readCache();

  function currentMode(preference = getPreference()) {
    if (preference === 'light' || preference === 'dark') return preference;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getPreference() { return localStorage.getItem(STORAGE_KEY) || 'system'; }

  function setPreference(preference) {
    const value = ['light', 'dark', 'system'].includes(preference) ? preference : 'system';
    localStorage.setItem(STORAGE_KEY, value);
    apply(value);
    document.dispatchEvent(new CustomEvent('warmRightThemeChanged', { detail: { preference:value, mode:currentMode(value) } }));
  }

  function apply(preference = getPreference()) {
    const mode = currentMode(preference);
    const values = { ...DEFAULTS[mode], ...(settings?.[mode] || {}) };
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.classList.toggle('dark-mode', mode === 'dark');
    const variables = {
      '--background-main': values.page_background,
      '--background-alt': values.surface,
      '--tile-background': values.surface,
      '--text-primary': values.text_primary,
      '--text-secondary': values.text_secondary,
      '--primary-blue': values.primary,
      '--accent-orange': values.highlight,
      '--accent-teal': values.accent,
      '--highlight-amber': values.highlight,
      '--frame-neutral': values.surface,
      '--nav-background': values.nav_background,
      '--nav-text': values.nav_text,
      '--nav-hover-text': values.nav_hover_text || values.highlight,
      '--nav-dropdown-background': values.nav_dropdown_background || values.surface,
      '--nav-dropdown-text': values.nav_dropdown_text || values.primary,
      '--nav-dropdown-hover-background': values.nav_dropdown_hover_background || 'rgba(10, 44, 102, 0.05)',
      '--nav-dropdown-hover-text': values.nav_dropdown_hover_text || values.highlight,
      '--footer-background': values.footer_background,
      '--footer-text': values.footer_text,
      '--feature-list-item-background': values.feature_list_item_background || values.surface,
      '--feature-list-item-text': values.feature_list_item_text || values.text_primary,
      '--feature-list-icon-tint': values.feature_list_icon_tint || values.primary,
      '--faq-item-background': values.faq_item_background || values.surface,
      '--faq-item-text': values.faq_item_text || values.text_primary,
      '--faq-question-text': values.faq_question_text || values.primary,
      '--faq-toggle-text': values.faq_toggle_text || values.highlight,
      '--faq-border': values.faq_border || values.surface,
      '--rates-card-background': values.rates_card_background || values.surface,
      '--rates-card-text': values.rates_card_text || values.text_primary,
      '--rates-card-muted': values.rates_card_muted || values.text_secondary,
      '--rates-card-divider': values.rates_card_divider || values.surface,
      '--rates-button-background': values.rates_button_background || values.primary,
      '--rates-button-text': values.rates_button_text || '#ffffff',
      '--rates-modal-background': values.rates_modal_background || values.surface,
      '--rates-modal-text': values.rates_modal_text || values.text_primary,
      '--rates-modal-muted': values.rates_modal_muted || values.text_secondary,
      '--rates-modal-close-background': values.rates_modal_close_background || values.surface,
      '--rates-modal-close-text': values.rates_modal_close_text || values.text_primary,
      '--offers-card-background': values.offers_card_background || values.surface,
      '--offers-card-text': values.offers_card_text || values.text_primary,
      '--offers-card-muted': values.offers_card_muted || values.text_secondary,
      '--offers-button-background': values.offers_button_background || values.primary,
      '--offers-button-text': values.offers_button_text || '#ffffff',
      '--offers-modal-background': values.offers_modal_background || values.surface,
      '--offers-modal-text': values.offers_modal_text || values.text_primary,
      '--offers-modal-close-background': values.offers_modal_close_background || values.surface,
      '--offers-modal-close-text': values.offers_modal_close_text || values.text_primary,
      '--testimonials-card-background': values.testimonials_card_background || values.surface,
      '--testimonials-card-text': values.testimonials_card_text || values.text_primary,
      '--testimonials-card-muted': values.testimonials_card_muted || values.text_secondary,
      '--testimonials-accent': values.testimonials_accent || values.accent,
      '--testimonial-form-background': values.testimonial_form_background || values.surface,
      '--testimonial-form-text': values.testimonial_form_text || values.text_primary,
      '--testimonial-input-background': values.testimonial_input_background || values.surface,
      '--testimonial-input-text': values.testimonial_input_text || values.text_primary,
      '--testimonial-input-border': values.testimonial_input_border || values.surface,
      '--testimonial-support-background': values.testimonial_support_background || values.surface,
      '--testimonial-support-text': values.testimonial_support_text || values.text_secondary,
      '--privacy-surface': values.privacy_surface || 'transparent',
      '--privacy-text': values.privacy_text || values.text_primary,
      '--privacy-heading': values.privacy_heading || values.primary,
      '--privacy-subheading': values.privacy_subheading || values.accent,
      '--privacy-link': values.privacy_link || values.primary,
      '--privacy-divider': values.privacy_divider || values.surface,
    };
    Object.entries(variables).forEach(([key, value]) => root.style.setProperty(key, value));
    const image = String(values.use_background_image) === 'true' && values.background_image
      ? `url("${resolveImage(values.background_image)}")`
      : 'none';
    root.style.setProperty('--site-background-image', image);
  }

  async function initialise() {
    apply();
    if (!window.db) return;
    const { data, error } = await window.db.from('site_settings').select('setting_key,setting_value').like('setting_key', 'theme_%');
    if (error) { console.warn('Website theme settings could not be loaded:', error.message); return; }
    settings = { light:{}, dark:{} };
    for (const row of data || []) {
      const match = row.setting_key.match(/^theme_(light|dark)_(.+)$/);
      if (match) settings[match[1]][match[2]] = row.setting_value;
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
    apply();
  }

  function resolveImage(path) {
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    return window.WarmRightImages?.backgroundImageUrl(path) || `/${String(path).replace(/^\/+/, '')}`;
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || { light:{}, dark:{} }; }
    catch { return { light:{}, dark:{} }; }
  }

  window.initSiteTheme = initialise;
  window.setWarmRightThemePreference = setPreference;
  window.getWarmRightThemePreference = getPreference;
  apply();
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (getPreference() === 'system') apply(); });
}());
