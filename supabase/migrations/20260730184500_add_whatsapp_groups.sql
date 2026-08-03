-- Represent WhatsApp groups as conversations while keeping the current
-- contact-centric CRM model backwards compatible.

alter table public.contacts
  add column if not exists is_group boolean not null default false,
  add column if not exists whatsapp_jid text;

alter table public.messages
  add column if not exists is_group boolean not null default false,
  add column if not exists chat_jid text,
  add column if not exists sender_jid text,
  add column if not exists sender_name text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contacts'
      and column_name = 'tenant_id'
  ) then
    execute 'create index if not exists contacts_tenant_is_group_idx
      on public.contacts (tenant_id, is_group)';
    execute 'create index if not exists contacts_tenant_whatsapp_jid_idx
      on public.contacts (tenant_id, whatsapp_jid)
      where whatsapp_jid is not null';
  else
    execute 'create index if not exists contacts_is_group_idx
      on public.contacts (is_group)';
    execute 'create index if not exists contacts_whatsapp_jid_idx
      on public.contacts (whatsapp_jid)
      where whatsapp_jid is not null';
  end if;
end
$$;

create index if not exists messages_contact_is_group_timestamp_idx
  on public.messages (contact_id, is_group, "timestamp");

comment on column public.contacts.is_group is
  'True when this row represents a WhatsApp group conversation instead of an individual lead.';
comment on column public.contacts.whatsapp_jid is
  'Full WhatsApp conversation JID, including @g.us, @s.whatsapp.net or @lid.';
comment on column public.messages.chat_jid is
  'Full WhatsApp conversation JID. Group messages retain the @g.us suffix.';
comment on column public.messages.sender_jid is
  'Participant JID that authored a group message.';
comment on column public.messages.sender_name is
  'Participant display name captured when a group message arrived.';

-- Groups are conversations, not leads. Keep lead automation, follow-up and
-- activity triggers from treating them as people when those triggers exist.
do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgname = 'trg_followup_contact_created' and not tgisinternal
  ) and to_regprocedure('public.followup_trigger_contact_created()') is not null then
    execute 'drop trigger trg_followup_contact_created on public.contacts';
    execute $trigger$
      create trigger trg_followup_contact_created
      after insert on public.contacts
      for each row
      when (not coalesce(new.is_group, false))
      execute function public.followup_trigger_contact_created()
    $trigger$;
  end if;

  if exists (
    select 1 from pg_trigger
    where tgname = 'trg_followup_stage_entered' and not tgisinternal
  ) and to_regprocedure('public.followup_trigger_stage_entered()') is not null then
    execute 'drop trigger trg_followup_stage_entered on public.contacts';
    execute $trigger$
      create trigger trg_followup_stage_entered
      after update of pipeline_stage on public.contacts
      for each row
      when (not coalesce(new.is_group, false))
      execute function public.followup_trigger_stage_entered()
    $trigger$;
  end if;

  if exists (
    select 1 from pg_trigger
    where tgname = 'trg_contact_activity' and not tgisinternal
  ) and to_regprocedure('public.fn_log_contact_activity()') is not null then
    execute 'drop trigger trg_contact_activity on public.contacts';
    execute $trigger$
      create trigger trg_contact_activity
      after insert or update on public.contacts
      for each row
      when (not coalesce(new.is_group, false))
      execute function public.fn_log_contact_activity()
    $trigger$;
  end if;

  if exists (
    select 1 from pg_trigger
    where tgname = 'trg_followup_message_inserted' and not tgisinternal
  ) and to_regprocedure('public.followup_trigger_message_inserted()') is not null then
    execute 'drop trigger trg_followup_message_inserted on public.messages';
    execute $trigger$
      create trigger trg_followup_message_inserted
      after insert on public.messages
      for each row
      when (not coalesce(new.is_group, false))
      execute function public.followup_trigger_message_inserted()
    $trigger$;
  end if;

  if exists (
    select 1 from pg_trigger
    where tgname = 'trg_notify_n8n_ai_agent' and not tgisinternal
  ) and to_regprocedure('public.notify_n8n_ai_agent()') is not null then
    execute 'drop trigger trg_notify_n8n_ai_agent on public.messages';
    execute $trigger$
      create trigger trg_notify_n8n_ai_agent
      after insert on public.messages
      for each row
      when (not coalesce(new.is_group, false))
      execute function public.notify_n8n_ai_agent()
    $trigger$;
  end if;

  if exists (
    select 1 from pg_trigger
    where tgname = 'trg_message_activity' and not tgisinternal
  ) and to_regprocedure('public.fn_log_message_activity()') is not null then
    execute 'drop trigger trg_message_activity on public.messages';
    execute $trigger$
      create trigger trg_message_activity
      after insert on public.messages
      for each row
      when (not coalesce(new.is_group, false))
      execute function public.fn_log_message_activity()
    $trigger$;
  end if;
end
$$;
