# Muscle Map Implementation Status

**Last Updated:** 2026-02-01
**Commit:** `73c94b6 feat(muscle-map): use raw MuscleWiki PNGs for rich muscle texture`

## Overview

Interactive PNG-based muscle body map with HSL Color blend mode for vibrant, textured overlays. The system preserves underlying muscle anatomy (striations, shading, 3D form) while applying color-coded strength tiers.

## Architecture

```
Raw MuscleWiki PNGs → HSL Color Tint → Colored Texture PNGs → PngBodyMap Component
     (grayscale)         (script)           (1584 files)         (React)
```

## Source Assets

**Location:** `musclewiki-assets/raw-pngs/Body parts (PNG)/Body parts MALE/`

The raw MuscleWiki PNGs are isolated muscle overlays with:
- Full grayscale texture (muscle striations, shading, highlights)
- Alpha transparency (~17% opaque area, rest transparent)
- High resolution suitable for 1024×1024 output
- File size ~350KB (vs ~10KB for flat extracted masks)

### Front View Muscles (11)
| Mask Name | Raw PNG Filename |
|-----------|------------------|
| biceps-long | Biceps-LONG_.png |
| chest-lower | Chest-LOWER_.png |
| chest-upper | Chest-UPPER_.png |
| deltoids-front | Deltoids-FRONT_.png |
| deltoids-side | Deltoids-SIDE_.png |
| hip-adductors | Hip-Adductors_.png |
| obliques | Obliques_.png |
| quadriceps | Quadriceps_.png |
| rectus-abdominis-lower | Rectus-Abdominis-LOWER_.png |
| rectus-abdominis-upper | Rectus-Abdominis-UPPER_.png |
| wrist-extensors | Wrist-extensors_.png |

### Back View Muscles (13)
| Mask Name | Raw PNG Filename |
|-----------|------------------|
| biceps-lower | Biceps_LOWER.png |
| calves | Calves.png |
| deltoids-back | Deltoids-BACK.png |
| gluteus | Gluteus.png |
| hamstrings | Hamstrings.png |
| hip-adductors | Hip-Adductors.png |
| latissimus-dorsi | Latissimus-Dorsi.png |
| lower-back-copy | lower-back copy.png |
| trapezius | Trapezius.png |
| triceps-lower | Triceps-LOWER_.png |
| triceps-outer | Triceps-OUTER_.png |
| triceps-upper | Triceps-UPPER.png |
| wrist-flexors | Wrist-Flexors_.png |

## HSL Color Blend Algorithm

The tinting script applies HSL Color blend mode, which:

1. **Extracts** Hue (H) and Saturation (S) from the target color
2. **Preserves** Luminance (L) from the source grayscale texture
3. **Combines** them to produce vibrant colored output with texture intact

```javascript
// For each pixel:
const { h: targetH, s: targetS } = rgbToHsl(targetColor)
const sourceLuminance = grayscalePixel / 255
const outputRgb = hslToRgb(targetH, targetS, sourceLuminance)
```

This is the same technique used in Photoshop's "Color" blend layer mode.

### Why HSL Color Blend?

| Blend Mode | Result |
|------------|--------|
| Multiply | Darkens everything, loses detail in shadows |
| Overlay | Boosts contrast but clips highlights |
| **HSL Color** | ✅ Preserves all texture while applying vibrant color |

## Color Schemes

11 schemes × 6 tiers = 66 color variants per muscle

| Scheme | Tiers (Novice → Elite) |
|--------|------------------------|
| fire-ember | ash → charcoal → cinder → magma → lava → inferno |
| thermal | cold → cool → warm → hot → burning → scorching |
| volcanic | obsidian → basite → pumice → ember → magma → eruption |
| metallic | iron → steel → bronze → silver → gold → platinum |
| cosmic | nebula → stardust → aurora → supernova → pulsar → quasar |
| monochrome-gold | pale → light → medium → rich → deep → intense |
| crimson-purple | rose → crimson → ruby → violet → purple → royal |
| sunset | dawn → sunrise → morning → noon → dusk → twilight |
| ocean-depth | shallow → coastal → marine → deep → abyss → trench |
| aurora | mint → teal → cyan → azure → indigo → violet |
| spectrum | red → orange → yellow → green → blue → purple |

## Generated Output

**Location:** `public/assets/muscles/male/{front,back}/`

**Total Files:** 1584 PNGs (24 muscles × 66 color variants)

**Naming Convention:** `{muscle-name}-{scheme}-{tier}.png`

Examples:
- `chest-upper-fire-ember-lava.png`
- `biceps-long-thermal-hot.png`
- `gluteus-spectrum-green.png`

## Tinting Pipeline

**Script:** `scripts/tint-muscles.mjs`

### Usage

```bash
# Generate all schemes (1584 files)
node scripts/tint-muscles.mjs --scheme all

# Generate specific scheme (144 files)
node scripts/tint-muscles.mjs --scheme fire-ember

# Preview without generating
node scripts/tint-muscles.mjs --scheme all --dry-run

# Named colors only (for testing)
node scripts/tint-muscles.mjs --colors red,purple
```

### Processing Flow

1. Reads mask files from `public/assets/muscles/male/masks/{front,back}/`
2. Maps mask names to raw PNG filenames via `RAW_FILENAME_MAP`
3. Loads raw PNG from `musclewiki-assets/raw-pngs/...`
4. Applies HSL Color blend with target color
5. Outputs to `public/assets/muscles/male/{front,back}/`

## React Component

**File:** `src/components/muscle-map/PngBodyMap.jsx`

### Features

- **Layered PNG overlays** on anatomical base
- **Pixel-perfect click detection** via canvas alpha sampling
- **Color scheme support** via `colorScheme` prop
- **Interactive highlighting** on hover/click

### Click Detection Algorithm

```javascript
function getPixelAlpha(img, x, y) {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const scaleX = img.naturalWidth / img.clientWidth
  const scaleY = img.naturalHeight / img.clientHeight
  const imgX = Math.floor(x * scaleX)
  const imgY = Math.floor(y * scaleY)

  const pixel = ctx.getImageData(imgX, imgY, 1, 1).data
  return pixel[3] // alpha channel
}
```

All overlays have `pointer-events: none`. The container handles clicks and iterates through muscle images bottom-to-top, checking alpha at click coordinates.

### Props

| Prop | Type | Description |
|------|------|-------------|
| view | `'front'` \| `'back'` | Which body view to display |
| muscleLevels | `Record<string, number>` | Muscle ID → tier index (0-5) |
| colorScheme | `string` | Color scheme ID (default: 'fire-ember') |
| onMuscleClick | `(muscleId) => void` | Click handler |
| selectedMuscle | `string \| null` | Currently selected muscle |
| highlightColor | `string` | Highlight overlay color |

## State Management

**File:** `src/components/muscle-map/useMuscleStrength.js`

- Persists muscle levels to Supabase (`muscle_strength_profiles` table)
- Uses browser ID for anonymous persistence
- Default demo levels show all 6 tiers

## Pending Work

### React Native Port (Tasks #13, #14)

The web implementation needs to be ported to React Native for the fitness app:

1. Replace DOM canvas with `react-native-canvas` or `expo-gl`
2. Use `react-native-fast-image` for optimized PNG loading
3. Implement touch detection via `onTouchStart` with coordinate mapping
4. Bundle muscle PNGs with app or load from CDN

### Files to Port

- `src/components/muscle-map/PngBodyMap.jsx` → React Native
- `src/components/muscle-map/PngStrengthMap.jsx` → React Native wrapper
- `src/components/muscle-map/useMuscleStrength.js` → Works as-is (Supabase)

## Reference Documentation

- `MUSCLE-TEXTURING-GUIDE.md` - Detailed HSL blend explanation
- `COLOR-SCHEME-ANALYSIS.md` - Color scheme perceptual analysis
- `scripts/test-multi-muscle-composite.mjs` - Reference composite script
