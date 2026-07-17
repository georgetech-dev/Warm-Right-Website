import {
  createServiceClient,
  defaultCorsHeaders as corsHeaders,
  httpError,
  json,
  requireAdminUser,
} from '../_shared/security.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') throw httpError('Unsupported method.', 405);
    await requireAdminUser(req);

    const db = createServiceClient();
    const { data, error } = await db.rpc('purge_testimonials_by_retention');
    if (error) throw error;

    const result = Array.isArray(data) ? (data[0] || {}) : (data || {});
    return json({ ok: true, result });
  } catch (err) {
    console.error(err);
    return json({ error: err.message || 'Unexpected error.' }, err.status || 500);
  }
});
