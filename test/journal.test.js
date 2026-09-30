import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTree, readJournal, writeText, writeFocus, saveJournal, loadJournal, journalDay, todoSuggestions, subLines, extrasAnchor, JOURNAL, QUEST_FALLBACK } from '../src/journal.js';
import { journalHtml } from '../src/journalpage.js';
import { Notion } from '../src/notion.js';
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
