begin;

-- Validates the request before n8n creates the tenant administrator through
-- the Supabase Auth Admin API. The caller identity comes from the JWT sent by
-- the CRM, never from request body fields.
create or replace function public.assert_tenant_provision(
  p_clinic_slug text,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_slug text := lower(trim(coalesce(p_clinic_slug, '')));
  v_email text := lower(trim(coalesce(p_admin_email, '')));
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_super_admin is true
      and is_active is true
  ) then
    raise exception using errcode = '42501', message = 'Apenas a superadministracao pode criar clientes.';
  end if;

  if v_slug = '' or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'Identificador do cliente invalido.';
  end if;

  if v_email = '' or position('@' in v_email) < 2 then
    raise exception using errcode = '22023', message = 'E-mail do administrador invalido.';
  end if;

  if exists (select 1 from public.tenants where lower(slug) = v_slug) then
    raise exception using errcode = '23505', message = 'Ja existe um cliente com este identificador.';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception using errcode = '23505', message = 'Ja existe um usuario com este e-mail.';
  end if;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.assert_tenant_provision(text, text) from public;
grant execute on function public.assert_tenant_provision(text, text) to authenticated;

-- Completes provisioning after the Auth user was created. If any database
-- operation fails, the tenant insert and profile update are rolled back as a
-- single transaction.
create or replace function public.finalize_tenant_provision(
  p_new_user_id uuid,
  p_clinic_name text,
  p_clinic_slug text,
  p_admin_name text,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_tenant_id uuid;
  v_admin_role_id uuid;
  v_clinic_name text := trim(coalesce(p_clinic_name, ''));
  v_slug text := lower(trim(coalesce(p_clinic_slug, '')));
  v_admin_name text := trim(coalesce(p_admin_name, ''));
  v_email text := lower(trim(coalesce(p_admin_email, '')));
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_super_admin is true
      and is_active is true
  ) then
    raise exception using errcode = '42501', message = 'Apenas a superadministracao pode criar clientes.';
  end if;

  if p_new_user_id is null or v_clinic_name = '' or v_admin_name = '' then
    raise exception using errcode = '22023', message = 'Dados obrigatorios ausentes.';
  end if;

  if v_slug = '' or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'Identificador do cliente invalido.';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = p_new_user_id
      and lower(email) = v_email
  ) then
    raise exception using errcode = '22023', message = 'Usuario administrador nao encontrado.';
  end if;

  select id
  into v_admin_role_id
  from public.roles
  where lower(name) = 'admin'
  limit 1;

  if v_admin_role_id is null then
    raise exception using errcode = 'P0001', message = 'Perfil de administrador nao configurado.';
  end if;

  insert into public.tenants (name, slug, plan)
  values (v_clinic_name, v_slug, 'standard')
  returning id into v_tenant_id;

  update public.profiles
  set full_name = v_admin_name,
      tenant_id = v_tenant_id,
      role_id = v_admin_role_id,
      is_active = true,
      first_login = true,
      is_super_admin = false
  where id = p_new_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'Perfil do administrador nao foi criado.';
  end if;

  insert into public.crm_settings (tenant_id, key, value)
  values
    (v_tenant_id, 'company_name', v_clinic_name),
    (v_tenant_id, 'followup_global_enabled', 'true')
  on conflict (tenant_id, key) do update
  set value = excluded.value;

  return jsonb_build_object(
    'success', true,
    'tenantId', v_tenant_id,
    'tenantName', v_clinic_name,
    'tenantSlug', v_slug,
    'adminUserId', p_new_user_id,
    'adminEmail', v_email
  );
end;
$$;

revoke all on function public.finalize_tenant_provision(uuid, text, text, text, text) from public;
grant execute on function public.finalize_tenant_provision(uuid, text, text, text, text) to authenticated;

commit;
