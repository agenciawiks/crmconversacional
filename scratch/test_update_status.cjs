const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8";

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  const { data: contacts } = await supabase.from('contacts').select('id').limit(1);
  if (contacts && contacts.length > 0) {
    const cid = contacts[0].id;
    console.log("Testing update on contact ID:", cid);
    const { data, error } = await supabase
      .from('contacts')
      .update({ pipeline_stage: 'contacted' })
      .eq('id', cid)
      .select();
    
    if (error) {
      console.error("Update failed:", error);
    } else {
      console.log("Update succeeded! Data returned:", data);
    }
  } else {
    console.log("No contacts found.");
  }
}
run();
