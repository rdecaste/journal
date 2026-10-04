// The quest pages (src/quests.js, src/questspage.js): read from and written to
// D1 (a real SQLite fake), OpenAI faked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeD1 } from './d1fake.js';
import {
  loadQuests, loadQuest, loadReview, saveQuest, questAction, saveReview, questAi, weekOf, posterUrl, avatarUrl, questColumns, journeyFrom, AI_PER_DAY
} from '../src/quests.js';
import { questsHtml, questHtml, newQuestHtml, reviewHtml, clipUrl, avatarHtml, CLIENT_PRELUDE } from '../src/questspage.js';

const BACKYARD = '46be3c04-eff6-4b3e-9ace-0a625875b258';
const RUN = '3cd24147-f877-8136-87d6-c4a5a824d54e';
const NET = '3ea24147-f877-81b5-b997-e74c5a43ee1c';
const CAVE = '93b3cb08-2625-4efd-bd07-020f3354b0ee';
const MAIN = '3d124147-f877-81f0-ac99-d85d9ec4aede';
const HOUSE = '3cd24147-f877-8134-849f-c7c7f253ecaa';
const HEALTH = '3cd24147-f877-818c-afcf-d18407ac1200';
const SAITAMA = '3ce24147-f877-81e7-8e32-d43cb05f92b2';
const JINX = '3d224147-f877-8148-90ae-ee69dc4dc04f';
const GOKU = '3ce24147-f877-81fc-81ad-d0ceccde9c36';
const J1 = 'aaaaaaaa-0000-4000-8000-0000000000j1'.replace('j1', '01');
// Sunday 4 Oct 2026, 10:00 Amsterdam: journal day 2026-10-04, week 40.
const NOW = Date.parse('2026-10-04T08:00:00Z');

const insert = (db, table, row) => {
  const cols = Object.keys(row);
  return db.prepare(`INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...cols.map(c => row[c])).run();
};
const emoji = e => JSON.stringify({ type: 'emoji', emoji: e });

function storeStub() {
  const kept = new Map();
  return { kept, binding: { idFromName: () => 'main', get: () => ({ get: async k => kept.get(k) ?? null, put: async (k, v) => { kept.set(k, structuredClone(v)); } }) } };
}

async function setup(extraEnv = {}) {
  const db = fakeD1();
  await insert(db, 'journeys', { id: HOUSE, journey: '🏠 House Journey', north_star: 'A finished home.' });
  await insert(db, 'journeys', { id: HEALTH, journey: '🏃 Health Journey', north_star: 'Capable for decades.' });
  await insert(db, 'characters', { id: SAITAMA, character_name: 'Saitama', franchise: 'One Punch Man', enabled: 1, signature_powers_forms: 'Normal Punch; Serious Punch', avatar_url: 'https://res.cloudinary.com/a3xk0plk/image/upload/v1/Character-Avatars/s.jpg' });
  await insert(db, 'characters', { id: JINX, character_name: 'Jinx', franchise: 'Arcane', enabled: 1, signature_powers_forms: 'Pow-Pow minigun' });
  await insert(db, 'characters', { id: GOKU, character_name: 'Goku', franchise: 'Dragon Ball', enabled: 0, signature_powers_forms: 'Kamehameha' });
  await insert(db, 'quests', { id: BACKYARD, quest: 'Develop the <Backyard>', icon: emoji('🌳'), active_quest: 1, main_quest: 0, quest_attention: 'Active', quest_phase: 'Build', year: '2026',
    dashboard_status: 'SLOW PROGRESS', next_move: 'Confirm the driveway start date', pass_fail_question: 'Did the outdoor area get closer to finished this week?',
    journey: JSON.stringify([HOUSE]), character: JSON.stringify([SAITAMA]), created_time: '2026-08-01T00:00:00.000Z',
    cloudinary_video_url: 'https://res.cloudinary.com/a3xk0plk/video/upload/v1789988462/Quest-Board-Animated/46be.mp4' });
  await insert(db, 'quests', { id: RUN, quest: 'Run a Half Marathon', icon: emoji('🏃'), active_quest: 1, main_quest: 0, quest_attention: 'Focus', quest_phase: 'Build', year: '2026',
    target_date: '2026-11-20', next_move: '1 long run + 1 interval run', pass_fail_question: 'Did I complete both runs?', journey: JSON.stringify([HEALTH]), character: JSON.stringify([JINX]), created_time: '2026-08-02T00:00:00.000Z' });
  await insert(db, 'quests', { id: NET, quest: 'Build Home Network', icon: emoji('🌐'), active_quest: 0, main_quest: 0, year: '2026', start_date: '2026-09-29', journey: JSON.stringify([HOUSE]), created_time: '2026-09-29T00:00:00.000Z' });
  await insert(db, 'quests', { id: CAVE, quest: 'Build the Zwift Pain Cave', icon: emoji('🚴'), active_quest: 0, main_quest: 0, year: '2026', completed_at: '2026-09-24', created_time: '2026-08-03T00:00:00.000Z' });
  await insert(db, 'quests', { id: MAIN, quest: 'Main Quest — Break the PMO Cycle', active_quest: 0, main_quest: 1, created_time: '2026-08-21T00:00:00.000Z' });
  await insert(db, 'quest_updates', { id: 'u1', update: 'Run — 27 Sep', date: '2026-09-27', type: 'Progress', source: 'Daily Digest', progress_highlight: '🏃 Ran 13.02 km', quest: JSON.stringify([RUN]) });
  await insert(db, 'quest_updates', { id: 'u2', update: 'Backyard — 1 Oct', date: '2026-10-01', type: 'Reflection', source: 'Daily Digest', progress_highlight: '💭 The quote felt high', quest: JSON.stringify([BACKYARD]) });
  await insert(db, 'journal', { id: J1, date: '2026-10-04', entry: '04 October 2026' });
  await insert(db, 'journal_quest_notes', { id: 'n1', journal_id: J1, position: 1, title: 'Develop the <Backyard>', note: 'Advance for the quote is paid.', quest_id: BACKYARD });
  const store = storeStub();
  const env = { DB: db, HEALTH_STORE: 'd1', JOURNAL_STORE: 'd1', STORE: store.binding, ...extraEnv };
  return { db, env, store };
}

test('weeks: Monday to Sunday with the ISO number', () => {
  assert.deepEqual(weekOf('2026-10-04'), { n: 40, from: '2026-09-28', to: '2026-10-04' });
  assert.deepEqual(weekOf('2026-09-28'), { n: 40, from: '2026-09-28', to: '2026-10-04' });
  assert.deepEqual(weekOf('2027-01-01'), { n: 53, from: '2026-12-28', to: '2027-01-03' });
});

test('Cloudinary: a still from a clip, a square avatar; anything else left alone', () => {
  assert.equal(posterUrl('https://res.cloudinary.com/x/video/upload/v1/Quest/a.mp4', 640), 'https://res.cloudinary.com/x/video/upload/so_2.0,w_640,c_limit,q_auto/v1/Quest/a.jpg');
  assert.equal(posterUrl('https://example.com/a.mp4'), '');
  assert.equal(avatarUrl('https://res.cloudinary.com/x/image/upload/v1/A/s.jpg', 100), 'https://res.cloudinary.com/x/image/upload/c_fill,g_auto,w_100,h_100,q_auto,f_auto/v1/A/s.jpg');
  assert.deepEqual(journeyFrom({ id: 'j', journey: '👨‍👩‍👧‍👦 Family Journey' }), { id: 'j', icon: '👨‍👩‍👧‍👦', name: 'Family', north: '' });
});

test('the list: every quest but the main one, with its last evidence', async () => {
  const { env } = await setup();
  const d = await loadQuests(env, { now: NOW });
  assert.equal(d.today, '2026-10-04');
  assert.deepEqual(d.years, ['2026', '2027', 'Later']);
  assert.deepEqual(d.quests.map(q => q.name).sort(), ['Build Home Network', 'Build the Zwift Pain Cave', 'Develop the <Backyard>', 'Run a Half Marathon']);
  const b = d.quests.find(q => q.id === BACKYARD);
  assert.equal(b.last, '2026-10-04'); // the journal note beats the digest's 1 Oct
  assert.equal(b.icon, '🌳');
  assert.equal(b.journey, HOUSE);
  assert.equal(d.quests.find(q => q.id === RUN).last, '2026-09-27');
  assert.equal(d.characters.length, 3);
  assert.equal(d.journeys.find(j => j.id === HOUSE).name, 'House');
  assert.equal(d.ai, false);

  const html = questsHtml(d, { tab: 'planned' });
  assert.match(html, /Develop the &lt;Backyard&gt;/);
  assert.doesNotMatch(html, /Develop the <Backyard>/);
  assert.doesNotMatch(html, /Break the PMO/);
  assert.match(html, /so_2\.0,w_960,c_limit,q_auto\/v1789988462\/Quest-Board-Animated\/46be\.jpg/);
  assert.match(html, /data-pane="planned" >/); // the planned tab opens
  assert.match(html, /7 days quiet/); // the run: nothing since 27 Sep
  assert.match(html, /47 days to go/);
});

test('a quest page: evidence newest first, notes and digest; the main quest has none', async () => {
  const { env } = await setup();
  const d = await loadQuest(env, BACKYARD.replace(/-/g, ''), { now: NOW });
  assert.deepEqual(d.log.map(l => [l.date, l.kind]), [['2026-10-04', 'note'], ['2026-10-01', 'reflection']]);
  const html = questHtml(d);
  assert.match(html, /Confirm the driveway start date/);
  assert.match(html, /Saitama/);
  assert.match(html, /data-quick="attention" data-value="Active" aria-pressed="true"/);
  // The page data can't close its <script>.
  assert.doesNotMatch(html.split('id="qdata"')[1].split('</script>')[0], /<\//);
  assert.match(questHtml(d, { edit: true }), /id="quest-form"/);
  assert.equal(await loadQuest(env, MAIN, { now: NOW }), null);
});

test('saving: a new quest is made in D1, checked; the main quest is refused', async () => {
  const { env, db } = await setup();
  await assert.rejects(saveQuest(env, { name: '' }, { now: NOW }), /Give the quest a name/);
  await assert.rejects(saveQuest(env, { name: 'Swim', active: true }, { now: NOW }), /need a next move/);
  const r = await saveQuest(env, {
    name: 'Swim 3.8 km relaxed', icon: '🏊', active: true, next: 'Book a technique lesson', attention: 'Focus', phase: 'Start', year: '2027',
    start: '2026-10-05', target: 'soon', journey: HEALTH, character: JINX, outcome: 'Swim an Ironman distance relaxed.', passfail: 'Did I swim twice?', evidence: 'Swims in Workouts.',
    main_quest: 1, cloudinary_video_url: 'https://evil'
  }, { now: NOW });
  assert.equal(r.ok, 1);
  assert.equal(r.created, true);
  const row = await db.prepare('SELECT * FROM quests WHERE id = ?').bind(r.id).first();
  assert.equal(row.quest, 'Swim 3.8 km relaxed');
  assert.equal(row.icon, emoji('🏊'));
  assert.equal(row.active_quest, 1);
  assert.equal(row.main_quest, 0);
  assert.equal(row.year, '2027');
  assert.equal(row.start_date, '2026-10-05');
  assert.equal(row.target_date, null); // not a date
  assert.equal(row.journey, JSON.stringify([HEALTH]));
  assert.equal(row.character, JSON.stringify([JINX]));
  assert.equal(row.cloudinary_video_url, null);
  assert.ok(row.updated_at);

  await saveQuest(env, { id: BACKYARD, name: 'Develop the Backyard', active: true, next: 'Pay the advance', attention: 'Spotlight', journey: 'not-a-journey' }, { now: NOW });
  const b = await db.prepare('SELECT * FROM quests WHERE id = ?').bind(BACKYARD).first();
  assert.equal(b.quest_attention, 'Spotlight');
  assert.equal(b.journey, null);
  assert.equal(b.cloudinary_video_url.includes('46be'), true); // untouched
  await assert.rejects(saveQuest(env, { id: MAIN, name: 'x' }, { now: NOW }), /main quest/);
});

test('quick changes from a quest page', async () => {
  const { env, db } = await setup();
  const row = () => db.prepare('SELECT * FROM quests WHERE id = ?').bind(NET).first();
  assert.deepEqual(await questAction(env, { id: NET, op: 'activate' }, { now: NOW }), { ok: 0, code: 'needs_next', message: 'Add a next move before making this quest active.' });
  await questAction(env, { id: NET, op: 'next', value: 'Buy the Raspberry Pi kit' }, { now: NOW });
  await questAction(env, { id: NET, op: 'activate' }, { now: NOW });
  assert.deepEqual([(await row()).active_quest, (await row()).quest_attention], [1, 'Active']);
  await questAction(env, { id: NET, op: 'phase', value: 'Push' }, { now: NOW });
  await assert.rejects(questAction(env, { id: NET, op: 'phase', value: 'Warp' }, { now: NOW }), /Not a phase/);
  await questAction(env, { id: NET, op: 'character', value: SAITAMA }, { now: NOW });
  assert.equal((await row()).character, JSON.stringify([SAITAMA]));
  assert.equal((await row()).refresh_visual, null); // the visual comes later
  await questAction(env, { id: NET, op: 'complete' }, { now: NOW });
  assert.equal((await row()).completed_at, '2026-10-04');
  await questAction(env, { id: NET, op: 'reopen' }, { now: NOW });
  assert.equal((await row()).completed_at, null);
  assert.deepEqual(await questAction(env, { id: RUN, op: 'next', value: '' }, { now: NOW }), { ok: 0, code: 'needs_next', message: 'Active quests need a next move.' });
  await assert.rejects(questAction(env, { id: MAIN, op: 'plan' }, { now: NOW }), /main quest/);
});

test('the weekly review: one update per quest per week, saved again in place', async () => {
  const { env, db } = await setup();
  const r0 = await loadReview(env, { now: NOW });
  assert.deepEqual(r0.items.map(it => it.quest.name), ['Run a Half Marathon', 'Develop the <Backyard>']); // Focus first
  assert.deepEqual(r0.items[0].log, []); // nothing this week (27 Sep is last week)
  assert.match(reviewHtml(r0), /0 of 2 reviewed/);

  const r = await saveReview(env, { items: [
    { id: BACKYARD, verdict: 'pass', next: 'Confirm the driveway start date', note: 'Advance paid' },
    { id: RUN, verdict: 'fail', next: 'Easy 8 km run on Tuesday', note: '' }
  ] }, { now: NOW });
  assert.deepEqual([r.ok, r.saved, r.pass, r.fail, r.failed.length], [1, 2, 1, 1, 0]);
  const ups = await db.prepare("SELECT * FROM quest_updates WHERE source = 'Manual' ORDER BY \"update\"").all();
  assert.equal(ups.results.length, 2);
  assert.equal(ups.results[0].update, 'Weekly review · Week 40 · Develop the <Backyard>');
  assert.equal(ups.results[0].type, 'Progress');
  assert.equal(ups.results[0].summary, 'Passed. Advance paid');
  assert.equal(ups.results[1].type, 'Setback');
  assert.equal((await db.prepare('SELECT next_move FROM quests WHERE id = ?').bind(RUN).first()).next_move, 'Easy 8 km run on Tuesday');

  await saveReview(env, { items: [{ id: RUN, verdict: 'pass', next: 'Easy 8 km run on Tuesday' }] }, { now: NOW });
  const again = await db.prepare("SELECT type FROM quest_updates WHERE source = 'Manual' AND quest = ?").bind(JSON.stringify([RUN])).all();
  assert.deepEqual(again.results.map(x => x.type), ['Progress']);

  const d = await loadQuests(env, { now: NOW });
  assert.equal(d.quests.find(q => q.id === RUN).review, 'pass');
  const r1 = await loadReview(env, { now: NOW });
  assert.match(reviewHtml(r1, { done: true }), /Week 40 reviewed/);
  const log = (await loadQuest(env, BACKYARD, { now: NOW })).log;
  assert.equal(log.find(l => l.kind === 'review').text.startsWith('🗓️ Week 40 review: passed'), true);
});

test('new quest page: the form, with the years and characters', async () => {
  const { env } = await setup();
  const html = newQuestHtml(await loadQuests(env, { now: NOW }));
  assert.match(html, /Start a new quest/);
  assert.match(html, /<option selected>2026<\/option>/);
  assert.match(html, /AI drafting is off/);
  assert.doesNotMatch(html, />Goku</); // not enabled
});

test('AI: off unless ADMIN_AI; a draft is checked against what exists', async () => {
  const { env } = await setup();
  await assert.rejects(questAi(env, { kind: 'draft', text: 'Learn to swim properly this winter' }, { now: NOW }), /AI is turned off/);

  const on = await setup({ ADMIN_AI: '1', OPENAI_API_KEY: 'k', CHAT_MODEL: 'm' });
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const content = JSON.stringify({
      name: 'Swim 3.8 km relaxed', icon: '🏊', journey: 'Health Journey', year: '2027', start: '', target: '2027-06-01', activeNow: false, attention: 'Focus', phase: 'Start',
      outcome: 'Swim an Ironman distance relaxed.', description: 'I want the swim to feel easy.', passfail: 'Did I swim twice this week?', next: 'Book a lesson', evidence: 'Swims in Workouts.',
      character: 'jinx', characterAlts: ['Saitama', 'Nobody'], why: { name: 'Clear and verb-first', bogus: 5 }, recommendation: 'Plan it.',
      related: [{ name: 'Run a Half Marathon', note: 'Same training hours' }, { name: 'Ghost quest', note: 'x' }], questions: ['Which pool?']
    });
    return Response.json({ choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
  };
  try {
    const r = await questAi(on.env, { kind: 'draft', text: 'Learn to swim properly this winter' }, { now: NOW });
    assert.equal(r.ok, 1);
    assert.equal(r.draft.fields.journey, HEALTH);
    assert.equal(r.draft.fields.character, JINX);
    assert.equal(r.draft.fields.attention, 'Focus');
    assert.equal(r.draft.fields.active, false);
    assert.deepEqual(r.draft.alts, [SAITAMA]);
    assert.deepEqual(r.draft.why, { name: 'Clear and verb-first' });
    assert.deepEqual(r.draft.related.map(x => x.id), [RUN]);
    assert.deepEqual(r.draft.questions, ['Which pool?']);
    assert.equal(calls[0].body.response_format.type, 'json_object');
    const ctx = JSON.parse(calls[0].body.messages[1].content).context;
    assert.ok(ctx.quests.every(q => !/PMO/.test(q.name)));
    assert.ok(ctx.characters.every(c => !c.startsWith('Goku')));
    assert.equal(on.store.kept.get('usage').days['2026-10-04'].chat_calls, 1);

    on.store.kept.set('quest_ai', { day: '2026-10-04', n: AI_PER_DAY });
    await assert.rejects(questAi(on.env, { kind: 'suggest', field: 'next', quest: { name: 'x' } }, { now: NOW }), /AI calls from the quest pages today/);
  } finally { globalThis.fetch = original; }
});

test('questColumns ignores fields it does not know', () => {
  const c = questColumns({ name: 'X', year: '1999', attention: 'Loud', completed_at: '2026-01-01' }, { years: ['2026'] });
  assert.equal(c.year, null);
  assert.equal(c.quest_attention, null);
  assert.equal('completed_at' in c, false);
});

test('Finish review hits the boss with Quest review once; no verdict, no hit', async () => {
  const sent = [];
  let answer = { ok: 1, result: null, damage: 47, text: 'hit' };
  const { env } = await setup({
    QUEST_ENGINE_URL: 'https://qe.example', QUEST_ENGINE_TOKEN: 'tok',
    QUEST_ENGINE: { fetch: async req => { sent.push({ url: req.url, token: req.headers.get('X-Admin-Token'), body: await req.text() }); return Response.json(answer); } }
  });
  const none = await saveReview(env, { items: [{ id: RUN, verdict: '', next: '1 long run + 1 interval run', note: '' }] }, { now: NOW });
  assert.equal(none.attack, undefined);
  assert.equal(sent.length, 0);

  const r = await saveReview(env, { items: [{ id: RUN, verdict: 'pass', next: '1 long run + 1 interval run' }] }, { now: NOW });
  assert.deepEqual(r.attack, { state: 'hit', damage: 47 });
  assert.deepEqual(sent[0], { url: 'https://qe.example/journal/review', token: 'tok', body: 'which=weekly' });

  answer = { ok: 1, code: 'weekly_done' };
  assert.deepEqual((await saveReview(env, { items: [{ id: RUN, verdict: 'fail', next: 'x' }] }, { now: NOW })).attack, { state: 'done' });
  answer = { ok: 0, code: 'no_habit' };
  assert.equal((await saveReview(env, { items: [{ id: RUN, verdict: 'fail', next: 'x' }] }, { now: NOW })).attack.state, 'failed');

  const d = await loadReview(env, { now: NOW });
  assert.match(reviewHtml(d, { done: true, attack: { state: 'hit', damage: 47 } }), /Quest review hit the boss for <b>47<\/b> damage/);
  assert.match(reviewHtml(d, { done: true, attack: { state: 'done' } }), /already counted this week/);
  assert.match(reviewHtml(d), /Finishing also hits the boss with Quest review/);
});

test('an avatar clip plays as a centred square over the still; chips stay stills', () => {
  const c = { name: 'Erza Scarlet', franchise: 'Fairy Tail', avatar: 'https://res.cloudinary.com/x/image/upload/v1/A/e.png', clip: 'https://res.cloudinary.com/x/video/upload/v2/A/e-clip.mp4' };
  assert.equal(clipUrl(c.clip, 100), 'https://res.cloudinary.com/x/video/upload/c_fill,g_center,h_100,w_100/q_auto/v2/A/e-clip.mp4');
  const big = avatarHtml(c, 44);
  assert.match(big, /<video src="https:\/\/res\.cloudinary\.com\/x\/video\/upload\/c_fill,g_center,h_88,w_88\/q_auto\/v2\/A\/e-clip\.mp4" poster="[^"]+c_fill,g_auto,w_88,h_88[^"]+" autoplay muted loop playsinline/);
  assert.doesNotMatch(avatarHtml(c, 20), /<video/);
  assert.doesNotMatch(avatarHtml({ ...c, clip: '' }, 44), /<video/);
});

test('the page script defines __name before the bundled script uses it', async () => {
  const { env } = await setup();
  const html = questsHtml(await loadQuests(env, { now: NOW }));
  const script = html.split('<script>').pop().split('</script>')[0];
  assert.ok(script.startsWith(CLIENT_PRELUDE));
  // What esbuild's keepNames puts inside the function must run in a browser.
  const run = new Function(CLIENT_PRELUDE + 'return (function () { var f = __name(function () {}, "f"); function g() {} __name(g, "g"); return typeof f; })();');
  assert.equal(run(), 'function');
});
