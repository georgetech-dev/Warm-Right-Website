(function initAdminPwa() {
  if (!window.location.pathname.includes('/admin/')) return;

  const state = {
    deferredPrompt: null,
  };

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function updateUi(mode) {
    const banner = document.getElementById('admin-app-banner');
    const button = document.getElementById('admin-install-trigger');
    const card = document.getElementById('admin-install-card');
    const status = document.getElementById('admin-install-status');
    const supported = Boolean(state.deferredPrompt);
    const installed = isStandalone();

    if (installed) {
      if (banner) banner.hidden = false;
      if (button) {
        button.textContent = 'Admin App Installed';
        button.disabled = true;
      }
      if (card) card.hidden = true;
      if (status) status.textContent = 'The admin area is already running as an installed app.';
      return;
    }

    if (supported) {
      if (banner) banner.hidden = false;
      if (button) {
        button.hidden = false;
        button.disabled = false;
        button.textContent = 'Install Admin App';
      }
      if (card) card.hidden = false;
      if (status) status.textContent = mode === 'ready' ? 'Ready to install in Chrome.' : 'Install the admin area for a cleaner desktop experience.';
      return;
    }

    if (banner) banner.hidden = false;
    if (button) {
      button.disabled = true;
      button.textContent = 'Install via Chrome';
    }
    if (card) card.hidden = false;
    if (status) status.textContent = 'If Chrome does not show the install prompt automatically, use the browser menu and choose Install app.';
  }

  async function triggerInstall() {
    if (!state.deferredPrompt) {
      updateUi('fallback');
      return;
    }

    const promptEvent = state.deferredPrompt;
    state.deferredPrompt = null;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => null);
    updateUi('fallback');
  }

  function bindInstallTriggers() {
    const button = document.getElementById('admin-install-trigger');
    const card = document.getElementById('admin-install-card');
    if (button && !button.dataset.boundInstall) {
      button.dataset.boundInstall = 'true';
      button.addEventListener('click', triggerInstall);
    }
    if (card && !card.dataset.boundInstall) {
      card.dataset.boundInstall = 'true';
      card.addEventListener('click', triggerInstall);
    }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol === 'file:') return;
    navigator.serviceWorker.register(window.getAdminUrl('admin-sw.js')).catch(error => {
      console.warn('Admin app service worker registration failed.', error);
    });
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    state.deferredPrompt = event;
    bindInstallTriggers();
    updateUi('ready');
  });

  window.addEventListener('appinstalled', () => {
    state.deferredPrompt = null;
    updateUi('installed');
  });

  registerServiceWorker();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bindInstallTriggers();
      updateUi('fallback');
    }, { once: true });
  } else {
    bindInstallTriggers();
    updateUi('fallback');
  }
})();
