// Rerun a scheduled Quest Engine job from the System health tab (Roy, 2 Oct
// 2026: no more command line for this). Only the scheduled jobs whose rerun
// is safe are here; each goes to the Quest Engine through the service
// binding with the dashboard's QUEST_ENGINE_TOKEN. Jobs that would count
// twice if run twice (the nightly level and recovery, yesterday's win) only
// run when today's run is missing; the Vault Monday evaluation, the family
// rollover and the family images are left out.
//
// `force: true` redoes a step already done today. `paid` marks a job that
// makes an OpenAI call.
export const JOBS = {
  'journal-win': { process: 'journal', name: 'Yesterday’s win', note: 'Goku takes a hit if yesterday’s win wasn’t done; never twice', path: '/journal', fields: { only: 'win' } },
  'journal-digest': { process: 'journal', name: 'Digest', note: 'Reads yesterday’s journal and writes the Agent Digest and updates', path: '/journal', fields: { only: 'digest', force: '1' }, paid: true },
  'journal-setup': { process: 'journal', name: 'Morning setup', note: 'Morning Spark and today’s questions, from the digests', path: '/journal', fields: { only: 'setup', force: '1' }, paid: true },
  'journal-notes': { process: 'journal', name: 'Quest log notes', note: 'The 💬 lines on the Quest log page', path: '/journal', fields: { only: 'notes', force: '1' }, paid: true },
  'quests-match': { process: 'quests', name: 'Quest match', note: 'Yesterday’s updates against each active quest', path: '/journal', fields: { only: 'match', force: '1' }, paid: true },
  'quests-board': { process: 'quests', name: 'Questboard', note: 'Rebuilds the Questboard card', path: '/journal', fields: { only: 'questboard', force: '1' } },
  'boss-nightly': { process: 'boss', name: 'Nightly run', note: 'Level, recovery, boss spawn check and hero card; only if it hasn’t run today', path: '/nightly', fields: {}, paid: true },
  'family-chores': { process: 'family', name: 'Chores', note: 'Today’s chores; ones already there are kept', path: '/family/run', fields: { job: 'chores' } },
  'family-metrics': { process: 'family', name: 'Metrics', note: 'The family page’s numbers', path: '/family/run', fields: { job: 'metrics' } },
  'family-boss': { process: 'family', name: 'Family boss', note: 'Publishes the family boss', path: '/family/run', fields: { job: 'boss' } },
  'visuals-quests': { process: 'visuals', name: 'Quest art', note: 'New art for quests flagged Refresh visual', path: '/questvisuals', fields: {}, paid: true },
  'publish-boss': { process: 'publish', name: 'Boss card', note: 'Rebuilds the boss card from D1', path: '/refresh', fields: { reason: 'Admin dashboard' }, dry: false },
  'publish-vault': { process: 'publish', name: 'Vault card', note: 'Rebuilds the Vault card from D1', path: '/vault/publish', fields: { reason: 'Admin dashboard' } },
  'strava-sync': { process: 'strava', name: 'Strava catch-up', note: 'Activities of the last 2 days', path: '/strava/sync', fields: { days: '2' } },
  'withings-sync': { process: 'withings', name: 'Withings catch-up', note: 'Body metrics of the last 2 days', path: '/withings/sync', fields: { days: '2' } }
};

// The journal steps read yesterday, which is only over at 03:00 Amsterdam.
const JOURNAL_DAY_START = 3;
const amsterdamHour = now => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hourCycle: 'h23' }).format(new Date(now)));

// What the page shows under a process: its jobs, without the wiring.
export function jobsFor(process) {
  return Object.entries(JOBS).filter(([, j]) => j.process === process)
    .map(([id, j]) => ({ id, name: j.name, note: j.note, paid: !!j.paid, dry: j.dry !== false }));
}

// One line about what came back, for the page.
export function summarize(body) {
  if (!body || body.ok !== 1) return { ok: false, text: (body && (body.message || body.code)) || 'The Quest Engine said no.' };
  const report = body.report !== undefined ? body.report : body;
  const errors = [];
  const walk = (v, key) => {
    if (!v || typeof v !== 'object') return;
    if (typeof v.error === 'string') errors.push((key ? key + ': ' : '') + v.error);
    for (const [k, x] of Object.entries(v)) if (k !== 'error') walk(x, k);
  };
  walk(report, '');
  if (errors.length) return { ok: false, text: errors.slice(0, 2).join('; ') };
  const steps = report && report.steps ? Object.values(report.steps) : [];
  const step = steps.length === 1 ? steps[0] : null;
  if (step === 'done earlier') return { ok: true, text: 'Already done today; nothing was changed.' };
  const skipped = (step && step.skipped) || (report && report.skipped);
  if (skipped) return { ok: true, text: 'Skipped: ' + skipped + '.' };
  return { ok: true, text: 'Done.' };
}

export async function runJob(env, id, { dry = false, now = Date.now() } = {}) {
  const job = Object.prototype.hasOwnProperty.call(JOBS, id) ? JOBS[id] : null;
  if (!job) throw Object.assign(new Error('No such job'), { code: 'bad_request' });
  if (dry && job.dry === false) throw Object.assign(new Error('This job has no test run'), { code: 'bad_request' });
  if (!env.QUEST_ENGINE_TOKEN) throw Object.assign(new Error('QUEST_ENGINE_TOKEN is not set on the dashboard'), { code: 'not_set' });
  if (job.path === '/journal' && !dry && amsterdamHour(now) < JOURNAL_DAY_START) {
    return { ok: false, text: 'The journal day ends at 03:00. Run this after 03:00.' };
  }
  const form = new URLSearchParams({ ...job.fields, ...(dry ? { dry: '1' } : {}) });
  const request = new Request(`${env.QUEST_ENGINE_URL}${job.path}`, {
    method: 'POST',
    headers: { 'X-Admin-Token': env.QUEST_ENGINE_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: form.toString()
  });
  const r = await (env.QUEST_ENGINE ? env.QUEST_ENGINE.fetch(request) : fetch(request));
  const body = await r.json().catch(() => null);
  if (!body) return { ok: false, text: `The Quest Engine answered ${r.status} without a report.` };
  const out = summarize(body);
  if (dry && out.ok) out.text = 'Test run: nothing was changed. ' + (out.text === 'Done.' ? 'It would run.' : out.text);
  return out;
}
