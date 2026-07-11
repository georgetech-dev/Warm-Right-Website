import { defaultCorsHeaders as corsHeaders, httpError, json, requireAdminUser, requiredEnv } from '../_shared/security.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') throw httpError('Unsupported method.', 405);
    await requireAdminUser(req);

    const owner = requiredEnv('GITHUB_OWNER');
    const repo = requiredEnv('GITHUB_REPO');
    const token = requiredEnv('GITHUB_TOKEN');
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
      throw httpError(`GitHub workflow dispatch failed (${response.status}): ${detail}`, response.status);
    }

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: err.message || 'Unexpected error.' }, err.status || 500);
  }
});
