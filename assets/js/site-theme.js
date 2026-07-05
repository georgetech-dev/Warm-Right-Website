(function () {
  const STORAGE_KEY = 'warmright-theme-preference';
  const CACHE_KEY = 'warmright-theme-settings';
  const DEFAULTS = {
    light: { page_background:'#f9f6f2', surface:'#ffffff', text_primary:'#0f1724', text_secondary:'#5c5c5c', primary:'#0a2c66', accent:'#2a6f7b', highlight:'#d97706', nav_background:'#0a2c66', nav_text:'#ffffff', footer_background:'#062940', footer_text:'#ffffff', background_image:'', use_background_image:'false' },
    dark: { page_background:'#181b20', surface:'#242a31', text_primary:'#f5f7fa', text_secondary:'#cbd5e1', primary:'#7db7ff', accent:'#5ac8c8', highlight:'#f59e0b', nav_background:'#101827', nav_text:'#ffffff', footer_background:'#0b111b', footer_text:'#f8fafc', background_image:'', use_background_image:'false' },
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
      '--footer-background': values.footer_background,
      '--footer-text': values.footer_text,
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
