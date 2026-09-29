// The Quest log as a clean page of its own (GET /questlog, Roy 29 Sep 2026):
// the Notion Quest log's texts (Morning Spark, today's journal, the 💬 notes,
// the training and to-do boxes, which the Quest Engine's 03:00 run keeps
// current), the hero and the active quests from the Quest Engine, and the
// cross-border numbers the dashboard already computes. Read only.

import { Notion } from './notion.js';
import { QUEST_LOG } from './config.js';
import { loadDashboard } from './load.js';

const CACHE_SECONDS = 300;
const CACHE_KEY = 'https://admin-dashboard.internal/questlog';
const CLOUD = 'https://res.cloudinary.com/a3xk0plk';
const MARK = '💬';

// ---- The Notion page ----

const OPEN = new Set(['column_list', 'column', 'callout']);

// Every block in page order as { block, parent }, opening columns and callouts.
export async function walkPage(n, pageId, maxDepth = 5) {
  const out = [];
  const visit = async (parent, depth) => {
    for (const block of await n.children(parent)) {
      out.push({ block, parent });
      if (block.has_children && OPEN.has(block.type) && depth < maxDepth) await visit(block.id, depth + 1);
    }
  };
  await visit(pageId, 0);
  return out;
}

const runs = b => (b && b[b.type] && b[b.type].rich_text) || [];
const plain = b => runs(b).map(r => r.plain_text ?? r.text?.content ?? '').join('');
const iconOf = b => (b && b[b.type] && b[b.type].icon && b[b.type].icon.emoji) || '';
const isNote = b => b.type === 'paragraph' && plain(b).trim().startsWith(MARK);
const noteText = b => (b ? plain(b).trim().replace(/^💬\s*/u, '') : '');
const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const num = s => (s === undefined ? null : Number(s));

export function readQuestLog(flat) {
  const callout = emoji => (flat.find(x => x.block.type === 'callout' && iconOf(x.block) === emoji) || {}).block || null;
  const under = id => {
    const inside = new Set([id]);
    return flat.filter(x => inside.has(x.parent) && inside.add(x.block.id)).map(x => x.block);
  };
  const noteIn = box => (box ? noteText(under(box.id).find(isNote)) : '');

  const spark = callout('✨');
  const sparkText = plain(spark).replace(/^\s*Morning Spark\s*\n?/i, '').trim();

  const journalBox = callout('📓');
  const link = journalBox ? under(journalBox.id).find(b => b.type === 'paragraph' && !isNote(b)) : null;
  const mention = runs(link).find(r => r.href) || null;
  const journal = mention ? { title: (mention.plain_text || '').trim() || 'Today’s journal', url: mention.href } : null;

  // ⚔️ reads "Main quest" (linked to the quest page), then "<title> · Visual".
  const main = callout('⚔️');
  const mainLines = plain(main).split('\n');
  const mainLink = runs(main).find(r => r.href && /main quest/i.test(r.plain_text || '')) || null;
  const mainQuest = { title: (mainLines[1] || '').split(' · ')[0].trim(), url: mainLink ? mainLink.href : null };

  const training = /([\d.]+)\s*of\s*([\d.]+)\s*h/.exec(plain(callout('🏋️')));
  const todo = plain(callout('✅'));
  const open = /(\d+\+?)\s*open/.exec(todo);
  const oldest = /oldest waiting (\d+) days/.exec(todo);

  // The quests note: the first 💬 line after the "Active quests" heading.
  let attention = '';
  const h = flat.findIndex(x => x.block.type === 'heading_2' && norm(plain(x.block)).includes('ACTIVE QUESTS'));
  if (h >= 0) {
    for (let j = h + 1; j < flat.length; j++) {
      if (flat[j].parent !== flat[h].parent) continue;
      if (/^heading_/.test(flat[j].block.type)) break;
      if (isNote(flat[j].block)) { attention = noteText(flat[j].block); break; }
    }
  }

  return {
    spark: sparkText,
    journal,
    main_quest: mainQuest,
    notes: { main_quest: noteIn(callout('⚔️')), cross_border: noteIn(callout('🌍')), training: noteIn(callout('🏋️')), todo: noteIn(callout('✅')), attention },
    training: training ? { hours: num(training[1]), target: num(training[2]) } : null,
    todo: open ? { open: open[1], oldest_days: oldest ? num(oldest[1]) : null } : null
  };
}

// ---- The Quest Engine ----

async function engine(env, path) {
  const request = new Request(`${env.QUEST_ENGINE_URL}${path}`, { headers: { Accept: 'application/json' } });
  const r = await (env.QUEST_ENGINE ? env.QUEST_ENGINE.fetch(request) : fetch(request));
  if (!r.ok) throw new Error(`Quest Engine ${path} answered ${r.status}`);
  return r.json();
}

// Only what is already reached: the current level, stage, HP and XP.
export function heroView(state, hero) {
  if (!state) return null;
  const marks = state.stage_marks || [];
  return {
    level: state.level ?? null,
    stage: state.stage_in_level ?? null,
    stages: marks.length ? marks.length + 1 : 4,
    hp: state.current_hp ?? null,
    max_hp: state.max_hp ?? null,
    xp_to_next_stage: typeof state.xp_to_next_stage === 'number' ? Math.round(state.xp_to_next_stage) : null,
    run: hero && hero.records && typeof hero.records.current_run === 'number' ? hero.records.current_run : null,
    image: state.video_public_id && state.video_version
      ? `${CLOUD}/video/upload/so_1.0,c_fill,g_north,w_600,h_900/v${state.video_version}/${state.video_public_id}.jpg` : null
  };
}

const ATTENTION = ['Spotlight', 'Focus', 'Active', 'Background'];
export const PHASES = ['Start', 'Build', 'Push', 'Finish'];

export function questsView(cards, today) {
  const rank = c => { const i = ATTENTION.indexOf(c.questAttention); return i < 0 ? ATTENTION.length : i; };
  const daysTo = d => (d ? Math.round((Date.parse(d.slice(0, 10) + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 864e5) : null);
  return (cards || []).slice().sort((a, b) => (a.completedAt ? 1 : 0) - (b.completedAt ? 1 : 0) || rank(a) - rank(b)).map(c => ({
    title: c.questTitle,
    attention: c.questAttention || '',
    phase: PHASES.indexOf(c.questPhase),
    next_move: c.nextMove || '',
    days_left: c.completedAt ? null : daysTo(c.targetDate),
    done: !!c.completedAt,
    image: `${CLOUD}/image/upload/c_fill,g_auto,w_640,h_360,f_auto,q_auto/Quest-Board/${c.id}`
  }));
}

export function crossView(cross) {
  if (!cross || !cross.ytd || cross.ytd.be_share === null) return null;
  return {
    be_share: cross.ytd.be_share, minimum: cross.minimum,
    buffer_days: cross.buffer_days, be_days_needed: cross.be_days_needed,
    missing: (cross.missing || []).length
  };
}

// ---- Everything the page shows ----

export async function loadToday(env, { now = Date.now(), fresh = false } = {}) {
  const cache = globalThis.caches && caches.default;
  if (cache && !fresh) {
    const hit = await cache.match(CACHE_KEY);
    if (hit) return hit.json();
  }
  const errors = [];
  const safe = (p, label) => p.catch(e => { errors.push(`${label}: ${e.message || e}`); return null; });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date(now));
  const [flat, state, hero, board, dash] = await Promise.all([
    safe(walkPage(new Notion(env.NOTION_TOKEN), QUEST_LOG.page), 'Quest log'),
    safe(engine(env, '/mainquest'), 'Main quest'),
    safe(engine(env, '/hero'), 'Hero'),
    safe(engine(env, '/questboard'), 'Questboard'),
    safe(loadDashboard(env, { now }), 'Dashboard')
  ]);
  const log = flat ? readQuestLog(flat) : { spark: '', journal: null, main_quest: null, notes: {}, training: null, todo: null };
  const data = {
    built_at: new Date(now).toISOString(), today,
    ...log,
    hero: heroView(state, hero),
    quests: board ? questsView(board, today) : [],
    cross: crossView(dash && dash.cross),
    errors
  };
  if (cache) await cache.put(CACHE_KEY, new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${CACHE_SECONDS}` } }));
  return data;
}
