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

  const fetchExercises = useCallback(async (filters, page = 0) => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('exercises')
        .select('id, name, equipment, bodypart, target, tier, video_url, gif_url', { count: 'exact' })

      if (filters.equipment) {
        query = query.eq('equipment', filters.equipment)
      }
      if (filters.bodyPart) {
        query = query.eq('bodypart', filters.bodyPart)
      }
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }
      if (filters.tierFilter) {
        query = query.eq('tier', filters.tierFilter)
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
    const [equipmentResult, bodyPartResult] = await Promise.all([
      supabase.from('exercises').select('equipment').order('equipment'),
      supabase.from('exercises').select('bodypart').order('bodypart'),
    ])

    if (equipmentResult.error) throw equipmentResult.error
    if (bodyPartResult.error) throw bodyPartResult.error

    const equipment = [...new Set(equipmentResult.data.map((e) => e.equipment))].filter(Boolean)
    const bodyParts = [...new Set(bodyPartResult.data.map((e) => e.bodypart))].filter(Boolean)

    const result = { equipment, bodyParts }
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
    fetchStats,
    fetchFilterOptions,
  }
}
