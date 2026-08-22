import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const agendaSource = await readFile(new URL('../src/components/CalendarView.jsx', import.meta.url), 'utf8');
const agendaStyles = await readFile(new URL('../src/styles/calendar.css', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('agenda preserves create, update and cancel persistence operations', () => {
  assert.match(agendaSource, /createAppointment\(\{ \.\.\.payload, created_by: 'human', status: 'scheduled' \}\)/);
  assert.match(agendaSource, /updateAppointment\(formData\.id, payload\)/);
  assert.match(agendaSource, /cancelAppointment\(formData\.id\)/);
  assert.match(agendaSource, /fromZonedTime\(localDateTime, TZ\)/);
  assert.match(agendaSource, /endUtc = addMinutes\(startUtc, 60\)/);
});

test('agenda provides real month, week and day calendar views', () => {
  assert.match(agendaSource, /renderMonthView/);
  assert.match(agendaSource, /renderWeekView/);
  assert.match(agendaSource, /renderDayView/);
  assert.match(agendaSource, /view === 'month' \? renderMonthView\(\) : view === 'week' \? renderWeekView\(\) : renderDayView\(\)/);
  assert.doesNotMatch(agendaSource, /Visão em desenvolvimento/);
});

test('appointment form supports searchable contact association and complete editing', () => {
  assert.match(agendaSource, /Buscar por nome ou telefone…/);
  assert.match(agendaSource, /role="listbox" aria-label="Contatos encontrados"/);
  assert.match(agendaSource, /contact_id: contact\.id/);
  assert.match(agendaSource, /name="appointment_title"/);
  assert.match(agendaSource, /name="appointment_date"/);
  assert.match(agendaSource, /name="appointment_time"/);
  assert.match(agendaSource, /name="appointment_description"/);
});

test('agenda waits for real CRM data before its first GSAP entrance', () => {
  assert.match(agendaSource, /initialDataLoaded \? 'is-ready' : 'is-loading'/);
  assert.match(agendaSource, /Organizando sua agenda…/);
  assert.match(agendaSource, /if \(!root \|\| !initialDataLoaded\) return undefined/);
  assert.match(agendaSource, /gsap\.timeline/);
  assert.match(agendaSource, /delay: 0\.06/);
  assert.match(agendaSource, /fromTo\('\.agenda-page-header'/);
  assert.match(agendaSource, /gsap\.quickTo/);
  assert.match(agendaSource, /context\.revert\(\)/);
});

test('agenda dialogs expose semantics, escape handling and inline errors', () => {
  assert.match(agendaSource, /role="dialog" aria-modal="true"/);
  assert.match(agendaSource, /event\.key !== 'Escape'/);
  assert.match(agendaSource, /role="alert"/);
  assert.match(agendaSource, /confirmDelete/);
  assert.match(agendaSource, /Não foi possível salvar/);
});

test('agenda stylesheet is scoped, responsive and imported globally', () => {
  assert.match(appSource, /import '\.\/styles\/calendar\.css'/);
  assert.match(agendaStyles, /\.light-theme \.agenda-page/);
  assert.match(agendaStyles, /height: 100%;\s+min-height: 0;/);
  assert.match(agendaStyles, /overflow-y: auto;/);
  assert.match(agendaStyles, /@media \(max-width: 620px\)/);
  assert.match(agendaStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(agendaStyles, /transition:\s*all/);
});
