// GET / (and /questlog): the landing page, the Quest log as one clean page,
// made for the iPad mini (744 wide upright, 1133 sideways) and the phone.
// Drawn on the server from loadToday()'s data; no dashboard chrome, and only
// one small script (the Hand to Claude buttons copy the problem before they
// open the Claude project). Since 29 Sep it also holds what the dashboard's
// Overview used to: what needs Roy, the AI summary, today's work location and
// whether the automations run.

import { PHASES } from './today.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (n === null || n === undefined || !isFinite(n) ? '–' : Math.round(n).toLocaleString('en-GB'));
const pct = (a, b) => (a > 0 && b > 0 ? Math.max(0, Math.min(100, Math.round((a / b) * 100))) : 0);
const hours = h => String(Math.round(h * 10) / 10).replace(/\.0$/, '');
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDay = day => { const d = new Date(day + 'T12:00:00Z'); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const shortDate = (day, back) => { const d = new Date(Date.parse(day + 'T12:00:00Z') - back * 864e5); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`; };
const ext = 'target="_blank" rel="noopener"';

const LINKS = [
  ['⚔️ Quest Dashboard', 'https://rdecaste.github.io/Questboard/'],
  ['🐉 Hero card', 'https://rdecaste.github.io/MainQuest/'],
  ['📺 Family Dashboard', 'https://rdecaste.github.io/FamilyDashboard/'],
  ['🧭 Admin Dashboard', '/admin'],
  ['🌴 Quest log in Notion', 'https://app.notion.com/p/d835f903d4754c9bbf52100097824752']
];
const WORKOUTS = 'https://app.notion.com/p/ec4d7e3ef61c4269988d68d228207c8b';
const TODOS = 'https://app.notion.com/p/d66b4d380e884ddbba4b403b3998aa28';
const MAIN_QUEST = 'https://app.notion.com/p/3d124147f87781f0ac99d85d9ec4aede';
// This Claude project (Roy, 29 Sep: a button to hand tech problems to Claude).
export const CLAUDE_PROJECT = 'https://claude.ai/code/project/chan_01H4nLsWNAPq67jLrHMTGnSp';

const STYLE = `
/* Layout: today's story on the left, the hero card on the right, then three
   gauges, the quest deck and a dock of links. One column on a phone. */
:root{
  --bg:#eef1f5; --surface:#ffffff; --ink:#18202b; --muted:#5e6a7a; --line:#d9dee6; --track:#e3e7ee;
  --gold:#b57a0c; --gold-soft:#fbf1dc; --hp:#d6453d; --ki:#2f6fd1; --ki-soft:#e6eefb; --ok:#2e8f5c; --warn:#b3261e;
  --hero-bg:#141a24; --hero-ink:#f2f4f8; --hero-muted:#a9b3c3; --hero-track:#2a3342; --hero-gold:#f0b53c;
  --display:"Bricolage Grotesque","Avenir Next",system-ui,sans-serif;
  --body:"Figtree",-apple-system,"Segoe UI",system-ui,sans-serif;
  --hud:"Chakra Petch",ui-monospace,"SF Mono",Menlo,monospace;
  --radius:18px; color-scheme:light;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#0e1219; --surface:#171d27; --ink:#e8ecf2; --muted:#95a1b2; --line:#283141; --track:#262f3d;
  --gold:#f0b53c; --gold-soft:#2c2414; --hp:#f0645a; --ki:#5b93ea; --ki-soft:#1a2638; --ok:#4cbf85; --warn:#f0645a;
  --hero-bg:#0a0e14; --hero-track:#252d3a; color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#0e1219; --surface:#171d27; --ink:#e8ecf2; --muted:#95a1b2; --line:#283141; --track:#262f3d;
  --gold:#f0b53c; --gold-soft:#2c2414; --hp:#f0645a; --ki:#5b93ea; --ki-soft:#1a2638; --ok:#4cbf85; --warn:#f0645a;
  --hero-bg:#0a0e14; --hero-track:#252d3a; color-scheme:dark}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg);color:var(--ink);font-family:var(--body);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}
.page{max-width:1100px;margin:0 auto;padding-inline:max(16px,env(safe-area-inset-left));padding-block:max(20px,env(safe-area-inset-top)) max(36px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:26px}
a{color:inherit}
a:focus-visible{outline:2px solid var(--ki);outline-offset:3px;border-radius:6px}
.top{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--muted)}
h1{font-family:var(--display);font-weight:800;font-size:40px;line-height:1;margin:4px 0 0;letter-spacing:-.02em}
.actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.admin{display:flex;align-items:center;min-height:36px;padding:0 14px;border:1px solid var(--line);background:var(--surface);border-radius:999px;text-decoration:none;font-weight:600;font-size:14px}
.streak{display:flex;align-items:center;gap:8px;background:var(--gold-soft);color:var(--gold);border-radius:999px;padding:7px 14px;font-family:var(--hud);font-weight:600;font-size:15px}
h2{font-family:var(--display);font-weight:600;font-size:21px;margin:0;letter-spacing:-.01em}
.sec{display:flex;flex-direction:column;gap:12px}
.note{color:var(--muted);font-style:italic;font-size:15px;margin:0}
.today{display:grid;grid-template-columns:1fr 1.08fr;gap:16px;align-items:stretch}
.today>*{min-width:0}
.story{display:flex;flex-direction:column;gap:12px}
.spark{background:var(--ki-soft);border-radius:var(--radius);padding:20px 22px;flex:1;display:flex;flex-direction:column;gap:10px}
.spark p{margin:0;font-size:16.5px;line-height:1.6;max-width:62ch}
.spark p.sign{color:var(--muted);font-size:14px}
.journal{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px 18px;text-decoration:none;min-height:56px}
.journal b{font-weight:600}
.journal span{color:var(--muted);font-size:14.5px}
.chev{color:var(--muted);font-size:20px;line-height:1}
.hero{background:var(--hero-bg);color:var(--hero-ink);border-radius:var(--radius);display:grid;grid-template-columns:38% 1fr;overflow:hidden}
.hero img{width:100%;height:100%;object-fit:cover;object-position:top;display:block;max-width:100%;background:var(--hero-track)}
.hero .stats{padding:18px 18px 18px 20px;display:flex;flex-direction:column;gap:12px;min-width:0}
.hero .eyebrow{color:var(--hero-muted)}
.hero h3{font-family:var(--display);font-weight:600;font-size:20px;line-height:1.2;margin:2px 0 0}
.hero h3 a{text-decoration:none}
.lvl{font-family:var(--hud);font-weight:600;font-size:34px;line-height:1;color:var(--hero-gold)}
.lvl small{font-size:14px;color:var(--hero-muted);font-weight:500;margin-left:8px;letter-spacing:.02em}
.stat{display:flex;flex-direction:column;gap:5px}
.stat-row{display:flex;justify-content:space-between;gap:8px;font-size:13.5px;color:var(--hero-muted)}
.stat-row b{font-family:var(--hud);font-weight:600;color:var(--hero-ink);font-variant-numeric:tabular-nums;font-size:15px}
.bar{height:8px;border-radius:4px;background:var(--hero-track);overflow:hidden}
.bar i{display:block;height:100%;border-radius:4px;background:var(--hp)}
.hero .note{color:var(--hero-muted);font-size:14.5px}
.hero .more{font-size:14px;color:var(--hero-muted);text-underline-offset:3px;margin-top:auto}
.brief{display:grid;grid-template-columns:1fr 1.08fr;gap:16px;align-items:start}
.brief>*{min-width:0}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px;display:flex;flex-direction:column;gap:10px}
.card .eyebrow{display:flex;justify-content:space-between;gap:8px}
.flags{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.flags li{display:grid;grid-template-columns:10px 1fr auto;gap:4px 10px;align-items:baseline}
.flags .dot{width:10px;height:10px;border-radius:50%;background:var(--gold);align-self:center}
.flags .attention .dot{background:var(--warn)}
.flags .t{font-weight:600;font-size:15px}
.flags .area{font-size:13px;color:var(--muted);white-space:nowrap;text-decoration:none}
.flags .w{grid-column:2/4;font-size:13.5px;color:var(--muted)}
.calm{margin:0;color:var(--muted);font-size:15px}
.points{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;font-size:15px;line-height:1.5}
.by{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--muted)}
.by form{margin:0}
.by button{font:inherit;font-size:12.5px;color:var(--muted);background:none;border:1px solid var(--line);border-radius:999px;padding:3px 10px;min-height:28px;cursor:pointer}
.handoff{justify-self:start;display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--line);background:var(--ki-soft);color:var(--ki);font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap}
.flags .handoff{grid-column:2/4;margin-top:2px}
.points .handoff{margin-left:6px;min-height:26px;padding:0 10px;font-size:12px;vertical-align:1px}
.systems .handoff{margin-left:8px}
.systems{font-size:13.5px;color:var(--muted);margin:0;padding-top:8px;border-top:1px solid var(--line)}
.systems.bad{color:var(--warn)}
.glance{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.gauge{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px;display:flex;flex-direction:column;gap:8px;min-width:0}
.gauge .label{font-size:14px;font-weight:600;text-decoration:none;display:flex;justify-content:space-between}
.gauge .label span{color:var(--muted);font-weight:400}
.num{font-family:var(--hud);font-weight:600;font-size:30px;line-height:1.1;font-variant-numeric:tabular-nums}
.num small{font-size:14px;font-weight:500;color:var(--muted);margin-left:5px;font-family:var(--body)}
.meter{position:relative;height:8px;border-radius:4px;background:var(--track)}
.meter i{position:absolute;inset:0 auto 0 0;border-radius:4px}
.meter .line{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--ink);opacity:.55;border-radius:1px}
.sub{font-size:13.5px;color:var(--muted)}
.sub.warn{color:var(--warn)}
.gauge .note{font-size:14px;margin-top:auto;padding-top:4px}
.deck{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.quest{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);display:flex;flex-direction:column;min-width:0;overflow:hidden}
.quest.focus{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold) inset}
.quest img{display:block;width:100%;aspect-ratio:16/9;max-width:100%;object-fit:cover;background:var(--track)}
.quest .body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:10px}
.quest h3{font-family:var(--display);font-weight:600;font-size:18px;margin:0;line-height:1.25}
.qmeta{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.pill{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:3px 10px;background:var(--track);color:var(--muted)}
.pill.spotlight,.pill.focus,.pill.done{background:var(--gold-soft);color:var(--gold)}
.pill.active{background:var(--ki-soft);color:var(--ki)}
.days{font-family:var(--hud);font-size:13px;color:var(--muted)}
.phase{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.phase span{height:6px;border-radius:3px;background:var(--track)}
.phase span.on{background:var(--ink);opacity:.8}
.phase-labels{margin-top:5px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;font-size:11.5px;color:var(--muted)}
.phase-labels b{color:var(--ink);font-weight:600}
.next{font-size:14px;color:var(--muted);margin:0}
.next b{color:var(--ink);font-weight:600}
.dock{display:flex;flex-wrap:wrap;gap:10px}
.dock a{display:flex;align-items:center;min-height:44px;padding:0 16px;background:var(--surface);border:1px solid var(--line);border-radius:999px;text-decoration:none;font-weight:500;font-size:15px}
.foot{font-size:12.5px;color:var(--muted);text-align:center;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.foot a{text-underline-offset:3px}
.errors{font-size:13px;color:var(--warn);margin:0}
@media (min-width:1000px){.deck{grid-template-columns:repeat(4,1fr)} h1{font-size:46px}}
@media (max-width:700px){.glance{grid-template-columns:1fr}}
@media (max-width:640px){.today,.brief{grid-template-columns:1fr} .deck{grid-template-columns:1fr} h1{font-size:34px}}
@media (max-width:420px){.hero{grid-template-columns:1fr} .hero img{max-height:340px}}
`;

const note = text => (text ? `<p class="note">💬 ${esc(text)}</p>` : '');

function sparkHtml(text) {
  const parts = String(text || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  if (!parts.length) return '<p class="sign">No spark yet today; it arrives with the 03:00 run.</p>';
  return parts.map((p, i) => `<p${i === parts.length - 1 && parts.length > 1 && p.length < 40 ? ' class="sign"' : ''}>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}

function heroHtml(h, mainNote, quest) {
  const title = (quest && quest.title) || 'Main quest';
  const url = (quest && quest.url) || MAIN_QUEST;
  if (!h) return `<article class="hero" style="grid-template-columns:1fr"><div class="stats"><div class="eyebrow">Main quest</div><p class="note">The hero could not be loaded just now.</p></div></article>`;
  const stage = h.stage ? `<small>STAGE ${h.stage}/${h.stages}</small>` : '';
  const hp = h.max_hp > 0 ? `<div class="stat"><div class="stat-row"><span>HP</span><b>${fmt(h.hp)} / ${fmt(h.max_hp)}</b></div><div class="bar" role="img" aria-label="${fmt(h.hp)} of ${fmt(h.max_hp)} HP"><i style="width:${pct(h.hp, h.max_hp)}%"></i></div></div>` : '';
  const xp = h.xp_to_next_stage !== null ? `<div class="stat-row"><span>Next stage in</span><b>${fmt(h.xp_to_next_stage)} XP</b></div>` : '';
  return `<article class="hero" aria-label="Main quest">
    ${h.image ? `<img src="${esc(h.image)}" alt="Your hero at level ${esc(h.level)}">` : ''}
    <div class="stats">
      <div><div class="eyebrow">Main quest</div><h3><a href="${esc(url)}" ${ext}>${esc(title)}</a></h3></div>
      <div class="lvl">LV ${esc(h.level ?? '–')}${stage}</div>
      ${hp}${xp}
      ${note(mainNote)}
      <a class="more" href="https://rdecaste.github.io/MainQuest/" ${ext}>Open the hero card ›</a>
    </div>
  </article>`;
}

function crossHtml(c, text) {
  const body = c ? `
    <div class="num">${fmt(c.be_share)}%<small>Belgium</small></div>
    <div class="meter" role="img" aria-label="Belgium ${fmt(c.be_share)} percent of work days; it must stay above ${c.minimum} percent">
      <i style="width:${Math.max(0, Math.min(100, c.be_share))}%;background:${c.be_share > c.minimum ? 'var(--ok)' : 'var(--warn)'}"></i><span class="line" style="left:${c.minimum}%"></span>
    </div>
    <div class="sub${c.buffer_days < 0 ? ' warn' : ''}">${c.buffer_days >= 0 ? `${fmt(c.buffer_days)} NL days spare` : `${fmt(c.be_days_needed)} BE days short`}</div>
    ${c.missing ? `<div class="sub warn">${c.missing} work day${c.missing === 1 ? '' : 's'} to fill in</div>` : ''}
    ${workDayHtml(c.today)}` : '<div class="sub">Not available just now.</div>';
  return `<article class="gauge"><a class="label" href="/admin#cross">Cross-border <span>›</span></a>${body}${note(text)}</article>`;
}

function trainingHtml(t, text) {
  const body = t ? `
    <div class="num">${hours(t.hours)}<small>of ${hours(t.target)} h</small></div>
    <div class="meter" role="img" aria-label="${hours(t.hours)} of ${hours(t.target)} hours this week"><i style="width:${pct(t.hours, t.target)}%;background:var(--ki)"></i></div>
    <div class="sub">${t.hours >= t.target ? 'Target reached this week' : `${hours(Math.max(0, t.target - t.hours))} h to go this week`}</div>` : '<div class="sub">Not available just now.</div>';
  return `<article class="gauge"><a class="label" href="${WORKOUTS}" ${ext}>Training this week <span>›</span></a>${body}${note(text)}</article>`;
}

function todoHtml(t, text, today) {
  const body = t ? `
    <div class="num">${esc(t.open)}<small>open</small></div>
    ${t.oldest_days !== null ? `<div class="sub">Oldest waiting ${t.oldest_days} days, since ${shortDate(today, t.oldest_days)}</div>` : ''}` : '<div class="sub">Not available just now.</div>';
  return `<article class="gauge"><a class="label" href="${TODOS}" ${ext}>To-dos <span>›</span></a>${body}${note(text)}</article>`;
}

// Where Roy works today, from the Work Location Log.
function workDayHtml(t) {
  if (!t) return '';
  const text = t.place ? `Today: ${esc(t.place)}${t.commute ? ` · ${esc(t.commute)}` : ''}` : 'Today is not filled in yet';
  return `<div class="sub${t.place ? '' : ' warn'}">${t.url ? `<a href="${esc(t.url)}" ${ext}>${text}</a>` : text}</div>`;
}

// A link to this Claude project that first copies the problem, so Roy only
// pastes and sends. Without script it still opens the project.
function handoff(text, day) {
  const msg = `From my Quest log page (${day}): ${text} Please look into it and fix it.`;
  return `<a class="handoff" href="${CLAUDE_PROJECT}" ${ext} data-copy="${esc(msg)}">Hand to Claude</a>`;
}
const HANDOFF_SCRIPT = `<script>
document.addEventListener('click', async e => {
  const a = e.target.closest('a.handoff'); if (!a) return;
  e.preventDefault();
  // Copy first, while the tap still counts as the user's; then open the project.
  const copied = navigator.clipboard ? navigator.clipboard.writeText(a.dataset.copy) : Promise.reject();
  const w = window.open(a.href, '_blank');
  if (w) w.opener = null; else location.href = a.href;
  try { await copied; a.textContent = 'Copied: paste it in the chat'; }
  catch (_) { a.textContent = 'Opened: describe it in the chat'; }
});
</script>`;
const sentence = t => { const x = String(t || '').trim(); return x && !/[.!?]$/.test(x) ? x + '.' : x; };

// "- " lines become bullets; an older one-paragraph summary stays a paragraph.
// A bullet that hands something to Claude gets the button.
function summaryPoints(text, day) {
  const lines = String(text).split('\n').map(l => l.trim()).filter(Boolean);
  const items = lines.filter(l => /^[-•*] /.test(l)).map(l => l.replace(/^[-•*] /, ''));
  const point = l => `<li>${esc(l)}${/\bclaude\b/i.test(l) ? handoff(sentence(l), day) : ''}</li>`;
  return items.length ? `<ul class="points">${items.map(point).join('')}</ul>` : `<p class="calm">${esc(text)}</p>`;
}

// System health flags are Claude's to fix, so they carry the hand-over button.
function flagsHtml(b, explained, day) {
  if (!b.flags.length) return '<p class="calm">Nothing needs you right now.</p>';
  return `<ul class="flags">${b.flags.map(f => `<li class="${esc(f.level)}"><span class="dot" aria-label="${f.level === 'attention' ? 'Needs attention' : 'Keep an eye on'}"></span><span class="t">${esc(f.title)}</span><a class="area" href="/admin#${esc(f.area)}">${esc(f.area_name)} ›</a>${explained ? '' : `<span class="w">${esc(f.why)}</span>`}${f.area === 'system' ? handoff(`${sentence(f.title)} ${sentence(f.why)}`, day) : ''}</li>`).join('')}</ul>`;
}

// Skipped when a System health flag above already says what is wrong.
function systemsHtml(sys, flagged, day) {
  if (sys && sys.problems.length && flagged) return '';
  if (!sys) return '<p class="systems bad">The automations could not be checked just now.</p>';
  if (!sys.problems.length) return `<p class="systems">Automations: all ${sys.checked} running.</p>`;
  return `<p class="systems bad">Automations: ${esc(sys.problems.join(', '))} not running right.${handoff(`Automations not running right: ${sys.problems.join(', ')}.`, day)}</p>`;
}

function briefingHtml(b, today) {
  if (!b) return '';
  const s = b.summary && b.summary.day === today ? b.summary : null;
  const written = s && s.at ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' }).format(new Date(s.at)) : '';
  const rewrite = b.ai_enabled ? '<form method="post" action="/summary?back=1"><button type="submit">Rewrite</button></form>' : '';
  const summary = s ? `${summaryPoints(s.text, longDay(today))}<div class="by"><span>AI summary · written ${esc(written)}</span>${rewrite}</div>`
    : `<p class="calm">${b.ai_enabled ? 'Today’s summary is written the first time you open this page after 07:30.' : 'The AI summary is switched off.'}</p>`;
  const n = b.flags.length;
  const day = longDay(today);
  return `<section class="brief" aria-label="Briefing">
    <article class="card"><div class="eyebrow"><span>Needs you</span>${n ? `<span>${n} item${n === 1 ? '' : 's'}</span>` : ''}</div>${flagsHtml(b, !!s, day)}${systemsHtml(b.systems, b.flags.some(f => f.area === 'system'), day)}</article>
    <article class="card"><div class="eyebrow">Summary</div>${summary}</article>
  </section>`;
}

function questHtml(q) {
  const cls = q.done ? 'done' : q.attention.toLowerCase();
  const phase = q.phase >= 0 ? `<div><div class="phase" aria-label="Phase: ${PHASES[q.phase]}">${PHASES.map((_, i) => `<span${i <= q.phase ? ' class="on"' : ''}></span>`).join('')}</div>
      <div class="phase-labels" aria-hidden="true">${PHASES.map((p, i) => (i === q.phase ? `<b>${p}</b>` : `<span>${p}</span>`)).join('')}</div></div>` : '';
  const days = q.days_left !== null ? `<span class="days">${q.days_left >= 0 ? `${q.days_left} days to go` : `${-q.days_left} days past target`}</span>` : '';
  return `<article class="quest${['focus', 'spotlight'].includes(cls) ? ' focus' : ''}">
    <img src="${esc(q.image)}" alt="" loading="lazy" onerror="this.remove()">
    <div class="body">
      <h3>${esc(q.title)}</h3>
      <div class="qmeta"><span class="pill ${esc(cls)}">${esc(q.done ? 'Completed' : q.attention || 'Active')}</span>${days}</div>
      ${phase}
      ${q.next_move ? `<p class="next"><b>Next:</b> ${esc(q.next_move)}</p>` : ''}
    </div>
  </article>`;
}

export function todayHtml(d) {
  const updated = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' }).format(new Date(d.built_at));
  const run = d.hero && d.hero.run !== null ? `<div class="streak" aria-label="${d.hero.run} success days in a row">🔥 ${d.hero.run} day${d.hero.run === 1 ? '' : 's'} in a row</div>` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Quest log"><meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#eef1f5" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0e1219" media="(prefers-color-scheme: dark)">
<title>Quest log</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:ital,wght@0,400;0,500;0,600;1,400&family=Chakra+Petch:wght@500;600&display=swap">
<style>${STYLE}</style></head>
<body><div class="page">
  <header class="top">
    <div><div class="eyebrow">${esc(longDay(d.today))}</div><h1>Quest log</h1></div>
    <div class="actions">${run}<a class="admin" href="/admin">Admin ›</a></div>
  </header>

  <section class="today" aria-label="Today">
    <div class="story">
      <article class="spark"><div class="eyebrow">Morning spark</div>${sparkHtml(d.spark)}</article>
      ${d.journal ? `<a class="journal" href="${esc(d.journal.url)}" ${ext}><div><b>Today’s journal</b><br><span>${esc(d.journal.title)}</span></div><div class="chev" aria-hidden="true">›</div></a>` : ''}
    </div>
    ${heroHtml(d.hero, d.notes && d.notes.main_quest, d.main_quest)}
  </section>

  ${briefingHtml(d.briefing, d.today)}

  <section class="sec" aria-labelledby="glance-h">
    <h2 id="glance-h">Today at a glance</h2>
    <div class="glance">
      ${crossHtml(d.cross, d.notes && d.notes.cross_border)}
      ${trainingHtml(d.training, d.notes && d.notes.training)}
      ${todoHtml(d.todo, d.notes && d.notes.todo, d.today)}
    </div>
  </section>

  <section class="sec" aria-labelledby="quests-h">
    <h2 id="quests-h">Active quests</h2>
    ${note(d.notes && d.notes.attention)}
    <div class="deck">${(d.quests || []).map(questHtml).join('') || '<p class="note">No active quests.</p>'}</div>
  </section>

  <section class="sec" aria-labelledby="links-h">
    <h2 id="links-h">Quick links</h2>
    <nav class="dock">${LINKS.map(([name, url]) => `<a href="${url}"${url.startsWith('http') ? ' ' + ext : ''}>${esc(name)}</a>`).join('')}</nav>
  </section>

  ${d.errors && d.errors.length ? `<p class="errors">Some parts could not load: ${esc(d.errors.join('; '))}</p>` : ''}
  <p class="foot"><span>Updated ${esc(updated)}</span><a href="/?fresh=1">Refresh now</a></p>
</div>${HANDOFF_SCRIPT}</body></html>`;
}

