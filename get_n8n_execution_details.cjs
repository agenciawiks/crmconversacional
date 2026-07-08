const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

async function check() {
  const executionId = '64638';
  try {
    const response = await fetch(`${baseUrl}/executions/${executionId}`, {
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch execution:', response.status, await response.text());
      return;
    }

    const data = await response.json();
    console.log('Execution Details:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

check();
