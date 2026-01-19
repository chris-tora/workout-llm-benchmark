/**
 * Fire/Ember Color Scheme
 * Dark to white-hot progression - matches workout intensity theme
 */
export const FIRE_EMBER = {
  id: 'fire-ember',
  name: 'Fire & Ember',
  description: 'Intense progression from ash to white-hot flame',

  levels: [
    { id: 'novice', label: 'Ash', color: '#2D1E10' },
    { id: 'beginner', label: 'Smolder', color: '#501611' },
    { id: 'intermediate', label: 'Ember', color: '#8C3520' },
    { id: 'pro', label: 'Blaze', color: '#C6452E' },
    { id: 'advanced', label: 'Flame', color: '#E87B3D' },
    { id: 'elite', label: 'White Heat', color: '#F5D491' },
  ],

  colors: {
    default: '#E5E7EB',
    hover: '#FFA07A',
    background: '#F5F5F5',
  },
}

export default FIRE_EMBER
