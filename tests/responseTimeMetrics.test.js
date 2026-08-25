import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  buildResponseMetric,
  formatResponseDuration,
  getResponseMetricPresentation
} from '../src/lib/responseTimeMetrics.js';

test('calculates the wait between an inbound message and its following response', () => {
  assert.deepEqual(
    buildResponseMetric('2026-08-25T12:00:00.000Z', '2026-08-25T12:07:32.000Z'),
    {
      status: 'answered',
      durationMs: 452_000,
      receivedAt: '2026-08-25T12:00:00.000Z',
      respondedAt: '2026-08-25T12:07:32.000Z'
    }
  );
  assert.deepEqual(
    buildResponseMetric('2026-08-25T12:00:00.000Z'),
    { status: 'waiting', receivedAt: '2026-08-25T12:00:00.000Z' }
  );
  assert.deepEqual(buildResponseMetric(null), { status: 'empty' });
});

test('formats response durations for seconds, minutes, hours and days', () => {
  assert.equal(formatResponseDuration(42_000), '42s');
  assert.equal(formatResponseDuration(8 * 60_000 + 12_000), '8min 12s');
  assert.equal(formatResponseDuration(2 * 3_600_000 + 8 * 60_000), '2h 8min');
  assert.equal(formatResponseDuration(26 * 3_600_000), '1d 2h');
});

test('never presents invalid or negative durations as a valid KPI', () => {
  assert.equal(formatResponseDuration(Number.NaN), '—');
  assert.equal(formatResponseDuration(-1), '—');
});

test('presents loading, waiting, empty, answered and error states clearly', () => {
  assert.deepEqual(getResponseMetricPresentation(null, true), { value: 'Calculando…', state: 'loading' });
  assert.deepEqual(getResponseMetricPresentation({ status: 'waiting' }), { value: 'Aguardando', state: 'waiting' });
  assert.deepEqual(getResponseMetricPresentation({ status: 'empty' }), { value: 'Sem mensagens', state: 'empty' });
  assert.deepEqual(getResponseMetricPresentation({ status: 'answered', durationMs: 65_000 }), { value: '1min 5s', state: 'answered' });
  assert.deepEqual(getResponseMetricPresentation(null, false, true), { value: 'Indisponível', state: 'error' });
});

test('live chat metrics use the complete tenant-scoped database history', async () => {
  const [serviceSource, chatSource] = await Promise.all([
    readFile(new URL('../src/services/supabaseService.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ChatWindow.jsx', import.meta.url), 'utf8')
  ]);

  assert.match(serviceSource, /fetchContactResponseMetrics/);
  assert.match(serviceSource, /\.eq\('contact_id', contactId\)/);
  assert.match(serviceSource, /\.eq\('tenant_id', tenantId\)/);
  assert.match(serviceSource, /\.eq\('direction', 'in'\)/);
  assert.match(serviceSource, /\.eq\('direction', 'out'\)/);
  assert.match(serviceSource, /\[SYSTEM_RESET\]/);
  assert.match(chatSource, /Primeira resposta/);
  assert.match(chatSource, /Última resposta/);
  assert.match(chatSource, /profile-response-kpi/);
});
