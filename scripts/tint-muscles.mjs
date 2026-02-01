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
// Core: tint a single mask with a single color
// ---------------------------------------------------------------------------

async function tintMask(maskPath, color, outputPath, dryRun) {
  if (dryRun) return;

  const { r: tr, g: tg, b: tb } = hexToRgb(color.hex);
  const { h: targetH, s: targetS } = rgbToHsl(tr, tg, tb);

  // Read the mask as grayscale - the value represents luminance/shading
  const metadata = await sharp(maskPath).metadata();
  const needsResize = metadata.width !== TARGET_SIZE || metadata.height !== TARGET_SIZE;

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

  // Build RGBA buffer using HSL Color blend:
  // Target H,S + Source L (preserves texture/shading)
  const pixelCount = TARGET_SIZE * TARGET_SIZE;
  const rgbaBuffer = Buffer.alloc(pixelCount * 4);

  for (let i = 0; i < pixelCount; i++) {
    const gray = maskBuffer[i];
    const offset = i * 4;

    if (gray > 0) {
      // Boost luminance to 0.35-0.85 range for vivid colors
      // Raw mask values are often low (dark grays), this makes colors visible
      const normalizedGray = gray / 255;
      const lum = 0.35 + normalizedGray * 0.50;
      // Apply HSL color blend: target H,S + boosted L
      const rgb = hslToRgb(targetH, targetS, lum);
      rgbaBuffer[offset] = rgb.r;
      rgbaBuffer[offset + 1] = rgb.g;
      rgbaBuffer[offset + 2] = rgb.b;
      rgbaBuffer[offset + 3] = gray; // Use grayscale as alpha too
    } else {
      // Fully transparent
      rgbaBuffer[offset] = 0;
      rgbaBuffer[offset + 1] = 0;
      rgbaBuffer[offset + 2] = 0;
      rgbaBuffer[offset + 3] = 0;
    }
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
