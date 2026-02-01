#!/usr/bin/env node

/**
 * tint-muscles.mjs
 *
 * Generates colored PNG variants from grayscale alpha mask PNGs.
 *
 * Each mask is a 1-bit grayscale PNG (1024x1024, except lower-back-copy at 732x732).
 * For each mask, we create a solid-color image and composite the mask as the alpha channel,
 * producing a colored overlay ready for use in the muscle diagram UI.
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

const VIEWS = ['front', 'back'];

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
// Core: tint a single mask with a single color
// ---------------------------------------------------------------------------

async function tintMask(maskPath, color, outputPath, dryRun) {
  if (dryRun) return;

  const { r, g, b } = hexToRgb(color.hex);

  // Read the mask. It's a 1-bit grayscale PNG -- we need its luminance as alpha.
  let maskImage = sharp(maskPath);
  const metadata = await maskImage.metadata();

  // Handle undersized masks (e.g., lower-back-copy at 732x732)
  const needsResize = metadata.width !== TARGET_SIZE || metadata.height !== TARGET_SIZE;

  // Pipeline: ensure single-channel grayscale, resize if needed
  let maskBuffer;
  if (needsResize) {
    maskBuffer = await sharp(maskPath)
      .resize(TARGET_SIZE, TARGET_SIZE, { kernel: sharp.kernel.lanczos3 })
      .greyscale()
      .raw()
      .toBuffer();
  } else {
    maskBuffer = await sharp(maskPath)
      .greyscale()
      .raw()
      .toBuffer();
  }

  // Build an RGBA buffer: solid color + mask luminance as alpha
  const pixelCount = TARGET_SIZE * TARGET_SIZE;
  const rgbaBuffer = Buffer.alloc(pixelCount * 4);

  for (let i = 0; i < pixelCount; i++) {
    const alpha = maskBuffer[i]; // grayscale value becomes alpha
    const offset = i * 4;
    rgbaBuffer[offset] = r;
    rgbaBuffer[offset + 1] = g;
    rgbaBuffer[offset + 2] = b;
    rgbaBuffer[offset + 3] = alpha;
  }

  await sharp(rgbaBuffer, {
    raw: { width: TARGET_SIZE, height: TARGET_SIZE, channels: 4 },
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
      const maskPath = join(MASKS_BASE, view, maskFile);

      for (const color of colors) {
        const outputFile = `${maskName}-${color.name}.png`;
        const outputPath = join(outputDir, outputFile);

        if (flags.dryRun) {
          console.log(`  [dry-run] ${view}/${outputFile}  (${color.hex})`);
          totalGenerated++;
          continue;
        }

        try {
          await tintMask(maskPath, color, outputPath, false);
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
