import { getAllSchemes } from '../../theme/color-schemes/index.js'

/**
 * Color Scheme Comparison
 * Displays all color schemes side by side for easy comparison
 */
export function ColorSchemeComparison() {
  const schemes = getAllSchemes()

  return (
    <div className="p-6 bg-white min-h-screen">
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">
        Muscle Level Color Schemes
      </h1>
      <p className="text-zinc-500 mb-8">
        {schemes.length} schemes available. Compare all at once.
      </p>

      {/* Grid of all schemes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schemes.map((scheme) => (
          <SchemeCard key={scheme.id} scheme={scheme} />
        ))}
      </div>

      {/* Quick comparison strip */}
      <div className="mt-12 p-6 bg-zinc-50 rounded-xl">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Side-by-Side Comparison (Tier 6 only)
        </h2>
        <div className="flex flex-wrap gap-4">
          {schemes.map((scheme) => (
            <div key={scheme.id} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: scheme.levels[5].color }}
              />
              <span className="text-sm text-zinc-600">{scheme.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SchemeCard({ scheme }) {
  return (
    <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-100">
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-bold text-zinc-900">{scheme.name}</h3>
        <p className="text-xs text-zinc-500 mt-1">{scheme.description}</p>
      </div>

      {/* Color swatches - horizontal progression */}
      <div className="flex gap-1 mb-4">
        {scheme.levels.map((level) => (
          <div
            key={level.id}
            className="flex-1 h-12 rounded-lg first:rounded-l-xl last:rounded-r-xl"
            style={{ backgroundColor: level.color }}
            title={`${level.label}: ${level.color}`}
          />
        ))}
      </div>

      {/* Level labels with colors */}
      <div className="space-y-2">
        {scheme.levels.map((level, idx) => (
          <div key={level.id} className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 w-4">{idx + 1}</span>
            <div
              className="w-4 h-4 rounded-full shrink-0"
              style={{ backgroundColor: level.color }}
            />
            <span className="text-xs text-zinc-700 flex-1">{level.label}</span>
            <code className="text-[10px] text-zinc-400 font-mono">
              {level.color}
            </code>
          </div>
        ))}
      </div>

      {/* Body preview simulation */}
      <div className="mt-4 pt-4 border-t border-zinc-200">
        <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-2">
          Body Preview
        </p>
        <div className="flex justify-center gap-2">
          {/* Simple body silhouette with colors */}
          <svg viewBox="0 0 60 100" className="w-16 h-24">
            {/* Head */}
            <circle cx="30" cy="12" r="8" fill={scheme.colors.default} />
            {/* Torso - chest */}
            <rect x="18" y="22" width="24" height="20" rx="3" fill={scheme.levels[4].color} />
            {/* Arms */}
            <rect x="8" y="24" width="8" height="22" rx="3" fill={scheme.levels[2].color} />
            <rect x="44" y="24" width="8" height="22" rx="3" fill={scheme.levels[2].color} />
            {/* Core */}
            <rect x="20" y="44" width="20" height="14" rx="2" fill={scheme.levels[1].color} />
            {/* Legs */}
            <rect x="18" y="60" width="10" height="28" rx="3" fill={scheme.levels[3].color} />
            <rect x="32" y="60" width="10" height="28" rx="3" fill={scheme.levels[3].color} />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default ColorSchemeComparison
