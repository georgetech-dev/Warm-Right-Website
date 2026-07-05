-- Website light/dark appearance settings only.
-- Public visitors may read theme_* rows, but no other site_settings values.

insert into public.site_settings (setting_key, setting_value)
values
  ('theme_light_page_background', '#f9f6f2'),
  ('theme_light_surface', '#ffffff'),
  ('theme_light_text_primary', '#0f1724'),
  ('theme_light_text_secondary', '#5c5c5c'),
  ('theme_light_primary', '#0a2c66'),
  ('theme_light_accent', '#2a6f7b'),
  ('theme_light_highlight', '#d97706'),
  ('theme_light_nav_background', '#0a2c66'),
  ('theme_light_nav_text', '#ffffff'),
  ('theme_light_footer_background', '#062940'),
  ('theme_light_footer_text', '#ffffff'),
  ('theme_light_background_image', ''),
  ('theme_light_use_background_image', 'false'),
  ('theme_dark_page_background', '#181b20'),
  ('theme_dark_surface', '#242a31'),
  ('theme_dark_text_primary', '#f5f7fa'),
  ('theme_dark_text_secondary', '#cbd5e1'),
  ('theme_dark_primary', '#7db7ff'),
  ('theme_dark_accent', '#5ac8c8'),
  ('theme_dark_highlight', '#f59e0b'),
  ('theme_dark_nav_background', '#101827'),
  ('theme_dark_nav_text', '#ffffff'),
  ('theme_dark_footer_background', '#0b111b'),
  ('theme_dark_footer_text', '#f8fafc'),
  ('theme_dark_background_image', ''),
  ('theme_dark_use_background_image', 'false')
on conflict (setting_key) do nothing;

drop policy if exists "Public can read website theme settings" on public.site_settings;
create policy "Public can read website theme settings"
on public.site_settings for select
to anon
using (setting_key ~ '^theme_');
