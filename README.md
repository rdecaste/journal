# Admin dashboard

A private cockpit over the things Roy runs: the Belgium / Netherlands work
split, health and training, and the automations (the Quest Engine, the Make
syncs, healthchecks.io). It is exception-driven: each area is Healthy, Worth
watching or Needs attention, with the reasons. It runs as its own Cloudflare
Worker, separate from the Quest Engine.

The Worker also serves Roy's landing page, the **Quest log page** at `/`
(`src/today.js` data, `src/todaypage.js` page): the Quest log from Notion
(Morning Spark with today's journal link, 💬 notes, training and to-do
numbers), the hero and active quests from the Quest Engine (through the
`QUEST_ENGINE` service binding; a quest card opens its Notion page), the
cross-border numbers with today's work location, and one "Today's briefing"
card: the AI summary bullets, then one state chip per area linking to its tab
in `/admin`. The dashboard itself is at `/admin` and opens on Cross Border.
Full description and change log: the Notion page "🧭 Admin Dashboard".

| Area | Reads |
|---|---|
| Cross Border | Notion Work Location Log (from 1 Jul 2026, AM/PM half-days, E-bike €) |
| Health | Notion Workouts (Strava sync) and Body Metrics (Withings sync) |
| System Health | Quest Engine `GET /status` and `GET /ledger`, healthchecks.io, newest Workouts / Body Metrics rows (Make syncs) |
| Quick Links | `src/config.js` |

It reads, with one write: at 07:00 Amsterdam it rewrites the 🌍 callout on the
Notion Quest log with the buffer line (`src/questlog.js`). Targets, thresholds, links and the unit prices behind the
cost estimate are in `src/config.js`. The drift rules are in
`src/metrics.js`, as pure functions with tests.

The daily AI summary (`src/summary.js`) is one short OpenAI chat call, written
by the 05:00 Amsterdam timer (or on the first open after 05:00 if the timer
missed it) and kept in a small
Durable Object (`src/store.js`). It runs when `ADMIN_AI` in
`wrangler.jsonc` is `1` (on since 28 Sep 2026) and the `OPENAI_API_KEY` secret is set.

## Routes

| Route | What |
|---|---|
| `GET /` (also `/questlog`) | The Quest log page (signed in, cached 5 minutes, `?fresh=1` reloads), otherwise the login |
| `GET /admin` | The dashboard (signed in), otherwise the login |
| `GET /login`, `POST /login` | Login with `DASHBOARD_PASSWORD` (`next` = `/`, `/questlog` or `/admin`); a signed cookie lasts 30 days |
| `POST /logout` | Signs out |
| `GET /data` | Everything the dashboard shows, as JSON (signed in; cached 5 minutes, `?fresh=1` reloads) |
| `POST /summary` | Rewrite today's AI summary (signed in, at most once a minute); `?back=1` returns to `/` |

Timer (`wrangler.jsonc`, 03:00–06:00 UTC): whichever run is 05:00 in Amsterdam
writes the AI summary, whichever is 07:00 writes the 🌍 buffer line. Opening
`/` or `/data` does either if its timer missed.

## Setup

Secrets, set with `npx wrangler secret put <NAME>` (never in git):
`DASHBOARD_PASSWORD`, `NOTION_TOKEN` (a Notion connection with access to
Quest log; Read content, plus Update content for the buffer line), `QUEST_ENGINE_TOKEN` (the Quest Engine's `ADMIN_TOKEN`),
`HEALTHCHECKS_API_KEY` (read-only key) and, only for the AI summary,
`OPENAI_API_KEY`.

```bash
npm test          # drift rules, usage, login, Quest log page
npx wrangler dev  # local, with secrets in .dev.vars
```
