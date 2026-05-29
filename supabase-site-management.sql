-- Warm Right site management setup
-- Run this in Supabase SQL Editor before using admin/site-management.html.

create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  page_key text not null unique,
  title text not null,
  url text not null,
  nav_group text not null default 'main',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_carousel_tiles (
  id uuid primary key default gen_random_uuid(),
  carousel_key text not null,
  tile_key text not null,
  title text not null,
  description text not null,
  image_url text not null,
  link_url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_carousel_tiles_description_len check (char_length(description) <= 150),
  constraint site_carousel_tiles_unique_key unique (carousel_key, tile_key)
);

create table if not exists public.site_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  content_html text not null default '',
  image_url text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_pages enable row level security;
alter table public.site_carousel_tiles enable row level security;
alter table public.site_offers enable row level security;

drop policy if exists "Public can read active pages" on public.site_pages;
drop policy if exists "Public can read page visibility" on public.site_pages;
create policy "Public can read page visibility"
on public.site_pages for select
to anon
using (true);

drop policy if exists "Authenticated can manage pages" on public.site_pages;
create policy "Authenticated can manage pages"
on public.site_pages for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read active carousel tiles" on public.site_carousel_tiles;
drop policy if exists "Public can read carousel tile visibility" on public.site_carousel_tiles;
create policy "Public can read carousel tile visibility"
on public.site_carousel_tiles for select
to anon
using (true);

drop policy if exists "Authenticated can manage carousel tiles" on public.site_carousel_tiles;
create policy "Authenticated can manage carousel tiles"
on public.site_carousel_tiles for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read active offers" on public.site_offers;
create policy "Public can read active offers"
on public.site_offers for select
to anon
using (is_active = true);

drop policy if exists "Authenticated can manage offers" on public.site_offers;
create policy "Authenticated can manage offers"
on public.site_offers for all
to authenticated
using (true)
with check (true);

insert into public.site_offers (title, summary, content_html, image_url, sort_order, is_active)
select seed.title, seed.summary, seed.content_html, seed.image_url, seed.sort_order, true
from (values
  ('Family & Friends Offer', 'Book together on the same day within a 2-mile radius and unlock generous boiler service discounts.', '<p>Know someone nearby who needs a boiler service or Gas Safety Check? Book together on the same day and save.</p><ul class="indent"><li>2 households: <strong>10% off</strong> each</li><li>3 households: <strong>30% off</strong> each</li><li>4 households: <strong>50% off</strong> each</li><li>5+ households: <strong>Yours is FREE!</strong></li></ul><p><em>Offer excludes parts. Boilers must have been serviced within the last 13 months. Terms apply.</em></p>', 'assets/images/family-offer.jpg', 0),
  ('Landlord Bundle', 'An all-in-one landlord package for compliance, servicing and tenant support.', '<p>Our landlord package includes what you need to stay compliant and keep tenants safe.</p><ul class="indent"><li>Unlimited same-day callouts to your property</li><li>Annual boiler service</li><li>CP12 Gas Safety Certificate</li><li>Free Energy Efficiency and System Condition Report</li></ul><p><strong>Only GBP 120 inc. VAT one-off</strong> or <strong>GBP 12/month inc. VAT</strong></p>', 'assets/images/landlord-deal.jpg', 1),
  ('OAP Discounts', 'Discounted rates on selected services for older customers.', '<p>We are proud to support older customers with discounted rates on selected services. Let us know when booking and we will apply the saving automatically.</p>', 'assets/images/oap-discount.jpg', 2),
  ('Free Manuals & Guides', 'Free downloads, safety tips and troubleshooting information.', '<p>Need help identifying a fault or understanding your boiler? Visit our <a href="/support/manuals.html">Manuals & Information page</a> for free downloads, safety tips and troubleshooting advice.</p>', 'assets/images/manuals.jpg', 3)
) as seed(title, summary, content_html, image_url, sort_order)
where not exists (select 1 from public.site_offers);
