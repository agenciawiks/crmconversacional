-- SQL Migration: Contacts and Messages RLS Hardening
-- File: supabase/migrations/contacts_messages_rls_hardening.sql

-- 1. Enable Row Level Security (RLS) on core tables
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS contacts_auth_all ON public.contacts;
DROP POLICY IF EXISTS messages_auth_all ON public.messages;
DROP POLICY IF EXISTS webhook_logs_auth_all ON public.webhook_logs;

-- 3. Create authenticated-only policies
-- Block 'anon' role from reading or writing to these tables

CREATE POLICY contacts_auth_all ON public.contacts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY messages_auth_all ON public.messages
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY webhook_logs_auth_all ON public.webhook_logs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
