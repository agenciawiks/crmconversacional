import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const settingsSource = readFileSync(new URL('../src/components/AiAgentSettings.jsx', import.meta.url), 'utf8');
const statusSource = readFileSync(new URL('../src/components/OpenAIStatusCard.jsx', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('../src/services/supabaseService.js', import.meta.url), 'utf8');
const n8nSource = readFileSync(new URL('../src/services/n8nService.js', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../src/styles/ai-agent.css', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('AI agent keeps tenant-aware channel loading and safe persistence', () => {
  assert.match(settingsSource, /fetchChannels\(effectiveTenantId\)/);
  assert.match(settingsSource, /fetchAiSettings\(selectedChannelId\)/);
  assert.match(settingsSource, /saveAiSettings\(\{/);
  assert.match(settingsSource, /channel_id: selectedChannelId/);
  assert.match(settingsSource, /\.\.\.\(apiKey\.trim\(\) \? \{ api_key: apiKey\.trim\(\) \} : \{\}\)/);
  assert.match(serviceSource, /get_ai_settings_safe/);
  assert.match(serviceSource, /upsert_ai_settings_secure/);
  assert.match(settingsSource, /A chave salva nunca retorna ao navegador/);
});

test('AI agent exposes prompt, guidelines, rules, provider, model and real test', () => {
  for (const label of ['Prompt', 'Diretrizes', 'Regras', 'Modelo & Teste']) {
    assert.match(settingsSource, new RegExp(label.replace('&', '\\&')));
  }
  assert.match(settingsSource, /system_prompt: settings\.systemPrompt/);
  assert.match(settingsSource, /negative_prompt: settings\.negativePrompt/);
  assert.match(settingsSource, /pause_trigger_phrases: settings\.pausePhrases/);
  assert.match(settingsSource, /model: settings\.model/);
  assert.match(settingsSource, /temperature: Number\(settings\.temperature\)/);
  assert.match(statusSource, /useOpenAIQuota\(120000, channelId\)/);
  assert.match(statusSource, /Testar Conexão/);
  assert.match(n8nSource, /CHECK_OPENAI_QUOTA_PATH/);
  assert.match(n8nSource, /body: JSON\.stringify\(\{ channel_id: channelId \}\)/);
});

test('AI agent waits for the selected channel settings before first GSAP entrance', () => {
  assert.match(settingsSource, /loadedChannelId !== selectedChannelId/);
  assert.match(settingsSource, /className=\{`content-wrapper ai-agent-page \$\{isLoading \? 'is-loading' : 'is-ready'\}`\}/);
  assert.match(settingsSource, /aria-busy=\{isLoading\}/);
  assert.match(settingsSource, /gsap\.timeline\(/);
  assert.match(settingsSource, /\.fromTo\('\.ai-page-header'/);
  assert.match(settingsSource, /\.fromTo\('\.ai-metric-card'/);
  assert.match(settingsSource, /\.fromTo\('\.ai-tab-panel > \*'/);
  assert.match(settingsSource, /gsap\.quickTo/);
  assert.match(settingsSource, /const reduceMotion = window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
  assert.match(settingsSource, /duration: reduceMotion \? 0\.28 : 0\.4/);
  assert.doesNotMatch(settingsSource, /firstEntranceFinished\.current = true;\s*return undefined;\s*}\s*firstEntranceFinished/);
});

test('AI agent interactions and forms remain accessible', () => {
  assert.match(settingsSource, /role="tablist"/);
  assert.match(settingsSource, /role="tabpanel"/);
  assert.match(settingsSource, /aria-selected=\{selected\}/);
  assert.match(settingsSource, /htmlFor="ai-system-prompt"/);
  assert.match(settingsSource, /htmlFor="ai-api-key"/);
  assert.match(settingsSource, /aria-live="polite"/);
  assert.match(settingsSource, /aria-label=\{`Remover gatilho \$\{phrase\}`\}/);
  assert.match(statusSource, /disabled=\{isChecking \|\| !channelId \|\| !apiKeyConfigured\}/);
});

test('AI metrics react with GSAP and channel selection uses the shared animated drawer pattern', () => {
  assert.match(settingsSource, /className="ai-metric-shine"/);
  assert.match(settingsSource, /const shine = card\.querySelector\('\.ai-metric-shine'\)/);
  assert.match(settingsSource, /gsap\.fromTo\(shine/);
  assert.match(settingsSource, /className=\{`ai-channel-picker \$\{channelDrawerOpen \? 'is-open' : ''\}`\}/);
  assert.match(settingsSource, /aria-haspopup="listbox"/);
  assert.match(settingsSource, /className="ai-channel-drawer" role="listbox"/);
  assert.match(settingsSource, /role="option" aria-selected=\{selected\}/);
  assert.match(settingsSource, /ease: 'back\.out\(1\.7\)'/);
  assert.doesNotMatch(settingsSource, /<select id="ai-channel-selector"/);
  assert.match(cssSource, /\.ai-channel-drawer \{/);
  assert.match(cssSource, /overscroll-behavior: contain/);
});

test('AI agent styling is scoped, themed, responsive and motion-safe', () => {
  assert.match(appSource, /import '\.\/styles\/ai-agent\.css';/);
  assert.match(cssSource, /\.ai-agent-page \{/);
  assert.match(cssSource, /\.light-theme \.ai-agent-page/);
  assert.match(cssSource, /overflow-y: auto/);
  assert.match(cssSource, /@media \(max-width: 620px\)/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(cssSource, /transition:\s*all/);
});
