(function () {
  if (window.__warmRightContactOptionsLoaded) return;
  window.__warmRightContactOptionsLoaded = true;

  const OPTIONS_TABLE = 'site_contact_options';
  const SETTINGS_TABLE = 'site_contact_settings';
  const DEFAULT_OPTIONS = [
    option('general', 'General Enquiries', 'For general enquiries and bookings.', '0800 756 6748', 'Call to Book', 'Contact us to arrange your visit.', '0800 756 6748', 'Call Us', 'general', 'tel:08007566748', 'assets/images/phone.jpg', true, true, true, 10),
    option('text', 'Text Us', 'Text anytime. Our usual response is during office hours.', '07985 292527', '', '', '', 'Text Us', 'direct', 'sms:07985292527', 'assets/images/text-message.png', true, false, false, 20),
    option('whatsapp', 'WhatsApp Us', 'Send us a WhatsApp message at any time.', '0800 756 6748', '', '', '', 'WhatsApp Us', 'direct', 'https://wa.me/448007566748', 'assets/images/WhatsApp Logos.svg', true, false, false, 30),
    option('emergency', 'Emergencies (24/7)', 'Call us at any time for urgent assistance.', '0800 756 6748', 'Emergencies (24/7)', 'Call us at any time for urgent assistance.', '0800 756 6748', 'Emergency Call', 'direct', 'tel:08007566748,0', 'assets/images/water-damage.jpg', true, true, false, 40),
    option('email', 'Email Us', 'Send an email and we will reply by the next working day.', 'info@warmright.uk', 'Book via Email', 'Email us at any time to request an appointment.', 'info@warmright.uk', 'Email Us', 'direct', 'mailto:info@warmright.uk', 'assets/images/email-2.png', true, true, false, 50),
    option('callback', 'Request a Callback', 'Leave your details and we will call you back at a convenient time.', '', 'Request a Callback', 'Leave your details and we will call you back at a convenient time.', '', 'Request a Callback', 'callback', '', 'assets/images/contact.jpg', true, true, false, 60),
    option('fax', 'Fax', 'Send documents by fax.', '0870 705 24 32', '', '', '', 'Fax', 'direct', '', 'assets/images/fax.png', true, false, false, 70),
  ];
  const DEFAULT_SETTINGS = {
    closed_title: 'Sorry our office is currently closed',
    closed_body_html: 'You can still request a callback, or contact our emergency line for urgent assistance.',
    emergency_label: 'Emergency Call Out',
    emergency_url: 'tel:08007566748,0',
    callback_label: 'Request a Callback',
    mobile_button_background: '#28a745',
    mobile_button_text: '#ffffff',
    mobile_button_hover: '#218838',
  };

  function option(key, contactTitle, contactBody, contactDisplay, bookingTitle, bookingBody, bookingDisplay, menuLabel, actionType, actionUrl, imageUrl, contact, booking, menu, order) {
    return {
      option_key: key, contact_title: contactTitle, contact_body_html: contactBody,
      contact_display_value: contactDisplay,
      booking_title: bookingTitle, booking_body_html: bookingBody, booking_display_value: bookingDisplay, menu_label: menuLabel,
      action_type: actionType, action_url: actionUrl, image_url: imageUrl,
      image_position_x: 50, image_position_y: 50, image_zoom: 100,
      mobile_image_position_x: 50, mobile_image_position_y: 50, mobile_image_zoom: 100,
      show_on_contact: contact, show_on_booking: booking, show_in_mobile_menu: menu,
      is_active: true, sort_order: order,
    };
  }

  async function loadContactData() {
    if (!window.db) return { options: DEFAULT_OPTIONS, settings: DEFAULT_SETTINGS };
    try {
      const [optionsResult, settingsResult] = await Promise.all([
        window.db.from(OPTIONS_TABLE).select('*').eq('is_active', true).order('sort_order'),
        window.db.from(SETTINGS_TABLE).select('*').eq('settings_key', 'default').maybeSingle(),
      ]);
      if (optionsResult.error) throw optionsResult.error;
      return {
        options: optionsResult.data?.length ? optionsResult.data : DEFAULT_OPTIONS,
        settings: settingsResult.error || !settingsResult.data ? DEFAULT_SETTINGS : settingsResult.data,
      };
    } catch (error) {
      console.warn('Contact options are unavailable; using the built-in options.', error);
      return { options: DEFAULT_OPTIONS, settings: DEFAULT_SETTINGS };
    }
  }

  function renderPageOptions(options) {
    document.querySelectorAll('[data-contact-options-page]').forEach(container => {
      const page = container.dataset.contactOptionsPage;
      const visibilityKey = page === 'booking' ? 'show_on_booking' : 'show_on_contact';
      container.replaceChildren(...options.filter(row => row[visibilityKey]).map(row => createTile(row, page)));
      if (typeof window.observeRevealCards === 'function') window.observeRevealCards(container);
      else container.querySelectorAll('.card').forEach(card => card.classList.add('visible'));
    });
  }

  function createTile(row, page) {
    const actionUrl = safeActionUrl(row.action_url);
    const clickable = row.action_type !== 'direct' || Boolean(actionUrl);
    const tile = document.createElement(clickable ? 'a' : 'article');
    tile.className = `info-tile card contact-option-tile${clickable ? '' : ' contact-option-static'}`;
    if (row.option_key === 'general') tile.id = 'call-to-book';
    tile.dataset.contactBehavior = row.action_type || 'direct';
    tile.dataset.contactOption = row.option_key;
    if (clickable) tile.href = row.action_type === 'callback' ? '#' : actionUrl || '#';
    setCropVariables(tile, row);

    const titleText = page === 'booking' ? row.booking_title || row.contact_title : row.contact_title;
    const bodyHtml = page === 'booking' ? row.booking_body_html || row.contact_body_html : row.contact_body_html;
    const displayValue = page === 'booking'
      ? (row.booking_display_value ?? row.contact_display_value ?? '')
      : (row.contact_display_value ?? '');
    const frame = document.createElement('span');
    frame.className = 'contact-option-image-frame';
    const image = document.createElement('img');
    image.alt = titleText || '';
    setImage(image, row.image_url);
    frame.appendChild(image);
    const title = document.createElement('h3');
    title.textContent = titleText || '';
    const body = document.createElement('p');
    body.innerHTML = sanitizeHtml(bodyHtml);
    tile.append(frame, title, body);
    if (displayValue) {
      const detail = document.createElement('div');
      detail.className = 'contact-option-detail';
      detail.textContent = String(displayValue || '').trim();
      tile.appendChild(detail);
    }
    return tile;
  }

  function setCropVariables(tile, row) {
    tile.style.setProperty('--contact-image-x', `${number(row.image_position_x, 50)}%`);
    tile.style.setProperty('--contact-image-y', `${number(row.image_position_y, 50)}%`);
    tile.style.setProperty('--contact-image-zoom', number(row.image_zoom, 100) / 100);
    tile.style.setProperty('--contact-mobile-image-x', `${number(row.mobile_image_position_x, 50)}%`);
    tile.style.setProperty('--contact-mobile-image-y', `${number(row.mobile_image_position_y, 50)}%`);
    tile.style.setProperty('--contact-mobile-image-zoom', number(row.mobile_image_zoom, 100) / 100);
  }

  function renderMobileActions(options) {
    const container = document.getElementById('mobile-contact-actions');
    if (!container) return;
    if (container.parentElement !== document.body) {
      document.body.appendChild(container);
    }
    const iconPath = path => window.WarmRightImages?.publicUrl(path) || `/${String(path).replace(/^(\.\/|\.\.\/|\/)+/, '')}`;
    const rows = options.filter(row => row.show_in_mobile_menu && (row.action_type !== 'direct' || safeActionUrl(row.action_url)));
    if (!rows.length) {
      container.hidden = true;
      container.replaceChildren();
      return;
    }

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'mobile-contact-fab';
    trigger.setAttribute('aria-label', 'Open quick contact options');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `<img src="${iconPath('assets/images/contact-phone-talking-svgrepo-com.svg')}" alt="" aria-hidden="true">`;

    const tray = document.createElement('div');
    tray.className = 'mobile-contact-tray';
    tray.hidden = true;

    const iconMap = {
      general: 'assets/images/phone-svgrepo-com-1.svg',
      text: 'assets/images/sms-svgrepo-com.svg',
      email: 'assets/images/email-svgrepo-com.svg',
      whatsapp: 'assets/images/whatsapp-svgrepo-com-1.svg'
    };

    const chips = rows.map((row, index) => {
      const link = document.createElement('a');
      link.className = 'mobile-contact-chip';
      link.dataset.contactBehavior = row.action_type || 'direct';
      link.dataset.contactOption = row.option_key;
      link.href = row.action_type === 'callback' ? '#' : safeActionUrl(row.action_url) || '#';
      link.setAttribute('aria-label', row.menu_label || row.contact_title || row.option_key);
      link.title = row.menu_label || row.contact_title || row.option_key;
      link.style.setProperty('--mobile-contact-button-background', safeColour(row.mobile_button_background, getComputedStyle(document.documentElement).getPropertyValue('--mobile-contact-button-background') || DEFAULT_SETTINGS.mobile_button_background));
      link.style.setProperty('--mobile-contact-button-text', safeColour(row.mobile_button_text, getComputedStyle(document.documentElement).getPropertyValue('--mobile-contact-button-text') || DEFAULT_SETTINGS.mobile_button_text));
      link.style.setProperty('--mobile-contact-button-hover', safeColour(row.mobile_button_hover, getComputedStyle(document.documentElement).getPropertyValue('--mobile-contact-button-hover') || DEFAULT_SETTINGS.mobile_button_hover));
      const spread = rows.length > 1 ? 140 / Math.max(rows.length - 1, 1) : 0;
      const angle = (-160 + (spread * index)) * (Math.PI / 180);
      const radius = 86;
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;
      link.style.setProperty('--chip-x', `${offsetX.toFixed(1)}px`);
      link.style.setProperty('--chip-y', `${offsetY.toFixed(1)}px`);
      link.style.setProperty('--chip-delay', `${index * 45}ms`);
      const icon = document.createElement('img');
      icon.src = iconPath(iconMap[row.option_key] || 'assets/images/phone-svgrepo-com-1.svg');
      icon.alt = '';
      icon.setAttribute('aria-hidden', 'true');
      link.appendChild(icon);
      return link;
    });

    tray.replaceChildren(...chips);

    let closeTimer = 0;

    function startOpen() {
      window.clearTimeout(closeTimer);
      tray.hidden = false;
      container.classList.remove('closing');
      chips.forEach((chip, index) => {
        chip.style.transitionDelay = `${index * 70}ms`;
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          container.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
        });
      });
    }

    function startClose() {
      window.clearTimeout(closeTimer);
      chips.forEach(chip => {
        chip.style.transitionDelay = '0ms';
      });
      container.classList.remove('open');
      container.classList.add('closing');
      trigger.setAttribute('aria-expanded', 'false');
      closeTimer = window.setTimeout(() => {
        tray.hidden = true;
        container.classList.remove('closing');
      }, 380);
    }

    const closeTray = event => {
      if (event && container.contains(event.target)) return;
      startClose();
      document.removeEventListener('click', closeTray);
      document.removeEventListener('touchstart', closeTray);
    };

    trigger.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const opening = tray.hidden || !container.classList.contains('open');
      document.removeEventListener('click', closeTray);
      document.removeEventListener('touchstart', closeTray);
      if (opening) {
        startOpen();
        window.setTimeout(() => {
          document.addEventListener('click', closeTray);
          document.addEventListener('touchstart', closeTray, { passive: true });
        }, 0);
      } else {
        startClose();
      }
    });

    tray.addEventListener('click', event => {
      event.stopPropagation();
      startClose();
      document.removeEventListener('click', closeTray);
      document.removeEventListener('touchstart', closeTray);
    });

    container.hidden = false;
    container.replaceChildren(trigger, tray);
    setupFooterAwareVisibility(container, closeTray);
  }

  function setupFooterAwareVisibility(container, closeTray) {
    if (container.dataset.footerObserverReady === 'true') return;
    const footer = document.querySelector('footer, #footer');
    if (!footer || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      const footerVisible = entries.some(entry => entry.isIntersecting);
      container.classList.toggle('is-footer-hidden', footerVisible);
      document.body.classList.toggle('near-footer', footerVisible);
      if (footerVisible) closeTray();
    }, { threshold: 0.12 });
    observer.observe(footer);
    container.dataset.footerObserverReady = 'true';
  }

  function applyClosedSettings(settings) {
    const modal = document.getElementById('modal-initial-actions');
    if (!modal) return;
    const title = modal.querySelector('.modal-title-single');
    const body = modal.querySelector('.modal-left-text');
    const callback = document.getElementById('btn-request-callback');
    const emergency = modal.querySelector('.call-modal-actions a.danger');
    if (title) title.textContent = settings.closed_title || DEFAULT_SETTINGS.closed_title;
    if (body) {
      const configuredBody = sanitizeHtml(settings.closed_body_html || DEFAULT_SETTINGS.closed_body_html);
      body.dataset.closedBody = configuredBody;
      body.innerHTML = configuredBody;
    }
    if (callback) callback.textContent = settings.callback_label || DEFAULT_SETTINGS.callback_label;
    if (emergency) {
      emergency.textContent = settings.emergency_label || DEFAULT_SETTINGS.emergency_label;
      emergency.href = safeActionUrl(settings.emergency_url) || DEFAULT_SETTINGS.emergency_url;
    }
    document.documentElement.style.setProperty('--mobile-contact-button-background', safeColour(settings.mobile_button_background, DEFAULT_SETTINGS.mobile_button_background));
    document.documentElement.style.setProperty('--mobile-contact-button-text', safeColour(settings.mobile_button_text, DEFAULT_SETTINGS.mobile_button_text));
    document.documentElement.style.setProperty('--mobile-contact-button-hover', safeColour(settings.mobile_button_hover, DEFAULT_SETTINGS.mobile_button_hover));
  }

  function safeColour(value, fallback) {
    const colour = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(colour) ? colour : fallback;
  }

  function safeActionUrl(value) {
    const url = String(value || '').trim();
    if (!url || /^javascript:/i.test(url)) return '';
    if (/^(tel:|sms:|mailto:|https?:\/\/|\/|#)/i.test(url)) return url;
    return window.WarmRightImages?.publicUrl(url) || `/${url.replace(/^(\.\.\/|\.\/)+/, '')}`;
  }

  function setImage(image, path) {
    const fallback = 'assets/images/no-image.jpg';
    if (window.WarmRightImages?.withImageFallback) window.WarmRightImages.withImageFallback(image, path, fallback);
    else image.src = path || fallback;
  }

  function sanitizeHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    const allowed = new Set(['B', 'STRONG', 'EM', 'I', 'U', 'BR', 'A']);
    [...template.content.querySelectorAll('*')].forEach(element => {
      if (!allowed.has(element.tagName)) {
        element.replaceWith(...element.childNodes);
        return;
      }
      [...element.attributes].forEach(attribute => {
        if (element.tagName !== 'A' || attribute.name !== 'href') element.removeAttribute(attribute.name);
      });
      if (element.tagName === 'A') {
        const href = safeActionUrl(element.getAttribute('href'));
        if (href) element.setAttribute('href', href);
        else element.removeAttribute('href');
      }
    });
    return template.innerHTML;
  }

  function number(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  async function initialise() {
    const data = await loadContactData();
    applyClosedSettings(data.settings);
    renderPageOptions(data.options);
    renderMobileActions(data.options);
    document.dispatchEvent(new CustomEvent('contactOptionsLoaded'));
  }

  document.addEventListener('includesLoaded', initialise, { once: true });
})();
