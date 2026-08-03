alter table public.messages
  add column if not exists status text,
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz,
  add column if not exists played_at timestamptz;

update public.messages
set status = case
  when direction = 'out' then 'sent'
  else 'received'
end
where status is null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'tenant_id'
  ) then
    execute 'create index if not exists messages_tenant_whatsapp_msg_id_idx
      on public.messages (tenant_id, whatsapp_msg_id)
      where whatsapp_msg_id is not null';
  else
    execute 'create index if not exists messages_whatsapp_msg_id_idx
      on public.messages (whatsapp_msg_id)
      where whatsapp_msg_id is not null';
  end if;
end
$$;

comment on column public.messages.status is
  'Delivery state: sending, sent, delivered, read, played, failed or received.';

create or replace function public.preserve_message_status_progression()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  previous_rank integer;
  next_rank integer;
begin
  previous_rank := case old.status
    when 'sending' then 1
    when 'sent' then 2
    when 'failed' then 2
    when 'delivered' then 3
    when 'read' then 4
    when 'played' then 5
    else 0
  end;

  next_rank := case new.status
    when 'sending' then 1
    when 'sent' then 2
    when 'failed' then 2
    when 'delivered' then 3
    when 'read' then 4
    when 'played' then 5
    else 0
  end;

  if previous_rank > next_rank then
    new.status := old.status;
  end if;

  new.delivered_at := coalesce(new.delivered_at, old.delivered_at);
  new.read_at := coalesce(new.read_at, old.read_at);
  new.played_at := coalesce(new.played_at, old.played_at);

  return new;
end;
$$;

drop trigger if exists preserve_message_status_progression
  on public.messages;

create trigger preserve_message_status_progression
before update of status, delivered_at, read_at, played_at
on public.messages
for each row
execute function public.preserve_message_status_progression();

notify pgrst, 'reload schema';
