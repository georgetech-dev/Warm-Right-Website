import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') throw httpError('Unsupported method.', 405);
    const payload = normalizePayload(await req.json());
    const db = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'));

    const { data: inserted, error } = await db.from('feedback_surveys').insert(payload).select('id').single();
    if (error) throw error;

    const { data: settingsRows } = await db
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'feedback_team_email',
        'feedback_send_customer_confirmation',
        'feedback_customer_email_sender_name',
        'feedback_customer_email_subject',
        'feedback_customer_email_logo_url',
        'feedback_customer_email_body_html',
        'public_site_base_url',
      ]);
    const settings = Object.fromEntries((settingsRows || []).map(row => [row.setting_key, row.setting_value]));
    const publicSiteBaseUrl = configuredSiteBaseUrl(settings);

    await queueTeamEmail(db, settings.feedback_team_email || 'info@warmright.uk', inserted.id, payload, publicSiteBaseUrl);
    if (String(settings.feedback_send_customer_confirmation || 'true').toLowerCase() === 'true') {
      await queueCustomerConfirmation(db, inserted.id, payload, settings, publicSiteBaseUrl);
    }

    try { await triggerEmailOutbox(); }
    catch (triggerError) { console.error('Could not trigger email outbox workflow:', triggerError); }

    return json({ ok: true, id: inserted.id });
  } catch (error) {
    console.error(error);
    return json({ error: error.message || 'Unexpected error.' }, error.status || 500);
  }
});

function normalizePayload(body: Record<string, unknown>) {
  const jobOrigin = cleanText(body.job_origin, 20) === 'referred' ? 'referred' : 'direct';
  const hasMainBody = jobOrigin === 'referred';
  const payload = {
    customer_name: cleanText(body.customer_name, 120),
    customer_email: cleanText(body.customer_email, 180).toLowerCase(),
    customer_phone: cleanText(body.customer_phone, 60),
    job_number: cleanText(body.job_number, 80),
    customer_address: cleanText(body.customer_address, 300),
    job_origin: jobOrigin,
    has_main_body: hasMainBody,
    engineer_name: cleanText(body.engineer_name, 120),
    engineer_communication: requiredRating(body.engineer_communication, 'Engineer communication rating'),
    engineer_experience: requiredRating(body.engineer_experience, 'Engineer experience rating'),
    engineer_comments: cleanText(body.engineer_comments, 2000),
    insurer_agent_name: hasMainBody ? cleanText(body.insurer_agent_name, 160) : '',
    main_body_communication: hasMainBody ? requiredRating(body.main_body_communication, 'Organisation communication rating') : null,
    main_body_experience: hasMainBody ? requiredRating(body.main_body_experience, 'Organisation experience rating') : null,
    main_body_comments: hasMainBody ? cleanText(body.main_body_comments, 2000) : '',
    final_remarks: cleanText(body.final_remarks, 2000),
    wants_contact: toBoolean(body.wants_contact),
    pass_to_main_body: hasMainBody && toBoolean(body.pass_to_main_body),
    wants_testimonial: toBoolean(body.wants_testimonial),
    consent_publish_testimonial: toBoolean(body.consent_publish_testimonial),
    consent_publish_photos: toBoolean(body.consent_publish_photos),
    consent_marketing: toBoolean(body.consent_marketing),
    consent_share_job_feedback: toBoolean(body.consent_share_job_feedback),
    consent_recorded_at: new Date().toISOString(),
    source: cleanText(body.source, 80) || 'direct',
  };

  if (!payload.customer_name) throw httpError('Name is required.', 400);
  if (!validEmail(payload.customer_email)) throw httpError('A valid email address is required.', 400);
  if (hasMainBody && !payload.insurer_agent_name) throw httpError('The insurer, agent or landlord name is required.', 400);
  return payload;
}

async function queueTeamEmail(db: ReturnType<typeof createClient>, to: string, surveyId: string, payload: ReturnType<typeof normalizePayload>, publicSiteBaseUrl: string) {
  const from = senderAddress();
  const adminUrl = `${publicSiteBaseUrl}/admin/feedback-admin.html`;
  const organisationLines = payload.has_main_body ? [
    `Organisation: ${payload.insurer_agent_name}`,
    `Organisation communication: ${payload.main_body_communication}/5`,
    `Organisation experience: ${payload.main_body_experience}/5`,
    `Pass information to organisation: ${payload.pass_to_main_body ? 'Yes' : 'No'}`,
    `Organisation comments: ${payload.main_body_comments || 'None'}`,
  ] : ['Booking route: Directly with Warm Right Ltd'];
  const text = [
    'A new Warm Right feedback survey has been submitted.', '',
    `Name: ${payload.customer_name}`, `Email: ${payload.customer_email}`,
    `Phone: ${payload.customer_phone || 'Not provided'}`, `Job number: ${payload.job_number || 'Not provided'}`,
    `Address: ${payload.customer_address || 'Not provided'}`, `Engineer: ${payload.engineer_name || 'Not provided'}`,
    `Engineer communication: ${payload.engineer_communication}/5`, `Engineer experience: ${payload.engineer_experience}/5`,
    `Engineer comments: ${payload.engineer_comments || 'None'}`, '', ...organisationLines, '',
    `Final remarks: ${payload.final_remarks || 'None'}`, `Customer service contact requested: ${payload.wants_contact ? 'Yes' : 'No'}`,
    `Would like to leave a website review: ${payload.wants_testimonial ? 'Yes' : 'No'}`,
    `Publish testimonial, display name and rating: ${payload.consent_publish_testimonial ? 'Yes' : 'No'}`,
    `Publish uploaded photographs: ${payload.consent_publish_photos ? 'Yes' : 'No'}`,
    `Use testimonial and photographs in wider marketing: ${payload.consent_marketing ? 'Yes' : 'No'}`,
    `Share job feedback with connected organisation: ${payload.consent_share_job_feedback ? 'Yes' : 'No'}`,
    '', `Admin: ${adminUrl}`,
  ].join('\n');

  await insertOutbox(db, {
    related_table: 'feedback_surveys', related_id: surveyId, from_email: from, to_email: to,
    subject: `New feedback survey: ${payload.customer_name}`, text_body: text,
    html_body: buildTeamHtml(payload, adminUrl), status: 'queued',
  });
}

async function queueCustomerConfirmation(
  db: ReturnType<typeof createClient>,
  surveyId: string,
  payload: ReturnType<typeof normalizePayload>,
  settings: Record<string, string>,
  publicSiteBaseUrl: string,
) {
  const fromAddress = emailAddressOnly(Deno.env.get('SMTP_FROM') || 'support@georgetech.uk');
  const senderName = cleanText(settings.feedback_customer_email_sender_name, 120) || 'Warm Right Ltd';
  const from = `${senderName} <${fromAddress}>`;
  const values = customerTemplateValues(payload);
  const subjectTemplate = settings.feedback_customer_email_subject || 'Thank you for your feedback, {customer_name}';
  const bodyTemplate = settings.feedback_customer_email_body_html || '<h1>Thank you for your feedback</h1><p>Hello {customer_name},</p><p>Thank you for sharing your experience with Warm Right Ltd. Your response has been received by our team.</p><p>If you would like to talk to us, call <strong>0800 756 6748</strong> or email <a href="mailto:info@warmright.uk">info@warmright.uk</a>.</p>';
  const logoSetting = settings.feedback_customer_email_logo_url ?? 'assets/images/logo.png';
  const renderedBody = resolveTemplateUrls(renderTemplate(bodyTemplate, values, true), publicSiteBaseUrl);
  const subject = renderTemplate(subjectTemplate, values, false).replace(/[\r\n]+/g, ' ').slice(0, 200);
  const html = buildCustomerEmailShell(renderedBody, resolveSiteAssetUrl(logoSetting, publicSiteBaseUrl));
  const text = htmlToText(renderedBody);
  await insertOutbox(db, {
    related_table: 'feedback_surveys', related_id: surveyId, from_email: from, to_email: payload.customer_email,
    subject, text_body: text, html_body: html, status: 'queued',
  });
}

function customerTemplateValues(payload: ReturnType<typeof normalizePayload>) {
  return {
    customer_name: payload.customer_name,
    customer_email: payload.customer_email,
    customer_phone: payload.customer_phone || 'Not provided',
    job_number: payload.job_number || 'Not provided',
    customer_address: payload.customer_address || 'Not provided',
    engineer_name: payload.engineer_name || 'Not provided',
    engineer_communication: `${payload.engineer_communication}/5`,
    engineer_experience: `${payload.engineer_experience}/5`,
    insurer_agent_name: payload.insurer_agent_name || 'Not applicable',
    final_remarks: payload.final_remarks || 'None',
  };
}

function renderTemplate(template: string, values: Record<string, string>, html: boolean) {
  return String(template || '').replace(/\{([a-z0-9_]+)\}/gi, (match, key) => {
    if (!(key in values)) return match;
    const value = String(values[key] || '');
    return html ? escapeHtml(value).replace(/\n/g, '<br>') : value;
  });
}

function resolveSiteAssetUrl(path: string, publicSiteBaseUrl: string) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) {
    try {
      const parsed = new URL(path);
      if (!isLocalHostname(parsed.hostname)) return path;
      return `${publicSiteBaseUrl}${parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`}`;
    } catch { return ''; }
  }
  return `${publicSiteBaseUrl}/${path.replace(/^\/+/, '')}`;
}

function resolveTemplateUrls(value: string, publicSiteBaseUrl: string) {
  return String(value || '')
    .replace(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/gi, publicSiteBaseUrl)
    .replace(/(href|src)=(['"])\/(?!\/)/gi, `$1=$2${publicSiteBaseUrl}/`);
}

function configuredSiteBaseUrl(settings: Record<string, string>) {
  const candidates = [settings.public_site_base_url, Deno.env.get('SITE_BASE_URL'), 'https://warmright.uk'];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'https:' || isLocalHostname(parsed.hostname)) continue;
      return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
    } catch { /* Try the next configured value. */ }
  }
  return 'https://warmright.uk';
}

function isLocalHostname(hostname: string) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname.toLowerCase());
}

function buildCustomerEmailShell(bodyHtml: string, logoUrl: string) {
  const logo = logoUrl ? `<tr><td style="background:#123b75;padding:22px 28px;"><img src="${escapeAttr(logoUrl)}" alt="Warm Right Ltd" style="display:block;max-width:180px;max-height:80px;width:auto;height:auto;background:#fff;border-radius:7px;padding:7px;"></td></tr>` : '';
  return `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#10233f;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.08);">${logo}<tr><td style="padding:30px 28px;font-size:16px;line-height:1.65;color:#10233f;">${bodyHtml}</td></tr></table></td></tr></table></body></html>`;
}

function htmlToText(value: string) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|h1|h2|h3|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildTeamHtml(payload: ReturnType<typeof normalizePayload>, adminUrl: string) {
  const rows: Array<[string, unknown]> = [
    ['Customer', payload.customer_name], ['Email', payload.customer_email], ['Phone', payload.customer_phone || 'Not provided'],
    ['Job number', payload.job_number || 'Not provided'], ['Address', payload.customer_address || 'Not provided'],
    ['Booking route', payload.has_main_body ? 'Insurer, agent or landlord' : 'Direct to Warm Right Ltd'],
    ['Engineer', payload.engineer_name || 'Not provided'], ['Engineer communication', `${payload.engineer_communication}/5`],
    ['Engineer experience', `${payload.engineer_experience}/5`],
  ];
  if (payload.has_main_body) rows.push(
    ['Organisation', payload.insurer_agent_name], ['Organisation communication', `${payload.main_body_communication}/5`],
    ['Organisation experience', `${payload.main_body_experience}/5`], ['Pass information to organisation', payload.pass_to_main_body ? 'Yes' : 'No'],
  );
  rows.push(
    ['Customer service contact requested', payload.wants_contact ? 'Yes' : 'No'],
    ['Website review requested', payload.wants_testimonial ? 'Yes' : 'No'],
    ['Publish testimonial', payload.consent_publish_testimonial ? 'Yes' : 'No'],
    ['Publish photographs', payload.consent_publish_photos ? 'Yes' : 'No'],
    ['Wider marketing use', payload.consent_marketing ? 'Yes' : 'No'],
    ['Share with connected organisation', payload.consent_share_job_feedback ? 'Yes' : 'No'],
  );
  return `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#10233f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;"><tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#123b75;color:#fff;padding:24px 28px;"><h1 style="margin:0;font-size:24px;">New feedback survey</h1></td></tr>
        <tr><td style="padding:26px 28px;">${rows.map(([label, value]) => `<p style="margin:0 0 10px;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('')}
          ${commentBlock('Engineer comments', payload.engineer_comments)}
          ${payload.has_main_body ? commentBlock('Organisation comments', payload.main_body_comments) : ''}
          ${commentBlock('Final remarks', payload.final_remarks)}
          <p style="margin:24px 0 0;"><a href="${escapeAttr(adminUrl)}" style="display:inline-block;background:#123b75;color:#fff;padding:12px 18px;border-radius:7px;text-decoration:none;font-weight:bold;">Open Feedback Dashboard</a></p>
        </td></tr></table></td></tr></table></body></html>`;
}

async function insertOutbox(db: ReturnType<typeof createClient>, row: Record<string, unknown>) {
  const { error } = await db.from('email_outbox').insert(row);
  if (error) throw error;
}

function commentBlock(label: string, value: string) {
  if (!value) return '';
  return `<div style="margin:18px 0;padding:14px;border-left:4px solid #ffb000;background:#f8fbff;"><strong>${escapeHtml(label)}</strong><p style="margin:8px 0 0;line-height:1.6;">${escapeHtml(value)}</p></div>`;
}

async function triggerEmailOutbox() {
  const owner = Deno.env.get('GITHUB_OWNER'); const repo = Deno.env.get('GITHUB_REPO'); const token = Deno.env.get('GITHUB_TOKEN');
  if (!owner || !repo || !token) return;
  const workflow = Deno.env.get('GITHUB_EMAIL_WORKFLOW') || 'send-email-outbox.yml';
  const ref = Deno.env.get('GITHUB_BRANCH') || 'master';
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref }),
  });
  if (!response.ok) throw new Error(`Email workflow returned ${response.status}.`);
}

function senderAddress() {
  const address = emailAddressOnly(Deno.env.get('SMTP_FROM') || 'support@georgetech.uk');
  return `${Deno.env.get('SMTP_FROM_NAME') || 'GeorgeTech Support'} <${address}>`;
}
function requiredRating(value: unknown, label: string) { const number = Number(value); if (!Number.isInteger(number) || number < 1 || number > 5) throw httpError(`${label} is required.`, 400); return number; }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value); }
function toBoolean(value: unknown) { return value === true || value === 'true' || value === 'yes' || value === '1'; }
function cleanText(value: unknown, maxLength: number) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength); }
function emailAddressOnly(value: string) { const match = value.match(/<([^>]+)>/); return (match?.[1] || value).trim(); }
function escapeHtml(value: unknown) { return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char)); }
function escapeAttr(value: unknown) { return escapeHtml(value).replace(/`/g, '&#96;'); }
function requiredEnv(name: string) { const value = Deno.env.get(name); if (!value) throw httpError(`${name} is not configured.`, 500); return value; }
function httpError(message: string, status: number) { return Object.assign(new Error(message), { status }); }
function json(payload: unknown, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
