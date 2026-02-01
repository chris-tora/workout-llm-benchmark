import { useMemo } from 'react'
import {
  getMuscleOverlays,
  slugToPath,
  basePath as getBasePath,
} from '../../constants/muscle-to-png-mapping'

const SIZE_CLASSES = {
  sm: 'max-w-[200px]',
  md: 'max-w-md',
  lg: 'max-w-xl',
}

const DEFAULT_BASE_PATH = '/assets/muscles/male'

/**
 * Separate layers by view (front/back) from a flat layers array.
 *
 * @param {Array<{slug: string, view: 'front'|'back', color: string}>} layers
 * @param {string} base - base asset path
 * @returns {{ front: Array<{slug: string, color: string, path: string}>, back: Array<{slug: string, color: string, path: string}> }}
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
 * Single body panel (front or back) with base image and overlay layers.
 */
function BodyPanel({ view, layers, base, showLabel, sizeClass }) {
  const baseSrc = getBasePath(view, base)

  return (
    <div className={`flex-1 ${sizeClass}`}>
      {showLabel && (
        <p className="text-center text-xs uppercase tracking-wider text-zinc-400 mb-3">
          {view === 'front' ? 'Front' : 'Back'}
        </p>
      )}
      <div className="relative rounded-xl overflow-hidden bg-white">
        <img
          src={baseSrc}
          alt={`${view} body`}
          className="w-full h-auto block"
          draggable={false}
        />
        {layers.map(({ slug, color, path }) => (
          <img
            key={`${slug}-${color}`}
            src={path}
            alt=""
            className="absolute inset-0 w-full h-full pointer-events-none"
            draggable={false}
          />
        ))}
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
 * @param {object} props
 * @param {Array<{slug: string, view: 'front'|'back', color: string}>} [props.layers]
 * @param {string} [props.target]
 * @param {string[]} [props.secondaryMuscles]
 * @param {string} [props.className]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.showLabels=true]
 * @param {string} [props.basePath='/assets/muscles/male']
 */
export function PngBodyMap({
  layers,
  target,
  secondaryMuscles,
  className = '',
  size = 'md',
  showLabels = true,
  basePath: base = DEFAULT_BASE_PATH,
}) {
  const { front, back } = useMemo(() => {
    // Mode 1: explicit layers prop
    if (layers) {
      return splitLayersByView(layers, base)
    }

    // Mode 2: target + secondaryMuscles shorthand
    if (target) {
      return getMuscleOverlays(target, secondaryMuscles ?? [], base)
    }

    // No input -- empty body
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
      />
      <BodyPanel
        view="back"
        layers={back}
        base={base}
        showLabel={showLabels}
        sizeClass={sizeClass}
      />
    </div>
  )
}

export default PngBodyMap
