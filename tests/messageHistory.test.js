import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isVisibleChatMessage, mergeMessageHistory } from '../src/lib/messageHistory.js';

const contextSource = await readFile(new URL('../src/context/CrmContext.jsx', import.meta.url), 'utf8');
const chatSource = await readFile(new URL('../src/components/ChatWindow.jsx', import.meta.url), 'utf8');

test('message history hides internal AI reset records', () => {
  assert.equal(isVisibleChatMessage({ content: '[SYSTEM_RESET] limpar memória' }), false);
  assert.equal(isVisibleChatMessage({ text: 'Mensagem normal' }), true);
});

test('message history merges database and live state without losing optimistic messages', () => {
  const historical = [
    { id: '1', text: 'Primeira', timestamp: '2026-08-22T10:00:00.000Z', status: 'sent' },
    { id: '2', text: 'Segunda', timestamp: '2026-08-22T10:01:00.000Z', status: 'sent' }
  ];
  const current = [
    { id: '2', text: 'Segunda', timestamp: '2026-08-22T10:01:00.000Z', status: 'read' },
    { id: 'temp-3', text: 'Enviando agora', timestamp: '2026-08-22T10:02:00.000Z', status: 'sending' }
  ];

  const merged = mergeMessageHistory(historical, current);

  assert.deepEqual(merged.map((message) => message.id), ['1', '2', 'temp-3']);
  assert.equal(merged.find((message) => message.id === '2').status, 'read');
  assert.equal(merged.find((message) => message.id === 'temp-3').status, 'sending');
});

test('message history remains chronological when older pages are prepended', () => {
  const merged = mergeMessageHistory(
    [{ id: 'old', timestamp: '2026-08-22T09:00:00.000Z' }],
    [{ id: 'new', timestamp: '2026-08-22T11:00:00.000Z' }]
  );

  assert.deepEqual(merged.map((message) => message.id), ['old', 'new']);
});

test('active conversation loads a bounded recent page without replacing live messages', () => {
  assert.match(contextSource, /MESSAGE_HISTORY_PAGE_SIZE = 200/);
  assert.match(contextSource, /\.order\('timestamp', \{ ascending: false \}\)/);
  assert.match(contextSource, /\.limit\(MESSAGE_HISTORY_PAGE_SIZE \+ 1\)/);
  assert.match(contextSource, /messages: mergeMessageHistory\(cMsgs, c\.messages \|\| \[\]\)/);
  assert.match(contextSource, /requestId !== messageHistoryRequestRef\.current/);
});

test('chat exposes loading, retry and progressive older-history controls', () => {
  assert.match(chatSource, /aria-busy=\{isActiveHistoryLoading \|\| isOlderHistoryLoading\}/);
  assert.match(chatSource, /Sincronizando histórico…/);
  assert.match(chatSource, /retryMessageHistory/);
  assert.match(chatSource, /Carregar mensagens anteriores/);
  assert.match(chatSource, /preserveHistoryScrollRef/);
});
