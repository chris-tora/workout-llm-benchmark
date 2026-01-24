/**
 * Comprehensive Test Scenarios for LLM Workout Generation Benchmark
 *
 * Tests all workout splits with appropriate day types using full gym equipment.
 * Covers all training styles and experience levels.
 *
 * Usage:
 *   import { TEST_SCENARIOS, FULL_GYM_EQUIPMENT } from './benchmark-scenarios.mjs';
 */

// ============================================================================
// FULL GYM EQUIPMENT LIST
// ============================================================================
export const FULL_GYM_EQUIPMENT = [
  'dumbbells',
  'barbell',
  'kettlebells',
  'ez bar',
  'cable machine',
  'lat pulldown',
  'leg press',
  'leg curl machine',
  'leg extension machine',
  'shoulder press machine',
  'smith machine',
  'flat bench',
  'incline bench',
  'squat rack',
  'pull-up bar',
  'dip station',
];

// ============================================================================
// LIMITED EQUIPMENT PRESETS
// User-friendly equipment names for realistic limited equipment scenarios
// ============================================================================
export const EQUIPMENT_PRESETS = {
  HOME_GYM: {
    name: 'Home Gym',
    description: 'Typical home gym setup with free weights and basic equipment',
    equipment: ['Dumbbells', 'Barbell', 'Kettlebells', 'Resistance Bands', 'Squat Rack', 'Pull-up Bar', 'Flat Bench'],
  },
  HOTEL_GYM: {
    name: 'Hotel Gym',
    description: 'Basic hotel fitness center with limited equipment',
    equipment: ['Dumbbells', 'Cable Machine', 'Treadmill', 'Flat Bench'],
  },
  MINIMAL_HOME: {
    name: 'Minimal Home',
    description: 'Very basic home setup with just essentials',
    equipment: ['Dumbbells', 'Resistance Bands', 'Pull-up Bar'],
  },
  BARBELL_ONLY: {
    name: 'Barbell Only',
    description: 'Powerlifting-focused setup with barbell essentials',
    equipment: ['Barbell', 'Squat Rack', 'Flat Bench'],
  },
  // NOTE: BODYWEIGHT_ONLY removed - not applicable for gym-focused app
};

// ============================================================================
// TRAINING STYLES (aligned with LLM guidance spec)
// ============================================================================
export const TRAINING_STYLES = [
  'BODYBUILD',
  'STRENGTH',
  'HIT',
  'ENDURANCE',
  // NOTE: power_building is a BLEND of STRENGTH + BODYBUILD, not standalone
];

// ============================================================================
// EXPECTED PARAMETERS BY TRAINING STYLE (from LLM guidance spec)
// ============================================================================
export const STYLE_EXPECTED_PARAMS = {
  BODYBUILD: {
    sets: [3, 4],
    reps: [8, 12],
    rest: [60, 90],
    techniques: ['straight_sets', 'supersets_same_muscle'],
    supersetExpected: false,
    notes: 'Moderate volume, pump-focused, mix of compound and isolation',
  },
  STRENGTH: {
    sets: [4, 5],
    reps: [4, 6],
    rest: [120, 240],
    techniques: ['straight_sets'],
    supersetExpected: false,
    notes: 'Heavy compounds prioritized, low rep, longer rest',
  },
  HIT: {
    sets: [1, 2],
    reps: [6, 10],
    rest: [120, 180],
    techniques: ['slow_negatives', 'rest_pause', 'forced_reps', 'to_failure'],
    supersetExpected: false,
    machinePreferred: true,
    notes: 'Mentzer/Yates style - 1-2 sets to absolute failure with slow negatives',
  },
  ENDURANCE: {
    sets: [2, 3],
    reps: [15, 20],
    rest: [30, 45],
    techniques: ['supersets', 'tri_sets', 'circuits', 'drop_sets'],
    supersetExpected: true,
    circuitStructure: true,
    notes: 'Circuit/tri-set structure required, minimal rest between exercises',
  },
};

// ============================================================================
// DURATIONS (in minutes) - Applied to all base scenarios
// ============================================================================
export const DURATIONS = [30, 60, 90];

// ============================================================================
// WORKOUT SPLIT CONFIGURATIONS
// ============================================================================
export const WORKOUT_SPLITS = {
  full_body: {
    name: 'Full Body',
    dayTypes: [null],
    bodyPartsPerDay: {
      null: ['chest', 'back', 'shoulders', 'upper legs'],
    },
    targetMusclesPerDay: {
      null: ['pectorals', 'lats', 'delts', 'quads', 'hamstrings', 'glutes'],
    },
  },

  upper_lower: {
    name: 'Upper/Lower',
    dayTypes: ['upper', 'lower'],
    bodyPartsPerDay: {
      upper: ['chest', 'back', 'shoulders', 'upper arms'],
      lower: ['upper legs', 'lower legs', 'waist'],
    },
    targetMusclesPerDay: {
      upper: ['pectorals', 'lats', 'delts', 'traps', 'biceps', 'triceps'],
      lower: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
    },
  },

  ppl: {
    name: 'Push/Pull/Legs',
    dayTypes: ['push', 'pull', 'legs'],
    bodyPartsPerDay: {
      push: ['chest', 'shoulders', 'upper arms'],
      pull: ['back', 'upper arms'],
      legs: ['upper legs', 'lower legs'],
    },
    targetMusclesPerDay: {
      push: ['pectorals', 'delts', 'triceps'],
      pull: ['lats', 'traps', 'upper back', 'biceps'],
      legs: ['quads', 'hamstrings', 'glutes', 'calves'],
    },
  },

  push_pull: {
    name: 'Push/Pull',
    dayTypes: ['push', 'pull'],
    bodyPartsPerDay: {
      push: ['chest', 'shoulders', 'upper arms', 'upper legs'],
      pull: ['back', 'upper arms', 'upper legs'],
    },
    targetMusclesPerDay: {
      push: ['pectorals', 'delts', 'triceps', 'quads'],
      pull: ['lats', 'traps', 'biceps', 'hamstrings', 'glutes'],
    },
  },

  arnold: {
    name: 'Arnold Split',
    dayTypes: ['chest_back', 'shoulders_arms', 'legs'],
    bodyPartsPerDay: {
      chest_back: ['chest', 'back'],
      shoulders_arms: ['shoulders', 'upper arms'],
      legs: ['upper legs', 'lower legs'],
    },
    targetMusclesPerDay: {
      chest_back: ['pectorals', 'lats', 'upper back'],
      shoulders_arms: ['delts', 'biceps', 'triceps'],
      legs: ['quads', 'hamstrings', 'glutes', 'calves'],
    },
  },

  bro_split: {
    name: 'Bro Split',
    dayTypes: ['chest', 'back', 'shoulders', 'arms', 'legs'],
    bodyPartsPerDay: {
      chest: ['chest'],
      back: ['back'],
      shoulders: ['shoulders'],
      arms: ['upper arms', 'lower arms'],
      legs: ['upper legs', 'lower legs'],
    },
    targetMusclesPerDay: {
      chest: ['pectorals'],
      back: ['lats', 'upper back', 'traps'],
      shoulders: ['delts'],
      arms: ['biceps', 'triceps', 'forearms'],
      legs: ['quads', 'hamstrings', 'glutes', 'calves'],
    },
  },
};

// ============================================================================
// GOAL MAPPING BY TRAINING STYLE (aligned with LLM guidance spec)
// ============================================================================
const GOAL_BY_STYLE = {
  BODYBUILD: 'build_muscle',
  STRENGTH: 'build_strength',
  HIT: 'build_muscle', // HIT builds muscle through intensity
  ENDURANCE: 'get_lean',
};

// ============================================================================
// COMPREHENSIVE TEST SCENARIOS (20 scenarios)
// Each scenario includes expectedParams from LLM guidance spec for validation
// ============================================================================
export const TEST_SCENARIOS = [
  // =========================================================================
  // FULL BODY SPLIT
  // =========================================================================
  {
    name: 'Full Body - Classic Bodybuilding',
    request: {
      split: 'full_body',
      dayType: null,
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'BODYBUILD',
      bodyParts: ['chest', 'back', 'shoulders', 'upper legs'],
      targetMuscles: ['pectorals', 'lats', 'delts', 'quads', 'hamstrings', 'glutes'],
      duration: 45,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    expectedParams: {
      sets: [3, 4],
      reps: [8, 12],
      rest: [60, 90],
      techniques: ['straight_sets', 'supersets_same_muscle'],
      supersetExpected: false,
    },
  },
  {
    name: 'Full Body - High Intensity HIT',
    request: {
      split: 'full_body',
      dayType: null,
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'HIT',
      bodyParts: ['chest', 'back', 'shoulders', 'upper legs'],
      targetMuscles: ['pectorals', 'lats', 'delts', 'quads', 'hamstrings', 'glutes'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    expectedParams: {
      sets: [1, 2],
      reps: [6, 10],
      rest: [120, 180],
      techniques: ['slow_negatives', 'rest_pause', 'forced_reps', 'to_failure'],
      supersetExpected: false,
      machinePreferred: true,
    },
  },
  // =========================================================================
  // UPPER/LOWER SPLIT
  // =========================================================================
  {
    name: 'Upper/Lower - Upper Day - Strength Focused',
    request: {
      split: 'upper_lower',
      dayType: 'upper',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'STRENGTH',
      bodyParts: ['chest', 'back', 'shoulders', 'upper arms'],
      targetMuscles: ['pectorals', 'lats', 'delts', 'traps', 'biceps', 'triceps'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_strength',
    },
    expectedParams: {
      sets: [4, 5],
      reps: [4, 6],
      rest: [120, 240],
      techniques: ['straight_sets'],
      supersetExpected: false,
    },
  },
  {
    name: 'Upper/Lower - Lower Day - Classic Bodybuilding',
    request: {
      split: 'upper_lower',
      dayType: 'lower',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'BODYBUILD',
      bodyParts: ['upper legs', 'lower legs', 'waist'],
      targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
      duration: 75,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    expectedParams: {
      sets: [3, 4],
      reps: [8, 12],
      rest: [60, 90],
      techniques: ['straight_sets', 'supersets_same_muscle'],
      supersetExpected: false,
    },
  },
  // =========================================================================
  // PPL (PUSH/PULL/LEGS) SPLIT
  // =========================================================================
  {
    name: 'PPL - Push Day - Classic Bodybuilding',
    request: {
      split: 'ppl',
      dayType: 'push',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'BODYBUILD',
      bodyParts: ['chest', 'shoulders', 'upper arms'],
      targetMuscles: ['pectorals', 'delts', 'triceps'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    expectedParams: {
      sets: [3, 4],
      reps: [8, 12],
      rest: [60, 90],
      techniques: ['straight_sets', 'supersets_same_muscle'],
      supersetExpected: false,
    },
  },
  {
    name: 'PPL - Pull Day - Strength Focused',
    request: {
      split: 'ppl',
      dayType: 'pull',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'STRENGTH',
      bodyParts: ['back', 'upper arms'],
      targetMuscles: ['lats', 'traps', 'upper back', 'biceps'],
      duration: 75,
      experienceLevel: 5,
      goal: 'build_strength',
    },
    expectedParams: {
      sets: [4, 5],
      reps: [4, 6],
      rest: [120, 240],
      techniques: ['straight_sets'],
      supersetExpected: false,
    },
  },
  {
    name: 'PPL - Legs Day - Muscular Endurance',
    request: {
      split: 'ppl',
      dayType: 'legs',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'ENDURANCE',
      bodyParts: ['upper legs', 'lower legs'],
      targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
      duration: 45,
      experienceLevel: 5,
      goal: 'get_lean',
    },
    expectedParams: {
      sets: [2, 3],
      reps: [15, 20],
      rest: [30, 45],
      techniques: ['supersets', 'tri_sets', 'circuits', 'drop_sets'],
      supersetExpected: true,
      circuitStructure: true,
    },
  },
  // =========================================================================
  // PUSH/PULL SPLIT
  // =========================================================================
  {
    name: 'Push/Pull - Push Day - Strength Focused',
    request: {
      split: 'push_pull',
      dayType: 'push',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'STRENGTH',
      bodyParts: ['chest', 'shoulders', 'upper arms', 'upper legs'],
      targetMuscles: ['pectorals', 'delts', 'triceps', 'quads'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_strength',
    },
    expectedParams: {
      sets: [4, 5],
      reps: [4, 6],
      rest: [120, 240],
      techniques: ['straight_sets'],
      supersetExpected: false,
    },
  },
  {
    name: 'Push/Pull - Pull Day - High Intensity HIT',
    request: {
      split: 'push_pull',
      dayType: 'pull',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'HIT',
      bodyParts: ['back', 'upper arms', 'upper legs'],
      targetMuscles: ['lats', 'traps', 'biceps', 'hamstrings', 'glutes'],
      duration: 75,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    expectedParams: {
      sets: [1, 2],
      reps: [6, 10],
      rest: [120, 180],
      techniques: ['slow_negatives', 'rest_pause', 'forced_reps', 'to_failure'],
      supersetExpected: false,
      machinePreferred: true,
    },
  },

  // =========================================================================
  // ARNOLD SPLIT
  // =========================================================================
  {
    name: 'Arnold Split - Chest & Back Day - Classic Bodybuilding',
    request: {
      split: 'arnold',
      dayType: 'chest_back',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'BODYBUILD',
      bodyParts: ['chest', 'back'],
      targetMuscles: ['pectorals', 'lats', 'upper back', 'traps'],
      duration: 75,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    expectedParams: {
      sets: [3, 4],
      reps: [8, 12],
      rest: [60, 90],
      techniques: ['straight_sets', 'supersets_same_muscle'],
      supersetExpected: false,
    },
  },
  {
    name: 'Arnold Split - Shoulders & Arms Day - Strength Focused',
    request: {
      split: 'arnold',
      dayType: 'shoulders_arms',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'STRENGTH',
      bodyParts: ['shoulders', 'upper arms', 'lower arms'],
      targetMuscles: ['delts', 'biceps', 'triceps', 'forearms'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_strength',
    },
    expectedParams: {
      sets: [4, 5],
      reps: [4, 6],
      rest: [120, 240],
      techniques: ['straight_sets'],
      supersetExpected: false,
    },
  },
  {
    name: 'Arnold Split - Legs Day - Muscular Endurance',
    request: {
      split: 'arnold',
      dayType: 'legs',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'ENDURANCE',
      bodyParts: ['upper legs', 'lower legs', 'waist'],
      targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
      duration: 75,
      experienceLevel: 5,
      goal: 'get_lean',
    },
    expectedParams: {
      sets: [2, 3],
      reps: [15, 20],
      rest: [30, 45],
      techniques: ['supersets', 'tri_sets', 'circuits', 'drop_sets'],
      supersetExpected: true,
      circuitStructure: true,
    },
  },

  // =========================================================================
  // BRO SPLIT (5-day)
  // =========================================================================
  {
    name: 'Bro Split - Chest Day - Classic Bodybuilding',
    request: {
      split: 'bro_split',
      dayType: 'chest',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'BODYBUILD',
      bodyParts: ['chest'],
      targetMuscles: ['pectorals'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    expectedParams: {
      sets: [3, 4],
      reps: [8, 12],
      rest: [60, 90],
      techniques: ['straight_sets', 'supersets_same_muscle'],
      supersetExpected: false,
    },
  },
  {
    name: 'Bro Split - Back Day - Strength Focused',
    request: {
      split: 'bro_split',
      dayType: 'back',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'STRENGTH',
      bodyParts: ['back'],
      targetMuscles: ['lats', 'upper back', 'traps'],
      duration: 75,
      experienceLevel: 5,
      goal: 'build_strength',
    },
    expectedParams: {
      sets: [4, 5],
      reps: [4, 6],
      rest: [120, 240],
      techniques: ['straight_sets'],
      supersetExpected: false,
    },
  },
  {
    name: 'Bro Split - Legs Day - Classic Bodybuilding',
    request: {
      split: 'bro_split',
      dayType: 'legs',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle: 'BODYBUILD',
      bodyParts: ['upper legs', 'lower legs'],
      targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
      duration: 75,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    expectedParams: {
      sets: [3, 4],
      reps: [8, 12],
      rest: [60, 90],
      techniques: ['straight_sets', 'supersets_same_muscle'],
      supersetExpected: false,
    },
  },
];

// ============================================================================
// BLEND TEST SCENARIOS (2 Training Types Combined)
// ============================================================================
// When users select 2 training types, the AI blends both styles within each
// workout session. These scenarios test that blending logic.
// ============================================================================
export const BLEND_TEST_SCENARIOS = [
  // =========================================================================
  // ARNOLD SPLIT BODYBUILDING BLEND SCENARIOS (Priority test cases)
  // =========================================================================

  // 1. Arnold Chest & Back + Bodybuilding + Endurance
  {
    name: 'BLEND: Bodybuilding + Endurance - Chest & Back Day (Arnold Split)',
    request: {
      split: 'arnold',
      dayType: 'chest_back',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyles: ['BODYBUILD', 'ENDURANCE'],
      bodyParts: ['chest', 'back'],
      targetMuscles: ['pectorals', 'lats', 'upper back', 'traps'],
      duration: 75,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    blendExpectation: {
      compoundStyle: 'BODYBUILD',
      isolationStyle: 'ENDURANCE',
      compoundParams: {
        repRange: [8, 12],
        restSeconds: [60, 90],
        sets: [3, 4],
      },
      isolationParams: {
        repRange: [15, 20],
        restSeconds: [30, 45],
        sets: [2, 3],
      },
    },
    expectedTechniques: {
      compounds: ['straight_sets', 'supersets_same_muscle'],
      isolations: ['supersets', 'tri_sets', 'circuits', 'drop_sets'],
    },
  },

  // 2. Arnold Shoulders & Arms + Bodybuilding + Endurance
  {
    name: 'BLEND: Bodybuilding + Endurance - Shoulders & Arms Day (Arnold Split)',
    request: {
      split: 'arnold',
      dayType: 'shoulders_arms',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyles: ['BODYBUILD', 'ENDURANCE'],
      bodyParts: ['shoulders', 'upper arms', 'lower arms'],
      targetMuscles: ['delts', 'biceps', 'triceps', 'forearms'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    blendExpectation: {
      compoundStyle: 'BODYBUILD',
      isolationStyle: 'ENDURANCE',
      compoundParams: {
        repRange: [8, 12],
        restSeconds: [60, 90],
        sets: [3, 4],
      },
      isolationParams: {
        repRange: [15, 20],
        restSeconds: [30, 45],
        sets: [2, 3],
      },
    },
    expectedTechniques: {
      compounds: ['straight_sets', 'supersets_same_muscle'],
      isolations: ['supersets', 'tri_sets', 'circuits', 'drop_sets'],
    },
  },

  // 3. Arnold Chest & Back + Bodybuilding + HIT
  {
    name: 'BLEND: Bodybuilding + HIT - Chest & Back Day (Arnold Split)',
    request: {
      split: 'arnold',
      dayType: 'chest_back',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyles: ['BODYBUILD', 'HIT'],
      bodyParts: ['chest', 'back'],
      targetMuscles: ['pectorals', 'lats', 'upper back', 'traps'],
      duration: 75,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    blendExpectation: {
      compoundStyle: 'BODYBUILD',
      isolationStyle: 'HIT',
      compoundParams: {
        repRange: [8, 12],
        restSeconds: [60, 90],
        sets: [3, 4],
      },
      isolationParams: {
        repRange: [6, 10],
        restSeconds: [120, 180],
        sets: [1, 2],
      },
    },
    expectedTechniques: {
      compounds: ['straight_sets', 'supersets_same_muscle'],
      isolations: ['slow_negatives', 'rest_pause', 'forced_reps', 'to_failure'],
    },
  },

  // 4. Arnold Shoulders & Arms + Bodybuilding + HIT
  {
    name: 'BLEND: Bodybuilding + HIT - Shoulders & Arms Day (Arnold Split)',
    request: {
      split: 'arnold',
      dayType: 'shoulders_arms',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyles: ['BODYBUILD', 'HIT'],
      bodyParts: ['shoulders', 'upper arms', 'lower arms'],
      targetMuscles: ['delts', 'biceps', 'triceps', 'forearms'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    blendExpectation: {
      compoundStyle: 'BODYBUILD',
      isolationStyle: 'HIT',
      compoundParams: {
        repRange: [8, 12],
        restSeconds: [60, 90],
        sets: [3, 4],
      },
      isolationParams: {
        repRange: [6, 10],
        restSeconds: [120, 180],
        sets: [1, 2],
      },
    },
    expectedTechniques: {
      compounds: ['straight_sets', 'supersets_same_muscle'],
      isolations: ['slow_negatives', 'rest_pause', 'forced_reps', 'to_failure'],
    },
  },

  // =========================================================================
  // OTHER BLEND SCENARIOS
  // =========================================================================

  // 1. Strength + Bodybuilding (Powerbuilding)
  // First half: Strength params (4-6 reps, 180s rest) on compounds
  // Second half: Bodybuilding params (8-12 reps, 60s rest) on isolations
  {
    name: 'BLEND: Strength + Bodybuilding (Powerbuilding) - Upper Day',
    request: {
      split: 'upper_lower',
      dayType: 'upper',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyles: ['STRENGTH', 'BODYBUILD'],
      bodyParts: ['chest', 'back', 'shoulders', 'upper arms'],
      targetMuscles: ['pectorals', 'lats', 'delts', 'traps', 'biceps', 'triceps'],
      duration: 75,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    blendExpectation: {
      compoundStyle: 'STRENGTH',
      isolationStyle: 'BODYBUILD',
      compoundParams: {
        repRange: [4, 6],
        restSeconds: [120, 240],
        sets: [4, 5],
      },
      isolationParams: {
        repRange: [8, 12],
        restSeconds: [60, 90],
        sets: [3, 4],
      },
    },
    expectedTechniques: {
      compounds: ['straight_sets'],
      isolations: ['straight_sets', 'supersets_same_muscle'],
    },
  },
  {
    name: 'BLEND: Strength + Bodybuilding (Powerbuilding) - Legs Day',
    request: {
      split: 'ppl',
      dayType: 'legs',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyles: ['STRENGTH', 'BODYBUILD'],
      bodyParts: ['upper legs', 'lower legs'],
      targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
      duration: 75,
      experienceLevel: 5,
      goal: 'build_strength',
    },
    blendExpectation: {
      compoundStyle: 'STRENGTH',
      isolationStyle: 'BODYBUILD',
      compoundParams: {
        repRange: [4, 6],
        restSeconds: [120, 240],
        sets: [4, 5],
      },
      isolationParams: {
        repRange: [8, 12],
        restSeconds: [60, 90],
        sets: [3, 4],
      },
    },
    expectedTechniques: {
      compounds: ['straight_sets'],
      isolations: ['straight_sets', 'supersets_same_muscle'],
    },
  },

  // 2. Bodybuilding + Muscular Endurance
  // Main lifts: Bodybuilding (8-12 reps)
  // Finishers: Circuits/supersets (15-20 reps, 30s rest)
  {
    name: 'BLEND: Bodybuilding + Muscular Endurance - Push Day',
    request: {
      split: 'ppl',
      dayType: 'push',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyles: ['BODYBUILD', 'ENDURANCE'],
      bodyParts: ['chest', 'shoulders', 'upper arms'],
      targetMuscles: ['pectorals', 'delts', 'triceps'],
      duration: 60,
      experienceLevel: 5,
      goal: 'get_lean',
    },
    blendExpectation: {
      compoundStyle: 'BODYBUILD',
      isolationStyle: 'ENDURANCE',
      compoundParams: {
        repRange: [8, 12],
        restSeconds: [60, 90],
        sets: [3, 4],
      },
      isolationParams: {
        repRange: [15, 20],
        restSeconds: [30, 45],
        sets: [2, 3],
      },
    },
    expectedTechniques: {
      compounds: ['straight_sets', 'supersets_same_muscle'],
      isolations: ['supersets', 'tri_sets', 'circuits', 'drop_sets'],
    },
  },
  {
    name: 'BLEND: Bodybuilding + Muscular Endurance - Full Body',
    request: {
      split: 'full_body',
      dayType: null,
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyles: ['BODYBUILD', 'ENDURANCE'],
      bodyParts: ['chest', 'back', 'shoulders', 'upper legs'],
      targetMuscles: ['pectorals', 'lats', 'delts', 'quads', 'hamstrings'],
      duration: 60,
      experienceLevel: 5,
      goal: 'get_lean',
    },
    blendExpectation: {
      compoundStyle: 'BODYBUILD',
      isolationStyle: 'ENDURANCE',
      compoundParams: {
        repRange: [8, 12],
        restSeconds: [60, 90],
        sets: [3, 4],
      },
      isolationParams: {
        repRange: [15, 20],
        restSeconds: [30, 45],
        sets: [2, 3],
      },
    },
    expectedTechniques: {
      compounds: ['straight_sets', 'supersets_same_muscle'],
      isolations: ['supersets', 'tri_sets', 'circuits', 'drop_sets'],
    },
  },

  // 3. Strength + HIT
  // Compounds: Strength (4-6 reps, straight sets)
  // Accessories: HIT (1-2 sets to failure)
  {
    name: 'BLEND: Strength + HIT - Pull Day',
    request: {
      split: 'ppl',
      dayType: 'pull',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyles: ['STRENGTH', 'HIT'],
      bodyParts: ['back', 'upper arms'],
      targetMuscles: ['lats', 'upper back', 'traps', 'biceps'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_strength',
    },
    blendExpectation: {
      compoundStyle: 'STRENGTH',
      isolationStyle: 'HIT',
      compoundParams: {
        repRange: [4, 6],
        restSeconds: [120, 240],
        sets: [4, 5],
      },
      isolationParams: {
        repRange: [6, 10],
        restSeconds: [120, 180],
        sets: [1, 2],
      },
    },
    expectedTechniques: {
      compounds: ['straight_sets'],
      isolations: ['slow_negatives', 'rest_pause', 'forced_reps', 'to_failure'],
    },
  },
  {
    name: 'BLEND: Strength + HIT - Chest & Back Day (Arnold)',
    request: {
      split: 'arnold',
      dayType: 'chest_back',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyles: ['STRENGTH', 'HIT'],
      bodyParts: ['chest', 'back'],
      targetMuscles: ['pectorals', 'lats', 'upper back', 'traps'],
      duration: 75,
      experienceLevel: 5,
      goal: 'build_strength',
    },
    blendExpectation: {
      compoundStyle: 'STRENGTH',
      isolationStyle: 'HIT',
      compoundParams: {
        repRange: [4, 6],
        restSeconds: [120, 240],
        sets: [4, 5],
      },
      isolationParams: {
        repRange: [6, 10],
        restSeconds: [120, 180],
        sets: [1, 2],
      },
    },
    expectedTechniques: {
      compounds: ['straight_sets'],
      isolations: ['slow_negatives', 'rest_pause', 'forced_reps', 'to_failure'],
    },
  },

  // 4. Bodybuilding + HIT
  // Moderate pump work
  // Plus failure sets with slow negatives
  {
    name: 'BLEND: Bodybuilding + HIT - Back Day (Bro Split)',
    request: {
      split: 'bro_split',
      dayType: 'back',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyles: ['BODYBUILD', 'HIT'],
      bodyParts: ['back', 'upper arms'],
      targetMuscles: ['lats', 'upper back', 'traps', 'biceps'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    blendExpectation: {
      compoundStyle: 'BODYBUILD',
      isolationStyle: 'HIT',
      compoundParams: {
        repRange: [8, 12],
        restSeconds: [60, 90],
        sets: [3, 4],
      },
      isolationParams: {
        repRange: [6, 10],
        restSeconds: [120, 180],
        sets: [1, 2],
      },
    },
    expectedTechniques: {
      compounds: ['straight_sets', 'supersets_same_muscle'],
      isolations: ['slow_negatives', 'rest_pause', 'forced_reps', 'to_failure'],
    },
  },
  {
    name: 'BLEND: Bodybuilding + HIT - Arms Day (Bro Split)',
    request: {
      split: 'bro_split',
      dayType: 'arms',
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyles: ['BODYBUILD', 'HIT'],
      bodyParts: ['upper arms', 'lower arms'],
      targetMuscles: ['biceps', 'triceps', 'forearms'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    blendExpectation: {
      compoundStyle: 'BODYBUILD',
      isolationStyle: 'HIT',
      compoundParams: {
        repRange: [8, 12],
        restSeconds: [60, 90],
        sets: [3, 4],
      },
      isolationParams: {
        repRange: [6, 10],
        restSeconds: [120, 180],
        sets: [1, 2],
      },
    },
    expectedTechniques: {
      compounds: ['straight_sets', 'supersets_same_muscle'],
      isolations: ['slow_negatives', 'rest_pause', 'forced_reps', 'to_failure'],
    },
  },
];

// ============================================================================
// LIMITED EQUIPMENT SCENARIOS
// Tests workout generation with realistic limited equipment setups
// Each preset has at least 2 scenarios with different splits/styles
// ============================================================================
// NOTE: LIMITED_EQUIPMENT_SCENARIOS temporarily disabled - uncomment to re-enable
/*
export const LIMITED_EQUIPMENT_SCENARIOS = [
  // =========================================================================
  // HOME GYM (7 items: Dumbbells, Barbell, Kettlebells, Resistance Bands, Squat Rack, Pull-up Bar, Flat Bench)
  // =========================================================================
  {
    name: 'Home Gym - Full Body - Bodybuilding',
    request: {
      split: 'full_body',
      dayType: null,
      equipment: EQUIPMENT_PRESETS.HOME_GYM.equipment,
      trainingStyle: 'BODYBUILD',
      bodyParts: ['chest', 'back', 'shoulders', 'upper legs'],
      targetMuscles: ['pectorals', 'lats', 'delts', 'quads', 'hamstrings', 'glutes'],
      duration: 45,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    expectedParams: {
      sets: [3, 4],
      reps: [8, 12],
      rest: [60, 90],
      techniques: ['straight_sets', 'supersets_same_muscle'],
      supersetExpected: false,
    },
    equipmentPreset: 'HOME_GYM',
  },
  {
    name: 'Home Gym - Upper/Lower - Upper Day - Strength',
    request: {
      split: 'upper_lower',
      dayType: 'upper',
      equipment: EQUIPMENT_PRESETS.HOME_GYM.equipment,
      trainingStyle: 'STRENGTH',
      bodyParts: ['chest', 'back', 'shoulders', 'upper arms'],
      targetMuscles: ['pectorals', 'lats', 'delts', 'traps', 'biceps', 'triceps'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_strength',
    },
    expectedParams: {
      sets: [4, 5],
      reps: [4, 6],
      rest: [120, 240],
      techniques: ['straight_sets'],
      supersetExpected: false,
    },
    equipmentPreset: 'HOME_GYM',
  },
  {
    name: 'Home Gym - PPL - Legs Day - Bodybuilding',
    request: {
      split: 'ppl',
      dayType: 'legs',
      equipment: EQUIPMENT_PRESETS.HOME_GYM.equipment,
      trainingStyle: 'BODYBUILD',
      bodyParts: ['upper legs', 'lower legs'],
      targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
      duration: 75,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    expectedParams: {
      sets: [3, 4],
      reps: [8, 12],
      rest: [60, 90],
      techniques: ['straight_sets', 'supersets_same_muscle'],
      supersetExpected: false,
    },
    equipmentPreset: 'HOME_GYM',
  },

  // =========================================================================
  // HOTEL GYM (4 items: Dumbbells, Cable Machine, Treadmill, Flat Bench)
  // =========================================================================
  {
    name: 'Hotel Gym - Full Body - Endurance',
    request: {
      split: 'full_body',
      dayType: null,
      equipment: EQUIPMENT_PRESETS.HOTEL_GYM.equipment,
      trainingStyle: 'ENDURANCE',
      bodyParts: ['chest', 'back', 'shoulders', 'upper legs'],
      targetMuscles: ['pectorals', 'lats', 'delts', 'quads', 'hamstrings', 'glutes'],
      duration: 45,
      experienceLevel: 5,
      goal: 'get_lean',
    },
    expectedParams: {
      sets: [2, 3],
      reps: [15, 20],
      rest: [30, 45],
      techniques: ['supersets', 'tri_sets', 'circuits', 'drop_sets'],
      supersetExpected: true,
      circuitStructure: true,
    },
    equipmentPreset: 'HOTEL_GYM',
  },
  {
    name: 'Hotel Gym - Upper/Lower - Upper Day - Bodybuilding',
    request: {
      split: 'upper_lower',
      dayType: 'upper',
      equipment: EQUIPMENT_PRESETS.HOTEL_GYM.equipment,
      trainingStyle: 'BODYBUILD',
      bodyParts: ['chest', 'back', 'shoulders', 'upper arms'],
      targetMuscles: ['pectorals', 'lats', 'delts', 'traps', 'biceps', 'triceps'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    expectedParams: {
      sets: [3, 4],
      reps: [8, 12],
      rest: [60, 90],
      techniques: ['straight_sets', 'supersets_same_muscle'],
      supersetExpected: false,
    },
    equipmentPreset: 'HOTEL_GYM',
  },

  // =========================================================================
  // MINIMAL HOME (3 items: Dumbbells, Resistance Bands, Pull-up Bar)
  // =========================================================================
  {
    name: 'Minimal Home - Full Body - Bodybuilding',
    request: {
      split: 'full_body',
      dayType: null,
      equipment: EQUIPMENT_PRESETS.MINIMAL_HOME.equipment,
      trainingStyle: 'BODYBUILD',
      bodyParts: ['chest', 'back', 'shoulders', 'upper legs'],
      targetMuscles: ['pectorals', 'lats', 'delts', 'quads', 'hamstrings', 'glutes'],
      duration: 45,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    expectedParams: {
      sets: [3, 4],
      reps: [8, 12],
      rest: [60, 90],
      techniques: ['straight_sets', 'supersets_same_muscle'],
      supersetExpected: false,
    },
    equipmentPreset: 'MINIMAL_HOME',
  },
  {
    name: 'Minimal Home - Full Body - Endurance',
    request: {
      split: 'full_body',
      dayType: null,
      equipment: EQUIPMENT_PRESETS.MINIMAL_HOME.equipment,
      trainingStyle: 'ENDURANCE',
      bodyParts: ['chest', 'back', 'shoulders', 'upper legs'],
      targetMuscles: ['pectorals', 'lats', 'delts', 'quads', 'hamstrings', 'glutes'],
      duration: 60,
      experienceLevel: 5,
      goal: 'get_lean',
    },
    expectedParams: {
      sets: [2, 3],
      reps: [15, 20],
      rest: [30, 45],
      techniques: ['supersets', 'tri_sets', 'circuits', 'drop_sets'],
      supersetExpected: true,
      circuitStructure: true,
    },
    equipmentPreset: 'MINIMAL_HOME',
  },
  {
    name: 'Minimal Home - PPL - Pull Day - Bodybuilding',
    request: {
      split: 'ppl',
      dayType: 'pull',
      equipment: EQUIPMENT_PRESETS.MINIMAL_HOME.equipment,
      trainingStyle: 'BODYBUILD',
      bodyParts: ['back', 'upper arms'],
      targetMuscles: ['lats', 'traps', 'upper back', 'biceps'],
      duration: 45,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    expectedParams: {
      sets: [3, 4],
      reps: [8, 12],
      rest: [60, 90],
      techniques: ['straight_sets', 'supersets_same_muscle'],
      supersetExpected: false,
    },
    equipmentPreset: 'MINIMAL_HOME',
  },

  // =========================================================================
  // BARBELL ONLY (3 items: Barbell, Squat Rack, Flat Bench)
  // =========================================================================
  {
    name: 'Barbell Only - Full Body - Strength',
    request: {
      split: 'full_body',
      dayType: null,
      equipment: EQUIPMENT_PRESETS.BARBELL_ONLY.equipment,
      trainingStyle: 'STRENGTH',
      bodyParts: ['chest', 'back', 'shoulders', 'upper legs'],
      targetMuscles: ['pectorals', 'lats', 'delts', 'quads', 'hamstrings', 'glutes'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_strength',
    },
    expectedParams: {
      sets: [4, 5],
      reps: [4, 6],
      rest: [120, 240],
      techniques: ['straight_sets'],
      supersetExpected: false,
    },
    equipmentPreset: 'BARBELL_ONLY',
  },
  {
    name: 'Barbell Only - Upper/Lower - Lower Day - Strength',
    request: {
      split: 'upper_lower',
      dayType: 'lower',
      equipment: EQUIPMENT_PRESETS.BARBELL_ONLY.equipment,
      trainingStyle: 'STRENGTH',
      bodyParts: ['upper legs', 'lower legs', 'waist'],
      targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
      duration: 75,
      experienceLevel: 5,
      goal: 'build_strength',
    },
    expectedParams: {
      sets: [4, 5],
      reps: [4, 6],
      rest: [120, 240],
      techniques: ['straight_sets'],
      supersetExpected: false,
    },
    equipmentPreset: 'BARBELL_ONLY',
  },
  {
    name: 'Barbell Only - PPL - Push Day - Bodybuilding',
    request: {
      split: 'ppl',
      dayType: 'push',
      equipment: EQUIPMENT_PRESETS.BARBELL_ONLY.equipment,
      trainingStyle: 'BODYBUILD',
      bodyParts: ['chest', 'shoulders', 'upper arms'],
      targetMuscles: ['pectorals', 'delts', 'triceps'],
      duration: 60,
      experienceLevel: 5,
      goal: 'build_muscle',
    },
    expectedParams: {
      sets: [3, 4],
      reps: [8, 12],
      rest: [60, 90],
      techniques: ['straight_sets', 'supersets_same_muscle'],
      supersetExpected: false,
    },
    equipmentPreset: 'BARBELL_ONLY',
  },
  // NOTE: BODYWEIGHT_ONLY scenarios removed - not applicable for gym-focused app
];
*/

// Provide empty array export so references don't break
export const LIMITED_EQUIPMENT_SCENARIOS = [];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDayType(dayType) {
  return dayType.split('_').map(capitalize).join(' & ');
}

function formatStyle(style) {
  return style.split('_').map(capitalize).join(' ');
}

export function generateScenario(splitKey, dayType, trainingStyle, duration = 60) {
  const split = WORKOUT_SPLITS[splitKey];
  if (!split) throw new Error(`Unknown split: ${splitKey}`);

  const dayTypeKey = dayType || null;
  const bodyParts = split.bodyPartsPerDay[dayTypeKey];
  const targetMuscles = split.targetMusclesPerDay[dayTypeKey];

  if (!bodyParts || !targetMuscles) {
    throw new Error(`Unknown dayType "${dayType}" for split "${splitKey}"`);
  }

  // Get expected parameters for this training style from the spec
  const styleParams = STYLE_EXPECTED_PARAMS[trainingStyle];
  if (!styleParams) {
    throw new Error(`Unknown training style: ${trainingStyle}. Valid styles: ${TRAINING_STYLES.join(', ')}`);
  }

  return {
    name: `${split.name}${dayType ? ` - ${formatDayType(dayType)}` : ''} - ${duration}min - ${formatStyle(trainingStyle)}`,
    request: {
      split: splitKey,
      dayType: dayType || null,
      equipment: FULL_GYM_EQUIPMENT,
      trainingStyle,
      bodyParts,
      targetMuscles,
      duration,
      goal: GOAL_BY_STYLE[trainingStyle],
    },
    expectedParams: {
      sets: styleParams.sets,
      reps: styleParams.reps,
      rest: styleParams.rest,
      techniques: styleParams.techniques,
      supersetExpected: styleParams.supersetExpected,
      ...(styleParams.machinePreferred && { machinePreferred: true }),
      ...(styleParams.circuitStructure && { circuitStructure: true }),
    },
  };
}

/**
 * Generates all scenarios by taking base scenarios and creating 3 versions
 * of each for durations 30, 60, and 90 minutes.
 *
 * @returns {Array} Array of scenarios with duration variations
 */
export function generateAllScenarios() {
  const DURATIONS = [30, 60, 90];
  const allBaseScenarios = [
    ...TEST_SCENARIOS,
    ...BLEND_TEST_SCENARIOS,
    // ...LIMITED_EQUIPMENT_SCENARIOS, // Temporarily disabled
  ];

  return allBaseScenarios.flatMap((scenario) =>
    DURATIONS.map((duration) => ({
      ...scenario,
      name: `${scenario.name} (${duration}min)`,
      request: {
        ...scenario.request,
        duration,
      },
    }))
  );
}

export function getScenarioSummary() {
  const durations = [30, 60, 90]; // Must match generateAllScenarios()
  const baseScenarioCounts = {
    test: TEST_SCENARIOS.length,
    blend: BLEND_TEST_SCENARIOS.length,
    // limited: LIMITED_EQUIPMENT_SCENARIOS.length, // Temporarily disabled
  };
  const totalBaseScenarios = baseScenarioCounts.test + baseScenarioCounts.blend;

  return {
    baseScenarios: baseScenarioCounts,
    durations,
    totalScenarios: totalBaseScenarios * durations.length,
    breakdown: {
      test: baseScenarioCounts.test * durations.length,
      blend: baseScenarioCounts.blend * durations.length,
      // limited: baseScenarioCounts.limited * durations.length, // Temporarily disabled
    },
    // Metadata for reference
    splits: Object.keys(WORKOUT_SPLITS).length,
    trainingStyles: TRAINING_STYLES.length,
    equipmentPresets: Object.keys(EQUIPMENT_PRESETS).length,
  };
}

export default {
  TEST_SCENARIOS,
  BLEND_TEST_SCENARIOS,
  // LIMITED_EQUIPMENT_SCENARIOS, // Temporarily disabled
  FULL_GYM_EQUIPMENT,
  EQUIPMENT_PRESETS,
  TRAINING_STYLES,
  STYLE_EXPECTED_PARAMS,
  DURATIONS,
  WORKOUT_SPLITS,
  generateScenario,
  generateAllScenarios,
  getScenarioSummary,
};
