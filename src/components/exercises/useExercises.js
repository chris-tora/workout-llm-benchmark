import { useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ivfllbccljoyaayftecd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZmxsYmNjbGpveWFheWZ0ZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjExOTAxNCwiZXhwIjoyMDgxNjk1MDE0fQ.0-GD_WvgZlCOMFThc-4mLMS80GE5wLKFetHe_X_ovUc'

const supabase = createClient(supabaseUrl, supabaseKey)

const PAGE_SIZE = 50

export function useExercises() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [filterOptions, setFilterOptions] = useState(null)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const fetchExercises = useCallback(async (filters, page = 0, includeHidden = false) => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('exercises')
        .select('id, name, equipment, bodypart, target, tier, video_url, gif_url, is_hidden, description, instructions, secondary_muscles', { count: 'exact' })

      if (!includeHidden) {
        query = query.or('is_hidden.is.null,is_hidden.eq.false')
      }
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
      if (filters.tierFilter) {
        query = query.eq('tier', filters.tierFilter)
      }
      if (filters.hiddenFilter === 'hidden') {
        query = query.eq('is_hidden', true)
      } else if (filters.hiddenFilter === 'visible') {
        query = query.or('is_hidden.is.null,is_hidden.eq.false')
      }

      query = query
        .order('name', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      const result = {
        exercises: data || [],
        totalCount: count || 0,
        hasMore: (count || 0) > (page + 1) * PAGE_SIZE,
      }

      if (page === 0) {
        setExercises(result.exercises)
      } else {
        setExercises((prev) => [...prev, ...result.exercises])
      }
      setTotalCount(result.totalCount)
      setHasMore(result.hasMore)

      return result
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

    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, tier } : ex))
    )
  }, [])

  const bulkUpdateTiers = useCallback(async (ids, tier) => {
    const { error: updateError } = await supabase
      .from('exercises')
      .update({ tier })
      .in('id', ids)

    if (updateError) throw updateError

    setExercises((prev) =>
      prev.map((ex) => (ids.includes(ex.id) ? { ...ex, tier } : ex))
    )
  }, [])

  const updateExercise = useCallback(async (id, updates) => {
    const { data, error: updateError } = await supabase
      .from('exercises')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...data } : ex))
    )

    return data
  }, [])

  const hideExercise = useCallback(async (id) => {
    const { error: updateError } = await supabase
      .from('exercises')
      .update({ is_hidden: true })
      .eq('id', id)

    if (updateError) throw updateError

    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, is_hidden: true } : ex))
    )

    return true
  }, [])

  const unhideExercise = useCallback(async (id) => {
    const { error: updateError } = await supabase
      .from('exercises')
      .update({ is_hidden: false })
      .eq('id', id)

    if (updateError) throw updateError

    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, is_hidden: false } : ex))
    )

    return true
  }, [])

  const checkExerciseInUse = useCallback(async (id) => {
    const { data, error: rpcError } = await supabase
      .rpc('is_exercise_in_use', { exercise_id: id })

    if (rpcError) throw rpcError

    return data
  }, [])

  const fetchStats = useCallback(async () => {
    const [totalResult, coreResult, alwaysResult, catalogResult, excludedResult] = await Promise.all([
      supabase.from('exercises').select('*', { count: 'exact', head: true }),
      supabase.from('exercises').select('*', { count: 'exact', head: true }).eq('tier', 'core'),
      supabase.from('exercises').select('*', { count: 'exact', head: true }).eq('tier', 'always'),
      supabase.from('exercises').select('*', { count: 'exact', head: true }).eq('tier', 'catalog'),
      supabase.from('exercises').select('*', { count: 'exact', head: true }).eq('tier', 'excluded'),
    ])

    if (totalResult.error) throw totalResult.error

    const result = {
      total: totalResult.count || 0,
      core: coreResult.count || 0,
      always: alwaysResult.count || 0,
      catalog: catalogResult.count || 0,
      excluded: excludedResult.count || 0,
    }

    setStats(result)
    return result
  }, [])

  const fetchFilterOptions = useCallback(async () => {
    // Use raw SQL with RPC to get truly distinct values across all rows
    // This avoids the 1000-row pagination limit of standard select queries
    const [equipmentResult, bodyPartResult, targetResult] = await Promise.all([
      supabase.rpc('get_distinct_equipment'),
      supabase.rpc('get_distinct_bodyparts'),
      supabase.rpc('get_distinct_targets'),
    ])

    if (equipmentResult.error) {
      console.error('Equipment fetch error:', equipmentResult.error)
      throw equipmentResult.error
    }
    if (bodyPartResult.error) {
      console.error('BodyPart fetch error:', bodyPartResult.error)
      throw bodyPartResult.error
    }
    if (targetResult.error) {
      console.error('Target fetch error:', targetResult.error)
      throw targetResult.error
    }

    // RPC functions return arrays of objects with a single column
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
    hasMore,
    fetchExercises,
    updateTier,
    bulkUpdateTiers,
    updateExercise,
    hideExercise,
    unhideExercise,
    checkExerciseInUse,
    fetchStats,
    fetchFilterOptions,
  }
}
