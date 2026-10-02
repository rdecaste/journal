# Admin dashboard: notes for Claude

Roy's admin dashboard and landing page as one Cloudflare Worker
(`admindashboard`): `/` is the Quest log page, `/admin` the dashboard,
`/journal` the journal page. Full description and change log:
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
- **Merging to `main` deploys this Worker** (Cloudflare Workers Builds,
  branch control set to main by Roy, 2 Oct 2026).
- Roy's rules: step by step, no data loss, and ask him before any change to
  live data.
