import test from 'node:test';
import assert from 'node:assert/strict';
import { isGenericDisplayName, resolveUserDisplayName } from '../src/utils/userIdentity.js';

test('detects generated placeholder names', () => {
  assert.equal(isGenericDisplayName('Usuário a441'), true);
  assert.equal(isGenericDisplayName('Usuário Logado'), true);
  assert.equal(isGenericDisplayName('Marina Costa'), false);
});

test('prefers a real profile name', () => {
  const name = resolveUserDisplayName(
    { full_name: 'Marina Costa', tenant_name: 'Clínica Exemplo' },
    { email: 'marina@example.com', user_metadata: { name: 'Marina' } }
  );

  assert.equal(name, 'Marina Costa');
});

test('replaces a generated profile name with authenticated account data', () => {
  const name = resolveUserDisplayName(
    { full_name: 'Usuário a441', tenant_name: 'Clínica Exemplo' },
    { email: 'contato@clinica.com', user_metadata: {} }
  );

  assert.equal(name, 'contato@clinica.com');
});
