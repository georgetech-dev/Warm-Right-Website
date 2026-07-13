const SUPABASE_URL = 'https://axampuprcnauxbbijmmt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NFuFkO0tybTuMvYOQekQmA_62araOjM';

let editingId = null;
let currentSession = null;
let optionSchemaAvailable = true;
let rateOptions = [];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function imageSrcForAdmin(path) {
  if (!path) return '../assets/images/no-image.jpg';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const githubUrl = window.adminImageLibrary?.imageSrcForAdmin(path);
  if (githubUrl) return githubUrl;
  return path.startsWith('../') ? path : `../${path.replace(/^\/+/, '')}`;
}

function blankOption() {
  return {
    subtitle: '', price_ex_vat: '', vat_amount: '', price_inc_vat: '',
    read_more_type: 'modal', read_more_url: '', read_more_content: ''
  };
}

function legacyOption(rate) {
  return {
    subtitle: '',
    price_ex_vat: rate.price_ex_vat ?? '',
    vat_amount: rate.vat_amount ?? '',
    price_inc_vat: rate.price_inc_vat ?? '',
    read_more_type: rate.read_more_type || 'modal',
    read_more_url: rate.read_more_url || '',
    read_more_content: rate.read_more_content || ''
  };
}

function formatMoney(value) {
  return `£${Number.parseFloat(value || 0).toFixed(2)}`;
}

async function checkSecurity() {
  const lib = window.supabase || window.Supabase;
  if (!lib) return setTimeout(checkSecurity, 50);
  window.db = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const session = await window.requireAdminSession();
  if (!session) return;
  currentSession = session;
  await window.loadAdminHeader(session);
  document.body.style.visibility = 'visible';
  await loadRates();
}

function initSortable() {
  const body = document.getElementById('ratesBody');
  if (!window.Sortable || !body || body.dataset.sortableReady) return;
  body.dataset.sortableReady = 'true';
  Sortable.create(body, {
    handle: '.drag-handle',
    animation: 150,
    onEnd: async () => {
      const rows = [...body.querySelectorAll('tr[data-id]')];
      for (const [sort_order, row] of rows.entries()) {
        await window.db.from('rates').update({ sort_order }).eq('id', row.dataset.id);
      }
    }
  });
}

async function loadOptionMap(rateIds) {
  const map = new Map();
  if (!rateIds.length) return map;
  const { data, error } = await window.db
    .from('rate_options')
    .select('*')
    .in('rate_id', rateIds)
    .order('sort_order', { ascending: true });
  if (error) {
    optionSchemaAvailable = false;
    document.getElementById('schema-warning').classList.remove('hidden');
    return map;
  }
  optionSchemaAvailable = true;
  document.getElementById('schema-warning').classList.add('hidden');
  for (const option of data || []) {
    if (!map.has(option.rate_id)) map.set(option.rate_id, []);
    map.get(option.rate_id).push(option);
  }
  return map;
}

async function loadRates() {
  const tbody = document.getElementById('ratesBody');
  const { data, error } = await window.db.from('rates').select('*').order('sort_order', { ascending: true });
  if (error) {
    tbody.innerHTML = `<tr><td colspan="6">Unable to load rates: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  const rates = data || [];
  if (!rates.length) {
    tbody.innerHTML = '<tr><td colspan="6">No rates have been added yet.</td></tr>';
    return;
  }
  const optionMap = await loadOptionMap(rates.map(rate => rate.id));
  tbody.innerHTML = rates.map(rate => {
    const options = optionMap.get(rate.id) || [legacyOption(rate)];
    const prices = options.map((option, index) => `
      <span>${escapeHtml(option.subtitle || `Option ${index + 1}`)}: ${formatMoney(option.price_ex_vat)} <small>ex VAT</small></span>
    `).join('');
    return `
      <tr data-id="${rate.id}">
        <td class="drag-handle" aria-label="Drag to reorder">☰</td>
        <td><img src="${escapeHtml(imageSrcForAdmin(rate.image_url))}" class="table-img" alt="" onerror="this.onerror=null;this.src='../assets/images/no-image.jpg';"></td>
        <td><strong>${escapeHtml(rate.title)}</strong></td>
        <td>
          ${rate.is_hidden ? '<span class="badge badge-hidden">Hidden</span>' : ''}
          ${rate.is_suspended ? '<span class="badge badge-suspended">Suspended</span>' : ''}
          ${!rate.is_hidden && !rate.is_suspended ? '<span class="badge badge-active">Active</span>' : ''}
        </td>
        <td><div class="rate-price-summary">${prices}</div></td>
        <td><div class="table-actions">
          <button class="btn-outline" type="button" onclick="editRate('${rate.id}')">Edit</button>
          <button class="btn-danger" type="button" onclick="deleteRate('${rate.id}')">Delete</button>
        </div></td>
      </tr>`;
  }).join('');
  initSortable();
}

function showFormMode() {
  document.getElementById('table-view').classList.add('hidden');
  document.getElementById('form-view').classList.remove('hidden');
  document.getElementById('schema-warning-form').classList.toggle('hidden', optionSchemaAvailable);
}

function showTableMode() {
  document.getElementById('form-view').classList.add('hidden');
  document.getElementById('table-view').classList.remove('hidden');
  resetForm();
}

function resetForm() {
  editingId = null;
  document.getElementById('formTitle').textContent = 'Add New Rate';
  document.getElementById('title').value = '';
  document.getElementById('description').value = '';
  document.getElementById('is_suspended').checked = false;
  document.getElementById('is_hidden').checked = false;
  document.getElementById('image_url').value = '';
  document.getElementById('imagePreview').src = '../assets/images/no-image.jpg';
  setFormMessage('');
  rateOptions = [blankOption()];
  renderOptions();
}

function collectOptions() {
  rateOptions = [...document.querySelectorAll('.rate-option-card')].map(card => ({
    subtitle: card.querySelector('[data-field="subtitle"]').value.trim(),
    price_ex_vat: card.querySelector('[data-field="price_ex_vat"]').value,
    vat_amount: card.querySelector('[data-field="vat_amount"]').value,
    price_inc_vat: card.querySelector('[data-field="price_inc_vat"]').value,
    read_more_type: card.querySelector('[data-field="read_more_type"]').value,
    read_more_url: card.querySelector('[data-field="read_more_url"]').value.trim(),
    read_more_content: card.querySelector('[data-field="read_more_content"]').innerHTML.trim()
  }));
  return rateOptions;
}

function renderOptions() {
  const list = document.getElementById('rate-options-list');
  list.innerHTML = rateOptions.map((option, index) => `
    <article class="rate-option-card" data-option-index="${index}">
      <div class="option-heading">
        <h4>Rate option ${index + 1}</h4>
        <div class="option-heading-actions">
          <button class="btn-outline icon-button" type="button" title="Move option left" aria-label="Move option left" onclick="moveRateOption(${index}, -1)" ${index === 0 ? 'disabled' : ''}>←</button>
          <button class="btn-outline icon-button" type="button" title="Move option right" aria-label="Move option right" onclick="moveRateOption(${index}, 1)" ${index === rateOptions.length - 1 ? 'disabled' : ''}>→</button>
          <button class="btn-danger" type="button" onclick="removeRateOption(${index})" ${rateOptions.length === 1 ? 'disabled' : ''}>Remove</button>
        </div>
      </div>
      <div class="option-fields">
        <div class="option-field option-field-wide">
          <label>Column title</label>
          <input data-field="subtitle" value="${escapeHtml(option.subtitle)}" placeholder="e.g. 8am - 6pm">
        </div>
        <div class="option-field">
          <label>Price ex. VAT (£)</label>
          <input data-field="price_ex_vat" type="number" min="0" step="0.01" value="${escapeHtml(option.price_ex_vat)}">
        </div>
        <div class="option-field">
          <label>VAT (£)</label>
          <input data-field="vat_amount" type="number" min="0" step="0.01" value="${escapeHtml(option.vat_amount)}" readonly>
        </div>
        <div class="option-field">
          <label>Total inc. VAT (£)</label>
          <input data-field="price_inc_vat" type="number" min="0" step="0.01" value="${escapeHtml(option.price_inc_vat)}">
        </div>
        <div class="option-action-fields">
          <div class="option-field">
            <label>Read More action</label>
            <select data-field="read_more_type" onchange="toggleOptionAction(this)">
              <option value="modal" ${option.read_more_type !== 'link' ? 'selected' : ''}>Open info popup</option>
              <option value="link" ${option.read_more_type === 'link' ? 'selected' : ''}>Link to page</option>
            </select>
          </div>
          <div class="option-field option-url-field ${option.read_more_type === 'link' ? '' : 'hidden'}">
            <label>Link URL</label>
            <input data-field="read_more_url" value="${escapeHtml(option.read_more_url)}" placeholder="e.g. /book-a-visit.html">
          </div>
        </div>
        <div class="option-field option-field-wide option-content-field ${option.read_more_type === 'link' ? 'hidden' : ''}">
          <label>Read More content</label>
          <div class="editor-toolbar">
            <button type="button" onclick="optionEditorCommand(this, 'bold')"><strong>B</strong></button>
            <button type="button" onclick="optionEditorCommand(this, 'italic')"><em>I</em></button>
            <button type="button" onclick="optionEditorCommand(this, 'underline')"><u>U</u></button>
            <button type="button" onclick="optionEditorCommand(this, 'insertUnorderedList')">List</button>
            <button type="button" onclick="optionEditorCommand(this, 'createLink')">Link</button>
          </div>
          <div class="html-editor" data-field="read_more_content" contenteditable="true">${option.read_more_content || ''}</div>
        </div>
      </div>
    </article>
  `).join('');
  document.getElementById('add-option-btn').disabled = rateOptions.length >= 3;
}

function addRateOption() {
  collectOptions();
  if (rateOptions.length >= 3) return;
  rateOptions.push(blankOption());
  renderOptions();
}

function removeRateOption(index) {
  collectOptions();
  if (rateOptions.length === 1) return;
  rateOptions.splice(index, 1);
  renderOptions();
}

function moveRateOption(index, direction) {
  collectOptions();
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= rateOptions.length) return;
  [rateOptions[index], rateOptions[nextIndex]] = [rateOptions[nextIndex], rateOptions[index]];
  renderOptions();
}

function toggleOptionAction(select) {
  const card = select.closest('.rate-option-card');
  const isLink = select.value === 'link';
  card.querySelector('.option-url-field').classList.toggle('hidden', !isLink);
  card.querySelector('.option-content-field').classList.toggle('hidden', isLink);
}

function optionEditorCommand(button, command) {
  const editor = button.closest('.rate-option-card').querySelector('[data-field="read_more_content"]');
  editor.focus();
  if (command === 'createLink') {
    const url = prompt('Enter the link URL');
    if (!url) return;
    document.execCommand(command, false, url);
  } else {
    document.execCommand(command, false, null);
  }
}

document.addEventListener('input', event => {
  const field = event.target.dataset?.field;
  if (field !== 'price_ex_vat' && field !== 'price_inc_vat') return;
  const card = event.target.closest('.rate-option-card');
  const exVat = card.querySelector('[data-field="price_ex_vat"]');
  const vat = card.querySelector('[data-field="vat_amount"]');
  const incVat = card.querySelector('[data-field="price_inc_vat"]');
  const value = Number.parseFloat(event.target.value);
  if (!Number.isFinite(value)) {
    vat.value = '';
    if (field === 'price_ex_vat') incVat.value = '';
    if (field === 'price_inc_vat') exVat.value = '';
    return;
  }
  if (field === 'price_ex_vat') {
    vat.value = (value * 0.2).toFixed(2);
    incVat.value = (value * 1.2).toFixed(2);
  } else {
    exVat.value = (value / 1.2).toFixed(2);
    vat.value = (value - (value / 1.2)).toFixed(2);
  }
});

async function editRate(id) {
  const { data: rate, error } = await window.db.from('rates').select('*').eq('id', id).single();
  if (error || !rate) return alert(error?.message || 'Unable to load this rate.');
  const { data: options, error: optionError } = await window.db
    .from('rate_options').select('*').eq('rate_id', id).order('sort_order', { ascending: true });
  optionSchemaAvailable = !optionError;
  editingId = id;
  document.getElementById('formTitle').textContent = `Editing: ${rate.title}`;
  document.getElementById('title').value = rate.title || '';
  document.getElementById('description').value = rate.description || '';
  document.getElementById('is_suspended').checked = Boolean(rate.is_suspended);
  document.getElementById('is_hidden').checked = Boolean(rate.is_hidden);
  document.getElementById('image_url').value = rate.image_url || '';
  document.getElementById('imagePreview').src = imageSrcForAdmin(rate.image_url);
  rateOptions = options?.length ? options : [legacyOption(rate)];
  renderOptions();
  document.getElementById('schema-warning-form').classList.toggle('hidden', optionSchemaAvailable);
  showFormMode();
}

async function deleteRate(id) {
  if (!confirm('Permanently delete this rate and all of its price options?')) return;
  const { error } = await window.db.from('rates').delete().eq('id', id);
  if (error) return alert(error.message);
  await loadRates();
}

function openImageBrowser() {
  window.adminImageLibrary.open({
    session: currentSession,
    onSelect: path => {
      document.getElementById('image_url').value = path;
      document.getElementById('imagePreview').src = imageSrcForAdmin(path);
      setFormMessage('Image selected. Save the rate to apply it.');
    }
  });
}

function setFormMessage(message, isError = false) {
  const element = document.getElementById('form-message');
  element.textContent = message || '';
  element.classList.toggle('error', isError);
}

async function saveRate() {
  const title = document.getElementById('title').value.trim();
  const options = collectOptions();
  if (!title) return setFormMessage('A card title is required.', true);
  if (!optionSchemaAvailable) return setFormMessage('Run rate-options-update.sql in Supabase before saving multi-option rates.', true);
  if (!options.length || options.length > 3) return setFormMessage('Each card must have between one and three options.', true);
  if (options.some(option => !option.price_ex_vat || !option.price_inc_vat)) {
    return setFormMessage('Each option needs a price.', true);
  }
  if (options.length > 1 && options.some(option => !option.subtitle)) {
    return setFormMessage('Give each option a column title when using multiple options.', true);
  }

  const saveButton = document.getElementById('saveBtn');
  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';
  setFormMessage('');
  const first = options[0];
  const parentPayload = {
    title,
    description: document.getElementById('description').value.trim(),
    image_url: document.getElementById('image_url').value.trim(),
    is_suspended: document.getElementById('is_suspended').checked,
    is_hidden: document.getElementById('is_hidden').checked,
    price_ex_vat: first.price_ex_vat,
    vat_amount: first.vat_amount,
    price_inc_vat: first.price_inc_vat,
    read_more_type: first.read_more_type,
    read_more_url: first.read_more_url,
    read_more_content: first.read_more_content
  };

  try {
    let rateId = editingId;
    if (editingId) {
      const { error } = await window.db.from('rates').update(parentPayload).eq('id', editingId);
      if (error) throw error;
    } else {
      const { data, error } = await window.db.from('rates').insert(parentPayload).select('id').single();
      if (error) throw error;
      rateId = data.id;
    }

    const { error: deleteError } = await window.db.from('rate_options').delete().eq('rate_id', rateId);
    if (deleteError) throw deleteError;
    const optionRows = options.map((option, sort_order) => ({
      rate_id: rateId,
      subtitle: option.subtitle,
      price_ex_vat: option.price_ex_vat,
      vat_amount: option.vat_amount,
      price_inc_vat: option.price_inc_vat,
      read_more_type: option.read_more_type,
      read_more_url: option.read_more_url,
      read_more_content: option.read_more_content,
      sort_order
    }));
    const { error: insertError } = await window.db.from('rate_options').insert(optionRows);
    if (insertError) throw insertError;
    showTableMode();
    await loadRates();
  } catch (error) {
    setFormMessage(error.message || 'Unable to save this rate.', true);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Save Rate';
  }
}

document.getElementById('saveBtn').addEventListener('click', saveRate);
resetForm();
checkSecurity();

window.showFormMode = showFormMode;
window.showTableMode = showTableMode;
window.editRate = editRate;
window.deleteRate = deleteRate;
window.openImageBrowser = openImageBrowser;
window.addRateOption = addRateOption;
window.removeRateOption = removeRateOption;
window.moveRateOption = moveRateOption;
window.toggleOptionAction = toggleOptionAction;
window.optionEditorCommand = optionEditorCommand;
