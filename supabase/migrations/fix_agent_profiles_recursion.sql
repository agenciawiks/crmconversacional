-- Migration SQL: Fix Infinite Recursion on agent_profiles and ai_settings
-- Path: supabase/migrations/fix_agent_profiles_recursion.sql

-- 1. Dynamically drop all policies on public.agent_profiles
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'agent_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.agent_profiles', pol.policyname);
    END LOOP;
END $$;

-- 2. Dynamically drop all policies on public.ai_settings
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'ai_settings' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.ai_settings', pol.policyname);
    END LOOP;
END $$;

-- 3. Ensure Row Level Security (RLS) is enabled on both tables
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- 4. Create new clean, non-recursive policies for public.agent_profiles
CREATE POLICY agent_profiles_select ON public.agent_profiles 
  FOR SELECT USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY agent_profiles_insert ON public.agent_profiles 
  FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY agent_profiles_update ON public.agent_profiles 
  FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY agent_profiles_delete ON public.agent_profiles 
  FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 5. Create new clean, non-recursive policies for public.ai_settings
CREATE POLICY ai_settings_select ON public.ai_settings 
  FOR SELECT USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY ai_settings_insert ON public.ai_settings 
  FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY ai_settings_update ON public.ai_settings 
  FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY ai_settings_delete ON public.ai_settings 
  FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));
