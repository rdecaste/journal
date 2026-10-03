// Whether the journal page's morning and evening are folded (Roy, 3 Oct 2026):
// Start my day / End my day fold a half, and it stays folded, on every device,
// until Roy opens it again. Kept in the Store for the day only, as
// { day, m, e }; a new day starts with nothing kept.
import { store } from './usage.js';

export const FOLD_KEY = 'journal_fold';

// Today's record with a change applied; another day's record is dropped.
export function mergeFold(cur, day, patch = {}) {
  const base = cur && cur.day === day ? cur : { day, m: false, e: false };
  const next = { ...base, day };
  for (const w of ['m', 'e']) if (typeof patch[w] === 'boolean') next[w] = patch[w];
  return next;
}

// { m, e } for the day, or null when nothing was kept (the page then keeps what the browser knows).
export async function readFold(env, day) {
  if (!env.STORE) return null;
  const f = await store(env).get(FOLD_KEY);
  return f && f.day === day ? { m: !!f.m, e: !!f.e } : null;
}

export async function writeFold(env, day, patch) {
  if (!env.STORE) throw Object.assign(new Error('No Store'), { code: 'not_set' });
  const f = await store(env).fold(day, { m: patch && patch.m, e: patch && patch.e });
  return { m: !!f.m, e: !!f.e };
}
