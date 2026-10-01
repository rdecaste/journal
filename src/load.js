// Gathers everything the dashboard shows: Notion and D1 rows (read only; the
// health and work tables come from src/healthstore.js), the Quest
// Engine's status and ledger, and the healthchecks.io checks. The result is
// cached for a few minutes so opening the page repeatedly costs nothing.

import { Notion } from './notion.js';
import { DATA_SOURCES as DS, CROSS_BORDER, HEALTH_JOURNEY } from './config.js';
import { crossBorder, health, system, overview, amsterdamDay, mergeUsage } from './metrics.js';
import { questEngineStatus, questEngineLedger, healthChecks } from './sources.js';
import { store } from './usage.js';
import { cached, remember } from './cache.js';
import { healthStore } from './healthstore.js';

const CACHE_SECONDS = 300;
const DAY = 86400000;

// The sync's newest reading, by its own date (Withings rows can be created long
// before their measurement is filled in, so created_time says nothing).
const newest = (rows, name) => { const d = rows && rows[0] && rows[0].properties[name] && rows[0].properties[name].date; return d ? { created: d.start, url: rows[0].url } : null; };

export async function loadDashboard(env, { now = Date.now(), fresh = false } = {}) {
  if (!fresh) {
    const hit = await cached(env, 'dashboard', CACHE_SECONDS);
    if (hit) return hit;
  }
  const n = new Notion(env.NOTION_TOKEN);
  const rows = healthStore(env, n);
  const s = store(env);
  const today = amsterdamDay(now);
  const since = d => new Date(now - d * DAY).toISOString().slice(0, 10);
  const errors = [];
  const safe = (p, label) => p.catch(e => { errors.push(`${label}: ${e.message || e}`); return null; });

  const [locations, workouts, metrics, sleep, quests, latestWorkout, latestMetric, status, ledger, checks, summary, ownUsage] = await Promise.all([
    safe(rows.queryAll('work_location', { filter: { and: [{ property: 'Date', date: { on_or_after: CROSS_BORDER.start } }, { property: 'Date', date: { on_or_before: today.slice(0, 4) + '-12-31' } }] }, sorts: [{ property: 'Date', direction: 'ascending' }] }), 'Work Location Log'),
    safe(rows.queryAll('workouts', { filter: { property: 'start_date_local', date: { on_or_after: since(7 * 13 + 7) } }, sorts: [{ property: 'start_date_local', direction: 'ascending' }] }), 'Workouts'),
    safe(rows.queryAll('body_metrics', { filter: { property: 'Date', date: { on_or_after: since(120) } }, sorts: [{ property: 'Date', direction: 'ascending' }] }), 'Body Metrics'),
    safe(rows.queryAll('sleep_recovery', { filter: { property: 'Date', date: { on_or_after: since(60) } }, sorts: [{ property: 'Date', direction: 'ascending' }] }), 'Sleep & Recovery'),
    safe(n.query(DS.quests, { filter: { and: [{ property: 'Journey', relation: { contains: HEALTH_JOURNEY } }, { property: 'Active Quest', checkbox: { equals: true } }, { property: 'Main Quest', checkbox: { equals: false } }] } }).then(r => r.results), 'Quests'),
    safe(rows.query('workouts', { filter: { property: 'start_date_local', date: { on_or_before: today } }, sorts: [{ property: 'start_date_local', direction: 'descending' }], page_size: 1 }), 'Workouts (newest)'),
    safe(rows.query('body_metrics', { filter: { property: 'Date', date: { on_or_before: today } }, sorts: [{ property: 'Date', direction: 'descending' }], page_size: 1 }), 'Body Metrics (newest)'),
    safe(questEngineStatus(env), 'Quest Engine status'),
    safe(questEngineLedger(env), 'Quest Engine ledger'),
    healthChecks(env).catch(() => null),
    s.get('summary').catch(() => null),
    s.get('usage').catch(() => null)
  ]);

  const cross = locations ? crossBorder(locations, today) : null;
  const h = workouts && metrics ? health(workouts, metrics, today, { sleep, quests }) : null;
  const usage = mergeUsage(ledger && ledger.usage, ownUsage);
  const sys = system({ status, checks, ledger: ledger ? { ...ledger, usage } : null, latest: { workout: newest(latestWorkout, 'start_date_local'), metric: newest(latestMetric, 'Date') } }, now);
  const data = {
    built_at: new Date(now).toISOString(), today,
    overview: overview({ cross, health: h, system: sys }),
    cross, health: h, system: sys,
    summary: summary && summary.day === today ? summary : (summary ? { ...summary, stale: true } : null),
    ai_enabled: env.ADMIN_AI === '1',
    errors
  };
  await remember(env, 'dashboard', data);
  return data;
}
