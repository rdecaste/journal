// The journal page (GET /journal, Roy 30 Sep 2026): a calm place to write the
// day's journal on the iPad or phone. The Notion journal stays the record: the
// page reads the day's Journal row (made from the template by the Quest
// Engine's 03:00 run) and writes Roy's words back into it, in the boxes the
// Quest Engine already reads:
//   - Headspace, Looking forward to, Reflection of the day, For tomorrow: the
//     answer goes under the question the 03:00 run wrote (the first paragraph
//     after the heading stays the question, so a rerun never overwrites it);
//   - Today's focus: the to-do blocks under Must do, Can do and Something cool
//     (the 03:00 digest carries unticked ones forward to To-Dos);
//   - the quest boxes under ACTIVE QUESTS: a note under the quest's name. The
//     page shows one box per active quest (as the Quest Engine's 03:00 setup
//     builds them); a quest made active later in the day gets its box in the
//     journal the first time something is written for it, and a finished
//     quest's box only stays while it has a note;
//   - what the template has no box for (Today is a win if…, Did it happen?,
//     Park it, the main quest check-in and its note) goes in one ✍️ callout,
//     made after the Evening boxes the first time one of them is written;
//   - the main quest: Success ticks the journal's Success box (what the streak
//     counts), Relapse leaves it unticked.
// A to-do picked from To-Dos gets linked to the day's journal, so the digest
// does not copy it again, and is set Done when it is ticked.

import { Notion } from './notion.js';
import { cached, remember } from './cache.js';

export const JOURNAL = {
  journal: '9e98784e-e304-4cee-9a50-e492580b1d86',
  todos: '0c9c63e3-cd72-4cf8-bc53-251d1f010bdc',
  quests: '9cbb0e5a-10cf-4013-9eea-961aba9b4ac1',
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

// ---- Reading a page ----

const runs = b => (b && b[b.type] && b[b.type].rich_text) || [];
export const plain = b => runs(b).map(r => r.plain_text ?? r.text?.content ?? '').join('');
const iconOf = b => (b && b[b.type] && b[b.type].icon && b[b.type].icon.emoji) || '';
const norm = s => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/\.\.\.$/, '…').replace(/\s+/g, ' ').trim();
const isHeading = b => /^heading_[123]$/.test(b.type);
const OPEN = new Set(['column_list', 'column', 'callout', 'toggle']);

// The page as a tree: children by parent id, read a level at a time.
export async function readTree(n, pageId, maxDepth = 5) {
  const kids = { [pageId]: await n.children(pageId) };
  let level = kids[pageId];
  for (let depth = 0; depth < maxDepth && level.length; depth++) {
    const open = level.filter(b => b.has_children && OPEN.has(b.type));
    const lists = await Promise.all(open.map(b => n.children(b.id)));
    open.forEach((b, i) => { kids[b.id] = lists[i]; });
    level = lists.flat();
  }
  return { root: pageId, kids };
}

const kidsOf = (tree, id) => tree.kids[id] || [];
function* everyBlock(tree) {
  for (const [parent, list] of Object.entries(tree.kids)) for (const block of list) yield { block, parent };
}
const findHeading = (tree, text) => {
  for (const x of everyBlock(tree)) if (x.block.type === 'heading_3' && norm(plain(x.block)) === norm(text)) return x;
  return null;
};
// The blocks after a heading, up to the next heading, with the same parent.
const underHeading = (tree, { block, parent }) => {
  const list = kidsOf(tree, parent);
  const out = [];
  for (const b of list.slice(list.findIndex(x => x.id === block.id) + 1)) {
    if (isHeading(b)) break;
    out.push(b);
  }
  return out;
};
const paragraphs = list => list.filter(b => b.type === 'paragraph');
const joined = list => list.map(plain).join('\n').replace(/\s+$/, '');
const latestEdit = list => list.filter(b => plain(b).trim()).map(b => b.last_edited_time || '').sort().pop() || null;

// A template box: its heading, the question (the first paragraph under it),
// then the answer paragraphs.
export function readSection(tree, heading) {
  const h = findHeading(tree, heading);
  if (!h) return null;
  const ps = paragraphs(underHeading(tree, h));
  const [question, ...answer] = ps;
  return {
    q: question ? plain(question).trim() : '',
    text: joined(answer),
    slot: { parent: h.parent, after: question ? question.id : h.block.id, ids: answer.map(b => b.id) }
  };
}

// Today's focus: the Must do / Can do / Something cool labels and the to-dos under each.
export function readFocus(tree) {
  const h = findHeading(tree, 'Today’s focus');
  if (!h) return null;
  const groups = {};
  let key = null;
  for (const b of underHeading(tree, h)) {
    const text = norm(plain(b));
    const label = Object.keys(GROUPS).find(k => norm(GROUPS[k]) === text);
    if (b.type === 'paragraph' && label) { key = label; groups[key] = { slot: { parent: h.parent, label: b.id, ids: [] }, items: [] }; continue; }
    if (b.type === 'to_do' && key) {
      groups[key].slot.ids.push(b.id);
      const t = plain(b).trim();
      if (t) groups[key].items.push({ t, c: b.to_do.checked === true });
    }
  }
  return groups;
}

// The ✍️ callout the page adds for what the template has no box for.
export function readExtras(tree) {
  const box = kidsOf(tree, tree.root).find(b => b.type === 'callout' && iconOf(b) === JOURNAL.extrasIcon);
  if (!box) return null;
  const out = { box: box.id, fields: {} };
  const list = kidsOf(tree, box.id);
  for (const [key, title] of Object.entries(EXTRAS)) {
    const block = list.find(b => b.type === 'heading_3' && norm(plain(b)) === norm(title));
    if (!block) continue;
    const ps = paragraphs(underHeading(tree, { block, parent: box.id }));
    out.fields[key] = { text: joined(ps), slot: { parent: box.id, after: block.id, ids: ps.map(b => b.id) } };
  }
  return out;
}

// Top-level blocks after a heading_2/3 matching `re`, up to the next heading or divider.
const topAfter = (tree, re) => {
  const top = kidsOf(tree, tree.root);
  const i = top.findIndex(b => isHeading(b) && re.test(plain(b)));
  if (i < 0) return [];
  const out = [];
  for (const b of top.slice(i + 1)) {
    if (isHeading(b) || b.type === 'divider' || b.type === 'child_database') break;
    out.push(b);
  }
  return out;
};
const calloutsIn = (tree, blocks) => blocks.flatMap(b => b.type === 'callout' ? [b]
  : b.type === 'column_list' ? kidsOf(tree, b.id).flatMap(col => kidsOf(tree, col.id).filter(x => x.type === 'callout')) : []);

// The quest boxes: one callout per quest, its name in the callout, notes under it.
export function readQuests(tree) {
  return calloutsIn(tree, topAfter(tree, /active quests/i)).map(b => {
    const ps = paragraphs(kidsOf(tree, b.id));
    return { id: b.id, title: plain(b).trim(), icon: iconOf(b), text: joined(ps), at: latestEdit(ps), slot: { parent: b.id, after: null, ids: ps.map(p => p.id) } };
  });
}

// Where a new quest box goes: after the last one (in the shorter column when
// they sit in columns), else right under the ACTIVE QUESTS heading.
export function questAnchor(tree) {
  const top = kidsOf(tree, tree.root);
  const i = top.findIndex(b => isHeading(b) && /active quests/i.test(plain(b)));
  if (i < 0) return { parent: tree.root, after: null };
  let at = { parent: tree.root, after: top[i].id };
  for (const b of topAfter(tree, /active quests/i)) {
    if (b.type === 'callout') at = { parent: tree.root, after: b.id };
    if (b.type !== 'column_list') continue;
    const cols = kidsOf(tree, b.id).map(c => ({ id: c.id, boxes: kidsOf(tree, c.id).filter(x => x.type === 'callout') }));
    if (!cols.length) continue;
    const col = cols.reduce((m, c) => (c.boxes.length <= m.boxes.length ? c : m));
    const last = col.boxes[col.boxes.length - 1];
    at = last ? { parent: col.id, after: last.id } : { parent: col.id, after: null };
  }
  return at;
}

// The main quest's name: the first line of the callout under "MAIN QUEST".
export function readMainQuest(tree) {
  const box = topAfter(tree, /main quest/i).find(b => b.type === 'callout');
  return box ? plain(box).split('\n')[0].trim() : '';
}

// Where the ✍️ callout goes: after the Evening boxes, else at the end.
export function extrasAnchor(top) {
  const i = top.findIndex(b => isHeading(b) && /evening/i.test(plain(b)));
  if (i < 0) return null;
  let last = null;
  for (const b of top.slice(i + 1)) {
    if (isHeading(b) || b.type === 'divider') break;
    last = b.id;
  }
  return last;
}

export function readJournal(tree) {
  const sections = {};
  for (const [key, heading] of Object.entries(SECTIONS)) sections[key] = readSection(tree, heading);
  const extras = readExtras(tree);
  const fields = (extras && extras.fields) || {};
  const mq = (fields.mq && fields.mq.text) || '';
  return {
    sections,
    focus: readFocus(tree),
    extras: Object.fromEntries(Object.keys(EXTRAS).map(k => [k, fields[k] || null])),
    extras_box: extras ? extras.box : null,
    quests: readQuests(tree),
    main_quest: readMainQuest(tree),
    checkin: mq.includes('Success') ? 'win' : mq.includes('Relapse') ? 'lose' : null
  };
}

// ---- Loading the page's data ----

const pageTitle = p => ((p && p.properties && p.properties.Entry && p.properties.Entry.title) || []).map(r => r.plain_text || '').join('');
const prop = (p, name) => p && p.properties && p.properties[name];
const relIds = (p, name) => ((prop(p, name) && prop(p, name).relation) || []).map(r => r.id);
const textProp = v => ((v && (v.title || v.rich_text)) || []).map(r => r.plain_text ?? r.text?.content ?? '').join('');

export const QUEST_FALLBACK = 'What moved on this today, or what got in the way?';

async function engine(env, path, headers = {}) {
  const request = new Request(`${env.QUEST_ENGINE_URL}${path}`, { headers: { Accept: 'application/json', ...headers } });
  const r = await (env.QUEST_ENGINE ? env.QUEST_ENGINE.fetch(request) : fetch(request));
  if (!r.ok) throw new Error(`Quest Engine ${path} answered ${r.status}`);
  return r.json();
}

// The quests that get a box, as the Quest Engine's 03:00 setup picks them:
// Active Quest ticked, not the Main Quest, no Completed At; oldest first.
const questName = p => textProp(prop(p, 'Quest')).trim();
export function activeQuests(rows) {
  return rows
    .filter(r => prop(r, 'Active Quest')?.checkbox === true && prop(r, 'Main Quest')?.checkbox !== true && !prop(r, 'Completed At')?.date?.start)
    .map(r => ({ id: r.id, title: questName(r), icon: r.icon && r.icon.type === 'emoji' ? r.icon.emoji : '', created: r.created_time || '' }))
    .filter(q => q.title)
    .sort((a, b) => (a.created < b.created ? -1 : a.created > b.created ? 1 : 0));
}

// The journal's boxes against the active quests: a box stays when its quest
// is active or it has a note; an active quest without a box gets an empty one
// (id "new:<quest id>"), made in the journal on its first save.
export function mergeQuests(boxes, active) {
  if (!active) return boxes;
  const has = new Set(active.map(q => norm(q.title)));
  const kept = boxes.filter(b => has.has(norm(b.title)) || b.text.trim());
  const added = active.filter(q => !boxes.some(b => norm(b.title) === norm(q.title)))
    .map(q => ({ id: `new:${q.id}`, title: q.title, icon: q.icon || JOURNAL.questIcon, text: '', at: null, slot: null }));
  return [...kept, ...added];
}

const journalFor = (n, day) => n.query(JOURNAL.journal, { filter: { property: 'Date', date: { equals: day } }, page_size: 1 }).then(r => (r.results || [])[0] || null);

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

// The day before's hand-off (For tomorrow, Park it). That day is closed once
// the new one starts at 03:00, so it is read once and kept for 12 hours.
async function handoff(env, n, pageId) {
  if (!pageId) return null;
  const key = `journal-handoff:${pageId}`;
  const hit = await cached(env, key, 12 * 3600);
  if (hit) return hit;
  const d = readJournal(await readTree(n, pageId));
  const out = { tomorrow: (d.sections.tomorrow && d.sections.tomorrow.text) || '', park: (d.extras.park && d.extras.park.text) || '' };
  await remember(env, key, out);
  return out;
}

// The day's journal row and the one before, found once per day: with their
// ids known, the pages are read at the same time as the rows are looked up.
const idsKey = day => `journal-ids:${day}`;

export async function loadJournal(env, { now = Date.now() } = {}) {
  const n = new Notion(env.NOTION_TOKEN);
  const errors = [];
  const safe = (p, label) => p.catch(e => { errors.push(`${label}: ${e.message || e}`); return null; });
  const day = journalDay(now);
  const known = (await cached(env, idsKey(day), 2 * 86400)) || {};
  const pageP = journalFor(n, day);
  const beforeP = safe(journalFor(n, dayBefore(day)), 'Yesterday');
  // Started now when the ids are known; otherwise as soon as the row is found.
  // Failures are kept for later, so nothing is left unhandled.
  const later = p => { const kept = p.then(v => ({ v }), e => ({ e })); return () => kept.then(r => { if (r.e) throw r.e; return r.v; }); };
  const treeFor = id => later(readTree(n, id));
  const linkedFor = id => later(n.query(JOURNAL.todos, { filter: { property: 'Related Journal', relation: { contains: id } }, page_size: 50 }).then(r => r.results || []));
  const early = known.page ? { id: known.page, tree: treeFor(known.page), linked: linkedFor(known.page) } : null;
  const lastP = safe(known.before ? handoff(env, n, known.before) : beforeP.then(b => handoff(env, n, b && b.id)), 'Yesterday’s journal');

  const [page, before, open, hero, asked, quests] = await Promise.all([
    pageP,
    beforeP,
    safe(n.query(JOURNAL.todos, {
      filter: { property: 'Status', status: { does_not_equal: 'Done' } },
      sorts: [{ property: 'Priority', direction: 'ascending' }, { timestamp: 'created_time', direction: 'descending' }],
      page_size: 40
    }).then(r => r.results || []), 'To-Dos'),
    safe(engine(env, '/hero'), 'Hero'),
    // Written by the Quest Engine's 03:00 AI call; until then each quest gets
    // the plain fallback question, without an error on the page.
    engine(env, '/journal/questions', { 'X-Admin-Token': env.QUEST_ENGINE_TOKEN || '' }).catch(e => { console.warn('Quest questions:', e.message || e); return null; }),
    // Which quests are active now; without it the journal's own boxes show.
    n.query(JOURNAL.quests, { filter: { property: 'Active Quest', checkbox: { equals: true } }, page_size: 100 })
      .then(r => activeQuests(r.results || [])).catch(e => { console.warn('Quests:', e.message || e); return null; })
  ]);
  const data = { day, hour: amsterdamHour(now), page: null, errors };
  // The streak as the Hero card last counted it; today counts once Success is ticked.
  data.run = hero && hero.records && typeof hero.records.current_run === 'number' ? hero.records.current_run : null;
  data.run_includes_today = !!(hero && Array.isArray(hero.days) && hero.days.some(x => x && x.date === day && x.movement));
  if (!page) { await lastP; return data; }
  if (!known.page || !sameId(known.page, page.id) || (before && !sameId(known.before, before.id))) {
    await remember(env, idsKey(day), { page: page.id, before: before ? before.id : null });
  }
  const reads = early && sameId(early.id, page.id) ? early : { tree: treeFor(page.id), linked: linkedFor(page.id) };

  const sleepId = relIds(page, 'Sleep')[0];
  const [tree, last, linked, sleep, workouts] = await Promise.all([
    reads.tree(),
    lastP,
    safe(reads.linked(), 'To-Dos'),
    sleepId ? safe(n.call('GET', `/pages/${sleepId}`), 'Sleep') : null,
    Promise.all(relIds(page, 'Workouts').slice(0, 3).map(id => safe(n.call('GET', `/pages/${id}`), 'Workout')))
  ]);
  const j = readJournal(tree);
  j.quests = mergeQuests(j.quests, quests);

  // Focus items that are To-Dos rows carry the row's id, so a tick sets it Done.
  const rows = [...(linked || []), ...(open || [])];
  const todoFor = t => { const r = rows.find(x => norm(textProp(prop(x, 'Task'))) === norm(t)); return r ? r.id : null; };
  if (j.focus) for (const g of Object.values(j.focus)) for (const it of g.items) it.todo = todoFor(it.t);
  const taken = j.focus ? Object.values(j.focus).flatMap(g => g.items.map(it => it.t)) : [];

  // Today's question per quest, matched by name; yesterday's are not reused.
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
    title: pageTitle(page),
    url: page.url || null,
    success: !!(prop(page, 'Success') && prop(page, 'Success').checkbox),
    last,
    suggestions: todoSuggestions(open || [], { yesterday: before && before.id, taken }),
    sub: subLines({ sleepHours: hours, workouts: names }),
    ...j
  };
}

// ---- Writing ----

// Notion caps one text run at 2000 characters.
export const textRuns = text => {
  const s = String(text ?? '');
  const out = [];
  for (let i = 0; i < s.length && out.length < 100; i += 2000) out.push({ type: 'text', text: { content: s.slice(i, i + 2000) } });
  return out;
};
const para = text => ({ type: 'paragraph', paragraph: { rich_text: textRuns(text) } });
const heading = text => ({ type: 'heading_3', heading_3: { rich_text: textRuns(text) } });
const append = (n, parent, children, after) => n.call('PATCH', `/blocks/${parent}/children`, { children, ...(after ? { after } : {}) });

// A box's answer becomes one paragraph (a longer answer keeps its line breaks);
// paragraphs after the first are folded into it.
export async function writeText(n, slot, text) {
  const ids = slot.ids || [];
  if (ids.length) {
    await n.call('PATCH', `/blocks/${ids[0]}`, { paragraph: { rich_text: textRuns(text) } });
    for (const id of ids.slice(1)) await n.call('DELETE', `/blocks/${id}`);
    return { ...slot, ids: [ids[0]] };
  }
  if (!String(text || '').trim()) return slot;
  const r = await append(n, slot.parent, [para(text)], slot.after);
  return { ...slot, ids: [(r.results || [])[0].id] };
}

// A focus group's to-dos in order; an empty group keeps one empty to-do, as
// the template has.
export async function writeFocus(n, slot, items) {
  const want = items.map(it => ({ t: String(it.t || '').trim(), c: !!it.c })).filter(it => it.t);
  if (!want.length) want.push({ t: '', c: false });
  const ids = (slot.ids || []).slice();
  const todo = it => ({ to_do: { rich_text: textRuns(it.t), checked: it.c } });
  const kept = [];
  for (let i = 0; i < Math.min(ids.length, want.length); i++) { await n.call('PATCH', `/blocks/${ids[i]}`, todo(want[i])); kept.push(ids[i]); }
  for (const id of ids.slice(want.length)) await n.call('DELETE', `/blocks/${id}`);
  const more = want.slice(ids.length);
  if (more.length) {
    const r = await append(n, slot.parent, more.map(it => ({ type: 'to_do', ...todo(it) })), kept[kept.length - 1] || slot.label);
    kept.push(...(r.results || []).map(b => b.id));
  }
  return { ...slot, ids: kept };
}

// The ✍️ callout: found at the top of the page, or made after the Evening boxes.
export async function ensureExtras(n, pageId) {
  const top = await n.children(pageId);
  let box = top.find(b => b.type === 'callout' && iconOf(b) === JOURNAL.extrasIcon);
  if (!box) {
    const children = Object.values(EXTRAS).flatMap(t => [heading(t), para('')]);
    const r = await append(n, pageId, [{ type: 'callout', callout: {
      rich_text: [{ type: 'text', text: { content: JOURNAL.extrasTitle }, annotations: { bold: true } }],
      icon: { type: 'emoji', emoji: JOURNAL.extrasIcon }, color: 'gray_bg', children
    } }], extrasAnchor(top));
    box = (r.results || [])[0];
  }
  const tree = { root: pageId, kids: { [pageId]: [box], [box.id]: await n.children(box.id) } };
  return readExtras(tree).fields;
}

async function linkTodo(n, id, pageId) {
  const row = await n.call('GET', `/pages/${id}`);
  const ids = relIds(row, 'Related Journal');
  if (ids.includes(pageId)) return;
  await n.call('PATCH', `/pages/${id}`, { properties: { 'Related Journal': { relation: [...ids, pageId].map(x => ({ id: x })) } } });
}
const setTodoDone = (n, id, done) => n.call('PATCH', `/pages/${id}`, { properties: { Status: { status: { name: done ? 'Done' : 'Not started' } } } });

// A box for a quest made active after the 03:00 setup: found by name if it is
// there by now, else made after the other quest boxes, like the setup makes them.
const NEW_QUEST = /^new:(.+)$/;
async function questBox(n, pageId, questId) {
  const quest = await n.call('GET', `/pages/${questId}`);
  if (!sameId(quest.parent && quest.parent.data_source_id, JOURNAL.quests)) throw Object.assign(new Error('Not a quest'), { code: 'bad_request' });
  const title = questName(quest);
  const tree = await readTree(n, pageId);
  const there = readQuests(tree).find(q => norm(q.title) === norm(title));
  if (there) return there.slot;
  const at = questAnchor(tree);
  const icon = quest.icon && quest.icon.type === 'emoji' ? quest.icon.emoji : JOURNAL.questIcon;
  const r = await append(n, at.parent, [{ type: 'callout', callout: {
    rich_text: [{ type: 'text', text: { content: title }, annotations: { bold: true } }],
    icon: { type: 'emoji', emoji: icon }, color: 'blue_bg'
  } }], at.after);
  return { parent: (r.results || [])[0].id, after: null, ids: [] };
}

const validSlot = s => s && isId(s.parent) && (s.after == null || isId(s.after)) && (s.label == null || isId(s.label)) && Array.isArray(s.ids) && s.ids.every(isId);
const limit = s => String(s ?? '').slice(0, 20000);

// POST /journal/save. Only what changed is sent; each piece carries the block
// ids the page was drawn from, so a save is one or two Notion calls. When a
// block has gone (edited in Notion meanwhile), the page is read again once.
export async function saveJournal(env, body) {
  const n = new Notion(env.NOTION_TOKEN);
  const pageId = body && body.page;
  if (!isId(pageId)) throw Object.assign(new Error('No journal page'), { code: 'bad_request' });
  const out = { sections: {}, extras: {}, quests: {}, focus: {} };
  let fresh = null;
  const reread = async () => (fresh = fresh || readJournal(await readTree(n, pageId)));
  const retry = async (write, slot, find) => {
    try { if (!validSlot(slot)) throw new Error('stale'); return await write(slot); }
    catch (e) {
      if (/Notion 401|Notion 403/.test(String(e.message))) throw e;
      const again = find(await reread());
      if (!again) throw e;
      return write(again);
    }
  };

  for (const [key, v] of Object.entries(body.sections || {})) {
    if (!SECTIONS[key]) continue;
    out.sections[key] = await retry(s => writeText(n, s, limit(v.text)), v.slot, j => j.sections[key] && j.sections[key].slot);
  }

  const extras = Object.entries(body.extras || {}).filter(([k]) => EXTRAS[k]);
  if (extras.length) {
    let fields = null;
    for (const [key, v] of extras) {
      let text = limit(v.text);
      if (key === 'did' && text && !DID.includes(text)) continue;
      if (key === 'mq') text = CHECKIN[text] || '';
      let slot = v.slot;
      if (!slot) {
        fields = fields || await ensureExtras(n, pageId);
        slot = fields[key] && fields[key].slot;
      }
      if (!slot) continue;
      out.extras[key] = await retry(s => writeText(n, s, text), slot, j => j.extras[key] && j.extras[key].slot);
    }
    // A new ✍️ callout: the page gets every box's place in it.
    if (fields) for (const [key, f] of Object.entries(fields)) if (!out.extras[key]) out.extras[key] = f.slot;
  }

  for (const [id, v] of Object.entries(body.quests || {})) {
    const later = NEW_QUEST.exec(id);
    if (!isId(id) && !(later && isId(later[1]))) continue;
    const text = limit(v.text);
    if (later && !validSlot(v.slot)) {
      if (!text.trim()) continue;
      out.quests[id] = await writeText(n, await questBox(n, pageId, later[1]), text);
      fresh = null;
      continue;
    }
    const box = later ? v.slot.parent : id;
    out.quests[id] = await retry(s => writeText(n, s, text), v.slot, j => (j.quests.find(q => q.id === box) || {}).slot);
  }

  for (const [key, v] of Object.entries(body.focus || {})) {
    if (!GROUPS[key] || !Array.isArray(v.items)) continue;
    const items = v.items.slice(0, 30).map(it => ({ t: limit(it.t).slice(0, 500), c: !!it.c }));
    out.focus[key] = await retry(s => writeFocus(n, s, items), v.slot, j => j.focus && j.focus[key] && j.focus[key].slot);
  }

  for (const op of Array.isArray(body.todos) ? body.todos.slice(0, 20) : []) {
    if (!isId(op.id)) continue;
    if (op.link) await linkTodo(n, op.id, pageId);
    if (typeof op.done === 'boolean') await setTodoDone(n, op.id, op.done);
  }

  if (typeof body.success === 'boolean') await n.call('PATCH', `/pages/${pageId}`, { properties: { Success: { checkbox: body.success } } });

  return { ok: 1, slots: out, at: new Date().toISOString() };
}

export { DID, CHECKIN };
