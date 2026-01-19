/**
 * Color Schemes Index
 * All muscle level tier color schemes for the fitness app
 */

import { FIRE_EMBER } from './fire-ember.js'
import { METALLIC } from './metallic.js'
import { COSMIC } from './cosmic.js'
import { MONOCHROME_GOLD } from './monochrome-gold.js'
import { CRIMSON_PURPLE } from './crimson-purple.js'
import { SUNSET } from './sunset.js'
import { OCEAN_DEPTH } from './ocean-depth.js'
import { VOLCANIC } from './volcanic.js'
import { AURORA } from './aurora.js'

// Registry of all available color schemes
export const COLOR_SCHEMES = {
  'fire-ember': FIRE_EMBER,
  'metallic': METALLIC,
  'cosmic': COSMIC,
  'monochrome-gold': MONOCHROME_GOLD,
  'crimson-purple': CRIMSON_PURPLE,
  'sunset': SUNSET,
  'ocean-depth': OCEAN_DEPTH,
  'volcanic': VOLCANIC,
  'aurora': AURORA,
}

// Default scheme
export const DEFAULT_SCHEME = 'fire-ember'

// Get a specific scheme by ID
export function getColorScheme(id) {
  return COLOR_SCHEMES[id] || COLOR_SCHEMES[DEFAULT_SCHEME]
}

// Get all schemes as array
export function getAllSchemes() {
  return Object.values(COLOR_SCHEMES)
}

// Convert scheme levels to hex color map (for body SVG)
export function schemeLevelsToColors(scheme, muscleLevels) {
  const colors = {}
  for (const [muscleId, levelId] of Object.entries(muscleLevels)) {
    const level = scheme.levels.find(l => l.id === levelId)
    if (level) {
      colors[muscleId] = level.color
    }
  }
  return colors
}

// Export individual schemes
export {
  FIRE_EMBER,
  METALLIC,
  COSMIC,
  MONOCHROME_GOLD,
  CRIMSON_PURPLE,
  SUNSET,
  OCEAN_DEPTH,
  VOLCANIC,
  AURORA,
}
