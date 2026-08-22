import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const followupSource = await readFile(new URL('../src/components/FollowUpSettings.jsx', import.meta.url), 'utf8');
const modalSource = await readFile(new URL('../src/components/FollowUpRuleModal.jsx', import.meta.url), 'utf8');
const serviceSource = await readFile(new URL('../src/services/followUpService.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles/followup.css', import.meta.url), 'utf8');

test('follow-up preserves rules, queue and settings persistence operations', () => {
  assert.match(followupSource, /followUpService\.fetchRules\(\)/);
  assert.match(followupSource, /followUpService\.fetchQueue\(\)/);
  assert.match(followupSource, /followUpService\.fetchSettings\(\)/);
  assert.match(followupSource, /followUpService\.updateRule\(rule\.id, \{ is_active: !rule\.is_active \}\)/);
  assert.match(followupSource, /followUpService\.deleteRule\(action\.id\)/);
  assert.match(followupSource, /followUpService\.cancelQueueItem\(action\.id, 'manual_cancel'\)/);
  assert.match(followupSource, /updateSetting\('followup_global_enabled'/);
  assert.match(serviceSource, /\.from\('followup_queue'\)/);
});

test('follow-up exposes rules, history and variables with real automation states', () => {
  assert.match(followupSource, /label: 'Regras'/);
  assert.match(followupSource, /label: 'Histórico & Fila'/);
  assert.match(followupSource, /label: 'Variáveis'/);
  assert.match(followupSource, /pending: \{ label: 'Pendente'/);
  assert.match(followupSource, /sent: \{ label: 'Enviado'/);
  assert.match(followupSource, /cancelled: \{ label: 'Cancelado'/);
  assert.match(followupSource, /failed: \{ label: 'Falhou'/);
  assert.match(followupSource, /queueStatus === 'all' \|\| item\.status === queueStatus/);
});

test('activation controls and destructive actions are persisted and confirmed', () => {
  assert.match(followupSource, /aria-label=\{globalEnabled \? 'Pausar todas as automações' : 'Ativar todas as automações'\}/);
  assert.match(followupSource, /handleToggleRuleActive\(rule\)/);
  assert.match(followupSource, /role="alertdialog" aria-modal="true"/);
  assert.match(followupSource, /confirmation\.type === 'delete-rule'/);
  assert.doesNotMatch(followupSource, /window\.confirm/);
});

test('rule editor preserves every automation configuration field', () => {
  assert.match(modalSource, /trigger_event: triggerEvent/);
  assert.match(modalSource, /delay_hours: Number\(totalDelay\.toFixed\(4\)\)/);
  assert.match(modalSource, /channel_ids: selectedChannels/);
  assert.match(modalSource, /pipeline_stages: selectedStages/);
  assert.match(modalSource, /stop_on_reply: stopOnReply/);
  assert.match(modalSource, /max_attempts: Number\(maxAttempts\) \|\| 1/);
  assert.match(modalSource, /followUpService\.createRule\(payload\)/);
  assert.match(modalSource, /followUpService\.updateRule\(rule\.id, payload\)/);
  assert.match(modalSource, /role="dialog" aria-modal="true"/);
});

test('first load and interactions use scoped GSAP after data is ready', () => {
  assert.match(followupSource, /isLoading \? 'is-loading' : 'is-ready'/);
  assert.match(followupSource, /Organizando automações…/);
  assert.match(followupSource, /if \(!root \|\| isLoading\) return undefined/);
  assert.match(followupSource, /gsap\.timeline/);
  assert.match(followupSource, /delay: 0\.06/);
  assert.match(followupSource, /gsap\.quickTo/);
  assert.match(followupSource, /rotationX/);
  assert.match(followupSource, /rotationY/);
  assert.match(followupSource, /context\.revert\(\)/);
  assert.match(modalSource, /gsap\.fromTo\(dialog/);
});

test('follow-up design supports dark-light themes, scrolling and reduced motion', () => {
  assert.match(styles, /\.light-theme \.followup-page/);
  assert.match(styles, /height: 100%;\s+min-height: 0;/);
  assert.match(styles, /overflow-y: auto;/);
  assert.match(styles, /@media \(max-width: 680px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /overscroll-behavior: contain/);
  assert.doesNotMatch(styles, /transition:\s*all/);
});
