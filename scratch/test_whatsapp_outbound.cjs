const phoneId = "986980947839061";
const accessToken = "EAARutYjXAksBRnKL0ijQiSXmASMC33skWjqmZAaQWlmzf978nFZAM3M5O80tY4jDwjxqPUgApGZBEZBY0AIBvBsgljwejugd2KoY1x2elb03nH8MzkeZAjEYJ7jjZCrZBlUZA5bGFG3jaZAD9zI5Ri0PzilZBrU56Wo41G8m2X54Dje0L5KvYuvtEKQawada5yllED6QZDZD";
const testRecipient = "5512991960679"; // Number from recent WhatsApp messages in Supabase

async function run() {
  const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
  console.log(`Sending Meta WhatsApp test message to ${testRecipient}...`);
  console.log(`URL: ${url}`);
  
  const payload = {
    messaging_product: "whatsapp",
    to: testRecipient,
    type: "text",
    text: {
      body: "Teste de outbound da API Cloud do WhatsApp via Antigravity"
    }
  };

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const status = resp.status;
    const data = await resp.json();
    
    console.log(`HTTP Status: ${status}`);
    console.log("Response Data:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Direct API test failed with exception:", e.message);
  }
}

run().catch(console.error);
