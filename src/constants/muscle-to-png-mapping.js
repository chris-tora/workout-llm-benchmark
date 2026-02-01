/**
 * Canonical mapping from ExerciseDB `target` and `secondary_muscles` values
 * to PNG asset slugs for the muscle overlay system.
 *
 * Covers all 19 unique `target` values and all 19 `secondary_muscles` values
 * (same set plus `levator scapulae`) from the exercises table.
 *
 * Asset directory structure:
 *   {basePath}/{view}/{slug}-{color}.png   (colored overlays)
 *   {basePath}/base-{view}.png             (base body silhouette)
 *   {basePath}/masks/{view}/{slug}.png     (alpha masks)
 *
 * Usage:
 *   import { MUSCLE_TO_PNGS, getMuscleOverlays, slugToPath } from '../constants/muscle-to-png-mapping'
 *
 *   // Get overlay layers for an exercise
 *   const { front, back } = getMuscleOverlays('pectorals', ['delts', 'triceps'])
 *
 *   // Resolve a single slug to its full asset path
 *   const path = slugToPath('chest-upper', 'front', 'red')
 *   // => '/assets/muscles/male/front/chest-upper-red.png'
 */

// ---------------------------------------------------------------------------
// MUSCLE_TO_PNGS
//
// Maps every ExerciseDB target/secondary_muscles value to its PNG file slugs.
// Each entry: { front: string[], back: string[] }
//
// Target values (19 from DB + 1 compound):
//   delts (288), quads (285), pectorals (182), lats (176), biceps (169),
//   abs (142), triceps (138), glutes (88), hamstrings (60), forearms (58),
//   calves (44), upper back (39), traps (30), adductors (14), abductors (10),
//   spine (6), serratus anterior (1), adductors to abs (1),
//   cardiovascular system (1)
//
// Secondary-only values:
//   levator scapulae
// ---------------------------------------------------------------------------

/** @type {Record<string, { front: string[], back: string[] }>} */
export const MUSCLE_TO_PNGS = {
  // --- Major muscle groups ---
  pectorals: {
    front: ['chest-upper', 'chest-lower'],
    back: [],
  },
  abs: {
    front: ['rectus-abdominis-upper', 'rectus-abdominis-lower'],
    back: [],
  },
  biceps: {
    front: ['biceps-long'],
    back: ['biceps-lower'],
  },
  triceps: {
    front: [],
    back: ['triceps-upper', 'triceps-lower', 'triceps-outer'],
  },
  forearms: {
    front: ['wrist-extensors'],
    back: ['wrist-flexors'],
  },
  quads: {
    front: ['quadriceps'],
    back: [],
  },
  hamstrings: {
    front: [],
    back: ['hamstrings'],
  },
  glutes: {
    front: [],
    back: ['gluteus'],
  },
  calves: {
    front: [],
    back: ['calves'],
  },
  traps: {
    front: [],
    back: ['trapezius'],
  },
  lats: {
    front: [],
    back: ['latissimus-dorsi'],
  },
  delts: {
    front: ['deltoids-front', 'deltoids-side'],
    back: ['deltoids-back'],
  },

  // --- Back / spine ---
  'upper back': {
    front: [],
    back: ['latissimus-dorsi'],
  },
  spine: {
    front: [],
    back: ['lower-back-copy'],
  },

  // --- Smaller / ancillary ---
  'serratus anterior': {
    front: ['obliques'],
    back: [],
  },
  'levator scapulae': {
    front: [],
    back: ['trapezius'],
  },

  // --- Hip ---
  abductors: {
    front: ['hip-adductors'],
    back: ['hip-adductors'],
  },
  adductors: {
    front: ['hip-adductors'],
    back: ['hip-adductors'],
  },

  // --- Compound target (1 exercise in DB) ---
  // "adductors to abs" targets both hip adductors and rectus abdominis
  'adductors to abs': {
    front: ['hip-adductors', 'rectus-abdominis-upper', 'rectus-abdominis-lower'],
    back: ['hip-adductors'],
  },

  // --- Cardio (no muscle overlay) ---
  'cardiovascular system': {
    front: [],
    back: [],
  },
}

// ---------------------------------------------------------------------------
// All unique PNG slugs present in the asset tree (for validation / preloading)
// ---------------------------------------------------------------------------

/** @type {{ front: string[], back: string[] }} */
export const ALL_SLUGS = {
  front: [
    'biceps-long',
    'chest-lower',
    'chest-upper',
    'deltoids-front',
    'deltoids-side',
    'hip-adductors',
    'obliques',
    'quadriceps',
    'rectus-abdominis-lower',
    'rectus-abdominis-upper',
    'wrist-extensors',
  ],
  back: [
    'biceps-lower',
    'calves',
    'deltoids-back',
    'gluteus',
    'hamstrings',
    'hip-adductors',
    'latissimus-dorsi',
    'lower-back-copy',
    'trapezius',
    'triceps-lower',
    'triceps-outer',
    'triceps-upper',
    'wrist-flexors',
  ],
}

// ---------------------------------------------------------------------------
// SLUG_TO_PATH
// ---------------------------------------------------------------------------

/** Default base path matching the public asset directory */
const DEFAULT_BASE_PATH = '/assets/muscles/male'

/**
 * Resolve a PNG slug + view + color to a full asset path.
 *
 * @param {string} slug    - e.g. 'chest-upper'
 * @param {'front'|'back'} view  - body view
 * @param {'red'|'purple'} color - overlay tint color
 * @param {string} [basePath]    - override base asset directory
 * @returns {string} Full path, e.g. '/assets/muscles/male/front/chest-upper-red.png'
 *
 * @example
 *   slugToPath('chest-upper', 'front', 'red')
 *   // => '/assets/muscles/male/front/chest-upper-red.png'
 *
 *   slugToPath('trapezius', 'back', 'purple', '/cdn/muscles')
 *   // => '/cdn/muscles/back/trapezius-purple.png'
 */
export function slugToPath(slug, view, color, basePath = DEFAULT_BASE_PATH) {
  return `${basePath}/${view}/${slug}-${color}.png`
}

/**
 * Get the base body silhouette path for a view.
 *
 * @param {'front'|'back'} view
 * @param {string} [basePath]
 * @returns {string} e.g. '/assets/muscles/male/base-front.png'
 */
export function basePath(view, base = DEFAULT_BASE_PATH) {
  return `${base}/base-${view}.png`
}

/**
 * Get the alpha mask path for a slug.
 *
 * @param {string} slug
 * @param {'front'|'back'} view
 * @param {string} [base]
 * @returns {string} e.g. '/assets/muscles/male/masks/front/chest-upper.png'
 */
export function maskPath(slug, view, base = DEFAULT_BASE_PATH) {
  return `${base}/masks/${view}/${slug}.png`
}

// ---------------------------------------------------------------------------
// Lookup helper
// ---------------------------------------------------------------------------

/**
 * Look up a muscle name in MUSCLE_TO_PNGS (case-insensitive, trimmed).
 * Returns { front: [], back: [] } for unknown muscles.
 *
 * @param {string|null|undefined} muscleName
 * @returns {{ front: string[], back: string[] }}
 */
export function mapToPngs(muscleName) {
  const key = muscleName?.toLowerCase().trim()
  return MUSCLE_TO_PNGS[key] ?? { front: [], back: [] }
}

// ---------------------------------------------------------------------------
// getMuscleOverlays
// ---------------------------------------------------------------------------

/**
 * Build ready-to-render overlay layer arrays for front and back body views.
 *
 * Primary target muscles get 'red' overlays; secondary muscles get 'purple'.
 * If a slug appears in both primary and secondary, primary (red) wins.
 *
 * Each layer object: { slug, color, path }
 *   - slug:  PNG file slug (e.g. 'chest-upper')
 *   - color: 'red' | 'purple'
 *   - path:  full resolved asset path
 *
 * @param {string} target             - ExerciseDB target value (e.g. 'pectorals')
 * @param {string[]} [secondaryMuscles=[]] - ExerciseDB secondary_muscles array
 * @param {string} [baseAssetPath]    - Override base asset directory
 * @returns {{ front: Array<{slug: string, color: string, path: string}>, back: Array<{slug: string, color: string, path: string}> }}
 *
 * @example
 *   const { front, back } = getMuscleOverlays('pectorals', ['delts', 'triceps'])
 *
 *   // front =>
 *   // [
 *   //   { slug: 'deltoids-front', color: 'purple', path: '/assets/muscles/male/front/deltoids-front-purple.png' },
 *   //   { slug: 'deltoids-side',  color: 'purple', path: '/assets/muscles/male/front/deltoids-side-purple.png' },
 *   //   { slug: 'chest-upper',    color: 'red',    path: '/assets/muscles/male/front/chest-upper-red.png' },
 *   //   { slug: 'chest-lower',    color: 'red',    path: '/assets/muscles/male/front/chest-lower-red.png' },
 *   // ]
 *   //
 *   // back =>
 *   // [
 *   //   { slug: 'deltoids-back',   color: 'purple', path: '...deltoids-back-purple.png' },
 *   //   { slug: 'triceps-upper',   color: 'purple', path: '...triceps-upper-purple.png' },
 *   //   { slug: 'triceps-lower',   color: 'purple', path: '...triceps-lower-purple.png' },
 *   //   { slug: 'triceps-outer',   color: 'purple', path: '...triceps-outer-purple.png' },
 *   // ]
 */
export function getMuscleOverlays(target, secondaryMuscles = [], baseAssetPath = DEFAULT_BASE_PATH) {
  const front = []
  const back = []
  const seenFront = new Set()
  const seenBack = new Set()

  // Secondary muscles first (purple) -- primary will overwrite if overlapping
  for (const name of secondaryMuscles) {
    const pngs = mapToPngs(name)
    for (const slug of pngs.front) {
      if (!seenFront.has(slug)) {
        front.push({ slug, color: 'purple', path: slugToPath(slug, 'front', 'purple', baseAssetPath) })
        seenFront.add(slug)
      }
    }
    for (const slug of pngs.back) {
      if (!seenBack.has(slug)) {
        back.push({ slug, color: 'purple', path: slugToPath(slug, 'back', 'purple', baseAssetPath) })
        seenBack.add(slug)
      }
    }
  }

  // Primary target (red) -- overwrites secondary if same slug
  const primaryPngs = mapToPngs(target)
  for (const slug of primaryPngs.front) {
    const idx = front.findIndex((l) => l.slug === slug)
    const layer = { slug, color: 'red', path: slugToPath(slug, 'front', 'red', baseAssetPath) }
    if (idx >= 0) {
      front[idx] = layer
    } else {
      front.push(layer)
    }
    seenFront.add(slug)
  }
  for (const slug of primaryPngs.back) {
    const idx = back.findIndex((l) => l.slug === slug)
    const layer = { slug, color: 'red', path: slugToPath(slug, 'back', 'red', baseAssetPath) }
    if (idx >= 0) {
      back[idx] = layer
    } else {
      back.push(layer)
    }
    seenBack.add(slug)
  }

  return { front, back }
}
