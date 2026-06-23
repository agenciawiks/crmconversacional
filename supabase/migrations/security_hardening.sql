-- Migração SQL: Hardening de Segurança (RLS e Políticas de Acesso)
-- Arquivo: supabase/migrations/security_hardening.sql

-- 1. Habilitar Row Level Security (RLS) nas novas tabelas
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_queue ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas existentes que possam causar recursão ou conflito
DROP POLICY IF EXISTS crm_settings_select ON public.crm_settings;
DROP POLICY IF EXISTS crm_settings_insert ON public.crm_settings;
DROP POLICY IF EXISTS crm_settings_update ON public.crm_settings;
DROP POLICY IF EXISTS crm_settings_delete ON public.crm_settings;

DROP POLICY IF EXISTS followup_rules_select ON public.followup_rules;
DROP POLICY IF EXISTS followup_rules_insert ON public.followup_rules;
DROP POLICY IF EXISTS followup_rules_update ON public.followup_rules;
DROP POLICY IF EXISTS followup_rules_delete ON public.followup_rules;

DROP POLICY IF EXISTS followup_queue_select ON public.followup_queue;
DROP POLICY IF EXISTS followup_queue_insert ON public.followup_queue;
DROP POLICY IF EXISTS followup_queue_update ON public.followup_queue;
DROP POLICY IF EXISTS followup_queue_delete ON public.followup_queue;

DROP POLICY IF EXISTS ai_settings_select ON public.ai_settings;
DROP POLICY IF EXISTS ai_settings_insert ON public.ai_settings;
DROP POLICY IF EXISTS ai_settings_update ON public.ai_settings;
DROP POLICY IF EXISTS ai_settings_delete ON public.ai_settings;

DROP POLICY IF EXISTS agent_profiles_select ON public.agent_profiles;
DROP POLICY IF EXISTS agent_profiles_insert ON public.agent_profiles;
DROP POLICY IF EXISTS agent_profiles_update ON public.agent_profiles;
DROP POLICY IF EXISTS agent_profiles_delete ON public.agent_profiles;

-- 3. Definir Políticas de Acesso para public.crm_settings
-- Permite leitura e escrita para anon e authenticated (necessário pois o frontend opera sem login)
CREATE POLICY crm_settings_select ON public.crm_settings
  FOR SELECT USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY crm_settings_insert ON public.crm_settings
  FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY crm_settings_update ON public.crm_settings
  FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY crm_settings_delete ON public.crm_settings
  FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 4. Definir Políticas de Acesso para public.followup_rules
CREATE POLICY followup_rules_select ON public.followup_rules
  FOR SELECT USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY followup_rules_insert ON public.followup_rules
  FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY followup_rules_update ON public.followup_rules
  FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY followup_rules_delete ON public.followup_rules
  FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 5. Definir Políticas de Acesso para public.followup_queue
CREATE POLICY followup_queue_select ON public.followup_queue
  FOR SELECT USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY followup_queue_insert ON public.followup_queue
  FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY followup_queue_update ON public.followup_queue
  FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY followup_queue_delete ON public.followup_queue
  FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 6. Definir Políticas de Acesso Corrigidas para public.ai_settings (Mitiga recursão com agent_profiles)
CREATE POLICY ai_settings_select ON public.ai_settings
  FOR SELECT USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY ai_settings_insert ON public.ai_settings
  FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY ai_settings_update ON public.ai_settings
  FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY ai_settings_delete ON public.ai_settings
  FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 7. Definir Políticas de Acesso Corrigidas para public.agent_profiles
CREATE POLICY agent_profiles_select ON public.agent_profiles
  FOR SELECT USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY agent_profiles_insert ON public.agent_profiles
  FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY agent_profiles_update ON public.agent_profiles
  FOR UPDATE USING (auth.role() IN ('anon', 'authenticated')) WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY agent_profiles_delete ON public.agent_profiles
  FOR DELETE USING (auth.role() IN ('anon', 'authenticated'));

-- 8. Habilitar replicação em realtime para a tabela crm_settings
ALTER TABLE public.crm_settings REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'crm_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_settings;
  END IF;
END $$;

-- 9. Criar função RPC para renomeação em lote de tags jsonb em contatos
CREATE OR REPLACE FUNCTION public.rename_tag_in_contacts(old_name text, new_name text)
RETURNS integer AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 10. Criar função RPC para exclusão em lote de tags jsonb em contatos
DROP FUNCTION IF EXISTS public.remove_tag_from_contacts(text);

CREATE OR REPLACE FUNCTION public.remove_tag_from_contacts(tag_name text)
RETURNS integer AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 11. Conceder permissões de execução (grants) para os papéis do frontend
GRANT EXECUTE ON FUNCTION public.rename_tag_in_contacts(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_tag_from_contacts(text) TO anon, authenticated;

