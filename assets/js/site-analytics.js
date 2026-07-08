(function () {
  if (window.__warmRightAnalyticsLoaded) return;
  window.__warmRightAnalyticsLoaded = true;

  const functionUrl = 'https://axampuprcnauxbbijmmt.supabase.co/functions/v1/site-analytics?action=collect';
  const publicKey = 'sb_publishable_NFuFkO0tybTuMvYOQekQmA_62araOjM';
  const optOutKey = 'warmright_analytics_opt_out';
  let pageViewSent = false;

  function hasDoNotTrack() {
    return navigator.doNotTrack === '1' || window.doNotTrack === '1';
  }

  function hasOptedOut() {
    try {
      return localStorage.getItem(optOutKey) === 'true';
    } catch {
      return false;
    }
  }

  function analyticsEnabled() {
    return !hasDoNotTrack() && !hasOptedOut();
  }

  function setAnalyticsEnabled(enabled) {
    try {
      if (enabled) localStorage.removeItem(optOutKey);
      else localStorage.setItem(optOutKey, 'true');
    } catch {
      // Analytics remains best-effort when browser storage is unavailable.
    }
    syncPreferenceControl();
    if (enabled && analyticsEnabled()) sendPageView();
  }

  function deviceType() {
    const userAgent = navigator.userAgent || '';
    const width = window.visualViewport?.width || window.innerWidth || screen.width || 0;
    const reportsMobile = navigator.userAgentData?.mobile === true;
    if (reportsMobile || /mobile|iphone|ipod/i.test(userAgent) || width < 600) return 'mobile';
    if (/tablet|ipad/i.test(userAgent) || (navigator.maxTouchPoints > 1 && width < 1100)) return 'tablet';
    return 'desktop';
  }

  function externalReferrerHost() {
    if (!document.referrer) return '';
    try {
      const host = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, '');
      const currentHost = window.location.hostname.toLowerCase().replace(/^www\./, '');
      return host === currentHost ? '' : host;
    } catch {
      return '';
    }
  }

  function payload(eventName) {
    return {
      event_name: eventName,
      page_path: window.location.pathname || '/',
      page_title: document.title || '',
      referrer_host: externalReferrerHost(),
      device_type: deviceType(),
    };
  }

  function send(eventName) {
    if (!analyticsEnabled()) return;
    fetch(functionUrl, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: publicKey,
        Authorization: `Bearer ${publicKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload(eventName)),
    }).then(response => {
      if (!response.ok && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)) {
        console.warn(`Warm Right analytics returned ${response.status}.`);
      }
    }).catch(error => {
      if (/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)) {
        console.warn('Warm Right analytics could not send this event.', error);
      }
    });
  }

  function sendPageView() {
    if (pageViewSent || !analyticsEnabled()) return;
    pageViewSent = true;
    send('page_view');
  }

  function eventForLink(link) {
    const href = (link.getAttribute('href') || '').toLowerCase();
    if (href.includes('book-a-visit')) return 'book_visit_click';
    if (href.startsWith('tel:') || href.startsWith('mailto:') || href.includes('contact')) return 'contact_click';
    if (href.includes('testimonial-submit')) return 'testimonial_click';
    if (href.includes('offers')) return 'offer_click';
    return '';
  }

  function syncPreferenceControl() {
    const checkbox = document.getElementById('analytics-preference');
    const note = document.getElementById('analytics-preference-note');
    if (!checkbox) return;
    checkbox.checked = analyticsEnabled();
    checkbox.disabled = hasDoNotTrack();
    if (note && hasDoNotTrack()) note.textContent = 'Your browser Do Not Track setting has disabled analytics.';
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const eventName = eventForLink(link);
    if (eventName) send(eventName);
  }, { capture: true });

  document.addEventListener('change', event => {
    if (event.target.id !== 'analytics-preference') return;
    setAnalyticsEnabled(event.target.checked);
  });

  document.addEventListener('includesLoaded', syncPreferenceControl);
  window.setWarmRightAnalyticsEnabled = setAnalyticsEnabled;
  window.getWarmRightAnalyticsEnabled = analyticsEnabled;

  sendPageView();
})();
