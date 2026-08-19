import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const deployScriptPath = new URL(
  '../scripts/deploy-evolution-label-sync.cjs',
  import.meta.url
);

test('Evolution connection subscribes to label events', () => {
  const source = readFileSync(deployScriptPath, 'utf8');

  assert.match(source, /LABELS_EDIT/);
  assert.match(source, /LABELS_ASSOCIATION/);
  assert.match(source, /labels\.association/);
  assert.match(source, /label\/findLabels/);
});

test('Evolution label sync is tenant scoped and preserves existing tags', () => {
  const source = readFileSync(deployScriptPath, 'utf8');

  assert.match(source, /tenant_id=eq/);
  assert.match(source, /whatsapp_jid\.eq/);
  assert.match(source, /phone\.eq/);
  assert.match(source, /new Set\(tags/);
  assert.match(source, /tags\.push\(change\.label_name\)/);
  assert.match(source, /tags\.filter\(\(tag\) => tag !== change\.label_name\)/);
  assert.doesNotMatch(source, /service_role|eyJhbGciOi|EAA[A-Za-z0-9]/);
});
