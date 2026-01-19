import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Gallery } from './components/gallery'
import { VideoComparison } from './components/comparison'
import { LLMBenchmark } from './components/benchmark'
import { ExerciseReview } from './components/exercises'
import { MuscleMap } from './components/muscle-map'
import { BeforeAfterComparison } from './components/before-after'
import { Beaker, Image, Video, Brain, Dumbbell, User, ArrowLeftRight } from 'lucide-react'

function NavTab({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-zinc-900 text-white'
            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <NavLink to="/" className="flex items-center gap-2">
              <Beaker className="w-6 h-6 text-zinc-700" />
              <h1 className="text-xl font-semibold">Prototype Showcase</h1>
            </NavLink>

            <nav className="flex gap-1">
              <NavTab to="/gallery">
                <Image className="w-4 h-4 mr-1.5" />
                Gallery
              </NavTab>
              <NavTab to="/video">
                <Video className="w-4 h-4 mr-1.5" />
                Video Models
              </NavTab>
              <NavTab to="/benchmark">
                <Brain className="w-4 h-4 mr-1.5" />
                LLM Benchmark
              </NavTab>
              <NavTab to="/exercises">
                <Dumbbell className="w-4 h-4 mr-1.5" />
                Exercise Review
              </NavTab>
              <NavTab to="/muscle-map">
                <User className="w-4 h-4 mr-1.5" />
                Muscle Map
              </NavTab>
              <NavTab to="/before-after">
                <ArrowLeftRight className="w-4 h-4 mr-1.5" />
                Before/After
              </NavTab>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/gallery" replace />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/video" element={<VideoComparison />} />
          <Route path="/benchmark" element={<LLMBenchmark />} />
          <Route path="/exercises" element={<ExerciseReview />} />
          <Route path="/muscle-map" element={<MuscleMap />} />
          <Route path="/before-after" element={<BeforeAfterComparison />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-zinc-500">
          <p>Fitness App Prototypes • Exercise GIFs • Video Generation • LLM Comparison</p>
          <p className="mt-1">Built with React + Vite + Tailwind + shadcn/ui</p>
        </div>
      </footer>
    </div>
  )
}

export default App
