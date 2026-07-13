(function () {
  const SUPABASE_URL = 'https://axampuprcnauxbbijmmt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_NFuFkO0tybTuMvYOQekQmA_62araOjM';
  let db;
  let sections = [];
  let editingId = null;

  function setStatus(message, isError = false) {
    const status = document.getElementById('terms-admin-status');
    status.textContent = message || '';
    status.classList.toggle('error', isError);
  }

  async function initialise() {
    const lib = window.supabase || window.Supabase;
    if (!lib || !window.WarmRightTerms) {
      window.setTimeout(initialise, 50);
      return;
    }

    db = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.db = db;
    const session = await window.requireAdminSession();
    if (!session) return;

    await window.loadAdminHeader(session);
    document.body.style.visibility = 'visible';
    bindEditorToolbar();
    bindEvents();
    await loadSettings();
    await loadSections(true);
  }

  function bindEvents() {
    document.getElementById('save-terms-settings').addEventListener('click', saveSettings);
    document.getElementById('export-terms-json').addEventListener('click', exportPolicyJson);
    document.getElementById('import-terms-json').addEventListener('click', () => document.getElementById('terms-json-file').click());
    document.getElementById('terms-json-file').addEventListener('change', event => importPolicyJsonFile(event.target.files?.[0]));
    document.getElementById('replace-terms-draft').addEventListener('click', () => importDraft(true));
    document.getElementById('add-terms-section').addEventListener('click', () => showEditor());
    document.getElementById('close-terms-editor').addEventListener('click', showList);
    document.getElementById('cancel-terms-editor').addEventListener('click', showList);
    document.getElementById('save-terms-section').addEventListener('click', saveSection);
    document.getElementById('delete-terms-section').addEventListener('click', deleteSection);
    document.getElementById('terms-section-subtitle').addEventListener('input', handleSubtitleChange);
    document.getElementById('terms-section-key').addEventListener('input', event => {
      event.target.dataset.touched = 'true';
    });
    document.getElementById('terms-sections-body').addEventListener('click', handleTableAction);
    document.getElementById('terms-add-link').addEventListener('click', addLink);
    document.getElementById('terms-remove-link').addEventListener('click', () => document.execCommand('unlink', false, null));
  }

  function bindEditorToolbar() {
    document.querySelectorAll('[data-terms-command]').forEach(button => {
      button.addEventListener('click', () => {
        document.execCommand(button.dataset.termsCommand, false, null);
        document.getElementById('terms-section-content').focus();
      });
    });
  }

  async function loadSettings() {
    const { data, error } = await db
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['terms_page_title', 'terms_review_date']);
    if (error) {
      setStatus(error.message, true);
      return;
    }
    const settings = Object.fromEntries((data || []).map(row => [row.setting_key, row.setting_value]));
    document.getElementById('terms-page-title').value = settings.terms_page_title || window.WarmRightTerms.DEFAULT_TITLE;
    document.getElementById('terms-review-date').value = settings.terms_review_date || window.WarmRightTerms.DEFAULT_REVIEW_DATE;
  }

  async function saveSettings() {
    const title = document.getElementById('terms-page-title').value.trim();
    const reviewDate = document.getElementById('terms-review-date').value;
    if (!title || !reviewDate) {
      setStatus('Enter both the page title and review date.', true);
      return;
    }
    const rows = [
      { setting_key: 'terms_page_title', setting_value: title, updated_at: new Date().toISOString() },
      { setting_key: 'terms_review_date', setting_value: reviewDate, updated_at: new Date().toISOString() },
    ];
    const { error } = await db.from('site_settings').upsert(rows);
    setStatus(error ? error.message : 'Terms document settings saved.', Boolean(error));
  }

  function buildPolicyExport() {
    const title = document.getElementById('terms-page-title').value.trim() || window.WarmRightTerms.DEFAULT_TITLE;
    const reviewDate = document.getElementById('terms-review-date').value || window.WarmRightTerms.DEFAULT_REVIEW_DATE;
    return {
      formatVersion: 1,
      documentType: 'terms_conditions',
      title,
      code: 'warm-right-terms-conditions',
      version: '1.0',
      status: 'Published',
      owner: 'Warm Right Ltd',
      category: 'Customer terms and conditions',
      effectiveDate: reviewDate,
      reviewDate,
      sections: sections.map(section => ({
        key: section.section_key,
        title: section.subtitle,
        content: window.WarmRightTerms.sanitizeHtml(section.body_html),
      })),
    };
  }

  function downloadJson(filename, data) {
    const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportPolicyJson() {
    const policy = buildPolicyExport();
    const date = policy.reviewDate || new Date().toISOString().slice(0, 10);
    downloadJson(`warm-right-terms-conditions-${date}.json`, policy);
    setStatus('Terms JSON exported.');
  }

  function validatePolicyJson(policy) {
    if (!policy || typeof policy !== 'object') throw new Error('The selected file is not a valid terms JSON document.');
    if (Number(policy.formatVersion) !== 1) throw new Error('Only terms JSON formatVersion 1 can be imported.');
    if (!Array.isArray(policy.sections)) throw new Error('The terms JSON must include a sections array.');
    if (!policy.sections.length) throw new Error('The terms JSON does not contain any sections.');
    const seenKeys = new Set();
    policy.sections.forEach((section, index) => {
      if (!section || typeof section !== 'object') throw new Error(`Section ${index + 1} is invalid.`);
      const key = window.WarmRightTerms.slugifyKey(section.key || section.section_key || section.title);
      if (!key) throw new Error(`Section ${index + 1} needs a valid anchor key.`);
      if (seenKeys.has(key)) throw new Error(`Anchor key "${key}" is duplicated in the import file.`);
      seenKeys.add(key);
      if (!String(section.title || '').trim()) throw new Error(`Section ${index + 1} needs a title.`);
      if (!String(section.content || '').replace(/<[^>]+>/g, '').trim()) throw new Error(`Section ${index + 1} needs content.`);
    });
  }

  async function replaceSectionsFromPolicyJson(policy) {
    const rows = policy.sections.map((section, index) => ({
      section_key: window.WarmRightTerms.slugifyKey(section.key || section.section_key || section.title),
      subtitle: String(section.title || '').trim(),
      body_html: window.WarmRightTerms.sanitizeHtml(section.content),
      sort_order: (index + 1) * 10,
      is_active: true,
      updated_at: new Date().toISOString(),
    }));

    const { data: insertedRows, error: insertError } = await db
      .from('terms_policy_sections')
      .insert(rows)
      .select('id');
    if (insertError) throw insertError;

    const insertedIds = (insertedRows || []).map(row => row.id);
    if (insertedIds.length !== rows.length) {
      if (insertedIds.length) await db.from('terms_policy_sections').delete().in('id', insertedIds);
      throw new Error('The imported terms could not be staged safely.');
    }

    if (sections.length) {
      const { error: deleteError } = await db.from('terms_policy_sections').delete().in('id', sections.map(section => section.id));
      if (deleteError) {
        await db.from('terms_policy_sections').delete().in('id', insertedIds);
        throw deleteError;
      }
    }
  }

  async function importPolicyJsonFile(file) {
    if (!file) return;
    setStatus('Reading terms JSON...');
    try {
      const policy = JSON.parse(await file.text());
      validatePolicyJson(policy);
      if (!window.confirm(`Import "${policy.title || 'Terms and Conditions'}" and replace the current ${sections.length} section${sections.length === 1 ? '' : 's'}?`)) {
        setStatus('Terms import cancelled.');
        return;
      }

      await replaceSectionsFromPolicyJson(policy);
      document.getElementById('terms-page-title').value = policy.title || window.WarmRightTerms.DEFAULT_TITLE;
      document.getElementById('terms-review-date').value = policy.reviewDate || policy.effectiveDate || window.WarmRightTerms.DEFAULT_REVIEW_DATE;
      await saveSettings();
      await loadSections(false);
      setStatus(`${policy.sections.length} terms sections imported from JSON.`);
    } catch (error) {
      setStatus(error.message || 'The terms JSON could not be imported.', true);
    } finally {
      document.getElementById('terms-json-file').value = '';
    }
  }

  async function loadSections(autoSeed = false) {
    const { data, error } = await db
      .from('terms_policy_sections')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      document.getElementById('terms-sections-body').innerHTML = '<tr><td colspan="5">Terms sections are unavailable.</td></tr>';
      setStatus(`Unable to load terms sections: ${error.message}. Run terms-conditions-management-update.sql first.`, true);
      return;
    }
    sections = data || [];
    if (!sections.length && autoSeed) {
      await importDraft(false);
      return;
    }
    renderSections();
  }

  function renderSections() {
    const body = document.getElementById('terms-sections-body');
    if (!sections.length) {
      body.innerHTML = '<tr><td colspan="5">No terms sections have been added.</td></tr>';
      return;
    }
    body.innerHTML = sections.map((section, index) => `
      <tr>
        <td class="privacy-section-number">${index + 1}.</td>
        <td><code>#${window.WarmRightTerms.escapeHtml(section.section_key || '')}</code></td>
        <td><strong>${window.WarmRightTerms.escapeHtml(section.subtitle)}</strong></td>
        <td><span class="privacy-status-pill ${section.is_active ? '' : 'inactive'}">${section.is_active ? 'Visible' : 'Hidden'}</span></td>
        <td><div class="privacy-row-actions">
          <button type="button" data-move-section="${section.id}" data-direction="up" ${index === 0 ? 'disabled' : ''}>Up</button>
          <button type="button" data-move-section="${section.id}" data-direction="down" ${index === sections.length - 1 ? 'disabled' : ''}>Down</button>
          <button type="button" data-edit-section="${section.id}">Edit</button>
        </div></td>
      </tr>
    `).join('');
  }

  async function importDraft(confirmReplacement) {
    if (confirmReplacement && !window.confirm('Replace every managed terms section with the starter draft?')) return;
    setStatus('Loading the starter terms draft...');
    try {
      const draft = await window.WarmRightTerms.fetchDraft();
      const replacingExisting = sections.length > 0;
      const rows = draft.sections.map((section, index) => ({
        section_key: section.section_key,
        subtitle: section.subtitle,
        body_html: window.WarmRightTerms.sanitizeHtml(section.body_html),
        sort_order: replacingExisting ? 10000 + (index * 10) : section.sort_order,
        is_active: !replacingExisting,
        updated_at: new Date().toISOString(),
      }));
      const { data: insertedRows, error: insertError } = await db
        .from('terms_policy_sections')
        .insert(rows)
        .select('id');
      if (insertError) throw insertError;
      if (replacingExisting) {
        const stagedRows = insertedRows || [];
        if (stagedRows.length !== rows.length) {
          if (stagedRows.length) await db.from('terms_policy_sections').delete().in('id', stagedRows.map(row => row.id));
          throw new Error('The replacement draft could not be staged safely.');
        }
        const insertedIds = stagedRows.map(row => row.id);
        const { error: deleteError } = await db.from('terms_policy_sections').delete().in('id', sections.map(section => section.id));
        if (deleteError) {
          await db.from('terms_policy_sections').delete().in('id', insertedIds);
          throw deleteError;
        }
        const activationResults = await Promise.all(stagedRows.map((row, index) => db
          .from('terms_policy_sections')
          .update({ sort_order: (index + 1) * 10, is_active: true, updated_at: new Date().toISOString() })
          .eq('id', row.id)));
        const activationFailure = activationResults.find(result => result.error);
        if (activationFailure) throw activationFailure.error;
      }
      document.getElementById('terms-page-title').value = draft.title;
      document.getElementById('terms-review-date').value = draft.reviewDate;
      await saveSettings();
      await loadSections(false);
      setStatus(`${rows.length} terms sections imported from the starter draft.`);
    } catch (error) {
      setStatus(error.message || 'The starter terms draft could not be imported.', true);
    }
  }

  function showList() {
    editingId = null;
    document.getElementById('terms-editor-view').classList.add('privacy-view-hidden');
    document.getElementById('terms-list-view').classList.remove('privacy-view-hidden');
  }

  function showEditor(section = null) {
    editingId = section?.id || null;
    document.getElementById('terms-list-view').classList.add('privacy-view-hidden');
    document.getElementById('terms-editor-view').classList.remove('privacy-view-hidden');
    document.getElementById('terms-editor-title').textContent = section ? `Edit Section ${sections.indexOf(section) + 1}` : 'Add Terms Section';
    document.getElementById('terms-section-subtitle').value = section?.subtitle || '';
    document.getElementById('terms-section-key').value = section?.section_key || '';
    document.getElementById('terms-section-key').dataset.touched = section ? 'true' : 'false';
    document.getElementById('terms-section-content').innerHTML = window.WarmRightTerms.sanitizeHtml(section?.body_html || '');
    document.getElementById('terms-section-active').checked = section?.is_active ?? true;
    document.getElementById('delete-terms-section').classList.toggle('privacy-view-hidden', !section);
    setStatus('');
  }

  function handleSubtitleChange() {
    const keyInput = document.getElementById('terms-section-key');
    if (editingId || keyInput.dataset.touched === 'true') return;
    keyInput.value = window.WarmRightTerms.slugifyKey(document.getElementById('terms-section-subtitle').value);
  }

  function normalisedSectionKey() {
    const keyInput = document.getElementById('terms-section-key');
    const raw = keyInput.value.trim() || document.getElementById('terms-section-subtitle').value.trim();
    const key = window.WarmRightTerms.slugifyKey(raw);
    keyInput.value = key;
    return key;
  }

  async function saveSection() {
    const subtitle = document.getElementById('terms-section-subtitle').value.trim();
    const sectionKey = normalisedSectionKey();
    const bodyHtml = window.WarmRightTerms.sanitizeHtml(document.getElementById('terms-section-content').innerHTML);
    if (!subtitle) {
      setStatus('Enter a section subtitle.', true);
      return;
    }
    if (!sectionKey) {
      setStatus('Enter a valid anchor key.', true);
      return;
    }
    if (!bodyHtml.replace(/<[^>]+>/g, '').trim()) {
      setStatus('Enter some content for this section.', true);
      return;
    }
    const duplicate = sections.find(section => section.section_key === sectionKey && section.id !== editingId);
    if (duplicate) {
      setStatus(`The anchor key "${sectionKey}" is already in use.`, true);
      return;
    }

    const payload = {
      section_key: sectionKey,
      subtitle,
      body_html: bodyHtml,
      is_active: document.getElementById('terms-section-active').checked,
      updated_at: new Date().toISOString(),
    };
    let result;
    if (editingId) {
      result = await db.from('terms_policy_sections').update(payload).eq('id', editingId);
    } else {
      payload.sort_order = sections.length ? Math.max(...sections.map(section => Number(section.sort_order) || 0)) + 10 : 10;
      result = await db.from('terms_policy_sections').insert(payload);
    }
    if (result.error) {
      setStatus(result.error.message, true);
      return;
    }
    await loadSections(false);
    showList();
    setStatus('Terms section saved.');
  }

  async function deleteSection() {
    if (!editingId) return;
    const section = sections.find(item => item.id === editingId);
    if (!section || !window.confirm(`Delete "${section.subtitle}"?`)) return;
    const { error } = await db.from('terms_policy_sections').delete().eq('id', editingId);
    if (error) {
      setStatus(error.message, true);
      return;
    }
    await loadSections(false);
    showList();
    setStatus('Terms section deleted.');
  }

  async function moveSection(id, direction) {
    const index = sections.findIndex(section => section.id === id);
    if (index < 0) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sections.length) return;
    const reordered = [...sections];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    const updates = reordered.map((section, idx) => db
      .from('terms_policy_sections')
      .update({ sort_order: (idx + 1) * 10, updated_at: new Date().toISOString() })
      .eq('id', section.id));
    const results = await Promise.all(updates);
    const failure = results.find(result => result.error);
    if (failure) {
      setStatus(failure.error.message, true);
      return;
    }
    await loadSections(false);
    setStatus('Section order updated.');
  }

  function handleTableAction(event) {
    const editButton = event.target.closest('[data-edit-section]');
    if (editButton) {
      const section = sections.find(item => item.id === editButton.dataset.editSection);
      if (section) showEditor(section);
      return;
    }
    const moveButton = event.target.closest('[data-move-section]');
    if (moveButton) moveSection(moveButton.dataset.moveSection, moveButton.dataset.direction);
  }

  function addLink() {
    const url = window.prompt('Enter the link URL');
    if (!url) return;
    document.execCommand('createLink', false, url);
    document.getElementById('terms-section-content').focus();
  }

  initialise();
}());
