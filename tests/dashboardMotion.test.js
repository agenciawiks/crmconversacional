import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboardSource = await readFile(new URL('../src/components/Dashboard.jsx', import.meta.url), 'utf8');
const dashboardStyles = await readFile(new URL('../src/styles/dashboard.css', import.meta.url), 'utf8');
const crmContextSource = await readFile(new URL('../src/context/CrmContext.jsx', import.meta.url), 'utf8');

test('dashboard does not remount the full layout after activity data loads', () => {
  assert.doesNotMatch(dashboardSource, /motionKey|motionSignature/);
});

test('pointer animation is limited to one update per animation frame', () => {
  assert.match(dashboardSource, /requestAnimationFrame\(renderPointerFrame\)/);
  assert.match(dashboardSource, /cancelAnimationFrame\(pointerFrame\)/);
});

test('dashboard motion is enabled by default without a manual toggle', () => {
  assert.doesNotMatch(dashboardSource, /dashboard-motion-toggle|crm-dashboard-motion|toggleMotion/);
  assert.doesNotMatch(dashboardSource, /prefers-reduced-motion/);
  assert.doesNotMatch(dashboardStyles, /prefers-reduced-motion/);
  assert.match(dashboardSource, /gsap\.timeline/);
  assert.match(dashboardSource, /repeat: -1, yoyo: true/);
});

test('desktop columns use the same three standardized rows', () => {
  assert.match(dashboardStyles, /\.dashboard-main-column, \.dashboard-side-column \{ grid-template-rows: 140px 340px 320px; \}/);
});

test('revenue KPI fits the standardized desktop row without clipping its footer', () => {
  assert.match(dashboardStyles, /\.dashboard-revenue-card \{ display: grid; grid-template-rows: auto auto auto auto auto; align-content: space-between;/);
  assert.match(dashboardStyles, /\.dashboard-progress \{ height: 6px; margin: 4px 0 2px;/);
});

test('dashboard waits for initial CRM data before running the entrance animation', () => {
  assert.match(crmContextSource, /const \[initialDataLoaded, setInitialDataLoaded\] = useState\(false\)/);
  assert.match(crmContextSource, /initialDataLoaded,/);
  assert.match(dashboardSource, /const dashboardReady = initialDataLoaded && !loadingActivities/);
  assert.match(dashboardSource, /if \(!root \|\| !dashboardReady\) return undefined/);
});

test('chart exposes interactive detail points and clears its drawing mask', () => {
  assert.match(dashboardSource, /dashboard-chart-hit-target/);
  assert.match(dashboardSource, /onPointerEnter=\{\(\) => setActiveChartIndex\(index\)\}/);
  assert.match(dashboardSource, /clearProps: 'strokeDasharray,strokeDashoffset'/);
});
