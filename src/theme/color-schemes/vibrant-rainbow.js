/**
 * Vibrant Rainbow Color Scheme
 * Highly saturated distinct hues for maximum muscle group visibility
 * Inspired by anatomical muscle overlay references
 * Each level has 60°+ hue separation for clear distinguishability
 */
export const VIBRANT_RAINBOW = {
  id: 'vibrant-rainbow',
  name: 'Vibrant Rainbow',
  description: 'Highly saturated distinct hues for maximum muscle visibility',

  levels: [
    { id: 'novice', label: 'Novice', color: '#9D00FF' },      // Hue 275° - Electric Purple (Abs)
    { id: 'beginner', label: 'Beginner', color: '#00E5FF' },  // Hue 186° - Cyan/Teal (Obliques)
    { id: 'intermediate', label: 'Intermediate', color: '#00E676' }, // Hue 145° - Vibrant Green (Shoulders)
    { id: 'pro', label: 'Pro', color: '#FFD600' },            // Hue 52° - Bright Yellow/Gold
    { id: 'advanced', label: 'Advanced', color: '#FF6D00' },  // Hue 24° - Orange (Biceps warm tone)
    { id: 'elite', label: 'Elite', color: '#FF2400' },        // Hue 8° - Bright Red (Quads)
  ],

  colors: {
    default: '#E5E5E5',
    hover: '#D4D4D4',
    background: '#F5F5F5',
  },
}

export default VIBRANT_RAINBOW
