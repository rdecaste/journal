-- Step 2 of docs/d1-migration.md: journal, to-dos and quests, copied from
-- Notion. Fields and their Notion properties: docs/d1-inventory.md. Relations
-- are JSON arrays of page ids, kept on one side only (the updates link their
-- journal, quest and journey; the journal its quests). `blocks` is the page's content as Notion had
-- it ({ root, kids: { parent id: [blocks] } }), kept word for word.

CREATE TABLE journal (
  id TEXT PRIMARY KEY, created_time TEXT, notion_edited_time TEXT, updated_at TEXT,
  entry TEXT,
  date TEXT,
  morning_spark TEXT, agent_digest TEXT,
  success INTEGER,
  level REAL, sublevel REAL, stage REAL, stage_progress_pct REAL,
  xp REAL, xp_multiplier REAL, xp_to_next_stage REAL,
  performance_tier REAL, visual_band REAL, display_level TEXT,
  hp_restored REAL, three_day_average REAL,
  force_regenerate_boss INTEGER, force_regenerate_visual INTEGER,
  related_quests TEXT,
  -- The page's content, read from its blocks.
  headspace_q TEXT, headspace TEXT,
  forward_q TEXT, forward TEXT,
  reflection_q TEXT, reflection TEXT,
  tomorrow_q TEXT, tomorrow TEXT,
  win_if TEXT, did_it_happen TEXT, park_it TEXT,
  main_quest_name TEXT, main_quest_checkin TEXT, main_quest_note TEXT,
  blocks TEXT, content_read_at TEXT
);
CREATE INDEX journal_date ON journal (date);

-- Today's focus: the to-dos under Must do / Can do / Something cool.
CREATE TABLE journal_focus (
  id TEXT PRIMARY KEY,           -- the to-do block's id
  journal_id TEXT NOT NULL,
  grp TEXT NOT NULL,             -- must, can, cool
  position INTEGER NOT NULL,
  text TEXT, done INTEGER,
  todo_id TEXT                   -- the To-Dos row it came from, if any
);
CREATE INDEX journal_focus_journal ON journal_focus (journal_id);

-- One note per active quest under ACTIVE QUESTS.
CREATE TABLE journal_quest_notes (
  id TEXT PRIMARY KEY,           -- the quest callout's block id
  journal_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT, icon TEXT, note TEXT, edited_at TEXT
);
CREATE INDEX journal_quest_notes_journal ON journal_quest_notes (journal_id);

CREATE TABLE todos (
  id TEXT PRIMARY KEY, created_time TEXT, notion_edited_time TEXT, updated_at TEXT,
  task TEXT, status TEXT, labels TEXT, tag TEXT, priority TEXT,
  due TEXT, source_date TEXT, notes TEXT,
  related_journal TEXT, related_quests TEXT,
  blocks TEXT, content_read_at TEXT
);

CREATE TABLE quests (
  id TEXT PRIMARY KEY, created_time TEXT, notion_edited_time TEXT, updated_at TEXT,
  quest TEXT, description TEXT, desired_outcome TEXT,
  active_quest INTEGER, main_quest INTEGER,
  quest_attention TEXT, quest_phase TEXT, year TEXT,
  start_date TEXT, target_date TEXT, completed_at TEXT, completion_logged INTEGER,
  dashboard_status TEXT, dashboard_status_statement TEXT, dashboard_latest_evidence TEXT, dashboard_updated_at TEXT,
  agent_progress_assessment TEXT, daily_evidence_guide TEXT, pass_fail_question TEXT,
  next_move TEXT, final_word TEXT, comment TEXT,
  refresh_visual INTEGER, update_questboard INTEGER, last_visual_update TEXT,
  cloudinary_video_url TEXT, cloudinary_video_public_id TEXT, cloudinary_video_version TEXT,
  journey TEXT, character TEXT,
  blocks TEXT, content_read_at TEXT
);

CREATE TABLE journeys (
  id TEXT PRIMARY KEY, created_time TEXT, notion_edited_time TEXT, updated_at TEXT,
  journey TEXT, description TEXT, north_star TEXT, evidence_guide TEXT,
  accountability_lens TEXT, accountability_partner TEXT,
  blocks TEXT, content_read_at TEXT
);

CREATE TABLE journal_updates (
  id TEXT PRIMARY KEY, created_time TEXT, notion_edited_time TEXT, updated_at TEXT,
  "update" TEXT, date TEXT, type TEXT, source TEXT, summary TEXT, key_fact TEXT,
  journal_entry TEXT, journey TEXT,
  blocks TEXT, content_read_at TEXT
);
CREATE INDEX journal_updates_date ON journal_updates (date);

CREATE TABLE quest_updates (
  id TEXT PRIMARY KEY, created_time TEXT, notion_edited_time TEXT, updated_at TEXT,
  "update" TEXT, date TEXT, type TEXT, source TEXT, summary TEXT, progress_highlight TEXT,
  quest TEXT, journal_entry TEXT, milestone TEXT, image TEXT, created TEXT,
  blocks TEXT, content_read_at TEXT
);
CREATE INDEX quest_updates_date ON quest_updates (date);
