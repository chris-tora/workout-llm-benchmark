# Muscle Tinting - Working State (2026-02-01)

## Summary

Successfully implemented muscle-isolated PNG tinting for the thermal color scheme. Each muscle PNG now contains ONLY the muscle region with transparent background, allowing proper overlay compositing.

## The Problem

When selecting a tier (e.g., "Blazing"/elite) for a single muscle, the **entire body** turned that color instead of just the selected muscle.

**Root cause:** The raw MuscleWiki PNGs contain the full body with the specific muscle highlighted in a different color. The original tinting script was applying color to ALL pixels, resulting in the entire body being tinted.

## The Solution

Added **muscle isolation** using `COLOR_THRESHOLD`:

```javascript
// Detect colored (non-grayscale) pixels - these are the muscle highlights
const colorDiff = Math.abs(srcR - srcG) + Math.abs(srcG - srcB) + Math.abs(srcR - srcB);

if (colorDiff > COLOR_THRESHOLD && srcAlpha > 10) {
  // This is a MUSCLE pixel - apply HSL color blend
  const lum = (srcR * 0.299 + srcG * 0.587 + srcB * 0.114) / 255;
  const rgb = hslToRgb(targetH, targetS, lum);
  // ... set pixel color
} else {
  // NOT a muscle pixel - make transparent
  rgbaBuffer[di + 3] = 0;
}
```

**Key parameters:**
- `COLOR_THRESHOLD = 30` - Pixels with color difference > 30 are considered muscle
- Uses proper luminance calculation: `0.299*R + 0.587*G + 0.114*B`
- HSL Color blend: Target H+S from tier color, Luminance from source (preserves texture)

## File Size Verification

Proper isolation results in much smaller files (transparent background compresses well):

| State | File Size | Description |
|-------|-----------|-------------|
| **Before (broken)** | ~370 KB | Entire body tinted |
| **After (working)** | ~25 KB | Just muscle, transparent bg |

Example: `deltoids-front-thermal-elite.png`
- Before: 380,519 bytes
- After: 25,185 bytes

## Current Configuration

### Thermal Color Scheme (only active scheme)

| Tier | Label | Color | Hue |
|------|-------|-------|-----|
| novice | Frozen | #3D5A80 | 212° (Deep Navy) |
| beginner | Cold | #4A90D9 | 212° (Ocean Blue) |
| intermediate | Cool | #48C9B0 | 168° (Cool Cyan) |
| pro | Warm | #58D68D | 145° (Fresh Green) |
| advanced | Hot | #F4D03F | 50° (Warm Yellow) |
| elite | Blazing | #E74C3C | 6° (Hot Red) |

### Generated Files

- **Total:** 144 files (24 muscles × 6 tiers)
- **Front:** 11 muscles × 6 tiers = 66 files
- **Back:** 13 muscles × 6 tiers = 78 files
- **Location:** `public/assets/muscles/male/{front,back}/`
- **Naming:** `{muscle}-thermal-{tier}.png`

## Key Files

| File | Purpose |
|------|---------|
| `scripts/tint-muscles.mjs` | Tinting script (thermal only, with isolation) |
| `src/theme/color-schemes/index.js` | Only thermal exported (others archived) |
| `src/theme/color-schemes/thermal.js` | Thermal scheme definition |
| `src/components/muscle-map/PngStrengthMap.jsx` | Main component |
| `src/components/muscle-map/PngBodyMap.jsx` | Rendering component |
| `src/constants/muscle-to-png-mapping.js` | Slug → path resolution |

## How to Regenerate

```bash
# Regenerate all thermal tiers
node scripts/tint-muscles.mjs

# Dry run (preview only)
node scripts/tint-muscles.mjs --dry-run

# Single tier only
node scripts/tint-muscles.mjs --tier elite
```

## Archived Color Schemes

The following schemes are commented out in `src/theme/color-schemes/index.js`:
- fire-ember, metallic, cosmic, monochrome-gold, crimson-purple
- sunset, ocean-depth, volcanic, aurora, spectrum, vibrant-rainbow

To restore: uncomment imports and registry entries in index.js, then regenerate PNGs with the restored scheme.

## Abs Split (Upper/Lower)

The abdominals are split into two independent muscle groups:

| Muscle ID | PNG Slug | Default Tier |
|-----------|----------|--------------|
| `abs-upper` | `rectus-abdominis-upper` | Elite (5) |
| `abs-lower` | `rectus-abdominis-lower` | Advanced (4) |

Files updated for abs split:
- `src/components/muscle-map/PngStrengthMap.jsx` - SVG_TO_PNG_MAP and MUSCLE_NAMES
- `src/components/muscle-map/useMuscleStrength.js` - DEFAULT_MUSCLE_LEVELS

## Raw Source Files

Location: `musclewiki-assets/raw-pngs/Body parts (PNG)/Body parts MALE/`

These are full-body PNGs with specific muscles highlighted in a distinct color. The tinting script detects these highlighted regions using color difference threshold.
