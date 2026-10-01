import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTree, readJournal, writeText, writeFocus, saveJournal, loadJournal, journalDay, todoSuggestions, subLines, extrasAnchor, activeQuests, mergeQuests, JOURNAL, QUEST_FALLBACK, WIN } from '../src/journal.js';
import { journalHtml } from '../src/journalpage.js';
import { Notion } from '../src/notion.js';
import { DATA_SOURCES } from '../src/config.js';
import { FakeNotion, journalFixture, run } from './notionfake.js';

const PAGE = '3eb24147-f877-814a-94ba-dc6d77c05990';
const env = { NOTION_TOKEN: 'secret' };
const setup = opts => { const fake = new FakeNotion(); const ids = journalFixture(fake, PAGE, opts); return { fake, ids }; };
const read = fake => fake.use(async () => readJournal(await readTree(new Notion('secret'), PAGE)));

test('journal page: the day starts at 03:00 Amsterdam time', () => {
  assert.equal(journalDay(Date.parse('2026-09-30T00:30:00Z')), '2026-09-29'); // 02:30 in Amsterdam
  assert.equal(journalDay(Date.parse('2026-09-30T01:30:00Z')), '2026-09-30'); // 03:30
  assert.equal(journalDay(Date.parse('2026-09-30T21:59:00Z')), '2026-09-30'); // 23:59
});

test('journal page: reads the template boxes, focus, quests and main quest', async () => {
  const { fake, ids } = setup({ reflection: 'had a crappy sleep' });
  const j = await read(fake);
  assert.equal(j.sections.headspace.q, 'What’s your take this morning on the quote?');
  assert.equal(j.sections.headspace.text, '');
  assert.deepEqual(j.sections.headspace.slot.ids, [ids.headspaceA]);
  assert.equal(j.sections.reflection.text, 'had a crappy sleep');
  // Looking forward to has only its question: an answer goes right after it.
  assert.deepEqual(j.sections.forward.slot.ids, []);
  assert.equal(j.focus.must.items.length, 0);
  assert.deepEqual(j.focus.must.slot, { parent: ids.focus, label: ids.must, ids: [ids.mustTodo] });
  assert.deepEqual(j.focus.can.items, [{ t: 'Old can do', c: true }]);
  assert.deepEqual(j.quests.map(q => [q.title, q.icon, q.text]), [['Get Back in Shape', '💪', ''], ['Develop the Backyard', '⚔️', 'Quote came in']]);
  assert.equal(j.main_quest, 'Break the Cycle');
  assert.equal(j.extras_box, null);
  assert.equal(j.checkin, null);
  assert.equal(extrasAnchor(fake.children(PAGE)), ids.evening);
});

test('journal page: an answer becomes one paragraph under the question', async () => {
  const { fake, ids } = setup();
  const j = await read(fake);
  await fake.use(async () => {
    const n = new Notion('secret');
    const slot = await writeText(n, j.sections.forward.slot, 'Dinner with the kids');
    assert.equal(slot.ids.length, 1);
    assert.equal(fake.text(slot.ids[0]), 'Dinner with the kids');
    // Right after the question, not at the end of the box.
    const box = fake.blocks[slot.parent];
    assert.equal(fake.children(slot.parent).map(b => b.type).join(','), 'heading_3,paragraph,paragraph');
    assert.ok(box);
    // Two answer paragraphs (typed in Notion) fold into the first.
    const two = { ...j.sections.headspace.slot, ids: [ids.headspaceA, fake.add(fake.blocks[ids.headspaceA].parent.block_id, 'paragraph', 'more')] };
    const after = await writeText(n, two, 'line one\nline two');
    assert.deepEqual(after.ids, [ids.headspaceA]);
    assert.equal(fake.text(ids.headspaceA), 'line one\nline two');
    assert.equal(fake.blocks[two.ids[1]].in_trash, true);
  });
});

test('journal page: long answers are split into 2000-character runs', async () => {
  const { fake, ids } = setup();
  const j = await read(fake);
  await fake.use(() => writeText(new Notion('secret'), j.sections.headspace.slot, 'x'.repeat(4500)));
  const runs = fake.blocks[ids.headspaceA].paragraph.rich_text;
  assert.deepEqual(runs.map(r => r.text.content.length), [2000, 2000, 500]);
});

test('journal page: focus lines become the group’s to-dos, in order', async () => {
  const { fake, ids } = setup();
  const j = await read(fake);
  await fake.use(async () => {
    const n = new Notion('secret');
    const must = await writeFocus(n, j.focus.must.slot, [{ t: 'reply sunly', c: false }, { t: 'intro mail', c: true }, { t: '  ', c: false }]);
    assert.equal(must.ids[0], ids.mustTodo);
    assert.equal(must.ids.length, 2);
    const kids = fake.children(ids.focus).map(b => `${b.type}:${fake.text(b.id)}${b.to_do && b.to_do.checked ? ' ✓' : ''}`);
    assert.deepEqual(kids.slice(0, 5), ['heading_3:Today’s focus', 'paragraph:Must do', 'to_do:reply sunly', 'to_do:intro mail ✓', 'paragraph:Can do']);
    // Emptied: one empty to-do stays, like the template.
    const can = await writeFocus(n, j.focus.can.slot, []);
    assert.deepEqual(can.ids, [ids.canTodo]);
    assert.equal(fake.text(ids.canTodo), '');
    assert.equal(fake.blocks[ids.canTodo].to_do.checked, false);
    // Shrinking removes the extra to-dos.
    const back = await writeFocus(n, must, [{ t: 'only one', c: false }]);
    assert.deepEqual(back.ids, [ids.mustTodo]);
  });
  const again = await read(fake);
  assert.deepEqual(again.focus.must.items, [{ t: 'only one', c: false }]);
});

test('journal page: save writes boxes, makes the ✍️ callout once, ticks Success and the to-do', async () => {
  const { fake, ids } = setup();
  const todo = '11111111-2222-4333-8444-555555555555';
  fake.page(todo, { Task: { type: 'title', title: [run('reply sunly')] }, 'Related Journal': { type: 'relation', relation: [{ id: 'aaaaaaaa-2222-4333-8444-555555555555' }] } });
  const j = await read(fake);
  const res = await fake.use(() => saveJournal(env, {
    page: PAGE,
    sections: { headspace: { slot: j.sections.headspace.slot, text: 'Calm' } },
    extras: { winif: { slot: null, text: 'I send the proposal' }, mq: { slot: null, text: 'win' } },
    quests: { [ids.shape]: { slot: j.quests[0].slot, text: 'Swim felt good' } },
    focus: { must: { slot: j.focus.must.slot, items: [{ t: 'reply sunly', c: true }] } },
    todos: [{ id: todo, link: true }, { id: todo, done: true }],
    success: true
  }));
  assert.equal(res.ok, 1);
  assert.equal(fake.text(ids.headspaceA), 'Calm');
  assert.equal(fake.text(ids.shapeNote), 'Swim felt good');
  assert.equal(fake.pages[PAGE].properties.Success.checkbox, true);
  assert.deepEqual(fake.pages[todo].properties['Related Journal'].relation.map(r => r.id), ['aaaaaaaa-2222-4333-8444-555555555555', PAGE]);
  assert.equal(fake.pages[todo].properties.Status.status.name, 'Done');
  // The ✍️ callout sits right after the Evening boxes, with every box's place returned.
  const top = fake.children(PAGE);
  const box = top[top.findIndex(b => b.id === ids.evening) + 1];
  assert.equal(box.callout.icon.emoji, JOURNAL.extrasIcon);
  assert.deepEqual(Object.keys(res.slots.extras).sort(), ['did', 'mq', 'mqnote', 'park', 'winif']);
  const after = await read(fake);
  assert.equal(after.extras.winif.text, 'I send the proposal');
  assert.equal(after.extras.mq.text, '✅ Success');
  assert.equal(after.checkin, 'win');
  // A second save uses the returned places: no new callout.
  await fake.use(() => saveJournal(env, { page: PAGE, extras: { park: { slot: res.slots.extras.park, text: 'The gate' } } }));
  assert.equal(fake.children(PAGE).filter(b => b.type === 'callout' && b.callout.icon && b.callout.icon.emoji === JOURNAL.extrasIcon).length, 1);
  assert.equal((await read(fake)).extras.park.text, 'The gate');
});

test('journal page: a block removed in Notion meanwhile is found again', async () => {
  const { fake, ids } = setup();
  const j = await read(fake);
  await fake.use(() => new Notion('secret').call('DELETE', `/blocks/${ids.headspaceA}`));
  await fake.use(() => saveJournal(env, { page: PAGE, sections: { headspace: { slot: j.sections.headspace.slot, text: 'Still here' } } }));
  assert.equal((await read(fake)).sections.headspace.text, 'Still here');
});

test('journal page: Notion refusing writes is reported, not retried', async () => {
  const { fake } = setup();
  const j = await read(fake);
  fake.fail = method => method !== 'GET';
  await assert.rejects(fake.use(() => saveJournal(env, { page: PAGE, sections: { headspace: { slot: j.sections.headspace.slot, text: 'x' } } })), /Notion 403/);
  assert.equal(fake.calls.filter(c => c.method === 'GET').length > 0, true);
});

test('journal page: bad input is refused', async () => {
  await assert.rejects(saveJournal(env, { page: 'nope' }), e => e.code === 'bad_request');
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

test('journal page: a quest made active today gets its box on the first save', async () => {
  const { fake, ids } = setup();
  const Q = 'aaaaaaaa-0000-4000-8000-0000000000a3';
  fake.pages[Q] = { object: 'page', ...quest(Q, 'Renovate the Downstairs Toilet', '🚽') };
  // Nothing written: no box yet.
  const none = await fake.use(() => saveJournal(env, { page: PAGE, quests: { [`new:${Q}`]: { slot: null, text: '  ' } } }));
  assert.deepEqual(none.slots.quests, {});
  const r = await fake.use(() => saveJournal(env, { page: PAGE, quests: { [`new:${Q}`]: { slot: null, text: 'Tiles picked' } } }));
  const slot = r.slots.quests[`new:${Q}`];
  // The box sits after the last quest box, in the shorter column (the right one on a tie).
  const col = fake.blocks[ids.yard].parent.block_id;
  assert.deepEqual(fake.kids[col], [ids.yard, slot.parent]);
  const box = fake.blocks[slot.parent];
  assert.equal(box.callout.icon.emoji, '🚽');
  assert.equal(fake.text(slot.parent), 'Renovate the Downstairs Toilet');
  assert.equal(fake.text(slot.ids[0]), 'Tiles picked');
  let j = await read(fake);
  assert.deepEqual(j.quests.map(q => q.title), ['Get Back in Shape', 'Develop the Backyard', 'Renovate the Downstairs Toilet']);
  // Later saves write into it; a lost slot (an old draft) finds the box by name, never a second one.
  await fake.use(() => saveJournal(env, { page: PAGE, quests: { [`new:${Q}`]: { slot, text: 'Tiles ordered' } } }));
  await fake.use(() => saveJournal(env, { page: PAGE, quests: { [`new:${Q}`]: { slot: null, text: 'Tiles here' } } }));
  j = await read(fake);
  assert.equal(j.quests.length, 3);
  assert.equal(j.quests[2].text, 'Tiles here');
  // Only pages from the Quests database.
  fake.pages[PAGE].parent = { type: 'workspace' };
  const bad = await fake.use(() => saveJournal(env, { page: PAGE, quests: { [`new:${PAGE}`]: { slot: null, text: 'x' } } }));
  assert.deepEqual(bad.failed.map(f => [f.key, f.code]), [[`q:new:${PAGE}`, 'bad_request']]);
});

test('journal page: loads today, yesterday’s hand-off, to-dos and the streak', async () => {
  const { fake } = setup();
  const YDAY = '3ea24147-f877-8155-a95f-c53bafd83165';
  // Yesterday wrote something for today.
  const yids = journalFixture(fake, YDAY);
  fake.blocks[yids.tomorrowA].paragraph.rich_text = [run('Call the gate company')];
  fake.pages[PAGE].properties.Date = { date: { start: '2026-09-30' } };
  fake.queries[JOURNAL.journal] = body => [fake.pages[body.filter.date.equals === '2026-09-30' ? PAGE : YDAY]];
  fake.queries[JOURNAL.todos] = body => body.filter.property === 'Status'
    ? [{ id: 'aaaaaaaa-0000-4000-8000-000000000001', properties: { Task: { title: [run('reply sunly')] }, Labels: { multi_select: [{ name: 'Must do' }] }, 'Related Journal': { relation: [{ id: YDAY }] }, Tag: { select: null } } }]
    : [];
  fake.queries[JOURNAL.quests] = () => [quest('aaaaaaaa-0000-4000-8000-0000000000a1', 'Get Back in Shape', '💪'), quest('aaaaaaaa-0000-4000-8000-0000000000a2', 'Develop the Backyard')];
  let asked = { day: '2026-09-30', questions: { 'Get back in shape': 'What made Tuesday’s swim feel easy?' } };
  const engineEnv = { ...env, QUEST_ENGINE_URL: 'https://engine', QUEST_ENGINE_TOKEN: 'tok', QUEST_ENGINE: { fetch: async req => {
    const path = new URL(req.url).pathname;
    if (path === '/hero') return Response.json({ records: { current_run: 21 }, days: [{ date: '2026-09-30', movement: 0 }] });
    assert.equal(path, '/journal/questions');
    if (req.headers.get('X-Admin-Token') !== 'tok') return Response.json({ ok: 0 }, { status: 401 });
    if (!asked) return new Response('Not found', { status: 404 });
    return Response.json({ ok: 1, ...asked });
  } } };
  const d = await fake.use(() => loadJournal(engineEnv, { now: Date.parse('2026-09-30T06:00:00Z') }));
  assert.equal(d.day, '2026-09-30');
  assert.equal(d.page, PAGE);
  assert.equal(d.title, '30 September 2026');
  assert.deepEqual(d.last, { tomorrow: 'Call the gate company', park: '' });
  assert.deepEqual(d.suggestions, [{ id: 'aaaaaaaa-0000-4000-8000-000000000001', t: 'reply sunly', group: 'must' }]);
  assert.equal(d.run, 21);
  assert.equal(d.run_includes_today, false);
  // Today's question from the 03:00 call, matched by name; the rest get the fallback.
  assert.equal(d.quests[0].question, 'What made Tuesday’s swim feel easy?');
  assert.equal(d.quests[1].question, QUEST_FALLBACK);
  assert.deepEqual(d.errors, []);

  // Yesterday's questions, or none yet (the Quest Engine not updated), fall back quietly.
  asked = { day: '2026-09-29', questions: { 'Get Back in Shape': 'Old?' } };
  const old = await fake.use(() => loadJournal(engineEnv, { now: Date.parse('2026-09-30T06:00:00Z') }));
  assert.equal(old.quests[0].question, QUEST_FALLBACK);
  asked = null;
  const none = await fake.use(() => loadJournal(engineEnv, { now: Date.parse('2026-09-30T06:00:00Z') }));
  assert.equal(none.quests[0].question, QUEST_FALLBACK);
  assert.deepEqual(none.errors, []);
});

test('journal page: a second open reads the page with the row lookup, and yesterday comes from the cache', async () => {
  const { fake } = setup();
  const YDAY = '3ea24147-f877-8155-a95f-c53bafd83165';
  journalFixture(fake, YDAY);
  fake.pages[PAGE].properties.Date = { date: { start: '2026-09-30' } };
  fake.queries[JOURNAL.journal] = body => [fake.pages[body.filter.date.equals === '2026-09-30' ? PAGE : YDAY]];
  fake.queries[JOURNAL.todos] = () => [];
  fake.queries[JOURNAL.quests] = () => [];
  const kept = new Map();
  const storeEnv = { ...env, STORE: { idFromName: () => 'main', get: () => ({ get: async k => kept.get(k) ?? null, put: async (k, v) => { kept.set(k, structuredClone(v)); } }) } };
  const now = Date.parse('2026-09-30T06:00:00Z');
  const first = await fake.use(() => loadJournal(storeEnv, { now }));
  assert.deepEqual(kept.get('cache:journal-ids:2026-09-30').data, { page: PAGE, before: YDAY });
  fake.calls.length = 0;
  const second = await fake.use(() => loadJournal(storeEnv, { now }));
  assert.deepEqual(second, first);
  // Yesterday's page is not read again; today's is read once.
  assert.ok(!fake.calls.some(c => c.path.startsWith(`/blocks/${YDAY}`)));
  assert.equal(fake.calls.filter(c => c.path.startsWith(`/blocks/${PAGE}/children`)).length, 1);
});

test('journal page: renders, keeps the data safe inside the page, and the script parses', () => {
  const d = {
    day: '2026-09-30', page: PAGE, title: '30 September 2026', url: 'https://www.notion.so/x', errors: [], run: 21,
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

test('journal page: the evening commute reads and writes today’s Work Location Log row', async () => {
  const { fake } = setup();
  const ROW = '3ec24147-f877-814a-9236-f12640bcf6aa', OTHER = '3ec24147-f877-814a-9236-f12640bcf6bb';
  const sel = name => ({ select: name ? { name } : null });
  fake.page(ROW, { Date: { date: { start: '2026-09-30' } }, AM: sel('🇧🇪 Beerse'), PM: sel('🇧🇪 Beerse'), Commute: sel(null) },
    { parent: { type: 'data_source_id', data_source_id: DATA_SOURCES.workLocation } });
  fake.page(OTHER, { Name: { title: [] } }, { parent: { type: 'data_source_id', data_source_id: JOURNAL.todos } });
  fake.queries[JOURNAL.journal] = () => [fake.pages[PAGE]];
  fake.queries[DATA_SOURCES.workLocation] = body => body.filter.date.equals === '2026-09-30' ? [fake.pages[ROW]] : [];
  const d = await fake.use(() => loadJournal(env, { now: Date.parse('2026-09-30T18:00:00Z') }));
  assert.deepEqual(d.work, { id: ROW, am: '🇧🇪 Beerse', pm: '🇧🇪 Beerse', commute: '' });
  assert.match(journalHtml(d), /🚗 Commute/);

  // A split day by e-bike; a value the page doesn't know leaves that field alone.
  await fake.use(() => saveJournal(env, { page: PAGE, work: { id: ROW, am: '🇳🇱 Home', pm: '🇧🇪 Ghent', commute: '🚲 E-bike' } }));
  assert.deepEqual([fake.pages[ROW].properties.AM, fake.pages[ROW].properties.PM, fake.pages[ROW].properties.Commute], [sel('🇳🇱 Home'), sel('🇧🇪 Ghent'), sel('🚲 E-bike')]);
  await fake.use(() => saveJournal(env, { page: PAGE, work: { id: ROW, am: '', pm: 'Mars', commute: '🚲 E-bike' } }));
  assert.deepEqual([fake.pages[ROW].properties.AM, fake.pages[ROW].properties.PM], [sel(null), sel('🇧🇪 Ghent')]);

  // Only a Work Location Log row can be written this way.
  // A piece that fails is reported, and the rest of the save still goes through.
  const other = await fake.use(() => saveJournal(env, { page: PAGE, work: { id: OTHER, am: '🇳🇱 Home' }, sections: { headspace: { slot: null, text: 'Calm' } } }));
  assert.match(other.failed[0].message, /Not a Work Location Log row/);
  assert.equal(other.failed.length, 1);
  const none2 = await fake.use(() => saveJournal(env, { page: PAGE, work: { id: 'x' } }));
  assert.match(none2.failed[0].message, /No Work Location Log row/);

  // No row for the day: no commute entry.
  fake.queries[DATA_SOURCES.workLocation] = () => [];
  const none = await fake.use(() => loadJournal(env, { now: Date.parse('2026-09-30T18:00:00Z') }));
  assert.equal(none.work, null);
  assert.doesNotMatch(journalHtml(none), /🚗 Commute/);
});

test('journal page: "Today is a win if…" becomes a To-Do the boss page ticks off', async () => {
  const { fake } = setup();
  const winRows = () => Object.values(fake.pages).filter(p => p.properties.Tag && p.properties.Tag.select && p.properties.Tag.select.name === WIN.tag);
  fake.queries[JOURNAL.todos] = body => {
    if (body.filter.and) return winRows().filter(p => !p.in_trash && p.properties['Related Journal'].relation.some(r => r.id === body.filter.and[0].relation.contains));
    return body.filter.property === 'Related Journal' ? winRows().filter(p => !p.in_trash) : [];
  };
  fake.queries[JOURNAL.journal] = () => [fake.pages[PAGE]];
  const save = win => fake.use(() => saveJournal(env, { page: PAGE, win }));

  await save({ text: 'I call the gate company.', day: '2026-09-30' });
  assert.equal(winRows().length, 1);
  const row = winRows()[0];
  assert.equal(row.properties.Task.title.map(r => r.text.content).join(''), 'I call the gate company.');
  assert.deepEqual([row.properties.Status.status.name, row.properties.Due.date.start, row.properties['Related Journal'].relation[0].id, row.parent.data_source_id],
    ['Not started', '2026-09-30', PAGE, JOURNAL.todos]);

  // Ticked off on the boss page, then edited on the journal: one row, still Done.
  row.properties.Status = { status: { name: 'Done' } };
  await save({ text: 'I call the gate company and get a date.', day: '2026-09-30' });
  assert.equal(winRows().length, 1);
  assert.equal(row.properties.Status.status.name, 'Done');
  assert.equal(row.properties.Task.title.map(r => r.text.content).join(''), 'I call the gate company and get a date.');

  // The page reads it back.
  const d = await fake.use(() => loadJournal(env, { now: Date.parse('2026-09-30T18:00:00Z') }));
  assert.deepEqual(d.win, { id: row.id, status: 'Done' });

  // Emptied: the To-Do goes to the trash, nothing new is made.
  await save({ text: '  ', day: '2026-09-30' });
  assert.equal(row.in_trash, true);
  assert.equal(winRows().length, 1);
});
