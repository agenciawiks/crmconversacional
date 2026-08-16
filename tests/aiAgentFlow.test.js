import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflowPath = new URL('../n8n-workflows/central-ai-agent-deploy.json', import.meta.url);
const metaWorkflowPath = new URL('../n8n-workflows/meta-inbound-webhook.json', import.meta.url);
const migrationPath = new URL(
  '../supabase/migrations/20260816173000_secure_ai_settings_configuration.sql',
  import.meta.url
);

test('central agent uses the API key configured by the site', () => {
  const workflow = JSON.parse(readFileSync(workflowPath, 'utf8'));
  const callOpenAi = workflow.nodes.find((node) => node.name === 'Call OpenAI');
  const routing = workflow.nodes.find((node) => node.name === 'AI Routing Decision');

  assert.ok(callOpenAi, 'Call OpenAI node is required');
  assert.equal(callOpenAi.type, 'n8n-nodes-base.httpRequest');
  assert.match(
    JSON.stringify(callOpenAi.parameters),
    /Bearer \{\{ \$json\.api_key \}\}/
  );
  assert.match(routing.parameters.jsCode, /settingsRow\.is_enabled === true/);
  assert.doesNotMatch(JSON.stringify(workflow), /service_role|eyJhbGciOi/);
});

test('AI settings migration exposes only safe RPCs to the browser', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  assert.match(sql, /get_ai_settings_safe/);
  assert.match(sql, /upsert_ai_settings_secure/);
  assert.match(sql, /revoke all on table public\.ai_settings from anon, authenticated/);
  assert.match(sql, /v_channel_tenant/);
});

test('Meta inbound routes the matched channel through the central AI agent', () => {
  const workflow = JSON.parse(readFileSync(metaWorkflowPath, 'utf8'));
  const serialized = JSON.stringify(workflow);
  const channelLookup = workflow.nodes.find(
    (node) => node.name === 'Fetch Meta Channel Context'
  );
  const centralCall = workflow.nodes.find(
    (node) => node.name === 'Call Central AI Agent'
  );
  const webhookLog = workflow.nodes.find(
    (node) => node.name === 'Log Webhook Event'
  );
  const insertConnections = workflow.connections['Insert Message to Supabase']?.main?.[0] || [];

  assert.ok(channelLookup, 'Meta channel lookup is required');
  assert.match(channelLookup.parameters.url, /provider=eq\.meta/);
  assert.match(channelLookup.parameters.url, /phone_id=eq/);
  assert.match(channelLookup.parameters.url, /phone_number_id/);
  assert.ok(centralCall, 'central agent call is required');
  assert.match(centralCall.parameters.url, /central-agent-test/);
  assert.ok(
    insertConnections.some((connection) => connection.node === 'Call Central AI Agent'),
    'stored Meta messages must call the central agent'
  );
  assert.match(serialized, /Fetch Meta Channel Context.*access_token/);
  assert.equal(webhookLog.onError, 'continueRegularOutput');
  assert.match(JSON.stringify(webhookLog.parameters), /tenant_id/);
  assert.doesNotMatch(serialized, /service_role|eyJhbGciOi|EAA[A-Za-z0-9]/);
  assert.ok(
    !workflow.nodes.some((node) => node.type?.startsWith('@n8n/n8n-nodes-langchain')),
    'Meta inbound must not contain a duplicated embedded AI agent'
  );
});
