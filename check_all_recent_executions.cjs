const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

async function check() {
  try {
    const response = await fetch(`${baseUrl}/executions?limit=100`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    });
    if (!response.ok) return;
    const data = await response.json();
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    console.log(`Found ${data.data.length} recent executions. Showing runs since ${tenMinsAgo.toISOString()}:`);
    for (const exec of data.data) {
      const time = new Date(exec.startedAt);
      if (time >= tenMinsAgo) {
        console.log(`Time: ${exec.startedAt} | ID: ${exec.id} | Workflow: ${exec.workflowId} | Status: ${exec.status} | Finished: ${exec.finished}`);
      }
    }
  } catch(e) {
    console.error(e);
  }
}

check();
