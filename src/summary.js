// The AI summary: one short OpenAI call a day, made the first time the
// dashboard opens after 07:30 Amsterdam time, and kept in the Store. Off
// unless ADMIN_AI is "1".

import { store, addUsage } from './usage.js';

export const SUMMARY_SYSTEM = [
  'You write the short morning note at the top of Roy\'s private dashboard. It covers three areas: his work days split between Belgium and the Netherlands, his health and training, and the automations that run his quest cards (which Claude looks after for him).',
  'Write like a thoughtful friend who has read the numbers: 2 to 4 short sentences in plain, everyday English, plain text, no lists or headings. Avoid jargon and system words such as status check, endpoint, sync, ledger, flag or baseline.',
  'Lead with what matters most today, then anything worth keeping an eye on, and mention a good trend when there is one. Only use a number when it helps, and round it.',
  'Technical problems are not Roy\'s job: say in one plain sentence what is not working and that it is one to hand to Claude. Never tell him to check logs, dashboards, settings or code.',
  'If there is something he can do himself (train, weigh in, fill in a missing work day, plan an office day), end with that one action. If there is none, do not invent one.',
  'Do not invent causes. No greetings, no motivational tone.'
].join(' ');

// The facts the model sees: the flags and a few headline figures, nothing raw.
export function summaryFacts(data) {
  const c = data.cross, h = data.health, s = data.system;
  return {
    date: data.today,
    drift: data.overview.drifting.map(f => `[${f.area_name}, ${f.level}] ${f.title}: ${f.why}`),
    cross_border: c && { be_share_ytd: c.ytd.be_share, minimum: c.minimum, buffer_nl_days: c.buffer_days, month_be_share: c.month.be_share, year_end_projection: c.projection && c.projection.year_end_be_share, unclassified_days: c.missing.length },
    health: h && { hours_per_week_recent: h.recent.hours, hours_per_week_baseline: h.baseline.hours, target_hours: h.targets.weekly_hours, sessions_recent: h.recent.sessions, sessions_baseline: h.baseline.sessions, runs_per_week: h.sports.run.recent_per_week, days_since_strength: h.sports.strength.last && h.sports.strength.last.days_ago, weight_change_30d: h.weight.change_30d && h.weight.change_30d.delta, body_fat: h.body_fat.latest && h.body_fat.latest.value, body_fat_change_30d: h.body_fat.change_30d && h.body_fat.change_30d.delta, body_fat_target: h.targets.body_fat, not_tracked: h.missing_sources },
    system: s && { problems: s.processes.filter(p => p.level !== 'ok').map(p => `${p.name}: ${p.problem}`), failures_24h: s.failures.last_24h, failures_7d: s.failures.last_7d, api_cost_month_estimate: s.usage.cost }
  };
}

const amsterdamMinutes = now => { const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(now)).split(':').map(Number); return h * 60 + m; };

export const summaryDue = (env, data, now = Date.now()) =>
  env.ADMIN_AI === '1' && !!env.OPENAI_API_KEY && !(data.summary && data.summary.day === data.today) && amsterdamMinutes(now) >= 7 * 60 + 30;

// force: rewritten on request from the page (Rewrite button), not the daily run.
export async function writeSummary(env, data, { force = false } = {}) {
  const s = store(env);
  if (force) {
    const last = await s.get('summary');
    if (last && Date.now() - Date.parse(last.at) < 60000) return last;
    await s.claim('summary_day', data.today);
  } else if (!(await s.claim('summary_day', data.today))) return null;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: env.CHAT_MODEL, max_completion_tokens: 300, messages: [{ role: 'system', content: SUMMARY_SYSTEM }, { role: 'user', content: JSON.stringify(summaryFacts(data)) }] })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${(body.error && body.error.message) || 'failed'}`);
  const text = String(body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content || '').trim();
  await s.put('usage', addUsage(await s.get('usage'), { chat_calls: 1, chat_in: (body.usage && body.usage.prompt_tokens) || 0, chat_out: (body.usage && body.usage.completion_tokens) || 0 }));
  if (!text) throw new Error('OpenAI returned no text');
  const summary = { day: data.today, at: new Date().toISOString(), text };
  await s.put('summary', summary);
  return summary;
}
