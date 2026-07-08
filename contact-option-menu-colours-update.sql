-- Warm Right mobile contact button colour settings
-- Run this complete file in the Supabase SQL Editor after the contact options update.

begin;

alter table public.site_contact_settings
  add column if not exists mobile_button_background text not null default '#28a745',
  add column if not exists mobile_button_text text not null default '#ffffff',
  add column if not exists mobile_button_hover text not null default '#218838';

update public.site_contact_settings
set
  mobile_button_background = coalesce(nullif(mobile_button_background, ''), '#28a745'),
  mobile_button_text = coalesce(nullif(mobile_button_text, ''), '#ffffff'),
  mobile_button_hover = coalesce(nullif(mobile_button_hover, ''), '#218838')
where settings_key = 'default';

commit;
