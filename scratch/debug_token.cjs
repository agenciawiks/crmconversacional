const accessToken = "EAAOFwaqMDFoBRhMYWNS5sC0HObyQHvbhOcpZAKFBikrZCFFBzLBDRenYQzajYLqN4QUujwse8R51eBrY1b8ZBa7O4CXRZAMLKWvrbZBst4rZCFGWPfazXvKYDtb3y3vpG5mnYR0NqSixTAi5ncYrX5fW25dT4LsTpIWRWJX8mEKTZBo2Jr1fZAUEhA8nxP0OyL3qPwZDZD";

async function debugToken() {
  // To debug a token, we must call the debug_token endpoint using the token as the input_token
  // and we can use the same token as the access_token since it's a Page/User token
  const url = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
  
  try {
    const resp = await fetch(url);
    const result = await resp.json();
    console.log("Debug Token Response:");
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  }
}

debugToken();
