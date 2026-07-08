-- Warm Right testimonial retention policy update
-- Recent changes only: default retention settings and a manual purge RPC.

begin;

insert into public.site_settings (setting_key, setting_value, updated_at)
values
  ('testimonial_retention_pending_months', '24', now()),
  ('testimonial_retention_published_months', '36', now()),
  ('testimonial_retention_rejected_months', '12', now())
on conflict (setting_key) do nothing;

create or replace function public.purge_testimonials_by_retention()
returns table (
  pending_deleted integer,
  published_deleted integer,
  rejected_deleted integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  pending_setting text;
  published_setting text;
  rejected_setting text;
  pending_months integer;
  published_months integer;
  rejected_months integer;
begin
  pending_deleted := 0;
  published_deleted := 0;
  rejected_deleted := 0;

  select setting_value into pending_setting
  from public.site_settings
  where setting_key = 'testimonial_retention_pending_months';

  select setting_value into published_setting
  from public.site_settings
  where setting_key = 'testimonial_retention_published_months';

  select setting_value into rejected_setting
  from public.site_settings
  where setting_key = 'testimonial_retention_rejected_months';

  pending_months := case
    when coalesce(pending_setting, '') ~ '^[0-9]+$' then pending_setting::integer
    else null
  end;

  published_months := case
    when coalesce(published_setting, '') ~ '^[0-9]+$' then published_setting::integer
    else null
  end;

  rejected_months := case
    when coalesce(rejected_setting, '') ~ '^[0-9]+$' then rejected_setting::integer
    else null
  end;

  if pending_months is not null then
    delete from public.testimonial_submissions
    where status = 'pending'
      and created_at < now() - make_interval(months => pending_months);
    get diagnostics pending_deleted = row_count;
  end if;

  if published_months is not null then
    delete from public.testimonials
    where review_date < current_date - make_interval(months => published_months);
    get diagnostics published_deleted = row_count;
  end if;

  if rejected_months is not null then
    delete from public.testimonial_submissions
    where status = 'rejected'
      and created_at < now() - make_interval(months => rejected_months);
    get diagnostics rejected_deleted = row_count;
  end if;

  return next;
end;
$$;

grant execute on function public.purge_testimonials_by_retention() to authenticated;

commit;
