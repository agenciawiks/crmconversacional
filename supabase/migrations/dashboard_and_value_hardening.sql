-- 1. Adicionar coluna value em contacts se não existir
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS value numeric DEFAULT 0;

-- 2. Criar tabela de log de atividades se não existir
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'bot', 'won', 'lost', 'webhook', 'lead', 'note', 'status_changed'
    title VARCHAR(255) NOT NULL,
    meta TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS na tabela de logs de atividades
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança de forma idempotente e segura
DO $$
BEGIN
    -- Política de SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'activity_log' AND policyname = 'activity_log_select'
    ) THEN
        CREATE POLICY activity_log_select ON public.activity_log 
            FOR SELECT USING (auth.role() IN ('anon', 'authenticated'));
    END IF;

    -- Política de INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'activity_log' AND policyname = 'activity_log_insert_notes'
    ) THEN
        CREATE POLICY activity_log_insert_notes ON public.activity_log 
            FOR INSERT WITH CHECK (
                auth.role() IN ('anon', 'authenticated')
                AND type = 'note'
                AND contact_id IS NOT NULL
            );
    END IF;
END $$;

-- Habilitar Realtime de forma segura
ALTER TABLE public.activity_log REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND schemaname = 'public' 
              AND tablename = 'activity_log'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
        END IF;
    END IF;
END $$;

-- 3. Função do Trigger para logar alterações nos contatos
CREATE OR REPLACE FUNCTION public.fn_log_contact_activity()
RETURNS TRIGGER AS $$
DECLARE
    contact_name TEXT;
BEGIN
    contact_name := NEW.name;
    
    -- Se for inserção de contato
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.activity_log (contact_id, type, title, meta)
        VALUES (
            NEW.id,
            'lead',
            'Novo Lead importado',
            'Lead ' || contact_name || ' foi criado no sistema.'
        );
    -- Se for atualização de estágio do funil (pipeline_stage)
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
            IF NEW.pipeline_stage = 'won' THEN
                INSERT INTO public.activity_log (contact_id, type, title, meta)
                VALUES (
                    NEW.id,
                    'won',
                    'Lead ganho! Status atualizado',
                    'Lead ' || contact_name || ' foi movido para Vendas Fechadas (Ganhos) com o valor de R$ ' || COALESCE(NEW.value::text, '0')
                );
            ELSIF NEW.pipeline_stage = 'lost' THEN
                INSERT INTO public.activity_log (contact_id, type, title, meta)
                VALUES (
                    NEW.id,
                    'lost',
                    'Lead perdido',
                    'Lead ' || contact_name || ' foi marcado como perdido.'
                );
            ELSE
                INSERT INTO public.activity_log (contact_id, type, title, meta)
                VALUES (
                    NEW.id,
                    'status_changed',
                    'Estágio do Lead atualizado',
                    'Lead ' || contact_name || ' foi movido para a etapa: ' || 
                    CASE 
                        WHEN NEW.pipeline_stage = 'new' THEN 'Novos Leads'
                        WHEN NEW.pipeline_stage = 'contacted' THEN 'Em Atendimento'
                        WHEN NEW.pipeline_stage = 'proposal' THEN 'Em Proposta'
                        ELSE NEW.pipeline_stage
                    END
                );
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Trigger nos contatos
DROP TRIGGER IF EXISTS trg_contact_activity ON public.contacts;
CREATE TRIGGER trg_contact_activity
AFTER INSERT OR UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.fn_log_contact_activity();

-- 4. Função do Trigger para logar mensagens (inbound / outbound bot / outbound manual)
CREATE OR REPLACE FUNCTION public.fn_log_message_activity()
RETURNS TRIGGER AS $$
DECLARE
    contact_name TEXT;
    contact_tags jsonb;
BEGIN
    -- Obter nome e tags do contato
    SELECT name, tags INTO contact_name, contact_tags 
    FROM public.contacts 
    WHERE id = NEW.contact_id;
    
    IF contact_name IS NULL THEN
        RETURN NEW;
    END IF;

    -- Se for mensagem recebida (inbound)
    IF NEW.direction = 'in' THEN
        -- Só loga se não houver mensagem inbound do mesmo contato nos últimos 60 minutos
        IF NOT EXISTS (
            SELECT 1 FROM public.messages 
            WHERE contact_id = NEW.contact_id 
              AND direction = 'in'
              AND id <> NEW.id
              -- Cast explícito para timestamptz para evitar incompatibilidade se o campo for texto
              AND public.messages.timestamp::timestamptz > NEW.timestamp::timestamptz - INTERVAL '60 minutes'
        ) THEN
            INSERT INTO public.activity_log (contact_id, type, title, meta)
            VALUES (
                NEW.contact_id,
                'lead',
                'Mensagem recebida',
                'O cliente ' || contact_name || ' enviou uma mensagem.'
            );
        END IF;
    -- Se for mensagem enviada (outbound)
    ELSIF NEW.direction = 'out' THEN
        -- Verificar se a tag 'IA Inativa' está presente no array jsonb
        IF contact_tags IS NULL OR NOT (contact_tags ? 'IA Inativa') THEN
            -- Foi o bot
            INSERT INTO public.activity_log (contact_id, type, title, meta)
            VALUES (
                NEW.contact_id,
                'bot',
                'Bot Auto-resposta executado',
                'Resposta automatizada enviada para ' || contact_name || '.'
            );
        ELSE
            -- Foi resposta manual humana
            INSERT INTO public.activity_log (contact_id, type, title, meta)
            VALUES (
                NEW.contact_id,
                'webhook',
                'Mensagem manual enviada',
                'Atendente respondeu ' || contact_name || '.'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Trigger nas mensagens
DROP TRIGGER IF EXISTS trg_message_activity ON public.messages;
CREATE TRIGGER trg_message_activity
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.fn_log_message_activity();
