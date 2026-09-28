// The dashboard's HTML: one page, five areas (Overview, Cross Border, Health,
// System Health, Quick Links). The page fetches /data and draws everything in
// the browser; nothing here holds personal data.

import { LINKS, NOTION } from './config.js';

const STYLE = `
:root{color-scheme:light;--page:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--muted:#898781;--grid:#e1e0d9;--axis:#c3c2b7;--ring:rgba(11,11,11,.10);
--good:#0ca30c;--warn:#b77f00;--warnfill:#fab219;--crit:#d03b3b;--s1:#2a78d6;--s2:#eb6834;--wash-warn:#fdf5e1;--wash-crit:#fbeaea;--accent:#2a78d6}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){color-scheme:dark;--page:#0d0d0d;--surface:#1a1a19;--ink:#fff;--ink2:#c3c2b7;--muted:#898781;--grid:#2c2c2a;--axis:#383835;--ring:rgba(255,255,255,.10);--warn:#fab219;--s1:#3987e5;--s2:#d95926;--wash-warn:#2b2412;--wash-crit:#2d1717;--accent:#3987e5}}
:root[data-theme="dark"]{color-scheme:dark;--page:#0d0d0d;--surface:#1a1a19;--ink:#fff;--ink2:#c3c2b7;--muted:#898781;--grid:#2c2c2a;--axis:#383835;--ring:rgba(255,255,255,.10);--warn:#fab219;--s1:#3987e5;--s2:#d95926;--wash-warn:#2b2412;--wash-crit:#2d1717;--accent:#3987e5}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--page);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}
header{position:sticky;top:0;z-index:5;background:var(--page);border-bottom:1px solid var(--ring)}
.bar{max-width:1080px;margin:0 auto;padding:12px 16px 0;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.bar h1{font-size:16px;margin:0;font-weight:650;letter-spacing:-.01em}
.bar .meta{margin-left:auto;color:var(--muted);font-size:12px;display:flex;gap:10px;align-items:center}
.bar button{font:inherit;font-size:12px;color:var(--ink2);background:none;border:1px solid var(--ring);border-radius:6px;padding:3px 8px;cursor:pointer}
nav{max-width:1080px;margin:0 auto;padding:0 16px;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}
nav a{padding:10px 10px 9px;text-decoration:none;color:var(--ink2);font-size:14px;border-bottom:2px solid transparent;white-space:nowrap;display:flex;gap:6px;align-items:center}
nav a[aria-current="page"]{color:var(--ink);border-bottom-color:var(--ink);font-weight:600}
main{max-width:1080px;margin:0 auto;padding:18px 16px 48px}
section[hidden]{display:none}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600;margin:26px 0 10px}
h2:first-child{margin-top:4px}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.card{background:var(--surface);border:1px solid var(--ring);border-radius:10px;padding:14px 16px;min-width:0}
.card h3{margin:0 0 6px;font-size:13px;font-weight:600;color:var(--ink2)}
.big{font-size:26px;font-weight:650;letter-spacing:-.02em;line-height:1.15}
.sub{color:var(--ink2);font-size:13px}
.muted{color:var(--muted)}
.tag{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;border:1px solid var(--ring);white-space:nowrap}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex:none}
.ok .dot{background:var(--good)}.watch .dot{background:var(--warnfill)}.attention .dot{background:var(--crit)}.unknown .dot{background:var(--muted)}
.tag.watch{background:var(--wash-warn)}.tag.attention{background:var(--wash-crit)}
.area{display:flex;flex-direction:column;gap:8px;text-decoration:none}
.area .row{display:flex;justify-content:space-between;align-items:center;gap:8px}
.area.attention{border-color:color-mix(in srgb,var(--crit) 45%,transparent)}
.area.watch{border-color:color-mix(in srgb,var(--warnfill) 55%,transparent)}
.flags{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}
.flag{display:grid;grid-template-columns:auto 1fr auto;gap:4px 10px;align-items:start;background:var(--surface);border:1px solid var(--ring);border-left-width:3px;border-radius:8px;padding:10px 12px}
.flag.attention{border-left-color:var(--crit)}.flag.watch{border-left-color:var(--warnfill)}
.flag .t{font-weight:600}.flag .w{grid-column:2/4;color:var(--ink2);font-size:13px}
.flag .area-name{color:var(--muted);font-size:12px;white-space:nowrap}
.calm{color:var(--ink2);background:var(--surface);border:1px dashed var(--ring);border-radius:8px;padding:12px}
.summary{background:var(--surface);border:1px solid var(--ring);border-radius:10px;padding:14px 16px;font-size:15px}
.summary .by{color:var(--muted);font-size:12px;margin-top:6px}
.kv{display:grid;grid-template-columns:1fr auto;gap:6px 12px;font-size:14px}
.kv dt{color:var(--ink2)}.kv dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}
table{width:100%;border-collapse:collapse;font-size:13px}
th{color:var(--muted);font-weight:600;text-align:left;padding:6px 8px;border-bottom:1px solid var(--grid);white-space:nowrap}
td{padding:7px 8px;border-bottom:1px solid var(--grid);font-variant-numeric:tabular-nums;vertical-align:top}
td.num,th.num{text-align:right}
.scroll{overflow-x:auto}
.split{display:flex;height:8px;border-radius:4px;overflow:hidden;min-width:80px;gap:2px}
.split span{display:block;height:100%}
.legend{display:flex;gap:14px;font-size:12px;color:var(--ink2);margin:4px 0 8px}
.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
svg{display:block;width:100%;height:auto;overflow:visible}
svg text{fill:var(--muted);font-size:11px;font-family:inherit}
.proc{display:grid;grid-template-columns:auto 1fr auto;gap:2px 10px;padding:10px 0;border-bottom:1px solid var(--grid);align-items:start}
.proc:last-child{border-bottom:0}
.proc .n{font-weight:600}.proc .d{grid-column:2/4;color:var(--ink2);font-size:13px}
.proc .p{grid-column:2/4;font-size:13px}
.proc .when{color:var(--muted);font-size:12px;text-align:right;white-space:nowrap}
.links{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.links ul{list-style:none;margin:0;padding:0}
.links li a{display:block;padding:7px 0;text-decoration:none;border-bottom:1px solid var(--grid)}
.links li:last-child a{border-bottom:0}
.links li a:hover{color:var(--accent)}
.src{font-size:12px;color:var(--muted);text-decoration:none}.src:hover{color:var(--accent)}
.empty{color:var(--muted);font-size:13px}

.chart{width:100%;overflow:hidden}
#tip{position:fixed;pointer-events:none;background:var(--ink);color:var(--page);font-size:12px;padding:5px 8px;border-radius:6px;opacity:0;transition:opacity .08s;z-index:9;max-width:240px}
details summary{cursor:pointer;color:var(--ink2);font-size:13px}
.err{background:var(--wash-crit);border-radius:8px;padding:10px 12px;font-size:13px;margin-bottom:12px}
@media (max-width:560px){.big{font-size:22px}.bar .meta span{display:none}}
`;

const SCRIPT = `
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LABEL = { ok: 'Healthy', watch: 'Worth watching', attention: 'Needs attention', unknown: 'No data' };
const tag = l => '<span class="tag ' + l + '"><span class="dot"></span>' + LABEL[l] + '</span>';
const fmt = (n, d = 1) => n === null || n === undefined || Number.isNaN(n) ? '–' : Number(n).toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const ago = iso => { if (!iso) return 'never'; const m = (Date.now() - Date.parse(iso)) / 60000; if (m < 2) return 'just now'; if (m < 90) return Math.round(m) + ' min ago'; const h = m / 60; if (h < 36) return Math.round(h) + ' h ago'; return Math.round(h / 24) + ' days ago'; };
const day = s => s ? new Date(s.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '–';
const LOC = { '🇧🇪 Beerse': 'Belgium (Beerse)', '🇧🇪 Ghent': 'Belgium (Ghent)', '🇳🇱 Home': 'Netherlands (home)', '✈️ Travel': 'Travel', '🏖️ Holiday': 'Holiday', '🎉 Public holiday': 'Public holiday' };
const NOTION = ${JSON.stringify(NOTION)};

// ---- charts (single series, thin marks, hover tooltips) ----
function lineChart(points, { ref = null, refLabel = '', unit = '', height = 150, pad = 0.5 } = {}, W = 600) {
  if (points.length < 2) return '<p class="empty">Not enough data for a trend yet.</p>';
  const H = height, L = 34, R = 8, T = 10, B = 22;
  const ys = points.map(p => p.y).concat(ref === null ? [] : [ref]);
  let lo = Math.min(...ys), hi = Math.max(...ys); if (hi - lo < pad * 2) { lo -= pad; hi += pad; }
  const x = i => L + (i * (W - L - R)) / (points.length - 1);
  const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [lo, (lo + hi) / 2, hi];
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img">';
  const dec = hi - lo > 5 ? 0 : 1;
  for (const t of ticks) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="var(--grid)" stroke-width="1"/><text x="' + (L - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + fmt(t, dec) + '</text>';
  if (ref !== null) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(ref) + '" y2="' + y(ref) + '" stroke="var(--ink2)" stroke-width="1.5" stroke-dasharray="4 4"/><text x="' + (W - R) + '" y="' + (y(ref) - 5) + '" text-anchor="end">' + esc(refLabel) + '</text>';
  s += '<polyline fill="none" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="' + points.map((p, i) => x(i) + ',' + y(p.y)).join(' ') + '"/>';
  const last = points[points.length - 1];
  s += '<circle cx="' + x(points.length - 1) + '" cy="' + y(last.y) + '" r="4" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/>';
  s += '<text x="' + L + '" y="' + (H - 4) + '">' + esc(points[0].label) + '</text><text x="' + (W - R) + '" y="' + (H - 4) + '" text-anchor="end">' + esc(last.label) + '</text>';
  const step = (W - L - R) / (points.length - 1);
  points.forEach((p, i) => { s += '<rect x="' + (x(i) - step / 2) + '" y="0" width="' + step + '" height="' + H + '" fill="transparent" data-tip="' + esc(p.label + ': ' + fmt(p.y) + unit) + '"/>'; });
  return s + '</svg>';
}
function barChart(bars, { target = null, targetLabel = '', unit = '', height = 150 } = {}, W = 600) {
  const H = height, L = 34, R = 8, T = 10, B = 22;
  const hi = Math.max(1, ...bars.map(b => b.y), target || 0) * 1.1;
  const slot = (W - L - R) / bars.length, bw = Math.max(4, slot - 6);
  const y = v => T + (1 - v / hi) * (H - T - B);
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img">';
  for (const t of [0, hi / 2]) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="var(--grid)"/><text x="' + (L - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + fmt(t, 0) + '</text>';
  bars.forEach((b, i) => {
    const x = L + i * slot + (slot - bw) / 2, top = y(b.y), h = Math.max(0, y(0) - top);
    s += h > 0 ? '<path d="M' + x + ',' + y(0) + 'V' + (top + Math.min(4, h)) + 'q0,-4 4,-4h' + (bw - 8) + 'q4,0 4,4V' + y(0) + 'Z" fill="var(--s1)"/>' : '';
    s += '<rect x="' + (L + i * slot) + '" y="0" width="' + slot + '" height="' + H + '" fill="transparent" data-tip="' + esc(b.label + ': ' + fmt(b.y) + unit + (b.note ? ' · ' + b.note : '')) + '"/>';
  });
  if (target !== null) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(target) + '" y2="' + y(target) + '" stroke="var(--ink2)" stroke-width="1.5" stroke-dasharray="4 4"/><text x="' + (W - R) + '" y="' + (y(target) - 5) + '" text-anchor="end">' + esc(targetLabel) + '</text>';
  s += '<text x="' + L + '" y="' + (H - 4) + '">' + esc(bars[0].label) + '</text><text x="' + (W - R) + '" y="' + (H - 4) + '" text-anchor="end">' + esc(bars[bars.length - 1].label) + '</text>';
  return s + '</svg>';
}
// Charts are drawn at their container's real width, so text stays 11px.
let charts = [];
const chart = (kind, a, b) => '<div class="chart" data-i="' + (charts.push([kind, a, b]) - 1) + '"></div>';
function drawCharts() {
  for (const el of document.querySelectorAll('.chart')) {
    const [kind, a, b] = charts[el.dataset.i], w = Math.max(240, el.clientWidth);
    if (!el.offsetParent) continue;
    el.innerHTML = kind === 'line' ? lineChart(a, b, w) : barChart(a, b, w);
  }
}
let resizeTimer; addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawCharts, 150); });
const tip = $('#tip');
document.addEventListener('pointermove', e => {
  const t = e.target.closest && e.target.closest('[data-tip]');
  if (!t) { tip.style.opacity = 0; return; }
  tip.textContent = t.dataset.tip; tip.style.opacity = 1;
  const x = Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8);
  tip.style.left = x + 'px'; tip.style.top = (e.clientY - 34) + 'px';
});

const flagList = (flags, withArea) => flags.length
  ? '<ul class="flags">' + flags.map(f => '<li class="flag ' + f.level + '"><span class="dot" style="margin-top:7px;background:var(--' + (f.level === 'attention' ? 'crit' : 'warnfill') + ')"></span><span class="t">' + esc(f.title) + '</span>' + (withArea ? '<a class="area-name" href="#' + f.area + '">' + esc(f.area_name) + ' →</a>' : f.link ? '<a class="src" href="' + esc(f.link) + '" target="_blank" rel="noopener">Open ↗</a>' : '<span></span>') + '<span class="w">' + esc(f.why) + '</span></li>').join('') + '</ul>'
  : '<p class="calm">Nothing drifting here.</p>';

// ---- Overview ----
function renderOverview(d) {
  const o = d.overview, c = d.cross, h = d.health, s = d.system;
  const n = o.drifting.length;
  let html = '<h2>Areas</h2><div class="grid">' + o.areas.map(a => '<a class="card area ' + a.status + '" href="#' + a.key + '"><div class="row"><h3 style="margin:0">' + esc(a.name) + '</h3>' + tag(a.status) + '</div><div class="sub">' + (a.flags.length ? esc(a.flags.map(f => f.title).join(' · ')) : areaLine(a.key, d)) + '</div></a>').join('') + '</div>';
  html += '<h2>Summary</h2>' + summaryBlock(d) + '<h2>What deserves attention</h2>';
  html += n ? '<p class="sub" style="margin:0 0 10px">Drift detected: ' + n + ' item' + (n === 1 ? '' : 's') + ' across ' + o.areas.filter(a => a.flags.length).length + ' area' + (o.areas.filter(a => a.flags.length).length === 1 ? '' : 's') + '.</p>' + flagList(o.drifting, true) : '<p class="calm">Nothing needs you right now. All three areas are healthy.</p>';
  html += '<h2>Today</h2><div class="grid">';
  const t = c && c.today;
  html += '<div class="card"><h3>Work location</h3><div class="big" style="font-size:18px">' + (t ? (t.weekend && !t.am ? 'Weekend' : t.am || t.pm ? esc(LOC[t.am] || t.am || '–') + (t.pm && t.pm !== t.am ? ' / ' + esc(LOC[t.pm] || t.pm) : '') : 'Not set') : 'No row for today') + '</div><div class="sub">' + (t && t.commute ? esc(t.commute) : '') + '</div>' + (t && t.url ? '<a class="src" href="' + esc(t.url) + '" target="_blank" rel="noopener">Open day ↗</a>' : '') + '</div>';
  if (h) html += '<div class="card"><h3>Training this week</h3><div class="big">' + fmt(h.this_week.hours) + ' <span class="sub">of ' + h.targets.weekly_hours + ' h</span></div><div class="sub">' + h.this_week.sessions + ' session' + (h.this_week.sessions === 1 ? '' : 's') + ', ' + h.this_week.runs + ' run' + (h.this_week.runs === 1 ? '' : 's') + ' · ' + h.this_week.days_left + ' day' + (h.this_week.days_left === 1 ? '' : 's') + ' left</div></div>';
  if (s) { const bad = s.processes.filter(p => p.level !== 'ok'); html += '<div class="card"><h3>Systems</h3><div class="big" style="font-size:18px">' + (bad.length ? bad.length + ' issue' + (bad.length === 1 ? '' : 's') : 'All running') + '</div><div class="sub">' + (bad.length ? esc(bad.map(p => p.name).join(', ')) : s.processes.length + ' processes checked') + '</div></div>'; }
  return html + '</div>';
}
function areaLine(key, d) {
  if (key === 'cross' && d.cross) return 'Belgium ' + fmt(d.cross.ytd.be_share) + '% year to date · ' + fmt(d.cross.buffer_days) + ' NL days of buffer';
  if (key === 'health' && d.health) return fmt(d.health.recent.hours) + ' h a week over 4 weeks · target ' + d.health.targets.weekly_hours + ' h';
  if (key === 'system' && d.system) return d.system.processes.length + ' processes running · ' + d.system.failures.last_24h + ' failure' + (d.system.failures.last_24h === 1 ? '' : 's') + ' in 24 h';
  return 'No data';
}
function summaryBlock(d) {
  if (d.summary && d.summary.text) return '<div class="summary">' + esc(d.summary.text) + '<div class="by">AI summary · ' + (d.summary.stale ? 'from ' + day(d.summary.day) : 'written ' + ago(d.summary.at)) + '</div></div>';
  if (!d.ai_enabled) return '<p class="calm">The AI summary is switched off (ADMIN_AI). The flags above are computed without it.</p>';
  return '<p class="calm">Today\\'s summary is written the first time the dashboard opens after 07:30.</p>';
}

// ---- Cross border ----
function renderCross(c) {
  if (!c) return '<p class="calm">The Work Location Log could not be read.</p>';
  const Y = c.ytd, M = c.month, p = c.projection;
  let html = '<h2 style="display:flex;justify-content:space-between;align-items:center">Position ' + tag(c.status) + '</h2>';
  html += '<div class="grid">';
  html += '<div class="card"><h3>Belgium share, since ' + day(c.start) + '</h3><div class="big">' + fmt(Y.be_share) + '%</div><div class="sub">Must stay above ' + c.minimum + '%. ' + fmt(Y.be) + ' BE vs ' + fmt(Y.nl) + ' NL days.</div></div>';
  html += '<div class="card"><h3>Buffer</h3><div class="big">' + (c.buffer_days >= 0 ? fmt(c.buffer_days) + ' <span class="sub">NL days</span>' : fmt(c.be_days_needed) + ' <span class="sub">BE days short</span>') + '</div><div class="sub">' + (c.buffer_days >= 0 ? 'NL days you can still add before Belgium drops to ' + c.minimum + '%.' : 'Belgium days needed to get back above ' + c.minimum + '%.') + ' Each extra NL day moves the share by ' + fmt(c.share_per_nl_day, 2) + ' pts.</div></div>';
  html += '<div class="card"><h3>This month (' + esc(c.month_key) + ')</h3><div class="big">' + fmt(M.be_share) + '% <span class="sub">BE</span></div><div class="sub">' + fmt(M.be) + ' BE · ' + fmt(M.nl) + ' NL · ' + fmt(M.travel) + ' travel · ' + fmt(M.holiday) + ' holiday</div></div>';
  if (p) html += '<div class="card"><h3>Where you are heading</h3><div class="big">' + fmt(p.year_end_be_share) + '% <span class="sub">by 31 Dec</span></div><div class="sub">If the last weeks\\' ' + fmt(p.recent_be_share) + '% BE pattern continues on the ' + fmt(p.open_days) + ' unplanned days' + (p.planned_be + p.planned_nl ? ', plus ' + fmt(p.planned_be) + ' BE / ' + fmt(p.planned_nl) + ' NL days already planned' : '') + '.</div></div>';
  html += '</div>';
  html += '<h2>Flags</h2>' + flagList(c.flags);
  html += '<h2>Belgium share over time</h2><div class="card">' + chart('line', c.trend.map(t => ({ label: 'Week of ' + day(t.week), y: t.be_share })), { ref: c.minimum, refLabel: c.minimum + '% line', unit: '%' }) + '</div>';
  html += '<h2>Totals</h2><div class="grid"><div class="card"><h3>Since ' + day(c.start) + '</h3><dl class="kv">' +
    [['Belgium work days', Y.be], ['Netherlands work days', Y.nl], ['Travel days', Y.travel], ['Holiday days', Y.holiday], ['Unclassified days', Y.unclassified], ['Accountable days', Y.accountable]].map(([k, v]) => '<dt>' + k + '</dt><dd>' + fmt(v) + '</dd>').join('') + '</dl></div>' +
    '<div class="card"><h3>Commute</h3><dl class="kv"><dt>E-bike compensation, this month</dt><dd>€ ' + fmt(M.ebike, 2) + '</dd><dt>E-bike compensation, since ' + day(c.start) + '</dt><dd>€ ' + fmt(Y.ebike, 2) + '</dd></dl></div></div>';
  html += '<h2>By month</h2><div class="card scroll"><div class="legend"><span><i style="background:var(--s1)"></i>Belgium</span><span><i style="background:var(--s2)"></i>Netherlands</span></div><table><thead><tr><th>Month</th><th>Split</th><th class="num">BE</th><th class="num">NL</th><th class="num">Travel</th><th class="num">Holiday</th><th class="num">Unclassified</th><th class="num">BE %</th><th class="num">E-bike €</th></tr></thead><tbody>' +
    c.months.map(m => '<tr><td>' + esc(m.month) + '</td><td>' + (m.be + m.nl ? '<div class="split" data-tip="' + fmt(m.be_share) + '% Belgium"><span style="width:' + m.be_share + '%;background:var(--s1)"></span><span style="flex:1;background:var(--s2)"></span></div>' : '') + '</td><td class="num">' + fmt(m.be) + '</td><td class="num">' + fmt(m.nl) + '</td><td class="num">' + fmt(m.travel) + '</td><td class="num">' + fmt(m.holiday) + '</td><td class="num">' + fmt(m.unclassified) + '</td><td class="num">' + fmt(m.be_share) + '</td><td class="num">' + fmt(m.ebike, 2) + '</td></tr>').join('') + '</tbody></table></div>';
  html += '<h2>Missing or unclassified days</h2>' + (c.missing.length ? '<div class="card scroll"><table><thead><tr><th>Date</th><th>AM</th><th>PM</th><th></th></tr></thead><tbody>' + c.missing.map(m => '<tr><td>' + day(m.date) + '</td><td>' + esc(m.am || '—') + '</td><td>' + esc(m.pm || '—') + '</td><td class="num">' + (m.url ? '<a class="src" href="' + esc(m.url) + '" target="_blank" rel="noopener">Fix ↗</a>' : '<span class="muted">no row</span>') + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="calm">Every past work day is classified.</p>');
  return html + '<p><a class="src" href="' + NOTION.workLocation + '" target="_blank" rel="noopener">Work Location Log ↗</a> · <a class="src" href="' + NOTION.borderDashboard + '" target="_blank" rel="noopener">Border Worker Dashboard ↗</a></p>';
}

// ---- Health ----
function renderHealth(h) {
  if (!h) return '<p class="calm">Workouts or Body Metrics could not be read.</p>';
  const S = h.sports;
  let html = '<h2 style="display:flex;justify-content:space-between;align-items:center">Against your routine ' + tag(h.status) + '</h2>' + flagList(h.flags);
  html += '<h2>Training</h2><div class="grid">';
  html += '<div class="card"><h3>Hours a week, last 4 weeks</h3><div class="big">' + fmt(h.recent.hours) + ' <span class="sub">h · target ' + h.targets.weekly_hours + '</span></div><div class="sub">Before that: ' + fmt(h.baseline.hours) + ' h a week</div></div>';
  html += '<div class="card"><h3>Sessions a week</h3><div class="big">' + fmt(h.recent.sessions) + '</div><div class="sub">Before that: ' + fmt(h.baseline.sessions) + ' a week</div></div>';
  html += '<div class="card"><h3>Streaks (full weeks)</h3><dl class="kv"><dt>' + h.targets.weekly_hours + ' h or more</dt><dd>' + h.streaks.hours + '</dd><dt>' + h.targets.runs_per_week + '+ runs</dt><dd>' + h.streaks.runs + '</dd><dt>Any training</dt><dd>' + h.streaks.active + '</dd></dl></div>';
  html += '</div>';
  html += '<div class="card" style="margin-top:12px"><h3>Training hours per week</h3>' + chart('bar', h.weeks.map(w => ({ label: 'Week of ' + day(w.week), y: w.hours, note: w.sessions + ' sessions' })), { target: h.targets.weekly_hours, targetLabel: h.targets.weekly_hours + ' h target', unit: ' h' }) + '</div>';
  const L = h.load;
  if (L) {
    html += '<h2>Battle form</h2><div class="grid">';
    html += '<div class="card"><h3>Form today</h3><div class="big">' + esc(L.state) + ' <span class="sub">' + fmt(L.ratio, 2) + '</span></div><div class="sub">' + (L.bonus > 1 ? 'Workout attacks get ×' + fmt(L.bonus, 2) + ' damage' : 'No form bonus on attacks') + '</div><dl class="kv"><dt>Fitness (44-day average)</dt><dd>' + fmt(L.fitness) + '</dd><dt>Fatigue (7-day average)</dt><dd>' + fmt(L.fatigue) + '</dd><dt>Last workout</dt><dd>' + day(L.last_workout) + '</dd></dl></div>';
    html += '<div class="card"><h3>Form at each workout, last 13 weeks</h3>' + chart('line', L.series.map(p => ({ label: day(p.date) + (p.state ? ' · ' + p.state : ''), y: p.ratio })), { ref: 0.8, refLabel: 'Rusty below 0.8', height: 110, pad: 0.1 }) + '<div class="sub">Form = fatigue ÷ fitness. Steady 0.8–1.5 (×1.10), Building 1.5–2 (×1.15).</div></div>';
    html += '</div><div class="card scroll" style="margin-top:12px"><table><thead><tr><th>Workout</th><th class="num">Effort score</th><th>Level</th><th class="num">Multiplier</th></tr></thead><tbody>' +
      L.recent.map(r => '<tr><td>' + day(r.date) + ' · ' + esc(r.name || r.type) + (r.special ? ' <span class="sub">' + esc(r.special) + '</span>' : '') + '</td><td class="num">' + fmt(r.effort, 0) + '</td><td>' + esc(r.level || '–') + '</td><td class="num">' + (r.mult ? '×' + fmt(r.mult, 2) : '–') + '</td></tr>').join('') + '</tbody></table></div>';
  }
  html += '<h2>Consistency by sport</h2><div class="card scroll"><table><thead><tr><th>Sport</th><th class="num">Last session</th><th class="num">Days since</th><th class="num">Per week, last 4 wk</th><th class="num">Per week, 8 wk before</th></tr></thead><tbody>' +
    [['Run', 'run'], ['Bike', 'bike'], ['Strength', 'strength'], ['Swim', 'swim']].map(([n, k]) => '<tr><td>' + n + '</td><td class="num">' + (S[k].last ? day(S[k].last.date) : '–') + '</td><td class="num">' + (S[k].last ? S[k].last.days_ago : '–') + '</td><td class="num">' + fmt(S[k].recent_per_week) + '</td><td class="num">' + fmt(S[k].baseline_per_week) + '</td></tr>').join('') + '</tbody></table></div>';
  html += '<h2>Body</h2><div class="grid">';
  const w = h.weight, f = h.body_fat;
  html += '<div class="card"><h3>Weight</h3><div class="big">' + (w.latest ? fmt(w.latest.value) + ' <span class="sub">kg</span>' : '–') + '</div><div class="sub">' + (w.change_30d ? (w.change_30d.delta > 0 ? '+' : '') + fmt(w.change_30d.delta) + ' kg since ' + day(w.change_30d.from) : 'No 30-day comparison yet') + (w.latest ? ' · measured ' + day(w.latest.date) : '') + '</div>' + chart('line', w.series.map(p => ({ label: day(p.date), y: p.value })), { unit: ' kg', height: 110 }) + '</div>';
  html += '<div class="card"><h3>Body fat</h3><div class="big">' + (f.latest ? fmt(f.latest.value) + '%' : '–') + ' <span class="sub">target ~' + f.target + '%</span></div><div class="sub">' + (f.change_30d ? (f.change_30d.delta > 0 ? '+' : '') + fmt(f.change_30d.delta) + ' pts since ' + day(f.change_30d.from) : 'No 30-day comparison yet') + '</div>' + chart('line', f.series.map(p => ({ label: day(p.date), y: p.value })), { ref: f.target, refLabel: f.target + '% target', unit: '%', height: 110 }) + '</div>';
  html += '</div>';
  html += '<h2>Sleep and recovery</h2><div class="grid">' + [['sleep', 'Sleep trend'], ['recovery', 'Recovery / readiness'], ['resting_hr', 'Resting heart rate']].map(([k, n]) => '<div class="card"><h3>' + n + '</h3>' + (h.missing_sources.includes(k) ? '<div class="empty">No source connected yet. None of the synced databases holds this.</div>' : '<div class="big">' + fmt(h.resting_hr && h.resting_hr.value, 0) + ' <span class="sub">bpm at weigh-in</span></div>') + '</div>').join('') + '</div>';
  return html + '<p><a class="src" href="' + NOTION.workouts + '" target="_blank" rel="noopener">Workouts ↗</a> · <a class="src" href="' + NOTION.bodyMetrics + '" target="_blank" rel="noopener">Body Metrics ↗</a></p>';
}

// ---- System health ----
function renderSystem(s) {
  const u = s.usage;
  let html = '<h2 style="display:flex;justify-content:space-between;align-items:center">Is the system healthy? ' + tag(s.status) + '</h2>' + flagList(s.flags);
  html += '<h2>At a glance</h2><div class="grid">';
  html += '<div class="card"><h3>Failures</h3><div class="big">' + s.failures.last_24h + ' <span class="sub">in 24 h</span></div><div class="sub">' + s.failures.last_7d + ' in 7 days' + (s.failures.since ? ' · counted since ' + day(s.failures.since) : '') + '</div></div>';
  html += '<div class="card"><h3>Stale integrations</h3><div class="big">' + s.processes.filter(p => (p.key === 'strava' || p.key === 'withings') && p.level !== 'ok').length + '</div><div class="sub">Make syncs: Strava ' + s.make_in_use[0] + ', Withings ' + s.make_in_use[1] + '</div></div>';
  html += '<div class="card"><h3>API / AI cost, ' + esc(u.month) + '</h3><div class="big">$' + fmt(u.cost, 2) + '</div><div class="sub">Estimate · ' + u.chat_calls + ' chat calls, ' + u.images + ' images, ' + u.videos + ' clips' + (u.previous_cost !== null ? ' · last month $' + fmt(u.previous_cost, 2) : '') + (u.since ? ' · counted since ' + day(u.since) : ' · counting starts with the next paid call') + '</div></div>';
  html += '</div>';
  html += '<h2>Processes</h2><div class="card">' + s.processes.map(p => '<div class="proc"><span class="dot" style="margin-top:7px;background:var(--' + (p.level === 'attention' ? 'crit' : p.level === 'watch' ? 'warnfill' : 'good') + ')" data-tip="' + LABEL[p.level] + '"></span><span class="n">' + esc(p.name) + (p.enabled === false ? ' <span class="muted" style="font-weight:400">(switched off)</span>' : '') + '</span><span class="when" data-tip="' + esc(p.last_ok || '') + '">' + (p.last_ok ? ago(p.last_ok) : '–') + '</span><span class="d">' + esc(p.detail) + (p.note ? ' · ' + esc(p.note) : '') + '</span>' + (p.problem ? '<span class="p">' + esc(p.problem) + '</span>' : '') + '</div>').join('') + '</div>';
  if (s.checks.length) html += '<h2>healthchecks.io</h2><div class="card scroll"><table><thead><tr><th>Check</th><th>State</th><th class="num">Last ping</th></tr></thead><tbody>' + s.checks.map(c => '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.status) + '</td><td class="num">' + ago(c.last_ping) + '</td></tr>').join('') + '</tbody></table></div>';
  if (s.failures.recent.length) html += '<h2>Recent failures</h2><div class="card scroll"><table><tbody>' + s.failures.recent.map(f => '<tr><td>' + ago(f.at) + '</td><td>' + esc(f.slug) + '</td><td>' + esc(f.message) + '</td></tr>').join('') + '</tbody></table></div>';
  return html + '<p><a class="src" href="https://dash.cloudflare.com/" target="_blank" rel="noopener">Cloudflare ↗</a> · <a class="src" href="https://eu2.make.com/" target="_blank" rel="noopener">Make ↗</a> · <a class="src" href="' + NOTION.questEngine + '" target="_blank" rel="noopener">Quest Engine doc ↗</a></p>';
}

// ---- shell ----
const TABS = ['overview', 'cross', 'health', 'system', 'links'];
let data = null;
function show() {
  const tab = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
  for (const t of TABS) {
    $('#' + t).hidden = t !== tab;
    const a = $('nav a[href="#' + t + '"]');
    if (t === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  scrollTo(0, 0);
  drawCharts();
}
function render() {
  const d = data;
  charts = [];
  $('#overview').innerHTML = (d.errors.length ? '<div class="err">Some sources could not be read: ' + esc(d.errors.join('; ')) + '</div>' : '') + renderOverview(d);
  $('#cross').innerHTML = renderCross(d.cross);
  $('#health').innerHTML = renderHealth(d.health);
  $('#system').innerHTML = renderSystem(d.system);
  for (const [k, a] of [['cross', d.cross], ['health', d.health], ['system', d.system]]) $('nav a[href="#' + k + '"] .dot').parentElement.className = (a ? a.status : 'unknown');
  drawCharts();
  $('#stamp').textContent = 'Updated ' + ago(d.built_at);
  $('#stamp').dataset.tip = d.built_at;
}
async function load(fresh) {
  $('#reload').disabled = true;
  try {
    const r = await fetch('/data' + (fresh ? '?fresh=1' : ''), { credentials: 'same-origin' });
    if (r.status === 401) { location.href = '/login'; return; }
    data = await r.json();
    render();
  } catch (e) {
    $('#overview').innerHTML = '<div class="err">Could not load the dashboard: ' + esc(e.message) + '</div>';
  } finally { $('#reload').disabled = false; }
}
addEventListener('hashchange', show);
$('#reload').addEventListener('click', () => load(true));
show(); load(true);
`;

const linkCards = LINKS.map(g => `<div class="card"><h3>${g.group}</h3><ul>${g.items.map(i => `<li><a href="${i.url}" target="_blank" rel="noopener">${i.name} ↗</a></li>`).join('')}</ul></div>`).join('');

export const dashboardHtml = () => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Admin cockpit</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='6' fill='%232a78d6'/%3E%3C/svg%3E">
<style>${STYLE}</style></head><body>
<header><div class="bar"><h1>Admin cockpit</h1><div class="meta"><span id="stamp">Loading…</span><button id="reload" type="button">Refresh</button><form method="post" action="/logout" style="margin:0"><button type="submit">Sign out</button></form></div></div>
<nav><a href="#overview">Overview</a><a href="#cross"><span class="unknown"><span class="dot"></span></span>Cross Border</a><a href="#health"><span class="unknown"><span class="dot"></span></span>Health</a><a href="#system"><span class="unknown"><span class="dot"></span></span>System Health</a><a href="#links">Quick Links</a></nav></header>
<main><section id="overview"><p class="empty">Loading…</p></section><section id="cross" hidden></section><section id="health" hidden></section><section id="system" hidden></section>
<section id="links" hidden><h2>Quick links</h2><div class="links">${linkCards}</div></section></main>
<div id="tip" role="tooltip"></div>
<script>${SCRIPT}</script></body></html>`;

export const loginHtml = (error = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Admin cockpit</title>
<style>${STYLE}
form{max-width:340px;margin:18vh auto 0;padding:0 16px;display:flex;flex-direction:column;gap:10px}
input{font:inherit;padding:10px 12px;border-radius:8px;border:1px solid var(--axis);background:var(--surface);color:var(--ink)}
button{font:inherit;padding:10px 12px;border-radius:8px;border:0;background:var(--ink);color:var(--page);font-weight:600;cursor:pointer}</style></head>
<body><form method="post" action="/login"><h1 style="font-size:18px;margin:0 0 4px">Admin cockpit</h1>
<label class="sub" for="t">Password</label><input id="t" name="password" type="password" autocomplete="current-password" required autofocus>
${error ? `<p class="sub" style="color:var(--crit);margin:0">${error}</p>` : ''}<button type="submit">Sign in</button></form></body></html>`;
