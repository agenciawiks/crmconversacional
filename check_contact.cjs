const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED";
const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  const contactId = '69c52004-a487-474f-a2cc-529f1a1b3505';
  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (error) {
    console.error('Error fetching contact:', error);
  } else {
    console.log('Contact Details:', contact);
  }
}

check();
