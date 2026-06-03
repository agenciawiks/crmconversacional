const accessToken = "EAAOFwaqMDFoBRjHuckGTPEUMNxmvRjZCAvbT3eW9XWShRVkFMv1gGGaQ2FHF0A0VzL4xtZCEMwnKHTtK9fFMCdixmrUUM8HwOTusRObxXVnLWZBKMNJB5QlXoZBQNsLo6umPdBnyU1jkqPrK9IELxQUtzBDBw1QVKJePerVoMMHvpq4EOyTxbZCHSpp1qQZBteU9By3iQZD";

async function run() {
  // Query /me
  console.log("Querying /me to see details of the token...");
  try {
    const resp = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${accessToken}`);
    const resJson = await resp.json();
    console.log("/me Response status:", resp.status);
    console.log(JSON.stringify(resJson, null, 2));
  } catch (e) {
    console.error("Error /me:", e.message);
  }

  // Query /me/accounts to see connected pages
  console.log("\nQuerying /me/accounts to see associated pages...");
  try {
    const resp = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${accessToken}`);
    const resJson = await resp.json();
    console.log("/me/accounts Response status:", resp.status);
    console.log(JSON.stringify(resJson, null, 2));
  } catch (e) {
    console.error("Error /me/accounts:", e.message);
  }
}

run();
