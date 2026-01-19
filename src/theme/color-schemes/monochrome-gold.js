/**
 * Monochrome to Gold Color Scheme
 * Clean, sophisticated progression from slate gray to royal gold
 */
export const MONOCHROME_GOLD = {
  id: 'monochrome-gold',
  name: 'Monochrome Gold',
  description: 'Elegant gray scale culminating in premium gold',

  levels: [
    { id: 'novice', label: 'Slate', color: '#3D3D3D' },
    { id: 'beginner', label: 'Graphite', color: '#525252' },
    { id: 'intermediate', label: 'Pewter', color: '#6B6B6B' },
    { id: 'pro', label: 'Silver', color: '#8C8C8C' },
    { id: 'advanced', label: 'Champagne', color: '#B8A07A' },
    { id: 'elite', label: 'Royal Gold', color: '#D4AF37' },
  ],

  colors: {
    default: '#E5E7EB',
    hover: '#D4AF37',
    background: '#F5F5F5',
  },
}

export default MONOCHROME_GOLD
