#!/usr/bin/env node
/**
 * Shared module for LLM Workout Generation Benchmark v2
 *
 * Contains:
 * - MOCK_EXERCISES array
 * - TEST_SCENARIOS array
 * - TRAINING_STYLE_PARAMS object
 * - MODELS array
 * - calculateEnhancedMetrics() function
 * - extractExercises() function
 * - filterExercisesForScenario() function
 * - buildWorkoutPrompt() function
 * - getStyleSpecificInstructions() function
 */

// ============================================================================
// MOCK EXERCISES DATABASE
// ============================================================================

export const MOCK_EXERCISES = [
  // CHEST
  { id: '0025', name: 'dumbbell bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'dumbbell', difficulty: 'intermediate', secondaryMuscles: ['triceps', 'delts'] },
  { id: '0047', name: 'barbell bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'barbell', difficulty: 'intermediate', secondaryMuscles: ['triceps', 'delts'] },
  { id: '0251', name: 'push-up', target: 'pectorals', bodyPart: 'chest', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: ['triceps', 'delts', 'abs'] },
  { id: '1254', name: 'cable crossover', target: 'pectorals', bodyPart: 'chest', equipment: 'cable', difficulty: 'intermediate', secondaryMuscles: ['delts'] },
  { id: '0289', name: 'dumbbell fly', target: 'pectorals', bodyPart: 'chest', equipment: 'dumbbell', difficulty: 'intermediate', secondaryMuscles: [] },
  { id: '0048', name: 'incline barbell bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'barbell', difficulty: 'intermediate', secondaryMuscles: ['triceps', 'delts'] },
  { id: '0026', name: 'incline dumbbell bench press', target: 'pectorals', bodyPart: 'chest', equipment: 'dumbbell', difficulty: 'intermediate', secondaryMuscles: ['triceps', 'delts'] },
  { id: '0290', name: 'incline dumbbell fly', target: 'pectorals', bodyPart: 'chest', equipment: 'dumbbell', difficulty: 'intermediate', secondaryMuscles: [] },
  { id: '1255', name: 'machine chest press', target: 'pectorals', bodyPart: 'chest', equipment: 'leverage machine', difficulty: 'beginner', secondaryMuscles: ['triceps'] },
  { id: '1256', name: 'pec deck fly', target: 'pectorals', bodyPart: 'chest', equipment: 'leverage machine', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0252', name: 'decline push-up', target: 'pectorals', bodyPart: 'chest', equipment: 'body weight', difficulty: 'intermediate', secondaryMuscles: ['triceps', 'delts'] },

  // BACK
  { id: '0027', name: 'barbell bent over row', target: 'lats', bodyPart: 'back', equipment: 'barbell', difficulty: 'intermediate', secondaryMuscles: ['biceps', 'traps', 'rear delts'] },
  { id: '0294', name: 'dumbbell row', target: 'lats', bodyPart: 'back', equipment: 'dumbbell', difficulty: 'beginner', secondaryMuscles: ['biceps', 'traps'] },
  { id: '0651', name: 'pull-up', target: 'lats', bodyPart: 'back', equipment: 'body weight', difficulty: 'intermediate', secondaryMuscles: ['biceps', 'forearms'] },
  { id: '0160', name: 'lat pulldown', target: 'lats', bodyPart: 'back', equipment: 'cable', difficulty: 'beginner', secondaryMuscles: ['biceps'] },
  { id: '0293', name: 'dumbbell pullover', target: 'lats', bodyPart: 'back', equipment: 'dumbbell', difficulty: 'intermediate', secondaryMuscles: ['pectorals', 'triceps'] },
  { id: '0652', name: 'chin-up', target: 'lats', bodyPart: 'back', equipment: 'body weight', difficulty: 'intermediate', secondaryMuscles: ['biceps'] },
  { id: '0161', name: 'seated cable row', target: 'upper back', bodyPart: 'back', equipment: 'cable', difficulty: 'beginner', secondaryMuscles: ['biceps', 'lats'] },
  { id: '0162', name: 'cable face pull', target: 'upper back', bodyPart: 'back', equipment: 'cable', difficulty: 'intermediate', secondaryMuscles: ['rear delts', 'traps'] },
  { id: '0028', name: 'barbell deadlift', target: 'spine', bodyPart: 'back', equipment: 'barbell', difficulty: 'advanced', secondaryMuscles: ['glutes', 'hamstrings', 'traps'] },
  { id: '1257', name: 'machine row', target: 'lats', bodyPart: 'back', equipment: 'leverage machine', difficulty: 'beginner', secondaryMuscles: ['biceps'] },
  { id: '0653', name: 'inverted row', target: 'lats', bodyPart: 'back', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: ['biceps'] },
  { id: '0029', name: 't-bar row', target: 'upper back', bodyPart: 'back', equipment: 'barbell', difficulty: 'intermediate', secondaryMuscles: ['biceps', 'lats'] },

  // SHOULDERS
  { id: '0237', name: 'dumbbell shoulder press', target: 'delts', bodyPart: 'shoulders', equipment: 'dumbbell', difficulty: 'intermediate', secondaryMuscles: ['triceps', 'traps'] },
  { id: '0036', name: 'barbell overhead press', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell', difficulty: 'intermediate', secondaryMuscles: ['triceps', 'traps'] },
  { id: '0308', name: 'dumbbell lateral raise', target: 'delts', bodyPart: 'shoulders', equipment: 'dumbbell', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0518', name: 'cable lateral raise', target: 'delts', bodyPart: 'shoulders', equipment: 'cable', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0309', name: 'dumbbell front raise', target: 'delts', bodyPart: 'shoulders', equipment: 'dumbbell', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0310', name: 'dumbbell rear delt fly', target: 'delts', bodyPart: 'shoulders', equipment: 'dumbbell', difficulty: 'beginner', secondaryMuscles: ['traps'] },
  { id: '0037', name: 'barbell upright row', target: 'delts', bodyPart: 'shoulders', equipment: 'barbell', difficulty: 'intermediate', secondaryMuscles: ['traps', 'biceps'] },
  { id: '1258', name: 'machine shoulder press', target: 'delts', bodyPart: 'shoulders', equipment: 'leverage machine', difficulty: 'beginner', secondaryMuscles: ['triceps'] },
  { id: '0253', name: 'pike push-up', target: 'delts', bodyPart: 'shoulders', equipment: 'body weight', difficulty: 'intermediate', secondaryMuscles: ['triceps'] },
  { id: '0311', name: 'arnold press', target: 'delts', bodyPart: 'shoulders', equipment: 'dumbbell', difficulty: 'intermediate', secondaryMuscles: ['triceps'] },

  // UPPER ARMS (BICEPS)
  { id: '0100', name: 'barbell curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'barbell', difficulty: 'beginner', secondaryMuscles: ['forearms'] },
  { id: '0101', name: 'dumbbell curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'dumbbell', difficulty: 'beginner', secondaryMuscles: ['forearms'] },
  { id: '0102', name: 'hammer curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'dumbbell', difficulty: 'beginner', secondaryMuscles: ['forearms'] },
  { id: '0103', name: 'cable curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'cable', difficulty: 'beginner', secondaryMuscles: ['forearms'] },
  { id: '0104', name: 'preacher curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'ez barbell', difficulty: 'intermediate', secondaryMuscles: [] },
  { id: '0105', name: 'concentration curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'dumbbell', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0106', name: 'incline dumbbell curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'dumbbell', difficulty: 'intermediate', secondaryMuscles: [] },

  // UPPER ARMS (TRICEPS)
  { id: '0200', name: 'tricep pushdown', target: 'triceps', bodyPart: 'upper arms', equipment: 'cable', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0201', name: 'skull crusher', target: 'triceps', bodyPart: 'upper arms', equipment: 'ez barbell', difficulty: 'intermediate', secondaryMuscles: [] },
  { id: '0202', name: 'overhead tricep extension', target: 'triceps', bodyPart: 'upper arms', equipment: 'dumbbell', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0203', name: 'close grip bench press', target: 'triceps', bodyPart: 'upper arms', equipment: 'barbell', difficulty: 'intermediate', secondaryMuscles: ['pectorals'] },
  { id: '0254', name: 'diamond push-up', target: 'triceps', bodyPart: 'upper arms', equipment: 'body weight', difficulty: 'intermediate', secondaryMuscles: ['pectorals'] },
  { id: '0255', name: 'bench dips', target: 'triceps', bodyPart: 'upper arms', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: ['pectorals', 'delts'] },
  { id: '0204', name: 'tricep kickback', target: 'triceps', bodyPart: 'upper arms', equipment: 'dumbbell', difficulty: 'beginner', secondaryMuscles: [] },

  // UPPER LEGS (QUADS)
  { id: '0032', name: 'barbell squat', target: 'quads', bodyPart: 'upper legs', equipment: 'barbell', difficulty: 'intermediate', secondaryMuscles: ['glutes', 'hamstrings', 'abs'] },
  { id: '0278', name: 'dumbbell lunge', target: 'quads', bodyPart: 'upper legs', equipment: 'dumbbell', difficulty: 'beginner', secondaryMuscles: ['glutes', 'hamstrings'] },
  { id: '0584', name: 'leg press', target: 'quads', bodyPart: 'upper legs', equipment: 'leverage machine', difficulty: 'beginner', secondaryMuscles: ['glutes', 'hamstrings'] },
  { id: '0585', name: 'leg extension', target: 'quads', bodyPart: 'upper legs', equipment: 'leverage machine', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0654', name: 'bodyweight squat', target: 'quads', bodyPart: 'upper legs', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: ['glutes'] },
  { id: '0655', name: 'lunge', target: 'quads', bodyPart: 'upper legs', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: ['glutes', 'hamstrings'] },
  { id: '0279', name: 'goblet squat', target: 'quads', bodyPart: 'upper legs', equipment: 'dumbbell', difficulty: 'beginner', secondaryMuscles: ['glutes'] },
  { id: '0033', name: 'front squat', target: 'quads', bodyPart: 'upper legs', equipment: 'barbell', difficulty: 'advanced', secondaryMuscles: ['glutes', 'abs'] },
  { id: '0280', name: 'bulgarian split squat', target: 'quads', bodyPart: 'upper legs', equipment: 'dumbbell', difficulty: 'intermediate', secondaryMuscles: ['glutes', 'hamstrings'] },
  { id: '1259', name: 'hack squat', target: 'quads', bodyPart: 'upper legs', equipment: 'leverage machine', difficulty: 'intermediate', secondaryMuscles: ['glutes'] },
  { id: '0034', name: 'smith machine squat', target: 'quads', bodyPart: 'upper legs', equipment: 'smith machine', difficulty: 'beginner', secondaryMuscles: ['glutes', 'hamstrings'] },

  // UPPER LEGS (HAMSTRINGS)
  { id: '0038', name: 'romanian deadlift', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'barbell', difficulty: 'intermediate', secondaryMuscles: ['glutes', 'spine'] },
  { id: '0586', name: 'leg curl', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'leverage machine', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0281', name: 'dumbbell romanian deadlift', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'dumbbell', difficulty: 'intermediate', secondaryMuscles: ['glutes'] },
  { id: '0282', name: 'single leg deadlift', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'dumbbell', difficulty: 'intermediate', secondaryMuscles: ['glutes'] },
  { id: '0656', name: 'nordic curl', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'body weight', difficulty: 'advanced', secondaryMuscles: [] },
  { id: '0587', name: 'seated leg curl', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'leverage machine', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0039', name: 'stiff leg deadlift', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'barbell', difficulty: 'intermediate', secondaryMuscles: ['glutes', 'spine'] },
  { id: '0163', name: 'cable pull through', target: 'hamstrings', bodyPart: 'upper legs', equipment: 'cable', difficulty: 'intermediate', secondaryMuscles: ['glutes'] },

  // UPPER LEGS (GLUTES)
  { id: '0526', name: 'hip thrust', target: 'glutes', bodyPart: 'upper legs', equipment: 'barbell', difficulty: 'intermediate', secondaryMuscles: ['hamstrings'] },
  { id: '0657', name: 'glute bridge', target: 'glutes', bodyPart: 'upper legs', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: ['hamstrings'] },
  { id: '0658', name: 'single leg glute bridge', target: 'glutes', bodyPart: 'upper legs', equipment: 'body weight', difficulty: 'intermediate', secondaryMuscles: ['hamstrings'] },
  { id: '0164', name: 'cable kickback', target: 'glutes', bodyPart: 'upper legs', equipment: 'cable', difficulty: 'beginner', secondaryMuscles: ['hamstrings'] },
  { id: '1260', name: 'hip abduction machine', target: 'glutes', bodyPart: 'upper legs', equipment: 'leverage machine', difficulty: 'beginner', secondaryMuscles: ['abductors'] },
  { id: '0283', name: 'dumbbell step up', target: 'glutes', bodyPart: 'upper legs', equipment: 'dumbbell', difficulty: 'intermediate', secondaryMuscles: ['quads', 'hamstrings'] },

  // LOWER LEGS (CALVES)
  { id: '0600', name: 'standing calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'leverage machine', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0601', name: 'seated calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'leverage machine', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0602', name: 'dumbbell calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'dumbbell', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0659', name: 'bodyweight calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0040', name: 'barbell calf raise', target: 'calves', bodyPart: 'lower legs', equipment: 'barbell', difficulty: 'intermediate', secondaryMuscles: [] },

  // WAIST (ABS)
  { id: '0400', name: 'crunch', target: 'abs', bodyPart: 'waist', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0401', name: 'plank', target: 'abs', bodyPart: 'waist', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: ['obliques'] },
  { id: '0402', name: 'hanging leg raise', target: 'abs', bodyPart: 'waist', equipment: 'body weight', difficulty: 'intermediate', secondaryMuscles: ['hip flexors'] },
  { id: '0403', name: 'russian twist', target: 'abs', bodyPart: 'waist', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: ['obliques'] },
  { id: '0404', name: 'bicycle crunch', target: 'abs', bodyPart: 'waist', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: ['obliques'] },
  { id: '0165', name: 'cable crunch', target: 'abs', bodyPart: 'waist', equipment: 'cable', difficulty: 'intermediate', secondaryMuscles: [] },
  { id: '0405', name: 'mountain climber', target: 'abs', bodyPart: 'waist', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: ['hip flexors'] },
  { id: '0406', name: 'dead bug', target: 'abs', bodyPart: 'waist', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '1261', name: 'ab wheel rollout', target: 'abs', bodyPart: 'waist', equipment: 'wheel roller', difficulty: 'intermediate', secondaryMuscles: ['lats'] },
  { id: '0284', name: 'weighted crunch', target: 'abs', bodyPart: 'waist', equipment: 'dumbbell', difficulty: 'intermediate', secondaryMuscles: [] },

  // KETTLEBELL EXERCISES
  { id: '0527', name: 'kettlebell swing', target: 'glutes', bodyPart: 'upper legs', equipment: 'kettlebell', difficulty: 'intermediate', secondaryMuscles: ['hamstrings', 'abs', 'spine'] },
  { id: '0528', name: 'kettlebell goblet squat', target: 'quads', bodyPart: 'upper legs', equipment: 'kettlebell', difficulty: 'beginner', secondaryMuscles: ['glutes'] },
  { id: '0529', name: 'kettlebell clean and press', target: 'delts', bodyPart: 'shoulders', equipment: 'kettlebell', difficulty: 'intermediate', secondaryMuscles: ['triceps', 'abs'] },
  { id: '0530', name: 'kettlebell row', target: 'lats', bodyPart: 'back', equipment: 'kettlebell', difficulty: 'beginner', secondaryMuscles: ['biceps'] },
  { id: '0531', name: 'kettlebell floor press', target: 'pectorals', bodyPart: 'chest', equipment: 'kettlebell', difficulty: 'intermediate', secondaryMuscles: ['triceps'] },
  { id: '0532', name: 'kettlebell snatch', target: 'delts', bodyPart: 'shoulders', equipment: 'kettlebell', difficulty: 'advanced', secondaryMuscles: ['traps', 'glutes', 'abs'] },
  { id: '0533', name: 'kettlebell turkish get up', target: 'abs', bodyPart: 'waist', equipment: 'kettlebell', difficulty: 'advanced', secondaryMuscles: ['delts', 'glutes', 'quads'] },
  { id: '0534', name: 'kettlebell lunge', target: 'quads', bodyPart: 'upper legs', equipment: 'kettlebell', difficulty: 'intermediate', secondaryMuscles: ['glutes', 'hamstrings'] },
  { id: '0535', name: 'kettlebell windmill', target: 'abs', bodyPart: 'waist', equipment: 'kettlebell', difficulty: 'intermediate', secondaryMuscles: ['obliques', 'delts'] },

  // RESISTANCE BAND EXERCISES
  { id: '0701', name: 'resistance band row', target: 'lats', bodyPart: 'back', equipment: 'band', difficulty: 'beginner', secondaryMuscles: ['biceps'] },
  { id: '0702', name: 'resistance band chest press', target: 'pectorals', bodyPart: 'chest', equipment: 'band', difficulty: 'beginner', secondaryMuscles: ['triceps'] },
  { id: '0703', name: 'resistance band squat', target: 'quads', bodyPart: 'upper legs', equipment: 'band', difficulty: 'beginner', secondaryMuscles: ['glutes'] },
  { id: '0704', name: 'resistance band bicep curl', target: 'biceps', bodyPart: 'upper arms', equipment: 'band', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0705', name: 'resistance band tricep extension', target: 'triceps', bodyPart: 'upper arms', equipment: 'band', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0706', name: 'resistance band lateral raise', target: 'delts', bodyPart: 'shoulders', equipment: 'band', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0707', name: 'resistance band pull apart', target: 'upper back', bodyPart: 'back', equipment: 'band', difficulty: 'beginner', secondaryMuscles: ['rear delts'] },
  { id: '0708', name: 'resistance band face pull', target: 'upper back', bodyPart: 'back', equipment: 'band', difficulty: 'beginner', secondaryMuscles: ['rear delts'] },
  { id: '0709', name: 'resistance band glute bridge', target: 'glutes', bodyPart: 'upper legs', equipment: 'band', difficulty: 'beginner', secondaryMuscles: ['hamstrings'] },
  { id: '0710', name: 'resistance band clamshell', target: 'glutes', bodyPart: 'upper legs', equipment: 'band', difficulty: 'beginner', secondaryMuscles: ['abductors'] },

  // CARDIO / METABOLIC
  { id: '0800', name: 'burpee', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight', difficulty: 'intermediate', secondaryMuscles: ['pectorals', 'quads', 'abs'] },
  { id: '0801', name: 'jumping jack', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: [] },
  { id: '0802', name: 'high knees', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight', difficulty: 'beginner', secondaryMuscles: ['hip flexors', 'abs'] },
  { id: '0803', name: 'box jump', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'body weight', difficulty: 'intermediate', secondaryMuscles: ['quads', 'glutes'] },
  { id: '0804', name: 'battle ropes', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'rope', difficulty: 'intermediate', secondaryMuscles: ['delts', 'abs'] },
  { id: '0805', name: 'rowing machine', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'rowing machine', difficulty: 'beginner', secondaryMuscles: ['lats', 'biceps', 'quads'] },
  { id: '0806', name: 'assault bike', target: 'cardiovascular system', bodyPart: 'cardio', equipment: 'stationary bike', difficulty: 'intermediate', secondaryMuscles: ['quads', 'delts'] },
];

// ============================================================================
// DAY FOCUS MAPPING - Maps day focus to body parts and target muscles
// ============================================================================

export const DAY_FOCUS_MAPPING = {
  'Push': { bodyParts: ['chest', 'shoulders', 'upper arms'], targetMuscles: ['pectorals', 'delts', 'triceps'] },
  'Pull': { bodyParts: ['back', 'upper arms'], targetMuscles: ['lats', 'upper back', 'biceps'] },
  'Legs': { bodyParts: ['upper legs', 'lower legs'], targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  'Upper': { bodyParts: ['chest', 'back', 'shoulders', 'upper arms'], targetMuscles: ['pectorals', 'lats', 'delts', 'biceps', 'triceps'] },
  'Lower': { bodyParts: ['upper legs', 'lower legs'], targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  'Chest': { bodyParts: ['chest'], targetMuscles: ['pectorals'] },
  'Back': { bodyParts: ['back'], targetMuscles: ['lats', 'upper back'] },
  'Shoulders': { bodyParts: ['shoulders'], targetMuscles: ['delts'] },
  'Arms': { bodyParts: ['upper arms'], targetMuscles: ['biceps', 'triceps'] },
  'Chest/Back': { bodyParts: ['chest', 'back'], targetMuscles: ['pectorals', 'lats', 'upper back'] },
  'Shoulders/Arms': { bodyParts: ['shoulders', 'upper arms'], targetMuscles: ['delts', 'biceps', 'triceps'] },
  'Full Body': { bodyParts: ['full_body'], targetMuscles: null }
};

// ============================================================================
// TEST SCENARIOS
// ============================================================================

export const TEST_SCENARIOS = [
  // BODYBUILDING SCENARIOS - BRO SPLIT
  {
    name: 'Bro Split (Chest)',
    split: 'bro_split',
    dayFocus: 'Chest',
    request: {
      equipment: ['Dumbbells', 'Barbell', 'Cable Machine', 'Chest Press', 'Pec Deck'],
      trainingStyles: ['classic_bodybuilding'],
      bodyParts: ['chest'],
      targetMuscles: ['pectorals'],
      splitDayType: 'chest',  // Wires to edge function muscle filter
      duration: 60,
      experienceLevel: 'intermediate',
    },
    expectations: {
      minExercises: 5,
      maxExercises: 8,
      setsRange: [3, 4],
      repsRange: [8, 12],
      restRange: [60, 90],
      shouldIncludeTechniques: ['supersets'],
      requiredMuscleBalance: { pectorals: 1.0 },  // Chest ONLY on Bro Split
    },
  },
  {
    name: 'Bro Split (Back)',
    split: 'bro_split',
    dayFocus: 'Back',
    request: {
      equipment: ['Dumbbells', 'Barbell', 'Cable Machine', 'Lat Pulldown', 'Seated Row Machine'],
      trainingStyles: ['classic_bodybuilding'],
      bodyParts: ['back'],
      targetMuscles: ['lats', 'upper back', 'traps', 'spine'],
      splitDayType: 'back',  // Wires to edge function muscle filter
      duration: 60,
      experienceLevel: 'intermediate',
    },
    expectations: {
      minExercises: 5,
      maxExercises: 8,
      setsRange: [3, 4],
      repsRange: [8, 12],
      restRange: [60, 90],
      shouldIncludeTechniques: ['supersets'],
      requiredMuscleBalance: { lats: 0.5, 'upper back': 0.3, traps: 0.2 },  // Back ONLY on Bro Split
    },
  },
  {
    name: 'Bro Split (Shoulders)',
    split: 'bro_split',
    dayFocus: 'Shoulders',
    request: {
      equipment: ['dumbbell', 'barbell', 'cable', 'leverage machine'],
      trainingStyles: ['classic_bodybuilding'],
      bodyParts: ['shoulders'],
      targetMuscles: ['delts'],
      splitDayType: 'shoulders',  // Wires to edge function muscle filter
      duration: 60,
      experienceLevel: 'intermediate',
    },
    expectations: {
      minExercises: 4,
      maxExercises: 6,
      setsRange: [3, 4],
      repsRange: [10, 15],
      restRange: [45, 75],
      shouldIncludeTechniques: [],
      requiredMuscleBalance: { delts: 0.8 },
    },
  },
  {
    name: 'Bro Split (Arms)',
    split: 'bro_split',
    dayFocus: 'Arms',
    request: {
      equipment: ['Dumbbells', 'Barbell', 'Cable Machine', 'EZ Bar'],
      trainingStyles: ['classic_bodybuilding'],
      bodyParts: ['upper arms'],
      targetMuscles: ['biceps', 'triceps'],
      splitDayType: 'arms',  // Wires to edge function muscle filter
      duration: 60,
      experienceLevel: 'intermediate',
    },
    expectations: {
      minExercises: 6,
      maxExercises: 8,
      setsRange: [3, 4],
      repsRange: [10, 15],
      restRange: [45, 75],
      shouldIncludeTechniques: ['supersets'],
      requiredMuscleBalance: { biceps: 0.5, triceps: 0.5 },
    },
  },
  {
    name: 'Bro Split (Legs)',
    split: 'bro_split',
    dayFocus: 'Legs',
    request: {
      equipment: ['Barbell', 'Dumbbells', 'Leg Press', 'Leg Curl Machine', 'Leg Extension Machine'],
      trainingStyles: ['classic_bodybuilding'],
      bodyParts: ['upper legs', 'lower legs'],
      targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
      splitDayType: 'legs',  // Wires to edge function muscle filter
      duration: 60,
      experienceLevel: 'intermediate',
    },
    expectations: {
      minExercises: 6,
      maxExercises: 8,
      setsRange: [3, 4],
      repsRange: [10, 15],
      restRange: [60, 90],
      shouldIncludeTechniques: [],
      requiredMuscleBalance: { quads: 0.35, hamstrings: 0.25, glutes: 0.2, calves: 0.1 },
    },
  },
  {
    name: 'PPL - Bodybuilding (Legs)',
    split: 'push_pull_legs',
    dayFocus: 'Legs',
    request: {
      equipment: ['Barbell', 'Dumbbells', 'Leg Press', 'Leg Curl Machine', 'Leg Extension Machine', 'Hack Squat'],
      trainingStyles: ['classic_bodybuilding'],
      bodyParts: ['upper legs', 'lower legs'],
      targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
      duration: 60,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 6,
      maxExercises: 10,
      setsRange: [3, 5],
      repsRange: [8, 15],
      restRange: [60, 120],
      shouldIncludeTechniques: ['supersets', 'drop sets'],
      requiredMuscleBalance: { quads: 0.35, hamstrings: 0.25, glutes: 0.2, calves: 0.1 },
    },
  },

  // STRENGTH SCENARIOS
  {
    name: 'Upper/Lower - Strength (Upper)',
    split: 'upper_lower',
    dayFocus: 'Upper',
    request: {
      equipment: ['barbell', 'dumbbell', 'cable'],
      trainingStyles: ['strength_focused'],
      bodyParts: ['chest', 'back', 'shoulders'],
      targetMuscles: ['pectorals', 'lats', 'delts'],
      duration: 60,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 4,
      maxExercises: 6,
      setsRange: [4, 5],
      repsRange: [4, 6],
      restRange: [120, 240],
      shouldIncludeTechniques: [],
      requiredMuscleBalance: { pectorals: 0.3, lats: 0.3, delts: 0.25 },
    },
  },
  {
    name: 'Upper/Lower - Strength (Lower)',
    split: 'upper_lower',
    dayFocus: 'Lower',
    request: {
      equipment: ['barbell', 'dumbbell', 'leverage machine'],
      trainingStyles: ['strength_focused'],
      bodyParts: ['upper legs'],
      targetMuscles: ['quads', 'hamstrings', 'glutes'],
      duration: 60,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 4,
      maxExercises: 6,
      setsRange: [4, 5],
      repsRange: [4, 6],
      restRange: [120, 240],
      shouldIncludeTechniques: [],
      requiredMuscleBalance: { quads: 0.35, hamstrings: 0.3, glutes: 0.25 },
    },
  },
  {
    name: 'Full Body - Strength',
    split: 'full_body',
    dayFocus: 'Full Body',
    request: {
      equipment: ['barbell', 'dumbbell'],
      trainingStyles: ['strength_focused'],
      bodyParts: ['chest', 'upper legs', 'back'],
      targetMuscles: ['pectorals', 'quads', 'spine'],
      duration: 90,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 4,
      maxExercises: 7,
      setsRange: [4, 5],
      repsRange: [4, 6],
      restRange: [120, 240],
      shouldIncludeTechniques: [],
      requiredMuscleBalance: { pectorals: 0.3, quads: 0.3, spine: 0.3 },
    },
  },

  // HIGH INTENSITY (HIT) SCENARIOS - Mentzer/Yates style
  {
    name: 'Upper/Lower - HIT (Upper)',
    split: 'upper_lower',
    dayFocus: 'Upper',
    request: {
      equipment: ['Chest Press', 'Lat Pulldown', 'Shoulder Press Machine', 'Dumbbells', 'Cable Machine'],
      trainingStyles: ['high_intensity_hit'],
      bodyParts: ['chest', 'back', 'shoulders'],
      targetMuscles: ['pectorals', 'lats', 'delts'],
      duration: 30,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 5,
      maxExercises: 8,
      setsRange: [1, 2],
      repsRange: [6, 10],
      restRange: [120, 180],
      shouldIncludeTechniques: ['slow_negatives', 'to_failure'],
      requiredMuscleBalance: { pectorals: 0.3, lats: 0.3, delts: 0.25 },
    },
  },
  {
    name: 'Full Body - HIT',
    split: 'full_body',
    dayFocus: 'Full Body',
    request: {
      equipment: ['leverage machine', 'dumbbell'],
      trainingStyles: ['high_intensity_hit'],
      bodyParts: ['full_body'],
      duration: 60,
      experienceLevel: 'intermediate',
    },
    expectations: {
      minExercises: 6,
      maxExercises: 10,
      setsRange: [1, 2],
      repsRange: [6, 10],
      restRange: [120, 180],
      shouldIncludeTechniques: ['slow_negatives', 'to_failure'],
      requiredMuscleBalance: {},
    },
  },
  {
    name: 'Upper/Lower - HIT (Lower)',
    split: 'upper_lower',
    dayFocus: 'Lower',
    request: {
      equipment: ['leverage machine', 'barbell'],
      trainingStyles: ['high_intensity_hit'],
      bodyParts: ['upper legs', 'lower legs'],
      targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
      duration: 30,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 4,
      maxExercises: 6,
      setsRange: [1, 2],
      repsRange: [6, 10],
      restRange: [120, 180],
      shouldIncludeTechniques: ['slow_negatives', 'to_failure'],
      requiredMuscleBalance: { quads: 0.3, hamstrings: 0.25, glutes: 0.2, calves: 0.1 },
    },
  },

  // MUSCULAR ENDURANCE SCENARIOS - Circuit/Tri-set based
  {
    name: 'Full Body - Endurance',
    split: 'full_body',
    dayFocus: 'Full Body',
    request: {
      equipment: ['body weight', 'dumbbell', 'kettlebell'],
      trainingStyles: ['muscular_endurance'],
      bodyParts: ['full_body'],
      duration: 30,
      experienceLevel: 'intermediate',
    },
    expectations: {
      minExercises: 6,
      maxExercises: 10,
      setsRange: [2, 3],
      repsRange: [15, 20],
      restRange: [30, 45],
      shouldIncludeTechniques: ['circuit', 'tri_sets'],
      requiredMuscleBalance: {},
    },
  },
  {
    name: 'Upper/Lower - Endurance (Upper)',
    split: 'upper_lower',
    dayFocus: 'Upper',
    request: {
      equipment: ['dumbbell', 'cable', 'band'],
      trainingStyles: ['muscular_endurance'],
      bodyParts: ['chest', 'back', 'shoulders', 'upper arms'],
      targetMuscles: ['pectorals', 'lats', 'delts', 'biceps', 'triceps'],
      duration: 60,
      experienceLevel: 'intermediate',
    },
    expectations: {
      minExercises: 6,
      maxExercises: 9,
      setsRange: [2, 3],
      repsRange: [15, 20],
      restRange: [30, 45],
      shouldIncludeTechniques: ['circuit', 'supersets'],
      requiredMuscleBalance: { pectorals: 0.2, lats: 0.2, delts: 0.2, biceps: 0.15, triceps: 0.15 },
    },
  },
  // ADVANCED PPL SCENARIOS
  {
    name: 'PPL - Bodybuilding (Push)',
    split: 'push_pull_legs',
    dayFocus: 'Push',
    request: {
      equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine'],
      trainingStyles: ['classic_bodybuilding'],
      bodyParts: ['chest', 'shoulders', 'upper arms'],
      targetMuscles: ['pectorals', 'delts', 'triceps'],
      duration: 60,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 7,
      maxExercises: 10,
      setsRange: [3, 5],
      repsRange: [6, 15],
      restRange: [45, 120],
      shouldIncludeTechniques: ['supersets', 'drop sets', 'rest pause'],
      requiredMuscleBalance: { pectorals: 0.35, delts: 0.3, triceps: 0.25 },
    },
  },
  {
    name: 'PPL - Bodybuilding (Pull)',
    split: 'push_pull_legs',
    dayFocus: 'Pull',
    request: {
      equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine', 'body weight'],
      trainingStyles: ['classic_bodybuilding'],
      bodyParts: ['back', 'upper arms'],
      targetMuscles: ['lats', 'upper back', 'biceps'],
      duration: 60,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 7,
      maxExercises: 10,
      setsRange: [3, 5],
      repsRange: [6, 15],
      restRange: [45, 120],
      shouldIncludeTechniques: ['supersets', 'drop sets'],
      requiredMuscleBalance: { lats: 0.35, 'upper back': 0.25, biceps: 0.25 },
    },
  },

  // BLENDED STYLE SCENARIOS
  {
    name: 'PPL - Strength + Bodybuilding (Push)',
    split: 'push_pull_legs',
    dayFocus: 'Push',
    request: {
      equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine'],
      trainingStyles: ['strength_focused', 'classic_bodybuilding'],
      bodyParts: ['chest', 'shoulders', 'upper arms'],
      targetMuscles: ['pectorals', 'delts', 'triceps'],
      duration: 60,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 6,
      maxExercises: 9,
      setsRange: [3, 5],
      repsRange: [4, 12],
      restRange: [60, 180],
      shouldIncludeTechniques: ['supersets'],
      requiredMuscleBalance: { pectorals: 0.35, delts: 0.3, triceps: 0.25 },
    },
  },
  {
    name: 'Upper/Lower - HIT + Bodybuilding (Upper)',
    split: 'upper_lower',
    dayFocus: 'Upper',
    request: {
      equipment: ['leverage machine', 'dumbbell', 'cable'],
      trainingStyles: ['high_intensity_hit', 'classic_bodybuilding'],
      bodyParts: ['chest', 'back', 'shoulders', 'upper arms'],
      targetMuscles: ['pectorals', 'lats', 'delts', 'biceps', 'triceps'],
      duration: 60,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 5,
      maxExercises: 8,
      setsRange: [1, 4],
      repsRange: [6, 12],
      restRange: [60, 180],
      shouldIncludeTechniques: ['slow_negatives', 'supersets'],
      requiredMuscleBalance: { pectorals: 0.25, lats: 0.25, delts: 0.2, biceps: 0.15, triceps: 0.15 },
    },
  },
  {
    name: 'Full Body - Strength + Endurance',
    split: 'full_body',
    dayFocus: 'Full Body',
    request: {
      equipment: ['barbell', 'dumbbell', 'kettlebell', 'body weight'],
      trainingStyles: ['strength_focused', 'muscular_endurance'],
      bodyParts: ['full_body'],
      duration: 90,
      experienceLevel: 'intermediate',
    },
    expectations: {
      minExercises: 6,
      maxExercises: 10,
      setsRange: [2, 5],
      repsRange: [4, 20],
      restRange: [30, 180],
      shouldIncludeTechniques: ['circuit'],
      requiredMuscleBalance: {},
    },
  },
  {
    name: 'Arnold Split - Bodybuilding (Chest/Back)',
    split: 'arnold_split',
    dayFocus: 'Chest/Back',
    request: {
      equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine', 'body weight'],
      trainingStyles: ['classic_bodybuilding'],
      bodyParts: ['chest', 'back'],
      targetMuscles: ['pectorals', 'lats', 'upper back'],
      duration: 90,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 8,
      maxExercises: 12,
      setsRange: [3, 5],
      repsRange: [6, 15],
      restRange: [45, 120],
      shouldIncludeTechniques: ['supersets', 'drop sets'],
      requiredMuscleBalance: { pectorals: 0.4, lats: 0.35, 'upper back': 0.15 },
    },
  },
  {
    name: 'Arnold Split - Bodybuilding (Shoulders/Arms)',
    split: 'arnold_split',
    dayFocus: 'Shoulders/Arms',
    request: {
      equipment: ['barbell', 'dumbbell', 'cable', 'ez barbell'],
      trainingStyles: ['classic_bodybuilding'],
      bodyParts: ['shoulders', 'upper arms'],
      targetMuscles: ['delts', 'biceps', 'triceps'],
      duration: 60,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 7,
      maxExercises: 10,
      setsRange: [3, 4],
      repsRange: [8, 15],
      restRange: [45, 90],
      shouldIncludeTechniques: ['supersets', 'drop sets'],
      requiredMuscleBalance: { delts: 0.35, biceps: 0.3, triceps: 0.3 },
    },
  },
  {
    name: 'Arnold Split - Bodybuilding + Endurance (Chest/Back)',
    split: 'arnold_split',
    dayFocus: 'Chest/Back',
    request: {
      equipment: ['barbell', 'dumbbell', 'cable', 'leverage machine', 'body weight'],
      trainingStyles: ['classic_bodybuilding', 'muscular_endurance'],
      bodyParts: ['chest', 'back'],
      targetMuscles: ['pectorals', 'lats', 'upper back'],
      duration: 75,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 8,
      maxExercises: 12,
      setsRange: [2, 4],
      repsRange: [8, 20],
      restRange: [30, 90],
      shouldIncludeTechniques: ['supersets', 'circuit', 'tri_sets'],
      requiredMuscleBalance: { pectorals: 0.4, lats: 0.35, 'upper back': 0.15 },
    },
  },
  {
    name: 'Arnold Split - Bodybuilding + HIT (Chest/Back)',
    split: 'arnold_split',
    dayFocus: 'Chest/Back',
    request: {
      equipment: ['leverage machine', 'cable', 'dumbbell', 'barbell'],
      trainingStyles: ['classic_bodybuilding', 'high_intensity_hit'],
      bodyParts: ['chest', 'back'],
      targetMuscles: ['pectorals', 'lats', 'upper back'],
      duration: 60,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 6,
      maxExercises: 10,
      setsRange: [1, 4],
      repsRange: [6, 12],
      restRange: [60, 180],
      shouldIncludeTechniques: ['supersets', 'slow_negatives', 'to_failure'],
      requiredMuscleBalance: { pectorals: 0.4, lats: 0.35, 'upper back': 0.15 },
    },
  },
  {
    name: 'Arnold Split - Bodybuilding + Endurance (Shoulders/Arms)',
    split: 'arnold_split',
    dayFocus: 'Shoulders/Arms',
    request: {
      equipment: ['dumbbell', 'cable', 'ez barbell', 'band'],
      trainingStyles: ['classic_bodybuilding', 'muscular_endurance'],
      bodyParts: ['shoulders', 'upper arms'],
      targetMuscles: ['delts', 'biceps', 'triceps'],
      duration: 60,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 8,
      maxExercises: 12,
      setsRange: [2, 4],
      repsRange: [10, 20],
      restRange: [30, 75],
      shouldIncludeTechniques: ['supersets', 'circuit', 'tri_sets'],
      requiredMuscleBalance: { delts: 0.35, biceps: 0.3, triceps: 0.3 },
    },
  },
  {
    name: 'Arnold Split - Bodybuilding + HIT (Shoulders/Arms)',
    split: 'arnold_split',
    dayFocus: 'Shoulders/Arms',
    request: {
      equipment: ['leverage machine', 'cable', 'dumbbell', 'ez barbell'],
      trainingStyles: ['classic_bodybuilding', 'high_intensity_hit'],
      bodyParts: ['shoulders', 'upper arms'],
      targetMuscles: ['delts', 'biceps', 'triceps'],
      duration: 45,
      experienceLevel: 'advanced',
    },
    expectations: {
      minExercises: 5,
      maxExercises: 8,
      setsRange: [1, 4],
      repsRange: [6, 12],
      restRange: [60, 150],
      shouldIncludeTechniques: ['supersets', 'slow_negatives', 'to_failure'],
      requiredMuscleBalance: { delts: 0.35, biceps: 0.3, triceps: 0.3 },
    },
  },
];

// ============================================================================
// TRAINING STYLE PARAMETERS
// ============================================================================

export const TRAINING_STYLE_PARAMS = {
  classic_bodybuilding: {
    name: 'Classic Bodybuilding',
    description: 'Moderate volume, pump-focused, mix of compound and isolation',
    sets: { min: 3, max: 4, optimal: 4 },
    reps: { min: 8, max: 12, optimal: 10 },
    rest: { min: 60, max: 90, optimal: 75 },
    tempo: '2-0-2-0',
    rpe: { min: 7, max: 9, optimal: 8 },
    advancedTechniques: ['supersets'],
    exerciseOrder: ['compound', 'compound', 'isolation', 'isolation'],
    volumeMultiplier: 1.0,
  },
  strength_focused: {
    name: 'Strength Focused',
    description: 'Heavy compounds prioritized, low rep, longer rest',
    sets: { min: 4, max: 5, optimal: 5 },
    reps: { min: 4, max: 6, optimal: 5 },
    rest: { min: 120, max: 240, optimal: 180 },
    tempo: '2-1-2-1',
    rpe: { min: 8, max: 10, optimal: 9 },
    advancedTechniques: ['straight_sets'],
    exerciseOrder: ['compound', 'compound', 'accessory'],
    volumeMultiplier: 0.8,
  },
  high_intensity_hit: {
    name: 'High Intensity (HIT)',
    description: 'Mentzer/Yates style - very low volume, maximum effort per set, to failure',
    sets: { min: 1, max: 2, optimal: 1 },
    reps: { min: 6, max: 10, optimal: 8 },
    rest: { min: 120, max: 180, optimal: 150 },
    tempo: 'slow_negatives',
    rpe: { min: 9, max: 10, optimal: 10 },
    advancedTechniques: ['slow_negatives', 'rest_pause', 'to_failure'],
    exerciseOrder: ['compound', 'compound', 'isolation'],
    volumeMultiplier: 0.4,
    preferMachines: true,
  },
  muscular_endurance: {
    name: 'Muscular Endurance',
    description: 'Fast-paced, minimal rest, conditioning-focused with circuits/tri-sets',
    sets: { min: 2, max: 3, optimal: 3 },
    reps: { min: 15, max: 20, optimal: 18 },
    rest: { min: 30, max: 45, optimal: 30 },
    restBetweenRounds: { min: 60, max: 90, optimal: 75 },
    tempo: 'controlled',
    rpe: { min: 6, max: 8, optimal: 7 },
    advancedTechniques: ['circuit', 'tri_sets', 'supersets', 'drop_sets'],
    exerciseOrder: ['compound', 'compound', 'isolation', 'isolation'],
    volumeMultiplier: 1.2,
    circuitStructure: true,
  },
  functional_fitness: {
    name: 'Functional Fitness',
    description: 'Movement-based training for real-world strength',
    sets: { min: 3, max: 4, optimal: 3 },
    reps: { min: 8, max: 15, optimal: 12 },
    rest: { min: 45, max: 75, optimal: 60 },
    tempo: 'controlled',
    rpe: { min: 6, max: 8, optimal: 7 },
    advancedTechniques: ['circuit'],
    exerciseOrder: ['compound', 'compound', 'unilateral', 'core'],
    volumeMultiplier: 1.0,
  },
};

// ============================================================================
// MODELS TO BENCHMARK
// ============================================================================

export const MODELS = [
  // Fast tier
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude 4.5 Haiku', tier: 'fast' },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', tier: 'fast' },
  { id: 'x-ai/grok-4.1-fast', name: 'Grok 4.1 Fast', tier: 'fast' },
  { id: 'openai/gpt-5-nano', name: 'GPT-5 Mini', tier: 'fast' },
  // Premium tier
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', tier: 'premium' },
  { id: 'openai/gpt-5.2', name: 'GPT-5.2', tier: 'premium' },
  // Other (not in default benchmark run)
  { id: 'openai/gpt-5', name: 'GPT-5', tier: 'premium' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', tier: 'premium' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', tier: 'reasoning' },
  // Removed: google/gemini-3-pro-preview (60s+ latency, too slow)
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts all exercises from workout sections
 */
export function extractExercises(workout) {
  return workout.sections?.flatMap(s => s.exercises || []) || [];
}

/**
 * Map user-friendly equipment names to ExerciseDB equipment values
 * Only uses ACTUAL values from exercises.equipment column in Supabase
 *
 * Valid ExerciseDB equipment values:
 * assisted, band, barbell, body weight, bosu ball, cable, dumbbell,
 * elliptical machine, ez barbell, hammer, kettlebell, leverage machine,
 * medicine ball, olympic barbell, resistance band, roller, rope,
 * skierg machine, sled machine, smith machine, stability ball,
 * stationary bike, stepmill machine, tire, trap bar,
 * upper body ergometer, weighted, wheel roller
 */
const USER_TO_DB_EQUIPMENT = {
  // Free weights
  'dumbbells': ['dumbbell'],
  'barbell': ['barbell'],
  'kettlebells': ['kettlebell'],
  'ez bar': ['ez barbell'],
  'trap bar': ['trap bar'],

  // Machines - synced with edge function EQUIPMENT_TO_DB_MAP (index.ts lines 254-286)
  'cable machine': ['cable'],
  'lat pulldown': ['leverage machine', 'cable'],
  'leg press': ['leverage machine', 'sled machine', 'smith machine'],
  'chest press': ['leverage machine', 'cable', 'smith machine'],
  'pec deck': ['leverage machine', 'cable'],
  'smith machine': ['smith machine'],
  'leg curl machine': ['leverage machine', 'cable'],
  'leg extension machine': ['leverage machine', 'resistance band'],
  'shoulder press machine': ['leverage machine', 'smith machine', 'cable'],
  'hack squat': ['sled machine', 'smith machine', 'barbell'],
  'hip abductor machine': ['leverage machine', 'resistance band'],
  'hip adductor machine': ['leverage machine', 'cable'],
  'seated row machine': ['leverage machine', 'cable'],

  // Accessories
  'resistance bands': ['band', 'resistance band'],
  'stability ball': ['stability ball'],
  'medicine ball': ['medicine ball'],
  'weighted vest': ['weighted'],
  'ab wheel': ['wheel roller'],
  'bosu ball': ['bosu ball'],
  'foam roller': ['roller'],
  'battle ropes': ['rope'],

  // Benches & Racks - synced with edge function
  'flat bench': ['dumbbell', 'barbell'],
  'incline bench': ['dumbbell', 'barbell'],
  'squat rack': ['barbell', 'smith machine'],
  'pull-up bar': ['body weight', 'assisted', 'weighted'],
  'dip station': ['body weight', 'assisted', 'leverage machine', 'weighted'],

  // Cardio - synced with edge function (treadmill/rowing have no DB match)
  'treadmill': [],
  'bike': ['stationary bike'],
  'rowing machine': [],
  'elliptical': ['elliptical machine'],
  'stairmaster': ['stepmill machine'],
  'skierg': ['skierg machine'],

  // Bodyweight
  'body weight': ['body weight'],

  // Raw ExerciseDB names for backwards compat
  'dumbbell': ['dumbbell'],
  'cable': ['cable'],
  'leverage machine': ['leverage machine'],
  'sled machine': ['sled machine'],
  'kettlebell': ['kettlebell'],
  'band': ['band'],
  'assisted': ['assisted'],
};

/**
 * Calculate equipment match rate as percentage
 * Uses the exercise's equipment field directly from response (not MOCK_EXERCISES lookup)
 * Handles both user-friendly names and ExerciseDB format
 *
 * Body weight and assisted exercises always count as matches (everyone has a body)
 */
function calculateEquipmentMatchRate(exercises, requestedEquipment, mockExercises) {
  if (!exercises || exercises.length === 0) return 0;

  // Equipment that's always available (no gym needed)
  const ALWAYS_AVAILABLE = new Set(['body weight', 'assisted']);

  // Expand user-friendly equipment to ExerciseDB format
  const dbEquipment = new Set();
  for (const eq of requestedEquipment) {
    const eqLower = eq.toLowerCase();
    const mapped = USER_TO_DB_EQUIPMENT[eqLower];
    if (mapped) {
      mapped.forEach(e => dbEquipment.add(e));
    } else {
      dbEquipment.add(eqLower);
    }
  }

  let matchCount = 0;
  for (const ex of exercises) {
    // Use equipment directly from exercise response, fallback to MOCK_EXERCISES lookup
    let exEquipment = ex.equipment;

    if (!exEquipment) {
      const exerciseInfo = mockExercises.find(m => m.id === ex.id);
      exEquipment = exerciseInfo?.equipment;
    }

    if (exEquipment) {
      const exEquipLower = exEquipment.toLowerCase();
      // Body weight/assisted always counts as a match
      if (ALWAYS_AVAILABLE.has(exEquipLower) || dbEquipment.has(exEquipLower)) {
        matchCount++;
      }
    }
  }

  return Math.round((matchCount / exercises.length) * 100);
}

/**
 * Get typical reps representation from an array of rep values
 */
function getTypicalReps(repsValues) {
  if (repsValues.length === 0) return '-';

  // Count occurrences of each rep value
  const counts = {};
  for (const rep of repsValues) {
    const repStr = String(rep);
    counts[repStr] = (counts[repStr] || 0) + 1;
  }

  // Find most common
  let mostCommon = repsValues[0];
  let maxCount = 0;
  for (const [rep, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = rep;
    }
  }

  return mostCommon;
}

/**
 * Calculates simple metrics for a workout response - no scoring, just raw values
 */
export function calculateEnhancedMetrics(workout, request, mockExercises) {
  if (!workout) {
    return {
      success: false,
      exerciseCount: 0,
      equipmentMatchRate: 0,
      avgSets: 0,
      avgReps: '-',
      avgRest: 0,
    };
  }

  const allExercises = extractExercises(workout);

  // Equipment match rate (percentage)
  const equipmentMatchRate = calculateEquipmentMatchRate(allExercises, request.equipment, mockExercises);

  // Average sets
  const setsValues = allExercises.map(ex => parseInt(ex.sets, 10)).filter(s => !isNaN(s));
  const avgSets = setsValues.length > 0
    ? Math.round((setsValues.reduce((a, b) => a + b, 0) / setsValues.length) * 10) / 10
    : 0;

  // Average reps - just show what was returned (could be ranges like "8-12")
  const repsValues = allExercises.map(ex => ex.reps).filter(r => r);
  const avgReps = getTypicalReps(repsValues);

  // Average rest in seconds
  const restValues = allExercises.map(ex => parseInt(ex.restSeconds, 10)).filter(r => !isNaN(r));
  const avgRest = restValues.length > 0
    ? Math.round(restValues.reduce((a, b) => a + b, 0) / restValues.length)
    : 0;

  return {
    success: true,
    exerciseCount: allExercises.length,
    equipmentMatchRate,
    avgSets,
    avgReps,
    avgRest,
  };
}

/**
 * Builds style-specific critical instructions based on training type
 */
export function getStyleSpecificInstructions(trainingStyle, trainingStyles) {
  const styles = trainingStyles || [trainingStyle];
  const instructions = [];

  // HIT-specific instructions
  if (styles.includes('high_intensity_hit')) {
    instructions.push(`
CRITICAL HIT TRAINING RULES:
- Maximum 1-2 working sets per exercise (Mentzer/Yates methodology)
- Use slow negatives (4-6 seconds down) on every rep
- Train to complete muscular failure on each working set
- Prefer machines for failure sets (safer than free weights)
- Rest 2-3 minutes between exercises to allow full recovery
- Include rest-pause or forced reps techniques where appropriate
- Lower volume = higher intensity per set`);
  }

  // Muscular Endurance-specific instructions
  if (styles.includes('muscular_endurance')) {
    instructions.push(`
CRITICAL MUSCULAR ENDURANCE RULES:
- Structure workout as circuits or tri-sets
- 0 seconds rest between exercises within a circuit/tri-set
- 60-90 seconds rest between rounds/circuits
- 15-20+ reps per exercise
- Use supersets, tri-sets, and drop sets liberally
- Prioritize maintaining heart rate elevation
- Keep workout fast-paced with minimal downtime`);
  }

  // Strength-focused instructions
  if (styles.includes('strength_focused')) {
    instructions.push(`
STRENGTH TRAINING RULES:
- Use straight sets only (no supersets)
- 4-6 reps with heavy weight
- 2-4 minutes rest between sets for full ATP recovery
- Prioritize compound movements (squat, deadlift, bench, row, press)
- Focus on progressive overload`);
  }

  // Blend instructions when 2 styles selected
  if (styles.length === 2) {
    const [styleA, styleB] = styles;
    const paramsA = TRAINING_STYLE_PARAMS[styleA];
    const paramsB = TRAINING_STYLE_PARAMS[styleB];
    const nameA = paramsA?.name || styleA;
    const nameB = paramsB?.name || styleB;

    instructions.push(`
BLENDING ${nameA.toUpperCase()} + ${nameB.toUpperCase()}:
- Distribute exercises roughly 50/50 between the two styles
- First half of workout: Use ${nameA} parameters (sets: ${paramsA?.sets?.min}-${paramsA?.sets?.max}, reps: ${paramsA?.reps?.min}-${paramsA?.reps?.max})
- Second half of workout: Use ${nameB} parameters (sets: ${paramsB?.sets?.min}-${paramsB?.sets?.max}, reps: ${paramsB?.reps?.min}-${paramsB?.reps?.max})
- Compound movements can take one style, isolation/accessory movements take the other`);
  }

  return instructions.join('\n');
}

/**
 * Builds the workout generation prompt for the LLM
 */
export function buildWorkoutPrompt(request, exerciseList, scenario) {
  // Support both old and new format
  const trainingStyles = request.trainingStyles || [request.trainingStyle];
  const primaryStyle = trainingStyles[0];
  const secondaryStyle = trainingStyles[1] || null;

  const styleParams = TRAINING_STYLE_PARAMS[primaryStyle];
  const styleName = styleParams?.name || primaryStyle;
  const styleDesc = styleParams?.description || '';

  const advancedTechSection = styleParams?.advancedTechniques?.length > 0
    ? `\nAdvanced Techniques for ${styleName}: ${styleParams.advancedTechniques.join(', ')}`
    : '';

  // Get style-specific critical instructions
  const styleSpecificInstructions = getStyleSpecificInstructions(primaryStyle, trainingStyles);

  let prompt = `You are a professional fitness trainer creating a personalized workout.

USER PROFILE:
- Goal: ${request.goal}
- Experience: ${request.experienceLevel}
- Training Style: ${styleName}${styleDesc ? ` (${styleDesc})` : ''}${secondaryStyle ? ` + ${TRAINING_STYLE_PARAMS[secondaryStyle]?.name || secondaryStyle}` : ''}
- Target Duration: ${request.duration} minutes
- Body Parts: ${request.bodyParts.join(', ')}
- Target Muscles: ${request.targetMuscles?.length ? request.targetMuscles.join(', ') : 'any'}
- Available Equipment: ${request.equipment.length > 0 ? request.equipment.join(', ') : 'body weight only'}

TRAINING STYLE PARAMETERS (${styleName}):
- Sets: ${styleParams?.sets ? `${styleParams.sets.min}-${styleParams.sets.max}` : '3-4'}
- Reps: ${styleParams?.reps ? `${styleParams.reps.min}-${styleParams.reps.max}` : '8-12'}
- Rest: ${styleParams?.rest ? `${styleParams.rest.min}-${styleParams.rest.max}s` : '60-90s'}${advancedTechSection}
${styleSpecificInstructions}`;

  // Handle blended styles in instructions (when 2 styles selected)
  if (secondaryStyle) {
    const secondary = TRAINING_STYLE_PARAMS[secondaryStyle];
    prompt += `

## Blended Training Approach
Primary style for compound movements: ${styleParams.name}
- Sets: ${styleParams.sets.min}-${styleParams.sets.max}, Reps: ${styleParams.reps.min}-${styleParams.reps.max}, Rest: ${styleParams.rest.min}-${styleParams.rest.max}s

Secondary style for isolation/accessory movements: ${secondary.name}
- Sets: ${secondary.sets.min}-${secondary.sets.max}, Reps: ${secondary.reps.min}-${secondary.reps.max}, Rest: ${secondary.rest.min}-${secondary.rest.max}s

Apply the primary style parameters to the first 2-3 compound exercises.
Apply the secondary style parameters to remaining isolation exercises.
`;
  }

  prompt += `

CRITICAL EQUIPMENT RULE:
- User's equipment: ${request.equipment.length > 0 ? request.equipment.join(', ') : 'body weight only'}
- You MUST ONLY select exercises that use the user's available equipment
- Body weight exercises are ONLY allowed if user explicitly listed "body weight"

AVAILABLE EXERCISES (pick from these ONLY):
${JSON.stringify(exerciseList, null, 2)}`;

  // Add split and dayFocus context to prompt when scenario is provided
  if (scenario?.split && scenario?.dayFocus) {
    prompt += `

## Workout Context
Split: ${scenario.split.replace(/_/g, ' ').toUpperCase()}
Day Focus: ${scenario.dayFocus}
`;
  }

  prompt += `

Create a workout program. Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "title": "Workout title",
  "description": "Brief description",
  "estimatedDuration": ${request.duration},
  "sections": [
    {
      "name": "Section name",
      "exercises": [
        {
          "id": "exercise id from the list",
          "sets": 3,
          "reps": "10-12",
          "restSeconds": 60,
          "notes": "Optional tips or technique notes"
        }
      ]
    }
  ],
  "tips": ["Tip 1", "Tip 2"]
}

IMPORTANT GUIDELINES:
1. Select 4-8 exercises based on duration
2. ALL exercises MUST match user's equipment exactly
3. Follow the training style parameters for sets/reps/rest
4. Group exercises logically into sections
5. Include relevant tips for the training style
6. For ${request.experienceLevel} level, ensure appropriate exercise selection`;

  return prompt;
}

/**
 * Filters exercises from MOCK_EXERCISES based on scenario requirements
 */
export function filterExercisesForScenario(scenario) {
  const equipment = scenario.request.equipment;

  // Use DAY_FOCUS_MAPPING if scenario has dayFocus, otherwise use request values
  let bodyParts = scenario.request.bodyParts;
  let targetMuscles = scenario.request.targetMuscles;

  if (scenario.dayFocus && DAY_FOCUS_MAPPING[scenario.dayFocus]) {
    const mapping = DAY_FOCUS_MAPPING[scenario.dayFocus];
    bodyParts = mapping.bodyParts;
    targetMuscles = mapping.targetMuscles;
  }

  return MOCK_EXERCISES.filter(ex => {
    // Equipment match
    const equipmentMatch = equipment.some(eq => {
      const eqLower = eq.toLowerCase();
      const exEquipLower = ex.equipment.toLowerCase();
      return exEquipLower.includes(eqLower) ||
        (eqLower === 'body weight' && exEquipLower === 'body weight') ||
        (eqLower === 'resistance band' && exEquipLower === 'band') ||
        (eqLower === 'band' && exEquipLower === 'band');
    });

    if (!equipmentMatch) return false;

    // Body part match (if specified and not full_body)
    if (bodyParts.includes('full_body')) return true;

    const bodyPartMatch = bodyParts.some(bp => {
      const bpLower = bp.toLowerCase();
      return ex.bodyPart.toLowerCase() === bpLower ||
        (bpLower === 'legs' && (ex.bodyPart === 'upper legs' || ex.bodyPart === 'lower legs')) ||
        (bpLower === 'arms' && ex.bodyPart === 'upper arms');
    });

    if (!bodyPartMatch) return false;

    // Target muscle match - CRITICAL: prevents wrong muscles (e.g., biceps on chest+triceps day)
    // If targetMuscles specified, exercise.target must be in the list
    if (targetMuscles && targetMuscles.length > 0) {
      const targetLower = targetMuscles.map(t => t.toLowerCase());
      const exTargetLower = ex.target.toLowerCase();
      if (!targetLower.includes(exTargetLower)) {
        return false;
      }
    }

    return true;
  }).map(ex => ({
    id: ex.id,
    name: ex.name,
    target: ex.target,
    equipment: ex.equipment,
    difficulty: ex.difficulty,
  }));
}
