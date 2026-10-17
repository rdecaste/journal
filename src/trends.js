// The trends page (GET /trends, src/trendspage.js): the last 13 weeks per
// sport, through the Quest Engine, which holds the stream metrics and writes
// the coach's note (src/trends.js in rdecaste/quest-engine). Everything goes
// through the QUEST_ENGINE service binding with the dashboard's
// QUEST_ENGINE_TOKEN:
//   GET  /trends         the page's data: the workouts with their metrics, the
//                        Hevy sessions and sets, the facts and the coach's note
//   POST /trends/coach   the coach's note again now (the Rewrite button)

async function engine(env, method, path, fields) {
  const request = new Request(`${env.QUEST_ENGINE_URL}${path}`, {
    method,
    headers: { Accept: 'application/json', 'X-Admin-Token': env.QUEST_ENGINE_TOKEN || '', ...(fields ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    body: fields ? new URLSearchParams(fields).toString() : undefined
  });
  const r = await (env.QUEST_ENGINE ? env.QUEST_ENGINE.fetch(request) : fetch(request));
  const body = await r.json().catch(() => null);
  if (!body) throw new Error(`Quest Engine ${path} answered ${r.status}`);
  return body;
}

export async function loadTrends(env) {
  if (!env.QUEST_ENGINE_TOKEN) return { error: 'QUEST_ENGINE_TOKEN is not set on the dashboard.' };
  try {
    const d = await engine(env, 'GET', '/trends');
    if (d.ok !== 1) return { error: d.message || d.code || 'The Quest Engine said no.' };
    return d;
  } catch (e) {
    console.error('trends', e && e.stack || e);
    return { error: String(e.message || e) };
  }
}

// The Rewrite button: the coach's note again, now.
export async function rewriteCoach(env) {
  if (!env.QUEST_ENGINE_TOKEN) throw Object.assign(new Error('QUEST_ENGINE_TOKEN is not set on the dashboard'), { code: 'not_set' });
  const r = await engine(env, 'POST', '/trends/coach', { force: '1' });
  return r.ok === 1 ? r : { ok: 0, code: r.code || 'failed', message: r.message || 'The Quest Engine said no.' };
}
