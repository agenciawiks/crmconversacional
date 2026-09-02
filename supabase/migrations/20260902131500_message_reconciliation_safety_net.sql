begin;

alter table public.failed_messages
  add column if not exists provider_message_id text,
  add column if not exists status text not null default 'pending',
  add column if not exists attempt_count integer not null default 1,
  add column if not exists last_attempt_at timestamptz not null default now(),
  add column if not exists resolved_at timestamptz;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.failed_messages'::regclass
       and conname = 'failed_messages_status_check'
  ) then
    alter table public.failed_messages
      add constraint failed_messages_status_check
      check (status in ('pending', 'resolved')) not valid;
  end if;
end
$$;

create unique index if not exists failed_messages_reconciliation_unique_idx
  on public.failed_messages (tenant_id, channel_id, provider_message_id)
  where provider_message_id is not null;

create index if not exists failed_messages_pending_retry_idx
  on public.failed_messages (tenant_id, last_attempt_at)
  where status = 'pending';

create or replace function public.record_message_reconciliation_failure(
  p_tenant_id uuid,
  p_channel_id uuid,
  p_provider_message_id text,
  p_payload jsonb,
  p_error_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if nullif(trim(coalesce(p_provider_message_id, '')), '') is null then
    insert into public.failed_messages (
      tenant_id, channel_id, payload, error_message, status,
      attempt_count, last_attempt_at
    ) values (
      p_tenant_id, p_channel_id, coalesce(p_payload, '{}'::jsonb),
      left(coalesce(p_error_message, 'Falha desconhecida'), 1000),
      'pending', 1, now()
    ) returning id into v_id;
    return v_id;
  end if;

  insert into public.failed_messages (
    tenant_id, channel_id, provider_message_id, payload, error_message,
    status, attempt_count, last_attempt_at, resolved_at
  ) values (
    p_tenant_id, p_channel_id, trim(p_provider_message_id),
    coalesce(p_payload, '{}'::jsonb),
    left(coalesce(p_error_message, 'Falha desconhecida'), 1000),
    'pending', 1, now(), null
  )
  on conflict (tenant_id, channel_id, provider_message_id)
    where provider_message_id is not null
  do update set
    payload = excluded.payload,
    error_message = excluded.error_message,
    status = 'pending',
    attempt_count = public.failed_messages.attempt_count + 1,
    last_attempt_at = now(),
    resolved_at = null
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.resolve_message_reconciliation_failure(
  p_tenant_id uuid,
  p_channel_id uuid,
  p_provider_message_id text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.failed_messages
     set status = 'resolved',
         resolved_at = now(),
         last_attempt_at = now()
   where tenant_id = p_tenant_id
     and channel_id = p_channel_id
     and provider_message_id = trim(p_provider_message_id)
     and status <> 'resolved';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.record_message_reconciliation_failure(uuid, uuid, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.record_message_reconciliation_failure(uuid, uuid, text, jsonb, text)
  to service_role;

revoke all on function public.resolve_message_reconciliation_failure(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.resolve_message_reconciliation_failure(uuid, uuid, text)
  to service_role;

-- Repair messages by their recorded chat JID even when the temporary @lid
-- contact was never materialized. This closes the identity split permanently.
create or replace function public.reconcile_evolution_lid_messages(
  p_tenant_id uuid,
  p_channel_id uuid,
  p_lid_jid text,
  p_phone_jid text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lid_jid text := lower(trim(coalesce(p_lid_jid, '')));
  v_phone_jid text := lower(trim(coalesce(p_phone_jid, '')));
  v_phone text;
  v_contact_id uuid;
  v_count integer;
begin
  if v_lid_jid !~ '@lid$' or v_phone_jid !~ '@(s\.whatsapp\.net|c\.us)$' then
    return 0;
  end if;
  v_phone_jid := regexp_replace(v_phone_jid, '@c\.us$', '@s.whatsapp.net');
  v_phone := regexp_replace(split_part(v_phone_jid, '@', 1), '[^0-9]', '', 'g');

  select id into v_contact_id
    from public.contacts
   where tenant_id = p_tenant_id
     and (phone = v_phone or lower(coalesce(whatsapp_jid, '')) = v_phone_jid)
   order by (lower(coalesce(whatsapp_jid, '')) = v_phone_jid) desc
   limit 1;

  if v_contact_id is null then return 0; end if;

  update public.messages
     set contact_id = v_contact_id,
         chat_jid = v_phone_jid
   where tenant_id = p_tenant_id
     and channel_id = p_channel_id
     and lower(coalesce(chat_jid, '')) = v_lid_jid;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.reconcile_evolution_lid_messages(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.reconcile_evolution_lid_messages(uuid, uuid, text, text)
  to service_role;

create or replace function public.reconcile_evolution_identity_batch(
  p_tenant_id uuid,
  p_channel_id uuid,
  p_mappings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mapping jsonb;
  v_processed integer := 0;
  v_messages_relinked integer := 0;
begin
  if jsonb_typeof(coalesce(p_mappings, '[]'::jsonb)) <> 'array' then
    raise exception 'p_mappings must be an array';
  end if;

  for v_mapping in select value from jsonb_array_elements(coalesce(p_mappings, '[]'::jsonb))
  loop
    perform public.resolve_evolution_identity(
      p_tenant_id,
      p_channel_id,
      v_mapping ->> 'lid_jid',
      v_mapping ->> 'phone_jid',
      v_mapping ->> 'phone'
    );
    v_messages_relinked := v_messages_relinked + public.reconcile_evolution_lid_messages(
      p_tenant_id,
      p_channel_id,
      v_mapping ->> 'lid_jid',
      v_mapping ->> 'phone_jid'
    );
    v_processed := v_processed + 1;
  end loop;

  return jsonb_build_object(
    'processed', v_processed,
    'messages_relinked', v_messages_relinked
  );
end;
$$;

revoke all on function public.reconcile_evolution_identity_batch(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.reconcile_evolution_identity_batch(uuid, uuid, jsonb)
  to service_role;

commit;
