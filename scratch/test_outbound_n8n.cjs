const https = require('https');

const n8nUrl = "https://n8n-n8n.rh3fr2.easypanel.host/webhook/send";
const metaChannelId = "4886443e-4996-4d2a-83e1-d96f503e1a28";
const testContactId = "69c52004-a487-474f-a2cc-529f1a1b3505";
const testRecipient = "5512991960679";

function sendPost(url, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      method: 'POST',
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(body))
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    });
    
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log("Triggering n8n Outbound workflow via webhook...");
  const payload = {
    channel_id: metaChannelId,
    contact_id: testContactId,
    phone: testRecipient,
    content: "Teste de envio OUTBOUND via n8n webhook - Antigravity"
  };

  try {
    const res = await sendPost(n8nUrl, payload);
    console.log("n8n Response Status:", res.statusCode);
    console.log("n8n Response Body:", res.body);
  } catch (e) {
    console.error("n8n webhook trigger failed:", e.message);
  }
}

run().catch(console.error);
