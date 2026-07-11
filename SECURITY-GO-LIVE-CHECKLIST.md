# Warm Right Security Go-Live Checklist

## Before deploy

- Apply [supabase/migrations/20260711_security_overhaul.sql](C:/Developer/Warm%20Right%20Website/supabase/migrations/20260711_security_overhaul.sql) to the live project.
- Redeploy these Supabase Edge Functions:
  - `github-images`
  - `trigger-email-outbox`
  - `site-analytics`
  - `testimonial-submission`
  - `feedback-submission`
  - `callback-submission`
  - `google-places`
  - `testimonial-title-suggestion`
- Confirm the `testimonial-images` bucket configuration matches the intended publication model.
- Remove any unused local/test domains from site settings.

## Secret rotation

Rotate and re-test all elevated secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GITHUB_TOKEN`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_FROM_NAME`
- `GOOGLE_MAPS_API_KEY`
- `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY`

## Access verification

- Confirm a non-admin signed-in user gets `403` from:
  - `github-images`
  - `trigger-email-outbox`
  - analytics admin actions on `site-analytics`
- Confirm an admin user can still:
  - upload/rename/delete website images
  - trigger queued email dispatch
  - manage analytics exclusions

## Public endpoint checks

- Submit testimonials rapidly and confirm throttling is enforced.
- Submit feedback rapidly and confirm throttling is enforced.
- Submit callback requests rapidly and confirm throttling is enforced.
- Confirm hidden honeypot fields stay empty in normal use and reject scripted junk submissions when populated.

## Content safety checks

- Verify content cards still render expected formatting.
- Verify feature lists still render expected formatting.
- Verify rates modal HTML still renders correctly.
- Verify offers modal HTML still renders correctly.
- Try a test payload containing `<script>` or `onerror=` in managed HTML and confirm it does not execute.

## Repo hygiene

- Run a fresh-clone history scan with GitHub secret scanning and a local scanner such as Gitleaks.
- Confirm `supabase/.temp/` is no longer tracked.
- Keep migrations version-controlled; avoid one-off ignored SQL files for production changes.

## Hosting note

GitHub Pages will not give you full response-header control from this repo alone. If you want real CSP, HSTS, `Permissions-Policy`, and `Referrer-Policy` headers at the HTTP layer, put the live site behind a host or proxy that can set them.
