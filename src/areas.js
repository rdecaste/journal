// A copy of the Quest Engine's src/areas.js (rdecaste/quest-engine): the areas
// moving from Notion to D1 (its docs/d1-migration.md), each with its
// tables: the D1 table, the Notion data source it is copied from, its
// columns (see the Quest Engine's src/db.js), `types`: each property's Notion type where it is
// not a number (src/store.js rebuilds pages in Notion's shape from them), and
// `ignore`: Notion formulas no code reads, so not copied. Any other property
// with a value but no column is reported by the copy and the check, so
// nothing is dropped unnoticed. The tables are created in migrations/; fields
// in docs/d1-inventory.md.

export const AREAS = {
  // Step 1: health and work data.
  health: {
    tables: [
      {
        table: 'workouts',
        dataSource: 'd1a9346d-eef4-4458-8d91-f0a877bd0140',
        columns: {
          name: 'name', start_date_local: 'start_date_local', strava_id: 'id',
          sport_type: 'sport_type', sport_type_mapped: 'sport_type_mapped',
          distance: 'distance', moving_time: 'moving_time', elapsed_time: 'elapsed_time', total_elevation_gain: 'total_elevation_gain',
          average_heartrate: 'average_heartrate', max_heartrate: 'max_heartrate', average_cadence: 'average_cadence',
          average_watts: 'average_watts', weighted_average_watts: 'weighted_average_watts', calories: 'calories',
          strava_url: 'strava_url',
          effort_level: 'Effort Level', effort_multiplier: 'Effort Multiplier', effort_score: 'Effort Score',
          fitness: 'Fitness', fatigue: 'Fatigue', form: 'Form', form_state: 'Form State',
          special_move: 'Special Move',
          journal: 'Journal'
        },
        types: {
          name: 'title', start_date_local: 'date', id: 'rich_text', sport_type: 'rich_text', sport_type_mapped: 'select',
          strava_url: 'url', 'Effort Level': 'select', 'Form State': 'select', 'Special Move': 'rich_text', Journal: 'relation'
        },
        ignore: ['date_display', 'start_time_display', 'moving_time_hours', 'pace_display', 'distance_km', 'moving_time_display', 'elapsed_time_display']
      },
      {
        table: 'body_metrics',
        dataSource: 'e2eccdcd-5ffa-4386-bb92-33add61b67c1',
        columns: {
          entry: 'Entry', date: 'Date',
          weight: 'Weight', body_fat_pct: 'Body Fat %', fat_mass: 'Fat Mass', fat_free_mass: 'Fat-Free Mass', muscle_mass: 'Muscle Mass',
          body_water: 'Body Water', visceral_fat: 'Visceral Fat', bmr: 'BMR', heart_rate: 'Heart Rate',
          pulse_wave_velocity: 'Pulse Wave Velocity', vascular_age: 'Vascular Age',
          source: 'Source', withings_measurement_id: 'Withings Measurement ID',
          journal: 'Journal'
        },
        types: { Entry: 'title', Date: 'date', Source: 'select', 'Withings Measurement ID': 'rich_text', Journal: 'relation' },
        ignore: ['Month', 'Year']
      },
      {
        table: 'sleep_recovery',
        dataSource: 'd32c2f70-27b3-4c3a-8ca8-85bf77349644',
        columns: {
          entry: 'Entry', date: 'Date', bedtime: 'Bedtime', wake_time: 'Wake Time',
          total_sleep: 'Total Sleep', time_in_bed: 'Time in Bed',
          deep: 'Deep', light: 'Light', rem: 'REM', awake: 'Awake', time_to_sleep: 'Time to Sleep', snoring: 'Snoring',
          wake_ups: 'Wake-ups', sleep_efficiency: 'Sleep Efficiency', sleep_score: 'Sleep Score',
          avg_heart_rate: 'Avg Heart Rate', min_heart_rate: 'Min Heart Rate', avg_respiratory_rate: 'Avg Respiratory Rate',
          breathing_disturbances: 'Breathing Disturbances',
          hrv: 'HRV', resting_hr: 'Resting HR', vo2_max: 'VO2 Max', mindful_minutes: 'Mindful Minutes',
          source: 'Source',
          journal: 'Journal'
        },
        types: { Entry: 'title', Date: 'date', Bedtime: 'date', 'Wake Time': 'date', Source: 'select', Journal: 'relation' },
        // Withings Sleep ID is left out on purpose (sleep comes from Apple
        // Health only): if any row had one, the copy would report it.
        ignore: []
      },
      {
        table: 'work_location',
        dataSource: 'd9b2d597-947a-4cf9-863e-482f5f84f84c',
        columns: {
          day: 'Day', date: 'Date', am: 'AM', pm: 'PM', commute: 'Commute', weekend: 'Weekend',
          ebike_eur: 'E-bike €', journal: 'Journal', month_summary: 'Month Summary'
        },
        // E-bike € was a Notion formula; in D1 the dashboard sets it with Commute.
        types: {
          Day: 'title', Date: 'date', AM: 'select', PM: 'select', Commute: 'select', Weekend: 'checkbox',
          'E-bike €': 'formula', Journal: 'relation', 'Month Summary': 'relation'
        },
        // No rows for weekends in D1 (Roy, 1 Oct 2026): Notion's empty weekend
        // rows are not copied, and the check doesn't expect them.
        skip: page => {
          const p = page.properties || {};
          return !!(p.Weekend && p.Weekend.checkbox) && !(p.AM && p.AM.select) && !(p.PM && p.PM.select) && !(p.Commute && p.Commute.select) &&
            !((p.Journal && p.Journal.relation) || []).length;
        },
        ignore: ['Month', 'Accountable Days', 'BE Work Days', 'NL Work Days', 'Travel Days', 'Holiday Days', 'Unclassified Days', 'Expected Work Days']
      }
    ]
  }
};

// Every copied table by name, with its area.
export const TABLES = Object.fromEntries(Object.entries(AREAS).flatMap(([area, a]) => a.tables.map(t => [t.table, { ...t, area }])));
