import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sidebarSource = await readFile(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8');
const sidebarStyles = await readFile(new URL('../src/styles/sidebar.css', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

const routes = [
  ['dashboard', 'view_dashboard'],
  ['chat', 'view_chat'],
  ['kanban', 'view_kanban'],
  ['calendar', 'view_calendar'],
  ['contacts', 'view_contacts'],
  ['builder', 'manage_ai_agent'],
  ['followup', 'manage_followup'],
  ['channels', 'manage_channels'],
  ['users', 'manage_users']
];

test('redesigned sidebar preserves every permission-protected route', () => {
  for (const [screen, permission] of routes) {
    assert.match(sidebarSource, new RegExp(`id: '${screen}'.*permission: '${permission}'`));
    assert.match(appSource, new RegExp(`case '${screen}'`));
  }
  assert.match(sidebarSource, /id: 'provision'.*superAdminOnly: true/);
  assert.match(appSource, /case 'provision'/);
});

test('redesigned sidebar preserves all operational controls', () => {
  for (const control of [
    'switchTenant',
    'setSoundEnabled',
    'requestNotificationPermission',
    'setNotificationsEnabled',
    'reconnectRealtime',
    'toggleTheme',
    'signOut'
  ]) {
    assert.match(sidebarSource, new RegExp(control));
  }
});

test('sidebar supports animated collapsed and mobile drawer states', () => {
  assert.match(sidebarSource, /gsap\.context/);
  assert.match(sidebarSource, /is-collapsed/);
  assert.match(sidebarSource, /is-mobile-open/);
  assert.match(sidebarSource, /event\.key === 'Escape'/);
  assert.match(sidebarSource, /inert=\{isMobileViewport && !isMobileOpen/);
  assert.match(sidebarStyles, /@media \(max-width: 900px\)/);
  assert.match(sidebarStyles, /\.crm-sidebar\.is-collapsed \{ width: 80px; \}/);
});

test('superadmin tenant selector uses the modern animated drawer', () => {
  assert.match(sidebarSource, /tenantPickerOpen/);
  assert.match(sidebarSource, /aria-haspopup="listbox"/);
  assert.match(sidebarSource, /role="listbox"/);
  assert.match(sidebarSource, /role="option"/);
  assert.match(sidebarSource, /aria-selected=\{isSelected\}/);
  assert.match(sidebarSource, /tenantDrawerRef/);
  assert.match(sidebarSource, /ease: 'back\.out\(1\.7\)'/);
  assert.match(sidebarSource, /document\.addEventListener\('pointerdown'/);
  assert.doesNotMatch(sidebarSource, /<select\b/);
  assert.doesNotMatch(sidebarSource, /crm-sidebar-select-wrap/);
  assert.match(sidebarStyles, /\.crm-sidebar-tenant-drawer/);
  assert.match(sidebarStyles, /overscroll-behavior: contain/);
  assert.match(sidebarStyles, /\.crm-sidebar\.is-collapsed \.crm-sidebar-tenant-drawer \{ display: grid; \}/);
});

test('global shell retains the active screen and accessible main landmark', () => {
  assert.match(appSource, /id="crm-main-content"/);
  assert.match(appSource, /renderActiveScreen\(\)/);
  assert.match(appSource, /OpenAIStatusBanner/);
  assert.match(appSource, /Pular para o conteúdo/);
});
