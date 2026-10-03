// GET /journal: the journal page (see src/journal.js for what is read and
// written). One calm notebook column for the iPad mini, the phone and the Mac:
// Morning above Evening, then the main quest and the quests, open all day.
// In the evening the morning folds into a short recap, and each half ends
// with a button that hands a line to the next. Drawn by a small script from
// the data below; writing saves itself to the day's journal row in D1 a
// moment after Roy stops typing (and on the buttons), and a copy stays in the
// browser until the save is through.

import { MOOD_ART_VERSION } from './moodart.js';

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
    starters: ['Honestly, I feel…', 'What bugs me is…'] },
  winif: { icon: '🎯', name: 'Today is a win if…', more: ['Finish the sentence. One thing, so tonight you can tell whether it happened.', 'What’s the smallest thing that would still make today count?'],
    starters: ['I…', 'I don’t…'] },
  forward: { icon: '😄', name: 'Looking forward to', more: ['What small moment today would make you smile if it happened?', 'Who would you like to catch up with today?'], starters: ['I’d like to…'] },
  reflection: { icon: '🌙', name: 'Reflection', more: ['When today did you feel most like yourself?', 'What drained you today, and what gave something back?', 'What surprised you today?'],
    starters: ['What stood out was…', 'I noticed…'] },
  park: { icon: '🅿️', name: 'Park it', more: ['What’s still spinning? Write it down and leave it here for tonight.', 'Anything you’re carrying to bed that you can put down now?'],
    starters: ['Still on my mind:', 'I’ll deal with…'] },
  tomorrow: { icon: '➡️', name: 'For tomorrow', more: ['What’s one thing you can take off tomorrow’s plate?', 'What would make tomorrow morning easy to start?'],
    starters: ['Tomorrow I want…'] }
};

const STYLE = `
:root{
  --bg:#eef1f5; --surface:#ffffff; --ink:#18202b; --muted:#5e6a7a; --line:#d9dee6; --track:#e3e7ee;
  --gold:#b57a0c; --gold-soft:#fbf1dc; --ki:#2f6fd1; --ki-soft:#e6eefb; --warn:#b3261e;
  --night:#2b3550; --night-soft:#e9ebf4; --rule:#e6e9ef;
  --ok:#2e8f5c; --ok-soft:#e3f3ea; --warn-soft:#fbe7e5;
  --write:#f4f7fd; --write-night:#f3f4f9; --write-quest:#f7f8fa;
  --serif:"Source Serif 4",Georgia,"Times New Roman",serif;
  --sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --paper:var(--surface); color-scheme:light;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#0e1219; --surface:#171d27; --ink:#e8ecf2; --muted:#95a1b2; --line:#283141; --track:#262f3d;
  --gold:#f0b53c; --gold-soft:#2c2414; --ki:#5b93ea; --ki-soft:#1a2638; --warn:#f0645a;
  --night:#aab6e0; --night-soft:#1b2033; --rule:#232b38;
  --ok:#4cbf85; --ok-soft:#142a20; --warn-soft:#321a19;
  --write:#1b2331; --write-night:#1d2131; --write-quest:#1a1f29; color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#0e1219; --surface:#171d27; --ink:#e8ecf2; --muted:#95a1b2; --line:#283141; --track:#262f3d;
  --gold:#f0b53c; --gold-soft:#2c2414; --ki:#5b93ea; --ki-soft:#1a2638; --warn:#f0645a;
  --night:#aab6e0; --night-soft:#1b2033; --rule:#232b38;
  --ok:#4cbf85; --ok-soft:#142a20; --warn-soft:#321a19;
  --write:#1b2331; --write-night:#1d2131; --write-quest:#1a1f29; color-scheme:dark}
/* Type (Roy, 1 Oct: calm and easy on the eyes). Two faces only: Source Serif 4 (close to
   Notion's serif) for everything read or written, the system sans for small controls and
   notes. The page asks in serif italic, Roy writes in upright serif, titles are semibold.
   No capitals with letter-spacing, and few sizes. */
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{margin:0}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;position:relative}
.page{max-width:700px;margin:0 auto;padding-inline:max(16px,env(safe-area-inset-left));padding-block:max(20px,env(safe-area-inset-top)) max(48px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:22px;position:relative;z-index:1}
button,input,textarea{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--ki);outline-offset:3px;border-radius:6px}
.top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.back{font-size:15px;font-weight:500;color:var(--muted);text-decoration:none;min-height:32px;display:inline-flex;align-items:center}
.saved{font-size:12.5px;color:var(--muted);min-height:1.2em}
.saved.bad{color:var(--warn);font-weight:600}
.hello{display:flex;flex-direction:column;gap:6px;padding-top:4px}
.date{font-size:13.5px;font-weight:500;color:var(--muted)}
h1{font-family:var(--serif);font-weight:600;font-size:36px;line-height:1.12;margin:0;letter-spacing:-.01em;text-wrap:balance}
.sub{margin:0;font-family:var(--serif);font-style:italic;font-size:18px;line-height:1.5;color:var(--muted)}
h2{font-family:var(--serif);font-weight:600;font-size:22px;margin:14px 0 -6px;color:var(--ink)}
.sheet{background:var(--paper);border-radius:22px;padding:24px 24px 22px;display:flex;flex-direction:column;gap:30px;box-shadow:0 1px 2px rgba(20,26,36,.04)}
.entry{display:flex;flex-direction:column;gap:8px;position:relative}
.label{font-family:var(--serif);font-size:18px;font-weight:600;line-height:1.35;color:var(--ink)}
.q{margin:0;font-family:var(--serif);font-style:italic;font-size:18px;line-height:1.5;color:var(--muted);text-wrap:pretty}
/* Roy's writing: upright serif in full ink in a plain box: a soft fill and a hairline border
   that takes the half's colour while he writes. No ruled lines; two lines tall when empty,
   growing as he types. */
textarea{width:100%;display:block;resize:none;overflow:hidden;border:1px solid var(--rule);border-radius:14px;
  background-color:var(--write);color:var(--ink);font-family:var(--serif);font-weight:400;
  font-size:18px;line-height:1.6;padding:12px 16px;min-height:calc(3.2em + 26px);transition:border-color .2s}
.evening textarea{background-color:var(--write-night)}
textarea:focus{outline:none;border-color:color-mix(in srgb,var(--ki) 55%,transparent)}
.evening textarea:focus{border-color:color-mix(in srgb,var(--night) 60%,transparent)}
textarea::placeholder{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--muted);opacity:.6}
.hint{margin:0;font-size:13.5px;color:var(--muted)}
/* Nudges that never move the page: "↻ another" beside the label (brighter in the box
   you're writing in) and a starter as grey text in an empty box. */
.more{position:absolute;top:0;right:0;border:0;background:none;cursor:pointer;font-size:13.5px;color:var(--muted);padding:2px 0;opacity:.6;transition:opacity .2s,color .2s}
.entry.active .more{opacity:1;color:var(--ki)}
.evening .entry.active .more{color:var(--night)}
.more:hover{opacity:1}
/* The recaps and the endings. */
.recap{display:flex;flex-direction:column;gap:6px;padding:16px 20px;border-radius:18px;background:var(--ki-soft)}
.recap p{margin:0;font-family:var(--serif);font-size:17px;line-height:1.5;white-space:pre-wrap}
.recap b{font-size:13.5px;font-weight:500;color:var(--muted);margin-right:8px}
.recap.night{background:var(--night-soft)}
.recap.night .link{color:var(--night)}
.link{border:0;background:none;padding:4px 0;color:var(--ki);font-family:var(--sans);font-style:normal;font-size:14px;font-weight:500;cursor:pointer;align-self:flex-start;min-height:32px}
.later{margin:0;color:var(--muted);font-family:var(--serif);font-style:italic;font-size:17px;line-height:1.5}
/* Start my day / End my day: a full-width pill, sunrise in the morning and dusk at night
   (Roy picked option A, 2 Oct). */
.end{display:flex;flex-direction:column;align-items:stretch;gap:8px;padding-top:4px}
.endbtn{min-height:54px;padding:0 24px;border-radius:999px;border:0;cursor:pointer;font-family:var(--serif);font-size:18px;font-weight:600;letter-spacing:.005em;
  color:#4a2c0c;background:linear-gradient(120deg,#ffe3a3 0%,#fbc483 55%,#f4a483 100%);box-shadow:0 10px 24px -14px rgba(220,120,50,.9),inset 0 1px 0 rgba(255,255,255,.55);
  transition:transform .12s ease;-webkit-tap-highlight-color:transparent}
.endbtn:active{transform:scale(.97)}
#e-done{color:#f5f2ff;background:linear-gradient(120deg,#3c4377 0%,#5d4f8f 55%,#8a6098 100%);box-shadow:0 10px 24px -14px rgba(50,40,110,.9),inset 0 1px 0 rgba(255,255,255,.18)}
.bye{margin:0;font-family:var(--serif);font-style:italic;font-size:17px;line-height:1.5;color:var(--muted)}
.close{padding:6px 0 0}
/* Main quest: a page card with a warm gold wash (light by day, dark at night). */
.checkin{background:linear-gradient(180deg,var(--gold-soft),var(--paper) 75%);color:var(--ink);border-radius:22px;padding:22px 24px;display:flex;flex-direction:column;gap:14px;position:relative;box-shadow:0 1px 2px rgba(20,26,36,.04);transition:box-shadow .3s}
.ci-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
.checkin h3{font-family:var(--serif);font-weight:600;font-size:22px;line-height:1.3;margin:2px 0 0}
.lvl{font-weight:600;font-size:15px;color:var(--gold);white-space:nowrap;font-variant-numeric:tabular-nums}
.ci-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ci{text-align:left;cursor:pointer;border-radius:16px;padding:14px 16px;border:1px solid var(--line);background:transparent;color:var(--ink);display:flex;flex-direction:column;gap:2px;min-height:70px}
.ci b{font-size:15.5px;font-weight:600}
.ci span{font-size:13.5px;color:var(--muted)}
.ci.win[aria-pressed="true"]{background:var(--ok-soft);border-color:var(--ok)}
.ci.lose[aria-pressed="true"]{background:var(--warn-soft);border-color:var(--warn)}
.after{display:flex;flex-direction:column;gap:8px;animation:rise-in .35s ease-out}
@keyframes rise-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.ci-out{margin:0;min-height:1.2em;font-family:var(--serif);font-style:italic;font-size:17px;color:var(--muted)}
/* Quests: one card per active quest, a quick update rather than a journal page: the title,
   the question and a small plain box. The main quest's note uses the same box. */
.quests{display:flex;flex-direction:column;gap:12px}
.qintro{margin:0 0 2px}
.qcard{background:var(--paper);border-radius:18px;padding:18px 20px 16px;gap:6px;box-shadow:0 1px 2px rgba(20,26,36,.04)}
.qcard .q,.checkin .q{font-size:17px;margin-bottom:4px}
.qcard textarea,.checkin textarea{background-color:var(--write-quest)}
.qcard textarea:focus,.checkin textarea:focus{border-color:color-mix(in srgb,var(--gold) 60%,transparent)}
.stamp{margin:0;font-size:13.5px;color:var(--muted)}
/* Mood: Roy's five pictures in a row at the top of each half, 1 Sucky to 5 On fire
   (Roy's design, 2 Oct). The pick sits on a soft tile with its word beneath; tap
   it again to clear. */
.entry.mood{gap:6px;margin-bottom:-14px}
.moods{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;justify-items:center;align-items:center;margin:4px 0 0}
.mood-c{display:flex;flex-direction:column;align-items:center;gap:2px;width:100%}
.mood-b{width:100%;max-width:76px;aspect-ratio:1;border:0;border-radius:22px;padding:0;background:transparent;cursor:pointer;display:grid;place-items:center;
  -webkit-tap-highlight-color:transparent;transition:transform .12s ease,opacity .2s ease,background-color .2s ease}
.mood-b:active{transform:scale(.94)}
.mood-b img{width:84%;height:84%;object-fit:contain;display:block;transition:transform .2s ease}
.mood-b[data-v="5"] img{width:96%;height:96%}
.mood-b[aria-checked="true"]{background:var(--ki-soft)}
.evening .mood-b[aria-checked="true"]{background:var(--night-soft)}
.mood-b[aria-checked="true"] img{transform:scale(1.06)}
.moods.picked .mood-b:not([aria-checked="true"]){opacity:.5}
.mood-n{font-family:var(--serif);font-style:italic;font-size:15px;line-height:1.3;color:var(--ink);white-space:nowrap;visibility:hidden}
.mood-b[aria-checked="true"]+.mood-n{visibility:visible}
.recap .mini{width:22px;height:22px;vertical-align:-5px;display:inline-block;margin-right:4px}
/* Daily theme: layered hills behind the header, and the day's colour washing
   down the whole page (set by the script as --day-top / --day-end). */
body{min-height:100vh;background:linear-gradient(180deg,var(--day-top,var(--bg)) 0,var(--day-top,var(--bg)) 360px,var(--day-end,var(--bg)) 100%)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) body{background:linear-gradient(180deg,var(--day-top-dark,var(--bg)) 0,var(--day-end-dark,var(--bg)) 100%)}}
:root[data-theme="dark"] body{background:linear-gradient(180deg,var(--day-top-dark,var(--bg)) 0,var(--day-end-dark,var(--bg)) 100%)}
.scene{position:absolute;inset:0 0 auto 0;height:360px;z-index:0;pointer-events:none;overflow:hidden;
  -webkit-mask-image:linear-gradient(to bottom,#000 55%,transparent);mask-image:linear-gradient(to bottom,#000 55%,transparent)}
.scene svg{width:100%;height:100%;display:block}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .scene{opacity:.28}}
:root[data-theme="dark"] .scene{opacity:.28}
.foot{font-size:13px;color:var(--muted);text-align:center;margin:8px 0 0}
.foot a{color:inherit}
.empty{display:flex;flex-direction:column;gap:10px}
/* Success: a gold burst from the button, the card flares, the streak ticks up. */
#burst{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50}
.checkin.flare{animation:flare 1.4s ease-out}
@keyframes flare{0%{box-shadow:0 0 0 0 rgba(240,181,60,.9)}25%{box-shadow:0 0 0 6px rgba(240,181,60,.8),0 0 60px 20px rgba(240,181,60,.45)}100%{box-shadow:0 0 0 0 rgba(240,181,60,0)}}
.lvl .days{display:inline-block}
.lvl .days.pop{animation:pop .7s cubic-bezier(.3,1.6,.5,1)}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.6);text-shadow:0 0 12px #f0b53c}100%{transform:scale(1)}}
.plus{position:absolute;right:20px;top:14px;font-weight:600;font-size:18px;color:var(--gold);pointer-events:none;animation:rise 1.3s ease-out forwards}
@keyframes rise{0%{opacity:0;transform:translateY(8px)}20%{opacity:1}100%{opacity:0;transform:translateY(-34px)}}
@media (max-width:480px){.sheet{padding:20px 18px 18px;border-radius:18px} .qcard{padding:16px 18px 14px} .scene{height:300px}
  h1{font-size:31px} h2{font-size:21px} .label{font-size:17.5px} .q,textarea{font-size:17.5px} .qcard .q,.checkin .q{font-size:16.5px}}
@media (max-width:360px){.ci-btns{grid-template-columns:1fr}}
.wrow{display:flex;flex-wrap:wrap;gap:12px 16px}
.wsel{display:flex;flex-direction:column;gap:5px;min-width:130px;flex:1 1 130px;max-width:220px}
.wk{font-size:13.5px;font-weight:500;color:var(--muted)}
.wsel select{appearance:none;-webkit-appearance:none;font:inherit;font-family:var(--sans);font-size:16px;color:var(--ink);background-color:var(--write-night);
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23888' stroke-width='1.6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 12px center;border:1px solid var(--rule);border-radius:12px;padding:9px 34px 9px 12px;min-height:42px;cursor:pointer}
.wsel select:focus{outline:none;border-color:color-mix(in srgb,var(--night) 60%,transparent)}
#work .link{color:var(--night);margin-top:6px}
.folding{overflow:hidden;transition:height .5s cubic-bezier(.4,0,.2,1),opacity .35s ease;opacity:0}
.risein{animation:rise-in .45s ease both}
.recap.glow{position:relative;overflow:hidden;isolation:isolate}
.recap.glow::before{content:"";position:absolute;inset:-30%;z-index:-1;pointer-events:none;background:radial-gradient(closest-side at 88% 15%,rgba(255,206,110,.6),rgba(255,206,110,0));animation:glow 2.8s ease both}
.recap.night.glow::before{background:radial-gradient(closest-side at 85% 20%,rgba(150,140,230,.45),rgba(150,140,230,0))}
.recap .sky{position:absolute;right:18px;top:12px;font-size:20px;line-height:1;pointer-events:none;color:#e9a93a;animation:sunrise 2.4s cubic-bezier(.3,0,.2,1) both}
.recap.night .sky{color:var(--night);font-size:13px;letter-spacing:6px;animation:twinkle 2.4s ease both}
@keyframes glow{0%{opacity:0}35%{opacity:1}100%{opacity:.35}}
@keyframes sunrise{0%{opacity:0;transform:translateY(26px)}50%{opacity:1}100%{opacity:.75;transform:none}}
@keyframes twinkle{0%{opacity:0}30%{opacity:1}55%{opacity:.35}75%{opacity:1}100%{opacity:.6}}
@media (prefers-reduced-motion:reduce){*{transition:none!important} .after,.checkin.flare,.lvl .days.pop,.plus,.risein,.recap.glow::before,.recap .sky{animation:none}}
`;

// One writing box; the script fills in the question and the nudges.
const entry = (id, { small = false, evening = false, after = '' } = {}) => {
  const p = PROMPTS[id];
  return `<div class="entry${small ? ' small' : ''}" data-entry="${id}">
        <div class="label">${p.icon} ${esc(p.name)}</div>
        <button type="button" class="more" data-box="${id}" aria-label="Another question">↻ another</button>
        <p class="q" id="${id}-q"></p>
        <textarea id="${id}" aria-labelledby="${id}-q" rows="2" placeholder="${esc(p.starters[0] || '')}"></textarea>
        ${after}
        ${p.hint ? `<p class="hint">${esc(p.hint)}</p>` : ''}
      </div>`;
};

// The mood row (the script draws the five pictures).
const moodEntry = w => `<div class="entry small mood" data-entry="mood-${w}">
        <div class="label">💭 Mood</div>
        <p class="q">${w === 'm' ? 'How are you feeling this morning?' : 'How are you feeling tonight?'}</p>
        <div class="moods" role="radiogroup" aria-label="Mood ${w === 'm' ? 'this morning' : 'tonight'}" data-mood="${w}"></div>
      </div>`;

const head = title => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Journal"><meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#eef1f5" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0e1219" media="(prefers-color-scheme: dark)">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">
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
    ${d.mood ? moodEntry('m') : ''}
    ${d.sections.headspace ? entry('headspace') : ''}
    ${d.sections.forward ? entry('forward', { small: true }) : ''}
    ${entry('winif', { small: true })}
    <div class="end"><button type="button" class="endbtn" id="m-done">Start my day ☀</button></div>
  </section>

  <h2>🌙 Evening</h2>
  <p class="later" id="e-later" hidden>Opens here tonight. <button type="button" class="link" id="open-evening">Write now ›</button></p>
  <div id="e-recap" hidden></div>
  <div id="e-open" class="evening" style="display:flex;flex-direction:column;gap:22px">
    <section class="sheet" aria-label="Evening">
      ${d.mood ? moodEntry('e') : ''}
      ${d.sections.reflection ? entry('reflection') : ''}
      ${entry('park', { small: true })}
      ${d.sections.tomorrow ? entry('tomorrow', { small: true }) : ''}
      ${d.work ? '<div class="entry small" data-entry="work"><div class="label">🚗 Commute</div><div id="work"></div></div>' : ''}
    </section>
    <div class="end close"><button type="button" class="endbtn" id="e-done">End my day</button></div>
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
      <textarea id="mqnote" aria-labelledby="mqnote-q" rows="2" placeholder="A sentence or two…"></textarea>
    </div>
    <p class="ci-out" id="ci-out" aria-live="polite"></p>
  </section>

  ${d.quests.length ? `<h2>🗺️ Quests</h2>
  <section class="quests" aria-label="Quest updates">
    <p class="hint qintro">Any time of day, whenever something moves. Skip the rest.</p>
    ${d.quests.map((q, i) => `<div class="entry small qcard" data-entry="quest${i}">
        <div class="label">${esc(q.icon || '⚔️')} ${esc(q.title)}</div>
        <p class="q" id="quest${i}-q">${esc(q.question)}</p>
        <textarea id="quest${i}" data-quest="${esc(q.id)}" aria-labelledby="quest${i}-q" rows="2" placeholder="A sentence or two…"></textarea>
        <p class="stamp" id="quest${i}-at" hidden></p>
      </div>`).join('')}
  </section>` : ''}

  <canvas id="burst" aria-hidden="true"></canvas>
  ${d.errors && d.errors.length ? `<p class="hint">Some parts could not load: ${esc(d.errors.join('; '))}</p>` : ''}
  <p class="foot">Saves ${esc(d.title || 'your journal')} as you write.</p>
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

  // ---- What the page holds ----
  var V = {}, S = { sections: {}, extras: {}, quests: {}, focus: {} };
  Object.keys(D.sections || {}).forEach(function (k) { var s = D.sections[k]; if (s) { V[k] = s.text || ''; S.sections[k] = s.slot; } });
  Object.keys(D.extras || {}).forEach(function (k) { var x = D.extras[k]; V[k] = x ? x.text || '' : ''; S.extras[k] = x ? x.slot : null; });
  (D.quests || []).forEach(function (q) { V['q:' + q.id] = q.text || ''; S.quests[q.id] = q.slot; });
  var F = {};
  Object.keys(D.focus || {}).forEach(function (g) { F[g] = D.focus[g].items.length ? D.focus[g].items : [{ t: '', c: false }]; S.focus[g] = D.focus[g].slot; });
  if (D.work) V.work = { am: D.work.am || '', pm: D.work.pm || '', commute: D.work.commute || '' };
  var checkin = D.checkin || (D.success ? 'win' : null);
  V.mq = checkin || '';
  if (D.mood) { V.mood_m = D.mood.m || 0; V.mood_e = D.mood.e || 0; }
  var SECTION = { headspace: 1, forward: 1, reflection: 1, tomorrow: 1 };
  var EXTRA = { winif: 1, did: 1, park: 1, mq: 1, mqnote: 1 };

  // A copy in the browser until the save is through; the page's own switches per day.
  var KEY = 'journal:' + D.page, UIKEY = 'journal-ui:' + D.day;
  var store = function (k, v) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var load = function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  var UI = load(UIKEY) || {};
  var saveUI = function () { store(UIKEY, UI); };
  // Folded halves are kept on the server too, so a fold holds on every device until Roy opens it (src/fold.js).
  function takeFold(f) {
    if (!f) return false;
    var was = [UI.mdone, UI.mopen, UI.edone].join();
    UI.mdone = !!f.m; if (f.m) UI.mopen = false; UI.edone = !!f.e;
    saveUI();
    return was !== [UI.mdone, UI.mopen, UI.edone].join();
  }
  takeFold(D.fold);
  function keepFold(patch) {
    patch.day = D.day;
    fetch('/journal/fold', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch), credentials: 'same-origin', keepalive: true })
      .catch(function () {});
  }
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

  // ---- Saving: a moment after you stop typing, one save at a time. A copy
  // stays in this browser until the save is through. ----
  var timer = null, busy = false, again = false, failures = 0;
  var status = function (text, bad) { var el = $('saved'); el.textContent = text; el.className = 'saved' + (bad ? ' bad' : ''); };
  function change(key, value, now) {
    if (value !== undefined) V[key] = value;
    dirty[key] = 1; keepDraft(); status('');
    clearTimeout(timer); timer = setTimeout(flush, now ? 0 : 1200);
  }
  function body() {
    var b = { page: D.page, sections: {}, extras: {}, quests: {}, focus: {}, todos: todoOps.slice() };
    Object.keys(dirty).forEach(function (k) {
      if (SECTION[k]) b.sections[k] = { slot: S.sections[k], text: V[k] };
      else if (EXTRA[k]) b.extras[k] = { slot: S.extras[k], text: V[k] };
      else if (k.indexOf('q:') === 0) b.quests[k.slice(2)] = { slot: S.quests[k.slice(2)], text: V[k] };
      else if (k.indexOf('f:') === 0) b.focus[k.slice(2)] = { slot: S.focus[k.slice(2)], items: F[k.slice(2)] };
      else if (k === 'work' && D.work) b.work = { id: D.work.id, am: V.work.am, pm: V.work.pm, commute: V.work.commute };
      else if (k === 'mood_m' || k === 'mood_e') { b.mood = b.mood || {}; b.mood[k.slice(5)] = V[k] || null; }
      // The win is also a To-Do for the Quest Engine; its Status follows "The win".
      if (k === 'winif') b.win = { text: V.winif || '', day: D.day };
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
    fetch('/journal/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b), credentials: 'same-origin', keepalive: keepalive === true })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw j; return j; }); })
      .then(function (j) {
        ['sections', 'extras', 'quests', 'focus'].forEach(function (g) { Object.keys(j.slots[g] || {}).forEach(function (k) { S[g][k] = j.slots[g][k]; }); });
        Object.keys(sent).forEach(function (k) { if (k.indexOf('q:') === 0) stamp(k.slice(2), new Date()); });
        // A piece the save refused stays here for the next save; the rest is in.
        var missed = (j.failed || []).filter(function (f) { return f.code !== 'bad_request'; });
        missed.forEach(function (f) {
          if (f.key === 'success') { if (success === null) success = ok; }
          else if (f.key.indexOf('todo:') === 0) todoOps = ops.filter(function (o) { return 'todo:' + o.id === f.key; }).concat(todoOps);
          else dirty[f.key] = 1;
        });
        if (missed.length) console.warn('journal save: not saved', missed);
        failures = 0; busy = false; keepDraft();
        status(missed.length ? 'Saved ' + hhmm() + ', except ' + missed.map(function (f) { return NAMES[f.key] || 'a quest'; }).join(', ') + ' (' + missed[0].message + ')' : 'Saved ' + hhmm(), !!missed.length);
        // A refused piece waits for the next change, so it never loops.
        if (again) { again = false; flush(); }
      })
      .catch(function (e) {
        busy = false; again = false;
        Object.keys(sent).forEach(function (k) { dirty[k] = 1; });
        todoOps = ops.concat(todoOps); if (success === null) success = ok;
        keepDraft();
        if (e && e.code === 'signed_out') { status('Signed out. Your writing is kept here; sign in again to save.', true); return; }
        console.warn('journal save failed', e);
        failures++;
        status(failures > 2 ? 'Not saved yet, trying again. Your writing is kept here.' + (e && e.message ? ' (' + e.message + ')' : '') : 'Saving…', failures > 2);
        timer = setTimeout(flush, Math.min(30000, 2000 * failures));
      });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(true); });
  window.addEventListener('pagehide', function () { flush(true); });
  if (Object.keys(dirty).length || todoOps.length || success !== null) setTimeout(flush, 500);
  var NAMES = { headspace: 'Headspace', forward: 'Looking forward', winif: 'the win', reflection: 'Reflection', park: 'Park it', tomorrow: 'For tomorrow', work: 'the commute', mq: 'the main quest', mqnote: 'the main quest note', success: 'the main quest', did: 'the win', mood_m: 'the morning mood', mood_e: 'the evening mood' };

  // ---- Writing boxes ----
  var grow = function (el) { if (!el.offsetParent) return; el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight + el.offsetHeight - el.clientHeight, 30) + 'px'; };
  var growAll = function () { Array.prototype.forEach.call(document.querySelectorAll('textarea'), grow); };
  Object.keys(P).concat(['mqnote']).forEach(function (id) {
    var el = $(id); if (!el) return;
    el.value = V[id] || '';
    el.addEventListener('input', function () { change(id, el.value); grow(el); });
    el.addEventListener('blur', function () { if (dirty[id]) flush(); });
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
    if (id === 'reflection' && D.evening_q) list.unshift(D.evening_q);
    Q[id] = list;
    var q = $(id + '-q'); if (q) q.textContent = list[(UI['n_' + id] || 0) % list.length];
  });
  Array.prototype.forEach.call(document.querySelectorAll('.entry'), function (en) {
    en.addEventListener('focusin', function (e) {
      // Only writing marks the box you're in (a tapped ↻ keeps the box it belongs to).
      if (!/^(TEXTAREA|INPUT)$/.test(e.target.tagName)) return;
      Array.prototype.forEach.call(document.querySelectorAll('.entry.active'), function (x) { if (x !== en) x.classList.remove('active'); }); en.classList.add('active'); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.more'), function (b) {
    var id = b.getAttribute('data-box');
    b.addEventListener('mousedown', function (e) { e.preventDefault(); });
    b.addEventListener('click', function () { UI['n_' + id] = ((UI['n_' + id] || 0) + 1) % Q[id].length; saveUI(); $(id + '-q').textContent = Q[id][UI['n_' + id]]; });
  });

  // ---- The folded morning ----
  // ---- Mood: five pictures, 1 Sucky to 5 On fire; saved like the writing ----
  var MOODS = ['Sucky', 'Tired', 'Normal', 'Good', 'On fire'];
  var moodSrc = function (v) { return '/journal/mood/' + v + '.webp?v=${MOOD_ART_VERSION}'; };
  function moodText(w) { var v = V['mood_' + w]; return v ? MOODS[v - 1] : ''; }
  function moodHtml(w) { var v = V['mood_' + w]; return v ? '<img class="mini" src="' + moodSrc(v) + '" alt="">' + MOODS[v - 1] : ''; }
  function drawMoods() {
    Array.prototype.forEach.call(document.querySelectorAll('.moods'), function (box) {
      var w = box.getAttribute('data-mood'), v = V['mood_' + w] || 0;
      box.classList.toggle('picked', !!v);
      box.innerHTML = MOODS.map(function (n, i) {
        var on = v === i + 1;
        return '<div class="mood-c"><button type="button" class="mood-b" role="radio" aria-checked="' + on + '" aria-label="' + n + '" data-v="' + (i + 1) + '">' +
          '<img src="' + moodSrc(i + 1) + '" alt=""></button><span class="mood-n"' + (on ? '' : ' aria-hidden="true"') + '>' + n + '</span></div>';
      }).join('');
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.mood-b'); if (!b) return;
    var key = 'mood_' + b.closest('.moods').getAttribute('data-mood'), v = Number(b.getAttribute('data-v'));
    change(key, V[key] === v ? 0 : v, true); drawMoods();
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (x) {}
  });
  drawMoods();

  function recap() {
    var bits = [['Mood', moodText('m'), moodHtml('m')], ['Headspace', V.headspace], ['Looking forward', V.forward], ['Win if', V.winif]]
      .filter(function (b) { return b[1] && String(b[1]).trim(); });
    $('m-recap').innerHTML = '<div class="recap">' + (UI.bye ? '<p class="bye" style="margin-bottom:6px">Have a good day, Roy.</p>' : '') +
      (bits.length ? bits.map(function (b) { return '<p><b>' + b[0] + '</b>' + (b[2] || esc(b[1])) + '</p>'; }).join('') : '<p class="later" style="font-size:17px">Nothing written this morning.</p>') +
      '<button type="button" class="link" id="edit-m">' + (bits.length ? 'Open the morning ›' : 'Write it now ›') + '</button></div>';
    $('edit-m').addEventListener('click', function () { UI.mopen = true; UI.mdone = false; UI.bye = false; saveUI(); keepFold({ m: false }); layout(); });
  }
  // ---- Commute: today's Work Location Log row, as two drop-downs ----
  var PLACES = ['🇳🇱 Home', '🇧🇪 Beerse', '🇧🇪 Ghent', '🏖️ Holiday'];
  var RIDES = ['🚲 E-bike', '🚗 Car', 'N/A'];
  var NO_RIDE = { '🇳🇱 Home': 1, '🏖️ Holiday': 1 };
  var workSplit = false;
  function drawWork() {
    if (!D.work || !$('work')) return;
    var w = V.work;
    var pick = function (k, label, list, value) {
      var opts = list.slice(); if (value && opts.indexOf(value) < 0) opts.push(value);   // keeps what the row already has
      return '<label class="wsel"><span class="wk">' + label + '</span><select data-w="' + k + '"><option value="">–</option>' +
        opts.map(function (o) { return '<option value="' + esc(o) + '"' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></label>';
    };
    // One "Where" sets the whole day; a split day shows morning and afternoon.
    var split = workSplit || w.am !== w.pm;
    $('work').innerHTML = '<div class="wrow">' + (split ? pick('am', 'Morning', PLACES, w.am) + pick('pm', 'Afternoon', PLACES, w.pm) : pick('day', 'Where', PLACES, w.am)) +
      pick('commute', 'Getting there', RIDES, w.commute) + '</div>' +
      (split ? '' : '<button type="button" class="link" id="work-split">Different in the afternoon ›</button>');
    var sp = $('work-split'); if (sp) sp.addEventListener('click', function () { workSplit = true; drawWork(); });
    document.querySelectorAll('[data-w]').forEach(function (el) { el.addEventListener('change', function () {
      var k = el.dataset.w, v = el.value;
      if (k === 'day') w.am = w.pm = v; else w[k] = v;
      // Home or a holiday all day means no commute; going to work again asks for one.
      if (k !== 'commute') {
        if (w.am && NO_RIDE[w.am] && NO_RIDE[w.pm]) w.commute = 'N/A';
        else if (w.commute === 'N/A') w.commute = '';
      }
      change('work', undefined, true); drawWork();
    }); });
  }
  drawWork();

  // The evening folds the same way once the day is closed.
  function eveningRecap() {
    var bits = [['Mood', moodText('e'), moodHtml('e')], ['Reflection', V.reflection], ['Park it', V.park], ['For tomorrow', V.tomorrow]]
      .filter(function (b) { return b[1] && String(b[1]).trim(); });
    $('e-recap').innerHTML = '<div class="recap night"><p class="bye" style="margin-bottom:6px">Saved. Sleep well, Roy.</p>' +
      bits.map(function (b) { return '<p><b>' + b[0] + '</b>' + (b[2] || esc(b[1])) + '</p>'; }).join('') +
      '<button type="button" class="link" id="edit-e">Open the evening ›</button></div>';
    $('edit-e').addEventListener('click', function () { UI.edone = false; saveUI(); keepFold({ e: false }); layout(); });
  }

  // ---- Daily theme: layered hills, one palette per weekday; dawn in the morning, dusk at night ----
  var THEMES = [
    ['Pine', ['#e3efe9', '#bfd8cc', '#98bfae', '#739f8d']], ['Meadow', ['#eef5df', '#d3e6b8', '#b3d190', '#8fb86d']],
    ['Harbour', ['#e4eef8', '#c3d8ee', '#9dbfe2', '#7aa4d2']], ['Dunes', ['#f8eedc', '#f0d9b0', '#e5c088', '#d4a466']],
    ['Lavender', ['#eee9f7', '#d8cdee', '#bfaee2', '#a28fd0']], ['Coast', ['#e0f3f2', '#b7e2e0', '#8dcfcc', '#63b5b3']],
    ['Ember', ['#faeae0', '#f3cdb7', '#e9ac8c', '#d98b68']]
  ];
  var themeDay = new Date(D.day + 'T12:00:00Z').getUTCDay();
  function mix(a, b, t) { var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); var r = function (s) { return Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t); }; return '#' + ((1 << 24) + (r(16) << 16) + (r(8) << 8) + r(0)).toString(16).slice(1); }
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
    // The same colours down the whole page: the hills fade into the day's
    // softest tone, which pales towards the bottom (a touch of dusk at night).
    var top = evening ? mix(c[0], '#5b5f8f', .16) : c[0], root = document.documentElement.style;
    root.setProperty('--day-top', top);
    root.setProperty('--day-end', mix(top, '#ffffff', .5));
    root.setProperty('--day-top-dark', mix('#0e1219', c[3], .14));
    root.setProperty('--day-end-dark', mix('#0e1219', c[3], .05));
    var meta = document.querySelector('meta[name="theme-color"][media*="light"]'); if (meta) meta.setAttribute('content', top);
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
    var eOpen = evening || UI.eopen || UI.edone, eClosed = eOpen && UI.edone;
    $('e-open').hidden = !eOpen || eClosed; $('e-later').hidden = eOpen; $('e-recap').hidden = !eClosed;
    recap(); if (eClosed) eveningRecap(); growAll();
    if (eOpen && !eClosed && !D.evening_q && !asked) askEvening();
  }
  $('open-evening').addEventListener('click', function () { UI.eopen = true; saveUI(); layout(); });
  // The evening's Reflection question, written from the whole morning (one small AI call;
  // the server only asks again when the morning changed).
  var asked = false;
  function askEvening() {
    var m = { headspace: V.headspace || '', forward: V.forward || '', winif: V.winif || '' };
    if (!(m.headspace.trim() || m.forward.trim() || m.winif.trim())) return;
    asked = true;
    fetch('/journal/evening-question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m), credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok || !j.q || !Q.reflection) return;
        if (D.evening_q && Q.reflection[0] === D.evening_q) Q.reflection.shift();
        D.evening_q = j.q; Q.reflection.unshift(j.q);
        var el = $('reflection-q'); if (el && !(UI.n_reflection > 0)) el.textContent = j.q;
      }).catch(function () {});
  }
  // Start my day / End my day: the open half shrinks to its recap while it fades, the recap lines rise in,
  // then a small sun rises (morning) or a few stars twinkle (evening) in its corner.
  function fold(openEl, recapEl, mark, finish) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); recapEl.scrollIntoView({ block: 'nearest' }); return; }
    var h0 = openEl.offsetHeight;
    finish();
    var h1 = recapEl.offsetHeight;
    recapEl.hidden = true; openEl.hidden = false;
    openEl.style.height = h0 + 'px'; openEl.style.overflow = 'hidden';
    void openEl.offsetHeight;
    openEl.classList.add('folding'); openEl.style.height = h1 + 'px';
    setTimeout(function () {
      openEl.hidden = true; openEl.classList.remove('folding'); openEl.style.height = ''; openEl.style.overflow = '';
      recapEl.hidden = false;
      var r = recapEl.querySelector('.recap');
      if (r) {
        Array.prototype.forEach.call(r.children, function (c, i) { c.style.animationDelay = (i * 90) + 'ms'; c.classList.add('risein'); });
        r.classList.add('glow'); r.insertAdjacentHTML('beforeend', '<span class="sky" aria-hidden="true">' + mark + '</span>');
      }
      recapEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 520);
  }
  // Each also registers the Morning / Evening review habit (a boss hit); the Quest Engine counts it
  // once per game day, so pressing again changes nothing.
  function review(which) {
    fetch('/journal/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ which: which }), credentials: 'same-origin', keepalive: true })
      .catch(function () {});
  }
  $('m-done').addEventListener('click', function () {
    fold($('m-open'), $('m-recap'), '☀', function () { UI.mdone = true; UI.mopen = false; UI.bye = true; saveUI(); flush(); layout(); });
    keepFold({ m: true });
    askEvening();
    review('morning');
  });
  $('e-done').addEventListener('click', function () {
    fold($('e-open'), $('e-recap'), '✦✧✦', function () { UI.edone = true; saveUI(); flush(); layout(); });
    keepFold({ e: true });
    review('evening');
  });
  layout();
  // Back on a tab left open (another device may have folded or opened a half since): fetch the folds again,
  // but never move the page while Roy is typing.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    fetch('/journal/fold', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
      var a = document.activeElement;
      if (!j || !j.ok || j.day !== D.day || (a && /^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName))) return;
      if (takeFold(j.fold)) layout();
    }).catch(function () {});
  });

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
