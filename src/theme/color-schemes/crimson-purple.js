/**
 * Crimson to Purple Color Scheme
 * Warm reds transitioning to cool purple - no green at all
 */
export const CRIMSON_PURPLE = {
  id: 'crimson-purple',
  name: 'Crimson Purple',
  description: 'Red to purple spectrum - warm to mystical progression',

  levels: [
    { id: 'novice', label: 'Maroon', color: '#4A1C1C' },
    { id: 'beginner', label: 'Crimson', color: '#722F37' },
    { id: 'intermediate', label: 'Ruby', color: '#9B2335' },
    { id: 'advanced', label: 'Magenta', color: '#8B3A62' },
    { id: 'elite', label: 'Violet', color: '#7B4397' },
    { id: 'worldClass', label: 'Royal Purple', color: '#9B59B6' },
  ],

  colors: {
    default: '#E5E7EB',
    hover: '#E91E63',
    background: '#F5F5F5',
  },
}

export default CRIMSON_PURPLE
