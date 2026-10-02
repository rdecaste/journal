// GET /gym: the gym page (data: src/gym.js). One column for the phone before
// the gym and the Mac afterwards:
//   Today, as four steps (Roy, 2 Oct): 1 the morning's recovery, led by a
//   short AI insight on whether he is ready to train (the HRV, resting HR and
//   sleep numbers folded underneath), 2 how Roy feels (1–5), 3 a Hevy
//   routine as the template, 4 the recommended workout →
//   Generate shows the day's workout here, each lift with why it changed
//   (Roy's double progression, src/hevy.js in the Quest Engine) → Send to
//   Hevy writes it there as "Today · …" (one routine, overwritten each time).
//   Last workout: its sets and the coach's feedback (written when the Strava
//   sync brings the session in; a button writes it when missing).
//   Older workouts and lift trends are left to the Hevy app (Roy, 2 Oct).
// Drawn on the server; the buttons post JSON and reload the page.

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDay = day => { const d = new Date(day + 'T12:00:00Z'); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const shortDay = day => { const d = new Date(day + 'T12:00:00Z'); return `${DAYS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`; };
const n = (v, digits = 0) => (v === null || v === undefined || !isFinite(Number(v)) ? null : Number(Number(v).toFixed(digits)));
const hm = h => (h === null ? null : `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}`);
const kg = v => `${n(v, 1)} kg`;
const clock = iso => new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' });

export const FEELINGS = [[1, 'Wrecked'], [2, 'Tired'], [3, 'OK'], [4, 'Good'], [5, 'Great']];
export const VERDICTS = { good: 'Recovered', steady: 'Mostly recovered', easy: 'Take it easier' };
export const LEVELS = { push: ['Good day', 'Follow the progression'], normal: ['Normal', 'Follow the progression'], easy: ['Easy', 'Last time’s weights, two sets, no extra reps'] };

// "3 × 8 @ 80 kg" for identical sets in a row; a block without numbers (a
// warm-up or cool-down) reads "As in the routine".
export function setsLine(sets) {
  if (sets.every(s => !(s.weight_kg > 0) && !(s.reps > 0) && !(s.duration_seconds > 0) && !(s.distance_meters > 0))) return 'As in the routine';
  const one = s => (s.weight_kg > 0 ? `${s.reps ?? '?'} @ ${n(s.weight_kg, 2)} kg` : s.reps > 0 ? `${s.reps} reps` : s.duration_seconds ? `${s.duration_seconds}s` : s.distance_meters ? `${s.distance_meters} m` : '—');
  const out = [];
  for (const s of sets) {
    const t = one(s), last = out[out.length - 1];
    if (last && last.t === t) last.k++; else out.push({ t, k: 1 });
  }
  return out.map(x => (x.k > 1 ? `${x.k} × ${x.t}` : x.t)).join(', ');
}

// The coach's feedback: "- " lines become a list.
export function feedbackHtml(text) {
  const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const bullets = lines.filter(l => /^[-•*]\s+/.test(l));
  if (bullets.length >= lines.length / 2) return `<ul class="fb">${lines.map(l => `<li>${esc(l.replace(/^[-•*]\s+/, ''))}</li>`).join('')}</ul>`;
  return lines.map(l => `<p class="fbp">${esc(l)}</p>`).join('');
}

function signalHtml(name, s, fmt, unit) {
  if (!s || s.value === null) return `<div class="sig"><span class="sn">${name}</span><b>—</b></div>`;
  return `<div class="sig${s.low ? ' low' : ''}"><span class="sn">${name}</span><b>${esc(fmt(s.value))}${unit}</b>${s.usual !== null ? `<span class="su">usual ${esc(fmt(s.usual))}${unit}</span>` : ''}</div>`;
}

// Step 1: the insight first (AI, or the verdict in a sentence), the numbers
// folded away underneath (Roy: on their own they mean little).
function readinessHtml(r, insight) {
  if (!r) return '';
  const verdict = r.measured ? (r.verdict ? VERDICTS[r.verdict] : 'Too few nights to compare yet') : 'No recovery data for today yet';
  const text = insight && insight.text;
  return `<div class="ready">
    <div class="insight ${esc(r.verdict || 'none')}"><div class="verdict">${esc(verdict)}</div>${text ? `<p>${esc(text)}</p>` : ''}</div>
    ${r.measured ? `<details class="nums"><summary>The numbers</summary><div class="sigs">${signalHtml('HRV', r.hrv, v => n(v), ' ms')}${signalHtml('Resting HR', r.rhr, v => n(v), ' bpm')}${signalHtml('Sleep', r.sleep, hm, '')}</div></details>` : ''}
  </div>`;
}

// How each lift changed against last time (the generator's `change`).
export const CHANGES = { weight: '↑ weight', reps: '+1 rep', hold: '+2 s', stage: '↑ next stage', deload: '↓ 10%', return: '↓ after break', easy: '2 sets', same: '=', new: 'new', up: '↑', down: '↓' };

// Under the plan: the Send to Hevy button, or that Hevy has it.
function sendHtml(p, sent) {
  const name = `<b>Today · ${esc(p.routine_title)}</b>`;
  if (p.sent_at) return `<p class="sentok">✓ In Hevy as ${name}, sent at ${esc(clock(p.sent_at))}. Open Hevy → Routines to start it.</p>`;
  return `<button class="btn" type="button" data-act="send" data-plan="${esc(p.id)}">Send to Hevy</button>
    <p class="muted small" style="margin:0">Saves it in Hevy as ${name}, replacing the one there.${sent ? ` Hevy still has the ${esc(sent.routine_title)} you sent at ${esc(clock(sent.sent_at))}.` : ''}</p>`;
}

// Dense (Roy, 2 Oct: "or it'll take me an hour to scroll"): all of an
// exercise's sets on one line, "7@70 · 6@70 · 6@70 kg", the unit once.
const compactOne = s => (s.weight_kg > 0 ? `${s.reps ?? '?'}@${n(s.weight_kg, 2)}` : s.reps > 0 ? `${s.reps}` : s.duration_seconds >= 60 ? `${Math.floor(s.duration_seconds / 60)}:${String(Math.round(s.duration_seconds % 60)).padStart(2, '0')}` : s.duration_seconds > 0 ? `${s.duration_seconds}` : '—');
export function compactSets(sets) {
  if (!sets.length) return '';
  const timed = sets.every(s => !(s.weight_kg > 0) && !(s.reps > 0) && s.duration_seconds > 0);
  const unit = sets.every(s => s.weight_kg > 0) ? ' kg' : sets.every(s => !(s.weight_kg > 0) && s.reps > 0) ? ' reps'
    : timed && sets.every(s => s.duration_seconds >= 60) ? ' min' : timed && sets.every(s => s.duration_seconds < 60) ? ' s' : '';
  return sets.map(compactOne).join(' · ') + unit;
}
export const compactNotation = text => String(text || '').replace(/(\d+(?:\.\d+)?)kg×(\d+|\?)/g, '$2@$1').replace(/(\d+) reps/g, '$1').replace(/, /g, ' · ');

// The Quest Engine's "70kg×6" in Roy's notation, "6 @ 70 kg".
export const notation = text => String(text || '').replace(/(\d+(?:\.\d+)?)kg×(\d+|\?)/g, '$2 @ $1 kg');

// One set as a line, Roy's notation (2 Oct): "warm-up  8 @ 35 kg", "set 1  7 @ 70 kg".
export function setValue(s) {
  return s.weight_kg > 0 ? `${s.reps ?? '?'} @ ${n(s.weight_kg, 2)} kg`
    : s.reps > 0 ? `${s.reps} reps`
    : s.duration_seconds >= 60 ? `${Math.floor(s.duration_seconds / 60)}:${String(Math.round(s.duration_seconds % 60)).padStart(2, '0')} min`
    : s.duration_seconds > 0 ? `${s.duration_seconds} s`
    : s.distance_meters > 0 ? `${s.distance_meters} m` : '—';
}
export function setRows(sets) {
  let k = 0;
  return `<ol class="setlist">${sets.map(s => {
    const warm = s.type === 'warmup';
    const timed = !(s.weight_kg > 0) && !(s.reps > 0) && s.duration_seconds > 0 && sets.length === 1;
    return `<li${warm ? ' class="warm"' : ''}><span class="lbl">${warm ? 'warm-up' : timed ? 'time' : `set ${++k}`}</span><span class="val">${esc(setValue(s))}</span></li>`;
  }).join('')}</ol>`;
}

// Step 4: three short lines per exercise: name and change (the reason when
// the label is tapped), all sets on one line (warm-ups first, grey), then last
// time and the cue. A warm-up or cool-down block without numbers is one line.
function planHtml(p, sent) {
  if (!p || !p.plan) return '';
  const lvl = LEVELS[p.plan.level] || LEVELS.normal;
  return `<div class="plan" id="plan">
    <div class="planhead"><span class="lvl ${esc(p.plan.level)}">${esc(lvl[0])}</span><span class="pt">${esc(p.routine_title)}</span></div>
    ${p.plan.request ? `<p class="muted small" style="margin:0">You asked: “${esc(p.plan.request)}”</p>` : ''}
    <p class="brief">${esc(p.briefing || lvl[1])}</p>
    <ol class="exs">${p.plan.exercises.map(e => {
      if (setsLine(e.sets) === 'As in the routine') return `<li class="ex block"><span>${esc(e.title)}</span><span class="muted">as in the routine</span></li>`;
      const warm = e.sets.filter(s => s.type === 'warmup'), work = e.sets.filter(s => s.type !== 'warmup');
      // "0 reps" is what Hevy logs for a timed block: not worth saying.
      const lastUseful = e.last && !/^0 reps(, 0 reps)*$/.test(e.last.sets);
      const note = [lastUseful ? `last ${esc(compactNotation(e.last.sets))}` : null, e.cue ? `<i>${esc(e.cue)}</i>` : null].filter(Boolean).join(' — ');
      return `<li class="ex"><div class="exh"><b>${esc(e.title)}</b><span class="chg ${esc(e.change)}" title="${esc(e.reason || 'Compared with last time')}">${esc(CHANGES[e.change] || '')}</span></div>
        <div class="sl">${warm.length ? `<span class="w">warm-up ${esc(compactSets(warm))}</span>` : ''}<span class="k">${esc(compactSets(work))}</span></div>
        ${note ? `<div class="why">${note}</div>` : ''}</li>`;
    }).join('')}</ol>
    ${sendHtml(p, sent)}
  </div>`;
}

// A plan made earlier today stays one tap away, folded, until a new one is generated.
function earlierHtml(p, sent) {
  if (!p || !p.plan) return '';
  const state = p.sent_at ? `in Hevy since ${esc(clock(p.sent_at))}` : 'not sent';
  return `<details class="earlier"><summary>Earlier today: ${esc(p.routine_title)} · ${state}</summary>${planHtml(p, sent)}</details>`;
}

function workoutHtml(w, ai) {
  const facts = [w.duration_min ? `${Math.round(w.duration_min)} min` : null, w.volume_kg ? `${Math.round(w.volume_kg).toLocaleString('en-GB')} kg moved` : null, w.sets ? `${w.sets} sets` : null].filter(Boolean).join(' · ');
  const body = `<div class="wfacts muted">${esc(facts)}</div>
    <ul class="wex">${w.exercises.map(e => `<li><b>${esc(e.title)}</b> <span class="muted">${esc(notation(e.sets))}</span></li>`).join('')}</ul>
    ${w.feedback ? `<div class="coach"><div class="ch">Coach</div>${feedbackHtml(w.feedback)}</div>`
      : ai ? `<button class="btn ghost" data-act="feedback" data-workout="${esc(w.id)}">Write feedback</button>` : ''}`;
  return `<article class="card"><div class="wt"><h2>${esc(w.title || 'Workout')}</h2><span class="muted">${esc(shortDay(w.day))}</span></div>${body}</article>`;
}

const STYLE = `
:root{
  --bg:#eef1f5; --surface:#ffffff; --ink:#18202b; --muted:#5e6a7a; --line:#d9dee6; --track:#e3e7ee;
  --ki:#2f6fd1; --ki-soft:#e6eefb; --ok:#2e8f5c; --ok-soft:#e3f3ea; --gold:#b57a0c; --gold-soft:#fbf1dc; --warn:#b3261e; --warn-soft:#fbe7e5;
  --serif:"Source Serif 4",Georgia,"Times New Roman",serif;
  --sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif; color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#0e1219; --surface:#171d27; --ink:#e8ecf2; --muted:#95a1b2; --line:#283141; --track:#262f3d;
  --ki:#5b93ea; --ki-soft:#1a2638; --ok:#4cbf85; --ok-soft:#142a20; --gold:#f0b53c; --gold-soft:#2c2414; --warn:#f0645a; --warn-soft:#321a19; color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#0e1219; --surface:#171d27; --ink:#e8ecf2; --muted:#95a1b2; --line:#283141; --track:#262f3d;
  --ki:#5b93ea; --ki-soft:#1a2638; --ok:#4cbf85; --ok-soft:#142a20; --gold:#f0b53c; --gold-soft:#2c2414; --warn:#f0645a; --warn-soft:#321a19; color-scheme:dark}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{margin:0}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}
.page{max-width:700px;margin:0 auto;padding-inline:max(16px,env(safe-area-inset-left));padding-block:max(20px,env(safe-area-inset-top)) max(48px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:22px}
button,select{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--ki);outline-offset:3px;border-radius:6px}
.top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.back{font-size:15px;font-weight:500;color:var(--muted);text-decoration:none;min-height:32px;display:inline-flex;align-items:center}
.date{font-size:13.5px;font-weight:500;color:var(--muted)}
h1{font-family:var(--serif);font-weight:600;font-size:36px;line-height:1.12;margin:0;letter-spacing:-.01em}
h2{font-family:var(--serif);font-weight:600;font-size:22px;margin:0}
.muted{color:var(--muted)} .small{font-size:13.5px}
.card{background:var(--surface);border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:16px;box-shadow:0 1px 2px rgba(20,26,36,.04)}
.sec{display:flex;flex-direction:column;gap:10px}
.ready{display:flex;flex-direction:column;gap:10px}
.insight{border-left:4px solid var(--line);border-radius:4px;padding:2px 0 2px 14px;display:flex;flex-direction:column;gap:4px}
.insight p{margin:0;font-family:var(--serif);font-size:18px;line-height:1.5}
.verdict{font-weight:700;font-size:14px;color:var(--muted)}
.insight.good{border-color:var(--ok)} .insight.good .verdict{color:var(--ok)}
.insight.steady{border-color:var(--gold)} .insight.steady .verdict{color:var(--gold)}
.insight.easy{border-color:var(--warn)} .insight.easy .verdict{color:var(--warn)}
.req{display:flex;flex-direction:column;gap:6px}
textarea{width:100%;font:inherit;font-size:16px;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--surface);resize:vertical;min-height:72px}
.earlier summary{cursor:pointer;font-size:14px;color:var(--muted);font-weight:600;min-height:36px;display:flex;align-items:center}
.earlier[open]{display:flex;flex-direction:column;gap:10px}
.nums summary{cursor:pointer;font-size:14px;color:var(--muted);font-weight:600;min-height:32px;display:flex;align-items:center;gap:6px;list-style:none}
.nums summary::-webkit-details-marker{display:none}
.nums summary::before{content:'▸';font-size:12px} .nums[open] summary::before{content:'▾'}
.nums[open] summary{margin-bottom:8px}
.sigs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.sig{background:var(--bg);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;min-width:0}
.sig b{font-size:18px;font-variant-numeric:tabular-nums}
.sig.low{background:var(--warn-soft)} .sig.low b{color:var(--warn)}
.sn,.su{font-size:12.5px;color:var(--muted)}
.label{font-weight:600;font-size:15px}
.steps{display:flex;flex-direction:column;gap:10px}
.step{gap:14px}
.sh{display:flex;align-items:center;gap:10px}
.sh h2{font-size:20px}
.sh label{cursor:pointer}
.num{flex:none;width:28px;height:28px;border-radius:50%;background:var(--ki-soft);color:var(--ki);font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center}
.feel{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}
.feel button{border:1px solid var(--line);background:var(--surface);border-radius:12px;padding:8px 2px;display:flex;flex-direction:column;align-items:center;cursor:pointer;min-height:56px}
.feel button b{font-size:18px} .feel button span{font-size:12px;color:var(--muted)}
.feel button[aria-pressed="true"]{border-color:var(--ki);background:var(--ki-soft)}
select{width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--surface);min-height:48px}
.btn{border:0;border-radius:14px;padding:14px 16px;background:var(--ki);color:#fff;font-weight:600;cursor:pointer;min-height:48px}
.btn:disabled{opacity:.6;cursor:progress}
.btn.ghost{background:var(--ki-soft);color:var(--ki);align-self:flex-start;padding:10px 14px;min-height:40px}
.sentok{margin:0;background:var(--ok-soft);color:var(--ok);border-radius:14px;padding:12px 16px;font-weight:600;font-size:15px}
.sentok b{color:inherit}
.status{font-size:14px;min-height:1.3em;margin:0} .status.bad{color:var(--warn);font-weight:600}
.plan{display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--line);padding-top:14px}
.planhead{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.pt{font-family:var(--serif);font-weight:600;font-size:20px}
.lvl{font-size:12.5px;font-weight:700;border-radius:999px;padding:3px 10px;background:var(--ki-soft);color:var(--ki)}
.lvl.push{background:var(--ok-soft);color:var(--ok)} .lvl.easy{background:var(--warn-soft);color:var(--warn)}
.brief{margin:0;font-family:var(--serif);font-size:15.5px;line-height:1.45;background:var(--bg);border-radius:12px;padding:10px 12px}
.exs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;counter-reset:ex}
.ex{display:flex;flex-direction:column;gap:1px;padding:7px 0;border-top:1px solid var(--line)}
.ex:first-child{border-top:0;padding-top:0}
.ex.block{flex-direction:row;justify-content:space-between;gap:8px;padding:6px 0;font-size:14px}
.exh{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.exh b{font-size:15px;line-height:1.3}
.sl{display:flex;flex-wrap:wrap;column-gap:12px;font-variant-numeric:tabular-nums;line-height:1.35}
.sl .k{font-size:16px;font-weight:700}
.sl .w{font-size:13.5px;color:var(--muted)}
.ex .why{font-size:12.5px;line-height:1.35}
.ex .why i{font-family:var(--serif);font-size:13.5px}
.setlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;font-variant-numeric:tabular-nums}
.setlist li{display:flex;align-items:baseline;gap:12px;padding:3px 0}
.setlist .lbl{width:64px;flex:none;font-size:14px;color:var(--muted)}
.setlist .val{font-size:17px;font-weight:600}
.setlist .warm .val{font-weight:400;color:var(--muted)}
.why{font-size:13.5px;color:var(--muted);line-height:1.45}
.exs-sets{font-variant-numeric:tabular-nums}
.chg{font-size:13px;font-weight:700;color:var(--muted);white-space:nowrap} .chg.up,.chg.weight,.chg.reps,.chg.hold,.chg.stage{color:var(--ok)} .chg.down,.chg.deload{color:var(--warn)} .chg.return{color:var(--gold)}
.why{color:var(--ink)}
.cue{font-family:var(--serif);font-style:italic;color:var(--muted)}
.wt{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.wex{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px;font-variant-numeric:tabular-nums}
.coach{background:var(--bg);border-radius:14px;padding:14px 16px}
.ch{font-weight:700;font-size:13px;color:var(--muted);margin-bottom:4px}
.fb{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;font-family:var(--serif);font-size:16.5px;line-height:1.5}
.fbp{margin:0 0 6px;font-family:var(--serif)}
.err{background:var(--warn-soft);color:var(--warn);border-radius:14px;padding:12px 16px;margin:0}
.foot{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-size:13.5px;color:var(--muted)}
@media (max-width:420px){h1{font-size:30px}.sig b{font-size:16px}.card{padding:18px}}
`;

const SCRIPT = `
(function () {
  var feeling = null;
  var status = document.getElementById('status');
  function say(t, bad) { if (!status) return; status.textContent = t; status.className = 'status' + (bad ? ' bad' : ''); }
  document.querySelectorAll('.feel button').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = Number(b.dataset.v);
      feeling = feeling === v ? null : v;
      document.querySelectorAll('.feel button').forEach(function (x) { x.setAttribute('aria-pressed', String(Number(x.dataset.v) === feeling)); });
    });
  });
  var sel = document.getElementById('tpl'), req = document.getElementById('req'), reqBox = document.getElementById('req-box');
  // Custom: a text box for what Roy wants to train. Nothing is chosen in advance (Roy, 2 Oct).
  function showReq() { if (reqBox) reqBox.hidden = !(sel && sel.value === 'custom'); if (sel && sel.value === 'custom' && req) req.focus(); }
  if (sel) sel.addEventListener('change', showReq);
  function post(action, body, btn, busy, done) {
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = busy;
    say('');
    return fetch('/gym/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' })
      .then(function (r) { if (r.status === 401) { location.href = '/login?next=/gym'; return null; } return r.json(); })
      .then(function (d) {
        if (!d) return;
        if (d.ok === 1) { if (done) done(d); else location.reload(); return; }
        btn.disabled = false; btn.textContent = label; say(d.message || 'That did not work.', true);
      })
      .catch(function () { btn.disabled = false; btn.textContent = label; say('No connection. Try again.', true); });
  }
  var gen = document.getElementById('gen');
  if (gen) gen.addEventListener('click', function () {
    if (!sel || !sel.value) { say('Pick a template or Custom first.', true); return; }
    var custom = sel.value === 'custom';
    if (custom && !(req && req.value.trim())) { say('Say what you want to train today.', true); if (req) req.focus(); return; }
    post('generate', { routine_id: sel.value, feeling: feeling, request: custom ? req.value.trim() : '' }, gen, custom ? 'Putting your workout together…' : 'Building your workout…',
      function (d) { location.href = '/gym?plan=' + encodeURIComponent(d.id || ''); });
  });
  document.querySelectorAll('[data-act="send"]').forEach(function (b) {
    b.addEventListener('click', function () { post('send', { plan_id: b.dataset.plan }, b, 'Sending to Hevy…'); });
  });
  document.querySelectorAll('[data-act="feedback"]').forEach(function (b) {
    b.addEventListener('click', function () { post('feedback', { workout_id: b.dataset.workout }, b, 'Writing…'); });
  });
  var sync = document.getElementById('sync');
  if (sync) sync.addEventListener('click', function () { post('sync', { full: sync.dataset.full === '1' }, sync, 'Syncing…'); });
})();
`;

export function gymHtml(d) {
  const head = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Gym"><meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#eef1f5" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0e1219" media="(prefers-color-scheme: dark)">
<title>Gym</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">
<style>${STYLE}</style></head>`;
  const top = `<div class="top"><a class="back" href="/">‹ Quest log</a><a class="back" href="/admin">Admin ›</a></div>`;
  if (d.error) {
    return `${head}<body><main class="page">${top}<h1>Gym</h1><p class="err">${esc(d.error)}</p><p class="foot"><a href="/gym">Try again</a></p></main></body></html>`;
  }
  const empty = !d.history || !d.history.workouts;
  // The plan opens only right after Generate (/gym?plan=<id>); otherwise it waits folded.
  const shown = !!(d.plan && d.open_plan && d.plan.id === d.open_plan);
  // Only the last workout: older ones and lift trends are in Hevy (Roy, 2 Oct).
  const [last] = d.workouts || [];
  const sync = d.sync ? `Last synced ${esc(new Date(d.sync.at).toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}` : 'Not synced yet';
  return `${head}<body><main class="page">
  ${top}
  <div><div class="date">${esc(longDay(d.day))}</div><h1>Gym</h1></div>
  ${!d.connected ? '<p class="err">HEVY_API_KEY is not set on the Quest Engine.</p>' : ''}
  ${d.routines_error ? `<p class="err">Hevy did not answer, so these are the routines from the last time: ${esc(d.routines_error)}</p>` : ''}

  <section class="steps" aria-label="Today’s workout">
    <article class="card step" aria-labelledby="s1-h">
      <div class="sh"><span class="num" aria-hidden="true">1</span><h2 id="s1-h">Your recovery</h2></div>
      ${readinessHtml(d.readiness, d.insight)}
    </article>
    <article class="card step" aria-labelledby="feel-l">
      <div class="sh"><span class="num" aria-hidden="true">2</span><h2 id="feel-l">How do you feel?</h2></div>
      <div class="feel" role="group" aria-labelledby="feel-l">${FEELINGS.map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="false"><b>${v}</b><span>${t}</span></button>`).join('')}</div>
    </article>
    <article class="card step">
      <div class="sh"><span class="num" aria-hidden="true">3</span><h2><label for="tpl">Template</label></h2></div>
      <select id="tpl"><option value="">Pick a template…</option>${(d.templates || []).map(t => `<option value="${esc(t.id)}">${esc(t.title)} (${t.exercises} exercises)</option>`).join('')}${d.ai ? '<option value="custom">Custom: say what you want…</option>' : ''}</select>
      <div id="req-box" class="req" hidden>
        <label class="label" for="req">What do you want to train?</label>
        <textarea id="req" rows="3" maxlength="500" placeholder="e.g. super in the mood for bench and some one-arm handstand"></textarea>
        <p class="muted small" style="margin:0">OpenAI picks the exercises from your own history; your progression rule sets the weights.</p>
      </div>
    </article>
    <article class="card step" aria-labelledby="s4-h">
      <div class="sh"><span class="num" aria-hidden="true">4</span><h2 id="s4-h">Recommended workout</h2></div>
      ${shown ? '' : '<p class="muted" style="margin:0">Pick a template or Custom above, then Generate.</p>'}
      <button class="btn" id="gen" type="button"${(d.templates || []).length || d.ai ? '' : ' disabled'}>Generate</button>
      <p class="status" id="status" role="status" aria-live="polite"></p>
      ${shown ? planHtml(d.plan, d.sent) : earlierHtml(d.plan, d.sent)}
    </article>
  </section>

  ${last ? workoutHtml(last, d.ai) : `<article class="card"><h2>Last workout</h2><p class="muted" style="margin:0">${empty ? 'No Hevy workouts in the dashboard yet. Import your history below; after that, every gym session arrives with the Strava sync.' : ''}</p></article>`}

  <div class="foot"><span>${d.history && d.history.workouts ? `${d.history.workouts} workouts since ${esc(shortDay(d.history.since))} · ` : ''}${sync}</span>
    <button class="btn ghost" id="sync" type="button" data-full="${empty ? '1' : '0'}">${empty ? 'Import my Hevy history' : 'Sync from Hevy'}</button></div>
</main>
<script>${SCRIPT}</script></body></html>`;
}
