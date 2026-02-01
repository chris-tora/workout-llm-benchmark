import { useState, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { PngBodyMap } from './PngBodyMap'
import { LevelPickerModal } from './LevelPickerModal'
import { useMuscleStrength } from './useMuscleStrength'
import { Legend } from './Legend'
import { getAllSchemes, getColorScheme, DEFAULT_SCHEME } from '../../theme/color-schemes/index.js'

/**
 * Bridging map from SVG muscle IDs (used in useMuscleStrength)
 * to PNG slugs (used in the PNG asset tree).
 *
 * Each entry: { front: string[], back: string[] }
 * "hands" has no PNG representation and is intentionally omitted.
 */
const SVG_TO_PNG_MAP = {
  'chest':           { front: ['chest-upper', 'chest-lower'],                    back: [] },
  'front-shoulders': { front: ['deltoids-front', 'deltoids-side'],               back: [] },
  'biceps':          { front: ['biceps-long'],                                   back: ['biceps-lower'] },
  'quads':           { front: ['quadriceps'],                                    back: [] },
  'abs-upper':       { front: ['rectus-abdominis-upper'],                        back: [] },
  'abs-lower':       { front: ['rectus-abdominis-lower'],                        back: [] },
  'obliques':        { front: ['obliques'],                                      back: [] },
  'forearms':        { front: ['wrist-extensors'],                               back: ['wrist-flexors'] },
  'lats':            { front: [],                                                back: ['latissimus-dorsi'] },
  'traps':           { front: [],                                                back: ['trapezius'] },
  'triceps':         { front: [],                                                back: ['triceps-upper', 'triceps-lower', 'triceps-outer'] },
  'glutes':          { front: [],                                                back: ['gluteus'] },
  'hamstrings':      { front: [],                                                back: ['hamstrings'] },
  'calves':          { front: [],                                                back: ['calves'] },
  'rear-shoulders':  { front: [],                                                back: ['deltoids-back'] },
  'lowerback':       { front: [],                                                back: ['lower-back-copy'] },
  'hip-adductors':   { front: ['hip-adductors'],                                 back: ['hip-adductors'] },
}

/**
 * Reverse mapping: PNG slug -> SVG muscle ID
 * Used to map clicks on PNG overlays back to muscle IDs for the modal.
 */
const PNG_SLUG_TO_MUSCLE_ID = {}
for (const [muscleId, { front, back }] of Object.entries(SVG_TO_PNG_MAP)) {
  for (const slug of [...front, ...back]) {
    PNG_SLUG_TO_MUSCLE_ID[slug] = muscleId
  }
}

/**
 * Human-readable muscle names for display in the modal.
 */
const MUSCLE_NAMES = {
  'calves': 'Calves',
  'quads': 'Quadriceps',
  'abs-upper': 'Upper Abs',
  'abs-lower': 'Lower Abs',
  'obliques': 'Obliques',
  'forearms': 'Forearms',
  'biceps': 'Biceps',
  'front-shoulders': 'Front Delts',
  'chest': 'Chest',
  'traps': 'Traps',
  'hamstrings': 'Hamstrings',
  'glutes': 'Glutes',
  'triceps': 'Triceps',
  'lats': 'Lats',
  'lowerback': 'Lower Back',
  'rear-shoulders': 'Rear Delts',
  'hip-adductors': 'Hip Adductors',
}

/**
 * Build the flat layers array for PngBodyMap from muscleLevels + scheme.
 *
 * @param {Record<string, number|string>} muscleLevels - SVG muscle ID -> level index (0-5) or tier name
 * @param {object} scheme - Color scheme object with .id and .levels[]
 * @returns {Array<{slug: string, view: 'front'|'back', color: string}>}
 */
function buildLayers(muscleLevels, scheme) {
  const layers = []

  for (const [muscleId, levelValue] of Object.entries(muscleLevels)) {
    const mapping = SVG_TO_PNG_MAP[muscleId]
    if (!mapping) continue

    // Handle both numeric indices (0-5) and string tier names ("novice", "pro", etc.)
    let levelData
    if (typeof levelValue === 'number') {
      levelData = scheme.levels[levelValue]
    } else if (typeof levelValue === 'string') {
      // Find by tier ID (e.g., "novice", "beginner", "intermediate", "pro", "advanced", "elite")
      levelData = scheme.levels.find(l => l.id === levelValue.toLowerCase())
    }
    if (!levelData) continue

    // color = "{schemeId}-{tierId}" e.g. "fire-ember-pro"
    const color = `${scheme.id}-${levelData.id}`

    for (const slug of mapping.front) {
      layers.push({ slug, view: 'front', color })
    }
    for (const slug of mapping.back) {
      layers.push({ slug, view: 'back', color })
    }
  }

  return layers
}

/**
 * PNG-based strength/expertise body map.
 *
 * Renders a PngBodyMap with colored overlays driven by useMuscleStrength data.
 * Includes a scheme selector dropdown and tier legend.
 * Supports interactive muscle selection via click.
 *
 * @param {object} props
 * @param {Record<string, number>} [props.muscleLevels] - External muscle levels (overrides hook)
 * @param {string} [props.schemeId] - Lock to a specific color scheme
 * @param {'sm'|'md'|'lg'} [props.size] - Body map size
 * @param {string} [props.className]
 */
export function PngStrengthMap({
  muscleLevels: externalLevels,
  schemeId: lockedSchemeId,
  size = 'md',
  className = '',
}) {
  const { muscleLevels: hookLevels, loading, setMuscleLevel } = useMuscleStrength()
  const [selectedSchemeId, setSelectedSchemeId] = useState(lockedSchemeId || DEFAULT_SCHEME)
  const [schemeDropdownOpen, setSchemeDropdownOpen] = useState(false)
  const [selectedMuscleId, setSelectedMuscleId] = useState(null)

  const allSchemes = getAllSchemes()
  const currentScheme = getColorScheme(selectedSchemeId)
  const muscleLevels = externalLevels || hookLevels

  const layers = useMemo(
    () => buildLayers(muscleLevels, currentScheme),
    [muscleLevels, currentScheme]
  )

  /**
   * Handle click on a PNG muscle overlay.
   * Maps the PNG slug to its SVG muscle ID and opens the modal.
   * @param {string} slug - The PNG overlay slug (e.g., 'chest-upper')
   * @param {string} view - 'front' or 'back' (unused, but passed by PngBodyMap)
   */
  const handleMuscleClick = (slug, view) => {
    const muscleId = PNG_SLUG_TO_MUSCLE_ID[slug]
    if (muscleId) {
      setSelectedMuscleId(muscleId)
    }
  }

  /**
   * Handle level selection from the modal.
   */
  const handleLevelSelect = (muscleId, levelIdx) => {
    setMuscleLevel(muscleId, levelIdx)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-900">Strength Map (PNG)</h2>
        <p className="text-zinc-500 mt-1">
          Click muscles to set strength level. PNG-layered body map.
        </p>
      </div>

      {loading && !externalLevels && (
        <div className="text-center text-zinc-400 text-sm">Loading saved data...</div>
      )}

      {/* Scheme selector */}
      {!lockedSchemeId && (
        <div className="flex justify-center">
          <div className="relative">
            <button
              onClick={() => setSchemeDropdownOpen(!schemeDropdownOpen)}
              className="flex items-center gap-3 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 cursor-pointer hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              <span>{currentScheme.name}</span>
              <div className="flex gap-px">
                {currentScheme.levels.map((level) => (
                  <div
                    key={level.id}
                    className="w-3 h-3 first:rounded-l last:rounded-r"
                    style={{ backgroundColor: level.color }}
                  />
                ))}
              </div>
              <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${schemeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {schemeDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setSchemeDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 min-w-[200px]">
                  {allSchemes.map((scheme) => (
                    <button
                      key={scheme.id}
                      onClick={() => {
                        setSelectedSchemeId(scheme.id)
                        setSchemeDropdownOpen(false)
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left hover:bg-zinc-50 transition-colors ${
                        scheme.id === selectedSchemeId ? 'bg-zinc-100 font-medium' : ''
                      }`}
                    >
                      <span className="text-zinc-700">{scheme.name}</span>
                      <div className="flex gap-px">
                        {scheme.levels.map((level) => (
                          <div
                            key={level.id}
                            className="w-3 h-3 first:rounded-l last:rounded-r"
                            style={{ backgroundColor: level.color }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Body map - interactive */}
      <PngBodyMap
        layers={layers}
        size={size}
        interactive={true}
        onMuscleClick={handleMuscleClick}
      />

      {/* Legend */}
      <Legend levels={currentScheme.levels} />

      {/* Level Picker Modal */}
      <LevelPickerModal
        muscleId={selectedMuscleId}
        muscleName={MUSCLE_NAMES[selectedMuscleId] || selectedMuscleId}
        currentLevel={muscleLevels[selectedMuscleId] ?? null}
        onSelect={handleLevelSelect}
        onClose={() => setSelectedMuscleId(null)}
        levels={currentScheme.levels}
      />
    </div>
  )
}

export default PngStrengthMap
