const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ibyterftfrqgkhktkaeg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NDk4MDMsImV4cCI6MjA5NDAyNTgwM30.9I7RS-NxobdNvr76U_Z9H4IiW10SUfqEzzfVGCa46Uk";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Querying a message from messages table...");
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("Message Keys:", Object.keys(data[0]));
    console.log("Message Data:", JSON.stringify(data[0], null, 2));
  } else {
    console.log("No messages found.");
  }
}

run();
