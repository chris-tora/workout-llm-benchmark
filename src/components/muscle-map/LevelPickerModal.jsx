import { X, Check, MinusCircle } from 'lucide-react'

// Level icons for visual distinction
const LEVEL_ICONS = {
  Novice: '○',
  Beginner: '◐',
  Intermediate: '◑',
  Pro: '◒',
  Advanced: '◓',
  Elite: '◉',
}

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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100">
          <div>
            <h3 className="font-semibold text-zinc-900 text-lg">
              Select Level
            </h3>
            <p className="text-sm text-zinc-500 mt-0.5">
              for {muscleName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 p-1.5 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level options */}
        <div className="p-3 space-y-1.5">
          {levels.map((level, idx) => {
            const isSelected = currentLevel === idx
            return (
              <button
                key={idx}
                onClick={() => handleLevelSelect(idx)}
                className={`
                  w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left
                  transition-all duration-200 group
                  ${isSelected 
                    ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/20 scale-[1.02]' 
                    : 'hover:bg-zinc-50 hover:scale-[1.01] active:scale-[0.99]'
                  }
                `}
              >
                {/* Color indicator with icon */}
                <div 
                  className={`
                    w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    transition-all duration-200
                    ${isSelected ? 'bg-white/20' : 'bg-white shadow-sm border border-zinc-100'}
                  `}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full ring-2 ring-offset-2 transition-all"
                    style={{ 
                      backgroundColor: level.color,
                      ringColor: isSelected ? 'rgba(255,255,255,0.3)' : level.color,
                    }}
                  />
                </div>

                {/* Level info */}
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${isSelected ? 'text-white' : 'text-zinc-900'}`}>
                    {level.label}
                  </div>
                  <div className={`text-xs mt-0.5 ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}>
                    Level {idx + 1}
                  </div>
                </div>

                {/* Selection checkmark */}
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center
                  transition-all duration-200
                  ${isSelected 
                    ? 'bg-white text-zinc-900' 
                    : 'opacity-0 group-hover:opacity-100 bg-zinc-100 text-zinc-400'
                  }
                `}>
                  <Check className="w-3.5 h-3.5" />
                </div>
              </button>
            )
          })}

          {/* Remove option */}
          {currentLevel != null && (
            <>
              <div className="h-px bg-zinc-100 my-2" />
              <button
                onClick={handleRemove}
                className="
                  w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left
                  text-red-600 hover:bg-red-50 
                  transition-all duration-200 group
                  hover:scale-[1.01] active:scale-[0.99]
                "
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100">
                  <MinusCircle className="w-5 h-5" />
                </div>
                <span className="font-medium">Remove Selection</span>
              </button>
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100">
          <p className="text-xs text-zinc-400 text-center">
            Select a level to update your muscle map
          </p>
        </div>
      </div>
    </div>
  )
}

export default LevelPickerModal
