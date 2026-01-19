import { useState, useEffect } from 'react'
import { User, RotateCcw } from 'lucide-react'
import { Legend } from './Legend'
import { LevelPickerModal } from './LevelPickerModal'
import { useMuscleStrength } from './useMuscleStrength'
import { getAllSchemes } from '../../theme/color-schemes/index.js'

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

// Level definitions with colors (cool→warm spectrum for intuitive progression)
const LEVELS = [
  { id: 'beginner', label: 'Beginner', color: '#94A3B8' },      // Slate grey - starting point
  { id: 'novice', label: 'Novice', color: '#38BDF8' },          // Sky blue - early progress
  { id: 'intermediate', label: 'Intermediate', color: '#4ADE80' }, // Green - solid foundation
  { id: 'advanced', label: 'Advanced', color: '#FACC15' },      // Yellow - heating up
  { id: 'elite', label: 'Elite', color: '#FB923C' },            // Orange - high performance
  { id: 'worldClass', label: 'World Class', color: '#F43F5E' }  // Rose/Red - peak mastery
]

const COLORS = {
  default: '#FFFFFF',
  hover: '#FE9CB2',
  background: '#F5F5F5'
}

export function MuscleMap() {
  const [frontSvg, setFrontSvg] = useState('')
  const [backSvg, setBackSvg] = useState('')
  const { muscleLevels, loading, setMuscleLevel, clearAll } = useMuscleStrength()
  const [selectedMuscleId, setSelectedMuscleId] = useState(null) // For modal

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

  // Generate dynamic CSS for muscle colors based on levels
  const dynamicStyles = Object.entries(muscleLevels)
    .map(([muscleId, levelId]) => {
      const levelData = LEVELS.find(l => l.id === levelId)
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

  // Get muscles grouped by level for display
  const musclesByLevel = LEVELS.reduce((acc, level) => {
    const muscles = Object.entries(muscleLevels)
      .filter(([, lvl]) => lvl === level.id)
      .map(([id]) => id)
    if (muscles.length > 0) {
      acc[level.id] = muscles
    }
    return acc
  }, {})

  const hasSelections = Object.keys(muscleLevels).length > 0

  return (
    <div className="space-y-6">
      {/* CSS for muscle colors - default + hover + dynamic level colors */}
      <style>{`
        .bodymap {
          color: ${COLORS.default};
          cursor: pointer;
        }
        .bodymap:hover {
          color: ${COLORS.hover} !important;
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

      {/* Gender toggle - MVP: Male only */}
      <div className="flex justify-center">
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium">
          <User className="w-4 h-4" />
          Male
        </button>
      </div>

      {/* Body maps */}
      <div className="flex justify-center gap-6">
        <div className="flex-1 max-w-md">
          <p className="text-center text-xs uppercase tracking-wider text-zinc-400 mb-3">Front</p>
          <div
            className="bg-gray-100 rounded-xl p-6"
            dangerouslySetInnerHTML={{ __html: frontSvg }}
            style={{ '--muscle-default': COLORS.default }}
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
      <Legend />

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
            {LEVELS.map(level => {
              const muscles = musclesByLevel[level.id]
              if (!muscles) return null

              return (
                <div key={level.id}>
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
  // Generate CSS for this scheme's colors
  const schemeStyles = Object.entries(sampleLevels)
    .map(([muscleId, levelIdx]) => {
      const level = scheme.levels[levelIdx]
      if (level) {
        return `#${muscleId} { color: ${level.color} !important; }`
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')

  const styleId = `scheme-${scheme.id}`

  return (
    <div className="bg-white rounded-xl p-3 border border-zinc-100 shadow-sm">
      <style>{`
        .${styleId} .bodymap { color: #FFFFFF; }
        .${styleId} ${schemeStyles}
      `}</style>

      <p className="text-xs font-semibold text-zinc-800 text-center mb-2">{scheme.name}</p>

      <div className={`${styleId} flex gap-1 justify-center`}>
        <div
          className="w-16 h-28 bg-zinc-50 rounded overflow-hidden flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: frontSvg }}
          style={{ transform: 'scale(0.35)', transformOrigin: 'center' }}
        />
        <div
          className="w-16 h-28 bg-zinc-50 rounded overflow-hidden flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: backSvg }}
          style={{ transform: 'scale(0.35)', transformOrigin: 'center' }}
        />
      </div>

      {/* Mini color bar */}
      <div className="flex gap-px mt-2">
        {scheme.levels.map((level) => (
          <div
            key={level.id}
            className="flex-1 h-2 first:rounded-l last:rounded-r"
            style={{ backgroundColor: level.color }}
          />
        ))}
      </div>
    </div>
  )
}

export default MuscleMap
