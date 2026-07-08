const fs = require('fs');

const file = 'n8n-workflows/evolution-inbound-webhook.json';
if (fs.existsSync(file)) {
  const wf = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('Nodes in Evolution Inbound Webhook:');
  wf.nodes.forEach(n => {
    console.log(`- Node "${n.name}" (${n.type})`);
  });
} else {
  console.log('File does not exist');
}
