import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journalDay, todoSuggestions, subLines, activeQuests, mergeQuests, JOURNAL, QUEST_FALLBACK } from '../src/journal.js';
import { journalHtml, PROMPTS } from '../src/journalpage.js';

const PAGE = '3eb24147-f877-814a-94ba-dc6d77c05990';
const run = (text, extra = {}) => ({ type: 'text', plain_text: text, text: { content: text }, ...extra });

// The page reads and saves D1 (test/journald1.test.js); these are the parts it shares.

test('journal page: the day starts at 03:00 Amsterdam time', () => {
  assert.equal(journalDay(Date.parse('2026-09-30T00:30:00Z')), '2026-09-29'); // 02:30 in Amsterdam
  assert.equal(journalDay(Date.parse('2026-09-30T01:30:00Z')), '2026-09-30'); // 03:30
  assert.equal(journalDay(Date.parse('2026-09-30T21:59:00Z')), '2026-09-30'); // 23:59
});

test('journal page: to-do suggestions put yesterday’s leftovers first and skip what is in the focus', () => {
  const row = (id, task, labels, rel = [], tag = null) => ({ id, properties: {
    Task: { type: 'title', title: [run(task)] }, Labels: { multi_select: labels.map(name => ({ name })) },
    'Related Journal': { relation: rel.map(r => ({ id: r })) }, Tag: { select: tag ? { name: tag } : null } } });
  const s = todoSuggestions([
    row('a', 'Vendor portal', ['Must do']),
    row('b', 'reply sunly', ['Must do'], ['yday']),
    row('c', 'Waiting on Ken', ['Can do'], [], 'Waiting For'),
    row('d', 'intro anna', ['Can do']),
    row('e', 'Taken already', ['Can do']),
    row('f', 'Kite', ['Something Cool'])
  ], { yesterday: 'yday', taken: ['taken already'], max: 3 });
  assert.deepEqual(s, [{ id: 'b', t: 'reply sunly', group: 'must' }, { id: 'a', t: 'Vendor portal', group: 'must' }, { id: 'd', t: 'intro anna', group: 'can' }]);
});

test('journal page: one quiet line from sleep or a workout', () => {
  assert.equal(subLines({ sleepHours: 5.2 }).morning, 'A short night behind you. Go gently today.');
  assert.equal(subLines({ sleepHours: 8 }).morning, 'A good night’s sleep behind you.');
  assert.equal(subLines({ workouts: ['Morning Swim'] }).evening, 'Morning Swim done today. Time to close the day.');
  assert.equal(subLines({}).evening, 'Time to close the day.');
});

const quest = (id, title, emoji = '', props = {}, created = '2026-09-01T00:00:00.000Z') => ({ id, created_time: created,
  icon: emoji ? { type: 'emoji', emoji } : null, parent: { type: 'data_source_id', data_source_id: JOURNAL.quests },
  properties: { Quest: { title: [run(title)] }, 'Active Quest': { checkbox: true }, 'Main Quest': { checkbox: false }, 'Completed At': { date: null }, ...props } });

test('journal page: the quest boxes follow which quests are active', () => {
  const rows = [
    quest('q3', 'Renovate the Downstairs Toilet', '🚽', {}, '2026-09-20T00:00:00.000Z'),
    quest('q1', 'Get Back in Shape', '💪', {}, '2026-08-01T00:00:00.000Z'),
    quest('mq', 'Break the Cycle', '🔥', { 'Main Quest': { checkbox: true } }),
    quest('done', 'Zwift Pain Cave', '', { 'Completed At': { date: { start: '2026-09-27' } } })
  ];
  const active = activeQuests(rows);
  assert.deepEqual(active.map(q => q.title), ['Get Back in Shape', 'Renovate the Downstairs Toilet']);
  const boxes = [
    { id: 'b1', title: 'Get back in shape', icon: '💪', text: '' },
    { id: 'b2', title: 'Zwift Pain Cave', icon: '⚔️', text: '' },
    { id: 'b3', title: 'Old quest with a note', icon: '⚔️', text: 'Wrapped it up' }
  ];
  const list = mergeQuests(boxes, active);
  // Active stays, finished and empty goes, finished with a note stays, newly active is added.
  assert.deepEqual(list.map(q => q.id), ['b1', 'b3', 'new:q3']);
  assert.deepEqual(list[2], { id: 'new:q3', title: 'Renovate the Downstairs Toilet', icon: '🚽', text: '', at: null, slot: null });
  // Without the Quests answer, the journal's own boxes show.
  assert.equal(mergeQuests(boxes, null), boxes);
});

test('journal page: renders, keeps the data safe inside the page, and the script parses', () => {
  const d = {
    day: '2026-09-30', page: PAGE, title: '30 September 2026', url: null, errors: [], run: 21,
    sections: { headspace: { q: 'Q?', text: '', slot: {} }, forward: null, reflection: { q: 'R?', text: 'a </script><b>', slot: {} }, tomorrow: null },
    focus: { must: { items: [], slot: {} }, can: { items: [], slot: {} }, cool: { items: [], slot: {} } },
    extras: {}, quests: [{ id: PAGE, title: 'Get Back in Shape', icon: '💪', text: '', question: 'Q', slot: {} }],
    main_quest: 'Break the Cycle', last: null, suggestions: [], sub: { morning: 'm', evening: 'e' }
  };
  const html = journalHtml(d);
  assert.ok(!html.includes('a </script><b>'));
  const json = /<script type="application\/json" id="data">([\s\S]*?)<\/script>/.exec(html)[1];
  assert.equal(JSON.parse(json).sections.reflection.text, 'a </script><b>');
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
  assert.doesNotThrow(() => new Function(script));
  assert.ok(!html.includes('data-entry="forward"'));
  assert.ok(!html.includes('Next move'));
  assert.ok(journalHtml({ day: '2026-09-30', page: null }).includes('isn’t there yet'));
});

test('evening question: written once from the whole morning, again only when the morning changed', async () => {
  const { writeEveningQuestion, eveningQuestion, morningFacts } = await import('../src/eveningq.js');
  assert.equal(morningFacts({ headspace: ' ' }), null);
  const kept = new Map();
  const env = { ADMIN_AI: '1', OPENAI_API_KEY: 'k', CHAT_MODEL: 'm', STORE: { idFromName: () => 'main', get: () => ({ get: async k => kept.get(k) ?? null, put: async (k, v) => { kept.set(k, structuredClone(v)); } }) } };
  const sent = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => { sent.push(JSON.parse(init.body)); return Response.json({ choices: [{ message: { content: '“You set out calm. How did it go?”' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }); };
  try {
    const m = { headspace: 'Calm', forward: 'Dinner', winif: 'I call the gate company' };
    const now = Date.parse('2026-09-30T06:00:00Z');
    const q = await writeEveningQuestion(env, '2026-09-30', m, { now });
    assert.equal(q.text, 'You set out calm. How did it go?');
    const facts = JSON.parse(sent[0].messages[1].content);
    assert.deepEqual(facts, { headspace: 'Calm', looking_forward_to: 'Dinner', today_is_a_win_if: 'I call the gate company' });
    await writeEveningQuestion(env, '2026-09-30', m, { now: now + 3600e3 });
    assert.equal(sent.length, 1);
    await writeEveningQuestion(env, '2026-09-30', { ...m, forward: 'Dinner with Anna' }, { now: now + 3600e3 });
    assert.equal(sent.length, 2);
    assert.equal((await eveningQuestion(env, '2026-09-30')).n, 2);
    assert.equal(await eveningQuestion(env, '2026-10-01'), null);
    assert.equal(kept.get('usage').days['2026-09-30'].chat_calls, 2);
    assert.equal(await writeEveningQuestion({ ...env, ADMIN_AI: '0' }, '2026-09-30', m), null);
  } finally { globalThis.fetch = real; }
});


test('Start my day / End my day register the review in the Quest Engine with the admin token', async () => {
  const { registerReview } = await import('../src/review.js');
  const sent = [];
  const env = { QUEST_ENGINE_URL: 'https://qe.example', QUEST_ENGINE_TOKEN: 'tok',
    QUEST_ENGINE: { fetch: async req => { sent.push({ url: req.url, token: req.headers.get('X-Admin-Token'), body: await req.text() }); return new Response(JSON.stringify({ ok: 1, code: 'daily_done', key: 'morning_review' })); } } };
  assert.deepEqual(await registerReview(env, 'morning'), { ok: 1, code: 'daily_done', damage: undefined, text: '' });
  assert.deepEqual(sent[0], { url: 'https://qe.example/journal/review', token: 'tok', body: 'which=morning' });
  await assert.rejects(registerReview(env, 'noon'), /No such review/);
  await assert.rejects(registerReview({ ...env, QUEST_ENGINE_TOKEN: '' }, 'evening'), /QUEST_ENGINE_TOKEN/);
  // The page calls it from both buttons.
  const html = journalHtml({ day: '2026-10-03', page: PAGE, title: '3 October 2026', url: null, errors: [], run: 1,
    sections: { headspace: null, forward: null, reflection: null, tomorrow: null },
    focus: { must: { items: [], slot: {} }, can: { items: [], slot: {} }, cool: { items: [], slot: {} } },
    extras: {}, quests: [], main_quest: 'Q', last: null, suggestions: [], sub: {} });
  assert.ok(html.includes("review('morning')") && html.includes("review('evening')") && html.includes("fetch('/journal/review'"));
});

test('folded halves: kept per day on the server, the same on every device, until Roy opens them', async () => {
  const { mergeFold, readFold, writeFold } = await import('../src/fold.js');
  assert.deepEqual(mergeFold(null, '2026-10-03', { m: true }), { day: '2026-10-03', m: true, e: false });
  assert.deepEqual(mergeFold({ day: '2026-10-03', m: true, e: false }, '2026-10-03', { e: true, m: 'x' }), { day: '2026-10-03', m: true, e: true });
  // Yesterday's folds are dropped on the new day.
  assert.deepEqual(mergeFold({ day: '2026-10-02', m: true, e: true }, '2026-10-03', {}), { day: '2026-10-03', m: false, e: false });
  const kept = new Map();
  const stub = { get: async k => kept.get(k) ?? null, fold: async (day, patch) => { const n = mergeFold(kept.get('journal_fold'), day, patch); kept.set('journal_fold', n); return n; } };
  const env = { STORE: { idFromName: () => 'main', get: () => stub } };
  assert.equal(await readFold(env, '2026-10-03'), null);
  assert.deepEqual(await writeFold(env, '2026-10-03', { m: true }), { m: true, e: false });
  assert.deepEqual(await readFold(env, '2026-10-03'), { m: true, e: false });
  assert.deepEqual(await writeFold(env, '2026-10-03', { m: false }), { m: false, e: false });
  assert.equal(await readFold(env, '2026-10-04'), null);
  assert.equal(await readFold({}, '2026-10-03'), null);
  // The page takes the server's folds and keeps every fold and open there.
  const html = journalHtml({ day: '2026-10-03', page: PAGE, title: '3 October 2026', url: null, errors: [], run: 1, fold: { m: true, e: false },
    sections: { headspace: null, forward: null, reflection: null, tomorrow: null },
    focus: { must: { items: [], slot: {} }, can: { items: [], slot: {} }, cool: { items: [], slot: {} } },
    extras: {}, quests: [], main_quest: 'Q', last: null, suggestions: [], sub: {} });
  assert.ok(html.includes('"fold":{"m":true,"e":false}') && html.includes('takeFold(D.fold)'));
  for (const k of ['keepFold({ m: true })', 'keepFold({ m: false })', 'keepFold({ e: true })', 'keepFold({ e: false })']) assert.ok(html.includes(k), k);
});

test('guiding questions turn over by themselves while a box is empty, and the shown one is saved with the answer', () => {
  const html = journalHtml({ day: '2026-10-04', page: PAGE, title: '4 October 2026', url: null, errors: [], run: 1,
    sections: { headspace: { q: 'From 03:00?', text: '' }, forward: null, reflection: null, tomorrow: null },
    focus: { must: { items: [], slot: {} }, can: { items: [], slot: {} }, cool: { items: [], slot: {} } },
    extras: {}, quests: [], main_quest: 'Q', last: null, suggestions: [], sub: {} });
  assert.ok(html.includes('var ROTATE = 20000') && html.includes('!inView(q)') && !html.includes('minHeight') && html.includes("b.sections[k].q = $(k + '-q').textContent"));
  for (const p of Object.values(PROMPTS)) for (const q of p.more) assert.ok(q.split(/\s+/).length <= 18 || q.startsWith('Finish the sentence') || q.startsWith('What’s still spinning'), q);
});
