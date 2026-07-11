import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const defaultCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

export type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

export function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw httpError(`Missing ${name} secret.`, 500);
  return value;
}

export function createServiceClient() {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'));
}

export async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader) throw httpError('Missing Authorization header.', 401);

  const authDb = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error,
  } = await authDb.auth.getUser();
  if (error || !user) throw httpError('Not signed in.', 401);
  return { id: user.id, email: user.email };
}

export async function requireAdminUser(req: Request): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(req);
  const db = createServiceClient();
  const { data, error } = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw httpError('Could not verify your admin access.', 403);
  if (!data || data.role !== 'admin') throw httpError('Admin access is required.', 403);
  return user;
}

export async function enforceRateLimit(options: {
  db?: ReturnType<typeof createServiceClient>;
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}) {
  const db = options.db || createServiceClient();
  const identifier = cleanText(options.identifier, 180);
  if (!identifier) throw httpError('Could not identify this request.', 400);

  const windowStart = new Date(Date.now() - (options.windowSeconds * 1000)).toISOString();
  const now = new Date().toISOString();

  const { error: insertError } = await db.from('security_rate_limits').insert({
    scope: cleanText(options.scope, 120),
    identifier,
    created_at: now,
  });

  if (insertError) {
    if (insertError.code === '42P01') {
      console.warn('security_rate_limits table is missing; skipping rate limit enforcement until the migration is applied.');
      return;
    }
    throw insertError;
  }

  const { count, error: countError } = await db
    .from('security_rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('scope', cleanText(options.scope, 120))
    .eq('identifier', identifier)
    .gte('created_at', windowStart);

  if (countError) throw countError;
  if ((count || 0) > options.limit) {
    throw httpError('Too many requests. Please wait a little and try again.', 429);
  }
}

export function requestIp(req: Request) {
  const raw =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    '';
  return cleanIp(raw);
}

export function cleanIp(value: unknown) {
  let ip = cleanText(value, 80).replace(/^\[|\]$/g, '');
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    return ip.split('.').every(part => Number(part) <= 255) ? ip : '';
  }
  return /^[0-9a-f:]+$/i.test(ip) && ip.includes(':') ? ip.toLowerCase() : '';
}

export function cleanText(value: unknown, max: number) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function readJson(req: Request) {
  return req.json().catch(() => ({}));
}

export function json(data: unknown, status = 200, corsHeaders = defaultCorsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}
