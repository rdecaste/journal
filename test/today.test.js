import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readQuestLog, heroView, questsView, crossView, briefingView, workDay } from '../src/today.js';
import { todayHtml } from '../src/todaypage.js';
import { loginHtml } from '../src/page.js';

const run = (text, extra = {}) => ({ type: 'text', plain_text: text, text: { content: text }, ...extra });
const block = (id, type, texts = [], extra = {}) => ({ id, type, [type]: { rich_text: texts, ...extra } });
const callout = (id, emoji, texts) => block(id, 'callout', texts, { icon: { type: 'emoji', emoji } });
const at = (b, parent) => ({ block: b, parent });

// The Quest log as the walk returns it (29 Sep 2026 layout).
const flat = [
  at(block('cols', 'column_list'), 'page'),
  at(block('c1', 'column'), 'cols'),
  at(callout('spark', '✨', [run('Morning Spark\n'), run('Hey Roy, a thought.\n\nGrtz, ChatGPT ✌️')]), 'c1'),
  at(callout('jbox', '📓', [run('Today’s journal')]), 'c1'),
  at(block('jlink', 'paragraph', [{ type: 'mention', plain_text: '29 September 2026', href: 'https://www.notion.so/abc' }]), 'jbox'),
  at(block('c2', 'column'), 'cols'),
  at(callout('main', '⚔️', [run('Main quest', { href: 'https://www.notion.so/mq' }), run('\nBreak the PMO Cycle · '), run('Visual', { href: 'https://x' })]), 'c2'),
  at(block('hcols', 'column_list'), 'main'),
  at(block('hc2', 'column'), 'hcols'),
  at(block('stats', 'paragraph', [run('Level 5')]), 'hc2'),
  at(block('mnote', 'paragraph', [run('💬 Keep it calm.')]), 'hc2'),
  at(block('h1', 'heading_2', [run('☀️ Today at a glance')]), 'page'),
  at(callout('cross', '🌍', [run('Cross-border\n62% Belgium · 13 NL days spare')]), 'g1'),
  at(block('cnote', 'paragraph', [run('💬 Plenty of room.')]), 'cross'),
  at(callout('train', '🏋️', [run('Training this week'), run('\n0.8 of 6 h')]), 'g2'),
  at(block('tnote', 'paragraph', [run('💬 Mind the blister.')]), 'train'),
  at(callout('todo', '✅', [run('To-dos'), run('\n50+ open · oldest waiting 49 days')]), 'g3'),
  at(block('h2', 'heading_2', [run('🎯 Active quests')]), 'page'),
  at(block('anote', 'paragraph', [run('💬 Focus on the half marathon.')]), 'page'),
  at(block('db', 'child_database'), 'page')
];

test('questlog page: reads the Quest log texts, boxes and notes', () => {
  const q = readQuestLog(flat);
  assert.equal(q.spark, 'Hey Roy, a thought.\n\nGrtz, ChatGPT ✌️');
  assert.deepEqual(q.journal, { title: '29 September 2026', url: 'https://www.notion.so/abc' });
  assert.deepEqual(q.main_quest, { title: 'Break the PMO Cycle', url: 'https://www.notion.so/mq' });
  assert.deepEqual(q.notes, { main_quest: 'Keep it calm.', cross_border: 'Plenty of room.', training: 'Mind the blister.', todo: '', attention: 'Focus on the half marathon.' });
  assert.deepEqual(q.training, { hours: 0.8, target: 6 });
  assert.deepEqual(q.todo, { open: '50+', oldest_days: 49 });
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
  assert.deepEqual(crossView({ ytd: { be_share: 61.8 }, minimum: 50, buffer_days: 12.5, be_days_needed: 0, missing: [] }), { be_share: 61.8, minimum: 50, buffer_days: 12.5, be_days_needed: 0, missing: 0, today: null });
  assert.equal(crossView(null), null);
});

test('questlog page: renders full and empty data, escapes text', () => {
  const q = readQuestLog(flat);
  const html = todayHtml({ built_at: '2026-09-29T05:00:00Z', today: '2026-09-29', ...q,
    hero: heroView({ level: 5, current_hp: 283, max_hp: 315, xp_to_next_stage: 3911 }, { records: { current_run: 20 } }),
    quests: questsView([{ id: 'h', questTitle: '<Half> & Co', questAttention: 'Focus', questPhase: 'Build' }], '2026-09-29'),
    cross: { be_share: 62, minimum: 50, buffer_days: 13, be_days_needed: 0, missing: 1 }, errors: [] });
  assert.match(html, /Tuesday 29 September/);
  assert.match(html, /🔥 20 days in a row/);
  assert.match(html, /283 \/ 315/);
  assert.match(html, /&lt;Half&gt; &amp; Co/);
  assert.match(html, /1 work day to fill in/);
  assert.match(html, /Oldest waiting 49 days, since 11 Aug/);
  assert.match(html, /Break the PMO Cycle/);
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

test('questlog page: briefing carries the old Overview (flags, summary, systems)', () => {
  const b = briefingView(dash());
  assert.equal(b.flags[0].title, 'Training below routine');
  assert.deepEqual(b.systems, { checked: 2, problems: [] });
  assert.equal(briefingView(null), null);
  const base = { built_at: '2026-09-29T05:00:00Z', today: '2026-09-29', spark: '', journal: null, main_quest: null, notes: {}, training: null, todo: null, hero: null, quests: [], errors: [],
    cross: { be_share: 62, minimum: 50, buffer_days: 13, be_days_needed: 0, missing: 0, today: workDay({ am: '🇧🇪 Beerse', pm: '🇧🇪 Beerse', url: 'https://www.notion.so/day' }) } };
  const html = todayHtml({ ...base, briefing: b });
  assert.match(html, /Needs you/);
  assert.match(html, /Training below routine/);
  assert.match(html, /href="\/admin#health"/);
  assert.doesNotMatch(html, /2 h vs 5 h/); // the summary explains it
  assert.match(html, /<li>Belgium share is safe\.<\/li>/);
  assert.match(html, /written 07:40/);
  assert.match(html, /action="\/summary\?back=1"/);
  assert.match(html, /Automations: all 2 running/);
  assert.match(html, /Today: Belgium \(Beerse\)/);
  // No summary yet today: the flags explain themselves; a system flag replaces the systems line.
  const quiet = todayHtml({ ...base, briefing: briefingView(dash({ summary: { day: '2026-09-28', text: '- old', stale: true },
    overview: { areas: [], drifting: [{ area: 'system', area_name: 'System health', level: 'attention', title: 'Nightly failed', why: 'twice' }] },
    system: { processes: [{ name: 'Nightly', level: 'attention' }] } })) });
  assert.match(quiet, /twice/);
  assert.doesNotMatch(quiet, /<li>old<\/li>/);
  assert.match(quiet, /written at 05:00/);
  assert.doesNotMatch(quiet, /Automations:/);
  assert.doesNotMatch(quiet, /Hand to Claude|<script/); // removed 30 Sep (Roy: not useful)
  const calm = todayHtml({ ...base, briefing: briefingView(dash({ overview: { areas: [], drifting: [] } })) });
  assert.match(calm, /Nothing needs you right now/);
});

test('login keeps the page you asked for, and nothing else', () => {
  assert.match(loginHtml('', '/questlog'), /name="next" value="\/questlog"/);
  assert.match(loginHtml('', 'https://evil.example'), /name="next" value="\/"/);
});

test('login can return to the dashboard at /admin', () => {
  assert.match(loginHtml('', '/admin'), /name="next" value="\/admin"/);
});
