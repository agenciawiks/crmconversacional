const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

async function getError(id) {
  try {
    const response = await fetch(`${baseUrl}/executions/${id}?includeData=true`, {
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${id}:`, response.status);
      return;
    }

    const data = await response.json();
    console.log(`Execution ${id} Error Details:`);
    if (data.data && data.data.resultData) {
      const resultData = data.data.resultData;
      console.log('Error object:', JSON.stringify(resultData.error, null, 2));
      console.log('Last node executed:', resultData.lastNodeExecuted);
      
      if (resultData.runData) {
        for (const [nodeName, nodeRuns] of Object.entries(resultData.runData)) {
          const firstRun = nodeRuns[0];
          if (firstRun && firstRun.error) {
            console.log(`Node "${nodeName}" failed with error:`, firstRun.error);
          }
        }
      }
    } else {
      console.log('No result data or error info found in execution data.');
    }
  } catch (e) {
    console.error(e);
  }
}

getError('76129');
