-- Warm Right aggregate-only analytics update
-- Run this complete file once in the Supabase SQL Editor, then deploy the
-- updated site-analytics Edge Function.

begin;

create table if not exists public.site_analytics_daily (
  event_date date not null,
  event_name text not null,
  page_path text not null,
  page_title text not null default '',
  referrer_host text not null default '',
  device_type text not null default 'unknown',
  event_count bigint not null default 0 check (event_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (event_date, event_name, page_path, referrer_host, device_type)
);

create index if not exists site_analytics_daily_event_date_idx
  on public.site_analytics_daily (event_date desc);

alter table public.site_analytics_daily enable row level security;
revoke all on table public.site_analytics_daily from anon, authenticated;

create or replace function public.increment_site_analytics_daily(
  p_event_date date,
  p_event_name text,
  p_page_path text,
  p_page_title text,
  p_referrer_host text,
  p_device_type text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.site_analytics_daily (
    event_date,
    event_name,
    page_path,
    page_title,
    referrer_host,
    device_type,
    event_count,
    updated_at
  ) values (
    p_event_date,
    p_event_name,
    p_page_path,
    coalesce(p_page_title, ''),
    coalesce(p_referrer_host, ''),
    p_device_type,
    1,
    now()
  )
  on conflict (event_date, event_name, page_path, referrer_host, device_type)
  do update set
    event_count = public.site_analytics_daily.event_count + 1,
    page_title = excluded.page_title,
    updated_at = now();
$$;

revoke all on function public.increment_site_analytics_daily(date, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.increment_site_analytics_daily(date, text, text, text, text, text)
  to service_role;

-- Preserve existing reporting history as daily totals, then remove the
-- event-level records containing browser session identifiers.
do $$
begin
  if to_regclass('public.site_analytics_events') is not null then
    execute $migration$
      insert into public.site_analytics_daily (
        event_date,
        event_name,
        page_path,
        page_title,
        referrer_host,
        device_type,
        event_count,
        updated_at
      )
      select
        created_at::date,
        event_name,
        page_path,
        max(page_title),
        lower(split_part(split_part(regexp_replace(referrer, '^https?://', ''), '/', 1), ':', 1)),
        device_type,
        count(*)::bigint,
        now()
      from public.site_analytics_events
      group by
        created_at::date,
        event_name,
        page_path,
        lower(split_part(split_part(regexp_replace(referrer, '^https?://', ''), '/', 1), ':', 1)),
        device_type
      on conflict (event_date, event_name, page_path, referrer_host, device_type)
      do update set
        event_count = public.site_analytics_daily.event_count + excluded.event_count,
        page_title = excluded.page_title,
        updated_at = now()
    $migration$;

    execute 'truncate table public.site_analytics_events';
    execute 'revoke all on table public.site_analytics_events from anon, authenticated';
  end if;
end;
$$;

comment on table public.site_analytics_daily is
  'Daily aggregate website counts. No visitor, session, full referrer, IP address or individual journey is stored.';

comment on function public.increment_site_analytics_daily(date, text, text, text, text, text) is
  'Atomically increments one aggregate analytics counter. Callable only by the service role.';

commit;
