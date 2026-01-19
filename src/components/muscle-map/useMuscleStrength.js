import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ivfllbccljoyaayftecd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZmxsYmNjbGpveWFheWZ0ZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTkwMTQsImV4cCI6MjA4MTY5NTAxNH0.714kFWsFFKwVAywLY5NOyZz2_eMoi7-Js8JGCwtpycs'

const supabase = createClient(supabaseUrl, supabaseKey)

// Default muscle levels for demo - ensures all 6 tiers are represented
// Tier progression: Novice → Beginner → Intermediate → Pro → Advanced → Elite
const DEFAULT_MUSCLE_LEVELS = {
  // Novice (0)
  'hands': 0,
  // Beginner (1)
  'forearms': 1,
  'calves': 1,
  // Intermediate (2)
  'biceps': 2,
  'triceps': 2,
  'obliques': 2,
  // Pro (3)
  'front-shoulders': 3,
  'rear-shoulders': 3,
  'quads': 3,
  'hamstrings': 3,
  // Advanced (4)
  'chest': 4,
  'lats': 4,
  'traps': 4,
  // Elite (5)
  'glutes': 5,
  'abdominals': 5,
  'lowerback': 5,
}

function getBrowserId() {
  const KEY = 'muscle-map-browser-id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}

export function useMuscleStrength() {
  const [muscleLevels, setMuscleLevels] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [browserId] = useState(getBrowserId)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('muscle_strength_profiles')
        .select('muscle_levels')
        .eq('browser_id', browserId)
        .single()

      if (data) {
        setMuscleLevels(data.muscle_levels || {})
      }
    } catch (e) {
      console.error('Failed to load muscle levels:', e)
    }
    setLoading(false)
  }, [browserId])

  const save = useCallback(async (newLevels) => {
    setSaving(true)
    setMuscleLevels(newLevels)

    try {
      const { error } = await supabase
        .from('muscle_strength_profiles')
        .upsert({
          browser_id: browserId,
          muscle_levels: newLevels,
          updated_at: new Date().toISOString()
        }, { onConflict: 'browser_id' })

      if (error) console.error('Failed to save:', error)
    } catch (e) {
      console.error('Failed to save muscle levels:', e)
    }
    setSaving(false)
  }, [browserId])

  const setMuscleLevel = useCallback((muscleId, levelId) => {
    const newLevels = levelId === null
      ? Object.fromEntries(Object.entries(muscleLevels).filter(([k]) => k !== muscleId))
      : { ...muscleLevels, [muscleId]: levelId }
    save(newLevels)
  }, [muscleLevels, save])

  const clearAll = useCallback(() => {
    save({})
  }, [save])

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('muscle_strength_profiles')
          .select('muscle_levels')
          .eq('browser_id', browserId)
          .single()

        if (!cancelled) {
          // Use saved data if exists, otherwise use defaults for demo
          const levels = data?.muscle_levels && Object.keys(data.muscle_levels).length > 0
            ? data.muscle_levels
            : DEFAULT_MUSCLE_LEVELS
          setMuscleLevels(levels)
        }
      } catch (e) {
        // No saved data - use defaults for demo
        if (!cancelled) {
          setMuscleLevels(DEFAULT_MUSCLE_LEVELS)
        }
      }
      if (!cancelled) {
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [browserId])

  return {
    muscleLevels,
    loading,
    saving,
    setMuscleLevel,
    clearAll,
    reload: load
  }
}
