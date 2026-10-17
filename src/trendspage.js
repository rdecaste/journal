// GET /trends: the per-sport trends page (data: src/trends.js, from the Quest
// Engine's GET /trends). Four tabs: Summary (the last 13 weeks, this month
// against last, hours and share per sport by month or week, the AI coach's
// weekly note), Running (pace at Zone 2, minutes per zone, race predictions,
// holding the effort, the second-half fade), Cycling (watts at Zone 2 against
// the 200 W goal, minutes per zone, decoupling, second-half power) and
// Strength (volume per workout, estimated 1RM per exercise, the sessions).
// Grown from the mockup Roy shaped on 17 Oct 2026: the page's own script
// shapes the rows and draws every chart as inline SVG at the container's
// width; the explanations sit behind a ? on each card, the detail of a tile
// behind a tap, and a run or ride opens in a popup. #desk is the view for
// the Roy OS screen: the Summary tiles, the month comparison and the coach in
// big type. The data goes in as JSON (`<` escaped, so no text can close the
// script tag).

export function trendsHtml(d) {
  const data = JSON.stringify(d).replace(/</g, '\\u003c');
  return PAGE.replace('__DATA__', data);
}

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Trends"><meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#eef1f5" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0e1219" media="(prefers-color-scheme: dark)">
<title>Trends</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">
<style>
/* Layout: one column of sport sections, each a short row of stat tiles above its charts; charts are inline SVG drawn to the container's width. */
:root{
  --bg:#eef1f5; --surface:#ffffff; --ink:#18202b; --ink2:#5e6a7a; --muted:#8792a3; --grid:#d9dee6; --axis:#c3cad6;
  --accent:#2f6fd1; --accent-soft:#e6eefb; --race:#eb6834; --good:#2e8f5c; --warn:#b57a0c;
  --z1:#c7dbf3; --z2:#8fb8ec; --z3:#4f8fdd; --z4:#2060b8; --z5:#123a73;
  --road:#2a78d6; --gravel:#eb6834; --indoor:#1baf7a;
  --s-run:#2a78d6; --s-ride:#eb6834; --s-swim:#1baf7a; --s-str:#eda100;
  --r-easy:#2a78d6; --r-long:#1baf7a; --r-hard:#eb6834; --r-int:#eda100;
  --display:"Source Serif 4",Georgia,"Times New Roman",serif; --body:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif; --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  --bg:#0e1219; --surface:#171d27; --ink:#e8ecf2; --ink2:#95a1b2; --muted:#7c8798; --grid:#283141; --axis:#35405a;
  --accent:#5b93ea; --accent-soft:#1a2638; --race:#e8743f; --good:#4cbf85; --warn:#f0b53c;
  --z1:#2b3b55; --z2:#2f5a92; --z3:#3987e5; --z4:#7fb3f0; --z5:#c7dbf3; --road:#3987e5; --gravel:#d95926; --indoor:#199e70; --s-run:#3987e5; --s-ride:#d95926; --s-swim:#199e70; --s-str:#c98500; --r-easy:#3987e5; --r-long:#199e70; --r-hard:#d95926; --r-int:#c98500; color-scheme:dark } }
:root[data-theme="dark"]{
  --bg:#0e1219; --surface:#171d27; --ink:#e8ecf2; --ink2:#95a1b2; --muted:#7c8798; --grid:#283141; --axis:#35405a;
  --accent:#5b93ea; --accent-soft:#1a2638; --race:#e8743f; --good:#4cbf85; --warn:#f0b53c;
  --z1:#2b3b55; --z2:#2f5a92; --z3:#3987e5; --z4:#7fb3f0; --z5:#c7dbf3; --road:#3987e5; --gravel:#d95926; --indoor:#199e70; --s-run:#3987e5; --s-ride:#d95926; --s-swim:#199e70; --s-str:#c98500; --r-easy:#3987e5; --r-long:#199e70; --r-hard:#d95926; --r-int:#c98500; color-scheme:dark }
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{margin:0}
body{background:var(--bg);color:var(--ink);font:15px/1.5 var(--body);-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}
.top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}
.back{font-size:15px;font-weight:500;color:var(--ink2);text-decoration:none;min-height:32px;display:inline-flex;align-items:center}
.date{font-size:13.5px;font-weight:500;color:var(--ink2)}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:6px}
.wrap{max-width:980px;margin:0 auto;padding-block:28px 48px;padding-inline:16px}
header h1{font:600 34px/1.12 var(--display);letter-spacing:-.01em;margin:0 0 6px;text-wrap:balance}
header p{margin:0;color:var(--ink2);max-width:68ch}
.note{font-size:13px;color:var(--muted)}
section{margin-top:40px}
.sec{display:flex;align-items:baseline;gap:12px}
.sec h2{font:600 22px/1 var(--display);margin:0}
.sec::after{content:"";flex:1;height:1px;background:var(--grid);align-self:center}
.sec .src{font-size:12px;color:var(--muted)}
.sec .pick{order:3;display:flex;gap:6px;align-items:center;margin-left:12px;white-space:nowrap;font-size:13px}
.sec .pick select{font:inherit;color:var(--ink);background:var(--surface);border:1px solid var(--axis);border-radius:6px;padding:4px 8px;max-width:220px;min-height:32px}
.sec .pick span{color:var(--muted)}
.tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,130px),1fr));margin:16px 0}
@media (max-width:520px){.tiles{grid-template-columns:1fr 1fr}}
.tile[data-tab] .k{cursor:pointer}.tile[data-tab] .k::after{content:"\\203A";margin-left:auto;color:var(--muted);font-size:14px}
.tile{background:var(--surface);border:1px solid var(--grid);border-radius:14px;padding:12px 14px;min-width:0}
.tile .k{font-size:12px;color:var(--ink2);display:flex;gap:6px;align-items:center}
.tile .k i{width:8px;height:8px;border-radius:2px;display:inline-block;flex:none}
.tile .v{font:600 26px/1.1 var(--display);font-variant-numeric:tabular-nums;margin-top:4px}
.tile .v small{font:500 13px var(--body);color:var(--ink2);margin-left:3px}
.tile .d{font-size:12px;color:var(--muted);margin-top:4px;font-variant-numeric:tabular-nums}
.tile .d b{color:var(--good);font-weight:600}
.tile .d b.down{color:var(--warn)}
.tile[data-info]{cursor:help;position:relative}
.tile[data-info]:hover,.tile.open{border-color:var(--accent)}
.pop{position:absolute;left:0;top:calc(100% + 6px);z-index:3;background:var(--ink);color:var(--bg);font:13px/1.45 var(--body);padding:10px 12px;border-radius:8px;min-width:220px;max-width:min(320px,90vw);box-shadow:0 6px 24px rgba(0,0,0,.18);visibility:hidden}
.tile.open .pop,.tile[data-info]:hover .pop{visibility:visible}
.pop b{font-weight:600}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chips button{appearance:none;font:600 12px var(--body);padding:4px 10px;border-radius:999px;border:1px solid var(--axis);background:var(--surface);color:var(--ink2);cursor:pointer}
.chips button[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);color:var(--ink)}
.chips button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
dialog.wk{border:0;border-radius:14px;padding:0;max-width:min(520px,calc(100vw - 32px));width:100%;background:var(--surface);color:var(--ink);box-shadow:0 20px 60px rgba(0,0,0,.3)}
dialog.wk::backdrop{background:rgba(0,0,0,.35)}
.wk .hd{padding:16px 18px 10px;border-bottom:1px solid var(--grid);display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.wk .hd h3{margin:0;font:700 18px/1.2 var(--display)}
.wk .hd .when{font-size:13px;color:var(--ink2);margin-top:2px}
.wk .x{appearance:none;border:0;background:var(--grid);color:var(--ink);width:30px;height:30px;border-radius:50%;font:600 16px/1 var(--body);cursor:pointer;flex:none}
.wk .big{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:14px 18px 4px}
.wk .big div{min-width:0}.wk .big .k{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.wk .big .v{font:600 22px/1.1 var(--display);font-variant-numeric:tabular-nums}.wk .big .v small{font:500 12px var(--body);color:var(--ink2);margin-left:2px}
.wk dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0;padding:12px 18px 6px;font-size:14px}
.wk dt{color:var(--ink2)}.wk dd{margin:0;font-family:var(--mono);font-size:13px;font-variant-numeric:tabular-nums}
.wk .zbar{display:flex;height:10px;border-radius:5px;overflow:hidden;gap:2px;margin:4px 18px 0}
.wk .zbar i{display:block;height:100%}
.wk .zl{display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--muted);padding:6px 18px 0}
.wk .ft{padding:14px 18px 16px;display:flex;gap:10px;align-items:center;font-size:13px}
.wk .ft a{color:var(--accent);font-weight:600;text-decoration:none}.wk .ft a:hover{text-decoration:underline}
.wk .ft .note{margin-left:auto}
svg .m{cursor:pointer}
/* Desk view (#desk): the Roy OS screen, 1920x1080 at arm's length. Summary tiles, the month comparison and the coach, big type, no chrome. */
.desk{max-width:1800px}
.desk header,.desk .tabs,.desk .fold,.desk #run,.desk #ride,.desk #strength,.desk #summary .sec,.desk .card:has(#c-months),.desk .card:has(#c-share),.desk .ibtn{display:none}
.desk{font-size:19px}
.desk .tiles{grid-template-columns:repeat(5,1fr);gap:18px;margin:0 0 20px}
.desk .tile{padding:18px 22px}.desk .tile .k{font-size:15px}.desk .tile .v{font-size:44px}.desk .tile .d{font-size:15px}
.desk .cards{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:20px}
.desk .card{padding:22px 26px}.desk .card h3,.desk .card .hd3 h3{font-size:22px}
.desk .card .sub{font-size:17px}.desk svg text{font-size:15px}
.desk .coach{grid-column:auto}.desk .coach-body{grid-template-columns:1fr}.desk .coach-body p,.desk .coach-body ul{font-size:17px}.desk .coach-body .say{font-size:22px}
.desk .legend{font-size:15px}.desk .chips button{font-size:15px;padding:6px 14px}
.desk-link{position:fixed;right:14px;bottom:14px;font:600 12px var(--body);color:var(--muted);background:var(--surface);border:1px solid var(--grid);border-radius:999px;padding:6px 10px;text-decoration:none;z-index:4}
.wk .body{padding:14px 18px 18px;font-size:14.5px;line-height:1.55}
.wk .body p{margin:0 0 10px;max-width:70ch}.wk .body p:last-child{margin:0}
.wk .body b{font-weight:600}
.wk .body .how{background:var(--accent-soft);border-radius:8px;padding:10px 12px;margin-top:12px;font-size:13.5px}
.card .why{display:none;margin:8px 0 10px}
.card .sub{margin:0 0 10px;font-size:13.5px;color:var(--ink2)}
.card .hd3{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.card .hd3 h3{margin:0}
.ibtn{appearance:none;border:1px solid var(--axis);background:var(--surface);color:var(--ink2);width:20px;height:20px;border-radius:50%;font:600 12px/1 var(--mono);cursor:help;flex:none;padding:0}
.ibtn{cursor:pointer}.ibtn:hover{border-color:var(--accent);color:var(--accent)}
.ibtn:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.coach{background:var(--accent-soft);border-color:transparent}
.coach-body{display:grid;gap:14px 24px;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)}
.coach-body p{margin:0 0 8px;font-size:14.5px;line-height:1.55;max-width:70ch}
.coach-body .say{font:italic 500 17px/1.4 var(--display);margin:0 0 10px}
.coach-body ul{margin:0;padding-left:18px;font-size:14px;line-height:1.5}
.coach-body li{margin-bottom:6px}
.coach-body .k{font:600 11px var(--body);letter-spacing:.08em;text-transform:uppercase;color:var(--ink2);margin-bottom:6px}
.coach-body footer{grid-column:1/-1;font-size:12px;color:var(--muted)}
@media (max-width:640px){.coach-body{grid-template-columns:1fr}}
.fold{margin-top:14px}.fold summary{cursor:pointer;font:600 14px var(--body);color:var(--ink2);padding:8px 0}
.fold[open] summary{color:var(--ink)}
.tile .v .delta{font:600 13px var(--body);margin-left:8px;padding:2px 7px;border-radius:999px;background:var(--accent-soft);color:var(--ink2);vertical-align:middle}
.tile .v .delta.up{color:var(--good)}.tile .v .delta.down{color:var(--warn)}
.cards{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))}
.card{background:var(--surface);border:1px solid var(--grid);border-radius:18px;padding:16px 18px 12px;min-width:0;box-shadow:0 1px 2px rgba(20,26,36,.04)}
.card h3{font:600 16px/1.2 var(--body);margin:0 0 2px}
.card .why{margin:0 0 10px;font-size:13px;color:var(--ink2)}
.chart{width:100%;position:relative}
.chart svg{display:block;width:100%;height:auto;overflow:visible}
svg text{font-family:var(--mono);font-size:11px;fill:var(--muted)}
svg .lbl{fill:var(--ink);font-weight:500}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink2);margin-top:8px}
.legend span{display:inline-flex;align-items:center;gap:6px}
.legend i{width:10px;height:10px;border-radius:2px;display:inline-block}
.legend i.line{height:2px;width:14px;border-radius:1px}
.legend i.dash{height:0;width:14px;border-top:2px dashed var(--race)}
.tip{position:absolute;pointer-events:none;background:var(--ink);color:var(--bg);font:12px/1.4 var(--mono);padding:6px 8px;border-radius:6px;white-space:nowrap;transform:translate(-50%,-110%);visibility:hidden;z-index:2}
.pending{border-style:dashed}
.pending h3::after{content:"needs new data";font:500 11px var(--body);color:var(--warn);margin-left:8px;vertical-align:middle;text-transform:uppercase;letter-spacing:.06em}
.foot{margin-top:40px;padding-top:16px;border-top:1px solid var(--grid);font-size:13px;color:var(--ink2)}
.foot ul{margin:6px 0 0;padding-left:18px}
.tabs{display:flex;gap:4px;margin-top:22px;border-bottom:1px solid var(--grid);overflow-x:auto}
.tabs button{appearance:none;background:none;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;padding:10px 14px;font:600 15px var(--body);color:var(--ink2);cursor:pointer;white-space:nowrap}
.tabs button[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--accent)}
.tabs button:hover{color:var(--ink)}
.tabs button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px;border-radius:4px}
section[role="tabpanel"]{margin-top:22px}
@media (prefers-reduced-motion:no-preference){.tile,.card{transition:border-color .15s}}
</style>
<div class="wrap">
<div class="top"><a class="back" href="/">‹ Quest log</a><span class="date" id="today"></span></div>
<header>
  <h1>Trends</h1>
  <p>Strava, Hevy and Apple Health, the last 13 weeks: <span id="range"></span>. Hover a mark for the day behind it; tap a run, ride or bar to open it.</p>
</header>

<div class="tabs" role="tablist" aria-label="Sport">
  <button role="tab" id="tab-summary" aria-controls="summary" aria-selected="true">Summary</button>
  <button role="tab" id="tab-run" aria-controls="run" aria-selected="false">Running</button>
  <button role="tab" id="tab-ride" aria-controls="ride" aria-selected="false">Cycling</button>
  <button role="tab" id="tab-strength" aria-controls="strength" aria-selected="false">Strength</button>
</div>

<section id="summary" role="tabpanel" aria-labelledby="tab-summary">
  <div class="sec"><h2>Summary</h2><span class="src">Strava &middot; last 3 months &middot; tap a box for the detail, or its sport name for the tab</span><label class="note pick"><span>Show</span><select id="period-pick"><option value="month" selected>per month</option><option value="week">per week</option></select></label></div>
  <div class="tiles" id="sum-tiles"></div>
  <div class="cards">
    <div class="card" style="grid-column:1/-1"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap"><h3 id="mvm-title">This month against last</h3><div class="chips" id="mvm-pick" role="group" aria-label="Sport"></div></div><p class="why">Running total by day of the month: this month as a solid line up to today, last month dashed to its end. Both start at zero on the 1st, so the gap between the lines at today's marker is the honest comparison. The chips switch between all sports in hours, running and cycling in km, and strength in hours. Hover a day to read both months.</p><p class="sub" id="mvm-why"></p><div class="chart" id="c-mvm"></div><div class="legend"><span><i class="line" style="background:var(--accent)"></i><span id="lg-this"></span></span><span><i class="dash" style="border-top-color:var(--ink2)"></i><span id="lg-prev"></span></span></div></div>
    <div class="card"><h3 id="hours-title">Hours per sport, by month</h3><p class="why">Moving time per sport. Per month: calendar months, October partial. Per week: Monday weeks since 13 July, with the weekly average in the last 3 months as a dashed line. Hover a bar for the split.</p><div class="chart" id="c-months"></div><div class="legend" id="lg-sports"></div></div>
    <div class="card"><h3 id="share-title">Share per sport, by month</h3><p class="why">Training time split by sport as a share of 100%, per month or per week. Shows where the balance went regardless of how much you trained. For a half marathon build you would expect running to grow toward half the time; strength twice a week is roughly 25 to 30%.</p><div class="chart" id="c-share"></div><div class="legend" id="lg-sports3"></div></div>
    <div class="card coach" style="grid-column:1/-1"><h3>AI Coach</h3><p class="why">A weekly note from the coach: one OpenAI call in the Quest Engine from the same numbers these charts show (the last 13 weeks per sport, this month against last, pace at Zone 2, the long run's decoupling, watts at Zone 2 and the FTP estimates, the bench press, today's recovery). Written on the first visit in a new week and kept, like the gym feedback; Rewrite asks for it again.</p><div class="coach-body" id="coach"></div></div>
  </div>
  <details class="fold"><summary>Per month table</summary><div style="overflow-x:auto" id="sum-table"></div></details>
</section>

<section id="run" role="tabpanel" aria-labelledby="tab-run" hidden>
  <div class="sec"><h2>Running</h2><span class="src">Strava streams &middot; last 3 months</span><label class="note pick"><span>Run type</span><select id="hold-pick"><option value="all">All runs</option><option value="easy">Easy</option><option value="long">Long (10 km+)</option><option value="hard">Hard (HR 163+)</option><option value="int">Intervals</option></select></label></div>
  <div class="tiles" id="run-tiles"></div>
  <div class="cards">
    <div class="card"><h3>Pace at Zone 2</h3><p class="why">Average pace over the seconds spent at 146 to 162 bpm, one dot per run with at least 5 minutes there. Faster at the same heart rate means a bigger aerobic base. Line: median of the last 4 runs.</p><div class="chart" id="c-z2pace"></div><div class="legend"><span><i style="background:var(--accent)"></i>One run</span><span><i class="line" style="background:var(--accent)"></i>4-run median</span></div></div>
        <div class="card"><h3>Minutes per zone, by week</h3><p class="why">Your zones (Z1 to 145, Z2 146&ndash;162, Z3 163&ndash;173, Z4 174&ndash;184, Z5 185+) from the heart-rate streams, Monday weeks since 13 July. A healthy base is mostly Z2 with a little Z4.</p><div class="chart" id="c-runzones"></div><div class="legend" id="lg-runzones"></div></div>
    <div class="card"><h3>Race predictions</h3><p class="why">Riegel's formula on your best training effort of the last 8 weeks. Race day is usually faster than this: a 5 km run flat out would move every row down.</p><div id="race-table"></div></div>
    <div class="card" data-insight><h3>Holding the effort</h3><p class="why">Aerobic decoupling: how much speed per heart beat the second half of a run lost against the first. Under 5% is held; above 10% the pace was only kept by a climbing heart rate, or not kept at all. Runs of 20 minutes or more; intervals shown but fade by design.</p><div class="chart" id="c-decouple"></div><div class="legend lg-run" data-extra="median"></div></div>
    <div class="card" data-insight><h3>Second-half fade</h3><p class="why">How many seconds per km slower the second half of the run was than the first. Zero or below means an even or negative split. The best race pacing sits at zero.</p><div class="chart" id="c-fade"></div><div class="legend lg-run" data-extra=""></div></div>
  </div>
</section>

<section id="ride" role="tabpanel" aria-labelledby="tab-ride" hidden>
  <div class="sec"><h2>Cycling</h2><span class="src">Rides only &middot; e-bike commutes left out &middot; last 3 months</span><label class="note pick"><span>Ride type</span><select id="ride-pick"><option value="all">All rides</option><option value="road">Road</option><option value="gravel">Gravel</option><option value="indoor">Indoor</option></select></label></div>
  <div class="tiles" id="ride-tiles"></div>
  <div class="cards">
    <div class="card"><h3>Watts at Zone 2</h3><p class="why">Average power over the seconds your heart rate was 146 to 162, one dot per ride with at least 5 minutes there. The target line is your goal: 200 W in Zone 2. Click a dot to open the ride.</p><div class="chart" id="c-wz2"></div><div class="legend lg-ride" data-extra="median,goal"></div></div>
    <div class="card"><h3>Minutes per zone, by week</h3><p class="why">Same zones, same weeks as the runs, so the two charts read side by side. Weeks without a ride stay empty on purpose.</p><div class="chart" id="c-ridezones"></div><div class="legend" id="lg-ridezones"></div></div>
        <div class="card" data-insight="ride"><h3>Holding the effort</h3><p class="why"></p><div class="chart" id="c-rdecouple"></div><div class="legend lg-ride" data-extra="median"></div></div>
    <div class="card" data-insight="ride"><h3>Second-half power</h3><p class="why"></p><div class="chart" id="c-rfade"></div><div class="legend lg-ride" data-extra=""></div></div>
  </div>
</section>

<section id="strength" role="tabpanel" aria-labelledby="tab-strength" hidden>
  <div class="sec"><h2>Strength</h2><span class="src">Hevy &middot; last 3 months</span><label class="note pick"><span>Exercise</span><select id="ex-pick"></select></label></div>
  <div class="tiles" id="bench-tiles"></div>
  <div class="cards">
    <div class="card"><h3>Volume per workout</h3><p class="why">Weight &times; reps over every working set of the session, from Hevy. With one exercise picked, the darker part is that exercise's share.</p><div class="chart" id="c-vol"></div><div class="legend"><span><i style="background:var(--s-str)"></i>Picked exercise</span><span><i style="background:var(--grid)"></i>Rest of the session</span></div></div>
    <div class="card"><h3 id="ex-title">Estimated 1RM</h3><p class="why">With one exercise picked: the best working set of each session, Epley (weight &times; (1 + reps &divide; 30)), warm-ups excluded. With all exercises: the best estimated 1RM per exercise in the last 3 months, heaviest first.</p><div class="chart" id="c-bench"></div><div class="legend" id="lg-bench"></div></div>
    <details class="fold" style="grid-column:1/-1"><summary id="ex-sessions">Sessions</summary><div style="overflow-x:auto" id="bench-table"></div></details>
  </div>
</section>

</div>
<a class="desk-link" id="desk-link" href="#desk">Desk view</a>
<dialog class="wk" id="wk" aria-labelledby="wk-title"></dialog>
<script id="data" type="application/json">__DATA__</script></body></html>
<script>
const DATA = JSON.parse(document.getElementById('data').textContent);
const BENCH_GOAL = (DATA.goals && DATA.goals.bench_e1rm) || 100, isBench = n => /bench press/i.test(n);
// GET /trends gives rows; the script below wants them per sport (as the mockup it grew from).
const TODAY = DATA.today, SINCE = DATA.since;
(function shape() {
  const r1 = v => (v === null || v === undefined ? null : Math.round(v * 10) / 10);
  const mondayOf = d => { const n = Math.round(Date.parse(d + 'T00:00:00Z') / 86400000); return new Date((n - ((new Date(n * 86400000).getUTCDay() + 6) % 7)) * 86400000).toISOString().slice(0, 10); };
  const riegel = (t, d1, d2) => t * Math.pow(d2 / d1, 1.06);
  const W = DATA.workouts || [];
  DATA.runs = W.filter(w => w.sport === 'run' && w.day >= SINCE).map(w => ({
    id: w.id, day: w.day, name: w.name, km: w.km, min: w.min, elev: w.elev, pace: w.km ? Math.round(w.min * 60 / w.km) : 0, hr: w.hr || 0,
    z2_min: r1((w.z2_s || 0) / 60), pace_z2: w.pace_z2, zones: w.zones || [0, 0, 0, 0, 0], drift: w.drift, tss: w.tss,
    b3k: w.best_3k_s, b5k: w.best_5k_s, b10k: w.best_10k_s,
    pred: w.best_5k_s ? { '5k': w.best_5k_s, '10k': Math.round(riegel(w.best_5k_s, 5000, 10000)), hm: Math.round(riegel(w.best_5k_s, 5000, 21097.5)) } : w.best_3k_s ? { '5k': Math.round(riegel(w.best_3k_s, 3000, 5000)), '10k': Math.round(riegel(w.best_3k_s, 3000, 10000)), hm: Math.round(riegel(w.best_3k_s, 3000, 21097.5)) } : null,
    decouple: w.decouple_pct, fade: w.half_delta, hr_rise: w.hr_rise
  }));
  DATA.ride_rows = W.filter(w => w.sport === 'ride' && w.day >= SINCE).map(w => ({
    strava_id: w.id, day: w.day, name: w.name, kind: w.trainer || w.sport_type === 'VirtualRide' ? 'indoor' : ['GravelRide', 'MountainBikeRide'].includes(w.sport_type) ? 'gravel' : 'road',
    km: w.km, moving_time: Math.round(w.min * 60), min: Math.round(w.min), average_watts: w.watts, weighted_average_watts: w.np, average_heartrate: w.hr, max_heartrate: w.hr_max,
    average_cadence: w.cadence, total_elevation_gain: w.elev, calories: w.calories, zones: w.zones, hr_tss: w.tss, hr_drift_pct: w.drift,
    wpb: w.watts && w.hr ? Math.round(w.watts / w.hr * 1000) / 1000 : null, w_z2: w.watts_z2, z2_min: Math.round((w.z2_s || 0) / 60), best20: w.best_20m_w, p178: w.p_lthr_w,
    decouple: w.decouple_pct, w_fade: w.half_delta, hr_rise: w.hr_rise
  }));
  DATA.rides = DATA.ride_rows.length;
  const weekly = rows => { const m = {}; for (const r of rows) { if (!r.zones) continue; const z = m[mondayOf(r.day)] || (m[mondayOf(r.day)] = [0, 0, 0, 0, 0]); r.zones.forEach((v, i) => z[i] += v || 0); } return Object.keys(m).sort().map(week => ({ week, z: m[week] })); };
  DATA.zones = { Run: weekly(DATA.runs), Ride: weekly(DATA.ride_rows) };
  const SPORT = { run: 'Run', ride: 'Ride', swim: 'Swim', strength: 'WeightTraining' };
  DATA.all = W.filter(w => w.sport).map(w => ({ day: w.day, sport: SPORT[w.sport], h: w.h, km: w.km }));
  DATA.hw = ((DATA.hevy || {}).workouts || []).filter(w => w.day >= SINCE);
  DATA.hsets = ((DATA.hevy || {}).sets || []).filter(s => s.day >= SINCE).map(s => ({ day: s.day, exercise_title: s.exercise, set_type: s.type, weight_kg: s.kg, reps: s.reps, e1rm: s.e1rm, workout_id: s.workout_id }));
})();
const fmt = s => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtH = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? h + ':' + String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') : fmt(s); };
const dayFmt = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monday = d => { const n = Math.round(Date.parse(d + 'T00:00:00Z') / 86400000); return new Date((n - ((new Date(n * 86400000).getUTCDay() + 6) % 7)) * 86400000).toISOString().slice(0, 10); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const dayNum = d => Math.round(Date.parse(d + 'T00:00:00Z') / 86400000);
const median = a => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// ---- generic svg scaffolding ----
function frame(el, { W = 600, H = 220, pad = { l: 44, r: 16, t: 14, b: 26 } } = {}) {
  const w = Math.max(280, el.clientWidth || W);
  return { w, H, pad, x0: pad.l, x1: w - pad.r, y0: pad.t, y1: H - pad.b };
}
function tipFor(el) { let t = el.querySelector('.tip'); if (!t) { t = document.createElement('div'); t.className = 'tip'; el.appendChild(t); } return t; }
function bindHover(el, svg, marks, { tap = true } = {}) {
  const tip = tipFor(el);
  marks.forEach(([node, html]) => {
    if (tap && !node.classList.contains('clk')) node.addEventListener('click', () => { const title = (el.closest('.card') || el).querySelector('h3'); WK.innerHTML = \`<div class="hd"><div><h3 id="wk-title">\${title ? esc(title.textContent) : 'Detail'}</h3></div><button class="x" type="button" aria-label="Close">&times;</button></div><div class="body"><p style="font-family:var(--mono);font-size:14px;line-height:1.7">\${html}</p></div>\`; WK.showModal(); });
    node.style.cursor = 'default';
    node.addEventListener('mouseenter', () => { const r = node.getBoundingClientRect(), p = el.getBoundingClientRect(); tip.innerHTML = html; tip.style.left = (r.left - p.left + r.width / 2) + 'px'; tip.style.top = (r.top - p.top) + 'px'; tip.style.visibility = 'visible'; });
    node.addEventListener('mouseleave', () => tip.style.visibility = 'hidden');
  });
}
const yTicks = (lo, hi, n = 4) => { const step = (hi - lo) / n; return Array.from({ length: n + 1 }, (_, i) => lo + i * step); };

// time-based x axis: months as ticks
function monthTicks(f, from, to) {
  const out = []; let d = new Date(from + 'T00:00:00Z'); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1);
  while (d.toISOString().slice(0, 10) <= to) { out.push(d.toISOString().slice(0, 10)); d.setUTCMonth(d.getUTCMonth() + 1); }
  return out;
}
function dotLine(el, pts, { yfmt, ylo, yhi, invert = false, ref = null, refLabel = '', median4 = false, medianOf = null, lineOnly = false, bars = null, tip, onClick = null, bands = null, zero = false }) {
  if (!pts.length) { el.innerHTML = '<p class="note" style="padding:40px 0;text-align:center">No runs of this type yet.</p>'; return; }
  const f = frame(el); const from = pts[0].day, to = pts[pts.length - 1].day;
  const dx = Math.max(1, dayNum(to) - dayNum(from));
  const X = d => f.x0 + (dayNum(d) - dayNum(from)) / dx * (f.x1 - f.x0 - 24) + 12;
  const Y = v => invert ? f.y0 + (v - ylo) / (yhi - ylo) * (f.y1 - f.y0) : f.y1 - (v - ylo) / (yhi - ylo) * (f.y1 - f.y0);
  let s = \`<svg viewBox="0 0 \${f.w} \${f.H}" role="img">\`;
  if (bands) for (const [a, c, color, label] of bands) s += \`<rect x="\${f.x0}" y="\${Math.min(Y(a), Y(c))}" width="\${f.x1 - f.x0}" height="\${Math.abs(Y(a) - Y(c))}" fill="\${color}"/><text x="\${f.x0 + 6}" y="\${Math.min(Y(a), Y(c)) + 13}" style="fill:var(--ink2)">\${label}</text>\`;
  for (const t of yTicks(ylo, yhi)) s += \`<line x1="\${f.x0}" x2="\${f.x1}" y1="\${Y(t)}" y2="\${Y(t)}" stroke="var(--grid)"/><text x="\${f.x0 - 6}" y="\${Y(t) + 4}" text-anchor="end">\${yfmt(t)}</text>\`;
  if (zero) s += \`<line x1="\${f.x0}" x2="\${f.x1}" y1="\${Y(0)}" y2="\${Y(0)}" stroke="var(--ink2)" stroke-width="1.5"/>\`;
  for (const m of monthTicks(f, from, to)) s += \`<text x="\${X(m)}" y="\${f.H - 8}" text-anchor="middle">\${new Date(m + 'T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}</text>\`;
  if (ref !== null) s += \`<line x1="\${f.x0}" x2="\${f.x1}" y1="\${Y(ref)}" y2="\${Y(ref)}" stroke="var(--race)" stroke-width="2" stroke-dasharray="5 4"/><text x="\${f.x1}" y="\${Y(ref) - 6}" text-anchor="end" fill="var(--race)" class="lbl" style="fill:var(--race)">\${refLabel}</text>\`;
  if (bars === 'self') s += pts.map((p, i) => \`<rect class="m\${onClick ? ' clk' : ''}" data-i="\${i}" x="\${X(p.day) - 6}" width="12" y="\${Math.min(Y(p.v), Y(0))}" height="\${Math.max(2, Math.abs(Y(p.v) - Y(0)))}" rx="3" fill="\${p.c || 'var(--accent)'}"/>\`).join('');
  else if (bars) for (const p of pts) s += \`<rect x="\${X(p.day) - 5}" width="10" y="\${Y(p[bars])}" height="\${f.y1 - Y(p[bars])}" rx="3" fill="var(--muted)" opacity=".45"/>\`;
  if (median4) {
    const src = medianOf ? pts.filter(medianOf) : pts;
    const med = src.map((p, i) => ({ day: p.day, v: median(src.slice(Math.max(0, i - 3), i + 1).map(q => q.v)) }));
    s += \`<path d="\${med.map((p, i) => (i ? 'L' : 'M') + X(p.day) + ' ' + Y(p.v)).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>\`;
  }
  if (lineOnly) s += \`<path d="\${pts.map((p, i) => (i ? 'L' : 'M') + X(p.day) + ' ' + Y(p.v)).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>\`;
  if (bars !== 'self') s += pts.map((p, i) => \`<circle class="m\${onClick ? ' clk' : ''}" data-i="\${i}" cx="\${X(p.day)}" cy="\${Y(p.v)}" r="\${onClick ? 6 : lineOnly ? 5 : 4.5}" fill="\${p.c || 'var(--accent)'}" stroke="var(--surface)" stroke-width="2"\${onClick ? ' tabindex="0" role="button"' : ''}/>\`).join('');
  const last = pts[pts.length - 1];
  if (bars !== 'self') s += \`<text class="lbl" x="\${X(last.day) + 8}" y="\${Y(last.v) + 4}" style="fill:var(--ink)">\${yfmt(last.v)}</text>\`;
  s += '</svg>'; el.innerHTML = s;
  const svg = el.querySelector('svg');
  bindHover(el, svg, [...svg.querySelectorAll('.m')].map(n => [n, tip(pts[+n.dataset.i])]));
  if (onClick) svg.querySelectorAll('.m').forEach(n => { n.addEventListener('click', () => onClick(pts[+n.dataset.i])); n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(pts[+n.dataset.i]); } }); });
}
// ---- the workout popup (runs and rides) ----
const WK = document.getElementById('wk');
WK.addEventListener('click', e => { if (e.target === WK || e.target.closest('.x')) WK.close(); });
const zoneRow = z => z && z.some(v => v > 0) ? \`<div class="zbar">\${z.map((v, i) => \`<i style="flex:\${Math.max(v, 0)};background:var(--z\${i + 1})" title="Z\${i + 1} \${Math.round(v)} min"></i>\`).join('')}</div><div class="zl">\${z.map((v, i) => \`<span>Z\${i + 1} \${Math.round(v)} min</span>\`).join('')}</div>\` : '';
const row = (k, v) => v === null || v === undefined || v === '' ? '' : \`<dt>\${k}</dt><dd>\${v}</dd>\`;
function openWorkout({ kind, id, name, day, big, rows, zones }) {
  WK.innerHTML = \`<div class="hd"><div><h3 id="wk-title">\${esc(name)}</h3><div class="when">\${new Date(day + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} &middot; \${kind}</div></div><button class="x" type="button" aria-label="Close">&times;</button></div>
<div class="big">\${big.map(([k, v, u]) => \`<div><div class="k">\${k}</div><div class="v">\${v}\${u ? \`<small>\${u}</small>\` : ''}</div></div>\`).join('')}</div>
\${zoneRow(zones)}
<dl>\${rows.map(([k, v]) => row(k, v)).join('')}</dl>
<div class="ft"><a href="https://www.strava.com/activities/\${id}" target="_blank" rel="noopener">Open in Strava &rarr;</a><span class="note">Strava id \${id}</span></div>\`;
  WK.showModal();
}
const openRun = r => openWorkout({ kind: 'Run', id: r.id, name: r.name, day: r.day,
  big: [['Distance', r.km, 'km'], ['Pace', fmt(r.pace), '/km'], ['Moving time', fmt(r.min * 60), '']],
  zones: r.zones,
  rows: [['Average HR', Math.round(r.hr) + ' bpm'], ['Pace at Zone 2', r.pace_z2 ? \`\${fmt(r.pace_z2)}/km over \${r.z2_min} min\` : 'under 5 min in Z2'], ['hrTSS', r.tss], ['HR drift', r.drift !== null ? (r.drift > 0 ? '+' : '') + r.drift + '%' : null], ['Pace-to-HR decoupling', r.decouple !== null ? r.decouple + '%' : null], ['Second half', r.fade !== null ? (r.fade > 0 ? \`\${Math.round(r.fade)} s/km slower\` : r.fade < 0 ? \`\${Math.round(-r.fade)} s/km faster\` : 'same pace') + \`, HR \${r.hr_rise > 0 ? '+' : ''}\${r.hr_rise}\` : null], ['Fastest 5 km', r.b5k ? fmt(r.b5k) : null], ['Fastest 3 km', r.b3k ? fmt(r.b3k) : null], ['Half marathon by Riegel', r.pred ? fmtH(r.pred.hm) : null], ['Elevation', r.elev !== null ? Math.round(r.elev) + ' m' : null]] });
const openRide = r => openWorkout({ kind: \`Ride &middot; \${r.kind}\`, id: r.strava_id, name: r.name, day: r.day,
  big: [['Distance', r.km, 'km'], ['Speed', (r.km / (r.moving_time / 3600)).toFixed(1), 'km/h'], ['Moving time', fmtH(r.moving_time), '']],
  zones: r.zones,
  rows: [['Average power', Math.round(r.average_watts) + ' W'], ['Normalized power', r.weighted_average_watts + ' W'], ['Average HR', Math.round(r.average_heartrate) + ' bpm' + (r.max_heartrate ? \` (max \${Math.round(r.max_heartrate)})\` : '')], ['Watts per heart beat', r.wpb.toFixed(2)], ['Watts at Zone 2', r.w_z2 ? \`\${r.w_z2} W over \${r.z2_min} min\` : 'under 5 min in Z2'], ['Best 20 min', r.best20 ? r.best20 + ' W' : null], ['Power at 178 bpm (fit)', r.p178 ? r.p178 + ' W' : null], ['Power-to-HR decoupling', r.decouple !== null ? r.decouple + '%' : null], ['Second half', r.w_fade !== null && r.w_fade !== undefined ? \`\${r.w_fade > 0 ? '+' : ''}\${r.w_fade} W, HR \${r.hr_rise > 0 ? '+' : ''}\${r.hr_rise}\` : null], ['hrTSS', r.hr_tss], ['HR drift', r.hr_drift_pct !== null && r.hr_drift_pct !== undefined ? (r.hr_drift_pct > 0 ? '+' : '') + r.hr_drift_pct + '%' : null], ['Cadence', r.average_cadence ? Math.round(r.average_cadence) + ' rpm' : null], ['Elevation', r.total_elevation_gain !== null ? Math.round(r.total_elevation_gain) + ' m' : null], ['Calories', r.calories ? Math.round(r.calories) : null]] });
function stacked(el, weeks, from, to, ymax, { colors = null, every = 2, label = m => dayFmt(m), ref = null, refLabel = '', pct = false } = {}) {
  const f = frame(el, { pad: { l: 40, r: 10, t: 10, b: 26 } });
  const mondays = []; for (let d = from; d <= to; d = from.length === 7 ? (m => { const [y, mo] = m.split('-').map(Number); return mo === 12 ? \`\${y + 1}-01\` : \`\${y}-\${String(mo + 1).padStart(2, '0')}\`; })(d) : new Date(Date.parse(d + 'T00:00:00Z') + 7 * 86400000).toISOString().slice(0, 10)) mondays.push(d);
  const bw = (f.x1 - f.x0) / mondays.length, barW = Math.max(8, bw * 0.62);
  const Y = v => f.y1 - v / ymax * (f.y1 - f.y0);
  let s = \`<svg viewBox="0 0 \${f.w} \${f.H}" role="img">\`;
  for (const t of yTicks(0, ymax, 4)) s += \`<line x1="\${f.x0}" x2="\${f.x1}" y1="\${Y(t)}" y2="\${Y(t)}" stroke="var(--grid)"/><text x="\${f.x0 - 6}" y="\${Y(t) + 4}" text-anchor="end">\${Math.round(t)}\${pct ? '%' : ''}</text>\`;
  const byWeek = Object.fromEntries(weeks.map(w => [w.week, w.z]));
  const marks = [];
  mondays.forEach((m, i) => {
    const x = f.x0 + i * bw + (bw - barW) / 2, z = byWeek[m];
    if (i % every === 0) s += \`<text x="\${x + barW / 2}" y="\${f.H - 8}" text-anchor="middle">\${label(m)}</text>\`;
    if (!z) { s += \`<line x1="\${x}" x2="\${x + barW}" y1="\${f.y1}" y2="\${f.y1}" stroke="var(--axis)" stroke-width="2"/>\`; return; }
    let acc = 0;
    z.forEach((v, k) => { if (v <= 0) return; const y1 = Y(acc), y2 = Y(acc + v); const h = Math.max(0, y1 - y2 - 2); s += \`<rect class="m" data-w="\${m}" data-k="\${k}" x="\${x}" y="\${y2 + 1}" width="\${barW}" height="\${h}" rx="\${k === z.length - 1 || !z.slice(k + 1).some(Boolean) ? 3 : 0}" fill="\${colors ? colors[k] : \`var(--z\${k + 1})\`}"/>\`; acc += v; });
    if (pct) { let a2 = 0; z.forEach((v, k) => { if (v >= 9 && barW >= 26) s += \`<text x="\${x + barW / 2}" y="\${(Y(a2) + Y(a2 + v)) / 2 + 4}" text-anchor="middle" style="fill:\${k >= 2 ? '#fff' : 'var(--ink)'};font-size:11px">\${Math.round(v)}%</text>\`; a2 += v; }); }

  });
  if (ref !== null) s += \`<line x1="\${f.x0}" x2="\${f.x1}" y1="\${Y(ref)}" y2="\${Y(ref)}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 4"/><text class="lbl" x="\${f.x1}" y="\${Y(ref) - 5}" text-anchor="end" style="fill:var(--ink)">\${refLabel}</text>\`;
  s += '</svg>'; el.innerHTML = s;
  const svg = el.querySelector('svg');
  bindHover(el, svg, [...svg.querySelectorAll('.m')].map(n => { const z = byWeek[n.dataset.w]; return [n, colors ? \`\${label(n.dataset.w)}<br>\` + z.map((v, k) => \`\${SPORT_NAMES[k]} \${pct ? Math.round(v) + '%' : v.toFixed(1) + ' h'}\`).join(' &middot; ') : \`Week of \${dayFmt(n.dataset.w)}<br>\` + z.map((v, k) => \`Z\${k + 1} \${Math.round(v)} min\`).join(' &middot; ')]; }));
}
const zoneLegend = id => document.getElementById(id).innerHTML = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map((t, i) => \`<span><i style="background:var(--z\${i + 1})"></i>\${t}</span>\`).join('');
const itile = (k, v, unit, info, color, sub = '', tab = '') => \`<div class="tile" data-info tabindex="0"\${tab ? \` data-tab="\${tab}"\` : ''}><div class="k">\${color ? \`<i style="background:\${color}"></i>\` : ''}\${k}</div><div class="v">\${v}\${unit ? \`<small>\${unit}</small>\` : ''}</div>\${sub ? \`<div class="d">\${sub}</div>\` : ''}<div class="pop">\${info}</div></div>\`;
const tile = (k, v, unit, d, color) => \`<div class="tile"><div class="k">\${color ? \`<i style="background:\${color}"></i>\` : ''}\${k}</div><div class="v">\${v}\${unit ? \`<small>\${unit}</small>\` : ''}</div>\${d ? \`<div class="d">\${d}</div>\` : ''}</div>\`;

// ---- legends that follow the data shown ----
const RUN_LABEL = { easy: 'Easy', long: 'Long (10 km+)', hard: 'Hard (HR 163+)', int: 'Intervals' }, RIDE_LABEL = { road: 'Road', gravel: 'Gravel', indoor: 'Indoor' };
function legendFor(sel, present, colors, labels, extras, n = 2) {
  document.querySelectorAll(sel).forEach(el => {
    const ex = (el.dataset.extra || '').split(',').filter(Boolean);
    el.innerHTML = Object.keys(labels).filter(k => present.has(k)).map(k => \`<span><i style="background:\${colors[k]}"></i>\${labels[k]}</span>\`).join('') +
      (ex.includes('median') && n >= 2 ? \`<span><i class="line" style="background:var(--accent)"></i>\${extras.median}</span>\` : '') +
      (ex.includes('goal') ? \`<span><i class="dash"></i>\${extras.goal}</span>\` : '');
  });
}
// ---- running ----
const runs = DATA.runs;
const z2 = runs.filter(r => r.pace_z2).map(r => ({ day: r.day, v: r.pace_z2, r }));
const firstZ2 = z2.slice(0, 4).map(p => p.v), lastZ2 = z2.slice(-4).map(p => p.v);
const z2Then = median(firstZ2), z2Now = median(lastZ2);
const riegel = (t, d1, d2) => t * Math.pow(d2 / d1, 1.06);
const hmPts = runs.filter(r => r.b5k).map(r => ({ day: r.day, v: r.pred.hm, r }));
const recent = runs.filter(r => r.b5k && dayNum(r.day) >= dayNum(TODAY) - 56);
const best5 = Math.min(...recent.map(r => r.b5k));
const trainPred = { '5k': riegel(best5, 5000, 5000), '10k': riegel(best5, 5000, 10000), hm: riegel(best5, 5000, 21097.5) };
const longest = runs.reduce((a, r) => r.km > a.km ? r : a);
const runKind = r => /interval|fartlek|tempo|track|\\b\\d{3}\\b|\\d{3}['\\u2019]?s/i.test(r.name) ? 'int' : r.hr >= 163 ? 'hard' : r.km >= 10 ? 'long' : 'easy';
const RKIND = { easy: 'var(--r-easy)', long: 'var(--r-long)', hard: 'var(--r-hard)', int: 'var(--r-int)' }, RNAME = { easy: 'easy', long: 'long', hard: 'hard', int: 'intervals' };
const held = runs.filter(r => r.decouple !== null).map(r => ({ day: r.day, v: r.decouple, c: RKIND[runKind(r)], k: runKind(r), r }));
const fade = held.map(p => ({ ...p, v: p.r.fade }));
let holdKind = 'all';
const heldShown = () => holdKind === 'all' ? held : held.filter(p => p.k === holdKind);
function insightHtml() {
  const steady = held.filter(p => p.k !== 'int'), aer = steady.filter(p => p.k === 'easy' || p.k === 'long'), hard = held.filter(p => p.k === 'hard');
  const first = aer.slice(0, Math.min(4, Math.floor(aer.length / 2))), last = aer.slice(-Math.min(4, Math.floor(aer.length / 2)));
  const mFirst = median(first.map(p => p.v)), mLast = median(last.map(p => p.v));
  const longs = steady.filter(p => p.k === 'long').sort((a, b) => a.day < b.day ? -1 : 1);
  const bestLong = longs.filter(p => p.v < 5).reduce((a, p) => !a || p.r.km > a.r.km ? p : a, null);
  const lastLong = longs[longs.length - 1];
  const hardFade = hard.length ? median(hard.map(p => p.r.fade)) : null;
  const verdict = mLast < mFirst - 1 ? 'better' : mLast > mFirst + 1 ? 'worse' : 'about the same';
  return \`<p><b>The short version:</b> on easy and long runs you hold your effort \${verdict === 'better' ? 'better than in the summer' : verdict === 'worse' ? 'less well than in the summer' : 'about as well as in the summer'}. The median decoupling of your first \${first.length} easy or long runs in the last 3 months was <b>\${mFirst.toFixed(1)}%</b>; the last \${last.length} sit at <b>\${mLast.toFixed(1)}%</b>. Anything under 5% means the engine kept up with the pace for the whole run.</p>
<p><b>Long runs:</b> \${bestLong ? \`the longest run you held under 5% is <b>\${bestLong.r.km} km</b> on \${dayFmt(bestLong.day)} (\${bestLong.v}%).\` : 'no run of 10 km or more has stayed under 5% yet.'} \${lastLong ? \`Your most recent long run, \${lastLong.r.km} km on \${dayFmt(lastLong.day)}, came in at \${lastLong.v}%\${lastLong.v < 5 ? ', which is held' : lastLong.v < 10 ? ': the pace held, but heart rate drifted up ' + lastLong.r.hr_rise + ' bpm to do it. Normal for a run this long, and the number to watch as the distance grows' : ': the effort was not held over that distance yet'}.\` : ''} For the half marathon the target is simple: 15 km and then 18 km under 5%. When the long-run dots stay low while the distance rises, progress is real.</p>
<p><b>Hard runs:</b> \${hard.length ? \`they sit at \${median(hard.map(p => p.v)).toFixed(0)}% and the second half is typically <b>\${Math.round(hardFade)} s/km slower</b> than the first. That is a pacing signal, not a fitness one: the opening kilometres are faster than what you can hold. Starting 10 to 15 s/km slower would bring the fade toward zero and the finishing time down.\` : 'no hard runs yet.'} Intervals fade by design and are left out of the trend line.</p>
<div class="how"><b>Holding the effort</b> is aerobic decoupling: how much speed per heart beat the second half of a run lost against the first. Under 5% is held, 5 to 10% is drifting, above 10% the pace was only kept by a climbing heart rate, or not kept at all. Runs of 20 minutes or more.<br><br><b>Second-half fade</b> is how many seconds per km slower the second half was than the first. Zero is an even split, below zero a negative split. The best race pacing sits at zero.<br><br>Each dot or bar is one run; click it to open the run. Use the run-type dropdown to look at one kind of run at a time. Progress looks like dots drifting down from left to right while the long runs get longer.</div>\`;
}
function openInsight() {
  WK.innerHTML = \`<div class="hd"><div><h3 id="wk-title">What this says about holding a pace</h3><div class="when">Written from your runs in the last 3 months</div></div><button class="x" type="button" aria-label="Close">&times;</button></div><div class="body">\${insightHtml()}</div>\`;
  WK.showModal();
}
document.getElementById('hold-pick').addEventListener('change', e => { holdKind = e.target.value; DRAW.run(); });
document.getElementById('race-table').innerHTML = \`<table style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:14px">
<thead><tr style="color:var(--muted);font-size:12px;text-align:left"><th style="padding:6px 0;font-weight:500">Distance</th><th style="font-weight:500;color:var(--accent)">From training</th><th style="font-weight:500">Pace</th></tr></thead>
<tbody>\${[['5 km', '5k', 5], ['10 km', '10k', 10], ['Half marathon', 'hm', 21.0975]].map(([n, k, km]) => \`<tr style="border-top:1px solid var(--grid)"><td style="padding:8px 0">\${n}</td><td style="font-family:var(--mono)">\${fmtH(trainPred[k])}</td><td style="font-family:var(--mono);color:var(--ink2)">\${fmt(trainPred[k] / km)}/km</td></tr>\`).join('')}</tbody></table>
<p class="note" style="margin:10px 0 0">No race in the last 3 months, so there is no race anchor yet. A parkrun or a timed 5 km every couple of months would give one.</p>\`;

document.getElementById('run-tiles').innerHTML =
  itile('Pace at Zone 2', fmt(z2Now), '/km', \`<b>Median of the last 4 runs</b> with at least 5 min at 146 to 162 bpm.<br>First 4 runs in the window: \${fmt(z2Then)}/km, so \${z2Then > z2Now ? fmt(z2Then - z2Now) + ' faster' : fmt(z2Now - z2Then) + ' slower'} now.<br>Faster at the same heart rate means a bigger aerobic base.\`, null, z2Then > z2Now ? \`<b>\${fmt(z2Then - z2Now)} faster</b> since July\` : \`\${fmt(z2Now - z2Then)} slower since July\`) +
  itile('Half marathon', fmtH(trainPred.hm), '', \`<b>Riegel's formula</b> on your best 5 km inside a training run in the last 8 weeks: \${fmt(best5)}.<br>Training efforts are never all-out, so this is a floor. A timed 5 km would give a real anchor.\`, 'var(--accent)', 'from training, a floor') +
  itile('Runs', runs.length, '', \`<b>Last 3 months</b><br>\${runs.reduce((a, r) => a + r.km, 0).toFixed(0)} km &middot; \${runs.reduce((a, r) => a + r.min, 0) / 60 | 0} h<br>\${runs.filter(r => runKind(r) === 'easy').length} easy, \${runs.filter(r => runKind(r) === 'long').length} long, \${runs.filter(r => runKind(r) === 'hard').length} hard, \${runs.filter(r => runKind(r) === 'int').length} intervals\`) +
  itile('Longest run', longest.km.toFixed(1), 'km', \`<b>\${esc(longest.name)}</b>, \${dayFmt(longest.day)}<br>\${fmt(longest.pace)}/km at HR \${Math.round(longest.hr)}<br>Goal: 21.1 km. Safe growth is about 10% per step.\`, null, \`goal 21.1 km\`);
const WK_FROM = monday(SINCE), WK_TO = monday(TODAY);
const zmax = Math.max(...[...DATA.zones.Run, ...DATA.zones.Ride].filter(w => w.week >= WK_FROM).map(w => w.z.reduce((a, b) => a + b, 0)));
const ymaxZ = Math.ceil(zmax / 40) * 40;

// ---- cycling ----
const runWeeks = DATA.zones.Run.filter(w => w.week >= WK_FROM);
const zonesByWeek = rows => { const m = {}; for (const r of rows) { if (!r.zones || r.zones[0] === null) continue; const z = m[monday(r.day)] || (m[monday(r.day)] = [0, 0, 0, 0, 0]); r.zones.forEach((v, i) => z[i] += v || 0); } return Object.keys(m).sort().map(week => ({ week, z: m[week] })); };
const runMin = runWeeks.reduce((a, w) => a + w.z.reduce((x, y) => x + y, 0), 0);
const runZ2share = Math.round(100 * runWeeks.reduce((a, w) => a + w.z[1], 0) / runMin);
const KIND = { road: 'var(--road)', gravel: 'var(--gravel)', indoor: 'var(--indoor)' };
let rideKind = 'all';
const rk = list => rideKind === 'all' ? list : list.filter(p => p.r.kind === rideKind);
document.getElementById('ride-pick').addEventListener('change', e => { rideKind = e.target.value; DRAW.ride(); });
const rheld = DATA.ride_rows.filter(r => r.decouple !== null).map(r => ({ day: r.day, v: r.decouple, c: KIND[r.kind], r }));
function rideInsightHtml() {
  const all = rheld, first = all.slice(0, Math.min(4, Math.floor(all.length / 2))), last = all.slice(-Math.min(4, Math.floor(all.length / 2)));
  const mFirst = median(first.map(p => p.v)), mLast = median(last.map(p => p.v));
  const heldN = all.filter(p => p.v < 5).length, best = all.reduce((a, p) => p.v < a.v ? p : a);
  const fadeMed = median(all.map(p => p.r.w_fade)), riseMed = median(all.map(p => p.r.hr_rise));
  const verdict = mLast < mFirst - 1 ? 'better' : mLast > mFirst + 1 ? 'worse' : 'about the same';
  return \`<p><b>The short version:</b> on the bike you hold your effort \${verdict === 'better' ? 'better than in July' : verdict === 'worse' ? 'less well than in July' : 'about as well as in July'}. The median power-to-heart-rate decoupling of your first \${first.length} rides in the last 3 months was <b>\${mFirst.toFixed(1)}%</b>; the last \${last.length} sit at <b>\${mLast.toFixed(1)}%</b>. \${heldN} of \${all.length} rides stayed under 5%\${best ? \`; the best was \${best.v}% on \${dayFmt(best.day)} (\${esc(best.r.name)})\` : ''}.</p>
<p><b>What the second half says:</b> in a typical ride your power in the second half is <b>\${fadeMed > 0 ? '+' : ''}\${Math.round(fadeMed)} W</b> against the first while heart rate moves \${riseMed > 0 ? '+' : ''}\${riseMed} bpm. Power dropping while heart rate rises is the classic sign the aerobic base is not yet carrying the ride length. Power holding while heart rate rises a few beats is normal drift from heat and dehydration. Power rising in the second half means you started too easy or finished hard, which is fine for training but not for pacing a long ride.</p>
<p><b>Why this is a better test on the bike than on foot:</b> power is measured directly, so wind, gradient and surface do not blur it the way they blur running pace. Indoor rides are the cleanest comparison of all, because nothing but you changes between rides. A decoupling under 5% on a 90-minute Zone 2 ride is the aerobic base you need before 200 W in Zone 2 becomes realistic.</p>
<div class="how"><b>Holding the effort</b> is power-to-heart-rate decoupling: how much power per heart beat the second half of the ride lost against the first. Under 5% held, 5 to 10% drifting, above 10% not held. Rides of 20 minutes or more.<br><br><b>Second-half power</b> is the average watts of the second half minus the first. Zero means even pacing; below zero the power faded.<br><br>Each dot or bar is one ride; click it to open the ride. The ride-type dropdown at the top filters every chart on this tab. Type is Strava's own sport type, kept by the sync since 17 October.</div>\`;
}
function openRideInsight() {
  WK.innerHTML = \`<div class="hd"><div><h3 id="wk-title">What this says about holding an effort on the bike</h3><div class="when">Written from your rides in the last 3 months</div></div><button class="x" type="button" aria-label="Close">&times;</button></div><div class="body">\${rideInsightHtml()}</div>\`;
  WK.showModal();
}
const rides = DATA.ride_rows.map(r => ({ day: r.day, v: r.wpb, c: KIND[r.kind], r }));
const wz2 = DATA.ride_rows.filter(r => r.w_z2).map(r => ({ day: r.day, v: r.w_z2, c: KIND[r.kind], r }));
function rideTiles(rows, wz, wb) {
  const el = document.getElementById('ride-tiles');
  if (!rows.length) { el.innerHTML = '<p class="note">No rides of this type in the last 3 months.</p>'; return; }
  const weeks = zonesByWeek(rows), min = weeks.reduce((a, w) => a + w.z.reduce((x, y) => x + y, 0), 0);
  const z2share = min ? Math.round(100 * weeks.reduce((a, w) => a + w.z[1], 0) / min) : 0, runZ2 = Math.round(100 * runWeeks.reduce((a, w) => a + w.z[1], 0) / runWeeks.reduce((a, w) => a + w.z.reduce((x, y) => x + y, 0), 0));
  const b20 = rows.filter(r => r.best20).reduce((a, r) => !a || r.best20 > a.best20 ? r : a, null), p = rows.filter(r => r.p178).map(r => r.p178);
  const p178 = p.length ? Math.round(median(p)) : null, ftp = b20 ? Math.round(Math.max(b20.best20 * 0.95, p178 || 0)) : p178;
  const one = rideKind === 'all' ? 'ride' : RIDE_LABEL[rideKind].toLowerCase() + ' ride', label = one + 's';
  el.innerHTML =
    (wz.length ? itile('Watts at Zone 2', wz[wz.length - 1].v, 'W', \`<b>Last \${one}</b>, average power while the heart rate was 146 to 162.<br>Best: \${Math.max(...wz.map(q => q.v))} W on \${dayFmt(wz.reduce((a, q) => q.v > a.v ? q : a).day)}.<br>Goal: 200 W in Zone 2, which needs an FTP near 270 W.\`, 'var(--accent)', 'goal 200 W') : itile('Watts at Zone 2', '&ndash;', '', 'No ride of this type with 5 minutes in Zone 2.')) +
    (ftp ? itile('FTP estimate', ftp, 'W', \`<b>No test yet</b>, so estimates from \${label}:<br>\${b20 ? \`0.95 &times; best 20 min: \${Math.round(b20.best20 * 0.95)} W (\${b20.best20} W on \${dayFmt(b20.day)})<br>\` : ''}\${p178 ? \`Power at your threshold heart rate, 178 bpm, median: \${p178} W<br>\` : ''}A 20-minute test on the trainer would pin this down.\`, null, \`from \${label}\`) : itile('FTP estimate', '&ndash;', '', 'Not enough data for this type.')) +
    itile('Watts per heart beat', wb[wb.length - 1].v.toFixed(2), 'W/bpm', \`<b>Last \${one}</b>: average power divided by average heart rate.<br>First in the last 3 months: \${wb[0].v.toFixed(2)}. Rising means a stronger aerobic engine.\`) +
    itile(rideKind === 'all' ? 'Rides' : RIDE_LABEL[rideKind] + ' rides', rows.length, '', \`<b>Last 3 months</b>, e-bike commutes left out<br>\${Math.round(min)} min in \${weeks.length} weeks with a ride<br>\${z2share}% of the time in Zone 2 (runs: \${runZ2}%) &middot; \${Math.round(weeks.reduce((a, w) => a + w.z[3] + w.z[4], 0))} hard minutes (Z4+Z5)\`, null, \`\${Math.round(min / 60)} h in the last 3 months\`);
  wirePopovers();
}

// ---- strength ----
const HW = DATA.hw, HSETS = DATA.hsets.filter(s => s.set_type !== 'warmup' && !/warm up|cooldown/i.test(s.exercise_title));
const workSets = HSETS.filter(s => s.weight_kg > 0 && s.reps > 0);
const exNames = [...new Set(workSets.map(s => s.exercise_title))].map(n => ({ n, days: new Set(workSets.filter(s => s.exercise_title === n).map(s => s.day)).size })).sort((a, b) => b.days - a.days || a.n.localeCompare(b.n));
let EX = 'all';
const pick = document.getElementById('ex-pick');
pick.innerHTML = \`<option value="all" selected>All exercises</option>\` + exNames.map(e => \`<option value="\${esc(e.n)}">\${esc(e.n)} (\${e.days})</option>\`).join('');
pick.addEventListener('change', () => { EX = pick.value; strengthView(); DRAW.strength(); });
const sessionsOf = ex => { const by = {}; for (const s of workSets.filter(s => s.exercise_title === ex)) { const g = by[s.day] || (by[s.day] = { day: s.day, sets: [], e1rm: 0, top: 0, volume: 0 }); g.sets.push({ reps: s.reps, kg: s.weight_kg }); g.e1rm = Math.max(g.e1rm, s.e1rm || s.weight_kg * (1 + s.reps / 30)); g.top = Math.max(g.top, s.weight_kg); g.volume += s.weight_kg * s.reps; } return Object.values(by).sort((a, b) => a.day < b.day ? -1 : 1); };
const volOf = (wid, ex) => workSets.filter(s => s.workout_id === wid && (!ex || s.exercise_title === ex)).reduce((a, s) => a + s.weight_kg * s.reps, 0);
let bench = sessionsOf(EX);
const short = n => n === 'all' ? 'All exercises' : n.replace(/\\s*\\(.*\\)$/, '');
const bestPerExercise = () => exNames.map(e => { const s = sessionsOf(e.n); return { n: e.n, days: e.days, best: Math.max(...s.map(x => x.e1rm)), top: Math.max(...s.map(x => x.top)), last: s[s.length - 1] }; }).sort((a, b) => b.best - a.best);
function strengthView() {
  const lastW = HW[HW.length - 1], totVol = HW.reduce((a, w) => a + w.volume_kg, 0);
  const tiles = document.getElementById('bench-tiles');
  const common = itile('Gym sessions', HW.length, '', \`<b>In Hevy in the last 3 months</b><br>\${Math.round(totVol / 1000)} t moved in total<br>\${DATA.facts && DATA.facts.strength ? \`Strava has \${DATA.facts.strength.sessions} strength workouts in the same time\` : ''}\${DATA.facts && DATA.facts.strength && DATA.facts.strength.sessions > HW.length ? ', so some sessions were logged elsewhere.' : '.'}\`, 'var(--s-str)') +
    itile('Last workout', (lastW.volume_kg / 1000).toFixed(1), 't', \`<b>\${esc(lastW.title)}</b>, \${dayFmt(lastW.day)}<br>\${Math.round(lastW.volume_kg)} kg in \${lastW.sets} sets, \${Math.round(lastW.duration_min)} min\`);
  if (EX === 'all') {
    const bests = bestPerExercise(), top = bests[0];
    document.getElementById('ex-title').textContent = 'Best estimated 1RM per exercise';
    document.getElementById('ex-sessions').textContent = 'All sessions';
    document.getElementById('lg-bench').innerHTML = \`<span><i style="background:var(--s-str)"></i>Best e1RM</span><span><i style="background:var(--grid)"></i>Heaviest set lifted</span>\`;
    tiles.innerHTML = common +
      itile('Exercises logged', exNames.length, '', \`<b>With weight, in the last 3 months</b><br>\${exNames.slice(0, 6).map(e => \`\${short(e.n)} (\${e.days})\`).join(', ')}\${exNames.length > 6 ? ', &hellip;' : ''}\`) +
      itile('Strongest lift', top.best.toFixed(0), 'kg', \`<b>\${esc(short(top.n))}</b>, estimated 1RM<br>top set \${top.top} kg on \${dayFmt(top.last.day)}\`);
    document.getElementById('bench-table').innerHTML = \`<table style="width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums">
<thead><tr style="color:var(--muted);font-size:12px;text-align:left"><th style="padding:6px 0;font-weight:500">Day</th><th style="font-weight:500">Workout</th><th style="font-weight:500;text-align:right">Sets</th><th style="font-weight:500;text-align:right">Minutes</th><th style="font-weight:500;text-align:right">Volume</th></tr></thead>
<tbody>\${HW.map(w => \`<tr style="border-top:1px solid var(--grid)"><td style="padding:8px 8px 8px 0;white-space:nowrap">\${dayFmt(w.day)}</td><td>\${esc(w.title)}</td><td style="font-family:var(--mono);text-align:right">\${w.sets}</td><td style="font-family:var(--mono);text-align:right">\${Math.round(w.duration_min)}</td><td style="font-family:var(--mono);text-align:right">\${Math.round(w.volume_kg)} kg</td></tr>\`).join('')}</tbody></table>\`;
  } else {
    bench = sessionsOf(EX);
    const bestB = bench.reduce((a, b) => b.e1rm > a.e1rm ? b : a), lastB = bench[bench.length - 1];
    document.getElementById('ex-title').textContent = \`\${short(EX)}, estimated 1RM\`;
    document.getElementById('ex-sessions').textContent = \`\${short(EX)} sessions\`;
    document.getElementById('lg-bench').innerHTML = \`<span><i class="line" style="background:var(--accent)"></i>Estimated 1RM</span><span><i style="background:var(--muted)"></i>Heaviest working set</span>\`;
    tiles.innerHTML = common +
      itile(\`\${short(EX)}, best\`, bestB.e1rm.toFixed(0), 'kg', \`<b>Estimated 1RM</b>, Epley: weight &times; (1 + reps &divide; 30)<br>\${dayFmt(bestB.day)} &middot; top set \${bestB.top} kg<br>\${bestB.sets.map(s => s.reps + '@' + s.kg).join(' &middot; ')}\${isBench(EX) ? \`<br>Goal: \${BENCH_GOAL} kg, \${Math.round(BENCH_GOAL - bestB.e1rm)} kg to go\` : ''}\`, null, isBench(EX) ? \`goal \${BENCH_GOAL} kg\` : '') +
      itile(\`\${short(EX)}, last\`, lastB.e1rm.toFixed(0), 'kg', \`<b>\${dayFmt(lastB.day)}</b><br>\${lastB.sets.map(s => s.reps + '@' + s.kg).join(' &middot; ')}\` + (bench.length > 1 ? \`<br>\${Math.round((dayNum(lastB.day) - dayNum(bench[bench.length - 2].day)) / 7)} weeks after the session before; \${lastB.e1rm < bestB.e1rm ? Math.round(bestB.e1rm - lastB.e1rm) + ' kg under the best' : 'a new best'}\` : ''));
    document.getElementById('bench-table').innerHTML = \`<table style="width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums">
<thead><tr style="color:var(--muted);font-size:12px;text-align:left"><th style="padding:6px 0;font-weight:500">Day</th><th style="font-weight:500">Working sets</th><th style="font-weight:500;text-align:right">Volume</th><th style="font-weight:500;text-align:right">e1RM</th></tr></thead>
<tbody>\${bench.map(b => \`<tr style="border-top:1px solid var(--grid)"><td style="padding:8px 8px 8px 0;white-space:nowrap">\${dayFmt(b.day)}</td><td style="font-family:var(--mono);font-size:13px">\${b.sets.map(s => s.reps + '@' + s.kg).join(' &middot; ')} kg</td><td style="font-family:var(--mono);text-align:right">\${Math.round(b.volume)} kg</td><td style="font-family:var(--mono);text-align:right">\${b.e1rm.toFixed(1)}</td></tr>\`).join('')}</tbody></table>\`;
  }
  wirePopovers();
}
strengthView();
document.getElementById('range').textContent = \`\${dayFmt(SINCE)} to \${dayFmt(TODAY)}\`; document.getElementById('today').textContent = new Date(TODAY + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
function bestBars(el) {
  const rows = bestPerExercise().slice(0, 8), w = Math.max(280, el.clientWidth || 600), rowH = 26, H = rows.length * rowH + 10, L = 150;
  const max = Math.ceil(Math.max(...rows.map(r => r.best)) / 20) * 20, X = v => L + v / max * (w - L - 50);
  let s = \`<svg viewBox="0 0 \${w} \${H}" role="img">\`;
  rows.forEach((r, i) => {
    const y = 5 + i * rowH;
    s += \`<text x="\${L - 8}" y="\${y + 15}" text-anchor="end" class="lbl" style="fill:var(--ink)">\${esc(short(r.n)).slice(0, 22)}</text>\`;
    s += \`<rect class="m" data-i="\${i}" x="\${L}" y="\${y + 4}" width="\${X(r.top) - L}" height="14" rx="3" fill="var(--grid)"/>\`;
    s += \`<rect class="m" data-i="\${i}" x="\${L}" y="\${y + 4}" width="\${X(r.best) - L}" height="14" rx="3" fill="var(--s-str)" opacity=".85"/>\`;
    s += \`<text x="\${X(Math.max(r.best, r.top)) + 6}" y="\${y + 15}">\${r.best.toFixed(0)} kg</text>\`;
  });
  s += '</svg>'; el.innerHTML = s;
  const svg = el.querySelector('svg');
  bindHover(el, svg, [...svg.querySelectorAll('.m')].map(nd => { const r = rows[+nd.dataset.i]; return [nd, \`\${esc(r.n)}<br>best e1RM \${r.best.toFixed(1)} kg &middot; heaviest set \${r.top} kg<br>\${r.days} session\${r.days === 1 ? '' : 's'}, last \${dayFmt(r.last.day)}\`]; }));
  svg.querySelectorAll('.m').forEach(nd => { nd.style.cursor = 'pointer'; nd.addEventListener('click', () => { EX = rows[+nd.dataset.i].n; pick.value = EX; strengthView(); DRAW.strength(); }); });
}
function volumeChart(el) {
  const f = frame(el, { pad: { l: 44, r: 12, t: 14, b: 26 } });
  const n = HW.length, slot = (f.x1 - f.x0) / Math.max(n, 6), bw = Math.min(56, slot * 0.6);
  const ymax = Math.ceil(Math.max(...HW.map(w => w.volume_kg)) / 1000) * 1000;
  const Y = v => f.y1 - v / ymax * (f.y1 - f.y0);
  let s = \`<svg viewBox="0 0 \${f.w} \${f.H}" role="img">\`;
  for (const t of yTicks(0, ymax, 4)) s += \`<line x1="\${f.x0}" x2="\${f.x1}" y1="\${Y(t)}" y2="\${Y(t)}" stroke="var(--grid)"/><text x="\${f.x0 - 6}" y="\${Y(t) + 4}" text-anchor="end">\${t >= 1000 ? (t / 1000) + ' t' : t}</text>\`;
  const marks = [];
  HW.forEach((w, i) => {
    const x = f.x0 + i * slot + (slot - bw) / 2, ex = EX === 'all' ? 0 : volOf(w.id, EX);
    s += \`<rect class="m" data-i="\${i}" x="\${x}" y="\${Y(w.volume_kg)}" width="\${bw}" height="\${Math.max(0, f.y1 - Y(w.volume_kg))}" rx="3" fill="\${EX === 'all' ? 'var(--s-str)' : 'var(--grid)'}"/>\`;
    if (ex > 0) s += \`<rect class="m" data-i="\${i}" x="\${x}" y="\${Y(ex)}" width="\${bw}" height="\${Math.max(0, f.y1 - Y(ex))}" rx="3" fill="var(--s-str)"/>\`;
    s += \`<text x="\${x + bw / 2}" y="\${f.H - 8}" text-anchor="middle">\${dayFmt(w.day)}</text>\`;
  });
  s += '</svg>'; el.innerHTML = s;
  const svg = el.querySelector('svg');
  bindHover(el, svg, [...svg.querySelectorAll('.m')].map(nd => { const w = HW[+nd.dataset.i], ex = volOf(w.id, EX); return [nd, \`\${dayFmt(w.day)} &middot; \${esc(w.title)}<br>\${Math.round(w.volume_kg)} kg in \${w.sets} sets, \${Math.round(w.duration_min)} min\` + (EX === 'all' ? '' : \`<br>\${short(EX)}: \${Math.round(ex)} kg\`)]; }));
  const lg = el.closest('.card').querySelector('.legend'); if (lg) lg.innerHTML = EX === 'all' ? \`<span><i style="background:var(--s-str)"></i>Session volume</span>\` : \`<span><i style="background:var(--s-str)"></i>\${esc(short(EX))}</span><span><i style="background:var(--grid)"></i>Rest of the session</span>\`;
}

// ---- summary ----
const SPORTS = ['Run', 'Ride', 'Swim', 'WeightTraining'], SPORT_NAMES = ['Running', 'Cycling', 'Swimming', 'Strength'], SPORT_COLORS = ['var(--s-run)', 'var(--s-ride)', 'var(--s-swim)', 'var(--s-str)'];
const weeksSince = (dayNum(TODAY) - dayNum(SINCE) + 1) / 7;
const all = DATA.all;
const monthOf = d => d.slice(0, 7);
const group = key => { const m = {}; for (const r of all) { const k = key(r.day); const g = m[k] || (m[k] = { h: [0, 0, 0, 0], km: [0, 0, 0, 0], n: [0, 0, 0, 0] }); const i = SPORTS.indexOf(r.sport); g.h[i] += r.h; g.km[i] += r.km; g.n[i]++; } return m; };
const byMonth = group(monthOf), byWeekS = group(monday);
const months = Object.keys(byMonth).sort();
const monthWeeks = m => { const [y, mo] = m.split('-').map(Number); const last = m === monthOf(TODAY) ? Number(TODAY.slice(8)) : new Date(Date.UTC(y, mo, 0)).getUTCDate(); return last / 7; };
const tot = all.reduce((a, r) => a + r.h, 0);
const sumBy = i => all.filter(r => r.sport === SPORTS[i]).reduce((a, r) => ({ h: a.h + r.h, km: a.km + r.km }), { h: 0, km: 0 });
const monthName = m => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
// The five boxes: a moving window of the last 13 weeks (91 days up to today); the detail is in a popover.
const WIN_DAYS = 91, winFrom = new Date((dayNum(TODAY) - WIN_DAYS + 1) * 86400000).toISOString().slice(0, 10);
const win = all.filter(r => r.day >= winFrom), winWeeks = WIN_DAYS / 7;
const winTot = win.reduce((a, r) => a + r.h, 0);
const winBy = i => win.filter(r => r.sport === SPORTS[i]).reduce((a, r) => ({ h: a.h + r.h, km: a.km + r.km, n: a.n + 1 }), { h: 0, km: 0, n: 0 });
const per = (x, w) => (x / w).toFixed(1);
document.getElementById('sum-tiles').innerHTML =
  itile('Training', winTot.toFixed(1), 'h', \`<b>\${dayFmt(winFrom)} to \${dayFmt(TODAY)}</b>, 13 weeks<br>\${win.length} sessions &middot; \${per(winTot, winWeeks)} h a week<br>Runs, rides, swims and strength. E-bike commutes, walks and hikes are not counted.\`) +
  itile('Per week', per(winTot, winWeeks), 'h', \`<b>Weekly average over the last 13 weeks</b><br>Goal on the dashboard: 6 h, which also counts e-bike commutes.<br>Best week in the last 3 months: \${Math.max(...Object.values(byWeekS).map(g => g.h.reduce((a, b) => a + b, 0))).toFixed(1)} h\`) +
  itile('Running', winBy(0).km.toFixed(0), 'km', \`<b>Last 13 weeks</b><br>\${winBy(0).n} runs &middot; \${winBy(0).h.toFixed(1)} h &middot; \${per(winBy(0).km, winWeeks)} km a week<br>Longest: \${longest.km} km on \${dayFmt(longest.day)}\`, 'var(--s-run)', '', 'run') +
  itile('Cycling', winBy(1).km.toFixed(0), 'km', \`<b>Last 13 weeks</b><br>\${winBy(1).n} rides &middot; \${winBy(1).h.toFixed(1)} h &middot; \${per(winBy(1).km, winWeeks)} km a week<br>E-bike commutes not included.\`, 'var(--s-ride)', '', 'ride') +
  itile('Strength', winBy(3).h.toFixed(1), 'h', \`<b>Last 13 weeks</b><br>\${winBy(3).n} sessions &middot; \${per(winBy(3).h, winWeeks)} h a week<br>From Strava; the Hevy detail is on the Strength tab.\`, 'var(--s-str)', '', 'strength');
function wirePopovers() {
  document.querySelectorAll('.tile[data-info]:not([data-wired])').forEach(t => {
    t.dataset.wired = 1;
    const toggle = () => { const on = t.classList.contains('open'); document.querySelectorAll('.tile.open').forEach(x => x.classList.remove('open')); if (!on) t.classList.add('open'); };
    t.addEventListener('click', e => { if (t.dataset.tab && e.target.closest('.k')) { show(t.dataset.tab); window.scrollTo({ top: 0 }); return; } toggle(); });
    t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } if (e.key === 'Escape') t.classList.remove('open'); });
  });
}
document.addEventListener('click', e => { if (!e.target.closest('.tile[data-info]')) document.querySelectorAll('.tile.open').forEach(x => x.classList.remove('open')); if (!e.target.closest('.card')) document.querySelectorAll('.card.open').forEach(x => x.classList.remove('open')); });

// This month against last: two cumulative lines by day of the month.
const dom = Number(TODAY.slice(8)), thisM = monthOf(TODAY), prevM = (([y, m]) => m === 1 ? \`\${y - 1}-12\` : \`\${y}-\${String(m - 1).padStart(2, '0')}\`)(thisM.split('-').map(Number));
const daysIn = m => { const [y, mo] = m.split('-').map(Number); return new Date(Date.UTC(y, mo, 0)).getUTCDate(); };
const MVM = [{ key: 'all', name: 'All sports', unit: 'h' }, { key: 'Run', name: 'Running', unit: 'km' }, { key: 'Ride', name: 'Cycling', unit: 'km' }, { key: 'WeightTraining', name: 'Strength', unit: 'h' }];
let mvm = MVM[0];
const cumul = (m, key, unit, upto) => { const n = upto || daysIn(m); const out = []; let acc = 0; for (let d = 1; d <= n; d++) { for (const r of all) if (monthOf(r.day) === m && Number(r.day.slice(8)) === d && (key === 'all' || r.sport === key)) acc += unit === 'km' ? r.km : r.h; out.push(acc); } return out; };
const mvmPick = document.getElementById('mvm-pick');
mvmPick.innerHTML = MVM.map(o => \`<button type="button" data-k="\${o.key}" aria-pressed="\${o === mvm}">\${o.name}</button>\`).join('');
mvmPick.addEventListener('click', e => { const btn = e.target.closest('button'); if (!btn) return; mvm = MVM.find(o => o.key === btn.dataset.k); mvmPick.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === btn)); DRAW.summary(); });
function mvmChart(el) {
  const cur = cumul(thisM, mvm.key, mvm.unit, dom), prev = cumul(prevM, mvm.key, mvm.unit), prevSame = prev[dom - 1] || 0;
  const f = frame(el, { H: 230, pad: { l: 44, r: 56, t: 14, b: 26 } });
  const nd = Math.max(daysIn(thisM), daysIn(prevM)), top = Math.max(cur[cur.length - 1], prev[prev.length - 1], mvm.unit === 'km' ? 10 : 1);
  const ymax = mvm.unit === 'km' ? Math.ceil(top / 20) * 20 : Math.ceil(top / 2) * 2;
  const X = d => f.x0 + (d - 1) / (nd - 1) * (f.x1 - f.x0), Y = v => f.y1 - v / ymax * (f.y1 - f.y0);
  let s = \`<svg viewBox="0 0 \${f.w} \${f.H}" role="img">\`;
  for (const t of yTicks(0, ymax, 4)) s += \`<line x1="\${f.x0}" x2="\${f.x1}" y1="\${Y(t)}" y2="\${Y(t)}" stroke="var(--grid)"/><text x="\${f.x0 - 6}" y="\${Y(t) + 4}" text-anchor="end">\${mvm.unit === 'km' ? Math.round(t) : t.toFixed(ymax > 8 ? 0 : 1)}</text>\`;
  for (const d of [1, 5, 10, 15, 20, 25, 30]) if (d <= nd) s += \`<text x="\${X(d)}" y="\${f.H - 8}" text-anchor="middle">\${d}</text>\`;
  s += \`<line x1="\${X(dom)}" x2="\${X(dom)}" y1="\${f.y0}" y2="\${f.y1}" stroke="var(--axis)" stroke-dasharray="2 3"/><text x="\${X(dom)}" y="\${f.y0 - 3}" text-anchor="middle">today</text>\`;
  const path = (arr, upto) => arr.slice(0, upto).map((v, i) => (i ? 'L' : 'M') + X(i + 1) + ' ' + Y(v)).join(' ');
  s += \`<path d="\${path(prev, prev.length)}" fill="none" stroke="var(--ink2)" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>\`;
  s += \`<path d="\${path(cur, cur.length)}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>\`;
  const fmtV = v => mvm.unit === 'km' ? Math.round(v) + ' km' : v.toFixed(1) + ' h';
  s += \`<circle cx="\${X(prev.length)}" cy="\${Y(prev[prev.length - 1])}" r="4" fill="var(--ink2)" stroke="var(--surface)" stroke-width="2"/><text x="\${X(prev.length) + 8}" y="\${Y(prev[prev.length - 1]) + 4}" style="fill:var(--ink2)">\${fmtV(prev[prev.length - 1])}</text>\`;
  s += \`<circle cx="\${X(dom)}" cy="\${Y(cur[dom - 1])}" r="4.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/><text class="lbl" x="\${X(dom) + 8}" y="\${Y(cur[dom - 1]) + 4}" style="fill:var(--ink)">\${fmtV(cur[dom - 1])}</text>\`;
  // hover: a day across both lines
  s += \`<line class="cur" x1="0" x2="0" y1="\${f.y0}" y2="\${f.y1}" stroke="var(--ink)" visibility="hidden"/><rect x="\${f.x0}" y="\${f.y0}" width="\${f.x1 - f.x0}" height="\${f.y1 - f.y0}" fill="transparent" class="hit"/></svg>\`;
  el.innerHTML = s;
  const svg = el.querySelector('svg'), tip = tipFor(el), line = svg.querySelector('.cur'), hit = svg.querySelector('.hit');
  hit.addEventListener('mousemove', e => { const r = svg.getBoundingClientRect(), p = el.getBoundingClientRect(); const d = Math.max(1, Math.min(nd, Math.round(1 + (e.clientX - r.left) / r.width * f.w / (f.x1 - f.x0) * (nd - 1) - (f.x0 / (f.x1 - f.x0)) * (nd - 1)))); line.setAttribute('x1', X(d)); line.setAttribute('x2', X(d)); line.setAttribute('visibility', 'visible'); tip.innerHTML = \`Day \${d}<br>\${monthName(thisM)}: \${d <= dom ? fmtV(cur[d - 1]) : '&ndash;'}<br>\${monthName(prevM)}: \${d <= prev.length ? fmtV(prev[d - 1]) : '&ndash;'}\`; tip.style.left = (X(d) / f.w * r.width + r.left - p.left) + 'px'; tip.style.top = (r.top - p.top + 10) + 'px'; tip.style.visibility = 'visible'; });
  hit.addEventListener('mouseleave', () => { line.setAttribute('visibility', 'hidden'); tip.style.visibility = 'hidden'; });
  const d = cur[dom - 1] - prevSame, pct = prevSame ? Math.round(d / prevSame * 100) : null;
  document.getElementById('mvm-title').textContent = \`\${mvm.name}: \${monthName(thisM)} against \${monthName(prevM)}\`;
  document.getElementById('mvm-why').innerHTML = \`Running total by day of the month. By the \${dom}th, \${monthName(thisM)} stands at <b>\${fmtV(cur[dom - 1])}</b> against \${fmtV(prevSame)} at the same point in \${monthName(prevM)}\${pct !== null ? \` (\${pct > 0 ? '+' : ''}\${pct}%)\` : ''}. \${monthName(prevM)} ended at \${fmtV(prev[prev.length - 1])}.\`;
  document.getElementById('lg-this').textContent = monthName(thisM); document.getElementById('lg-prev').textContent = monthName(prevM);
}
['lg-sports', 'lg-sports3'].forEach(id => document.getElementById(id).innerHTML = SPORT_NAMES.map((n, i) => \`<span><i style="background:\${SPORT_COLORS[i]}"></i>\${n}</span>\`).join(''));
const cell = v => \`<td style="font-family:var(--mono);text-align:right;padding:8px 0 8px 10px">\${v}</td>\`;
document.getElementById('sum-table').innerHTML = \`<table style="width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums;min-width:560px">
<thead><tr style="color:var(--muted);font-size:12px;text-align:right"><th style="text-align:left;padding:6px 0;font-weight:500">Month</th>\${SPORT_NAMES.map((n, i) => \`<th style="font-weight:500;padding-left:10px"><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:\${SPORT_COLORS[i]};margin-right:5px"></i>\${n}</th>\`).join('')}<th style="font-weight:500;padding-left:10px">Total</th><th style="font-weight:500;padding-left:10px">Per week</th></tr></thead>
<tbody>\${months.map(m => { const g = byMonth[m], t = g.h.reduce((a, b) => a + b, 0); return \`<tr style="border-top:1px solid var(--grid)"><td style="padding:8px 0;white-space:nowrap">\${monthName(m)}\${m === monthOf(TODAY) ? ' <span class="note">to ' + TODAY.slice(8) + '</span>' : ''}</td>\${g.h.map((h, i) => cell(h ? h.toFixed(1) + ' h' + (g.km[i] >= 1 ? \`<br><span style="color:var(--muted)">\${g.km[i].toFixed(0)} km</span>\` : '') : '<span style="color:var(--muted)">&ndash;</span>')).join('')}\${cell('<b>' + t.toFixed(1) + ' h</b>')}\${cell((t / monthWeeks(m)).toFixed(1) + ' h')}</tr>\`; }).join('')}
<tr style="border-top:2px solid var(--axis);color:var(--ink2)"><td style="padding:8px 0">Last 3 months</td>\${SPORTS.map((_, i) => cell(sumBy(i).h.toFixed(1) + ' h' + (sumBy(i).km >= 1 ? \`<br><span style="color:var(--muted)">\${sumBy(i).km.toFixed(0)} km</span>\` : ''))).join('')}\${cell('<b>' + tot.toFixed(1) + ' h</b>')}\${cell((tot / weeksSince).toFixed(1) + ' h')}</tr></tbody></table>\`;
const monthRows = months.map(m => ({ week: m, z: byMonth[m].h }));
let period = 'month';
document.getElementById('period-pick').addEventListener('change', e => { period = e.target.value; DRAW.summary(); });
const weekShareRows = () => weekRows.map(w => { const t = w.z.reduce((a, b) => a + b, 0); return { week: w.week, z: w.z.map(h => t ? 100 * h / t : 0) }; });
const shareRows = months.map(m => { const t = byMonth[m].h.reduce((a, b) => a + b, 0); return { week: m, z: byMonth[m].h.map(h => t ? 100 * h / t : 0) }; });
// ---- the coach's weekly note, written in the Quest Engine (GET /trends); Rewrite asks for it again ----
(function coach() {
  const el = document.getElementById('coach'), c = DATA.coach;
  if (!c) { el.innerHTML = \`<p class="note" style="grid-column:1/-1">The coach has not written this week's note yet. It is written on the first visit in a new week\${DATA.ai === false ? ', once OpenAI is set up on the Quest Engine' : ''}.</p>\`; return; }
  el.innerHTML = \`<div><div class="k">This week's read</div>\${c.headline ? \`<p class="say">\${esc(c.headline)}</p>\` : ''}\${(c.read || []).map(p => \`<p>\${esc(p)}</p>\`).join('')}</div>
<div><div class="k">Do this week</div><ul>\${(c.do || []).map(x => \`<li>\${esc(x)}</li>\`).join('')}</ul></div>
<footer style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span>Written \${dayFmt(c.day)}\${c.stale ? ' &middot; more than a week old' : ''}.</span><button type="button" id="coach-rewrite" style="font:600 12px var(--body);padding:4px 10px;border-radius:999px;border:1px solid var(--axis);background:var(--surface);color:var(--ink2);cursor:pointer">Rewrite</button><span id="coach-status" class="note"></span></footer>\`;
  document.getElementById('coach-rewrite').addEventListener('click', async e => {
    const btn = e.currentTarget, status = document.getElementById('coach-status');
    btn.disabled = true; status.textContent = 'Asking the coach…';
    try {
      const r = await fetch('/trends/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force: true }) });
      const d = await r.json();
      if (d.ok === 1) location.reload(); else { status.textContent = d.message || 'The coach did not answer.'; btn.disabled = false; }
    } catch (err) { status.textContent = 'The coach did not answer.'; btn.disabled = false; }
  });
})();
const weekRows = Object.keys(byWeekS).sort().map(w => ({ week: w, z: byWeekS[w].h }));
const wmax = Math.ceil(Math.max(...weekRows.map(w => w.z.reduce((a, b) => a + b, 0))) / 2) * 2;

const DRAW = {
  summary() {
    mvmChart(document.getElementById('c-mvm'));
    document.getElementById('hours-title').textContent = \`Hours per sport, by \${period}\`; document.getElementById('share-title').textContent = \`Share per sport, by \${period}\`;
    if (period === 'week') {
      stacked(document.getElementById('c-months'), weekRows, WK_FROM, WK_TO, wmax, { colors: SPORT_COLORS, every: 2, label: w => dayFmt(w), ref: tot / weeksSince, refLabel: 'avg ' + (tot / weeksSince).toFixed(1) + ' h' });
      stacked(document.getElementById('c-share'), weekShareRows(), WK_FROM, WK_TO, 100, { colors: SPORT_COLORS, every: 2, label: w => dayFmt(w), pct: true });
      return;
    }
    stacked(document.getElementById('c-share'), shareRows, months[0], months[months.length - 1], 100, { colors: SPORT_COLORS, every: 1, label: monthName, pct: true });
    stacked(document.getElementById('c-months'), monthRows, months[0], months[months.length - 1], Math.ceil(Math.max(...monthRows.map(w => w.z.reduce((a, b) => a + b, 0))) / 5) * 5, { colors: SPORT_COLORS, every: 1, label: monthName });
  },
  run() {
    const shown = heldShown();
    legendFor('.lg-run', new Set(shown.map(p => p.k)), RKIND, RUN_LABEL, { median: holdKind === 'int' ? '4-run median' : '4-run median, intervals left out' }, shown.length);
    dotLine(document.getElementById('c-decouple'), shown, { yfmt: v => v.toFixed(0) + '%', ylo: 0, yhi: 16, median4: shown.length > 1, medianOf: p => holdKind === 'int' || p.k !== 'int',
      bands: [[0, 5, 'rgba(26,127,60,.10)', 'held'], [5, 10, 'rgba(178,107,0,.10)', 'drifting'], [10, 16, 'rgba(227,73,72,.10)', 'not held']],
      tip: p => \`\${dayFmt(p.day)} &middot; \${esc(p.r.name)} &middot; \${RNAME[p.k]}<br>decoupling \${p.v}% &middot; \${p.r.km} km at \${fmt(p.r.pace)}, HR \${Math.round(p.r.hr)}<br>second half \${p.r.fade > 0 ? p.r.fade + ' s/km slower' : p.r.fade < 0 ? -p.r.fade + ' s/km faster' : 'same pace'}, HR \${p.r.hr_rise > 0 ? '+' : ''}\${p.r.hr_rise}\`, onClick: p => openRun(p.r) });
    dotLine(document.getElementById('c-fade'), shown.map(p => ({ ...p, v: p.r.fade })), { yfmt: v => (v > 0 ? '+' : '') + Math.round(v) + ' s', ylo: -15, yhi: 45, bars: 'self', zero: true,
      tip: p => \`\${dayFmt(p.day)} &middot; \${esc(p.r.name)} &middot; \${RNAME[p.k]}<br>second half \${p.v > 0 ? p.v + ' s/km slower' : p.v < 0 ? -p.v + ' s/km faster' : 'same pace'} &middot; HR \${p.r.hr_rise > 0 ? '+' : ''}\${p.r.hr_rise} bpm\`, onClick: p => openRun(p.r) });
dotLine(document.getElementById('c-z2pace'), z2, { yfmt: fmt, ylo: 330, yhi: 400, invert: true, median4: true,
  tip: p => \`\${dayFmt(p.day)} &middot; \${esc(p.r.name)}<br>\${fmt(p.v)}/km at Z2 &middot; \${p.r.z2_min} min in Z2<br>whole run \${p.r.km} km at \${fmt(p.r.pace)}, HR \${Math.round(p.r.hr)}\`, onClick: p => openRun(p.r) });
stacked(document.getElementById('c-runzones'), DATA.zones.Run, WK_FROM, WK_TO, ymaxZ); zoneLegend('lg-runzones');
  },
  ride() {
    const rows = rideKind === 'all' ? DATA.ride_rows : DATA.ride_rows.filter(r => r.kind === rideKind);
    const rs = rk(rheld), wz = rk(wz2), wb = rk(rides);
    rideTiles(rows, wz, wb);
    legendFor('.lg-ride', new Set(rows.map(r => r.kind)), KIND, RIDE_LABEL, { median: '4-ride median', goal: 'Goal 200 W' }, rows.length);
    stacked(document.getElementById('c-ridezones'), zonesByWeek(rows), WK_FROM, WK_TO, ymaxZ); zoneLegend('lg-ridezones');
    dotLine(document.getElementById('c-rdecouple'), rs, { yfmt: v => v.toFixed(0) + '%', ylo: 0, yhi: 16, median4: rs.length > 1,
      bands: [[0, 5, 'rgba(26,127,60,.10)', 'held'], [5, 10, 'rgba(178,107,0,.10)', 'drifting'], [10, 16, 'rgba(227,73,72,.10)', 'not held']],
      tip: p => \`\${dayFmt(p.day)} &middot; \${esc(p.r.name)} &middot; \${p.r.kind}<br>decoupling \${p.v}% &middot; \${p.r.km} km, \${Math.round(p.r.average_watts)} W at HR \${Math.round(p.r.average_heartrate)}<br>second half \${p.r.w_fade > 0 ? '+' : ''}\${p.r.w_fade} W, HR \${p.r.hr_rise > 0 ? '+' : ''}\${p.r.hr_rise}\`, onClick: p => openRide(p.r) });
    dotLine(document.getElementById('c-rfade'), rs.map(p => ({ ...p, v: p.r.w_fade })), { yfmt: v => (v > 0 ? '+' : '') + Math.round(v) + ' W', ylo: -40, yhi: 20, bars: 'self', zero: true,
      tip: p => \`\${dayFmt(p.day)} &middot; \${esc(p.r.name)} &middot; \${p.r.kind}<br>second half \${p.v > 0 ? '+' : ''}\${p.v} W against the first &middot; HR \${p.r.hr_rise > 0 ? '+' : ''}\${p.r.hr_rise} bpm\`, onClick: p => openRide(p.r) });
    dotLine(document.getElementById('c-wz2'), wz, { yfmt: v => Math.round(v) + ' W', ylo: 100, yhi: 220, median4: wz.length > 1, ref: 200, refLabel: 'goal 200 W',
      tip: p => \`\${dayFmt(p.day)} &middot; \${esc(p.r.name)}<br>\${p.v} W at Zone 2 over \${p.r.z2_min} min<br>best 20 min \${p.r.best20} W &middot; power at 178 bpm \${p.r.p178} W\`, onClick: p => openRide(p.r) });
  },
  strength() {
    volumeChart(document.getElementById('c-vol'));
    if (EX === 'all') { bestBars(document.getElementById('c-bench')); return; }
    const top = Math.max(...bench.map(x => x.e1rm)), lo = Math.max(0, Math.floor((Math.min(...bench.map(x => x.top)) - 10) / 10) * 10), hi = Math.ceil((top + 10) / 10) * 10;
    dotLine(document.getElementById('c-bench'), bench.map(x => ({ day: x.day, v: x.e1rm, top: x.top, b: x })), { yfmt: v => Math.round(v) + ' kg', ylo: lo, yhi: isBench(EX) ? Math.max(hi, BENCH_GOAL + 10) : hi, lineOnly: true, bars: 'top', ref: isBench(EX) ? BENCH_GOAL : null, refLabel: \`goal \${BENCH_GOAL} kg\`,
      tip: p => \`\${dayFmt(p.day)}<br>e1RM \${p.v.toFixed(1)} kg &middot; top set \${p.top} kg<br>\${p.b.sets.map(s => s.reps + '@' + s.kg).join(' &middot; ')}\` });
  },
};
// ---- explanations behind a ? on each card ----
document.querySelectorAll('.card').forEach(card => {
  const h3 = card.querySelector('h3'), why = card.querySelector('.why');
  if (!h3 || !why) return;
  const btn = document.createElement('button'); btn.className = 'ibtn'; btn.type = 'button'; btn.textContent = '?'; btn.setAttribute('aria-label', 'What this chart shows');
  const wrap = h3.parentElement;
  if (wrap !== card && wrap.children.length > 1) { h3.insertAdjacentElement('afterend', btn); }
  else { const hd = document.createElement('div'); hd.className = 'hd3'; h3.replaceWith(hd); hd.append(h3, btn); }
  if (card.hasAttribute('data-insight')) { why.remove(); btn.style.cursor = 'pointer'; const open = card.getAttribute('data-insight') === 'ride' ? openRideInsight : openInsight; btn.addEventListener('click', e => { e.stopPropagation(); open(); }); return; }
  const title = h3.textContent, text = why.innerHTML; why.remove();
  btn.addEventListener('click', e => { e.stopPropagation(); WK.innerHTML = \`<div class="hd"><div><h3 id="wk-title">\${esc(title)}</h3><div class="when">What this chart shows</div></div><button class="x" type="button" aria-label="Close">&times;</button></div><div class="body"><p>\${text}</p></div>\`; WK.showModal(); });
});
const tabs = [...document.querySelectorAll('[role="tab"]')];
let active = null;
function show(id, push = true) {
  const desk = id === 'desk';
  document.querySelector('.wrap').classList.toggle('desk', desk);
  const dl = document.getElementById('desk-link'); dl.textContent = desk ? 'Full page' : 'Desk view'; dl.href = desk ? '#summary' : '#desk';
  if (desk) id = 'summary';
  if (!DRAW[id]) id = 'summary';
  tabs.forEach(t => { const on = t.getAttribute('aria-controls') === id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; document.getElementById(t.getAttribute('aria-controls')).hidden = !on; });
  active = id; DRAW[id]();
  if (push) { try { history.replaceState(null, '', '#' + (desk ? 'desk' : id)); } catch (e) {} }
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => show(t.getAttribute('aria-controls')));
  t.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault(); const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); show(n.getAttribute('aria-controls')); });
});
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => active && DRAW[active](), 120); });
show((location.hash || '').slice(1), false);
document.getElementById('desk-link').addEventListener('click', e => { e.preventDefault(); show(document.querySelector('.wrap').classList.contains('desk') ? 'summary' : 'desk'); });
</script></body></html>`;
