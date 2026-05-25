# Boas Práticas de Segurança em Código

Este documento serve como um guia rápido para garantir que o desenvolvimento deste CRM e outros projetos seja seguro.

## 1. Gestão de Segredos e Credenciais

*   **NUNCA comite arquivos `.env`**: Arquivos que contêm senhas, tokens de APIs (Meta, n8n, Supabase) ou chaves de banco de dados devem ser sempre ignorados pelo Git usando o arquivo `.gitignore`.
*   **Não "hardcode" senhas no código**: Evite escrever chaves diretamente nos arquivos do projeto (ex: `const SUPABASE_KEY = 'minha-chave'`). Sempre leia do ambiente via `process.env` ou `import.meta.env`.
*   **Princípio do Menor Privilégio**: Ao criar uma chave de API, dê apenas as permissões estritamente necessárias. Exemplo: Se um script apenas lê dados, não dê a ele uma chave com permissão de escrita/exclusão (Service Role). Use a `Anon Key` pública com RLS (Row Level Security) sempre que possível.

## 2. Segurança no Banco de Dados (Supabase/PostgreSQL)

*   **Sempre ative o RLS (Row Level Security)**: Por padrão, tabelas recém-criadas no Supabase podem ser lidas por qualquer pessoa que tenha sua `Anon Key` pública. Ativar o RLS garante que apenas usuários autenticados (ou regras específicas) acessem os dados corretos.
*   **Valide os Tipos de Dados**: Use as restrições nativas do banco (ex: `UNIQUE`, `NOT NULL`, `CHECK`) para garantir que dados incorretos não quebrem seu sistema.

## 3. Segurança no Front-end (React/Vite)

*   **Cuidado com variáveis expostas**: No Vite, qualquer variável de ambiente que comece com `VITE_` será empacotada e enviada para o navegador do cliente. Nunca coloque senhas secretas de painéis administrativos (`VITE_ADMIN_PASSWORD`) no `.env` do front-end.
*   **Prevenção contra XSS (Cross-Site Scripting)**: O React por padrão já escapa o conteúdo renderizado (evitando que usuários injetem scripts maliciosos pelo chat). Tenha extremo cuidado ao usar `dangerouslySetInnerHTML`.

## 4. Integrações (n8n, Webhooks)

*   **Validação de Origem**: Se você tem uma rota que recebe dados de um webhook externo (ex: Meta/WhatsApp), sempre valide o *token de verificação* e a assinatura da requisição para garantir que os dados vieram realmente do serviço oficial e não de um invasor simulando a requisição.
*   **Tratamento de Erros Silencioso**: Não retorne mensagens de erro completas (com stack traces ou detalhes do banco de dados) para o cliente final em chamadas de API, pois isso revela a estrutura interna do seu sistema.

## Checklist de Segurança Antes de Enviar para Produção
- [ ] O arquivo `.env` está no `.gitignore`?
- [ ] As tabelas do banco possuem regras RLS configuradas?
- [ ] Bibliotecas desatualizadas ou vulneráveis foram verificadas (`npm audit`)?
- [ ] Acessos de teste/debug foram removidos do código em produção?
