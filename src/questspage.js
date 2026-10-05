// The quest pages (data and saves: src/quests.js), from the mockup Roy signed
// off on 4 Oct 2026: a dark quest board with cinematic stills. Drawn on the
// server; one small script (CLIENT, below) does the buttons: they post JSON
// and reload, or, on the new-quest and review pages, fill the form with what
// OpenAI drafted. Visuals are stills from the quests' Cloudinary clips; the
// clips themselves and new visuals come later (Roy, 4 Oct).
import { ATTENTION, PHASES, bucket, posterUrl, avatarUrl } from './quests.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Data for the page script: never able to close the <script> it sits in.
const safeJson = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const fmtDay = (iso, today = '') => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}${today && String(y) !== today.slice(0, 4) ? ' ' + y : ''}`;
};
const weekday = iso => DAYS[new Date(iso + 'T12:00:00Z').getUTCDay()];
export const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
const initials = n => String(n || '').split(/[\s/]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const FR_HUE = { 'Arcane': 275, 'Bleach': 205, 'Chainsaw Man': 10, 'Cyberpunk: Edgerunners': 320, 'Dragon Ball': 32, 'Fairy Tail': 350, 'Jujutsu Kaisen': 230, 'One Punch Man': 48, 'Solo Leveling': 250, 'Tokyo Ghoul': 0 };

export const FIELDS = {
  name: { label: 'Quest name', hint: 'Short and verb-first, like “Develop the Backyard”.', ph: 'e.g. Finish the overkapping' },
  next: { label: 'Next move', hint: 'One concrete action you can finish in a single sitting. This is what shows on the board.', ph: 'e.g. Measure the terrace and send the sizes to two builders' },
  passfail: { label: 'Weekly pass/fail question', hint: 'A yes/no question for the Sunday review. Start with “Did I…”.', ph: 'Did I … this week?' },
  outcome: { label: 'Desired outcome', hint: 'What “done” looks like. Concrete enough that you could check it off.' },
  description: { label: 'Why this quest', hint: 'Why it matters now, in your own words.' },
  evidence: { label: 'Daily evidence guide', hint: 'What the daily digest should look for in your journal, workouts and body metrics to log progress.' },
  character: { label: 'Character', hint: 'Who stars in the quest’s cinematic visual. Used the next time the visual is made.' },
  attention: { label: 'Attention', hint: 'How much of your attention it deserves right now.' },
  phase: { label: 'Phase' }, journey: { label: 'Journey' }, year: { label: 'Year' }, start: { label: 'Start date' }, target: { label: 'Target date' }
};
export const SUGGESTABLE = ['name', 'next', 'passfail', 'outcome', 'description', 'evidence'];

// ---- Small pieces ----

export function statusPill(q) {
  if (q.completed) return `<span class="pill good">Completed ${esc(fmtDay(q.completed))}</span>`;
  if (!q.active) return `<span class="pill idle">Planned${q.year ? ' · ' + esc(q.year) : ''}</span>`;
  const s = String(q.status || '').toUpperCase();
  if (s === 'MOVING FORWARD') return '<span class="pill good">Moving forward</span>';
  if (s === 'SLOW PROGRESS') return '<span class="pill warn">Slow progress</span>';
  if (s === 'STALLED' || s === 'AT RISK') return `<span class="pill warn">${esc(s.toLowerCase())}</span>`;
  return s ? `<span class="pill idle">${esc(s.toLowerCase())}</span>` : '<span class="pill idle">No status yet</span>';
}
export function quietDays(q, today) { return q.last ? daysBetween(q.last, today) : null; }
export function quietPill(q, today) {
  if (bucket(q) !== 'active') return '';
  const n = quietDays(q, today);
  return n === null || n >= 7 ? `<span class="pill warn">${n === null ? 'No evidence yet' : n + ' days quiet'}</span>` : '';
}
const attBars = a => { const n = ATTENTION.indexOf(a) + 1; return `<span class="att" aria-hidden="true">${[1, 2, 3, 4].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`; };
const attention = q => (q.attention ? `<span class="att-wrap">${attBars(q.attention)}${esc(q.attention)}</span>` : '');
const phaseTrack = q => {
  if (!q.phase) return '';
  const n = PHASES.indexOf(q.phase);
  return `<span class="phase-wrap"><span class="phase" aria-hidden="true">${PHASES.map((p, i) => `<i class="${i < n ? 'done' : i === n ? 'cur' : ''}"></i>`).join('')}</span>${esc(q.phase)}</span>`;
};
export function countdown(q, today) {
  if (!q.target || q.completed) return '';
  const n = daysBetween(today, q.target);
  return n >= 0 ? `${n} days to go` : `${-n} days past target`;
}
// A clip is portrait (Gemini makes 9:16): a centred square of it, small.
export function clipUrl(url, size = 320) {
  if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(url || '')) return url || '';
  return url.replace('/video/upload/', `/video/upload/c_fill,g_center,h_${size},w_${size}/q_auto/`);
}
export function avatarHtml(c, size, radius = 12, showFranchise = false) {
  if (!c) return '';
  const h = FR_HUE[c.franchise] ?? 200;
  const dims = size ? `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px;` : '';
  const still = c.avatar ? avatarUrl(c.avatar, size ? Math.min(512, size * 2) : 320) : '';
  // A clip plays muted and looping over the still (not in tiny chips).
  const img = c.avatar && c.clip && (!size || size >= 36)
    ? `<video src="${esc(clipUrl(c.clip, size ? Math.min(512, size * 2) : 320))}" poster="${esc(still)}" autoplay muted loop playsinline preload="metadata" aria-hidden="true"></video>`
    : c.avatar ? `<img src="${esc(still)}" alt="" loading="lazy">` : esc(initials(c.name));
  return `<span class="avatar" style="${dims}border-radius:${radius}px;background:radial-gradient(circle at 30% 25%,hsl(${h} 55% 42%),hsl(${h} 45% 16%) 75%)" aria-hidden="true">${img}${!c.avatar && showFranchise ? `<span class="fr">${esc(c.franchise)}</span>` : ''}</span>`;
}
const charOf = (d, id) => d.characters.find(c => c.id === id) || null;
const journeyOf = (d, id) => d.journeys.find(j => j.id === id) || null;
const media = (q, cls = 'ph') => {
  const src = posterUrl(q.video, 960);
  return src ? `<img src="${esc(src)}" alt="" loading="lazy">` : `<span class="${cls}" aria-hidden="true">${esc(q.icon || '◆')}</span>`;
};

// ---- Page frame ----

function page(title, body, data, { nav = '' } = {}) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Quests"><meta name="theme-color" content="#0a0f13">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<style>${STYLE}</style></head>
<body><div class="wrap">
<nav class="nav"><a href="/">‹ Quest log</a>${nav}</nav>
${body}
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script id="qdata" type="application/json">${safeJson(data)}</script>
<script>${CLIENT_PRELUDE}(${CLIENT.toString()})();</script>
</body></html>`;
}

// ---- /quests ----

function card(q, d) {
  const cd = countdown(q, d.today);
  return `<a class="card" href="/quests/${esc(q.id)}" data-name="${esc(q.name.toLowerCase())}" data-journey="${esc(q.journey)}">
    <span class="poster">${media(q)}<span class="poster-tags">${statusPill(q)}${quietPill(q, d.today)}</span></span>
    <span class="card-body">
      <span class="card-title"><span class="emo">${esc(q.icon)}</span><h3>${esc(q.name)}</h3></span>
      ${q.next ? `<span class="next"><b>Next:</b> ${esc(q.next)}</span>` : q.outcome ? `<span class="next">${esc(q.outcome)}</span>` : ''}
      <span class="card-foot">${attention(q)}${cd ? `<span class="mono">${esc(cd)}</span>` : ''}${q.review ? `<span class="chk ${q.review}">${q.review === 'pass' ? '✓ passed' : '✗ missed'} wk ${d.week.n}</span>` : ''}${phaseTrack(q)}</span>
    </span></a>`;
}
function lrow(q, d) {
  const sub = q.next ? 'Next: ' + q.next : q.outcome || ((journeyOf(d, q.journey) || {}).name || '');
  const side = [q.target ? `<span class="mono">${esc(fmtDay(q.target, d.today))}</span>` : '', q.start && !q.completed ? `<span>Started ${esc(fmtDay(q.start, d.today))}</span>` : '', phaseTrack(q)].filter(Boolean).join('');
  return `<a class="lrow" href="/quests/${esc(q.id)}" data-name="${esc(q.name.toLowerCase())}" data-journey="${esc(q.journey)}"><span class="emo">${esc(q.icon || '◆')}</span>
    <span class="lrow-main"><strong>${esc(q.name)}</strong><span>${esc(sub)}</span></span>
    <span class="lrow-side">${side}<span class="arrow" aria-hidden="true">›</span></span></a>`;
}

export function questsHtml(d, { tab = 'active' } = {}) {
  const by = b => d.quests.filter(q => bucket(q) === b);
  const active = by('active').sort((a, b) => ATTENTION.indexOf(b.attention) - ATTENTION.indexOf(a.attention));
  const planned = by('planned');
  const done = by('completed').sort((a, b) => (a.completed < b.completed ? 1 : -1));
  const tabs = [['active', 'Active', active.length], ['planned', 'Planned', planned.length], ['completed', 'Completed', done.length]];
  if (!tabs.some(t => t[0] === tab)) tab = 'active';
  const reviewed = active.filter(q => q.review).length;
  const reviewTag = active.length && reviewed === active.length ? '<span class="pill good plain">done</span>' : d.today === d.week.to ? '<span class="pill gold plain">due today</span>' : '';
  const body = `<div class="view">
    <header class="top">
      <div><h1>Quests</h1><div class="sub">Week ${d.week.n} · ${esc(weekday(d.today))} ${esc(fmtDay(d.today))}</div></div>
      <div class="actions"><a class="btn big" href="/quests/review">🗓️ Weekly review ${reviewTag}</a><a class="btn gold big" href="/quests/new">+ New quest</a></div>
    </header>
    <div class="toolbar">
      <div class="tabs" role="tablist">${tabs.map(([k, l, n]) => `<button class="tab" role="tab" type="button" aria-selected="${tab === k}" data-tab="${k}">${l}<span class="n">${n}</span></button>`).join('')}</div>
      <div class="filters">
        <input class="search" id="search" type="search" placeholder="Search quests" aria-label="Search quests">
        <select class="jsel" id="journey" aria-label="Journey"><option value="">All journeys</option>${d.journeys.map(j => `<option value="${esc(j.id)}">${esc(j.icon)} ${esc(j.name)}</option>`).join('')}</select>
      </div>
    </div>
    <section class="pane section" data-pane="active" ${tab === 'active' ? '' : 'hidden'}>
      <div class="section-head"><h3>Active quests</h3><span class="hint">Sorted by attention</span></div>
      ${active.length ? `<div class="cards">${active.map(q => card(q, d)).join('')}</div>` : '<p class="empty">No active quests. Open a planned one and make it active, or start a new quest.</p>'}
    </section>
    <section class="pane" data-pane="planned" ${tab === 'planned' ? '' : 'hidden'}>
      <div class="year-cols">${d.years.map(y => { const items = planned.filter(q => q.year === y); return `<section class="section"><div class="section-head"><h3>${esc(y)}</h3><span class="count">${items.length}</span>${y === 'Later' ? '<span class="hint">Someday</span>' : ''}</div>${items.length ? `<div class="ledger">${items.map(q => lrow(q, d)).join('')}</div>` : '<p class="empty">Nothing planned.</p>'}</section>`; }).join('')}
      ${planned.some(q => !d.years.includes(q.year)) ? `<section class="section"><div class="section-head"><h3>No year</h3></div><div class="ledger">${planned.filter(q => !d.years.includes(q.year)).map(q => lrow(q, d)).join('')}</div></section>` : ''}</div>
    </section>
    <section class="pane section" data-pane="completed" ${tab === 'completed' ? '' : 'hidden'}>
      ${done.length ? `<div class="cards">${done.map(q => card(q, d)).join('')}</div>` : '<p class="empty">No completed quests yet.</p>'}
    </section>
    <p class="empty" id="nomatch" hidden>No quests match. Clear the search or pick another journey.</p>
  </div>`;
  return page('Quests', body, { page: 'list' });
}

// ---- /quests/<id> ----

function evidenceLog(log, today) {
  if (!log.length) return '<p class="empty">Nothing logged yet. Notes you write for this quest in the daily journal show up here.</p>';
  const label = { note: 'Journal note', review: 'Weekly review' };
  return `<div class="timeline">${log.map(l => `<div class="tl ${esc(l.kind)}" data-kind="${l.kind === 'note' ? 'notes' : 'digest'}"><span class="d">${esc(fmtDay(l.date, today))}</span><span class="dot"><i></i></span><span class="t"><span class="k">${esc(label[l.kind] || l.kind)}</span><p>${esc(l.text)}</p></span></div>`).join('')}</div>`;
}

export function questHtml(d, { edit = false, need = '' } = {}) {
  const q = d.quest;
  const j = journeyOf(d, q.journey);
  const c = charOf(d, q.character);
  const b = bucket(q);
  const quiet = quietDays(q, d.today);
  const mark = q.review === 'pass' ? '<span class="mark pass">PASSED</span>' : q.review === 'fail' ? '<span class="mark fail">MISSED</span>' : '<span class="mark none">NOT YET</span>';
  const hero = `<section class="hero">${media(q)}
      <div class="hero-in"><span class="label">${j ? esc(j.icon + ' ' + j.name) + ' journey' : 'Quest'}</span><h1>${esc(q.icon ? q.icon + ' ' : '')}${esc(q.name)}</h1>
        <div class="hero-tags">${statusPill(q)}${quietPill(q, d.today)}${q.target && !q.completed ? `<span class="pill gold plain mono">${esc(countdown(q, d.today))}</span>` : ''}</div></div>
    </section>`;
  const crumb = `<div class="crumb"><a class="btn quiet" href="/quests">← All quests</a>${edit ? '' : `<a class="btn" href="/quests/${esc(q.id)}?edit=1">Edit quest</a>`}</div>`;
  if (edit) {
    const body = `<div class="view">${crumb}${hero}
      ${need === 'next' ? '<p class="err" role="alert">Add a next move to make this quest active.</p>' : ''}
      <div class="panel" style="padding:22px">${formHtml(q, d, {})}</div>
      <div class="savebar"><span>Changes are saved to the quest in D1.</span><div><a class="btn quiet" href="/quests/${esc(q.id)}">Cancel</a><button class="btn gold" type="button" data-save="${esc(q.id)}">Save changes</button></div></div>
    </div>`;
    return page(q.name, body, { page: 'edit', id: q.id, ai: d.ai, characters: d.characters, need, activateOnSave: need === 'next' });
  }
  const body = `<div class="view">${crumb}${hero}
    <div class="page-grid">
      <div class="col">
        <div class="panel next-move" id="next-panel">
          <div class="panel-head"><span class="label">Next move</span><button class="link-btn" type="button" data-act="next-edit">${q.next ? 'Change' : 'Add'}</button></div>
          <div id="next-view">${q.next ? `<p>${esc(q.next)}</p>` : '<p class="none">None set yet. Pick one concrete action you can finish in a single sitting.</p>'}</div>
          <div class="inline-edit" id="next-edit" hidden><textarea id="next-text" aria-label="Next move" maxlength="1000">${esc(q.next)}</textarea><div class="sugs" id="sug-inline"></div>
            <div class="row">${d.ai ? '<button class="btn ai" type="button" data-act="next-suggest"><i class="spark">✦</i> Suggest</button>' : ''}<button class="btn quiet" type="button" data-act="next-cancel">Cancel</button><button class="btn gold" type="button" data-act="next-save">Save next move</button></div></div>
        </div>
        ${q.passfail ? (b === 'active'
          ? `<div class="panel"><span class="label">Weekly check · Week ${d.week.n}</span><div class="check">${mark}<p>${esc(q.passfail)}</p></div></div>`
          : `<div class="panel"><span class="label">Weekly check${b === 'planned' ? ' · from when it is active' : ''}</span><p>${esc(q.passfail)}</p></div>`) : ''}
        ${q.statement ? `<div class="panel"><span class="label">Where it stands</span><p>${esc(q.statement)}</p></div>` : ''}
        ${q.outcome ? `<div class="panel"><span class="label">Desired outcome</span><p>${esc(q.outcome)}</p></div>` : ''}
        ${q.description ? `<div class="panel"><span class="label">Why this quest</span><p>${esc(q.description)}</p></div>` : ''}
        <div class="panel">
          <div class="panel-head"><span class="label">Evidence log</span>
            <div class="tl-filter" role="group" aria-label="Filter evidence">${[['all', 'All'], ['notes', 'My notes'], ['digest', 'Digest']].map(([k, l]) => `<button type="button" data-tl="${k}" aria-pressed="${k === 'all'}">${l}</button>`).join('')}</div></div>
          ${evidenceLog(d.log, d.today)}
        </div>
      </div>
      <aside class="col side">
        <div class="panel"><dl class="kv">
          <dt>Journey</dt><dd>${j ? esc(j.icon + ' ' + j.name) : '—'}</dd>
          <dt>Year</dt><dd>${esc(q.year || '—')}</dd>
          <dt>Started</dt><dd>${q.start ? esc(fmtDay(q.start, d.today)) : '—'}</dd>
          <dt>Target</dt><dd>${q.target ? `${esc(fmtDay(q.target, d.today))}<small>${esc(countdown(q, d.today))}</small>` : '—'}</dd>
          <dt>Last evidence</dt><dd>${q.last ? `${esc(fmtDay(q.last, d.today))}<small class="${b === 'active' && quiet >= 7 ? 'warn' : ''}">${quiet === 0 ? 'today' : quiet + ' days ago'}</small>` : '—'}</dd>
        </dl></div>
        <div class="panel vis-panel"><div class="panel-head"><span class="label">Visual</span><button class="link-btn" type="button" data-act="pick-open">${c ? 'Change character' : 'Choose character'}</button></div>
          ${c ? `<div class="char-card">${avatarHtml(c, 44)}<div><strong>${esc(c.name)}</strong><span>${esc(c.franchise)}</span></div></div>` : '<span class="none">No character yet.</span>'}
          <span class="hint">${q.active ? 'Changing the character asks whether to redraw the visual now.' : 'A new character is used the next time the visual is made.'}</span></div>
        <div class="panel">
          <div class="ctrl"><span class="label">Attention</span><div class="seg" role="group" aria-label="Attention">${ATTENTION.map(a => `<button type="button" data-quick="attention" data-value="${a}" aria-pressed="${q.attention === a}">${a}</button>`).join('')}</div></div>
          <div class="ctrl"><span class="label">Phase</span><div class="seg" role="group" aria-label="Phase">${PHASES.map(p => `<button type="button" data-quick="phase" data-value="${p}" aria-pressed="${q.phase === p}">${p}</button>`).join('')}</div></div>
        </div>
        <div class="actions-col">
          ${b !== 'active' ? '<button class="btn gold" type="button" data-op="activate">Make active</button>' : '<button class="btn" type="button" data-op="plan">Move to planned</button>'}
          ${b !== 'completed' ? '<button class="btn" type="button" data-op="complete" data-confirm="Mark this quest completed? Its victory card shows on the board for seven days.">Mark completed</button>' : '<button class="btn" type="button" data-op="reopen">Reopen quest</button>'}
        </div>
      </aside>
    </div>
  </div>
  <div class="modal-scrim" id="picker" hidden></div>`;
  return page(q.name, body, { page: 'quest', id: q.id, ai: d.ai, quest: { id: q.id, name: q.name, icon: q.icon, character: q.character, active: q.active }, characters: d.characters, used: usedBy(d, q.id) });
}

// Character id → the other quest that already stars it.
const usedBy = (d, exceptId) => Object.fromEntries(d.quests.filter(x => x.character && x.id !== exceptId).map(x => [x.character, x.name]));

// ---- The quest form (edit and new) ----

function fieldHead(name, ai) {
  const f = FIELDS[name];
  const isSeg = name === 'attention' || name === 'phase';
  const label = isSeg ? `<span class="flabel">${f.label}<span class="ai-tag" hidden>AI draft</span></span>` : `<label for="f-${name}">${f.label}<span class="ai-tag" hidden>AI draft</span></label>`;
  return `<div class="field-head">${label}${ai && SUGGESTABLE.includes(name) ? `<button type="button" class="suggest-btn" data-suggest="${name}"><i class="spark">✦</i> Suggest</button>` : ''}</div>`;
}
const fieldFoot = name => `<span class="why" data-why="${name}" hidden></span>${FIELDS[name].hint ? `<span class="hint" data-hint="${name}">${FIELDS[name].hint}</span>` : ''}<div class="sugs" id="sug-${name}"></div>`;
const seg = (name, options, value) => `<div class="seg" role="group" data-field="${name}" aria-label="${FIELDS[name].label}">${['', ...options].map(x => `<button type="button" data-opt="${esc(x)}" aria-pressed="${(value || '') === x}">${x || 'None'}</button>`).join('')}</div>`;

export function formHtml(q, d) {
  const ai = d.ai;
  const txt = (name, rows) => `<div class="field" data-f="${name}">${fieldHead(name, ai)}<textarea id="f-${name}" rows="${rows}" maxlength="${name === 'next' ? 1000 : 4000}" placeholder="${esc(FIELDS[name].ph || '')}">${esc(q[name])}</textarea>${fieldFoot(name)}</div>`;
  const franchises = [...new Set(d.characters.filter(c => c.enabled || c.id === q.character).map(c => c.franchise))];
  return `<form class="form" id="quest-form" onsubmit="return false">
    <div class="icon-name">
      <div class="field" data-f="icon"><label for="f-icon">Icon</label><input type="text" id="f-icon" value="${esc(q.icon)}" maxlength="8" style="text-align:center;font-size:22px"></div>
      <div class="field" data-f="name">${fieldHead('name', ai)}<input type="text" id="f-name" value="${esc(q.name)}" maxlength="120" placeholder="${esc(FIELDS.name.ph)}">${fieldFoot('name')}</div>
    </div>
    ${txt('next', 2)}
    <div class="field" data-f="passfail">${fieldHead('passfail', ai)}<input type="text" id="f-passfail" value="${esc(q.passfail)}" maxlength="500" placeholder="${esc(FIELDS.passfail.ph)}">${fieldFoot('passfail')}</div>
    <div class="form-section">Status</div>
    <label class="switch"><input type="checkbox" id="f-active" ${q.active ? 'checked' : ''}> Active quest <span class="hint">· on the board and in the daily journal and digest</span></label>
    <div class="two">
      <div class="field" data-f="attention">${fieldHead('attention', ai)}${seg('attention', ATTENTION, q.attention)}${fieldFoot('attention')}</div>
      <div class="field" data-f="phase">${fieldHead('phase', ai)}${seg('phase', PHASES, q.phase)}${fieldFoot('phase')}</div>
    </div>
    <div class="two">
      <div class="field" data-f="journey">${fieldHead('journey', ai)}<select id="f-journey"><option value="">No journey</option>${d.journeys.map(j => `<option value="${esc(j.id)}" ${q.journey === j.id ? 'selected' : ''}>${esc(j.icon)} ${esc(j.name)}</option>`).join('')}</select>${fieldFoot('journey')}</div>
      <div class="field" data-f="year">${fieldHead('year', ai)}<select id="f-year"><option value="">No year</option>${d.years.map(y => `<option ${q.year === y ? 'selected' : ''}>${esc(y)}</option>`).join('')}</select>${fieldFoot('year')}</div>
      <div class="field" data-f="start">${fieldHead('start', ai)}<input type="date" id="f-start" value="${esc(q.start)}">${fieldFoot('start')}</div>
      <div class="field" data-f="target">${fieldHead('target', ai)}<input type="date" id="f-target" value="${esc(q.target)}">${fieldFoot('target')}</div>
    </div>
    <div class="form-section">Visual</div>
    <div class="field" data-f="character">${fieldHead('character', ai)}<select id="f-character"><option value="">No character yet</option>${franchises.map(f => `<optgroup label="${esc(f)}">${d.characters.filter(c => c.franchise === f && (c.enabled || c.id === q.character)).map(c => `<option value="${esc(c.id)}" ${q.character === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup>`).join('')}</select>${fieldFoot('character')}<span class="hint warn" id="char-used" hidden></span></div>
    <div class="form-section">Story</div>
    ${txt('outcome', 4)}
    ${txt('description', 3)}
    ${txt('evidence', 3)}
  </form>`;
}

// ---- /quests/new ----

const EXAMPLES = ['Finish the overkapping in the backyard before spring so we can sit outside next summer.', 'Get my swim technique good enough for an Ironman swim. I want to swim 3.8 km relaxed.', 'Plan a weekend away with Steph before the end of the year, just the two of us.'];
const PROMPTS = ['What do you want to achieve?', 'Why does it matter now?', 'By when, roughly?', 'What does “done” look like?'];
const stepsHtml = n => `<div class="steps">${['Describe', 'Review draft', 'Create'].map((l, i) => `${i ? '<i></i>' : ''}<span data-step="${i}" class="${i === n ? 'on' : i < n ? 'done' : ''}"><b>${i + 1}</b>${l}</span>`).join('')}</div>`;

export function newQuestHtml(d) {
  const blank = { name: '', icon: '', next: '', passfail: '', active: false, attention: '', phase: 'Start', journey: '', year: d.years[0], start: '', target: '', character: '', outcome: '', description: '', evidence: '' };
  const body = `<div class="view">
    <div class="crumb"><a class="btn quiet" href="/quests">← All quests</a>${stepsHtml(0)}</div>
    <section id="step-describe" class="view">
      <div class="nq-head"><h1>Start a new quest</h1><p>Describe it the way you would in your journal.${d.ai ? ' OpenAI drafts the fields from your journeys and the quests you already have. You review everything before it is created.' : ''}</p></div>
      <div class="describe">
        <div class="col">
          <div class="composer">
            <textarea id="nq-text" aria-label="Describe your quest" maxlength="4000" placeholder="e.g. I want to finally finish the overkapping in the backyard. The fence is done and the gate comes end of October. I'd like to sit outside under it next summer…"></textarea>
            <div class="composer-foot"><span class="meta" id="nq-count">0 words</span>
              <div class="row"><button class="btn quiet" type="button" data-act="manual">Fill in myself</button>${d.ai ? '<button class="btn gold" type="button" data-act="draft" id="draft-btn" disabled><i class="spark">✦</i> Draft with AI</button>' : ''}</div></div>
          </div>
          <p class="err" id="nq-error" role="alert" hidden></p>
          ${d.ai ? '' : '<p class="ai-off">AI drafting is off on this Worker (ADMIN_AI). Use “Fill in myself”; every field has guidance.</p>'}
          <div class="section"><span class="label">Or start from an example</span><div class="examples">${EXAMPLES.map((x, i) => `<button class="ex" type="button" data-ex="${i}">${esc(x.split(/[.,]/)[0])}</button>`).join('')}</div></div>
        </div>
        <aside class="panel"><span class="label">A good description covers</span>
          <div class="prompts" id="nq-prompts">${PROMPTS.map((p, i) => `<div class="prompt-q" data-p="${i}"><i></i>${esc(p)}</div>`).join('')}</div>
          <p class="hint">Missing something? The draft comes with questions, so a rough version is fine.</p></aside>
      </div>
    </section>
    <section id="step-thinking" class="thinking" hidden><div class="orb" aria-hidden="true"></div><h3>Drafting your quest</h3>
      <ul id="think-steps">${['Reading your description', 'Checking your current quests and load', 'Drafting outcome, weekly check and next move', 'Picking a character and looking for overlaps'].map((t, i) => `<li data-i="${i}"><span class="m">·</span> ${esc(t)}</li>`).join('')}</ul>
      <p class="hint">This usually takes 10 to 40 seconds.</p></section>
    <section id="step-review" class="view" hidden>
      <div class="nq-head"><h1 id="nq-title">Review your quest</h1><p>Fields marked AI draft came from OpenAI. Change anything${d.ai ? ', or use ✦ Suggest on a field for alternatives' : ''}.</p></div>
      <div class="review">
        <div class="panel" style="padding:22px">${formHtml(blank, d)}</div>
        <aside class="col side" id="ai-side"></aside>
      </div>
      <div class="savebar"><span id="create-note">Will be created as planned</span><div><a class="btn quiet" href="/quests">Cancel</a><button class="btn gold" type="button" data-save="">Create quest</button></div></div>
    </section>
  </div>`;
  return page('New quest', body, { page: 'new', ai: d.ai, characters: d.characters, used: usedBy(d, null), examples: EXAMPLES, years: d.years });
}

// ---- /quests/review ----

const attackLine = a => {
  if (!a || !a.state) return '';
  if (a.state === 'hit') return `<p class="hit">⚔️ Quest review hit the boss${a.damage ? ` for <b>${esc(a.damage)}</b> damage` : ''}.</p>`;
  if (a.state === 'done') return '<p class="hit done">⚔️ Quest review already counted this week, so the boss was not hit again.</p>';
  return '<p class="hit failed">The Quest review attack did not go through. Tap it on the boss card instead.</p>';
};

export function reviewHtml(d, { done = false, attack = null } = {}) {
  const items = d.items;
  const reviewed = items.filter(it => it.saved && it.saved.verdict).length;
  if (done) {
    const pass = items.filter(it => it.saved && it.saved.verdict === 'pass').length, fail = items.filter(it => it.saved && it.saved.verdict === 'fail').length;
    const body = `<div class="view">
      <div class="crumb"><a class="btn quiet" href="/quests">← All quests</a><a class="btn" href="/quests/review">Change the review</a></div>
      <div class="done-hero"><span class="big">🗺️</span><h2>Week ${d.week.n} reviewed</h2>
        <div class="done-score"><span class="pill good">${pass} passed</span><span class="pill warn">${fail} missed</span>${items.length - pass - fail ? `<span class="pill idle">${items.length - pass - fail} without a verdict</span>` : ''}</div>
        ${attackLine(attack)}
        <p class="hint" style="max-width:52ch">Each verdict is saved as a quest update, so it shows in the quest's evidence log. Next moves are saved on the quests.</p></div>
      <div class="panel"><span class="label">Your next moves for week ${d.week.n + 1}</span>
        <div class="related">${items.map(it => `<a class="rel" href="/quests/${esc(it.quest.id)}"><span class="emo">${esc(it.quest.icon || '◆')}</span><span><strong>${esc(it.quest.name)}</strong>${esc(it.quest.next || 'No next move set')}</span></a>`).join('')}</div></div>
      <div><a class="btn gold" href="/quests">Back to quests</a></div></div>`;
    return page('Weekly review', body, { page: 'review-done' });
  }
  const upcoming = d.quests.filter(q => bucket(q) === 'planned' && ((q.target && daysBetween(d.today, q.target) <= 90 && daysBetween(d.today, q.target) >= 0) || (q.start && q.start <= d.today)));
  const body = `<div class="view">
    <div class="crumb"><a class="btn quiet" href="/quests">← All quests</a>${d.ai && items.length ? '<button class="btn ai" type="button" data-act="rv-draft"><i class="spark">✦</i> Draft my review</button>' : ''}</div>
    <div class="rv-head">
      <div><h1>Weekly review</h1><p>Week ${d.week.n} · ${esc(weekday(d.week.from))} ${esc(fmtDay(d.week.from))} – ${esc(weekday(d.week.to))} ${esc(fmtDay(d.week.to))}. Answer each quest’s question, then set next week’s move.</p></div>
      <div class="rv-progress"><span class="label" id="rv-count">${reviewed} of ${items.length} reviewed</span><div class="bar"><i id="rv-bar" style="width:${items.length ? (reviewed / items.length) * 100 : 0}%"></i></div></div>
    </div>
    <p class="err" id="rv-error" role="alert" hidden></p>
    ${items.length ? '' : '<p class="empty">No active quests to review.</p>'}
    <div class="rv-list">${items.map(it => {
      const q = it.quest, s = it.saved || {};
      return `<article class="rv ${s.verdict === 'pass' ? 'is-pass' : s.verdict === 'fail' ? 'is-fail' : ''}" data-id="${esc(q.id)}">
        <a class="rv-thumb" href="/quests/${esc(q.id)}">${media(q)}</a>
        <div class="rv-body">
          <div class="rv-title"><h3>${esc(q.icon ? q.icon + ' ' : '')}${esc(q.name)}</h3>${attention(q)}</div>
          <div class="rv-q">${esc(q.passfail || 'Did this quest move forward this week?')}</div>
          <div class="verdict" role="group" aria-label="Verdict">
            <button type="button" class="vbtn pass" data-verdict="pass" aria-pressed="${s.verdict === 'pass'}">✓ Passed</button>
            <button type="button" class="vbtn fail" data-verdict="fail" aria-pressed="${s.verdict === 'fail'}">✗ Missed</button>
          </div>
          <div class="rv-ai" hidden><i class="spark">✦</i><span></span></div>
          <div class="rv-ev"><span class="label">This week’s evidence</span>${it.log.length ? it.log.map(l => `<div><span class="d">${esc(weekday(l.date))} ${esc(fmtDay(l.date).split(' ')[0])}</span><span>${esc(l.text)}</span></div>`).join('') : '<span class="none">Nothing logged this week.</span>'}</div>
          <div class="rv-fields">
            <div class="field"><label for="rv-next-${esc(q.id)}">Next move for next week</label><textarea id="rv-next-${esc(q.id)}" data-rv="next" maxlength="1000">${esc(q.next)}</textarea></div>
            <div class="field"><label for="rv-note-${esc(q.id)}">Note <span class="hint">(optional)</span></label><input type="text" id="rv-note-${esc(q.id)}" data-rv="note" maxlength="1000" value="${esc(s.note || '')}" placeholder="What got in the way, or what worked"></div>
          </div>
        </div></article>`;
    }).join('')}</div>
    ${upcoming.length ? `<section class="section"><div class="section-head"><h3>Anything to start next week?</h3><span class="hint">Planned quests that have started or have a target within 90 days</span></div>
      <div class="ledger">${upcoming.map(q => lrow(q, d)).join('')}</div></section>` : ''}
    ${items.length ? `<div class="savebar"><span><span id="rv-left">${reviewed === items.length ? 'All quests reviewed' : `${items.length - reviewed} still need a verdict`}</span> · Finishing also hits the boss with Quest review (once a week)</span><div><button class="btn gold" type="button" data-act="rv-save">Finish review</button></div></div>` : ''}
  </div>`;
  return page('Weekly review', body, { page: 'review', ai: d.ai });
}

export function questsErrorHtml(message) {
  return page('Quests', `<div class="view"><h1>Quests</h1><p class="err">${esc(message)}</p><p><a class="btn" href="/quests">Try again</a></p></div>`, { page: 'error' });
}

// ---- The page script ----
// The bundler that builds the Worker (esbuild, with keepNames) adds
// `__name(fn, "name")` calls inside CLIENT, and CLIENT.toString() carries them
// into the page, where no __name exists: every button died with a
// ReferenceError (4 Oct 2026). The prelude defines it as a no-op first.
export const CLIENT_PRELUDE = 'var __name=function(t){return t};';

// Runs in the browser (serialised with toString), so it can use nothing from
// this module: what it needs comes from the #qdata JSON.
function CLIENT() {
  var D = JSON.parse(document.getElementById('qdata').textContent || '{}');
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var toastTimer;
  function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600); }
  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' })
      .then(function (r) {
        if (r.status === 401) { location.href = '/login?next=/quests'; return new Promise(function () {}); }
        return r.json().catch(function () { return { ok: 0, message: 'The server answered ' + r.status + '.' }; });
      }, function () { return { ok: 0, message: 'No connection. Try again.' }; });
  }
  function busy(btn, text) { var label = btn.innerHTML; btn.disabled = true; btn.textContent = text; return function () { btn.disabled = false; btn.innerHTML = label; }; }
  var charById = {}; (D.characters || []).forEach(function (c) { charById[c.id] = c; });
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Avatar clips drawn on the server: still for people who asked for less motion.
  if (REDUCED) document.querySelectorAll('.avatar video').forEach(function (v) { v.pause(); v.removeAttribute('autoplay'); });
  var HUE = { 'Arcane': 275, 'Bleach': 205, 'Chainsaw Man': 10, 'Cyberpunk: Edgerunners': 320, 'Dragon Ball': 32, 'Fairy Tail': 350, 'Jujutsu Kaisen': 230, 'One Punch Man': 48, 'Solo Leveling': 250, 'Tokyo Ghoul': 0 };
  function initials(n) { return String(n || '').split(/[\s/]+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  function clipSrc(url, size) { return /\/video\/upload\//.test(url) ? url.replace('/video/upload/', '/video/upload/c_fill,g_center,h_' + size + ',w_' + size + '/q_auto/') : url; }
  function avatarSrc(url, size) { return /\/image\/upload\//.test(url) ? url.replace('/image/upload/', '/image/upload/c_fill,g_auto,w_' + size + ',h_' + size + ',q_auto,f_auto/') : url; }
  function avatar(c, size, radius, showFr) {
    if (!c) return '';
    var h = HUE[c.franchise] == null ? 200 : HUE[c.franchise];
    var dims = size ? 'width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.36) + 'px;' : '';
    return '<span class="avatar" style="' + dims + 'border-radius:' + (radius || 12) + 'px;background:radial-gradient(circle at 30% 25%,hsl(' + h + ' 55% 42%),hsl(' + h + ' 45% 16%) 75%)" aria-hidden="true">' +
      (c.avatar && c.clip && (!size || size >= 36) && !REDUCED
        ? '<video src="' + esc(clipSrc(c.clip, size ? Math.min(512, size * 2) : 320)) + '" poster="' + esc(avatarSrc(c.avatar, size ? Math.min(512, size * 2) : 320)) + '" autoplay muted loop playsinline preload="metadata" aria-hidden="true"></video>'
        : c.avatar ? '<img src="' + esc(avatarSrc(c.avatar, size ? Math.min(512, size * 2) : 320)) + '" alt="" loading="lazy">' : esc(initials(c.name))) +
      (!c.avatar && showFr ? '<span class="fr">' + esc(c.franchise) + '</span>' : '') + '</span>';
  }

  // ---- List: tabs, search, journey ----
  if (D.page === 'list') {
    var tab = new URLSearchParams(location.search).get('tab') || ($('.tab[aria-selected="true"]') || {}).dataset.tab || 'active';
    function filter() {
      var term = ($('#search').value || '').trim().toLowerCase(), j = $('#journey').value, shown = 0;
      $$('.pane').forEach(function (p) { p.hidden = p.dataset.pane !== tab; });
      $$('.pane[data-pane="' + tab + '"] [data-name]').forEach(function (el) {
        var ok = (!term || el.dataset.name.indexOf(term) >= 0) && (!j || el.dataset.journey === j);
        el.hidden = !ok; if (ok) shown++;
      });
      $('#nomatch').hidden = shown > 0 || (!term && !j);
    }
    $$('.tab').forEach(function (b) {
      b.addEventListener('click', function () {
        tab = b.dataset.tab;
        $$('.tab').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
        history.replaceState(null, '', tab === 'active' ? '/quests' : '/quests?tab=' + tab);
        filter();
      });
    });
    $('#search').addEventListener('input', filter);
    $('#journey').addEventListener('change', filter);
  }

  // ---- The quest form (edit and new) ----
  var form = $('#quest-form');
  var aiFilled = {};
  function setField(name, v) {
    if (name === 'attention' || name === 'phase') { $$('[data-field="' + name + '"] button').forEach(function (b) { b.setAttribute('aria-pressed', String((v || '') === b.dataset.opt)); }); return; }
    if (name === 'active') { $('#f-active').checked = !!v; return; }
    var el = $('#f-' + name); if (el) el.value = v == null ? '' : v;
    if (name === 'character') charUsed();
  }
  function getForm() {
    var v = function (n) { var el = $('#f-' + n); return el ? el.value : ''; };
    var segv = function (n) { var b = $('[data-field="' + n + '"] button[aria-pressed="true"]'); return b ? b.dataset.opt : ''; };
    return { name: v('name').trim(), icon: v('icon').trim(), next: v('next').trim(), passfail: v('passfail').trim(), active: $('#f-active').checked,
      attention: segv('attention'), phase: segv('phase'), journey: v('journey'), year: v('year'), start: v('start'), target: v('target'),
      character: v('character'), outcome: v('outcome').trim(), description: v('description').trim(), evidence: v('evidence').trim() };
  }
  function markAi(name, why) {
    var f = $('[data-f="' + name + '"]'); if (!f) return;
    aiFilled[name] = true; f.classList.add('ai-filled');
    var tag = $('.ai-tag', f); if (tag) tag.hidden = false;
    var w = $('[data-why="' + name + '"]', f), h = $('[data-hint="' + name + '"]', f);
    if (w && why) { w.innerHTML = '<i class="spark">✦</i>' + esc(why); w.hidden = false; if (h) h.hidden = true; }
  }
  function unmark(f) {
    if (!f || !f.classList.contains('ai-filled')) return;
    f.classList.remove('ai-filled'); var tag = $('.ai-tag', f); if (tag) tag.hidden = true;
  }
  function charUsed() {
    var el = $('#char-used'); if (!el) return;
    var id = $('#f-character').value, other = id && D.used && D.used[id];
    el.hidden = !other; el.textContent = other ? 'Also stars in “' + other + '”.' : '';
  }
  if (form) {
    form.addEventListener('click', function (e) {
      var b = e.target.closest('[data-opt]');
      if (b) { $$('button', b.parentElement).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); unmark(b.closest('.field')); }
    });
    form.addEventListener('input', function (e) { unmark(e.target.closest('.field')); });
    form.addEventListener('change', function (e) { unmark(e.target.closest('.field')); if (e.target.id === 'f-character') charUsed(); });
    charUsed();
    if (D.activateOnSave) { $('#f-active').checked = true; var nx = $('#f-next'); if (nx) nx.focus(); }
  }
  function suggest(field, targetId, boxId, btn) {
    var box = $('#' + boxId); if (!box) return;
    var quest = form ? getForm() : { name: D.quest && D.quest.name };
    if (targetId === 'next-text') quest.next = $('#next-text').value;
    box.innerHTML = '<span class="note">✦ Thinking of options…</span>';
    var done = btn ? busy(btn, 'Thinking…') : function () {};
    post('/quests/ai', { kind: 'suggest', field: field, quest: quest, id: D.id || null, text: newText() }).then(function (r) {
      done();
      if (r.ok !== 1) { box.innerHTML = '<span class="note">' + esc(r.message || 'That did not work.') + '</span>'; return; }
      box.innerHTML = r.options.length ? r.options.map(function (o) { return '<button type="button" class="sug" data-use="' + targetId + '">' + esc(o) + '</button>'; }).join('') + '<span class="note">Pick one to use it, then edit as you like.</span>' : '<span class="note">No suggestions came back. Try again.</span>';
    });
  }
  document.addEventListener('click', function (e) {
    var s = e.target.closest('[data-suggest]');
    if (s) { suggest(s.dataset.suggest, 'f-' + s.dataset.suggest, 'sug-' + s.dataset.suggest, s); return; }
    var u = e.target.closest('[data-use]');
    if (u) { var el = $('#' + u.dataset.use); if (el) { el.value = u.textContent; el.focus(); unmark(el.closest('.field')); } u.parentElement.innerHTML = ''; }
  });

  // Save (edit) or create (new).
  $$('[data-save]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var body = getForm();
      if (!body.name) { toast('Give the quest a name first.'); $('#f-name').focus(); return; }
      if (body.active && !body.next) { toast('Active quests need a next move.'); $('#f-next').focus(); return; }
      if (btn.dataset.save) body.id = btn.dataset.save;
      var done = busy(btn, btn.dataset.save ? 'Saving…' : 'Creating…');
      post('/quests/save', body).then(function (r) {
        if (r.ok === 1) { location.href = '/quests/' + encodeURIComponent(r.id) + (r.created ? '?created=1' : '?saved=1'); return; }
        done(); toast(r.message || 'That did not save.');
      });
    });
  });
  if (/[?&](saved|created)=1/.test(location.search)) { toast(/created/.test(location.search) ? 'Quest created' : 'Saved'); history.replaceState(null, '', location.pathname); }

  // ---- Quest page: quick changes, next move, evidence filter, picker ----
  if (D.page === 'quest') {
    var act = function (op, value, label, extra) {
      var body = { id: D.id, op: op, value: value }; if (extra) for (var k in extra) body[k] = extra[k];
      return post('/quests/action', body).then(function (r) {
        if (r.ok === 1) { sessionStorage.setItem('qtoast', (typeof label === 'function' ? label(r) : label) || 'Saved'); location.reload(); return r; }
        if (r.code === 'needs_next') { location.href = '/quests/' + encodeURIComponent(D.id) + '?edit=1&need=next'; return r; }
        toast(r.message || 'That did not work.'); return r;
      });
    };
    try { var t = sessionStorage.getItem('qtoast'); if (t) { sessionStorage.removeItem('qtoast'); toast(t); } } catch (e) {}
    $$('[data-quick]').forEach(function (b) { b.addEventListener('click', function () { if (b.getAttribute('aria-pressed') === 'true') return; act(b.dataset.quick, b.dataset.value, (b.dataset.quick === 'attention' ? 'Attention' : 'Phase') + ' set to ' + b.dataset.value); }); });
    $$('[data-op]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.confirm && b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Tap again to confirm'; toast(b.dataset.confirm); setTimeout(function () { b.dataset.armed = ''; b.textContent = 'Mark completed'; }, 5000); return; }
        var done = busy(b, 'Saving…');
        act(b.dataset.op, null, { activate: 'Quest is now active', plan: 'Moved to planned', complete: 'Marked completed. Nice work.', reopen: 'Quest reopened' }[b.dataset.op]).then(function (r) { if (r.ok !== 1) done(); });
      });
    });
    var nv = $('#next-view'), ne = $('#next-edit');
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'next-edit') { nv.hidden = true; ne.hidden = false; a.hidden = true; $('#next-text').focus(); }
      if (a.dataset.act === 'next-cancel') { nv.hidden = false; ne.hidden = true; $('[data-act="next-edit"]').hidden = false; $('#sug-inline').innerHTML = ''; }
      if (a.dataset.act === 'next-save') { busy(a, 'Saving…'); act('next', $('#next-text').value, 'Next move saved').then(function (r) { if (r.ok !== 1) { a.disabled = false; a.textContent = 'Save next move'; } }); }
      if (a.dataset.act === 'next-suggest') suggest('next', 'next-text', 'sug-inline', a);
      if (a.dataset.act === 'pick-open') openPicker();
    });
    $$('[data-tl]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-tl]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        $$('.tl').forEach(function (r) { r.hidden = b.dataset.tl !== 'all' && r.dataset.kind !== b.dataset.tl; });
      });
    });

    var picker = $('#picker'), P = null;
    // Phones and tablets: no automatic focus on the search box (it opens the
    // keyboard over the list and makes iPhone Safari zoom in).
    var COARSE = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    function openPicker() {
      P = { search: '', artOnly: false, picks: null, loading: false, error: '' };
      drawPicker(); document.body.style.overflow = 'hidden';
      if (!COARSE) { var s = $('#picker-search'); if (s) s.focus({ preventScroll: true }); }
    }
    function closePicker() { P = null; picker.hidden = true; picker.innerHTML = ''; picker.classList.remove('confirming'); document.body.style.overflow = ''; }
    // A tapped character is confirmed first; an active quest also offers to
    // redraw its visual now (Roy, 4 Oct 2026).
    function drawConfirm(id) {
      var c = charById[id], cur = charById[D.quest.character];
      P.confirm = id; picker.classList.add('confirming');
      picker.innerHTML = '<div class="modal confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><div class="modal-head">' +
        '<div class="row"><div><span class="label">' + esc(D.quest.icon + ' ' + D.quest.name) + '</span><h2 id="confirm-title">Change the character?</h2></div><button class="icon-btn" type="button" data-pclose aria-label="Close">×</button></div></div>' +
        '<div class="modal-body"><div class="char-card">' + avatar(c, 52, 14) + '<div><strong>' + esc(c ? c.name : 'Character') + '</strong><span>' + esc(c ? c.franchise : '') + (cur ? ' · instead of ' + esc(cur.name) : '') + '</span></div></div>' +
        (D.quest.active
          ? '<p class="note">Redraw the visual with ' + esc(c ? c.name : 'them') + ' now? That makes a new image and clip (one OpenAI image, one Gemini clip); the Questboard shows it once the clip is ready, usually within a few minutes.</p>' +
            '<div class="confirm-actions"><button class="btn gold" type="button" data-pconfirm="redraw">Change and redraw</button><button class="btn" type="button" data-pconfirm="keep">Change, keep the visual</button><button class="btn quiet" type="button" data-pback>Back</button></div>'
          : '<p class="note">This quest isn’t active, so it has no visual on the Questboard yet. The new character is used when the visual is made.</p>' +
            '<div class="confirm-actions"><button class="btn gold" type="button" data-pconfirm="keep">Change character</button><button class="btn quiet" type="button" data-pback>Back</button></div>') +
        '</div></div>';
      var first = picker.querySelector('[data-pconfirm]'); if (first && !COARSE) first.focus({ preventScroll: true });
    }
    // The shell (title, search, toggle) is drawn once; typing, the toggle and
    // the suggestions only redraw the list, so the search box keeps focus.
    function drawPicker() {
      if (!P) return;
      var withArt = D.characters.filter(function (c) { return c.enabled && c.avatar; }).length, enabled = D.characters.filter(function (c) { return c.enabled; }).length;
      picker.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="picker-title"><div class="modal-head">' +
        '<div class="row"><div><span class="label">' + esc(D.quest.icon + ' ' + D.quest.name) + '</span><h2 id="picker-title">Choose a character</h2></div><button class="icon-btn" type="button" data-pclose aria-label="Close">×</button></div>' +
        '<div class="modal-tools"><input class="search" id="picker-search" type="search" placeholder="Search name, franchise or power" aria-label="Search characters" autocomplete="off" autocorrect="off" spellcheck="false">' +
        (D.ai ? '<button class="btn ai" type="button" data-psuggest><i class="spark">✦</i> Suggest for this quest</button>' : '') + '</div>' +
        '<div class="art-note"><label class="toggle"><input type="checkbox" id="picker-art"> Only with artwork</label><span>· Artwork for ' + withArt + ' of ' + enabled + ' characters.</span></div></div>' +
        '<div class="modal-body" id="picker-body"></div></div>';
      picker.hidden = false;
      drawList();
    }
    function drawList() {
      var body = $('#picker-body'); if (!P || !body) return;
      var term = P.search.trim().toLowerCase();
      var list = D.characters.filter(function (c) { return (c.enabled || c.id === D.quest.character) && (!term || (c.name + ' ' + c.franchise + ' ' + c.vibe).toLowerCase().indexOf(term) >= 0) && (!P.artOnly || c.avatar); });
      var franchises = []; list.forEach(function (c) { if (franchises.indexOf(c.franchise) < 0) franchises.push(c.franchise); });
      var tile = function (c) {
        var used = D.used[c.id], cur = c.id === D.quest.character;
        return '<button type="button" class="ccard' + (used ? ' used' : '') + '" data-pick="' + esc(c.id) + '" aria-pressed="' + cur + '">' + (cur ? '<span class="pill gold plain cur">Current</span>' : '') +
          avatar(c, 0, 0, true) + '<span class="cc-body"><strong>' + esc(c.name) + '</strong>' + (used ? '<span class="used-by">In “' + esc(used) + '”</span>' : '<span class="v">' + esc(c.vibe) + '</span>') + '</span></button>';
      };
      var ai = P.loading ? '<p class="note ai-note">✦ Finding characters that fit “' + esc(D.quest.name) + '”…</p>'
        : P.picks && P.picks.length ? '<div class="ai-picks">' + P.picks.map(function (p) { var c = charById[p.id]; return c ? '<button type="button" class="ai-pick" data-pick="' + esc(c.id) + '">' + avatar(c, 38, 10) + '<span><strong>' + esc(c.name) + '</strong> <span class="fr-inline">· ' + esc(c.franchise) + '</span><span>' + esc(p.why) + '</span></span><em>Use</em></button>' : ''; }).join('') + '</div>'
        : P.error ? '<p class="ai-off">' + esc(P.error) + '</p>' : '';
      body.innerHTML = (ai ? '<section class="section"><span class="label ai-label">✦ Suggested for this quest</span>' + ai + '</section>' : '') +
        (franchises.length ? franchises.map(function (f) { return '<section class="section"><span class="label">' + esc(f) + '</span><div class="char-grid">' + list.filter(function (c) { return c.franchise === f; }).map(tile).join('') + '</div></section>'; }).join('') : '<p class="empty">No characters match.</p>');
      var sb = $('[data-psuggest]'); if (sb) sb.disabled = !!P.loading;
    }
    picker.addEventListener('click', function (e) {
      if (e.target === picker || e.target.closest('[data-pclose]')) { closePicker(); return; }
      var p = e.target.closest('[data-pick]');
      if (p) {
        if (p.dataset.pick === D.quest.character) { closePicker(); return; }
        drawConfirm(p.dataset.pick);
        return;
      }
      if (e.target.closest('[data-pback]')) { P.confirm = null; picker.classList.remove('confirming'); drawPicker(); return; }
      var k = e.target.closest('[data-pconfirm]');
      if (k && P && P.confirm) {
        var c = charById[P.confirm], name = c ? c.name : 'Character', redraw = k.dataset.pconfirm === 'redraw';
        picker.innerHTML = '<div class="modal confirm"><div class="modal-body"><p class="note">' + (redraw ? 'Saving and starting the redraw…' : 'Saving…') + '</p></div></div>';
        act('character', P.confirm, function (r) {
          if (!redraw) return name + ' will star in the next visual';
          return r.redraw && r.redraw.ok === 1 ? name + ' is in. The new visual is being drawn and shows on the Questboard in a few minutes.'
            : name + ' is in, but the redraw didn’t start: ' + ((r.redraw && r.redraw.message) || 'no answer from the Quest Engine.');
        }, redraw ? { redraw: true } : null);
        return;
      }
      if (e.target.closest('[data-psuggest]')) {
        P.loading = true; P.error = ''; drawList();
        post('/quests/ai', { kind: 'characters', id: D.id }).then(function (r) {
          if (!P) return;
          P.loading = false;
          if (r.ok === 1) { P.picks = r.picks; if (!r.picks.length) P.error = 'No suggestions came back. Try again.'; } else P.error = r.message || 'That did not work.';
          drawList();
          var body = $('#picker-body'); if (body) body.scrollTop = 0;
        });
      }
    });
    picker.addEventListener('input', function (e) { if (e.target.id === 'picker-search' && P) { P.search = e.target.value; drawList(); } });
    picker.addEventListener('change', function (e) { if (e.target.id === 'picker-art' && P) { P.artOnly = e.target.checked; drawList(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && P) closePicker(); });
  }

  // ---- New quest ----
  function newText() { var t = $('#nq-text'); return t ? t.value.trim() : ''; }
  if (D.page === 'new') {
    var NQ = { draft: null, turns: 0 };
    var text = $('#nq-text'), draftBtn = $('#draft-btn');
    var CHECKS = [/./, /\b(because|so that|so we|since|want|need|matters|tired|finally)\b/i,
      /\b(by|before|until|end of|in \d|january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|fall|winter|week|month|year|20\d\d)\b/i,
      /\b(done|finished|complete|able to|without|every|per week|kg|km|%|hours?|relaxed)\b/i];
    function onText() {
      var t = text.value;
      $('#nq-count').textContent = t.trim().split(/\s+/).filter(Boolean).length + ' words';
      $$('.prompt-q').forEach(function (p, i) { var hit = t.trim().length > 3 && CHECKS[i].test(t); p.classList.toggle('hit', hit); $('i', p).textContent = hit ? '✓' : ''; });
      if (draftBtn) draftBtn.disabled = t.trim().length < 12;
    }
    text.addEventListener('input', onText);
    text.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && draftBtn && !draftBtn.disabled) runDraft(); });
    $$('[data-ex]').forEach(function (b) { b.addEventListener('click', function () { text.value = D.examples[+b.dataset.ex]; onText(); text.focus(); }); });
    function step(name) {
      $('#step-describe').hidden = name !== 'describe'; $('#step-thinking').hidden = name !== 'thinking'; $('#step-review').hidden = name !== 'review';
      var n = { describe: 0, thinking: 0, review: 1 }[name];
      $$('[data-step]').forEach(function (s) { var i = +s.dataset.step; s.className = i === n ? 'on' : i < n ? 'done' : ''; $('b', s).textContent = i < n ? '✓' : String(i + 1); });
      window.scrollTo({ top: 0 });
    }
    var timer;
    function thinking() {
      step('thinking'); var i = 0;
      var draw = function () { $$('#think-steps li').forEach(function (li, k) { li.className = k < i ? 'done' : k === i ? 'on' : ''; $('.m', li).textContent = k < i ? '✓' : k === i ? '›' : '·'; }); };
      draw(); clearInterval(timer); timer = setInterval(function () { if (i < 3) { i++; draw(); } }, 5000);
    }
    function runDraft(answers) {
      var body = { kind: 'draft', text: newText() };
      if (answers) { body.answers = answers; body.current = getForm(); }
      $('#nq-error').hidden = true;
      if (!answers) thinking();
      var btn = answers ? $('[data-act="refine"]') : null, done = btn ? busy(btn, 'Updating…') : function () {};
      post('/quests/ai', body).then(function (r) {
        clearInterval(timer); done();
        if (r.ok !== 1) {
          if (answers) { toast(r.message || 'That did not work.'); return; }
          step('describe'); var er = $('#nq-error'); er.textContent = r.message || 'The draft did not come back. Try again.'; er.hidden = false; return;
        }
        applyDraft(r.draft); step('review');
      });
    }
    function applyDraft(dr) {
      NQ.draft = dr;
      var f = dr.fields;
      ['name', 'icon', 'next', 'passfail', 'active', 'attention', 'phase', 'journey', 'year', 'start', 'target', 'character', 'outcome', 'description', 'evidence'].forEach(function (k) {
        setField(k, f[k]);
        if (k !== 'active' && f[k]) markAi(k, dr.why[k]);
      });
      $('#nq-title').textContent = (f.icon ? f.icon + ' ' : '') + (f.name || 'Review your quest');
      createNote(); drawSide();
    }
    function createNote() { var a = $('#f-active').checked, y = $('#f-year').value; $('#create-note').textContent = a ? 'Will be created as an active quest' : 'Will be created as planned' + (y ? ' · ' + y : ''); }
    form.addEventListener('change', createNote);
    function drawSide() {
      var dr = NQ.draft, side = $('#ai-side'), out = '';
      if (!dr) { side.innerHTML = newText() ? '<div class="panel"><span class="label">Your words</span><div class="your-words">' + esc(newText()) + '</div></div>' : ''; return; }
      if (dr.recommendation) out += '<div class="panel ai-panel"><span class="label">✦ Recommendation</span><div class="rec">' + esc(dr.recommendation) + '</div></div>';
      var c = charById[$('#f-character').value];
      if (c) out += '<div class="panel ai-panel"><span class="label">✦ Visual character</span><div class="char-card">' + avatar(c, 52, 14) + '<div><strong>' + esc(c.name) + '</strong><span>' + esc(c.franchise) + ' · ' + esc(c.vibe) + '</span></div></div>' +
        (dr.why.character ? '<div class="rec">' + esc(dr.why.character) + '</div>' : '') +
        (dr.alts.length ? '<div class="char-alts">Or try ' + dr.alts.map(function (id) { var a = charById[id]; return a ? '<button type="button" class="char-alt" data-alt="' + esc(id) + '">' + avatar(a, 20, 10) + esc(a.name) + '</button>' : ''; }).join('') + '</div>' : '') +
        '<span class="hint">The cinematic visual is made later.</span></div>';
      if (dr.questions.length) out += '<div class="panel ai-panel"><span class="label">✦ A few questions</span><div class="qa">' + dr.questions.map(function (q, i) { return '<div class="field"><label for="qa-' + i + '">' + esc(q) + '</label><input type="text" id="qa-' + i + '" placeholder="Your answer"></div>'; }).join('') + '</div><button class="btn ai" type="button" data-act="refine"><i class="spark">✦</i> Update draft with answers</button></div>';
      if (dr.related.length) out += '<div class="panel"><span class="label">Related quests</span><div class="related">' + dr.related.map(function (r) { return '<a class="rel" href="/quests/' + esc(r.id) + '" target="_blank" rel="noopener"><span class="emo">' + esc(r.icon || '◆') + '</span><span><strong>' + esc(r.name) + '</strong>' + esc(r.note) + '</span></a>'; }).join('') + '</div></div>';
      out += '<div class="panel"><div class="panel-head"><span class="label">Your words</span><button class="link-btn" type="button" data-act="redraft">Edit &amp; redraft</button></div><div class="your-words">' + esc(newText()) + '</div></div>';
      side.innerHTML = out;
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-act]'), alt = e.target.closest('[data-alt]');
      if (alt) { var prev = $('#f-character').value; setField('character', alt.dataset.alt); NQ.draft.alts = NQ.draft.alts.map(function (id) { return id === alt.dataset.alt ? prev : id; }).filter(Boolean); NQ.draft.why.character = ''; unmark($('[data-f="character"]')); drawSide(); toast('Character set to ' + (charById[alt.dataset.alt] || {}).name); return; }
      if (!a) return;
      if (a.dataset.act === 'draft') runDraft();
      if (a.dataset.act === 'manual') { NQ.draft = null; step('review'); $('#nq-title').textContent = 'New quest'; drawSide(); $('#f-name').focus(); }
      if (a.dataset.act === 'redraft') step('describe');
      if (a.dataset.act === 'refine') {
        var answers = NQ.draft.questions.map(function (q, i) { return { q: q, a: ($('#qa-' + i) || {}).value || '' }; }).filter(function (x) { return x.a.trim(); });
        if (!answers.length) { toast('Answer at least one question first.'); return; }
        runDraft(answers);
      }
    });
    form.addEventListener('change', function (e) { if (e.target.id === 'f-character' && NQ.draft) { NQ.draft.why.character = ''; drawSide(); } });
    onText();
  }

  // ---- Weekly review ----
  if (D.page === 'review') {
    function counts() {
      var cards = $$('.rv'), n = cards.filter(function (c) { return $('[data-verdict][aria-pressed="true"]', c); }).length;
      $('#rv-count').textContent = n + ' of ' + cards.length + ' reviewed';
      $('#rv-bar').style.width = (cards.length ? n / cards.length * 100 : 0) + '%';
      var left = $('#rv-left'); if (left) left.textContent = n === cards.length ? 'All quests reviewed' : (cards.length - n) + ' still need a verdict';
    }
    function setVerdict(card, v) {
      $$('[data-verdict]', card).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.verdict === v)); });
      card.classList.toggle('is-pass', v === 'pass'); card.classList.toggle('is-fail', v === 'fail');
      counts();
    }
    document.addEventListener('click', function (e) {
      var v = e.target.closest('[data-verdict]');
      if (v) { var card = v.closest('.rv'); setVerdict(card, v.getAttribute('aria-pressed') === 'true' ? '' : v.dataset.verdict); return; }
      var a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'rv-draft') {
        var done = busy(a, 'Drafting…');
        var notes = $$('.rv').map(function (c) { return { id: c.dataset.id, note: $('[data-rv="note"]', c).value }; });
        post('/quests/ai', { kind: 'review', notes: notes }).then(function (r) {
          done();
          if (r.ok !== 1) { var er = $('#rv-error'); er.textContent = r.message || 'The draft did not come back.'; er.hidden = false; return; }
          r.items.forEach(function (it) {
            var card = $('.rv[data-id="' + it.id + '"]'); if (!card) return;
            if (it.verdict) setVerdict(card, it.verdict);
            if (it.next) { var t = $('[data-rv="next"]', card); t.value = it.next; t.closest('.field').classList.add('ai-filled'); }
            var box = $('.rv-ai', card); $('span', box).textContent = (it.unclear ? 'Unclear from the evidence. ' : '') + it.reason; box.hidden = !it.reason && !it.unclear;
          });
          toast('Draft ready. Check it, then finish the review.');
        });
      }
      if (a.dataset.act === 'rv-save') {
        var items = $$('.rv').map(function (c) { var p = $('[data-verdict][aria-pressed="true"]', c); return { id: c.dataset.id, verdict: p ? p.dataset.verdict : '', next: $('[data-rv="next"]', c).value, note: $('[data-rv="note"]', c).value }; });
        var done2 = busy(a, 'Saving…');
        post('/quests/review/save', { items: items }).then(function (r) {
          if (r.ok === 1 && !r.failed.length) {
            var a = r.attack || {};
            location.href = '/quests/review?done=1' + (a.state ? '&attack=' + encodeURIComponent(a.state) + (a.damage ? '&dmg=' + encodeURIComponent(a.damage) : '') : '');
            return;
          }
          done2(); var er = $('#rv-error'); er.textContent = r.message || ('Some quests did not save: ' + r.failed.map(function (f) { return f.message; }).join('; ')); er.hidden = false;
        });
      }
    });
    $$('.rv textarea').forEach(function (t) { t.addEventListener('input', function () { t.closest('.field').classList.remove('ai-filled'); }); });
  }
}

const STYLE = `
:root{
  --bg:#0A0F13; --surface:#11191F; --surface-2:#172229; --surface-3:#1E2B33; --line:#23313B; --line-2:#2F404B;
  --ink:#E9EEF1; --body:#D3DCE1; --muted:#8FA0AB; --faint:#5F717C;
  --gold:#E9B44C; --gold-2:#F5CB72; --gold-soft:rgba(233,180,76,.14); --on-gold:#1B1203;
  --ai:#9DB8FF; --ai-soft:rgba(157,184,255,.12); --ai-line:rgba(157,184,255,.35);
  --good:#5DC48C; --good-soft:rgba(93,196,140,.14); --warn:#F28B5F; --warn-soft:rgba(242,139,95,.15); --idle-soft:rgba(143,160,171,.14);
  --f-display:"Bricolage Grotesque","Avenir Next","Segoe UI",system-ui,sans-serif;
  --f-body:"Instrument Sans","Helvetica Neue","Segoe UI",system-ui,sans-serif;
  --f-mono:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,monospace;
  --r:12px; color-scheme:dark}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{margin:0;background:var(--bg)}
body{color:var(--ink);font-family:var(--f-body);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}
.wrap{max-width:1120px;margin:0 auto;padding-inline:max(16px,env(safe-area-inset-left));padding-block:max(18px,env(safe-area-inset-top)) max(80px,env(safe-area-inset-bottom))}
a{color:inherit}
h1,h2,h3{font-family:var(--f-display);font-weight:700;letter-spacing:-.015em;text-wrap:balance;margin:0}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer}
button:disabled{cursor:default;opacity:.55}
:focus-visible{outline:2px solid var(--gold);outline-offset:2px;border-radius:6px}
.mono{font-family:var(--f-mono);font-variant-numeric:tabular-nums}
.label{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600}
.hint{font-size:12.5px;color:var(--muted);font-weight:400}
.hint.warn{color:var(--warn)}
.none{color:var(--muted);font-size:14.5px}
.view{display:flex;flex-direction:column;gap:24px}
.nav{display:flex;gap:16px;margin-bottom:18px;font-size:14.5px}
.nav a{color:var(--muted);text-decoration:none;font-weight:500}
.nav a:hover{color:var(--ink)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--line-2);background:var(--surface-2);border-radius:9px;padding:8px 14px;font-weight:600;font-size:14px;white-space:nowrap;text-decoration:none;min-height:38px}
.btn:hover:not(:disabled){border-color:var(--faint);background:var(--surface-3)}
.btn.gold{background:var(--gold);border-color:var(--gold);color:var(--on-gold)}
.btn.gold:hover:not(:disabled){background:var(--gold-2);border-color:var(--gold-2)}
.btn.ai{background:var(--ai-soft);border-color:var(--ai-line);color:var(--ai)}
.btn.ai:hover:not(:disabled){background:rgba(157,184,255,.2);border-color:var(--ai)}
.btn.quiet{background:transparent;border-color:transparent;color:var(--muted)}
.btn.quiet:hover:not(:disabled){color:var(--ink);background:var(--surface-2)}
.btn.big{padding:11px 18px;font-size:15px;border-radius:11px}
.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600;white-space:nowrap;line-height:1.4}
.pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.pill.good{background:var(--good-soft);color:var(--good)} .pill.warn{background:var(--warn-soft);color:var(--warn)}
.pill.idle{background:var(--idle-soft);color:var(--muted)} .pill.gold{background:var(--gold-soft);color:var(--gold)}
.pill.plain::before{display:none}
.spark{font-style:normal;color:var(--ai)}
.btn.gold .spark{color:inherit}
.err{background:var(--warn-soft);color:var(--warn);border-radius:12px;padding:12px 16px;margin:0}
.ai-off{font-size:13.5px;color:var(--muted);background:var(--surface-2);border-radius:9px;padding:10px 12px;margin:0}
.empty{color:var(--muted);font-size:14px;margin:0}
.note{font-size:13px;color:var(--muted);margin:0}
.ai-note,.ai-label{color:var(--ai)!important}
.top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px}
.top h1{font-size:clamp(32px,4.6vw,46px);line-height:1;font-weight:800}
.top .sub{color:var(--muted);margin-top:8px}
.actions{display:flex;gap:10px;flex-wrap:wrap}
.toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:linear-gradient(var(--bg) 75%,rgba(10,15,19,0));padding-block:10px 14px;margin-block:-10px -14px}
.tabs{display:flex;gap:2px;background:var(--surface);border:1px solid var(--line);padding:4px;border-radius:11px;flex-wrap:wrap}
.tab{border:0;background:transparent;padding:7px 14px;border-radius:8px;font-weight:600;font-size:14px;color:var(--muted)}
.tab:hover{color:var(--ink)}
.tab[aria-selected="true"]{background:var(--surface-3);color:var(--ink)}
.tab .n{font-family:var(--f-mono);font-size:11.5px;margin-left:7px;color:var(--faint)}
.tab[aria-selected="true"] .n{color:var(--gold)}
.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.search{border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:8px 12px;width:210px;max-width:100%;min-height:38px}
.search::placeholder{color:var(--faint)}
.jsel{border:1px solid var(--line);background:var(--surface);border-radius:9px;padding:8px 10px;min-height:38px}
.section{display:flex;flex-direction:column;gap:14px}
.section-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.section-head h3{font-size:19px}
.section-head .count{font-family:var(--f-mono);font-size:12px;color:var(--gold)}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.card{position:relative;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden;text-decoration:none;transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}
.card:hover{transform:translateY(-3px);border-color:var(--line-2);box-shadow:0 14px 40px rgba(0,0,0,.45)}
.poster{position:relative;aspect-ratio:16/9;max-width:100%;background:var(--surface-2);overflow:hidden;display:block}
.poster img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.poster::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,15,19,0) 40%,rgba(17,25,31,.92) 100%)}
.ph{position:absolute;inset:0;display:grid;place-items:center;font-size:56px;background:radial-gradient(circle at 30% 20%,var(--surface-3),var(--surface) 70%)}
.poster-tags{position:absolute;left:12px;top:12px;right:12px;display:flex;justify-content:space-between;gap:8px;z-index:1}
.poster-tags .pill{backdrop-filter:blur(6px);background:rgba(10,15,19,.65)}
.card-body{position:relative;padding:0 16px 16px;margin-top:-38px;z-index:1;display:flex;flex-direction:column;gap:10px;flex:1}
.card-title{display:flex;gap:10px;align-items:flex-end}
.card-title .emo{font-size:26px;line-height:1}
.card-title h3{font-size:19px;line-height:1.15}
.card .next{font-size:14px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card .next b{color:var(--ink);font-weight:600}
.card-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:10px;border-top:1px solid var(--line);font-size:12.5px;color:var(--muted);flex-wrap:wrap}
.chk{font-family:var(--f-mono);font-size:11.5px} .chk.pass{color:var(--good)} .chk.fail{color:var(--warn)}
.att{display:inline-flex;align-items:flex-end;gap:2px;height:13px}
.att i{display:block;width:4px;border-radius:1px;background:var(--line-2)}
.att i:nth-child(1){height:4px}.att i:nth-child(2){height:7px}.att i:nth-child(3){height:10px}.att i:nth-child(4){height:13px}
.att i.on{background:var(--gold)}
.att-wrap{display:inline-flex;gap:7px;align-items:center}
.phase{display:inline-flex;gap:3px;align-items:center}
.phase i{width:16px;height:4px;border-radius:2px;background:var(--line-2)}
.phase i.done{background:var(--faint)} .phase i.cur{background:var(--gold)}
.phase-wrap{display:inline-flex;gap:8px;align-items:center}
.ledger{display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.lrow{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 16px;border-top:1px solid var(--line);text-decoration:none}
.lrow:first-child{border-top:0}
.lrow:hover{background:var(--surface-2)}
.lrow .emo{width:40px;height:40px;border-radius:10px;background:var(--surface-2);display:grid;place-items:center;font-size:20px}
.lrow-main{min-width:0;display:flex;flex-direction:column;gap:2px}
.lrow-main strong{font-weight:600;font-size:15px}
.lrow-main span{font-size:13px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lrow-side{display:flex;gap:10px;align-items:center;font-size:12.5px;color:var(--muted)}
.arrow{color:var(--faint);font-size:18px}
.lrow:hover .arrow{color:var(--gold)}
.year-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}
.crumb{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.hero{position:relative;border-radius:20px;overflow:hidden;border:1px solid var(--line-2);aspect-ratio:21/8;min-height:260px;max-width:100%;background:var(--surface-2);isolation:isolate}
.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
.hero .ph{z-index:-2;font-size:110px}
.hero::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(0deg,rgba(10,15,19,.96) 0%,rgba(10,15,19,.55) 45%,rgba(10,15,19,.1) 100%)}
.hero-in{position:absolute;left:0;right:0;bottom:0;padding:24px 28px;display:flex;flex-direction:column;gap:12px}
.hero-in .label{color:var(--gold)}
.hero-in h1{font-size:clamp(26px,4vw,42px);line-height:1.04;font-weight:800;max-width:24ch}
.hero-tags{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.hero-tags .pill{backdrop-filter:blur(6px);background:rgba(10,15,19,.6)}
.page-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px;align-items:start}
.col{display:flex;flex-direction:column;gap:18px;min-width:0}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:16px 18px;display:flex;flex-direction:column;gap:10px}
.panel p{margin:0;white-space:pre-line;max-width:68ch;color:var(--body)}
.panel.next-move{border-color:rgba(233,180,76,.5);background:linear-gradient(180deg,var(--gold-soft),rgba(233,180,76,.04))}
.panel.next-move .label{color:var(--gold)}
.panel.next-move #next-view p{font-size:17px;font-weight:600;color:var(--ink)}
.panel.next-move #next-view p.none{font-size:15px;font-weight:500;color:var(--muted)}
.panel-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.link-btn{border:0;background:transparent;color:var(--muted);font-size:13px;font-weight:600;padding:2px 4px}
.link-btn:hover{color:var(--gold)}
.check{display:flex;gap:12px;align-items:flex-start}
.mark{font-family:var(--f-mono);font-size:11.5px;font-weight:500;border-radius:6px;padding:3px 8px;white-space:nowrap;margin-top:2px}
.mark.pass{background:var(--good-soft);color:var(--good)} .mark.fail{background:var(--warn-soft);color:var(--warn)} .mark.none{background:var(--idle-soft);color:var(--muted)}
.inline-edit{display:flex;flex-direction:column;gap:8px}
.inline-edit textarea{border:1px solid var(--gold);background:var(--bg);border-radius:9px;padding:10px 12px;width:100%;min-height:70px;resize:vertical;font-size:16px}
.row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;align-items:center}
.side{position:sticky;top:76px}
.kv{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px 14px;font-size:14px;align-items:center;margin:0}
.kv dt{color:var(--muted);font-size:13px}
.kv dd{margin:0;text-align:right;font-weight:500}
.kv dd small{display:block;color:var(--muted);font-weight:400;font-size:12px}
.kv dd small.warn{color:var(--warn)}
.ctrl{display:flex;flex-direction:column;gap:7px}
.seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:3px;background:var(--bg);border:1px solid var(--line);padding:3px;border-radius:9px}
.seg button{border:0;background:transparent;border-radius:6px;padding:7px 4px;font-size:12.5px;font-weight:600;color:var(--muted)}
.seg button:hover{color:var(--ink)}
.seg button[aria-pressed="true"]{background:var(--gold);color:var(--on-gold)}
.actions-col{display:flex;flex-direction:column;gap:8px}
.timeline{display:flex;flex-direction:column}
.tl{position:relative;display:grid;grid-template-columns:62px 18px minmax(0,1fr);gap:0 10px;padding-bottom:16px}
.tl:last-child{padding-bottom:0}
.tl .d{font-family:var(--f-mono);font-size:12px;color:var(--muted);padding-top:1px}
.tl .dot{position:relative;display:flex;justify-content:center}
.tl .dot::before{content:"";position:absolute;top:16px;bottom:-16px;width:2px;background:var(--line)}
.tl:last-child .dot::before{display:none}
.tl .dot i{position:relative;width:12px;height:12px;border-radius:50%;margin-top:4px;border:2px solid var(--faint);background:var(--surface)}
.tl.note .dot i{background:var(--gold);border-color:var(--gold)}
.tl.milestone .dot i{background:var(--good);border-color:var(--good)}
.tl.setback .dot i{border-color:var(--warn)}
.tl.review .dot i{background:var(--ai);border-color:var(--ai)}
.tl .t{display:flex;flex-direction:column;gap:2px;min-width:0}
.tl .k{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);font-weight:600}
.tl.note .k{color:var(--gold)} .tl.review .k{color:var(--ai)}
.tl .t p{margin:0;font-size:14px;color:var(--body);white-space:pre-line}
.tl-filter{display:flex;gap:6px}
.tl-filter button{border:1px solid var(--line);background:transparent;border-radius:99px;padding:3px 10px;font-size:12px;color:var(--muted);font-weight:600}
.tl-filter button[aria-pressed="true"]{border-color:var(--gold);color:var(--gold)}
.form{display:flex;flex-direction:column;gap:18px}
.field{display:flex;flex-direction:column;gap:6px}
.field-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.field label,.field .flabel{font-size:13.5px;font-weight:600;display:inline-flex;gap:8px;align-items:center}
.field input[type=text],.field input[type=date],.field select,.field textarea{border:1px solid var(--line-2);background:var(--bg);border-radius:9px;padding:9px 11px;width:100%;font-size:16px}
.field input:focus,.field textarea:focus,.field select:focus{border-color:var(--gold);outline:none}
.field textarea{resize:vertical;min-height:84px;line-height:1.45}
.field.ai-filled input[type=text],.field.ai-filled textarea,.field.ai-filled select,.field.ai-filled input[type=date]{border-color:var(--ai-line)}
.ai-tag{font-size:10.5px;font-weight:700;letter-spacing:.06em;color:var(--ai);background:var(--ai-soft);border-radius:5px;padding:1px 6px;text-transform:uppercase}
.why{font-size:12.5px;color:var(--ai);display:flex;gap:6px;align-items:baseline}
.suggest-btn{border:0;background:transparent;color:var(--ai);font-size:12.5px;font-weight:600;padding:2px 4px;border-radius:5px}
.suggest-btn:hover:not(:disabled){background:var(--ai-soft)}
.sugs{display:flex;flex-direction:column;gap:6px}
.sugs:empty{display:none}
.sug{border:1px dashed var(--ai-line);background:var(--ai-soft);border-radius:9px;padding:8px 11px;text-align:left;font-size:13.5px;color:var(--body)}
.sug:hover{border-style:solid;border-color:var(--ai);color:var(--ink)}
.two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.icon-name{display:grid;grid-template-columns:70px minmax(0,1fr);gap:14px}
.switch{display:flex;align-items:center;gap:10px;font-weight:600;font-size:14px;flex-wrap:wrap}
.switch input{width:18px;height:18px;accent-color:var(--gold)}
.form-section{font-family:var(--f-display);font-size:16px;font-weight:700;border-top:1px solid var(--line);padding-top:16px}
.savebar{position:sticky;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--surface-3);border:1px solid var(--line-2);border-radius:12px;padding:10px 12px 10px 16px;box-shadow:0 12px 34px rgba(0,0,0,.5);flex-wrap:wrap;z-index:4}
.savebar span{font-size:13px;color:var(--muted)}
.savebar div{display:flex;gap:8px;flex-wrap:wrap}
.steps{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:13px;color:var(--faint);font-weight:600}
.steps span{display:inline-flex;align-items:center;gap:7px}
.steps b{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--line-2);font-family:var(--f-mono);font-size:11.5px;font-weight:500}
.steps .on{color:var(--ink)} .steps .on b{background:var(--gold);border-color:var(--gold);color:var(--on-gold)}
.steps .done{color:var(--muted)} .steps .done b{border-color:var(--gold);color:var(--gold)}
.steps i{width:22px;height:1px;background:var(--line-2)}
.nq-head h1{font-size:clamp(28px,4vw,40px);font-weight:800;line-height:1.05}
.nq-head p{margin:8px 0 0;color:var(--muted);max-width:62ch}
.describe{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:start}
.composer{background:var(--surface);border:1px solid var(--line-2);border-radius:16px;padding:6px;display:flex;flex-direction:column}
.composer textarea{border:0;background:transparent;padding:16px 16px 8px;min-height:190px;resize:vertical;font-size:16.5px;line-height:1.55;width:100%}
.composer textarea:focus{outline:none}
.composer textarea::placeholder{color:var(--faint)}
.composer:focus-within{border-color:var(--gold)}
.composer-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 10px;border-top:1px solid var(--line);flex-wrap:wrap}
.composer-foot .meta{font-size:12.5px;color:var(--faint)}
.prompts{display:flex;flex-direction:column;gap:8px}
.prompt-q{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:var(--body)}
.prompt-q i{font-style:normal;width:20px;height:20px;border-radius:6px;background:var(--surface-3);display:grid;place-items:center;font-size:11px;flex:none;margin-top:1px;color:var(--muted)}
.prompt-q.hit i{background:var(--good-soft);color:var(--good)}
.examples{display:flex;flex-wrap:wrap;gap:8px}
.ex{border:1px solid var(--line);background:transparent;border-radius:99px;padding:5px 12px;font-size:13px;color:var(--muted)}
.ex:hover{border-color:var(--faint);color:var(--ink)}
.thinking{display:flex;flex-direction:column;align-items:center;gap:16px;padding:70px 20px;text-align:center;background:var(--surface);border:1px solid var(--line);border-radius:16px}
.orb{width:56px;height:56px;border-radius:50%;background:conic-gradient(from 0deg,var(--ai),var(--gold),var(--ai));animation:spin 2.4s linear infinite;-webkit-mask:radial-gradient(circle,transparent 17px,#000 18px);mask:radial-gradient(circle,transparent 17px,#000 18px)}
@keyframes spin{to{transform:rotate(360deg)}}
.thinking h3{font-size:20px}
.thinking ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:14px;color:var(--muted)}
.thinking li.on{color:var(--ink)} .thinking li.done{color:var(--good)}
.review{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:24px;align-items:start}
.ai-panel{border-color:var(--ai-line);background:linear-gradient(180deg,var(--ai-soft),rgba(157,184,255,.03))}
.ai-panel .label{color:var(--ai)}
.rec{font-size:14px;color:var(--body)}
.related{display:flex;flex-direction:column;gap:10px}
.rel{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:var(--body);text-decoration:none}
.rel .emo{font-size:18px;line-height:1.2}
.rel strong{color:var(--ink);font-weight:600;display:block}
.qa{display:flex;flex-direction:column;gap:12px}
.qa .field label{font-weight:500;color:var(--body);font-size:14px}
.your-words{font-size:13.5px;color:var(--muted);white-space:pre-line;border-left:2px solid var(--line-2);padding-left:12px}
.avatar{position:relative;overflow:hidden;display:grid;place-items:center;font-family:var(--f-display);font-weight:800;color:rgba(255,255,255,.92);flex:none}
.avatar img,.avatar video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.avatar .fr{position:absolute;left:0;right:0;bottom:6px;font-family:var(--f-body);font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;opacity:.7;text-align:center}
.char-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center}
.char-card strong{display:block;font-size:15.5px}
.char-card span{font-size:12.5px;color:var(--muted)}
.char-alts{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12.5px;color:var(--muted)}
.char-alt{display:inline-flex;gap:6px;align-items:center;border:1px solid var(--ai-line);background:transparent;border-radius:99px;padding:3px 10px 3px 4px;font-size:12.5px;color:var(--ai);font-weight:600}
.char-alt:hover{background:var(--ai-soft)}
.modal-scrim{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(3px);z-index:30;display:flex;align-items:center;justify-content:center;padding:16px}
.modal{width:min(780px,100%);max-height:min(88vh,860px);background:var(--surface);border:1px solid var(--line-2);border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.6);display:flex;flex-direction:column;overflow:hidden}
.modal-head{padding:18px 20px 14px;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:12px}
.modal-head .row{justify-content:space-between}
.modal-head h2{font-size:21px}
.modal.confirm{width:min(480px,100%)}
.modal.confirm .modal-body{gap:14px}
.confirm-actions{display:flex;gap:8px;flex-wrap:wrap}
.modal-tools{display:flex;gap:8px;flex-wrap:wrap}
.modal-tools .search{flex:1;min-width:180px}
.icon-btn{border:1px solid var(--line-2);background:var(--surface-2);border-radius:9px;width:36px;height:36px;display:grid;place-items:center;font-size:18px;line-height:1}
.modal-body{overflow-y:auto;padding:16px 20px 20px;display:flex;flex-direction:column;gap:18px}
.art-note{font-size:12.5px;color:var(--muted);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.toggle{display:inline-flex;gap:6px;align-items:center;font-size:13px}
.toggle input{accent-color:var(--gold)}
.char-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px}
.ccard{position:relative;display:flex;flex-direction:column;text-align:left;border:1px solid var(--line);background:var(--bg);border-radius:13px;padding:0;overflow:hidden;transition:transform .15s ease,border-color .15s ease}
.ccard:hover{transform:translateY(-2px);border-color:var(--faint)}
.ccard[aria-pressed="true"]{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold-soft)}
.ccard .avatar{width:100%;aspect-ratio:1;max-width:100%;font-size:30px}
.ccard.used .avatar{filter:saturate(.35) brightness(.7)}
.cc-body{padding:8px 10px 10px;display:flex;flex-direction:column;gap:2px;min-width:0}
.ccard strong{font-size:13.5px;font-weight:600;line-height:1.25}
.ccard .v{font-size:11.5px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ccard .used-by{font-size:11.5px;color:var(--warn)}
.ccard .cur{position:absolute;top:8px;left:8px;z-index:1}
.ai-picks{display:flex;flex-direction:column;gap:8px}
.ai-pick{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:10px;align-items:center;border:1px dashed var(--ai-line);background:var(--ai-soft);border-radius:11px;padding:9px 10px;text-align:left}
.ai-pick:hover{border-style:solid;border-color:var(--ai)}
.ai-pick strong{font-size:14px} .ai-pick span span{display:block;font-size:12.5px;color:var(--body)} .ai-pick .fr-inline{display:inline!important;color:var(--muted)!important}
.ai-pick em{font-style:normal;font-size:12px;color:var(--ai);font-weight:600}
.rv-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
.rv-head h1{font-size:clamp(28px,4vw,40px);font-weight:800;line-height:1.05}
.rv-head p{margin:6px 0 0;color:var(--muted)}
.rv-progress{display:flex;flex-direction:column;gap:6px;min-width:220px}
.bar{height:6px;border-radius:99px;background:var(--surface-3);overflow:hidden}
.bar i{display:block;height:100%;background:var(--gold);border-radius:99px;transition:width .3s}
.rv-list{display:flex;flex-direction:column;gap:16px}
.rv{display:grid;grid-template-columns:220px minmax(0,1fr);gap:20px;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px}
.rv.is-pass{border-color:rgba(93,196,140,.45)} .rv.is-fail{border-color:rgba(242,139,95,.45)}
.rv-thumb{position:relative;border-radius:11px;overflow:hidden;aspect-ratio:16/9;max-width:100%;background:var(--surface-2);align-self:start;display:block}
.rv-thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.rv-thumb .ph{font-size:40px}
.rv-body{display:flex;flex-direction:column;gap:12px;min-width:0}
.rv-title{display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap;font-size:12.5px;color:var(--muted)}
.rv-title h3{font-size:18px;color:var(--ink)}
.rv-q{font-size:15.5px;font-weight:600}
.verdict{display:flex;gap:8px;flex-wrap:wrap}
.vbtn{border:1px solid var(--line-2);background:var(--bg);border-radius:9px;padding:8px 16px;font-weight:600;font-size:14px;color:var(--muted);min-height:40px}
.vbtn:hover{color:var(--ink);border-color:var(--faint)}
.vbtn.pass[aria-pressed="true"]{background:var(--good-soft);border-color:var(--good);color:var(--good)}
.vbtn.fail[aria-pressed="true"]{background:var(--warn-soft);border-color:var(--warn);color:var(--warn)}
.rv-ev{display:flex;flex-direction:column;gap:5px;font-size:13.5px;color:var(--body);background:var(--bg);border-radius:10px;padding:10px 12px}
.rv-ev div{display:grid;grid-template-columns:54px minmax(0,1fr);gap:8px}
.rv-ev .d{font-family:var(--f-mono);font-size:12px;color:var(--muted)}
.rv-ev .none{color:var(--warn);font-size:13.5px}
.rv-ai{font-size:13px;color:var(--ai);display:flex;gap:6px}
.rv-fields{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:12px}
.rv-fields textarea{min-height:62px}
.done-hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:40px 20px;background:radial-gradient(circle at 50% 0%,var(--gold-soft),transparent 70%),var(--surface);border:1px solid var(--line);border-radius:18px}
.done-hero .big{font-size:46px} .done-hero h2{font-size:28px}
.done-score{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.hit{margin:4px 0 0;font-size:15px;font-weight:600;color:var(--gold)} .hit b{font-family:var(--f-mono)}
.hit.done{color:var(--muted);font-weight:500} .hit.failed{color:var(--warn);font-weight:500}
.toast{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom,0px));transform:translate(-50%,16px);background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:10px;font-size:14px;font-weight:600;opacity:0;pointer-events:none;transition:all .2s;z-index:40;max-width:calc(100% - 32px)}
.toast.show{opacity:1;transform:translate(-50%,0)}
@media (max-width:900px){.page-grid,.describe,.review{grid-template-columns:1fr}.side{position:static}.year-cols{grid-template-columns:1fr}}
@media (max-width:760px){.rv{grid-template-columns:1fr}.rv-thumb{max-height:160px}.rv-fields{grid-template-columns:1fr}}
@media (max-width:640px){.hero{aspect-ratio:auto;min-height:300px}.hero-in{padding:18px}.two{grid-template-columns:1fr}.search{width:100%}.filters{width:100%}.jsel{flex:1}.lrow-side .phase-wrap{display:none}.cards{grid-template-columns:1fr}.seg button{font-size:11.5px}}
@media (pointer:coarse){input,select,textarea,.search,.jsel{font-size:16px!important}}
@media (max-width:640px){.modal-scrim.confirming{padding:16px;align-items:center}.modal-scrim.confirming .modal.confirm{height:auto;border-radius:18px;border:1px solid var(--line-2)}.confirm-actions .btn{flex:1 1 100%}}
@media (max-width:640px){.modal-scrim{padding:0;align-items:stretch}.modal{width:100%;max-height:none;height:100%;border-radius:0;border:0;padding-top:env(safe-area-inset-top,0px)}.modal-body{padding-bottom:max(20px,env(safe-area-inset-bottom))}.modal-body{-webkit-overflow-scrolling:touch;overscroll-behavior:contain}.char-grid{grid-template-columns:repeat(auto-fill,minmax(104px,1fr))}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}.orb{animation:none}}
`;
