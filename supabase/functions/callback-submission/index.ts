import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  cleanText,
  createServiceClient,
  defaultCorsHeaders as corsHeaders,
  enforceRateLimit,
  httpError,
  json,
  requestIp,
  requiredEnv,
} from '../_shared/security.ts';

const HONEYPOT_FIELDS = ['website', 'company', 'url'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') throw httpError('Unsupported method.', 405);
    const body = await req.json();
    const db = createServiceClient();
    await enforceRateLimit({
      db,
      scope: 'callback_submission',
      identifier: requestIp(req) || cleanText(body.customer_phone, 60) || 'anonymous',
      limit: 6,
      windowSeconds: 600,
    });
    const payload = normalisePayload(body);
    const { data: request, error } = await db.from('callback_requests').insert(payload).select('id').single();
    if (error) throw error;

    const { data: settingsRows } = await db.from('site_settings')
      .select('setting_key,setting_value')
      .in('setting_key', ['callback_team_email', 'callback_send_customer_confirmation', 'public_site_base_url']);
    const settings = Object.fromEntries((settingsRows || []).map(row => [row.setting_key, row.setting_value]));
    const publicSiteBaseUrl = configuredSiteBaseUrl(settings);

    await queueTeamEmail(db, request.id, payload, settings.callback_team_email || 'info@warmright.uk', publicSiteBaseUrl);
    if (payload.customer_email && String(settings.callback_send_customer_confirmation || 'true').toLowerCase() === 'true') {
      await queueCustomerEmail(db, request.id, payload, publicSiteBaseUrl);
    }
    try { await triggerEmailOutbox(); }
    catch (error) { console.error('Could not trigger email outbox workflow:', error); }

    return json({ ok: true, id: request.id });
  } catch (error) {
    console.error(error);
    return json({ error: error.message || 'Unexpected error.' }, error.status || 500);
  }
});

function normalisePayload(body: Record<string, unknown>) {
  if (HONEYPOT_FIELDS.some((field) => cleanText(body[field], 120))) {
    throw httpError('This request could not be accepted.', 400);
  }
  const payload = {
    customer_name: cleanText(body.customer_name, 120),
    customer_phone: cleanText(body.customer_phone, 60),
    customer_email: cleanText(body.customer_email, 180).toLowerCase(),
    preferred_time: cleanText(body.preferred_time, 80),
    description: cleanText(body.description, 2000),
    source_page: cleanText(body.source_page, 300),
    status: 'pending',
  };
  if (!payload.customer_name) throw httpError('Your name is required.', 400);
  if (!payload.customer_phone) throw httpError('Your phone number is required.', 400);
  if (payload.customer_email && !validEmail(payload.customer_email)) throw httpError('Enter a valid email address or leave it blank.', 400);
  if (!['asap', 'morning', 'afternoon', 'evening', 'anytime'].includes(payload.preferred_time)) throw httpError('Choose a preferred callback time.', 400);
  if (!payload.description) throw httpError('Tell us briefly how we can help.', 400);
  return payload;
}

async function queueTeamEmail(db: ReturnType<typeof createClient>, requestId: string, payload: ReturnType<typeof normalisePayload>, to: string, publicSiteBaseUrl: string) {
  const adminUrl = `${publicSiteBaseUrl}/admin/callbacks-admin.html`;
  const from = senderAddress();
  const text = [
    'A new callback has been requested.', '',
    `Name: ${payload.customer_name}`, `Phone: ${payload.customer_phone}`,
    `Email: ${payload.customer_email || 'Not provided'}`, `Preferred time: ${payload.preferred_time}`,
    `Request: ${payload.description}`, `Source page: ${payload.source_page || 'Not provided'}`, '',
    `Open callback queue: ${adminUrl}`,
  ].join('\n');
  const html = emailShell(`
    <h1 style="margin:0 0 14px;color:#062940;font-size:25px;">New callback request</h1>
    ${detailRow('Customer', payload.customer_name)}${detailRow('Phone', payload.customer_phone)}${detailRow('Email', payload.customer_email || 'Not provided')}${detailRow('Preferred time', payload.preferred_time)}${detailRow('Source page', payload.source_page || 'Not provided')}
    <div style="margin:20px 0;padding:14px;border-left:4px solid #d97706;background:#f8fafc;"><strong>How can we help?</strong><p style="margin:8px 0 0;line-height:1.6;">${escapeHtml(payload.description)}</p></div>
    <p style="margin:24px 0 0;"><a href="${escapeAttr(adminUrl)}" style="display:inline-block;padding:12px 18px;border-radius:7px;background:#123b75;color:#fff;text-decoration:none;font-weight:bold;">Open Callback Queue</a></p>
  `, `${publicSiteBaseUrl}/assets/images/logo.png`);
  await insertOutbox(db, { related_table:'callback_requests', related_id:requestId, from_email:from, to_email:to, subject:`Callback requested: ${payload.customer_name}`, text_body:text, html_body:html, status:'queued' });
}

async function queueCustomerEmail(db: ReturnType<typeof createClient>, requestId: string, payload: ReturnType<typeof normalisePayload>, publicSiteBaseUrl: string) {
  const text = `Hello ${payload.customer_name},\n\nThank you. Your callback request has been received and a member of the Warm Right team will contact you.\n\nWarm Right Ltd\n0800 756 6748\ninfo@warmright.uk`;
  const html = emailShell(`<h1 style="margin:0 0 14px;color:#062940;font-size:25px;">Callback requested</h1><p>Hello ${escapeHtml(payload.customer_name)},</p><p style="line-height:1.65;">Thank you. Your callback request has been received and a member of the Warm Right team will contact you.</p><p style="margin:22px 0 0;"><strong>Warm Right Ltd</strong><br><a href="tel:08007566748">0800 756 6748</a><br><a href="mailto:info@warmright.uk">info@warmright.uk</a></p>`, `${publicSiteBaseUrl}/assets/images/logo.png`);
  await insertOutbox(db, { related_table:'callback_requests', related_id:requestId, from_email:senderAddress('Warm Right Ltd'), to_email:payload.customer_email, subject:'Your callback request has been received', text_body:text, html_body:html, status:'queued' });
}

function emailShell(body: string, logoUrl: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#10233f;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:12px;overflow:hidden;"><tr><td style="background:#123b75;padding:22px 28px;"><img src="${escapeAttr(logoUrl)}" alt="Warm Right Ltd" style="display:block;max-width:180px;max-height:80px;width:auto;height:auto;background:#fff;border-radius:7px;padding:7px;"></td></tr><tr><td style="padding:30px 28px;font-size:16px;line-height:1.6;">${body}</td></tr></table></td></tr></table></body></html>`;
}

function detailRow(label: string, value: string) { return `<p style="margin:0 0 9px;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`; }
async function insertOutbox(db: ReturnType<typeof createClient>, row: Record<string, unknown>) { const { error } = await db.from('email_outbox').insert(row); if (error) throw error; }
function senderAddress(name = Deno.env.get('SMTP_FROM_NAME') || 'GeorgeTech Support') { const value = Deno.env.get('SMTP_FROM') || 'no-reply@georgetech.uk'; const match = value.match(/<([^>]+)>/); return `${name} <${(match?.[1] || value).trim()}>`; }

function configuredSiteBaseUrl(settings: Record<string, string>) {
  for (const candidate of [settings.public_site_base_url, Deno.env.get('SITE_BASE_URL'), 'https://warmright.uk']) {
    if (!candidate) continue;
    try { const url = new URL(candidate); if (url.protocol === 'https:' && !['localhost','127.0.0.1','::1'].includes(url.hostname.toLowerCase())) return `${url.origin}${url.pathname.replace(/\/+$/, '')}`; }
    catch { /* Try the next value. */ }
  }
  return 'https://warmright.uk';
}

async function triggerEmailOutbox() {
  const owner = Deno.env.get('GITHUB_OWNER'); const repo = Deno.env.get('GITHUB_REPO'); const token = Deno.env.get('GITHUB_TOKEN');
  if (!owner || !repo || !token) return;
  const workflow = Deno.env.get('GITHUB_EMAIL_WORKFLOW') || 'send-email-outbox.yml'; const ref = Deno.env.get('GITHUB_BRANCH') || 'master';
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`, { method:'POST', headers:{ Authorization:`Bearer ${token}`, Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28', 'Content-Type':'application/json' }, body:JSON.stringify({ ref }) });
  if (!response.ok) throw new Error(`Email workflow returned ${response.status}.`);
}

function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value); }
function escapeHtml(value: unknown) { return String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char] || char)); }
function escapeAttr(value: unknown) { return escapeHtml(value).replace(/`/g, '&#96;'); }
