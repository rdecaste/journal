// The systems the dashboard monitors, read over HTTP: the Quest Engine's
// status and ledger, and the healthchecks.io checks.

async function getJson(url, headers = {}, via = null) {
  const request = new Request(url, { headers: { Accept: 'application/json', ...headers } });
  const r = await (via ? via.fetch(request) : fetch(request));
  if (!r.ok) throw new Error(`${new URL(url).host}${new URL(url).pathname} answered ${r.status}`);
  return r.json();
}

// GET /status is open; GET /ledger needs the Quest Engine's ADMIN_TOKEN.
export const questEngineStatus = env => getJson(`${env.QUEST_ENGINE_URL}/status`, {}, env.QUEST_ENGINE);
export async function questEngineLedger(env) {
  if (!env.QUEST_ENGINE_TOKEN) throw new Error('QUEST_ENGINE_TOKEN is not set');
  return (await getJson(`${env.QUEST_ENGINE_URL}/ledger`, { 'X-Admin-Token': env.QUEST_ENGINE_TOKEN }, env.QUEST_ENGINE)).ledger;
}

// GET /recovery: Recovery today, worked out by the Quest Engine (one place for every dashboard).
export async function questEngineRecovery(env) {
  if (!env.QUEST_ENGINE_TOKEN) throw new Error('QUEST_ENGINE_TOKEN is not set');
  const { ok, ...recovery } = await getJson(`${env.QUEST_ENGINE_URL}/recovery`, { 'X-Admin-Token': env.QUEST_ENGINE_TOKEN }, env.QUEST_ENGINE);
  return recovery.date || recovery.stale ? recovery : null;
}

// Read-only API key of the healthchecks.io project.
export async function healthChecks(env) {
  if (!env.HEALTHCHECKS_API_KEY) throw new Error('HEALTHCHECKS_API_KEY is not set');
  const { checks } = await getJson('https://healthchecks.io/api/v3/checks/', { 'X-Api-Key': env.HEALTHCHECKS_API_KEY.trim() });
  return checks.map(c => ({ slug: c.slug, name: c.name, status: c.status, last_ping: c.last_ping }));
}
