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

type SubmittedImage = {
  name: string;
  type: string;
  base64: string;
};

const PERMISSION_WORDING_VERSION = 'testimonial-permissions-v1.0-2026-07';
const HONEYPOT_FIELDS = ['website', 'company', 'url'];
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') throw httpError('Unsupported method.', 405);

    const body = await req.json();
    const db = createServiceClient();
    await enforceRateLimit({
      db,
      scope: 'testimonial_submission',
      identifier: requestIp(req) || cleanText(body.customer_email, 180) || 'anonymous',
      limit: 5,
      windowSeconds: 900,
    });
    const payload = normalizePayload(body);
    const imageUrls = await uploadImages(db, payload.images);

    const { data: settingsRows } = await db
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'testimonial_team_email',
        'testimonial_customer_email_sender_name',
        'testimonial_customer_email_subject',
        'testimonial_customer_email_logo_url',
        'testimonial_customer_email_body_html',
        'public_site_base_url',
      ]);

    const settings = Object.fromEntries((settingsRows || []).map(row => [row.setting_key, row.setting_value]));
    const teamEmail = settings.testimonial_team_email || 'info@warmright.uk';
    const publicSiteBaseUrl = configuredSiteBaseUrl(settings);
    const { data: submission, error } = await db.from('testimonial_submissions').insert({
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      customer_phone: payload.customer_phone,
      job_number: payload.job_number,
      customer_address: payload.customer_address,
      rating: payload.rating,
      subject: payload.subject,
      content: payload.content,
      image_urls: imageUrls,
      permission_wording_version: payload.permission_wording_version,
      permission_recorded_at: payload.permission_recorded_at,
      publish_testimonial: payload.publish_testimonial,
      publish_photos: payload.publish_photos,
      wider_use_testimonial: payload.wider_use_testimonial,
      wider_use_photos: payload.wider_use_photos,
      share_feedback_with_job_organisation: payload.share_feedback_with_job_organisation,
      photo_rights_confirmed: payload.photo_rights_confirmed,
      consent_publish_testimonial: payload.publish_testimonial,
      consent_publish_photos: payload.publish_photos,
      consent_marketing: payload.wider_use_testimonial || payload.wider_use_photos,
      consent_share_job_feedback: payload.share_feedback_with_job_organisation,
      photo_upload_declaration_accepted: payload.photo_rights_confirmed,
      consent_recorded_at: payload.permission_recorded_at,
      status: 'pending',
      publication_status: 'awaiting_review',
    }).select('id').single();

    if (error) throw error;

    await queueTeamEmail(db, teamEmail, submission.id, payload, imageUrls, publicSiteBaseUrl);
    await queueCustomerThankYouEmail(db, submission.id, payload, settings, publicSiteBaseUrl);
    try {
      await triggerEmailOutbox();
    } catch (triggerErr) {
      console.error('Could not trigger email outbox workflow:', triggerErr);
    }

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: err.message || 'Unexpected error.' }, err.status || 500);
  }
});

function normalizePayload(body: Record<string, unknown>) {
  if (HONEYPOT_FIELDS.some((field) => cleanText(body[field], 120))) {
    throw httpError('This request could not be accepted.', 400);
  }
  const customer_name = cleanText(body.customer_name, 120);
  const customer_email = cleanText(body.customer_email, 180);
  const customer_phone = cleanText(body.customer_phone, 60);
  const job_number = cleanText(body.job_number, 80);
  const customer_address = cleanText(body.customer_address, 300);
  const subject = cleanText(body.subject, 120);
  const content = cleanText(body.content, 1800);
  const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
  const images = Array.isArray(body.images) ? body.images.slice(0, 4) as SubmittedImage[] : [];
  const permission_wording_version = cleanText(body.permission_wording_version, 80) || PERMISSION_WORDING_VERSION;
  const permission_recorded_at = new Date().toISOString();
  const publish_testimonial = toBoolean(body.publish_testimonial ?? body.consent_publish_testimonial);
  const publish_photos = images.length ? toBoolean(body.publish_photos ?? body.consent_publish_photos) : false;
  const wider_use_testimonial = toBoolean(body.wider_use_testimonial ?? body.consent_marketing);
  const wider_use_photos = images.length ? toBoolean(body.wider_use_photos ?? body.consent_marketing) : false;
  const share_feedback_with_job_organisation = toBoolean(body.share_feedback_with_job_organisation ?? body.consent_share_job_feedback);
  const photo_rights_confirmed = images.length ? toBoolean(body.photo_rights_confirmed ?? body.photo_upload_declaration_accepted) : false;

  if (!customer_name) throw httpError('Customer name is required.', 400);
  if (!customer_email || !customer_email.includes('@')) throw httpError('A valid email is required.', 400);
  if (!subject) throw httpError('Short title is required.', 400);
  if (!content) throw httpError('Testimonial content is required.', 400);
  if (images.length && !photo_rights_confirmed) {
    throw httpError('The photograph upload declaration must be accepted before photos can be submitted.', 400);
  }

  return {
    customer_name, customer_email, customer_phone, job_number, customer_address,
    subject, content, rating, images, permission_wording_version, permission_recorded_at,
    publish_testimonial, publish_photos, wider_use_testimonial, wider_use_photos,
    share_feedback_with_job_organisation, photo_rights_confirmed,
  };
}

async function uploadImages(db: ReturnType<typeof createClient>, images: SubmittedImage[]) {
  const urls: string[] = [];

  for (const image of images) {
    if (!image.base64 || !ALLOWED_IMAGE_TYPES.has(String(image.type || '').toLowerCase())) continue;
    if (image.base64.length > 1_800_000) {
      throw httpError('One of the uploaded photos is too large. Please choose a smaller image.', 413);
    }
    const extension = extensionFromName(image.name, image.type);
    const fileName = `pending/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const bytes = Uint8Array.from(atob(image.base64), (char) => char.charCodeAt(0));

    const { error } = await db.storage
      .from('testimonial-images')
      .upload(fileName, bytes, { contentType: image.type, upsert: false });

    if (error) throw error;
    const { data } = db.storage.from('testimonial-images').getPublicUrl(fileName);
    urls.push(data.publicUrl);
  }

  return urls;
}

async function queueTeamEmail(
  db: ReturnType<typeof createClient>,
  to: string,
  submissionId: string,
  payload: ReturnType<typeof normalizePayload>,
  imageUrls: string[],
  publicSiteBaseUrl: string,
) {
  const fromAddress = emailAddressOnly(Deno.env.get('SMTP_FROM') || 'support@georgetech.uk');
  const from = `${Deno.env.get('SMTP_FROM_NAME') || 'GeorgeTech Support'} <${fromAddress}>`;
  const imageList = imageUrls.length ? imageUrls.map((url) => `- ${url}`).join('\n') : 'No photos uploaded.';
  const adminUrl = `${publicSiteBaseUrl}/admin/testimonials-admin.html`;
  const logoUrl = `${publicSiteBaseUrl}/assets/images/logo.png`;
  const plainText = [
    `A new customer testimonial is waiting for admin approval.`,
    ``,
    `This testimonial is not live on the website yet.`,
    ``,
    `Name: ${payload.customer_name}`,
    `Email: ${payload.customer_email}`,
    `Phone: ${payload.customer_phone || 'Not provided'}`,
    `Job number: ${payload.job_number || 'Not provided'}`,
    `Address: ${payload.customer_address || 'Not provided'}`,
    `Rating: ${payload.rating}/5`,
    `Subject: ${payload.subject || 'Not provided'}`,
    `Permission wording version: ${payload.permission_wording_version}`,
    `Permission recorded at: ${payload.permission_recorded_at}`,
    `Publish testimonial, title, display name and rating: ${yesNo(payload.publish_testimonial)}`,
    `Publish uploaded photographs: ${yesNo(payload.publish_photos)}`,
    `Use testimonial elsewhere: ${yesNo(payload.wider_use_testimonial)}`,
    `Use photographs elsewhere: ${yesNo(payload.wider_use_photos)}`,
    `Share job feedback with connected organisation: ${yesNo(payload.share_feedback_with_job_organisation)}`,
    `Photograph rights confirmed: ${yesNo(payload.photo_rights_confirmed)}`,
    ``,
    payload.content,
    ``,
    `Photos:`,
    imageList,
    ``,
    `Review and approve it here: ${adminUrl}`,
  ].join('\n');

  const { error } = await db.from('email_outbox').insert({
    related_table: 'testimonial_submissions',
    related_id: submissionId,
    from_email: from,
    to_email: to,
    subject: `New testimonial pending: ${payload.customer_name}`,
    text_body: plainText,
    html_body: buildTestimonialEmailHtml({ payload, imageUrls, adminUrl, logoUrl }),
    status: 'queued',
  });

  if (error) console.error('Could not queue testimonial email:', error);
}

async function queueCustomerThankYouEmail(
  db: ReturnType<typeof createClient>,
  submissionId: string,
  payload: ReturnType<typeof normalizePayload>,
  settings: Record<string, string>,
  publicSiteBaseUrl: string,
) {
  const fromAddress = emailAddressOnly(Deno.env.get('SMTP_FROM') || 'support@georgetech.uk');
  const senderName = cleanText(settings.testimonial_customer_email_sender_name, 120) || 'Warm Right Ltd';
  const from = `${senderName} <${fromAddress}>`;
  const values = customerTemplateValues(payload);
  const subjectTemplate = settings.testimonial_customer_email_subject || 'Thank you for your feedback, {customer_name}';
  const bodyTemplate = settings.testimonial_customer_email_body_html || '<h1>Thank you for your feedback</h1><p>Hello {customer_name},</p><p>Thank you for sharing your testimonial with Warm Right Ltd.</p><p>If you would like to talk to us, call <strong>0800 756 6748</strong> or email <a href="mailto:info@warmright.uk">info@warmright.uk</a>.</p>';
  const logoSetting = settings.testimonial_customer_email_logo_url ?? 'assets/images/logo.png';
  const renderedBody = resolveTemplateUrls(renderTemplate(bodyTemplate, values, true), publicSiteBaseUrl);
  const subject = renderTemplate(subjectTemplate, values, false).replace(/[\r\n]+/g, ' ').slice(0, 200);
  const html = buildCustomerEmailShell(renderedBody, resolveSiteAssetUrl(logoSetting, publicSiteBaseUrl));
  const text = htmlToText(renderedBody);

  const { error } = await db.from('email_outbox').insert({
    related_table: 'testimonial_submissions',
    related_id: submissionId,
    from_email: from,
    to_email: payload.customer_email,
    subject,
    text_body: text,
    html_body: html,
    status: 'queued',
  });

  if (error) console.error('Could not queue customer thank you email:', error);
}

function customerTemplateValues(payload: ReturnType<typeof normalizePayload>) {
  return {
    customer_name: payload.customer_name,
    customer_email: payload.customer_email,
    customer_phone: payload.customer_phone || 'Not provided',
    job_number: payload.job_number || 'Not provided',
    customer_address: payload.customer_address || 'Not provided',
    testimonial_title: payload.subject,
    testimonial_content: payload.content,
    rating: `${payload.rating}/5`,
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

async function triggerEmailOutbox() {
  const owner = Deno.env.get('GITHUB_OWNER');
  const repo = Deno.env.get('GITHUB_REPO');
  const token = Deno.env.get('GITHUB_TOKEN');
  if (!owner || !repo || !token) {
    console.warn('GitHub workflow secrets are not configured; email remains queued.');
    return;
  }

  const workflow = Deno.env.get('GITHUB_EMAIL_WORKFLOW') || 'send-email-outbox.yml';
  const ref = Deno.env.get('GITHUB_BRANCH') || 'master';
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    console.error(`GitHub workflow dispatch failed (${response.status}): ${detail}`);
  }
}

function emailAddressOnly(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
}

function buildTestimonialEmailHtml(options: {
  payload: ReturnType<typeof normalizePayload>;
  imageUrls: string[];
  adminUrl: string;
  logoUrl: string;
}) {
  const { payload, imageUrls, adminUrl, logoUrl } = options;
  const photosHtml = imageUrls.length
    ? imageUrls.map((url) => `
      <a href="${escapeAttr(url)}" style="display:inline-block;margin:0 10px 10px 0;text-decoration:none;">
        <img src="${escapeAttr(url)}" alt="Customer uploaded photo" style="width:130px;height:100px;object-fit:cover;border-radius:8px;border:1px solid #dbe4ef;">
      </a>
    `).join('')
    : '<p style="margin:0;color:#64748b;">No photos were uploaded with this testimonial.</p>';

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#10233f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:#123b75;padding:22px 26px;">
                <img src="${escapeAttr(logoUrl)}" alt="Warm Right Ltd" style="max-width:170px;height:auto;display:block;background:#ffffff;border-radius:8px;padding:8px;">
              </td>
            </tr>
            <tr>
              <td style="padding:28px 30px 12px;">
                <p style="display:inline-block;margin:0 0 14px;padding:7px 12px;border-radius:999px;background:#fff7ed;color:#c2410c;font-weight:700;font-size:13px;">
                  Awaiting admin approval
                </p>
                <h1 style="margin:0 0 10px;color:#062940;font-size:26px;line-height:1.2;">New testimonial submitted</h1>
                <p style="margin:0;color:#475569;font-size:16px;line-height:1.6;">
                  A customer has sent a testimonial. It has been saved in WarmHub under Pending Authorisation and is <strong>not live on the website yet</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 30px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                  ${detailRow('Customer', payload.customer_name)}
                  ${detailRow('Email', payload.customer_email)}
                  ${detailRow('Phone', payload.customer_phone || 'Not provided')}
                  ${detailRow('Job number', payload.job_number || 'Not provided')}
                  ${detailRow('Address', payload.customer_address || 'Not provided')}
                  ${detailRow('Rating', `${payload.rating}/5`)}
                  ${detailRow('Subject', payload.subject || 'Not provided')}
                  ${detailRow('Permission wording version', payload.permission_wording_version)}
                  ${detailRow('Permission recorded at', payload.permission_recorded_at)}
                  ${detailRow('Publish testimonial', yesNo(payload.publish_testimonial))}
                  ${detailRow('Publish photographs', yesNo(payload.publish_photos))}
                  ${detailRow('Use testimonial elsewhere', yesNo(payload.wider_use_testimonial))}
                  ${detailRow('Use photographs elsewhere', yesNo(payload.wider_use_photos))}
                  ${detailRow('Share with connected organisation', yesNo(payload.share_feedback_with_job_organisation))}
                  ${detailRow('Photo rights confirmed', yesNo(payload.photo_rights_confirmed))}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 0;">
                <h2 style="margin:0 0 10px;color:#062940;font-size:18px;">Testimonial</h2>
                <div style="background:#ffffff;border-left:4px solid #2a7886;padding:14px 16px;color:#10233f;font-size:16px;line-height:1.7;">
                  ${escapeHtml(payload.content).replace(/\n/g, '<br>')}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px 0;">
                <h2 style="margin:0 0 12px;color:#062940;font-size:18px;">Photos</h2>
                ${photosHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:26px 30px 32px;">
                <a href="${escapeAttr(adminUrl)}" style="display:inline-block;background:#123b75;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;padding:13px 18px;">
                  Review in WarmHub
                </a>
                <p style="margin:16px 0 0;color:#64748b;font-size:13px;">Approve it from Manage Testimonials before it appears publicly.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function detailRow(label: string, value: string) {
  return `<tr>
    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:130px;">${escapeHtml(label)}</td>
    <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#10233f;font-size:14px;font-weight:700;">${escapeHtml(value)}</td>
  </tr>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}

function toBoolean(value: unknown) {
  return value === true || value === 'true' || value === 'yes' || value === '1';
}

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No';
}

function extensionFromName(name: string, type: string) {
  const existing = name.split('.').pop()?.toLowerCase();
  if (existing && /^[a-z0-9]+$/.test(existing)) return existing;
  return type.split('/').pop()?.replace('jpeg', 'jpg') || 'jpg';
}

