import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflowPath = new URL('../n8n-workflows/central-ai-agent-deploy.json', import.meta.url);
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
