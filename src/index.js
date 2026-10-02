// Admin dashboard: a private cockpit over cross-border work, health and the
// automations (the Quest Engine with its Strava and Withings syncs, healthchecks.io).
//
//   GET  /         the landing page: the Quest log as one clean page for the
//                  iPad and phone (signed in; ?fresh=1 skips the 5-minute
//                  cache); /questlog is the same page
//   GET  /admin    the admin dashboard (signed in)
//   GET  /journal  the journal page: today's journal row (D1) as a calm place
//                  to write, morning and evening (signed in; src/journald1.js)
//   POST /journal/save  writes what changed on the journal page into the day's
//                  journal row in D1 (signed in; JSON)
//   GET  /journal/mood/1.webp … 5.webp  the mood row's pictures (signed in;
//                  src/moodart.js)
//   GET  /gym      the gym page: today's recovery (with an AI insight), how Roy
//                  feels, a Hevy routine or Custom (free text) → Generate builds
//                  the day's workout, Send to Hevy saves it there; the last
//                  workout with the coach's feedback. ?plan=<id> opens a plan
//                  just generated (signed in; src/gym.js, data from the Quest
//                  Engine's GET /gym)
//   POST /gym/generate|send|feedback|sync  the gym page's buttons, passed on to the
//                  Quest Engine (signed in; JSON)
//   POST /journal/evening-question  writes the evening's Reflection question
//                  from the morning (signed in; JSON { headspace, forward, winif };
//                  one OpenAI call, only when the morning changed)
//   Signed out, each page sends you to the login and back afterwards.
//   GET  /login    the login page; POST /login with the password
//   POST /logout   signs out
//   GET  /data     everything the page shows, as JSON (signed in)
//   POST /summary  rewrite today's AI summary now (signed in; one OpenAI call)
//   POST /run      rerun a scheduled Quest Engine job from the System health
//                  tab (signed in; JSON { job, dry }; the jobs are in src/rerun.js)
//
// All data is in the Quest Engine's D1 database `quest` (binding DB) since
// 1 Oct 2026; Notion is a read-only backup this Worker never calls. It reads
// Work Location Log, Workouts, Body Metrics, Sleep & Recovery, Quests,
// Journal and To-Dos from D1; the Quest Engine (service binding QUEST_ENGINE)
// for GET /status, /ledger, /questlog, /mainquest, /hero, /questboard and
// /journal/questions; and healthchecks.io. It writes only what Roy saves on
// the journal page: that day's journal row, its focus and quest notes, its
// To-Dos ("Win if") and the day's Work Location Log row, all in D1.
import { isSignedIn, sessionCookie, clearCookie, sameText } from './auth.js';
import { loadDashboard } from './load.js';
import { dashboardHtml, loginHtml } from './page.js';
import { loadToday } from './today.js';
import { todayHtml } from './todaypage.js';
import { loadJournal, saveJournal, journalDay } from './journal.js';
import { writeEveningQuestion, aiOn } from './eveningq.js';
import { journalHtml } from './journalpage.js';
import { MOOD_ART } from './moodart.js';
import { loadGym, gymAction } from './gym.js';
import { gymHtml } from './gympage.js';
import { summaryDue, writeSummary, isSummaryHour } from './summary.js';
import { store } from './usage.js';
import { runJob } from './rerun.js';
export { Store } from './store.js';

const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex'
};
const redirect = (to, cookie) => new Response(null, { status: 303, headers: { Location: to, ...(cookie ? { 'Set-Cookie': cookie } : {}) } });
// Where the login sends you back to: only the dashboard's own pages.
const NEXT = new Set(['/', '/questlog', '/admin', '/journal', '/gym']);
const nextPath = p => (NEXT.has(p) ? p : '/');
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default {
  async fetch(request, env, ctx) {
    const { pathname, searchParams } = new URL(request.url);
    const password = env.DASHBOARD_PASSWORD;
    try {
      if (pathname === '/login') {
        if (request.method === 'POST') {
          const form = await request.formData();
          const next = nextPath(String(form.get('next') || '/'));
          if (password && sameText(String(form.get('password') || '').trim(), password)) return redirect(next, await sessionCookie(password));
          await new Promise(r => setTimeout(r, 800));
          return new Response(loginHtml('That password is not right.', next), { status: 401, headers: PAGE_HEADERS });
        }
        const next = nextPath(searchParams.get('next') || '/');
        if (await isSignedIn(request, password)) return redirect(next);
        return new Response(loginHtml(password ? '' : 'DASHBOARD_PASSWORD is not set on the Worker.', next), { headers: PAGE_HEADERS });
      }
      if (pathname === '/logout' && request.method === 'POST') return redirect('/login', clearCookie());
      const signedIn = await isSignedIn(request, password);
      if (pathname === '/data') {
        if (!signedIn) return json({ ok: 0, code: 'signed_out' }, 401);
        const data = await loadDashboard(env, { fresh: searchParams.get('fresh') === '1' });
        if (summaryDue(env, data)) ctx.waitUntil(writeSummary(env, data).catch(e => console.error('summary', e && e.stack || e)));
        return json(data);
      }
      if (pathname === '/summary' && request.method === 'POST') {
        if (!signedIn) return json({ ok: 0, code: 'signed_out' }, 401);
        if (env.ADMIN_AI !== '1' || !env.OPENAI_API_KEY) return json({ ok: 0, code: 'ai_off' }, 400);
        const summary = await writeSummary(env, await loadDashboard(env, { fresh: true }), { force: true });
        if (searchParams.get('back') === '1') return redirect('/?fresh=1'); // the form on the Quest log page
        return json({ ok: 1, summary });
      }
      if (pathname === '/run' && request.method === 'POST') {
        if (!signedIn) return json({ ok: 0, code: 'signed_out' }, 401);
        if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ ok: 0, code: 'bad_request' }, 400);
        const body = await request.json().catch(() => null);
        try {
          const result = await runJob(env, String(body && body.job || ''), { dry: !!(body && body.dry) });
          return json({ ok: result.ok ? 1 : 0, text: result.text });
        } catch (e) {
          console.error('run', e && e.stack || e);
          return json({ ok: 0, code: e.code || 'server_error', text: String(e.message || e) }, e.code === 'bad_request' ? 400 : 500);
        }
      }
      if (pathname === '/' || pathname === '/questlog') {
        if (!signedIn) return redirect(pathname === '/' ? '/login' : '/login?next=/questlog');
        const fresh = searchParams.get('fresh') === '1';
        // The daily summary and the Quest log line are triggered here too, in
        // case their timer missed. An open that finds the summary due waits for
        // it so the bullets show at once. The Quest log page itself is read
        // while the dashboard data loads.
        const dashboard = loadDashboard(env, { fresh }).then(async dash => {
          if (summaryDue(env, dash)) {
            const summary = await writeSummary(env, dash).catch(e => { console.error('summary', e && e.stack || e); return null; });
            if (summary) { dash.summary = summary; dash.summary_written = true; }
          }
          return dash;
        });
        let today = await loadToday(env, { fresh, dashboard });
        // A page kept from before today's summary was written is built again.
        const dash = await dashboard.catch(() => null);
        if (dash && dash.summary_written && today.briefing?.summary?.text !== dash.summary.text) today = await loadToday(env, { fresh: true, dashboard: dash });
        return new Response(todayHtml(today), { headers: PAGE_HEADERS });
      }
      if (pathname === '/journal') {
        if (!signedIn) return redirect('/login?next=/journal');
        return new Response(journalHtml(await loadJournal(env)), { headers: PAGE_HEADERS });
      }
      const mood = pathname.match(/^\/journal\/mood\/([1-5])\.webp$/);
      if (mood) {
        if (!signedIn) return new Response('Not found', { status: 404 });
        const bytes = Uint8Array.from(atob(MOOD_ART[mood[1] - 1]), c => c.charCodeAt(0));
        return new Response(bytes, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
      }
      if (pathname === '/journal/save' && request.method === 'POST') {
        if (!signedIn) return json({ ok: 0, code: 'signed_out' }, 401);
        if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ ok: 0, code: 'bad_request' }, 400);
        try {
          return json(await saveJournal(env, await request.json()));
        } catch (e) {
          console.error('journal save', e && e.stack || e);
          const message = String(e.message || e);
          return json({ ok: 0, code: e.code || 'server_error', message }, e.code === 'bad_request' ? 400 : 500);
        }
      }
      if (pathname === '/journal/evening-question' && request.method === 'POST') {
        if (!signedIn) return json({ ok: 0, code: 'signed_out' }, 401);
        if (!aiOn(env)) return json({ ok: 0, code: 'ai_off' }, 400);
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') return json({ ok: 0, code: 'bad_request' }, 400);
        try {
          const q = await writeEveningQuestion(env, journalDay(), body);
          return json({ ok: 1, q: q ? q.text : null });
        } catch (e) {
          console.error('evening question', e && e.stack || e);
          return json({ ok: 0, code: 'server_error', message: String(e.message || e) }, 500);
        }
      }
      if (pathname === '/gym') {
        if (!signedIn) return redirect('/login?next=/gym');
        const gym = await loadGym(env);
        return new Response(gymHtml({ ...gym, open_plan: searchParams.get('plan') || null }), { headers: PAGE_HEADERS });
      }
      const gymButton = pathname.match(/^\/gym\/(generate|send|feedback|sync)$/);
      if (gymButton && request.method === 'POST') {
        if (!signedIn) return json({ ok: 0, code: 'signed_out' }, 401);
        if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ ok: 0, code: 'bad_request' }, 400);
        const body = await request.json().catch(() => null);
        try {
          return json(await gymAction(env, gymButton[1], body && typeof body === 'object' ? body : {}));
        } catch (e) {
          console.error('gym', e && e.stack || e);
          return json({ ok: 0, code: e.code || 'server_error', message: String(e.message || e) }, e.code === 'bad_request' ? 400 : 500);
        }
      }
      if (pathname === '/admin') return signedIn ? new Response(dashboardHtml(), { headers: PAGE_HEADERS }) : redirect('/login?next=/admin');
      return new Response('Not found', { status: 404 });
    } catch (e) {
      console.error(pathname, e && e.stack || e);
      return pathname === '/data' ? json({ ok: 0, code: 'server_error', message: String(e.message || e) }, 500) : new Response('Something went wrong.', { status: 500 });
    }
  },

  // Cron runs at 03:00-06:00 UTC; whichever is 05:00 in Amsterdam (summer or
  // winter time) writes the AI summary. (The 07:00 run wrote the 🌍 line on
  // the Notion Quest log until 1 Oct 2026.)
  async scheduled(event, env, ctx) {
    if (!isSummaryHour(event.scheduledTime)) return;
    const data = await loadDashboard(env, { fresh: true });
    if (summaryDue(env, data, event.scheduledTime)) await writeSummary(env, data);
  }
};
