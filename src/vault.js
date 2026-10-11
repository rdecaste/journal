// The Vault check-in on the journal page (Roy, 11 Oct 2026: "similar as to my
// main quest checkin"): the Vault card's Nightly Watch, "Held the line" or
// "Spent" (amount + what), one answer per game day (04:00 to 04:00). The
// Quest Engine keeps the watch (its src/vaultwatch.js: the campfire of logs,
// the night's weather, the streak, the Monday loot), so the page only reads
// GET /vault/watch and answers through POST /vault/watch, with the
// dashboard's QUEST_ENGINE_TOKEN; no Vault passcode here.
export const VAULT_STATUS = ['held', 'spent', 'clear'];

async function engine(env, method, fields) {
  if (!env.QUEST_ENGINE_TOKEN) throw Object.assign(new Error('QUEST_ENGINE_TOKEN is not set on the dashboard'), { code: 'not_set' });
  const request = new Request(`${env.QUEST_ENGINE_URL}/vault/watch`, {
    method,
    headers: { Accept: 'application/json', 'X-Admin-Token': env.QUEST_ENGINE_TOKEN, ...(fields ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    body: fields ? new URLSearchParams(fields).toString() : undefined
  });
  const r = await (env.QUEST_ENGINE ? env.QUEST_ENGINE.fetch(request) : fetch(request));
  const body = await r.json().catch(() => null);
  if (!body) throw new Error(`Quest Engine /vault/watch answered ${r.status}`);
  return body;
}

// What the page draws: today's answer, the fire and the night's weather; null
// when the Quest Engine has no watch (not switched on, or an older engine).
export function vaultView(w) {
  if (!w || !w.fire) return null;
  return {
    today: w.today || null,
    status: w.today_status || null,
    spent: w.today_spent || null,
    logs: typeof w.fire.logs === 'number' ? w.fire.logs : 0,
    weather: w.fire.weather ? { key: w.fire.weather.key || '', name: w.fire.weather.name || '', line: w.fire.weather.line || '' } : null,
    streak: typeof w.streak === 'number' ? w.streak : 0
  };
}

export async function readVault(env) {
  const body = await engine(env, 'GET');
  return body.ok ? vaultView(body.watch) : null;
}

// body: { status: held|spent|clear, amount?, what? } → the engine's answer
// ({ ok, code, message }) with the fresh view.
export async function answerVault(env, body) {
  const status = String(body && body.status || '');
  if (!VAULT_STATUS.includes(status)) throw Object.assign(new Error('Held the line, spent, or clear?'), { code: 'bad_request' });
  const fields = { status };
  if (status === 'spent') {
    fields.amount = String(body.amount ?? '').slice(0, 20);
    fields.what = String(body.what ?? '').slice(0, 120);
  }
  const r = await engine(env, 'POST', fields);
  return { ok: r.ok ? 1 : 0, code: r.code || '', message: r.message || '', vault: vaultView(r.watch) };
}
