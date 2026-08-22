import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pipelineSource = await readFile(new URL('../src/components/KanbanBoard.jsx', import.meta.url), 'utf8');
const analyticsSource = await readFile(new URL('../src/components/PipelineAnalytics.jsx', import.meta.url), 'utf8');
const pipelineStyles = await readFile(new URL('../src/styles/kanban.css', import.meta.url), 'utf8');

test('pipeline preserves drag movement, chat navigation and analytics', () => {
  assert.match(pipelineSource, /changeContactStatus\(contactId, statusId\)/);
  assert.match(pipelineSource, /onDragStart=\{\(event\) => handleDragStart\(event, contact\.id\)\}/);
  assert.match(pipelineSource, /setActiveScreen\('chat'\)/);
  assert.match(pipelineSource, /RenderFunnelChart\(\)/);
  assert.match(pipelineSource, /RenderDonutChart\(\)/);
  assert.match(pipelineSource, /RenderChannelPerformance\(\)/);
  assert.match(pipelineSource, /RenderBotPerformance\(\)/);
});

test('pipeline supports search, period, stage, channel and tag filters', () => {
  assert.match(pipelineSource, /matchesSearch/);
  assert.match(pipelineSource, /stageFilter === 'all' \|\| contact\.status === stageFilter/);
  assert.match(pipelineSource, /channelFilter === 'all' \|\| contact\.channel === channelFilter/);
  assert.match(pipelineSource, /tagFilter === 'all' \|\| \(contact\.tags \|\| \[\]\)\.includes\(tagFilter\)/);
  assert.match(pipelineSource, /function PipelineSelect/);
  assert.match(pipelineSource, /aria-haspopup="listbox"/);
  assert.match(pipelineSource, /role="listbox"/);
});

test('pipeline exposes accessible click and keyboard alternative to drag', () => {
  assert.match(pipelineSource, /aria-label=\{`Mover \$\{contact\.name \|\| 'contato'\} para outra etapa`\}/);
  assert.match(pipelineSource, /role="menu" aria-label="Mover para etapa"/);
  assert.match(pipelineSource, /handleMoveContact\(contact\.id, stage\.id\)/);
});

test('pipeline performs real bulk stage updates and reports async feedback', () => {
  assert.match(pipelineSource, /bulkChangeContactStatus\(selectedContactIds, bulkStage\)/);
  assert.match(pipelineSource, /Selecionar em massa/);
  assert.match(pipelineSource, /Mover contatos/);
  assert.match(pipelineSource, /aria-live="polite"/);
  assert.match(pipelineSource, /bulkActionPending/);
});

test('pipeline waits for CRM data and uses scoped GSAP motion', () => {
  assert.match(pipelineSource, /if \(!root \|\| !initialDataLoaded\) return undefined/);
  assert.match(pipelineSource, /Preparando seu funil…/);
  assert.match(pipelineSource, /initialDataLoaded \? 'is-ready' : 'is-loading'/);
  assert.match(pipelineSource, /delay: 0\.06/);
  assert.match(pipelineSource, /fromTo\(header, \{ autoAlpha: 0, y: 34 \}/);
  assert.match(pipelineSource, /previousViewRef\.current === viewMode/);
  assert.match(pipelineSource, /gsap\.quickTo/);
  assert.match(pipelineSource, /rotationX/);
  assert.match(pipelineSource, /rotationY/);
  assert.match(pipelineSource, /context\.revert\(\)/);
  assert.match(pipelineSource, /data-pipeline-kpi/);
});

test('pipeline layout owns scroll, responds on mobile and honors reduced motion', () => {
  assert.match(pipelineStyles, /height: 100%;\s+min-height: 0;/);
  assert.match(pipelineStyles, /overflow-y: auto;/);
  assert.match(pipelineStyles, /overflow-x: auto;/);
  assert.match(pipelineStyles, /@media \(max-width: 640px\)/);
  assert.match(pipelineStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(pipelineStyles, /transition:\s*all/);
});

test('modern analytics keeps all four reports and filtered CRM data', () => {
  assert.match(pipelineSource, /<PipelineAnalytics contacts=\{filteredContacts\} initialDataLoaded=\{initialDataLoaded\} \/>/);
  assert.match(analyticsSource, /Conversão do Funil/);
  assert.match(analyticsSource, /Pizza de Leads/);
  assert.match(analyticsSource, /Desempenho dos Canais/);
  assert.match(analyticsSource, /Automação & IA/);
  assert.match(analyticsSource, /contact\.status === stage\.id/);
  assert.match(analyticsSource, /contact\.messages \|\| \[\]/);
});

test('analytics uses accessible interactive charts and scoped GSAP transitions', () => {
  assert.match(analyticsSource, /gsap\.context/);
  assert.match(analyticsSource, /context\.revert\(\)/);
  assert.match(analyticsSource, /pipeline-funnel-fill/);
  assert.match(analyticsSource, /pipeline-donut-motion/);
  assert.match(analyticsSource, /pipeline-channel-fill/);
  assert.match(analyticsSource, /pipeline-ai-ring-motion/);
  assert.match(analyticsSource, /onFocus=\{\(\) => setActiveStageIndex\(index\)\}/);
  assert.match(analyticsSource, /onPointerEnter=\{\(\) => setActiveDonutIndex\(index\)\}/);
  assert.match(analyticsSource, /onKeyDown=\{\(event\) => handleDonutKeyDown\(event, index\)\}/);
  assert.match(analyticsSource, /role="img"/);
});
