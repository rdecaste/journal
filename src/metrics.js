// The dashboard's judgements, as pure functions of Notion rows and the Quest
// Engine's state, so they can be tested without the network.
//
// Every area ends in a status: 'ok' (healthy), 'watch' (worth watching) or
// 'attention' (needs attention), plus the specific flags that caused it. There
// is no combined score: the Overview lists the flagged areas themselves.

import { CROSS_BORDER, LOCATIONS, TRAINING, SPORTS, SYNCS, PRICES, ENGINE } from './config.js';

const DAY = 86400000;
const RANK = { ok: 0, watch: 1, attention: 2, unknown: 0 };
export const worst = (...levels) => levels.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'ok');
const round = (n, d = 1) => (Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : null);
const dayOf = s => String(s || '').slice(0, 10);
const addDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((Date.parse(dayOf(b) + 'T00:00:00Z') - Date.parse(dayOf(a) + 'T00:00:00Z')) / DAY);
const weekday = day => new Date(day + 'T00:00:00Z').getUTCDay(); // 0 Sunday
const mondayOf = day => addDays(day, -((weekday(day) + 6) % 7));
const flag = (level, title, why, link) => ({ level, title, why, ...(link ? { link } : {}) });

// ---- Notion property readers ----
const prop = (page, name) => (page && page.properties && page.properties[name]) || {};
const sel = (page, name) => (prop(page, name).select && prop(page, name).select.name) || '';
const dateOf = (page, name) => (prop(page, name).date && prop(page, name).date.start) || '';
const num = (page, name) => {
  const p = prop(page, name);
  if (typeof p.number === 'number') return p.number;
  if (p.formula && typeof p.formula.number === 'number') return p.formula.number;
  return null;
};
const check = (page, name) => prop(page, name).checkbox === true;

// ============================ Cross border ============================

// rows: Work Location Log pages (one per calendar day). today: 'YYYY-MM-DD'.
export function crossBorder(rows, today, cfg = CROSS_BORDER) {
  const days = rows
    .map(r => ({ date: dateOf(r, 'Date').slice(0, 10), am: sel(r, 'AM'), pm: sel(r, 'PM'), weekend: check(r, 'Weekend'), commute: sel(r, 'Commute'), ebike: num(r, 'E-bike €') || 0, url: r.url || '' }))
    .filter(d => d.date && d.date >= cfg.start)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const byDate = new Map(days.map(d => [d.date, d]));

  const empty = () => ({ be: 0, nl: 0, travel: 0, holiday: 0, unclassified: 0, ebike: 0 });
  const add = (t, d, { countMissing }) => {
    for (const half of [d.am, d.pm]) {
      const kind = LOCATIONS[half];
      if (kind) t[kind] += 0.5;
      else if (countMissing && !d.weekend) t.unclassified += 0.5;
    }
    t.ebike += d.ebike;
  };
  const finish = t => {
    const worked = t.be + t.nl;
    return { ...t, ebike: round(t.ebike, 2), accountable: t.be + t.nl + t.travel + t.holiday + t.unclassified, be_share: worked ? round(100 * t.be / worked) : null, nl_share: worked ? round(100 * t.nl / worked) : null };
  };

  // Year to date (since the start) and this month: days up to yesterday count
  // an empty weekday half as unclassified; today counts only what is filled in.
  const ytd = empty(), month = empty(), planned = empty();
  const monthKey = today.slice(0, 7);
  const missing = [];
  for (const d of days) {
    if (d.date > today) { add(planned, d, { countMissing: false }); continue; }
    const past = d.date < today;
    add(ytd, d, { countMissing: past });
    if (d.date.startsWith(monthKey)) add(month, d, { countMissing: past });
    if (past && !d.weekend && (!LOCATIONS[d.am] || !LOCATIONS[d.pm])) missing.push({ date: d.date, am: d.am, pm: d.pm, url: d.url });
  }
  // Weekdays with no row at all are missing too.
  for (let day = cfg.start; day < today; day = addDays(day, 1)) {
    if (!byDate.has(day) && weekday(day) !== 0 && weekday(day) !== 6) {
      missing.push({ date: day, am: '', pm: '', url: '', no_row: true });
      ytd.unclassified += 1;
      if (day.startsWith(monthKey)) month.unclassified += 1;
    }
  }
  missing.sort((a, b) => (a.date < b.date ? -1 : 1));

  const Y = finish(ytd), M = finish(month);
  const T = cfg.beMinimum / 100;
  // NL days that can still be added before Belgium falls to the minimum share
  // (be / (be + nl + x) = T), or BE days needed to get back above it.
  const buffer = Y.be + Y.nl ? round(Y.be / T - Y.be - Y.nl) : null;
  const beNeeded = buffer !== null && buffer < 0 ? round((T * (Y.be + Y.nl) - Y.be) / (1 - T)) : 0;
  const perNlDay = Y.be + Y.nl ? round(100 * (Y.be / (Y.be + Y.nl) - Y.be / (Y.be + Y.nl + 1)), 2) : null;

  // "If the current pattern continues": the BE share of the last trendWeeks
  // weeks applied to the remaining weekdays of the year that have no plan yet.
  const trendFrom = addDays(today, -7 * cfg.trendWeeks);
  const recent = empty();
  for (const d of days) if (d.date >= trendFrom && d.date < today) add(recent, d, { countMissing: false });
  const recentShare = recent.be + recent.nl ? recent.be / (recent.be + recent.nl) : (Y.be + Y.nl ? Y.be / (Y.be + Y.nl) : null);
  const yearEnd = today.slice(0, 4) + '-12-31';
  let open = 0;
  for (let day = addDays(today, 1); day <= yearEnd; day = addDays(day, 1)) {
    if (weekday(day) === 0 || weekday(day) === 6) continue;
    const d = byDate.get(day);
    if (d && d.weekend) continue;
    for (const half of d ? [d.am, d.pm] : ['', '']) if (!LOCATIONS[half]) open += 0.5;
  }
  const projBe = Y.be + planned.be + (recentShare === null ? 0 : recentShare * open);
  const projNl = Y.nl + planned.nl + (recentShare === null ? 0 : (1 - recentShare) * open);
  const projection = projBe + projNl ? {
    year_end_be_share: round(100 * projBe / (projBe + projNl)),
    recent_be_share: recentShare === null ? null : round(100 * recentShare),
    planned_be: planned.be, planned_nl: planned.nl, open_days: open
  } : null;

  // Cumulative BE share at the end of each week, for the trend line.
  const trend = [];
  let be = 0, nl = 0;
  for (const d of days) {
    if (d.date >= today) break;
    for (const half of [d.am, d.pm]) { if (LOCATIONS[half] === 'be') be += 0.5; if (LOCATIONS[half] === 'nl') nl += 0.5; }
    if (weekday(d.date) === 0 && be + nl) trend.push({ week: mondayOf(d.date), be_share: round(100 * be / (be + nl)) });
  }

  // Per month since the start.
  const months = new Map();
  for (const d of days) {
    if (d.date > today) break;
    const key = d.date.slice(0, 7);
    if (!months.has(key)) months.set(key, empty());
    add(months.get(key), d, { countMissing: d.date < today });
  }

  const flags = [];
  if (Y.be_share !== null && Y.be_share <= cfg.beMinimum) flags.push(flag('attention', 'Belgium share at or below the line', `Belgium is ${Y.be_share}% of BE + NL workdays; the line is above ${cfg.beMinimum}%. ${beNeeded} more Belgium days bring it back.`));
  else if (buffer !== null && buffer < cfg.bufferAttention) flags.push(flag('attention', 'Cross-border buffer almost gone', `Only ${buffer} NL days left before Belgium drops to ${cfg.beMinimum}%.`));
  else if (buffer !== null && buffer < cfg.bufferWatch) flags.push(flag('watch', 'Cross-border buffer is thin', `${buffer} NL days left before Belgium drops to ${cfg.beMinimum}%.`));
  if (projection && projection.year_end_be_share <= cfg.beMinimum) flags.push(flag('watch', 'Heading toward the line by year end', `At the last ${cfg.trendWeeks} weeks' pattern (${projection.recent_be_share}% BE), the year ends at ${projection.year_end_be_share}% Belgium.`));
  if (missing.length) flags.push(flag(missing.length > 3 ? 'attention' : 'watch', `${missing.length} work day${missing.length === 1 ? '' : 's'} not classified`, `Missing AM/PM in the Work Location Log: ${missing.slice(0, 5).map(m => m.date).join(', ')}${missing.length > 5 ? '…' : ''}.`, missing[0].url || undefined));

  const todayRow = byDate.get(today);
  return {
    status: worst(...flags.map(f => f.level)),
    flags,
    ytd: Y, month: M, month_key: monthKey,
    buffer_days: buffer, be_days_needed: beNeeded, share_per_nl_day: perNlDay,
    projection, trend, missing,
    months: [...months].map(([key, t]) => ({ month: key, ...finish(t) })),
    today: todayRow ? { am: todayRow.am, pm: todayRow.pm, commute: todayRow.commute, weekend: todayRow.weekend, url: todayRow.url } : null,
    minimum: cfg.beMinimum, start: cfg.start
  };
}

// ============================== Health ==============================

// workouts: Workouts pages; metrics: Body Metrics pages; today: 'YYYY-MM-DD'.
// The boss-battle form, as the Quest Engine scores a workout attack
// (quest-engine src/rules/attack.js): Fitness is a 44-day and Fatigue a 7-day
// moving average of each workout's Effort Score, written by the Strava sync.
// Form = fatigue / fitness; decayed to today the same way the Engine does for
// an attack that is not a workout.
export function formState(fitness, fatigue) {
  const form = fitness > 0 ? fatigue / fitness : 0;
  return fitness < 5 || form < 0.8 ? 'Rusty' : form <= 1.5 ? 'Steady' : form <= 2 ? 'Building' : 'Overreaching';
}
const FORM_BONUS = { Steady: 1.10, Building: 1.15 };

export function battleForm(sessions, today) {
  const scored = sessions.filter(s => s.fitness !== null && s.fitness !== undefined);
  const last = scored[scored.length - 1];
  if (!last) return null;
  const days = Math.max(0, daysBetween(last.date, today));
  const fitness = last.fitness * Math.pow(1 - 1 / 44, days);
  const fatigue = (last.fatigue || 0) * Math.pow(1 - 1 / 7, days);
  const state = formState(fitness, fatigue);
  const since = addDays(today, -7 * 13);
  return {
    state, ratio: round(fitness > 0 ? fatigue / fitness : 0, 2), fitness: round(fitness), fatigue: round(fatigue),
    bonus: FORM_BONUS[state] || 1, last_workout: last.date, days_since: days,
    series: scored.filter(s => s.date >= since).map(s => ({ date: s.date, ratio: s.ratio !== null ? s.ratio : round(s.fitness > 0 ? (s.fatigue || 0) / s.fitness : 0, 2), fitness: s.fitness, fatigue: s.fatigue, state: s.form })),
    recent: scored.slice(-6).reverse().map(s => ({ date: s.date, name: s.name, type: s.type, effort: s.effort, level: s.level, mult: s.mult, special: s.special, url: s.url }))
  };
}

export function health(workouts, metrics, today, cfg = TRAINING) {
  const sessions = workouts
    .map(w => ({ date: dateOf(w, 'start_date_local').slice(0, 10), sport: SPORTS[sel(w, 'sport_type_mapped')] || null, hours: (num(w, 'moving_time') || 0) / 3600, fitness: num(w, 'Fitness'), fatigue: num(w, 'Fatigue'), form: sel(w, 'Form State'), ratio: num(w, 'Form'), effort: num(w, 'Effort Score'), level: sel(w, 'Effort Level'), mult: num(w, 'Effort Multiplier'), special: (prop(w, 'Special Move').rich_text || []).map(t => t.plain_text).join(''), type: sel(w, 'sport_type_mapped'), name: (prop(w, 'name').title || []).map(t => t.plain_text).join(''), url: (prop(w, 'strava_url').url) || w.url || '' }))
    .filter(s => s.date && s.date <= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const training = sessions.filter(s => s.sport);

  // Monday-start weeks. The current week is partial and shown on its own.
  const thisWeek = mondayOf(today);
  const weekStarts = [];
  for (let i = cfg.recentWeeks + cfg.baselineWeeks; i >= 1; i--) weekStarts.push(addDays(thisWeek, -7 * i));
  const weekOf = s => mondayOf(s.date);
  const weeks = weekStarts.map(start => {
    const w = training.filter(s => weekOf(s) === start);
    const by = sport => w.filter(s => s.sport === sport).length;
    return { week: start, sessions: w.length, hours: round(w.reduce((a, s) => a + s.hours, 0), 2), run: by('run'), bike: by('bike'), swim: by('swim'), strength: by('strength') };
  });
  const recent = weeks.slice(-cfg.recentWeeks), baseline = weeks.slice(0, cfg.baselineWeeks);
  const avg = (list, key) => (list.length ? round(list.reduce((a, w) => a + w[key], 0) / list.length, 1) : null);
  const current = training.filter(s => weekOf(s) === thisWeek);

  const lastOf = sport => { const s = training.filter(x => x.sport === sport).pop(); return s ? { date: s.date, days_ago: daysBetween(s.date, today), name: s.name } : null; };
  const sports = Object.fromEntries(['run', 'bike', 'strength', 'swim'].map(sport => [sport, {
    last: lastOf(sport), recent_per_week: avg(recent, sport), baseline_per_week: avg(baseline, sport)
  }]));

  // Streaks: consecutive full weeks, counting back from last week.
  const streak = test => { let n = 0; for (let i = weeks.length - 1; i >= 0 && test(weeks[i]); i--) n++; return n; };
  const streaks = { hours: streak(w => w.hours >= cfg.weeklyHours), runs: streak(w => w.run >= cfg.runsPerWeek), active: streak(w => w.sessions > 0) };

  // Body metrics, newest last.
  const body = metrics
    .map(m => ({ date: dateOf(m, 'Date').slice(0, 10), weight: num(m, 'Weight'), fat: num(m, 'Body Fat %'), hr: num(m, 'Heart Rate') }))
    .filter(m => m.date && m.date <= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = key => { const m = body.filter(x => x[key] !== null).pop(); return m ? { value: round(m[key], 1), date: m.date } : null; };
  // Change over ~30 days: latest against the reading nearest to 30 days before it.
  const change30 = key => {
    const list = body.filter(x => x[key] !== null);
    if (list.length < 2) return null;
    const last = list[list.length - 1];
    const target = addDays(last.date, -30);
    const prior = list.filter(x => x.date <= addDays(last.date, -14)).reduce((best, x) => (!best || Math.abs(daysBetween(x.date, target)) < Math.abs(daysBetween(best.date, target)) ? x : best), null);
    return prior ? { delta: round(last[key] - prior[key], 1), from: prior.date } : null;
  };
  const weight = { latest: latest('weight'), change_30d: change30('weight'), series: body.filter(x => x.weight !== null).slice(-30).map(x => ({ date: x.date, value: round(x.weight, 1) })) };
  const bodyFat = { latest: latest('fat'), change_30d: change30('fat'), target: cfg.bodyFatTarget, series: body.filter(x => x.fat !== null).slice(-30).map(x => ({ date: x.date, value: round(x.fat, 1) })) };
  const lastWorkout = sessions[sessions.length - 1] || null;
  const load = battleForm(sessions, today);

  const flags = [];
  const recentSessions = avg(recent, 'sessions'), baseSessions = avg(baseline, 'sessions');
  if (baseSessions && recentSessions !== null && recentSessions < 0.75 * baseSessions) flags.push(flag('watch', 'Training frequency has fallen', `${recentSessions} sessions a week over the last ${cfg.recentWeeks} weeks, against ${baseSessions} in the ${cfg.baselineWeeks} weeks before.`));
  const recentHours = avg(recent, 'hours');
  const shortWeeks = streak(w => w.hours < cfg.weeklyHours);
  if (recentHours !== null && recentHours < cfg.weeklyHours) flags.push(flag(shortWeeks >= 3 ? 'attention' : 'watch', 'Training hours below target', `${recentHours} h a week over the last ${cfg.recentWeeks} weeks; target ${cfg.weeklyHours} h. ${shortWeeks} week${shortWeeks === 1 ? '' : 's'} in a row under target.`));
  const runs = sports.run;
  if (!runs.last || runs.last.days_ago > 14) flags.push(flag('attention', 'No run in over two weeks', runs.last ? `Last run ${runs.last.days_ago} days ago (${runs.last.date}).` : 'No run recorded.'));
  else if (runs.recent_per_week !== null && runs.recent_per_week < cfg.runsPerWeek) flags.push(flag('watch', 'Runs below 2 a week', `${runs.recent_per_week} runs a week over the last ${cfg.recentWeeks} weeks.`));
  const strength = sports.strength.last;
  const strengthDays = strength ? strength.days_ago : Infinity;
  if (strengthDays > cfg.strengthWatchDays) flags.push(flag(strengthDays > cfg.strengthAttentionDays ? 'attention' : 'watch', 'No recent strength training', strength ? `Last strength session ${strength.days_ago} days ago.` : 'No strength session in the last 12 weeks.'));
  if (bodyFat.latest && bodyFat.change_30d && bodyFat.latest.value > cfg.bodyFatTarget && bodyFat.change_30d.delta >= 0.5) flags.push(flag('watch', 'Body fat moving away from target', `${bodyFat.latest.value}% (+${bodyFat.change_30d.delta} since ${bodyFat.change_30d.from}); target about ${cfg.bodyFatTarget}%.`));
  const lastWeighIn = body.length ? daysBetween(body[body.length - 1].date, today) : null;
  if (lastWeighIn !== null && lastWeighIn > 14) flags.push(flag('watch', 'No weigh-in for two weeks', `Last Withings measurement ${lastWeighIn} days ago, so weight and body-fat trends are stale.`));

  return {
    status: worst(...flags.map(f => f.level)),
    flags,
    targets: { weekly_hours: cfg.weeklyHours, runs_per_week: cfg.runsPerWeek, body_fat: cfg.bodyFatTarget },
    this_week: { hours: round(current.reduce((a, s) => a + s.hours, 0), 2), sessions: current.length, runs: current.filter(s => s.sport === 'run').length, days_left: 6 - ((weekday(today) + 6) % 7) },
    recent: { sessions: recentSessions, hours: recentHours }, baseline: { sessions: baseSessions, hours: avg(baseline, 'hours') },
    weeks, sports, streaks, weight, body_fat: bodyFat, load, last_weigh_in_days: lastWeighIn,
    // Not in any database the Worker can read yet.
    missing_sources: ['sleep', 'recovery', 'resting_hr'].filter(k => k !== 'resting_hr' || !body.some(x => x.hr !== null)),
    resting_hr: latest('hr')
  };
}

// ============================ System health ============================

const hoursSince = (iso, now) => (iso ? (now - Date.parse(iso)) / 3600000 : Infinity);
const amsterdam = (now, opts) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', ...opts }).format(new Date(now));
export const amsterdamDay = now => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date(now));
const amsterdamMinutes = now => { const [h, m] = amsterdam(now, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).split(':').map(Number); return h * 60 + m; };

// status: the Quest Engine's GET /status (null when it cannot be reached);
// checks: healthchecks.io checks (null when unavailable); ledger: the Quest
// Engine's GET /ledger; latest: newest Workouts and Body Metrics rows
// ({ created }). The Quest Engine's switches come from its status.
export function system({ status, checks, ledger, latest }, now = Date.now()) {
  const on = key => (status && status[key] ? '1' : '0');
  const env = { JOURNAL_ENABLED: on('journal_enabled'), NIGHTLY_ENABLED: on('nightly_enabled'), VAULT_ENABLED: on('vault_enabled'), FAMILY_ENABLED: on('family_enabled') };
  const today = amsterdamDay(now);
  const minutes = amsterdamMinutes(now);
  const check = slug => (checks || []).find(c => c.slug === slug) || null;
  const fromCheck = c => (!c ? null : c.status === 'down' ? 'attention' : c.status === 'grace' ? 'watch' : 'ok');
  const processes = [];
  const add = (p) => processes.push({ ...p, level: p.level || 'ok' });
  const s = status || {};

  // The boss card is rebuilt from Notion when opened and checked once an hour
  // by the timer (quest-engine PR #12). checked_at moves on every check, even
  // when nothing changed; built_at only when the card changed (older Engines
  // only send built_at).
  const checkedAt = s.checked_at || s.built_at;
  const checked = hoursSince(checkedAt, now);
  const late = checked > ENGINE.attentionHours ? 'attention' : checked > ENGINE.watchHours ? 'watch' : 'ok';
  add({ key: 'engine', name: 'Quest Engine', detail: 'Cloudflare Worker: 2-minute timer; boss card rebuilt when opened and checked hourly', last_ok: checkedAt || null,
    level: !status ? 'attention' : worst(late, fromCheck(check('heartbeat')) || 'ok'),
    problem: !status ? 'The Quest Engine did not answer GET /status. Check the Cloudflare dashboard (quest-engine → Observability).' : late !== 'ok' ? `Boss card last checked against Notion ${Math.round(checked * 60)} minutes ago; the hourly check may have stopped.` : check('heartbeat') && check('heartbeat').status === 'down' ? 'healthchecks.io has not heard the hourly heartbeat.' : '' });

  // Journal chain (03:00) and the quest steps inside it.
  const chain = s.journal_chain || {};
  const chainToday = chain.day === today;
  const chainOverdue = minutes >= 4 * 60 && !(chainToday && chain.complete);
  add({ key: 'journal', name: 'Journal automation', detail: 'Digest and morning setup, 03:00', last_ok: chainToday && chain.complete ? chain.at : (chain.complete ? chain.at : null), enabled: env.JOURNAL_ENABLED === '1',
    level: env.JOURNAL_ENABLED !== '1' ? 'ok' : worst(chainOverdue ? 'attention' : 'ok', fromCheck(check('journal')) || 'ok'),
    problem: env.JOURNAL_ENABLED === '1' && chainOverdue ? `Today's journal chain has not completed${chainToday ? ': ' + Object.entries(chain.done || {}).map(([k, v]) => `${k} ${v}`).join(', ') : ''}. Check POST /journal dry=1 and the Observability logs.` : '' });
  const questDone = chainToday && chain.done && (chain.done.digest === 'skipped' || (chain.done.match && chain.done.questboard));
  add({ key: 'quests', name: 'Quest processing', detail: 'Quest match and Questboard, after the digest', last_ok: questDone ? chain.at : null, enabled: env.JOURNAL_ENABLED === '1',
    level: env.JOURNAL_ENABLED === '1' && minutes >= 4 * 60 && !questDone ? 'attention' : 'ok',
    problem: env.JOURNAL_ENABLED === '1' && minutes >= 4 * 60 && !questDone ? 'Quest match or Questboard did not run today (they wait for a successful digest).' : '' });

  // Nightly run (04:00): progression, recovery, boss spawn, hero card.
  const nightly = s.nightly || {};
  const nightlyToday = nightly.at && amsterdamDay(Date.parse(nightly.at)) === today;
  const nightlyOverdue = minutes >= 5 * 60 && !nightlyToday;
  add({ key: 'boss', name: 'Boss system and Main Quest', detail: 'Nightly run 04:00: level, recovery, boss spawn, hero card', last_ok: nightly.at || null, enabled: env.NIGHTLY_ENABLED === '1',
    level: env.NIGHTLY_ENABLED !== '1' ? 'ok' : worst(nightlyOverdue ? 'attention' : 'ok', fromCheck(check('nightly')) || 'ok'),
    problem: env.NIGHTLY_ENABLED === '1' && nightlyOverdue ? "Today's 04:00 run has not finished. Check POST /nightly dry=1 and the logs." : '' });

  // VaultQuest (Mondays).
  const vault = s.vault_monday || {};
  const vaultAge = hoursSince(vault.at, now) / 24;
  add({ key: 'vault', name: 'VaultQuest', detail: 'Monday evaluation after 04:00', last_ok: vault.at || null, enabled: env.VAULT_ENABLED === '1',
    level: env.VAULT_ENABLED === '1' && vaultAge > 8 ? 'watch' : worst('ok', fromCheck(check('monday')) || 'ok'),
    problem: env.VAULT_ENABLED === '1' && vaultAge > 8 ? 'The Monday evaluation has not run for over a week.' : '' });

  // Family Dashboard (05:30–07:00).
  const family = s.family_jobs || {};
  const familyToday = family.at && amsterdamDay(Date.parse(family.at)) === today;
  const familyErrors = Object.entries((family.report) || {}).filter(([, r]) => r && r.error).map(([k, r]) => `${k}: ${r.error}`);
  // family_from: the first morning the Quest Engine runs them (Make runs them before that).
  const familyFrom = status && status.family_from;
  const familyOn = env.FAMILY_ENABLED === '1' && !(familyFrom && today < familyFrom);
  add({ key: 'family', name: 'Family Dashboard', detail: familyOn ? 'Chores, rollover, metrics, boss and image, 05:30–07:00' : env.FAMILY_ENABLED === '1' ? `Moves to the Quest Engine on ${familyFrom}; Make runs it until then` : 'Not on the Quest Engine (FAMILY_ENABLED off)', last_ok: family.at || null, enabled: familyOn,
    level: !familyOn ? 'ok' : worst(familyErrors.length ? 'watch' : 'ok', minutes >= 8 * 60 && !familyToday ? 'attention' : 'ok', fromCheck(check('family-morning')) || 'ok'),
    problem: familyOn ? (familyErrors.join('; ') || (minutes >= 8 * 60 && !familyToday ? "This morning's family jobs have not run." : '')) : '' });

  // Image and video Workflows.
  const visuals = check('visuals');
  add({ key: 'visuals', name: 'Images and clips', detail: 'Goku, boss, quest, Vault and family visuals', last_ok: visuals && visuals.last_ping || null,
    level: fromCheck(visuals) || 'ok', problem: visuals && visuals.status === 'down' ? 'The last image or clip run failed (healthchecks.io). See Cloudflare → Workflows.' : '' });

  // Dashboard publishing: the cards the Worker serves.
  const vaultPub = hoursSince(s.vault_published && s.vault_published.at, now);
  add({ key: 'publish', name: 'Dashboard publishing', detail: 'Boss, Main Quest, Questboard and Vault cards served by the Quest Engine', last_ok: checkedAt || null,
    // Unknown, not failing, when the Quest Engine itself did not answer.
    level: !status ? 'unknown' : late === 'attention' ? 'attention' : 'ok', problem: !status ? 'Unknown while the Quest Engine does not answer.' : late === 'attention' ? 'The cards are not being rebuilt.' : '',
    note: s.vault_published ? `Vault card last published ${Math.round(vaultPub)} h ago` : '' });

  // The Strava and Withings syncs (in the Quest Engine since 30 Sep; Make
  // before), judged by their newest Notion row and their healthchecks.io check.
  for (const [key, name, cfg, row] of [['strava', 'Workout / Strava sync', SYNCS.strava, latest && latest.workout], ['withings', 'Health / Withings sync', SYNCS.withings, latest && latest.metric]]) {
    const age = row && row.created ? hoursSince(row.created, now) / 24 : Infinity;
    const stale = age > cfg.attentionDays ? 'attention' : age > cfg.watchDays ? 'watch' : 'ok';
    const failing = check(key) && check(key).status === 'down';
    add({ key, name, detail: `Quest Engine (was Make ${cfg.wasMake}); judged by the newest Notion row and the ${key} check`, last_ok: row && row.created || null,
      level: worst(stale, fromCheck(check(key)) || 'ok'),
      problem: failing ? `healthchecks.io reports the ${key} sync failing. See GET /status (${key}) and the Quest Engine logs.`
        : stale === 'ok' ? '' : `No new ${key === 'strava' ? 'workout' : 'measurement'} for ${Number.isFinite(age) ? Math.floor(age) + ' days' : 'a long time'}. If you ${key === 'strava' ? 'trained' : 'weighed in'} since, the Quest Engine's ${key} sync has stopped.` });
  }

  // Failures from the ledger (every job report since the ledger started).
  const events = (ledger && ledger.jobs) || [];
  const failed = hours => events.filter(e => !e.ok && now - Date.parse(e.at) <= hours * 3600000);
  const failures = { last_24h: failed(24).length, last_7d: failed(24 * 7).length, recent: failed(24 * 7).slice(-5).reverse(), since: (ledger && ledger.since) || null };

  // API / AI usage and estimated cost.
  const usage = usageSummary(ledger && ledger.usage, today);
  const flags = processes.filter(p => p.level !== 'ok').map(p => flag(p.level, p.name, p.problem || 'healthchecks.io reports a problem.'));
  if (failures.last_24h >= 3) flags.push(flag('watch', `${failures.last_24h} failed job runs in 24 h`, failures.recent.map(f => `${f.slug}: ${f.message}`).slice(0, 2).join('; ')));
  if (usage.spike) flags.push(flag('watch', 'Unusual API usage today', usage.spike));
  if (checks === null) flags.push(flag('watch', 'healthchecks.io not readable', 'The check states could not be read; only the Quest Engine\'s own state is shown.'));
  if (status && ledger === null) flags.push(flag('watch', 'Quest Engine ledger not readable', 'GET /ledger did not answer, so failure counts and API usage are missing. Check the QUEST_ENGINE_TOKEN secret.'));

  return {
    status: worst(...flags.map(f => f.level)),
    flags, processes, failures, usage,
    checks: (checks || []).map(c => ({ slug: c.slug, name: c.name, status: c.status, last_ping: c.last_ping }))
  };
}

// usage: { months: { 'YYYY-MM': counters }, days: { 'YYYY-MM-DD': counters } }.
export function estimateCost(c = {}) {
  return round((c.chat_in || 0) / 1e6 * PRICES.chatInputPerMillion + (c.chat_out || 0) / 1e6 * PRICES.chatOutputPerMillion +
    (c.image_high || 0) * PRICES.imageHigh + (c.image_medium || 0) * PRICES.imageMedium + (c.video || 0) * PRICES.video, 2);
}

// Adds counters from several ledgers (the Quest Engine's and this dashboard's own).
export function mergeUsage(...usages) {
  const out = { since: null, months: {}, days: {} };
  for (const u of usages.filter(Boolean)) {
    if (u.since && (!out.since || u.since < out.since)) out.since = u.since;
    for (const kind of ['months', 'days']) {
      for (const [k, c] of Object.entries(u[kind] || {})) {
        out[kind][k] = { ...(out[kind][k] || {}) };
        for (const [n, v] of Object.entries(c)) out[kind][k][n] = (out[kind][k][n] || 0) + v;
      }
    }
  }
  return out;
}

export function usageSummary(usage, today) {
  const months = (usage && usage.months) || {};
  const days = (usage && usage.days) || {};
  const key = today.slice(0, 7);
  const prevKey = (() => { const [y, m] = key.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; })();
  const month = months[key] || {};
  const calls = c => (c.chat_calls || 0) + (c.images || 0) + (c.video || 0);
  const history = Object.entries(days).filter(([d]) => d < today).sort().slice(-14).map(([, c]) => estimateCost(c));
  const median = history.length ? [...history].sort((a, b) => a - b)[Math.floor(history.length / 2)] : 0;
  const todayCost = estimateCost(days[today] || {});
  const spike = history.length >= 5 && todayCost >= 1 && todayCost > 3 * Math.max(median, 0.1)
    ? `Estimated $${todayCost} today against a usual $${median} a day.` : '';
  return {
    month: key, calls: calls(month), chat_calls: month.chat_calls || 0, images: month.images || 0, videos: month.video || 0,
    tokens: (month.chat_in || 0) + (month.chat_out || 0),
    cost: estimateCost(month), previous_cost: months[prevKey] ? estimateCost(months[prevKey]) : null,
    today_cost: todayCost, spike, since: (usage && usage.since) || null
  };
}

// ============================== Overview ==============================

export function overview({ cross, health: h, system: sys }) {
  const areas = [
    { key: 'cross', name: 'Cross border', status: cross ? cross.status : 'unknown', flags: cross ? cross.flags : [] },
    { key: 'health', name: 'Health', status: h ? h.status : 'unknown', flags: h ? h.flags : [] },
    { key: 'system', name: 'System health', status: sys ? sys.status : 'unknown', flags: sys ? sys.flags : [] }
  ];
  const drifting = areas.flatMap(a => a.flags.map(f => ({ area: a.key, area_name: a.name, ...f })))
    .sort((a, b) => RANK[b.level] - RANK[a.level]);
  return { areas, drifting, status: worst(...areas.map(a => a.status)) };
}
