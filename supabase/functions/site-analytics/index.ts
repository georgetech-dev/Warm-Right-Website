import {
  cleanText,
  createServiceClient,
  defaultCorsHeaders as corsHeaders,
  httpError,
  json,
  readJson,
  requestIp,
  requireAdminUser,
} from '../_shared/security.ts';

const serviceDb = createServiceClient();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || (req.method === 'POST' ? 'collect' : 'summary');

    if (req.method === 'POST' && action === 'collect') {
      return json(await collectEvent(req));
    }

    const user = await requireAdminUser(req);

    if (req.method === 'GET' && action === 'summary') {
      const days = clampNumber(url.searchParams.get('days'), 7, 365, 30);
      return json(await buildSummary(days));
    }
    if (req.method === 'GET' && action === 'exclusions') {
      return json({ currentIp: requestIp(req), exclusions: await listExclusions() });
    }
    if (req.method === 'POST' && action === 'exclude-current') {
      const body = await readJson(req);
      return json(await addExclusion(requestIp(req), cleanText(body.label, 120) || 'My IP address', user.id));
    }
    if (req.method === 'POST' && action === 'exclude-ip') {
      const body = await readJson(req);
      return json(await addExclusion(cleanIp(body.ip_address), cleanText(body.label, 120), user.id));
    }
    if (req.method === 'DELETE' && action === 'exclusion') {
      const id = cleanText(url.searchParams.get('id'), 80);
      if (!id) throw httpError('Exclusion ID is required.', 400);
      const { error } = await serviceDb.from('site_analytics_ip_exclusions').delete().eq('id', id);
      if (error) throw error;
      return json({ ok: true });
    }

    throw httpError('Unsupported analytics action.', 400);
  } catch (err) {
    console.error(err);
    return json({ error: err.message || 'Unexpected analytics error.' }, err.status || 500);
  }
});

async function collectEvent(req: Request) {
  const ip = requestIp(req);
  if (ip && await isExcludedIp(ip)) return { ok: true, ignored: true };

  const userAgent = req.headers.get('user-agent') || '';
  if (isLikelyBot(userAgent)) return { ok: true, ignored: true };

  const body = await readJson(req);
  const event = {
    p_event_date: new Date().toISOString().slice(0, 10),
    p_event_name: allowedEventName(body.event_name),
    p_page_path: cleanPath(body.page_path),
    p_page_title: cleanText(body.page_title, 180),
    p_referrer_host: cleanHost(body.referrer_host),
    p_device_type: allowedDevice(body.device_type),
  };

  if (!event.p_page_path) throw httpError('Invalid analytics event.', 400);
  const { error } = await serviceDb.rpc('increment_site_analytics_daily', event);
  if (error) throw error;
  return { ok: true };
}

async function buildSummary(days: number) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentStart = isoDateDaysAgo(days - 1);
  const previousStart = isoDateDaysAgo((days * 2) - 1);
  const previousEnd = isoDateDaysAgo(days);
  const { data, error } = await serviceDb
    .from('site_analytics_daily')
    .select('event_date,event_name,page_path,page_title,referrer_host,device_type,event_count')
    .gte('event_date', previousStart)
    .lte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(50000);
  if (error) throw error;

  const rows = data || [];
  const current = rows.filter(row => row.event_date >= currentStart);
  const previous = rows.filter(row => row.event_date >= previousStart && row.event_date <= previousEnd);
  const pageViews = current.filter(row => row.event_name === 'page_view');
  const previousViews = previous.filter(row => row.event_name === 'page_view');
  const actions = current.filter(row => row.event_name !== 'page_view');
  const previousActions = previous.filter(row => row.event_name !== 'page_view');

  return {
    days,
    generatedAt: now.toISOString(),
    totals: {
      views: sumCounts(pageViews),
      actions: sumCounts(actions),
      activeDays: new Set(pageViews.map(row => row.event_date)).size,
      previousViews: sumCounts(previousViews),
      previousActions: sumCounts(previousActions),
    },
    daily: dailySeries(current, days),
    topPages: groupedRows(pageViews, row => row.page_path, 10),
    referrers: groupedRows(pageViews, row => row.referrer_host || 'Direct', 8),
    devices: groupedRows(pageViews, row => row.device_type || 'unknown', 5),
    actions: groupedRows(actions, row => row.event_name, 8),
  };
}

function dailySeries(rows: Record<string, unknown>[], days: number) {
  const counts = new Map<string, { views: number; actions: number }>();
  for (let offset = days - 1; offset >= 0; offset--) {
    counts.set(isoDateDaysAgo(offset), { views: 0, actions: 0 });
  }
  rows.forEach(row => {
    const item = counts.get(String(row.event_date));
    if (!item) return;
    const count = numericCount(row.event_count);
    if (row.event_name === 'page_view') item.views += count;
    else item.actions += count;
  });
  return Array.from(counts, ([date, item]) => ({ date, ...item }));
}

function groupedRows(rows: Record<string, unknown>[], keyFn: (row: Record<string, unknown>) => string, limit: number) {
  const counts = new Map<string, number>();
  rows.forEach(row => {
    const key = keyFn(row) || 'Unknown';
    counts.set(key, (counts.get(key) || 0) + numericCount(row.event_count));
  });
  return Array.from(counts, ([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function sumCounts(rows: Record<string, unknown>[]) {
  return rows.reduce((total, row) => total + numericCount(row.event_count), 0);
}

function numericCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function isoDateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

async function listExclusions() {
  const { data, error } = await serviceDb
    .from('site_analytics_ip_exclusions')
    .select('id,ip_address,label,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function addExclusion(ip: string, label: string, userId: string) {
  if (!ip) throw httpError('Could not determine a valid IP address.', 400);
  const { data, error } = await serviceDb
    .from('site_analytics_ip_exclusions')
    .upsert({ ip_address: ip, label: label || 'Excluded IP', created_by: userId }, { onConflict: 'ip_address' })
    .select('id,ip_address,label,created_at')
    .single();
  if (error) throw error;
  return { ok: true, exclusion: data };
}

async function isExcludedIp(ip: string) {
  const { data, error } = await serviceDb
    .from('site_analytics_ip_exclusions')
    .select('id')
    .eq('ip_address', ip)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

function cleanIp(value: unknown) {
  let ip = String(cleanText(value, 80)).replace(/^\[|\]$/g, '');
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    return ip.split('.').every(part => Number(part) <= 255) ? ip : '';
  }
  return /^[0-9a-f:]+$/i.test(ip) && ip.includes(':') ? ip.toLowerCase() : '';
}

function cleanPath(value: unknown) {
  const path = cleanText(value, 300);
  return path.startsWith('/') && !path.includes('..') ? path.split('?')[0].split('#')[0] : '';
}

function cleanHost(value: unknown) {
  const host = cleanText(value, 253).toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(host) ? host : '';
}

function allowedEventName(value: unknown) {
  const event = cleanText(value, 60).toLowerCase();
  return ['page_view', 'book_visit_click', 'contact_click', 'testimonial_click', 'offer_click'].includes(event) ? event : 'page_view';
}

function allowedDevice(value: unknown) {
  const device = cleanText(value, 20).toLowerCase();
  return ['mobile', 'tablet', 'desktop'].includes(device) ? device : 'unknown';
}

function isLikelyBot(userAgent: string) {
  return /bot|crawl|spider|slurp|preview|lighthouse|headless|monitor/i.test(userAgent);
}

function clampNumber(value: string | null, min: number, max: number, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
}

