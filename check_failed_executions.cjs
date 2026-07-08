const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

async function check(id) {
  try {
    const response = await fetch(`${baseUrl}/executions/${id}`, {
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch execution ${id}:`, response.status, await response.text());
      return;
    }

    const data = await response.json();
    console.log(`Execution ${id} Details:`);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

async function run() {
  await check('64643'); // bp6JMrz77eFCoc4z - RESULTADOS
  console.log('\n=======================================\n');
  await check('64646'); // Y7JZv7TrWtvk3Yuv - Agente Claudio Testes
}

run();
