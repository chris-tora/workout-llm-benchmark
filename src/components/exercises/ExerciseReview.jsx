import { useState, useEffect, useCallback, useRef } from 'react'
import { useExercises } from './useExercises'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Loader2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  X,
  ImageOff,
  Eye,
  EyeOff,
  Pencil,
} from 'lucide-react'

const TIER_OPTIONS = [
  { value: 'core', label: 'Core' },
  { value: 'always', label: 'Always' },
  { value: 'catalog', label: 'Catalog' },
  { value: 'excluded', label: 'Excluded' },
]

const BULK_TIER_OPTIONS = [
  { value: 'core', label: 'Core' },
  { value: 'always', label: 'Always' },
  { value: 'catalog', label: 'Catalog' },
  { value: 'excluded', label: 'Excluded' },
]

const VISIBILITY_OPTIONS = [
  { value: '', label: 'All Exercises' },
  { value: 'visible', label: 'Visible Only' },
  { value: 'hidden', label: 'Hidden Only' },
]

// Media URLs from Supabase Storage
const SUPABASE_URL = 'https://ivfllbccljoyaayftecd.supabase.co'

const isValidUrl = (url) => url && (url.startsWith('http://') || url.startsWith('https://'))

const getMediaUrl = (exercise) => {
  if (isValidUrl(exercise.video_url)) return exercise.video_url
  if (isValidUrl(exercise.gif_url)) return exercise.gif_url
  return `${SUPABASE_URL}/storage/v1/object/public/exercise-gifs/${exercise.id}.gif`
}

const isVideo = (exercise) =>
  isValidUrl(exercise.video_url) && exercise.video_url.endsWith('.mp4')

function getTierSelectClass(tier) {
  switch (tier) {
    case 'core':
      return 'bg-indigo-50 text-indigo-700 border-indigo-300'
    case 'always':
      return 'bg-green-50 text-green-700 border-green-300'
    case 'catalog':
      return 'bg-amber-50 text-amber-700 border-amber-300'
    case 'excluded':
      return 'bg-red-50 text-red-700 border-red-300'
    default:
      return 'bg-zinc-50 text-zinc-600 border-zinc-300'
  }
}

function MediaThumbnail({ exercise, onClick }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const src = getMediaUrl(exercise)
  const videoMode = isVideo(exercise)

  if (!src || error) {
    return (
      <div className="w-12 h-12 rounded bg-zinc-200 flex items-center justify-center">
        <ImageOff className="w-5 h-5 text-zinc-400" />
      </div>
    )
  }

  return (
    <div
      className="w-12 h-12 rounded bg-zinc-200 overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {videoMode ? (
        <video
          src={src}
          muted
          loop
          playsInline
          onMouseEnter={e => e.target.play()}
          onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0 }}
          className={`w-full h-full object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoadedData={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      ) : (
        <img
          src={src}
          alt={exercise.name}
          className={`w-full h-full object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  )
}

function HoverPreview({ exercise, position }) {
  const [loaded, setLoaded] = useState(false)

  if (!exercise || !position) return null

  const src = getMediaUrl(exercise)
  const videoMode = isVideo(exercise)

  // Position the preview to the right of the thumbnail
  // Adjust if it would go off-screen
  const previewWidth = 400
  const previewHeight = 400
  const padding = 16

  let left = position.right + padding
  let top = position.top

  // Check if preview would go off the right edge of the screen
  if (left + previewWidth > window.innerWidth - padding) {
    // Position to the left of the thumbnail instead
    left = position.left - previewWidth - padding
  }

  // Ensure the preview doesn't go off the top or bottom
  if (top + previewHeight > window.innerHeight - padding) {
    top = window.innerHeight - previewHeight - padding
  }
  if (top < padding) {
    top = padding
  }

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${previewWidth}px`,
        height: `${previewHeight}px`,
      }}
    >
      <div
        className={`w-full h-full rounded-lg bg-white shadow-2xl border border-zinc-200 overflow-hidden transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {videoMode ? (
          <video
            src={src}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-contain bg-zinc-100"
            onLoadedData={() => setLoaded(true)}
          />
        ) : (
          <img
            src={src}
            alt="Exercise preview"
            className="w-full h-full object-contain bg-zinc-100"
            onLoad={() => setLoaded(true)}
          />
        )}
      </div>
    </div>
  )
}

function EditExerciseModal({ exercise, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: exercise?.name || '',
    description: exercise?.description || '',
    instructions: exercise?.instructions || '',
    target: exercise?.target || '',
    secondary_muscles: Array.isArray(exercise?.secondary_muscles)
      ? exercise.secondary_muscles.join(', ')
      : (exercise?.secondary_muscles || ''),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  if (!exercise) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const updates = {
        name: formData.name,
        description: formData.description || null,
        instructions: formData.instructions || null,
        target: formData.target,
        secondary_muscles: formData.secondary_muscles
          ? formData.secondary_muscles.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
      }
      await onSave(exercise.id, updates)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save exercise')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <span className="font-semibold text-zinc-900">Edit Exercise</span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Exercise name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of the exercise"
              rows={3}
              className="flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Instructions (JSON array as text)
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => handleChange('instructions', e.target.value)}
              placeholder='["Step 1", "Step 2", "Step 3"]'
              rows={4}
              className="flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Target Muscle
            </label>
            <Input
              value={formData.target}
              onChange={(e) => handleChange('target', e.target.value)}
              placeholder="e.g., biceps, chest, quads"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Secondary Muscles (comma-separated)
            </label>
            <Input
              value={formData.secondary_muscles}
              onChange={(e) => handleChange('secondary_muscles', e.target.value)}
              placeholder="e.g., triceps, shoulders, forearms"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-zinc-50">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ExerciseReview() {
  const {
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
    hideExercise,
    unhideExercise,
    checkExerciseInUse,
    updateExercise,
  } = useExercises()

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [filters, setFilters] = useState({})
  const [page, setPage] = useState(1)
  const [searchValue, setSearchValue] = useState('')
  const [bulkTier, setBulkTier] = useState('always')
  const [applyingBulk, setApplyingBulk] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [previewExercise, setPreviewExercise] = useState(null)
  const [hoverExercise, setHoverExercise] = useState({ exercise: null, position: null })
  const [hidingId, setHidingId] = useState(null)
  const [hideError, setHideError] = useState(null)
  const [editingExercise, setEditingExercise] = useState(null)
  const searchTimeoutRef = useRef(null)

  const handleExerciseHover = useCallback((exercise, rect) => {
    setHoverExercise({
      exercise,
      position: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      },
    })
  }, [])

  const handleExerciseHoverEnd = useCallback(() => {
    setHoverExercise({ exercise: null, position: null })
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchStats()
    fetchFilterOptions()
  }, [fetchStats, fetchFilterOptions])

  // Fetch exercises when filters or page changes
  // Admin view always includes hidden exercises for management
  useEffect(() => {
    fetchExercises(filters, page - 1, true)
  }, [filters, page, fetchExercises])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (searchValue !== (filters.search || '')) {
        handleFiltersChange({ ...filters, search: searchValue || undefined })
      }
    }, 300)
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters)
    setPage(1)
    setSelectedIds(new Set())
  }, [])

  const handleSelect = useCallback((id, selected) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(
    (selected) => {
      if (selected) {
        setSelectedIds(new Set(exercises.map((e) => e.id)))
      } else {
        setSelectedIds(new Set())
      }
    },
    [exercises]
  )

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBulkUpdate = useCallback(async () => {
    setApplyingBulk(true)
    try {
      await bulkUpdateTiers(Array.from(selectedIds), bulkTier)
      setSelectedIds(new Set())
      fetchStats()
    } finally {
      setApplyingBulk(false)
    }
  }, [selectedIds, bulkTier, bulkUpdateTiers, fetchStats])

  const handleUpdateTier = useCallback(
    async (id, tier) => {
      setSavingId(id)
      try {
        await updateTier(id, tier)
        fetchStats()
      } finally {
        setSavingId(null)
      }
    },
    [updateTier, fetchStats]
  )

  const handleStatClick = useCallback(
    (tier) => {
      if (tier === null) {
        handleFiltersChange({ ...filters, tierFilter: undefined })
      } else {
        handleFiltersChange({ ...filters, tierFilter: tier })
      }
    },
    [filters, handleFiltersChange]
  )

  const handleHideExercise = useCallback(
    async (id) => {
      setHidingId(id)
      setHideError(null)
      try {
        const inUse = await checkExerciseInUse(id)
        if (inUse) {
          setHideError({ id, message: 'Cannot hide - exercise is used in workouts' })
          return
        }
        await hideExercise(id)
      } catch (err) {
        setHideError({ id, message: err.message || 'Failed to hide exercise' })
      } finally {
        setHidingId(null)
      }
    },
    [checkExerciseInUse, hideExercise]
  )

  const handleUnhideExercise = useCallback(
    async (id) => {
      setHidingId(id)
      setHideError(null)
      try {
        await unhideExercise(id)
      } catch (err) {
        setHideError({ id, message: err.message || 'Failed to unhide exercise' })
      } finally {
        setHidingId(null)
      }
    },
    [unhideExercise]
  )

  const handleReset = useCallback(() => {
    setSearchValue('')
    handleFiltersChange({})
  }, [handleFiltersChange])

  const totalPages = Math.ceil(totalCount / 50)

  const derivedStats = stats
    ? {
        total: stats.total,
        core: stats.core ?? 0,
        always: stats.always,
        catalog: stats.catalog,
        excluded: stats.excluded,
      }
    : {
        total: 0,
        core: 0,
        always: 0,
        catalog: 0,
        excluded: 0,
      }

  const hasActiveFilters =
    filters.equipment ||
    filters.bodyPart ||
    filters.target ||
    filters.search ||
    filters.tierFilter ||
    filters.hiddenFilter

  const allSelected =
    exercises.length > 0 && exercises.every((e) => selectedIds.has(e.id))
  const someSelected =
    exercises.some((e) => selectedIds.has(e.id)) && !allSelected

  const activeTier = filters.tierFilter

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <XCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-semibold text-zinc-900">
          Error loading exercises
        </h2>
        <p className="text-zinc-600">{error}</p>
        <Button onClick={() => fetchExercises(filters, page - 1)}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Exercise Review Tool</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Review and categorize exercises for workout generation quality
        </p>
      </div>

      {/* Tier Legend */}
      <Card className="bg-zinc-50 border-zinc-200">
        <CardContent className="py-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-800 mb-2">Review Tiers</h3>
            <p className="text-xs text-zinc-600 mb-3">
              Your decision on whether to include this exercise in generated workouts.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="w-20 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-300 text-center">Core</span>
                <span className="text-xs text-zinc-600">Fundamental exercises, prioritize in all workouts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-300 text-center">Always</span>
                <span className="text-xs text-zinc-600">High-quality, universally applicable exercises</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-300 text-center">Catalog</span>
                <span className="text-xs text-zinc-600">Good exercises, include when equipment matches</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-300 text-center">Excluded</span>
                <span className="text-xs text-zinc-600">Never use in generated workouts</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: derivedStats.total, tier: null },
          { label: 'Core', value: derivedStats.core, tier: 'core' },
          { label: 'Always', value: derivedStats.always, tier: 'always' },
          { label: 'Catalog', value: derivedStats.catalog, tier: 'catalog' },
          { label: 'Excluded', value: derivedStats.excluded, tier: 'excluded' },
        ].map((card) => (
          <button
            key={card.label}
            onClick={() => handleStatClick(card.tier)}
            className={`p-4 rounded-lg border transition-all text-left ${
              activeTier === card.tier || (card.tier === null && !activeTier)
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-900 border-zinc-200 hover:border-zinc-400'
            }`}
          >
            <div className="text-2xl font-bold">{card.value}</div>
            <div
              className={`text-sm ${
                activeTier === card.tier || (card.tier === null && !activeTier)
                  ? 'text-zinc-300'
                  : 'text-zinc-500'
              }`}
            >
              {card.label}
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Search
              </label>
              <Input
                placeholder="Exercise name..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>

            <div className="w-48">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Equipment
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                value={filters.equipment || ''}
                onChange={(e) =>
                  handleFiltersChange({
                    ...filters,
                    equipment: e.target.value || undefined,
                  })
                }
              >
                <option value="">All Equipment</option>
                {(filterOptions?.equipment || []).map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-48">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Body Part
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                value={filters.bodyPart || ''}
                onChange={(e) =>
                  handleFiltersChange({
                    ...filters,
                    bodyPart: e.target.value || undefined,
                  })
                }
              >
                <option value="">All Body Parts</option>
                {(filterOptions?.bodyParts || []).map((bp) => (
                  <option key={bp} value={bp}>
                    {bp}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-48">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Target Muscle
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                value={filters.target || ''}
                onChange={(e) =>
                  handleFiltersChange({
                    ...filters,
                    target: e.target.value || undefined,
                  })
                }
              >
                <option value="">All Targets</option>
                {(filterOptions?.targets || []).map((target) => (
                  <option key={target} value={target}>
                    {target}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-36">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Tier
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                value={filters.tierFilter || ''}
                onChange={(e) =>
                  handleFiltersChange({
                    ...filters,
                    tierFilter: e.target.value || undefined,
                  })
                }
              >
                <option value="">All Tiers</option>
                <option value="core">Core</option>
                <option value="always">Always</option>
                <option value="catalog">Catalog</option>
                <option value="excluded">Excluded</option>
              </select>
            </div>

            <div className="w-40">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Visibility
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                value={filters.hiddenFilter || ''}
                onChange={(e) =>
                  handleFiltersChange({
                    ...filters,
                    hiddenFilter: e.target.value || undefined,
                  })
                }
              >
                {VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-700">
                {selectedIds.size} selected
              </span>

              <select
                className="h-9 w-32 rounded-md border border-blue-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={bulkTier}
                onChange={(e) => setBulkTier(e.target.value)}
                disabled={applyingBulk}
              >
                {BULK_TIER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <Button onClick={handleBulkUpdate} disabled={applyingBulk}>
                {applyingBulk ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Apply to {selectedIds.size} selected
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleClearSelection}
                disabled={applyingBulk}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercise Table */}
      {loading && exercises.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-zinc-600">Loading exercises...</span>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="w-12 py-3 px-4">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-zinc-300"
                        aria-label="Select all exercises on this page"
                      />
                    </th>
                    <th className="w-16 py-3 px-4 text-left font-medium text-zinc-600">
                      GIF
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-zinc-600">
                      Name
                    </th>
                    <th className="w-40 py-3 px-4 text-left font-medium text-zinc-600">
                      Equipment
                    </th>
                    <th className="w-32 py-3 px-4 text-left font-medium text-zinc-600">
                      Body Part
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-zinc-600">
                      Media URL
                    </th>
                    <th className="w-36 py-3 px-4 text-left font-medium text-zinc-600">
                      Tier
                    </th>
                    <th className="w-24 py-3 px-4 text-left font-medium text-zinc-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exercises.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-500">
                        No exercises found
                      </td>
                    </tr>
                  ) : (
                    exercises.map((exercise) => {
                      const isHidden = exercise.is_hidden === true
                      return (
                        <tr
                          key={exercise.id}
                          className={`border-b transition-colors ${
                            isHidden
                              ? 'border-red-200 bg-red-50/30'
                              : 'border-zinc-100 hover:bg-zinc-50'
                          } ${selectedIds.has(exercise.id) ? 'bg-blue-50' : ''} ${
                            isHidden ? 'opacity-60' : ''
                          }`}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            handleExerciseHover(exercise, rect)
                          }}
                          onMouseLeave={handleExerciseHoverEnd}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(exercise.id)}
                              onChange={(e) =>
                                handleSelect(exercise.id, e.target.checked)
                              }
                              className="rounded border-zinc-300"
                              aria-label={`Select ${exercise.name}`}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <MediaThumbnail
                              exercise={exercise}
                              onClick={() => setPreviewExercise(exercise)}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-900">
                                {exercise.name}
                              </span>
                              {isHidden && (
                                <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 border border-red-300 rounded">
                                  Hidden
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-zinc-600">
                            {exercise.equipment}
                          </td>
                          <td className="py-3 px-4 text-zinc-600">
                            {exercise.bodypart}
                          </td>
                          <td className="py-3 px-4">
                            <code className="text-xs text-zinc-500 block truncate max-w-xs" title={getMediaUrl(exercise)}>
                              {getMediaUrl(exercise)}
                            </code>
                          </td>
                          <td className="py-3 px-4">
                            <div className="relative">
                              <select
                                className={`h-8 w-28 rounded-md border px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-400 ${getTierSelectClass(
                                  exercise.tier
                                )}`}
                                value={exercise.tier || ''}
                                onChange={(e) =>
                                  handleUpdateTier(exercise.id, e.target.value)
                                }
                                disabled={savingId === exercise.id}
                              >
                                {TIER_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              {savingId === exercise.id && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded">
                                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setEditingExercise(exercise)}
                                  className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors"
                                  title="Edit exercise"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    isHidden
                                      ? handleUnhideExercise(exercise.id)
                                      : handleHideExercise(exercise.id)
                                  }
                                  disabled={hidingId === exercise.id}
                                  className={`p-1.5 rounded transition-colors ${
                                    isHidden
                                      ? 'hover:bg-green-100 text-green-600 hover:text-green-700'
                                      : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  title={isHidden ? 'Unhide exercise' : 'Hide exercise'}
                                >
                                  {hidingId === exercise.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : isHidden ? (
                                    <Eye className="w-4 h-4" />
                                  ) : (
                                    <EyeOff className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                              {hideError?.id === exercise.id && (
                                <span className="text-xs text-red-600 max-w-[100px]">
                                  {hideError.message}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">
          {totalPages <= 1 ? (
            `Showing ${totalCount} exercise${totalCount !== 1 ? 's' : ''}`
          ) : (
            `Page ${page} of ${totalPages} (${(page - 1) * 50 + 1}-${Math.min(
              page * 50,
              totalCount
            )} of ${totalCount})`
          )}
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {(() => {
                const pages = []
                const showPages = 5
                let start = Math.max(1, page - Math.floor(showPages / 2))
                let end = Math.min(totalPages, start + showPages - 1)

                if (end - start < showPages - 1) {
                  start = Math.max(1, end - showPages + 1)
                }

                if (start > 1) {
                  pages.push(
                    <button
                      key={1}
                      onClick={() => setPage(1)}
                      disabled={loading}
                      className="w-8 h-8 text-sm rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                    >
                      1
                    </button>
                  )
                  if (start > 2) {
                    pages.push(
                      <span key="start-ellipsis" className="px-1 text-zinc-400">...</span>
                    )
                  }
                }

                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      disabled={loading}
                      className={`w-8 h-8 text-sm rounded-md border ${
                        i === page
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                      } disabled:opacity-50`}
                    >
                      {i}
                    </button>
                  )
                }

                if (end < totalPages) {
                  if (end < totalPages - 1) {
                    pages.push(
                      <span key="end-ellipsis" className="px-1 text-zinc-400">...</span>
                    )
                  }
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => setPage(totalPages)}
                      disabled={loading}
                      className="w-8 h-8 text-sm rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                    >
                      {totalPages}
                    </button>
                  )
                }

                return pages
              })()}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages || loading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Hover Preview */}
      <HoverPreview exercise={hoverExercise.exercise} position={hoverExercise.position} />

      {/* Media Preview Modal */}
      {previewExercise && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPreviewExercise(null)}
        >
          <div className="relative max-w-lg max-h-[80vh]">
            <button
              className="absolute -top-10 right-0 text-white hover:text-zinc-300"
              onClick={() => setPreviewExercise(null)}
            >
              <X className="w-6 h-6" />
            </button>
            {isVideo(previewExercise) ? (
              <video
                src={getMediaUrl(previewExercise)}
                autoPlay
                muted
                loop
                playsInline
                controls
                className="max-w-full max-h-[80vh] rounded-lg"
              />
            ) : (
              <img
                src={getMediaUrl(previewExercise)}
                alt={previewExercise.name}
                className="max-w-full max-h-[80vh] rounded-lg"
              />
            )}
          </div>
        </div>
      )}

      {/* Edit Exercise Modal */}
      {editingExercise && (
        <EditExerciseModal
          exercise={editingExercise}
          onSave={updateExercise}
          onClose={() => setEditingExercise(null)}
        />
      )}
    </div>
  )
}

export default ExerciseReview
