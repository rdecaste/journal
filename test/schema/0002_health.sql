-- Step 1 of docs/d1-migration.md: health and work data, copied from Notion.
-- Fields and their Notion properties: docs/d1-inventory.md. `journal` and
-- `month_summary` are JSON arrays of Notion page ids.

CREATE TABLE workouts (
  id TEXT PRIMARY KEY, created_time TEXT, notion_edited_time TEXT, updated_at TEXT,
  name TEXT,
  start_date_local TEXT,
  strava_id TEXT,
  sport_type TEXT,
  sport_type_mapped TEXT,
  distance REAL, moving_time REAL, elapsed_time REAL, total_elevation_gain REAL,
  average_heartrate REAL, max_heartrate REAL, average_cadence REAL,
  average_watts REAL, weighted_average_watts REAL, calories REAL,
  strava_url TEXT,
  effort_level TEXT, effort_multiplier REAL, effort_score REAL,
  fitness REAL, fatigue REAL, form REAL, form_state TEXT,
  special_move TEXT,
  journal TEXT
);
CREATE INDEX workouts_start ON workouts (start_date_local);
CREATE INDEX workouts_strava_id ON workouts (strava_id);

CREATE TABLE body_metrics (
  id TEXT PRIMARY KEY, created_time TEXT, notion_edited_time TEXT, updated_at TEXT,
  entry TEXT,
  date TEXT,
  weight REAL, body_fat_pct REAL, fat_mass REAL, fat_free_mass REAL, muscle_mass REAL,
  body_water REAL, visceral_fat REAL, bmr REAL, heart_rate REAL,
  pulse_wave_velocity REAL, vascular_age REAL,
  source TEXT,
  withings_measurement_id TEXT,
  journal TEXT
);
CREATE INDEX body_metrics_date ON body_metrics (date);

CREATE TABLE sleep_recovery (
  id TEXT PRIMARY KEY, created_time TEXT, notion_edited_time TEXT, updated_at TEXT,
  entry TEXT,
  date TEXT,
  bedtime TEXT, wake_time TEXT,
  total_sleep REAL, time_in_bed REAL,
  deep REAL, light REAL, rem REAL, awake REAL, time_to_sleep REAL, snoring REAL,
  wake_ups REAL, sleep_efficiency REAL, sleep_score REAL,
  avg_heart_rate REAL, min_heart_rate REAL, avg_respiratory_rate REAL, breathing_disturbances REAL,
  hrv REAL, resting_hr REAL, vo2_max REAL, mindful_minutes REAL,
  source TEXT,
  journal TEXT
);
CREATE INDEX sleep_recovery_date ON sleep_recovery (date);

CREATE TABLE work_location (
  id TEXT PRIMARY KEY, created_time TEXT, notion_edited_time TEXT, updated_at TEXT,
  day TEXT,
  date TEXT,
  am TEXT, pm TEXT,
  commute TEXT,
  weekend INTEGER,
  ebike_eur REAL,
  journal TEXT,
  month_summary TEXT
);
CREATE INDEX work_location_date ON work_location (date);
