const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ibyterftfrqgkhktkaeg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NDk4MDMsImV4cCI6MjA5NDAyNTgwM30.9I7RS-NxobdNvr76U_Z9H4IiW10SUfqEzzfVGCa46Uk";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const contactId = "5043d582-64a6-4f98-8f5e-c0e1b4260943";
  console.log(`Querying messages for contact ${contactId}...`);
  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, direction, content, channel_id, created_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${messages.length} messages:`);
  messages.forEach(m => {
    console.log(`Msg ID: ${m.id} | Dir: ${m.direction} | Channel ID: ${m.channel_id} | Content: "${m.content}"`);
  });
}

run();
