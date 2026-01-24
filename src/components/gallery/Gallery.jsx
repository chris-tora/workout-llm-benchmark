import { useState, useEffect } from 'react'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Card } from '../ui/card'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

const SUPABASE_URL = 'https://ivfllbccljoyaayftecd.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZmxsYmNjbGpveWFheWZ0ZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTkwMTQsImV4cCI6MjA4MTY5NTAxNH0.714kFWsFFKwVAywLY5NOyZz2_eMoi7-Js8JGCwtpycs'

export function Gallery() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [bodyPart, setBodyPart] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/exercises?select=id,name,bodypart,equipment,target,video_url,gif_url&order=name`, {
      headers: { 'apikey': SUPABASE_KEY }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setExercises(data)
        } else {
          console.error('Failed to fetch exercises:', data)
          setExercises([])
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Gallery fetch error:', err)
        setExercises([])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setSelected(null)
      if (!selected) return
      const idx = filtered.findIndex(ex => ex.id === selected.id)
      if (e.key === 'ArrowRight' && idx < filtered.length - 1) {
        setSelected(filtered[idx + 1])
      }
      if (e.key === 'ArrowLeft' && idx > 0) {
        setSelected(filtered[idx - 1])
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selected, exercises, filter, bodyPart])

  const isValidUrl = (url) => url && (url.startsWith('http://') || url.startsWith('https://'))

  const getMediaUrl = (exercise) => {
    if (isValidUrl(exercise.video_url)) return exercise.video_url
    if (isValidUrl(exercise.gif_url)) return exercise.gif_url
    return `${SUPABASE_URL}/storage/v1/object/public/exercise-gifs/${exercise.id}.gif`
  }

  const isVideo = (exercise) =>
    isValidUrl(exercise.video_url) && exercise.video_url.endsWith('.mp4')

  const bodyParts = [...new Set(exercises.map(e => e.bodypart))].sort()

  const filtered = exercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(filter.toLowerCase())
    const matchesBodyPart = !bodyPart || e.bodypart === bodyPart
    return matchesSearch && matchesBodyPart
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading exercises...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          type="text"
          placeholder="Search exercises..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1"
        />
        <Select value={bodyPart} onChange={e => setBodyPart(e.target.value)}>
          <option value="">All Body Parts</option>
          {bodyParts.map(bp => (
            <option key={bp} value={bp}>{bp}</option>
          ))}
        </Select>
      </div>

      <p className="text-sm text-zinc-500">
        {filtered.length} of {exercises.length} exercises • Click to enlarge
      </p>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map(exercise => (
          <Card
            key={exercise.id}
            className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
            onClick={() => setSelected(exercise)}
          >
            {isVideo(exercise) ? (
              <video
                src={getMediaUrl(exercise)}
                muted
                loop
                playsInline
                onMouseEnter={e => e.target.play()}
                onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0 }}
                className="w-full aspect-square object-cover bg-zinc-100"
              />
            ) : (
              <img
                src={getMediaUrl(exercise)}
                alt={exercise.name}
                loading="lazy"
                className="w-full aspect-square object-cover bg-zinc-100"
              />
            )}
            <div className="p-3">
              <h3 className="font-medium text-sm truncate">{exercise.name}</h3>
              <p className="text-xs text-zinc-500 truncate">
                {exercise.bodypart} • {exercise.equipment}
              </p>
              <span className="inline-block mt-1 text-xs bg-zinc-100 px-2 py-0.5 rounded">
                {exercise.target}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative">
              <button
                className="absolute top-2 right-2 p-2 bg-white/80 rounded-full hover:bg-white z-10"
                onClick={() => setSelected(null)}
              >
                <X className="w-5 h-5" />
              </button>
              {isVideo(selected) ? (
                <video
                  src={getMediaUrl(selected)}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  className="w-full"
                />
              ) : (
                <img
                  src={getMediaUrl(selected)}
                  alt={selected.name}
                  className="w-full"
                />
              )}
            </div>
            <div className="p-6">
              <h2 className="text-xl font-semibold">{selected.name}</h2>
              <p className="text-zinc-500 mt-1">
                {selected.bodypart} • {selected.equipment} • {selected.target}
              </p>
              <p className="text-xs text-zinc-400 mt-4">
                ← → to navigate • ESC to close
              </p>
            </div>
            <div className="flex border-t">
              <button
                className="flex-1 p-3 flex items-center justify-center gap-2 hover:bg-zinc-50 disabled:opacity-50"
                onClick={() => {
                  const idx = filtered.findIndex(ex => ex.id === selected.id)
                  if (idx > 0) setSelected(filtered[idx - 1])
                }}
                disabled={filtered.findIndex(ex => ex.id === selected.id) === 0}
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                className="flex-1 p-3 flex items-center justify-center gap-2 hover:bg-zinc-50 border-l disabled:opacity-50"
                onClick={() => {
                  const idx = filtered.findIndex(ex => ex.id === selected.id)
                  if (idx < filtered.length - 1) setSelected(filtered[idx + 1])
                }}
                disabled={filtered.findIndex(ex => ex.id === selected.id) === filtered.length - 1}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
