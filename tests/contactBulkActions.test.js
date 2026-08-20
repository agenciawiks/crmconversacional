import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyBulkStage,
  getNextActiveContactId,
  normalizeContactIds,
  removeContactsFromList
} from '../src/lib/contactBulkActions.js';

test('normalizes bulk contact selection without duplicates', () => {
  assert.deepEqual(normalizeContactIds(['a', 'a', null, 2]), ['a', '2']);
});

test('moves only selected contacts and pauses AI in terminal stages', () => {
  const selectedIds = new Set(['contact-1']);
  const selected = applyBulkStage(
    { id: 'contact-1', status: 'new', tags: ['Importante'] },
    selectedIds,
    'won'
  );
  const untouched = applyBulkStage(
    { id: 'contact-2', status: 'new', tags: [] },
    selectedIds,
    'won'
  );

  assert.equal(selected.status, 'won');
  assert.deepEqual(selected.tags, ['Importante', 'IA Inativa']);
  assert.equal(untouched.status, 'new');
});

test('removes selected contacts and chooses a valid next active conversation', () => {
  const contacts = [{ id: 'one' }, { id: 'two' }, { id: 'three' }];

  assert.deepEqual(removeContactsFromList(contacts, ['one', 'three']), [{ id: 'two' }]);
  assert.equal(getNextActiveContactId(contacts, ['one'], 'one'), 'two');
  assert.equal(getNextActiveContactId(contacts, ['one'], 'two'), 'two');
  assert.equal(getNextActiveContactId(contacts, ['one', 'two', 'three'], 'two'), null);
});
