(function () {
  const FROM_ADDRESS = 'no-reply@georgetech.uk';
  const SUPPORT_URL = 'https://georgetech.uk/support';

  const templateTypes = {
    testimonial: {
      label: 'Testimonial',
      prefix: 'testimonial_customer_email',
      defaultSenderName: 'Warm Right Ltd',
      defaultSubject: 'Thank you for your feedback, {customer_name}',
      defaultLogoUrl: 'assets/images/logo.png',
      defaultBodyHtml: '<h1>Thank you for your feedback</h1><p>Hello {customer_name},</p><p>Thank you for sharing your testimonial with Warm Right Ltd.</p><p>If you would like to talk to us, call <strong>0800 756 6748</strong> or email <a href="mailto:info@warmright.uk">info@warmright.uk</a>.</p>',
      placeholders: [
        ['customer_name', 'Customer name'],
        ['customer_email', 'Customer email'],
        ['customer_phone', 'Customer phone'],
        ['job_number', 'Job number'],
        ['customer_address', 'Customer address'],
        ['testimonial_title', 'Testimonial title'],
        ['testimonial_content', 'Testimonial content'],
        ['rating', 'Rating'],
      ],
    },
    feedback: {
      label: 'Feedback',
      prefix: 'feedback_customer_email',
      defaultSenderName: 'Warm Right Ltd',
      defaultSubject: 'Thank you for your feedback, {customer_name}',
      defaultLogoUrl: 'assets/images/logo.png',
      defaultBodyHtml: '<h1>Thank you for your feedback</h1><p>Hello {customer_name},</p><p>Thank you for sharing your experience with Warm Right Ltd. Your response has been received by our team.</p><p>If you would like to talk to us, call <strong>0800 756 6748</strong> or email <a href="mailto:info@warmright.uk">info@warmright.uk</a>.</p>',
      placeholders: [
        ['customer_name', 'Customer name'],
        ['customer_email', 'Customer email'],
        ['customer_phone', 'Customer phone'],
        ['job_number', 'Job number'],
        ['customer_address', 'Customer address'],
        ['engineer_name', 'Engineer name'],
        ['engineer_communication', 'Engineer communication'],
        ['engineer_experience', 'Engineer experience'],
        ['insurer_agent_name', 'Insurer, agent or landlord'],
        ['final_remarks', 'Final remarks'],
      ],
    },
  };

  const sampleValues = {
    customer_name: 'Alex Taylor',
    customer_email: 'alex@example.com',
    customer_phone: '07900 123456',
    job_number: 'WR-1042',
    customer_address: '10 Example Road, Maidstone',
    testimonial_title: 'Excellent service from start to finish',
    testimonial_content: 'The engineer arrived on time, explained the work clearly and left everything tidy.',
    rating: '5/5',
    engineer_name: 'Sam',
    engineer_communication: '5/5',
    engineer_experience: '5/5',
    insurer_agent_name: 'Example Insurance',
    final_remarks: 'Thank you for the quick and professional service.',
  };

  let activeConfig = null;
  let activeDb = null;
  let activeSession = null;
  let activeTarget = null;
  let activePublicBaseUrl = 'https://warmright.uk';

  function ensureModal() {
    if (document.getElementById('customer-email-editor-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'customer-email-editor-modal';
    modal.className = 'customer-email-modal';
    modal.innerHTML = `
      <section class="customer-email-panel" role="dialog" aria-modal="true" aria-labelledby="customer-email-title">
        <header class="customer-email-header">
          <div>
            <h2 id="customer-email-title">Customise Customer Email</h2>
            <p id="customer-email-description"></p>
          </div>
          <button id="customer-email-close" class="customer-email-icon-button" type="button" aria-label="Close email editor">&times;</button>
        </header>

        <div class="customer-email-notice">
          Emails are sent from <strong>${FROM_ADDRESS}</strong>. To change the sending address or report a delivery issue, contact GeorgeTech Support or <a href="${SUPPORT_URL}" target="_blank" rel="noopener">raise a support ticket</a>.
        </div>

        <div class="customer-email-fields">
          <label>Sender name
            <input id="customer-email-sender-name" type="text" maxlength="120" placeholder="Warm Right Ltd">
          </label>
          <label>Sending address
            <input type="email" value="${FROM_ADDRESS}" disabled>
          </label>
          <label class="customer-email-full">Subject
            <input id="customer-email-subject" type="text" maxlength="200" placeholder="Email subject">
          </label>
          <label class="customer-email-full">Header logo
            <span class="customer-email-logo-row">
              <input id="customer-email-logo-url" type="text" maxlength="500" placeholder="assets/images/logo.png">
              <button id="customer-email-choose-logo" class="customer-email-secondary" type="button">Choose Logo</button>
              <button id="customer-email-remove-logo" class="customer-email-secondary" type="button">Remove</button>
            </span>
          </label>
        </div>

        <div class="customer-email-workspace">
          <div class="customer-email-compose">
            <div class="customer-email-toolbar" role="toolbar" aria-label="Email formatting">
              <button type="button" data-email-command="bold" title="Bold"><strong>B</strong></button>
              <button type="button" data-email-command="italic" title="Italic"><em>I</em></button>
              <button type="button" data-email-command="underline" title="Underline"><u>U</u></button>
              <button type="button" data-email-command="insertUnorderedList">List</button>
              <button type="button" data-email-link>Link</button>
            </div>
            <div id="customer-email-body" class="customer-email-body" contenteditable="true" role="textbox" aria-multiline="true"></div>
            <div class="customer-email-placeholders">
              <strong>Insert customer information</strong>
              <p>Click a field below to insert it into the subject or email body.</p>
              <div id="customer-email-placeholder-list"></div>
            </div>
          </div>
          <div class="customer-email-preview-wrap">
            <h3>Preview</h3>
            <div id="customer-email-preview-meta" class="customer-email-preview-meta"></div>
            <iframe id="customer-email-preview" title="Customer email preview"></iframe>
          </div>
        </div>

        <footer class="customer-email-footer">
          <p id="customer-email-status" role="status"></p>
          <div>
            <button id="customer-email-cancel" class="customer-email-secondary" type="button">Cancel</button>
            <button id="customer-email-save" class="customer-email-primary" type="button">Save Email</button>
          </div>
        </footer>
      </section>`;
    document.body.appendChild(modal);

    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    document.getElementById('customer-email-close').addEventListener('click', close);
    document.getElementById('customer-email-cancel').addEventListener('click', close);
    document.getElementById('customer-email-save').addEventListener('click', save);
    document.getElementById('customer-email-choose-logo').addEventListener('click', chooseLogo);
    document.getElementById('customer-email-remove-logo').addEventListener('click', () => {
      document.getElementById('customer-email-logo-url').value = '';
      updatePreview();
    });

    document.querySelectorAll('[data-email-command]').forEach(button => {
      button.addEventListener('mousedown', event => event.preventDefault());
      button.addEventListener('click', () => {
        focusBody();
        document.execCommand(button.dataset.emailCommand, false);
        updatePreview();
      });
    });
    document.querySelector('[data-email-link]').addEventListener('mousedown', event => event.preventDefault());
    document.querySelector('[data-email-link]').addEventListener('click', addLink);

    const subject = document.getElementById('customer-email-subject');
    const body = document.getElementById('customer-email-body');
    subject.addEventListener('focus', () => { activeTarget = subject; });
    body.addEventListener('focus', () => { activeTarget = body; });
    for (const id of ['customer-email-sender-name', 'customer-email-subject', 'customer-email-logo-url']) {
      document.getElementById(id).addEventListener('input', updatePreview);
    }
    body.addEventListener('input', updatePreview);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal.classList.contains('open')) close();
    });
  }

  async function open(options) {
    const config = templateTypes[options?.templateType];
    if (!config) throw new Error('Unknown customer email template type.');
    if (!options.db) throw new Error('Database connection is unavailable.');

    ensureModal();
    activeConfig = config;
    activeDb = options.db;
    activeSession = options.session || null;
    setStatus('Loading email template...');
    document.getElementById('customer-email-title').textContent = `Customise ${config.label} Email`;
    document.getElementById('customer-email-description').textContent = `This is the confirmation email sent to customers after a ${config.label.toLowerCase()} submission.`;
    renderPlaceholders();
    document.getElementById('customer-email-editor-modal').classList.add('open');

    const keys = settingKeys(config);
    const { data, error } = await activeDb.from('site_settings').select('setting_key, setting_value').in('setting_key', [...Object.values(keys), 'public_site_base_url']);
    if (error) {
      setStatus(error.message, true);
      return;
    }
    const settings = Object.fromEntries((data || []).map(row => [row.setting_key, row.setting_value]));
    activePublicBaseUrl = normalisePublicBaseUrl(settings.public_site_base_url);
    document.getElementById('customer-email-sender-name').value = settings[keys.senderName] || config.defaultSenderName;
    document.getElementById('customer-email-subject').value = settings[keys.subject] || config.defaultSubject;
    document.getElementById('customer-email-logo-url').value = settings[keys.logoUrl] ?? config.defaultLogoUrl;
    document.getElementById('customer-email-body').innerHTML = settings[keys.bodyHtml] || config.defaultBodyHtml;
    activeTarget = document.getElementById('customer-email-body');
    setStatus('');
    updatePreview();
    const panel = document.querySelector('.customer-email-panel');
    if (panel) panel.scrollTop = 0;
  }

  function close() {
    document.getElementById('customer-email-editor-modal')?.classList.remove('open');
  }

  async function save() {
    if (!activeDb || !activeConfig) return;
    const senderName = document.getElementById('customer-email-sender-name').value.trim();
    const subject = document.getElementById('customer-email-subject').value.trim();
    const logoUrl = normaliseLogoSetting(document.getElementById('customer-email-logo-url').value);
    const bodyHtml = sanitiseEditorHtml(document.getElementById('customer-email-body').innerHTML);
    if (!senderName) return setStatus('Enter a sender name.', true);
    if (!subject) return setStatus('Enter an email subject.', true);
    if (!bodyHtml) return setStatus('Add some content to the email.', true);

    const keys = settingKeys(activeConfig);
    const updatedAt = new Date().toISOString();
    const rows = [
      { setting_key: keys.senderName, setting_value: senderName, updated_at: updatedAt },
      { setting_key: keys.subject, setting_value: subject, updated_at: updatedAt },
      { setting_key: keys.logoUrl, setting_value: logoUrl, updated_at: updatedAt },
      { setting_key: keys.bodyHtml, setting_value: bodyHtml, updated_at: updatedAt },
    ];
    const button = document.getElementById('customer-email-save');
    button.disabled = true;
    setStatus('Saving email template...');
    const { error } = await activeDb.from('site_settings').upsert(rows);
    button.disabled = false;
    if (error) return setStatus(error.message, true);
    document.getElementById('customer-email-logo-url').value = logoUrl;
    document.getElementById('customer-email-body').innerHTML = bodyHtml;
    setStatus('Customer email template saved.');
    updatePreview();
  }

  function settingKeys(config) {
    return {
      senderName: `${config.prefix}_sender_name`,
      subject: `${config.prefix}_subject`,
      logoUrl: `${config.prefix}_logo_url`,
      bodyHtml: `${config.prefix}_body_html`,
    };
  }

  function renderPlaceholders() {
    const list = document.getElementById('customer-email-placeholder-list');
    list.innerHTML = activeConfig.placeholders.map(([key, label]) =>
      `<button type="button" data-email-placeholder="${escapeAttr(key)}" title="Insert {${escapeAttr(key)}}">${escapeHtml(label)}</button>`
    ).join('');
    list.querySelectorAll('[data-email-placeholder]').forEach(button => {
      button.addEventListener('mousedown', event => event.preventDefault());
      button.addEventListener('click', () => insertPlaceholder(button.dataset.emailPlaceholder));
    });
  }

  function insertPlaceholder(key) {
    const value = `{${key}}`;
    const subject = document.getElementById('customer-email-subject');
    if (activeTarget === subject) {
      const start = subject.selectionStart ?? subject.value.length;
      const end = subject.selectionEnd ?? start;
      subject.setRangeText(value, start, end, 'end');
      subject.focus();
    } else {
      focusBody();
      document.execCommand('insertText', false, value);
    }
    updatePreview();
  }

  function focusBody() {
    const body = document.getElementById('customer-email-body');
    body.focus();
    activeTarget = body;
  }

  function addLink() {
    focusBody();
    const url = window.prompt('Enter the full link address, including https://');
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url) && !/^tel:/i.test(url)) {
      setStatus('Use a full https://, mailto: or tel: link.', true);
      return;
    }
    document.execCommand('createLink', false, url);
    updatePreview();
  }

  async function chooseLogo() {
    if (!window.adminImageLibrary) return setStatus('The image library is unavailable.', true);
    if (!activeSession) {
      const { data } = await activeDb.auth.getSession();
      activeSession = data.session;
    }
    window.adminImageLibrary.open({
      session: activeSession,
      onSelect: path => {
        document.getElementById('customer-email-logo-url').value = path;
        updatePreview();
      },
    });
  }

  function updatePreview() {
    if (!activeConfig) return;
    const logoUrl = normaliseLogoSetting(document.getElementById('customer-email-logo-url').value);
    const senderName = document.getElementById('customer-email-sender-name').value.trim() || 'Warm Right Ltd';
    const subject = replacePlaceholders(document.getElementById('customer-email-subject').value.trim());
    const bodyHtml = replacePlaceholders(sanitiseEditorHtml(document.getElementById('customer-email-body').innerHTML));
    document.getElementById('customer-email-preview-meta').innerHTML = `<span><strong>From:</strong> ${escapeHtml(senderName)} &lt;${FROM_ADDRESS}&gt;</span><span><strong>Subject:</strong> ${escapeHtml(subject)}</span>`;
    const preview = document.getElementById('customer-email-preview');
    preview.srcdoc = emailShell(bodyHtml, resolvePreviewImage(logoUrl));
  }

  function emailShell(bodyHtml, logoUrl) {
    const logo = logoUrl ? `<tr><td style="background:#123b75;padding:22px 28px;"><img src="${escapeAttr(logoUrl)}" alt="Warm Right Ltd" style="display:block;max-width:180px;max-height:80px;width:auto;height:auto;background:#fff;border-radius:7px;padding:7px;"></td></tr>` : '';
    return `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#10233f;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:24px 10px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:12px;overflow:hidden;">${logo}<tr><td style="padding:30px 28px;font-size:16px;line-height:1.65;">${bodyHtml}</td></tr></table></td></tr></table></body></html>`;
  }

  function replacePlaceholders(value) {
    return String(value || '').replace(/\{([a-z0-9_]+)\}/gi, (match, key) => escapeHtml(sampleValues[key] || match));
  }

  function resolvePreviewImage(path) {
    if (!path) return '';
    if (/^(data:|blob:)/i.test(path)) return path;
    if (/^https?:/i.test(path)) {
      try {
        const parsed = new URL(path);
        if (!isLocalHostname(parsed.hostname)) return path;
        return `${activePublicBaseUrl}${parsed.pathname}`;
      } catch { return ''; }
    }
    const cleanPath = path.replace(/^\/+/, '');
    return `${activePublicBaseUrl}/${cleanPath}`;
  }

  function normaliseLogoSetting(value) {
    const path = String(value || '').trim();
    if (!/^https?:/i.test(path)) return path.replace(/^\/+/, '');
    try {
      const parsed = new URL(path);
      return isLocalHostname(parsed.hostname) ? parsed.pathname.replace(/^\/+/, '') : path;
    } catch { return path; }
  }

  function normalisePublicBaseUrl(value) {
    try {
      const parsed = new URL(String(value || ''));
      if (parsed.protocol === 'https:' && !isLocalHostname(parsed.hostname)) {
        return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
      }
    } catch { /* Use the live-site fallback. */ }
    return 'https://warmright.uk';
  }

  function isLocalHostname(hostname) {
    return ['localhost', '127.0.0.1', '::1'].includes(String(hostname || '').toLowerCase());
  }

  function sanitiseEditorHtml(value) {
    const template = document.createElement('template');
    template.innerHTML = value;
    const allowed = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'A', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3']);

    function clean(node) {
      if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent || '');
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      const children = Array.from(node.childNodes).map(clean).join('');
      if (!allowed.has(node.tagName)) return children;
      const tag = node.tagName.toLowerCase();
      if (tag === 'br') return '<br>';
      if (tag === 'a') {
        const href = node.getAttribute('href') || '';
        const safeHref = /^(https?:\/\/|mailto:|tel:)/i.test(href) ? href : '#';
        return `<a href="${escapeAttr(safeHref)}">${children}</a>`;
      }
      return `<${tag}>${children}</${tag}>`;
    }

    return Array.from(template.content.childNodes).map(clean).join('').trim();
  }

  function setStatus(message, isError = false) {
    const status = document.getElementById('customer-email-status');
    status.textContent = message;
    status.classList.toggle('error', isError);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function escapeAttr(value) { return escapeHtml(value); }

  window.customerEmailEditor = { open, close };
}());
