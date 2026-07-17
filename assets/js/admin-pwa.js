(function initAdminPwa() {
  if (!window.location.pathname.includes('/admin/')) return;

  const state = {
    deferredPrompt: null,
  };

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function updateUi(mode) {
    const button = document.getElementById('nav-install-app-link');
    const divider = document.getElementById('nav-install-divider');
    const supported = Boolean(state.deferredPrompt);
    const installed = isStandalone();

    if (installed) {
      if (button) {
        button.hidden = false;
        button.disabled = true;
        button.querySelector('span')?.replaceChildren(document.createTextNode('Admin App Installed'));
      }
      if (divider) divider.hidden = false;
      return;
    }

    if (supported) {
      if (button) {
        button.hidden = false;
        button.disabled = false;
        button.querySelector('span')?.replaceChildren(document.createTextNode('Install Admin App'));
      }
      if (divider) divider.hidden = false;
      return;
    }

    if (button) {
      button.hidden = false;
      button.disabled = false;
      button.querySelector('span')?.replaceChildren(document.createTextNode('Install Admin App'));
    }
    if (divider) divider.hidden = false;
  }

  async function triggerInstall() {
    if (!state.deferredPrompt) {
      window.alert('Use Chrome menu > Install app to add the admin area to your desktop.');
      return;
    }

    const promptEvent = state.deferredPrompt;
    state.deferredPrompt = null;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => null);
    updateUi('fallback');
  }

  function bindInstallTriggers() {
    const button = document.getElementById('nav-install-app-link');
    if (button && !button.dataset.boundInstall) {
      button.dataset.boundInstall = 'true';
      button.addEventListener('click', triggerInstall);
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

  document.addEventListener('admin-header-ready', () => {
    bindInstallTriggers();
    updateUi(state.deferredPrompt ? 'ready' : 'fallback');
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
