(function () {
  const SUPABASE_URL = 'https://axampuprcnauxbbijmmt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_NFuFkO0tybTuMvYOQekQmA_62araOjM';
  let db;
  let sections = [];
  let editingId = null;

  function setStatus(message, isError = false) {
    const status = document.getElementById('privacy-admin-status');
    status.textContent = message || '';
    status.classList.toggle('error', isError);
  }

  async function initialise() {
    const lib = window.supabase || window.Supabase;
    if (!lib || !window.WarmRightPrivacy) {
      window.setTimeout(initialise, 50);
      return;
    }

    db = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.db = db;
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    await window.loadAdminHeader(session);
    document.body.style.visibility = 'visible';
    await loadSettings();
    await loadSections(true);
  }

  async function loadSettings() {
    const { data, error } = await db
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['privacy_page_title', 'privacy_review_date']);
    if (error) {
      setStatus(error.message, true);
      return;
    }
    const settings = Object.fromEntries((data || []).map(row => [row.setting_key, row.setting_value]));
    document.getElementById('privacy-page-title').value = settings.privacy_page_title || window.WarmRightPrivacy.DEFAULT_TITLE;
    document.getElementById('privacy-review-date').value = settings.privacy_review_date || window.WarmRightPrivacy.DEFAULT_REVIEW_DATE;
  }

  async function saveSettings() {
    const title = document.getElementById('privacy-page-title').value.trim();
    const reviewDate = document.getElementById('privacy-review-date').value;
    if (!title || !reviewDate) {
      setStatus('Enter both the page title and review date.', true);
      return;
    }
    const rows = [
      { setting_key: 'privacy_page_title', setting_value: title, updated_at: new Date().toISOString() },
      { setting_key: 'privacy_review_date', setting_value: reviewDate, updated_at: new Date().toISOString() },
    ];
    const { error } = await db.from('site_settings').upsert(rows);
    setStatus(error ? error.message : 'Privacy document settings saved.', Boolean(error));
  }

  function buildPolicyExport() {
    const title = document.getElementById('privacy-page-title').value.trim() || window.WarmRightPrivacy.DEFAULT_TITLE;
    const reviewDate = document.getElementById('privacy-review-date').value || window.WarmRightPrivacy.DEFAULT_REVIEW_DATE;
    return {
      formatVersion: 1,
      documentType: 'privacy_policy',
      title,
      code: 'warm-right-privacy-policy',
      version: '1.0',
      status: 'Published',
      owner: 'Warm Right Ltd',
      approver: '',
      category: 'Data protection and privacy',
      appliesTo: 'Warm Right Ltd customers, website visitors, suppliers, contractors and business contacts',
      effectiveDate: reviewDate,
      reviewDate,
      confidentiality: 'Public',
      sections: sections.map(section => ({
        title: section.subtitle,
        content: window.WarmRightPrivacy.sanitizeHtml(section.body_html),
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
    downloadJson(`warm-right-privacy-policy-${date}.json`, policy);
    setStatus('Privacy policy JSON exported.');
  }

  function validatePolicyJson(policy) {
    if (!policy || typeof policy !== 'object') throw new Error('The selected file is not a valid policy JSON document.');
    if (Number(policy.formatVersion) !== 1) throw new Error('Only policy JSON formatVersion 1 can be imported.');
    if (!Array.isArray(policy.sections)) throw new Error('The policy JSON must include a sections array.');
    if (!policy.sections.length) throw new Error('The policy JSON does not contain any sections.');
    policy.sections.forEach((section, index) => {
      if (!section || typeof section !== 'object') throw new Error(`Section ${index + 1} is invalid.`);
      if (!String(section.title || '').trim()) throw new Error(`Section ${index + 1} needs a title.`);
      if (!String(section.content || '').replace(/<[^>]+>/g, '').trim()) throw new Error(`Section ${index + 1} needs content.`);
    });
  }

  async function replaceSectionsFromPolicyJson(policy) {
    const rows = policy.sections.map((section, index) => ({
      subtitle: String(section.title || '').trim(),
      body_html: window.WarmRightPrivacy.sanitizeHtml(section.content),
      sort_order: (index + 1) * 10,
      is_active: true,
      updated_at: new Date().toISOString(),
    }));

    const { data: insertedRows, error: insertError } = await db
      .from('privacy_policy_sections')
      .insert(rows)
      .select('id');
    if (insertError) throw insertError;

    const insertedIds = (insertedRows || []).map(row => row.id);
    if (insertedIds.length !== rows.length) {
      if (insertedIds.length) await db.from('privacy_policy_sections').delete().in('id', insertedIds);
      throw new Error('The imported policy could not be staged safely.');
    }

    if (sections.length) {
      const { error: deleteError } = await db.from('privacy_policy_sections').delete().in('id', sections.map(section => section.id));
      if (deleteError) {
        await db.from('privacy_policy_sections').delete().in('id', insertedIds);
        throw deleteError;
      }
    }
  }

  async function importPolicyJsonFile(file) {
    if (!file) return;
    setStatus('Reading privacy policy JSON...');
    try {
      const policy = JSON.parse(await file.text());
      validatePolicyJson(policy);
      if (!window.confirm(`Import "${policy.title || 'Privacy policy'}" and replace the current ${sections.length} section${sections.length === 1 ? '' : 's'}?`)) {
        setStatus('Privacy policy import cancelled.');
        return;
      }

      await replaceSectionsFromPolicyJson(policy);
      document.getElementById('privacy-page-title').value = policy.title || window.WarmRightPrivacy.DEFAULT_TITLE;
      document.getElementById('privacy-review-date').value = policy.reviewDate || policy.effectiveDate || window.WarmRightPrivacy.DEFAULT_REVIEW_DATE;
      await saveSettings();
      await loadSections(false);
      setStatus(`${policy.sections.length} privacy policy sections imported from JSON.`);
    } catch (error) {
      setStatus(error.message || 'The privacy policy JSON could not be imported.', true);
    } finally {
      document.getElementById('privacy-json-file').value = '';
    }
  }

  async function loadSections(autoSeed = false) {
    const { data, error } = await db
      .from('privacy_policy_sections')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      document.getElementById('privacy-sections-body').innerHTML = '<tr><td colspan="4">Privacy policy sections are unavailable.</td></tr>';
      setStatus(`Unable to load privacy sections: ${error.message}. Run privacy-policy-management-update.sql first.`, true);
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
    const body = document.getElementById('privacy-sections-body');
    if (!sections.length) {
      body.innerHTML = '<tr><td colspan="4">No policy sections have been added.</td></tr>';
      return;
    }
    body.innerHTML = sections.map((section, index) => `
      <tr>
        <td class="privacy-section-number">${index + 1}.</td>
        <td><strong>${window.WarmRightPrivacy.escapeHtml(section.subtitle)}</strong></td>
        <td><span class="privacy-status-pill ${section.is_active ? '' : 'inactive'}">${section.is_active ? 'Visible' : 'Hidden'}</span></td>
        <td><div class="privacy-row-actions">
          <button type="button" data-move-section="${section.id}" data-direction="up" ${index === 0 ? 'disabled' : ''} aria-label="Move ${window.WarmRightPrivacy.escapeHtml(section.subtitle)} up">Up</button>
          <button type="button" data-move-section="${section.id}" data-direction="down" ${index === sections.length - 1 ? 'disabled' : ''} aria-label="Move ${window.WarmRightPrivacy.escapeHtml(section.subtitle)} down">Down</button>
          <button type="button" data-edit-section="${section.id}">Edit</button>
        </div></td>
      </tr>
    `).join('');
  }

  async function importDraft(confirmReplacement) {
    if (confirmReplacement && !window.confirm('Replace every managed privacy section with the attached 5 July 2026 draft?')) return;
    setStatus('Loading the attached privacy policy draft...');
    try {
      const draft = await window.WarmRightPrivacy.fetchDraft();
      const replacingExisting = sections.length > 0;
      const rows = draft.sections.map((section, index) => ({
        subtitle: section.subtitle,
        body_html: window.WarmRightPrivacy.sanitizeHtml(section.body_html),
        sort_order: replacingExisting ? 10000 + (index * 10) : section.sort_order,
        is_active: !replacingExisting,
        updated_at: new Date().toISOString(),
      }));
      const { data: insertedRows, error: insertError } = await db
        .from('privacy_policy_sections')
        .insert(rows)
        .select('id');
      if (insertError) throw insertError;
      if (replacingExisting) {
        const stagedRows = insertedRows || [];
        if (stagedRows.length !== rows.length) {
          if (stagedRows.length) await db.from('privacy_policy_sections').delete().in('id', stagedRows.map(row => row.id));
          throw new Error('The replacement draft could not be staged safely.');
        }
        const insertedIds = stagedRows.map(row => row.id);
        const { error: deleteError } = await db.from('privacy_policy_sections').delete().in('id', sections.map(section => section.id));
        if (deleteError) {
          await db.from('privacy_policy_sections').delete().in('id', insertedIds);
          throw deleteError;
        }
        const activationResults = await Promise.all(stagedRows.map((row, index) => db
          .from('privacy_policy_sections')
          .update({ sort_order: (index + 1) * 10, is_active: true, updated_at: new Date().toISOString() })
          .eq('id', row.id)));
        const activationFailure = activationResults.find(result => result.error);
        if (activationFailure) throw activationFailure.error;
      }
      document.getElementById('privacy-page-title').value = draft.title;
      document.getElementById('privacy-review-date').value = draft.reviewDate;
      await saveSettings();
      await loadSections(false);
      setStatus(`${rows.length} privacy policy sections imported from the attached draft.`);
    } catch (error) {
      setStatus(error.message || 'The privacy policy draft could not be imported.', true);
    }
  }

  function showList() {
    editingId = null;
    document.getElementById('privacy-editor-view').classList.add('privacy-view-hidden');
    document.getElementById('privacy-list-view').classList.remove('privacy-view-hidden');
  }

  function showEditor(section = null) {
    editingId = section?.id || null;
    document.getElementById('privacy-list-view').classList.add('privacy-view-hidden');
    document.getElementById('privacy-editor-view').classList.remove('privacy-view-hidden');
    document.getElementById('privacy-editor-title').textContent = section ? `Edit Section ${sections.indexOf(section) + 1}` : 'Add Privacy Section';
    document.getElementById('privacy-section-subtitle').value = section?.subtitle || '';
    document.getElementById('privacy-section-content').innerHTML = window.WarmRightPrivacy.sanitizeHtml(section?.body_html || '');
    document.getElementById('privacy-section-active').checked = section?.is_active ?? true;
    document.getElementById('delete-privacy-section').classList.toggle('privacy-view-hidden', !section);
    setStatus('');
  }

  async function saveSection() {
    const subtitle = document.getElementById('privacy-section-subtitle').value.trim();
    const bodyHtml = window.WarmRightPrivacy.sanitizeHtml(document.getElementById('privacy-section-content').innerHTML);
    if (!subtitle) {
      setStatus('Enter a section subtitle.', true);
      return;
    }
    if (!bodyHtml.replace(/<[^>]+>/g, '').trim()) {
      setStatus('Enter some content for this section.', true);
      return;
    }

    const payload = {
      subtitle,
      body_html: bodyHtml,
      is_active: document.getElementById('privacy-section-active').checked,
      updated_at: new Date().toISOString(),
    };
    let result;
    if (editingId) {
      result = await db.from('privacy_policy_sections').update(payload).eq('id', editingId);
    } else {
      payload.sort_order = sections.length ? Math.max(...sections.map(section => Number(section.sort_order) || 0)) + 10 : 10;
      result = await db.from('privacy_policy_sections').insert(payload);
    }
    if (result.error) {
      setStatus(result.error.message, true);
      return;
    }
    await loadSections(false);
    showList();
    setStatus('Privacy section saved.');
  }

  async function deleteSection() {
    if (!editingId) return;
    const section = sections.find(item => item.id === editingId);
    if (!section || !window.confirm(`Delete "${section.subtitle}"?`)) return;
    const { error } = await db.from('privacy_policy_sections').delete().eq('id', editingId);
    if (error) {
      setStatus(error.message, true);
      return;
    }
    await loadSections(false);
    showList();
    setStatus('Privacy section deleted.');
  }

  async function moveSection(id, direction) {
    const index = sections.findIndex(section => section.id === id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= sections.length) return;
    const reordered = [...sections];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const updates = reordered.map((section, position) => db
      .from('privacy_policy_sections')
      .update({ sort_order: (position + 1) * 10, updated_at: new Date().toISOString() })
      .eq('id', section.id));
    const results = await Promise.all(updates);
    const failed = results.find(result => result.error);
    if (failed) {
      setStatus(failed.error.message, true);
      return;
    }
    await loadSections(false);
    setStatus('Section order saved.');
  }

  function formatContent(command) {
    const editor = document.getElementById('privacy-section-content');
    editor.focus();
    document.execCommand(command, false, null);
  }

  function addLink() {
    const url = window.prompt('Enter the link URL:');
    if (!url) return;
    document.getElementById('privacy-section-content').focus();
    document.execCommand('createLink', false, url.trim());
  }

  document.getElementById('save-privacy-settings').addEventListener('click', saveSettings);
  document.getElementById('export-privacy-json').addEventListener('click', exportPolicyJson);
  document.getElementById('import-privacy-json').addEventListener('click', () => document.getElementById('privacy-json-file').click());
  document.getElementById('privacy-json-file').addEventListener('change', event => importPolicyJsonFile(event.target.files[0]));
  document.getElementById('replace-privacy-draft').addEventListener('click', () => importDraft(true));
  document.getElementById('add-privacy-section').addEventListener('click', () => showEditor());
  document.getElementById('close-privacy-editor').addEventListener('click', showList);
  document.getElementById('cancel-privacy-editor').addEventListener('click', showList);
  document.getElementById('save-privacy-section').addEventListener('click', saveSection);
  document.getElementById('delete-privacy-section').addEventListener('click', deleteSection);
  document.getElementById('privacy-add-link').addEventListener('click', addLink);
  document.getElementById('privacy-remove-link').addEventListener('click', () => formatContent('unlink'));
  document.querySelectorAll('[data-privacy-command]').forEach(button => {
    button.addEventListener('click', () => formatContent(button.dataset.privacyCommand));
  });
  document.getElementById('privacy-sections-body').addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-section]');
    const move = event.target.closest('[data-move-section]');
    if (edit) showEditor(sections.find(section => section.id === edit.dataset.editSection));
    if (move) moveSection(move.dataset.moveSection, move.dataset.direction);
  });

  initialise();
}());
