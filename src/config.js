// The admin dashboard's settings: where it reads from, targets, thresholds,
// links and the unit prices behind the cost estimate. Everything the
// dashboard judges against is here, so a target changes in one place.

// Notion data sources it reads (never writes).
export const DATA_SOURCES = {
  workLocation: 'd9b2d597-947a-4cf9-863e-482f5f84f84c',
  workouts: 'd1a9346d-eef4-4458-8d91-f0a877bd0140',
  bodyMetrics: 'e2eccdcd-5ffa-4386-bb92-33add61b67c1'
};

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
// about 12% body fat) and Run a Half Marathon (2 runs a week). Sports without a
// target are shown for consistency only.
export const TRAINING = {
  weeklyHours: 6,
  runsPerWeek: 2,
  bodyFatTarget: 12,
  // No strength session for this many days: watch, then attention.
  strengthWatchDays: 14,
  strengthAttentionDays: 28,
  // Recent weeks compared with the baseline weeks before them.
  recentWeeks: 4,
  baselineWeeks: 8
};

// Strava sport_type_mapped → the dashboard's groups. Walks, hikes and e-bike
// commutes are not training.
export const SPORTS = {
  Run: 'run', TrailRun: 'run', VirtualRun: 'run',
  Ride: 'bike', VirtualRide: 'bike', GravelRide: 'bike', MountainBikeRide: 'bike',
  Swim: 'swim',
  WeightTraining: 'strength', HighIntensityIntervalTraining: 'strength', Workout: 'strength',
  Rowing: 'other', VirtualRow: 'other'
};

// When a sync still in Make looks stopped: days since its newest Notion row.
export const SYNCS = {
  strava: { scenario: 9739463, watchDays: 7, attentionDays: 14 },
  withings: { scenario: 9754079, watchDays: 14, attentionDays: 30 }
};

// Estimated unit prices (USD) for the paid calls the Quest Engine and this
// dashboard make. These are
// list-price estimates, not invoices: adjust them when the price sheets change.
export const PRICES = {
  chatInputPerMillion: 1.25,
  chatOutputPerMillion: 10,
  imageHigh: 0.25,
  imageMedium: 0.07,
  video: 0.5
};

const notion = id => `https://app.notion.com/p/${id}`;
const pages = name => `https://rdecaste.github.io/${name}/`;

export const NOTION = {
  questLog: notion('d835f903d4754c9bbf52100097824752'),
  questEngine: notion('3e824147f877813889c9cb966890e21b'),
  crossBorder: notion('3c724147f87780e2a083d83acd133385'),
  borderDashboard: notion('3c724147f87781e9ade2e65497f977c6'),
  workLocation: notion('3b24f6ff11b04379959f0e0b2effe42f'),
  bodyMetrics: notion('c04d532ae0904d24a657f19979f2df57'),
  workouts: notion('ec4d7e3ef61c4269988d68d228207c8b'),
  familyFinance: notion('357ede89a3b34661a8c535f3e9c71a13')
};

export const LINKS = [
  { group: 'Personal', items: [
    { name: 'Quest Dashboard', url: pages('Questboard') },
    { name: 'Boss Dashboard', url: pages('Boss') },
    { name: 'Main Quest', url: pages('MainQuest') },
    { name: 'VaultQuest', url: pages('VaultQuest') },
    { name: 'Quest Log', url: NOTION.questLog }
  ] },
  { group: 'Family', items: [
    { name: 'Family Dashboard', url: pages('FamilyDashboard') },
    { name: 'Parent Admin', url: pages('FamilyDashboard') + 'parent.html' },
    { name: 'Family Finance HQ', url: NOTION.familyFinance }
  ] },
  { group: 'Admin', items: [
    { name: 'Cross-border working', url: NOTION.crossBorder },
    { name: 'Work Location Log', url: NOTION.workLocation },
    { name: 'Body Metrics', url: NOTION.bodyMetrics },
    { name: 'Workouts', url: NOTION.workouts }
  ] },
  { group: 'Infrastructure', items: [
    { name: 'Quest Engine doc', url: NOTION.questEngine },
    { name: 'Quest Engine status', url: 'https://quest-engine.quest-engine.workers.dev/status' },
    { name: 'Make', url: 'https://eu2.make.com/' },
    { name: 'Cloudflare', url: 'https://dash.cloudflare.com/' },
    { name: 'healthchecks.io', url: 'https://healthchecks.io/projects/' },
    { name: 'GitHub', url: 'https://github.com/rdecaste' }
  ] }
];
