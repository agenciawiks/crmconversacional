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

async function check() {
  const { data: messages, error } = await supabase.from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error fetching messages:', error);
  } else {
    console.log('Last 10 messages in DB:', messages.map(m => ({
      id: m.id,
      direction: m.direction,
      content: m.content,
      created_at: m.created_at,
      contact_id: m.contact_id
    })));
  }
}

check();
