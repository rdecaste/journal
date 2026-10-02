// The gym page (GET /gym, src/gympage.js): Roy's Hevy workouts, through the
// Quest Engine, which holds the Hevy key and does the work (src/hevy.js in
// rdecaste/quest-engine). Everything goes through the QUEST_ENGINE service
// binding with the dashboard's QUEST_ENGINE_TOKEN:
//   GET  /gym           the page's data: the Hevy routines (fresh from Hevy),
//                       today's readiness and plan, the last workouts with
//                       their feedback, lift trends
//   POST /gym/generate  today's workout from a routine and how Roy feels,
//                       shown on the page (not yet in Hevy)
//   POST /gym/send      that workout into Hevy as the one "Today · …" routine
//   POST /gym/feedback  a workout's feedback (one OpenAI call)
//   POST /hevy/sync     the Hevy history into D1 (the first time all of it)
// Gym sessions themselves arrive with the Strava sync; nothing here is scheduled.

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

export async function loadGym(env) {
  if (!env.QUEST_ENGINE_TOKEN) return { error: 'QUEST_ENGINE_TOKEN is not set on the dashboard.' };
  try {
    const d = await engine(env, 'GET', '/gym');
    if (d.ok !== 1) return { error: d.message || d.code || 'The Quest Engine said no.' };
    return d;
  } catch (e) {
    console.error('gym', e && e.stack || e);
    return { error: String(e.message || e) };
  }
}

// The buttons, and the only fields each may send.
export const ACTIONS = {
  generate: { path: '/gym/generate', fields: b => ({ routine_id: String(b.routine_id || ''), ...(Number(b.feeling) >= 1 && Number(b.feeling) <= 5 ? { feeling: String(Math.round(Number(b.feeling))) } : {}), ...(b.routine_id === 'custom' ? { request: String(b.request || '').slice(0, 500) } : {}) }) },
  send: { path: '/gym/send', fields: b => ({ plan_id: String(b.plan_id || '') }) },
  feedback: { path: '/gym/feedback', fields: b => ({ workout_id: String(b.workout_id || ''), ...(b.force ? { force: '1' } : {}) }) },
  sync: { path: '/hevy/sync', fields: b => (b.full ? { full: '1' } : {}) }
};

export async function gymAction(env, action, body = {}) {
  const a = Object.prototype.hasOwnProperty.call(ACTIONS, action) ? ACTIONS[action] : null;
  if (!a) throw Object.assign(new Error('No such action'), { code: 'bad_request' });
  if (!env.QUEST_ENGINE_TOKEN) throw Object.assign(new Error('QUEST_ENGINE_TOKEN is not set on the dashboard'), { code: 'not_set' });
  if (action === 'generate' && !body.routine_id) throw Object.assign(new Error('Pick a template first'), { code: 'bad_request' });
  if (action === 'generate' && body.routine_id === 'custom' && !String(body.request || '').trim()) throw Object.assign(new Error('Say what you want to train today'), { code: 'bad_request' });
  const r = await engine(env, 'POST', a.path, a.fields(body));
  return r.ok === 1 ? r : { ok: 0, code: r.code || 'failed', message: r.message || 'The Quest Engine said no.' };
}
