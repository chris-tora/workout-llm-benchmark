import { useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ivfllbccljoyaayftecd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZmxsYmNjbGpveWFheWZ0ZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjExOTAxNCwiZXhwIjoyMDgxNjk1MDE0fQ.0-GD_WvgZlCOMFThc-4mLMS80GE5wLKFetHe_X_ovUc'

const supabase = createClient(supabaseUrl, supabaseKey)

const PAGE_SIZE = 50

export function useUncategorizedExercises() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [filterOptions, setFilterOptions] = useState(null)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch exercises that need attention:
  // 1. tier IS NULL (uncategorized)
  // 2. tier = 'excluded' AND instructions IS NULL (excluded without instructions)
  // 3. tier IS NOT NULL AND instructions IS NULL (categorized but no instructions)
  const fetchExercises = useCallback(async (filters, page = 0) => {
    setLoading(true)
    setError(null)

    try {
      // Determine which filter mode we're in
      const mode = filters.mode || 'all' // 'all', 'uncategorized', 'excluded_no_instructions', 'categorized_no_instructions'

      let query = supabase
        .from('exercises')
        .select('id, name, equipment, bodypart, target, tier, video_url, instructions', { count: 'exact' })

      if (mode === 'uncategorized') {
        query = query.is('tier', null)
      } else if (mode === 'excluded_no_instructions') {
        query = query.eq('tier', 'excluded').is('instructions', null)
      } else if (mode === 'categorized_no_instructions') {
        query = query.not('tier', 'is', null).is('instructions', null)
      } else {
        // 'all' mode: ALL exercises needing attention (tier IS NULL OR instructions IS NULL)
        query = query.or('tier.is.null,instructions.is.null')
      }

      // Additional filters
      if (filters.equipment) {
        query = query.eq('equipment', filters.equipment)
      }
      if (filters.bodyPart) {
        query = query.eq('bodypart', filters.bodyPart)
      }
      if (filters.target) {
        query = query.eq('target', filters.target)
      }
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      query = query
        .order('name', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      setExercises(data || [])
      setTotalCount(count || 0)

      return {
        exercises: data || [],
        totalCount: count || 0,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch exercises'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateTier = useCallback(async (id, tier) => {
    const { error: updateError } = await supabase
      .from('exercises')
      .update({ tier })
      .eq('id', id)

    if (updateError) throw updateError

    // Remove from list if now categorized (not null and not excluded without instructions)
    setExercises((prev) => prev.filter((ex) => ex.id !== id))
    setTotalCount((prev) => prev - 1)
  }, [])

  const bulkUpdateTiers = useCallback(async (ids, tier) => {
    const { error: updateError } = await supabase
      .from('exercises')
      .update({ tier })
      .in('id', ids)

    if (updateError) throw updateError

    // Remove all updated exercises from list
    setExercises((prev) => prev.filter((ex) => !ids.includes(ex.id)))
    setTotalCount((prev) => prev - ids.length)
  }, [])

  const fetchStats = useCallback(async () => {
    const [uncategorizedResult, excludedNoInstructionsResult, categorizedNoInstructionsResult] = await Promise.all([
      supabase.from('exercises').select('*', { count: 'exact', head: true }).is('tier', null),
      supabase.from('exercises').select('*', { count: 'exact', head: true }).eq('tier', 'excluded').is('instructions', null),
      supabase.from('exercises').select('*', { count: 'exact', head: true }).not('tier', 'is', null).is('instructions', null),
    ])

    if (uncategorizedResult.error) throw uncategorizedResult.error
    if (excludedNoInstructionsResult.error) throw excludedNoInstructionsResult.error
    if (categorizedNoInstructionsResult.error) throw categorizedNoInstructionsResult.error

    const result = {
      uncategorized: uncategorizedResult.count || 0,
      excludedNoInstructions: excludedNoInstructionsResult.count || 0,
      categorizedNoInstructions: categorizedNoInstructionsResult.count || 0,
      total: (uncategorizedResult.count || 0) + (excludedNoInstructionsResult.count || 0) + (categorizedNoInstructionsResult.count || 0),
    }

    setStats(result)
    return result
  }, [])

  const fetchFilterOptions = useCallback(async () => {
    const [equipmentResult, bodyPartResult, targetResult] = await Promise.all([
      supabase.rpc('get_distinct_equipment'),
      supabase.rpc('get_distinct_bodyparts'),
      supabase.rpc('get_distinct_targets'),
    ])

    if (equipmentResult.error) throw equipmentResult.error
    if (bodyPartResult.error) throw bodyPartResult.error
    if (targetResult.error) throw targetResult.error

    const equipment = (equipmentResult.data || [])
      .map((row) => row.equipment)
      .filter(Boolean)
      .sort()

    const bodyParts = (bodyPartResult.data || [])
      .map((row) => row.bodypart)
      .filter(Boolean)
      .sort()

    const targets = (targetResult.data || [])
      .map((row) => row.target)
      .filter(Boolean)
      .sort()

    const result = { equipment, bodyParts, targets }
    setFilterOptions(result)
    return result
  }, [])

  return {
    exercises,
    loading,
    error,
    stats,
    filterOptions,
    totalCount,
    fetchExercises,
    updateTier,
    bulkUpdateTiers,
    fetchStats,
    fetchFilterOptions,
  }
}
