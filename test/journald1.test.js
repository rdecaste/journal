// The journal page with the journal in D1 (JOURNAL_STORE "d1"): the day is
// read from its row, focus and note rows, and every save lands in D1. Notion
// is never called.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1 } from './d1fake.js';
import { loadJournal, saveJournal, QUEST_FALLBACK } from '../src/journal.js';

const J = '3eb24147-f877-814a-94ba-dc6d77c05990';
const Y = '3ea24147-f877-8155-a95f-c53bafd83165';
const Q1 = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const Q2 = 'aaaaaaaa-0000-4000-8000-0000000000a2';
const T1 = 'aaaaaaaa-0000-4000-8000-000000000001';
const N1 = 'aaaaaaaa-0000-4000-8000-0000000000b1';

const insert = (db, table, row) => {
  const cols = Object.keys(row);
  return db.prepare(`INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...cols.map(c => row[c])).run();
};

async function setup() {
  const db = fakeD1();
  await insert(db, 'journal', { id: Y, date: '2026-09-29', entry: '29 September 2026', tomorrow: 'Call the gate company', park_it: 'The shed' });
  await insert(db, 'journal', { id: J, date: '2026-09-30', entry: '30 September 2026', headspace_q: 'What is on your mind?', headspace: 'The quote.', forward_q: 'Who?', reflection_q: 'What did you notice?', tomorrow_q: 'Room for?', main_quest_name: 'Break the PMO Cycle', success: 0 });
  await insert(db, 'journal_focus', { id: 'f1', journal_id: J, grp: 'must', position: 1, text: 'reply sunly', done: 0 });
  await insert(db, 'journal_quest_notes', { id: N1, journal_id: J, position: 1, title: 'Get Back in Shape', icon: '💪', note: 'Gym twice', quest_id: Q1 });
  await insert(db, 'quests', { id: Q1, quest: 'Get Back in Shape', active_quest: 1, main_quest: 0, created_time: '2026-08-01T00:00:00.000Z', icon: JSON.stringify({ type: 'emoji', emoji: '💪' }) });
  await insert(db, 'quests', { id: Q2, quest: 'Develop the Backyard', active_quest: 1, main_quest: 0, created_time: '2026-08-02T00:00:00.000Z', icon: JSON.stringify({ type: 'emoji', emoji: '🌳' }) });
  await insert(db, 'todos', { id: T1, task: 'reply sunly', status: 'Not started', labels: '["Must do"]', related_journal: JSON.stringify([Y]), created_time: '2026-09-29T08:00:00.000Z' });
  const env = {
    JOURNAL_STORE: 'd1', HEALTH_STORE: 'd1', DB: db, NOTION_TOKEN: 'secret',
    QUEST_ENGINE_URL: 'https://engine', QUEST_ENGINE_TOKEN: 'tok',
    QUEST_ENGINE: { fetch: async req => {
      const path = new URL(req.url).pathname;
      if (path === '/hero') return Response.json({ records: { current_run: 21 }, days: [] });
      return Response.json({ ok: 1, day: '2026-09-30', questions: { 'Get Back in Shape': 'What made the gym easy?' } });
    } }
  };
  return { db, env };
}

// Any Notion call fails the test.
async function withoutNotion(fn) {
  const original = globalThis.fetch;
  globalThis.fetch = async url => { throw new Error(`Notion was called: ${url}`); };
  try { return await fn(); } finally { globalThis.fetch = original; }
}

const NOW = Date.parse('2026-09-30T06:00:00Z');

test('D1 journal page: the day, yesterday’s hand-off, focus, quests and to-dos come from D1', async () => {
  const { env } = await setup();
  const d = await withoutNotion(() => loadJournal(env, { now: NOW }));
  assert.deepEqual(d.errors, []);
  assert.equal(d.page, J);
  assert.equal(d.title, '30 September 2026');
  assert.deepEqual(d.last, { tomorrow: 'Call the gate company', park: 'The shed' });
  assert.deepEqual([d.sections.headspace.q, d.sections.headspace.text], ['What is on your mind?', 'The quote.']);
  assert.deepEqual(d.focus.must.items, [{ t: 'reply sunly', c: false, todo: T1 }]);
  assert.deepEqual(d.focus.can.items, []);
  assert.equal(d.main_quest, 'Break the PMO Cycle');
  // The note row, then the active quest without one (made on its first save).
  assert.deepEqual(d.quests.map(q => [q.id, q.title, q.icon, q.text, q.question]), [
    [N1, 'Get Back in Shape', '💪', 'Gym twice', 'What made the gym easy?'],
    [`new:${Q2}`, 'Develop the Backyard', '🌳', '', QUEST_FALLBACK]
  ]);
  assert.deepEqual(d.suggestions, []); // already in the focus
  assert.equal(d.run, 21);
});

test('D1 journal page: a save writes the answers, focus, notes, Success, the win and a ticked to-do', async () => {
  const { db, env } = await setup();
  const r = await withoutNotion(() => saveJournal(env, {
    page: J,
    sections: { reflection: { slot: { d1: true }, text: 'Good swim.\n\n' }, headspace: { slot: { d1: true }, text: '' } },
    extras: { did: { text: 'It happened' }, mq: { text: 'win' }, park: { text: 'The gate' }, winif: { text: 'I swim' } },
    focus: { must: { items: [{ t: 'reply sunly', c: true }, { t: ' ' }, { t: 'Order gravel', c: false }] }, cool: { items: [{ t: 'Swim', c: false }] } },
    quests: { [N1]: { text: 'Gym three times' }, [`new:${Q2}`]: { text: 'Ordered the gravel' } },
    todos: [{ id: T1, link: true, done: true }],
    win: { text: 'I swim', did: 'It happened', day: '2026-09-30' },
    success: true
  }));
  assert.deepEqual(r.failed, []);
  const row = await db.prepare('SELECT * FROM journal WHERE id = ?').bind(J).first();
  assert.deepEqual([row.reflection, row.headspace, row.did_it_happen, row.main_quest_checkin, row.park_it, row.win_if, row.success],
    ['Good swim.', null, 'It happened', '✅ Success', 'The gate', 'I swim', 1]);
  assert.ok(row.updated_at);
  const focus = (await db.prepare('SELECT grp, position, text, done FROM journal_focus WHERE journal_id = ? ORDER BY grp, position').bind(J).all()).results;
  assert.deepEqual(focus.map(f => [f.grp, f.position, f.text, f.done]), [['cool', 1, 'Swim', 0], ['must', 1, 'reply sunly', 1], ['must', 2, 'Order gravel', 0]]);
  const notes = (await db.prepare('SELECT title, note, quest_id, position FROM journal_quest_notes WHERE journal_id = ? ORDER BY position').bind(J).all()).results;
  assert.deepEqual(notes.map(n => [n.title, n.note, n.quest_id, n.position]), [['Get Back in Shape', 'Gym three times', Q1, 1], ['Develop the Backyard', 'Ordered the gravel', Q2, 2]]);
  const todo = await db.prepare('SELECT status, related_journal FROM todos WHERE id = ?').bind(T1).first();
  assert.deepEqual([todo.status, JSON.parse(todo.related_journal)], ['Done', [Y, J]]);
  const win = await db.prepare("SELECT task, status, tag, source_date, related_journal FROM todos WHERE tag = 'Win if'").first();
  assert.deepEqual([win.task, win.status, win.source_date, JSON.parse(win.related_journal)], ['I swim', 'Done', '2026-09-30', [J]]);

  // Saving the new quest's note again updates the same row; clearing the win removes its To-Do.
  await withoutNotion(() => saveJournal(env, { page: J, quests: { [`new:${Q2}`]: { slot: r.slots.quests[`new:${Q2}`], text: 'Gravel here' } }, win: { text: '' } }));
  const again = (await db.prepare('SELECT note FROM journal_quest_notes WHERE journal_id = ? ORDER BY position').bind(J).all()).results;
  assert.deepEqual(again.map(n => n.note), ['Gym three times', 'Gravel here']);
  assert.equal(await db.prepare("SELECT id FROM todos WHERE tag = 'Win if'").first(), null);

  // What was saved reads back on the page.
  const d = await withoutNotion(() => loadJournal(env, { now: NOW }));
  assert.equal(d.sections.reflection.text, 'Good swim.');
  assert.equal(d.checkin, 'win');
  assert.equal(d.success, true);
  assert.deepEqual(d.quests.map(q => q.text), ['Gym three times', 'Gravel here']);
});

test('D1 journal page: bad input is refused', async () => {
  const { env } = await setup();
  await assert.rejects(saveJournal(env, { page: 'nope' }), e => e.code === 'bad_request');
  await assert.rejects(saveJournal(env, { page: 'aaaaaaaa-0000-4000-8000-00000000ffff' }), e => e.code === 'bad_request');
  const r = await withoutNotion(() => saveJournal(env, { page: J, quests: { 'aaaaaaaa-0000-4000-8000-00000000ffff': { text: 'x' } }, extras: { did: { text: 'Maybe' } } }));
  assert.equal(r.failed[0].code, 'bad_request');
  assert.deepEqual(r.slots.extras, {});
});

test('D1 journal page: the mood row saves each half on its own, 1 to 5, and clears', async () => {
  const { db, env } = await setup();
  assert.deepEqual((await withoutNotion(() => loadJournal(env, { now: NOW }))).mood, { m: 0, e: 0 });
  let r = await withoutNotion(() => saveJournal(env, { page: J, mood: { m: 5 } }));
  assert.deepEqual([r.failed, Object.keys(r.slots.mood)], [[], ['m']]);
  r = await withoutNotion(() => saveJournal(env, { page: J, mood: { e: 2, x: 3 } }));
  assert.deepEqual(Object.keys(r.slots.mood), ['e']);
  // Not a whole 1 to 5: left alone.
  await withoutNotion(() => saveJournal(env, { page: J, mood: { m: 7, e: '4' } }));
  let row = await db.prepare('SELECT mood_morning, mood_evening FROM journal WHERE id = ?').bind(J).first();
  assert.deepEqual(row, { mood_morning: 5, mood_evening: 2 });
  assert.deepEqual((await withoutNotion(() => loadJournal(env, { now: NOW }))).mood, { m: 5, e: 2 });
  // Tapping the pick again clears it.
  await withoutNotion(() => saveJournal(env, { page: J, mood: { m: null, e: 0 } }));
  row = await db.prepare('SELECT mood_morning, mood_evening FROM journal WHERE id = ?').bind(J).first();
  assert.deepEqual(row, { mood_morning: null, mood_evening: null });
});
