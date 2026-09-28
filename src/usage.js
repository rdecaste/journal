// The Store (src/store.js) as seen from the Worker.
export const store = env => env.STORE.get(env.STORE.idFromName('main'));

// Counts one paid call by the dashboard, in the same shape as the Quest
// Engine's ledger usage, so the two can be added up.
export function addUsage(usage, counters, now = Date.now()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date(now));
  const next = { since: (usage && usage.since) || new Date(now).toISOString(), months: { ...(usage && usage.months) }, days: { ...(usage && usage.days) } };
  const bump = (bucket = {}) => { const out = { ...bucket }; for (const [k, v] of Object.entries(counters)) out[k] = (out[k] || 0) + v; return out; };
  next.months[day.slice(0, 7)] = bump(next.months[day.slice(0, 7)]);
  next.days[day] = bump(next.days[day]);
  return next;
}
