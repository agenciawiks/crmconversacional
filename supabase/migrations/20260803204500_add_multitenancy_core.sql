begin;

-- The production database originally had a single customer. Keep the existing
-- UUID used by the n8n fallbacks so every current row remains attached to the
-- Faceall workspace after this additive migration.
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'standard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.tenants (id, name, slug, plan)
values (
  '11111111-1111-1111-1111-111111111111',
  'Congresso Faceall',
  'congresso-faceall',
  'standard'
)
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    updated_at = now();

-- Add tenant ownership to every table that contains customer data. Existing
-- rows receive the Faceall tenant and are never deleted or recreated.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'activity_log',
    'agent_profiles',
    'ai_settings',
    'appointments',
    'channels',
    'contacts',
    'crm_settings',
    'failed_messages',
    'followup_queue',
    'followup_rules',
    'messages',
    'profiles',
    'webhook_logs'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'alter table public.%I add column if not exists tenant_id uuid',
        table_name
      );
      execute format(
        'update public.%I set tenant_id = $1 where tenant_id is null',
        table_name
      ) using '11111111-1111-1111-1111-111111111111'::uuid;
      execute format(
        'alter table public.%I alter column tenant_id set default %L::uuid',
        table_name,
        '11111111-1111-1111-1111-111111111111'
      );
      execute format(
        'alter table public.%I alter column tenant_id set not null',
        table_name
      );

      if not exists (
        select 1
        from pg_constraint
        where conrelid = format('public.%I', table_name)::regclass
          and conname = table_name || '_tenant_id_fkey'
      ) then
        execute format(
          'alter table public.%I add constraint %I foreign key (tenant_id) references public.tenants(id)',
          table_name,
          table_name || '_tenant_id_fkey'
        );
      end if;

      execute format(
        'create index if not exists %I on public.%I (tenant_id)',
        table_name || '_tenant_id_idx',
        table_name
      );
    end if;
  end loop;
end
$$;

-- The same phone and setting key may exist independently in each customer.
alter table if exists public.contacts
  drop constraint if exists contacts_phone_key;
create unique index if not exists contacts_tenant_phone_key
  on public.contacts (tenant_id, phone);

alter table if exists public.crm_settings
  drop constraint if exists crm_settings_pkey;
alter table if exists public.crm_settings
  add constraint crm_settings_pkey primary key (tenant_id, key);

-- Central helpers keep RLS policies small and avoid recursive profile policies.
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

revoke all on function public.current_tenant_id() from public;
grant execute on function public.current_tenant_id() to authenticated;

alter table public.tenants enable row level security;

do $$
declare
  table_name text;
  policy_record record;
begin
  foreach table_name in array array[
    'activity_log',
    'agent_profiles',
    'ai_settings',
    'appointments',
    'channels',
    'contacts',
    'crm_settings',
    'failed_messages',
    'followup_queue',
    'followup_rules',
    'messages',
    'profiles',
    'webhook_logs'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', table_name);

    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = table_name
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_record.policyname,
        table_name
      );
    end loop;

    execute format(
      'create policy tenant_select on public.%I for select to authenticated using (public.is_super_admin() or tenant_id = public.current_tenant_id())',
      table_name
    );
    execute format(
      'create policy tenant_insert on public.%I for insert to authenticated with check (tenant_id = public.current_tenant_id())',
      table_name
    );
    execute format(
      'create policy tenant_update on public.%I for update to authenticated using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id())',
      table_name
    );
    execute format(
      'create policy tenant_delete on public.%I for delete to authenticated using (tenant_id = public.current_tenant_id())',
      table_name
    );
  end loop;
end
$$;

drop policy if exists tenant_select on public.tenants;
create policy tenant_select
  on public.tenants
  for select
  to authenticated
  using (public.is_super_admin() or id = public.current_tenant_id());

-- Tenant creation is performed server-side by the authenticated provisioning
-- workflow. The browser only receives rows it is allowed to read.

notify pgrst, 'reload schema';

commit;
