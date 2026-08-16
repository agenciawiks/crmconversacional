-- Keep AI prompts editable from the CRM while preventing saved API keys from
-- being returned to the browser. The tenant is always derived from the channel.

alter table public.ai_settings
  add column if not exists quota_status text,
  add column if not exists last_checked_at timestamptz;

create or replace function public.get_ai_settings_safe(p_channel_id uuid)
returns table (
  id uuid,
  tenant_id uuid,
  channel_id uuid,
  is_enabled boolean,
  temperature numeric,
  pause_trigger_phrases text[],
  agent_name text,
  model text,
  system_prompt text,
  negative_prompt text,
  welcome_message text,
  api_key_configured boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_channel_tenant uuid;
  v_row public.ai_settings%rowtype;
  v_prompt jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select c.tenant_id into v_channel_tenant
  from public.channels c
  where c.id = p_channel_id;

  if v_channel_tenant is null then
    return;
  end if;

  if not public.is_super_admin()
     and v_channel_tenant is distinct from public.current_tenant_id() then
    raise exception 'Channel does not belong to the current tenant';
  end if;

  select a.* into v_row
  from public.ai_settings a
  where a.channel_id = p_channel_id
    and a.tenant_id = v_channel_tenant
  limit 1;

  if not found then
    return;
  end if;

  begin
    v_prompt := coalesce(v_row.system_prompt, '{}')::jsonb;
  exception when others then
    v_prompt := jsonb_build_object('system_prompt', coalesce(v_row.system_prompt, ''));
  end;

  return query select
    v_row.id,
    v_row.tenant_id,
    v_row.channel_id,
    coalesce(v_row.is_enabled, false),
    coalesce(v_row.temperature, 0.7),
    coalesce(v_row.pause_trigger_phrases, array[]::text[]),
    coalesce(v_prompt ->> 'agent_name', 'Agente de IA'),
    coalesce(v_prompt ->> 'model', 'gpt-4o-mini'),
    coalesce(v_prompt ->> 'system_prompt', ''),
    coalesce(v_prompt ->> 'negative_prompt', ''),
    coalesce(v_prompt ->> 'welcome_message', ''),
    nullif(btrim(v_prompt ->> 'api_key'), '') is not null;
end;
$$;

create or replace function public.upsert_ai_settings_secure(
  p_channel_id uuid,
  p_is_enabled boolean,
  p_agent_name text,
  p_model text,
  p_api_key text,
  p_temperature numeric,
  p_system_prompt text,
  p_negative_prompt text,
  p_welcome_message text,
  p_pause_trigger_phrases text[]
)
returns table (
  id uuid,
  tenant_id uuid,
  channel_id uuid,
  api_key_configured boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel_tenant uuid;
  v_existing_prompt jsonb := '{}'::jsonb;
  v_prompt jsonb;
  v_saved public.ai_settings%rowtype;
  v_can_manage boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select public.is_super_admin() or exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_id = p.role_id
    where p.id = auth.uid()
      and rp.permission_key = 'manage_ai_agent'
      and rp.allowed = true
  ) into v_can_manage;

  if not coalesce(v_can_manage, false) then
    raise exception 'Permission manage_ai_agent required';
  end if;

  select c.tenant_id into v_channel_tenant
  from public.channels c
  where c.id = p_channel_id;

  if v_channel_tenant is null then
    raise exception 'Channel not found';
  end if;

  if not public.is_super_admin()
     and v_channel_tenant is distinct from public.current_tenant_id() then
    raise exception 'Channel does not belong to the current tenant';
  end if;

  begin
    select coalesce(a.system_prompt, '{}')::jsonb into v_existing_prompt
    from public.ai_settings a
    where a.channel_id = p_channel_id
      and a.tenant_id = v_channel_tenant
    limit 1;
  exception when others then
    v_existing_prompt := '{}'::jsonb;
  end;

  v_prompt := jsonb_build_object(
    'agent_name', coalesce(nullif(btrim(p_agent_name), ''), 'Agente de IA'),
    'model', coalesce(nullif(btrim(p_model), ''), 'gpt-4o-mini'),
    'system_prompt', coalesce(p_system_prompt, ''),
    'negative_prompt', coalesce(p_negative_prompt, ''),
    'welcome_message', coalesce(p_welcome_message, '')
  );

  if nullif(btrim(p_api_key), '') is not null then
    v_prompt := v_prompt || jsonb_build_object('api_key', btrim(p_api_key));
  elsif nullif(btrim(v_existing_prompt ->> 'api_key'), '') is not null then
    v_prompt := v_prompt || jsonb_build_object('api_key', v_existing_prompt ->> 'api_key');
  end if;

  insert into public.ai_settings (
    tenant_id,
    channel_id,
    system_prompt,
    temperature,
    pause_trigger_phrases,
    is_enabled
  ) values (
    v_channel_tenant,
    p_channel_id,
    v_prompt::text,
    greatest(0, least(coalesce(p_temperature, 0.7), 1.2)),
    coalesce(p_pause_trigger_phrases, array[]::text[]),
    coalesce(p_is_enabled, false)
  )
  on conflict on constraint unique_channel_tenant do update set
    system_prompt = excluded.system_prompt,
    temperature = excluded.temperature,
    pause_trigger_phrases = excluded.pause_trigger_phrases,
    is_enabled = excluded.is_enabled
  returning * into v_saved;

  return query select
    v_saved.id,
    v_saved.tenant_id,
    v_saved.channel_id,
    nullif(btrim(v_prompt ->> 'api_key'), '') is not null;
end;
$$;

revoke all on function public.get_ai_settings_safe(uuid) from public;
revoke all on function public.upsert_ai_settings_secure(uuid, boolean, text, text, text, numeric, text, text, text, text[]) from public;
grant execute on function public.get_ai_settings_safe(uuid) to authenticated;
grant execute on function public.upsert_ai_settings_secure(uuid, boolean, text, text, text, numeric, text, text, text, text[]) to authenticated;

-- Direct table access would expose the write-only API key embedded in the
-- compatibility JSON. All browser reads and writes now use the RPCs above.
revoke all on table public.ai_settings from anon, authenticated;

notify pgrst, 'reload schema';
