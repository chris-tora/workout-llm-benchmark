#!/usr/bin/env node

/**
 * tint-muscles-textured.mjs
 *
 * Textured PNG tinting pipeline using HSL-based "Color" blend mode.
 *
 * This script colorizes raw grayscale muscle illustrations while preserving
 * texture and shading detail. The source PNGs are grayscale RGBA (R=G=B)
 * with alpha channel for shape.
 *
 * DEFAULT: "color" blend mode (HSL-based)
 *   - Uses Hue + Saturation from target color
 *   - Preserves Luminance from grayscale source
 *   - Works equally well for dark grays AND bright saturated colors
 *   - Industry standard for professional colorization
 *
 * Formula: output = hslToRgb(targetH, targetS, sourceLuminance)
 *
 * Alternative blend modes available for comparison:
 *   - multiply: (lum/255) * color - darker, good for shadows
 *   - overlay: contrast boost - can be harsh
 *   - overlay-multiply: two-step blend - too dark for muted colors
 *   - screen: brightens - can wash out
 *
 * Usage:
 *   node scripts/tint-muscles-textured.mjs                      # Default: red + purple (color mode)
 *   node scripts/tint-muscles-textured.mjs --dry-run            # Preview what would be generated
 *   node scripts/tint-muscles-textured.mjs --colors red,purple  # Specific named colors
 *   node scripts/tint-muscles-textured.mjs --scheme fire-ember  # All 6 tiers from a scheme
 *   node scripts/tint-muscles-textured.mjs --scheme all         # All 9 schemes x 6 tiers
 *   node scripts/tint-muscles-textured.mjs --blend multiply     # Use multiply instead of color
 */

import sharp from 'sharp';
import { readdir, mkdir, access } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TARGET_SIZE = 1024;

// Raw textured source PNGs (grayscale with alpha)
const RAW_BASE = join(PROJECT_ROOT, 'musclewiki-assets/raw-pngs/Body parts (PNG)/Body parts MALE');
const OUTPUT_BASE = join(PROJECT_ROOT, 'public/assets/muscles/male');

const VIEWS = ['front', 'back'];

// Map from normalized slug → raw filename
const SLUG_TO_RAW = {
  front: {
    'biceps-long': 'Biceps-LONG_.png',
    'chest-lower': 'Chest-LOWER_.png',
    'chest-upper': 'Chest-UPPER_.png',
    'deltoids-front': 'Deltoids-FRONT_.png',
    'deltoids-side': 'Deltoids-SIDE_.png',
    'hip-adductors': 'Hip-Adductors_.png',
    'obliques': 'Obliques_.png',
    'quadriceps': 'Quadriceps_.png',
    'rectus-abdominis-lower': 'Rectus-Abdominis-LOWER_.png',
    'rectus-abdominis-upper': 'Rectus-Abdominis-UPPER_.png',
    'wrist-extensors': 'Wrist-extensors_.png',
  },
  back: {
    'biceps-lower': 'Biceps_LOWER.png',
    'calves': 'Calves.png',
    'deltoids-back': 'Deltoids-BACK.png',
    'gluteus': 'Gluteus.png',
    'hamstrings': 'Hamstrings.png',
    'hip-adductors': 'Hip-Adductors.png',
    'latissimus-dorsi': 'Latissimus-Dorsi.png',
    'lower-back-copy': 'lower-back copy.png',
    'trapezius': 'Trapezius.png',
    'triceps-lower': 'Triceps-LOWER_.png',
    'triceps-outer': 'Triceps-OUTER_.png',
    'triceps-upper': 'Triceps-UPPER.png',
    'wrist-flexors': 'Wrist-Flexors_.png',
  },
};

// Default named colors
const NAMED_COLORS = {
  red: '#DC2626',
  purple: '#7C3AED',
};

const DEFAULT_COLOR_KEYS = ['red', 'purple'];

// All color schemes
const ALL_SCHEME_IDS = [
  'fire-ember',
  'metallic',
  'cosmic',
  'monochrome-gold',
  'crimson-purple',
  'spectrum',     // NEW: Rainbow multi-hue (recommended)
  'thermal',      // NEW: Cold-to-hot heatmap
  'sunset',
  'ocean-depth',
  'volcanic',
  'aurora',
];

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {
    dryRun: false,
    colors: null,
    scheme: null,
    blend: 'color', // Default blend mode (HSL-based, best quality)
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      flags.dryRun = true;
      continue;
    }

    if (arg === '--blend' && args[i + 1]) {
      i++;
      const mode = args[i].toLowerCase();
      if (!['color', 'multiply', 'screen', 'overlay', 'overlay-multiply'].includes(mode)) {
        console.error(`Unknown blend mode: "${mode}". Supported: color (default), multiply, screen, overlay, overlay-multiply`);
        process.exit(1);
      }
      flags.blend = mode;
      continue;
    }

    if (arg === '--colors' && args[i + 1]) {
      i++;
      flags.colors = args[i].split(',').map(c => {
        const trimmed = c.trim();
        if (trimmed.startsWith('#')) {
          return { name: trimmed.slice(1).toLowerCase(), hex: trimmed };
        }
        const hex = NAMED_COLORS[trimmed.toLowerCase()];
        if (!hex) {
          console.error(`Unknown color name: "${trimmed}". Known: ${Object.keys(NAMED_COLORS).join(', ')}`);
          process.exit(1);
        }
        return { name: trimmed.toLowerCase(), hex };
      });
      continue;
    }

    if (arg === '--scheme' && args[i + 1]) {
      i++;
      flags.scheme = args[i].trim().toLowerCase();
      if (flags.scheme !== 'all' && !ALL_SCHEME_IDS.includes(flags.scheme)) {
        console.error(`Unknown scheme: "${flags.scheme}". Available: ${ALL_SCHEME_IDS.join(', ')}, all`);
        process.exit(1);
      }
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    console.error(`Unknown argument: ${arg}`);
    printUsage();
    process.exit(1);
  }

  return flags;
}

function printUsage() {
  console.log(`
Usage: node scripts/tint-muscles-textured.mjs [options]

Options:
  --dry-run              List what would be generated without writing files
  --blend <mode>         Blend mode: color (default), multiply, screen, overlay, overlay-multiply
  --colors <list>        Comma-separated color names or hex values
  --scheme <id|all>      Generate all tier colors for a scheme (or all schemes)
  --help, -h             Show this help

Blend Modes:
  color (default)        HSL-based: uses H,S from target, L from source - best quality
  multiply               (lum/255) * color - preserves shadows, can be dark
  overlay                Contrast boost - can be harsh
  overlay-multiply       Two-step blend - can be too dark for muted colors
  screen                 Brightens - can wash out

Examples:
  node scripts/tint-muscles-textured.mjs                         # Default: red + purple (color mode)
  node scripts/tint-muscles-textured.mjs --blend multiply        # Use multiply instead
  node scripts/tint-muscles-textured.mjs --scheme fire-ember     # 6 tiers from fire-ember
  node scripts/tint-muscles-textured.mjs --scheme all            # All 9 schemes x 6 tiers
`);
}

// ---------------------------------------------------------------------------
// Color scheme loading
// ---------------------------------------------------------------------------

async function loadSchemeColors(schemeId) {
  const schemePath = join(PROJECT_ROOT, 'src/theme/color-schemes', `${schemeId}.js`);
  const mod = await import(schemePath);
  const scheme = mod.default || Object.values(mod)[0];
  if (!scheme?.levels?.length) {
    throw new Error(`Scheme "${schemeId}" has no levels array`);
  }
  return scheme.levels.map(level => ({
    name: `${schemeId}-${level.id}`,
    hex: level.color,
  }));
}

async function resolveColors(flags) {
  if (flags.scheme) {
    const schemeIds = flags.scheme === 'all' ? ALL_SCHEME_IDS : [flags.scheme];
    const allColors = [];
    for (const id of schemeIds) {
      const colors = await loadSchemeColors(id);
      allColors.push(...colors);
    }
    return allColors;
  }

  if (flags.colors) {
    return flags.colors;
  }

  return DEFAULT_COLOR_KEYS.map(name => ({ name, hex: NAMED_COLORS[name] }));
}

// ---------------------------------------------------------------------------
// Hex parsing
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

// ---------------------------------------------------------------------------
// Blend mode implementations
// ---------------------------------------------------------------------------

function blendMultiply(lum, colorVal) {
  // Multiply: (lum/255) * color
  return Math.round((lum / 255) * colorVal);
}

function blendScreen(lum, colorVal) {
  // Screen: 1 - (1-lum/255) * (1-color/255)
  return Math.round(255 * (1 - (1 - lum / 255) * (1 - colorVal / 255)));
}

function blendOverlay(lum, colorVal) {
  // Overlay: if lum < 128: 2*lum*color/255, else 255 - 2*(255-lum)*(255-color)/255
  const l = lum / 255;
  const c = colorVal / 255;
  if (l < 0.5) {
    return Math.round(255 * 2 * l * c);
  }
  return Math.round(255 * (1 - 2 * (1 - l) * (1 - c)));
}

function blendOverlayMultiply(lum, colorVal) {
  // Two-step blend: Overlay first, then Multiply with original luminance
  const l = lum / 255;
  const c = colorVal / 255;
  const overlayResult = l < 0.5
    ? 2 * l * c
    : 1 - 2 * (1 - l) * (1 - c);
  return Math.round(255 * overlayResult * l);
}

const BLEND_FUNCS = {
  multiply: blendMultiply,
  screen: blendScreen,
  overlay: blendOverlay,
  'overlay-multiply': blendOverlayMultiply,
  // Note: 'color' blend mode is handled separately in tintTextured()
  // because it operates on the full pixel, not per-channel
};

// ---------------------------------------------------------------------------
// HSL Color Space utilities for Color blend mode
// ---------------------------------------------------------------------------

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// ---------------------------------------------------------------------------
// Core: tint a raw textured PNG with a color using specified blend mode
// ---------------------------------------------------------------------------

async function tintTextured(rawPath, color, outputPath, blendMode, dryRun) {
  if (dryRun) return;

  const { r, g, b } = hexToRgb(color.hex);

  // Read raw textured PNG
  const rawBuf = await sharp(rawPath).raw().toBuffer();
  const meta = await sharp(rawPath).metadata();
  const pixels = meta.width * meta.height;
  const ch = meta.channels;

  // Handle size mismatch (e.g., lower-back at 732x732)
  let needsResize = meta.width !== TARGET_SIZE || meta.height !== TARGET_SIZE;

  // Build output RGBA buffer
  const out = Buffer.alloc(pixels * 4);

  if (blendMode === 'color') {
    // HSL-based Color blend mode: use H,S from target, L from source
    const { h: targetH, s: targetS } = rgbToHsl(r, g, b);

    for (let i = 0; i < pixels; i++) {
      const si = i * ch;
      const di = i * 4;
      const sourceLum = rawBuf[si] / 255; // R channel as luminance (R=G=B)
      const alpha = ch === 4 ? rawBuf[si + 3] : 255;

      // Apply Color blend: target H,S + source L
      const rgb = hslToRgb(targetH, targetS, sourceLum);
      out[di] = rgb.r;
      out[di + 1] = rgb.g;
      out[di + 2] = rgb.b;
      out[di + 3] = alpha;
    }
  } else {
    // Standard per-channel blend modes
    const blendFn = BLEND_FUNCS[blendMode];

    for (let i = 0; i < pixels; i++) {
      const si = i * ch;
      const di = i * 4;
      const lum = rawBuf[si]; // R channel (R=G=B for grayscale)
      const alpha = ch === 4 ? rawBuf[si + 3] : 255;

      out[di] = blendFn(lum, r);
      out[di + 1] = blendFn(lum, g);
      out[di + 2] = blendFn(lum, b);
      out[di + 3] = alpha;
    }
  }

  // Create output image
  let img = sharp(out, {
    raw: { width: meta.width, height: meta.height, channels: 4 },
  });

  // Resize if needed
  if (needsResize) {
    img = img.resize(TARGET_SIZE, TARGET_SIZE, { kernel: sharp.kernel.lanczos3 });
  }

  await img.png().toFile(outputPath);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const flags = parseArgs();
  const colors = await resolveColors(flags);

  console.log(`Tint Muscles - TEXTURED Pipeline`);
  console.log(`  Mode:   ${flags.dryRun ? 'DRY RUN' : 'GENERATE'}`);
  console.log(`  Blend:  ${flags.blend.toUpperCase()}`);
  console.log(`  Colors: ${colors.length} (${colors.slice(0, 5).map(c => `${c.name}=${c.hex}`).join(', ')}${colors.length > 5 ? '...' : ''})`);
  console.log('');

  let totalGenerated = 0;
  let totalSkipped = 0;

  for (const view of VIEWS) {
    const slugMap = SLUG_TO_RAW[view];
    const slugs = Object.keys(slugMap);
    const rawDir = join(RAW_BASE, view === 'front' ? 'Front body MALE' : 'Back body MALE');
    const outputDir = join(OUTPUT_BASE, view);

    // Ensure output directory exists
    try {
      await access(outputDir);
    } catch {
      if (!flags.dryRun) {
        await mkdir(outputDir, { recursive: true });
      }
    }

    console.log(`[${view}] ${slugs.length} muscles`);

    for (const slug of slugs) {
      const rawFile = slugMap[slug];
      const rawPath = join(rawDir, rawFile);

      for (const color of colors) {
        const outputFile = `${slug}-${color.name}.png`;
        const outputPath = join(outputDir, outputFile);

        if (flags.dryRun) {
          console.log(`  [dry-run] ${view}/${outputFile}  (${color.hex})`);
          totalGenerated++;
          continue;
        }

        try {
          await tintTextured(rawPath, color, outputPath, flags.blend, false);
          totalGenerated++;
        } catch (err) {
          console.error(`  [ERROR] ${view}/${outputFile}: ${err.message}`);
          totalSkipped++;
        }
      }
    }

    if (!flags.dryRun) {
      console.log(`  Generated ${slugs.length * colors.length} files in ${view}/`);
    }
  }

  console.log('');
  console.log(`Done. ${totalGenerated} generated, ${totalSkipped} errors.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
