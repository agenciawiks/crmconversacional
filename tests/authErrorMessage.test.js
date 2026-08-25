import assert from 'node:assert/strict';
import test from 'node:test';

import { getAuthErrorMessage } from '../src/lib/authErrorMessage.js';

test('keeps credential errors specific without masking infrastructure failures', () => {
  assert.equal(
    getAuthErrorMessage({ code: 'invalid_credentials', status: 400 }),
    'E-mail ou senha incorretos. Revise os dados e tente novamente.'
  );
  assert.equal(
    getAuthErrorMessage({ status: 402, message: 'Payment Required' }),
    'O serviço de autenticação está temporariamente indisponível. Tente novamente mais tarde ou fale com o administrador.'
  );
  assert.equal(
    getAuthErrorMessage({ message: 'Failed to fetch' }),
    'O serviço de autenticação está temporariamente indisponível. Tente novamente mais tarde ou fale com o administrador.'
  );
});

test('covers confirmation, throttling and unknown authentication failures', () => {
  assert.match(getAuthErrorMessage({ code: 'email_not_confirmed' }), /não foi confirmado/);
  assert.match(getAuthErrorMessage({ status: 429 }), /Muitas tentativas/);
  assert.match(getAuthErrorMessage({ code: 'unexpected_failure' }), /Não foi possível entrar agora/);
});
