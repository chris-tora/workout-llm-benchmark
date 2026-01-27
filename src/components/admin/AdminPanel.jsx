import { ExerciseReview } from '../exercises'

export function AdminPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Exercise Admin</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage exercises with edit and visibility controls
        </p>
      </div>

      <ExerciseReview />
    </div>
  )
}

export default AdminPanel
