# 🧭 Admin Dashboard

> Moved here from the Notion page "🧭 Admin Dashboard" (Quest log › Engine
> Room › Quest Engine) on 1 Oct 2026, as it stood then (last edited 1 Oct,
> 10:38 UTC); the Notion page stays as it was, and this file is the one kept
> up to date from now on. Since 1 Oct 2026 the data is in D1, not Notion (see
> the README and the Quest Engine's `docs/d1-migration.md`): where the text
> below names a Notion database, read the D1 table of the same name.

A private cockpit with the detail behind Cross Border, Health and System Health (tabs; it opens on Cross Border). The daily overview (what needs Roy, the AI summary, today's work location) is on the Quest log page below. It is its own Cloudflare Worker and is separate from the quest system. The Quest Engine is only one of the systems it watches.

## Where it lives
- Code: GitHub rdecaste/journal, branch `main`
- Worker: `admindashboard` (created 28 Sep). Connected to Workers Builds (Cloudflare dashboard → admindashboard → Settings → Builds): a push to `main` deploys it, after `npm test` (a failing test stops the deploy and the live version stays). Preview builds stay off, since a preview would use the live D1 database.
- Local copy: `~/code/journal` (cloned 30 Sep).
- URL: [https://admindashboard.quest-engine.workers.dev](https://admindashboard.quest-engine.workers.dev): `/` is the Quest log page, `/admin` the dashboard
- Timer: 03:00–06:00 UTC; the run that is 05:00 in Amsterdam writes the AI summary, the one at 07:00 the 🌍 buffer line (opening the page does either if its timer missed)
- Login: one password (secret `DASHBOARD_PASSWORD`), signed cookie for 30 days

## Quest log page
The landing page, [https://admindashboard.quest-engine.workers.dev](https://admindashboard.quest-engine.workers.dev) (also `/questlog`; since 29 Sep, Roy's request): the Quest log as one clean page with an Admin button to the dashboard, which lives at `/admin`. It is for the iPad mini and phone, behind the same login (the login returns you to this page). Read only: the Morning Spark with today's journal link inside it, the 💬 notes and the training and to-do numbers from the Quest Engine's `GET /questlog` (kept current by its 03:00 run), the hero and active quests from the Quest Engine (`/mainquest`, `/hero`, `/questboard` via the service binding; tapping a quest opens the Quest Dashboard card), the cross-border numbers and today's work location from the dashboard's own data. Since 29 Sep it also holds what the dashboard's Overview tab used to (tab removed): one "Today's briefing" card (since 30 Sep, Roy's request to drop the repeats): the AI summary bullets (or, before the summary exists, the drift flags with their reason), then one chip per area with its state (tech problems read "for Claude"), each linking to its tab in `/admin`, and a Rewrite button. The day's summary (one small OpenAI call a day) is written by the 05:00 Amsterdam timer, after the Quest Engine's 03:00 and 04:00 runs; the first open after 05:00 writes it if the timer missed. Cached 5 minutes; "Refresh now" at the bottom skips the cache. Code: `src/today.js` (data), `src/todaypage.js` (page). On iPad or iPhone: Share → Add to Home Screen.

## Gym page
`/gym` (since 2 Oct 2026, Roy's request), behind the same login, linked from the Quest log page (Gym ›). It is built for the phone before the gym. Code: `src/gym.js` (data and buttons) and `src/gympage.js` (page). Everything comes from the Quest Engine (`GET /gym` and its Hevy routes, `src/hevy.js` there, which holds the Hevy key), so this Worker never calls Hevy itself.
- **Today's workout,** as four numbered steps (Roy's order):
  1. **Your recovery:** a short AI insight on whether Roy is ready to train, from last night's HRV, resting HR and sleep against the usual 30 nights (the same rules as Recovery today) and the last three days of training. The insight is written once a day in the Quest Engine. The numbers are folded under "The numbers".
  2. **How do you feel?** (1–5).
  3. **Template:** a dropdown of his Hevy routines, read fresh from Hevy on every open, with nothing chosen in advance. **Custom: say what you want…** opens a text box ("super in the mood for bench and some one-arm handstand"). OpenAI then picks the exercises from his own history, and his rules set the numbers.
  4. **Recommended workout:** Generate, the plan, and Send to Hevy. The plan is dense (Roy's request), three short lines per exercise:
     - the name and its change label (↑ weight, +1 rep, ↓ 10%, 2 sets; tapping it shows the reason);
     - all sets in Roy's notation, warm-ups grey first: `warm-up 8@35 · 4@52.5 kg`, then `7@70 · 6@70 · 6@70 kg`;
     - last time and the AI tip.
  - **Generate** builds the day's workout from that routine with Roy's double progression (6–8 reps; weight up a step once every set reached 8; 10% lighter after three stuck sessions; on an easy day last time's weights, two sets). Each lift shows how it changed and why. It also writes a short briefing and a cue per exercise (one OpenAI call, in the Quest Engine). The workout is only shown on the page.
  - **Send to Hevy** writes it to Hevy as the routine **Today · <template>**, which is overwritten each time. The page then shows ✓ In Hevy. If Roy generates again, the page says which plan Hevy still has until he sends the new one.
- **Last workout:** its sets and the coach's feedback, written when the Strava sync brings the session in. If it has no feedback, a **Write feedback** button writes it. Older workouts and lift trends were removed on 2 Oct; Roy looks at those in Hevy.
- **Sync from Hevy** (the first time: **Import my Hevy history**) pulls workouts changed in Hevy. It is also a Rerun button under Strava in System Health.

## Quest pages
`/quests` (since 4 Oct 2026, Roy's request, built from the mockup he approved), behind the same login and linked from the Quest log page (Quests ›). Code: `src/quests.js` (data, saves, OpenAI) and `src/questspage.js` (pages and their one script). A dark quest board; the visuals are stills taken from each quest's Cloudinary clip (`cloudinary_video_url`, `so_2.0`), and character pictures come from `characters.avatar_url` (8 of 49 so far, Cloudinary `Character-Avatars/<character id>`). Playing the clips, and making new visuals when the character changes, come later (Roy).
- **Quests:** active quests as cards sorted by attention (status, quiet for 7+ days, this week's check, countdown, phase), planned ones in columns by year, completed ones. Search and a journey filter. The Main Quest is never shown or changed here; it has its own card.
- **A quest** (`/quests/<id>`): the next move (change it in place, with ✦ Suggest), the weekly check, where it stands, desired outcome, why, and the evidence log: its `quest_updates` and Roy's journal notes (`journal_quest_notes`), newest first, filterable. The sidebar has the facts, the **Visual** panel (Change character opens a picker of the enabled characters with their pictures, search, Only with artwork, and ✦ Suggest for this quest), Attention and Phase buttons that save at once, and Make active / Move to planned / Mark completed / Reopen. Making a quest active needs a next move. Mark completed sets Completed At (today's journal day), which is what the Quest Engine's victory card and its 7-day board rule read; it asks for a second tap. **Edit quest** (`?edit=1`) opens the whole form; every field has guidance and the text fields have ✦ Suggest (three options).
- **New quest** (`/quests/new`): Roy describes the quest; **Draft with AI** (one OpenAI call) fills every field from his description, the journeys and the existing quests, with a one-line reason per field, a recommendation (start now or plan it), related quests, up to three questions (answer them and **Update draft with answers**), and a character for the visual with two alternatives. Roy changes anything and creates it. **Fill in myself** skips the AI.
- **Weekly review** (`/quests/review`): one card per active quest with its pass/fail question, ✓ Passed / ✗ Missed, this week's evidence (Monday to Sunday), next week's move and a note. **Draft my review** (one OpenAI call) proposes each verdict from the evidence only ("unclear" when it can't tell) and next moves. **Finish review** saves next moves on the quests and one `quest_updates` row per quest per week (source Manual, "Weekly review · Week N · <quest>", type Progress for passed, Setback for missed, Reflection for a note without verdict), updated in place if the review is saved again; the quest cards then show the week's ✓ or ✗. A summary lists next week's moves. Planned quests that have started or have a target within 90 days are listed under "Anything to start next week?".
- **Writes:** only `quests` (through the store, so `updated_at` is stamped) and those review rows in `quest_updates`. Never `main_quest`, `refresh_visual` or the dashboard and Cloudinary fields: a changed character is used the next time the visual is made.
- **OpenAI:** `POST /quests/ai` (`draft`, `suggest`, `characters`, `review`), JSON answers, only when `ADMIN_AI=1`; at most 60 calls a day from these pages (Store key `quest_ai`), counted in the dashboard's usage.

## What it reads
Everything comes from the D1 database `quest` (binding `DB`) or the Quest Engine (service binding `QUEST_ENGINE`); the Worker never calls Notion. Its only writes are what Roy saves: on the quest pages, `quests` rows and their weekly review rows in `quest_updates`; on the journal page, the day's `journal` row with its `journal_focus` and `journal_quest_notes` rows, its `todos` ("Win if" and linked to-dos) and the day's `work_location` row; in the Cross Border tab (Border days), the `work_location` days he changed and saved. (Until 1 Oct it also wrote a 🌍 buffer line on the Notion Quest log at 07:00; that has stopped.)

| Area | Source |
|---|---|
| Cross Border | D1 `work_location` (from 2026-07-01), shown and edited as Border days (below) |
| Health | D1 `workouts` (Strava) and `body_metrics` (Withings), `sleep_recovery` (Apple Health: sleep, awake time, HRV, resting HR; last 60 days) and the active `quests` on the 🏃 Health Journey (never the Main Quest). |
| System Health | Quest Engine GET /status and GET /ledger (quest-engine PR #3), [healthchecks.io](http://healthchecks.io) (read-only key); rerun buttons call the Quest Engine's job routes with `QUEST_ENGINE_TOKEN` (`src/rerun.js`) |
| Quick Links | Fixed list in src/config.js |

The dashboard caches the combined data for 5 minutes. It has no database of its own except a tiny Durable Object that holds the daily AI summary and its own API usage.

## Cross Border tab: Border days
Since 4 Oct 2026 (Roy's request, from the mockup https://claude.ai/artifact/MiRWaZN6kiy2GRku3PgiDq) the tab is a calm page to see and edit the Work Location Log:
- One card on top: the Belgium share since 1 July in big type, a Belgium/Netherlands bar with the 50% line, then the buffer (NL days left before 50%, or BE days short), where 31 Dec is heading and the past days still to fill in (a link opens the first). These are the same sums as `crossBorder()` in `src/metrics.js`, worked out again in the browser while Roy edits, with "was …" beside a number his edits moved.
- Three views (the last one used is remembered on the device): **Calendar** (a month of weekdays; tap a day), **Week list** (one row per day with Morning / Afternoon / Commute drop-downs; "Only days to fill in" and "Include planned weeks" filters) and **Year planner** (every weekday as a dot; pick a place and tap or drag to paint days, optionally half days).
- Tapping a day opens a sheet: the place (or a split morning/afternoon), Getting there, and Clear day.
- Changes collect in a Save pill at the bottom (Undo drops them). Save sends only the changed days to `POST /border/save` (`src/border.js`), which writes AM, PM and Commute through the journal page's `writeWork` (a weekday without a row gets one; E-bike € follows Commute; weekends are refused); a day that fails is named and stays unsaved. The page then reloads its data fresh.
- "Totals, e-bike and each month" keeps the old tab's totals, e-bike compensation and month table in a fold.
- Code: `src/borderpage.js` (style and browser script, mounted by `src/page.js`), `src/border.js` (save).

## Targets and thresholds (src/config.js)
- Belgium share must stay above 50%. Buffer: watch below 8 NL days, attention below 3.
- Training: 6 h/week goal, body fat \~12%. Each week is judged against a step: the last 4 full weeks' average plus 10%, never above 6 h. A missed step shows on the bar, never as a flag. Strength flagged after 14 days (watch) and 28 days (attention); no run in 14 days is a watch item.
- E-bike rides count toward the hours (Roy, 28 Sep). Walks and hikes do not.
- Recovery today (`RECOVERY` in src/config.js, rule-based, no AI): sleep, HRV and resting HR against the 30 nights before last night. Low when sleep is 45 min short, HRV 10% lower or resting HR 3 bpm higher. 0 low Good to go, 1 Go steady, 2+ Take it easy. The Goggins note is written lines filled in with the numbers.
- Recovering: 7-night resting HR 2 bpm or more above usual, or Take it easy. Training flags pause; lifts after 3 normal days. Watch items: 2+ nights with 60+ min awake in a week, or no sleep row for over 2 days.
- Half marathon: a long run is 60 min or 10 km; an interval run has interval, reps, tempo, track, fartlek or a distance like 400m in its name.
- Syncs: Strava watch 7 / attention 14 days without a new row; Withings 14 / 30. Either also goes red when its [healthchecks.io](http://healthchecks.io) check (`strava`, `withings`) is down.
- Quest Engine: judged by `checked_at` from `/status` (the boss card's last comparison with Notion; falls back to `built_at`): watch after 75 minutes, attention after 3 hours (`ENGINE` in src/config.js). The Engine checks at least hourly and whenever the card is opened.
- API costs are list-price estimates; a spike is a day of at least \$1 and more than 3x the 14-day median.

## Secrets (entered by Roy only, `npx wrangler secret put`)
- `DASHBOARD_PASSWORD`
- `NOTION_TOKEN` (connection with access to Quest log; needs "Read content" and "Update content" for the buffer line)
- `QUEST_ENGINE_TOKEN` (the Quest Engine's ADMIN_TOKEN)
- `HEALTHCHECKS_API_KEY` (read-only)
- `OPENAI_API_KEY` only if the AI summary is turned on (`ADMIN_AI=1`)

## Open questions
- The Goggins note can be rewritten by AI each morning (one small OpenAI call a day) if Roy wants it; for now it uses written lines.
- Belgium target above 50%, and targets for bike, swim and strength.

## Change log

| Date | Change |
|---|---|
| 2026-09-28 | First version built as its own Worker in rdecaste/journal. Quest Engine only gains a job and API-usage ledger (PR #3). |

28 Sep 2026: Roy turned the AI summary on (`ADMIN_AI=1`, needs the `OPENAI_API_KEY` secret). Added a `main` branch.

28 Sep 2026: page always reads Notion fresh on open (git `deb13d4`). Health tab gained Battle form (Roy's request): form = fatigue ÷ fitness (7- and 44-day moving averages of Effort Score from Workouts), today's attack bonus, 13-week form chart and the last six workouts' effort scores (git `7c510af`).

29 Sep 2026: Quest Engine /status and /ledger answered 404 because Workers on one account cannot fetch each other's [workers.dev](http://workers.dev) URL. The dashboard now uses a service binding (`QUEST_ENGINE` → quest-engine). Card publishing shows "No data" when the Engine is unreachable; Strava/Withings syncs judged by newest reading date instead of created_time (git `88587f5`).

29 Sep 2026: AI summary as bullets in plain language with a Rewrite button. New: daily cross-border buffer line in the 🌍 callout on Quest log, replacing the Notion buffer report (git `85718c5`).

29 Sep 2026: new Quest log page at `/questlog` (git `c5546a7`).

29 Sep 2026: the Quest log page is the landing page `/`; the dashboard moved to `/admin` (git `988dfb0`).

29 Sep 2026: Overview tab removed; its flags, AI summary, work location and systems line moved to the Quest log page, which now also triggers the daily summary. Dashboard opens on Cross Border (git `24a2aa9`).

29 Sep 2026: buffer line shortened to the shared glance-box shape (linked label over one line of numbers; projection and date left to the dashboard) (git `9b5da2a`).

29 Sep 2026: "Hand to Claude" buttons on tech problems on the Quest log page (git `f477640`; removed again 30 Sep).

29 Sep 2026: Family Dashboard no longer flagged as missed before its first Quest Engine morning (`family_from` in the Quest Engine's /status; git `5c4ecc5`).

30 Sep 2026: "Hand to Claude" buttons removed (Roy: only opened Claude in the browser). AI summary written by the timer at 05:00 instead of on the first open after 07:30; cron now 03:00–06:00 UTC (git `5eb763b`).

30 Sep 2026: Quest log page shows today's journal link inside the Morning Spark card (Roy's request; git `7c1ee1a`).

30 Sep 2026: "Needs you" and "Summary" merged into one briefing card with area chips (git `8f899c2`).

30 Sep 2026: tapping an active quest on the Quest log page opens its Notion page (Roy's request; git `73f2f0a`).

30 Sep 2026: repo README brought up to date (landing page, `/admin`, routes, timer; git `ef890be`).

30 Sep 2026: **System Health follows the Quest Engine's new rhythm** (quest-engine PR #12 rebuilds the boss card on open and checks it hourly instead of every 2 minutes). The Quest Engine and Dashboard publishing rows are judged by `checked_at` (watch after 75 min, attention after 3 h) instead of `built_at` (12 min / 1 h), which only moves when the card changes and would have raised false alarms. The Strava and Withings rows no longer say "Make" and also follow their new [healthchecks.io](http://healthchecks.io) checks. git `920aed9`, merged `41ad8e6`, deployed by hand (`npx wrangler deploy`, version `ec9e4b79`) after finding that pushes do not deploy this Worker.

30 Sep 2026: **Health tab rebuilt** from the approved mockup (Roy's request). It now opens with Recovery today, a dark card holding:
- a verdict from last night's sleep, HRV and resting HR against the 30 nights before;
- a Recovering chip;
- a Goggins-voice note built from written lines, with no AI;
- three signal tiles with 14-night sparklines.

The rest of the tab:
- Watch items only.
- One card per active Health Journey quest, each answering its own pass/fail question:
  - Get Back in Shape: the weekly step toward 6 h, and body fat toward 12%.
  - Half Marathon: long and interval run check-offs and the longest run.
- A daily TSB chart with zones.
- Training tiles and hours per week by sport, with e-bike rides counted.
- Weight and body fat charts with week averages.

Removed:
- the "Training hours below target" and "Runs below 2 a week" flags (a missed step is never a flag);
- the consistency table, the form-ratio chart and the effort table;
- the "No source connected yet" cards.

Training flags pause while Recovering. New watch items: broken nights and stale sleep data. The dashboard now reads Sleep & Recovery and the Quests database.
rdecaste/journal PR #1, merged `9f1a8c6`, deployed by Roy with `npx wrangler deploy` (30 Sep, 11:00).

30 Sep 2026: **Dashboard fitted to the iPad mini and iPhone** (Roy's request).
- iPhone: one-row header with short tab names; gauge beside the verdict; one-row signal tiles; training tiles two per row; zone names inside the TSB bands.
- iPad mini portrait: two-column Recovery today card; quest and body cards side by side; Cross Border cards 2 × 2.
- All sizes: safe-area padding, Add to Home Screen tags, bigger tap targets, tooltips on tap.

rdecaste/journal PR #2, merged `60758d3`, deployed by Roy with `npx wrangler deploy` (30 Sep, 11:47).

30 Sep 2026: **Journal page** at `/journal` (Roy's request, from the approved mockup): Morning, Evening, 🔥 Main quest and 🗺️ Quests sections; autosaves into that day's Notion Journal row in the template's own boxes, extras in a ✍️ "More from today" callout; the landing page's journal card opens it. rdecaste/journal PR #3, deployed by Roy (30 Sep, 20:42). PR #4: questions and his own writing visually distinct.

1 Oct 2026: **Journal page:** Close the day folds the evening into a recap; each quest shows a tailored question from the Quest Engine's 03:00 call (`GET /journal/questions`, quest-engine PR #14) instead of the Questboard pass/fail question, with a plain fallback until there is one for today; Next move line removed (Roy). rdecaste/journal PR #5, merged `a21d446`.

1 Oct 2026: **Journal page** (Roy's requests, tried in the mockup first):
- Tapping into a box no longer moves the page. Each box has a small "↻ another" beside its label and a starter as grey placeholder text.
- Today's focus is the last part of the morning, with the Must do / Can do / Something cool labels in a narrow column on the left and the lines beside them.
- The main quest card follows the page's light/dark look.
- Each active quest has its own card: title, plain question and a small box for a sentence or two. The main quest's follow-up box looks the same.
- The quest list comes from the Quests database on every open (Active Quest, not the Main Quest, no Completed At). A quest made active during the day gets a card, and its box is added to the day's journal on the first save. A finished quest's card goes away unless it has a note.

rdecaste/journal PR #6, merged `1f94494`, deployed by Roy (1 Oct, 06:12). PR #7 (`bcb1727`): Success and Relapse turn green/red when tapped (colours were missing).

1 Oct 2026: **Journal page: one calm type style and plain writing boxes** (Roy's request: too many fonts, and he disliked the typing font):
- Everything read or written uses one Notion-like serif (Source Serif 4). The system sans is kept only for small controls. Questions are italic and Roy's own writing is upright, with fewer sizes and colours.
- Writing boxes no longer have ruled lines or a coloured edge. Each is a plain soft box with a thin border that takes the morning, evening or quest colour while he types. A box is two lines tall when empty and grows as he writes. The Today's focus rows have no divider lines.

rdecaste/journal PR #9, merged `646be97`; Roy deploys with `npx wrangler deploy`.

1 Oct 2026: **Journal page: evening question from the morning, simpler halves** (Roy's requests, tried in the mockup first):
- The Reflection question is written from the whole morning (headspace, looking forward, win if) by one small OpenAI call when Roy taps Done for this morning, or first opens the evening (Roy chose this, option A). Kept per day in the dashboard's Store (`evening_q`), asked again only when the morning changed, at most 5 a day, counted in API usage. `POST /journal/evening-question`; the 03:00 question stays when AI is off or the call fails.
- Removed: Today's focus (morning and evening), the "From last night" block, the evening's "This morning" block, the follow-up and hint lines under the boxes.
- The evening is one card: Reflection (with The win buttons below it), Park it, For tomorrow.
- Done for this morning and Close the day fold the section smoothly into its recap; a small sun rises (morning) or a few stars twinkle (evening) in the recap's corner (Roy picked option B). Closing says "Saved. Sleep well, Roy."

rdecaste/journal PR #10, merged `7e6b322`, deployed by Roy (1 Oct, 09:06 UTC). PR #11 (`3094bca`): the closed evening summary no longer repeats the win if (Roy).

1 Oct 2026: **Journal page: commute entry and the win as a To-Do** (Roy's requests):
- The evening card ends with 🚗 Commute: two drop-downs, Where (Home, Beerse, Ghent, Holiday) and Getting there (E-bike, Car, N/A), from today's Work Location Log row; each change writes that row's AM, PM and Commute (the journal page's second Notion write target). Home or a holiday all day sets N/A; "Different in the afternoon ›" splits the day.
- "Today is a win if…" is also a ✅ To-Do: Tag "Win if", Related Journal = the day's journal, Due and Source Date = the day. The win buttons set its Status (It happened → Done, Partly → In progress, Not today → Not started); emptying the box trashes it; the page reads Status back. This is the contract the Quest Engine will use for boss/hero damage (prompt handed to the Quest Engine thread).

rdecaste/journal PR #12, merged `f28a69a`; Roy deploys with `npx wrangler deploy`.

1 Oct 2026: **Journal page: the boss page ticks off the win** (Roy's request). The morning goodbye is just "Have a good day, Roy." and the evening no longer has the It happened / Partly / Not today buttons. The win text still syncs to its ✅ To-Do (made, renamed, trashed when emptied), but the page sets Status only when it makes the row (Not started), so a tick on the boss page stays when the text is edited. rdecaste/journal PR #13, merged `79b7a10`; Roy deploys with `npx wrangler deploy`.

1 Oct 2026: **Journal page: saves only on the buttons** (Roy's request, after the page kept saying "Not saved yet, trying again…"). Nothing saves while typing; the writing stays in the browser until Done for this morning, Close the day, Success/Relapse, or the new Save quests and Save note (main quest) buttons. The server now saves each piece on its own and reports the ones Notion refused (`failed` in the reply, logged in Observability), so one bad piece no longer blocks the rest; the status line names it and Notion's reason. rdecaste/journal PR #14, merged `4fa0986`; Roy deploys with `npx wrangler deploy`.

1 Oct 2026: **Notion → D1** (Roy's request; the Quest Engine's `docs/d1-migration.md`). The dashboard reads and writes D1 (the Quest Engine's database `quest`, binding `DB`) instead of Notion:
- Health and work data (`HEALTH_STORE` "d1", 12:20 UTC): Workouts, Body Metrics, Sleep & Recovery and the Work Location Log. Saving a Commute sets E-bike € (€0.37 × 70 km = €25.90 from 1 Oct; days before keep €25), which was a Notion formula. No Work Location rows for weekends; a weekday's row is made on its first save.
- Journal, To-Dos and Quests (`JOURNAL_STORE` "d1", 13:59 UTC): the journal page reads and saves the day as a D1 row (`src/journald1.js`): the answers as columns, the focus to-dos and quest notes as rows. The win's To-Do and ticked to-dos go through the same store; the Health tab's quests too.
- The Quest log page reads the Morning Spark, today's journal link, the main quest, the 💬 notes and the training and to-do numbers from the Quest Engine's `GET /questlog` instead of the Notion Quest log page, and the 🌍 line is no longer written to Notion (`NOTION_QUEST_LOG` "0", 14:56 UTC).
- This description moved from Notion into the repo (`docs/admin-dashboard.md`).

1 Oct 2026: **No Notion code left** (step 6 of the move). The journal page's Notion path, the 🌍 line writer (`src/questlog.js`), the Notion client and the `HEALTH_STORE`, `JOURNAL_STORE` and `NOTION_QUEST_LOG` settings are removed; everything goes through `src/healthstore.js` to D1. The timer only runs for the AI summary (03:00 and 04:00 UTC). Links to the data open D1 Data Studio; links to the docs open GitHub. `NOTION_TOKEN` is no longer read.

1 Oct 2026: **Link check after the move** (Roy's question: is everything still linked the right way?). Checked every page, read, write, timer and binding: all data goes to D1 `quest` (same database id as the Quest Engine's), every query's columns exist in the live tables, `src/areas.js` and `src/healthstore.js` match the Quest Engine's, and the deployed Worker has no Notion calls; today's journal, Win if and Commute saves are in D1. What still opened Notion's frozen copy is fixed: on the Quest log page the quest cards now open the Quest Dashboard card, the hero's title the hero card, Training and To-dos open D1 Data Studio, and the dock's "Quest log in Notion" became "Data (D1)". In `/admin` the Border Worker Dashboard link (a Notion view of the old Work Location Log) is gone, a missing day's Fix link opens D1 again (it said "no row" for rows that exist), and the two remaining Notion pages, Cross-border working and Family Finance HQ, are labelled (Notion). The leftover "Notion won't let the page write" message on the journal page is removed.

1 Oct 2026: **No Make-era switches.** The Quest Engine no longer has its on/off switches (`JOURNAL_ENABLED`, `NIGHTLY_ENABLED`, `VAULT_ENABLED`, `FAMILY_ENABLED`, `family_from`; Make is off), so `/admin` watches every job every day instead of reading them from `/status`. The sync rows say "the newest row" instead of "the newest Notion row".

1 Oct 2026: **Journal page: autosave is back** (Roy's request). Writing saves itself to D1 a moment after he stops typing, when he leaves a box and when the page closes, as before PR #14; the Save quests and Save note buttons are gone. The buttons (Done for this morning, Close the day, Success/Relapse) still save too. Kept from PR #14: each piece saves on its own, so one refused piece never holds up the rest, and the status line names it.

2 Oct 2026: **Pushes to `main` deploy automatically.** The Worker had been connected to Workers Builds from the start, but its branch control pointed at an old working branch (`claude/project-thread-dbggnx`, since deleted), so nothing pushed to `main` ever deployed and every version went out by hand. Roy set the branch to `main`. The build command is now `npm test`, so a failing test stops the deploy, as with the Quest Engine.

2 Oct 2026: **Rerun a job from System Health** (Roy's request; he picked layout A in the mockup https://claude.ai/artifact/Ww1FBAgg5j2J2gvCV95ve2). Tapping a process opens its scheduled jobs, each with a Rerun button. Rerun asks first, says when a job makes a paid OpenAI call, and offers Test first (a dry run that changes nothing). The page sends `POST /run` and the dashboard calls the Quest Engine with its own token, so no command line is needed. Jobs that would count twice only run when today's run is missing (yesterday's win, the nightly run); the setup, notes, digest, match and Questboard are redone with `force=1`. The journal jobs refuse before 03:00 Amsterdam, when yesterday isn't over. Left out on purpose: the Vault Monday evaluation, the family rollover and the family images (portrait, daily image, weekly posters). The list is `JOBS` in `src/rerun.js`.

2 Oct 2026: **Journal page: the day's theme runs down the whole page** (Roy's request). The weekday palette no longer stops at the hills: the page background takes the day's softest tone under the header and pales towards the bottom (a touch of dusk in the evening, a faint tint in dark mode), and the phone's status bar takes the same colour.

2 Oct 2026: **Journal page: Start my day ☀ and End my day** (Roy's request, tried in the mockup https://claude.ai/artifact/5BA8rZUCEBuc36yWH7qdTD first). "Done for this morning" is now **Start my day ☀** and "Close the day" is **End my day**; they do the same as before (save, fold the half into its recap). Both are bigger, full-width pills in the page's serif: a warm sunrise gradient in the morning and a purple dusk gradient at night, pressing in slightly when tapped (option A).

2 Oct 2026: **Gym page** (Roy's request): `/gym` with today's recovery, how Roy feels and a Hevy routine as the template.
- **Generate** builds the day's workout and shows it on the page; **Send to Hevy** saves it in Hevy as "Today · …".
- The page also shows the last workouts with the coach's feedback, and lift trends.
- The buttons go to the Quest Engine through the service binding (`src/gym.js`, `src/gympage.js`). New routes: `GET /gym`, `POST /gym/generate|send|feedback|sync`.
- The Quest log page links to the Gym page, and the login can return to `/gym` and `/journal`.
- New rerun job **Hevy sync** under Strava.
- The Hevy work itself is in the Quest Engine (`src/hevy.js`).

2 Oct 2026: **Gym page: Roy's progression** (Roy's request). The generator follows his double progression instead of the placeholder:
- 6–8 reps, and the weight goes up a step once every working set reached 8.
- After three stuck sessions, 10% lighter.
- Two warm-ups before the first lift.
- On an easy day: last time's weights, two working sets, no extra reps.

Each lift shows a label (↑ weight, +1 rep, ↓ 10%, 2 sets) and a one-line reason. The rule itself is in the Quest Engine's `src/hevy.js`.

2 Oct 2026: **Journal page: mood, morning and evening** (Roy's request, designed with him in the mockup https://claude.ai/artifact/5BA8rZUCEBuc36yWH7qdTD). A 💭 Mood row opens each half: five pictures Roy made, from a green face throwing up to a face on fire (1 Sucky, 2 Meh, 3 Normal, 4 Good, 5 On fire). The pick sits on a soft tile with its word beneath, saves at once to the day's journal row (`mood_morning`, `mood_evening`; Quest Engine migration 0009, applied with Roy's ok) and shows first in that half's summary; tapping it again clears it. The pictures are served by the Worker from `src/moodart.js` (`GET /journal/mood/1.webp` … `5.webp`). `src/areas.js` copied over from the Quest Engine (also brings the boss designs' `lore`).

2 Oct 2026: **Gym page: four steps and a recovery insight** (Roy's request). Today's workout is now four numbered cards:
1. Your recovery.
2. How do you feel?
3. Template.
4. Recommended workout.

Step 1 leads with one or two AI sentences on whether Roy is ready to train (Quest Engine `hevy_insight`, one small OpenAI call a day). The HRV, resting HR and sleep numbers are folded underneath.

2 Oct 2026: **Gym page: dense recommended workout** (Roy's request: "or it'll take me an hour to scroll"). Each exercise is three short lines:
- its name and change label (the reason when the label is tapped);
- all sets in Roy's reps@weight notation (`warm-up 8@35 · 4@52.5 kg`, then `7@70 · 6@70 · 6@70 kg`);
- last time and the AI tip.

A 9-exercise routine fits in about one phone screen. Timed blocks show minutes, and the workout history uses the same "6 @ 70 kg" notation.

2 Oct 2026: **Gym page: lighter after a break** (Roy's request). A lift not done for 2–4 weeks is planned 10% lighter, 1–2 months 20%, 2–3 months 30%, longer 40%, aiming for 8 reps. Its label reads "↓ after break" (amber); tapping it shows how long it has been. The rule is in the Quest Engine's `src/hevy.js`.

2 Oct 2026: **Gym page: Custom, Generate and a quieter page** (Roy's request).
- **Custom:** a template option with a text box for what Roy wants to train. OpenAI composes the session from his own exercises, and his rules set the weights, reps and holds. The plan shows "You asked: …".
- **Generate:** the button is just "Generate", and nothing is chosen in advance. A plan made earlier today stays folded ("Earlier today: …") until a new one is generated (`/gym?plan=<id>` opens the new one).
- **Removed:** "Before that" and "Lifts". Roy looks at those in Hevy.
- **Skills:** holds such as the planche, human flag and one-arm handstand show "+2 s" and "↑ next stage".

2 Oct 2026: **Journal page: new mood pictures, Meh becomes Tired** (Roy's request). Roy's second set of five pictures replaces the first; 2 is now a tired face with Zzz, called Tired (still stored as 2). The page asks for the pictures with `?v=` and `MOOD_ART_VERSION` from `src/moodart.js`, so browsers that kept the old ones for a year fetch the new ones; bump it whenever the pictures change.

2 Oct 2026: **Quest log page: main quest card removed** (Roy's request). The dark main quest card (hero picture, level, HP, XP, 💬 note) is gone from `/`; the Morning Spark and the journal link now run the full width. The 🔥 streak in the header and the Hero card in Quick links stay.

3 Oct 2026: **Journal page: Start my day / End my day register the reviews** (Roy's request). Pressing Start my day ☀ registers the Morning review habit, End my day the Evening review: a boss hit, as a tap on the boss card, through the Quest Engine's `POST /journal/review` (`src/review.js`, route `POST /journal/review`). The Quest Engine counts each at most once per game day (04:00 to 04:00 Amsterdam), so pressing again, or after tapping the habit on the boss card, changes nothing. Needs the Quest Engine change deployed first.

3 Oct 2026: **Journal page: folds hold on every device** (Roy's request). After Start my day or End my day, that half stays folded after a reload and on his other devices until he opens it with "Open the morning ›" or "Open the evening ›" (opening is shared the same way). The page keeps the day's folds in the Store (`journal_fold`, `{ day, m, e }`, `src/fold.js`; `GET|POST /journal/fold`), reads them with the day and fetches them again when a tab left open comes back into view (never while Roy is typing). A fold made before this went live stays on that browser only.

4 Oct 2026: **Cross Border tab becomes Border days** (Roy's request: a page to see and edit his cross-border data, built from the mockup he approved). The tab now shows the Belgium share card and the Calendar, Week list and Year planner views, all editable, with a Save pill that writes the changed days to `work_location` (`POST /border/save`, `src/border.js`, `src/borderpage.js`). The flags, trend chart and missing-days table are gone from the tab (the flags still show on the Quest log page); totals and the month table are in a fold. Same day, on Roy's choice, the 12 pre-planned Beerse/Car Thursdays (8 Oct to 31 Dec) were cleared in D1; holidays stayed (backup and restore line: project file `border-days/backup-2026-10-04-future-beerse.md`).

4 Oct 2026: **Quest pages** (Roy's request: one page to manage his quests, built from the mockup he approved). `/quests` lists active, planned and completed quests; each quest has its own page with quick changes, an edit form with guidance and ✦ Suggest, and a character picker for its visual (pictures from the new `characters.avatar_url` column); `/quests/new` drafts a quest with OpenAI from Roy's description, with a recommendation, questions, related quests and a character; `/quests/review` is the Sunday review, saved as one quest update per quest per week. The Main Quest stays on its own card. Visual clips and new visuals come later (`src/quests.js`, `src/questspage.js`, `test/quests.test.js`).
