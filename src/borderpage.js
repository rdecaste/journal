// The Cross Border tab on /admin: "Border days" (Roy, 4 Oct 2026, from the
// mockup https://claude.ai/artifact/MiRWaZN6kiy2GRku3PgiDq). One calm card
// with the Belgium share, the 50% line, the buffer, where 31 Dec is heading
// and the days still to fill in; then three views of the Work Location Log
// that Roy can edit: Calendar (a month), Week list (rows with drop-downs) and
// Year planner (paint days). Every edit updates the numbers at once; Save
// writes the changed days through POST /border/save (src/border.js). The
// numbers are the same sums as crossBorder() in src/metrics.js.
// Below the views, the old tab's totals and month table stay in a fold.

import { WORK } from './journal.js';
import { LOCATIONS, ebikeDay } from './config.js';

// The Work Location Log's place options, how the view names and colours them.
const LOOK = {
  '🇧🇪 Beerse': ['Beerse', 'be'], '🇧🇪 Ghent': ['Ghent', 'be'], '🇳🇱 Home': ['Home', 'nl'],
  '✈️ Travel': ['Travel', 'tr'], '🏖️ Holiday': ['Holiday', 'ho'], '🎉 Public holiday': ['Public holiday', 'pu']
};
const ORDER = ['🇧🇪 Beerse', '🇧🇪 Ghent', '🇳🇱 Home', '✈️ Travel', '🏖️ Holiday', '🎉 Public holiday'];
export const BORDER_PLACES = ORDER.filter(v => WORK.places.includes(v)).map(v => ({
  v, name: LOOK[v][0], cls: LOOK[v][1], kind: LOCATIONS[v], flag: v.split(' ')[0]
}));
export const BORDER_RIDES = WORK.rides.map(v => ({ v, name: v === 'N/A' ? 'No commute' : v }));

const TOKENS = `--bd-card:#ffffff;--bd-ink:#22252b;--bd-ink2:#5b6069;--bd-muted:#9097a1;--bd-line:#e4e7ec;--bd-soft:#f4f5f7;--bd-shadow:0 1px 2px rgba(30,40,60,.04),0 8px 28px rgba(30,40,60,.06);
--bd-be:#4d6fa8;--bd-be-f:#dfe7f4;--bd-be-i:#2e4a7a;--bd-nl:#d9814f;--bd-nl-f:#f8e6da;--bd-nl-i:#94491f;--bd-ho:#6f9a7c;--bd-ho-f:#e3eee6;--bd-ho-i:#3f6a4c;
--bd-pu:#8a78b8;--bd-pu-f:#ebe6f5;--bd-pu-i:#58488a;--bd-tr:#a19d94;--bd-tr-f:#eeece8;--bd-tr-i:#625e56;--bd-fix:#c85a5a;--bd-fix-f:#fbecec;--bd-ok:#4f8a5f;
--bd-serif:"Source Serif 4","Iowan Old Style",Georgia,serif;--bd-sans:-apple-system,system-ui,"Segoe UI",Roboto,sans-serif`;
const DARK = `--bd-card:#1b1f27;--bd-ink:#eceef2;--bd-ink2:#b3b8c2;--bd-muted:#7c838f;--bd-line:#2a2f39;--bd-soft:#121419;--bd-shadow:none;
--bd-be:#7d9bd0;--bd-be-f:#22304a;--bd-be-i:#b9cbeb;--bd-nl:#e39a70;--bd-nl-f:#3a2a22;--bd-nl-i:#f2c0a2;--bd-ho:#86b394;--bd-ho-f:#1f2e25;--bd-ho-i:#b3d6bd;
--bd-pu:#a796d4;--bd-pu-f:#2a2539;--bd-pu-i:#cfc3ee;--bd-tr:#8d8a83;--bd-tr-f:#26262a;--bd-tr-i:#c4c0b8;--bd-fix:#e07e7e;--bd-fix-f:#3a1f22;--bd-ok:#86b394`;

export const BORDER_STYLE = `
/* ---- Cross Border tab: Border days ---- */
:root{${TOKENS}}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){${DARK}}}
:root[data-theme="dark"]{${DARK}}
#cross:not([hidden]){display:flex;flex-direction:column;gap:22px;max-width:760px;margin:0 auto;font:16px/1.5 var(--bd-serif);color:var(--bd-ink)}
#cross button,#bd-layer button{font:inherit;color:inherit}
#cross button:focus-visible,#cross select:focus-visible,#bd-layer button:focus-visible,#bd-layer input:focus-visible{outline:2px solid var(--bd-be);outline-offset:2px}
.bd-small{font:500 12px var(--bd-sans);letter-spacing:.02em;color:var(--bd-muted)}
.bd-hero,.bd-panel{background:var(--bd-card);border-radius:22px;box-shadow:var(--bd-shadow);border:1px solid var(--bd-line)}
.bd-hero{padding:24px 24px 20px;display:flex;flex-direction:column;gap:16px}
.bd-big{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.bd-big b{font:500 64px/1 var(--bd-serif);letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--bd-be-i)}
.bd-big span{font-size:17px;color:var(--bd-ink2);max-width:30ch}
.bd-was{font:500 12px var(--bd-sans);color:var(--bd-muted);margin-left:2px}
.bd-bar{position:relative;height:14px;border-radius:999px;background:var(--bd-nl-f)}
.bd-bar .b{position:absolute;inset:0 auto 0 0;border-radius:999px;background:var(--bd-be);transition:width .4s ease}
.bd-bar .mark{position:absolute;top:-5px;bottom:-5px;width:2px;background:var(--bd-ink);opacity:.55;border-radius:2px}
.bd-barlab{position:relative;display:flex;justify-content:space-between;font:500 12px var(--bd-sans);color:var(--bd-muted);margin-top:-8px}
.bd-barlab .c{position:absolute;transform:translateX(-50%)}
.bd-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;border-top:1px solid var(--bd-line);padding-top:14px}
.bd-fact{min-width:0;display:flex;flex-direction:column;gap:1px}
.bd-fact b{font:500 22px/1.2 var(--bd-serif);font-variant-numeric:tabular-nums}
.bd-fact b small{font-size:14px;color:var(--bd-ink2);font-weight:400}
.bd-fact.fixit b{color:var(--bd-fix)}
#cross .bd-fact .go{all:unset;cursor:pointer;color:var(--bd-fix);font:500 12px var(--bd-sans);text-decoration:underline;text-underline-offset:2px}
.bd-switch{display:flex;justify-content:center}
.bd-switch div{display:inline-flex;gap:2px;background:var(--bd-card);border-radius:999px;padding:4px;box-shadow:var(--bd-shadow);border:1px solid var(--bd-line)}
.bd-switch button{border:0;background:none;cursor:pointer;font:500 14px var(--bd-sans)!important;color:var(--bd-ink2)!important;padding:8px 16px;border-radius:999px;white-space:nowrap}
.bd-switch button[aria-pressed="true"]{background:var(--bd-ink);color:var(--bd-card)!important}
.bd-note{margin:-8px 0 0;text-align:center;font-size:15px;color:var(--bd-ink2);font-style:italic;text-wrap:balance}
.bd-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 16px;font:500 12px var(--bd-sans);color:var(--bd-ink2)}
.bd-legend span{display:inline-flex;align-items:center;gap:6px}
.bd-dot{width:10px;height:10px;border-radius:50%;display:inline-block;flex:none}
.bd-d-be{background:var(--bd-be)}.bd-d-nl{background:var(--bd-nl)}.bd-d-ho{background:var(--bd-ho)}.bd-d-pu{background:var(--bd-pu)}.bd-d-tr{background:var(--bd-tr)}.bd-d-{background:none;box-shadow:inset 0 0 0 1.5px var(--bd-muted)}
.bd-f-be{background:var(--bd-be-f);color:var(--bd-be-i)}.bd-f-nl{background:var(--bd-nl-f);color:var(--bd-nl-i)}.bd-f-ho{background:var(--bd-ho-f);color:var(--bd-ho-i)}.bd-f-pu{background:var(--bd-pu-f);color:var(--bd-pu-i)}.bd-f-tr{background:var(--bd-tr-f);color:var(--bd-tr-i)}
.bd-f-{background:none;color:var(--bd-muted);box-shadow:inset 0 0 0 1px var(--bd-line)}
.bd-panel{padding:20px}
.bd-mhead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
.bd-mhead h3{margin:0;font:500 24px var(--bd-serif)}
.bd-mhead .bd-small{display:block;margin-top:2px}
.bd-arrows{display:flex;gap:6px}
.bd-arr{width:38px;height:38px;border-radius:50%;border:1px solid var(--bd-line);background:var(--bd-card);cursor:pointer;font:18px var(--bd-sans)!important;color:var(--bd-ink2)!important}
.bd-arr:disabled{opacity:.3;cursor:default}
.bd-cal{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
.bd-wdn{font:500 11px var(--bd-sans);letter-spacing:.06em;text-transform:uppercase;color:var(--bd-muted);text-align:center}
.bd-day{position:relative;border:0;background:none;padding:0;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:5px;min-width:0}
.bd-day .num{display:flex;justify-content:space-between;align-items:center;gap:4px;font:500 15px var(--bd-serif);color:var(--bd-ink2);padding-inline:2px}
.bd-day .num i{font-style:normal;font-size:12px;opacity:.8}
.bd-pill{height:58px;border-radius:12px;display:flex;flex-direction:column;overflow:hidden;transition:transform .12s ease}
.bd-day:hover .bd-pill{transform:translateY(-1px)}
.bd-pill span{flex:1;display:flex;align-items:center;justify-content:center;font:500 12px var(--bd-sans);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-inline:4px}
.bd-pill span+span{border-top:1px solid var(--bd-card)}
.bd-day.fix .bd-pill{background:var(--bd-fix-f);box-shadow:inset 0 0 0 1.5px var(--bd-fix);color:var(--bd-fix)}
.bd-day.today .num{color:var(--bd-ink);font-weight:600}
.bd-day.today .num::after{content:"today";font:600 10px var(--bd-sans);letter-spacing:.06em;text-transform:uppercase;color:var(--bd-card);background:var(--bd-ink);border-radius:999px;padding:1px 6px}
.bd-day.blank{visibility:hidden}
.bd-edited{position:absolute;top:2px;right:2px;width:7px;height:7px;border-radius:50%;background:var(--bd-nl)}
.bd-mfoot{margin-top:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;font:500 13px var(--bd-sans);color:var(--bd-ink2)}
.bd-mbar{flex:1 1 140px;height:6px;border-radius:999px;background:var(--bd-nl-f);overflow:hidden;min-width:100px;display:block}
.bd-mbar i{display:block;height:100%;background:var(--bd-be);border-radius:999px}
.bd-filters{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
.bd-chip{border:1px solid var(--bd-line);background:var(--bd-card);border-radius:999px;padding:7px 14px;font:500 13px var(--bd-sans)!important;color:var(--bd-ink2)!important;cursor:pointer}
.bd-chip[aria-pressed="true"]{background:var(--bd-ink);border-color:var(--bd-ink);color:var(--bd-card)!important}
.bd-wk+.bd-wk{margin-top:18px}
.bd-wkh{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:0 4px 8px;border-bottom:1px solid var(--bd-line)}
.bd-wkh b{font:500 17px var(--bd-serif)}
.bd-row{position:relative;display:grid;grid-template-columns:80px repeat(3,minmax(0,1fr));gap:10px;align-items:center;padding:10px 4px;border-bottom:1px solid var(--bd-line)}
.bd-row:last-child{border-bottom:0}
.bd-row .dl{font:500 16px var(--bd-serif)}
.bd-row .dl small{display:block;font:500 11px var(--bd-sans);color:var(--bd-muted);letter-spacing:.02em}
.bd-row.today .dl small{color:var(--bd-ink)}
.bd-sel{position:relative;min-width:0}
.bd-sel select{appearance:none;-webkit-appearance:none;width:100%;border:0;border-radius:10px;padding:9px 26px 9px 12px;font:500 14px var(--bd-sans);cursor:pointer;min-width:0;text-overflow:ellipsis}
.bd-sel::after{content:"";position:absolute;right:11px;top:50%;width:6px;height:6px;border-right:1.5px solid var(--bd-ink2);border-bottom:1.5px solid var(--bd-ink2);transform:translateY(-70%) rotate(45deg);opacity:.5;pointer-events:none}
.bd-sel select.ride{background:var(--bd-soft);color:var(--bd-ink2)}
.bd-row.fix .bd-sel select.bd-f-{box-shadow:inset 0 0 0 1.5px var(--bd-fix);color:var(--bd-fix);background:var(--bd-fix-f)}
.bd-row .bd-edited{left:-6px;right:auto;top:50%;margin-top:-3px}
.bd-empty{text-align:center;padding:24px;color:var(--bd-ink2);font-style:italic;margin:0}
.bd-brushes{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
.bd-brush{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--bd-line);background:var(--bd-card);border-radius:999px;padding:7px 13px 7px 10px;font:500 13px var(--bd-sans)!important;color:var(--bd-ink2)!important;cursor:pointer}
.bd-brush[aria-pressed="true"]{border-color:var(--bd-ink);color:var(--bd-ink)!important;box-shadow:inset 0 0 0 1px var(--bd-ink)}
.bd-optline{display:flex;justify-content:center;margin:12px 0 4px}
.bd-tog{display:inline-flex;align-items:center;gap:8px;font:500 13px var(--bd-sans);color:var(--bd-ink2);cursor:pointer}
.bd-plan{display:flex;flex-direction:column;gap:14px;margin-top:16px;touch-action:none;user-select:none;-webkit-user-select:none}
.bd-mrow{display:grid;grid-template-columns:40px minmax(0,1fr) 70px;gap:10px;align-items:center}
.bd-mrow .ml{font:500 16px var(--bd-serif);color:var(--bd-ink2)}
.bd-mrow .mp{display:flex;flex-direction:column;align-items:flex-end;gap:4px;font:500 14px var(--bd-serif);font-variant-numeric:tabular-nums}
.bd-mrow .mp .bd-mbar{width:100%;flex:none;height:4px;min-width:0}
.bd-dots{display:flex;flex-wrap:wrap;gap:4px 10px}
.bd-dw{display:flex;gap:4px}
.bd-sq{position:relative;width:20px;height:20px;border-radius:50%;overflow:hidden;display:flex;flex-direction:column;cursor:pointer;transition:transform .12s}
.bd-sq:hover{transform:scale(1.15)}
.bd-sq span{flex:1}
.bd-sq span.bd-d-{box-shadow:none;background:var(--bd-soft)}
.bd-sq.past{opacity:.5}
.bd-sq.fix{box-shadow:0 0 0 2px var(--bd-fix);opacity:1}
.bd-sq.fix span{background:var(--bd-fix-f)}
.bd-sq.today{box-shadow:0 0 0 2px var(--bd-card),0 0 0 3.5px var(--bd-ink)}
.bd-sq.changed{box-shadow:0 0 0 2px var(--bd-card),0 0 0 3.5px var(--bd-nl);opacity:1}
.bd-hint{text-align:center;font-size:14px;color:var(--bd-muted);font-style:italic;margin:16px 0 0}
#cross details.bd-more{background:var(--bd-card);border:1px solid var(--bd-line);border-radius:22px;padding:14px 20px;font-family:var(--bd-sans)}
#cross details.bd-more summary{font:500 15px var(--bd-serif);color:var(--bd-ink2);padding:4px 0}
#cross details.bd-more h2{margin:18px 0 8px}
.bd-scrim{position:fixed;inset:0;background:rgba(18,20,25,.32);backdrop-filter:blur(2px);display:flex;align-items:flex-end;justify-content:center;z-index:20}
.bd-sheet{background:var(--bd-card);color:var(--bd-ink);width:min(480px,100%);border-radius:24px 24px 0 0;padding:22px 20px calc(20px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:18px;max-height:92%;overflow:auto;box-shadow:0 -10px 40px rgba(0,0,0,.12);font-family:var(--bd-serif)}
@media (min-width:700px){.bd-scrim{align-items:center}.bd-sheet{border-radius:24px}}
.bd-sheet h3{margin:0;font:500 26px var(--bd-serif)}
.bd-sheet .bd-small{margin-top:-14px}
.bd-field{display:flex;flex-direction:column;gap:8px}
.bd-field>span{font:600 11px var(--bd-sans);text-transform:uppercase;letter-spacing:.08em;color:var(--bd-muted)}
.bd-places{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.bd-place{border:0;border-radius:14px;padding:12px 8px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;font:500 13px var(--bd-sans)!important;opacity:.75;transition:opacity .12s,box-shadow .12s}
.bd-place em{font-style:normal;font-size:20px;line-height:1.2}
.bd-place[aria-pressed="true"]{opacity:1;box-shadow:inset 0 0 0 2px currentColor}
.bd-rides{display:flex;flex-wrap:wrap;gap:6px}
.bd-ride{border:1px solid var(--bd-line);background:var(--bd-card);border-radius:999px;padding:8px 14px;font:500 14px var(--bd-sans)!important;color:var(--bd-ink2)!important;cursor:pointer}
.bd-ride[aria-pressed="true"]{background:var(--bd-ink);border-color:var(--bd-ink);color:var(--bd-card)!important}
.bd-money{font-size:14px;color:var(--bd-ink2);font-style:italic;min-height:1.5em;margin-top:-6px}
.bd-foot{display:flex;justify-content:space-between;gap:10px;align-items:center}
.bd-btn{border:0;border-radius:999px;padding:12px 22px;font:600 15px var(--bd-sans)!important;cursor:pointer;background:var(--bd-ink);color:var(--bd-card)!important}
.bd-btn.ghost{background:none;color:var(--bd-ink2)!important;padding-inline:6px}
.bd-btn:disabled{opacity:.6;cursor:default}
.bd-save[hidden],.bd-toast[hidden]{display:none!important}
.bd-save{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(560px,calc(100% - 32px));background:var(--bd-ink);color:var(--bd-card);border-radius:999px;padding:8px 8px 8px 20px;display:flex;justify-content:space-between;align-items:center;gap:10px;z-index:15;box-shadow:0 10px 30px rgba(0,0,0,.18)}
.bd-save>span{font:500 14px var(--bd-sans)}
.bd-save .bd-btn{background:var(--bd-card);color:var(--bd-ink)!important;padding:9px 18px}
.bd-save .bd-btn.ghost{background:none;color:var(--bd-card)!important;opacity:.75}
.bd-toast{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:var(--bd-card);color:var(--bd-ink);padding:12px 18px;border-radius:16px;font:500 14px var(--bd-sans);z-index:25;width:max-content;max-width:calc(100% - 32px);box-shadow:var(--bd-shadow),0 0 0 1px var(--bd-line)}
.bd-toast.bad{color:var(--bd-fix)}
@media (prefers-reduced-motion:no-preference){.bd-sheet{animation:bdup .22s cubic-bezier(.2,.8,.2,1)}@keyframes bdup{from{transform:translateY(24px);opacity:.4}}}
@media (max-width:520px){.bd-big b{font-size:52px}.bd-facts{grid-template-columns:1fr 1fr;row-gap:12px}.bd-hero{padding:20px 18px 18px}.bd-panel{padding:14px;border-radius:18px}
.bd-cal{gap:5px}.bd-pill{height:48px;border-radius:9px}.bd-pill span{font-size:0}.bd-day .num{font-size:13px}.bd-day .num i{display:none}.bd-day.today .num::after{content:"";width:6px;height:6px;padding:0}
.bd-sq{width:16px;height:16px}.bd-dots{gap:3px 7px}.bd-dw{gap:3px}.bd-mrow{grid-template-columns:30px minmax(0,1fr) 44px;gap:6px}.bd-mrow .ml{font-size:14px}}
@media (max-width:560px){.bd-row{grid-template-columns:1fr 1fr 1fr;gap:6px}.bd-row .dl{grid-column:1/-1;display:flex;gap:8px;align-items:baseline}.bd-row .dl small{display:inline}.bd-sel select{padding:8px 22px 8px 9px;font-size:13px}}
@media (max-width:420px){.bd-switch button{padding:8px 12px;font-size:13px!important}}
`;

// Fixed layers outside the tab: the edit sheet, the Save pill and its message.
export const BORDER_LAYER = '<div id="bd-layer"><div id="bd-sheet"></div><div class="bd-save" id="bd-save" hidden><span id="bd-savemsg"></span><span style="display:flex;gap:4px"><button class="bd-btn ghost" id="bd-undo" type="button">Undo</button><button class="bd-btn" id="bd-go" type="button">Save</button></span></div><div class="bd-toast" id="bd-toast" role="status" hidden></div></div>';

// Runs in the browser, inside the dashboard's script ($, esc, fmt, day, D1_CONSOLE come from there).
export const BORDER_SCRIPT = `
// ---- Cross Border tab: Border days ----
const BD_PLACES = ${JSON.stringify(BORDER_PLACES)};
const BD_RIDES = ${JSON.stringify(BORDER_RIDES)};
const BD_EBIKE_DAY = ${JSON.stringify(ebikeDay())};
const BD_E_BIKE = ${JSON.stringify(WORK.rides[0])};
const BD_PLACE = Object.fromEntries(BD_PLACES.map(p => [p.v, p]));
const BD_MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const BD_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const BD_WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const BD_WDL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const BD_NOTES = { a: 'One month at a time. Tap a day to change it.', b: 'Every day as a row, newest first. Quickest for filling in gaps.', c: 'The whole year at a glance. Pick a place and paint days to plan ahead.' };
const bdPad = n => String(n).padStart(2, '0');
const bdAdd = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const bdWd = s => new Date(s + 'T12:00:00Z').getUTCDay();
const bdNice = s => BD_WD[bdWd(s)] + ' ' + (+s.slice(8)) + ' ' + BD_MON[+s.slice(5, 7) - 1];
const bdLong = s => BD_WDL[bdWd(s)] + ' ' + (+s.slice(8)) + ' ' + BD_MONTHS[+s.slice(5, 7) - 1];
const bdNum = x => String(Math.round(x * 10) / 10);
const bdCls = v => (BD_PLACE[v] ? BD_PLACE[v].cls : '');
const bdName = v => (BD_PLACE[v] ? BD_PLACE[v].name : v || '');
const bdKind = v => (BD_PLACE[v] ? BD_PLACE[v].kind : '');
let bd = { c: null, orig: new Map(), days: new Map(), view: 'a', month: null, onlyFix: false, future: false, brush: BD_PLACES[0].v, half: false, painting: false, saving: false };
try { const v = localStorage.getItem('bd-view'); if (BD_NOTES[v]) bd.view = v; } catch (_) {}

// The tab's data from /data: every weekday from the start to 31 Dec, with
// the rows Roy filled in. Edits not yet saved survive a refresh.
function bdLoad(c) {
  const edits = [...bd.days].filter(([d]) => bdChanged(d));
  bd.c = c; bd.orig = new Map(); bd.today = c.day;
  const end = c.day.slice(0, 4) + '-12-31';
  for (let d = c.start; d <= end; d = bdAdd(d, 1)) if (bdWd(d) && bdWd(d) < 6) bd.orig.set(d, { am: '', pm: '', commute: '' });
  for (const r of c.days || []) if (bd.orig.has(r.date)) bd.orig.set(r.date, { am: r.am || '', pm: r.pm || '', commute: r.commute || '' });
  bd.days = new Map([...bd.orig].map(([k, v]) => [k, Object.assign({}, v)]));
  for (const [d, v] of edits) if (bd.days.has(d)) bd.days.set(d, v);
  if (bd.month === null) bd.month = c.day.slice(0, 7);
}
function bdChanged(d) { const a = bd.days.get(d), b = bd.orig.get(d); return !!a && !!b && (a.am !== b.am || a.pm !== b.pm || a.commute !== b.commute); }
const bdFix = d => d < bd.today && (!bdKind(bd.days.get(d).am) || !bdKind(bd.days.get(d).pm));

// Same sums as crossBorder() in src/metrics.js.
function bdStats(map) {
  const t = { be: 0, nl: 0, open: 0, fix: 0 }, plan = { be: 0, nl: 0 }, recent = { be: 0, nl: 0 };
  const from = bdAdd(bd.today, -7 * (bd.c.trend_weeks || 8));
  for (const [d, r] of map) for (const h of [r.am, r.pm]) {
    const k = bdKind(h);
    if (d < bd.today) { if (k === 'be' || k === 'nl') t[k] += 0.5; else if (!k) t.fix += 0.5; if (d >= from && (k === 'be' || k === 'nl')) recent[k] += 0.5; }
    else if (k === 'be' || k === 'nl') plan[k] += 0.5; else if (!k) t.open += 0.5;
  }
  const w = t.be + t.nl, T = bd.c.minimum / 100, share = w ? t.be / w : null;
  const rs = recent.be + recent.nl ? recent.be / (recent.be + recent.nl) : share;
  const pb = t.be + plan.be + (rs === null ? 0 : rs * t.open), pn = t.nl + plan.nl + (rs === null ? 0 : (1 - rs) * t.open);
  return { be: t.be, nl: t.nl, fix: t.fix, share, buffer: w ? Math.round(t.be / T - w) : null, beNeeded: w && t.be / w <= T ? Math.round((T * w - t.be) / (1 - T)) : 0, yearEnd: pb + pn ? pb / (pb + pn) : null };
}
function bdTally(list) {
  const t = { be: 0, nl: 0, other: 0, fix: 0 };
  for (const d of list) for (const h of [bd.days.get(d).am, bd.days.get(d).pm]) { const k = bdKind(h); if (k === 'be' || k === 'nl') t[k] += 0.5; else if (k) t.other += 0.5; else if (d < bd.today) t.fix += 0.5; }
  return t;
}
const bdShare = t => (t.be + t.nl ? Math.round(100 * t.be / (t.be + t.nl)) : null);
const bdMbar = t => '<span class="bd-mbar"><i style="width:' + (bdShare(t) || 0) + '%"></i></span>';

function bdHero() {
  const s = bdStats(bd.days), base = bdStats(bd.orig), pct = x => (x === null ? '–' : Math.round(100 * x) + '%');
  const was = (a, b, f) => (a !== null && b !== null && Math.round(a) !== Math.round(b) ? ' <span class="bd-was">was ' + f(b) + '</span>' : '');
  const first = [...bd.days.keys()].find(bdFix), sh = s.share === null ? 0 : Math.round(100 * s.share), line = bd.c.minimum;
  const buffer = s.buffer === null ? '<b>–</b><span class="bd-small">buffer</span>'
    : s.buffer >= 0 ? '<b>' + bdNum(s.buffer) + ' <small>days</small></b><span class="bd-small">buffer before ' + line + '%' + was(s.buffer, base.buffer, x => x) + '</span>'
    : '<b style="color:var(--bd-fix)">' + bdNum(s.beNeeded) + ' <small>BE days short</small></b><span class="bd-small">to get back above ' + line + '%</span>';
  return '<section class="bd-hero" aria-label="Where you stand">' +
    '<div class="bd-big"><b>' + pct(s.share) + '</b><span>of your work days since ' + (+bd.c.start.slice(8)) + ' ' + BD_MONTHS[+bd.c.start.slice(5, 7) - 1] + ' were in Belgium.' + was(s.share === null ? null : 100 * s.share, base.share === null ? null : 100 * base.share, x => Math.round(x) + '%') + '</span></div>' +
    '<div class="bd-bar" role="img" aria-label="' + sh + '% Belgium, line at ' + line + '%"><span class="b" style="width:' + sh + '%"></span><span class="mark" style="left:' + line + '%"></span></div>' +
    '<div class="bd-barlab"><span>🇧🇪 ' + bdNum(s.be) + ' days</span><span class="c" style="left:' + line + '%">' + line + '% line</span><span>' + bdNum(s.nl) + ' days 🇳🇱</span></div>' +
    '<div class="bd-facts"><div class="bd-fact">' + buffer + '</div>' +
    '<div class="bd-fact"><b>' + pct(s.yearEnd) + '</b><span class="bd-small">heading for 31 Dec' + was(s.yearEnd === null ? null : 100 * s.yearEnd, base.yearEnd === null ? null : 100 * base.yearEnd, x => Math.round(x) + '%') + '</span></div>' +
    (s.fix ? '<div class="bd-fact fixit"><b>' + bdNum(s.fix) + ' <small>to fill in</small></b><button class="go" type="button" data-bd-day="' + first + '">' + bdNice(first) + (s.fix > 1 ? ' and more' : '') + '</button></div>'
      : '<div class="bd-fact"><b style="color:var(--bd-ok)">All set</b><span class="bd-small">every past day filled in</span></div>') +
    '</div></section>';
}

function bdCalendar() {
  const key = bd.month, list = [...bd.days.keys()].filter(d => d.startsWith(key)), t = bdTally(list);
  const months = [...new Set([...bd.days.keys()].map(d => d.slice(0, 7)))], i = months.indexOf(key);
  let h = '<div class="bd-panel"><div class="bd-mhead"><div><h3>' + BD_MONTHS[+key.slice(5) - 1] + '</h3><span class="bd-small">' + bdNum(t.be) + ' in Belgium · ' + bdNum(t.nl) + ' at home' + (t.other ? ' · ' + bdNum(t.other) + ' off' : '') + '</span></div>' +
    '<div class="bd-arrows"><button class="bd-arr" type="button" data-bd-month="' + (months[i - 1] || '') + '" aria-label="Previous month"' + (i <= 0 ? ' disabled' : '') + '>‹</button><button class="bd-arr" type="button" data-bd-month="' + (months[i + 1] || '') + '" aria-label="Next month"' + (i >= months.length - 1 ? ' disabled' : '') + '>›</button></div></div><div class="bd-cal">';
  h += ['Mon','Tue','Wed','Thu','Fri'].map(n => '<div class="bd-wdn">' + n + '</div>').join('');
  for (let k = 0; list.length && k < bdWd(list[0]) - 1; k++) h += '<div class="bd-day blank"></div>';
  for (const d of list) {
    const r = bd.days.get(d), fix = bdFix(d), whole = r.am === r.pm;
    const pill = fix ? '<span>+ add</span>' : whole ? '<span>' + esc(bdName(r.am)) + '</span>' : '<span class="bd-f-' + bdCls(r.am) + '">' + esc(bdName(r.am)) + '</span><span class="bd-f-' + bdCls(r.pm) + '">' + esc(bdName(r.pm)) + '</span>';
    const ride = r.commute && r.commute !== 'N/A' ? esc(r.commute.split(' ')[0]) : '';
    h += '<button type="button" class="bd-day' + (fix ? ' fix' : '') + (d === bd.today ? ' today' : '') + '" data-bd-day="' + d + '" aria-label="' + bdLong(d) + '"><span class="num">' + (+d.slice(8)) + '<i>' + ride + '</i></span><span class="bd-pill' + (fix ? '' : whole ? ' bd-f-' + bdCls(r.am) : '') + '">' + pill + '</span>' + (bdChanged(d) ? '<span class="bd-edited"></span>' : '') + '</button>';
  }
  return h + '</div><div class="bd-mfoot"><span>' + (bdShare(t) === null ? 'Nothing filled in yet' : bdShare(t) + '% Belgium this month') + '</span>' + bdMbar(t) + (t.fix ? '<span style="color:var(--bd-fix)">' + bdNum(t.fix) + ' to fill in</span>' : '') + '</div></div>';
}

function bdList() {
  const opts = (sel, list, ph) => '<option value="">' + ph + '</option>' + list.map(o => '<option value="' + esc(o.v) + '"' + (sel === o.v ? ' selected' : '') + '>' + esc(o.flag ? o.flag + ' ' + o.name : o.name) + '</option>').join('') + (sel && !list.some(o => o.v === sel) ? '<option selected value="' + esc(sel) + '">' + esc(sel) + '</option>' : '');
  let h = '<div class="bd-filters"><button type="button" class="bd-chip" data-bd-filter="onlyFix" aria-pressed="' + bd.onlyFix + '">Only days to fill in</button><button type="button" class="bd-chip" data-bd-filter="future" aria-pressed="' + bd.future + '">Include planned weeks</button></div><div class="bd-panel" style="margin-top:14px">';
  const all = [...bd.days.keys()].filter(d => (bd.future || d < bdAdd(bd.today, 7)) && (!bd.onlyFix || bdFix(d))).reverse();
  const weeks = new Map();
  for (const d of all) { const mon = bdAdd(d, -((bdWd(d) + 6) % 7)); if (!weeks.has(mon)) weeks.set(mon, []); weeks.get(mon).push(d); }
  if (!all.length) h += '<p class="bd-empty">Nothing to fill in. Every past work day is done.</p>';
  for (const [mon, ds] of weeks) {
    const t = bdTally(ds);
    h += '<div class="bd-wk"><div class="bd-wkh"><b>Week of ' + (+mon.slice(8)) + ' ' + BD_MONTHS[+mon.slice(5, 7) - 1] + '</b><span class="bd-small">' + bdNum(t.be) + ' BE · ' + bdNum(t.nl) + ' NL</span></div>';
    for (const d of ds.reverse()) {
      const r = bd.days.get(d);
      h += '<div class="bd-row' + (bdFix(d) ? ' fix' : '') + (d === bd.today ? ' today' : '') + '">' + (bdChanged(d) ? '<span class="bd-edited"></span>' : '') + '<div class="dl">' + BD_WD[bdWd(d)] + ' ' + (+d.slice(8)) + '<small>' + (d === bd.today ? 'today' : d > bd.today ? 'planned' : BD_MON[+d.slice(5, 7) - 1]) + '</small></div>' +
        '<div class="bd-sel"><select class="bd-f-' + bdCls(r.am) + '" id="bd-am-' + d + '" aria-label="Morning, ' + bdNice(d) + '" data-bd-set="am" data-bd-date="' + d + '">' + opts(r.am, BD_PLACES, 'Morning') + '</select></div>' +
        '<div class="bd-sel"><select class="bd-f-' + bdCls(r.pm) + '" id="bd-pm-' + d + '" aria-label="Afternoon, ' + bdNice(d) + '" data-bd-set="pm" data-bd-date="' + d + '">' + opts(r.pm, BD_PLACES, 'Afternoon') + '</select></div>' +
        '<div class="bd-sel"><select class="ride" id="bd-ride-' + d + '" aria-label="Getting there, ' + bdNice(d) + '" data-bd-set="commute" data-bd-date="' + d + '">' + opts(r.commute, BD_RIDES, 'Commute') + '</select></div></div>';
    }
    h += '</div>';
  }
  return h + '</div>';
}

function bdPlanner() {
  let h = '<div class="bd-panel"><div class="bd-brushes">' + BD_PLACES.map(p => '<button type="button" class="bd-brush" data-bd-brush="' + esc(p.v) + '" aria-pressed="' + (bd.brush === p.v) + '"><i class="bd-dot bd-d-' + p.cls + '"></i>' + esc(p.name) + '</button>').join('') +
    '<button type="button" class="bd-brush" data-bd-brush="" aria-pressed="' + (bd.brush === '') + '"><i class="bd-dot bd-d-"></i>Clear</button></div>' +
    '<div class="bd-optline"><label class="bd-tog"><input type="checkbox" id="bd-half"' + (bd.half ? ' checked' : '') + '> Half days (top = morning)</label></div><div class="bd-plan">';
  for (const key of [...new Set([...bd.days.keys()].map(d => d.slice(0, 7)))]) {
    const list = [...bd.days.keys()].filter(d => d.startsWith(key)), t = bdTally(list);
    let dots = '', last = null;
    for (const d of list) {
      const r = bd.days.get(d), mon = bdAdd(d, -((bdWd(d) + 6) % 7));
      if (mon !== last) { dots += (last ? '</div>' : '') + '<div class="bd-dw">'; last = mon; }
      const label = bdNice(d) + ': ' + (bdName(r.am) || 'not filled in') + (r.pm !== r.am ? ' / ' + (bdName(r.pm) || 'not filled in') : '');
      dots += '<div class="bd-sq' + (d < bd.today ? ' past' : '') + (bdFix(d) ? ' fix' : '') + (bdChanged(d) ? ' changed' : '') + (d === bd.today ? ' today' : '') + '" data-bd-sq="' + d + '" title="' + esc(label) + '"><span class="bd-d-' + bdCls(r.am) + '" data-bd-h="am"></span><span class="bd-d-' + bdCls(r.pm) + '" data-bd-h="pm"></span></div>';
    }
    h += '<div class="bd-mrow"><div class="ml">' + BD_MON[+key.slice(5) - 1] + '</div><div class="bd-dots">' + dots + '</div></div><div class="mp">' + (bdShare(t) === null ? '–' : bdShare(t) + '%') + bdMbar(t) + '</div></div>';
  }
  return h + '</div><p class="bd-hint">Tap or drag across days to paint them, and watch the 31 Dec figure above move.</p></div>';
}

// The old tab's detail, from the saved data: totals, e-bike and each month.
function bdMore(c) {
  const Y = c.ytd, M = c.month;
  return '<details class="bd-more"><summary>Totals, e-bike and each month</summary>' +
    '<div class="grid" style="margin-top:12px"><div class="card"><h3>Since ' + day(c.start) + '</h3><dl class="kv">' +
    [['Belgium work days', Y.be], ['Netherlands work days', Y.nl], ['Travel days', Y.travel], ['Holiday days', Y.holiday], ['Unclassified days', Y.unclassified], ['Accountable days', Y.accountable]].map(([k, v]) => '<dt>' + k + '</dt><dd>' + fmt(v) + '</dd>').join('') + '</dl></div>' +
    '<div class="card"><h3>E-bike compensation</h3><dl class="kv"><dt>This month</dt><dd>€ ' + fmt(M.ebike, 2) + '</dd><dt>Since ' + day(c.start) + '</dt><dd>€ ' + fmt(Y.ebike, 2) + '</dd></dl></div></div>' +
    '<h2>By month</h2><div class="card scroll"><table><thead><tr><th>Month</th><th class="num">BE</th><th class="num">NL</th><th class="num">Travel</th><th class="num">Holiday</th><th class="num">Unclassified</th><th class="num">BE %</th><th class="num">E-bike €</th></tr></thead><tbody>' +
    c.months.map(m => '<tr><td>' + esc(m.month) + '</td><td class="num">' + fmt(m.be) + '</td><td class="num">' + fmt(m.nl) + '</td><td class="num">' + fmt(m.travel) + '</td><td class="num">' + fmt(m.holiday) + '</td><td class="num">' + fmt(m.unclassified) + '</td><td class="num">' + fmt(m.be_share) + '</td><td class="num">' + fmt(m.ebike, 2) + '</td></tr>').join('') + '</tbody></table></div>' +
    '<p><a class="src" href="' + D1_CONSOLE + '" target="_blank" rel="noopener">Work Location Log (D1) ↗</a></p></details>';
}

function bdDraw() {
  const el = $('#cross');
  if (!bd.c) { el.innerHTML = '<p class="calm">The Work Location Log could not be read.</p>'; return; }
  const legend = '<div class="bd-legend">' + BD_PLACES.map(p => '<span><i class="bd-dot bd-d-' + p.cls + '"></i>' + esc(p.name) + '</span>').join('') + '<span><i class="bd-dot bd-d-"></i>Not filled in</span></div>';
  const keep = el.querySelector('details.bd-more') && el.querySelector('details.bd-more').open;
  el.innerHTML = bdHero() +
    '<nav class="bd-switch" aria-label="View"><div>' + [['a', 'Calendar'], ['b', 'Week list'], ['c', 'Year planner']].map(([k, n]) => '<button type="button" data-bd-view="' + k + '" aria-pressed="' + (bd.view === k) + '">' + n + '</button>').join('') + '</div></nav>' +
    '<p class="bd-note">' + BD_NOTES[bd.view] + '</p>' +
    (bd.view === 'a' ? bdCalendar() : bd.view === 'b' ? bdList() : bdPlanner()) + legend + bdMore(bd.c);
  if (keep) el.querySelector('details.bd-more').open = true;
  const n = [...bd.days.keys()].filter(bdChanged).length;
  $('#bd-save').hidden = !n;
  $('#bd-savemsg').textContent = n + ' day' + (n === 1 ? '' : 's') + ' changed';
}
function renderCross(c) { if (c) bdLoad(c); else bd.c = null; return ''; }

function bdSheet(date) {
  const r = Object.assign({}, bd.days.get(date)), root = $('#bd-sheet');
  let split = !!(r.am && r.pm && r.am !== r.pm);
  const places = (half, label) => '<div class="bd-field"><span>' + label + '</span><div class="bd-places">' + BD_PLACES.map(p => '<button type="button" class="bd-place bd-f-' + p.cls + '" data-half="' + half + '" data-v="' + esc(p.v) + '" aria-pressed="' + (r[half] === p.v) + '"><em>' + p.flag + '</em>' + esc(p.name) + '</button>').join('') + '</div></div>';
  const draw = () => {
    root.innerHTML = '<div class="bd-scrim" data-close="1"><div class="bd-sheet" role="dialog" aria-modal="true" aria-label="' + bdLong(date) + '">' +
      '<h3>' + bdLong(date) + '</h3><span class="bd-small">' + (date < bd.today ? 'Past day' : date === bd.today ? 'Today' : 'Planned') + '</span>' +
      (split ? places('am', 'Morning') + places('pm', 'Afternoon') : places('am', 'Where were you')) +
      '<label class="bd-tog"><input type="checkbox" id="bd-split"' + (split ? ' checked' : '') + '> Split day: morning and afternoon in different places</label>' +
      '<div class="bd-field"><span>Getting there</span><div class="bd-rides">' + BD_RIDES.map(o => '<button type="button" class="bd-ride" data-ride="' + esc(o.v) + '" aria-pressed="' + (r.commute === o.v) + '">' + esc(o.name) + '</button>').join('') + '</div></div>' +
      '<div class="bd-money">' + (r.commute === BD_E_BIKE ? '€ ' + BD_EBIKE_DAY.toFixed(2) + ' e-bike compensation for this day.' : '') + '</div>' +
      '<div class="bd-foot"><button type="button" class="bd-btn ghost" data-act="clear">Clear day</button><button type="button" class="bd-btn" data-act="done">Done</button></div></div></div>';
  };
  const close = () => { root.innerHTML = ''; root.onclick = null; root.onchange = null; removeEventListener('keydown', esc_); bdDraw(); };
  const esc_ = e => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', esc_);
  root.onchange = e => { if (e.target.id === 'bd-split') { split = e.target.checked; if (!split) r.pm = r.am; draw(); } };
  root.onclick = e => {
    if (e.target.dataset && e.target.dataset.close) return close();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.half) { r[b.dataset.half] = b.dataset.v; if (!split) r.pm = r.am; draw(); }
    else if (b.dataset.ride !== undefined) { r.commute = r.commute === b.dataset.ride ? '' : b.dataset.ride; draw(); }
    else if (b.dataset.act === 'clear') { r.am = r.pm = r.commute = ''; split = false; draw(); }
    else if (b.dataset.act === 'done') { bd.days.set(date, r); close(); }
  };
  draw();
}

function bdPaint(x, y) {
  const el = document.elementFromPoint(x, y), sq = el && el.closest && el.closest('[data-bd-sq]');
  if (!sq) return;
  const d = sq.dataset.bdSq, r = Object.assign({}, bd.days.get(d));
  if (bd.half) { const h = el.dataset.bdH || 'am'; if (r[h] === bd.brush) return; r[h] = bd.brush; }
  else { if (r.am === bd.brush && r.pm === bd.brush) return; r.am = r.pm = bd.brush; }
  if (!r.am && !r.pm) r.commute = '';
  bd.days.set(d, r); bdDraw();
}
function bdToast(text, bad) {
  const t = $('#bd-toast'); t.textContent = text; t.className = 'bd-toast' + (bad ? ' bad' : ''); t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, bad ? 7000 : 3000);
}
async function bdSave() {
  if (bd.saving) return;
  const list = [...bd.days.keys()].filter(bdChanged).map(d => Object.assign({ date: d }, bd.days.get(d)));
  if (!list.length) return;
  bd.saving = true; $('#bd-go').disabled = true; $('#bd-go').textContent = 'Saving…';
  try {
    const r = await fetch('/border/save', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: list }) });
    if (r.status === 401) { location.href = '/login?next=/admin'; return; }
    const out = await r.json();
    // Saved days now count as the saved state; failed ones stay changed.
    for (const d of out.saved || []) bd.orig.set(d, Object.assign({}, bd.days.get(d)));
    if (out.failed && out.failed.length) bdToast('Not saved: ' + out.failed.map(f => bdNice(f.date) + ' (' + f.message + ')').join(', ') + '.', true);
    else if (!out.saved) bdToast('Could not save: ' + (out.message || 'unknown error') + '.', true);
    else bdToast('Saved ' + out.saved.length + ' day' + (out.saved.length === 1 ? '' : 's') + '.');
    bdDraw();
    if (out.saved && out.saved.length) load(true);
  } catch (e) {
    bdToast('Could not reach the dashboard: ' + e.message + '. Nothing was lost; try Save again.', true);
  } finally { bd.saving = false; $('#bd-go').disabled = false; $('#bd-go').textContent = 'Save'; }
}

const bdTab = $('#cross');
bdTab.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.bdDay) bdSheet(b.dataset.bdDay);
  else if (b.dataset.bdView) { bd.view = b.dataset.bdView; try { localStorage.setItem('bd-view', bd.view); } catch (_) {} bdDraw(); }
  else if (b.dataset.bdMonth) { bd.month = b.dataset.bdMonth; bdDraw(); }
  else if (b.dataset.bdFilter) { bd[b.dataset.bdFilter] = !bd[b.dataset.bdFilter]; bdDraw(); }
  else if (b.dataset.bdBrush !== undefined) { bd.brush = b.dataset.bdBrush; bdDraw(); }
});
bdTab.addEventListener('change', e => {
  const s = e.target;
  if (s.id === 'bd-half') { bd.half = s.checked; return bdDraw(); }
  if (!s.dataset.bdDate) return;
  const r = Object.assign({}, bd.days.get(s.dataset.bdDate)); r[s.dataset.bdSet] = s.value;
  bd.days.set(s.dataset.bdDate, r); bdDraw();
});
bdTab.addEventListener('pointerdown', e => { if (e.target.closest('[data-bd-sq]')) { bd.painting = true; e.preventDefault(); bdPaint(e.clientX, e.clientY); } });
addEventListener('pointermove', e => { if (bd.painting) bdPaint(e.clientX, e.clientY); });
addEventListener('pointerup', () => { bd.painting = false; });
$('#bd-undo').addEventListener('click', () => { bd.days = new Map([...bd.orig].map(([k, v]) => [k, Object.assign({}, v)])); bdDraw(); });
$('#bd-go').addEventListener('click', bdSave);
addEventListener('beforeunload', e => { if ([...bd.days.keys()].some(bdChanged)) { e.preventDefault(); e.returnValue = ''; } });
`;
