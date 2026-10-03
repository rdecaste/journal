// Start my day / End my day on the journal page (Roy, 3 Oct 2026) register
// the Morning review / Evening review habit: a boss hit through the Quest
// Engine's POST /journal/review, which counts each at most once per game day
// (04:00 to 04:00 Amsterdam), so pressing again changes nothing.
export const WHICH = ['morning', 'evening'];

export async function registerReview(env, which) {
  if (!WHICH.includes(which)) throw Object.assign(new Error('No such review'), { code: 'bad_request' });
  if (!env.QUEST_ENGINE_TOKEN) throw Object.assign(new Error('QUEST_ENGINE_TOKEN is not set on the dashboard'), { code: 'not_set' });
  const request = new Request(`${env.QUEST_ENGINE_URL}/journal/review`, {
    method: 'POST',
    headers: { 'X-Admin-Token': env.QUEST_ENGINE_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ which }).toString()
  });
  const r = await (env.QUEST_ENGINE ? env.QUEST_ENGINE.fetch(request) : fetch(request));
  const body = await r.json().catch(() => null);
  if (!body) return { ok: 0, code: 'no_answer', message: `The Quest Engine answered ${r.status}.` };
  return { ok: body.ok ? 1 : 0, code: body.code || '', damage: body.damage, text: body.text || '' };
}
