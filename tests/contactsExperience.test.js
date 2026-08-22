import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contactsSource = await readFile(new URL('../src/components/ContactsList.jsx', import.meta.url), 'utf8');
const contactsStyles = await readFile(new URL('../src/styles/contacts.css', import.meta.url), 'utf8');
const tagBadgeSource = await readFile(new URL('../src/components/TagBadge.jsx', import.meta.url), 'utf8');
const profilePhotoSource = await readFile(new URL('../src/services/profilePhotoService.js', import.meta.url), 'utf8');

test('contacts redesign preserves create, edit, tags, notes and chat operations', () => {
  assert.match(contactsSource, /addContact\(newLeadName, newLeadChannel, newLeadPhone, newLeadMsg\)/);
  assert.match(contactsSource, /updateContactName\(selectedContact\.id, editName\)/);
  assert.match(contactsSource, /changeContactStatus\(selectedContact\.id, editStatus\)/);
  assert.match(contactsSource, /updateContactValue\(selectedContact\.id, editValue\)/);
  assert.match(contactsSource, /updateContactTags\(selectedContact\.id, editTags\)/);
  assert.match(contactsSource, /addNoteToContact\(selectedContact\.id, newNoteText\)/);
  assert.match(contactsSource, /setActiveScreen\('chat'\)/);
});

test('contacts search handles missing tags and supports status, channel and tag filters', () => {
  assert.match(contactsSource, /\.\.\.\(contact\.tags \|\| \[\]\)/);
  assert.match(contactsSource, /statusFilter === 'all' \|\| contact\.status === statusFilter/);
  assert.match(contactsSource, /channelFilter === 'all' \|\| contact\.channel === channelFilter/);
  assert.match(contactsSource, /tagFilter === 'all' \|\| \(contact\.tags \|\| \[\]\)\.includes\(tagFilter\)/);
});

test('contacts forms and drawer expose labels, keyboard access and dialog semantics', () => {
  assert.match(contactsSource, /htmlFor="new-lead-name"/);
  assert.match(contactsSource, /type="tel" inputMode="tel"/);
  assert.match(contactsSource, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(contactsSource, /role="dialog" aria-modal="true"/);
  assert.match(contactsSource, /event\.key === 'Escape'/);
  assert.match(tagBadgeSource, /aria-label=\{`Remover etiqueta \$\{name\}`\}/);
});

test('contacts experience uses scoped GSAP motion and responsive table cards', () => {
  assert.match(contactsSource, /gsap\.timeline/);
  assert.match(contactsSource, /delay: 0\.34/);
  assert.match(contactsSource, /gsap\.quickTo/);
  assert.match(contactsSource, /context\.revert\(\)/);
  assert.match(contactsStyles, /@media \(max-width: 860px\)/);
  assert.match(contactsStyles, /content: attr\(data-label\)/);
  assert.doesNotMatch(contactsStyles, /transition:\s*all/);
});

test('filter controls use animated custom drawers instead of native toolbar selects', () => {
  assert.match(contactsSource, /function ContactsFilterSelect/);
  assert.match(contactsSource, /aria-haspopup="listbox"/);
  assert.match(contactsSource, /role="listbox"/);
  assert.match(contactsSource, /ease: 'back\.out\(1\.7\)'/);
  assert.match(contactsSource, /openFilter === 'period'/);
  assert.match(contactsSource, /openFilter === 'status'/);
  assert.match(contactsSource, /openFilter === 'channel'/);
  assert.match(contactsSource, /openFilter === 'tag'/);
  assert.match(contactsStyles, /\.contacts-filter-drawer \{/);
  assert.match(contactsStyles, /backdrop-filter: blur\(22px\)/);
});

test('KPIs count up and respond to pointer tilt while lead actions use GSAP feedback', () => {
  assert.match(contactsSource, /data-kpi-target=\{totalLeads\}/);
  assert.match(contactsSource, /data-kpi-target=\{conversionRate\}/);
  assert.match(contactsSource, /data-kpi-target=\{totalRevenue\}/);
  assert.match(contactsSource, /duration: 1\.15/);
  assert.match(contactsSource, /rotationX/);
  assert.match(contactsSource, /rotationY/);
  assert.match(contactsSource, /\.contacts-animated-action, \.table-action-btn/);
  assert.match(contactsStyles, /@keyframes contacts-avatar-pop/);
});

test('contacts page owns a vertical scroll area and does not shrink its content cards', () => {
  assert.match(contactsStyles, /height: 100%;\s+min-height: 0;/);
  assert.match(contactsStyles, /overflow-y: auto;/);
  assert.match(contactsStyles, /\.contacts-page > :not\(\.contacts-cursor-glow\):not\(\.contacts-ambient-ring\) \{ flex: 0 0 auto; \}/);
});

test('visible Evolution avatars use the n8n photo workflow with broken-image fallback', () => {
  assert.match(contactsSource, /contact\.provider === 'evolution'/);
  assert.match(contactsSource, /IntersectionObserver/);
  assert.match(contactsSource, /onError=\{\(\) => setFailedAvatarUrl\(avatarUrl\)\}/);
  assert.match(contactsSource, /storedAvatarInvalid/);
  assert.match(contactsSource, /force: imageFailed \|\| storedAvatarInvalid/);
  assert.match(contactsSource, /queueProfilePhotoSync\(\{ contactId: contact\.id, tenantId, force \}\)/);
  assert.match(profilePhotoSource, /'\/webhook\/fetch-profile-photo'/);
  assert.match(profilePhotoSource, /contact_id: job\.contactId/);
  assert.match(profilePhotoSource, /REQUEST_INTERVAL_MS = 1100/);
});
