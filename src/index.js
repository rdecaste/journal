// Admin dashboard: a private cockpit over cross-border work, health and the
// automations (the Quest Engine with its Strava and Withings syncs, healthchecks.io).
//
//   GET  /         the landing page: the Quest log as one clean page for the
//                  iPad and phone (signed in; ?fresh=1 skips the 5-minute
//                  cache); /questlog is the same page
//   GET  /admin    the admin dashboard (signed in)
//   Signed out, each page sends you to the login and back afterwards.
//   GET  /login    the login page; POST /login with the password
//   POST /logout   signs out
//   GET  /data     everything the page shows, as JSON (signed in)
//   POST /summary  rewrite today's AI summary now (signed in; one OpenAI call)
//
// It reads Notion (Work Location Log, Workouts, Body Metrics, Sleep & Recovery,
// the Health Journey's quests), the Quest
// Engine's GET /status and GET /ledger, and healthchecks.io. The one thing it
// writes is the cross-border buffer line in the 🌍 callout on the Quest log
// page: each morning at 07:00 Amsterdam time (cron), or the first time the
// dashboard opens after that if the cron missed it.
import { isSignedIn, sessionCookie, clearCookie, sameText } from './auth.js';
import { loadDashboard } from './load.js';
import { dashboardHtml, loginHtml } from './page.js';
import { loadToday } from './today.js';
import { todayHtml } from './todaypage.js';
import { summaryDue, writeSummary, isSummaryHour } from './summary.js';
import { writeBufferLine, questLogDue, isQuestLogHour } from './questlog.js';
import { store } from './usage.js';
export { Store } from './store.js';

const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex'
};
const redirect = (to, cookie) => new Response(null, { status: 303, headers: { Location: to, ...(cookie ? { 'Set-Cookie': cookie } : {}) } });
// Where the login sends you back to: only the dashboard's own pages.
const NEXT = new Set(['/', '/questlog', '/admin']);
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
        ctx.waitUntil(store(env).get('questlog_day').then(day => questLogDue(day, data) ? writeBufferLine(env, data) : null).catch(e => console.error('questlog', e && e.stack || e)));
        return json(data);
      }
      if (pathname === '/summary' && request.method === 'POST') {
        if (!signedIn) return json({ ok: 0, code: 'signed_out' }, 401);
        if (env.ADMIN_AI !== '1' || !env.OPENAI_API_KEY) return json({ ok: 0, code: 'ai_off' }, 400);
        const summary = await writeSummary(env, await loadDashboard(env, { fresh: true }), { force: true });
        if (searchParams.get('back') === '1') return redirect('/?fresh=1'); // the form on the Quest log page
        return json({ ok: 1, summary });
      }
      if (pathname === '/' || pathname === '/questlog') {
        if (!signedIn) return redirect(pathname === '/' ? '/login' : '/login?next=/questlog');
        const fresh = searchParams.get('fresh') === '1';
        // The daily summary and the Quest log line are triggered here too, in
        // case their timer missed. An open that finds the summary due waits for
        // it so the bullets show at once.
        const dash = await loadDashboard(env, { fresh });
        let dueNow = false;
        if (summaryDue(env, dash)) {
          const summary = await writeSummary(env, dash).catch(e => { console.error('summary', e && e.stack || e); return null; });
          if (summary) { dash.summary = summary; dueNow = true; }
        }
        ctx.waitUntil(store(env).get('questlog_day').then(day => questLogDue(day, dash) ? writeBufferLine(env, dash) : null).catch(e => console.error('questlog', e && e.stack || e)));
        return new Response(todayHtml(await loadToday(env, { fresh: fresh || dueNow, dashboard: dash })), { headers: PAGE_HEADERS });
      }
      if (pathname === '/admin') return signedIn ? new Response(dashboardHtml(), { headers: PAGE_HEADERS }) : redirect('/login?next=/admin');
      return new Response('Not found', { status: 404 });
    } catch (e) {
      console.error(pathname, e && e.stack || e);
      return pathname === '/data' ? json({ ok: 0, code: 'server_error', message: String(e.message || e) }, 500) : new Response('Something went wrong.', { status: 500 });
    }
  },

  // Cron runs at 03:00-06:00 UTC; whichever is 05:00 in Amsterdam (summer or
  // winter time) writes the AI summary, and whichever is 07:00 writes the
  // Quest log line.
  async scheduled(event, env, ctx) {
    if (isSummaryHour(event.scheduledTime)) {
      const data = await loadDashboard(env, { fresh: true });
      if (summaryDue(env, data, event.scheduledTime)) await writeSummary(env, data);
      return;
    }
    if (!isQuestLogHour(event.scheduledTime)) return;
    const data = await loadDashboard(env, { fresh: true });
    if (!data.cross) throw new Error('Work Location Log not readable: ' + data.errors.join('; '));
    await writeBufferLine(env, data);
  }
};
