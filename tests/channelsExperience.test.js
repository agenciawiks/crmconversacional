import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const channelsSource = await readFile(new URL('../src/components/ChannelsConfig.jsx', import.meta.url), 'utf8');
const evolutionSource = await readFile(new URL('../src/services/evolutionService.js', import.meta.url), 'utf8');
const metaSource = await readFile(new URL('../src/services/metaChannelService.js', import.meta.url), 'utf8');
const crmSource = await readFile(new URL('../src/context/CrmContext.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles/channels.css', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('Evolution connection preserves real n8n validation and persisted refresh', () => {
  assert.match(channelsSource, /connectEvolutionChannel\(\{/);
  assert.match(channelsSource, /const refreshedChannels = await refreshChannels\(\)/);
  assert.match(channelsSource, /if \(!persistedChannel\)/);
  assert.match(evolutionSource, /'\/webhook\/evolution-channel-connect'/);
  assert.match(evolutionSource, /'\/webhook\/evolution-prod'/);
  assert.match(evolutionSource, /if \(!response\.ok \|\| !data\?\.success\)/);
  assert.doesNotMatch(channelsSource, /simular|QR code|qrcode/i);
});

test('WhatsApp Official and Instagram validate Graph credentials before saving', () => {
  assert.match(channelsSource, /testMetaChannelConnection\(\{/);
  assert.match(channelsSource, /const saved = await addChannel\(channelName\.trim\(\), providerType/);
  assert.ok(channelsSource.indexOf('testMetaChannelConnection({') < channelsSource.indexOf('const saved = await addChannel'));
  assert.match(metaSource, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(metaSource, /display_phone_number,verified_name,quality_rating/);
  assert.match(metaSource, /id,name,username/);
});

test('each provider uses its correct inbound webhook', () => {
  assert.match(metaSource, /'\/webhook\/meta'/);
  assert.match(metaSource, /'\/webhook\/instagram'/);
  assert.match(channelsSource, /webhook: EVOLUTION_WEBHOOK_URL/);
  assert.match(channelsSource, /webhook: META_WEBHOOK_URL/);
  assert.match(channelsSource, /webhook: INSTAGRAM_WEBHOOK_URL/);
  assert.match(channelsSource, /Cadastre este endereço no painel de desenvolvedores da Meta/);
});

test('new Instagram channels keep their provider mapping', () => {
  assert.match(crmSource, /newDbChannel\.provider === 'instagram'/);
  assert.match(crmSource, /\? 'instagram'/);
  assert.match(channelsSource, /providerType === 'instagram' \? 'Instagram Account ID' : 'Phone Number ID'/);
  assert.match(channelsSource, /Page Access Token/);
});

test('channel status and deletion roll back when persistence fails', () => {
  assert.match(crmSource, /if \(!updated\) throw new Error\('Channel status update was not persisted'\)/);
  assert.match(crmSource, /status: chan\.status/);
  assert.match(crmSource, /if \(!deleted\) throw new Error\('Channel deletion was not persisted'\)/);
  assert.match(crmSource, /\[removedChannel, \.\.\.prev\]/);
  assert.match(channelsSource, /role="alertdialog" aria-modal="true"/);
});

test('channels wait for CRM data and use scoped GSAP interactions', () => {
  assert.match(channelsSource, /initialDataLoaded \? 'is-ready' : 'is-loading'/);
  assert.match(channelsSource, /Sincronizando canais…/);
  assert.match(channelsSource, /if \(!root \|\| !initialDataLoaded\) return undefined/);
  assert.match(channelsSource, /gsap\.timeline/);
  assert.match(channelsSource, /delay: 0\.06/);
  assert.match(channelsSource, /gsap\.quickTo/);
  assert.match(channelsSource, /rotationX/);
  assert.match(channelsSource, /rotationY/);
  assert.match(channelsSource, /context\.revert\(\)/);
});

test('channel design is scoped, responsive and imported globally', () => {
  assert.match(appSource, /import '\.\/styles\/channels\.css'/);
  assert.match(styles, /\.light-theme \.channels-page/);
  assert.match(styles, /height: 100%;\s+min-height: 0;/);
  assert.match(styles, /overflow-y: auto;/);
  assert.match(styles, /@media \(max-width: 680px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /overscroll-behavior: contain/);
  assert.doesNotMatch(styles, /transition:\s*all/);
});
