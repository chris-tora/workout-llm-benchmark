import { useState, useEffect, useCallback } from 'react'
import { useUncategorizedExercises } from './useUncategorizedExercises'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Loader2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  ImageOff,
  AlertTriangle,
  FileQuestion,
  FileText,
} from 'lucide-react'

const TIER_OPTIONS = [
  { value: 'core', label: 'Core' },
  { value: 'always', label: 'Always' },
  { value: 'catalog', label: 'Catalog' },
  { value: 'excluded', label: 'Excluded' },
]

const MODE_OPTIONS = [
  { value: 'all', label: 'All Needs Attention', count: 'total' },
  { value: 'uncategorized', label: 'Uncategorized (null tier)', count: 'uncategorized' },
  { value: 'excluded_no_instructions', label: 'Excluded (no instructions)', count: 'excludedNoInstructions' },
  { value: 'categorized_no_instructions', label: 'Categorized (no instructions)', count: 'categorizedNoInstructions' },
]

const SUPABASE_URL = 'https://ivfllbccljoyaayftecd.supabase.co'

const isValidUrl = (url) => url && (url.startsWith('http://') || url.startsWith('https://'))

const getMediaUrl = (exercise) => {
  if (isValidUrl(exercise.video_url)) return exercise.video_url
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

  const previewWidth = 400
  const previewHeight = 400
  const padding = 16

  let left = position.right + padding
  let top = position.top

  if (left + previewWidth > window.innerWidth - padding) {
    left = position.left - previewWidth - padding
  }

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
            alt={exercise.name}
            className="w-full h-full object-contain bg-zinc-100"
            onLoad={() => setLoaded(true)}
          />
        )}
      </div>
    </div>
  )
}

export function UncategorizedExercises() {
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
  } = useUncategorizedExercises()

  const [page, setPage] = useState(1)
  const [mode, setMode] = useState('all')
  const [equipment, setEquipment] = useState('')
  const [bodyPart, setBodyPart] = useState('')
  const [target, setTarget] = useState('')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [savingId, setSavingId] = useState(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [previewExercise, setPreviewExercise] = useState(null)
  const [hoverExercise, setHoverExercise] = useState({ exercise: null, position: null })

  const totalPages = Math.ceil(totalCount / 50)

  // Initial load
  useEffect(() => {
    fetchStats()
    fetchFilterOptions()
  }, [fetchStats, fetchFilterOptions])

  // Fetch exercises when filters change
  useEffect(() => {
    setPage(1)
    fetchExercises({ mode, equipment, bodyPart, target, search }, 0)
  }, [mode, equipment, bodyPart, target, search, fetchExercises])

  // Fetch exercises when page changes
  useEffect(() => {
    if (page > 1) {
      fetchExercises({ mode, equipment, bodyPart, target, search }, page - 1)
    }
  }, [page])

  const handleUpdateTier = async (id, tier) => {
    setSavingId(id)
    try {
      await updateTier(id, tier)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (err) {
      console.error('Failed to update tier:', err)
    }
    setSavingId(null)
  }

  const handleBulkUpdate = async (tier) => {
    if (selectedIds.size === 0) return
    setBulkSaving(true)
    try {
      await bulkUpdateTiers(Array.from(selectedIds), tier)
      setSelectedIds(new Set())
    } catch (err) {
      console.error('Failed to bulk update:', err)
    }
    setBulkSaving(false)
  }

  const handleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(exercises.map((ex) => ex.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Uncategorized Exercises</h1>
        <p className="text-zinc-500 mt-1">
          Exercises that need tier assignment or are missing instructions
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card
            className={`cursor-pointer transition-all ${mode === 'all' ? 'ring-2 ring-zinc-900' : 'hover:border-zinc-400'}`}
            onClick={() => setMode('all')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-zinc-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-zinc-500">Total Needs Attention</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${mode === 'uncategorized' ? 'ring-2 ring-amber-500' : 'hover:border-zinc-400'}`}
            onClick={() => setMode('uncategorized')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                  <FileQuestion className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{stats.uncategorized}</p>
                  <p className="text-sm text-zinc-500">Uncategorized (null tier)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${mode === 'excluded_no_instructions' ? 'ring-2 ring-red-500' : 'hover:border-zinc-400'}`}
            onClick={() => setMode('excluded_no_instructions')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.excludedNoInstructions}</p>
                  <p className="text-sm text-zinc-500">Excluded (no instructions)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${mode === 'categorized_no_instructions' ? 'ring-2 ring-violet-500' : 'hover:border-zinc-400'}`}
            onClick={() => setMode('categorized_no_instructions')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-violet-600">{stats.categorizedNoInstructions}</p>
                  <p className="text-sm text-zinc-500">Categorized (no instructions)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />

            {filterOptions && (
              <>
                <select
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  className="h-10 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="">All Equipment</option>
                  {filterOptions.equipment.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>

                <select
                  value={bodyPart}
                  onChange={(e) => setBodyPart(e.target.value)}
                  className="h-10 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="">All Body Parts</option>
                  {filterOptions.bodyParts.map((bp) => (
                    <option key={bp} value={bp}>
                      {bp}
                    </option>
                  ))}
                </select>

                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="h-10 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="">All Targets</option>
                  {filterOptions.targets.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="bg-zinc-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">
                {selectedIds.size} exercise{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-sm mr-2">Assign tier:</span>
                {TIER_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    size="sm"
                    variant="outline"
                    className={`${getTierSelectClass(option.value)} border`}
                    onClick={() => handleBulkUpdate(option.value)}
                    disabled={bulkSaving}
                  >
                    {bulkSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      option.label
                    )}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-zinc-400 hover:text-white"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-red-700">
              <XCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercise Table */}
      {loading && exercises.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="py-3 px-4 text-left">
                      <input
                        type="checkbox"
                        checked={exercises.length > 0 && selectedIds.size === exercises.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-zinc-300"
                      />
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Preview
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Equipment
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Body Part
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Current Tier
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Assign Tier
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exercises.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400">
                        {stats?.total === 0 ? (
                          <div className="flex flex-col items-center gap-2">
                            <Check className="w-12 h-12 text-green-500" />
                            <p className="text-lg font-medium text-green-600">All caught up!</p>
                            <p className="text-sm text-zinc-500">No exercises need attention</p>
                          </div>
                        ) : (
                          'No exercises found matching filters'
                        )}
                      </td>
                    </tr>
                  ) : (
                    exercises.map((exercise) => (
                      <tr
                        key={exercise.id}
                        className={`border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${
                          selectedIds.has(exercise.id) ? 'bg-blue-50' : ''
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
                            onChange={(e) => handleSelect(exercise.id, e.target.checked)}
                            className="rounded border-zinc-300"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <MediaThumbnail
                            exercise={exercise}
                            onClick={() => setPreviewExercise(exercise)}
                          />
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-900">
                          {exercise.name}
                        </td>
                        <td className="py-3 px-4 text-zinc-600">{exercise.equipment}</td>
                        <td className="py-3 px-4 text-zinc-600">{exercise.bodypart}</td>
                        <td className="py-3 px-4">
                          {exercise.tier ? (
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getTierSelectClass(exercise.tier)}`}>
                              {exercise.tier}
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700">
                              null
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative">
                            <select
                              className={`h-8 w-28 rounded-md border px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-400 ${getTierSelectClass(
                                exercise.tier
                              )}`}
                              value={exercise.tier || ''}
                              onChange={(e) => handleUpdateTier(exercise.id, e.target.value)}
                              disabled={savingId === exercise.id}
                            >
                              <option value="">Select...</option>
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
                      </tr>
                    ))
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

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    disabled={loading}
                    className={`w-8 h-8 text-sm rounded-md border ${
                      pageNum === page
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                    } disabled:opacity-50`}
                  >
                    {pageNum}
                  </button>
                )
              })}
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
    </div>
  )
}

export default UncategorizedExercises
