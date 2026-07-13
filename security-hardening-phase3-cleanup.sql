-- Warm Right security hardening - phase 3 (policy cleanup)
-- Safe, idempotent cleanup after phase 1 + phase 2.
-- Purpose:
--   * remove duplicate policy clutter
--   * keep one admin model per table
--   * tighten only the public-read policies that are safe to tighten
--   * deliberately keep a few broad public-read policies where current
--     front-end behaviour still relies on seeing inactive managed rows

begin;

-- ---------------------------------------------------------------------------
-- 1) Remove redundant terms admin policies.
--    terms_policy_sections_admin_only is now the canonical admin gate.
-- ---------------------------------------------------------------------------
drop policy if exists "terms policy sections admin read" on public.terms_policy_sections;
drop policy if exists "terms policy sections admin insert" on public.terms_policy_sections;
drop policy if exists "terms policy sections admin update" on public.terms_policy_sections;
drop policy if exists "terms policy sections admin delete" on public.terms_policy_sections;

-- ---------------------------------------------------------------------------
-- 2) Keep one public-read policy per table.
--    Some tables intentionally remain broad because the current public pages
--    need to detect inactive managed rows and suppress static fallback HTML.
-- ---------------------------------------------------------------------------

-- rate_options: safe to tighten to options whose parent rate is public.
drop policy if exists "Public can read rate options" on public.rate_options;
drop policy if exists rate_options_public_read on public.rate_options;
create policy rate_options_public_read
on public.rate_options
for select
to anon, authenticated
using (
  public.is_admin_user()
  or exists (
    select 1
    from public.rates r
    where r.id = public.rate_options.rate_id
      and coalesce(r.is_hidden, false) = false
  )
);

-- site_offers: safe to tighten to active offers only.
drop policy if exists "Public can read active offers" on public.site_offers;
drop policy if exists site_offers_public_read on public.site_offers;
create policy site_offers_public_read
on public.site_offers
for select
to anon, authenticated
using (
  public.is_admin_user()
  or coalesce(public.site_offers.is_active, false) = true
);

-- site_content_cards: DO NOT tighten to active-only yet.
-- Current public content-card loader uses the presence of inactive managed rows
-- to suppress legacy fallback HTML. Keep the canonical broad read, remove only
-- the duplicate active-only policy.
drop policy if exists "Public can read active content cards" on public.site_content_cards;

-- site_feature_lists: same reason as content cards.
drop policy if exists "Public can read feature lists" on public.site_feature_lists;

-- site_feature_list_items: same reason as content cards / feature lists.
drop policy if exists "Public can read feature list items" on public.site_feature_list_items;

-- ---------------------------------------------------------------------------
-- 3) Optional tidy-up comments:
--    We intentionally leave these canonical public-read policies in place:
--      - site_content_cards_public_read
--      - site_feature_lists_public_read
--      - site_feature_list_items_public_read
--    because tightening them today would make hidden managed content fall back
--    to static HTML on the public site. That can be revisited later when the
--    fallback content is fully removed from the page templates.
-- ---------------------------------------------------------------------------

commit;
