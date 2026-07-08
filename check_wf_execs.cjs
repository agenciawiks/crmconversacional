const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

async function checkWorkflowExecutions(wfId, name) {
  try {
    const response = await fetch(`${baseUrl}/executions?workflowId=${wfId}&limit=10`, {
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch executions for ${name}:`, response.status, await response.text());
      return;
    }

    const data = await response.json();
    console.log(`\nExecutions for "${name}" (${wfId}):`);
    if (data.data && data.data.length > 0) {
      data.data.forEach(exec => {
        console.log({
          id: exec.id,
          finished: exec.finished,
          status: exec.status,
          startedAt: exec.startedAt,
          stoppedAt: exec.stoppedAt
        });
      });
    } else {
      console.log('No executions found.');
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

async function run() {
  await checkWorkflowExecutions('qzJptf3XgjdxpZG5', 'Central AI Agent (Old ID)');
  await checkWorkflowExecutions('2Tadzs3DHpV7aKFJ', 'Central AI Agent (New ID)');
  await checkWorkflowExecutions('88zOQbdJAT7DOaET', 'WhatsApp Meta Official - Inbound Webhook');
}

run();
