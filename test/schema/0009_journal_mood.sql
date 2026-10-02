-- Journal mood (2 Oct 2026, Roy's request): the journal page's mood row, one
-- pick in the morning and one in the evening, 1 to 5 (1 Sucky, 2 Meh,
-- 3 Normal, 4 Good, 5 On fire). Written by the admin dashboard's journal
-- page; empty until Roy picks. D1 only, not in the Notion backup.
ALTER TABLE journal ADD COLUMN mood_morning INTEGER;
ALTER TABLE journal ADD COLUMN mood_evening INTEGER;
