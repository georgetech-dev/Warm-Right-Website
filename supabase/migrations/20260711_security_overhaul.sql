begin;

create table if not exists public.security_rate_limits (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);

create index if not exists security_rate_limits_scope_identifier_created_at_idx
  on public.security_rate_limits (scope, identifier, created_at desc);

revoke all on public.security_rate_limits from anon, authenticated;

create or replace function public.is_admin_user(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = coalesce(target_user_id, auth.uid())
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin_user(uuid) to authenticated;
revoke execute on function public.is_admin_user(uuid) from anon;

create or replace function public.purge_security_rate_limits(retention_days integer default 14)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  if not public.is_admin_user() then
    raise exception 'Admin access is required.';
  end if;

  delete from public.security_rate_limits
  where created_at < now() - make_interval(days => greatest(retention_days, 1));

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.purge_security_rate_limits(integer) to authenticated;
revoke execute on function public.purge_security_rate_limits(integer) from anon;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'user_roles') then
    alter table public.user_roles enable row level security;
    execute 'drop policy if exists "user_roles_select_self_or_admin" on public.user_roles';
    execute 'drop policy if exists "user_roles_admin_write" on public.user_roles';
    execute $policy$
      create policy "user_roles_select_self_or_admin" on public.user_roles
      for select to authenticated
      using (user_id = auth.uid() or public.is_admin_user())
    $policy$;
    execute $policy$
      create policy "user_roles_admin_write" on public.user_roles
      for all to authenticated
      using (public.is_admin_user())
      with check (public.is_admin_user())
    $policy$;
  end if;
end$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'site_analytics_ip_exclusions',
    'feedback_surveys',
    'callback_requests',
    'testimonial_submissions'
  ]
  loop
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = v_table) then
      execute format('alter table public.%I enable row level security', v_table);
      execute format('drop policy if exists "%s_admin_only" on public.%I', v_table, v_table);
      execute format(
        'create policy "%s_admin_only" on public.%I for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user())',
        v_table,
        v_table
      );
    end if;
  end loop;
end$$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'site_settings') then
    alter table public.site_settings enable row level security;
    execute 'drop policy if exists "site_settings_public_read" on public.site_settings';
    execute 'drop policy if exists "site_settings_admin_write" on public.site_settings';
    execute $policy$
      create policy "site_settings_public_read" on public.site_settings
      for select to anon, authenticated
      using (
        setting_key like 'theme_%'
        or setting_key in ('privacy_page_title', 'privacy_review_date', 'public_site_base_url')
        or public.is_admin_user()
      )
    $policy$;
    execute $policy$
      create policy "site_settings_admin_write" on public.site_settings
      for all to authenticated
      using (public.is_admin_user())
      with check (public.is_admin_user())
    $policy$;
  end if;
end$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'site_content_cards',
    'site_feature_lists',
    'site_feature_list_items',
    'site_offers',
    'rates',
    'rate_options',
    'testimonials'
  ]
  loop
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = v_table) then
      execute format('alter table public.%I enable row level security', v_table);
      execute format('drop policy if exists "%s_public_read" on public.%I', v_table, v_table);
      execute format('drop policy if exists "%s_admin_write" on public.%I', v_table, v_table);
      execute format(
        'create policy "%s_public_read" on public.%I for select to anon, authenticated using (true)',
        v_table,
        v_table
      );
      execute format(
        'create policy "%s_admin_write" on public.%I for all to authenticated using (public.is_admin_user()) with check (public.is_admin_user())',
        v_table,
        v_table
      );
    end if;
  end loop;
end$$;

commit;
