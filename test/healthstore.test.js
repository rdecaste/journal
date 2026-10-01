import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1 } from './d1fake.js';
import { d1Store, notionStore, healthStore } from '../src/healthstore.js';
import { writeWork, workDayTitle } from '../src/journal.js';
import { crossBorder } from '../src/metrics.js';

const rowsOf = (db, sql) => db.sqlite.prepare(sql).all().map(r => ({ ...r }));

function seeded() {
  const db = fakeD1();
  db.sqlite.exec(`INSERT INTO work_location (id, day, date, am, pm, commute, weekend, ebike_eur) VALUES
    ('3c724147-f877-814e-8bfc-dd8963380915', 'Tue 15 Sep 2026', '2026-09-15', '🇧🇪 Ghent', '🇧🇪 Ghent', '🚲 E-bike', 0, 25),
    ('3c724147-f877-814e-8bfc-dd8963381001', 'Thu 1 Oct 2026', '2026-10-01', NULL, NULL, NULL, 0, 0),
    ('3c724147-f877-814e-8bfc-dd8963381003', 'Sat 3 Oct 2026', '2026-10-03', NULL, NULL, NULL, 1, 0)`);
  return db;
}

test('work location: an e-bike day saved now is €25.90; days paid before keep €25', async () => {
  const db = seeded();
  const s = d1Store(db);
  await writeWork(s, { id: '3c724147-f877-814e-8bfc-dd8963381001', am: '🇧🇪 Ghent', pm: '🇧🇪 Ghent', commute: '🚲 E-bike' });
  await writeWork(s, { id: '3c724147-f877-814e-8bfc-dd8963380915', am: '🇧🇪 Ghent', pm: '🇧🇪 Ghent', commute: '🚲 E-bike' }); // saved again, unchanged
  const r = Object.fromEntries(rowsOf(db, 'SELECT id, commute, ebike_eur, updated_at FROM work_location').map(x => [x.id, x]));
  assert.equal(r['3c724147-f877-814e-8bfc-dd8963381001'].ebike_eur, 25.9);
  assert.equal(r['3c724147-f877-814e-8bfc-dd8963381001'].commute, '🚲 E-bike');
  assert.equal(r['3c724147-f877-814e-8bfc-dd8963380915'].ebike_eur, 25);
  assert.ok(r['3c724147-f877-814e-8bfc-dd8963381001'].updated_at);
  await writeWork(s, { id: '3c724147-f877-814e-8bfc-dd8963381001', commute: '🚗 Car' });
  assert.equal(rowsOf(db, "SELECT ebike_eur FROM work_location WHERE id = '3c724147-f877-814e-8bfc-dd8963381001'")[0].ebike_eur, 0);
  await writeWork(s, { id: '3c724147-f877-814e-8bfc-dd8963381001', commute: '' });
  assert.deepEqual(rowsOf(db, "SELECT commute, ebike_eur FROM work_location WHERE id = '3c724147-f877-814e-8bfc-dd8963381001'")[0], { commute: null, ebike_eur: 0 });
});

test('work location: a weekday without a row gets one on the first save; a weekend never does', async () => {
  const db = seeded();
  const s = d1Store(db);
  await writeWork(s, { id: 'new:2027-01-04', am: '🇳🇱 Home', pm: '🇳🇱 Home', commute: 'N/A' });
  const [row] = rowsOf(db, "SELECT * FROM work_location WHERE date = '2027-01-04'");
  assert.equal(row.day, 'Mon 4 Jan 2027');
  assert.equal(row.am, '🇳🇱 Home');
  assert.equal(row.weekend, 0);
  assert.equal(row.ebike_eur, 0);
  await assert.rejects(writeWork(s, { id: 'new:2027-01-09', am: '🇳🇱 Home' }), /No Work Location Log row/);
  await assert.rejects(writeWork(s, { id: 'not-a-row', am: '🇳🇱 Home' }), /No Work Location Log row/);
  assert.equal(workDayTitle('2026-09-30'), 'Wed 30 Sep 2026');
});

test('cross-border totals read D1 rows the same way: E-bike € comes through as before', async () => {
  const db = seeded();
  const s = d1Store(db);
  await writeWork(s, { id: '3c724147-f877-814e-8bfc-dd8963381001', am: '🇧🇪 Ghent', pm: '🇧🇪 Ghent', commute: '🚲 E-bike' });
  const rows = await s.queryAll('work_location', { sorts: [{ property: 'Date', direction: 'ascending' }] });
  const c = crossBorder(rows, '2026-10-02');
  assert.equal(c.ytd.ebike, 50.9);
  assert.equal(c.months.find(m => m.month === '2026-10').ebike, 25.9);
});

test('the store follows HEALTH_STORE, and refuses "d1" without the database', () => {
  const n = { query: async () => ({ results: [] }), call: async () => ({}) };
  assert.equal(healthStore({}, n).kind, 'notion');
  assert.equal(healthStore({ HEALTH_STORE: 'd1', DB: fakeD1() }, n).kind, 'd1');
  assert.throws(() => healthStore({ HEALTH_STORE: 'd1' }, n), /not bound/);
  assert.equal(notionStore(n).kind, 'notion');
});
