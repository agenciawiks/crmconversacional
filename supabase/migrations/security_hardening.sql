-- Migração SQL: Hardening de Segurança (RLS e Políticas de Acesso)
-- Arquivo: supabase/migrations/security_hardening.sql
-- Versão Robusta: Todas as alterações de tabela/política são condicionais e executadas via SQL dinâmico.

-- 1. Configuração para crm_settings
DO $$
DECLARE
    pol record;
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'crm_settings'
    ) THEN
        -- Habilitar RLS
        EXECUTE 'ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY';

        -- Limpar políticas existentes
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'crm_settings' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY %I ON public.crm_settings', pol.policyname);
        END LOOP;

        -- Criar novas políticas
        EXECUTE 'CREATE POLICY crm_settings_select ON public.crm_settings FOR SELECT USING (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY crm_settings_insert ON public.crm_settings FOR INSERT WITH CHECK (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY crm_settings_update ON public.crm_settings FOR UPDATE USING (auth.role() IN (''anon'', ''authenticated'')) WITH CHECK (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY crm_settings_delete ON public.crm_settings FOR DELETE USING (auth.role() IN (''anon'', ''authenticated''))';

        -- Habilitar replicação em realtime
        EXECUTE 'ALTER TABLE public.crm_settings REPLICA IDENTITY FULL';
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'crm_settings'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_settings;
        END IF;
    END IF;
END $$;

-- 2. Configuração para followup_rules
DO $$
DECLARE
    pol record;
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'followup_rules'
    ) THEN
        -- Habilitar RLS
        EXECUTE 'ALTER TABLE public.followup_rules ENABLE ROW LEVEL SECURITY';

        -- Limpar políticas existentes
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'followup_rules' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY %I ON public.followup_rules', pol.policyname);
        END LOOP;

        -- Criar novas políticas
        EXECUTE 'CREATE POLICY followup_rules_select ON public.followup_rules FOR SELECT USING (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY followup_rules_insert ON public.followup_rules FOR INSERT WITH CHECK (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY followup_rules_update ON public.followup_rules FOR UPDATE USING (auth.role() IN (''anon'', ''authenticated'')) WITH CHECK (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY followup_rules_delete ON public.followup_rules FOR DELETE USING (auth.role() IN (''anon'', ''authenticated''))';
    END IF;
END $$;

-- 3. Configuração para followup_queue
DO $$
DECLARE
    pol record;
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'followup_queue'
    ) THEN
        -- Habilitar RLS
        EXECUTE 'ALTER TABLE public.followup_queue ENABLE ROW LEVEL SECURITY';

        -- Limpar políticas existentes
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'followup_queue' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY %I ON public.followup_queue', pol.policyname);
        END LOOP;

        -- Criar novas políticas
        EXECUTE 'CREATE POLICY followup_queue_select ON public.followup_queue FOR SELECT USING (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY followup_queue_insert ON public.followup_queue FOR INSERT WITH CHECK (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY followup_queue_update ON public.followup_queue FOR UPDATE USING (auth.role() IN (''anon'', ''authenticated'')) WITH CHECK (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY followup_queue_delete ON public.followup_queue FOR DELETE USING (auth.role() IN (''anon'', ''authenticated''))';
    END IF;
END $$;

-- 4. Configuração para ai_settings (Mitiga recursão com agent_profiles)
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
        -- Habilitar RLS
        EXECUTE 'ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY';

        -- Limpar políticas existentes
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'ai_settings' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY %I ON public.ai_settings', pol.policyname);
        END LOOP;

        -- Criar novas políticas
        EXECUTE 'CREATE POLICY ai_settings_select ON public.ai_settings FOR SELECT USING (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY ai_settings_insert ON public.ai_settings FOR INSERT WITH CHECK (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY ai_settings_update ON public.ai_settings FOR UPDATE USING (auth.role() IN (''anon'', ''authenticated'')) WITH CHECK (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY ai_settings_delete ON public.ai_settings FOR DELETE USING (auth.role() IN (''anon'', ''authenticated''))';
    END IF;
END $$;

-- 5. Configuração para agent_profiles
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
        -- Habilitar RLS
        EXECUTE 'ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY';

        -- Limpar políticas existentes
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'agent_profiles' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY %I ON public.agent_profiles', pol.policyname);
        END LOOP;

        -- Criar novas políticas
        EXECUTE 'CREATE POLICY agent_profiles_select ON public.agent_profiles FOR SELECT USING (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY agent_profiles_insert ON public.agent_profiles FOR INSERT WITH CHECK (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY agent_profiles_update ON public.agent_profiles FOR UPDATE USING (auth.role() IN (''anon'', ''authenticated'')) WITH CHECK (auth.role() IN (''anon'', ''authenticated''))';
        EXECUTE 'CREATE POLICY agent_profiles_delete ON public.agent_profiles FOR DELETE USING (auth.role() IN (''anon'', ''authenticated''))';
    END IF;
END $$;

-- 6. Criar funções RPC para tags jsonb em contatos caso a tabela contacts exista
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'contacts'
    ) THEN
        -- Função para renomeação em lote de tags
        EXECUTE $func$
        CREATE OR REPLACE FUNCTION public.rename_tag_in_contacts(old_name text, new_name text)
        RETURNS integer AS $body$
        DECLARE
          affected integer;
        BEGIN
          UPDATE public.contacts
          SET tags = (
            SELECT COALESCE(
              jsonb_agg(DISTINCT replaced_val),
              '[]'::jsonb
            )
            FROM (
              SELECT CASE WHEN val = old_name THEN new_name ELSE val END AS replaced_val
              FROM jsonb_array_elements_text(COALESCE(tags, '[]'::jsonb)) AS val
            ) sub
          )::jsonb
          WHERE tags ? old_name;

          GET DIAGNOSTICS affected = ROW_COUNT;
          RETURN affected;
        END;
        $body$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
        $func$;

        -- Função para exclusão em lote de tags
        EXECUTE $func$
        CREATE OR REPLACE FUNCTION public.remove_tag_from_contacts(tag_name text)
        RETURNS integer AS $body$
        DECLARE
          affected integer;
        BEGIN
          UPDATE public.contacts
          SET tags = (
            SELECT COALESCE(
              jsonb_agg(val),
              '[]'::jsonb
            )
            FROM jsonb_array_elements_text(COALESCE(tags, '[]'::jsonb)) AS val
            WHERE val <> tag_name
          )::jsonb
          WHERE tags ? tag_name;

          GET DIAGNOSTICS affected = ROW_COUNT;
          RETURN affected;
        END;
        $body$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
        $func$;

        -- Conceder permissões de execução (grants)
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.rename_tag_in_contacts(text, text) TO anon, authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.remove_tag_from_contacts(text) TO anon, authenticated';
    END IF;
END $$;
