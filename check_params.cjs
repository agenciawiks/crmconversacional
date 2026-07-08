const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

async function test(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });
    console.log(`URL: ${url} -> Status: ${response.status}`);
    const data = await response.json();
    console.log('Keys in response:', Object.keys(data));
    if (data.data) {
      console.log('data keys:', Object.keys(data.data));
    }
  } catch (e) {
    console.error(e);
  }
}

async function run() {
  await test(`${baseUrl}/executions/64643`);
  await test(`${baseUrl}/executions/64643?includeData=true`);
  await test(`${baseUrl}/executions/64643?mode=full`);
}

run();
