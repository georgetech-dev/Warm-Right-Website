-- Warm Right contact and booking option management
-- Run this complete file in the Supabase SQL Editor.

begin;

create table if not exists public.site_contact_options (
  id uuid primary key default gen_random_uuid(),
  option_key text not null unique,
  contact_title text not null,
  contact_body_html text not null default '',
  booking_title text not null default '',
  booking_body_html text not null default '',
  menu_label text not null default '',
  mobile_button_background text not null default '#28a745',
  mobile_button_text text not null default '#ffffff',
  mobile_button_hover text not null default '#218838',
  action_type text not null default 'direct'
    check (action_type in ('direct', 'general', 'callback')),
  action_url text not null default '',
  image_url text not null default '',
  image_position_x integer not null default 50 check (image_position_x between 0 and 100),
  image_position_y integer not null default 50 check (image_position_y between 0 and 100),
  image_zoom integer not null default 100 check (image_zoom between 100 and 220),
  mobile_image_position_x integer not null default 50 check (mobile_image_position_x between 0 and 100),
  mobile_image_position_y integer not null default 50 check (mobile_image_position_y between 0 and 100),
  mobile_image_zoom integer not null default 100 check (mobile_image_zoom between 100 and 220),
  show_on_contact boolean not null default true,
  show_on_booking boolean not null default false,
  show_in_mobile_menu boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_contact_settings (
  settings_key text primary key default 'default'
    check (settings_key = 'default'),
  closed_title text not null default 'Sorry our office is currently closed',
  closed_body_html text not null default 'You can still request a callback or contact our emergency line.',
  emergency_label text not null default 'Emergency Call Out',
  emergency_url text not null default 'tel:08007566748,0',
  callback_label text not null default 'Request a Callback',
  mobile_button_background text not null default '#28a745',
  mobile_button_text text not null default '#ffffff',
  mobile_button_hover text not null default '#218838',
  updated_at timestamptz not null default now()
);

alter table public.site_contact_options
  add column if not exists mobile_button_background text not null default '#28a745',
  add column if not exists mobile_button_text text not null default '#ffffff',
  add column if not exists mobile_button_hover text not null default '#218838';

alter table public.site_contact_settings
  add column if not exists mobile_button_background text not null default '#28a745',
  add column if not exists mobile_button_text text not null default '#ffffff',
  add column if not exists mobile_button_hover text not null default '#218838';

alter table public.site_contact_options enable row level security;
alter table public.site_contact_settings enable row level security;

drop policy if exists "Public can read active contact options" on public.site_contact_options;
create policy "Public can read active contact options"
on public.site_contact_options for select
to anon
using (is_active = true);

drop policy if exists "Authenticated can manage contact options" on public.site_contact_options;
create policy "Authenticated can manage contact options"
on public.site_contact_options for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read contact settings" on public.site_contact_settings;
create policy "Public can read contact settings"
on public.site_contact_settings for select
to anon
using (true);

drop policy if exists "Authenticated can manage contact settings" on public.site_contact_settings;
create policy "Authenticated can manage contact settings"
on public.site_contact_settings for all
to authenticated
using (true)
with check (true);

insert into public.site_contact_options (
  option_key, contact_title, contact_body_html, booking_title, booking_body_html,
  menu_label, action_type, action_url, image_url, show_on_contact,
  show_on_booking, show_in_mobile_menu, sort_order
) values
  ('general', 'General Enquiries', '<strong>0800 756 6748</strong>', 'Call to Book', 'Contact us to arrange your visit.<br><strong>0800 756 6748</strong>', 'Call Us', 'general', 'tel:08007566748', 'assets/images/phone.jpg', true, true, true, 10),
  ('text', 'Text Us', 'Text anytime. Our usual response is during office hours.<br><strong>07985 292527</strong>', '', '', 'Text Us', 'direct', 'sms:07985292527', 'assets/images/text-message.png', true, false, false, 20),
  ('whatsapp', 'WhatsApp Us', 'Send us a WhatsApp message at any time. Our usual response is during office hours.<br><strong>0800 756 6748</strong>', '', '', 'WhatsApp Us', 'direct', 'https://wa.me/448007566748', 'assets/images/WhatsApp Logos.svg', true, false, false, 30),
  ('emergency', 'Emergencies (24/7)', 'Call us at any time for urgent assistance.<br><strong>0800 756 6748</strong>', 'Emergencies (24/7)', 'Call us at any time for urgent assistance.<br><strong>0800 756 6748</strong>', 'Emergency Call', 'direct', 'tel:08007566748,0', 'assets/images/water-damage.jpg', true, true, false, 40),
  ('email', 'Email Us', 'Send an email and we will reply by the next working day.<br><strong>info@warmright.uk</strong>', 'Book via Email', 'Email us at any time to request an appointment.', 'Email Us', 'direct', 'mailto:info@warmright.uk', 'assets/images/email-2.png', true, true, false, 50),
  ('callback', 'Request a Callback', 'Leave your details and we will call you back at a convenient time.', 'Request a Callback', 'Leave your details and we will call you back at a convenient time.', 'Request a Callback', 'callback', '', 'assets/images/contact.jpg', true, true, false, 60),
  ('fax', 'Fax', 'Send documents by fax.<br><strong>0870 705 24 32</strong>', '', '', 'Fax', 'direct', '', 'assets/images/fax.png', true, false, false, 70)
on conflict (option_key) do nothing;

insert into public.site_contact_settings (
  settings_key, closed_title, closed_body_html, emergency_label, emergency_url, callback_label
) values (
  'default',
  'Sorry our office is currently closed',
  'You can still request a callback, or contact our emergency line for urgent assistance.',
  'Emergency Call Out',
  'tel:08007566748,0',
  'Request a Callback'
)
on conflict (settings_key) do nothing;

commit;
