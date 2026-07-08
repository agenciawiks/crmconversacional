const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED";
const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  console.log('--- Fetching last 10 webhook_logs ---');
  const { data: logs, error: err1 } = await supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (err1) {
    console.error('Error fetching webhook_logs:', err1);
  } else {
    console.log('Webhook Logs:', logs);
  }

  console.log('\n--- Fetching last 10 failed_messages ---');
  const { data: failed, error: err2 } = await supabase
    .from('failed_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (err2) {
    console.error('Error fetching failed_messages:', err2);
  } else {
    console.log('Failed Messages:', failed);
  }
}

check();
