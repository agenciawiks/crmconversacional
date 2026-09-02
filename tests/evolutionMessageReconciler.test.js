import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const code = fs.readFileSync(path.join(root, 'n8n-workflows', 'evolution-message-reconciler.code.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260902131500_message_reconciliation_safety_net.sql'), 'utf8');

test('reconciler is scheduled, stateful, bounded and idempotent', () => {
  assert.match(code, /\$getWorkflowStaticData\('global'\)/);
  assert.match(code, /RECENT_PAGES = 4/);
  assert.match(code, /deepPageByChannel/);
  assert.match(code, /channelIndex/);
  assert.match(code, /existingMessageIds/);
  assert.match(code, /rpc\('persist_evolution_message'/);
});

test('reconciler repairs LID identities and persists recovered media', () => {
  assert.match(code, /rpc\('reconcile_evolution_identity_batch'/);
  assert.match(code, /remoteJidAlt/);
  assert.match(code, /getBase64FromMediaMessage/);
  assert.match(code, /storage\/v1\/object\/media/);
  assert.match(code, /media_storage_status/);
});

test('reconciler records audit and a deduplicated dead-letter queue', () => {
  assert.match(code, /evolution_reconciler/);
  assert.match(code, /record_message_reconciliation_failure/);
  assert.match(code, /resolve_message_reconciliation_failure/);
  assert.match(migration, /failed_messages_reconciliation_unique_idx/i);
  assert.match(migration, /attempt_count = public\.failed_messages\.attempt_count \+ 1/i);
});

test('reconciler never calls the inbound webhook or AI endpoints', () => {
  assert.doesNotMatch(code, /webhook\/evolution(?:-prod)?/i);
  assert.doesNotMatch(code, /openai|chat\/completions|responses/i);
});

test('database migration is additive and tenant scoped', () => {
  assert.doesNotMatch(migration, /drop table|truncate|delete from/i);
  assert.match(migration, /tenant_id, channel_id, provider_message_id/i);
  assert.match(migration, /reconcile_evolution_lid_messages/i);
  assert.match(migration, /reconcile_evolution_identity_batch/i);
});
