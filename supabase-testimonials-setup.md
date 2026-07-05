# Customer Testimonial Submissions

This feature uses the `testimonial-submission` Supabase Edge Function.

## Database

Run the latest `supabase-site-management.sql` in Supabase SQL editor. It adds:

- `testimonial_submissions`
- `site_settings`
- the default `testimonial_team_email` setting set to `info@warmright.uk`

## Storage

The function uploads customer photos to the existing Supabase Storage bucket:

- `testimonial-images`

## Secrets

Set these Supabase secrets before deploying the function:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..."
supabase secrets set SMTP_HOST="smtp.example.com"
supabase secrets set SMTP_PORT="465"
supabase secrets set SMTP_USER="..."
supabase secrets set SMTP_PASS="..."
supabase secrets set SMTP_FROM="support@georgetech.uk"
supabase secrets set SMTP_FROM_NAME="GeorgeTech Support"
```

The team notification email can be edited in WarmHub:

`Account Settings -> Users and Permissions -> App settings -> Team testimonial email address`

## Deploy

```bash
supabase functions deploy testimonial-submission
supabase functions deploy trigger-email-outbox
supabase functions deploy testimonial-title-suggestion
supabase functions deploy feedback-submission
```

## GitHub Email Outbox Sender

The workflow `.github/workflows/send-email-outbox.yml` sends queued rows from `email_outbox`.

Set these GitHub repository secrets:

```bash
SUPABASE_URL=https://axampuprcnauxbbijmmt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SMTP_HOST=smtp.livemail.co.uk
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=support@georgetech.uk
SMTP_FROM_NAME=GeorgeTech Support
```

Set these Supabase secrets so WarmHub can trigger the GitHub Action:

```bash
supabase secrets set GITHUB_OWNER="s-george-dev"
supabase secrets set GITHUB_REPO="Warm-Right-Website"
supabase secrets set GITHUB_TOKEN="..."
supabase secrets set GITHUB_EMAIL_WORKFLOW="send-email-outbox.yml"
supabase secrets set GITHUB_BRANCH="master"
supabase secrets set SMTP_FROM="support@georgetech.uk"
supabase secrets set SMTP_FROM_NAME="GeorgeTech Support"
supabase secrets set SITE_BASE_URL="https://warmright.georgetech.uk"
```

The GitHub token needs permission to run Actions workflows on this repository.

The testimonial submission function queues both:

- the admin approval notification
- a customer thank-you email

It then triggers the GitHub email sender workflow automatically. The admin page also has a manual `Send Queued Emails` button.

## AI testimonial title suggestions

The public testimonial form can suggest a short 3-7 word title from the customer's testimonial.

Create a Gemini API key in Google AI Studio, then add it as a Supabase secret:

```bash
supabase secrets set GEMINI_API_KEY="..."
```

Optional model override:

```bash
supabase secrets set GEMINI_MODEL="gemini-2.0-flash"
```

The API key is only used inside the `testimonial-title-suggestion` Edge Function and is not exposed in the browser.

## Feedback survey page

The standalone feedback site lives at:

```text
feedback-site/
```

Copy the contents of that folder into its own GitHub repository and deploy it at `feedback.warmright.uk`. The main site's `feedback.html` redirects to the standalone survey.

Run `supabase-feedback-survey-update.sql` before deploying. It adds:

- conditional direct/referred feedback fields
- feedback forwarding and customer-confirmation settings
- the external feedback page URL

Redeploy the `feedback-submission` Edge Function after running the SQL. The survey queues both the team notification and, when enabled in Feedback admin, a customer confirmation through the existing GitHub email outbox workflow.

## Google address finder

The address finder calls the `google-places` Edge Function, so the Google key remains in Supabase secrets rather than the browser.

Set the server-side key and deploy the function:

```bash
supabase secrets set GOOGLE_MAPS_API_KEY="..."
supabase functions deploy google-places
```
