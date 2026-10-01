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

The **journal page** at `/journal` (`src/journal.js` data and saving,
`src/journalpage.js` page) is where Roy writes the day's journal on the iPad
or phone: Morning above Evening, then the main quest check-in and a note per
active quest. The Notion Journal stays the record: each answer is saved a
moment after he stops typing into that day's Journal row, in the template's
own boxes (so the Quest Engine's 03:00 digest reads it as before), and what
the template has no box for goes in one ✍️ "More from today" callout. The
top of `src/journal.js` lists where each piece goes. Each quest's question
comes from the Quest Engine's 03:00 AI call (`GET /journal/questions`, with
`QUEST_ENGINE_TOKEN`); until it has one for today, a plain fallback shows.
Full description and change log: the Notion page "🧭 Admin Dashboard".

| Area | Reads |
|---|---|
| Cross Border | Notion Work Location Log (from 1 Jul 2026, AM/PM half-days, E-bike €) |
| Health | Notion Workouts (Strava sync), Body Metrics (Withings sync), Sleep & Recovery (Apple Health) and the Health Journey's active quests |
| System Health | Quest Engine `GET /status` and `GET /ledger`, healthchecks.io, newest Workouts / Body Metrics rows (the Quest Engine's Strava and Withings syncs) |
| Quick Links | `src/config.js` |

It writes two things: at 07:00 Amsterdam it rewrites the 🌍 callout on the
Notion Quest log with the buffer line (`src/questlog.js`), and the journal page
writes Roy's words into the day's Journal row (plus Success, and Done / the
journal link on a To-Dos row he ticks or picks). Targets, thresholds, links and the unit prices behind the
cost estimate are in `src/config.js`. The drift rules are in
`src/metrics.js`, as pure functions with tests.

The daily AI summary (`src/summary.js`) is one short OpenAI chat call, written
by the 05:00 Amsterdam timer (or on the first open after 05:00 if the timer
missed it) and kept in a small
Durable Object (`src/store.js`). It runs when `ADMIN_AI` in
`wrangler.jsonc` is `1` (on since 28 Sep 2026) and the `OPENAI_API_KEY` secret is set.

## Data: Notion and D1

The health and work tables (Workouts, Body Metrics, Sleep & Recovery, Work
Location Log) are moving from Notion to D1, the Quest Engine's database
`quest` (binding `DB`): see `docs/d1-migration.md` in rdecaste/quest-engine.
`HEALTH_STORE` in `wrangler.jsonc` says where they are read and written
(`notion` or `d1`, always the same as the Quest Engine's); `src/healthstore.js`
and `src/areas.js` are copies of the Quest Engine's `src/store.js` and
`src/areas.js`. With D1, saving a Commute sets E-bike € (€0.37 × 70 km =
€25.90, `EBIKE` in `src/config.js`); days paid before keep their amount.

The journal, To-Dos and Quests follow with step 2: `JOURNAL_STORE` (`notion`
or `d1`, the same as the Quest Engine's). With D1 the journal page reads
and saves the day as a `journal` row (its answers as columns, the focus
to-dos and quest notes as rows) in `src/journald1.js`; the Health tab's
quests and the win's To-Do go through the same store.

## Routes

| Route | What |
|---|---|
| `GET /` (also `/questlog`) | The Quest log page (signed in, cached 5 minutes, `?fresh=1` reloads), otherwise the login |
| `GET /admin` | The dashboard (signed in), otherwise the login |
| `GET /journal` | The journal page for today (the day starts at 03:00 Amsterdam; signed in), otherwise the login |
| `POST /journal/save` | Writes what changed on the journal page into the Notion journal (signed in, JSON) |
| `GET /login`, `POST /login` | Login with `DASHBOARD_PASSWORD` (`next` = `/`, `/questlog`, `/admin` or `/journal`); a signed cookie lasts 30 days |
| `POST /logout` | Signs out |
| `GET /data` | Everything the dashboard shows, as JSON (signed in; cached 5 minutes, `?fresh=1` reloads) |
| `POST /summary` | Rewrite today's AI summary (signed in, at most once a minute); `?back=1` returns to `/` |

Timer (`wrangler.jsonc`, 03:00–06:00 UTC): whichever run is 05:00 in Amsterdam
writes the AI summary, whichever is 07:00 writes the 🌍 buffer line. Opening
`/` or `/data` does either if its timer missed.

## Setup

Secrets, set with `npx wrangler secret put <NAME>` (never in git):
`DASHBOARD_PASSWORD`, `NOTION_TOKEN` (a Notion connection with access to
Quest log and the Journal and To-Dos databases; Read content, plus Update content for the buffer line and the journal page), `QUEST_ENGINE_TOKEN` (the Quest Engine's `ADMIN_TOKEN`),
`HEALTHCHECKS_API_KEY` (read-only key) and, only for the AI summary,
`OPENAI_API_KEY`.

```bash
npm test          # drift rules, usage, login, Quest log page, journal page
npx wrangler dev  # local, with secrets in .dev.vars
```
