const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED";
const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";

const supabase = createClient(supabaseUrl, serviceKey);

async function update() {
  const contactId = '69c52004-a487-474f-a2cc-529f1a1b3505';
  
  // Set tags to empty array to activate AI
  const { data, error } = await supabase
    .from('contacts')
    .update({ tags: [] })
    .eq('id', contactId)
    .select();

  if (error) {
    console.error('Error updating tags:', error);
  } else {
    console.log('Updated Contact:', data);
  }
}

update();
