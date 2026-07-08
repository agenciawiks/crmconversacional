const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('n8n-workflows/central-ai-agent-deploy.json', 'utf8'));
console.log('Nodes in Central AI Agent:');
wf.nodes.forEach(n => {
  console.log(`- Node "${n.name}" (${n.type}):`);
  if (n.parameters) {
    console.log('  Parameters:', JSON.stringify(n.parameters, null, 2));
  }
});
