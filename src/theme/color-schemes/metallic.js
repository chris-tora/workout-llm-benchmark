/**
 * Metallic Color Scheme
 * Classic gaming rank progression: Iron → Bronze → Steel → Silver → Gold → Platinum
 */
export const METALLIC = {
  id: 'metallic',
  name: 'Metallic Ranks',
  description: 'Traditional gaming tier progression from iron to platinum',

  levels: [
    { id: 'novice', label: 'Iron', color: '#48494B' },
    { id: 'beginner', label: 'Bronze', color: '#6A4E2A' },
    { id: 'intermediate', label: 'Steel', color: '#71797E' },
    { id: 'pro', label: 'Silver', color: '#A8A9AD' },
    { id: 'advanced', label: 'Gold', color: '#C9A227' },
    { id: 'elite', label: 'Platinum', color: '#E5E4E2' },
  ],

  colors: {
    default: '#E5E7EB',
    hover: '#D4AF37',
    background: '#F5F5F5',
  },
}

export default METALLIC
