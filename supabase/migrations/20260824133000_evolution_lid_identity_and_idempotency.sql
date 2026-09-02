begin;

create table if not exists public.whatsapp_jid_aliases (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  lid_jid text not null,
  phone_jid text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, channel_id, lid_jid)
);

create index if not exists whatsapp_jid_aliases_phone_idx
  on public.whatsapp_jid_aliases (tenant_id, channel_id, phone);

alter table public.whatsapp_jid_aliases enable row level security;
revoke all on table public.whatsapp_jid_aliases from anon, authenticated;

create or replace function public.resolve_evolution_identity(
  p_tenant_id uuid,
  p_channel_id uuid,
  p_lid_jid text default null,
  p_phone_jid text default null,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lid_jid text := lower(trim(coalesce(p_lid_jid, '')));
  v_phone_jid text := lower(trim(coalesce(p_phone_jid, '')));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_lid_contact_id uuid;
  v_phone_contact_id uuid;
begin
  if v_lid_jid !~ '@lid$' then
    v_lid_jid := '';
  end if;

  if v_phone_jid ~ '@c\.us$' then
    v_phone_jid := regexp_replace(v_phone_jid, '@c\.us$', '@s.whatsapp.net');
  end if;

  if v_phone_jid !~ '@s\.whatsapp\.net$' then
    v_phone_jid := '';
  end if;

  if v_phone_jid <> '' then
    v_phone := split_part(v_phone_jid, '@', 1);
    v_phone := split_part(v_phone, ':', 1);
    v_phone := regexp_replace(v_phone, '[^0-9]', '', 'g');
  elsif length(v_phone) >= 8 then
    v_phone_jid := v_phone || '@s.whatsapp.net';
  else
    v_phone := '';
  end if;

  if v_lid_jid <> '' and v_phone_jid <> '' then
    insert into public.whatsapp_jid_aliases (
      tenant_id, channel_id, lid_jid, phone_jid, phone, updated_at
    ) values (
      p_tenant_id, p_channel_id, v_lid_jid, v_phone_jid, v_phone, now()
    )
    on conflict (tenant_id, channel_id, lid_jid) do update
      set phone_jid = excluded.phone_jid,
          phone = excluded.phone,
          updated_at = now();
  elsif v_lid_jid <> '' then
    select a.phone_jid, a.phone
      into v_phone_jid, v_phone
      from public.whatsapp_jid_aliases a
     where a.tenant_id = p_tenant_id
       and a.channel_id = p_channel_id
       and a.lid_jid = v_lid_jid;
  end if;

  if coalesce(v_phone_jid, '') <> '' and v_lid_jid <> '' then
    select c.id
      into v_phone_contact_id
      from public.contacts c
     where c.tenant_id = p_tenant_id
       and (c.phone = v_phone or lower(coalesce(c.whatsapp_jid, '')) = v_phone_jid)
     order by (lower(coalesce(c.whatsapp_jid, '')) = v_phone_jid) desc
     limit 1;

    select c.id
      into v_lid_contact_id
      from public.contacts c
     where c.tenant_id = p_tenant_id
       and lower(coalesce(c.whatsapp_jid, '')) = v_lid_jid
     limit 1;

    if v_lid_contact_id is not null and v_phone_contact_id is not null
       and v_lid_contact_id <> v_phone_contact_id then
      update public.messages
         set contact_id = v_phone_contact_id,
             chat_jid = v_phone_jid
       where tenant_id = p_tenant_id
         and channel_id = p_channel_id
         and (contact_id = v_lid_contact_id or lower(coalesce(chat_jid, '')) = v_lid_jid);
    elsif v_lid_contact_id is not null and v_phone_contact_id is null then
      update public.contacts
         set phone = v_phone,
             whatsapp_jid = v_phone_jid,
             updated_at = now()
       where id = v_lid_contact_id
         and tenant_id = p_tenant_id;
    end if;
  end if;

  return jsonb_build_object(
    'phone', nullif(v_phone, ''),
    'whatsapp_jid', coalesce(nullif(v_phone_jid, ''), nullif(v_lid_jid, '')),
    'lid_jid', nullif(v_lid_jid, ''),
    'resolved', coalesce(v_phone_jid, '') <> ''
  );
end;
$$;

create or replace function public.persist_evolution_message(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := (p_payload ->> 'tenant_id')::uuid;
  v_message_id text := nullif(trim(p_payload ->> 'whatsapp_msg_id'), '');
  v_existing_id uuid;
  v_result jsonb;
begin
  if v_tenant_id is null then
    raise exception 'tenant_id is required';
  end if;

  if v_message_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(v_tenant_id::text || ':' || v_message_id, 0));

    select m.id
      into v_existing_id
      from public.messages m
     where m.tenant_id = v_tenant_id
       and m.whatsapp_msg_id = v_message_id
     order by m.timestamp asc
     limit 1;
  end if;

  if v_existing_id is not null then
    update public.messages
       set contact_id = coalesce((p_payload ->> 'contact_id')::uuid, contact_id),
           channel_id = coalesce((p_payload ->> 'channel_id')::uuid, channel_id),
           chat_jid = coalesce(nullif(p_payload ->> 'chat_jid', ''), chat_jid),
           sender_jid = coalesce(nullif(p_payload ->> 'sender_jid', ''), sender_jid),
           sender_name = coalesce(nullif(p_payload ->> 'sender_name', ''), sender_name),
           media_url = coalesce(nullif(p_payload ->> 'media_url', ''), media_url),
           media_mime_type = coalesce(nullif(p_payload ->> 'media_mime_type', ''), media_mime_type),
           media_storage_status = coalesce(nullif(p_payload ->> 'media_storage_status', ''), media_storage_status),
           media_storage_error = coalesce(nullif(p_payload ->> 'media_storage_error', ''), media_storage_error),
           status = coalesce(nullif(p_payload ->> 'status', ''), status),
           delivered_at = coalesce((p_payload ->> 'delivered_at')::timestamptz, delivered_at),
           read_at = coalesce((p_payload ->> 'read_at')::timestamptz, read_at),
           played_at = coalesce((p_payload ->> 'played_at')::timestamptz, played_at)
     where id = v_existing_id;
  else
    insert into public.messages (
      tenant_id, channel_id, contact_id, direction, content, content_type,
      media_url, whatsapp_msg_id, timestamp, status, delivered_at, read_at,
      played_at, is_group, chat_jid, sender_jid, sender_name,
      media_mime_type, media_storage_status, media_storage_error
    ) values (
      v_tenant_id,
      (p_payload ->> 'channel_id')::uuid,
      (p_payload ->> 'contact_id')::uuid,
      p_payload ->> 'direction',
      coalesce(p_payload ->> 'content', ''),
      coalesce(p_payload ->> 'content_type', 'text'),
      nullif(p_payload ->> 'media_url', ''),
      v_message_id,
      coalesce((p_payload ->> 'timestamp')::timestamptz, now()),
      coalesce(nullif(p_payload ->> 'status', ''), 'received'),
      (p_payload ->> 'delivered_at')::timestamptz,
      (p_payload ->> 'read_at')::timestamptz,
      (p_payload ->> 'played_at')::timestamptz,
      coalesce((p_payload ->> 'is_group')::boolean, false),
      nullif(p_payload ->> 'chat_jid', ''),
      nullif(p_payload ->> 'sender_jid', ''),
      nullif(p_payload ->> 'sender_name', ''),
      nullif(p_payload ->> 'media_mime_type', ''),
      coalesce(nullif(p_payload ->> 'media_storage_status', ''), 'not_applicable'),
      nullif(p_payload ->> 'media_storage_error', '')
    ) returning id into v_existing_id;
  end if;

  select to_jsonb(m) into v_result from public.messages m where m.id = v_existing_id;
  return v_result;
end;
$$;

revoke all on function public.resolve_evolution_identity(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.persist_evolution_message(jsonb) from public, anon, authenticated;
grant execute on function public.resolve_evolution_identity(uuid, uuid, text, text, text) to service_role;
grant execute on function public.persist_evolution_message(jsonb) to service_role;

commit;
