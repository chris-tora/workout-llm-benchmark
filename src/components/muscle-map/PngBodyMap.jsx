import { useMemo, useState, useRef, useCallback } from 'react'
import {
  getMuscleOverlays,
  slugToPath,
  basePath as getBasePath,
} from '../../constants/muscle-to-png-mapping'

// Per-muscle ripple pulse animation - signals "clickable/interactive"
const SHINE_ANIMATION_CSS = `
  @keyframes muscleRipple {
    0% {
      transform: scale(0.4);
      opacity: 0;
    }
    15% {
      opacity: 0.5;
    }
    50% {
      opacity: 0.3;
    }
    100% {
      transform: scale(1.8);
      opacity: 0;
    }
  }
  
  @keyframes muscleGlow {
    0%, 100% {
      filter: brightness(1) drop-shadow(0 0 0px rgba(59, 130, 246, 0));
    }
    50% {
      filter: brightness(1.08) drop-shadow(0 0 6px rgba(59, 130, 246, 0.35));
    }
  }
  
  .muscle-shine {
    position: relative;
  }
  
  .muscle-shine::after {
    content: '';
    position: absolute;
    inset: -10%;
    background: radial-gradient(
      circle at center,
      rgba(59, 130, 246, 0.5) 0%,
      rgba(59, 130, 246, 0.2) 30%,
      transparent 70%
    );
    border-radius: 50%;
    animation: muscleRipple 2.2s ease-out infinite;
    animation-delay: var(--shine-delay, 0s);
    pointer-events: none;
    will-change: transform, opacity;
    z-index: 15;
  }
  
  /* Pause animation on hover to let hover state take priority */
  .muscle-shine:hover::after {
    animation-play-state: paused;
    opacity: 0;
  }
  
  /* Subtle glow animation on the image itself */
  .muscle-shine img {
    animation: muscleGlow 2.2s ease-in-out infinite;
    animation-delay: var(--shine-delay, 0s);
  }
  
  .muscle-shine:hover img,
  .muscle-shine.selected img {
    animation-play-state: paused;
  }
  
  /* No shine when selected - user has made their choice */
  .muscle-shine.selected::after {
    display: none;
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
        <style>{SHINE_ANIMATION_CSS}</style>
        <img
          src={baseSrc}
          alt={`${view} body`}
          className="w-full h-auto block relative z-0"
          draggable={false}
        />
        {/* Muscle overlays container */}
        <div className="absolute inset-0 z-10">
        {layers.map(({ slug, color, path }, index) => {
          const isSelected = selectedSlug === slug
          const isHovered = hoveredSlug === slug
          const showShine = shineEnabled && interactive && !isSelected

          // All overlays are pointer-events-none; container handles clicks
          // Only transition filter for hover effects, not the image itself
          const overlayClasses = [
            'absolute inset-0 w-full h-full pointer-events-none',
            'transition-[filter] duration-200 ease-out',
          ]

          // Add shine class when enabled
          if (showShine) {
            overlayClasses.push('muscle-shine')
          }
          if (isSelected) {
            overlayClasses.push('selected')
          }

          // Build dynamic styles for hover/selection effects
          // Base outline: multiple stacked drop-shadows for visible stroke effect
          const baseOutline = 'drop-shadow(1px 0 0 rgba(0,0,0,0.6)) drop-shadow(-1px 0 0 rgba(0,0,0,0.6)) drop-shadow(0 1px 0 rgba(0,0,0,0.6)) drop-shadow(0 -1px 0 rgba(0,0,0,0.6))'
          const overlayStyle = {
            filter: baseOutline,
          }

          // Staggered animation delay based on index for organic feel
          // Also adds some randomness based on slug to make it less predictable
          const slugCharSum = slug.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
          const delay = ((index * 0.15) + (slugCharSum % 5) * 0.1) % 2.2
          overlayStyle['--shine-delay'] = `${delay}s`

          if (interactive) {
            if (isSelected) {
              overlayStyle.filter = `brightness(1.25) ${baseOutline} drop-shadow(0 0 10px rgba(59, 130, 246, 0.9))`
            } else if (isHovered) {
              overlayStyle.filter = `brightness(1.15) ${baseOutline} drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))`
            }
          }

          return (
            <div
              key={`${slug}-${color}`}
              className={overlayClasses.join(' ')}
              style={overlayStyle}
            >
              <img
                ref={(el) => { overlayRefs.current[slug] = el }}
                src={path}
                alt=""
                className="w-full h-full"
                draggable={false}
                crossOrigin="anonymous"
              />
            </div>
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
