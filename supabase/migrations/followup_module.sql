-- Migração SQL: Módulo de Follow-Up Automático e Tabelas de Configuração

-- 1. Adiciona colunas necessárias na tabela de contatos se não existirem
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'new';
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS email text;

-- 2. Tabela de Configurações Gerais
CREATE TABLE IF NOT EXISTS public.crm_settings (
  key   text PRIMARY KEY,
  value text
);

-- Inserts padrão
INSERT INTO public.crm_settings (key, value) VALUES
  ('company_name', 'Minha Empresa'),
  ('followup_global_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Tabela followup_rules
CREATE TABLE IF NOT EXISTS public.followup_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,                        -- Nome da regra
  is_active       boolean NOT NULL DEFAULT true,        -- Liga/desliga a regra
  trigger_event   text NOT NULL,                        -- 'last_message_in' | 'stage_entered' | 'contact_created'
  delay_hours     numeric(6,2) NOT NULL DEFAULT 24.00,  -- Horas de espera (0.5 = 30min)
  message         text NOT NULL,                        -- Template de mensagem
  channel_ids     uuid[] NOT NULL DEFAULT '{}',         -- Canais específicos
  pipeline_stages text[] NOT NULL DEFAULT '{}',       -- Filtros por estágio do Kanban
  stop_on_reply   boolean NOT NULL DEFAULT true,        -- Cancela se o contato responder
  max_attempts    integer NOT NULL DEFAULT 1,           -- Máximo de tentativas
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 4. Tabela followup_queue
CREATE TABLE IF NOT EXISTS public.followup_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id         uuid NOT NULL REFERENCES public.followup_rules(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  channel_id      uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  scheduled_at    timestamptz NOT NULL,                 -- Quando disparar
  status          text NOT NULL DEFAULT 'pending',      -- 'pending' | 'sent' | 'cancelled' | 'failed'
  attempt_number  integer NOT NULL DEFAULT 1,
  sent_at         timestamptz,
  cancel_reason   text,                                 -- 'replied_before_send' | 'rule_disabled' | 'manual_cancel'
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_followup_queue_scheduled ON public.followup_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_followup_queue_contact   ON public.followup_queue(contact_id);

-- Habilitar replicação em realtime para followup_queue
ALTER TABLE public.followup_queue REPLICA IDENTITY FULL;

-- Trigger: Atualiza updated_at automaticamente em followup_rules
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_followup_rules_updated ON public.followup_rules;
CREATE TRIGGER trg_followup_rules_updated
  BEFORE UPDATE ON public.followup_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger: Enfileiramento Automático ao criar contato (contact_created)
CREATE OR REPLACE FUNCTION public.followup_trigger_contact_created()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
    target_channel_id UUID;
    is_global_enabled TEXT;
BEGIN
    -- Verifica se o modulo de follow-up está ativado globalmente
    SELECT value INTO is_global_enabled FROM public.crm_settings WHERE key = 'followup_global_enabled';
    IF is_global_enabled IS DISTINCT FROM 'true' THEN
        RETURN NEW;
    END IF;

    -- Encontra o primeiro canal disponível como fallback
    SELECT id INTO target_channel_id FROM public.channels LIMIT 1;
    IF target_channel_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    FOR r IN 
        SELECT * FROM public.followup_rules 
        WHERE is_active = true 
          AND trigger_event = 'contact_created'
    LOOP
        -- Se o array de canais da regra não estiver vazio, checa se o canal está contido
        IF array_length(r.channel_ids, 1) IS NOT NULL AND NOT (target_channel_id = ANY(r.channel_ids)) THEN
            CONTINUE;
        END IF;

        -- Se o array de estágios não estiver vazio, checa se o estágio do contato está contido
        IF array_length(r.pipeline_stages, 1) IS NOT NULL AND NOT (COALESCE(NEW.pipeline_stage, 'new') = ANY(r.pipeline_stages)) THEN
            CONTINUE;
        END IF;

        -- Enfileira
        INSERT INTO public.followup_queue (rule_id, contact_id, channel_id, scheduled_at, status)
        VALUES (r.id, NEW.id, target_channel_id, now() + (r.delay_hours * interval '1 hour'), 'pending');
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_followup_contact_created ON public.contacts;
CREATE TRIGGER trg_followup_contact_created
  AFTER INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.followup_trigger_contact_created();

-- Trigger: Enfileiramento Automático ao mudar estágio do Kanban (stage_entered)
CREATE OR REPLACE FUNCTION public.followup_trigger_stage_entered()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
    target_channel_id UUID;
    is_global_enabled TEXT;
BEGIN
    -- Verifica se o modulo de follow-up está ativado globalmente
    SELECT value INTO is_global_enabled FROM public.crm_settings WHERE key = 'followup_global_enabled';
    IF is_global_enabled IS DISTINCT FROM 'true' THEN
        RETURN NEW;
    END IF;

    -- Apenas se mudou de estágio
    IF TG_OP = 'UPDATE' AND (OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage) THEN
        -- Encontra canal mais recente de mensagens do contato
        SELECT channel_id INTO target_channel_id 
        FROM public.messages 
        WHERE contact_id = NEW.id 
        ORDER BY timestamp DESC 
        LIMIT 1;

        IF target_channel_id IS NULL THEN
            SELECT id INTO target_channel_id FROM public.channels LIMIT 1;
        END IF;

        IF target_channel_id IS NULL THEN
            RETURN NEW;
        END IF;

        FOR r IN 
            SELECT * FROM public.followup_rules 
            WHERE is_active = true 
              AND trigger_event = 'stage_entered'
        LOOP
            -- Checa se o novo estágio está nos estágios da regra
            IF array_length(r.pipeline_stages, 1) IS NOT NULL AND NOT (NEW.pipeline_stage = ANY(r.pipeline_stages)) THEN
                CONTINUE;
            END IF;

            -- Checa se o canal está contido na regra
            IF array_length(r.channel_ids, 1) IS NOT NULL AND NOT (target_channel_id = ANY(r.channel_ids)) THEN
                CONTINUE;
            END IF;

            -- Enfileira
            INSERT INTO public.followup_queue (rule_id, contact_id, channel_id, scheduled_at, status)
            VALUES (r.id, NEW.id, target_channel_id, now() + (r.delay_hours * interval '1 hour'), 'pending');
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_followup_stage_entered ON public.contacts;
CREATE TRIGGER trg_followup_stage_entered
  AFTER UPDATE OF pipeline_stage ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.followup_trigger_stage_entered();

-- Trigger: Mensagem inbound cancela pendentes e enfileira last_message_in
CREATE OR REPLACE FUNCTION public.followup_trigger_message_inserted()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
    contact_stage TEXT;
    is_global_enabled TEXT;
BEGIN
    -- Só nos interessa mensagens inbound
    IF NEW.direction = 'in' THEN
        -- 1. Cancelar itens pendentes que devem parar ao responder
        UPDATE public.followup_queue q
        SET status = 'cancelled',
            cancel_reason = 'replied_before_send'
        FROM public.followup_rules r
        WHERE q.rule_id = r.id
          AND q.contact_id = NEW.contact_id
          AND q.status = 'pending'
          AND r.stop_on_reply = true;

        -- Verifica se o modulo de follow-up está ativado globalmente antes de enfileirar novas
        SELECT value INTO is_global_enabled FROM public.crm_settings WHERE key = 'followup_global_enabled';
        IF is_global_enabled IS DISTINCT FROM 'true' THEN
            RETURN NEW;
        END IF;

        -- Obter o estágio atual do contato para filtragem
        SELECT COALESCE(pipeline_stage, 'new') INTO contact_stage FROM public.contacts WHERE id = NEW.contact_id;

        -- 2. Enfileirar novas regras do tipo last_message_in
        FOR r IN 
            SELECT * FROM public.followup_rules 
            WHERE is_active = true 
              AND trigger_event = 'last_message_in'
        LOOP
            -- Filtra por canal
            IF array_length(r.channel_ids, 1) IS NOT NULL AND NOT (NEW.channel_id = ANY(r.channel_ids)) THEN
                CONTINUE;
            END IF;

            -- Filtra por estágio
            IF array_length(r.pipeline_stages, 1) IS NOT NULL AND NOT (contact_stage = ANY(r.pipeline_stages)) THEN
                CONTINUE;
            END IF;

            -- Enfileira
            INSERT INTO public.followup_queue (rule_id, contact_id, channel_id, scheduled_at, status)
            VALUES (r.id, NEW.contact_id, NEW.channel_id, now() + (r.delay_hours * interval '1 hour'), 'pending');
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_followup_message_inserted ON public.messages;
CREATE TRIGGER trg_followup_message_inserted
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.followup_trigger_message_inserted();
