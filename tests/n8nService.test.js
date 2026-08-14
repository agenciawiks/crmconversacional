import test from 'node:test';
import assert from 'node:assert/strict';
import { requirePersistedMessage } from '../src/services/n8nService.js';

test('accepts a persisted outbound message response', () => {
  const result = requirePersistedMessage({
    success: true,
    id: 'message-1',
    status: 'sent'
  });

  assert.equal(result.id, 'message-1');
  assert.equal(result.success, true);
});

test('accepts PostgREST array responses', () => {
  const result = requirePersistedMessage([{ id: 'message-2', status: 'sent' }]);

  assert.equal(result.id, 'message-2');
  assert.equal(result.success, true);
});

test('rejects a response that did not persist the message', () => {
  assert.throws(
    () => requirePersistedMessage({ success: true, status: 'sent' }),
    /não foi confirmada no histórico/
  );
});

test('propagates an explicit webhook failure', () => {
  assert.throws(
    () => requirePersistedMessage({ success: false, error: 'falha ao gravar' }),
    /falha ao gravar/
  );
});

