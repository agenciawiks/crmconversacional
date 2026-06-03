const accessToken = "EAAOFwaqMDFoBRjHuckGTPEUMNxmvRjZCAvbT3eW9XWShRVkFMv1gGGaQ2FHF0A0VzL4xtZCEMwnKHTtK9fFMCdixmrUUM8HwOTusRObxXVnLWZBKMNJB5QlXoZBQNsLo6umPdBnyU1jkqPrK9IELxQUtzBDBw1QVKJePerVoMMHvpq4EOyTxbZCHSpp1qQZBteU9By3iQZD";
const userId = "1530247715083924"; // Scoped ID of Caio

async function testFetchProfile() {
  const url = `https://graph.facebook.com/v20.0/${userId}?fields=name,username,profile_pic&access_token=${accessToken}`;
  console.log("Fetching profile from Meta Graph API...");
  
  try {
    const resp = await fetch(url);
    const result = await resp.json();
    console.log("Status:", resp.status);
    console.log("Response:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  }
}

testFetchProfile();
