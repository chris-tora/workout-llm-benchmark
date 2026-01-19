import { X } from 'lucide-react'

export function LevelPickerModal({ muscleName, muscleId, currentLevel, onSelect, onClose, levels }) {
  if (!muscleId) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Pass numeric index (0-5) to onSelect
  const handleLevelSelect = (levelIdx) => {
    onSelect(muscleId, levelIdx)
    onClose()
  }

  const handleRemove = () => {
    onSelect(muscleId, null)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl w-72 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <span className="font-medium text-zinc-900">
            Select level for {muscleName}
          </span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level options - currentLevel is numeric index (0-5) */}
        <div className="p-2">
          {levels.map((level, idx) => (
            <button
              key={idx}
              onClick={() => handleLevelSelect(idx)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                currentLevel === idx
                  ? 'bg-zinc-100'
                  : 'hover:bg-zinc-50'
              }`}
            >
              <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: level.color }}
              />
              <span className="text-zinc-900">{level.label}</span>
              {currentLevel === idx && (
                <span className="ml-auto text-xs text-zinc-500">Current</span>
              )}
            </button>
          ))}

          {/* Remove option - check for not null/undefined since 0 is valid */}
          {currentLevel != null && (
            <>
              <div className="border-t my-2" />
              <button
                onClick={handleRemove}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-red-300" />
                <span>Remove</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default LevelPickerModal
