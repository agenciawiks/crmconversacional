const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const envConfig = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    envConfig[key] = value;
  }
});

const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED";

const supabaseAnon = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);
const supabaseService = createClient(envConfig.VITE_SUPABASE_URL, serviceKey);

async function check() {
  console.log('--- Testing with Anon Key ---');
  const { data: aiSettingsAnon, error: errAnon } = await supabaseAnon.from('ai_settings').select('*');
  if (errAnon) {
    console.error('Error fetching ai_settings with Anon Key:', errAnon);
  } else {
    console.log('AI Settings with Anon Key:', aiSettingsAnon);
  }

  console.log('\n--- Testing with Service Key ---');
  const { data: aiSettingsService, error: errService } = await supabaseService.from('ai_settings').select('*');
  if (errService) {
    console.error('Error fetching ai_settings with Service Key:', errService);
  } else {
    console.log('AI Settings with Service Key:', aiSettingsService);
  }
}

check();
