import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const brandedFiles = [
  '../index.html',
  '../src/components/AuthBrandPanel.jsx',
  '../src/components/LoginScreen.jsx',
  '../src/components/Sidebar.jsx'
];

test('the visible product identity is CRM Mess everywhere in the app shell', async () => {
  const sources = await Promise.all(
    brandedFiles.map((file) => readFile(new URL(file, import.meta.url), 'utf8'))
  );
  const combinedSource = sources.join('\n');

  assert.match(combinedSource, /CRM Mess/);
  assert.match(combinedSource, /logo-mess\.svg/);
  assert.doesNotMatch(combinedSource, /CRM Wiks|Wiks CRM/);
  assert.doesNotMatch(combinedSource, /logo\.jpg/);
});
