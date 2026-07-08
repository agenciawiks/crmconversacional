const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

async function check() {
  try {
    const response = await fetch(`${baseUrl}/workflows`, {
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch workflows:', response.status, await response.text());
      return;
    }

    const data = await response.json();
    console.log('Workflows list:');
    if (data.data) {
      data.data.forEach(wf => {
        console.log({
          id: wf.id,
          name: wf.name,
          active: wf.active
        });
      });
    } else {
      console.log('No workflows found', data);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

check();
