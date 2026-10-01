// The journal page (GET /journal, Roy 30 Sep 2026): a calm place to write the
// day's journal on the iPad or phone. The day is a row of the Quest Engine's
// D1 table `journal` (made by its 03:30 setup with the morning's questions),
// read and saved by src/journald1.js:
//   - Headspace, Looking forward to, Reflection of the day, For tomorrow: the
//     03:00 run's question and Roy's answer, columns of the row;
//   - Today's focus: rows of `journal_focus` under Must do, Can do and
//     Something cool (the 03:00 digest carries unticked ones forward to
//     To-Dos);
//   - one note per active quest (`journal_quest_notes`); a quest made active
//     later in the day gets its note the first time something is written for
//     it, and a finished quest's note only stays while it has text;
//   - Today is a win if…, Did it happen?, Park it, the main quest check-in and
//     its note: columns too;
//   - the main quest: Success ticks the journal's Success (what the streak
//     counts), Relapse leaves it unticked.
// A to-do picked from To-Dos gets linked to the day's journal, so the digest
// does not copy it again, and is set Done when it is ticked. Until 1 Oct 2026
// the day was a Notion page and these were its template's blocks.
// This file has what the page and src/journald1.js share.

import { DATA_SOURCES, EBIKE, ebikeDay } from './config.js';
import { loadJournalD1, saveJournalD1 } from './journald1.js';

export const JOURNAL = {
  // Before this Amsterdam hour the page still shows the day before, so
  // writing after midnight lands on the evening it belongs to. The digest of
  // that day runs at 03:00.
  dayStartHour: 3,
  extrasIcon: '✍️',
  extrasTitle: 'More from today',
  questIcon: '⚔️'
};

// Template headings → the page's boxes.
export const SECTIONS = { headspace: 'Headspace', forward: 'Looking forward to', reflection: 'Reflection of the day', tomorrow: 'For tomorrow' };
export const EXTRAS = { winif: 'Today is a win if…', did: 'Did it happen?', park: 'Park it', mq: 'Main quest', mqnote: 'Main quest note' };
export const GROUPS = { must: 'Must do', can: 'Can do', cool: 'Something cool' };
const DID = ['It happened', 'Partly', 'Not today'];
// The Work Location Log's options: where Roy worked each half-day, and how he got there.
export const WORK = {
  places: ['🇳🇱 Home', '🇧🇪 Beerse', '🇧🇪 Ghent', '✈️ Travel', '🏖️ Holiday', '🎉 Public holiday'],
  rides: ['🚲 E-bike', '🚗 Car', '✈️ Plane', 'N/A']
};
const CHECKIN = { win: '✅ Success', lose: '⚠️ Relapse' };

const ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const isId = s => typeof s === 'string' && ID.test(s);
const sameId = (a, b) => String(a || '').replace(/-/g, '') === String(b || '').replace(/-/g, '');

// ---- Days ----

const amsterdam = (ms, opts) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', ...opts }).format(new Date(ms));
export const amsterdamHour = ms => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hourCycle: 'h23' }).format(new Date(ms)));
// The journal day: the Amsterdam date, where the day starts at 03:00.
export const journalDay = (now = Date.now()) => amsterdam(now - JOURNAL.dayStartHour * 3600e3);
export const dayBefore = day => new Date(Date.parse(day + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10);

const norm = s => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/\.\.\.$/, '…').replace(/\s+/g, ' ').trim();
const prop = (p, name) => p && p.properties && p.properties[name];
const relIds = (p, name) => ((prop(p, name) && prop(p, name).relation) || []).map(r => r.id);
const textProp = v => ((v && (v.title || v.rich_text)) || []).map(r => r.plain_text ?? r.text?.content ?? '').join('');

export const QUEST_FALLBACK = 'What moved on this today, or what got in the way?';

// The quests that get a note, as the Quest Engine's 03:00 setup picks them:
// Active Quest ticked, not the Main Quest, no Completed At; oldest first.
const questName = p => textProp(prop(p, 'Quest')).trim();
export function activeQuests(rows) {
  return rows
    .filter(r => prop(r, 'Active Quest')?.checkbox === true && prop(r, 'Main Quest')?.checkbox !== true && !prop(r, 'Completed At')?.date?.start)
    .map(r => ({ id: r.id, title: questName(r), icon: r.icon && r.icon.type === 'emoji' ? r.icon.emoji : '', created: r.created_time || '' }))
    .filter(q => q.title)
    .sort((a, b) => (a.created < b.created ? -1 : a.created > b.created ? 1 : 0));
}

// The day's notes against the active quests: a note stays when its quest is
// active or it has text; an active quest without one gets an empty one (id
// "new:<quest id>"), made on its first save.
export function mergeQuests(boxes, active) {
  if (!active) return boxes;
  const has = new Set(active.map(q => norm(q.title)));
  const kept = boxes.filter(b => has.has(norm(b.title)) || b.text.trim());
  const added = active.filter(q => !boxes.some(b => norm(b.title) === norm(q.title)))
    .map(q => ({ id: `new:${q.id}`, title: q.title, icon: q.icon || JOURNAL.questIcon, text: '', at: null, slot: null }));
  return [...kept, ...added];
}

// Today's row in the Work Location Log; a weekday without one gets
// `new:<day>`, and the row is made on the first save (no rows for weekends;
// Roy, 1 Oct 2026).
const selName = (p, name) => (prop(p, name) && prop(p, name).select && prop(p, name).select.name) || '';
const isWeekday = day => { const d = new Date(day + 'T12:00:00Z').getUTCDay(); return d >= 1 && d <= 5; };
export const workFor = (store, day) => store.query('work_location', { filter: { property: 'Date', date: { equals: day } }, page_size: 1 })
  .then(([p]) => (p ? { id: p.id, am: selName(p, 'AM'), pm: selName(p, 'PM'), commute: selName(p, 'Commute') }
    : isWeekday(day) ? { id: `new:${day}`, am: '', pm: '', commute: '' } : null));
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// A Work Location row's title, as the Notion rows had it: "Wed 30 Sep 2026".
export function workDayTitle(day) {
  const d = new Date(day + 'T12:00:00Z');
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS3[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
// Open to-dos to suggest: carried over from the day before first, then by priority.
export function todoSuggestions(rows, { yesterday = null, taken = [], max = 4 } = {}) {
  const seen = new Set(taken.map(norm));
  const list = rows.map(r => {
    const labels = ((prop(r, 'Labels') && prop(r, 'Labels').multi_select) || []).map(o => o.name);
    const group = labels.includes('Must do') ? 'must' : labels.includes('Something Cool') ? 'cool' : 'can';
    return { id: r.id, t: textProp(prop(r, 'Task')).trim(), group, carried: !!yesterday && relIds(r, 'Related Journal').includes(yesterday),
      tag: prop(r, 'Tag') && prop(r, 'Tag').select ? prop(r, 'Tag').select.name : '' };
  }).filter(x => x.t && x.tag !== 'Waiting For' && !seen.has(norm(x.t)));
  const out = [];
  for (const x of [...list.filter(x => x.carried), ...list.filter(x => !x.carried)]) {
    if (out.length >= max || out.some(o => norm(o.t) === norm(x.t))) continue;
    out.push({ id: x.id, t: x.t, group: x.group });
  }
  return out;
}

// One quiet line under the greeting, from last night's sleep or today's workouts.
export function subLines({ sleepHours = null, workouts = [] } = {}) {
  const morning = sleepHours === null ? 'A fresh page. Start wherever you like.'
    : sleepHours < 6.5 ? 'A short night behind you. Go gently today.'
    : sleepHours >= 7.5 ? 'A good night’s sleep behind you.'
    : 'A fresh page. Start wherever you like.';
  const w = workouts.filter(Boolean)[0];
  const evening = w ? `${w} done today. Time to close the day.` : 'Time to close the day.';
  return { morning, evening };
}

// A text in runs of at most 2000 characters (as Notion took them; the
// stores read and write Notion's shape).
export const textRuns = text => {
  const s = String(text ?? '');
  const out = [];
  for (let i = 0; i < s.length && out.length < 100; i += 2000) out.push({ type: 'text', text: { content: s.slice(i, i + 2000) } });
  return out;
};
// The to-do writes take the To-Dos store (src/healthstore.js).
export async function linkTodo(store, id, pageId) {
  const row = await store.get('todos', id);
  if (!row) throw Object.assign(new Error('No such To-Do'), { code: 'bad_request' });
  const ids = relIds(row, 'Related Journal');
  if (ids.some(x => sameId(x, pageId))) return;
  await store.update('todos', row.id, { 'Related Journal': { relation: [...ids, pageId].map(x => ({ id: x })) } });
}
// "Today is a win if…" is also a To-Do (Tag "Win if", linked to the day's
// journal, due that day), so the Quest Engine can count it. The boss page
// ticks it off: the page only writes the text, and sets Status only when the
// row is made (Not started) or when a save names an answer outright.
export const WIN = { tag: 'Win if', status: { 'It happened': 'Done', Partly: 'In progress', 'Not today': 'Not started', '': 'Not started' } };
export const isWin = row => !!(prop(row, 'Tag') && prop(row, 'Tag').select && prop(row, 'Tag').select.name === WIN.tag);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export async function syncWin(store, pageId, { text = '', did = '', day = null } = {}) {
  const found = await store.query('todos', { filter: { and: [
    { property: 'Related Journal', relation: { contains: pageId } },
    { property: 'Tag', select: { equals: WIN.tag } }
  ] }, page_size: 5 });
  const row = found[0] || null;
  const t = String(text).trim().slice(0, 2000);
  if (!t) { if (row) await store.remove('todos', row.id); return null; }
  const properties = { Task: { title: textRuns(t) } };
  if (did || !row) properties.Status = { status: { name: WIN.status[did] || 'Not started' } };
  if (row) { await store.update('todos', row.id, properties); return row.id; }
  const when = DAY.test(day || '') ? { Due: { date: { start: day } }, 'Source Date': { date: { start: day } } } : {};
  const made = await store.create('todos', {
    ...properties, ...when, Tag: { select: { name: WIN.tag } }, 'Related Journal': { relation: [{ id: pageId }] }
  });
  return made.id;
}

export const setTodoDone = (store, id, done) => store.update('todos', id, { Status: { status: { name: done ? 'Done' : 'Not started' } } });

// The evening's commute entry: AM, PM and Commute on the day's Work Location
// Log row. An empty value clears the field; a value the page doesn't know is
// left alone. `new:<day>` makes the weekday's row first, and a change of
// Commute sets E-bike € (EBIKE in config.js), which was a Notion formula.
export async function writeWork(store, w) {
  const newDay = /^new:(\d{4}-\d{2}-\d{2})$/.exec(String(w.id || ''));
  if (!isId(w.id) && !(newDay && isWeekday(newDay[1]))) throw Object.assign(new Error('No Work Location Log row'), { code: 'bad_request' });
  const properties = {};
  for (const [key, name, list] of [['am', 'AM', WORK.places], ['pm', 'PM', WORK.places], ['commute', 'Commute', WORK.rides]]) {
    const v = w[key];
    if (v === '') properties[name] = { select: null };
    else if (list.includes(v)) properties[name] = { select: { name: v } };
  }
  if (!Object.keys(properties).length) return 1;
  const row = newDay
    ? await store.create('work_location', { Day: { title: [{ type: 'text', text: { content: workDayTitle(newDay[1]) } }] }, Date: { date: { start: newDay[1] } }, Weekend: { checkbox: false } })
    : await store.get('work_location', w.id);
  if (!row || !sameId(row.parent && row.parent.data_source_id, DATA_SOURCES.workLocation)) throw Object.assign(new Error('Not a Work Location Log row'), { code: 'bad_request' });
  const columns = {};
  if (properties.Commute) {
    const before = newDay ? null : selName(row, 'Commute') || null;
    const after = (properties.Commute.select && properties.Commute.select.name) || null;
    if (newDay || before !== after) columns.ebike_eur = after === EBIKE.commute ? ebikeDay() : 0;
  }
  await store.update('work_location', row.id, properties, columns);
  return 1;
}

// GET /journal's data and POST /journal/save: src/journald1.js.
export const loadJournal = (env, options) => loadJournalD1(env, options);
export const saveJournal = (env, body) => saveJournalD1(env, body);

export { DID, CHECKIN };
