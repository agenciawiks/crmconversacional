const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8";
const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";
const metaChannelId = "4886443e-4996-4d2a-83e1-d96f503e1a28";

async function run() {
  console.log("Fetching messages for Meta WhatsApp...");
  const resp = await fetch(`${supabaseUrl}/rest/v1/messages?channel_id=eq.${metaChannelId}&order=created_at.desc&limit=5`, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`
    }
  });
  const messages = await resp.json();
  console.log("Latest WhatsApp messages:", JSON.stringify(messages, null, 2));
}

run().catch(console.error);
