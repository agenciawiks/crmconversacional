import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/components/ChatWindow.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles/chat.css', import.meta.url), 'utf8');

test('live chat preserves messaging, persistence and media operations', () => {
  for (const contract of [
    'sendMessage', 'sendMedia', 'bulkChangeContactStatus', 'bulkDeleteContacts',
    'changeContactStatus', 'updateContactTags', 'updateContactValue', 'addNoteToContact',
  ]) assert.match(source, new RegExp(contract));
  for (const contentType of ['image', 'sticker', 'audio', 'video', 'document']) {
    assert.match(source, new RegExp(`content_type === '${contentType}'`));
  }
  for (const status of ['sending', 'sent', 'delivered', 'read', 'played', 'failed']) {
    assert.match(source, new RegExp(`msg.status === '${status}'`));
  }
});

test('live chat preserves groups, labels, bulk selection and profile data', () => {
  assert.match(source, /activeContact\.is_group/);
  assert.match(source, /msg\.sender_name/);
  assert.match(source, /globalTags/);
  assert.match(source, /TagBadge/);
  assert.match(source, /selectedContactIds/);
  assert.match(source, /PIPELINE_STAGES\.map/);
  assert.match(source, /activeContact\.whatsapp_jid/);
  assert.match(source, /handleResetAiMemory/);
});

test('live chat waits for real conversations before its first GSAP entrance', () => {
  assert.match(source, /if \(!hasChatData \|\| !rootRef\.current/);
  assert.match(source, /firstEntranceFinished\.current = false/);
  assert.match(source, /onComplete: \(\) => \{/);
  assert.match(source, /firstEntranceFinished\.current = true/);
  assert.match(source, /chat-intro-overlay/);
  assert.match(source, /chat-intro-progress i/);
  assert.match(source, /\.to\('\.chat-intro-overlay'/);
  assert.match(source, /\.fromTo\('\.chat-command-header'/);
  assert.match(source, /\.fromTo\('\.chat-list-panel'/);
  assert.match(source, /\.fromTo\('\.chat-active-panel'/);
  assert.match(source, /querySelectorAll\('\.message-bubble-wrapper'\)\]\.slice\(-24\)/);
  assert.match(source, /\.fromTo\('\.chat-profile-sidebar'/);
  assert.match(source, /duration: reduceMotion \? \.2 : \.66/);
  assert.match(source, /reduceMotion \? \.3 : 1\.25/);
  assert.match(source, /reduceMotion \? \.52 : 2\.34/);
  assert.match(source, /prefers-reduced-motion: reduce/);
});

test('live chat interactions and drawers use scoped GSAP motion', () => {
  assert.match(source, /gsap\.context/);
  assert.match(source, /chat-gsap-action/);
  assert.match(source, /pointerover/);
  assert.match(source, /back\.out\(1\.7\)/);
  assert.match(source, /modern-status-menu/);
  assert.match(source, /chat-tag-panel/);
  assert.match(source, /isProfileOpen/);
  assert.match(source, /gsap\.quickTo/);
  assert.match(source, /chat-cursor-glow/);
});

test('human and AI controls remain legible in both themes', () => {
  assert.match(source, /chat-ai-control/);
  assert.match(source, /isAiPaused \? 'is-human' : 'is-ai'/);
  assert.match(source, /aria-pressed=\{isAiPaused\}/);
  assert.match(styles, /\.active-chat-actions \.chat-ai-control\.is-human/);
  assert.match(styles, /\.light-theme \.active-chat-actions \.chat-ai-control\.is-human/);
  assert.match(styles, /color: #6f2a08/);
});

test('live chat is keyboard accessible and responsive', () => {
  assert.match(source, /role="button"/);
  assert.match(source, /onKeyDown=\{\(event\) =>/);
  assert.match(source, /aria-haspopup="listbox"/);
  assert.match(source, /role="option"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(styles, /\.chat-workspace\.is-mobile-list \.chat-active-panel/);
  assert.match(styles, /\.chat-workspace\.is-mobile-conversation \.chat-list-panel/);
  assert.match(styles, /\.chat-workspace\.is-profile-open \.chat-profile-sidebar/);
  assert.match(styles, /overscroll-behavior: contain/);
  assert.match(styles, /\.chat-command-metrics/);
  assert.match(styles, /\.chat-conversation-empty/);
  assert.match(styles, /Match the approved dashboard, contacts and pipeline visual language/);
  assert.match(styles, /--chat-card: rgba\(12, 30, 40, \.82\)/);
  assert.match(styles, /\.light-theme \.chat-workspace/);
  assert.match(styles, /gap: 12px/);
  assert.match(styles, /\.chat-profile-sidebar \{ overflow-x: hidden; overflow-y: auto/);
  assert.match(styles, /\.light-theme \.messages-scroller/);
  assert.match(styles, /\.chat-history-load-more/);
  assert.doesNotMatch(styles, /transition:\s*all/);
  assert.doesNotMatch(styles, /outline:\s*none/);
});
