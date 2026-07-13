/* ==========================================
   NAV.JS - DYNAMIC HOURS & UI ENGINE
   ========================================== */

window.getOpeningStatus = async function() {
  const database = window.db; 
  if (!database) return { isOpen: false, reason: "Offline", nextOpen: null };

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const currentTime = now.getHours().toString().padStart(2, '0') + ":" + 
                      now.getMinutes().toString().padStart(2, '0') + ":" + 
                      now.getSeconds().toString().padStart(2, '0');

  async function checkDate(dateObj) {
    const dStr = dateObj.toISOString().split('T')[0];
    const dIdx = dateObj.getDay();
    try {
      const { data: override } = await database.from('special_dates').select('*').eq('date', dStr).maybeSingle();
      if (override) return { ...override, date: new Date(dateObj) };
      const { data: routine } = await database.from('business_hours').select('*').eq('day_index', dIdx).maybeSingle();
      if (routine) return { ...routine, date: new Date(dateObj), reason: "Standard" };
    } catch (e) { return null; }
    return null;
  }

  const today = await checkDate(now);
  if (today && !today.is_closed) {
    if (currentTime >= today.open_time && currentTime < today.close_time) {
      return { isOpen: true, reason: today.reason };
    }
    if (currentTime < today.open_time) {
      return { isOpen: false, reason: today.reason, nextOpen: today };
    }
  }

  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + i);
    const nextInfo = await checkDate(nextDate);
    if (nextInfo && !nextInfo.is_closed) {
      return { isOpen: false, reason: "Closed", nextOpen: nextInfo };
    }
  }
  return { isOpen: false, reason: "Closed", nextOpen: null };
};

window.initWarmRight = async function() {
  const status = await window.getOpeningStatus();

  function formatNextOpen(nextOpen) {
    if (!nextOpen) return "for general enquiries";
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const isToday = now.toDateString() === nextOpen.date.toDateString();
    const timeStr = nextOpen.open_time.substring(0, 5);
    
    const getOrdinal = (d) => {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
            case 1:  return "st";
            case 2:  return "nd";
            case 3:  return "rd";
            default: return "th";
        }
    };
    const dayNum = nextOpen.date.getDate();
    const suffix = getOrdinal(dayNum);

    if (isToday) {
        const [h, m] = nextOpen.open_time.split(':');
        const openDate = new Date(now);
        openDate.setHours(h, m, 0);
        const diff = (openDate - now) / 1000 / 60;
        // Refined for better sentence flow: "at 08:00 (Opening Soon!)"
        if (diff > 0 && diff <= 30) return timeStr + " (Opening Soon!)";
        return "today at " + timeStr;
    }
    return `${days[nextOpen.date.getDay()]} ${dayNum}${suffix} ${months[nextOpen.date.getMonth()]} at ${timeStr}`;
  }

  const nextOpenStr = formatNextOpen(status.nextOpen);

  const callModal = document.getElementById("call-modal");
  const emergencyModal = document.getElementById("emergency-modal");
  const modalForm = document.getElementById("modal-callback-form");
  const modalInitial = document.getElementById("modal-initial-actions");
  const modalThankYou = document.getElementById("modal-thank-you");
  const btnBack = document.getElementById("btn-modal-back");

  function openModal(directForm = false) {
    if (!callModal) return;
    callModal.style.display = "flex";
    window.WarmRightScrollLock?.lock('call-modal') || document.body.classList.add('modal-open');
    const callbackStatus = document.getElementById('callback-form-status');
    if (callbackStatus) { callbackStatus.textContent = ''; callbackStatus.classList.remove('error'); }

    // SURGICAL TEXT UPDATE
    if (!status.isOpen && modalInitial) {
        const modalP = modalInitial.querySelector('.modal-left-text');
        const formIntro = modalForm?.querySelector('p');
        
        // Phrasing optimized for both "Soon" and future dates
        const reopenMsg = `we re-open, which is <b>${nextOpenStr}</b>`;

        if (modalP) {
            const configuredBody = modalP.dataset.closedBody || modalP.innerHTML;
            modalP.innerHTML = `${configuredBody}<br><span class="closed-hours-reopen">For general enquiries, ${reopenMsg}.</span>`;
        }
        if (formIntro) {
            formIntro.innerHTML = `Please provide your details below. Since our office is currently closed, an engineer will be in touch as soon as ${reopenMsg}.`;
        }
    }

    if (directForm) {
      if (modalInitial) modalInitial.style.display = "none";
      if (modalForm) modalForm.style.display = "block";
      if (btnBack) btnBack.style.display = "none";
    } else {
      if (modalInitial) modalInitial.style.display = "block";
      if (modalForm) modalForm.style.display = "none";
      if (btnBack) btnBack.style.display = "block";
    }
    if (modalThankYou) modalThankYou.style.display = "none";
  }

  const btnRequestInside = document.getElementById("btn-request-callback");
  if (btnRequestInside) {
    btnRequestInside.onclick = (e) => {
      e.preventDefault();
      openModal(true);
    };
  }

  function closeModal() {
    if (callModal) {
      callModal.style.display = "none";
      window.WarmRightScrollLock?.unlock('call-modal') || document.body.classList.remove('modal-open');
    }
  }

  function openEmergencyModal() {
    if (!emergencyModal) return;
    emergencyModal.style.display = "flex";
    window.WarmRightScrollLock?.lock('emergency-modal') || document.body.classList.add('modal-open');
  }

  function closeEmergencyModal() {
    if (!emergencyModal) return;
    emergencyModal.style.display = "none";
    window.WarmRightScrollLock?.unlock('emergency-modal');
    if (!window.WarmRightScrollLock && (!callModal || callModal.style.display !== "flex")) {
      document.body.classList.remove('modal-open');
    }
  }

  window.warmRightContactState = { status, openModal, openEmergencyModal };
  if (!window.__warmRightContactDelegation) {
    window.__warmRightContactDelegation = true;
    document.addEventListener('click', event => {
      const emergencyTrigger = event.target.closest('[data-emergency-trigger]');
      if (emergencyTrigger) {
        event.preventDefault();
        closeModal();
        openEmergencyModal();
        return;
      }

      const trigger = event.target.closest('[data-contact-behavior], .footer-call-btn, .request-callback-tile, .callback-direct');
      if (!trigger) return;
      const behavior = trigger.dataset.contactBehavior
        || (trigger.classList.contains('request-callback-tile') || trigger.classList.contains('callback-direct') ? 'callback' : 'general');
      const contactState = window.warmRightContactState;
      if (!contactState) return;
      if (behavior === 'callback') {
        event.preventDefault();
        contactState.openModal(true);
      } else if (behavior === 'general' && !contactState.status.isOpen) {
        event.preventDefault();
        contactState.openModal(false);
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (e.target.id === "call-modal" || 
        e.target.classList.contains('call-modal-close') || 
        e.target.classList.contains('modal-close-trigger') ||
        e.target.closest('.call-modal-close')) {
      closeModal();
    }
    if (e.target.id === "emergency-modal" ||
        e.target.matches('[data-emergency-close]') ||
        e.target.closest('[data-emergency-close]')) {
      closeEmergencyModal();
    }
  });

function applyHighlights() {
    const isGitHub = window.location.hostname.includes("github.io");
    const normalisePath = (path) => {
        let parts = String(path || '').toLowerCase().split('/').filter(Boolean);
        if (isGitHub && parts.length > 1) parts = parts.slice(1);
        let normalised = '/' + parts.join('/');
        if (normalised === '/' || normalised === '/index.html') return '/index.html';
        return normalised.replace(/\/index\.html$/, '/').replace(/\/$/, '');
    };
    const currentPath = normalisePath(window.location.pathname);
    const currentFolder = currentPath.split('/').filter(Boolean)[0] || '';

    document.querySelectorAll('#header a, #header .mobile-dropdown-button').forEach(el => {
        el.classList.remove('active');

        const href = el.getAttribute('href');
        if (el.tagName === 'A' && href && href !== '#' && normalisePath(el.pathname) === currentPath) {
            el.classList.add('active');
        }

        if (currentFolder === 'services' || currentFolder === 'support') {
            if (el.dataset.section === currentFolder) {
                el.classList.add('active');
            }
        }
    });

    document.querySelectorAll('#header .mobile-dropdown-button.active').forEach(btn => {
        const menu = btn.nextElementSibling;
        if (menu && menu.classList.contains('mobile-dropdown-menu')) {
            menu.classList.add('open');
        }
    });
}

// Trigger it immediately when initWarmRight runs
applyHighlights();








  // Hamburger / Nav logic unchanged
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav  = document.querySelector('.mobile-nav');
  const overlay    = document.querySelector('.nav-overlay');
  const wrapper    = document.querySelector('.hamburger-wrapper');
  if (menuToggle && mobileNav) {
    menuToggle.onclick = (e) => {
      e.stopPropagation();
      const isOpen = mobileNav.classList.toggle('open');
      menuToggle.classList.toggle('open', isOpen);
      document.body.classList.toggle('nav-open', isOpen);
      if (overlay) overlay.classList.toggle('open', isOpen);
      if (wrapper) { wrapper.classList.remove('spin'); void wrapper.offsetWidth; wrapper.classList.add('spin'); }
    };
  }
  document.querySelectorAll('.mobile-dropdown-button').forEach(btn => {
  btn.onclick = () => {
    const menu = btn.nextElementSibling;
    const isAlreadyOpen = menu.classList.contains('open');

    // 1. Close ALL other mobile menus first
    document.querySelectorAll('.mobile-dropdown-menu').forEach(m => {
      m.classList.remove('open');
    });

    // 2. Only open this one if it wasn't already open 
    // (This allows the user to click to close it as well)
    if (!isAlreadyOpen && menu && menu.classList.contains('mobile-dropdown-menu')) {
      menu.classList.add('open');
    }
  };
});

  const callbackForm = document.getElementById("footer-callback-form");
  if (callbackForm) {
    callbackForm.onsubmit = async (e) => {
      e.preventDefault();
      const submitButton = document.getElementById('callback-submit-button');
      const formStatus = document.getElementById('callback-form-status');
      const formData = new FormData(callbackForm);
      const payload = {
        customer_name: formData.get('name'),
        customer_phone: formData.get('phone'),
        customer_email: formData.get('email'),
        preferred_time: formData.get('time'),
        description: formData.get('description'),
        source_page: window.location.pathname,
      };
      if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Sending request...'; }
      if (formStatus) { formStatus.textContent = 'Sending your callback request...'; formStatus.classList.remove('error'); }
      try {
        const { error } = await window.db.functions.invoke('callback-submission', { body: payload });
        if (error) throw new Error(await getCallbackFunctionError(error));
        callbackForm.reset();
        if (modalForm) modalForm.style.display = "none";
        if (modalThankYou) modalThankYou.style.display = "block";
      } catch (err) {
        if (formStatus) { formStatus.textContent = err.message || 'We could not send your request. Please call 0800 756 6748.'; formStatus.classList.add('error'); }
      } finally {
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Submit Request'; }
      }
    };
  }
};

async function getCallbackFunctionError(error) {
  const fallback = error?.message || 'We could not send your request. Please call 0800 756 6748.';
  const response = error?.context;
  if (!response || typeof response.text !== 'function') return fallback;
  try {
    const body = await response.text();
    if (!body) return fallback;
    try { const detail = JSON.parse(body); return detail.error || detail.message || fallback; }
    catch { return body.slice(0, 300); }
  } catch { return fallback; }
}

document.addEventListener("includesLoaded", () => {
  const checkDb = setInterval(() => {
    if (window.db) { window.initWarmRight(); clearInterval(checkDb); }
  }, 50);
});
