// The Vault check-in on the journal page: read and answered through the Quest
// Engine's /vault/watch with the dashboard's token, drawn under the main quest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vaultView, readVault, answerVault } from '../src/vault.js';
import { journalHtml } from '../src/journalpage.js';

const WATCH = {
  today: '2026-10-11', today_status: 'spent', today_spent: { amount: 24, what: 'Takeaway' }, streak: 0,
  fire: { logs: 8, peak: 20, today: -6, weather: { key: 'rain', name: 'Rain', line: 'Rain is coming. A spend burns double; no answer burns 2.', held: 1 }, nights: [] }
};

function engineEnv(answer) {
  const sent = [];
  return {
    sent,
    env: {
      QUEST_ENGINE_URL: 'https://qe.example', QUEST_ENGINE_TOKEN: 'tok',
      QUEST_ENGINE: { fetch: async req => {
        sent.push({ method: req.method, url: req.url, token: req.headers.get('X-Admin-Token'), body: req.method === 'POST' ? Object.fromEntries(new URLSearchParams(await req.text())) : null });
        return new Response(JSON.stringify(answer));
      } }
    }
  };
}

test('vault view: only what the page draws; null without a watch', () => {
  assert.deepEqual(vaultView(WATCH), {
    today: '2026-10-11', status: 'spent', spent: { amount: 24, what: 'Takeaway' }, logs: 8, streak: 0,
    weather: { key: 'rain', name: 'Rain', line: 'Rain is coming. A spend burns double; no answer burns 2.' }
  });
  assert.equal(vaultView(null), null);
  assert.equal(vaultView({}), null);
});

test('vault: reads GET /vault/watch with the token; not switched on is no card', async () => {
  const a = engineEnv({ ok: 1, watch: WATCH });
  assert.equal((await readVault(a.env)).logs, 8);
  assert.deepEqual(a.sent[0], { method: 'GET', url: 'https://qe.example/vault/watch', token: 'tok', body: null });
  assert.equal(await readVault(engineEnv({ ok: 0, code: 'not_ready' }).env), null);
});

test('vault: answers through POST /vault/watch; amount and what only for a spend', async () => {
  const a = engineEnv({ ok: 1, code: 'held', message: 'Line held. +1 log on the fire (9).', watch: { ...WATCH, today_status: 'held', today_spent: null, fire: { ...WATCH.fire, logs: 9 } } });
  const r = await answerVault(a.env, { status: 'held', amount: '5', what: 'x' });
  assert.deepEqual(a.sent[0].body, { status: 'held' });
  assert.equal(r.ok, 1);
  assert.equal(r.message, 'Line held. +1 log on the fire (9).');
  assert.equal(r.vault.status, 'held');
  await answerVault(a.env, { status: 'spent', amount: '12,50', what: 'Lunch out' });
  assert.deepEqual(a.sent[1].body, { status: 'spent', amount: '12,50', what: 'Lunch out' });
  const no = await answerVault(engineEnv({ ok: 0, code: 'bad_input', message: 'What was it for?' }).env, { status: 'spent', amount: '3' });
  assert.deepEqual([no.ok, no.message], [0, 'What was it for?']);
  await assert.rejects(answerVault(a.env, { status: 'breach' }), e => e.code === 'bad_request');
  await assert.rejects(answerVault({ QUEST_ENGINE_URL: 'x' }, { status: 'held' }), e => e.code === 'not_set');
});

test('journal page: the Vault card sits under the main quest, only when there is a watch', () => {
  const d = {
    day: '2026-10-11', page: 'p', title: '11 October 2026', url: null, errors: [], run: 3,
    sections: { headspace: { q: 'Q?', text: '', slot: {} }, forward: null, reflection: null, tomorrow: null },
    focus: {}, extras: {}, quests: [{ id: 'q', title: 'Get Back in Shape', icon: '💪', text: '', question: 'Q', slot: {} }],
    main_quest: 'Break the Cycle', last: null, suggestions: [], sub: { morning: 'm', evening: 'e' }
  };
  assert.ok(!journalHtml(d).includes('id="vault"'));
  const html = journalHtml({ ...d, vault: vaultView(WATCH) });
  const mq = html.indexOf('aria-label="Main quest check-in"'), v = html.indexOf('<h2>🔐 Vault</h2>'), q = html.indexOf('<h2>🗺️ Quests</h2>');
  assert.ok(mq > 0 && v > mq && q > v);
  assert.ok(html.includes('🌧️ Rain is coming.'));
  assert.ok(html.includes('🛡️ Held the line') && html.includes('💸 Spent'));
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
  assert.doesNotThrow(() => new Function(script));
});
