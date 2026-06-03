const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8";
const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";

async function run() {
  console.log("Fetching recent contacts...");
  const contactsResp = await fetch(`${supabaseUrl}/rest/v1/contacts?select=*&order=created_at.desc&limit=5`, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`
    }
  });
  const contacts = await contactsResp.json();
  console.log("Contacts:", JSON.stringify(contacts, null, 2));

  console.log("\nFetching recent messages...");
  const messagesResp = await fetch(`${supabaseUrl}/rest/v1/messages?select=*&order=created_at.desc&limit=5`, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`
    }
  });
  const messages = await messagesResp.json();
  console.log("Messages:", JSON.stringify(messages, null, 2));
}

run().catch(console.error);
