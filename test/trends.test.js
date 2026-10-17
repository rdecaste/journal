import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTrends, rewriteCoach } from '../src/trends.js';
import { trendsHtml } from '../src/trendspage.js';

// GET /trends as the Quest Engine answers it, cut down.
const trends = {
  ok: 1, today: '2026-10-17', since: '2026-07-19', window_days: 91, goals: { watts_z2: 200, half_km: 21.0975, weekly_hours: 6 },
  workouts: [
    { id: '1', day: '2026-09-27', name: 'Morning <Run>', type: 'Run', sport: 'run', sport_type: 'Run', trainer: 0, km: 13, min: 78, h: 1.3, hr: 158, zones: [5, 40, 30, 3, 0], tss: 90, pace_z2: 359, best_5k_s: 1772, decouple_pct: 6.1, half_delta: -2, hr_rise: 11, z2_s: 2400 },
    { id: '2', day: '2026-08-29', name: 'Spicey!', type: 'Ride', sport: 'ride', sport_type: 'GravelRide', trainer: 0, km: 35.5, min: 82, h: 1.37, hr: 154, watts: 175, np: 179, zones: [10, 40, 25, 5, 0], watts_z2: 175, best_20m_w: 186, p_lthr_w: 195, decouple_pct: 9.4, half_delta: 1, hr_rise: 16, z2_s: 2160 },
    { id: '3', day: '2026-10-06', name: 'Bench', type: 'WeightTraining', sport: 'strength', sport_type: 'WeightTraining', trainer: 0, km: 0, min: 40, h: 0.67, hr: 105 }
  ],
  hevy: { workouts: [{ id: 'h1', day: '2026-10-06', title: 'Easy Bench Day', volume_kg: 2496, sets: 11, duration_min: 40 }], sets: [{ workout_id: 'h1', day: '2026-10-06', exercise: 'Bench Press (Barbell)', type: 'normal', kg: 50, reps: 8, e1rm: 63.3 }] },
  facts: { strength: { sessions: 1 } },
  coach: { day: '2026-10-13', at: '2026-10-13T05:00:00Z', headline: 'Fitter, <less> often.', read: ['Pace at Zone 2 is 9 s faster.', 'Hours slipped.'], focus: 'This week: one long run at 14 km in Zone 2.' }
};

test('the page carries the data as escaped JSON, the dashboard skeleton, the four tabs and the coach', () => {
  const html = trendsHtml(trends);
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('<title>Trends</title>'));
  assert.ok(!html.includes('__DATA__'));
  assert.ok(html.includes('Morning \\u003cRun>'), 'a < in the data cannot close the script tag');
  assert.ok(!html.includes('</script>\n<script'), 'one script after the data');
  for (const tab of ['Summary', 'Running', 'Cycling', 'Strength']) assert.ok(html.includes(`>${tab}</button>`), tab);
  for (const id of ['c-mvm', 'c-z2pace', 'c-runzones', 'c-decouple', 'c-fade', 'c-wz2', 'c-ridezones', 'c-rdecouple', 'c-rfade', 'c-vol', 'c-bench', 'coach']) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(html.includes('href="/"'), 'back to the Quest log');
  assert.ok(html.includes('/trends/coach'), 'the Rewrite button posts to the dashboard');
  assert.ok(html.includes('Fitter, \\u003cless> often.'));
});

test('the page script has no syntax error and shapes the rows per sport', async () => {
  const html = trendsHtml(trends);
  const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
  // Parsed, not run: the script needs a document.
  assert.doesNotThrow(() => new Function(script));
  const json = html.slice(html.indexOf('type="application/json">') + 24, html.indexOf('</script>'));
  assert.equal(JSON.parse(json).workouts.length, 3);
});

function withEngine(reply, fn) {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (req) => { calls.push({ url: req.url, method: req.method, token: req.headers.get('X-Admin-Token'), body: req.method === 'POST' ? await req.text() : null }); return new Response(JSON.stringify(reply)); };
  return fn(calls).finally(() => { globalThis.fetch = original; });
}
const env = { QUEST_ENGINE_URL: 'https://engine.test', QUEST_ENGINE_TOKEN: 't' };

test('the data comes from the Quest Engine with the token; a refusal becomes an error the page shows', () =>
  withEngine(trends, async calls => {
    const d = await loadTrends(env);
    assert.equal(d.workouts.length, 3);
    assert.deepEqual([calls[0].url, calls[0].method, calls[0].token], ['https://engine.test/trends', 'GET', 't']);
    assert.deepEqual(await loadTrends({}), { error: 'QUEST_ENGINE_TOKEN is not set on the dashboard.' });
  }).then(() => withEngine({ ok: 0, code: 'bad_token' }, async () => {
    assert.equal((await loadTrends(env)).error, 'bad_token');
  })));

test('Rewrite asks the engine for the note again, forced', () =>
  withEngine({ ok: 1, coach: { day: '2026-10-17' } }, async calls => {
    const r = await rewriteCoach(env);
    assert.equal(r.coach.day, '2026-10-17');
    assert.deepEqual([calls[0].url, calls[0].method, calls[0].body], ['https://engine.test/trends/coach', 'POST', 'force=1']);
  }));
