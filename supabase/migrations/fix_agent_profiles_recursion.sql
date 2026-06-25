-- Migration SQL: Fix Infinite Recursion on agent_profiles and ai_settings (Robust Dynamic Version)
-- Path: supabase/migrations/fix_agent_profiles_recursion.sql

-- 1. Process public.agent_profiles if it exists
DO $$
DECLARE
    pol record;
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'agent_profiles'
    ) THEN
        -- Drop all policies dynamically
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'agent_profiles' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY %I ON public.agent_profiles', pol.policyname);
        END LOOP;

        -- Enable RLS
        EXECUTE 'ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY';

        -- Create policies
        EXECUTE 'CREATE POLICY agent_profiles_select ON public.agent_profiles FOR SELECT USING (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY agent_profiles_insert ON public.agent_profiles FOR INSERT WITH CHECK (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY agent_profiles_update ON public.agent_profiles FOR UPDATE USING (auth.role() IN (''anon'', ''authenticated'')) WITH CHECK (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY agent_profiles_delete ON public.agent_profiles FOR DELETE USING (auth.role() IN (''anon'', ''authenticated''))';
    END IF;
END $$;

-- 2. Process public.ai_settings if it exists
DO $$
DECLARE
    pol record;
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'ai_settings'
    ) THEN
        -- Drop all policies dynamically
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'ai_settings' AND schemaname = 'public'
        -- Loop to drop
        LOOP
            EXECUTE format('DROP POLICY %I ON public.ai_settings', pol.policyname);
        END LOOP;

        -- Enable RLS
        EXECUTE 'ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY';

        -- Create policies
        EXECUTE 'CREATE POLICY ai_settings_select ON public.ai_settings FOR SELECT USING (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY ai_settings_insert ON public.ai_settings FOR INSERT WITH CHECK (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY ai_settings_update ON public.ai_settings FOR UPDATE USING (auth.role() IN (''anon'', ''authenticated'')) WITH CHECK (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY ai_settings_delete ON public.ai_settings FOR DELETE USING (auth.role() IN (''anon'', ''authenticated''))';
    END IF;
END $$;
