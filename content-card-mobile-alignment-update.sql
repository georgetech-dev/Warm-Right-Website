-- Warm Right content card mobile alignment update
-- Recent changes only: separate mobile text alignment for content cards.

begin;

alter table public.site_content_cards
  add column if not exists text_alignment_mobile text not null default 'justify'
  check (text_alignment_mobile in ('left', 'justify', 'center', 'right'));

update public.site_content_cards
set text_alignment_mobile = coalesce(nullif(text_alignment_mobile, ''), text_alignment, 'justify')
where text_alignment_mobile is null
   or text_alignment_mobile = '';

comment on column public.site_content_cards.text_alignment_mobile is
  'Mobile-only text alignment for the public content card body: left, justify, center, or right.';

commit;
