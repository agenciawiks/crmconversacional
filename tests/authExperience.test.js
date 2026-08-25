import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const loginSource = await readFile(new URL('../src/components/LoginScreen.jsx', import.meta.url), 'utf8');
const firstAccessSource = await readFile(new URL('../src/components/FirstLoginPrompt.jsx', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const authContextSource = await readFile(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf8');
const motionSource = await readFile(new URL('../src/hooks/useAuthExperienceMotion.js', import.meta.url), 'utf8');
const authErrorSource = await readFile(new URL('../src/lib/authErrorMessage.js', import.meta.url), 'utf8');

test('login preserves Supabase password authentication and semantic fields', () => {
  assert.match(loginSource, /supabase\.auth\.signInWithPassword/);
  assert.match(loginSource, /<form className="auth-form" onSubmit=\{handleLogin\}/);
  assert.match(loginSource, /htmlFor="login-email"/);
  assert.match(loginSource, /autoComplete="email"/);
  assert.match(loginSource, /autoComplete="current-password"/);
  assert.match(loginSource, /getAuthErrorMessage/);
  assert.match(loginSource, /finally/);
});

test('login distinguishes invalid credentials from an unavailable authentication service', () => {
  assert.match(authErrorSource, /invalid_credentials/);
  assert.match(authErrorSource, /status === 402/);
  assert.match(authErrorSource, /temporariamente indisponível/);
});

test('first access preserves both password choices and completion RPC flow', () => {
  assert.match(firstAccessSource, /await completeFirstLogin\(\)/);
  assert.match(firstAccessSource, /supabase\.auth\.updateUser\(\{ password: newPassword \}\)/);
  assert.match(firstAccessSource, /Manter senha atual/);
  assert.match(authContextSource, /supabase\.rpc\('complete_first_login'\)/);
});

test('authenticated CRM still mounts with the effective tenant isolation key', () => {
  assert.match(appSource, /key=\{effectiveTenantId \|\| 'tenant-loading'\}/);
  assert.match(appSource, /tenantId=\{effectiveTenantId\}/);
  assert.match(appSource, /if \(!session\)/);
  assert.match(appSource, /profile\?\.first_login/);
});

test('auth experience uses GSAP entrance, ambient motion and quick pointer response', () => {
  assert.match(motionSource, /gsap\.timeline/);
  assert.match(motionSource, /repeat: -1/);
  assert.match(motionSource, /gsap\.quickTo/);
  assert.match(motionSource, /context\.revert\(\)/);
});
