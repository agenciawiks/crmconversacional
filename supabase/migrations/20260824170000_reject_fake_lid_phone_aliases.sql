begin;

create table if not exists public.whatsapp_jid_aliases_quarantine (
  tenant_id uuid not null,
  channel_id uuid not null,
  lid_jid text not null,
  phone_jid text not null,
  phone text not null,
  created_at timestamptz,
  updated_at timestamptz,
  quarantined_at timestamptz not null default now(),
  reason text not null,
  primary key (tenant_id, channel_id, lid_jid, quarantined_at)
);

alter table public.whatsapp_jid_aliases_quarantine enable row level security;
revoke all on table public.whatsapp_jid_aliases_quarantine from anon, authenticated;

insert into public.whatsapp_jid_aliases_quarantine (
  tenant_id, channel_id, lid_jid, phone_jid, phone,
  created_at, updated_at, reason
)
select
  tenant_id, channel_id, lid_jid, phone_jid, phone,
  created_at, updated_at, 'LID digits were incorrectly stored as a phone number'
from public.whatsapp_jid_aliases
where regexp_replace(split_part(lid_jid, '@', 1), '[^0-9]', '', 'g')
    = regexp_replace(split_part(phone_jid, '@', 1), '[^0-9]', '', 'g');

delete from public.whatsapp_jid_aliases
where regexp_replace(split_part(lid_jid, '@', 1), '[^0-9]', '', 'g')
    = regexp_replace(split_part(phone_jid, '@', 1), '[^0-9]', '', 'g');

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
  v_lid_digits text;
  v_phone_digits text;
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

  v_lid_digits := regexp_replace(split_part(v_lid_jid, '@', 1), '[^0-9]', '', 'g');
  v_phone_digits := regexp_replace(split_part(v_phone_jid, '@', 1), '[^0-9]', '', 'g');

  if v_lid_digits <> '' and v_phone_digits = v_lid_digits then
    v_phone_jid := '';
    v_phone := '';
  elsif v_phone_jid <> '' then
    v_phone := v_phone_digits;
  elsif v_lid_jid = '' and length(v_phone) >= 8 then
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
       and (
         lower(coalesce(c.whatsapp_jid, '')) = v_lid_jid
         or (
           c.phone = v_lid_digits
           and lower(coalesce(c.whatsapp_jid, '')) = v_lid_digits || '@s.whatsapp.net'
         )
       )
     order by (lower(coalesce(c.whatsapp_jid, '')) = v_lid_jid) desc
     limit 1;

    if v_lid_contact_id is not null and v_phone_contact_id is not null
       and v_lid_contact_id <> v_phone_contact_id then
      update public.messages
         set contact_id = v_phone_contact_id,
             chat_jid = v_phone_jid
       where tenant_id = p_tenant_id
         and channel_id = p_channel_id
         and (
           contact_id = v_lid_contact_id
           or lower(coalesce(chat_jid, '')) = v_lid_jid
           or lower(coalesce(chat_jid, '')) = v_lid_digits || '@s.whatsapp.net'
         );
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

revoke all on function public.resolve_evolution_identity(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.resolve_evolution_identity(uuid, uuid, text, text, text)
  to service_role;

commit;
