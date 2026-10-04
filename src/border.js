// POST /border/save: the Border days view on /admin (Cross Border tab, Roy
// 4 Oct 2026) saves the days Roy changed there. Each day is one Work Location
// Log row in D1: AM, PM and Commute, written the same way as the journal
// page's Commute drop-downs (writeWork in src/journal.js: an empty value
// clears the field, E-bike € follows Commute, a weekday without a row gets
// one). Weekends have no rows and are refused.
import { workFor, writeWork } from './journal.js';
import { healthStore } from './healthstore.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 400;
const isWeekday = day => { const d = new Date(day + 'T12:00:00Z').getUTCDay(); return d >= 1 && d <= 5; };
const bad = message => Object.assign(new Error(message), { code: 'bad_request' });

// body: { days: [{ date: 'YYYY-MM-DD', am, pm, commute }] } with the
// Work Location Log's own option names ('' clears). Returns the dates saved
// and, per date, what failed; one failing day doesn't stop the others.
export async function saveBorder(env, body, store = healthStore(env)) {
  const list = body && Array.isArray(body.days) ? body.days : null;
  if (!list || !list.length) throw bad('No days to save');
  if (list.length > MAX_DAYS) throw bad('Too many days at once');
  const saved = [], failed = [];
  for (const d of list) {
    const date = String(d && d.date || '');
    try {
      if (!DAY.test(date) || !isWeekday(date)) throw bad('Not a weekday');
      const row = await workFor(store, date);
      await writeWork(store, { id: row.id, am: str(d.am), pm: str(d.pm), commute: str(d.commute) });
      saved.push(date);
    } catch (e) {
      failed.push({ date, message: String(e.message || e) });
    }
  }
  return { ok: failed.length ? 0 : 1, saved, failed };
}
const str = v => (typeof v === 'string' ? v : undefined);
