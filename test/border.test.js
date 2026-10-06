// The Border days view on /admin (Cross Border tab, 4 Oct 2026): POST
// /border/save writes the changed days to the Work Location Log in D1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1 } from './d1fake.js';
import { saveBorder } from '../src/border.js';
import { BORDER_PLACES, BORDER_RIDES } from '../src/borderpage.js';
import { crossBorder } from '../src/metrics.js';
import { P, page } from './helpers.js';

const W1 = '3c724147-f877-81b3-b996-e90e762c4471';
async function setup() {
  const db = fakeD1();
  await db.prepare('INSERT INTO "work_location" ("id", "day", "date", "am", "pm", "commute", "weekend", "ebike_eur") VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(W1, 'Thu 8 Oct 2026', '2026-10-08', '🇧🇪 Beerse', '🇧🇪 Beerse', '🚗 Car', 0, 0).run();
  return { db, env: { HEALTH_STORE: 'd1', JOURNAL_STORE: 'd1', DB: db } };
}
const rowOf = (db, date) => db.prepare('SELECT * FROM work_location WHERE date = ?').bind(date).first();

test('border save: changes, clears and creates weekday rows; E-bike € follows Commute', async () => {
  const { db, env } = await setup();
  const out = await saveBorder(env, { days: [
    { date: '2026-10-08', am: '🇧🇪 Ghent', pm: '🇧🇪 Ghent', commute: '🚲 E-bike' },
    { date: '2026-10-09', am: '🇳🇱 Home', pm: '🇳🇱 Home', commute: 'N/A' }
  ] });
  assert.deepEqual(out, { ok: 1, saved: ['2026-10-08', '2026-10-09'], failed: [] });
  const a = await rowOf(db, '2026-10-08');
  assert.deepEqual([a.am, a.pm, a.commute, a.ebike_eur], ['🇧🇪 Ghent', '🇧🇪 Ghent', '🚲 E-bike', 25.9]);
  const b = await rowOf(db, '2026-10-09');
  assert.deepEqual([b.am, b.pm, b.commute, b.day, b.weekend], ['🇳🇱 Home', '🇳🇱 Home', 'N/A', 'Fri 9 Oct 2026', 0]);
  // Clearing a day empties it and drops the e-bike money.
  await saveBorder(env, { days: [{ date: '2026-10-08', am: '', pm: '', commute: '' }] });
  const c = await rowOf(db, '2026-10-08');
  assert.deepEqual([c.am, c.pm, c.commute, c.ebike_eur], [null, null, null, 0]);
});

test('border save: weekends and unknown dates fail on their own; other days still save', async () => {
  const { db, env } = await setup();
  const out = await saveBorder(env, { days: [{ date: '2026-10-10', am: '🇳🇱 Home', pm: '🇳🇱 Home' }, { date: 'x' }, { date: '2026-10-08', am: '🇳🇱 Home', pm: '🇳🇱 Home' }] });
  assert.equal(out.ok, 0);
  assert.deepEqual(out.saved, ['2026-10-08']);
  assert.deepEqual(out.failed.map(f => f.date), ['2026-10-10', 'x']);
  assert.equal(await rowOf(db, '2026-10-10'), null);
  await assert.rejects(saveBorder(env, { days: [] }), /No days/);
});

test('border view: every Work Location option has a look; crossBorder hands over the weekday rows', () => {
  assert.deepEqual(BORDER_PLACES.map(p => p.name), ['Beerse', 'Ghent', 'Home', 'Travel', 'Holiday', 'Public holiday']);
  assert.ok(BORDER_PLACES.every(p => p.cls && p.kind));
  assert.equal(BORDER_RIDES.find(r => r.v === 'N/A').name, 'No commute');
  const rows = ['2026-10-01', '2026-10-03', '2026-10-05'].map(d => page('wl-' + d, { Date: P.date(d), AM: P.select('🇳🇱 Home'), PM: P.select('🇳🇱 Home'), Weekend: P.check(d === '2026-10-03'), Commute: P.select('N/A') }));
  const c = crossBorder(rows, '2026-10-04');
  assert.equal(c.day, '2026-10-04');
  assert.deepEqual(c.days.map(d => d.date), ['2026-10-01', '2026-10-05']);
  assert.deepEqual(c.days[0], { date: '2026-10-01', am: '🇳🇱 Home', pm: '🇳🇱 Home', commute: 'N/A', ebike: 0 });
});

test('border view: the browser sums match crossBorder, and a filled-in today counts at once (6 Oct 2026)', async () => {
  const vm = await import('node:vm');
  const { BORDER_SCRIPT } = await import('../src/borderpage.js');
  const day = (d, v) => page('wl-' + d, { Date: P.date(d), AM: P.select(v), PM: P.select(v), Weekend: P.check(false), Commute: P.select('') });
  const rows = [day('2026-10-01', '🇧🇪 Beerse'), day('2026-10-02', '🇧🇪 Beerse'), day('2026-10-05', '🇳🇱 Home'), day('2026-10-06', '🇳🇱 Home'), day('2026-10-07', '')];
  const c = crossBorder(rows, '2026-10-06', { start: '2026-10-01', beMinimum: 50, bufferAttention: 3, bufferWatch: 8, trendWeeks: 8 });
  const el = { addEventListener() {}, innerHTML: '' };
  const ctx = vm.createContext({ $: () => el, esc: s => s, fmt: x => x, day: x => x, D1_CONSOLE: '', localStorage: { getItem: () => null, setItem() {} }, addEventListener() {}, load() {}, C: c });
  vm.runInContext(BORDER_SCRIPT + ';bdLoad(C); var R = bdStats(bd.days);', ctx);
  assert.deepEqual([ctx.R.be, ctx.R.nl, ctx.R.buffer], [c.ytd.be, c.ytd.nl, c.buffer_days]);
  assert.deepEqual([ctx.R.be, ctx.R.nl, ctx.R.buffer, ctx.R.fix], [2, 2, 0, 0]);
});
