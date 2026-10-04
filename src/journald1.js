// The journal page's data and saves (the Quest Engine's docs/d1-migration.md,
// step 2). A day is a `journal` row: its answers are columns, its focus
// to-dos rows of `journal_focus`, its quest notes rows of
// `journal_quest_notes`. The page still gets each box with a `slot` (from
// when it wrote Notion blocks); it only marks D1, since a save writes columns
// and rows.
import { cached, remember } from './cache.js';
import { eveningQuestion } from './eveningq.js';
import { readFold } from './fold.js';
import {
  SECTIONS, EXTRAS, GROUPS, DID, CHECKIN, JOURNAL, QUEST_FALLBACK,
  journalDay, dayBefore, amsterdamHour, activeQuests, mergeQuests, todoSuggestions, subLines, isWin, syncWin, linkTodo, setTodoDone, writeWork, workFor
} from './journal.js';
import { healthStore, journalStore } from './healthstore.js';

const SLOT = { d1: true };
// The page's keys for the ✍️ boxes → the journal's columns.
export const EXTRA_COLUMNS = { winif: 'win_if', did: 'did_it_happen', park: 'park_it', mq: 'main_quest_checkin', mqnote: 'main_quest_note' };
// The mood row: 1 Sucky to 5 On fire, morning and evening (migration 0009).
export const MOOD_COLUMNS = { m: 'mood_morning', e: 'mood_evening' };

const ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const isId = s => typeof s === 'string' && ID.test(s);
const norm = s => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const prop = (p, name) => p && p.properties && p.properties[name];
const textProp = v => ((v && (v.title || v.rich_text)) || []).map(r => r.plain_text ?? r.text?.content ?? '').join('');
const all = async (db, sql, ...p) => (await db.prepare(sql).bind(...p).all()).results || [];
const dayRow = (js, day) => js.query('journal', { filter: { property: 'Date', date: { equals: day } }, page_size: 1 }).then(r => r[0] || null);
// An answer as the copy reads one from a page: no trailing blank lines, empty is null.
const answer = s => String(s ?? '').slice(0, 20000).replace(/\s+$/, '') || null;

async function engine(env, path, headers = {}) {
  const request = new Request(`${env.QUEST_ENGINE_URL}${path}`, { headers: { Accept: 'application/json', ...headers } });
  const r = await (env.QUEST_ENGINE ? env.QUEST_ENGINE.fetch(request) : fetch(request));
  if (!r.ok) throw new Error(`Quest Engine ${path} answered ${r.status}`);
  return r.json();
}

// A day's row, focus and notes as the page draws them.
export async function readDay(db, row) {
  const [focus, notes] = await Promise.all([
    all(db, 'SELECT * FROM journal_focus WHERE journal_id = ? ORDER BY position', row.id),
    all(db, 'SELECT * FROM journal_quest_notes WHERE journal_id = ? ORDER BY position', row.id)
  ]);
  const sections = Object.fromEntries(Object.keys(SECTIONS).map(k => [k, { q: row[k + '_q'] || '', text: row[k] || '', slot: SLOT }]));
  const groups = Object.fromEntries(Object.keys(GROUPS).map(g => [g, { slot: SLOT, items: focus.filter(f => f.grp === g).map(f => ({ t: f.text || '', c: f.done === 1 })).filter(it => it.t) }]));
  const extras = Object.fromEntries(Object.keys(EXTRAS).map(k => [k, { text: row[EXTRA_COLUMNS[k]] || '', slot: SLOT }]));
  const mq = row.main_quest_checkin || '';
  return {
    sections, focus: groups, extras, extras_box: 'd1',
    quests: notes.map(n => ({ id: n.id, title: n.title || '', icon: n.icon || JOURNAL.questIcon, text: n.note || '', at: n.edited_at || null, slot: SLOT })),
    mood: { m: row.mood_morning || 0, e: row.mood_evening || 0 },
    main_quest: row.main_quest_name || '',
    checkin: mq.includes('Success') ? 'win' : mq.includes('Relapse') ? 'lose' : null
  };
}

// The day before's hand-off (For tomorrow, Park it), kept for 12 hours as
// with Notion: that day is closed once the new one starts at 03:00.
async function handoff(env, row) {
  if (!row) return null;
  const key = `journal-handoff:${row.id}`;
  const hit = await cached(env, key, 12 * 3600);
  if (hit) return hit;
  const out = { tomorrow: row.tomorrow || '', park: row.park_it || '' };
  await remember(env, key, out);
  return out;
}

export async function loadJournalD1(env, { now = Date.now() } = {}) {
  const js = journalStore(env);
  const health = healthStore(env);
  const db = env.DB;
  const errors = [];
  const safe = (p, label) => p.catch(e => { errors.push(`${label}: ${e.message || e}`); return null; });
  const day = journalDay(now);
  const [page, before, open, hero, asked, quests, work, evening, fold] = await Promise.all([
    dayRow(js, day),
    safe(dayRow(js, dayBefore(day)), 'Yesterday'),
    safe(js.query('todos', {
      filter: { property: 'Status', status: { does_not_equal: 'Done' } },
      sorts: [{ property: 'Priority', direction: 'ascending' }, { timestamp: 'created_time', direction: 'descending' }],
      page_size: 40
    }), 'To-Dos'),
    safe(engine(env, '/hero'), 'Hero'),
    engine(env, '/journal/questions', { 'X-Admin-Token': env.QUEST_ENGINE_TOKEN || '' }).catch(e => { console.warn('Quest questions:', e.message || e); return null; }),
    js.query('quests', { filter: { property: 'Active Quest', checkbox: { equals: true } }, page_size: 100 })
      .then(activeQuests).catch(e => { console.warn('Quests:', e.message || e); return null; }),
    safe(workFor(health, day), 'Work Location Log'),
    eveningQuestion(env, day).catch(e => { console.warn('Evening question:', e.message || e); return null; }),
    readFold(env, day).catch(e => { console.warn('Folded halves:', e.message || e); return null; })
  ]);
  const data = { day, hour: amsterdamHour(now), page: null, errors, work, fold };
  data.run = hero && hero.records && typeof hero.records.current_run === 'number' ? hero.records.current_run : null;
  data.run_includes_today = !!(hero && Array.isArray(hero.days) && hero.days.some(x => x && x.date === day && x.movement));
  if (!page) return data;

  const linkedTo = { filter: { property: 'Journal', relation: { contains: page.id } } };
  const [row, beforeRow, linked, sleep, workouts] = await Promise.all([
    db.prepare('SELECT * FROM journal WHERE id = ?').bind(page.id).first(),
    before ? db.prepare('SELECT id, tomorrow, park_it FROM journal WHERE id = ?').bind(before.id).first() : null,
    safe(js.query('todos', { filter: { property: 'Related Journal', relation: { contains: page.id } }, page_size: 50 }), 'To-Dos'),
    safe(health.query('sleep_recovery', { ...linkedTo, page_size: 1 }).then(r => r[0] || null), 'Sleep'),
    safe(health.query('workouts', { ...linkedTo, sorts: [{ property: 'start_date_local', direction: 'ascending' }], page_size: 3 }), 'Workouts')
  ]);
  const last = await safe(handoff(env, beforeRow), 'Yesterday’s journal');
  const j = await readDay(db, row);
  j.quests = mergeQuests(j.quests, quests);

  const rows = [...(linked || []), ...(open || [])];
  const todoFor = t => { const r = rows.find(x => norm(textProp(prop(x, 'Task'))) === norm(t)); return r ? r.id : null; };
  for (const g of Object.values(j.focus)) for (const it of g.items) it.todo = todoFor(it.t);
  const taken = Object.values(j.focus).flatMap(g => g.items.map(it => it.t));

  const questions = asked && asked.day === day && asked.questions ? asked.questions : {};
  for (const q of j.quests) {
    const hit = Object.entries(questions).find(([name]) => norm(name) === norm(q.title));
    q.question = (hit && String(hit[1]).trim()) || QUEST_FALLBACK;
  }

  const hours = sleep && prop(sleep, 'Total Sleep') && typeof prop(sleep, 'Total Sleep').number === 'number' ? prop(sleep, 'Total Sleep').number : null;
  const names = (workouts || []).map(w => textProp(prop(w, 'name') || prop(w, 'Name')).trim());
  return {
    ...data,
    page: page.id,
    title: textProp(prop(page, 'Entry')),
    url: null,
    success: !!(prop(page, 'Success') && prop(page, 'Success').checkbox),
    last,
    suggestions: todoSuggestions(open || [], { yesterday: before && before.id, taken }),
    sub: subLines({ sleepHours: hours, workouts: names }),
    evening_q: evening ? evening.text : null,
    win: (() => { const w = (linked || []).find(isWin); return w ? { id: w.id, status: (prop(w, 'Status') && prop(w, 'Status').status && prop(w, 'Status').status.name) || '' } : null; })(),
    ...j
  };
}

// A quest note: the row the page drew it from, or, for `new:<quest id>` (a
// quest without a note yet), the day's note for that quest, made if missing.
async function questNote(db, js, pageId, key) {
  const later = /^new:(.+)$/.exec(key);
  if (!later) {
    const note = await db.prepare('SELECT id FROM journal_quest_notes WHERE id = ? AND journal_id = ?').bind(key, pageId).first();
    if (!note) throw Object.assign(new Error('No such quest note'), { code: 'bad_request' });
    return note.id;
  }
  const quest = await js.get('quests', later[1]);
  if (!quest) throw Object.assign(new Error('Not a quest'), { code: 'bad_request' });
  const title = textProp(prop(quest, 'Quest')).trim();
  const notes = await all(db, 'SELECT id, title, quest_id, position FROM journal_quest_notes WHERE journal_id = ?', pageId);
  const there = notes.find(x => x.quest_id === quest.id || norm(x.title) === norm(title));
  if (there) return there.id;
  const id = crypto.randomUUID();
  const icon = quest.icon && quest.icon.type === 'emoji' ? quest.icon.emoji : JOURNAL.questIcon;
  await db.prepare('INSERT INTO journal_quest_notes (id, journal_id, position, title, icon, quest_id) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, pageId, notes.reduce((m, x) => Math.max(m, x.position), 0) + 1, title, icon, quest.id).run();
  return id;
}

// POST /journal/save with the journal in D1: what changed, written to the
// day's row and its focus and note rows. Every write stamps the row's
// updated_at (through the store), so a catch-up copy from Notion never
// overwrites it.
export async function saveJournalD1(env, body) {
  const js = journalStore(env);
  const db = env.DB;
  const pageId = body && body.page;
  if (!isId(pageId)) throw Object.assign(new Error('No journal page'), { code: 'bad_request' });
  const row = await js.get('journal', pageId);
  if (!row) throw Object.assign(new Error('No journal page'), { code: 'bad_request' });
  const out = { sections: {}, extras: {}, quests: {}, focus: {}, mood: {} };
  const failed = [];
  const attempt = async (key, write) => {
    try { return await write(); }
    catch (e) {
      console.error('journal save', key, e && e.stack || e);
      failed.push({ key, code: e.code || 'server_error', message: String(e.message || e).slice(0, 300) });
    }
  };
  const at = new Date().toISOString();

  // The answers: one write for every box that changed.
  const columns = {};
  for (const [key, v] of Object.entries(body.sections || {})) {
    if (!SECTIONS[key]) continue;
    columns[key] = answer(v.text); out.sections[key] = SLOT;
    // The question Roy answered, when the page sends it (the questions turn over on the page).
    if (typeof v.q === 'string' && v.q.trim() && answer(v.text)) columns[key + '_q'] = v.q.trim().slice(0, 300);
  }
  for (const [key, v] of Object.entries(body.extras || {})) {
    if (!EXTRAS[key]) continue;
    let text = String(v.text ?? '');
    if (key === 'did' && text && !DID.includes(text)) continue;
    if (key === 'mq') text = CHECKIN[text] || '';
    columns[EXTRA_COLUMNS[key]] = answer(text);
    out.extras[key] = SLOT;
  }
  const properties = typeof body.success === 'boolean' ? { Success: { checkbox: body.success } } : {};
  if (Object.keys(columns).length || Object.keys(properties).length) {
    const r = await attempt('answers', () => js.update('journal', row.id, properties, columns));
    if (!r) { out.sections = {}; out.extras = {}; }
  }

  // The mood, each half on its own: a whole 1 to 5, or empty (0 or null) when unpicked.
  for (const [w, v] of Object.entries(body.mood && typeof body.mood === 'object' ? body.mood : {})) {
    if (!MOOD_COLUMNS[w] || !(v === null || (Number.isInteger(v) && v >= 0 && v <= 5))) continue;
    const r = await attempt('mood_' + w, () => js.update('journal', row.id, {}, { [MOOD_COLUMNS[w]]: v || null }));
    if (r) out.mood[w] = SLOT;
  }

  for (const [key, v] of Object.entries(body.quests || {})) {
    const later = /^new:(.+)$/.exec(key);
    if (!isId(key) && !(later && isId(later[1]))) continue;
    const text = answer(v.text);
    if (later && !text) continue;
    const r = await attempt('q:' + key, async () => {
      const id = await questNote(db, js, row.id, key);
      await db.batch([
        db.prepare('UPDATE journal_quest_notes SET note = ?, edited_at = ? WHERE id = ?').bind(text, at, id),
        db.prepare('UPDATE journal SET updated_at = ? WHERE id = ?').bind(at, row.id)
      ]);
      return { ...SLOT, note: id };
    });
    if (r) out.quests[key] = r;
  }

  for (const [grp, v] of Object.entries(body.focus || {})) {
    if (!GROUPS[grp] || !Array.isArray(v.items)) continue;
    const items = v.items.slice(0, 30).map(it => ({ t: String(it.t ?? '').slice(0, 500).trim(), c: !!it.c })).filter(it => it.t);
    const r = await attempt('f:' + grp, async () => {
      // The group's to-dos in the page's order, all or nothing.
      await db.batch([
        db.prepare('DELETE FROM journal_focus WHERE journal_id = ? AND grp = ?').bind(row.id, grp),
        ...items.map((it, i) => db.prepare('INSERT INTO journal_focus (id, journal_id, grp, position, text, done) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(crypto.randomUUID(), row.id, grp, i + 1, it.t, it.c ? 1 : 0)),
        db.prepare('UPDATE journal SET updated_at = ? WHERE id = ?').bind(at, row.id)
      ]);
      return SLOT;
    });
    if (r) out.focus[grp] = r;
  }

  for (const op of Array.isArray(body.todos) ? body.todos.slice(0, 20) : []) {
    if (!isId(op.id)) continue;
    await attempt('todo:' + op.id, async () => {
      if (op.link) await linkTodo(js, op.id, row.id);
      if (typeof op.done === 'boolean') await setTodoDone(js, op.id, op.done);
    });
  }

  if (body.work) out.work = await attempt('work', () => writeWork(healthStore(env), body.work));
  if (body.win) out.win = await attempt('winif', () => syncWin(js, row.id, { text: String(body.win.text ?? '').slice(0, 20000), did: DID.includes(body.win.did) ? body.win.did : '', day: body.win.day }));

  return { ok: 1, slots: out, failed, at };
}

