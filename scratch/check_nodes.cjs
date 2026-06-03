const fs = require('fs');

const file = 'n8n-workflows/evolution-inbound-webhook-deploy.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log('Nodes count:', data.nodes.length);
const aiNode = data.nodes.find(n => n.name === 'Fetch AI Settings');
console.log('Has Fetch AI Settings?', !!aiNode);
console.log('Has Call Central AI Agent?', !!data.nodes.find(n => n.name === 'Call Central AI Agent'));
