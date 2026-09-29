import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crossBorder, health, system, overview, usageSummary, estimateCost, mergeUsage } from '../src/metrics.js';
import { addUsage } from '../src/usage.js';
import { sessionCookie, isSignedIn } from '../src/auth.js';
import { summaryFacts, summaryDue } from '../src/summary.js';
import { P, page } from './helpers.js';

const CFG = { start: '2026-07-01', beMinimum: 50, bufferAttention: 3, bufferWatch: 8, trendWeeks: 8 };
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const isWeekend = d => [0, 6].includes(new Date(d + 'T00:00:00Z').getUTCDay());

// A Work Location Log from 1 Jul to 31 Dec where `pick(date)` gives [AM, PM].
function log(pick, end = '2026-12-31') {
  const rows = [];
  for (let d = '2026-07-01'; d <= end; d = addDays(d, 1)) {
    const [am, pm] = isWeekend(d) ? ['', ''] : pick(d);
    rows.push(page('wl-' + d, { Date: P.date(d), AM: P.select(am), PM: P.select(pm), Weekend: P.check(isWeekend(d)), Commute: P.select(''), 'E-bike €': { type: 'formula', formula: { type: 'number', number: am === '🇧🇪 Beerse' ? 3 : 0 } } }, { url: 'https://notion/' + d }));
  }
  return rows;
}

test('cross border: shares, buffer and a healthy position', () => {
  // Mon–Wed Belgium, Thu–Fri Netherlands: 60% Belgium.
  const rows = log(d => ([1, 2, 3].includes(new Date(d + 'T00:00:00Z').getUTCDay()) ? ['🇧🇪 Beerse', '🇧🇪 Beerse'] : ['🇳🇱 Home', '🇳🇱 Home']), '2026-09-27');
  const c = crossBorder(rows, '2026-09-28', CFG);
  assert.ok(Math.abs(c.ytd.be_share - 60) < 1.5, `share ${c.ytd.be_share}`);
  assert.equal(c.ytd.unclassified, 0);
  assert.equal(c.buffer_days, Math.round((c.ytd.be / 0.5 - c.ytd.be - c.ytd.nl) * 10) / 10);
  assert.ok(c.buffer_days > 8);
  assert.equal(c.status, 'ok');
  assert.equal(c.missing.length, 0);
  assert.ok(c.trend.length >= 10);
  assert.equal(c.ytd.ebike, c.ytd.be * 3);
});

test('cross border: missing days and a thin buffer are flagged', () => {
  const rows = log(d => (d === '2026-09-15' ? ['', '🇧🇪 Ghent'] : new Date(d + 'T00:00:00Z').getUTCDay() % 2 ? ['🇧🇪 Beerse', '🇧🇪 Beerse'] : ['🇳🇱 Home', '🇳🇱 Home']), '2026-09-27')
    .filter(r => r.properties.Date.date.start !== '2026-09-16'); // no row at all
  const c = crossBorder(rows, '2026-09-28', CFG);
  assert.deepEqual(c.missing.map(m => m.date), ['2026-09-15', '2026-09-16']);
  assert.equal(c.missing[1].no_row, true);
  assert.equal(c.ytd.unclassified, 1.5);
  const titles = c.flags.map(f => f.title);
  assert.ok(titles.some(t => /not classified/.test(t)));
  assert.notEqual(c.status, 'ok');
});

test('cross border: below the line asks for attention and says how many BE days fix it', () => {
  const rows = log(d => (new Date(d + 'T00:00:00Z').getUTCDay() === 1 ? ['🇧🇪 Beerse', '🇧🇪 Beerse'] : ['🇳🇱 Home', '🇳🇱 Home']), '2026-08-31');
  const c = crossBorder(rows, '2026-09-01', CFG);
  assert.equal(c.status, 'attention');
  assert.ok(c.buffer_days < 0);
  assert.equal(c.be_days_needed, c.ytd.nl - c.ytd.be);
  assert.ok(c.projection.year_end_be_share < 50);
});

test('cross border: planned future days feed the projection, not the totals', () => {
  const rows = log(d => (d > '2026-09-28' ? ['🇧🇪 Beerse', '🇧🇪 Beerse'] : ['🇧🇪 Beerse', '🇳🇱 Home']));
  const c = crossBorder(rows, '2026-09-28', CFG);
  assert.equal(c.ytd.be, c.ytd.nl);
  assert.ok(c.projection.planned_be > 40);
  assert.equal(c.projection.open_days, 0);
  assert.ok(c.projection.year_end_be_share > 60);
});

const workout = (date, sport, minutes, extra = {}) => page('w-' + date + sport, { name: P.title(sport + ' ' + date), start_date_local: P.date(date + 'T08:00:00.000Z'), sport_type_mapped: P.select(sport), moving_time: P.num(minutes * 60), Fitness: P.num(30), Fatigue: P.num(25), 'Form State': P.select('Steady'), ...extra });
const metric = (date, weight, fat) => page('m-' + date, { Date: P.date(date + 'T07:00:00.000Z'), Weight: P.num(weight), 'Body Fat %': P.num(fat) });

test('health: a steady routine raises nothing', () => {
  const ws = [];
  for (let i = 1; i <= 90; i++) {
    const d = addDays('2026-09-28', -i), dow = new Date(d + 'T00:00:00Z').getUTCDay();
    if (dow === 2 || dow === 6) ws.push(workout(d, 'Run', 60));
    if (dow === 4) ws.push(workout(d, 'WeightTraining', 60));
    if (dow === 0) ws.push(workout(d, 'Ride', 180));
    if (dow === 3) ws.push(workout(d, 'EBikeRide', 60)); // commute, not training
  }
  const ms = [metric('2026-08-28', 70, 13), metric('2026-09-26', 69.5, 12.6)];
  const h = health(ws, ms, '2026-09-28');
  assert.equal(h.status, 'ok', JSON.stringify(h.flags));
  assert.equal(h.recent.hours, 6);
  assert.equal(h.sports.run.recent_per_week, 2);
  assert.equal(h.streaks.hours, 12);
  assert.equal(h.weight.change_30d.delta, -0.5);
});

test('health: fewer sessions, no strength and rising body fat are flagged', () => {
  const ws = [];
  for (let i = 1; i <= 90; i++) {
    const d = addDays('2026-09-28', -i), dow = new Date(d + 'T00:00:00Z').getUTCDay();
    if (i > 28) { if (dow === 2 || dow === 6) ws.push(workout(d, 'Run', 60)); if (dow === 4) ws.push(workout(d, 'WeightTraining', 60)); if (dow === 0) ws.push(workout(d, 'Ride', 120)); }
    else if (dow === 6 && i < 20) ws.push(workout(d, 'Run', 45));
  }
  const h = health(ws, [metric('2026-08-20', 69, 15), metric('2026-09-24', 69.5, 16)], '2026-09-28');
  const titles = h.flags.map(f => f.title);
  assert.ok(titles.includes('Training frequency has fallen'), titles.join('|'));
  assert.ok(titles.includes('Training hours below target'));
  assert.ok(titles.includes('No recent strength training'));
  assert.ok(titles.includes('Body fat moving away from target'));
  assert.equal(h.status, 'attention');
  assert.deepEqual(h.missing_sources, ['sleep', 'recovery', 'resting_hr']);
});

// 28 Sep 2026 09:00 Amsterdam (07:00 UTC).
const NOW = Date.parse('2026-09-28T07:00:00Z');

test('system: healthy state, overdue journal chain and stale Make sync', () => {
  const status = {
    built_at: new Date(NOW - 60000).toISOString(),
    journal_chain: { day: '2026-09-28', complete: true, at: '2026-09-28T01:05:00Z', done: { digest: 'ok', match: 'ok', questboard: 'ok', setup: 'ok' } },
    nightly: { at: '2026-09-28T02:03:00Z' }, vault_monday: { at: '2026-09-28T02:10:00Z' },
    journal_enabled: true, nightly_enabled: true, vault_enabled: true, family_enabled: false
  };
  const latest = { workout: { created: '2026-09-27T12:00:00Z' }, metric: { created: '2026-09-27T13:00:00Z' } };
  const checks = [{ slug: 'heartbeat', status: 'up' }, { slug: 'visuals', status: 'up' }];
  const ok = system({ status, checks, ledger: { jobs: [] }, latest }, NOW);
  assert.equal(ok.status, 'ok', JSON.stringify(ok.flags));

  const late = system({ status: { ...status, journal_chain: { day: '2026-09-27', complete: true } }, checks, ledger: { jobs: [] }, latest: { ...latest, workout: { created: '2026-09-10T12:00:00Z' } } }, NOW);
  const names = late.flags.map(f => f.title);
  assert.ok(names.includes('Journal automation'));
  assert.ok(names.includes('Quest processing'));
  assert.ok(names.includes('Workout / Strava sync (Make)'));
  assert.equal(late.status, 'attention');

  const down = system({ status, checks: [{ slug: 'visuals', status: 'down' }], ledger: { jobs: [] }, latest }, NOW);
  assert.ok(down.flags.some(f => f.title === 'Images and clips' && f.level === 'attention'));
  assert.ok(system({ status, checks: null, ledger: { jobs: [] }, latest }, NOW).flags.some(f => /not readable/.test(f.title)));
});

test('usage: the Quest Engine ledger and the dashboard\'s own calls add up, and failures surface', () => {
  const at = t => Date.parse(t);
  const ledger = {
    since: '2026-09-28T00:00:00Z',
    jobs: [{ at: '2026-09-28T01:56:00Z', slug: 'journal', ok: false, message: 'digest: OpenAI 500' }, { at: '2026-09-28T02:00:00Z', slug: 'journal', ok: true, message: 'ok' }],
    usage: { since: '2026-09-28T00:00:00Z', months: { '2026-09': { chat_calls: 3, chat_in: 12000, chat_out: 1500, images: 1, image_high: 1, video: 1 } }, days: { '2026-09-28': { chat_calls: 3, images: 1, image_high: 1, video: 1 } } }
  };
  const own = addUsage(null, { chat_calls: 1, chat_in: 800, chat_out: 120 }, at('2026-09-28T06:00:00Z'));
  const merged = mergeUsage(ledger.usage, own);
  assert.equal(merged.months['2026-09'].chat_calls, 4);
  assert.equal(merged.months['2026-09'].chat_in, 12800);
  const u = usageSummary(merged, '2026-09-28');
  assert.equal(u.cost, estimateCost(merged.months['2026-09']));
  const s = system({ status: {}, checks: [], ledger: { ...ledger, usage: merged }, latest: {} }, at('2026-09-28T07:00:00Z'));
  assert.equal(s.failures.last_24h, 1);
  assert.equal(s.usage.chat_calls, 4);
});

test('usage: a spike against the usual day is flagged', () => {
  let usage = null;
  for (let i = 10; i >= 1; i--) usage = addUsage(usage, { chat_calls: 3, chat_in: 10000, chat_out: 1000 }, Date.parse(addDays('2026-09-28', -i) + 'T10:00:00Z'));
  for (let i = 0; i < 12; i++) usage = addUsage(usage, { images: 1, image_high: 1 }, Date.parse('2026-09-28T10:00:00Z'));
  assert.match(usageSummary(usage, '2026-09-28').spike, /Estimated \$3 today/);
});

test('system: an unreachable Quest Engine or ledger is flagged', () => {
  const s = system({ status: null, checks: [], ledger: null, latest: {} }, NOW);
  assert.ok(s.flags.some(f => f.title === 'Quest Engine' && f.level === 'attention'));
  const t = system({ status: { built_at: new Date(NOW).toISOString() }, checks: [], ledger: null, latest: {} }, NOW);
  assert.ok(t.flags.some(f => /ledger not readable/.test(f.title)));
});

test('overview lists every drifting area, worst first', () => {
  const o = overview({ cross: { status: 'ok', flags: [] }, health: { status: 'watch', flags: [{ level: 'watch', title: 'Sleep', why: 'x' }] }, system: { status: 'attention', flags: [{ level: 'attention', title: 'Journal automation', why: 'y' }] } });
  assert.equal(o.status, 'attention');
  assert.deepEqual(o.drifting.map(f => f.title), ['Journal automation', 'Sleep']);
});

test('login cookie: signed, expiring and tied to the token', async () => {
  const cookie = (await sessionCookie('secret-token', Date.parse('2026-09-28T00:00:00Z'))).split(';')[0];
  const req = c => ({ headers: new Headers({ Cookie: c }) });
  assert.equal(await isSignedIn(req(cookie), 'secret-token', Date.parse('2026-10-01T00:00:00Z')), true);
  assert.equal(await isSignedIn(req(cookie), 'other-token', Date.parse('2026-10-01T00:00:00Z')), false);
  assert.equal(await isSignedIn(req(cookie), 'secret-token', Date.parse('2026-11-30T00:00:00Z')), false);
  assert.equal(await isSignedIn(req(cookie.replace(/.$/, c => (c === '0' ? '1' : '0'))), 'secret-token', Date.parse('2026-10-01T00:00:00Z')), false);
  assert.equal(await isSignedIn(req(''), 'secret-token'), false);
});

test('AI summary: off by default, once a day after 07:30, facts without raw data', () => {
  const data = { today: '2026-09-28', summary: null, overview: { drifting: [{ area_name: 'Health', level: 'watch', title: 'Runs below 2 a week', why: '1.5 a week' }] }, cross: null, health: null, system: null };
  assert.equal(summaryDue({}, data, NOW), false);
  assert.equal(summaryDue({ ADMIN_AI: '1', OPENAI_API_KEY: 'k' }, data, NOW), true);
  assert.equal(summaryDue({ ADMIN_AI: '1', OPENAI_API_KEY: 'k' }, data, Date.parse('2026-09-28T05:00:00Z')), false);
  assert.equal(summaryDue({ ADMIN_AI: '1', OPENAI_API_KEY: 'k' }, { ...data, summary: { day: '2026-09-28' } }, NOW), false);
  assert.deepEqual(summaryFacts(data).drift, ['[Health, watch] Runs below 2 a week: 1.5 a week']);
});

test('battle form decays fitness and fatigue to today like the Quest Engine', async () => {
  const { battleForm, formState } = await import('../src/metrics.js');
  assert.equal(formState(33.3, 30.4), 'Steady');
  assert.equal(formState(30, 20), 'Rusty');
  assert.equal(formState(30, 50), 'Building');
  const sessions = [
    { date: '2026-09-20', fitness: 35, fatigue: 33.6, ratio: 0.81, form: 'Steady', effort: 69, level: 'Big', mult: 1.33, name: 'Run' },
    { date: '2026-09-28', fitness: 33.3, fatigue: 30.4, ratio: 0.82, form: 'Steady', effort: 51, level: 'Normal', mult: 0.82, name: 'Gym' }
  ];
  const same = battleForm(sessions, '2026-09-28');
  assert.equal(same.state, 'Steady');
  assert.equal(same.bonus, 1.1);
  assert.equal(same.recent[0].name, 'Gym');
  const later = battleForm(sessions, '2026-10-05');
  assert.equal(later.days_since, 7);
  assert.equal(later.state, 'Rusty'); // fatigue fades faster than fitness
  assert.equal(battleForm([], '2026-09-28'), null);
});

test('an unreachable Quest Engine does not also mark card publishing as failing', async () => {
  const { system } = await import('../src/metrics.js');
  const now = Date.parse('2026-09-29T05:00:00Z');
  const s = system({ status: null, checks: null, ledger: null, latest: { workout: { created: '2026-09-28T09:34:00.000Z' }, metric: { created: '2026-09-28T05:39:00.000Z' } } }, now);
  const by = k => s.processes.find(p => p.key === k);
  assert.equal(by('engine').level, 'attention');
  assert.equal(by('publish').level, 'unknown');
  assert.equal(by('withings').level, 'ok');
});
