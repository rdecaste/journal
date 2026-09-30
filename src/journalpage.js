// GET /journal: the journal page (see src/journal.js for what is read and
// written). One calm notebook column for the iPad mini, the phone and the Mac:
// Morning above Evening, then the main quest and the quests, open all day.
// In the evening the morning folds into a short recap, and each half ends
// with a button that hands a line to the next. Drawn by a small script from
// the data below; writing saves itself to Notion a moment after you stop
// typing, and a copy stays in the browser until Notion has it.

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// JSON inside a <script> element: no "</script>" or "<!--" can end it early.
const safeJson = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, c => (c === '\u2028' ? '\\u2028' : '\\u2029'));
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDay = day => { const d = new Date(day + 'T12:00:00Z'); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };

// Other questions for each box (the 03:00 run's question comes first), words
// to start with, and one follow-up once there is something to follow up on.
// No AI here: these are fixed.
export const PROMPTS = {
  headspace: { icon: '🧠', name: 'Headspace', more: ['What’s taking up the most room in your head right now?', 'How are you arriving today, honestly?', 'What would make this morning feel lighter?'],
    starters: ['Honestly, I feel…', 'What bugs me is…'], deeper: 'What’s one decision you could make today so it stops circling?' },
  winif: { icon: '🎯', name: 'Today is a win if…', more: ['Finish the sentence. One thing, so tonight you can tell whether it happened.', 'What’s the smallest thing that would still make today count?'],
    starters: ['I…', 'I don’t…'], hint: 'Tonight’s page asks you about this.' },
  forward: { icon: '😄', name: 'Looking forward to', more: ['What small moment today would make you smile if it happened?', 'Who would you like to catch up with today?'], starters: ['I’d like to…'] },
  reflection: { icon: '🌙', name: 'Reflection', more: ['When today did you feel most like yourself?', 'What drained you today, and what gave something back?', 'What surprised you today?'],
    starters: ['What stood out was…', 'I noticed…'], deeper: 'What would you do the same way tomorrow, and what not?' },
  park: { icon: '🅿️', name: 'Park it', more: ['What’s still spinning? Write it down and leave it here for tonight.', 'Anything you’re carrying to bed that you can put down now?'],
    starters: ['Still on my mind:', 'I’ll deal with…'], hint: 'Waits for you at the top of tomorrow morning.' },
  tomorrow: { icon: '➡️', name: 'For tomorrow', more: ['What’s one thing you can take off tomorrow’s plate?', 'What would make tomorrow morning easy to start?'],
    starters: ['Tomorrow I want…'], hint: 'Becomes the first thing you read tomorrow.' }
};

const STYLE = `
:root{
  --bg:#eef1f5; --surface:#ffffff; --ink:#18202b; --muted:#5e6a7a; --line:#d9dee6; --track:#e3e7ee;
  --gold:#b57a0c; --gold-soft:#fbf1dc; --ki:#2f6fd1; --ki-soft:#e6eefb; --warn:#b3261e;
  --night:#2b3550; --night-soft:#e9ebf4; --rule:#e6e9ef;
  --write:#f4f7fd; --write-night:#f3f4f9; --write-quest:#f7f8fa;
  --hero-bg:#141a24; --hero-ink:#f2f4f8; --hero-muted:#a9b3c3; --hero-track:#2a3342; --hero-gold:#f0b53c;
  --display:"Bricolage Grotesque","Avenir Next",system-ui,sans-serif;
  --body:"Figtree",-apple-system,"Segoe UI",system-ui,sans-serif;
  --hud:"Chakra Petch",ui-monospace,"SF Mono",Menlo,monospace;
  --serif:"Newsreader",Georgia,"Times New Roman",serif;
  --paper:var(--surface); color-scheme:light;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#0e1219; --surface:#171d27; --ink:#e8ecf2; --muted:#95a1b2; --line:#283141; --track:#262f3d;
  --gold:#f0b53c; --gold-soft:#2c2414; --ki:#5b93ea; --ki-soft:#1a2638; --warn:#f0645a;
  --night:#aab6e0; --night-soft:#1b2033; --rule:#232b38;
  --write:#1b2331; --write-night:#1d2131; --write-quest:#1a1f29;
  --hero-bg:#0a0e14; --hero-track:#252d3a; color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#0e1219; --surface:#171d27; --ink:#e8ecf2; --muted:#95a1b2; --line:#283141; --track:#262f3d;
  --gold:#f0b53c; --gold-soft:#2c2414; --ki:#5b93ea; --ki-soft:#1a2638; --warn:#f0645a;
  --night:#aab6e0; --night-soft:#1b2033; --rule:#232b38;
  --write:#1b2331; --write-night:#1d2131; --write-quest:#1a1f29;
  --hero-bg:#0a0e14; --hero-track:#252d3a; color-scheme:dark}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{margin:0}
body{background:var(--bg);color:var(--ink);font-family:var(--body);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;position:relative}
.page{max-width:700px;margin:0 auto;padding-inline:max(16px,env(safe-area-inset-left));padding-block:max(20px,env(safe-area-inset-top)) max(48px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:22px;position:relative;z-index:1}
button,input,textarea{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--ki);outline-offset:3px;border-radius:6px}
.top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.back{font-size:14px;font-weight:600;color:var(--muted);text-decoration:none;min-height:32px;display:inline-flex;align-items:center}
.saved{font-size:12.5px;color:var(--muted);min-height:1.2em}
.saved.bad{color:var(--warn);font-weight:600}
.hello{display:flex;flex-direction:column;gap:6px;padding-top:4px}
.date{font-size:12px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--muted)}
#theme-name{font-weight:500;letter-spacing:.06em;opacity:.75}
h1{font-family:var(--display);font-weight:800;font-size:38px;line-height:1.05;margin:0;letter-spacing:-.02em;text-wrap:balance}
.sub{margin:0;font-family:var(--serif);font-style:italic;font-size:19px;color:var(--muted);line-height:1.4}
h2{font-family:var(--display);font-weight:600;font-size:19px;margin:10px 0 -8px;letter-spacing:-.01em;color:var(--muted)}
.sheet{background:var(--paper);border-radius:22px;padding:24px 24px 22px;display:flex;flex-direction:column;gap:30px;box-shadow:0 1px 2px rgba(20,26,36,.04)}
.entry{display:flex;flex-direction:column;gap:8px}
.label{font-size:12.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ki)}
.evening .label{color:var(--night)}
.q{margin:0;font-family:var(--serif);font-style:italic;font-size:19px;line-height:1.35;color:var(--muted);text-wrap:pretty}
.small .q{font-size:17px}
/* Roy's writing: upright, full ink, on a tinted panel with an edge in the half's colour,
   so it never reads as part of the question when scrolling. */
textarea{width:100%;display:block;border:0;border-left:3px solid var(--ki);border-radius:0 12px 12px 0;resize:none;overflow:hidden;
  background-color:var(--write);color:var(--ink);font-weight:500;
  font-size:17px;line-height:30px;padding:0 14px;min-height:90px;
  background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 29px,var(--rule) 29px,var(--rule) 30px);background-attachment:local}
.small textarea{min-height:60px}
.evening textarea{border-left-color:var(--night);background-color:var(--write-night)}
.quests textarea{border-left-color:var(--gold);background-color:var(--write-quest)}
textarea:focus{outline:none}
.entry.active>.label{text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:2px}
.deeper{margin:0;font-family:var(--serif);font-style:italic;font-size:17px;color:var(--muted);padding-left:12px;border-left:2px solid var(--rule)}
.hint{margin:0;font-size:13px;color:var(--muted)}
.tools{display:none;flex-wrap:wrap;gap:6px}
.entry.active .tools{display:flex}
.chip,.more{font-size:13.5px;min-height:32px;padding:0 12px;border-radius:999px;cursor:pointer;border:1px solid var(--line);background:transparent;color:var(--muted)}
.more{border-color:transparent;padding-left:0;color:var(--ki)}
.evening .more{color:var(--night)}
.chip:hover,.more:hover{color:var(--ink)}
.fgroup{display:flex;flex-direction:column;gap:2px}
.flabel{font-size:11.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin-top:10px}
.fgroup:first-of-type .flabel{margin-top:0}
.line{display:flex;align-items:center;gap:12px;min-height:40px;border-bottom:1px solid var(--rule)}
.line input[type=checkbox]{width:20px;height:20px;accent-color:var(--gold);flex:none;margin:0}
.line input[type=text]{flex:1;min-width:0;border:0;background:transparent;font-size:17px;padding:8px 0}
.line input[type=text]:focus{outline:none}
.line input[type=text]::placeholder{color:var(--muted);opacity:.7}
.line.done input[type=text]{text-decoration:line-through;color:var(--muted)}
.sugg{margin:10px 0 0;font-size:13.5px;line-height:1.7;color:var(--muted)}
.todo{border:0;background:none;padding:0;font-size:13.5px;color:var(--ink);text-decoration:underline;text-decoration-color:var(--line);text-underline-offset:3px;cursor:pointer}
.dot{color:var(--muted);margin:0 4px}
.handoff{display:flex;flex-direction:column;gap:8px}
.handoff blockquote{margin:0;font-family:var(--serif);font-size:19px;line-height:1.45;padding-left:14px;border-left:2px solid var(--ki);white-space:pre-wrap}
.evening .handoff blockquote{border-color:var(--night)}
.handoff .soft{margin:0;font-family:var(--serif);font-style:italic;font-size:18px;color:var(--muted)}
.did{display:flex;gap:6px;flex-wrap:wrap}
.did button{font-size:14px;font-weight:600;min-height:36px;padding:0 16px;border-radius:999px;border:1px solid var(--line);background:transparent;cursor:pointer}
.did button[aria-pressed="true"]{background:var(--night);color:var(--paper);border-color:var(--night)}
.recap{display:flex;flex-direction:column;gap:6px;padding:16px 20px;border-radius:18px;background:var(--ki-soft)}
.recap p{margin:0;font-family:var(--serif);font-size:17px;line-height:1.45;white-space:pre-wrap}
.recap b{font-family:var(--body);font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ki);font-weight:600;margin-right:6px}
.link{border:0;background:none;padding:4px 0;color:var(--ki);font-size:14px;cursor:pointer;align-self:flex-start;min-height:32px}
.later{margin:0;color:var(--muted);font-family:var(--serif);font-style:italic;font-size:18px}
.end{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding-top:4px}
.endbtn{font-size:15px;font-weight:600;min-height:44px;padding:0 20px;border-radius:999px;border:0;cursor:pointer;background:var(--ink);color:var(--paper)}
.bye{margin:0;font-family:var(--serif);font-style:italic;font-size:18px;color:var(--muted)}
.close{align-items:center;padding:6px 0 0}
.checkin{background:var(--hero-bg);color:var(--hero-ink);border-radius:22px;padding:22px 24px;display:flex;flex-direction:column;gap:14px;position:relative;transition:box-shadow .3s}
.ci-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
.checkin h3{font-family:var(--display);font-weight:600;font-size:21px;margin:2px 0 0}
.lvl{font-family:var(--hud);font-weight:600;font-size:15px;color:var(--hero-gold);white-space:nowrap}
.ci-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ci{text-align:left;cursor:pointer;border-radius:16px;padding:14px 16px;border:1px solid var(--hero-track);background:transparent;color:var(--hero-ink);display:flex;flex-direction:column;gap:2px;min-height:70px}
.ci b{font-size:16px}
.ci span{font-size:13.5px;color:var(--hero-muted)}
.ci.win[aria-pressed="true"]{background:#1f5c3d;border-color:#4cbf85}
.ci.lose[aria-pressed="true"]{background:#5c2420;border-color:#f0645a}
.checkin .q{font-size:17px;color:var(--hero-muted)}
.checkin textarea{border-left-color:var(--hero-gold);background-color:rgba(255,255,255,.05);background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 29px,var(--hero-track) 29px,var(--hero-track) 30px);color:var(--hero-ink);min-height:60px}
.after{display:flex;flex-direction:column;gap:8px;animation:rise-in .35s ease-out}
@keyframes rise-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.ci-out{font-size:14px;color:var(--hero-muted);margin:0;min-height:1.2em}
.quiet{background:transparent;box-shadow:none;border:1px dashed var(--line)}
.qintro{margin:-6px 0 -8px}
.quests .label{color:var(--muted)}
.stamp{margin:0;font-size:12.5px;color:var(--muted)}
.scene{position:absolute;inset:0 0 auto 0;height:360px;z-index:0;pointer-events:none;overflow:hidden;
  -webkit-mask-image:linear-gradient(to bottom,#000 55%,transparent);mask-image:linear-gradient(to bottom,#000 55%,transparent)}
.scene svg{width:100%;height:100%;display:block}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .scene{opacity:.28}}
:root[data-theme="dark"] .scene{opacity:.28}
.foot{font-size:12.5px;color:var(--muted);text-align:center;margin:8px 0 0}
.foot a{color:inherit}
.empty{display:flex;flex-direction:column;gap:10px}
#burst{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50}
.checkin.flare{animation:flare 1.4s ease-out}
@keyframes flare{0%{box-shadow:0 0 0 0 rgba(240,181,60,.9)}25%{box-shadow:0 0 0 6px rgba(240,181,60,.8),0 0 60px 20px rgba(240,181,60,.45)}100%{box-shadow:0 0 0 0 rgba(240,181,60,0)}}
.lvl .days{display:inline-block}
.lvl .days.pop{animation:pop .7s cubic-bezier(.3,1.6,.5,1)}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.6);color:#fff;text-shadow:0 0 12px #f0b53c}100%{transform:scale(1)}}
.plus{position:absolute;right:20px;top:14px;font-family:var(--hud);font-weight:600;font-size:18px;color:var(--hero-gold);pointer-events:none;animation:rise 1.3s ease-out forwards}
@keyframes rise{0%{opacity:0;transform:translateY(8px)}20%{opacity:1}100%{opacity:0;transform:translateY(-34px)}}
@media (max-width:480px){.scene{height:300px} .sheet{padding:20px 18px 18px;border-radius:18px} h1{font-size:32px} .q{font-size:18px} .small .q{font-size:16.5px}}
@media (max-width:360px){.ci-btns{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){*{transition:none!important} .after,.checkin.flare,.lvl .days.pop,.plus{animation:none}}
`;

// One writing box; the script fills in the question and the nudges.
const entry = (id, { small = false, evening = false } = {}) => {
  const p = PROMPTS[id];
  return `<div class="entry${small ? ' small' : ''}" data-entry="${id}">
        <div class="label">${p.icon} ${esc(p.name)}</div>
        <p class="q" id="${id}-q"></p>
        <textarea id="${id}" aria-labelledby="${id}-q" rows="${small ? 2 : 3}"></textarea>
        ${p.deeper ? `<p class="deeper" id="${id}-d" hidden>${esc(p.deeper)}</p>` : ''}
        ${p.hint ? `<p class="hint">${esc(p.hint)}</p>` : ''}
        <div class="tools"><button type="button" class="more" data-box="${id}">↻ Another question</button>${p.starters.map(s => `<button type="button" class="chip" data-for="${id}">${esc(s)}</button>`).join('')}</div>
      </div>`;
};

const head = title => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Journal"><meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#eef1f5" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0e1219" media="(prefers-color-scheme: dark)">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Chakra+Petch:wght@600&display=swap">
<style>${STYLE}</style></head>`;

export function journalHtml(d) {
  if (!d.page) {
    return `${head('Journal')}
<body><div class="page">
  <div class="top"><a class="back" href="/">‹ Quest log</a></div>
  <header class="hello"><div class="date">${esc(longDay(d.day))}</div><h1>Today’s page isn’t there yet</h1>
  <p class="sub">The 03:00 run makes it from the journal template. Try again in a moment; if it is still missing after 04:30, the Admin page shows what stopped.</p></header>
  <p class="foot"><a href="/journal">Try again</a> · <a href="/admin">Admin</a></p>
</div></body></html>`;
  }
  const focus = d.focus ? `<div class="entry" data-entry="focus">
        <div class="label">🔥 Today’s focus</div>
        ${[['must', 'Must do', 'Add a must do'], ['can', 'Can do', 'Add a can do'], ['cool', 'Something cool', 'Add something cool']].filter(([g]) => d.focus[g])
          .map(([g, label, ph]) => `<div class="fgroup"><div class="flabel">${label}</div><div class="rows" data-group="${g}" data-ph="${ph}" data-label="${label}"></div></div>`).join('')}
        <p class="sugg" id="sugg" hidden></p>
      </div>` : '';
  return `${head('Journal')}
<body>
<div class="scene" id="scene" aria-hidden="true"></div>
<div class="page">
  <div class="top">
    <a class="back" href="/">‹ Quest log</a>
    <span class="saved" id="saved" role="status" aria-live="polite"></span>
  </div>

  <header class="hello">
    <div class="date">${esc(longDay(d.day))}<span id="theme-name"></span></div>
    <h1 id="greet">Hello, Roy</h1>
    <p class="sub" id="sub"></p>
  </header>

  <h2>☀️ Morning</h2>
  <div id="m-recap" hidden></div>
  <section class="sheet morning" id="m-open" aria-label="Morning">
    <div class="handoff" id="lastnight" hidden></div>
    ${d.sections.headspace ? entry('headspace') : ''}
    ${entry('winif', { small: true })}
    ${focus}
    ${d.sections.forward ? entry('forward', { small: true }) : ''}
    <div class="end"><button type="button" class="endbtn" id="m-done">Done for this morning</button></div>
  </section>

  <h2>🌙 Evening</h2>
  <p class="later" id="e-later" hidden>Opens here tonight, starting with your “win if”. <button type="button" class="link" id="open-evening">Write now ›</button></p>
  <div id="e-open" class="evening" style="display:flex;flex-direction:column;gap:22px">
    <section class="sheet" aria-label="Looking back">
      <div class="handoff" id="lookback"></div>
      ${d.sections.reflection ? entry('reflection') : ''}
    </section>
    <section class="sheet" aria-label="Before you sleep">
      ${entry('park', { small: true })}
      ${d.sections.tomorrow ? entry('tomorrow', { small: true }) : ''}
    </section>
    <div class="end close"><button type="button" class="endbtn" id="e-done">Close the day</button><p class="bye" id="bye" hidden>Saved. Sleep well, Roy. Tomorrow starts with what you wrote tonight.</p></div>
  </div>

  <h2>🔥 Main quest</h2>
  <section class="checkin" aria-label="Main quest check-in">
    <div class="ci-row">
      <div><h3>${esc(d.main_quest || 'Main quest')}</h3></div>
      <span class="lvl"><span class="days" id="streak"></span></span>
    </div>
    <div class="ci-btns">
      <button type="button" class="ci win" id="win" aria-pressed="false"><b>✅ Success</b><span>Stayed on track today.</span></button>
      <button type="button" class="ci lose" id="lose" aria-pressed="false"><b>⚠️ Relapse</b><span>Capture the trigger, learn, reset.</span></button>
    </div>
    <div class="after" id="after" hidden>
      <p class="q" id="mqnote-q"></p>
      <textarea id="mqnote" aria-labelledby="mqnote-q" rows="2"></textarea>
    </div>
    <p class="ci-out" id="ci-out" aria-live="polite"></p>
  </section>

  ${d.quests.length ? `<h2>🗺️ Quests</h2>
  <section class="sheet quiet quests" aria-label="Quest updates">
    <p class="hint qintro">Any time of day, whenever something moves. Skip the rest.</p>
    ${d.quests.map((q, i) => `<div class="entry small" data-entry="quest${i}">
        <div class="label">${esc(q.icon || '⚔️')} ${esc(q.title)}</div>
        <p class="q" id="quest${i}-q">${esc(q.question)}</p>
        ${q.next ? `<p class="hint">Next move: ${esc(q.next)}</p>` : ''}
        <textarea id="quest${i}" data-quest="${esc(q.id)}" aria-labelledby="quest${i}-q" rows="2"></textarea>
        <p class="stamp" id="quest${i}-at" hidden></p>
      </div>`).join('')}
  </section>` : ''}

  <canvas id="burst" aria-hidden="true"></canvas>
  ${d.errors && d.errors.length ? `<p class="hint">Some parts could not load: ${esc(d.errors.join('; '))}</p>` : ''}
  <p class="foot">Saves to <a href="${esc(d.url || '#')}" target="_blank" rel="noopener">${esc(d.title || 'your journal')} in Notion</a> as you write.</p>
</div>
<script type="application/json" id="data">${safeJson(d)}</script>
<script>${SCRIPT}</script>
</body></html>`;
}

// The page's script. Plain ES5-ish so older iPad Safari runs it too.
const SCRIPT = String.raw`
(function () {
  var D = JSON.parse(document.getElementById('data').textContent);
  var P = __PROMPTS__;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var hhmm = function (d) { return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' }).format(d || new Date()); };
  var dayOf = function (d) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(d); };

  // ---- What the page holds, and where each piece lives in Notion ----
  var V = {}, S = { sections: {}, extras: {}, quests: {}, focus: {} };
  Object.keys(D.sections || {}).forEach(function (k) { var s = D.sections[k]; if (s) { V[k] = s.text || ''; S.sections[k] = s.slot; } });
  Object.keys(D.extras || {}).forEach(function (k) { var x = D.extras[k]; V[k] = x ? x.text || '' : ''; S.extras[k] = x ? x.slot : null; });
  (D.quests || []).forEach(function (q) { V['q:' + q.id] = q.text || ''; S.quests[q.id] = q.slot; });
  var F = {};
  Object.keys(D.focus || {}).forEach(function (g) { F[g] = D.focus[g].items.length ? D.focus[g].items : [{ t: '', c: false }]; S.focus[g] = D.focus[g].slot; });
  var checkin = D.checkin || (D.success ? 'win' : null);
  V.mq = checkin || '';
  var SECTION = { headspace: 1, forward: 1, reflection: 1, tomorrow: 1 };
  var EXTRA = { winif: 1, did: 1, park: 1, mq: 1, mqnote: 1 };

  // A copy in the browser until Notion has it; the page's own switches per day.
  var KEY = 'journal:' + D.page, UIKEY = 'journal-ui:' + D.day;
  var store = function (k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var load = function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  var UI = load(UIKEY) || {};
  var saveUI = function () { store(UIKEY, UI); };
  var dirty = {}, todoOps = [], success = null;
  var draft = load(KEY);
  if (draft && draft.dirty) {
    Object.keys(draft.dirty).forEach(function (k) {
      dirty[k] = 1;
      if (k.indexOf('f:') === 0) { if (draft.F && draft.F[k.slice(2)]) F[k.slice(2)] = draft.F[k.slice(2)]; }
      else if (draft.V && draft.V[k] !== undefined) V[k] = draft.V[k];
    });
    todoOps = draft.todoOps || [];
    if (typeof draft.success === 'boolean') success = draft.success;
    if (draft.V && draft.V.mq !== undefined && dirty.mq) checkin = draft.V.mq || null;
  }
  var keepDraft = function () {
    var any = Object.keys(dirty).length || todoOps.length || success !== null;
    store(KEY, any ? { dirty: dirty, V: V, F: F, todoOps: todoOps, success: success } : null);
  };

  // ---- Saving: a moment after you stop typing, one save at a time ----
  var timer = null, busy = false, again = false, failures = 0;
  var status = function (text, bad) { var el = $('saved'); el.textContent = text; el.className = 'saved' + (bad ? ' bad' : ''); };
  function change(key, value, now) {
    if (value !== undefined) V[key] = value;
    dirty[key] = 1; keepDraft(); status('Not saved yet');
    clearTimeout(timer); timer = setTimeout(flush, now ? 0 : 1200);
  }
  function body() {
    var b = { page: D.page, sections: {}, extras: {}, quests: {}, focus: {}, todos: todoOps.slice() };
    Object.keys(dirty).forEach(function (k) {
      if (SECTION[k]) b.sections[k] = { slot: S.sections[k], text: V[k] };
      else if (EXTRA[k]) b.extras[k] = { slot: S.extras[k], text: V[k] };
      else if (k.indexOf('q:') === 0) b.quests[k.slice(2)] = { slot: S.quests[k.slice(2)], text: V[k] };
      else if (k.indexOf('f:') === 0) b.focus[k.slice(2)] = { slot: S.focus[k.slice(2)], items: F[k.slice(2)] };
    });
    if (success !== null) b.success = success;
    return b;
  }
  function flush(keepalive) {
    clearTimeout(timer);
    if (busy) { again = true; return; }
    if (!Object.keys(dirty).length && !todoOps.length && success === null) return;
    var sent = dirty, ops = todoOps, ok = success, b = body();
    dirty = {}; todoOps = []; success = null;
    busy = true; status('Saving…');
    fetch('/journal/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b), credentials: 'same-origin', keepalive: !!keepalive })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw j; return j; }); })
      .then(function (j) {
        ['sections', 'extras', 'quests', 'focus'].forEach(function (g) { Object.keys(j.slots[g] || {}).forEach(function (k) { S[g][k] = j.slots[g][k]; }); });
        Object.keys(sent).forEach(function (k) { if (k.indexOf('q:') === 0) stamp(k.slice(2), new Date()); });
        failures = 0; busy = false; keepDraft();
        status('Saved ' + hhmm());
        if (again || Object.keys(dirty).length) { again = false; flush(); }
      })
      .catch(function (e) {
        busy = false; again = false;
        Object.keys(sent).forEach(function (k) { dirty[k] = 1; });
        todoOps = ops.concat(todoOps); if (success === null) success = ok;
        keepDraft();
        if (e && e.code === 'signed_out') { status('Signed out. Your writing is kept here; sign in again to save.', true); return; }
        if (e && e.code === 'no_write') { status('Notion won’t let the page write yet. Your writing is kept here.', true); return; }
        failures++;
        status('Not saved yet, trying again…', failures > 2);
        timer = setTimeout(flush, Math.min(30000, 2000 * failures));
      });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(true); });
  window.addEventListener('pagehide', function () { flush(true); });
  if (Object.keys(dirty).length || todoOps.length || success !== null) { status('Not saved yet'); setTimeout(flush, 500); }

  // ---- Writing boxes ----
  var grow = function (el) { if (!el.offsetParent) return; el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight, 30) + 'px'; };
  var growAll = function () { Array.prototype.forEach.call(document.querySelectorAll('textarea'), grow); };
  var deeper = function (el) { var d = $(el.id + '-d'); if (d) d.hidden = el.value.trim().length < 40; };
  Object.keys(P).concat(['mqnote']).forEach(function (id) {
    var el = $(id); if (!el) return;
    el.value = V[id] || '';
    el.addEventListener('input', function () { change(id, el.value); grow(el); deeper(el); });
    el.addEventListener('blur', function () { if (dirty[id]) flush(); });
    deeper(el);
  });
  function stamp(id, when) {
    var i = (D.quests || []).map(function (q) { return q.id; }).indexOf(id), el = $('quest' + i + '-at');
    if (!el) return;
    var today = when && dayOf(when) === dayOf(new Date());
    el.hidden = !(today && (V['q:' + id] || '').trim());
    if (!el.hidden) el.textContent = 'Added ' + hhmm(when);
  }
  (D.quests || []).forEach(function (q, i) {
    var el = $('quest' + i), key = 'q:' + q.id;
    el.value = V[key] || '';
    el.addEventListener('input', function () { change(key, el.value); grow(el); });
    el.addEventListener('blur', function () { if (dirty[key]) flush(); });
    stamp(q.id, q.at ? new Date(q.at) : null);
  });
  window.addEventListener('resize', growAll);

  // Questions: today's from the 03:00 run first, then the fixed ones.
  var Q = {};
  Object.keys(P).forEach(function (id) {
    var first = D.sections[id] && D.sections[id].q, list = (first ? [first] : []).concat(P[id].more);
    Q[id] = list;
    var q = $(id + '-q'); if (q) q.textContent = list[(UI['n_' + id] || 0) % list.length];
  });
  Array.prototype.forEach.call(document.querySelectorAll('.entry'), function (en) {
    en.addEventListener('focusin', function (e) {
      // Only writing moves the nudges: a tapped button would otherwise shift the page under the finger.
      if (!/^(TEXTAREA|INPUT)$/.test(e.target.tagName)) return;
      Array.prototype.forEach.call(document.querySelectorAll('.entry.active'), function (x) { if (x !== en) x.classList.remove('active'); }); en.classList.add('active'); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.more'), function (b) {
    var id = b.getAttribute('data-box');
    b.addEventListener('click', function () { UI['n_' + id] = ((UI['n_' + id] || 0) + 1) % Q[id].length; saveUI(); $(id + '-q').textContent = Q[id][UI['n_' + id]]; });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.chip[data-for]'), function (c) {
    c.addEventListener('click', function () {
      var t = $(c.getAttribute('data-for')), w = c.textContent.replace(/…$/, ' ');
      t.value = t.value.trim() ? t.value.replace(/\s*$/, '\n') + w : w;
      t.dispatchEvent(new Event('input')); t.focus(); t.setSelectionRange(t.value.length, t.value.length);
    });
  });

  // ---- Today's focus: Enter on a filled line adds the next; Backspace on an empty one removes it ----
  function focusChanged(g, now) { change('f:' + g, undefined, now); }
  function drawGroup(g, focusAt) {
    var box = document.querySelector('.rows[data-group="' + g + '"]'); if (!box) return;
    box.innerHTML = '';
    F[g].forEach(function (it, i) {
      var row = document.createElement('label'); row.className = 'line' + (it.c ? ' done' : '');
      row.innerHTML = '<input type="checkbox" aria-label="Done"' + (it.c ? ' checked' : '') + '><input type="text" enterkeyhint="next" aria-label="' + box.getAttribute('data-label') + ' ' + (i + 1) + '" placeholder="' + (i ? 'And…' : box.getAttribute('data-ph')) + '">';
      var cb = row.children[0], tx = row.children[1];
      tx.value = it.t;
      tx.addEventListener('input', function () { it.t = tx.value; if (it.todo) it.todo = null; focusChanged(g); todos(); });
      tx.addEventListener('blur', function () { if (dirty['f:' + g]) flush(); });
      cb.addEventListener('change', function () { tick(g, it, cb.checked); row.classList.toggle('done', cb.checked); });
      tx.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.isComposing) {
          e.preventDefault();
          if (!tx.value.trim()) return;
          if (F[g][i + 1] && !F[g][i + 1].t.trim()) return drawGroup(g, i + 1);
          F[g].splice(i + 1, 0, { t: '', c: false }); drawGroup(g, i + 1);
        } else if (e.key === 'Backspace' && !tx.value && F[g].length > 1) {
          e.preventDefault(); F[g].splice(i, 1); focusChanged(g); drawGroup(g, Math.max(0, i - 1));
        }
      });
      box.appendChild(row);
    });
    if (focusAt !== undefined) { var t = box.querySelectorAll('input[type=text]')[focusAt]; if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }
  }
  function tick(g, it, on) {
    it.c = on;
    if (it.todo) todoOps.push({ id: it.todo, done: on });
    focusChanged(g, true);
  }
  Object.keys(F).forEach(function (g) { drawGroup(g); });
  // To-do suggestions: one quiet line; a picked one fills the first empty line of its group.
  var SUG = (D.suggestions || []).filter(function (s) { return F[s.group] || F.can; });
  function todos() {
    var el = $('sugg'); if (!el) return;
    var taken = {}; Object.keys(F).forEach(function (g) { F[g].forEach(function (it) { taken[it.t.trim().toLowerCase()] = 1; }); });
    var left = SUG.filter(function (s) { return !taken[s.t.trim().toLowerCase()]; });
    el.hidden = !left.length;
    el.innerHTML = '<span>From your to-dos:</span> ' + left.map(function (s, i) { return (i ? '<span class="dot">·</span>' : '') + '<button type="button" class="todo" data-id="' + esc(s.id) + '">' + esc(s.t) + '</button>'; }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('.todo'), function (b) {
      b.addEventListener('click', function () {
        var s = SUG.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0], g = F[s.group] ? s.group : 'can';
        var slot = F[g].filter(function (it) { return !it.t.trim(); })[0];
        if (!slot) { slot = { t: '', c: false }; F[g].push(slot); }
        slot.t = s.t; slot.todo = s.id;
        todoOps.push({ id: s.id, link: true });
        focusChanged(g, true); drawGroup(g); todos();
      });
    });
  }
  todos();
  var focusItems = function () { var out = []; Object.keys(F).forEach(function (g) { F[g].forEach(function (it) { if (it.t.trim()) out.push({ g: g, it: it }); }); }); return out; };

  // ---- Hand-offs ----
  (function lastNight() {
    var l = D.last || {}, h = '';
    if ((l.tomorrow || '').trim()) h += '<p class="soft">Last night, for today:</p><blockquote>' + esc(l.tomorrow.trim()) + '</blockquote>';
    if ((l.park || '').trim()) h += '<p class="soft">You parked:</p><blockquote>' + esc(l.park.trim()) + '</blockquote>';
    if (h) { $('lastnight').innerHTML = '<div class="label">From last night</div>' + h; $('lastnight').hidden = false; }
  })();
  function lookback() {
    var w = (V.winif || '').trim(), items = focusItems();
    var h = '<div class="label">This morning</div>';
    if (w) h += '<blockquote>Today is a win if ' + esc(w.replace(/^…\s*/, '')) + '</blockquote><div class="did">' +
      ['It happened', 'Partly', 'Not today'].map(function (o) { return '<button type="button" data-did="' + o + '" aria-pressed="' + (V.did === o) + '">' + o + '</button>'; }).join('') + '</div>';
    else h += '<p class="soft">No plan this morning. What ended up mattering most today? Start there.</p>';
    if (items.length) h += '<div class="ticks">' + items.map(function (f, i) { var c = f.it.c; return '<label class="line' + (c ? ' done' : '') + '"><input type="checkbox" data-k="' + i + '"' + (c ? ' checked' : '') + '><input type="text" value="' + esc(f.it.t) + '" readonly tabindex="-1" aria-label="' + esc(f.it.t) + '"></label>'; }).join('') + '</div>';
    $('lookback').innerHTML = h;
    Array.prototype.forEach.call(document.querySelectorAll('[data-did]'), function (b) { b.addEventListener('click', function () { change('did', V.did === b.getAttribute('data-did') ? '' : b.getAttribute('data-did'), true); lookback(); }); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-k]'), function (b) { b.addEventListener('change', function () { var f = items[+b.getAttribute('data-k')]; tick(f.g, f.it, b.checked); drawGroup(f.g); lookback(); }); });
  }
  function recap() {
    var bits = [['Headspace', V.headspace], ['Win if', V.winif], ['Focus', focusItems().map(function (f) { return f.it.t.trim(); }).join(' · ')], ['Looking forward', V.forward]]
      .filter(function (b) { return b[1] && String(b[1]).trim(); });
    $('m-recap').innerHTML = '<div class="recap">' + (UI.bye ? '<p class="bye" style="margin-bottom:6px">Have a good day, Roy. Tonight starts with your “win if”.</p>' : '') +
      (bits.length ? bits.map(function (b) { return '<p><b>' + b[0] + '</b>' + esc(b[1]) + '</p>'; }).join('') : '<p class="later" style="font-size:17px">Nothing written this morning.</p>') +
      '<button type="button" class="link" id="edit-m">' + (bits.length ? 'Open the morning ›' : 'Write it now ›') + '</button></div>';
    $('edit-m').addEventListener('click', function () { UI.mopen = true; UI.bye = false; saveUI(); layout(); });
  }

  // ---- Daily theme: layered hills, one palette per weekday; dawn in the morning, dusk at night ----
  var THEMES = [
    ['Pine', ['#e3efe9', '#bfd8cc', '#98bfae', '#739f8d']], ['Meadow', ['#eef5df', '#d3e6b8', '#b3d190', '#8fb86d']],
    ['Harbour', ['#e4eef8', '#c3d8ee', '#9dbfe2', '#7aa4d2']], ['Dunes', ['#f8eedc', '#f0d9b0', '#e5c088', '#d4a466']],
    ['Lavender', ['#eee9f7', '#d8cdee', '#bfaee2', '#a28fd0']], ['Coast', ['#e0f3f2', '#b7e2e0', '#8dcfcc', '#63b5b3']],
    ['Ember', ['#faeae0', '#f3cdb7', '#e9ac8c', '#d98b68']]
  ];
  var themeDay = new Date(D.day + 'T12:00:00Z').getUTCDay();
  function mix(a, b, t) { var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); var r = function (s) { return Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t); }; return 'rgb(' + r(16) + ',' + r(8) + ',' + r(0) + ')'; }
  function scene(evening) {
    var t = THEMES[themeDay], c = t[1], W = 1200, Hh = 360;
    var tint = function (col) { return evening ? mix(col, '#5b5f8f', .28) : col; };
    var seed = themeDay * 97 + 13, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    var hill = function (base, amp, col) { var d = 'M0,' + Hh + ' L0,' + base, n = 6; for (var i = 1; i <= n; i++) { var x = W * i / n, y = base + (rnd() - .5) * amp * 2; d += ' Q' + (x - W / n / 2) + ',' + (base - amp * (rnd() + .2)) + ' ' + x + ',' + y; } return '<path d="' + d + ' L' + W + ',' + Hh + ' Z" fill="' + col + '"/>'; };
    var sky = evening ? ['#d9d3ea', mix(c[0], '#f4d9c9', .5)] : [mix(c[0], '#ffffff', .4), c[0]];
    var orb = evening ? '<circle cx="' + (W * .64) + '" cy="70" r="22" fill="#fbf6e8"/><circle cx="' + (W * .64 + 9) + '" cy="64" r="20" fill="' + sky[0] + '"/>' +
        [[.12, 40], [.3, 90], [.52, 50], [.66, 110], [.9, 36]].map(function (s) { return '<circle cx="' + W * s[0] + '" cy="' + s[1] + '" r="1.6" fill="#ffffff" opacity=".9"/>'; }).join('')
      : '<circle cx="' + (W * .64) + '" cy="96" r="34" fill="' + mix(c[3], '#fff4d6', .55) + '" opacity=".8"/>';
    $('scene').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" preserveAspectRatio="xMidYMax slice"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sky[0] + '"/><stop offset="1" stop-color="' + sky[1] + '"/></linearGradient></defs>' +
      '<rect width="' + W + '" height="' + Hh + '" fill="url(#sky)"/>' + orb + hill(200, 26, tint(c[1])) + hill(240, 22, tint(c[2])) + hill(282, 18, tint(c[3])) + '</svg>';
    $('theme-name').textContent = ' · ' + t[0];
  }

  // ---- Morning or evening: by the clock (evening from 15:00; the day ends at 03:00) ----
  var hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  var evening = dayOf(new Date()) !== D.day || hour >= 15;
  function layout() {
    scene(evening);
    $('greet').textContent = evening ? 'Good evening, Roy' : 'Good morning, Roy';
    $('sub').textContent = (D.sub && (evening ? D.sub.evening : D.sub.morning)) || '';
    var folded = !UI.mopen && (evening || UI.mdone);
    $('m-open').hidden = folded; $('m-recap').hidden = !folded;
    var eOpen = evening || UI.eopen;
    $('e-open').hidden = !eOpen; $('e-later').hidden = eOpen;
    recap(); lookback(); growAll();
  }
  $('open-evening').addEventListener('click', function () { UI.eopen = true; saveUI(); layout(); });
  $('m-done').addEventListener('click', function () {
    UI.mdone = true; UI.mopen = false; UI.bye = true; saveUI(); flush(); layout();
    $('m-recap').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  $('e-done').addEventListener('click', function () { flush(); $('bye').hidden = false; });
  layout();

  // ---- Main quest check-in ----
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = $('burst'), cx = cv.getContext('2d'), parts = [], running = false;
  var win = $('win'), lose = $('lose'), out = $('ci-out'), base = typeof D.run === 'number' ? D.run - (D.run_includes_today ? 1 : 0) : null;
  function celebrate() {
    var card = document.querySelector('.checkin'), streak = $('streak');
    card.classList.remove('flare'); streak.classList.remove('pop'); void card.offsetWidth;
    card.classList.add('flare'); streak.classList.add('pop');
    var plus = document.createElement('span'); plus.className = 'plus'; plus.textContent = '+1 day';
    card.appendChild(plus); setTimeout(function () { plus.remove(); }, 1400);
    if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
    if (still) return;
    var dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var r = win.getBoundingClientRect(), ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    var colors = ['#f0b53c', '#ffd66b', '#ff9d2e', '#fff3c4', '#4cbf85'];
    for (var i = 0; i < 140; i++) {
      var a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 9;
      parts.push({ x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, life: 1, decay: .008 + Math.random() * .012,
        size: 2 + Math.random() * 4, c: colors[i % colors.length], star: i % 4 === 0, spin: Math.random() * 6 });
    }
    if (!running) { running = true; requestAnimationFrame(frame); }
  }
  function frame() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(function (p) { return p.life > 0; });
    parts.forEach(function (p) {
      p.vx *= .97; p.vy = p.vy * .97 + .25; p.x += p.vx; p.y += p.vy; p.life -= p.decay; p.spin += .2;
      cx.globalAlpha = Math.max(0, p.life); cx.fillStyle = p.c; cx.shadowColor = p.c; cx.shadowBlur = 8;
      if (p.star) { cx.save(); cx.translate(p.x, p.y); cx.rotate(p.spin); cx.fillRect(-p.size, -p.size / 4, p.size * 2, p.size / 2); cx.fillRect(-p.size / 4, -p.size, p.size / 2, p.size * 2); cx.restore(); }
      else { cx.beginPath(); cx.arc(p.x, p.y, p.size / 2 + 1, 0, Math.PI * 2); cx.fill(); }
    });
    cx.globalAlpha = 1; cx.shadowBlur = 0;
    if (parts.length) requestAnimationFrame(frame); else { running = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function check(v, write) {
    checkin = v;
    win.setAttribute('aria-pressed', v === 'win'); lose.setAttribute('aria-pressed', v === 'lose');
    $('after').hidden = !v;
    $('mqnote-q').textContent = v === 'win' ? 'What helped you stay on track today?' : 'What happened just before? Time, place, mood, what you were avoiding.';
    if (v) grow($('mqnote'));
    var n = base === null ? null : base + (v === 'win' ? 1 : 0);
    $('streak').textContent = n === null ? '' : '🔥 ' + n + (n === 1 ? ' day' : ' days');
    out.textContent = !write ? '' : v === 'win' && n !== null ? 'That makes ' + n + (n === 1 ? ' day' : ' days') + ' in a row.' : v === 'lose' ? 'Noted. Tomorrow is a fresh start.' : '';
    if (write) { success = v === 'win'; change('mq', v || '', true); }
  }
  win.addEventListener('click', function () { var on = checkin !== 'win'; check(on ? 'win' : null, true); if (on) celebrate(); });
  lose.addEventListener('click', function () { check(checkin === 'lose' ? null : 'lose', true); });
  check(checkin, false);
})();
`.replace('__PROMPTS__', () => JSON.stringify(Object.fromEntries(Object.entries(PROMPTS).map(([k, v]) => [k, { more: v.more }]))));
