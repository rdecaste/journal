# Admin dashboard

A private cockpit over the things Roy runs: the Belgium / Netherlands work
split, health and training, and the automations (the Quest Engine, the Make
syncs, healthchecks.io). It is exception-driven: each area is Healthy, Worth
watching or Needs attention, with the reasons. It runs as its own Cloudflare
Worker, separate from the Quest Engine.

The Worker also serves Roy's landing page, the **Quest log page** at `/`
(`src/today.js` data, `src/todaypage.js` page): the morning runs' texts
from the Quest Engine's `GET /questlog` (Morning Spark with today's journal
link, 💬 notes, training and to-do numbers; read off the Notion Quest log
page until 1 Oct 2026), the hero and active quests from the Quest Engine (through the
`QUEST_ENGINE` service binding; a quest card opens its Notion page), the
cross-border numbers with today's work location, and one "Today's briefing"
card: the AI summary bullets, then one state chip per area linking to its tab
in `/admin`. The dashboard itself is at `/admin` and opens on Cross Border.

The **journal page** at `/journal` (`src/journal.js` data and saving,
`src/journalpage.js` page) is where Roy writes the day's journal on the iPad
or phone: Morning above Evening, then the main quest check-in and a note per
active quest. The day is a row of the Quest Engine's D1 table `journal`,
saved when he taps Done, Close the day or Save (`src/journald1.js`; the top
of `src/journal.js` lists where each piece goes); the Quest Engine's 03:00
digest reads the same row. Each quest's question
comes from the Quest Engine's 03:00 AI call (`GET /journal/questions`, with
`QUEST_ENGINE_TOKEN`); until it has one for today, a plain fallback shows.
The **gym page** at `/gym` (`src/gym.js` buttons, `src/gympage.js` page) is
for the phone before the gym, in four steps:
1. Today's recovery, led by a short AI insight.
2. How Roy feels.
3. A Hevy routine, or Custom with free text.
4. The recommended workout, built by his progression rules, with **Send to Hevy**.

It also shows the last workout with the coach's feedback. Everything comes
from the Quest Engine (`GET /gym` and its Hevy routes, `src/hevy.js` there),
which holds the Hevy key.
Full description and change log: `docs/admin-dashboard.md` (moved from the
Notion page "🧭 Admin Dashboard" on 1 Oct 2026); keep it up to date with
each change.

| Area | Reads |
|---|---|
| Cross Border | Work Location Log (from 1 Jul 2026, AM/PM half-days, E-bike €) |
| Health | Workouts (Strava sync), Body Metrics (Withings sync), Sleep & Recovery (Apple Health) and the Health Journey's active quests |
| System Health | Quest Engine `GET /status` and `GET /ledger`, healthchecks.io, newest Workouts / Body Metrics rows (the Quest Engine's Strava and Withings syncs) |
| Quick Links | `src/config.js` |

It writes one thing: the journal page writes Roy's words into the day's
Journal row (plus Success, the day's Work Location row, and Done / the
journal link on a To-Dos row he ticks or picks). Until 1 Oct 2026 it also
wrote a 🌍 buffer line on the Notion Quest log. Targets, thresholds, links and the unit prices behind the
cost estimate are in `src/config.js`. The drift rules are in
`src/metrics.js`, as pure functions with tests.

The daily AI summary (`src/summary.js`) is one short OpenAI chat call, written
by the 05:00 Amsterdam timer (or on the first open after 05:00 if the timer
missed it) and kept in a small
Durable Object (`src/store.js`). It runs when `ADMIN_AI` in
`wrangler.jsonc` is `1` (on since 28 Sep 2026) and the `OPENAI_API_KEY` secret is set.

## Data: D1

All the data is in D1, the Quest Engine's database `quest` (binding `DB`),
since 1 Oct 2026 (moved from Notion: `docs/d1-migration.md` in
rdecaste/quest-engine; Notion is left as it was, as a backup). Browse and
edit it in the Cloudflare dashboard: D1 → quest → Data Studio.
`src/healthstore.js` and `src/areas.js` are copies of the Quest Engine's
`src/store.js` and `src/areas.js`. Saving a Commute sets E-bike € (€0.37 ×
70 km = €25.90, `EBIKE` in `src/config.js`); days paid before keep their
amount. The journal page reads and saves the day as a `journal` row (its
answers as columns, the focus to-dos and quest notes as rows) in
`src/journald1.js`; the Health tab's quests and the win's To-Do go through
the same store.

## Routes

| Route | What |
|---|---|
| `GET /` (also `/questlog`) | The Quest log page (signed in, cached 5 minutes, `?fresh=1` reloads), otherwise the login |
| `GET /admin` | The dashboard (signed in), otherwise the login |
| `GET /journal` | The journal page for today (the day starts at 03:00 Amsterdam; signed in), otherwise the login |
| `POST /journal/save` | Writes what changed on the journal page into the day's journal row (signed in, JSON) |
| `GET /gym` | The gym page (signed in; `?plan=<id>` opens a plan just generated), otherwise the login |
| `POST /gym/generate`, `/gym/send`, `/gym/feedback`, `/gym/sync` | The gym page's buttons, passed on to the Quest Engine (signed in, JSON): build today's workout (a routine id, or `custom` with `request`), send it to Hevy, write a workout's feedback, sync from Hevy |
| `GET /login`, `POST /login` | Login with `DASHBOARD_PASSWORD` (`next` = `/`, `/questlog`, `/admin`, `/journal` or `/gym`); a signed cookie lasts 30 days |
| `POST /logout` | Signs out |
| `GET /data` | Everything the dashboard shows, as JSON (signed in; cached 5 minutes, `?fresh=1` reloads) |
| `POST /summary` | Rewrite today's AI summary (signed in, at most once a minute); `?back=1` returns to `/` |

Timer (`wrangler.jsonc`, 03:00 and 04:00 UTC): whichever run is 05:00 in
Amsterdam writes the AI summary. Opening `/` or `/data` does it if the timer
missed.

## Setup

Secrets, set with `npx wrangler secret put <NAME>` (never in git):
`DASHBOARD_PASSWORD`, `QUEST_ENGINE_TOKEN` (the Quest Engine's `ADMIN_TOKEN`),
`HEALTHCHECKS_API_KEY` (read-only key) and, only for the AI summary,
`OPENAI_API_KEY`. (`NOTION_TOKEN` is no longer read since 1 Oct 2026; it can stay set.)

```bash
npm test          # drift rules, usage, login, Quest log page, journal page
npx wrangler dev  # local, with secrets in .dev.vars
```
