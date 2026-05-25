const SUPABASE_URL = 'https://ibyterftfrqgkhktkaeg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8';

async function addConstraint() {
  // Use the Supabase SQL endpoint (pg-meta)
  const sql = 'ALTER TABLE public.contacts ADD CONSTRAINT contacts_phone_unique UNIQUE (phone);';
  
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
  
  if (res.status === 404) {
    console.log('\n⚠️  A Supabase REST API nao permite executar DDL diretamente.');
    console.log('Voce precisa rodar o SQL abaixo no SQL Editor do Supabase Dashboard:');
    console.log('----');
    console.log(sql);
    console.log('----');
    console.log('Acesse: https://supabase.com/dashboard → seu projeto → SQL Editor → cole e execute.');
  }
}

addConstraint();
