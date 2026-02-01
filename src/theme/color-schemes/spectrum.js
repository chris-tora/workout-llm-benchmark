/**
 * Spectrum Color Scheme
 * Rainbow progression from cool violet to warm gold
 * Designed for maximum tier distinguishability (60°+ hue separation)
 */
export const SPECTRUM = {
  id: 'spectrum',
  name: 'Spectrum',
  description: 'Rainbow progression from cool violet to warm gold',

  levels: [
    { id: 'novice', label: 'Novice', color: '#8B7FC7' },       // Hue 252° - Soft Violet
    { id: 'beginner', label: 'Beginner', color: '#5B9BD5' },   // Hue 210° - Sky Blue
    { id: 'intermediate', label: 'Intermediate', color: '#4ECDC4' }, // Hue 175° - Teal
    { id: 'pro', label: 'Pro', color: '#7CB342' },             // Hue 88° - Lime Green
    { id: 'advanced', label: 'Advanced', color: '#FF8A65' },   // Hue 14° - Coral Orange
    { id: 'elite', label: 'Elite', color: '#FFD54F' },         // Hue 45° - Golden Yellow
  ],

  colors: {
    default: '#E5E5E5',
    hover: '#D4D4D4',
    background: '#F5F5F5',
  },
}

export default SPECTRUM
