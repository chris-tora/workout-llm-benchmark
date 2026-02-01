/**
 * Thermal Color Scheme
 * Cold-to-hot heatmap progression
 * Intuitive temperature-based ranking (navy → blue → cyan → green → yellow → red)
 */
export const THERMAL = {
  id: 'thermal',
  name: 'Thermal',
  description: 'Cold-to-hot heatmap progression',

  levels: [
    { id: 'novice', label: 'Frozen', color: '#3D5A80' },       // Hue 212° - Deep Navy
    { id: 'beginner', label: 'Cold', color: '#4A90D9' },       // Hue 212° - Ocean Blue
    { id: 'intermediate', label: 'Cool', color: '#48C9B0' },   // Hue 168° - Cool Cyan
    { id: 'pro', label: 'Warm', color: '#58D68D' },            // Hue 145° - Fresh Green
    { id: 'advanced', label: 'Hot', color: '#F4D03F' },        // Hue 50° - Warm Yellow
    { id: 'elite', label: 'Blazing', color: '#E74C3C' },       // Hue 6° - Hot Red
  ],

  colors: {
    default: '#E5E5E5',
    hover: '#D4D4D4',
    background: '#F5F5F5',
  },
}

export default THERMAL
