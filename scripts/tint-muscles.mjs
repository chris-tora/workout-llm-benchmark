#!/usr/bin/env node

/**
 * tint-muscles.mjs
 *
 * Generates colored PNG variants from the raw MuscleWiki PNG textures.
 * THERMAL SCHEME ONLY - simplified for debugging.
 *
 * KEY: Isolates only the muscle region (colored pixels in the source) and makes
 * the rest transparent. Uses COLOR_THRESHOLD to detect muscle vs background.
 *
 * Usage:
 *   node scripts/tint-muscles.mjs                # Generate all 6 thermal tiers
 *   node scripts/tint-muscles.mjs --dry-run      # Preview what would be generated
 *   node scripts/tint-muscles.mjs --tier novice  # Generate only one tier
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

// Threshold for detecting colored (muscle) pixels vs grayscale (background)
// Pixels with |R-G| + |G-B| + |R-B| > COLOR_THRESHOLD are considered muscle
const COLOR_THRESHOLD = 30;

const MASKS_BASE = join(PROJECT_ROOT, 'public/assets/muscles/male/masks');
const OUTPUT_BASE = join(PROJECT_ROOT, 'public/assets/muscles/male');
const RAW_BASE = join(
  PROJECT_ROOT,
  'musclewiki-assets',
  'raw-pngs',
  'Body parts (PNG)',
  'Body parts MALE'
);

const VIEWS = ['front', 'back'];

const RAW_VIEW_DIRS = {
  front: join(RAW_BASE, 'Front body MALE'),
  back: join(RAW_BASE, 'Back body MALE'),
};

const RAW_FILENAME_MAP = {
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

// ---------------------------------------------------------------------------
// THERMAL COLOR SCHEME (hardcoded - only scheme supported)
// ---------------------------------------------------------------------------

const THERMAL_TIERS = [
  { id: 'novice', label: 'Novice', color: '#3D5A80' },           // Deep Navy
  { id: 'beginner', label: 'Beginner', color: '#4A90D9' },       // Ocean Blue
  { id: 'intermediate', label: 'Intermediate', color: '#48C9B0' }, // Cool Cyan
  { id: 'pro', label: 'Pro', color: '#58D68D' },                 // Fresh Green
  { id: 'advanced', label: 'Advanced', color: '#F4D03F' },       // Warm Yellow
  { id: 'elite', label: 'Elite', color: '#E74C3C' },             // Hot Red
];

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {
    dryRun: false,
    tier: null,  // null = all tiers, or specific tier id
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      flags.dryRun = true;
      continue;
    }

    if (arg === '--tier' && args[i + 1]) {
      i++;
      const tierId = args[i].trim().toLowerCase();
      const validTier = THERMAL_TIERS.find(t => t.id === tierId);
      if (!validTier) {
        console.error(`Unknown tier: "${tierId}". Valid tiers: ${THERMAL_TIERS.map(t => t.id).join(', ')}`);
        process.exit(1);
      }
      flags.tier = tierId;
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
Usage: node scripts/tint-muscles.mjs [options]

Generates tinted muscle PNGs using the THERMAL color scheme.
Isolates muscle regions and makes background transparent.

Options:
  --dry-run           List what would be generated without writing files
  --tier <id>         Generate only a specific tier (default: all 6 tiers)
                      Tiers: ${THERMAL_TIERS.map(t => t.id).join(', ')}
  --help, -h          Show this help

Examples:
  node scripts/tint-muscles.mjs                  # Generate all 6 thermal tiers
  node scripts/tint-muscles.mjs --dry-run        # Preview generation
  node scripts/tint-muscles.mjs --tier elite     # Only generate elite tier
`);
}

// ---------------------------------------------------------------------------
// Color utilities
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
// Mask discovery
// ---------------------------------------------------------------------------

async function getMaskFiles(view) {
  const dir = join(MASKS_BASE, view);
  const files = await readdir(dir);
  return files
    .filter(f => extname(f).toLowerCase() === '.png')
    .sort();
}

// ---------------------------------------------------------------------------
// Core: tint a single raw muscle texture with a single color
// ISOLATES muscle region - makes non-muscle pixels transparent
// ---------------------------------------------------------------------------

async function tintMuscle(rawPath, tier, outputPath, dryRun) {
  if (dryRun) return;

  const { r: tr, g: tg, b: tb } = hexToRgb(tier.color);
  const { h: targetH, s: targetS } = rgbToHsl(tr, tg, tb);

  // Read raw buffer directly
  const rawBuf = await sharp(rawPath).raw().toBuffer();
  const meta = await sharp(rawPath).metadata();
  const pixels = meta.width * meta.height;
  const ch = meta.channels;

  // Build RGBA buffer
  // ISOLATE: Only color pixels where color difference > threshold (muscle area)
  // Make all other pixels transparent
  const rgbaBuffer = Buffer.alloc(pixels * 4);

  for (let i = 0; i < pixels; i++) {
    const si = i * ch;
    const di = i * 4;

    // Read source RGB
    const srcR = rawBuf[si];
    const srcG = ch >= 3 ? rawBuf[si + 1] : srcR;
    const srcB = ch >= 3 ? rawBuf[si + 2] : srcR;
    const srcAlpha = ch >= 4 ? rawBuf[si + 3] : (ch === 2 ? rawBuf[si + 1] : 255);

    // Detect colored (non-grayscale) pixels - these are the muscle highlights
    const colorDiff = Math.abs(srcR - srcG) + Math.abs(srcG - srcB) + Math.abs(srcR - srcB);

    if (colorDiff > COLOR_THRESHOLD && srcAlpha > 10) {
      // This is a MUSCLE pixel - apply HSL color blend
      // Use luminance from source, H+S from target color
      const lum = (srcR * 0.299 + srcG * 0.587 + srcB * 0.114) / 255;
      const rgb = hslToRgb(targetH, targetS, lum);

      rgbaBuffer[di] = rgb.r;
      rgbaBuffer[di + 1] = rgb.g;
      rgbaBuffer[di + 2] = rgb.b;
      rgbaBuffer[di + 3] = srcAlpha;
    } else {
      // NOT a muscle pixel - make transparent
      rgbaBuffer[di] = 0;
      rgbaBuffer[di + 1] = 0;
      rgbaBuffer[di + 2] = 0;
      rgbaBuffer[di + 3] = 0;
    }
  }

  // Create output image, resize AFTER processing if needed
  let img = sharp(rgbaBuffer, {
    raw: { width: meta.width, height: meta.height, channels: 4 },
  });

  if (meta.width !== TARGET_SIZE || meta.height !== TARGET_SIZE) {
    img = img.resize(TARGET_SIZE, TARGET_SIZE, { kernel: sharp.kernel.lanczos3 });
  }

  await img.png().toFile(outputPath);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const flags = parseArgs();

  // Determine which tiers to generate
  const tiers = flags.tier
    ? THERMAL_TIERS.filter(t => t.id === flags.tier)
    : THERMAL_TIERS;

  console.log(`Tint Muscles - THERMAL SCHEME (with muscle isolation)`);
  console.log(`  Mode:      ${flags.dryRun ? 'DRY RUN' : 'GENERATE'}`);
  console.log(`  Threshold: ${COLOR_THRESHOLD} (color diff for muscle detection)`);
  console.log(`  Tiers:     ${tiers.map(t => `${t.id} (${t.color})`).join(', ')}`);
  console.log('');

  let totalGenerated = 0;
  let totalSkipped = 0;

  for (const view of VIEWS) {
    const masks = await getMaskFiles(view);
    const outputDir = join(OUTPUT_BASE, view);

    // Ensure output directory exists
    try {
      await access(outputDir);
    } catch {
      if (!flags.dryRun) {
        await mkdir(outputDir, { recursive: true });
      }
    }

    console.log(`[${view}] ${masks.length} muscles × ${tiers.length} tiers = ${masks.length * tiers.length} files`);

    for (const maskFile of masks) {
      const maskName = basename(maskFile, '.png');
      const rawFile = RAW_FILENAME_MAP[view]?.[maskName];

      if (!rawFile) {
        console.error(`  [ERROR] No raw PNG mapping for ${view}/${maskFile}`);
        totalSkipped++;
        continue;
      }

      const rawPath = join(RAW_VIEW_DIRS[view], rawFile);

      for (const tier of tiers) {
        // Output format: {muscle}-thermal-{tier}.png
        const outputFile = `${maskName}-thermal-${tier.id}.png`;
        const outputPath = join(outputDir, outputFile);

        if (flags.dryRun) {
          console.log(`  [dry-run] ${view}/${outputFile}  (${tier.color})`);
          totalGenerated++;
          continue;
        }

        try {
          await tintMuscle(rawPath, tier, outputPath, false);
          totalGenerated++;
        } catch (err) {
          console.error(`  [ERROR] ${view}/${outputFile}: ${err.message}`);
          totalSkipped++;
        }
      }
    }

    if (!flags.dryRun) {
      console.log(`  ✓ Generated ${masks.length * tiers.length} files`);
    }
  }

  console.log('');
  console.log(`Done. ${totalGenerated} generated, ${totalSkipped} errors.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
