// The admin dashboard's settings: where it reads from, targets, thresholds,
// links and the unit prices behind the cost estimate. Everything the
// dashboard judges against is here, so a target changes in one place.

// The tables' old Notion data source ids. D1 rows still carry theirs as
// parent.data_source_id (src/healthstore.js), so a write checks it has the
// right kind of row.
export const DATA_SOURCES = {
  workLocation: 'd9b2d597-947a-4cf9-863e-482f5f84f84c',
  workouts: 'd1a9346d-eef4-4458-8d91-f0a877bd0140',
  bodyMetrics: 'e2eccdcd-5ffa-4386-bb92-33add61b67c1',
  sleepRecovery: 'd32c2f70-27b3-4c3a-8ca8-85bf77349644',
  quests: '9cbb0e5a-10cf-4013-9eea-961aba9b4ac1'
};

// The Health Journey page (Journeys database). Its active quests, apart from
// the Main Quest, get a card on the Health tab.
export const HEALTH_JOURNEY = '3cd24147-f877-818c-afcf-d18407ac1200';

// Cross-border work (Work Location Log). Counting starts at the move, as in
// the Quest Engine's YTD snapshot (WORK_LOCATION_START in its src/journal.js).
export const CROSS_BORDER = {
  start: '2026-07-01',
  // Belgium's share of BE + NL workdays. YTD Border Split treats 50% NL as the
  // warning line, so Belgium must stay above 50%.
  beMinimum: 50,
  // Days of buffer (NL days that can still be added before the line) below
  // which the dashboard asks for attention, and below which it says "watch".
  bufferAttention: 3,
  bufferWatch: 8,
  // Weeks of recent history used for the "if the current pattern continues" projection.
  trendWeeks: 8
};

// Work Location Log select options, per half-day.
export const LOCATIONS = {
  '🇧🇪 Beerse': 'be',
  '🇧🇪 Ghent': 'be',
  '🇳🇱 Home': 'nl',
  '✈️ Travel': 'travel',
  '🏖️ Holiday': 'holiday',
  '🎉 Public holiday': 'holiday'
};

// Training targets, taken from the quests: Get Back in Shape (6 h a week,
// about 12% body fat) and Run a Half Marathon (a long run and an interval run
// each week). Sports without a target are shown for consistency only.
export const TRAINING = {
  weeklyHours: 6,
  runsPerWeek: 2,
  bodyFatTarget: 12,
  // This week's step toward the 6 h: the last 4 full weeks' average plus 10%,
  // never above weeklyHours. A missed step is shown on the bar, never flagged.
  stepGrowth: 1.1,
  // Half marathon: a run this long counts as the long run; a run whose name
  // matches intervalPattern counts as the interval run.
  longRunMinutes: 60,
  longRunKm: 10,
  halfMarathonKm: 21.1,
  // No strength session for this many days: watch, then attention.
  strengthWatchDays: 14,
  strengthAttentionDays: 28,
  // Recent weeks compared with the baseline weeks before them.
  recentWeeks: 4,
  baselineWeeks: 8
};
export const INTERVAL_PATTERN = /interval|\d{3}m|\b(200|300|400|800)'?s?\b|reps?\b|tempo|fartlek|track/i;

// Recovery today (Sleep & Recovery, Apple Health), each signal against Roy's
// own average over the 30 nights before last night. A signal is low when sleep
// is 45 min short, HRV 10% lower or resting HR 3 bpm higher. None low: Good to
// go; one: Go steady; two or more: Take it easy.
export const RECOVERY = {
  usualNights: 30,
  sleepShortMinutes: 45,
  hrvDropShare: 0.10,
  rhrRiseBpm: 3,
  // Recovering: the 7-night resting HR this far above usual, or Take it easy.
  // Training flags pause meanwhile; it lifts after this many normal days.
  recoveringRhrBpm: 2,
  recoveringClearDays: 3,
  // A night with this much time awake counts as broken; two in 7 nights: watch.
  brokenAwakeMinutes: 60,
  // No sleep row for this many days: watch.
  staleDays: 2
};

// Strava sport_type_mapped → the dashboard's groups. E-bike rides count toward
// the 6 h (Roy, 28 Sep); walks and hikes are not training.
export const SPORTS = {
  Run: 'run', TrailRun: 'run', VirtualRun: 'run',
  Ride: 'bike', VirtualRide: 'bike', GravelRide: 'bike', MountainBikeRide: 'bike',
  Swim: 'swim',
  WeightTraining: 'strength', HighIntensityIntervalTraining: 'strength', Workout: 'strength',
  Rowing: 'other', VirtualRow: 'other',
  EBikeRide: 'ebike'
};

// When the Strava or Withings sync looks stopped: days since its newest row.
export const SYNCS = {
  strava: { wasMake: 9739463, watchDays: 7, attentionDays: 14 },
  withings: { wasMake: 9754079, watchDays: 14, attentionDays: 30 }
};

// The Quest Engine checks the boss card against its data at least hourly (and
// when it is opened), so an older check means its timer has stopped.
export const ENGINE = { watchHours: 1.25, attentionHours: 3 };

// Estimated unit prices (USD) for the paid calls the Quest Engine and this
// dashboard make. These are
// list-price estimates, not invoices: adjust them when the price sheets change.
// E-bike commute allowance (Roy, 1 Oct 2026): €0.37 per km, 70 km round
// trip, so €25.90 for a day with this Commute. Set on the Work Location row
// when its Commute is saved (D1); days paid before keep their amount (€25).
export const EBIKE = { commute: '🚲 E-bike', km: 70, perKm: 0.37 };
export const ebikeDay = () => Math.round(EBIKE.km * EBIKE.perKm * 100) / 100;

export const PRICES = {
  chatInputPerMillion: 1.25,
  chatOutputPerMillion: 10,
  imageHigh: 0.25,
  imageMedium: 0.07,
  video: 0.5
};

const notion = id => `https://app.notion.com/p/${id}`;
// The cards, on Cloudflare since 1 Oct 2026 (the old github.io addresses forward).
const card = name => `https://${name}.quest-engine.workers.dev/`;

// The data lives in D1 since 1 Oct 2026: its tables are browsed and edited in
// the Cloudflare dashboard (D1 → quest → Data Studio). Notion is a frozen,
// read-only copy; only the two pages below are still linked, as reading.
export const D1_CONSOLE = 'https://dash.cloudflare.com/5976b96a95f8d424a229294bb45ee3ef/workers/d1/databases/94e5f5c7-b24f-4a3c-808c-a85345a27f7f';
const doc = (repo, file) => `https://github.com/rdecaste/${repo}/blob/main/docs/${file}`;
export const QUEST_ENGINE_DOC = doc('quest-engine', 'quest-engine.md');

export const NOTION = {
  crossBorder: notion('3c724147f87780e2a083d83acd133385'),
  familyFinance: notion('357ede89a3b34661a8c535f3e9c71a13')
};

export const LINKS = [
  { group: 'Personal', items: [
    { name: 'Quest Dashboard', url: card('questboard') },
    { name: 'Boss Dashboard', url: card('boss') },
    { name: 'Main Quest', url: card('mainquest') },
    { name: 'VaultQuest', url: card('vaultquest') },
    { name: 'Quest Log', url: '/' }
  ] },
  { group: 'Family', items: [
    { name: 'Family Dashboard', url: card('family') },
    { name: 'Parent Admin', url: card('family') + 'parent' },
    { name: 'Family Finance HQ (Notion)', url: NOTION.familyFinance }
  ] },
  { group: 'Admin', items: [
    { name: 'Cross-border working (Notion)', url: NOTION.crossBorder },
    { name: 'Data (D1 Data Studio)', url: D1_CONSOLE }
  ] },
  { group: 'Infrastructure', items: [
    { name: 'Quest Engine doc', url: QUEST_ENGINE_DOC },
    { name: 'Admin Dashboard doc', url: doc('journal', 'admin-dashboard.md') },
    { name: 'Quest Engine status', url: 'https://quest-engine.quest-engine.workers.dev/status' },
    { name: 'Make', url: 'https://eu2.make.com/' },
    { name: 'Cloudflare', url: 'https://dash.cloudflare.com/' },
    { name: 'healthchecks.io', url: 'https://healthchecks.io/projects/' },
    { name: 'GitHub', url: 'https://github.com/rdecaste' }
  ] }
];

