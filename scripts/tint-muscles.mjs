#!/usr/bin/env node

/**
 * tint-muscles.mjs
 *
 * Generates colored PNG variants from the raw MuscleWiki PNG textures.
 *
 * Each raw PNG includes muscle shading/texture. We preserve that luminance while applying
 * an HSL color blend, producing vibrant colored overlays ready for use in the muscle diagram UI.
 *
 * Usage:
 *   node scripts/tint-muscles.mjs                          # Generate default red + purple
 *   node scripts/tint-muscles.mjs --dry-run                # Preview what would be generated
 *   node scripts/tint-muscles.mjs --colors red,purple      # Specific named colors
 *   node scripts/tint-muscles.mjs --colors "#FF5500,#00AA33"  # Custom hex colors
 *   node scripts/tint-muscles.mjs --scheme fire-ember      # All 6 tiers from a color scheme
 *   node scripts/tint-muscles.mjs --scheme all             # All 9 schemes x 6 tiers each
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

// Default named colors (used when no flags are provided, or with --colors red,purple)
const NAMED_COLORS = {
  red: '#DC2626',
  purple: '#7C3AED',
};

const DEFAULT_COLOR_KEYS = ['red', 'purple'];

// All available color scheme IDs (must match files in src/theme/color-schemes/)
const ALL_SCHEME_IDS = [
  'fire-ember',
  'metallic',
  'cosmic',
  'monochrome-gold',
  'crimson-purple',
  'sunset',
  'ocean-depth',
  'volcanic',
  'aurora',
  'spectrum',     // NEW: Rainbow multi-hue (recommended)
  'thermal',      // NEW: Cold-to-hot heatmap
];

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {
    dryRun: false,
    colors: null,   // array of { name, hex }
    scheme: null,    // string scheme id or 'all'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      flags.dryRun = true;
      continue;
    }

    if (arg === '--colors' && args[i + 1]) {
      i++;
      flags.colors = args[i].split(',').map(c => {
        const trimmed = c.trim();
        // If it starts with # it's a raw hex -- use it as both name and value
        if (trimmed.startsWith('#')) {
          // Derive a filename-safe name from the hex (strip #)
          return { name: trimmed.slice(1).toLowerCase(), hex: trimmed };
        }
        // Otherwise look it up in NAMED_COLORS
        const hex = NAMED_COLORS[trimmed.toLowerCase()];
        if (!hex) {
          console.error(`Unknown color name: "${trimmed}". Known names: ${Object.keys(NAMED_COLORS).join(', ')}`);
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
Usage: node scripts/tint-muscles.mjs [options]

Options:
  --dry-run              List what would be generated without writing files
  --colors <list>        Comma-separated color names or hex values
                         Names: ${Object.keys(NAMED_COLORS).join(', ')}
                         Hex:   "#DC2626,#7C3AED"
  --scheme <id|all>      Generate all tier colors for a scheme (or all schemes)
                         Schemes: ${ALL_SCHEME_IDS.join(', ')}
  --help, -h             Show this help

Examples:
  node scripts/tint-muscles.mjs                         # Default: red + purple
  node scripts/tint-muscles.mjs --colors red             # Only red
  node scripts/tint-muscles.mjs --colors "#FF5500"       # Custom hex
  node scripts/tint-muscles.mjs --scheme fire-ember      # 6 tiers from fire-ember
  node scripts/tint-muscles.mjs --scheme all             # All 9 schemes x 6 tiers
  node scripts/tint-muscles.mjs --scheme all --dry-run   # Preview scheme generation
`);
}

// ---------------------------------------------------------------------------
// Color scheme loading
// ---------------------------------------------------------------------------

async function loadSchemeColors(schemeId) {
  // Dynamically import the scheme file to extract its levels
  const schemePath = join(PROJECT_ROOT, 'src/theme/color-schemes', `${schemeId}.js`);
  const mod = await import(schemePath);

  // Each scheme file exports a default object with a `levels` array
  const scheme = mod.default || Object.values(mod)[0];
  if (!scheme?.levels?.length) {
    throw new Error(`Scheme "${schemeId}" has no levels array`);
  }

  // Return color entries: name = "schemeId-levelId", hex = level.color
  return scheme.levels.map(level => ({
    name: `${schemeId}-${level.id}`,
    hex: level.color,
  }));
}

// ---------------------------------------------------------------------------
// Color resolution: determine which colors to generate
// ---------------------------------------------------------------------------

async function resolveColors(flags) {
  // --scheme takes precedence if provided alongside --colors
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

  // Default: red + purple
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
// ---------------------------------------------------------------------------

async function tintMuscle(rawPath, color, outputPath, dryRun) {
  if (dryRun) return;

  const { r: tr, g: tg, b: tb } = hexToRgb(color.hex);
  const { h: targetH, s: targetS } = rgbToHsl(tr, tg, tb);

  const metadata = await sharp(rawPath).metadata();
  const needsResize = metadata.width !== TARGET_SIZE || metadata.height !== TARGET_SIZE;

  let rawImage = sharp(rawPath);
  if (needsResize) {
    rawImage = rawImage.resize(TARGET_SIZE, TARGET_SIZE, { kernel: sharp.kernel.lanczos3 });
  }

  const { data: rawBuffer, info } = await rawImage
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Build RGBA buffer using HSL Color blend:
  // Target H,S + Source L (preserves texture/shading)
  const pixelCount = info.width * info.height;
  const rgbaBuffer = Buffer.alloc(pixelCount * 4);

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const sourceOffset = i * info.channels;

    let lum;
    let alpha;

    if (info.channels === 2) {
      lum = rawBuffer[sourceOffset] / 255;
      alpha = rawBuffer[sourceOffset + 1];
    } else {
      const r = rawBuffer[sourceOffset];
      const g = rawBuffer[sourceOffset + 1];
      const b = rawBuffer[sourceOffset + 2];
      lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      alpha = info.channels === 4 ? rawBuffer[sourceOffset + 3] : 255;
    }

    if (alpha === 0) {
      rgbaBuffer[offset] = 0;
      rgbaBuffer[offset + 1] = 0;
      rgbaBuffer[offset + 2] = 0;
      rgbaBuffer[offset + 3] = 0;
      continue;
    }

    const rgb = hslToRgb(targetH, targetS, lum);
    rgbaBuffer[offset] = rgb.r;
    rgbaBuffer[offset + 1] = rgb.g;
    rgbaBuffer[offset + 2] = rgb.b;
    rgbaBuffer[offset + 3] = alpha;
  }

  await sharp(rgbaBuffer, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(outputPath);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const flags = parseArgs();
  const colors = await resolveColors(flags);

  console.log(`Tint Muscles Generator`);
  console.log(`  Mode:   ${flags.dryRun ? 'DRY RUN' : 'GENERATE'}`);
  console.log(`  Colors: ${colors.length} (${colors.map(c => `${c.name}=${c.hex}`).join(', ')})`);
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

    console.log(`[${view}] ${masks.length} masks`);

    for (const maskFile of masks) {
      const maskName = basename(maskFile, '.png');
      const rawFile = RAW_FILENAME_MAP[view]?.[maskName];

      if (!rawFile) {
        console.error(`  [ERROR] No raw PNG mapping for ${view}/${maskFile}`);
        totalSkipped++;
        continue;
      }

      const rawPath = join(RAW_VIEW_DIRS[view], rawFile);

      for (const color of colors) {
        const outputFile = `${maskName}-${color.name}.png`;
        const outputPath = join(outputDir, outputFile);

        if (flags.dryRun) {
          console.log(`  [dry-run] ${view}/${outputFile}  (${color.hex})`);
          totalGenerated++;
          continue;
        }

        try {
          await tintMuscle(rawPath, color, outputPath, false);
          totalGenerated++;
        } catch (err) {
          console.error(`  [ERROR] ${view}/${outputFile}: ${err.message}`);
          totalSkipped++;
        }
      }
    }

    if (!flags.dryRun) {
      console.log(`  Generated ${masks.length * colors.length} files in ${view}/`);
    }
  }

  console.log('');
  console.log(`Done. ${totalGenerated} generated, ${totalSkipped} errors.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
