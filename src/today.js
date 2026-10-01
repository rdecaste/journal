// The Quest log as a clean page of its own (GET /questlog, Roy 29 Sep 2026):
// the morning runs' texts (Morning Spark, today's journal, the 💬 notes, the
// training and to-do numbers, kept by the Quest Engine's 03:00 run), the hero and the active quests from the Quest Engine, and the
// cross-border numbers the dashboard already computes. Since 29 Sep it also
// carries the dashboard's old Overview: the AI summary, what drifts (flags),
// today's work location and whether the automations run. Read only.

import { loadDashboard } from './load.js';
import { cached, remember } from './cache.js';

const CACHE_SECONDS = 300;
const CLOUD = 'https://res.cloudinary.com/a3xk0plk';
const MARK = '💬';
const QUESTBOARD = 'https://questboard.quest-engine.workers.dev/';

// ---- The morning runs' texts ----

// From the Quest Engine (GET /questlog): the Morning Spark, today's journal,
// the main quest, the 💬 notes and the training and to-do numbers. Until step
// 5 of the D1 move (1 Oct 2026) they were read off the Notion Quest log page,
// in the same shape.
export function questLogView(r) {
  return {
    spark: (r && r.spark) || '',
    journal: (r && r.journal) || null,
    main_quest: (r && r.main_quest) || null,
    notes: (r && r.notes) || {},
    training: (r && r.training) || null,
    todo: (r && r.todo) || null
  };
}

// ---- The Quest Engine ----

async function engine(env, path, headers = {}) {
  const request = new Request(`${env.QUEST_ENGINE_URL}${path}`, { headers: { Accept: 'application/json', ...headers } });
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
    image: `${CLOUD}/image/upload/c_fill,g_auto,w_640,h_360,f_auto,q_auto/Quest-Board/${c.id}`,
    // The quest opens on the Quest Dashboard card (its Notion page is a frozen copy since 1 Oct 2026).
    url: QUESTBOARD
  }));
}

export function crossView(cross) {
  if (!cross || !cross.ytd || cross.ytd.be_share === null) return null;
  return {
    be_share: cross.ytd.be_share, minimum: cross.minimum,
    buffer_days: cross.buffer_days, be_days_needed: cross.be_days_needed,
    missing: (cross.missing || []).length,
    today: cross.today ? workDay(cross.today) : null
  };
}

export const LOC = { '🇧🇪 Beerse': 'Belgium (Beerse)', '🇧🇪 Ghent': 'Belgium (Ghent)', '🇳🇱 Home': 'Netherlands (home)', '✈️ Travel': 'Travel', '🏖️ Holiday': 'Holiday', '🎉 Public holiday': 'Public holiday' };

// Today's row in the Work Location Log, in words.
export function workDay(t) {
  const name = v => LOC[v] || v;
  const place = t.weekend && !t.am && !t.pm ? 'Weekend'
    : t.am || t.pm ? (t.am && t.pm && t.am !== t.pm ? `${name(t.am)} / ${name(t.pm)}` : name(t.am || t.pm)) : null;
  return { place, commute: t.commute || '', url: t.url || null };
}

// The old Overview's content: the summary, the flags, and a systems line.
export function briefingView(dash) {
  if (!dash) return null;
  const o = dash.overview || { areas: [], drifting: [] };
  const s = dash.summary;
  const bad = dash.system ? dash.system.processes.filter(p => p.level !== 'ok') : null;
  return {
    summary: s && s.text ? { text: s.text, day: s.day, at: s.at, stale: !!s.stale } : null,
    ai_enabled: !!dash.ai_enabled,
    flags: o.drifting.map(f => ({ area: f.area, area_name: f.area_name, level: f.level, title: f.title, why: f.why })),
    areas: o.areas.map(a => ({ key: a.key, name: a.name, status: a.status })),
    systems: bad ? { checked: dash.system.processes.length, problems: bad.map(p => p.name) } : null
  };
}

// ---- Everything the page shows ----

// `dashboard` may be a promise, so the Quest Engine is read while the
// dashboard data is still loading.
export async function loadToday(env, { now = Date.now(), fresh = false, dashboard = null } = {}) {
  if (!fresh) {
    const hit = await cached(env, 'questlog', CACHE_SECONDS);
    if (hit) return hit;
  }
  const errors = [];
  const safe = (p, label) => p.catch(e => { errors.push(`${label}: ${e.message || e}`); return null; });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date(now));
  const [questLog, state, hero, board, dash] = await Promise.all([
    safe(engine(env, '/questlog', { 'X-Admin-Token': env.QUEST_ENGINE_TOKEN || '' }), 'Quest log'),
    safe(engine(env, '/mainquest'), 'Main quest'),
    safe(engine(env, '/hero'), 'Hero'),
    safe(engine(env, '/questboard'), 'Questboard'),
    dashboard ? safe(Promise.resolve(dashboard), 'Dashboard') : safe(loadDashboard(env, { now }), 'Dashboard')
  ]);
  const log = questLogView(questLog);
  const data = {
    built_at: new Date(now).toISOString(), today,
    ...log,
    hero: heroView(state, hero),
    quests: board ? questsView(board, today) : [],
    cross: crossView(dash && dash.cross),
    briefing: briefingView(dash),
    errors: errors.concat((dash && dash.errors) || [])
  };
  await remember(env, 'questlog', data);
  return data;
}
