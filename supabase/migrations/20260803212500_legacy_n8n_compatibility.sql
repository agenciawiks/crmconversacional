begin;

-- The current production inbound workflow still upserts contacts with
-- on_conflict=phone. Keep that contract until every [PROD] workflow is moved
-- to on_conflict=tenant_id,phone.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.contacts'::regclass
      and conname = 'contacts_phone_key'
  ) then
    alter table public.contacts
      add constraint contacts_phone_key unique (phone);
  end if;
end
$$;

commit;
