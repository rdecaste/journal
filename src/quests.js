// The quest pages (Roy, 4 Oct 2026): manage the quests in one place instead of
// D1 Data Studio. Pages in src/questspage.js; this file reads and writes D1.
//   /quests          active quests as cards, planned ones by year, completed
//   /quests/<id>     one quest: next move, weekly check, story, evidence log,
//                    attention and phase, the character for its visual
//   /quests/new      describe a quest, OpenAI drafts the fields, Roy reviews
//   /quests/review   the Sunday review: pass/fail per active quest, next moves
// Writes: the `quests` row (through the store, so updated_at is stamped), and
// one `quest_updates` row per quest per week for the review (source Manual,
// "Weekly review · Week N · <quest>"). Never the Main Quest (it has its own
// card). A changed character is used the next time the visual is made, or
// straight away when Roy asks for a redraw in the picker (`redraw`: the Quest
// Engine's POST /questvisual, active quests only; Roy, 4 Oct). Completing a
// quest sets Completed At, which is what the Quest Engine's victory card and
// its 7-day board rule read.
import { journalStore } from './healthstore.js';
import { journalDay } from './journal.js';
import { store, addUsage } from './usage.js';
import { aiOn } from './eveningq.js';
import { registerReview } from './review.js';

export const ATTENTION = ['Background', 'Active', 'Focus', 'Spotlight'];
export const PHASES = ['Start', 'Build', 'Push', 'Finish'];
export const VERDICTS = { pass: 'Progress', fail: 'Setback' };
const MAX_TEXT = 4000;
// OpenAI calls from these pages in one day, at most.
export const AI_PER_DAY = 60;

const all = async (db, sql, ...p) => (await db.prepare(sql).bind(...p).all()).results || [];
const parse = (s, d) => { try { return s ? JSON.parse(s) : d; } catch { return d; } };
const plain = id => String(id || '').replace(/-/g, '').toLowerCase();
const sameId = (a, b) => !!a && plain(a) === plain(b);
const day = v => (v ? String(v).slice(0, 10) : '');
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
export const isId = s => typeof s === 'string' && ID.test(s);
const bad = message => Object.assign(new Error(message), { code: 'bad_request' });
const clip = (v, max = MAX_TEXT) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);

// The year choices: this year, next year, Later, and any other the quests use.
export function yearsFor(today, quests = []) {
  const y = Number(today.slice(0, 4));
  const out = [String(y), String(y + 1)];
  for (const q of quests) if (q.year && q.year !== 'Later' && !out.includes(q.year)) out.push(q.year);
  return [...out.sort(), 'Later'];
}

// ---- Rows → what the pages draw ----

export function questFrom(r) {
  const icon = parse(r.icon, null);
  return {
    id: r.id, name: r.quest || '', icon: icon && icon.type === 'emoji' ? icon.emoji : '',
    active: r.active_quest === 1, main: r.main_quest === 1,
    attention: r.quest_attention || '', phase: r.quest_phase || '', year: r.year || '',
    start: day(r.start_date), target: day(r.target_date), completed: day(r.completed_at),
    status: r.dashboard_status || '', statement: r.dashboard_status_statement || '',
    next: r.next_move || '', passfail: r.pass_fail_question || '',
    outcome: r.desired_outcome || '', description: r.description || '', evidence: r.daily_evidence_guide || '',
    journey: parse(r.journey, [])[0] || '', character: parse(r.character, [])[0] || '',
    video: r.cloudinary_video_url || '', created: r.created_time || ''
  };
}
export const bucket = q => (q.completed ? 'completed' : q.active ? 'active' : 'planned');

export function characterFrom(r) {
  const powers = String(r.signature_powers_forms || '').replace(/\s+/g, ' ').trim();
  return {
    id: r.id, name: r.character_name || '', franchise: r.franchise || '', enabled: r.enabled === 1,
    vibe: powers.length > 90 ? powers.slice(0, 88).replace(/[;,]?\s+\S*$/, '') + '…' : powers,
    avatar: r.avatar_url || '',
    // A short looping clip of the avatar (camera still, the character moves a little).
    clip: r.avatar_clip_url || ''
  };
}

export function journeyFrom(r) {
  const name = String(r.journey || '').trim();
  const m = /^(\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*)\s*(.*)$/u.exec(name);
  return { id: r.id, icon: m ? m[1] : '', name: (m ? m[2] : name).replace(/\s+Journey$/i, '') || name, north: r.north_star || '' };
}

// A still from a quest's Cloudinary clip; a square crop of a character avatar.
export function posterUrl(video, width = 960) {
  if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(video || '')) return '';
  return video.replace('/video/upload/', `/video/upload/so_2.0,w_${width},c_limit,q_auto/`).replace(/\.(mp4|mov|webm)$/i, '.jpg');
}
export function avatarUrl(url, size = 256) {
  if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url || '')) return url || '';
  return url.replace('/image/upload/', `/image/upload/c_fill,g_auto,w_${size},h_${size},q_auto,f_auto/`);
}

// ---- Weeks ----

// The review week of a journal day: Monday to Sunday, with its ISO number.
export function weekOf(today) {
  const d = new Date(today + 'T12:00:00Z');
  const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5);
  const sunday = new Date(monday.getTime() + 6 * 864e5);
  const thursday = new Date(monday.getTime() + 3 * 864e5);
  const jan1 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const n = Math.floor((thursday - jan1) / 864e5 / 7) + 1;
  return { n, from: monday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) };
}
export const reviewTitle = (week, name) => `Weekly review · Week ${week.n} · ${name}`;

// ---- Evidence ----

// The newest evidence day per quest: its updates (digest, milestones, reviews)
// and Roy's own notes on the journal page.
async function lastEvidence(db) {
  const [updates, notes] = await Promise.all([
    all(db, `SELECT je.value AS quest, MAX(substr(u.date, 1, 10)) AS day FROM quest_updates u, json_each(u.quest) je
      WHERE json_valid(u.quest) GROUP BY je.value`),
    all(db, `SELECT n.quest_id AS quest, n.title AS title, MAX(j.date) AS day FROM journal_quest_notes n JOIN journal j ON j.id = n.journal_id
      WHERE n.note IS NOT NULL AND trim(n.note) != '' GROUP BY n.quest_id, n.title`)
  ]);
  return q => {
    const days = [...updates.filter(u => sameId(u.quest, q.id)), ...notes.filter(n => sameId(n.quest, q.id) || (n.title && n.title.trim().toLowerCase() === q.name.trim().toLowerCase()))]
      .map(x => day(x.day)).filter(Boolean).sort();
    return days[days.length - 1] || '';
  };
}

const KIND = { Progress: 'progress', Reflection: 'reflection', Milestone: 'milestone', Decision: 'decision', Setback: 'setback' };
const isReview = u => u.source === 'Manual' && /^Weekly review · Week \d+/.test(u.update || '');

// One quest's evidence, newest first: its updates and the journal notes.
export async function evidenceFor(db, q, { from = null, to = null, limit = 60 } = {}) {
  const range = (col, params) => {
    let sql = '';
    if (from) { sql += ` AND substr(${col}, 1, 10) >= ?`; params.push(from); }
    if (to) { sql += ` AND substr(${col}, 1, 10) <= ?`; params.push(to); }
    return sql;
  };
  const up = [plain(q.id)], np = [plain(q.id), q.name.trim().toLowerCase()];
  const upSql = `SELECT u.id, u.date, u.type, u.source, u.summary, u.progress_highlight, u."update" AS "update" FROM quest_updates u
    WHERE json_valid(u.quest) AND EXISTS (SELECT 1 FROM json_each(u.quest) WHERE replace(lower(value), '-', '') = ?)${range('u.date', up)}
    ORDER BY u.date DESC LIMIT ${limit}`;
  const noteSql = `SELECT j.date AS date, n.note AS note FROM journal_quest_notes n JOIN journal j ON j.id = n.journal_id
    WHERE (replace(lower(coalesce(n.quest_id, '')), '-', '') = ? OR lower(trim(n.title)) = ?) AND n.note IS NOT NULL AND trim(n.note) != ''${range('j.date', np)}
    ORDER BY j.date DESC LIMIT ${limit}`;
  const [updates, notes] = await Promise.all([all(db, upSql, ...up), all(db, noteSql, ...np)]);
  const items = [
    ...updates.map(u => ({ date: day(u.date), kind: isReview(u) ? 'review' : KIND[u.type] || 'progress', source: u.source || '', text: String(u.progress_highlight || u.summary || u.update || '').trim() })),
    ...notes.map(n => ({ date: day(n.date), kind: 'note', source: 'Journal', text: String(n.note).trim() }))
  ].filter(x => x.text);
  return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.kind === 'note' ? -1 : 1)).slice(0, limit);
}

// This week's review verdicts: quest id → { verdict, note, id }.
async function reviewsIn(db, week) {
  const rows = await all(db, `SELECT id, quest, type, summary, "update" AS "update" FROM quest_updates
    WHERE source = 'Manual' AND "update" LIKE ? AND substr(date, 1, 10) BETWEEN ? AND ?`, `Weekly review · Week ${week.n} · %`, week.from, week.to);
  const out = {};
  for (const r of rows) for (const id of parse(r.quest, [])) {
    out[plain(id)] = { id: r.id, verdict: r.type === 'Progress' ? 'pass' : r.type === 'Setback' ? 'fail' : '', note: String(r.summary || '').replace(/^(Passed|Missed|No verdict)\.\s*/, '') };
  }
  return out;
}

// ---- Loading ----

export async function loadQuests(env, { now = Date.now() } = {}) {
  const db = env.DB;
  if (!db) throw new Error('The D1 database (DB) is not bound');
  const today = journalDay(now);
  const week = weekOf(today);
  const [rows, chars, journeys, latest, reviews] = await Promise.all([
    all(db, 'SELECT * FROM quests ORDER BY created_time'),
    all(db, 'SELECT * FROM characters WHERE in_trash IS NOT 1 ORDER BY franchise, character_name'),
    all(db, 'SELECT id, journey, north_star FROM journeys ORDER BY journey'),
    lastEvidence(db),
    reviewsIn(db, week)
  ]);
  const quests = rows.map(questFrom).filter(q => !q.main && q.name);
  for (const q of quests) {
    q.last = latest(q);
    q.review = (reviews[plain(q.id)] || {}).verdict || '';
  }
  return {
    today, week, quests, years: yearsFor(today, quests),
    characters: chars.map(characterFrom), journeys: journeys.map(journeyFrom), ai: aiOn(env)
  };
}

export async function loadQuest(env, id, opts) {
  const d = await loadQuests(env, opts);
  const quest = d.quests.find(q => sameId(q.id, id));
  if (!quest) return null;
  return { ...d, quest, log: await evidenceFor(env.DB, quest) };
}

export async function loadReview(env, opts) {
  const d = await loadQuests(env, opts);
  const reviews = await reviewsIn(env.DB, d.week);
  const active = d.quests.filter(q => bucket(q) === 'active').sort((a, b) => ATTENTION.indexOf(b.attention) - ATTENTION.indexOf(a.attention));
  const items = await Promise.all(active.map(async q => ({ quest: q, saved: reviews[plain(q.id)] || null, log: await evidenceFor(env.DB, q, { from: d.week.from, to: d.week.to, limit: 20 }) })));
  return { ...d, items };
}

// ---- Saving ----

// The fields a quest form may set, checked: anything else is ignored.
export function questColumns(body, { journeys = [], characters = [], years = [] } = {}) {
  const name = clip(body.name, 120);
  if (!name) throw bad('Give the quest a name.');
  const pick = (v, list) => (list.includes(v) ? v : null);
  const date = v => (ISO_DAY.test(String(v || '')) ? String(v) : null);
  const icon = clip(body.icon, 16);
  const journey = journeys.find(j => sameId(j.id, body.journey));
  const character = characters.find(c => sameId(c.id, body.character));
  const columns = {
    quest: name,
    icon: icon ? JSON.stringify({ type: 'emoji', emoji: icon }) : null,
    active_quest: body.active ? 1 : 0,
    quest_attention: pick(body.attention, ATTENTION),
    quest_phase: pick(body.phase, PHASES),
    year: pick(body.year, years),
    start_date: date(body.start),
    target_date: date(body.target),
    next_move: clip(body.next, 1000) || null,
    pass_fail_question: clip(body.passfail, 500) || null,
    desired_outcome: clip(body.outcome) || null,
    description: clip(body.description) || null,
    daily_evidence_guide: clip(body.evidence) || null,
    journey: journey ? JSON.stringify([journey.id]) : null,
    character: character ? JSON.stringify([character.id]) : null
  };
  if (columns.active_quest && !columns.next_move) throw bad('Active quests need a next move.');
  return columns;
}

async function questRow(db, id) {
  if (!isId(id)) throw bad('Not a quest');
  const row = await db.prepare('SELECT * FROM quests WHERE replace(lower(id), \'-\', \'\') = ?').bind(plain(id)).first();
  if (!row) throw bad('Not a quest');
  if (row.main_quest === 1) throw bad('The main quest is managed on its own card.');
  return row;
}

// POST /quests/save: a new quest (no id) or the whole form of one.
export async function saveQuest(env, body, { now = Date.now() } = {}) {
  if (!body || typeof body !== 'object') throw bad('Nothing to save');
  const d = await loadQuests(env, { now });
  const columns = questColumns(body, d);
  const js = journalStore(env);
  if (body.id) {
    const row = await questRow(env.DB, body.id);
    await js.update('quests', row.id, {}, columns);
    return { ok: 1, id: row.id };
  }
  const page = await js.create('quests', {}, { ...columns, main_quest: 0 });
  return { ok: 1, id: page.id, created: true };
}

// POST /quests/action: one quick change from a quest page.
export async function questAction(env, body, { now = Date.now() } = {}) {
  if (!body || typeof body !== 'object') throw bad('Nothing to change');
  const row = await questRow(env.DB, body.id);
  const q = questFrom(row);
  const js = journalStore(env);
  const set = columns => js.update('quests', row.id, {}, columns).then(() => ({ ok: 1, id: row.id }));
  const value = body.value;
  switch (body.op) {
    case 'activate':
      if (!q.next) return { ok: 0, code: 'needs_next', message: 'Add a next move before making this quest active.' };
      return set({ active_quest: 1, ...(q.attention ? {} : { quest_attention: 'Active' }) });
    case 'plan': return set({ active_quest: 0 });
    case 'complete': return set({ completed_at: journalDay(now) });
    case 'reopen': return set({ completed_at: null });
    case 'attention':
      if (!ATTENTION.includes(value)) throw bad('Not an attention level');
      return set({ quest_attention: value });
    case 'phase':
      if (!PHASES.includes(value)) throw bad('Not a phase');
      return set({ quest_phase: value });
    case 'next': {
      const next = clip(value, 1000);
      if (q.active && !next) return { ok: 0, code: 'needs_next', message: 'Active quests need a next move.' };
      return set({ next_move: next || null });
    }
    case 'character': {
      if (!isId(value)) throw bad('Not a character');
      const c = await env.DB.prepare('SELECT id FROM characters WHERE replace(lower(id), \'-\', \'\') = ? AND in_trash IS NOT 1').bind(plain(value)).first();
      if (!c) throw bad('Not a character');
      const out = await set({ character: JSON.stringify([c.id]) });
      if (body.redraw === true) out.redraw = q.active ? await redrawVisual(env, row.id) : { ok: 0, code: 'not_active', message: 'Only an active quest has a visual.' };
      return out;
    }
    default: throw bad('Unknown change');
  }
}

// The quest's art again, now, through the Quest Engine (paid: one OpenAI image
// and one Gemini clip). The character is already saved when this runs.
async function redrawVisual(env, id) {
  if (!env.QUEST_ENGINE_TOKEN) return { ok: 0, code: 'not_set', message: 'QUEST_ENGINE_TOKEN is not set on the dashboard.' };
  try {
    const request = new Request(`${env.QUEST_ENGINE_URL}/questvisual`, {
      method: 'POST',
      headers: { 'X-Admin-Token': env.QUEST_ENGINE_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ quest_id: id }).toString()
    });
    const r = await (env.QUEST_ENGINE ? env.QUEST_ENGINE.fetch(request) : fetch(request));
    const body = await r.json().catch(() => null);
    if (!body) return { ok: 0, code: 'no_answer', message: `The Quest Engine answered ${r.status}.` };
    return body.ok ? { ok: 1, started: body.started || '' } : { ok: 0, code: body.code || '', message: body.message || 'The redraw did not start.' };
  } catch (e) {
    return { ok: 0, code: 'no_answer', message: String(e.message || e).slice(0, 200) };
  }
}

// POST /quests/review/save: this week's verdicts, notes and next moves. One
// quest_updates row per quest per week, updated when the review is saved again.
// A review with at least one verdict that saved in full also hits the boss
// with Quest review through the Quest Engine (once per game week there; a
// second save that week answers weekly_done). `attack` says how that went.
export async function saveReview(env, body, { now = Date.now() } = {}) {
  const items = body && Array.isArray(body.items) ? body.items.slice(0, 30) : null;
  if (!items) throw bad('Nothing to save');
  const today = journalDay(now);
  const week = weekOf(today);
  const db = env.DB;
  const js = journalStore(env);
  const saved = await reviewsIn(db, week);
  const at = new Date(now).toISOString();
  const out = { ok: 1, saved: 0, pass: 0, fail: 0, skipped: 0, failed: [] };
  for (const it of items) {
    try {
      const row = await questRow(db, it && it.id);
      const q = questFrom(row);
      const verdict = it.verdict === 'pass' || it.verdict === 'fail' ? it.verdict : '';
      const note = clip(it.note, 1000);
      const next = clip(it.next, 1000);
      if (next && next !== q.next) await js.update('quests', row.id, {}, { next_move: next });
      if (verdict) out[verdict]++; else out.skipped++;
      if (!verdict && !note) continue;
      const columns = {
        update: reviewTitle(week, q.name), date: today, type: VERDICTS[verdict] || 'Reflection', source: 'Manual',
        summary: `${verdict === 'pass' ? 'Passed' : verdict === 'fail' ? 'Missed' : 'No verdict'}.${note ? ' ' + note : ''}`,
        progress_highlight: `🗓️ Week ${week.n} review: ${verdict === 'pass' ? 'passed' : verdict === 'fail' ? 'missed' : 'no verdict'}${q.passfail ? ` · ${q.passfail}` : ''}`,
        quest: JSON.stringify([row.id])
      };
      const there = saved[plain(row.id)];
      if (there) await js.update('quest_updates', there.id, {}, columns);
      else await js.create('quest_updates', {}, { ...columns, created: at });
      out.saved++;
    } catch (e) {
      out.failed.push({ id: it && it.id, message: String(e.message || e).slice(0, 200) });
    }
  }
  if (!out.failed.length && out.pass + out.fail > 0) out.attack = await attackFor(env);
  return out;
}

// The Quest review hit: { state: 'hit' | 'done' | 'failed', damage?, message? }.
async function attackFor(env) {
  try {
    const r = await registerReview(env, 'weekly');
    if (r.ok && r.code === 'weekly_done') return { state: 'done' };
    if (r.ok) return { state: 'hit', damage: typeof r.damage === 'number' ? r.damage : null };
    return { state: 'failed', message: r.text || r.code || 'The Quest Engine did not count it.' };
  } catch (e) {
    return { state: 'failed', message: String(e.message || e).slice(0, 200) };
  }
}

// ---- OpenAI ----

async function aiBudget(env, now) {
  const s = store(env);
  const today = journalDay(now);
  const used = await s.get('quest_ai');
  const n = used && used.day === today ? used.n : 0;
  if (n >= AI_PER_DAY) throw Object.assign(new Error(`That is ${AI_PER_DAY} AI calls from the quest pages today. Try again tomorrow.`), { code: 'ai_limit' });
  await s.put('quest_ai', { day: today, n: n + 1 });
  return s;
}

// One chat call that answers with a JSON object.
export async function chatJson(env, system, user, { max = 1500, now = Date.now() } = {}) {
  if (!aiOn(env)) throw Object.assign(new Error('AI is turned off on this Worker.'), { code: 'ai_off' });
  const s = await aiBudget(env, now);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.CHAT_MODEL, max_completion_tokens: max, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: typeof user === 'string' ? user : JSON.stringify(user) }]
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${(body.error && body.error.message) || 'failed'}`);
  await s.put('usage', addUsage(await s.get('usage'), { chat_calls: 1, chat_in: (body.usage && body.usage.prompt_tokens) || 0, chat_out: (body.usage && body.usage.completion_tokens) || 0 }, now));
  const text = String(body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content || '');
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) try { return JSON.parse(m[0]); } catch {}
  throw new Error('OpenAI did not answer with JSON');
}

// What every AI call knows: the quest log as it stands, briefly.
export function questContext(d) {
  const j = id => (d.journeys.find(x => sameId(x.id, id)) || {}).name || '';
  const c = id => (d.characters.find(x => sameId(x.id, id)) || {}).name || '';
  const examples = d.quests.filter(q => bucket(q) === 'active').slice(0, 3)
    .map(q => ({ name: q.name, icon: q.icon, outcome: q.outcome, description: q.description, passfail: q.passfail, next: q.next, evidence: q.evidence }));
  return {
    today: d.today,
    about: 'A personal quest log: a few active quests reviewed every Sunday with a pass/fail question, plus planned quests by year. A daily digest reads journal notes, Strava workouts and Withings body metrics and logs progress against each active quest\'s daily evidence guide.',
    journeys: d.journeys.map(x => ({ name: x.name, north_star: x.north })),
    attention_levels: ATTENTION, phases: PHASES, years: d.years,
    quests: d.quests.map(q => ({ name: q.name, journey: j(q.journey), status: bucket(q), attention: q.attention || undefined, year: q.year || undefined, target: q.target || undefined, next: q.next || undefined, character: c(q.character) || undefined })),
    house_style_examples: examples,
    characters: d.characters.filter(x => x.enabled).map(x => `${x.name} | ${x.franchise} | ${x.vibe}`)
  };
}

const DRAFT_SYSTEM = [
  'You help Roy set up a new quest in his personal quest log. You get the quest log as context and his own description of the new quest.',
  'Reply with one JSON object with exactly these keys:',
  '"name" (short, verb-first title, at most 7 words), "icon" (one emoji), "journey" (one journey name from the context),',
  '"year" (one of the years in the context), "start" (YYYY-MM-DD or "", today if he wants to start now), "target" (YYYY-MM-DD or "", only if a date is stated or clearly implied),',
  '"activeNow" (boolean: should it be active now, given his current active quests), "attention" (one attention level, or "" if not active), "phase" (one phase, usually Start),',
  '"outcome" (1-3 sentences: a concrete, checkable end state), "description" (1-3 sentences: why it matters now, first person, his voice),',
  '"passfail" (one weekly yes/no question starting with "Did I"), "next" (one concrete action finishable in a single sitting),',
  '"evidence" (1-2 sentences: what the daily digest should look for in journal notes, workouts or body metrics),',
  '"character" (the exact name of a character from the list whose powers or personality are a fitting, slightly playful metaphor for the quest; prefer one no other quest uses), "characterAlts" (2 other exact names, other franchises),',
  '"why" (an object with a reason of at most 14 words for each of: name, journey, year, target, attention, outcome, passfail, next, evidence, character),',
  '"recommendation" (1-2 sentences: start now or plan it, naming his current active quests), "related" (0-3 objects {"name": exact existing quest name, "note": at most 14 words}, only real overlaps),',
  '"questions" (0-3 short questions, only for missing information that would clearly change the draft).',
  'Match the tone and length of the house style examples. Use only what the description says or the context makes reasonable; do not invent facts about his life.'
].join(' ');

const FIELD_HINTS = {
  name: 'Quest name: short and verb-first.',
  next: 'Next move: one concrete action finishable in a single sitting.',
  passfail: 'Weekly pass/fail question: a yes/no question for the Sunday review, starting with "Did I".',
  outcome: 'Desired outcome: what done looks like, concrete enough to check off.',
  description: 'Why this quest: why it matters now, first person.',
  evidence: 'Daily evidence guide: what the daily digest should look for in journal notes, workouts and body metrics.'
};

const questFacts = q => ({ name: clip(q.name, 120), outcome: clip(q.outcome, 1500), description: clip(q.description, 1500), passfail: clip(q.passfail, 500), next: clip(q.next, 500), evidence: clip(q.evidence, 1000), target: clip(q.target, 10), phase: clip(q.phase, 10) });

// POST /quests/ai: draft | suggest | characters | review.
export async function questAi(env, body, { now = Date.now() } = {}) {
  if (!body || typeof body !== 'object') throw bad('Nothing to ask');
  const d = await loadQuests(env, { now });
  const ctx = questContext(d);
  const byName = (list, n) => list.find(x => x.name.toLowerCase() === String(n || '').trim().toLowerCase());

  if (body.kind === 'draft') {
    const text = clip(body.text, 4000);
    if (text.length < 12) throw bad('Describe the quest in a sentence or two first.');
    const answers = Array.isArray(body.answers) ? body.answers.slice(0, 3).map(a => ({ question: clip(a && a.q, 300), answer: clip(a && a.a, 600) })).filter(a => a.question && a.answer) : [];
    const user = { context: ctx, description: text, ...(answers.length ? { answers_to_your_questions: answers, current_draft: body.current ? questFacts(body.current) : undefined } : {}) };
    const o = await chatJson(env, DRAFT_SYSTEM, user, { max: 2500, now });
    return { ok: 1, draft: draftFrom(o, d) };
  }

  if (body.kind === 'suggest') {
    const field = String(body.field || '');
    if (!FIELD_HINTS[field]) throw bad('Not a field');
    const o = await chatJson(env,
      'You help Roy word one field of a quest in his personal quest log. Reply with one JSON object {"options": [three strings]}: three meaningfully different values (for example smaller, bolder, more specific), each matching the house style examples.',
      { context: ctx, quest: questFacts(body.quest || {}), his_description: clip(body.text, 2000) || undefined, field: FIELD_HINTS[field] }, { max: 800, now });
    const options = (Array.isArray(o.options) ? o.options : []).map(x => clip(x, 1000)).filter(Boolean).slice(0, 3);
    return { ok: 1, options };
  }

  if (body.kind === 'characters') {
    const q = body.id ? d.quests.find(x => sameId(x.id, body.id)) : body.quest;
    if (!q) throw bad('Not a quest');
    const used = d.quests.filter(x => x.character && !sameId(x.id, q.id)).map(x => `${(d.characters.find(c => sameId(c.id, x.character)) || {}).name} (${x.name})`);
    const o = await chatJson(env,
      'You pick characters to star in the cinematic visual of one quest in Roy\'s quest log. Choose characters whose powers or personality are a fitting, slightly playful metaphor for the quest; prefer characters no other quest uses, from different franchises. Reply with one JSON object {"picks": [{"name": exact name from the list, "why": at most 16 words}]} with three picks, none of them the current character.',
      { quest: questFacts(q), current: (d.characters.find(c => sameId(c.id, q.character)) || {}).name || null, characters: ctx.characters, already_used: used }, { max: 600, now });
    const picks = (Array.isArray(o.picks) ? o.picks : []).map(p => ({ c: byName(d.characters, p && p.name), why: clip(p && p.why, 200) }))
      .filter(p => p.c && !sameId(p.c.id, q.character)).slice(0, 3).map(p => ({ id: p.c.id, why: p.why }));
    return { ok: 1, picks };
  }

  if (body.kind === 'review') {
    const r = await loadReview(env, { now });
    const notes = new Map((Array.isArray(body.notes) ? body.notes : []).map(n => [plain(n && n.id), clip(n && n.note, 500)]));
    const quests = r.items.map(it => ({ id: it.quest.id, name: it.quest.name, passfail: it.quest.passfail, outcome: it.quest.outcome, current_next: it.quest.next,
      evidence_this_week: it.log.map(l => `${l.date} ${l.kind}: ${l.text}`), my_note: notes.get(plain(it.quest.id)) || undefined }));
    if (!quests.length) return { ok: 1, items: [] };
    const o = await chatJson(env,
      `You help with Roy's Sunday weekly review. Week ${r.week.n} runs ${r.week.from} to ${r.week.to}. For each quest, judge its weekly pass/fail question only from the evidence listed; if the evidence is missing or ambiguous, say "unclear". Then propose the next move for next week: one concrete action finishable in a single sitting that builds on what happened (keep the current one if it is still right). Reply with one JSON object {"items": [{"id": the quest id, "verdict": "pass"|"fail"|"unclear", "reason": at most 18 words citing the evidence, "next": string}]}.`,
      { quests }, { max: 1800, now });
    const items = (Array.isArray(o.items) ? o.items : []).map(x => {
      const q = r.items.find(it => sameId(it.quest.id, x && x.id));
      if (!q) return null;
      return { id: q.quest.id, verdict: x.verdict === 'pass' || x.verdict === 'fail' ? x.verdict : '', reason: clip(x.reason, 240), unclear: x.verdict === 'unclear', next: clip(x.next, 1000) };
    }).filter(Boolean);
    return { ok: 1, items };
  }

  throw bad('Unknown request');
}

// The model's draft, checked against what exists.
export function draftFrom(o, d) {
  const byName = (list, n) => list.find(x => x.name.toLowerCase() === String(n || '').trim().toLowerCase().replace(/\s+journey$/i, ''));
  const iso = v => (ISO_DAY.test(String(v || '')) ? String(v) : '');
  const journey = byName(d.journeys, o.journey);
  const character = byName(d.characters, o.character);
  const active = !!o.activeNow;
  const draft = {
    name: clip(o.name, 120), icon: clip(o.icon, 16), journey: journey ? journey.id : '', year: d.years.includes(String(o.year)) ? String(o.year) : d.years[0],
    start: iso(o.start), target: iso(o.target), active,
    attention: ATTENTION.includes(o.attention) ? o.attention : active ? 'Active' : '', phase: PHASES.includes(o.phase) ? o.phase : 'Start',
    outcome: clip(o.outcome), description: clip(o.description), passfail: clip(o.passfail, 500), next: clip(o.next, 1000), evidence: clip(o.evidence),
    character: character ? character.id : ''
  };
  const why = {};
  if (o.why && typeof o.why === 'object') for (const [k, v] of Object.entries(o.why)) if (typeof v === 'string' && v.trim()) why[k] = clip(v, 200);
  return {
    fields: draft, why,
    alts: (Array.isArray(o.characterAlts) ? o.characterAlts : []).map(n => byName(d.characters, n)).filter(c => c && c.id !== draft.character).slice(0, 2).map(c => c.id),
    recommendation: clip(o.recommendation, 400),
    related: (Array.isArray(o.related) ? o.related : []).map(r => ({ q: d.quests.find(q => q.name.toLowerCase() === String(r && r.name || '').trim().toLowerCase()), note: clip(r && r.note, 200) }))
      .filter(r => r.q).slice(0, 3).map(r => ({ id: r.q.id, name: r.q.name, icon: r.q.icon, note: r.note })),
    questions: (Array.isArray(o.questions) ? o.questions : []).map(x => clip(x, 300)).filter(Boolean).slice(0, 3)
  };
}
