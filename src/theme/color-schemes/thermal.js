/**
 * Thermal Color Scheme
 * Cold-to-hot heatmap progression with expertise level labels
 * Colors: navy → blue → cyan → green → yellow → red
 */
export const THERMAL = {
  id: 'thermal',
  name: 'Thermal',
  description: 'Expertise level with thermal colors',

  levels: [
    { id: 'novice', label: 'Novice', color: '#3D5A80' },           // Deep Navy
    { id: 'beginner', label: 'Beginner', color: '#4A90D9' },       // Ocean Blue
    { id: 'intermediate', label: 'Intermediate', color: '#48C9B0' }, // Cool Cyan
    { id: 'pro', label: 'Pro', color: '#58D68D' },                 // Fresh Green
    { id: 'advanced', label: 'Advanced', color: '#F4D03F' },       // Warm Yellow
    { id: 'elite', label: 'Elite', color: '#E74C3C' },             // Hot Red
  ],

  colors: {
    default: '#E5E5E5',
    hover: '#D4D4D4',
    background: '#F5F5F5',
  },
}

export default THERMAL
