import { useState, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { mapToPngs } from '../../constants/muscle-to-png-mapping'
import { PngBodyMap } from './PngBodyMap'

const supabaseUrl = 'https://ivfllbccljoyaayftecd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZmxsYmNjbGpveWFheWZ0ZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjExOTAxNCwiZXhwIjoyMDgxNjk1MDE0fQ.0-GD_WvgZlCOMFThc-4mLMS80GE5wLKFetHe_X_ovUc'
const supabase = createClient(supabaseUrl, supabaseKey)

function toTitleCase(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ExerciseTargetMap() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)

  // Debounced exercise search
  useEffect(() => {
    if (search.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('exercises')
        .select('id, name, target, secondary_muscles, equipment, bodypart')
        .ilike('name', `%${search}%`)
        .or('is_hidden.is.null,is_hidden.eq.false')
        .order('name')
        .limit(20)
      setResults(data || [])
      setSearching(false)
      setShowDropdown(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const selectExercise = useCallback((ex) => {
    setSelected(ex)
    setSearch('')
    setShowDropdown(false)
  }, [])

  const clearSelection = useCallback(() => {
    setSelected(null)
    setSearch('')
  }, [])

  const hasPrimary = selected && mapToPngs(selected.target).front.length + mapToPngs(selected.target).back.length > 0
  const hasSecondary = selected && (selected.secondary_muscles || []).length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-900">Exercise Target Map</h2>
        <p className="text-zinc-500 mt-1">
          Search for an exercise to see primary (red) and secondary (purple) target muscles
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search exercises..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
          />
          {(search || selected) && (
            <button
              onClick={clearSelection}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && results.length > 0 && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
            <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {results.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => selectExercise(ex)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0"
                >
                  <span className="font-medium text-zinc-800">{toTitleCase(ex.name)}</span>
                  <span className="block text-xs text-zinc-400 mt-0.5">
                    {ex.target} &middot; {ex.equipment}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        {searching && (
          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-zinc-200 rounded-lg shadow-lg p-3 text-center text-sm text-zinc-400">
            Searching...
          </div>
        )}
      </div>

      {/* Selected exercise info badge */}
      {selected && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-5 py-3 shadow-sm">
            <div>
              <span className="font-semibold text-zinc-900 text-sm">{toTitleCase(selected.name)}</span>
              <span className="block text-xs text-zinc-400 mt-0.5">
                Target: {selected.target} &middot; Equipment: {selected.equipment}
              </span>
            </div>
            <button
              onClick={clearSelection}
              className="text-zinc-400 hover:text-zinc-600 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Body maps - PngBodyMap handles all layer resolution */}
      <PngBodyMap
        target={selected?.target}
        secondaryMuscles={selected?.secondary_muscles}
      />

      {/* Legend */}
      {selected && (
        <div className="flex justify-center gap-6">
          {hasPrimary && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#DC2626' }} />
              <span className="text-sm text-zinc-600">Primary ({selected.target})</span>
            </div>
          )}
          {hasSecondary && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7C3AED' }} />
              <span className="text-sm text-zinc-600">
                Secondary ({(selected.secondary_muscles || []).join(', ')})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!selected && (
        <div className="text-center text-zinc-400 text-sm py-4">
          Search and select an exercise above to see which muscles it targets
        </div>
      )}
    </div>
  )
}

export default ExerciseTargetMap
