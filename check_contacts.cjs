const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://ibyterftfrqgkhktkaeg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase.from('contacts').select('*');
  console.log('Contacts:', data);
  console.log('Error:', error);
}

check();
