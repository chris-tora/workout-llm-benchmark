/**
 * Volcanic/Lava Color Scheme
 * Charcoal depths to molten lava glow
 */
export const VOLCANIC = {
  id: 'volcanic',
  name: 'Volcanic',
  description: 'Erupting from dark ash to molten lava',

  levels: [
    { id: 'novice', label: 'Ash', color: '#1a1a1a' },
    { id: 'beginner', label: 'Charcoal', color: '#3d2817' },
    { id: 'intermediate', label: 'Cinder', color: '#92400e' },
    { id: 'pro', label: 'Magma', color: '#dc2626' },
    { id: 'advanced', label: 'Lava', color: '#ef4444' },
    { id: 'elite', label: 'Molten', color: '#fca5a5' },
  ],

  colors: {
    default: '#E5E7EB',
    hover: '#ef4444',
    background: '#F5F5F5',
  },
}

export default VOLCANIC
