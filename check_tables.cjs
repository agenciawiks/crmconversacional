const { createClient } = require('@supabase/supabase-js');

const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED";
const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";
const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  console.log('Fetching all tables information...');
  // We can run a raw SQL query using RPC or we can just try querying known tables or check the schema.
  // Let's do a SQL query to select all table names from pg_catalog
  const { data, error } = await supabase.rpc('get_tables'); // if exists
  if (error) {
    console.log('Error calling RPC get_tables, trying to query pg_catalog using postgrest is not direct, let\'s query pg_tables if we have a custom function, or run raw SQL.');
    // Let's see if we can execute raw sql through pg_net or by creating a temp function.
  } else {
    console.log('Tables:', data);
  }
  
  // Let's check some common tables:
  const tables = [
    'crm_settings', 'followup_rules', 'followup_queue', 'messages', 'contacts', 
    'channels', 'ai_settings', 'failed_messages', 'webhook_logs', 'agent_profiles'
  ];
  for (const table of tables) {
    try {
      const { data: rows, error: err } = await supabase.from(table).select('*').limit(2);
      if (err) {
        console.log(`Table ${table} error:`, err.message);
      } else {
        console.log(`Table ${table} has ${rows.length} sample rows.`);
        if (rows.length > 0) {
          console.log(`Sample row from ${table}:`, rows[0]);
        }
      }
    } catch(e) {
      console.log(`Table ${table} query exception:`, e.message);
    }
  }
}

check();
