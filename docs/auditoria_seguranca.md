# Relatório de Auditoria de Segurança - CRM Conversacional

Este documento apresenta os resultados da auditoria de segurança realizada no codebase do CRM Conversacional. As vulnerabilidades identificadas foram categorizadas por severidade com base no impacto potencial e na facilidade de exploração.

---

## Tabela Resumo de Vulnerabilidades

| ID | Vulnerabilidade | Componente | Severidade | Status |
|---|---|---|---|---|
| SEC-01 | Vazamento da Chave `service_role` (Service Key) no Cliente | Frontend (`supabaseService.js`) | **Crítica** | Mitigado |
| SEC-02 | Ausência de Row Level Security (RLS) nas novas tabelas | Supabase (Database) | **Alta** | Mitigado |
| SEC-03 | Recorrência Infinita e Falha na Política de `ai_settings` | Supabase (Database) | **Alta** | Mitigado |
| SEC-04 | Risco de DOM-based XSS via `media_url` nos links de documentos | Frontend (`ChatWindow.jsx`) | **Alta** | Mitigado |
| SEC-05 | Ausência de Validação de Assinatura de Webhook (Meta/Evolution) | n8n Workflows / Inbound | **Média** | Planejado |
| SEC-06 | Exposição de chaves de API no JSON de prompt da IA | Supabase / Frontend | **Média** | Mitigado |

---

## Detalhamento das Vulnerabilidades e Mitigações

### SEC-01: Vazamento da Chave `service_role` (Service Key) no Cliente
- **Severidade:** **Crítica**
- **Impacto:** A chave administrativa master (`service_role`) do Supabase ignora todas as regras de Row Level Security (RLS). Estando exposta hardcoded no código client-side do navegador, qualquer usuário ou invasor poderia extraí-la através do console de ferramentas de desenvolvedor e obter controle administrativo absoluto sobre o banco de dados (leitura de dados sensíveis, exclusão de tabelas, roubo de credenciais).
- **Código Vulnerável (`supabaseService.js`):**
  ```javascript
  static async fetchAiSettings(channelId) {
    if (!channelId) return null;
    const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8";
    try {
      const response = await fetch(`https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/ai_settings?channel_id=eq.${channelId}&limit=1`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      });
      // ...
  ```
- **Código Mitigado (`supabaseService.js`):**
  A chave administrativa foi inteiramente removida do frontend. As requisições foram migradas para utilizar o cliente padrão público do Supabase (`supabase` exportado de `../supabase`), que utiliza a chave pública `anon` de forma segura.
  ```javascript
  import { supabase } from '../supabase';

  static async fetchAiSettings(channelId) {
    if (!channelId) return null;
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('channel_id', channelId)
        .limit(1)
        .maybeSingle();
      // ...
  ```

---

### SEC-02: Ausência de Row Level Security (RLS) nas Novas Tabelas
- **Severidade:** **Alta**
- **Impacto:** As tabelas criadas para a funcionalidade de follow-up (`crm_settings`, `followup_rules`, `followup_queue`) foram provisionadas sem RLS ativado. Isso permitia que qualquer usuário público (com acesso à chave `anon`) realizasse operações de SELECT, INSERT, UPDATE e DELETE sem controle de acesso, expondo regras de negócio e logs operacionais.
- **Resolução:**
  Criação do script de hardening em `supabase/migrations/security_hardening.sql` para habilitar RLS nas tabelas e definir políticas de acesso seguras limitadas aos papéis `anon` e `authenticated`.
  ```sql
  ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.followup_rules ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.followup_queue ENABLE ROW LEVEL SECURITY;

  CREATE POLICY crm_settings_select ON public.crm_settings FOR SELECT USING (auth.role() IN ('anon', 'authenticated'));
  -- (políticas correspondentes para insert, update, delete nas 3 tabelas)
  ```

---

### SEC-03: Recorrência Infinita e Falha na Política de `ai_settings`
- **Severidade:** **Alta**
- **Impacto:** Ao tentar utilizar a chave `anon` para ler configurações na tabela `ai_settings`, o banco de dados retornava o erro: `infinite recursion detected in policy for relation "agent_profiles"`. Isso impedia a migração do cliente frontend para o cliente não-admin e forçava o uso indevido da chave administrativa.
- **Resolução:**
  Remoção das políticas de segurança legadas recursivas que cruzavam as tabelas `ai_settings` e `agent_profiles`. Substituição por políticas simplificadas e diretas baseadas no papel (`auth.role()`), prevenindo loops infinitos de avaliação.
  ```sql
  -- Remove políticas antigas com recursão
  DROP POLICY IF EXISTS ai_settings_select ON public.ai_settings;
  DROP POLICY IF EXISTS agent_profiles_select ON public.agent_profiles;

  -- Cria políticas seguras e diretas
  CREATE POLICY ai_settings_select ON public.ai_settings FOR SELECT USING (auth.role() IN ('anon', 'authenticated'));
  CREATE POLICY agent_profiles_select ON public.agent_profiles FOR SELECT USING (auth.role() IN ('anon', 'authenticated'));
  ```

---

### SEC-04: Risco de DOM-based XSS via `media_url` nos Links de Documentos
- **Severidade:** **Alta**
- **Impacto:** Na renderização das bolhas de mensagens de chat, links recebidos na propriedade `media_url` (principalmente em mensagens do tipo `document`) eram inseridos diretamente no atributo `href` da tag `<a>`. Um invasor poderia enviar uma URL maliciosa começando com o protocolo `javascript:` (ex: `javascript:alert(document.cookie)`), resultando em execução de scripts arbitrários no contexto da aplicação (XSS) caso o operador clicasse no link do documento.
- **Código Vulnerável (`ChatWindow.jsx`):**
  ```jsx
  <a 
    href={msg.media_url} 
    target="_blank" 
    rel="noopener noreferrer" 
  >
  ```
- **Código Mitigado (`ChatWindow.jsx`):**
  Implementação de uma função de sanitização rigorosa (`sanitizeUrl`) para neutralizar protocolos maliciosos como `javascript:` e `data:`, forçando caminhos inseguros a retornarem `#`.
  ```javascript
  const sanitizeUrl = (url) => {
    if (!url) return '#';
    const trimmed = url.trim();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) {
      return '#';
    }
    return trimmed;
  };
  ```
  Renderização do link utilizando a sanitização:
  ```jsx
  <a 
    href={sanitizeUrl(msg.media_url)} 
    target="_blank" 
    rel="noopener noreferrer" 
  >
  ```

---

### SEC-05: Ausência de Validação de Assinatura de Webhook (Meta/Evolution)
- **Severidade:** **Média**
- **Impacto:** Os webhooks de entrada configurados no n8n aceitam payloads de mensagens diretamente sem validar a assinatura criptográfica de origem (ex: `X-Hub-Signature-256` no webhook da Meta Cloud API). Um atacante com conhecimento do endpoint do webhook do n8n poderia forjar requisições simulando novas mensagens recebidas de qualquer número de telefone.
- **Recomendação de Mitigação:**
  Configurar a verificação da assinatura secreta (Webhook Secret) na etapa de entrada de webhook do n8n, rejeitando payloads cujas assinaturas não correspondam ao hash SHA-256 gerado a partir do segredo e do corpo da requisição.

---

### SEC-06: Exposição de chaves de API no JSON de prompt da IA
- **Severidade:** **Média**
- **Impacto:** O campo `system_prompt` serializa e armazena chaves da OpenAI diretamente na tabela de configurações da IA. Com as correções de RLS aplicadas, o acesso a essa tabela é controlado, mas as chaves de API ainda estão contidas no JSON manipulado pelo frontend.
- **Recomendação de Mitigação:**
  Mover chaves de API para variáveis de ambiente seguras no backend/n8n, ou criptografar os dados sensíveis a nível de coluna do banco de dados, evitando que fiquem visíveis no client-side.
