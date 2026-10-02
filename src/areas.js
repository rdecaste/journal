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
        'win_if', 'did_it_happen', 'park_it', 'main_quest_name', 'main_quest_checkin', 'main_quest_note',
        // The mood row, 1 (Sucky) to 5 (On fire); D1 only (migration 0009, 2 Oct 2026).
        'mood_morning', 'mood_evening'],
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


// Step 3: the battle, and the tables the visuals pick from. Every table keeps
// pages sent to Notion's trash as rows marked `in_trash` (`trash`), and the
// page's blocks (`content`). Two-way relations are kept on one side, as in
// step 2: a character's Quests and Signature Moves are the quests' Character
// and the moves' Character. `rollups`: Notion rollups the code reads, rebuilt
// from the related table by the store.
AREAS.battle = {
  tables: [
    {
      table: 'habits',
      dataSource: 'd9b479a1-705d-481a-9fb6-9316c441fdb2',
      content: 'blocks', trash: true,
      columns: {
        ...PAGE,
        habit: 'Habit', section: 'Section', shortcut_key: 'Shortcut Key', effect: 'Effect', magnitude: 'Magnitude',
        enabled: 'Enabled', once_a_day: 'Once a Day',
        minimum_damage: 'Minimum Damage', maximum_damage: 'Maximum Damage', minimum_heal: 'Minimum Heal', maximum_heal: 'Maximum Heal',
        streak: 'Streak', streak_day: 'Streak Day', last_attack: 'Last Attack', expectation: 'Expectation',
        habit_icon: 'Icon', sort_order: 'Order', strava_types: 'Strava Types'
      },
      types: {
        Habit: 'title', Section: 'select', 'Shortcut Key': 'rich_text', Effect: 'select', Magnitude: 'select',
        Enabled: 'checkbox', 'Once a Day': 'checkbox', 'Streak Day': 'date', 'Last Attack': 'date',
        Expectation: 'rich_text', Icon: 'rich_text', 'Strava Types': 'rich_text'
      },
      ignore: []
    },
    {
      table: 'events',
      dataSource: '98b44701-f6e6-4121-8b10-120e9c40199f',
      content: 'blocks', trash: true,
      columns: {
        ...PAGE,
        event: 'Event', occurred_at: 'Occurred At', event_type: 'Event Type', actor: 'Actor', processing_status: 'Processing Status',
        request_id: 'Request ID', fight: 'Fight', habit_attack: 'Habit Attack',
        damage: 'Damage', heal: 'Heal', hp_before: 'HP Before', hp_after: 'HP After', base_roll: 'Base Roll', critical_hit: 'Critical Hit',
        level_multiplier: 'Level Multiplier', effort_multiplier: 'Effort Multiplier', form_bonus: 'Form Bonus',
        streak: 'Streak', dragon_ball: 'Dragon Ball', special_move: 'Special Move'
      },
      types: {
        Event: 'title', 'Occurred At': 'date', 'Event Type': 'select', Actor: 'select', 'Processing Status': 'select',
        'Request ID': 'rich_text', Fight: 'relation', 'Habit Attack': 'relation', 'Critical Hit': 'checkbox', 'Special Move': 'rich_text'
      },
      rollups: {
        'Habit Key': { relation: 'habit_attack', table: 'habits', column: 'shortcut_key', type: 'rich_text' },
        'Habit Section': { relation: 'habit_attack', table: 'habits', column: 'section', type: 'select' }
      },
      ignore: []
    },
    {
      table: 'fights',
      dataSource: 'c1f99f19-2719-4492-95b2-21a4763688a9',
      content: 'blocks', trash: true,
      columns: {
        ...PAGE,
        fight: 'Fight', status: 'Status', started_at: 'Started At', defeated_at: 'Defeated At', defeat_reason: 'Defeat Reason',
        victory_claimed_at: 'Victory Claimed At', boss_design: 'Boss Design', boss_max_hp: 'Boss Max HP', boss_current_hp: 'Boss Current HP',
        hero_level_at_spawn: 'Hero Level at Spawn', hits: 'Hits', crits: 'Crits', best_hit: 'Best Hit', best_hit_habit: 'Best Hit Habit',
        final_blow: 'Final Blow', epithet: 'Epithet', video_public_id: 'Video Public ID', video_version: 'Video Version',
        restyle: 'Restyle', restyle_design: 'Restyle Design', restyle_image: 'Restyle Image', restyle_step: 'Restyle Step'
      },
      types: {
        Fight: 'title', Status: 'select', 'Started At': 'date', 'Defeated At': 'date', 'Defeat Reason': 'select',
        'Victory Claimed At': 'date', 'Boss Design': 'relation', 'Best Hit Habit': 'rich_text', 'Final Blow': 'rich_text',
        Epithet: 'rich_text', 'Video Public ID': 'rich_text', Restyle: 'checkbox', 'Restyle Design': 'relation',
        'Restyle Image': 'rich_text', 'Restyle Step': 'select'
      },
      ignore: []
    },
    {
      table: 'hero',
      dataSource: '12a9628c-f84c-4552-94b0-9ed73c647396',
      content: 'blocks', trash: true,
      columns: {
        ...PAGE,
        hero: 'Hero', current_hp: 'Current HP', max_hp: 'Max HP', last_recovery_date: 'Last Recovery Date',
        last_processed_xp: 'Last Processed XP', last_level: 'Last Level', dragon_balls: 'Dragon Balls',
        wish: 'Wish', wish_day: 'Wish Day', heal_day: 'Heal Day', healed_today: 'Healed Today'
      },
      types: { Hero: 'title', 'Last Recovery Date': 'date', Wish: 'select', 'Wish Day': 'date', 'Heal Day': 'date' },
      ignore: []
    },
    {
      table: 'rates',
      dataSource: '58decdf7-d57e-473a-bbaf-837b8e4ec94d',
      content: 'blocks', trash: true,
      columns: { ...PAGE, performance_tier: 'Performance Tier', tier: 'Tier', min_average: 'Min Average', max_average: 'Max Average', xp_multiplier: 'XP Multiplier' },
      types: { 'Performance Tier': 'title' },
      ignore: []
    },
    {
      table: 'stages',
      dataSource: '4fea0ba5-7397-4d4b-a5cb-f5c114971b36',
      content: 'blocks', trash: true,
      columns: { ...PAGE, stage_label: 'Stage Label', stage: 'Stage', level: 'Level', sublevel: 'Sublevel', min_xp: 'Min XP', max_xp: 'Max XP' },
      types: { 'Stage Label': 'title' },
      ignore: []
    },
    {
      table: 'goku',
      dataSource: 'f51585f7-0ca0-4619-a725-250bb809ff60',
      content: 'blocks', trash: true,
      columns: {
        ...PAGE,
        form: 'Form', character: 'Character', level: 'Level', sublevel: 'Sublevel',
        character_description: 'Character Description', hair_face: 'Hair / Face', outfit: 'Outfit', aura_energy: 'Aura / Energy',
        expression: 'Expression', pose: 'Pose', environment: 'Environment', camera_lighting: 'Camera & Lighting',
        motion_style: 'Motion Style', signature_move: 'Signature Move', core_voice: 'Core Voice', level_voice: 'Level Voice', avoid: 'Avoid',
        // Lore exists only in D1 (added 2 Oct 2026, after the Notion copy).
        lore: 'Lore',
        image_url: 'Image URL', reference_image: 'Reference Image', video_url: 'Video URL'
      },
      types: {
        Form: 'title', Character: 'select', 'Character Description': 'rich_text', 'Hair / Face': 'rich_text', Outfit: 'rich_text',
        'Aura / Energy': 'rich_text', Expression: 'rich_text', Pose: 'rich_text', Environment: 'rich_text', 'Camera & Lighting': 'rich_text',
        'Motion Style': 'rich_text', 'Signature Move': 'rich_text', 'Core Voice': 'rich_text', 'Level Voice': 'rich_text', Avoid: 'rich_text', Lore: 'rich_text',
        'Image URL': 'url', 'Reference Image': 'url', 'Video URL': 'url'
      },
      ignore: []
    },
    {
      table: 'designs',
      dataSource: '42725285-34b2-496a-91d8-b36e868ea7c2',
      content: 'blocks', trash: true,
      columns: {
        ...PAGE,
        boss_name: 'Boss Name', epithet: 'Epithet', hero_level: 'Hero Level', starting_hp: 'Starting HP', enabled: 'Enabled',
        lore: 'Lore', appearance: 'Appearance', aura_energy: 'Aura / Energy', pose: 'Pose', environment: 'Environment',
        scene_prompt: 'Scene / Prompt', avoid: 'Avoid', defeat_prompt: 'Defeat Prompt',
        intro_image: 'Intro Image', defeat_image: 'Defeat Image', reference_image: 'Reference Image'
      },
      types: {
        'Boss Name': 'title', Epithet: 'rich_text', Enabled: 'checkbox', Lore: 'rich_text', Appearance: 'rich_text',
        'Aura / Energy': 'rich_text', Pose: 'rich_text', Environment: 'rich_text', 'Scene / Prompt': 'rich_text', Avoid: 'rich_text',
        'Defeat Prompt': 'rich_text', 'Intro Image': 'url', 'Defeat Image': 'url', 'Reference Image': 'url'
      },
      ignore: []
    },
    {
      table: 'characters',
      dataSource: '33108fca-63c6-4f5c-83ad-1310ef9b9cb8',
      content: 'blocks', trash: true,
      columns: {
        ...PAGE,
        character_name: 'Character Name', character_id: 'Character ID', character_mode: 'Character Mode', franchise: 'Franchise',
        enabled: 'Enabled', canonical_identity: 'Canonical Identity', canonical_elements: 'Canonical Elements',
        signature_powers_forms: 'Signature Powers & Forms', restrictions: 'Restrictions'
      },
      types: {
        'Character Name': 'title', 'Character ID': 'unique_id', 'Character Mode': 'rich_text', Franchise: 'rich_text', Enabled: 'checkbox',
        'Canonical Identity': 'rich_text', 'Canonical Elements': 'rich_text', 'Signature Powers & Forms': 'rich_text', Restrictions: 'rich_text'
      },
      ignore: ['Quests', 'Signature Moves']
    },
    {
      table: 'moves',
      dataSource: '2a74e332-e0f3-4727-989e-3a340c9c15c5',
      content: 'blocks', trash: true,
      columns: {
        ...PAGE,
        move_name: 'Move Name', move_mode: 'Move Mode', move_number: 'Move Number', character: 'Character', franchise: 'Franchise',
        enabled: 'Enabled', intensity: 'Intensity', allowed_phase: 'Allowed Phase', move_category: 'Move Category',
        canonical_identity: 'Canonical Identity', visual_elements: 'Visual Elements', restrictions: 'Restrictions'
      },
      types: {
        'Move Name': 'title', 'Move Mode': 'rich_text', Character: 'relation', Franchise: 'rich_text', Enabled: 'checkbox',
        Intensity: 'select', 'Allowed Phase': 'multi_select', 'Move Category': 'rich_text', 'Canonical Identity': 'rich_text',
        'Visual Elements': 'rich_text', Restrictions: 'rich_text'
      },
      ignore: []
    },
    {
      table: 'scenes',
      dataSource: '64c3d98e-80fe-45ac-85ec-d5399d0897de',
      content: 'blocks', trash: true,
      columns: {
        ...PAGE,
        scene_name: 'Scene Name', scene_number: 'Scene Number', scene_mode: 'Scene Mode', franchise: 'Franchise', enabled: 'Enabled',
        scene_category: 'Scene Category', canonical_identity: 'Canonical Identity', canonical_elements: 'Canonical Elements',
        signature_features: 'Signature Features', restrictions: 'Restrictions'
      },
      types: {
        'Scene Name': 'title', 'Scene Mode': 'rich_text', Franchise: 'rich_text', Enabled: 'checkbox', 'Scene Category': 'rich_text',
        'Canonical Identity': 'rich_text', 'Canonical Elements': 'rich_text', 'Signature Features': 'rich_text', Restrictions: 'rich_text'
      },
      ignore: []
    }
  ]
};

// Step 4: the vault (VaultQuest) and the family dashboard, as step 3: every
// table keeps trashed pages (`trash`) and the page's blocks (`content`).
const RT = (...names) => Object.fromEntries(names.map(n => [n, 'rich_text']));
AREAS.vault = {
  tables: [
    {
      table: 'vaults',
      dataSource: 'c390cc11-6939-47ea-922f-9eaf6bf3697f',
      content: 'blocks', trash: true,
      columns: {
        ...PAGE,
        vault: 'Vault', status: 'Status', goal: 'Goal', currency: 'Currency',
        starting_amount: 'Starting Amount', target_amount: 'Target Amount', current_balance: 'Current Balance', current_tier: 'Current Tier',
        core_charge: 'Core Charge', original_core_charge: 'Original Core Charge', evolution_charge: 'Evolution Charge',
        core_month: 'Core Month', core_paid_this_month: 'Core Paid This Month',
        overcharge_this_month: 'Overcharge This Month', lifetime_overcharge: 'Lifetime Overcharge',
        defense_streak: 'Defense Streak', best_streak: 'Best Streak', perfect_defenses: 'Perfect Defenses',
        week_breaches: 'Week Breaches', breach_week: 'Breach Week', last_breach_at: 'Last Breach At',
        last_evaluated_week: 'Last Evaluated Week', major_evolution_count: 'Major Evolution Count',
        weeks_per_evolution: 'Weeks Per Evolution', expected_campaign_weeks: 'Expected Campaign Weeks',
        baseline_completion: 'Baseline Completion', baseline_history: 'Baseline History',
        goal_started_at: 'Goal Started At', opened_at: 'Opened At'
      },
      types: {
        Vault: 'title', Status: 'select', ...RT('Goal', 'Currency', 'Core Month', 'Breach Week', 'Baseline History'),
        'Last Breach At': 'date', 'Last Evaluated Week': 'date', 'Baseline Completion': 'date', 'Goal Started At': 'date', 'Opened At': 'date'
      },
      // Notion's own created and edited times, kept as the row's.
      ignore: ['Created At', 'Updated At']
    },
    {
      table: 'vault_events',
      dataSource: '80c81e68-bf65-40ec-9e44-f3081c554709',
      content: 'blocks', trash: true,
      columns: { ...PAGE, event: 'Event', vault: 'Vault', type: 'Type', amount: 'Amount', reason: 'Reason', metadata: 'Metadata', month: 'Month', occurred_at: 'Occurred At' },
      types: { Event: 'title', Vault: 'relation', Type: 'select', ...RT('Reason', 'Metadata', 'Month'), 'Occurred At': 'date' },
      ignore: []
    },
    {
      table: 'vault_weeks',
      dataSource: '6610f72b-a296-468b-9170-d1099552cf2b',
      content: 'blocks', trash: true,
      columns: {
        ...PAGE, week: 'Week', vault: 'Vault', week_start: 'Week Start', week_end: 'Week End', tier_before: 'Tier Before', tier_after: 'Tier After',
        charge_before: 'Charge Before', charge_after: 'Charge After', breach_count: 'Breach Count', breached: 'Breached',
        perfect_defense: 'Perfect Defense', shield_integrity: 'Shield Integrity', loot: 'Loot'
      },
      types: { Week: 'title', Vault: 'relation', 'Week Start': 'date', 'Week End': 'date', Breached: 'checkbox', 'Perfect Defense': 'checkbox', Loot: 'rich_text' },
      ignore: []
    },
    {
      table: 'vault_forms',
      dataSource: 'a09891a3-1d76-4d86-a024-65ae31e8e0dd',
      content: 'blocks', trash: true,
      columns: {
        ...PAGE, form: 'Form', tier: 'Tier', rarity: 'Rarity', aura: 'Aura', lore: 'Lore', scene_prompt: 'Scene Prompt',
        image_url: 'Image URL', video_public_id: 'Video Public ID', video_version: 'Video Version', regenerate: 'Regenerate'
      },
      types: { Form: 'title', Rarity: 'select', ...RT('Aura', 'Lore', 'Scene Prompt', 'Video Public ID'), 'Image URL': 'url', Regenerate: 'checkbox' },
      ignore: []
    }
  ]
};

const kid = name => ({
  [`${name.toLowerCase()}_earned_points`]: `${name} Earned Points`, [`${name.toLowerCase()}_missed_points`]: `${name} Missed Points`,
  [`${name.toLowerCase()}_total_points`]: `${name} Total Points`, [`${name.toLowerCase()}_claimed_rewards`]: `${name} Claimed Rewards`,
  [`${name.toLowerCase()}_extra_chores`]: `${name} Extra Chores`, [`${name.toLowerCase()}_screen_today`]: `${name} | Screen Time Today?`,
  [`${name.toLowerCase()}_screen_tomorrow`]: `${name} | Screen Time Tomorrow?`
});
const kidTypes = name => ({ ...RT(`${name} Claimed Rewards`, `${name} Extra Chores`), [`${name} | Screen Time Today?`]: 'select', [`${name} | Screen Time Tomorrow?`]: 'select' });
AREAS.family = {
  tables: [
    {
      table: 'family_days',
      dataSource: '256097f3-9ebc-44b8-ad5c-b4f249a18852',
      content: 'blocks', trash: true,
      columns: { ...PAGE, day: 'Day', date: 'Date', ...kid('Michelle'), ...kid('Rassell') },
      types: { Day: 'title', Date: 'date', ...kidTypes('Michelle'), ...kidTypes('Rassell') },
      ignore: []
    },
    {
      table: 'family_tasks',
      dataSource: '0fb653fe-ab7c-4d72-9f50-81cf1ef66f0e',
      content: 'blocks', trash: true,
      columns: {
        ...PAGE, taakje: 'Taakje', person: 'Person', level: 'Level', points: 'Points', target_day: 'Target Day',
        completed: 'Completed', completed_day: 'Completed Day', completed_by: 'Completed By', status: 'Status', processed: 'Processed',
        recurring: 'Recurring', reward: 'Reward', comment: 'comment'
      },
      types: {
        Taakje: 'title', Person: 'select', Level: 'select', 'Target Day': 'date', Completed: 'checkbox', 'Completed Day': 'date',
        'Completed By': 'people', Status: 'select', Processed: 'checkbox', Recurring: 'checkbox', Reward: 'checkbox', comment: 'rich_text'
      },
      // A Notion formula no code reads (Reset and Excused are buttons: no data).
      ignore: ['Reward Action']
    },
    {
      table: 'family_rewards',
      dataSource: 'd5de67ff-c58f-4e8e-8d9d-2d76f08db702',
      content: 'blocks', trash: true,
      columns: { ...PAGE, beloning: 'Beloning', key: 'Key', emoji: 'Emoji', kosten: 'Kosten', volgorde: 'Volgorde', actief: 'Actief' },
      types: { Beloning: 'title', ...RT('Key', 'Emoji'), Actief: 'checkbox' },
      ignore: []
    },
    {
      table: 'family_chores',
      dataSource: '2ce448ad-03b7-48fb-aec4-d32481b39cfc',
      content: 'blocks', trash: true,
      columns: { ...PAGE, taakje: 'Taakje', person: 'Person', level: 'Level', dagen: 'Dagen', actief: 'Actief' },
      types: { Taakje: 'title', Person: 'select', Level: 'select', Dagen: 'multi_select', Actief: 'checkbox' },
      ignore: []
    },
    {
      table: 'family_treasures',
      dataSource: '266d3adb-91f2-4193-acb3-6a548f03917e',
      content: 'blocks', trash: true,
      columns: { ...PAGE, beloning: 'Beloning', emoji: 'Emoji', volgorde: 'Volgorde', actief: 'Actief', laatst_gebruikt: 'Laatst gebruikt' },
      types: { Beloning: 'title', Emoji: 'rich_text', Actief: 'checkbox', 'Laatst gebruikt': 'date' },
      ignore: []
    },
    {
      table: 'family_bosses',
      dataSource: 'cc224298-e906-4fbd-a282-f68a4b3f9b2d',
      content: 'blocks', trash: true,
      columns: {
        ...PAGE, baas: 'Baas', wereld: 'Wereld', thema: 'Thema', baas_uiterlijk: 'Baas uiterlijk', beloning: 'Beloning',
        max_hp: 'Max HP', laatste_hp: 'Laatste HP', schade_per_punt: 'Schade per punt',
        week_start: 'Week Start', verslagen_op: 'Verslagen op', kist_geopend_op: 'Kist geopend op'
      },
      types: {
        Baas: 'title', Wereld: 'select', ...RT('Thema', 'Baas uiterlijk', 'Beloning'),
        'Week Start': 'date', 'Verslagen op': 'date', 'Kist geopend op': 'date'
      },
      ignore: []
    }
  ]
};

// Every copied table by name, with its area.
export const TABLES = Object.fromEntries(Object.entries(AREAS).flatMap(([area, a]) => a.tables.map(t => [t.table, { ...t, area }])));
