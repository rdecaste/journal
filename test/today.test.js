import { test } from 'node:test';
import assert from 'node:assert/strict';
import { questLogView, heroView, questsView, crossView, briefingView, workDay } from '../src/today.js';
import { todayHtml } from '../src/todaypage.js';
import { loginHtml } from '../src/page.js';

// GET /questlog as the Quest Engine answers it.
const questLog = {
  ok: 1, day: '2026-09-29',
  spark: 'Hey Roy, a thought.\n\nGrtz, ChatGPT ✌️',
  journal: { title: '29 September 2026', url: 'https://admindashboard.quest-engine.workers.dev/journal' },
  main_quest: { title: 'Break the PMO Cycle', url: null },
  notes: { main_quest: 'Keep it calm.', cross_border: 'Plenty of room.', training: 'Mind the blister.', todo: '', attention: 'Focus on the half marathon.' },
  notes_day: '2026-09-29',
  training: { hours: 0.8, target: 6 },
  todo: { open: '50+', oldest_days: 49 }
};

test('questlog page: the morning runs\' texts and numbers from the Quest Engine', () => {
  const q = questLogView(questLog);
  assert.equal(q.spark, 'Hey Roy, a thought.\n\nGrtz, ChatGPT ✌️');
  assert.deepEqual(q.journal, questLog.journal);
  assert.deepEqual(q.main_quest, { title: 'Break the PMO Cycle', url: null });
  assert.deepEqual(q.notes, questLog.notes);
  assert.deepEqual(q.training, { hours: 0.8, target: 6 });
  assert.deepEqual(q.todo, { open: '50+', oldest_days: 49 });
  assert.deepEqual(questLogView(null), { spark: '', journal: null, main_quest: null, notes: {}, training: null, todo: null });
});

test('questlog page: hero, quests and cross-border views', () => {
  const h = heroView({ level: 5, stage_in_level: 2, stage_marks: [25, 50, 75], xp_to_next_stage: 3910.6, current_hp: 283, max_hp: 315, video_public_id: 'Quest-Progress/x', video_version: 7 }, { records: { current_run: 20 } });
  assert.equal(h.stages, 4);
  assert.equal(h.xp_to_next_stage, 3911);
  assert.equal(h.run, 20);
  assert.match(h.image, /video\/upload\/so_1\.0,.*\/v7\/Quest-Progress\/x\.jpg$/);
  assert.equal(heroView(null), null);
  const qs = questsView([
    { id: 'b', questTitle: 'Backyard', questAttention: 'Active', questPhase: 'Build' },
    { id: 'd', questTitle: 'Old one', questAttention: 'Focus', questPhase: 'Finish', completedAt: '2026-09-25' },
    { id: 'h', questTitle: 'Half Marathon', questAttention: 'Focus', questPhase: 'Build', targetDate: '2026-11-20', nextMove: 'Long run' }
  ], '2026-09-29');
  assert.deepEqual(qs.map(q => q.title), ['Half Marathon', 'Backyard', 'Old one']);
  assert.equal(qs[0].days_left, 52);
  assert.equal(qs[0].phase, 1);
  assert.equal(qs[2].done, true);
  assert.equal(qs[0].url, 'https://questboard.quest-engine.workers.dev/');
  assert.deepEqual(crossView({ ytd: { be_share: 61.8 }, minimum: 50, buffer_days: 12.5, be_days_needed: 0, missing: [] }), { be_share: 61.8, minimum: 50, buffer_days: 12.5, be_days_needed: 0, missing: 0, today: null });
  assert.equal(crossView(null), null);
});

test('questlog page: renders full and empty data, escapes text', () => {
  const q = questLogView(questLog);
  const html = todayHtml({ built_at: '2026-09-29T05:00:00Z', today: '2026-09-29', ...q,
    hero: heroView({ level: 5, current_hp: 283, max_hp: 315, xp_to_next_stage: 3911 }, { records: { current_run: 20 } }),
    quests: questsView([{ id: 'h', questTitle: '<Half> & Co', questAttention: 'Focus', questPhase: 'Build' }], '2026-09-29'),
    cross: { be_share: 62, minimum: 50, buffer_days: 13, be_days_needed: 0, missing: 1 }, errors: [] });
  assert.match(html, /Tuesday 29 September/);
  assert.match(html, /🔥 20 days in a row/);
  assert.match(html, /283 \/ 315/);
  assert.match(html, /&lt;Half&gt; &amp; Co/);
  assert.match(html, /<a href="https:\/\/questboard\.quest-engine\.workers\.dev\/" target="_blank" rel="noopener" class="quest focus">[\s\S]*?<\/a>/);
  assert.match(html, /1 work day to fill in/);
  assert.match(html, /Oldest waiting 49 days, since 11 Aug/);
  assert.match(html, /Break the PMO Cycle/);
  // Since the D1 move nothing on the page opens Notion's frozen copy.
  assert.doesNotMatch(html, /notion\.(com|so)/);
  const empty = todayHtml({ built_at: '2026-09-29T05:00:00Z', today: '2026-09-29', spark: '', journal: null, main_quest: null, notes: {}, training: null, todo: null, hero: null, quests: [], cross: null, errors: ['Hero: down'] });
  assert.match(empty, /Some parts could not load: Hero: down/);
  assert.match(empty, /No active quests/);
});

test('questlog page: work location in words', () => {
  assert.deepEqual(workDay({ am: '🇧🇪 Beerse', pm: '🇧🇪 Beerse', commute: 'E-bike', url: 'u' }), { place: 'Belgium (Beerse)', commute: 'E-bike', url: 'u' });
  assert.equal(workDay({ am: '🇧🇪 Beerse', pm: '🇳🇱 Home' }).place, 'Belgium (Beerse) / Netherlands (home)');
  assert.equal(workDay({ weekend: true }).place, 'Weekend');
  assert.equal(workDay({}).place, null);
});

const dash = (over = {}) => ({
  ai_enabled: true,
  summary: { day: '2026-09-29', at: '2026-09-29T05:40:00Z', text: '- Belgium share is safe.\n- Today: plan a run.' },
  overview: { areas: [{ key: 'cross', name: 'Cross border', status: 'ok' }], drifting: [{ area: 'health', area_name: 'Health', level: 'watch', title: 'Training below routine', why: '2 h vs 5 h' }] },
  system: { processes: [{ name: 'Journal', level: 'ok' }, { name: 'Nightly', level: 'ok' }] },
  ...over
});

test('questlog page: one briefing card, summary first, no repeats', () => {
  const b = briefingView(dash({ overview: { areas: [{ key: 'cross', name: 'Cross border', status: 'ok' }, { key: 'health', name: 'Health', status: 'watch' }], drifting: [{ area: 'health', area_name: 'Health', level: 'watch', title: 'Training below routine', why: '2 h vs 5 h' }] } }));
  assert.equal(b.flags[0].title, 'Training below routine');
  assert.equal(briefingView(null), null);
  const base = { built_at: '2026-09-29T05:00:00Z', today: '2026-09-29', spark: '', journal: null, main_quest: null, notes: {}, training: null, todo: null, hero: null, quests: [], errors: [],
    cross: { be_share: 62, minimum: 50, buffer_days: 13, be_days_needed: 0, missing: 0, today: workDay({ am: '🇧🇪 Beerse', pm: '🇧🇪 Beerse', url: 'https://www.notion.so/day' }) } };
  const html = todayHtml({ ...base, briefing: b });
  assert.match(html, /Today’s briefing/);
  assert.doesNotMatch(html, /Needs you|Training below routine|2 h vs 5 h/); // the summary says it
  assert.match(html, /<li>Belgium share is safe\.<\/li>/);
  assert.match(html, /<a class="watch" href="\/admin#health"><i aria-hidden="true"><\/i>Health <span>keep an eye on<\/span>/);
  assert.match(html, /<a class="ok" href="\/admin#cross">/);
  assert.match(todayHtml({ ...base, briefing: { ...b, areas: [{ key: 'system', name: 'System health', status: 'attention' }] } }), /System health <span>for Claude<\/span>/);
  assert.match(html, /AI summary · 07:40/);
  assert.match(html, /action="\/summary\?back=1"/);
  assert.match(html, /Today: Belgium \(Beerse\)/);
  // No summary yet today: the flags explain themselves.
  const quiet = todayHtml({ ...base, briefing: briefingView(dash({ summary: { day: '2026-09-28', text: '- old', stale: true },
    overview: { areas: [], drifting: [{ area: 'system', area_name: 'System health', level: 'attention', title: 'Nightly failed', why: 'twice' }] } })) });
  assert.match(quiet, /Nightly failed/);
  assert.match(quiet, /twice/);
  assert.doesNotMatch(quiet, /<li>old<\/li>/);
  assert.match(quiet, /Summary comes at 05:00/);
  assert.doesNotMatch(quiet, /Hand to Claude|<script/); // removed 30 Sep (Roy: not useful)
  const calm = todayHtml({ ...base, briefing: briefingView(dash({ summary: null, overview: { areas: [], drifting: [] } })) });
  assert.match(calm, /Nothing needs you right now/);
});

test('login keeps the page you asked for, and nothing else', () => {
  assert.match(loginHtml('', '/questlog'), /name="next" value="\/questlog"/);
  assert.match(loginHtml('', 'https://evil.example'), /name="next" value="\/"/);
});

test('login can return to the dashboard at /admin', () => {
  assert.match(loginHtml('', '/admin'), /name="next" value="\/admin"/);
});

