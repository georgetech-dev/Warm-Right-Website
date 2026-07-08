begin;

alter table public.feedback_surveys
  add column if not exists pass_to_engineer boolean not null default false;

comment on column public.feedback_surveys.pass_to_engineer is
  'Customer asked Warm Right to pass their feedback to the assigned engineer.';

insert into public.site_settings (setting_key, setting_value, updated_at)
values
  ('feedback_redirect_site_url', 'https://warmright.uk/', now()),
  ('feedback_redirect_testimonial_url', 'https://warmright.uk/testimonial-submit.html', now())
on conflict (setting_key) do nothing;

commit;
