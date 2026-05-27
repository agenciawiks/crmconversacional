const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8";

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data, error } = await supabase.from('leads').select('*').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Raw lead keys and values:", JSON.stringify(data?.[0], null, 2));
  }
}
run();
