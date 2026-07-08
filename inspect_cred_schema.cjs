const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

async function inspect() {
  try {
    const response = await fetch(`${baseUrl}/credentials/schema/openAiApi`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    });
    if (response.ok) {
      const data = await response.json();
      console.log(`Schema openAiApi:`, JSON.stringify(data, null, 2));
    } else {
      console.error(`Failed to fetch schema:`, response.status, await response.text());
    }
  } catch(e) {
    console.error(e);
  }
}

inspect();
