const accessToken = "EAAOFwaqMDFoBRlAm6eXdsU7NZBj2ZCNfd6z90MyJbsREtG1MCvxtWaZArBft3ZAgijKbyZAS4rdXkaNfx4RPixOmBm19nnlAqZBICDFYJ9wWvwuZBUALloaQCglVYYJ6KzLyXtlxzxemmGZBVfS5HTmuWargNjIoCO3ZAgh2PdMaeMudIfv5FA8ZBM5YDzXoZAdi8PGXzutBJkZD";
const recipientId = "1530247715083924"; // Scoped ID of Caio

async function testSend(instagramId, label) {
  console.log(`\n--- Testing with ${label} (${instagramId}) ---`);
  const url = instagramId === 'me' 
    ? `https://graph.facebook.com/v20.0/me/messages?access_token=${accessToken}`
    : instagramId === 'page'
    ? `https://graph.facebook.com/v20.0/132904780107568/messages?access_token=${accessToken}`
    : `https://graph.facebook.com/v20.0/${instagramId}/messages?access_token=${accessToken}`;
  
  const payload = {
    recipient: { id: recipientId },
    message: { text: `Teste direto via API - Usando ${label}` }
  };

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const result = await resp.json();
    console.log("Status:", resp.status);
    console.log("Response:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  }
}

async function run() {
  await testSend("page", "Page ID 132904780107568");
  await testSend("me", "Page Token 'me'");
  await testSend("2049423789310349", "User Provided ID");
  await testSend("17841406536284681", "Webhook Payload ID");
}

run();
