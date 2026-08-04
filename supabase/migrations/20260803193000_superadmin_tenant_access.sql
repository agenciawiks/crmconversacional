begin;

-- Superadmin is an explicit database capability. It must never be inferred
-- from an e-mail address in frontend code.
alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select profile.is_super_admin
    from public.profiles as profile
    where profile.id = auth.uid()
  ), false);
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- One-time bootstrap for the Wiks owner account. The password remains only
-- in Supabase Auth and is deliberately not stored in source code.
update public.profiles as profile
set is_super_admin = true
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('agenciawiks@gmail.com');

-- Existing tenant policies remain untouched. PostgreSQL combines permissive
-- policies with OR, so these additions grant read-only global visibility only
-- to the superadmin while preserving normal tenant isolation.
do $$
declare
  target_table record;
begin
  for target_table in
    select columns.table_name
    from information_schema.columns as columns
    join pg_class as relation
      on relation.relname = columns.table_name
    join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
     and namespace.nspname = columns.table_schema
    where columns.table_schema = 'public'
      and columns.column_name = 'tenant_id'
      and relation.relkind in ('r', 'p')
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table.table_name
        and policyname = 'superadmin_select_all'
    ) then
      execute format(
        'create policy superadmin_select_all on public.%I for select to authenticated using (public.is_super_admin())',
        target_table.table_name
      );
    end if;
  end loop;
end
$$;

do $$
begin
  if to_regclass('public.tenants') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'tenants'
         and policyname = 'superadmin_select_all'
     ) then
    create policy superadmin_select_all
      on public.tenants
      for select
      to authenticated
      using (public.is_super_admin());
  end if;

  if to_regclass('public.profiles') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'profiles'
         and policyname = 'superadmin_select_all'
     ) then
    create policy superadmin_select_all
      on public.profiles
      for select
      to authenticated
      using (public.is_super_admin());
  end if;
end
$$;

comment on column public.profiles.is_super_admin is
  'Grants cross-tenant read access and access to tenant provisioning UI.';

notify pgrst, 'reload schema';

commit;
