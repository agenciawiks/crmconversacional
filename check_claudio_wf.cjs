const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

async function check() {
  const wfId = '4fHLca7eh8wNTc56';
  try {
    const response = await fetch(`${baseUrl}/workflows/${wfId}`, {
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch:', response.status);
      return;
    }

    const data = await response.json();
    console.log('Nodes in Follow-up Automatico - Congresso:');
    data.nodes.forEach(n => {
      console.log({ name: n.name, type: n.type });
    });
  } catch (e) {
    console.error(e);
  }
}

check();
