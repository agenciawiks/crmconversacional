const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ibyterftfrqgkhktkaeg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NDk4MDMsImV4cCI6MjA5NDAyNTgwM30.9I7RS-NxobdNvr76U_Z9H4IiW10SUfqEzzfVGCa46Uk";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Querying all channels...");
  const { data, error } = await supabase
    .from('channels')
    .select('*');

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Channels Data:", JSON.stringify(data, null, 2));
}

run();
