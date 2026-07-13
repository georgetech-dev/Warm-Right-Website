-- Warm Right security hardening - phase 4 (role management + temp repo cleanup follow-up)
-- Run this after phase 1/2/3.
-- Purpose:
--   * move role assignment behind one admin-only RPC
--   * remove direct browser write access to public.user_roles for authenticated users
--   * keep self/admin read access intact
--   * clean up old duplicate user_roles policies if they still exist

begin;

-- ---------------------------------------------------------------------------
-- 1) Remove old overlapping user_roles write policies.
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can update user roles" on public.user_roles;
drop policy if exists "Admins can manage user roles" on public.user_roles;
drop policy if exists user_roles_admin_write on public.user_roles;

-- Keep:
--   user_roles_admin_all               (supabase_auth_admin only)
--   user_roles_select_self_or_admin    (self or admin read)

-- ---------------------------------------------------------------------------
-- 2) Remove direct DML grants from authenticated users on user_roles.
--    Role changes should only happen through the RPC below.
-- ---------------------------------------------------------------------------
revoke insert, update, delete, truncate, references, trigger
on table public.user_roles
from authenticated;

-- ---------------------------------------------------------------------------
-- 3) Create one admin-only role assignment RPC.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_user_role(
  target_user_id uuid,
  target_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'Only administrators can assign roles.'
      using errcode = '42501';
  end if;

  if target_user_id is null then
    raise exception 'target_user_id is required.'
      using errcode = '22004';
  end if;

  if target_role not in ('customer', 'site-viewer', 'engineer', 'admin') then
    raise exception 'Invalid role: %', coalesce(target_role, '<null>')
      using errcode = '22023';
  end if;

  insert into public.user_roles (user_id, role)
  values (target_user_id, target_role)
  on conflict (user_id)
  do update set role = excluded.role;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public;
revoke all on function public.admin_set_user_role(uuid, text) from anon;
revoke all on function public.admin_set_user_role(uuid, text) from authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

commit;
