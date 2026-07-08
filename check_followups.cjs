const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED";
const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  console.log('--- crm_settings ---');
  const { data: settings, error: errS } = await supabase.from('crm_settings').select('*');
  if (errS) console.error(errS);
  else console.log(settings);

  console.log('\n--- followup_rules ---');
  const { data: rules, error: errR } = await supabase.from('followup_rules').select('*');
  if (errR) console.error(errR);
  else console.log(rules);

  console.log('\n--- followup_queue ---');
  const { data: queue, error: errQ } = await supabase.from('followup_queue').select('*');
  if (errQ) console.error(errQ);
  else console.log(queue);
}

check();
