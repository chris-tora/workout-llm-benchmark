/**
 * Sunset/Sunrise Color Scheme
 * Dark navy base rising to golden sunrise
 */
export const SUNSET = {
  id: 'sunset',
  name: 'Sunset Rise',
  description: 'Dawn progression from deep night to golden sunrise',

  levels: [
    { id: 'novice', label: 'Twilight', color: '#1a1a2e' },
    { id: 'beginner', label: 'Dusk', color: '#3d2817' },
    { id: 'intermediate', label: 'Ember', color: '#8b4513' },
    { id: 'pro', label: 'Amber', color: '#d97706' },
    { id: 'advanced', label: 'Blaze', color: '#f97316' },
    { id: 'elite', label: 'Sunrise', color: '#fbbf24' },
  ],

  colors: {
    default: '#E5E7EB',
    hover: '#fbbf24',
    background: '#F5F5F5',
  },
}

export default SUNSET
