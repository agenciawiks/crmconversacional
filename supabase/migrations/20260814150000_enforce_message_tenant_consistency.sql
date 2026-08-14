-- Keep each message in the same tenant as its contact.
-- This repairs rows created by older outbound workflows and prevents recurrence.

create or replace function public.enforce_message_contact_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  contact_tenant_id uuid;
begin
  select c.tenant_id
    into contact_tenant_id
  from public.contacts c
  where c.id = new.contact_id;

  if contact_tenant_id is not null then
    new.tenant_id := contact_tenant_id;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_message_contact_tenant() from public;

drop trigger if exists messages_enforce_contact_tenant on public.messages;

create trigger messages_enforce_contact_tenant
before insert or update of contact_id, tenant_id
on public.messages
for each row
execute function public.enforce_message_contact_tenant();

update public.messages m
set tenant_id = c.tenant_id
from public.contacts c
where c.id = m.contact_id
  and m.tenant_id is distinct from c.tenant_id;
