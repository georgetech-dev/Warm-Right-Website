(function () {
  const SUPABASE_URL = 'https://axampuprcnauxbbijmmt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_NFuFkO0tybTuMvYOQekQmA_62araOjM';
  let feedbackRows = [];
  let db;

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function yesNo(value) { return value ? 'Yes' : 'No'; }
  function score(value) { return value == null ? 'Not applicable' : `${value}/5`; }
  function formatDate(value) { return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }); }

  async function initialise() {
    const lib = window.supabase || window.Supabase;
    if (!lib) return setTimeout(initialise, 50);
    db = lib.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.db = db;
    const { data: { session } } = await db.auth.getSession();
    if (!session) return window.location.href = 'login.html';
    await window.loadAdminHeader(session);
    document.body.style.visibility = 'visible';
    await Promise.all([loadSettings(), loadFeedback()]);
  }

  async function loadSettings() {
    const { data, error } = await db.from('site_settings').select('setting_key, setting_value').in('setting_key', ['feedback_team_email', 'feedback_send_customer_confirmation']);
    if (error) return setSettingsStatus(error.message, true);
    const settings = Object.fromEntries((data || []).map(row => [row.setting_key, row.setting_value]));
    document.getElementById('feedback-team-email').value = settings.feedback_team_email || 'info@warmright.uk';
    document.getElementById('feedback-customer-confirmation').checked = String(settings.feedback_send_customer_confirmation || 'true') === 'true';
  }

  async function saveSettings() {
    const email = document.getElementById('feedback-team-email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) return setSettingsStatus('Enter a valid forwarding email address.', true);
    const rows = [
      { setting_key: 'feedback_team_email', setting_value: email, updated_at: new Date().toISOString() },
      { setting_key: 'feedback_send_customer_confirmation', setting_value: String(document.getElementById('feedback-customer-confirmation').checked), updated_at: new Date().toISOString() },
    ];
    const { error } = await db.from('site_settings').upsert(rows);
    setSettingsStatus(error ? error.message : 'Feedback email settings saved.', Boolean(error));
  }

  async function loadFeedback() {
    const { data, error } = await db.from('feedback_surveys').select('*').order('created_at', { ascending: false });
    if (error) {
      document.getElementById('feedback-table-body').innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
      return;
    }
    feedbackRows = data || [];
    renderMetrics();
    renderTable(feedbackRows);
  }

  function renderMetrics() {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const average = feedbackRows.length ? feedbackRows.reduce((sum, row) => sum + ((Number(row.engineer_communication) + Number(row.engineer_experience)) / 2), 0) / feedbackRows.length : 0;
    document.getElementById('metric-total').textContent = feedbackRows.length;
    document.getElementById('metric-recent').textContent = feedbackRows.filter(row => new Date(row.created_at).getTime() >= cutoff).length;
    document.getElementById('metric-direct').textContent = feedbackRows.filter(row => !row.has_main_body && row.job_origin !== 'referred').length;
    document.getElementById('metric-referred').textContent = feedbackRows.filter(row => row.has_main_body || row.job_origin === 'referred').length;
    document.getElementById('metric-engineer').textContent = average ? `${average.toFixed(1)}/5` : '-';
  }

  function renderTable(rows) {
    const body = document.getElementById('feedback-table-body');
    if (!rows.length) { body.innerHTML = '<tr><td colspan="7">No feedback submissions found.</td></tr>'; return; }
    body.innerHTML = rows.map(row => {
      const referred = row.has_main_body || row.job_origin === 'referred';
      const engineerAverage = ((Number(row.engineer_communication) + Number(row.engineer_experience)) / 2).toFixed(1);
      return `<tr><td><strong>${escapeHtml(row.customer_name)}</strong><br><small>${escapeHtml(row.customer_email)}</small></td><td>${formatDate(row.created_at)}</td><td><span class="route-pill">${referred ? 'Contracted' : 'Direct'}</span></td><td class="score">${engineerAverage}/5</td><td class="${row.wants_contact ? 'yes' : 'no'}">${yesNo(row.wants_contact)}</td><td class="${row.wants_testimonial ? 'yes' : 'no'}">${yesNo(row.wants_testimonial)}</td><td><div class="feedback-row-actions"><button class="admin-button secondary" type="button" data-view-feedback="${row.id}">View</button><button class="admin-button danger" type="button" data-delete-feedback="${row.id}">Delete</button></div></td></tr>`;
    }).join('');
  }

  function detailItem(label, value, full = false) { return `<div class="detail-item ${full ? 'full' : ''}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value || 'Not provided')}</span></div>`; }
  function openDetails(id) {
    const row = feedbackRows.find(item => item.id === id);
    if (!row) return;
    const referred = row.has_main_body || row.job_origin === 'referred';
    document.getElementById('feedback-modal-title').textContent = `${row.customer_name} - Feedback`;
    document.getElementById('feedback-detail').innerHTML = `
      <section class="detail-section"><h3>Customer</h3><div class="detail-grid">${detailItem('Email', row.customer_email)}${detailItem('Phone', row.customer_phone)}${detailItem('Job number', row.job_number)}${detailItem('Address', row.customer_address, true)}${detailItem('Booking route', referred ? 'Insurer, agent or landlord' : 'Direct to Warm Right Ltd', true)}</div></section>
      <section class="detail-section"><h3>Engineer</h3><div class="detail-grid">${detailItem('Engineer name', row.engineer_name)}${detailItem('Communication', score(row.engineer_communication))}${detailItem('Overall experience', score(row.engineer_experience))}${detailItem('Comments or message', row.engineer_comments, true)}</div></section>
      ${referred ? `<section class="detail-section"><h3>Insurer, Agent or Landlord</h3><div class="detail-grid">${detailItem('Organisation', row.insurer_agent_name)}${detailItem('Communication', score(row.main_body_communication))}${detailItem('Overall experience', score(row.main_body_experience))}${detailItem('Pass information on', yesNo(row.pass_to_main_body))}${detailItem('Comments', row.main_body_comments, true)}</div></section>` : ''}
      <section class="detail-section"><h3>Final Remarks</h3><div class="detail-grid">${detailItem('Final remarks', row.final_remarks, true)}${detailItem('Contact requested', yesNo(row.wants_contact))}${detailItem('Website review', yesNo(row.wants_testimonial))}${detailItem('Submitted', formatDate(row.created_at))}</div></section>`;
    document.getElementById('feedback-modal').classList.add('open');
  }

  function closeModal() { document.getElementById('feedback-modal').classList.remove('open'); }
  function setSettingsStatus(message, isError = false) { const status = document.getElementById('settings-status'); status.textContent = message; status.style.color = isError ? '#b42318' : '#166534'; }

  async function getFunctionErrorMessage(error) {
    const fallback = error?.message || 'Could not start the email sender.';
    const response = error?.context;
    if (!response || typeof response.text !== 'function') return fallback;

    try {
      const body = await response.text();
      if (!body) return fallback;
      try {
        const detail = JSON.parse(body);
        return detail.error || detail.message || fallback;
      } catch {
        return body.slice(0, 500);
      }
    } catch {
      return fallback;
    }
  }

  async function sendQueuedEmails() {
    const button = document.getElementById('send-queued');
    button.disabled = true;
    setSettingsStatus('Starting email sender...');

    try {
      const { error } = await db.functions.invoke('trigger-email-outbox', { body: {} });
      if (error) {
        setSettingsStatus(await getFunctionErrorMessage(error), true);
        return;
      }
      setSettingsStatus('Email sender started. Queued messages will be processed shortly.');
    } catch (error) {
      setSettingsStatus(error?.message || 'Could not start the email sender.', true);
    } finally {
      button.disabled = false;
    }
  }

  async function openCustomerEmailEditor() {
    const { data } = await db.auth.getSession();
    window.customerEmailEditor.open({
      db,
      session: data.session,
      templateType: 'feedback',
    });
  }

  async function deleteFeedback(id) {
    const row = feedbackRows.find(item => item.id === id);
    if (!row) return;
    if (!window.confirm(`Delete the feedback submitted by ${row.customer_name}? This cannot be undone.`)) return;

    const { error: outboxError } = await db
      .from('email_outbox')
      .delete()
      .eq('related_table', 'feedback_surveys')
      .eq('related_id', id)
      .in('status', ['queued', 'failed']);
    if (outboxError) {
      window.alert(`The feedback was not deleted: ${outboxError.message}`);
      return;
    }

    const { error } = await db.from('feedback_surveys').delete().eq('id', id);
    if (error) {
      window.alert(`The feedback was not deleted: ${error.message}`);
      return;
    }
    closeModal();
    await loadFeedback();
  }

  document.getElementById('save-settings').addEventListener('click', saveSettings);
  document.getElementById('customise-feedback-email').addEventListener('click', openCustomerEmailEditor);
  document.getElementById('send-queued').addEventListener('click', sendQueuedEmails);
  document.getElementById('feedback-search').addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();
    renderTable(feedbackRows.filter(row => [row.customer_name, row.customer_email, row.job_number, row.insurer_agent_name].some(value => String(value || '').toLowerCase().includes(query))));
  });
  document.addEventListener('click', event => {
    const view = event.target.closest('[data-view-feedback]');
    const remove = event.target.closest('[data-delete-feedback]');
    if (view) openDetails(view.dataset.viewFeedback);
    if (remove) deleteFeedback(remove.dataset.deleteFeedback);
    if (event.target.matches('.modal-close') || event.target.id === 'feedback-modal') closeModal();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
  initialise();
}());
