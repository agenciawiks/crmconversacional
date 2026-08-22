import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/components/ProvisionTenant.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/provision.css', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20260804120000_add_tenant_provisioning.sql', import.meta.url), 'utf8');

test('provisioning keeps the real authenticated n8n workflow and tenant refresh', () => {
  assert.match(source, /VITE_N8N_PROVISION_TENANT_URL/);
  assert.match(source, /webhook\/provision-tenant/);
  assert.match(source, /supabase\.auth\.getSession\(\)/);
  assert.match(source, /Authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(source, /body: JSON\.stringify\(\{ \.\.\.formData, clinicSlug: slugify\(formData\.clinicSlug\) \}\)/);
  assert.match(source, /await refreshTenants\(\)/);
  assert.match(source, /if \(!isSuperAdmin\)/);
});

test('new client experience covers company, initial user, configuration and honest channel readiness', () => {
  for (const label of ['Empresa', 'Usuário inicial', 'Configurações & canais', 'Evolution API', 'WhatsApp Oficial', 'Instagram']) {
    assert.match(source, new RegExp(label.replace('&', '\\&')));
  }
  assert.match(source, /Configurar depois/);
  assert.match(source, /use “Conectar Canais”/);
  assert.match(source, /Plano padrão/);
  assert.match(source, /Follow-Up global/);
  assert.match(source, /Primeiro login/);
});

test('database provisioning still enforces superadmin, isolation and initial settings', () => {
  assert.match(migration, /is_super_admin is true/);
  assert.match(migration, /insert into public\.tenants/);
  assert.match(migration, /tenant_id = v_tenant_id/);
  assert.match(migration, /role_id = v_admin_role_id/);
  assert.match(migration, /first_login = true/);
  assert.match(migration, /'followup_global_enabled', 'true'/);
});

test('provisioning form is accessible and validates inline', () => {
  assert.match(source, /htmlFor="provision-clinic-name"/);
  assert.match(source, /type="email" name="adminEmail"/);
  assert.match(source, /autoComplete="new-password"/);
  assert.match(source, /aria-invalid=\{Boolean\(errors\.adminPassword\)\}/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /querySelector\('\[aria-invalid="true"\]'\)/);
  assert.match(source, /beforeunload/);
});

test('new client uses first-load and interaction GSAP motion', () => {
  assert.match(source, /gsap\.timeline/);
  assert.match(source, /\.fromTo\('\.provision-page-header'/);
  assert.match(source, /\.fromTo\('\.provision-form-section'/);
  assert.match(source, /\.fromTo\('\.provision-summary'/);
  assert.match(source, /gsap\.quickTo/);
  assert.match(source, /animateActionEnter/);
  assert.match(source, /className="provision-action-shine"/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /firstEntranceFinished\.current = false/);
  assert.match(source, /onComplete: \(\) => \{/);
  assert.match(source, /firstEntranceFinished\.current = true/);
  assert.match(source, /clearProps: 'transform,opacity,visibility,willChange'/);
});

test('new client styling is scoped, themed, scrollable and responsive', () => {
  assert.match(css, /\.provision-page \{/);
  assert.match(css, /\.light-theme \.provision-page/);
  assert.match(css, /overflow-y: auto/);
  assert.match(css, /scrollbar-gutter: stable/);
  assert.match(css, /flex: 0 0 auto/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /transition:\s*all/);
});
