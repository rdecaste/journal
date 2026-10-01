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

// Step 2: journal, to-dos and quests. Two-way relations are kept on one side:
// the mirror is in `ignore` (Notion keeps both sides; D1 keeps one). Each
// table also keeps the page's icon and cover (PAGE).
// `content`: the page's blocks are copied too (POST /d1/content), and the
// journal's are read into its columns (src/journalread.js).
const PAGE = { icon: { page: 'icon' }, cover: { page: 'cover' } };
AREAS.journal = {
  tables: [
    {
      table: 'journal',
      dataSource: '9e98784e-e304-4cee-9a50-e492580b1d86',
      content: 'journal',
      columns: {
        ...PAGE,
        entry: 'Entry', date: 'Date', morning_spark: 'Morning Spark', agent_digest: 'Agent Digest', success: 'Success',
        level: 'Level', sublevel: 'Sublevel', stage: 'Stage', stage_progress_pct: 'Stage Progress %',
        xp: 'XP', xp_multiplier: 'XP Multiplier', xp_to_next_stage: 'XP to Next Stage',
        performance_tier: 'Performance Tier', visual_band: 'Visual Band', display_level: 'Display Level',
        hp_restored: 'HP Restored', three_day_average: '3-Day Average',
        force_regenerate_boss: 'Force Regenerate Boss', force_regenerate_visual: 'Force Regenerate Visual',
        related_quests: 'Related Quests'
      },
      types: {
        Entry: 'title', Date: 'date', 'Morning Spark': 'rich_text', 'Agent Digest': 'rich_text', Success: 'checkbox',
        'Display Level': 'rich_text', 'Force Regenerate Boss': 'checkbox', 'Force Regenerate Visual': 'checkbox', 'Related Quests': 'relation'
      },
      // The page's answers: D1 columns with no Notion property (written by
      // the 03:30 setup and the journal page; read from the blocks by the copy).
      plain: ['headspace_q', 'headspace', 'forward_q', 'forward', 'reflection_q', 'reflection', 'tomorrow_q', 'tomorrow',
        'win_if', 'did_it_happen', 'park_it', 'main_quest_name', 'main_quest_checkin', 'main_quest_note'],
      // Rollups no code reads, and the other side of relations kept on the
      // health tables and the updates.
      ignore: ['Weight', 'Body Fat %', 'Workouts', 'Body Metrics', 'Sleep', 'Work Location', 'Journal Updates', 'Quest Updates']
    },
    {
      table: 'todos',
      dataSource: '0c9c63e3-cd72-4cf8-bc53-251d1f010bdc',
      content: 'blocks',
      columns: {
        ...PAGE,
        task: 'Task', status: 'Status', labels: 'Labels', tag: 'Tag', priority: 'Priority',
        due: 'Due', source_date: 'Source Date', notes: 'Notes', related_journal: 'Related Journal', related_quests: 'Related Quests'
      },
      types: {
        Task: 'title', Status: 'status', Labels: 'multi_select', Tag: 'select', Priority: 'select',
        Due: 'date', 'Source Date': 'date', Notes: 'rich_text', 'Related Journal': 'relation', 'Related Quests': 'relation'
      },
      ignore: ['Done'] // a button
    },
    {
      table: 'quests',
      dataSource: '9cbb0e5a-10cf-4013-9eea-961aba9b4ac1',
      content: 'blocks',
      columns: {
        ...PAGE,
        quest: 'Quest', description: 'Description', desired_outcome: 'Desired Outcome',
        active_quest: 'Active Quest', main_quest: 'Main Quest',
        quest_attention: 'Quest Attention', quest_phase: 'Quest Phase', year: 'Year',
        start_date: 'Start Date', target_date: 'Target Date', completed_at: 'Completed At', completion_logged: 'Completion Logged',
        dashboard_status: 'Dashboard Status', dashboard_status_statement: 'Dashboard Status Statement',
        dashboard_latest_evidence: 'Dashboard Latest Evidence', dashboard_updated_at: 'Dashboard Updated At',
        agent_progress_assessment: 'Agent Progress Assessment', daily_evidence_guide: 'Daily Evidence Guide',
        pass_fail_question: 'Pass/Fail Question', next_move: 'Next Move', final_word: 'Final Word', comment: 'Comment',
        refresh_visual: 'Refresh visual', update_questboard: 'Update questboard', last_visual_update: 'Last Visual Update',
        cloudinary_video_url: 'Cloudinary Video URL', cloudinary_video_public_id: 'Cloudinary Video Public ID',
        cloudinary_video_version: 'Cloudinary Video Version',
        journey: 'Journey', character: 'Character'
      },
      types: {
        Quest: 'title', Description: 'rich_text', 'Desired Outcome': 'rich_text', 'Active Quest': 'checkbox', 'Main Quest': 'checkbox',
        'Quest Attention': 'select', 'Quest Phase': 'select', Year: 'select',
        'Start Date': 'date', 'Target Date': 'date', 'Completed At': 'date', 'Completion Logged': 'checkbox',
        'Dashboard Status': 'rich_text', 'Dashboard Status Statement': 'rich_text', 'Dashboard Latest Evidence': 'rich_text',
        'Dashboard Updated At': 'date', 'Agent Progress Assessment': 'rich_text', 'Daily Evidence Guide': 'rich_text',
        'Pass/Fail Question': 'rich_text', 'Next Move': 'rich_text', 'Final Word': 'rich_text', Comment: 'rich_text',
        'Refresh visual': 'checkbox', 'Update questboard': 'checkbox', 'Last Visual Update': 'date',
        'Cloudinary Video URL': 'url', 'Cloudinary Video Public ID': 'rich_text', 'Cloudinary Video Version': 'rich_text',
        Journey: 'relation', Character: 'relation'
      },
      ignore: ['Quest Updates', 'Related Journal Entries']
    },
    {
      table: 'journeys',
      dataSource: 'fbf29ca2-ee96-4734-8fd1-f35e100de354',
      content: 'blocks',
      columns: {
        ...PAGE,
        journey: 'Journey', description: 'Description', north_star: 'North Star', evidence_guide: 'Evidence Guide',
        accountability_lens: 'Accountability Lens', accountability_partner: 'Accountability Partner'
      },
      types: {
        Journey: 'title', Description: 'rich_text', 'North Star': 'rich_text', 'Evidence Guide': 'rich_text',
        'Accountability Lens': 'rich_text', 'Accountability Partner': 'rich_text'
      },
      ignore: ['Quests', 'Journal Updates']
    },
    {
      table: 'journal_updates',
      dataSource: 'c89fb5ef-583d-4eef-b109-4822a2d45ca3',
      content: 'blocks',
      columns: {
        ...PAGE,
        update: 'Update', date: 'Date', type: 'Type', source: 'Source', summary: 'Summary', key_fact: 'Key Fact',
        journal_entry: 'Journal Entry', journey: 'Journey'
      },
      types: {
        Update: 'title', Date: 'date', Type: 'select', Source: 'select', Summary: 'rich_text', 'Key Fact': 'rich_text',
        'Journal Entry': 'relation', Journey: 'relation'
      },
      ignore: []
    },
    {
      table: 'quest_updates',
      dataSource: '367cf6de-f174-404f-834d-aea5cf60c6ff',
      content: 'blocks',
      columns: {
        ...PAGE,
        update: 'Update', date: 'Date', type: 'Type', source: 'Source', summary: 'Summary', progress_highlight: 'Progress Highlight',
        quest: 'Quest', journal_entry: 'Journal Entry', milestone: 'Milestone', image: 'Image', created: 'Created'
      },
      types: {
        Update: 'title', Date: 'date', Type: 'select', Source: 'select', Summary: 'rich_text', 'Progress Highlight': 'rich_text',
        Quest: 'relation', 'Journal Entry': 'relation', Milestone: 'relation', Image: 'files', Created: 'created_time'
      },
      ignore: []
    }
  ]
};

// Every copied table by name, with its area.
export const TABLES = Object.fromEntries(Object.entries(AREAS).flatMap(([area, a]) => a.tables.map(t => [t.table, { ...t, area }])));
