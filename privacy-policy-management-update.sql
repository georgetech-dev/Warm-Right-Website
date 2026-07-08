begin;

create table if not exists public.privacy_policy_sections (
  id uuid primary key default gen_random_uuid(),
  subtitle text not null,
  body_html text not null default '',
  sort_order integer not null default 10,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists privacy_policy_sections_order_idx
  on public.privacy_policy_sections (sort_order, created_at);

alter table public.privacy_policy_sections enable row level security;

drop policy if exists "Public can read active privacy policy sections"
  on public.privacy_policy_sections;
create policy "Public can read active privacy policy sections"
  on public.privacy_policy_sections
  for select
  to anon, authenticated
  using (is_active = true or auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage privacy policy sections"
  on public.privacy_policy_sections;
create policy "Authenticated users can manage privacy policy sections"
  on public.privacy_policy_sections
  for all
  to authenticated
  using (true)
  with check (true);

grant select on public.privacy_policy_sections to anon;
grant select, insert, update, delete on public.privacy_policy_sections to authenticated;

insert into public.site_settings (setting_key, setting_value)
values
  ('privacy_page_title', 'Privacy Policy and Customer Privacy Notice'),
  ('privacy_review_date', '2026-07-05')
on conflict (setting_key) do nothing;

commit;
