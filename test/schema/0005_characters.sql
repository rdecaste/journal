-- The characters table, copied from the Quest Engine's migrations/0005_battle.sql,
-- plus avatar_url: a small square picture for the quest pages' character picker
-- (added to D1 by hand on 4 Oct 2026; Cloudinary Character-Avatars/<id>).
CREATE TABLE characters (
  id TEXT PRIMARY KEY, created_time TEXT, notion_edited_time TEXT, updated_at TEXT, in_trash INTEGER,
  character_name TEXT, character_id TEXT, character_mode TEXT, franchise TEXT, enabled INTEGER,
  canonical_identity TEXT, canonical_elements TEXT, signature_powers_forms TEXT, restrictions TEXT,
  icon TEXT, cover TEXT, blocks TEXT, page_text TEXT, content_read_at TEXT
);
ALTER TABLE characters ADD COLUMN avatar_url TEXT;
-- avatar_clip_url: a short looping clip of the avatar (Quest Engine migration 0016).
ALTER TABLE characters ADD COLUMN avatar_clip_url TEXT;
