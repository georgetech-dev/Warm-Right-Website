(function () {
  const SUPABASE_URL = 'https://axampuprcnauxbbijmmt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_NFuFkO0tybTuMvYOQekQmA_62araOjM';
  let db;
  let session;
  let options = [];
  let editingId = null;
  let draggedId = null;
  const pageParams = new URLSearchParams(window.location.search);

  async function initialise() {
    const lib = window.supabase || window.Supabase;
    if (!lib) return setTimeout(initialise, 50);
    db = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.db = db;
    session = await window.requireAdminSession();
    if (!session) return;
    window.currentSession = session;
    await window.loadAdminHeader(session);
    document.body.style.visibility = 'visible';
    await Promise.all([loadOptions(), loadSettings()]);
    applyInitialState();
    updatePreview();
  }

  async function loadOptions() {
    const { data, error } = await db.from('site_contact_options').select('*').order('sort_order');
    if (error) return setStatus('contact-options-status', error.message, true);
    options = data || [];
    renderOptions();
  }

  function renderOptions() {
    const body = document.getElementById('contact-options-body');
    const scope = pageParams.get('page');
    const filteredOptions = options.filter(row => {
      if (scope === 'contact') return row.show_on_contact;
      if (scope === 'booking') return row.show_on_booking;
      return true;
    });
    if (!filteredOptions.length) {
      body.innerHTML = '<tr><td colspan="7">No contact options are configured. Run the supplied SQL or add one here.</td></tr>';
      return;
    }
    body.innerHTML = filteredOptions.map(row => `
      <tr draggable="true" data-option-id="${row.id}">
        <td class="drag-handle" title="Drag to reorder">&#9776;</td>
        <td><img src="${escapeAttr(imageSrc(row.image_url))}" alt=""></td>
        <td><strong>${escapeHtml(row.contact_title)}</strong><br><small>${escapeHtml(row.menu_label || row.option_key)}</small></td>
        <td>${escapeHtml(actionLabel(row.action_type))}<br><small>${escapeHtml(row.action_url || '')}</small></td>
        <td>${placementLabels(row).map(escapeHtml).join('<br>') || 'Nowhere'}</td>
        <td>${row.is_active ? '<span class="contact-status active">Active</span>' : '<span class="contact-status">Inactive</span>'}</td>
        <td><button class="site-btn secondary" type="button" data-edit-option="${row.id}">Edit</button></td>
      </tr>
    `).join('');
    bindDragRows();
  }

  function applyInitialState() {
    const requestedOptionId = pageParams.get('optionId') || pageParams.get('id');
    if (pageParams.get('new') === '1') {
      openEditor();
      if (pageParams.get('page') === 'booking') setChecked('show-on-booking', true);
      if (pageParams.get('page') === 'contact') setChecked('show-on-contact', true);
      return;
    }
    if (requestedOptionId) {
      openEditor(requestedOptionId);
    }
  }

  async function loadSettings() {
    const { data, error } = await db.from('site_contact_settings').select('*').eq('settings_key', 'default').maybeSingle();
    if (error) return setStatus('closed-settings-status', error.message, true);
    const settings = data || {};
    document.getElementById('closed-title').value = settings.closed_title || 'Sorry our office is currently closed';
    document.getElementById('closed-body-editor').innerHTML = settings.closed_body_html || 'You can still request a callback or contact our emergency line.';
    document.getElementById('closed-emergency-label').value = settings.emergency_label || 'Emergency';
    document.getElementById('closed-emergency-url').value = settings.emergency_url || 'tel:08007566748,0';
    document.getElementById('closed-callback-label').value = settings.callback_label || 'Request a Callback';
    document.getElementById('mobile-button-background').value = validColour(settings.mobile_button_background, '#28a745');
    document.getElementById('mobile-button-text').value = validColour(settings.mobile_button_text, '#ffffff');
    document.getElementById('mobile-button-hover').value = validColour(settings.mobile_button_hover, '#218838');
    updateMobileButtonPreview();
  }

  async function saveSettings() {
    const payload = {
      settings_key: 'default',
      closed_title: value('closed-title'),
      closed_body_html: cleanEditorHtml('closed-body-editor'),
      emergency_label: value('closed-emergency-label'),
      emergency_url: value('closed-emergency-url'),
      callback_label: value('closed-callback-label'),
      updated_at: new Date().toISOString(),
    };
    if (!payload.closed_title || !payload.emergency_label || !payload.callback_label) return setStatus('closed-settings-status', 'Complete the title and both button labels.', true);
    const { error } = await db.from('site_contact_settings').upsert(payload, { onConflict: 'settings_key' });
    setStatus('closed-settings-status', error ? error.message : 'Closed-hours panel saved.', Boolean(error));
  }

  async function saveMobileButtonSettings() {
    const payload = {
      settings_key: 'default',
      mobile_button_background: validColour(value('mobile-button-background'), '#28a745'),
      mobile_button_text: validColour(value('mobile-button-text'), '#ffffff'),
      mobile_button_hover: validColour(value('mobile-button-hover'), '#218838'),
      updated_at: new Date().toISOString(),
    };
    const { error } = await db.from('site_contact_settings').upsert(payload, { onConflict: 'settings_key' });
    setStatus('mobile-button-settings-status', error ? error.message : 'Mobile button colours saved.', Boolean(error));
  }

  function openEditor(id = null) {
    editingId = id;
    const row = options.find(item => item.id === id);
    document.getElementById('contact-options-list').classList.add('hidden');
    document.getElementById('closed-hours-settings').classList.add('hidden');
    document.getElementById('mobile-button-settings').classList.add('hidden');
    document.getElementById('contact-option-editor').classList.remove('hidden');
    document.getElementById('contact-option-editor-title').textContent = row ? `Editing: ${row.contact_title}` : 'Add Contact Option';
    document.getElementById('contact-option-key').disabled = Boolean(row);
    document.getElementById('delete-contact-option').classList.toggle('hidden', !row);
    setEditorValues(row || {});
    setStatus('contact-option-form-status', '');
    updatePreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeEditor() {
    editingId = null;
    document.getElementById('contact-option-editor').classList.add('hidden');
    document.getElementById('contact-options-list').classList.remove('hidden');
    document.getElementById('closed-hours-settings').classList.remove('hidden');
    document.getElementById('mobile-button-settings').classList.remove('hidden');
  }

  function setEditorValues(row) {
    setValue('contact-option-key', row.option_key || '');
    setValue('contact-action-type', row.action_type || 'direct');
    setValue('contact-action-url', row.action_url || '');
    setValue('contact-image-url', row.image_url || '');
    setValue('contact-title', row.contact_title || '');
    setValue('booking-title', row.booking_title || '');
    setValue('contact-display-value', row.contact_display_value || '');
    setValue('booking-display-value', row.booking_display_value || '');
    setValue('contact-menu-label', row.menu_label || '');
    setValue('option-mobile-button-background', validColour(row.mobile_button_background, value('mobile-button-background') || '#28a745'));
    setValue('option-mobile-button-text', validColour(row.mobile_button_text, value('mobile-button-text') || '#ffffff'));
    setValue('option-mobile-button-hover', validColour(row.mobile_button_hover, value('mobile-button-hover') || '#218838'));
    document.getElementById('contact-body-editor').innerHTML = row.contact_body_html || '';
    document.getElementById('booking-body-editor').innerHTML = row.booking_body_html || '';
    setChecked('show-on-contact', row.show_on_contact ?? true);
    setChecked('show-on-booking', row.show_on_booking ?? false);
    setChecked('show-in-mobile-menu', row.show_in_mobile_menu ?? false);
    setChecked('contact-option-active', row.is_active ?? true);
    setValue('desktop-image-x', row.image_position_x ?? 50);
    setValue('desktop-image-y', row.image_position_y ?? 50);
    setValue('desktop-image-zoom', row.image_zoom ?? 100);
    setValue('mobile-image-x', row.mobile_image_position_x ?? 50);
    setValue('mobile-image-y', row.mobile_image_position_y ?? 50);
    setValue('mobile-image-zoom', row.mobile_image_zoom ?? 100);
  }

  async function saveOption() {
    const key = slug(value('contact-option-key'));
    const title = value('contact-title');
    if (!key || !title) return setStatus('contact-option-form-status', 'Enter an option key and Contact Us title.', true);
    const existing = options.find(item => item.id === editingId);
    const payload = {
      option_key: key,
      contact_title: title,
      contact_body_html: cleanEditorHtml('contact-body-editor'),
      contact_display_value: value('contact-display-value'),
      booking_title: value('booking-title'),
      booking_body_html: cleanEditorHtml('booking-body-editor'),
      booking_display_value: value('booking-display-value'),
      menu_label: value('contact-menu-label'),
      mobile_button_background: validColour(value('option-mobile-button-background'), '#28a745'),
      mobile_button_text: validColour(value('option-mobile-button-text'), '#ffffff'),
      mobile_button_hover: validColour(value('option-mobile-button-hover'), '#218838'),
      action_type: value('contact-action-type'),
      action_url: value('contact-action-url'),
      image_url: value('contact-image-url'),
      image_position_x: numberValue('desktop-image-x'),
      image_position_y: numberValue('desktop-image-y'),
      image_zoom: numberValue('desktop-image-zoom'),
      mobile_image_position_x: numberValue('mobile-image-x'),
      mobile_image_position_y: numberValue('mobile-image-y'),
      mobile_image_zoom: numberValue('mobile-image-zoom'),
      show_on_contact: checked('show-on-contact'),
      show_on_booking: checked('show-on-booking'),
      show_in_mobile_menu: checked('show-in-mobile-menu'),
      is_active: checked('contact-option-active'),
      sort_order: existing?.sort_order || nextOrder(),
      updated_at: new Date().toISOString(),
    };
    const result = editingId
      ? await db.from('site_contact_options').update(payload).eq('id', editingId)
      : await db.from('site_contact_options').insert(payload);
    if (result.error) return setStatus('contact-option-form-status', result.error.message, true);
    await loadOptions();
    closeEditor();
    setStatus('contact-options-status', 'Contact option saved.');
  }

  async function deleteOption() {
    const row = options.find(item => item.id === editingId);
    if (!row || !confirm(`Delete ${row.contact_title}? This cannot be undone.`)) return;
    const { error } = await db.from('site_contact_options').delete().eq('id', editingId);
    if (error) return setStatus('contact-option-form-status', error.message, true);
    await loadOptions();
    closeEditor();
    setStatus('contact-options-status', 'Contact option deleted.');
  }

  function chooseImage() {
    window.adminImageLibrary.open({
      session,
      onSelect: path => {
        setValue('contact-image-url', path);
        updatePreview();
      },
    });
  }

  function updatePreview() {
    const image = value('contact-image-url');
    const title = value('contact-title') || 'Option title';
    const body = cleanEditorHtml('contact-body-editor') || 'Option wording';
    const detail = value('contact-display-value');
    updateCropLabels();
    updatePreviewCard('contact-desktop-preview', image, title, body, detail, 'desktop');
    updatePreviewCard('contact-mobile-preview', image, title, body, detail, 'mobile');
    updateOptionMobileButtonPreview();
  }

  function updatePreviewCard(id, image, title, body, detail, mode) {
    const card = document.getElementById(id);
    const prefix = mode === 'mobile' ? 'mobile' : 'desktop';
    card.style.setProperty('--preview-x', `${value(`${prefix}-image-x`)}%`);
    card.style.setProperty('--preview-y', `${value(`${prefix}-image-y`)}%`);
    card.style.setProperty('--preview-zoom', numberValue(`${prefix}-image-zoom`) / 100);
    card.querySelector('img').src = imageSrc(image || 'assets/images/no-image.jpg');
    card.querySelector('h4').textContent = title;
    card.querySelector('p').innerHTML = body;
    const detailEl = card.querySelector('.contact-option-preview-detail');
    if (detailEl) {
      detailEl.textContent = detail || '';
      detailEl.classList.toggle('hidden', !detail);
    }
  }

  function updateCropLabels() {
    for (const [input, output] of [['desktop-image-x','desktop-x-value'],['desktop-image-y','desktop-y-value'],['desktop-image-zoom','desktop-zoom-value'],['mobile-image-x','mobile-x-value'],['mobile-image-y','mobile-y-value'],['mobile-image-zoom','mobile-zoom-value']]) {
      document.getElementById(output).textContent = `${value(input)}%`;
    }
  }

  function updateMobileButtonPreview() {
    const preview = document.getElementById('mobile-button-preview');
    preview.style.background = validColour(value('mobile-button-background'), '#28a745');
    preview.style.color = validColour(value('mobile-button-text'), '#ffffff');
    preview.dataset.hoverColour = validColour(value('mobile-button-hover'), '#218838');
  }

  function updateOptionMobileButtonPreview() {
    const preview = document.getElementById('option-mobile-button-preview');
    if (!preview) return;
    preview.style.background = validColour(value('option-mobile-button-background'), '#28a745');
    preview.style.color = validColour(value('option-mobile-button-text'), '#ffffff');
    preview.dataset.hoverColour = validColour(value('option-mobile-button-hover'), '#218838');
    preview.textContent = value('contact-menu-label') || value('contact-title') || 'Mobile menu preview';
  }

  function formatEditor(event) {
    const button = event.target.closest('[data-command]');
    if (!button) return;
    const editor = document.getElementById(button.closest('[data-editor-toolbar]').dataset.editorToolbar);
    editor.focus();
    if (button.dataset.command === 'insertLineBreak') document.execCommand('insertHTML', false, '<br>');
    else document.execCommand(button.dataset.command, false, null);
    updatePreview();
  }

  function bindDragRows() {
    document.querySelectorAll('tr[data-option-id]').forEach(row => {
      row.addEventListener('dragstart', () => { draggedId = row.dataset.optionId; row.classList.add('dragging'); });
      row.addEventListener('dragend', () => { row.classList.remove('dragging'); document.querySelectorAll('.drag-over').forEach(item => item.classList.remove('drag-over')); });
      row.addEventListener('dragover', event => { event.preventDefault(); if (row.dataset.optionId !== draggedId) row.classList.add('drag-over'); });
      row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
      row.addEventListener('drop', event => reorderOptions(event, row.dataset.optionId));
    });
  }

  async function reorderOptions(event, targetId) {
    event.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const ordered = options.slice();
    const from = ordered.findIndex(item => item.id === draggedId);
    const to = ordered.findIndex(item => item.id === targetId);
    ordered.splice(to, 0, ordered.splice(from, 1)[0]);
    const results = await Promise.all(ordered.map((row, index) => db.from('site_contact_options').update({ sort_order: (index + 1) * 10, updated_at: new Date().toISOString() }).eq('id', row.id)));
    const error = results.find(result => result.error)?.error;
    setStatus('contact-options-status', error ? error.message : 'Contact option order saved.', Boolean(error));
    await loadOptions();
  }

  function cleanEditorHtml(id) {
    return document.getElementById(id).innerHTML.trim().replace(/<div><br><\/div>/gi, '<br>').replace(/<div>/gi, '<br>').replace(/<\/div>/gi, '');
  }
  function placementLabels(row) { return [row.show_on_contact && 'Contact Us', row.show_on_booking && 'Book a Visit', row.show_in_mobile_menu && 'Mobile menu'].filter(Boolean); }
  function actionLabel(type) { return ({ direct:'Direct link', general:'General Enquiries', callback:'Callback form' })[type] || type; }
  function nextOrder() { return Math.max(0, ...options.map(item => Number(item.sort_order) || 0)) + 10; }
  function imageSrc(path) { return window.adminImageLibrary?.imageSrcForAdmin(path) || path || '../assets/images/no-image.jpg'; }
  function validColour(valueToCheck, fallback) { return /^#[0-9a-f]{6}$/i.test(String(valueToCheck || '')) ? valueToCheck : fallback; }
  function slug(text) { return String(text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function value(id) { return document.getElementById(id).value.trim(); }
  function setValue(id, valueToSet) { document.getElementById(id).value = valueToSet; }
  function checked(id) { return document.getElementById(id).checked; }
  function setChecked(id, state) { document.getElementById(id).checked = Boolean(state); }
  function numberValue(id) { return Number(document.getElementById(id).value); }
  function setStatus(id, message, error = false) { const element = document.getElementById(id); element.textContent = message || ''; element.classList.toggle('error', error); }
  function escapeHtml(text) { return String(text ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  function escapeAttr(text) { return escapeHtml(text); }

  document.getElementById('add-contact-option').addEventListener('click', () => openEditor());
  document.getElementById('close-contact-option-editor').addEventListener('click', closeEditor);
  document.getElementById('save-contact-option').addEventListener('click', saveOption);
  document.getElementById('delete-contact-option').addEventListener('click', deleteOption);
  document.getElementById('choose-contact-image').addEventListener('click', chooseImage);
  document.getElementById('save-closed-settings').addEventListener('click', saveSettings);
  document.getElementById('save-mobile-button-settings').addEventListener('click', saveMobileButtonSettings);
  for (const id of ['mobile-button-background', 'mobile-button-text', 'mobile-button-hover']) document.getElementById(id).addEventListener('input', updateMobileButtonPreview);
  document.getElementById('mobile-button-preview').addEventListener('mouseenter', event => { event.currentTarget.style.background = event.currentTarget.dataset.hoverColour; });
  document.getElementById('mobile-button-preview').addEventListener('mouseleave', updateMobileButtonPreview);
  for (const id of ['option-mobile-button-background', 'option-mobile-button-text', 'option-mobile-button-hover']) document.getElementById(id).addEventListener('input', updateOptionMobileButtonPreview);
  document.getElementById('option-mobile-button-preview').addEventListener('mouseenter', event => { event.currentTarget.style.background = event.currentTarget.dataset.hoverColour; });
  document.getElementById('option-mobile-button-preview').addEventListener('mouseleave', updateOptionMobileButtonPreview);
  document.querySelectorAll('[data-editor-toolbar]').forEach(toolbar => toolbar.addEventListener('click', formatEditor));
  document.getElementById('contact-option-editor').addEventListener('input', updatePreview);
  document.addEventListener('click', event => { const button = event.target.closest('[data-edit-option]'); if (button) openEditor(button.dataset.editOption); });

  initialise();
})();
