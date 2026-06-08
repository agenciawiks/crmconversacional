-- 1. Adicionar a coluna channel_id, relacionando com a tabela channels.
ALTER TABLE ai_settings 
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES channels(id) ON DELETE CASCADE;

-- 2. Garantir que não existam chaves duplicadas para o mesmo canal no mesmo tenant.
-- (Caso já exista alguma constraint parecida ou precise de limpeza, você pode executar o drop das constraints antigas caso precise, mas para evitar erro, adicionaremos uma unique).
ALTER TABLE ai_settings 
ADD CONSTRAINT unique_channel_tenant UNIQUE (tenant_id, channel_id);
