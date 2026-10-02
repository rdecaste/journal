// The dashboard's HTML (/admin): four areas (Cross Border, Health, System
// Health, Quick Links); the daily overview lives on the Quest log page (/).
// The page fetches /data and draws everything in the browser; nothing here
// holds personal data.

import { LINKS, D1_CONSOLE, QUEST_ENGINE_DOC } from './config.js';

const STYLE = `
:root{color-scheme:light;--page:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--muted:#898781;--grid:#e1e0d9;--axis:#c3c2b7;--ring:rgba(11,11,11,.10);
--good:#0ca30c;--warn:#b77f00;--warnfill:#fab219;--crit:#d03b3b;--s1:#2a78d6;--s2:#eb6834;--wash-warn:#fdf5e1;--wash-crit:#fbeaea;--accent:#2a78d6}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){color-scheme:dark;--page:#0d0d0d;--surface:#1a1a19;--ink:#fff;--ink2:#c3c2b7;--muted:#898781;--grid:#2c2c2a;--axis:#383835;--ring:rgba(255,255,255,.10);--warn:#fab219;--s1:#3987e5;--s2:#d95926;--wash-warn:#2b2412;--wash-crit:#2d1717;--accent:#3987e5}}
:root[data-theme="dark"]{color-scheme:dark;--page:#0d0d0d;--surface:#1a1a19;--ink:#fff;--ink2:#c3c2b7;--muted:#898781;--grid:#2c2c2a;--axis:#383835;--ring:rgba(255,255,255,.10);--warn:#fab219;--s1:#3987e5;--s2:#d95926;--wash-warn:#2b2412;--wash-crit:#2d1717;--accent:#3987e5}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--page);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}
header{position:sticky;top:0;z-index:5;background:var(--page);border-bottom:1px solid var(--ring);padding-top:env(safe-area-inset-top,0px)}
.bar{max-width:1080px;margin:0 auto;padding:10px max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px));display:flex;align-items:center;gap:10px}
.bar h1{font-size:16px;margin:0;font-weight:650;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.bar .home{font-size:13px;color:var(--ink2);text-decoration:none;border:1px solid var(--ring);border-radius:8px;padding:6px 10px;white-space:nowrap;flex:none}
.bar .meta{margin-left:auto;color:var(--muted);font-size:12px;display:flex;gap:8px;align-items:center;flex:none}
.bar button{font:inherit;font-size:13px;color:var(--ink2);background:none;border:1px solid var(--ring);border-radius:8px;padding:6px 10px;cursor:pointer;white-space:nowrap}
nav{max-width:1080px;margin:0 auto;padding:0 max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px));display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
nav::-webkit-scrollbar{display:none}
nav a{padding:12px 10px 11px;-webkit-tap-highlight-color:transparent;text-decoration:none;color:var(--ink2);font-size:14px;border-bottom:2px solid transparent;white-space:nowrap;display:flex;gap:6px;align-items:center}
nav a[aria-current="page"]{color:var(--ink);border-bottom-color:var(--ink);font-weight:600}
main{max-width:1080px;margin:0 auto;padding:18px max(16px,env(safe-area-inset-right,0px)) calc(48px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}
nav .short{display:none}
section[hidden]{display:none}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600;margin:26px 0 10px}
h2:first-child{margin-top:4px}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))}
@media (min-width:600px) and (max-width:900px){.grid:has(> :nth-child(4):last-child){grid-template-columns:repeat(2,minmax(0,1fr))}}
.card{background:var(--surface);border:1px solid var(--ring);border-radius:10px;padding:14px 16px;min-width:0}
.card h3{margin:0 0 6px;font-size:13px;font-weight:600;color:var(--ink2)}
.big{font-size:26px;font-weight:650;letter-spacing:-.02em;line-height:1.15}
.sub{color:var(--ink2);font-size:13px}
.muted{color:var(--muted)}
.tag{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;border:1px solid var(--ring);white-space:nowrap}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex:none}
.ok .dot{background:var(--good)}.watch .dot{background:var(--warnfill)}.attention .dot{background:var(--crit)}.unknown .dot{background:var(--muted)}
.tag.watch{background:var(--wash-warn)}.tag.attention{background:var(--wash-crit)}
.flags{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}
.flag{display:grid;grid-template-columns:auto 1fr auto;gap:4px 10px;align-items:start;background:var(--surface);border:1px solid var(--ring);border-left-width:3px;border-radius:8px;padding:10px 12px}
.flag.attention{border-left-color:var(--crit)}.flag.watch{border-left-color:var(--warnfill)}
.flag .t{font-weight:600}.flag .w{grid-column:2/4;color:var(--ink2);font-size:13px}
.calm{color:var(--ink2);background:var(--surface);border:1px dashed var(--ring);border-radius:8px;padding:12px}
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
.proc .open{all:unset;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px}.proc .open:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
.proc .chev{color:var(--muted);font-size:11px;transition:transform .15s}.proc.opened .chev{transform:rotate(90deg)}
.jobs{grid-column:2/4;margin-top:8px;border-top:1px dashed var(--grid)}
.job{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;padding:9px 0;border-bottom:1px solid var(--grid);align-items:center}.job:last-child{border-bottom:0}
.job .jn{font-size:14px;font-weight:500}.job .jm{font-size:12px;color:var(--muted)}
.job .paid{font-size:11px;color:var(--warn);background:var(--wash-warn);border-radius:999px;padding:1px 7px;margin-left:6px;font-weight:500;white-space:nowrap}
.jbtn{font:inherit;font-size:13px;padding:6px 12px;border-radius:8px;border:1px solid var(--grid);background:var(--surface);color:var(--accent);cursor:pointer;white-space:nowrap}
.jbtn.go{background:var(--accent);color:#fff;border-color:var(--accent)}.jbtn:disabled{opacity:.5;cursor:default}
.job .ask,.job .res{grid-column:1/3;border-radius:8px;padding:9px 12px;font-size:13px}
.job .ask{background:var(--grid);display:flex;flex-direction:column;gap:8px}.job .ask .row{display:flex;gap:8px;flex-wrap:wrap}
.job .res.ok{background:var(--wash-good, var(--grid))}.job .res.bad{background:var(--wash-crit)}
.links{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.links ul{list-style:none;margin:0;padding:0}
.links li a{display:block;padding:11px 0;text-decoration:none;border-bottom:1px solid var(--grid)}
.links li:last-child a{border-bottom:0}
.links li a:hover{color:var(--accent)}
.src{font-size:12px;color:var(--muted);text-decoration:none}.src:hover{color:var(--accent)}
.empty{color:var(--muted);font-size:13px}

.chart{width:100%;overflow:hidden}
#tip{position:fixed;pointer-events:none;background:var(--ink);color:var(--page);font-size:12px;padding:5px 8px;border-radius:6px;opacity:0;transition:opacity .08s;z-index:9;max-width:min(260px,calc(100vw - 16px))}
details summary{cursor:pointer;color:var(--ink2);font-size:13px}
.err{background:var(--wash-crit);border-radius:8px;padding:10px 12px;font-size:13px;margin-bottom:12px}
@media (max-width:560px){.big{font-size:22px}.bar .meta span{display:none}.bar h1{font-size:15px}nav .long{display:none}nav .short{display:inline}nav a{padding:12px 8px 11px}}
@media (max-width:430px){.bar h1{display:none}}
`;

const HEALTH_STYLE = `
/* ---- Health tab: dark Recovery today card, quest cards, form, training, body ---- */
:root{--hero:#161615;--hero2:#232321;--hero-ink:#f6f5f0;--hero-muted:#a3a29b;--amber:#f0a818;--wash-good:#e6f4ea;--wash-blue:#e8effb;
--fit:#2f6fd6;--fat:#e8663a;--run:#e8663a;--bike:#2f6fd6;--str:#189a74;--swim:#e0a000;--commute:#c9c8bf;
--display:"Barlow Condensed","Arial Narrow",system-ui,sans-serif;--body:"Barlow",system-ui,-apple-system,"Segoe UI",sans-serif;--shadow:0 1px 2px rgba(20,20,19,.04),0 4px 14px rgba(20,20,19,.05)}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){--hero:#1e1e1c;--hero2:#2a2a27;--amber:#f5b52e;--wash-good:#15261b;--wash-blue:#15202f;--fit:#4f8ae8;--fat:#f07a4f;--run:#f07a4f;--bike:#4f8ae8;--str:#2bb58c;--swim:#e8ad1c;--commute:#4a4a46;--shadow:none}}
:root[data-theme="dark"]{--hero:#1e1e1c;--hero2:#2a2a27;--amber:#f5b52e;--wash-good:#15261b;--wash-blue:#15202f;--fit:#4f8ae8;--fat:#f07a4f;--run:#f07a4f;--bike:#4f8ae8;--str:#2bb58c;--swim:#e8ad1c;--commute:#4a4a46;--shadow:none}
#health{font-family:var(--body)}#health:not([hidden]){display:flex;flex-direction:column;gap:14px}
#health>p{margin:0}
#health .sec{display:flex;align-items:baseline;gap:12px;margin:22px 0 0}
#health .sec h2{font:700 22px/1 var(--display);text-transform:uppercase;letter-spacing:.03em;margin:0;color:var(--ink)}
#health .sec::after{content:"";order:1;flex:1;height:1px;background:var(--grid);align-self:center;min-width:20px}
#health .sec .src{order:2}
#health .card{border-radius:14px;padding:16px 18px;box-shadow:var(--shadow)}
#health .two{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))}
#health .grid{gap:14px;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))}
#health .num{font:700 34px/1 var(--display);font-variant-numeric:tabular-nums}
#health .num small{font:500 15px var(--body);color:var(--ink2);margin-left:3px}
#health .chip{display:inline-flex;align-items:center;gap:6px;font:600 12px/1.3 var(--body);padding:3px 9px;border-radius:999px;white-space:nowrap}
#health .chip.good{background:var(--wash-good);color:var(--good)}#health .chip.warn{background:var(--wash-warn);color:var(--warn)}#health .chip.crit{background:var(--wash-crit);color:var(--crit)}#health .chip.blue{background:var(--wash-blue);color:var(--fit)}#health .chip.muted{background:var(--grid);color:var(--ink2)}
#health .hero{background:var(--hero);color:var(--hero-ink);border-radius:18px;padding:22px 22px 20px;display:grid;gap:22px 28px;grid-template-columns:minmax(0,260px) minmax(0,1fr);position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.06)}
#health .hero::before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:var(--amber)}
#health .gaugebox{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
#health .eyebrow{font:600 12px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;color:var(--hero-muted);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
#health .eyebrow .chip{letter-spacing:0;text-transform:none;background:rgba(240,168,24,.16);color:var(--amber)}
#health .gauge{width:100%;max-width:260px;margin-top:10px}
#health .verdict{font:800 clamp(44px,9vw,64px)/.9 var(--display);text-transform:uppercase;letter-spacing:.01em;margin-top:-4px}
#health .verdict-sub{color:var(--hero-muted);font-size:14px}
#health .coach{margin:0;display:flex;flex-direction:column;gap:10px;align-self:center}
#health .coach p{margin:0;font-size:17px;line-height:1.55;max-width:58ch}
#health .coach p:first-child{font:italic 600 26px/1.15 var(--display);color:#fff}
#health .coach p:first-child::before{content:"\\201C";color:var(--amber);margin-right:2px}
#health .coach .sign{font:800 22px/1 var(--display);text-transform:uppercase;letter-spacing:.06em;color:var(--amber);margin-top:2px}
#health .coach footer{font-size:12px;color:var(--hero-muted)}
#health .sigs{grid-column:1/-1;display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}
#health .sig{background:var(--hero2);border-radius:12px;padding:12px 14px 10px;display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:baseline;min-width:0}
#health .sig .k{font-size:12px;color:var(--hero-muted);grid-column:1/-1;display:flex;align-items:center;gap:6px}
#health .sig .k .dot{width:7px;height:7px}
#health .sig .v{font:700 28px/1.05 var(--display);font-variant-numeric:tabular-nums}
#health .sig .v small{font:500 13px var(--body);color:var(--hero-muted);margin-left:2px}
#health .sig .delta{font-size:12px;font-weight:600;padding:2px 7px;border-radius:6px;background:rgba(255,255,255,.07);font-variant-numeric:tabular-nums}
#health .sig .delta.low{background:rgba(240,168,24,.18);color:var(--amber)}
#health .sig .chart{grid-column:1/-1;margin-top:6px}
#health .sig .u{grid-column:1/-1;font-size:12px;color:var(--hero-muted)}
#health .quest{display:flex;flex-direction:column;gap:14px}
#health .qtop{display:flex;gap:14px;align-items:center}
#health .qtop .ring{flex:none;width:84px;height:84px}
#health .qname{font:700 21px/1.05 var(--display);text-transform:uppercase;letter-spacing:.02em;margin:0;color:var(--ink)}
#health .qname a{text-decoration:none}#health .qname a:hover{color:var(--accent)}
#health .qphase{font-size:12px;color:var(--muted);margin-top:4px;display:block}
#health .q{margin:0;font-size:14px;color:var(--ink2);padding:10px 12px;border-radius:10px;background:var(--page)}
#health .q b{color:var(--ink);font-weight:600}
#health .mrow{display:flex;flex-direction:column;gap:6px}
#health .mrow .row{display:flex;justify-content:space-between;gap:10px;font-size:14px}
#health .mrow b{font-variant-numeric:tabular-nums}
#health .meter{position:relative;height:10px;border-radius:5px;background:var(--grid)}
#health .meter i{position:absolute;inset:0 auto 0 0;border-radius:5px;background:var(--fit)}
#health .meter .mark{position:absolute;top:-4px;bottom:-4px;width:2px;margin-left:-1px;background:var(--ink);border-radius:1px}
#health .checks{display:flex;gap:8px;flex-wrap:wrap}
#health .check{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;border:1.5px dashed var(--axis);font-size:14px;color:var(--ink2)}
#health .check i{width:16px;height:16px;border-radius:50%;border:2px solid var(--axis);flex:none}
#health .check.done{border-style:solid;border-color:var(--good);color:var(--ink)}
#health .check.done i{background:var(--good);border-color:var(--good)}
#health .wflag{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 14px;align-items:start;background:var(--surface);border:1px solid var(--ring);border-left:5px solid var(--amber);border-radius:14px;padding:14px 16px;box-shadow:var(--shadow)}
#health .wflag.attention{border-left-color:var(--crit)}
#health .wflag .ic{width:30px;height:30px;border-radius:50%;background:var(--wash-warn);color:var(--warn);display:grid;place-items:center;font:800 18px/1 var(--display);grid-row:1/3}
#health .wflag.attention .ic{background:var(--wash-crit);color:var(--crit)}
#health .wflag .t{font-weight:600;font-size:15px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#health .wflag .d{font-size:13px;color:var(--ink2)}
#health .legend{gap:14px;flex-wrap:wrap;margin:10px 0 0}
#health .legend span{display:inline-flex;align-items:center}
#health .legend i.line{height:3px;width:14px;border-radius:2px}
#health .legend i.dash{height:0;width:14px;border-top:2px dashed var(--ink2);border-radius:0}
#health .chead{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px}
#health .chead .num{font-size:40px}
#health .kv{gap:5px 12px;margin:10px 0 0;font-size:13px}
#health .kv dd{font-weight:600}
#health .read{margin:12px 0 0;font-size:14px;color:var(--ink2);max-width:72ch}
#health details.explain{background:var(--surface);border:1px solid var(--ring);border-radius:14px;padding:14px 18px}
#health details.explain summary{padding:4px 0;font:700 18px/1.2 var(--display);text-transform:uppercase;letter-spacing:.03em;color:var(--ink)}
#health .explain ol{margin:10px 0 0;padding-left:20px;display:flex;flex-direction:column;gap:6px;color:var(--ink2);font-size:14px;max-width:75ch}
#health .explain ol b{color:var(--ink)}
@media (prefers-reduced-motion:no-preference){#health .gauge .seg{animation:grow .8s ease both}@keyframes grow{from{stroke-dashoffset:var(--len)}}}
/* iPad mini (portrait) and iPhone */
@media (max-width:600px){#health .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#health .grid>:last-child:nth-child(odd){grid-column:1/-1}#health .card{padding:14px}#health .num{font-size:30px}#health .num small{font-size:13px}#health .sec{flex-wrap:wrap;gap:4px 12px;margin-top:16px}#health .sec::after{display:none}#health .sec h2{font-size:20px}#health .sec .src{margin-left:auto}#health .qtop .ring{width:68px;height:68px}#health .qname{font-size:19px}#health .chead .num{font-size:34px}#health .wflag{padding:12px 14px;gap:2px 12px}#health .check{padding:10px 12px}}
@media (max-width:900px){#health .hero{grid-template-columns:minmax(0,210px) minmax(0,1fr);gap:18px 22px}#health .verdict{font-size:46px}}
@media (max-width:600px){#health .hero{grid-template-columns:1fr;padding:18px 16px 16px;gap:16px;border-radius:16px}#health .gaugebox{display:grid;grid-template-columns:132px minmax(0,1fr);align-items:center;gap:0 14px}#health .eyebrow{grid-column:1/-1;margin-bottom:6px}#health .gauge{grid-row:2/4;margin:0;max-width:132px}#health .verdict{font-size:40px;margin:0;align-self:end}#health .verdict-sub{align-self:start;font-size:13px}#health .coach p{font-size:15.5px;line-height:1.5}#health .coach p:first-child{font-size:21px}#health .coach .sign{font-size:19px}}
@media (max-width:600px){#health .sigs{grid-template-columns:1fr;gap:8px}#health .sig{grid-template-columns:auto auto minmax(0,1fr);gap:0 10px;padding:10px 12px;align-items:center}#health .sig .k{grid-column:1/3}#health .sig .v{font-size:24px}#health .sig .delta{justify-self:start}#health .sig .chart{grid-column:3;grid-row:1/4;margin:0}#health .sig .u{grid-column:1/3;font-size:11.5px}}
`;

const SCRIPT = `
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LABEL = { ok: 'Healthy', watch: 'Worth watching', attention: 'Needs attention', unknown: 'No data' };
const tag = l => '<span class="tag ' + l + '"><span class="dot"></span>' + LABEL[l] + '</span>';
const fmt = (n, d = 1) => n === null || n === undefined || Number.isNaN(n) ? '–' : Number(n).toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const ago = iso => { if (!iso) return 'never'; const m = (Date.now() - Date.parse(iso)) / 60000; if (m < 2) return 'just now'; if (m < 90) return Math.round(m) + ' min ago'; const h = m / 60; if (h < 36) return Math.round(h) + ' h ago'; return Math.round(h / 24) + ' days ago'; };
const day = s => s ? new Date(s.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '–';
// The data is in D1 (Data Studio) and the docs in GitHub since 1 Oct 2026.
const D1_CONSOLE = ${JSON.stringify(D1_CONSOLE)};
const QUEST_ENGINE_DOC = ${JSON.stringify(QUEST_ENGINE_DOC)};

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
    el.innerHTML = ({ line: lineChart, bar: barChart, spark: sparkSvg, tsb: tsbSvg, weeks: weeksSvg, body: bodySvg })[kind](a, b, w);
  }
}
let resizeTimer; addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawCharts, 150); });
const tip = $('#tip');
const showTip = e => {
  const t = e.target.closest && e.target.closest('[data-tip]');
  if (!t) { tip.style.opacity = 0; return; }
  tip.textContent = t.dataset.tip; tip.style.opacity = 1;
  const x = Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8);
  tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, e.clientY - (e.pointerType === 'touch' ? 64 : 34)) + 'px';
};
document.addEventListener('pointermove', showTip);
document.addEventListener('pointerdown', showTip);
addEventListener('scroll', () => { tip.style.opacity = 0; }, { passive: true });

const flagList = flags => flags.length
  ? '<ul class="flags">' + flags.map(f => '<li class="flag ' + f.level + '"><span class="dot" style="margin-top:7px;background:var(--' + (f.level === 'attention' ? 'crit' : 'warnfill') + ')"></span><span class="t">' + esc(f.title) + '</span>' + (f.link ? '<a class="src" href="' + esc(f.link) + '" target="_blank" rel="noopener">Open ↗</a>' : '<span></span>') + '<span class="w">' + esc(f.why) + '</span></li>').join('') + '</ul>'
  : '<p class="calm">Nothing drifting here.</p>';

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
  html += '<h2>Missing or unclassified days</h2>' + (c.missing.length ? '<div class="card scroll"><table><thead><tr><th>Date</th><th>AM</th><th>PM</th><th></th></tr></thead><tbody>' + c.missing.map(m => '<tr><td>' + day(m.date) + '</td><td>' + esc(m.am || '—') + '</td><td>' + esc(m.pm || '—') + '</td><td class="num">' + (!m.no_row ? '<a class="src" href="' + esc(m.url || D1_CONSOLE) + '" target="_blank" rel="noopener">Fix ↗</a>' : '<span class="muted">no row</span>') + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="calm">Every past work day is classified.</p>');
  return html + '<p><a class="src" href="' + D1_CONSOLE + '" target="_blank" rel="noopener">Work Location Log (D1) ↗</a></p>';
}

// ---- Health (Recovery today, quests, form, training, body) ----
const attr = o => Object.keys(o).map(k => k + '="' + o[k] + '"').join(' ');
const S_ = (t, o, inner) => '<' + t + ' ' + attr(o) + (inner === undefined ? '/>' : '>' + inner + '</' + t + '>');
const pathOf = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
let gid = 0;
const grad = (color, top) => { const id = 'g' + (++gid); return ['<defs><linearGradient id="' + id + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity="' + top + '"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>', 'url(#' + id + ')']; };
const svgOpen = (W, H) => '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img">';
const hgrid = (ticks, Y, L, W, R, f) => ticks.map(t => S_('line', { x1: L, x2: W - R, y1: Y(t), y2: Y(t), stroke: 'var(--grid)' }) + S_('text', { x: L - 6, y: Y(t) + 4, 'text-anchor': 'end' }, f ? f(t) : t)).join('');
const signed = (n, d = 0) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n), d);
const dur = h => { const m = Math.round(Math.abs(h) * 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); };
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const wday = d => WD[new Date(d + 'T12:00:00Z').getUTCDay()];
const SPORT = { run: 'Run', bike: 'Bike', strength: 'Strength', swim: 'Swim', ebike: 'E-bike', other: 'Other' };
const SPORT_COL = { run: 'var(--run)', bike: 'var(--bike)', strength: 'var(--str)', swim: 'var(--swim)', ebike: 'var(--commute)', other: 'var(--axis)' };

// Three segments on a half ring: amber for a low signal, green otherwise.
function gaugeSvg(r) {
  const cx = 130, cy = 132, rad = 108, sw = 18, gap = 4 * Math.PI / 180, span = (Math.PI - 2 * gap) / 3;
  const pt = a => (cx - rad * Math.cos(a)).toFixed(1) + ' ' + (cy - rad * Math.sin(a)).toFixed(1);
  let s = '<svg class="gauge" viewBox="0 0 260 150" role="img" aria-label="' + (r.judged - r.low) + ' of ' + r.judged + ' signals in the green">';
  ['sleep', 'hrv', 'rhr'].forEach((k, i) => {
    const a0 = i * (span + gap), a1 = a0 + span, d = 'M' + pt(a0) + ' A' + rad + ' ' + rad + ' 0 0 1 ' + pt(a1), sig = r[k];
    s += S_('path', { d, fill: 'none', stroke: 'rgba(255,255,255,.08)', 'stroke-width': sw });
    if (sig && sig.delta !== null) s += S_('path', { class: 'seg', d, fill: 'none', stroke: sig.low ? 'var(--amber)' : 'var(--good)', 'stroke-width': sw, 'stroke-dasharray': (rad * span).toFixed(1), style: '--len:' + (rad * span).toFixed(1) });
  });
  s += S_('text', { x: cx, y: cy - 12, 'text-anchor': 'middle', style: 'fill:var(--hero-ink);font:800 44px var(--display)' }, (r.judged - r.low) + '/' + r.judged);
  s += S_('text', { x: cx, y: cy + 6, 'text-anchor': 'middle', style: 'fill:var(--hero-muted);font-size:12px' }, 'signals in the green');
  return s + '</svg>';
}
// The last 14 nights, with a dashed line at the usual value.
function sparkSvg(series, o, W) {
  const H = 48, P = 4, pts = series.filter(p => p[o.key] !== null && p[o.key] !== undefined);
  if (pts.length < 2) return '';
  const vals = pts.map(p => p[o.key]).concat(o.usual === null ? [] : [o.usual]);
  const lo = Math.min(...vals), hi = Math.max(...vals), step = (W - 2 * P) / (pts.length - 1);
  const X = i => P + i * step, Y = v => P + (1 - (v - lo) / (hi - lo || 1)) * (H - 2 * P);
  const xy = pts.map((p, i) => [X(i), Y(p[o.key])]), [defs, fill] = grad(o.color, 0.35), l = xy[xy.length - 1];
  let s = svgOpen(W, H) + defs;
  if (o.usual !== null) s += S_('line', { x1: P, x2: W - P, y1: Y(o.usual), y2: Y(o.usual), stroke: 'var(--hero-muted)', 'stroke-dasharray': '3 3', opacity: 0.7 });
  s += S_('path', { d: pathOf(xy) + ' L' + l[0] + ' ' + H + ' L' + P + ' ' + H + ' Z', fill }) + S_('path', { d: pathOf(xy), fill: 'none', stroke: o.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  s += S_('circle', { cx: l[0], cy: l[1], r: 3.5, fill: o.color, stroke: 'var(--hero2)', 'stroke-width': 2 });
  pts.forEach((p, i) => { s += S_('rect', { x: X(i) - step / 2, y: 0, width: step, height: H, fill: 'transparent', 'data-tip': esc(day(p.date) + ': ' + o.fmt(p[o.key])) }); });
  return s + '</svg>';
}
function ringSvg(frac, col, big, small) {
  const r = 34, c = 2 * Math.PI * r, f = Math.min(1, frac || 0);
  return '<svg class="ring" viewBox="0 0 84 84" role="img" aria-label="' + esc(big + ' ' + small) + '">' + S_('circle', { cx: 42, cy: 42, r, fill: 'none', stroke: 'var(--grid)', 'stroke-width': 9 }) +
    (frac > 0 ? S_('circle', { cx: 42, cy: 42, r, fill: 'none', stroke: col, 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-dasharray': (c * f).toFixed(1) + ' ' + c.toFixed(1), transform: 'rotate(-90 42 42)' }) : '') +
    S_('text', { x: 42, y: 44, 'text-anchor': 'middle', style: 'fill:var(--ink);font:700 20px var(--display)' }, esc(big)) + S_('text', { x: 42, y: 58, 'text-anchor': 'middle', style: 'fill:var(--muted);font-size:10px' }, esc(small)) + '</svg>';
}
// Fitness and fatigue on top; TSB over its zones below.
function tsbSvg(t, _, W) {
  const narrow = W < 560, D = t.series, n = D.length, H = narrow ? 290 : 320, L = 30, R = narrow ? 10 : 96, T = 8, B = 22, gap = 18;
  const topH = (H - T - B - gap) / 2, botH = topH, X = i => L + i * (W - L - R) / (n - 1);
  const top = Math.max(20, Math.ceil(Math.max(...D.map(p => Math.max(p.fit, p.fat))) / 20) * 20);
  const lo = Math.min(-45, Math.floor(Math.min(...D.map(p => p.tsb)) / 5) * 5 - 5), hi = Math.max(20, Math.ceil(Math.max(...D.map(p => p.tsb)) / 5) * 5 + 5);
  const Yt = v => T + (1 - v / top) * topH, y0 = T + topH + gap, Yb = v => y0 + (1 - (v - lo) / (hi - lo)) * botH;
  let s = svgOpen(W, H);
  for (const [a, b, f, name, c] of [[hi, 0, 'var(--wash-good)', 'Fresh', 'var(--good)'], [0, -10, 'transparent', 'Neutral', 'var(--muted)'], [-10, -30, 'var(--wash-blue)', 'Building', 'var(--fit)'], [-30, lo, 'var(--wash-crit)', 'Overreaching', 'var(--crit)']]) {
    s += S_('rect', { x: L, y: Yb(a), width: W - L - R, height: Yb(b) - Yb(a), fill: f });
    if (narrow && name === 'Neutral') continue;
    s += narrow ? S_('text', { x: L + 4, y: Yb(a) + 11, style: 'fill:' + c + ';font-weight:600;font-size:10px' }, name) : S_('text', { x: W - R + 8, y: (Yb(a) + Yb(b)) / 2 + 4, style: 'fill:' + c + ';font-weight:600' }, name);
  }
  s += hgrid([0, top / 2, top], Yt, L, W, R);
  for (let v = 20; v >= lo; v -= 20) if (v <= hi) s += S_('text', { x: L - 6, y: Yb(v) + 4, 'text-anchor': 'end' }, (v > 0 ? '+' : '') + v);
  s += S_('line', { x1: L, x2: W - R, y1: Yb(0), y2: Yb(0), stroke: 'var(--axis)' });
  const fp = D.map((p, i) => [X(i), Yt(p.fit)]), [defs, fill] = grad('var(--fit)', 0.22);
  s += defs + S_('path', { d: pathOf(fp) + ' L' + X(n - 1) + ' ' + Yt(0) + ' L' + X(0) + ' ' + Yt(0) + ' Z', fill });
  s += S_('path', { d: pathOf(fp), fill: 'none', stroke: 'var(--fit)', 'stroke-width': 2.2, 'stroke-linejoin': 'round' });
  s += S_('path', { d: pathOf(D.map((p, i) => [X(i), Yt(p.fat)])), fill: 'none', stroke: 'var(--fat)', 'stroke-width': 1.8, 'stroke-linejoin': 'round', opacity: 0.9 });
  const tp = D.map((p, i) => [X(i), Yb(p.tsb)]);
  s += S_('path', { d: pathOf(tp) + ' L' + X(n - 1) + ' ' + Yb(0) + ' L' + X(0) + ' ' + Yb(0) + ' Z', fill: 'var(--ink)', opacity: 0.12 });
  s += S_('path', { d: pathOf(tp), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2, 'stroke-linejoin': 'round' });
  const li = D.indexOf(D.reduce((a, p) => (p.tsb < a.tsb ? p : a)));
  if (D[li].tsb < -10) {
    s += S_('circle', { cx: X(li), cy: Yb(D[li].tsb), r: 4, fill: 'var(--crit)', stroke: 'var(--surface)', 'stroke-width': 2 });
    const right = li > n * (narrow ? 0.6 : 0.8);
    s += S_('text', { x: X(li) + (right ? -8 : 8), y: Yb(D[li].tsb) + 4, 'text-anchor': right ? 'end' : 'start', style: 'fill:var(--crit);font-weight:600' }, Math.round(D[li].tsb) + ' · ' + day(D[li].date));
  }
  const last = D[n - 1], zc = { Fresh: 'var(--good)', Neutral: 'var(--muted)', Building: 'var(--fit)', Overreaching: 'var(--crit)' }[t.zone];
  s += S_('circle', { cx: X(n - 1), cy: Yb(last.tsb), r: 5, fill: zc, stroke: 'var(--surface)', 'stroke-width': 2 });
  s += S_('circle', { cx: X(n - 1), cy: Yt(last.fit), r: 4, fill: 'var(--fit)', stroke: 'var(--surface)', 'stroke-width': 2 });
  let yf = Yt(last.fit) + 4, ya = Yt(last.fat) + 4;
  if (Math.abs(yf - ya) < 14) { if (yf <= ya) ya = yf + 14; else yf = ya + 14; }
  if (!narrow) {
    s += S_('text', { x: X(n - 1) + 8, y: yf, style: 'fill:var(--fit);font-weight:600' }, 'Fitness ' + Math.round(last.fit));
    s += S_('text', { x: X(n - 1) + 8, y: ya, style: 'fill:var(--fat);font-weight:600' }, 'Fatigue ' + Math.round(last.fat));
  }
  D.forEach((p, i) => { if (p.date.slice(8) === '01') s += S_('text', { x: X(i), y: H - 6, 'text-anchor': 'middle' }, day(p.date)); });
  const w = (W - L - R) / (n - 1);
  D.forEach((p, i) => { s += S_('rect', { x: X(i) - w / 2, y: T, width: w, height: H - T - B, fill: 'transparent', 'data-tip': esc(day(p.date) + (p.workout ? ' (workout)' : '') + ' · Fitness ' + fmt(p.fit) + ' · Fatigue ' + fmt(p.fat) + ' · TSB ' + signed(p.tsb, 1)) }); });
  return s + '</svg>';
}
// Minutes per week by sport, stacked, with the goal as a dashed line.
function weeksSvg(weeks, goal, W) {
  const H = 230, L = 34, R = 8, T = 12, B = 22, n = weeks.length, bw = (W - L - R) / n;
  const total = w => Object.values(w.minutes).reduce((a, b) => a + b, 0);
  const max = Math.max(goal * 60, Math.ceil(Math.max(...weeks.map(total)) / 120) * 120), Y = v => T + (1 - v / max) * (H - T - B);
  const ticks = []; for (let v = 0; v <= max; v += 120) ticks.push(v);
  let s = svgOpen(W, H) + hgrid(ticks, Y, L, W, R, v => v / 60 + ' h');
  weeks.forEach((wk, i) => {
    const w = Math.min(bw * 0.6, 46), x = L + i * bw + (bw - w) / 2, tot = total(wk), id = 'c' + (++gid);
    const segs = Object.keys(SPORT).filter(k => wk.minutes[k]);
    if (tot > 0) {
      s += '<defs><clipPath id="' + id + '">' + S_('rect', { x, y: Y(tot), width: w, height: Y(0) - Y(tot), rx: 5 }) + '</clipPath></defs><g clip-path="url(#' + id + ')">';
      let acc = 0;
      for (const k of segs) { const v = wk.minutes[k]; s += S_('rect', { x, y: Y(acc + v), width: w, height: Y(acc) - Y(acc + v), fill: SPORT_COL[k], opacity: wk.current ? 0.55 : 1 }) + S_('line', { x1: x, x2: x + w, y1: Y(acc + v), y2: Y(acc + v), stroke: 'var(--surface)', 'stroke-width': 1.5 }); acc += v; }
      s += '</g>';
    }
    s += S_('text', { x: x + w / 2, y: H - 6, 'text-anchor': 'middle' }, wk.current ? 'now' : (bw < 44 && (n - 1 - i) % 2 ? '' : day(wk.week)));
    s += S_('rect', { x: L + i * bw, y: T, width: bw, height: H - T - B, fill: 'transparent', 'data-tip': esc('Week of ' + day(wk.week) + ' · ' + fmt(tot / 60) + ' h' + (segs.length ? ' · ' + segs.map(k => SPORT[k] + ' ' + wk.minutes[k] + ' min').join(', ') : '')) });
  });
  s += S_('line', { x1: L, x2: W - R, y1: Y(goal * 60), y2: Y(goal * 60), stroke: 'var(--ink2)', 'stroke-width': 1.2, 'stroke-dasharray': '4 4', opacity: 0.6 });
  return s + '</svg>';
}
// A body series by date, with an optional target line.
function bodySvg(series, o, W) {
  if (series.length < 2) return '<p class="empty">Not enough weigh-ins for a trend yet.</p>';
  const H = 140, L = 30, R = 8, T = 10, B = 20, vals = series.map(p => p.value).concat(o.ref === undefined ? [] : [o.ref]);
  const lo = Math.floor(Math.min(...vals) - 0.5), hi = Math.ceil(Math.max(...vals) + 0.5);
  const t0 = Date.parse(series[0].date), t1 = Date.parse(series[series.length - 1].date) || t0 + 1;
  const X = d => L + (Date.parse(d) - t0) / (t1 - t0 || 1) * (W - L - R), Y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  let s = svgOpen(W, H) + hgrid([lo, Math.round((lo + hi) / 2), hi], Y, L, W, R);
  if (o.ref !== undefined) s += S_('line', { x1: L, x2: W - R, y1: Y(o.ref), y2: Y(o.ref), stroke: 'var(--good)', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }) + S_('text', { x: W - R, y: Y(o.ref) - 5, 'text-anchor': 'end', style: 'fill:var(--good);font-weight:600' }, 'target ' + o.ref + o.unit);
  const xy = series.map(p => [X(p.date), Y(p.value)]), [defs, fill] = grad(o.color, 0.18), l = xy[xy.length - 1];
  s += defs + S_('path', { d: pathOf(xy) + ' L' + l[0] + ' ' + Y(lo) + ' L' + xy[0][0] + ' ' + Y(lo) + ' Z', fill }) + S_('path', { d: pathOf(xy), fill: 'none', stroke: o.color, 'stroke-width': 2.2, 'stroke-linejoin': 'round' });
  s += S_('circle', { cx: l[0], cy: l[1], r: 4.5, fill: o.color, stroke: 'var(--surface)', 'stroke-width': 2 });
  for (const p of [series[0], series[Math.floor(series.length / 2)], series[series.length - 1]]) s += S_('text', { x: X(p.date), y: H - 4, 'text-anchor': p === series[0] ? 'start' : p === series[series.length - 1] ? 'end' : 'middle' }, day(p.date));
  series.forEach((p, i) => { const a = i ? (xy[i - 1][0] + xy[i][0]) / 2 : L, b = i < xy.length - 1 ? (xy[i][0] + xy[i + 1][0]) / 2 : W - R; s += S_('rect', { x: a, y: 0, width: Math.max(1, b - a), height: H, fill: 'transparent', 'data-tip': esc(day(p.date) + ': ' + fmt(p.value) + o.unit) }); });
  return s + '</svg>';
}

function heroHtml(r) {
  if (!r) return '<p class="calm">Recovery today reads the Sleep &amp; Recovery database, which could not be read.</p>';
  if (r.stale || !r.verdict) return '<p class="calm">Recovery today has no fresh sleep data' + (r.last_date ? ' (newest night: ' + day(r.last_date) + ')' : '') + '.</p>';
  const sig = (name, s, value, unit, delta, usual, low, key, fmtTip, color) => '<div class="sig"><span class="k"><span class="dot" style="background:' + (low ? 'var(--amber)' : 'var(--good)') + '"></span>' + name + '</span><span class="v">' + value + (unit ? '<small>' + unit + '</small>' : '') + '</span>' + (delta ? '<span class="delta' + (low ? ' low' : '') + '">' + delta + '</span>' : '<span></span>') +
    chart('spark', r.series, { key, usual: s.usual, color: low ? 'var(--amber)' : color, fmt: fmtTip }) + '<span class="u">' + usual + '</span></div>';
  const S1 = r.sleep, S2 = r.hrv, S3 = r.rhr, n = r.note;
  let html = '<section class="hero" aria-label="Recovery today"><div class="gaugebox"><span class="eyebrow">Recovery today' + (r.night !== 'last night' ? ' · ' + esc(r.night) : '') + (r.recovering ? ' <span class="chip">Recovering</span>' : '') + '</span>' + gaugeSvg(r) +
    '<span class="verdict">' + esc(r.verdict_text) + '</span><span class="verdict-sub">' + esc(r.verdict_sub) + '</span></div>';
  if (n) html += '<blockquote class="coach">' + n.lines.map(l => '<p>' + esc(l) + '</p>').join('') + '<span class="sign">' + esc(n.sign) + '</span><footer>Your accountability partner, David Goggins · written in his style from this morning\\'s numbers</footer></blockquote>';
  html += '<div class="sigs">';
  html += sig('Sleep ' + esc(r.night), S1, S1.value !== null ? dur(S1.value) : '–', '', S1.delta !== null ? (S1.delta < 0 ? '−' : '+') + dur(S1.delta) : '', 'Usual ' + (S1.usual !== null ? dur(S1.usual) : '–') + (r.awake !== null ? ' · awake ' + dur(r.awake / 60) : ''), S1.low, 'sleep', v => dur(v) + ' asleep', 'var(--good)');
  html += sig('HRV', S2, fmt(S2.value, 0), 'ms', S2.delta !== null ? signed(S2.delta) : '', 'Usual ' + fmt(S2.usual, 0) + ' · higher is better', S2.low, 'hrv', v => v + ' ms', 'var(--good)');
  html += sig('Resting heart rate', S3, fmt(S3.value, 0), 'bpm', S3.delta !== null ? signed(S3.delta) : '', 'Usual ' + fmt(S3.usual, 0) + ' · lower is better', S3.low, 'rhr', v => v + ' bpm', 'var(--good)');
  return html + '</div></section>';
}
const wflag = f => '<div class="wflag ' + f.level + '"><span class="ic" aria-hidden="true">!</span><span class="t">' + esc(f.title) + ' <span class="chip ' + (f.level === 'attention' ? 'crit' : 'warn') + '">' + (f.level === 'attention' ? 'Attention' : 'Watch') + '</span>' + (f.link ? ' <a class="src" href="' + esc(f.link) + '" target="_blank" rel="noopener">Open ↗</a>' : '') + '</span><span class="d">' + esc(f.why) + '</span></div>';
const meter = (share, color, mark) => '<div class="meter"><i style="width:' + Math.max(0, Math.min(100, share * 100)).toFixed(1) + '%' + (color ? ';background:' + color : '') + '"></i>' + (mark !== undefined ? '<span class="mark" style="left:' + Math.min(100, mark * 100).toFixed(1) + '%"></span>' : '') + '</div>';

function questHtml(q, h) {
  const head = (ring, sub) => '<div class="qtop">' + ring + '<div><h3 class="qname">' + (q.url ? '<a href="' + esc(q.url) + '" target="_blank" rel="noopener">' + esc(q.name) + '</a>' : esc(q.name)) + '</h3><span class="qphase">' + esc(q.phase ? q.phase + ' phase' : 'Active') + (sub ? ' · ' + sub : '') + '</span></div></div>' +
    (q.question ? '<p class="q"><b>Pass/fail:</b> ' + esc(q.question) + '</p>' : '');
  if (q.kind === 'shape') {
    const w = h.this_week, goal = h.targets.weekly_hours, f = h.body_fat, paused = h.recovery && h.recovery.recovering;
    let html = head(ringSvg(w.step_share, 'var(--fit)', Math.round(w.step_share * 100) + '%', 'of step'), 'goal ' + goal + ' h a week, body fat ' + f.target + '%');
    html += '<div class="mrow"><div class="row"><span>This week\\'s step</span><b>' + fmt(w.hours) + ' / ' + fmt(w.step) + ' h</b></div>' + meter(w.hours / goal, null, w.step / goal) +
      '<span class="sub">' + (paused ? 'Paused while you recover; it picks up after 3 normal days. ' : '') + 'Bar runs to the ' + goal + ' h goal; the tick is this week\\'s step (last 4 weeks plus 10%).' + (w.last_step ? ' Last step reached: week of ' + day(w.last_step) + '.' : '') + '</span></div>';
    if (f.week_avg !== null) {
      const share = f.high_90d > f.target ? (f.high_90d - f.week_avg) / (f.high_90d - f.target) : 1, up = f.month_change !== null && f.month_change > 0;
      html += '<div class="mrow"><div class="row"><span>Body fat, week average</span><b>' + fmt(f.week_avg) + '% <span class="muted">→ ' + f.target + '%</span></b></div>' + meter(share, up ? 'var(--amber)' : 'var(--good)') +
        '<span class="sub">' + (f.month_change === null ? 'No month-ago comparison yet.' : f.month_change > 0 ? 'Up ' + fmt(f.month_change) + ' points on a month ago, so not yet trending down.' : f.month_change < 0 ? 'Down ' + fmt(-f.month_change) + ' points on a month ago, heading toward ' + f.target + '%.' : 'Level with a month ago.') + ' The bar runs from your 90-day high (' + fmt(f.high_90d) + '%) to the target.</span></div>';
    }
    return '<section class="card quest">' + html + '</section>';
  }
  if (q.kind === 'half' && q.half) {
    const m = q.half, done = (m.this_week.long ? 1 : 0) + (m.this_week.interval ? 1 : 0), lw = m.last_week;
    let html = head(ringSvg(done / 2, 'var(--run)', done + '/2', 'runs'), m.goal_km + ' km');
    const ck = (label, r) => '<span class="check' + (r ? ' done' : '') + '"' + (r ? ' data-tip="' + esc(wday(r.date) + ' · ' + r.name + ' · ' + fmt(r.km) + ' km') + '"' : '') + '><i></i>' + label + '</span>';
    html += '<div class="checks">' + ck('Long run', m.this_week.long) + ck('Interval run', m.this_week.interval) + '</div>';
    html += '<span class="sub" style="margin-top:-6px">Last week: ' + (lw.long ? 'the ' + fmt(lw.long.km) + ' km long run on ' + wday(lw.long.date) : 'no long run') + ', ' + (lw.interval ? 'intervals on ' + wday(lw.interval.date) + ' (' + esc(lw.interval.name) + ')' : 'no intervals' + (m.last_interval ? ' (last: ' + esc(m.last_interval.name) + ' on ' + day(m.last_interval.date) + ')' : '')) + '.</span>';
    if (m.longest) html += '<div class="mrow"><div class="row"><span>Longest run</span><b>' + fmt(m.longest.km) + ' / ' + m.goal_km + ' km</b></div>' + meter(m.longest.km / m.goal_km, 'var(--run)') + '<span class="sub">' + day(m.longest.date) + (m.longest_before ? ', up from ' + fmt(m.longest_before.km) + ' km on ' + day(m.longest_before.date) : '') + '.</span></div>';
    return '<section class="card quest">' + html + '</section>';
  }
  return '<section class="card quest">' + head('', '') + '</section>';
}

function renderHealth(h) {
  if (!h) return '<p class="calm">Workouts or Body Metrics could not be read.</p>';
  let html = heroHtml(h.recovery);
  html += h.flags.map(wflag).join('');
  if (h.quests && h.quests.length) html += '<div class="sec"><h2>Health quests</h2><a class="src" href="' + D1_CONSOLE + '" target="_blank" rel="noopener">from your Health Journey (D1) ↗</a></div><div class="two">' + h.quests.map(q => questHtml(q, h)).join('') + '</div>';
  const t = h.tsb, L = h.load;
  if (t) {
    const zc = { Fresh: 'good', Neutral: 'muted', Building: 'blue', Overreaching: 'crit' }[t.zone], now = t.today;
    const read = (t.low.tsb < -10 ? 'Lowest point ' + Math.round(t.low.tsb) + ' on ' + day(t.low.date) + '. ' : '') +
      { Fresh: 'Fatigue is below fitness today, so you are fresh', Neutral: 'Fitness and fatigue are close to even', Building: 'You are carrying training load, the productive zone', Overreaching: 'Fatigue is far above fitness; this is deep load' }[t.zone] +
      (t.peak.fit - now.fit >= 2 ? ', but fitness is sliding: ' + fmt(t.peak.fit) + ' at its peak on ' + day(t.peak.date) + ', ' + fmt(now.fit) + ' today.' : '.');
    html += '<div class="sec"><h2>Form</h2><span class="src">Strava effort scores</span></div><section class="card"><div class="chead"><div><h3>Training stress balance (TSB)</h3><div class="num">' + signed(now.tsb, 1) + ' <span class="chip ' + zc + '" style="vertical-align:middle">' + t.zone + '</span></div></div>' +
      '<dl class="kv" style="margin:0;min-width:180px"><dt>Fitness (44-day)</dt><dd>' + fmt(now.fit) + '</dd><dt>Fatigue (7-day)</dt><dd>' + fmt(now.fat) + '</dd>' + (L ? '<dt>Battle form</dt><dd>' + esc(L.state) + (L.bonus > 1 ? ' ×' + L.bonus.toFixed(2) : '') + '</dd>' : '') + '</dl></div>' +
      (t.series.length > 1 ? chart('tsb', t) : '') + '<div class="legend"><span><i class="line" style="background:var(--fit)"></i>Fitness</span><span><i class="line" style="background:var(--fat)"></i>Fatigue</span><span><i style="background:var(--ink);opacity:.5"></i>TSB = fitness − fatigue</span></div><p class="read">' + read + '</p></section>';
  }
  const w = h.this_week, S = h.sports;
  const byDay = {}; for (const s of w.list) (byDay[s.date] = byDay[s.date] || []).push(SPORT[s.sport] || s.sport);
  const done = Object.keys(byDay).map(d => byDay[d].join(' and ') + ' ' + (d === data.today ? 'today' : wday(d))).join(', ');
  const lastList = ['run', 'bike', 'strength', 'swim'].filter(k => S[k].last).sort((a, b) => S[a].last.days_ago - S[b].last.days_ago);
  const agoDays = n => (n === 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago');
  html += '<div class="sec"><h2>Training</h2><span class="src">Strava</span></div><div class="grid">' +
    '<section class="card"><h3>This week</h3><div class="num">' + fmt(w.hours) + '<small>/ ' + fmt(w.step) + ' h step</small></div><p class="sub" style="margin:6px 0 0">' + (done || 'Nothing yet') + ' · ' + w.days_left + ' day' + (w.days_left === 1 ? '' : 's') + ' left</p></section>' +
    '<section class="card"><h3>Last 4 weeks</h3><div class="num">' + fmt(h.recent.hours) + '<small>h a week</small></div><p class="sub" style="margin:6px 0 0">4 weeks before: ' + fmt(h.before_recent.hours) + ' h · e-bike included</p></section>' +
    '<section class="card"><h3>Last session</h3><dl class="kv" style="margin-top:4px">' + (lastList.length ? lastList.map(k => '<dt>' + SPORT[k] + '</dt><dd>' + agoDays(S[k].last.days_ago) + '</dd>').join('') : '<dt>None in 12 weeks</dt><dd></dd>') + '</dl></section></div>';
  const chartWeeks = h.weeks.slice(-8).concat([{ ...h.current_week, current: true }]);
  html += '<section class="card"><h3>Hours per week</h3>' + chart('weeks', chartWeeks, h.targets.weekly_hours) + '<div class="legend">' + Object.keys(SPORT).filter(k => chartWeeks.some(x => x.minutes[k])).map(k => '<span><i style="background:' + SPORT_COL[k] + '"></i>' + SPORT[k] + '</span>').join('') + '<span><i class="dash"></i>' + h.targets.weekly_hours + ' h goal</span></div></section>';
  const bodyCard = (title, b, unit, color, ref) => '<section class="card"><div class="chead"><div><h3>' + title + '</h3><div class="num">' + (b.latest ? fmt(b.latest.value) : '–') + '<small>' + unit + (ref !== undefined ? ' · target ' + ref + '%' : '') + '</small></div></div><span class="sub">' +
    (b.week_avg !== null ? 'Week average ' + fmt(b.week_avg) + (unit === '%' ? '%' : '') : 'No weigh-in this week') + (b.month_change !== null ? ' · ' + signed(b.month_change, 1) + (unit === '%' ? '' : ' kg') + ' on a month ago' : '') + '</span></div>' +
    chart('body', b.series, { color, unit: unit === '%' ? '%' : ' kg', ref }) + '</section>';
  html += '<div class="sec"><h2>Body</h2><span class="src">Withings</span></div><div class="two">' + bodyCard('Weight', h.weight, 'kg', 'var(--fit)') + bodyCard('Body fat', h.body_fat, '%', 'var(--fat)', h.body_fat.target) + '</div>';
  html += '<details class="explain"><summary>How this tab reads the numbers</summary><ol>' +
    '<li><b>Recovery today.</b> Last night\\'s sleep, HRV and resting heart rate, each against your own average over the 30 nights before. A signal is low when sleep is 45 minutes short, HRV 10% lower or resting heart rate 3 bpm higher. None low reads Good to go, one Go steady, two or more Take it easy. The note is written lines in Goggins\\' voice filled in with your numbers; no AI.</li>' +
    '<li><b>Recovering.</b> When your 7-night resting heart rate is 2 bpm or more above usual, or Recovery today says Take it easy. The training flags pause meanwhile and come back after 3 normal days.</li>' +
    '<li><b>Health quests.</b> Each active quest on your Health Journey (never the Main Quest) gets a card that answers its own pass/fail question.</li>' +
    '<li><b>Steps.</b> Each week is judged against a step: your last 4 full weeks plus 10%, never above ' + h.targets.weekly_hours + ' h. A missed step shows on the bar, never as a flag. E-bike rides count.</li>' +
    '<li><b>Half marathon runs.</b> A long run is a run of 60 minutes or 10 km; an interval run has intervals, reps, tempo, track or a distance like 400m in its name.</li>' +
    '<li><b>Form.</b> TSB is fitness minus fatigue, day by day from the Strava sync\\'s effort scores. Fresh above 0, neutral to −10, building to −30, overreaching below that.</li>' +
    '<li><b>Watch items.</b> Only things that need you show up here, and they feed the Health dot and the Quest log page.</li></ol></details>';
  return html + '<p><a class="src" href="' + D1_CONSOLE + '" target="_blank" rel="noopener">Workouts, Body Metrics, Sleep &amp; Recovery and quests in D1 ↗</a></p>';
}

// ---- System health ----
function renderSystem(s) {
  const u = s.usage;
  let html = '<h2 style="display:flex;justify-content:space-between;align-items:center">Is the system healthy? ' + tag(s.status) + '</h2>' + flagList(s.flags);
  html += '<h2>At a glance</h2><div class="grid">';
  html += '<div class="card"><h3>Failures</h3><div class="big">' + s.failures.last_24h + ' <span class="sub">in 24 h</span></div><div class="sub">' + s.failures.last_7d + ' in 7 days' + (s.failures.since ? ' · counted since ' + day(s.failures.since) : '') + '</div></div>';
  html += '<div class="card"><h3>Stale integrations</h3><div class="big">' + s.processes.filter(p => (p.key === 'strava' || p.key === 'withings') && p.level !== 'ok').length + '</div><div class="sub">Strava and Withings syncs (Quest Engine)</div></div>';
  html += '<div class="card"><h3>API / AI cost, ' + esc(u.month) + '</h3><div class="big">$' + fmt(u.cost, 2) + '</div><div class="sub">Estimate · ' + u.chat_calls + ' chat calls, ' + u.images + ' images, ' + u.videos + ' clips' + (u.previous_cost !== null ? ' · last month $' + fmt(u.previous_cost, 2) : '') + (u.since ? ' · counted since ' + day(u.since) : ' · counting starts with the next paid call') + '</div></div>';
  html += '</div>';
  html += '<h2>Processes</h2><div class="card">' + s.processes.map(p => {
    const jobs = p.jobs || [];
    const name = jobs.length ? '<button type="button" class="open" aria-expanded="' + opened.has(p.key) + '" data-proc="' + esc(p.key) + '">' + esc(p.name) + '<span class="chev" aria-hidden="true">▸</span></button>' : esc(p.name);
    return '<div class="proc' + (opened.has(p.key) ? ' opened' : '') + '"><span class="dot" style="margin-top:7px;background:var(--' + (p.level === 'attention' ? 'crit' : p.level === 'watch' ? 'warnfill' : 'good') + ')" data-tip="' + LABEL[p.level] + '"></span><span class="n">' + name + (p.enabled === false ? ' <span class="muted" style="font-weight:400">(switched off)</span>' : '') + '</span><span class="when" data-tip="' + esc(p.last_ok || '') + '">' + (p.last_ok ? ago(p.last_ok) : '–') + '</span><span class="d">' + esc(p.detail) + (p.note ? ' · ' + esc(p.note) : '') + '</span>' + (p.problem ? '<span class="p">' + esc(p.problem) + '</span>' : '') +
      (jobs.length ? '<div class="jobs"' + (opened.has(p.key) ? '' : ' hidden') + '>' + jobs.map(j => '<div class="job" data-job="' + esc(j.id) + '" data-name="' + esc(j.name) + '" data-paid="' + (j.paid ? 1 : 0) + '" data-dry="' + (j.dry ? 1 : 0) + '"><div><span class="jn">' + esc(j.name) + '</span>' + (j.paid ? '<span class="paid">paid</span>' : '') + '<div class="jm">' + esc(j.note) + '</div></div><button type="button" class="jbtn" data-act="ask">Rerun</button></div>').join('') + '</div>' : '') + '</div>';
  }).join('') + '</div>';
  if (s.checks.length) html += '<h2>healthchecks.io</h2><div class="card scroll"><table><thead><tr><th>Check</th><th>State</th><th class="num">Last ping</th></tr></thead><tbody>' + s.checks.map(c => '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.status) + '</td><td class="num">' + ago(c.last_ping) + '</td></tr>').join('') + '</tbody></table></div>';
  if (s.failures.recent.length) html += '<h2>Recent failures</h2><div class="card scroll"><table><tbody>' + s.failures.recent.map(f => '<tr><td>' + ago(f.at) + '</td><td>' + esc(f.slug) + '</td><td>' + esc(f.message) + '</td></tr>').join('') + '</tbody></table></div>';
  return html + '<p><a class="src" href="https://dash.cloudflare.com/" target="_blank" rel="noopener">Cloudflare ↗</a> · <a class="src" href="https://eu2.make.com/" target="_blank" rel="noopener">Make ↗</a> · <a class="src" href="' + QUEST_ENGINE_DOC + '" target="_blank" rel="noopener">Quest Engine doc ↗</a></p>';
}

// ---- rerun a scheduled job (System health; POST /run) ----
const opened = new Set();
document.addEventListener('click', async e => {
  const open = e.target.closest('button.open');
  if (open) {
    const k = open.dataset.proc, proc = open.closest('.proc');
    if (opened.has(k)) opened.delete(k); else opened.add(k);
    proc.classList.toggle('opened', opened.has(k));
    open.setAttribute('aria-expanded', opened.has(k));
    proc.querySelector('.jobs').hidden = !opened.has(k);
    return;
  }
  const b = e.target.closest('.job button[data-act]');
  if (!b) return;
  const job = b.closest('.job'), act = b.dataset.act;
  job.querySelectorAll('.ask,.res').forEach(x => x.remove());
  if (act === 'cancel') return;
  if (act === 'ask') {
    const ask = document.createElement('div');
    ask.className = 'ask';
    ask.innerHTML = '<div><b>Rerun ' + esc(job.dataset.name) + ' now?</b> ' + (job.dataset.paid === '1' ? 'This makes a paid OpenAI call.' : 'No paid calls.') + '</div><div class="row"><button type="button" class="jbtn go" data-act="run">Rerun</button>' + (job.dataset.dry === '1' ? '<button type="button" class="jbtn" data-act="dry">Test first</button>' : '') + '<button type="button" class="jbtn" data-act="cancel">Cancel</button></div>';
    job.appendChild(ask);
    return;
  }
  const res = document.createElement('div');
  res.className = 'res';
  res.textContent = act === 'dry' ? 'Testing…' : 'Running…';
  job.appendChild(res);
  job.querySelectorAll('button').forEach(x => { x.disabled = true; });
  try {
    const r = await fetch('/run', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job: job.dataset.job, dry: act === 'dry' }) });
    if (r.status === 401) { location.href = '/login?next=/admin'; return; }
    const out = await r.json().catch(() => ({ ok: 0, text: 'No answer (' + r.status + ').' }));
    res.className = 'res ' + (out.ok ? 'ok' : 'bad');
    res.textContent = out.text || (out.ok ? 'Done.' : 'It did not run.');
    if (out.ok && act === 'run') { const keep = res.textContent; await load(true); const again = document.querySelector('.job[data-job="' + job.dataset.job + '"]'); if (again) { const r2 = document.createElement('div'); r2.className = 'res ok'; r2.textContent = keep; again.appendChild(r2); } }
  } catch (err) {
    res.className = 'res bad';
    res.textContent = 'Could not reach the dashboard: ' + err.message;
  } finally { job.querySelectorAll('button').forEach(x => { x.disabled = false; }); }
});

// ---- shell ----
const TABS = ['cross', 'health', 'system', 'links'];
let data = null;
function show() {
  const tab = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'cross';
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
  $('#notice').innerHTML = d.errors.length ? '<div class="err">Some sources could not be read: ' + esc(d.errors.join('; ')) + '</div>' : '';
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
    if (r.status === 401) { location.href = '/login?next=/admin'; return; }
    data = await r.json();
    render();
  } catch (e) {
    $('#notice').innerHTML = '<div class="err">Could not load the dashboard: ' + esc(e.message) + '</div>';
  } finally { $('#reload').disabled = false; }
}
addEventListener('hashchange', show);
$('#reload').addEventListener('click', () => load(true));
show(); load(true);
`;

const linkCards = LINKS.map(g => `<div class="card"><h3>${g.group}</h3><ul>${g.items.map(i => `<li><a href="${i.url}" target="_blank" rel="noopener">${i.name} ↗</a></li>`).join('')}</ul></div>`).join('');

export const dashboardHtml = () => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><title>Admin cockpit</title>
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Admin"><meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#f9f9f7" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0d0d0d" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='6' fill='%232a78d6'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,600&family=Barlow:wght@400;500;600;700&display=swap">
<style>${STYLE}${HEALTH_STYLE}</style></head><body>
<header><div class="bar"><a class="home" href="/">‹ Quest log</a><h1>Admin cockpit</h1><div class="meta"><span id="stamp">Loading…</span><button id="reload" type="button">Refresh</button><form method="post" action="/logout" style="margin:0"><button type="submit">Sign out</button></form></div></div>
<nav><a href="#cross"><span class="unknown"><span class="dot"></span></span><span class="long">Cross Border</span><span class="short">Border</span></a><a href="#health"><span class="unknown"><span class="dot"></span></span>Health</a><a href="#system"><span class="unknown"><span class="dot"></span></span><span class="long">System Health</span><span class="short">System</span></a><a href="#links"><span class="long">Quick Links</span><span class="short">Links</span></a></nav></header>
<main><div id="notice"></div><section id="cross"><p class="empty">Loading…</p></section><section id="health" hidden></section><section id="system" hidden></section>
<section id="links" hidden><h2>Quick links</h2><div class="links">${linkCards}</div></section></main>
<div id="tip" role="tooltip"></div>
<script>${SCRIPT}</script></body></html>`;

export const loginHtml = (error = '', next = '/') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Admin cockpit</title>
<style>${STYLE}
form{max-width:340px;margin:18vh auto 0;padding:0 16px;display:flex;flex-direction:column;gap:10px}
input{font:inherit;padding:10px 12px;border-radius:8px;border:1px solid var(--axis);background:var(--surface);color:var(--ink)}
button{font:inherit;padding:10px 12px;border-radius:8px;border:0;background:var(--ink);color:var(--page);font-weight:600;cursor:pointer}</style></head>
<body><form method="post" action="/login"><input type="hidden" name="next" value="${['/questlog', '/admin', '/journal', '/gym'].includes(next) ? next : '/'}"><h1 style="font-size:18px;margin:0 0 4px">Sign in</h1>
<label class="sub" for="t">Password</label><input id="t" name="password" type="password" autocomplete="current-password" required autofocus>
${error ? `<p class="sub" style="color:var(--crit);margin:0">${error}</p>` : ''}<button type="submit">Sign in</button></form></body></html>`;
