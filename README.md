# Admin dashboard

A private cockpit over the things Roy runs: the Belgium / Netherlands work
split, health and training, and the automations (the Quest Engine, the Make
syncs, healthchecks.io). It is exception-driven: each area is Healthy, Worth
watching or Needs attention, and the Overview lists exactly what is drifting
and why. It runs as its own Cloudflare Worker, separate from the Quest Engine.

| Area | Reads |
|---|---|
| Cross Border | Notion Work Location Log (from 1 Jul 2026, AM/PM half-days, E-bike €) |
| Health | Notion Workouts (Strava sync) and Body Metrics (Withings sync) |
| System Health | Quest Engine `GET /status` and `GET /ledger`, healthchecks.io, newest Workouts / Body Metrics rows (Make syncs) |
| Quick Links | `src/config.js` |

It only reads. Targets, thresholds, links and the unit prices behind the
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
| `GET /` | The dashboard (signed in), otherwise redirects to the login |
| `GET /login`, `POST /login` | Login with `DASHBOARD_PASSWORD`; a signed cookie lasts 30 days |
| `POST /logout` | Signs out |
| `GET /data` | Everything the page shows, as JSON (signed in; cached 5 minutes, `?fresh=1` reloads) |

## Setup

Secrets, set with `npx wrangler secret put <NAME>` (never in git):
`DASHBOARD_PASSWORD`, `NOTION_TOKEN` (a read-only Notion connection with
access to Quest log), `QUEST_ENGINE_TOKEN` (the Quest Engine's `ADMIN_TOKEN`),
`HEALTHCHECKS_API_KEY` (read-only key) and, only for the AI summary,
`OPENAI_API_KEY`.

```bash
npm test          # drift rules, usage, login
npx wrangler dev  # local, with secrets in .dev.vars
```
