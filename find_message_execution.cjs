const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

async function find() {
  try {
    const response = await fetch(`${baseUrl}/executions?workflowId=88zOQbdJAT7DOaET&limit=50`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    });
    if (!response.ok) return;
    const data = await response.json();
    console.log(`Found ${data.data.length} executions for workflow 88zOQbdJAT7DOaET`);
    for (const exec of data.data) {
      const time = new Date(exec.startedAt);
      // We look for executions between 16:14:00 and 16:15:30
      if (time >= new Date('2026-06-23T16:14:00Z') && time <= new Date('2026-06-23T16:15:30Z')) {
        console.log(`Matching Execution: id=${exec.id}, status=${exec.status}, startedAt=${exec.startedAt}`);
      }
    }
  } catch(e) {
    console.error(e);
  }
}

find();
