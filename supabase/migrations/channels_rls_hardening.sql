-- SQL Migration: Channels RLS Hardening
-- File: supabase/migrations/channels_rls_hardening.sql

-- 1. Ensure Row Level Security is enabled on the channels table
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- 2. Drop any legacy/permissive policies on channels
DROP POLICY IF EXISTS channel_select ON public.channels;
DROP POLICY IF EXISTS channel_insert ON public.channels;
DROP POLICY IF EXISTS channel_update ON public.channels;
DROP POLICY IF EXISTS channel_delete ON public.channels;

-- 3. Create secure policies that restrict access to logged-in (authenticated) users only
-- The 'anon' role (public/non-logged-in frontend) is strictly blocked from all operations.
CREATE POLICY channel_select ON public.channels 
    FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY channel_insert ON public.channels 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY channel_update ON public.channels 
    FOR UPDATE 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY channel_delete ON public.channels 
    FOR DELETE 
    TO authenticated 
    USING (true);
