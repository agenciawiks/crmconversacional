const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ibyterftfrqgkhktkaeg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NDk4MDMsImV4cCI6MjA5NDAyNTgwM30.9I7RS-NxobdNvr76U_Z9H4IiW10SUfqEzzfVGCa46Uk";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Querying all contacts...");
  const { data, error } = await supabase
    .from('contacts')
    .select('*');

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${data.length} contacts.`);
  if (data.length > 0) {
    console.log("All unique keys across all contacts:");
    const keys = new Set();
    data.forEach(c => Object.keys(c).forEach(k => keys.add(k)));
    console.log(Array.from(keys));
    console.log("First 5 contacts:");
    console.log(JSON.stringify(data.slice(0, 5), null, 2));
  }
}

run();
