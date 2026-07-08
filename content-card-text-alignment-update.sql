-- Warm Right content card text alignment update
-- Recent changes only: per-card text alignment.

begin;

alter table public.site_content_cards
  add column if not exists text_alignment text not null default 'justify'
  check (text_alignment in ('left', 'justify', 'center', 'right'));

update public.site_content_cards
set text_alignment = 'justify'
where text_alignment is null;

comment on column public.site_content_cards.text_alignment is
  'Text alignment for the public content card body: left, justify, center, or right.';

commit;
