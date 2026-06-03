const tokenMeta = "EAARutYjXAksBRnKL0ijQiSXmASMC33skWjqmZAaQWlmzf978nFZAM3M5O80tY4jDwjxqPUgApGZBEZBY0AIBvBsgljwejugd2KoY1x2elb03nH8MzkeZAjEYJ7jjZCrZBlUZA5bGFG3jaZAD9zI5Ri0PzilZBrU56Wo41G8m2X54Dje0L5KvYuvtEKQawada5yllED6QZDZD";
const tokenIG = "EAAOFwaqMDFoBRjHuckGTPEUMNxmvRjZCAvbT3eW9XWShRVkFMv1gGGaQ2FHF0A0VzL4xtZCEMwnKHTtK9fFMCdixmrUUM8HwOTusRObxXVnLWZBKMNJB5QlXoZBQNsLo6umPdBnyU1jkqPrK9IELxQUtzBDBw1QVKJePerVoMMHvpq4EOyTxbZCHSpp1qQZBteU9By3iQZD";

async function testToken(token, name) {
  console.log(`\n=== Testing Token: ${name} ===`);
  try {
    const resp = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${token}`);
    const resJson = await resp.json();
    console.log("  /me Response:", JSON.stringify(resJson, null, 2));
    
    // Also try /me/accounts
    const respAcc = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${token}`);
    const resAccJson = await respAcc.json();
    console.log("  /me/accounts Response:", JSON.stringify(resAccJson, null, 2));
  } catch (e) {
    console.error(`  Error testing ${name}:`, e.message);
  }
}

async function run() {
  await testToken(tokenMeta, "Meta Token (EAARut...)");
  await testToken(tokenIG, "Instagram Token (EAAOFw...)");
}

run();
