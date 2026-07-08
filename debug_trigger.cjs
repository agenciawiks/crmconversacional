const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const envConfig = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    envConfig[key] = value;
  }
});

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function testTrigger() {
  // Let's check triggers. Since we can't query pg_trigger directly through PostgREST (unless exposed),
  // let's try to manually insert a message 'in' and see if we get any database error or if it completes.
  const payload = {
    channel_id: '4886443e-4996-4d2a-83e1-d96f503e1a28',
    contact_id: '69c52004-a487-474f-a2cc-529f1a1b3505',
    direction: 'in',
    content: 'Quais procedimentos corporais vocês fazem?',
    content_type: 'text',
    timestamp: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('messages')
    .insert([payload])
    .select();

  console.log('Inserted message:', data);
  console.log('Error:', error);

}

testTrigger();
