-- Ativar extensão para ranges
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL, -- Armazenado em UTC
    end_time TIMESTAMPTZ NOT NULL,   -- Armazenado em UTC
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show')) DEFAULT 'scheduled',
    created_by TEXT NOT NULL CHECK (created_by IN ('ai', 'human')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Para garantir que a constraint funcione e possa ser adicionada mesmo se a tabela já existir (sem duplicar)
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS prevent_double_booking;

ALTER TABLE appointments ADD CONSTRAINT prevent_double_booking EXCLUDE USING gist (
    tstzrange(start_time, end_time) WITH &&
) WHERE (status <> 'cancelled');

-- Políticas RLS Seguras (Soft-delete apenas)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas se existirem para evitar conflito (útil em re-execuções)
DROP POLICY IF EXISTS appointments_select ON appointments;
DROP POLICY IF EXISTS appointments_insert ON appointments;
DROP POLICY IF EXISTS appointments_update ON appointments;

-- Frontend (anon/authenticated) — operações controladas
CREATE POLICY appointments_select ON appointments 
    FOR SELECT USING (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY appointments_insert ON appointments 
    FOR INSERT WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY appointments_update ON appointments 
    FOR UPDATE USING (auth.role() IN ('anon', 'authenticated'));
-- NOTA: Sem política de DELETE. Cancelamento é soft-delete via UPDATE status='cancelled'.

-- Habilitar Realtime
-- Caso a publication já exista, apenas adicionamos a tabela
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'appointments') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
    END IF;
END
$$;

ALTER TABLE appointments REPLICA IDENTITY FULL;

-- Inserir configuração padrão na tabela crm_settings, se não existir
INSERT INTO crm_settings (key, value)
VALUES (
    'agenda_settings', 
    '{"working_hours": {"start": "09:00", "end": "18:00"}, "days": [1, 2, 3, 4, 5], "slot_duration_minutes": 60}'
)
ON CONFLICT (key) DO NOTHING;
