import { useMemo, useState, useRef, useCallback } from 'react'
import {
  getMuscleOverlays,
  slugToPath,
  basePath as getBasePath,
} from '../../constants/muscle-to-png-mapping'

// Global shine animation styles - add to your global CSS or keep here
const SHINE_ANIMATION_CSS = `
  @keyframes muscleShineSweep {
    0% {
      transform: translateY(-150%);
    }
    100% {
      transform: translateY(150%);
    }
  }
`

const SIZE_CLASSES = {
  sm: 'max-w-[200px]',
  md: 'max-w-md',
  lg: 'max-w-xl',
}

const DEFAULT_BASE_PATH = '/assets/muscles/male'

/**
 * Separate layers by view (front/back) from a flat layers array.
 */
function splitLayersByView(layers, base) {
  const front = []
  const back = []

  for (const { slug, view, color } of layers) {
    const path = slugToPath(slug, view, color, base)
    if (view === 'front') {
      front.push({ slug, color, path })
    } else {
      back.push({ slug, color, path })
    }
  }

  return { front, back }
}

/**
 * Check if a pixel at (x, y) in the image is non-transparent.
 * Uses a canvas for pixel sampling.
 */
function getPixelAlpha(img, x, y) {
  if (!img.complete || !img.naturalWidth) return 0

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  // Scale click coordinates to image natural size
  const scaleX = img.naturalWidth / img.clientWidth
  const scaleY = img.naturalHeight / img.clientHeight
  const imgX = Math.floor(x * scaleX)
  const imgY = Math.floor(y * scaleY)

  if (imgX < 0 || imgX >= img.naturalWidth || imgY < 0 || imgY >= img.naturalHeight) {
    return 0
  }

  const pixel = ctx.getImageData(imgX, imgY, 1, 1).data
  return pixel[3] // alpha channel
}

/**
 * Shine overlay component - renders the sweeping shimmer effect
 */
function ShineOverlay({ enabled, className = '' }) {
  if (!enabled) return null

  return (
    <>
      <style>{SHINE_ANIMATION_CSS}</style>
      <div
        className={`pointer-events-none absolute inset-0 z-20 overflow-hidden ${className}`}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 w-full h-[200%]"
          style={{
            background: `
              linear-gradient(
                180deg,
                transparent 0%,
                transparent 40%,
                rgba(255, 255, 255, 0.15) 47%,
                rgba(255, 255, 255, 0.35) 50%,
                rgba(255, 255, 255, 0.15) 53%,
                transparent 60%,
                transparent 100%
              )
            `,
            animation: 'muscleShineSweep 6s ease-in-out infinite',
            mixBlendMode: 'overlay',
            willChange: 'transform',
          }}
        />
      </div>
    </>
  )
}

/**
 * Single body panel (front or back) with base image and overlay layers.
 * Implements pixel-perfect click detection by checking alpha values.
 */
function BodyPanel({
  view,
  layers,
  base,
  showLabel,
  sizeClass,
  interactive = false,
  selectedSlug,
  hoveredSlug,
  onMuscleClick,
  onMuscleHover,
  shineEnabled,
}) {
  const baseSrc = getBasePath(view, base)
  const containerRef = useRef(null)
  const overlayRefs = useRef({})

  // Handle click with pixel-perfect hit detection
  const handleContainerClick = useCallback((e) => {
    if (!interactive || !onMuscleClick) return

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check overlays in reverse order (top to bottom in z-order)
    // to find the topmost visible pixel
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i]
      const img = overlayRefs.current[layer.slug]
      if (!img) continue

      const alpha = getPixelAlpha(img, x, y)
      if (alpha > 20) { // Threshold to avoid edge artifacts
        onMuscleClick(layer.slug, view)
        return
      }
    }
  }, [interactive, onMuscleClick, layers, view])

  // Handle mouse move for hover detection
  const handleContainerMouseMove = useCallback((e) => {
    if (!interactive || !onMuscleHover) return

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check overlays in reverse order
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i]
      const img = overlayRefs.current[layer.slug]
      if (!img) continue

      const alpha = getPixelAlpha(img, x, y)
      if (alpha > 20) {
        onMuscleHover(layer.slug)
        return
      }
    }
    onMuscleHover(null)
  }, [interactive, onMuscleHover, layers])

  const handleContainerMouseLeave = useCallback(() => {
    if (onMuscleHover) onMuscleHover(null)
  }, [onMuscleHover])

  return (
    <div className={`flex-1 ${sizeClass}`}>
      {showLabel && (
        <p className="text-center text-xs uppercase tracking-wider text-zinc-400 mb-3">
          {view === 'front' ? 'Front' : 'Back'}
        </p>
      )}
      <div
        ref={containerRef}
        className={`relative rounded-xl overflow-hidden bg-white ${interactive ? 'cursor-pointer' : ''}`}
        onClick={handleContainerClick}
        onMouseMove={handleContainerMouseMove}
        onMouseLeave={handleContainerMouseLeave}
      >
        {/* Shine overlay - unified across all muscles */}
        <ShineOverlay enabled={shineEnabled} />
        <img
          src={baseSrc}
          alt={`${view} body`}
          className="w-full h-auto block relative z-0"
          draggable={false}
        />
        {/* Muscle overlays container */}
        <div className="absolute inset-0 z-10">
        {layers.map(({ slug, color, path }) => {
          const isSelected = selectedSlug === slug
          const isHovered = hoveredSlug === slug

          // All overlays are pointer-events-none; container handles clicks
          // Only transition filter for hover effects, not the image itself
          const overlayClasses = [
            'absolute inset-0 w-full h-full pointer-events-none',
            'transition-[filter] duration-200 ease-out',
            // Subtle dark outline to distinguish muscle regions
            'drop-shadow-[0_0_1px_rgba(0,0,0,0.4)]',
          ]

          // Build dynamic styles for hover/selection effects
          const overlayStyle = {}

          if (interactive) {
            if (isSelected) {
              overlayStyle.filter = 'brightness(1.2) drop-shadow(0 0 1px rgba(0,0,0,0.5)) drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))'
            } else if (isHovered) {
              overlayStyle.filter = 'brightness(1.15) drop-shadow(0 0 1px rgba(0,0,0,0.5)) drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))'
            }
          }

          return (
            <img
              key={`${slug}-${color}`}
              ref={(el) => { overlayRefs.current[slug] = el }}
              src={path}
              alt=""
              className={overlayClasses.join(' ')}
              style={overlayStyle}
              draggable={false}
              crossOrigin="anonymous"
            />
          )
        })}
        </div>
      </div>
    </div>
  )
}

/**
 * Reusable PNG-based body map that renders front and back views side by side
 * with colored muscle overlays stacked on a base silhouette.
 *
 * Supports two input modes:
 *
 * 1. Explicit layers:
 *    <PngBodyMap layers={[{ slug: 'chest-upper', view: 'front', color: 'red' }]} />
 *
 * 2. Exercise target shorthand (uses getMuscleOverlays from the canonical mapping):
 *    <PngBodyMap target="pectorals" secondaryMuscles={['delts', 'triceps']} />
 *
 * Interactive mode (optional):
 *    <PngBodyMap
 *      layers={[...]}
 *      interactive
 *      selectedSlug="chest-upper"
 *      onMuscleClick={(slug, view) => console.log(slug, view)}
 *    />
 */
export function PngBodyMap({
  layers,
  target,
  secondaryMuscles,
  className = '',
  size = 'md',
  showLabels = true,
  basePath: base = DEFAULT_BASE_PATH,
  interactive = false,
  selectedSlug,
  onMuscleClick,
  shine = false,
}) {
  const [hoveredSlug, setHoveredSlug] = useState(null)

  const { front, back } = useMemo(() => {
    if (layers) {
      return splitLayersByView(layers, base)
    }
    if (target) {
      return getMuscleOverlays(target, secondaryMuscles ?? [], base)
    }
    return { front: [], back: [] }
  }, [layers, target, secondaryMuscles, base])

  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md

  return (
    <div className={`flex justify-center gap-6 ${className}`}>
      <BodyPanel
        view="front"
        layers={front}
        base={base}
        showLabel={showLabels}
        sizeClass={sizeClass}
        interactive={interactive}
        selectedSlug={selectedSlug}
        hoveredSlug={hoveredSlug}
        onMuscleClick={onMuscleClick}
        onMuscleHover={interactive ? setHoveredSlug : undefined}
        shineEnabled={shine}
      />
      <BodyPanel
        view="back"
        layers={back}
        base={base}
        showLabel={showLabels}
        sizeClass={sizeClass}
        interactive={interactive}
        selectedSlug={selectedSlug}
        hoveredSlug={hoveredSlug}
        onMuscleClick={onMuscleClick}
        onMuscleHover={interactive ? setHoveredSlug : undefined}
        shineEnabled={shine}
      />
    </div>
  )
}

export default PngBodyMap
