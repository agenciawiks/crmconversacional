const accessToken = "EAAOFwaqMDFoBRhMYWNS5sC0HObyQHvbhOcpZAKFBikrZCFFBzLBDRenYQzajYLqN4QUujwse8R51eBrY1b8ZBa7O4CXRZAMLKWvrbZBst4rZCFGWPfazXvKYDtb3y3vpG5mnYR0NqSixTAi5ncYrX5fW25dT4LsTpIWRWJX8mEKTZBo2Jr1fZAUEhA8nxP0OyL3qPwZDZD";

async function checkPages() {
  const url = `https://graph.facebook.com/v20.0/me/accounts?access_token=${accessToken}`;
  console.log("Fetching pages linked to the token...");
  
  try {
    const resp = await fetch(url);
    const result = await resp.json();
    console.log("Status:", resp.status);
    console.log("Response:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  }
}

checkPages();
