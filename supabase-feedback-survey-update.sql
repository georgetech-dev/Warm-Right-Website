-- Warm Right standalone feedback survey update.
-- Run this complete file in the Supabase SQL Editor.

alter table public.feedback_surveys
  add column if not exists job_origin text not null default 'direct',
  add column if not exists has_main_body boolean not null default false,
  add column if not exists pass_to_main_body boolean not null default false,
  add column if not exists wants_testimonial boolean not null default false;

alter table public.feedback_surveys
  drop constraint if exists feedback_surveys_job_origin_check;

alter table public.feedback_surveys
  add constraint feedback_surveys_job_origin_check
  check (job_origin in ('direct', 'referred'));

-- Direct customers do not answer the insurer/agent/landlord ratings.
alter table public.feedback_surveys
  alter column main_body_communication drop not null,
  alter column main_body_communication drop default,
  alter column main_body_experience drop not null,
  alter column main_body_experience drop default;

alter table public.feedback_surveys enable row level security;

drop policy if exists "Authenticated can manage feedback surveys" on public.feedback_surveys;
create policy "Authenticated can manage feedback surveys"
on public.feedback_surveys for all
to authenticated
using (true)
with check (true);

insert into public.site_settings (setting_key, setting_value)
values
  ('feedback_team_email', 'info@warmright.uk'),
  ('feedback_send_customer_confirmation', 'true')
on conflict (setting_key) do nothing;

insert into public.site_pages
  (page_key, title, url, nav_group, sort_order, is_active)
values
  ('feedback', 'Feedback Survey', 'https://feedback.warmright.uk/', 'hidden', 0, true)
on conflict (page_key) do update
set title = excluded.title,
    url = excluded.url,
    nav_group = excluded.nav_group,
    sort_order = excluded.sort_order,
    updated_at = now();
