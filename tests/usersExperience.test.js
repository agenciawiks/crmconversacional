import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/components/UsersManager.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/users.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('user profiles stay filtered by the selected tenant', () => {
  assert.match(source, /\.from\('profiles'\)[\s\S]*?\.eq\('tenant_id', effectiveTenantId\)/);
  assert.match(source, /if \(!effectiveTenantId\)/);
  assert.match(source, /Selecione um cliente na barra lateral/);
  assert.match(source, /tenant_id: effectiveTenantId/);
  assert.match(source, /target_user_id: pendingUser\.id/);
});

test('profiles, permission matrix and administrative actions remain available', () => {
  assert.match(source, /Perfis cadastrados/);
  assert.match(source, /Matriz de permissões/);
  assert.match(source, /\.from\('role_permissions'\)\.upsert/);
  assert.match(source, /action: 'create'/);
  assert.match(source, /'deactivate' : 'activate'/);
  assert.match(source, /role="alertdialog"/);
  assert.doesNotMatch(source, /alert\(/);
});

test('user management waits for real data before its GSAP entrance', () => {
  assert.match(source, /className=\{`content-wrapper users-page \$\{loading \? 'is-loading' : 'is-ready'\}`\}/);
  assert.match(source, /aria-busy=\{loading\}/);
  assert.match(source, /gsap\.timeline/);
  assert.match(source, /\.fromTo\('\.users-page-header'/);
  assert.match(source, /\.fromTo\('\.users-metric-card'/);
  assert.match(source, /gsap\.quickTo/);
  assert.match(source, /prefers-reduced-motion: reduce/);
});

test('user management interactions use animated accessible controls', () => {
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /role="switch"/);
  assert.match(source, /aria-checked=\{allowed\}/);
  assert.match(source, /aria-haspopup="listbox"/);
  assert.match(source, /role="option"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /autoComplete="new-password"/);
  assert.match(source, /ease: 'back\.out\(1\.7\)'/);
  assert.match(source, /animatePrimaryActionEnter/);
  assert.match(source, /className="users-action-shine"/);
  assert.match(source, /xPercent: 430/);
});

test('user management styling is scoped, themed, responsive and motion-safe', () => {
  assert.match(app, /import '\.\/styles\/users\.css';/);
  assert.match(css, /\.users-page \{/);
  assert.match(css, /\.light-theme \.users-page/);
  assert.match(css, /overflow-y: auto/);
  assert.match(css, /\.users-page > :not\([\s\S]*?flex: 0 0 auto/);
  assert.match(css, /overscroll-behavior-y: auto/);
  assert.match(css, /scrollbar-gutter: stable/);
  assert.match(css, /\.users-tenant-strip \{[\s\S]*?grid-template-columns: 44px minmax\(0, 1fr\) auto/);
  assert.match(css, /overscroll-behavior: contain/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /transition:\s*all/);
});
