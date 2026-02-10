#!/usr/bin/env node

/**
 * tint-female-muscles.mjs
 *
 * Female muscle overlay generation pipeline.
 *
 * The female source PNGs (from /mnt/e) are 1920x1080 RGB composites (white
 * background, no alpha). They come in two flavours:
 *
 *   COLOR  – the highlighted muscle has clearly coloured (red/pink) pixels.
 *            We detect them with the same COLOR_THRESHOLD=30 used by the male
 *            pipeline.
 *
 *   DIFF   – the highlighted muscle is only a brightness shift from the base
 *            body image (grayscale throughout). We diff against the
 *            un-highlighted base to discover muscle pixels.
 *
 * For slugs that have NO female source at all we copy the pre-generated male
 * overlay as a fallback (same 1024×1024 RGBA PNGs already in assets/).
 *
 * After extraction the same HSL-based Color blend (target H,S + source L)
 * used by the male pipeline tints each muscle in 8 colour variants:
 *   red, purple, thermal-{novice,beginner,intermediate,pro,advanced,elite}
 *
 * Usage:
 *   node scripts/tint-female-muscles.mjs                # Full generation
 *   node scripts/tint-female-muscles.mjs --dry-run      # Preview only
 *   node scripts/tint-female-muscles.mjs --slug calves   # Single slug
 *   node scripts/tint-female-muscles.mjs --view front    # One view only
 */

import sharp from 'sharp';
import { mkdir, copyFile, access, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TARGET_SIZE = 1024;
const COLOR_THRESHOLD = 30;   // Same as male pipeline
const DIFF_THRESHOLD = 12;    // Luminance diff to detect muscle in diff mode

const FEMALE_SRC_BASE = '/mnt/e/Workouts/Body parts FEMALE/Body parts FEMALE';
const FITNESS_APP = join(PROJECT_ROOT, '..', 'fitness-app');
const MALE_ASSETS = join(FITNESS_APP, 'assets/muscles/male');
const OUTPUT_BASE = join(FITNESS_APP, 'assets/muscles/female');

// Affine transform: maps 1920×1080 source coordinates → 1024×1024 target
// target = source * scale + offset
// So to find the source crop: source_start = -offset / scale, source_size = 1024 / scale
const TRANSFORMS = {
  front: { scaleX: 1.3359, scaleY: 1.3306, offsetX: -489.26, offsetY: -48.18 },
  back:  { scaleX: 1.3385, scaleY: 1.3338, offsetX: -490.51, offsetY: -50.03 },
};

// 8 colour variants (matches male pipeline output naming)
const COLORS = [
  { name: 'red',                   hex: '#DC2626' },
  { name: 'purple',                hex: '#7C3AED' },
  { name: 'thermal-novice',        hex: '#3D5A80' },
  { name: 'thermal-beginner',      hex: '#4A90D9' },
  { name: 'thermal-intermediate',  hex: '#48C9B0' },
  { name: 'thermal-pro',           hex: '#58D68D' },
  { name: 'thermal-advanced',      hex: '#F4D03F' },
  { name: 'thermal-elite',         hex: '#E74C3C' },
];

// ---------------------------------------------------------------------------
// Front muscles  (14 slugs)
// ---------------------------------------------------------------------------

const FRONT_MUSCLES = {
  // -- Have female source  (targetPx = expected non-transparent pixels at 1024×1024, from male ref × 1.3) --
  'rectus-abdominis':  { file: 'Abs.png',              method: 'color' },
  'biceps-long':       { file: 'Biceps.png',           method: 'diff',  targetPx: 5450 },   // male: 4190
  'calves':            { file: 'Calves_.png',           method: 'color' },
  'chest-upper':       { file: 'Upper Chest.png',       method: 'diff',  targetPx: 4690 },   // male: 3608
  'deltoids-front':    { file: 'Front Shoulders.png',   method: 'diff',  targetPx: 9000 },   // male: 6917
  'quadriceps':        { file: 'Quad.png',              method: 'diff',  targetPx: 35470 },  // male: 27285
  'trapezius':         { file: 'Trapezious.png',        method: 'diff',  targetPx: 25840 },  // male back: 19875
  'wrist-extensors':   { file: 'Arms.png',              method: 'diff',  targetPx: 11060 },  // male: 8505
  // -- Male fallback --
  'chest-lower':              { method: 'male-fallback' },
  'deltoids-side':            { method: 'male-fallback' },
  'hip-adductors':            { method: 'male-fallback' },
  'obliques':                 { method: 'male-fallback' },
  'rectus-abdominis-lower':   { method: 'male-fallback' },
  'rectus-abdominis-upper':   { method: 'male-fallback' },
};

const FRONT_BASE = 'Front.png';   // Un-highlighted base body

// ---------------------------------------------------------------------------
// Back muscles  (15 slugs)
// ---------------------------------------------------------------------------

const BACK_MUSCLES = {
  // -- Have female source  (targetPx = expected non-transparent pixels at 1024×1024, from male ref × 1.3) --
  'calves':            { file: 'Calves.png',             method: 'diff',  targetPx: 26590 },  // male: 20454
  'deltoids-back':     { file: 'deltoid.png',            method: 'diff',  targetPx: 8185 },   // male: 6296
  'gluteus':           { file: 'gluteal.png',            method: 'color' },
  'hamstrings':        { file: 'Hamstrings.png',         method: 'color' },
  'latissimus-dorsi':  { file: 'Latissimus Dorsi.png',   method: 'color' },
  'trapezius':         { file: 'Upper Trapezius.png',     method: 'diff',  targetPx: 25840 },  // male: 19875
  'triceps':           { file: 'triceps brachii.png',     method: 'diff',  targetPx: 19740 },  // male: 15181 (upper+lower+outer)
  'wrist-flexors':     { file: 'forearm extensor.png',    method: 'color' },
  // -- Male fallback --
  'biceps-lower':      { method: 'male-fallback' },
  'hip-adductors':     { method: 'male-fallback' },
  'infraspinatus':     { method: 'male-fallback' },
  'lower-back-copy':   { method: 'male-fallback' },
  'triceps-lower':     { method: 'male-fallback' },
  'triceps-outer':     { method: 'male-fallback' },
  'triceps-upper':     { method: 'male-fallback' },
};

const BACK_BASE = 'Back_Body.png';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = { dryRun: false, slug: null, view: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') { flags.dryRun = true; continue; }
    if (args[i] === '--slug' && args[i+1]) { flags.slug = args[++i]; continue; }
    if (args[i] === '--view' && args[i+1]) { flags.view = args[++i]; continue; }
    if (args[i] === '--help' || args[i] === '-h') {
      console.log(`Usage: node scripts/tint-female-muscles.mjs [--dry-run] [--slug <name>] [--view front|back]`);
      process.exit(0);
    }
    console.error(`Unknown arg: ${args[i]}`);
    process.exit(1);
  }
  return flags;
}

// ---------------------------------------------------------------------------
// Colour utilities  (identical to male pipeline)
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const c = hex.replace('#', '');
  return { r: parseInt(c.slice(0,2),16), g: parseInt(c.slice(2,4),16), b: parseInt(c.slice(4,6),16) };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch (max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break;
      case g: h = ((b-r)/d + 2)/6; break;
      case b: h = ((r-g)/d + 4)/6; break;
    }
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q-p)*6*t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q-p)*(2/3-t)*6;
      return p;
    };
    const q = l < 0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l - q;
    r = hue2rgb(p,q,h+1/3);
    g = hue2rgb(p,q,h);
    b = hue2rgb(p,q,h-1/3);
  }
  return { r: Math.round(r*255), g: Math.round(g*255), b: Math.round(b*255) };
}

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

async function loadRaw(path) {
  const meta = await sharp(path).metadata();
  const buf = await sharp(path).raw().toBuffer();
  return { buf, width: meta.width, height: meta.height, channels: meta.channels };
}

/**
 * Morphological opening on the alpha channel: erosion then dilation.
 * Eroding by `r` pixels eliminates structures thinner than 2r+1 pixels,
 * then dilating restores surviving thick blobs to approximately their
 * original size. This removes body-outline ghosts from diff extraction
 * while preserving the filled muscle area.
 */
function morphOpen(buf, width, height, r = 3) {
  const N = width * height;

  // Extract alpha into a Uint8 mask (0 or 1)
  const mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) mask[i] = buf[i * 4 + 3] > 0 ? 1 : 0;

  // Erosion: pixel survives only if ALL pixels in its (2r+1)×(2r+1) box are 1.
  // Optimised with separable 1-D passes (horizontal then vertical).
  const erodeH = new Uint8Array(N);
  for (let y = 0; y < height; y++) {
    let run = 0; // consecutive 1s ending at x
    for (let x = 0; x < width; x++) {
      run = mask[y * width + x] ? run + 1 : 0;
      // A pixel passes H-erosion if run ≥ 2r+1  (i.e., all pixels in [x-2r, x] are 1)
      erodeH[y * width + x] = run >= 2 * r + 1 ? 1 : 0;
    }
  }
  // Shift result left by r so the surviving strip is centred
  const erodeHC = new Uint8Array(N);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = x + r;
      erodeHC[y * width + x] = sx < width ? erodeH[y * width + sx] : 0;
    }
  }
  // Vertical pass on erodeHC
  const eroded = new Uint8Array(N);
  for (let x = 0; x < width; x++) {
    let run = 0;
    for (let y = 0; y < height; y++) {
      run = erodeHC[y * width + x] ? run + 1 : 0;
      eroded[y * width + x] = run >= 2 * r + 1 ? 1 : 0;
    }
  }
  // Shift down by r to centre
  const erodedC = new Uint8Array(N);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const sy = y + r;
      erodedC[y * width + x] = sy < height ? eroded[sy * width + x] : 0;
    }
  }

  // Dilation: pixel becomes 1 if ANY pixel in its (2r+1)×(2r+1) box is 1.
  // Again separable: horizontal then vertical max.
  const dilateH = new Uint8Array(N);
  for (let y = 0; y < height; y++) {
    // Sliding window max over width 2r+1
    for (let x = 0; x < width; x++) {
      let found = 0;
      const x0 = Math.max(0, x - r), x1 = Math.min(width - 1, x + r);
      for (let xx = x0; xx <= x1; xx++) {
        if (erodedC[y * width + xx]) { found = 1; break; }
      }
      dilateH[y * width + x] = found;
    }
  }
  const dilated = new Uint8Array(N);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let found = 0;
      const y0 = Math.max(0, y - r), y1 = Math.min(height - 1, y + r);
      for (let yy = y0; yy <= y1; yy++) {
        if (dilateH[yy * width + x]) { found = 1; break; }
      }
      dilated[y * width + x] = found;
    }
  }

  // Apply: zero out pixels where dilated mask is 0
  const out = Buffer.from(buf);
  for (let i = 0; i < N; i++) {
    if (!dilated[i]) {
      out[i*4] = out[i*4+1] = out[i*4+2] = out[i*4+3] = 0;
    }
  }
  return out;
}

/** Compute crop region that maps to the 1024×1024 target via the affine transform. */
function getCropRegion(view, srcWidth, srcHeight) {
  const t = TRANSFORMS[view];
  let left   = Math.round(-t.offsetX / t.scaleX);
  let top    = Math.round(-t.offsetY / t.scaleY);
  let width  = Math.round(TARGET_SIZE / t.scaleX);
  let height = Math.round(TARGET_SIZE / t.scaleY);

  // Clamp to source bounds
  if (left < 0) { width += left; left = 0; }
  if (top < 0) { height += top; top = 0; }
  if (left + width > srcWidth)  width  = srcWidth - left;
  if (top + height > srcHeight) height = srcHeight - top;

  return { left, top, width, height };
}

// ---------------------------------------------------------------------------
// Track A: COLOR-THRESHOLD extraction  (same as male pipeline)
// ---------------------------------------------------------------------------

async function extractColor(srcPath, targetHex, outputPath, view) {
  const { r: tr, g: tg, b: tb } = hexToRgb(targetHex);
  const { h: targetH, s: targetS } = rgbToHsl(tr, tg, tb);
  const src = await loadRaw(srcPath);
  const pixels = src.width * src.height;
  const ch = src.channels;

  const out = Buffer.alloc(pixels * 4);
  let musclePx = 0;

  for (let i = 0; i < pixels; i++) {
    const si = i * ch;
    const di = i * 4;
    const r = src.buf[si], g = src.buf[si+1], b = src.buf[si+2];
    const a = ch === 4 ? src.buf[si+3] : 255;
    const colorDiff = Math.abs(r-g) + Math.abs(g-b) + Math.abs(r-b);

    if (colorDiff > COLOR_THRESHOLD && a > 10) {
      const lum = (r*0.299 + g*0.587 + b*0.114) / 255;
      const rgb = hslToRgb(targetH, targetS, lum);
      out[di]   = rgb.r;
      out[di+1] = rgb.g;
      out[di+2] = rgb.b;
      out[di+3] = a;
      musclePx++;
    } else {
      out[di] = out[di+1] = out[di+2] = out[di+3] = 0;
    }
  }

  // Crop to body region & resize to 1024×1024
  const crop = getCropRegion(view, src.width, src.height);
  await sharp(out, { raw: { width: src.width, height: src.height, channels: 4 } })
    .extract(crop)
    .resize(TARGET_SIZE, TARGET_SIZE, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(outputPath);

  return musclePx;
}

// ---------------------------------------------------------------------------
// Track B: DIFF-BASED extraction  (for grayscale-highlighted muscles)
//
// Uses adaptive thresholds: instead of a fixed DIFF_THRESHOLD, we compute the
// threshold per-muscle so that only ~targetPx pixels (at 1024² output) survive.
// This handles the large systematic brightness differences between the female
// base images and muscle screenshots.
// ---------------------------------------------------------------------------

async function extractDiff(srcPath, basePath, targetHex, outputPath, view, targetPx) {
  const { r: tr, g: tg, b: tb } = hexToRgb(targetHex);
  const { h: targetH, s: targetS } = rgbToHsl(tr, tg, tb);

  const src  = await loadRaw(srcPath);
  const base = await loadRaw(basePath);
  const ch = src.channels;
  const bch = base.channels;

  const crop = getCropRegion(view, src.width, src.height);

  // ---- Phase 1: collect all diffs in the crop region to find adaptive threshold ----
  const cropDiffs = [];
  for (let y = crop.top; y < crop.top + crop.height; y++) {
    for (let x = crop.left; x < crop.left + crop.width; x++) {
      const i = y * src.width + x;
      const si = i * ch;
      const bi = i * bch;
      const sr = src.buf[si], sg = src.buf[si+1], sb = src.buf[si+2];
      const br = base.buf[bi], bg = base.buf[bi+1], bb = base.buf[bi+2];
      const srcLum = sr*0.299 + sg*0.587 + sb*0.114;
      const basLum = br*0.299 + bg*0.587 + bb*0.114;

      // Skip white background
      if (srcLum > 250 && basLum > 250) continue;

      const diff = Math.abs(srcLum - basLum);
      const colorDiff = Math.abs(sr-sg) + Math.abs(sg-sb) + Math.abs(sr-sb);

      // Pixels with actual colour always count (like color method)
      if (colorDiff > COLOR_THRESHOLD) {
        cropDiffs.push(999); // sentinel: always above any threshold
      } else {
        cropDiffs.push(diff);
      }
    }
  }

  // The crop region maps to 1024×1024 after resize. Scale targetPx to crop-pixel count.
  const cropPixels = crop.width * crop.height;
  const scaledTarget = Math.round(targetPx * (cropPixels / (TARGET_SIZE * TARGET_SIZE)));

  // Sort descending, pick threshold at scaledTarget position
  cropDiffs.sort((a, b) => b - a);
  let adaptiveThreshold = cropDiffs[Math.min(scaledTarget, cropDiffs.length - 1)] || 20;
  adaptiveThreshold = Math.max(adaptiveThreshold, 15); // floor to avoid noise

  // ---- Phase 2: apply threshold and tint ----
  const pixels = src.width * src.height;
  const out = Buffer.alloc(pixels * 4);
  let musclePx = 0;

  for (let i = 0; i < pixels; i++) {
    const si = i * ch;
    const bi = i * bch;
    const di = i * 4;

    const sr = src.buf[si], sg = src.buf[si+1], sb = src.buf[si+2];
    const br = base.buf[bi], bg = base.buf[bi+1], bb = base.buf[bi+2];

    const srcLum = sr*0.299 + sg*0.587 + sb*0.114;
    const basLum = br*0.299 + bg*0.587 + bb*0.114;
    const diff = Math.abs(srcLum - basLum);
    const colorDiff = Math.abs(sr-sg) + Math.abs(sg-sb) + Math.abs(sr-sb);

    if (srcLum > 250 && basLum > 250) {
      out[di] = out[di+1] = out[di+2] = out[di+3] = 0;
      continue;
    }

    if (diff > adaptiveThreshold || colorDiff > COLOR_THRESHOLD) {
      const normLum = srcLum / 255;
      const rgb = hslToRgb(targetH, targetS, normLum);

      // Alpha: full for colour pixels, gradient based on diff strength for others
      const alpha = colorDiff > COLOR_THRESHOLD ? 255 :
        Math.min(255, Math.round(Math.min(diff / adaptiveThreshold, 1.5) * 170 + 85));

      out[di]   = rgb.r;
      out[di+1] = rgb.g;
      out[di+2] = rgb.b;
      out[di+3] = alpha;
      musclePx++;
    } else {
      out[di] = out[di+1] = out[di+2] = out[di+3] = 0;
    }
  }

  // Crop + resize to 1024×1024
  const cropped = await sharp(out, { raw: { width: src.width, height: src.height, channels: 4 } })
    .extract(crop)
    .resize(TARGET_SIZE, TARGET_SIZE, { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer();

  // Phase 3: morphological opening to remove thin body-outline ghost artifacts
  const cleaned = morphOpen(cropped, TARGET_SIZE, TARGET_SIZE, 3);

  await sharp(cleaned, { raw: { width: TARGET_SIZE, height: TARGET_SIZE, channels: 4 } })
    .png()
    .toFile(outputPath);

  return { musclePx, adaptiveThreshold };
}

// ---------------------------------------------------------------------------
// Track C: Male fallback  (copy existing male overlay, or re-tint from red)
// ---------------------------------------------------------------------------

async function copyMaleOverlay(slug, view, colorName, colorHex, outputPath) {
  const malePath = join(MALE_ASSETS, view, `${slug}-${colorName}.png`);
  try {
    await access(malePath);
    await copyFile(malePath, outputPath);
    return true;
  } catch {
    // Color variant doesn't exist — re-tint from the red variant
    const redPath = join(MALE_ASSETS, view, `${slug}-red.png`);
    try {
      await access(redPath);
    } catch { return false; }

    const { r: tr, g: tg, b: tb } = hexToRgb(colorHex);
    const { h: targetH, s: targetS } = rgbToHsl(tr, tg, tb);
    const src = await loadRaw(redPath);
    const pixels = src.width * src.height;
    const ch = src.channels;
    const out = Buffer.alloc(pixels * 4);

    for (let i = 0; i < pixels; i++) {
      const si = i * ch;
      const di = i * 4;
      const a = ch === 4 ? src.buf[si + 3] : 255;
      if (a < 10) { out[di] = out[di+1] = out[di+2] = out[di+3] = 0; continue; }
      const lum = (src.buf[si]*0.299 + src.buf[si+1]*0.587 + src.buf[si+2]*0.114) / 255;
      const rgb = hslToRgb(targetH, targetS, lum);
      out[di] = rgb.r; out[di+1] = rgb.g; out[di+2] = rgb.b; out[di+3] = a;
    }

    await sharp(out, { raw: { width: src.width, height: src.height, channels: 4 } })
      .png()
      .toFile(outputPath);
    return true;
  }
}

// ---------------------------------------------------------------------------
// Process a single view (front or back)
// ---------------------------------------------------------------------------

async function processView(view, muscles, baseName, flags) {
  const viewDir = view === 'front' ? 'Front Body Female' : 'Back Body Female';
  const srcDir = join(FEMALE_SRC_BASE, viewDir);
  const basePath = join(srcDir, baseName);
  const outputDir = join(OUTPUT_BASE, view);

  if (!flags.dryRun) {
    await mkdir(outputDir, { recursive: true });
  }

  const slugs = Object.keys(muscles);
  let generated = 0, skipped = 0, fallbacks = 0;

  console.log(`\n[${view.toUpperCase()}] ${slugs.length} muscles`);

  for (const slug of slugs) {
    if (flags.slug && flags.slug !== slug) continue;
    const config = muscles[slug];

    for (const color of COLORS) {
      const outputFile = `${slug}-${color.name}.png`;
      const outputPath = join(outputDir, outputFile);

      if (flags.dryRun) {
        console.log(`  [dry-run] ${view}/${outputFile}  method=${config.method}`);
        generated++;
        continue;
      }

      try {
        if (config.method === 'male-fallback') {
          const ok = await copyMaleOverlay(slug, view, color.name, color.hex, outputPath);
          if (ok) { fallbacks++; }
          else { console.log(`    ⚠ No male overlay: ${view}/${outputFile}`); skipped++; }
        }
        else if (config.method === 'color') {
          const srcPath = join(srcDir, config.file);
          const px = await extractColor(srcPath, color.hex, outputPath, view);
          generated++;
        }
        else if (config.method === 'diff') {
          const srcPath = join(srcDir, config.file);
          const result = await extractDiff(srcPath, basePath, color.hex, outputPath, view, config.targetPx);
          if (color.name === 'red') {
            console.log(`    adaptive threshold=${result.adaptiveThreshold}  pixels=${result.musclePx}`);
          }
          generated++;
        }
      } catch (err) {
        console.log(`    ✗ ${view}/${outputFile}: ${err.message}`);
        skipped++;
      }
    }

    const method = config.method === 'male-fallback' ? '(male fallback)' :
                   config.method === 'color' ? '(color threshold)' :
                   `(diff adaptive, target=${config.targetPx})`;
    console.log(`  ✓ ${slug} ${method}`);
  }

  return { generated, skipped, fallbacks };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const flags = parseArgs();

  console.log('Female Muscle Overlay Pipeline');
  console.log('==============================');
  console.log(`Mode: ${flags.dryRun ? 'DRY RUN' : 'GENERATE'}`);
  console.log(`Colors: ${COLORS.length} variants`);
  console.log(`Source: ${FEMALE_SRC_BASE}`);
  console.log(`Output: ${OUTPUT_BASE}`);

  let totalGen = 0, totalSkip = 0, totalFall = 0;

  if (!flags.view || flags.view === 'front') {
    const r = await processView('front', FRONT_MUSCLES, FRONT_BASE, flags);
    totalGen += r.generated; totalSkip += r.skipped; totalFall += r.fallbacks;
  }

  if (!flags.view || flags.view === 'back') {
    const r = await processView('back', BACK_MUSCLES, BACK_BASE, flags);
    totalGen += r.generated; totalSkip += r.skipped; totalFall += r.fallbacks;
  }

  console.log(`\n==============================`);
  console.log(`Done. ${totalGen} generated, ${totalFall} male fallbacks, ${totalSkip} errors.`);
  console.log(`Total: ${totalGen + totalFall} files`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
