import { useState, useEffect } from 'react'
import { User, RotateCcw, ChevronDown } from 'lucide-react'
import { Legend } from './Legend'
import { LevelPickerModal } from './LevelPickerModal'
import { useMuscleStrength } from './useMuscleStrength'
import { getAllSchemes, getColorScheme, DEFAULT_SCHEME } from '../../theme/color-schemes/index.js'

// Muscle names mapping - supports both basic and advanced muscle IDs
const MUSCLE_NAMES = {
  // Basic muscle groups
  'calves': 'Calves',
  'quads': 'Quadriceps',
  'abdominals': 'Abdominals',
  'obliques': 'Obliques',
  'hands': 'Hands',
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
  'traps-middle': 'Mid Traps',
  'rear-shoulders': 'Rear Delts',
  'shoulders': 'Shoulders',

  // Advanced muscle subdivisions - Front
  'groin': 'Groin',
  'upper-abdominals': 'Upper Abs',
  'lower-abdominals': 'Lower Abs',
  'gastrocnemius': 'Gastrocnemius',
  'tibialis': 'Tibialis',
  'soleus': 'Soleus',
  'outer-quadricep': 'Outer Quad',
  'rectus-femoris': 'Rectus Femoris',
  'inner-quadricep': 'Inner Quad',
  'inner-thigh': 'Inner Thigh',
  'wrist-flexors': 'Wrist Flexors',
  'wrist-extensors': 'Wrist Extensors',
  'short-head-bicep': 'Bicep Short Head',
  'long-head-bicep': 'Bicep Long Head',
  'mid-lower-pectoralis': 'Mid/Lower Chest',
  'upper-pectoralis': 'Upper Chest',
  'anterior-deltoid': 'Front Delt',
  'lateral-deltoid': 'Side Delt',
  'upper-trapzeius': 'Upper Traps',

  // Advanced muscle subdivisions - Back
  'upper-trapezius': 'Upper Traps',
  'medial-hamstrings': 'Medial Hamstrings',
  'lateral-hamstrings': 'Lateral Hamstrings',
  'gluteus-maximus': 'Glute Max',
  'gluteus-medius': 'Glute Med',
  'medial-head-triceps': 'Tricep Medial',
  'long-head-triceps': 'Tricep Long Head',
  'later-head-triceps': 'Tricep Lateral',
  'posterior-deltoid': 'Rear Delt',
  'lower-trapezius': 'Lower Traps'
}

export function MuscleMap() {
  const [frontSvg, setFrontSvg] = useState('')
  const [backSvg, setBackSvg] = useState('')
  const { muscleLevels, loading, setMuscleLevel, clearAll } = useMuscleStrength()
  const [selectedMuscleId, setSelectedMuscleId] = useState(null) // For modal
  const [selectedSchemeId, setSelectedSchemeId] = useState(DEFAULT_SCHEME)
  const [schemeDropdownOpen, setSchemeDropdownOpen] = useState(false)
  const allSchemes = getAllSchemes()
  const currentScheme = getColorScheme(selectedSchemeId)

  useEffect(() => {
    // Load SVGs
    fetch('/assets/front-body.svg')
      .then(r => r.text())
      .then(setFrontSvg)
    fetch('/assets/back-body.svg')
      .then(r => r.text())
      .then(setBackSvg)
  }, [])

  // Handle clicks on muscle groups using event delegation
  const handleBodyMapClick = (e) => {
    const group = e.target.closest('.bodymap')
    if (group) {
      setSelectedMuscleId(group.id) // Open modal
    }
  }

  // Generate dynamic CSS for muscle colors based on levels (using current scheme)
  // Note: muscleLevels stores numeric indices (0-5), not string IDs
  const dynamicStyles = Object.entries(muscleLevels)
    .map(([muscleId, levelIdx]) => {
      const levelData = currentScheme.levels[levelIdx]
      if (levelData) {
        return `#${muscleId} { color: ${levelData.color} !important; }`
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')

  const clearSelection = () => clearAll()

  // Handle level selection from modal
  const handleLevelSelect = (muscleId, levelId) => {
    setMuscleLevel(muscleId, levelId)
  }

  // Open modal for a muscle (used by badge click)
  const openMuscleModal = (muscleId) => {
    setSelectedMuscleId(muscleId)
  }

  // Get muscles grouped by level for display (using current scheme)
  // Note: muscleLevels stores numeric indices (0-5)
  const musclesByLevel = currentScheme.levels.reduce((acc, level, idx) => {
    const muscles = Object.entries(muscleLevels)
      .filter(([, levelIdx]) => levelIdx === idx)
      .map(([id]) => id)
    if (muscles.length > 0) {
      acc[idx] = muscles
    }
    return acc
  }, {})

  const hasSelections = Object.keys(muscleLevels).length > 0

  return (
    <div className="space-y-6">
      {/* CSS for muscle colors - default + hover + dynamic level colors */}
      <style>{`
        .bodymap {
          color: ${currentScheme.colors.default};
          cursor: pointer;
        }
        .bodymap:hover {
          color: ${currentScheme.colors.hover} !important;
        }
        ${dynamicStyles}
      `}</style>

      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-900">Muscle Map Selector</h2>
        <p className="text-zinc-500 mt-1">Click muscles to set strength level. Extracted from MuscleWiki.</p>
      </div>

      {loading && (
        <div className="text-center text-zinc-400 text-sm">Loading saved data...</div>
      )}

      {/* Controls row: Gender + Scheme selector */}
      <div className="flex justify-center gap-3">
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium">
          <User className="w-4 h-4" />
          Male
        </button>

        {/* Color scheme selector with preview */}
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
              {/* Backdrop to close dropdown */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setSchemeDropdownOpen(false)}
              />
              {/* Dropdown panel */}
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

      {/* Body maps */}
      <div className="flex justify-center gap-6">
        <div className="flex-1 max-w-md">
          <p className="text-center text-xs uppercase tracking-wider text-zinc-400 mb-3">Front</p>
          <div
            className="bg-gray-100 rounded-xl p-6"
            dangerouslySetInnerHTML={{ __html: frontSvg }}
            onClick={handleBodyMapClick}
          />
        </div>
        <div className="flex-1 max-w-md">
          <p className="text-center text-xs uppercase tracking-wider text-zinc-400 mb-3">Back</p>
          <div
            className="bg-gray-100 rounded-xl p-6"
            dangerouslySetInnerHTML={{ __html: backSvg }}
            onClick={handleBodyMapClick}
          />
        </div>
      </div>

      {/* Level Legend - below body maps, above panel */}
      <Legend levels={currentScheme.levels} />

      {/* Muscle Levels panel */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="font-medium text-zinc-900">Muscle Levels</span>
          <button
            onClick={clearSelection}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-500 transition-colors"
            disabled={!hasSelections}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All
          </button>
        </div>

        {!hasSelections ? (
          <span className="text-zinc-400 text-sm">Click on muscle groups to assign strength levels</span>
        ) : (
          <div className="space-y-3">
            {currentScheme.levels.map((level, idx) => {
              const muscles = musclesByLevel[idx]
              if (!muscles) return null

              return (
                <div key={idx}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: level.color }}
                    />
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      {level.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {muscles.map(id => (
                      <button
                        key={id}
                        onClick={() => openMuscleModal(id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-full text-sm hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: level.color }}
                      >
                        {MUSCLE_NAMES[id] || id}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Level Picker Modal */}
      <LevelPickerModal
        muscleId={selectedMuscleId}
        muscleName={MUSCLE_NAMES[selectedMuscleId] || selectedMuscleId}
        currentLevel={muscleLevels[selectedMuscleId] || null}
        onSelect={handleLevelSelect}
        onClose={() => setSelectedMuscleId(null)}
        levels={currentScheme.levels}
      />

      {/* Color Scheme Comparison - All schemes at once */}
      <ColorSchemeGallery />
    </div>
  )
}

/**
 * Color Scheme Gallery - displays all schemes applied to body SVGs
 */
function ColorSchemeGallery() {
  const schemes = getAllSchemes()
  const [frontSvg, setFrontSvg] = useState('')
  const [backSvg, setBackSvg] = useState('')

  useEffect(() => {
    fetch('/assets/front-body.svg')
      .then(r => r.text())
      .then(setFrontSvg)
    fetch('/assets/back-body.svg')
      .then(r => r.text())
      .then(setBackSvg)
  }, [])

  // Sample muscle levels to demonstrate each scheme
  const sampleLevels = {
    'chest': 4,           // elite
    'front-shoulders': 3, // advanced
    'biceps': 2,          // intermediate
    'quads': 1,           // beginner
    'abdominals': 0,      // novice
    'lats': 4,
    'traps': 3,
    'triceps': 2,
    'glutes': 3,
    'hamstrings': 2,
    'calves': 1,
    'forearms': 1,
    'rear-shoulders': 2,
    'lowerback': 1,
  }

  return (
    <div className="mt-12 pt-8 border-t border-zinc-200">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-zinc-900">Color Scheme Options</h2>
        <p className="text-zinc-500 text-sm mt-1">
          {schemes.length} schemes - applied to body for comparison
        </p>
      </div>

      {/* Grid of body previews with each scheme */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schemes.map((scheme) => (
          <SchemeBodyPreview
            key={scheme.id}
            scheme={scheme}
            frontSvg={frontSvg}
            backSvg={backSvg}
            sampleLevels={sampleLevels}
          />
        ))}
      </div>

      {/* Color swatches below */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {schemes.map((scheme) => (
          <div key={scheme.id} className="bg-white rounded-lg p-3 border border-zinc-100">
            <p className="text-xs font-medium text-zinc-700 mb-2">{scheme.name}</p>
            <div className="flex gap-0.5">
              {scheme.levels.map((level) => (
                <div
                  key={level.id}
                  className="flex-1 h-6 first:rounded-l last:rounded-r relative group"
                  style={{ backgroundColor: level.color }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
                    {level.color}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Body preview with a specific color scheme applied
 */
function SchemeBodyPreview({ scheme, frontSvg, backSvg, sampleLevels }) {
  const styleId = `scheme-${scheme.id}`

  // Generate CSS for this scheme's colors - SCOPED to .styleId to prevent leaking
  const schemeStyles = Object.entries(sampleLevels)
    .map(([muscleId, levelIdx]) => {
      const level = scheme.levels[levelIdx]
      if (level) {
        return `.${styleId} #${muscleId} { color: ${level.color} !important; }`
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')

  return (
    <div className="bg-white rounded-xl p-6 border border-zinc-100 shadow-sm">
      <style>{`
        .${styleId} .bodymap { color: #FFFFFF; }
        ${schemeStyles}
      `}</style>

      <p className="text-sm font-semibold text-zinc-800 text-center mb-3">{scheme.name}</p>

      <div className={`${styleId} flex gap-2 justify-center`}>
        <div
          className="w-32 h-48 bg-zinc-50 rounded overflow-hidden flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: frontSvg }}
          style={{ transform: 'scale(0.55)', transformOrigin: 'center' }}
        />
        <div
          className="w-32 h-48 bg-zinc-50 rounded overflow-hidden flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: backSvg }}
          style={{ transform: 'scale(0.55)', transformOrigin: 'center' }}
        />
      </div>

      {/* Mini color bar */}
      <div className="flex gap-px mt-3">
        {scheme.levels.map((level) => (
          <div
            key={level.id}
            className="flex-1 h-4 first:rounded-l last:rounded-r"
            style={{ backgroundColor: level.color }}
          />
        ))}
      </div>
    </div>
  )
}

export default MuscleMap
