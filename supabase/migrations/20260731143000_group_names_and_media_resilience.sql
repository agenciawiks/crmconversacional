-- Protect resolved WhatsApp group names and track permanent media persistence.

alter table public.messages
  add column if not exists media_mime_type text,
  add column if not exists media_storage_status text,
  add column if not exists media_storage_error text;

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update
set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'SELECT'
      and coalesce(qual, '') ilike '%media%'
  ) then
    create policy media_public_select
      on storage.objects
      for select
      to public
      using (bucket_id = 'media');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'INSERT'
      and coalesce(with_check, '') ilike '%media%'
  ) then
    create policy media_public_insert
      on storage.objects
      for insert
      to public
      with check (bucket_id = 'media');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'UPDATE'
      and (
        coalesce(qual, '') ilike '%media%'
        or coalesce(with_check, '') ilike '%media%'
      )
  ) then
    create policy media_public_update
      on storage.objects
      for update
      to public
      using (bucket_id = 'media')
      with check (bucket_id = 'media');
  end if;
end
$$;

update public.messages
set media_storage_status = case
  when content_type in ('image', 'audio', 'video', 'document', 'sticker')
    then case
      when media_url like '%/storage/v1/object/public/media/%'
        then 'ready'
      else 'legacy'
    end
  else 'not_applicable'
end
where media_storage_status is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_media_storage_status_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_media_storage_status_check
      check (
        media_storage_status is null or
        media_storage_status in ('not_applicable', 'pending', 'ready', 'failed', 'legacy')
      ) not valid;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'messages'
      and column_name = 'tenant_id'
  ) then
    execute 'create index if not exists messages_media_storage_retry_idx
      on public.messages (tenant_id, media_storage_status, "timestamp")
      where media_storage_status in (''pending'', ''failed'', ''legacy'')';
  else
    execute 'create index if not exists messages_media_storage_retry_idx
      on public.messages (media_storage_status, "timestamp")
      where media_storage_status in (''pending'', ''failed'', ''legacy'')';
  end if;
end
$$;

comment on column public.messages.media_mime_type is
  'MIME type reported by Evolution when the media was received.';
comment on column public.messages.media_storage_status is
  'Permanent media persistence state: not_applicable, pending, ready, failed or legacy.';
comment on column public.messages.media_storage_error is
  'Last bounded error recorded while copying inbound media to permanent storage.';

create or replace function public.is_generic_whatsapp_group_name(value text)
returns boolean
language sql
immutable
parallel safe
set search_path = public
as $$
  select
    nullif(btrim(coalesce(value, '')), '') is null
    or lower(btrim(coalesce(value, ''))) = 'grupo whatsapp'
    or btrim(coalesce(value, '')) ~* '^Grupo WhatsApp[^[:digit:]]+[0-9]{1,6}$';
$$;

create or replace function public.preserve_resolved_whatsapp_group_name()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(new.is_group, false)
     and coalesce(old.is_group, false)
     and not public.is_generic_whatsapp_group_name(old.name)
     and public.is_generic_whatsapp_group_name(new.name) then
    new.name := old.name;
  end if;

  return new;
end;
$$;

drop trigger if exists preserve_resolved_whatsapp_group_name
  on public.contacts;

create trigger preserve_resolved_whatsapp_group_name
before update of name, is_group
on public.contacts
for each row
execute function public.preserve_resolved_whatsapp_group_name();

notify pgrst, 'reload schema';
