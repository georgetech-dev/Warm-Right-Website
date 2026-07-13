(function () {
  const SUPABASE_URL = 'https://axampuprcnauxbbijmmt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_NFuFkO0tybTuMvYOQekQmA_62araOjM';
  let db; let session; let rows = []; let activeId = null;

  async function initialise() {
    const lib = window.supabase || window.Supabase; if (!lib) return setTimeout(initialise, 50);
    db = lib.createClient(SUPABASE_URL, SUPABASE_KEY); window.db = db;
    session = await window.requireAdminSession();
    if (!session) return;
    await window.loadAdminHeader(session); document.body.style.visibility = 'visible';
    await Promise.all([loadSettings(), loadCallbacks()]);
  }

  async function loadSettings() {
    const { data, error } = await db.from('site_settings').select('setting_key,setting_value').in('setting_key',['callback_team_email','callback_send_customer_confirmation']);
    if (error) return setStatus('callback-settings-status', error.message, true);
    const settings = Object.fromEntries((data || []).map(row => [row.setting_key,row.setting_value]));
    document.getElementById('callback-team-email').value = settings.callback_team_email || 'info@warmright.uk';
    document.getElementById('callback-customer-confirmation').checked = String(settings.callback_send_customer_confirmation || 'true') === 'true';
  }

  async function saveSettings() {
    const email = document.getElementById('callback-team-email').value.trim();
    if (!validEmail(email)) return setStatus('callback-settings-status','Enter a valid notification email address.',true);
    const updatedAt = new Date().toISOString();
    const { error } = await db.from('site_settings').upsert([
      { setting_key:'callback_team_email', setting_value:email, updated_at:updatedAt },
      { setting_key:'callback_send_customer_confirmation', setting_value:String(document.getElementById('callback-customer-confirmation').checked), updated_at:updatedAt },
    ]);
    setStatus('callback-settings-status', error ? error.message : 'Callback email settings saved.', Boolean(error));
  }

  async function loadCallbacks() {
    const { data, error } = await db.from('callback_requests').select('*').order('created_at',{ascending:false});
    if (error) { document.getElementById('callback-table-body').innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`; return; }
    rows = data || []; renderMetrics(); renderTable();
  }

  function renderMetrics() {
    const today = new Date(); today.setHours(0,0,0,0);
    document.getElementById('metric-pending').textContent = rows.filter(row => row.status === 'pending').length;
    document.getElementById('metric-today').textContent = rows.filter(row => new Date(row.created_at) >= today).length;
    document.getElementById('metric-completed').textContent = rows.filter(row => row.status === 'completed').length;
  }

  function filteredRows() {
    const showCompleted = document.getElementById('show-completed').checked;
    const query = document.getElementById('callback-search').value.trim().toLowerCase();
    return rows.filter(row => (showCompleted || row.status !== 'completed') && (!query || [row.customer_name,row.customer_phone,row.customer_email,row.description].some(value => String(value || '').toLowerCase().includes(query))));
  }

  function renderTable() {
    const visible = filteredRows(); const body = document.getElementById('callback-table-body');
    if (!visible.length) { body.innerHTML = '<tr><td colspan="6">No callback requests match this view.</td></tr>'; return; }
    body.innerHTML = visible.map(row => `<tr><td><strong>${escapeHtml(row.customer_name)}</strong><br><a href="tel:${escapeAttr(phoneHref(row.customer_phone))}">${escapeHtml(row.customer_phone)}</a>${row.customer_email ? `<br><a href="mailto:${escapeAttr(row.customer_email)}">${escapeHtml(row.customer_email)}</a>` : ''}</td><td>${escapeHtml(timeLabel(row.preferred_time))}</td><td><span class="callback-request-summary" title="${escapeAttr(row.description)}">${escapeHtml(row.description)}</span></td><td>${formatDate(row.created_at)}</td><td><span class="callback-pill ${row.status}">${row.status === 'completed' ? 'Completed' : 'Awaiting callback'}</span></td><td><button class="callback-btn secondary" type="button" data-open-callback="${row.id}">Open</button></td></tr>`).join('');
  }

  function openCallback(id) {
    const row = rows.find(item => item.id === id); if (!row) return; activeId = id;
    document.getElementById('callback-modal-title').textContent = `${row.customer_name} - Callback`;
    document.getElementById('callback-details').innerHTML = `${detail('Phone',row.customer_phone)}${detail('Email',row.customer_email || 'Not provided')}${detail('Preferred time',timeLabel(row.preferred_time))}${detail('Received',formatDate(row.created_at))}${detail('Source page',row.source_page || 'Not provided',true)}${detail('Request',row.description,true)}${row.completed_at ? detail('Completed',formatDate(row.completed_at),true) : ''}`;
    document.getElementById('callback-comments').value = row.admin_comments || '';
    const button = document.getElementById('complete-callback'); button.textContent = row.status === 'completed' ? 'Reopen Callback' : 'Complete Callback'; button.classList.toggle('secondary',row.status === 'completed'); button.classList.toggle('primary',row.status !== 'completed');
    setStatus('callback-modal-status',''); document.getElementById('callback-modal').hidden = false;
  }

  function closeModal() { document.getElementById('callback-modal').hidden = true; activeId = null; }
  async function saveComments() { if (!activeId) return; const comments=document.getElementById('callback-comments').value.trim(); const { error }=await db.from('callback_requests').update({admin_comments:comments,updated_at:new Date().toISOString()}).eq('id',activeId); if(error)return setStatus('callback-modal-status',error.message,true); setStatus('callback-modal-status','Comments saved.'); await loadCallbacks(); }
  async function toggleComplete() {
    const row=rows.find(item=>item.id===activeId); if(!row)return; const completing=row.status!=='completed'; const comments=document.getElementById('callback-comments').value.trim();
    const payload={ status:completing?'completed':'pending', admin_comments:comments, completed_at:completing?new Date().toISOString():null, completed_by:completing?(session.user.email||session.user.id):'', updated_at:new Date().toISOString() };
    const { error }=await db.from('callback_requests').update(payload).eq('id',activeId); if(error)return setStatus('callback-modal-status',error.message,true); await loadCallbacks(); closeModal(); setStatus('callback-list-status',completing?'Callback completed.':'Callback reopened.');
  }

  async function sendQueuedEmails() { const button=document.getElementById('send-callback-emails'); button.disabled=true; setStatus('callback-settings-status','Starting email sender...'); try { const {error}=await db.functions.invoke('trigger-email-outbox',{body:{}}); if(error)throw new Error(await functionError(error)); setStatus('callback-settings-status','Email sender started.'); } catch(error) { setStatus('callback-settings-status',error.message,true); } finally { button.disabled=false; } }
  async function functionError(error) { const fallback=error?.message||'Could not start email sender.'; const response=error?.context; if(!response||typeof response.text!=='function')return fallback; try{const text=await response.text();try{const json=JSON.parse(text);return json.error||json.message||fallback;}catch{return text||fallback;}}catch{return fallback;} }

  function detail(label,value,wide=false){return `<div class="callback-detail ${wide?'wide':''}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;}
  function timeLabel(value){return ({asap:'ASAP',morning:'Morning (8am - 12pm)',afternoon:'Afternoon (12pm - 4pm)',evening:'Evening (4pm - 6pm)',anytime:'Anytime (8am - 6pm)'})[value]||value;}
  function formatDate(value){return new Date(value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});}
  function phoneHref(value){return String(value||'').replace(/[^+\d]/g,'');}
  function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function escapeAttr(value){return escapeHtml(value);}
  function setStatus(id,message,error=false){const element=document.getElementById(id);element.textContent=message||'';element.classList.toggle('error',error);}

  document.getElementById('save-callback-settings').addEventListener('click',saveSettings); document.getElementById('send-callback-emails').addEventListener('click',sendQueuedEmails); document.getElementById('callback-search').addEventListener('input',renderTable); document.getElementById('show-completed').addEventListener('change',renderTable); document.getElementById('close-callback-modal').addEventListener('click',closeModal); document.getElementById('save-callback-comments').addEventListener('click',saveComments); document.getElementById('complete-callback').addEventListener('click',toggleComplete); document.getElementById('callback-modal').addEventListener('click',event=>{if(event.target.id==='callback-modal')closeModal();}); document.addEventListener('click',event=>{const button=event.target.closest('[data-open-callback]');if(button)openCallback(button.dataset.openCallback);}); document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.getElementById('callback-modal').hidden)closeModal();});
  initialise();
}());
