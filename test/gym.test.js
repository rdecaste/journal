import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGym, gymAction } from '../src/gym.js';
import { gymHtml, setsLine, feedbackHtml, sparkline } from '../src/gympage.js';

// GET /gym as the Quest Engine answers it.
const gym = {
  ok: 1, day: '2026-10-02', connected: true, ai: true, routines_error: null,
  insight: { text: 'Fine for a normal session: HRV is a bit <low>, sleep was fine.', ai: true },
  templates: [{ id: 'r-push', title: 'Push <A>', exercises: 5 }, { id: 'r-pull', title: 'Pull', exercises: 4 }],
  readiness: { date: '2026-10-02', measured: true, verdict: 'steady', level: 'normal', feeling: null,
    hrv: { value: 41, usual: 50.2, low: true }, rhr: { value: 55, usual: 54.1, low: false }, sleep: { value: 7.5, usual: 7.4, low: false } },
  sent: null,
  plan: { id: 'p1', sent_at: null, routine_id: 'r-push', routine_title: 'Push <A>', briefing: 'HRV is down a bit, so match last time.',
    plan: { level: 'normal', exercises: [{ title: 'Bench Press (Barbell)', change: 'reps', reason: '80 kg again, one more rep on set 3.', cue: 'Elbows tucked',
      sets: [{ type: 'warmup', weight_kg: 40, reps: 10 }, { type: 'normal', weight_kg: 80, reps: 8 }, { type: 'normal', weight_kg: 80, reps: 8 }, { type: 'normal', weight_kg: 80, reps: 7 }],
      last: { day: '2026-09-28', sets: '80kg×8, 80kg×8, 80kg×7' } }] } },
  workouts: [
    { id: 'w1', title: 'Push', day: '2026-09-30', volume_kg: 2160, sets: 3, duration_min: 58, exercises: [{ title: 'Bench Press (Barbell)', sets: '90kg×8, 90kg×8, 90kg×8' }], feedback: '- Best bench yet.\n- Keep the pause <tight>.' },
    { id: 'w2', title: 'Pull', day: '2026-09-28', volume_kg: 1800, sets: 3, duration_min: 50, exercises: [], feedback: null }
  ],
  trends: [{ id: 'b', title: 'Bench Press (Barbell)', points: [{ day: '2026-09-01', e1rm: 100 }, { day: '2026-09-15', e1rm: 104 }, { day: '2026-09-30', e1rm: 114 }] }],
  history: { workouts: 120, since: '2025-01-05' },
  sync: { at: '2026-10-02T06:00:00Z', mode: 'changes' }
};

test('sets are grouped: "3 × 8 @ 80 kg"', () => {
  assert.equal(setsLine([{ weight_kg: 80, reps: 8 }, { weight_kg: 80, reps: 8 }, { weight_kg: 80, reps: 7 }]), '2 × 8 @ 80 kg, 7 @ 80 kg');
  assert.equal(setsLine([{ weight_kg: null, reps: 12 }, { weight_kg: null, reps: 12 }]), '2 × 12 reps');
  assert.equal(setsLine([{ weight_kg: null, reps: null, duration_seconds: 60 }]), '60s');
  assert.equal(setsLine([{ weight_kg: 0, reps: 0, duration_seconds: null }]), 'As in the routine');
});

test('the coach\'s "- " lines become a list, escaped', () => {
  assert.equal(feedbackHtml('- One\n- Two <b>'), '<ul class="fb"><li>One</li><li>Two &lt;b&gt;</li></ul>');
  assert.equal(feedbackHtml('Just a sentence.'), '<p class="fbp">Just a sentence.</p>');
});

test('a sparkline needs two points', () => {
  assert.equal(sparkline([{ e1rm: 100 }]), '');
  assert.match(sparkline([{ e1rm: 100 }, { e1rm: 110 }]), /<polyline points="2.0,33.0 130.0,3.0"/);
});

test('gym page: readiness, the plan, the last workout\'s feedback, older ones and lifts; text escaped', () => {
  const html = gymHtml(gym);
  assert.match(html, /Friday 2 October/);
  assert.match(html, /<div class="insight steady"><div class="verdict">Mostly recovered<\/div><p>Fine for a normal session: HRV is a bit &lt;low&gt;, sleep was fine.<\/p><\/div>/);
  assert.match(html, /<details class="nums"><summary>The numbers<\/summary>/);
  const order = ['Your recovery', 'How do you feel?', 'Template', 'Recommended workout'].map(t => html.indexOf(t));
  assert.ok(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1])), 'the four steps in order');
  assert.match(html, /class="sig low"><span class="sn">HRV<\/span><b>41 ms<\/b><span class="su">usual 50 ms/);
  assert.match(html, /<option value="r-push" selected>Push &lt;A&gt; \(5 exercises\)<\/option>/);
  assert.match(html, /Generate again/);
  assert.match(html, /<div class="sl"><span class="w">warm-up 10@40 kg<\/span><span class="k">8@80 · 8@80 · 7@80 kg<\/span><\/div>/);
  assert.match(html, /<div class="why">last 8@80 · 8@80 · 7@80 — <i>Elbows tucked<\/i><\/div>/);
  assert.match(html, /title="80 kg again, one more rep on set 3.">\+1 rep<\/span>/);
  assert.match(html, /Elbows tucked/);

  assert.match(html, /data-act="send" data-plan="p1">Send to Hevy<\/button>/);
  assert.match(html, /Saves it in Hevy as <b>Today · Push &lt;A&gt;<\/b>, replacing the one there.<\/p>/);
  assert.match(html, /<li>Keep the pause &lt;tight&gt;.<\/li>/);
  assert.match(html, /<details class="older"><summary><b>Pull<\/b>/);
  assert.match(html, /data-act="feedback" data-workout="w2"/);
  assert.match(html, /\+14 kg over 3 sessions/);
  assert.match(html, /120 workouts since Sun 5 Jan/);
  assert.match(html, /Sync from Hevy/);
  assert.doesNotMatch(html, /Push <A>/);
});

test('gym page: a sent plan says so; an unsent newer one says what Hevy still has', () => {
  const sentPlan = gymHtml({ ...gym, plan: { ...gym.plan, sent_at: '2026-10-02T05:12:00Z' } });
  assert.match(sentPlan, /✓ In Hevy as <b>Today · Push &lt;A&gt;<\/b>, sent at 07:12/);
  assert.doesNotMatch(sentPlan, /data-act="send" data-plan/);
  const newer = gymHtml({ ...gym, sent: { id: 'p0', routine_title: 'Pull', sent_at: '2026-10-02T05:02:00Z' } });
  assert.match(newer, /Hevy still has the Pull you sent at 07:02./);
});

test('gym page: empty history offers the import; an error shows plainly', () => {
  const html = gymHtml({ ...gym, plan: null, workouts: [], trends: [], history: { workouts: 0, since: null }, sync: null, readiness: { measured: false, verdict: null, hrv: null, rhr: null, sleep: null } });
  assert.match(html, /Import my Hevy history/);
  assert.match(html, /data-full="1"/);
  assert.match(html, /No recovery data for today yet/);
  assert.match(html, /Generate today’s workout/);
  assert.match(gymHtml({ error: 'Quest Engine /gym answered 500' }), /<p class="err">Quest Engine \/gym answered 500<\/p>/);
});

function engineEnv(answer) {
  const sent = [];
  return {
    sent,
    env: {
      QUEST_ENGINE_URL: 'https://qe.example', QUEST_ENGINE_TOKEN: 'tok',
      QUEST_ENGINE: { fetch: async req => { sent.push({ method: req.method, url: req.url, token: req.headers.get('X-Admin-Token'), body: req.method === 'POST' ? Object.fromEntries(new URLSearchParams(await req.text())) : null }); return new Response(JSON.stringify(answer)); } }
    }
  };
}

test('the page data comes from the Quest Engine with the admin token', async () => {
  const { env, sent } = engineEnv(gym);
  assert.equal((await loadGym(env)).templates.length, 2);
  assert.deepEqual(sent[0], { method: 'GET', url: 'https://qe.example/gym', token: 'tok', body: null });
  assert.deepEqual(await loadGym({ ...env, QUEST_ENGINE_TOKEN: '' }), { error: 'QUEST_ENGINE_TOKEN is not set on the dashboard.' });
  assert.deepEqual(await loadGym(engineEnv({ ok: 0, code: 'bad_token' }).env), { error: 'bad_token' });
});

test('the buttons pass only their own fields on', async () => {
  const { env, sent } = engineEnv({ ok: 1 });
  await gymAction(env, 'generate', { routine_id: 'r-push', feeling: 4, extra: 'no' });
  await gymAction(env, 'generate', { routine_id: 'r-push', feeling: 9 });
  await gymAction(env, 'send', { plan_id: 'p1', routine_id: 'x' });
  await gymAction(env, 'feedback', { workout_id: 'w2' });
  await gymAction(env, 'sync', { full: true });
  assert.deepEqual(sent.map(s => [s.url.replace('https://qe.example', ''), s.body]), [
    ['/gym/generate', { routine_id: 'r-push', feeling: '4' }],
    ['/gym/generate', { routine_id: 'r-push' }],
    ['/gym/send', { plan_id: 'p1' }],
    ['/gym/feedback', { workout_id: 'w2' }],
    ['/hevy/sync', { full: '1' }]
  ]);
  await assert.rejects(gymAction(env, 'delete', {}), /No such action/);
  await assert.rejects(gymAction(env, 'generate', {}), /Pick a template/);
  assert.deepEqual(await gymAction(engineEnv({ ok: 0, code: 'hevy_error', message: 'Hevy PUT /routines/x: 400' }).env, 'sync', {}), { ok: 0, code: 'hevy_error', message: 'Hevy PUT /routines/x: 400' });
});

test('set lines: reps @ weight, reps, minutes; a timed block hides "Last time 0 reps"', async () => {
  const { setValue } = await import('../src/gympage.js');
  assert.equal(setValue({ weight_kg: 35, reps: 8 }), '8 @ 35 kg');
  const { notation } = await import('../src/gympage.js');
  assert.equal(notation('70kg×6, 52.5kg×4, 9 reps'), '6 @ 70 kg, 4 @ 52.5 kg, 9 reps');
  assert.equal(setValue({ weight_kg: 52.5, reps: 4 }), '4 @ 52.5 kg');
  assert.equal(setValue({ weight_kg: null, reps: 9 }), '9 reps');
  assert.equal(setValue({ weight_kg: null, reps: null, duration_seconds: 477 }), '7:57 min');
  const html = gymHtml({ ...gym, plan: { ...gym.plan, plan: { level: 'normal', exercises: [{ title: 'Warm Up', change: 'same', reason: null, sets: [{ type: 'normal', weight_kg: null, reps: null, duration_seconds: 477 }], last: { day: '2026-07-08', sets: '0 reps' } }] } } });
  assert.doesNotMatch(html, /Last time 0 reps/);
  assert.match(html, /<span class="k">7:57 min<\/span>/);
  const { compactSets } = await import('../src/gympage.js');
  assert.equal(compactSets([{ weight_kg: null, reps: 9 }, { weight_kg: null, reps: 7 }]), '9 · 7 reps');
});
