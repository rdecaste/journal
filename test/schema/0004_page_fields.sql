-- Step 2 of docs/d1-migration.md: the page's own icon and cover (Notion's
-- JSON, as the page had it), which aren't properties, so the first copy left
-- them out. `page_text`: the copied page's whole text in reading order, so
-- what was written outside the template's boxes (older templates had Rant
-- Zone, Brain Dump, Wins…) reads plainly in D1, not only inside `blocks`. The journal page shows a quest's emoji on its box. And a quest
-- note's quest: kept for notes written in D1 (the copied ones are matched by
-- title, as the journal page did).
ALTER TABLE journal ADD COLUMN icon TEXT;
ALTER TABLE journal ADD COLUMN cover TEXT;
ALTER TABLE journal ADD COLUMN page_text TEXT;
ALTER TABLE todos ADD COLUMN icon TEXT;
ALTER TABLE todos ADD COLUMN cover TEXT;
ALTER TABLE todos ADD COLUMN page_text TEXT;
ALTER TABLE quests ADD COLUMN icon TEXT;
ALTER TABLE quests ADD COLUMN cover TEXT;
ALTER TABLE quests ADD COLUMN page_text TEXT;
ALTER TABLE journeys ADD COLUMN icon TEXT;
ALTER TABLE journeys ADD COLUMN cover TEXT;
ALTER TABLE journeys ADD COLUMN page_text TEXT;
ALTER TABLE journal_updates ADD COLUMN icon TEXT;
ALTER TABLE journal_updates ADD COLUMN cover TEXT;
ALTER TABLE journal_updates ADD COLUMN page_text TEXT;
ALTER TABLE quest_updates ADD COLUMN icon TEXT;
ALTER TABLE quest_updates ADD COLUMN cover TEXT;
ALTER TABLE quest_updates ADD COLUMN page_text TEXT;
ALTER TABLE journal_quest_notes ADD COLUMN quest_id TEXT;
