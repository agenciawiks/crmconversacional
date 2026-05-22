import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ibyterftfrqgkhktkaeg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log("Checking Supabase tables...");
  
  const { data: messages } = await supabase.from('messages').select('*').limit(5);
  console.log("Messages:", messages);
  
  const { data: logs } = await supabase.from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Webhook Logs:", logs);

  const { data: failed } = await supabase.from('failed_messages').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Failed Messages:", failed);
}

check();
