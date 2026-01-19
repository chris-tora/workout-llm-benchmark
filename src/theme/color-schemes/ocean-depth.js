/**
 * Ocean Depth Color Scheme
 * Deep abyss to bright surface waters
 */
export const OCEAN_DEPTH = {
  id: 'ocean-depth',
  name: 'Ocean Depth',
  description: 'Rising from dark abyss to sunlit surface',

  levels: [
    { id: 'novice', label: 'Abyss', color: '#0f172a' },
    { id: 'beginner', label: 'Deep', color: '#1e3a5f' },
    { id: 'intermediate', label: 'Ocean', color: '#2563eb' },
    { id: 'pro', label: 'Current', color: '#06b6d4' },
    { id: 'advanced', label: 'Shallow', color: '#22d3ee' },
    { id: 'elite', label: 'Surface', color: '#67e8f9' },
  ],

  colors: {
    default: '#E5E7EB',
    hover: '#22d3ee',
    background: '#F5F5F5',
  },
}

export default OCEAN_DEPTH
