# Admin dashboard: notes for Claude

Roy's admin dashboard and landing page as one Cloudflare Worker
(`admindashboard`): `/` is the Quest log page, `/admin` the dashboard,
`/journal` the journal page, `/gym` the gym page (Hevy; the work is done in
the Quest Engine's `src/hevy.js`), `/quests` the quest pages (`src/quests.js`,
`src/questspage.js`; they never touch the Main Quest or Refresh visual). Full description and change log:
`docs/admin-dashboard.md`. Keep it up to date with every change.

## The data is in D1, not Notion (since 1 Oct 2026)
- All data lives in the Quest Engine's D1 database `quest` (binding `DB`),
  edited by Roy in the Cloudflare dashboard: D1 → quest → Data Studio. How
  it moved: `docs/d1-migration.md` in rdecaste/quest-engine.
- **Notion is a read-only backup and this Worker no longer talks to it.**
  Never create, edit or delete anything in Notion.
- `src/healthstore.js` and `src/areas.js` are copies of the Quest Engine's
  `src/store.js` and `src/areas.js`: when one changes, copy it over.
- The journal page reads and saves the day as a `journal` row in
  `src/journald1.js`; `src/journal.js` has what the two share.
- The morning texts on `/` (Morning Spark, 💬 notes, box numbers) come from
  the Quest Engine's `GET /questlog`, through the `QUEST_ENGINE` service
  binding.

## Working here
- `git pull --rebase` before committing.
- Tests: `npm test`. The `/admin` page's script runs in the browser, so a
  constant it uses must be handed to it in `src/page.js` (a test checks).
- **A push to `main` deploys this Worker** (Workers Builds; the build runs
  `npm test` first, so a failing test stops the deploy). Check
  `npx wrangler deployments list` a minute or two later: a new deployment
  should appear (its source shows "Unknown" for builds too; the commit is in
  the dashboard under Settings → Builds). Only `main` deploys; merge there
  rather than deploying by hand.
- Roy's rules: step by step, no data loss, and ask him before any change to
  live data.
