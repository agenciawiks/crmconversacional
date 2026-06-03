const tokenIG = "EAAOFwaqMDFoBRjHuckGTPEUMNxmvRjZCAvbT3eW9XWShRVkFMv1gGGaQ2FHF0A0VzL4xtZCEMwnKHTtK9fFMCdixmrUUM8HwOTusRObxXVnLWZBKMNJB5QlXoZBQNsLo6umPdBnyU1jkqPrK9IELxQUtzBDBw1QVKJePerVoMMHvpq4EOyTxbZCHSpp1qQZBteU9By3iQZD";
const pageId = "132904780107568";

async function run() {
  console.log(`Querying linked Instagram Business Account for Page ${pageId}...`);
  try {
    const resp = await fetch(`https://graph.facebook.com/v20.0/${pageId}?fields=instagram_business_account,name,username&access_token=${tokenIG}`);
    const resJson = await resp.json();
    console.log("Response:", JSON.stringify(resJson, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  }
}

run();
