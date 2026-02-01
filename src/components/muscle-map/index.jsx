import { useState, useEffect } from 'react'
import { getAllSchemes } from '../../theme/color-schemes/index.js'
import { PngStrengthMap } from './PngStrengthMap'

export function MuscleMap() {
  return (
    <div className="space-y-6">
      <PngStrengthMap />
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
        {/* Outer container clips, inner container scales */}
        <div className="w-32 h-48 bg-zinc-50 rounded overflow-hidden relative">
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: 'scale(0.15)', transformOrigin: 'center' }}
            dangerouslySetInnerHTML={{ __html: frontSvg }}
          />
        </div>
        <div className="w-32 h-48 bg-zinc-50 rounded overflow-hidden relative">
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: 'scale(0.15)', transformOrigin: 'center' }}
            dangerouslySetInnerHTML={{ __html: backSvg }}
          />
        </div>
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
