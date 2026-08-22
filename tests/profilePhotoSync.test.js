import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contextSource = await readFile(new URL('../src/context/CrmContext.jsx', import.meta.url), 'utf8');
const serviceSource = await readFile(new URL('../src/services/profilePhotoService.js', import.meta.url), 'utf8');
const chatSource = await readFile(new URL('../src/components/ChatWindow.jsx', import.meta.url), 'utf8');

test('chat and contact list share one deduplicated n8n profile-photo queue', () => {
  assert.match(contextSource, /queueProfilePhotoSync\(\{ contactId: contact\.id, tenantId \}\)/);
  assert.match(serviceSource, /const queuedContacts = new Map\(\)/);
  assert.match(serviceSource, /if \(pendingRequest\) return pendingRequest/);
  assert.match(serviceSource, /await wait\(REQUEST_INTERVAL_MS\)/);
});

test('profile photo workflow remains tenant-aware and updates through Supabase realtime', () => {
  assert.match(serviceSource, /tenant_id: job\.tenantId \|\| undefined/);
  assert.match(contextSource, /\.\.\.updatedContact/);
  assert.match(contextSource, /table: 'contacts'/);
});

test('invalid and broken avatar URLs fall back without rendering a broken image', () => {
  assert.match(serviceSource, /normalizeProfilePhotoUrl/);
  assert.ok(serviceSource.includes('/^(null|undefined|false)$/i'));
  assert.match(chatSource, /failedAvatarUrls/);
  assert.match(chatSource, /onError=\{\(\) => handleProfilePhotoError/);
  assert.match(chatSource, /force: true/);
});
