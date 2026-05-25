const SUPABASE_URL = 'https://ibyterftfrqgkhktkaeg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8';

async function check() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?contact_id=is.null`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const msgs = await res.json();
  console.log("Orphaned messages:", msgs.length);
  if (msgs.length > 0) {
    console.log("First one:", msgs[0]);
  }
}
check();
