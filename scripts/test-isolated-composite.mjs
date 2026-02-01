#!/usr/bin/env node

/**
 * test-isolated-composite.mjs
 *
 * Creates composite using ISOLATED muscle masks extracted from MuscleWiki PNGs.
 * Each muscle is truly isolated (only colored pixels) and can be tinted independently.
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const OUTPUT_DIR = join(PROJECT_ROOT, 'public/temp-color-test');
const RAW_DIR = join(PROJECT_ROOT, 'musclewiki-assets/raw-pngs/Body parts (PNG)/Body parts MALE');
const TARGET_SIZE = 1024;

// Spectrum scheme - Rainbow multi-hue (NEW - recommended)
const SPECTRUM = {
  novice: { label: 'Novice', color: '#8B7FC7' },       // Violet
  beginner: { label: 'Beginner', color: '#5B9BD5' },   // Sky Blue
  intermediate: { label: 'Intermediate', color: '#4ECDC4' }, // Teal
  pro: { label: 'Pro', color: '#7CB342' },             // Lime Green
  advanced: { label: 'Advanced', color: '#FF8A65' },   // Coral Orange
  elite: { label: 'Elite', color: '#FFD54F' },         // Golden Yellow
};

// Thermal scheme - Cold-to-hot heatmap
const THERMAL = {
  novice: { label: 'Frozen', color: '#3D5A80' },       // Navy
  beginner: { label: 'Cold', color: '#4A90D9' },       // Blue
  intermediate: { label: 'Cool', color: '#48C9B0' },   // Cyan
  pro: { label: 'Warm', color: '#58D68D' },            // Green
  advanced: { label: 'Hot', color: '#F4D03F' },        // Yellow
  elite: { label: 'Blazing', color: '#E74C3C' },       // Red
};

// Old Volcanic scheme (kept for comparison)
const VOLCANIC = {
  novice: { label: 'Ash', color: '#1a1a1a' },
  beginner: { label: 'Charcoal', color: '#3d2817' },
  intermediate: { label: 'Cinder', color: '#92400e' },
  pro: { label: 'Magma', color: '#dc2626' },
  advanced: { label: 'Lava', color: '#ef4444' },
  elite: { label: 'Molten', color: '#fca5a5' },
};

// Active scheme for this test
const ACTIVE_SCHEME = SPECTRUM;

// Front muscles - varied tiers to show differentiation
const FRONT_MUSCLES = [
  { name: 'chest-upper', tier: 'elite', path: 'Front body MALE/Chest-UPPER_.png' },
  { name: 'chest-lower', tier: 'advanced', path: 'Front body MALE/Chest-LOWER_.png' },
  { name: 'deltoids-front', tier: 'pro', path: 'Front body MALE/Deltoids-FRONT_.png' },
  { name: 'deltoids-side', tier: 'intermediate', path: 'Front body MALE/Deltoids-SIDE_.png' },
  { name: 'biceps-long', tier: 'beginner', path: 'Front body MALE/Biceps-LONG_.png' },
  { name: 'abs-upper', tier: 'novice', path: 'Front body MALE/Rectus-Abdominis-UPPER_.png' },
  { name: 'abs-lower', tier: 'pro', path: 'Front body MALE/Rectus-Abdominis-LOWER_.png' },
  { name: 'obliques', tier: 'intermediate', path: 'Front body MALE/Obliques_.png' },
  { name: 'quadriceps', tier: 'advanced', path: 'Front body MALE/Quadriceps_.png' },
];

const COLOR_THRESHOLD = 30;

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
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
// Image processing
// ---------------------------------------------------------------------------

async function extractAndTintMuscle(rawPath, targetHex) {
  const { r: tr, g: tg, b: tb } = hexToRgb(targetHex);
  const { h: targetH, s: targetS } = rgbToHsl(tr, tg, tb);

  const rawBuf = await sharp(rawPath).raw().toBuffer();
  const meta = await sharp(rawPath).metadata();
  const pixels = meta.width * meta.height;
  const ch = meta.channels;

  const out = Buffer.alloc(pixels * 4);

  for (let i = 0; i < pixels; i++) {
    const si = i * ch;
    const di = i * 4;

    const r = rawBuf[si];
    const g = rawBuf[si + 1];
    const b = rawBuf[si + 2];
    const a = ch === 4 ? rawBuf[si + 3] : 255;

    // Detect colored (non-grayscale) pixels
    const colorDiff = Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);

    if (colorDiff > COLOR_THRESHOLD && a > 10) {
      // Calculate luminance from original pixel
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

      // Apply Color blend: target H,S + source L
      const rgb = hslToRgb(targetH, targetS, lum);

      out[di] = rgb.r;
      out[di + 1] = rgb.g;
      out[di + 2] = rgb.b;
      out[di + 3] = a;
    } else {
      // Not a muscle pixel - make transparent
      out[di] = 0;
      out[di + 1] = 0;
      out[di + 2] = 0;
      out[di + 3] = 0;
    }
  }

  let img = sharp(out, { raw: { width: meta.width, height: meta.height, channels: 4 } });
  if (meta.width !== TARGET_SIZE || meta.height !== TARGET_SIZE) {
    img = img.resize(TARGET_SIZE, TARGET_SIZE, { kernel: sharp.kernel.lanczos3 });
  }
  return img.png().toBuffer();
}

// Create grayscale base body from a raw PNG (remove colored highlights)
async function createGrayscaleBase(rawPath) {
  const rawBuf = await sharp(rawPath).raw().toBuffer();
  const meta = await sharp(rawPath).metadata();
  const pixels = meta.width * meta.height;
  const ch = meta.channels;

  const out = Buffer.alloc(pixels * 4);

  for (let i = 0; i < pixels; i++) {
    const si = i * ch;
    const di = i * 4;

    const r = rawBuf[si];
    const g = rawBuf[si + 1];
    const b = rawBuf[si + 2];
    const a = ch === 4 ? rawBuf[si + 3] : 255;

    // Convert to grayscale
    const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);

    out[di] = gray;
    out[di + 1] = gray;
    out[di + 2] = gray;
    out[di + 3] = a;
  }

  let img = sharp(out, { raw: { width: meta.width, height: meta.height, channels: 4 } });
  if (meta.width !== TARGET_SIZE || meta.height !== TARGET_SIZE) {
    img = img.resize(TARGET_SIZE, TARGET_SIZE, { kernel: sharp.kernel.lanczos3 });
  }
  return img.png().toBuffer();
}

async function compositeBody(muscles, outputPath) {
  const layers = [];

  // First layer: grayscale base body (use first muscle's raw as source)
  const baseRawPath = join(RAW_DIR, muscles[0].path);
  try {
    const baseBuffer = await createGrayscaleBase(baseRawPath);
    layers.push({ input: baseBuffer, top: 0, left: 0 });
    console.log(`  ✓ Base body (grayscale)`);
  } catch (err) {
    console.log(`  ✗ Base body: ${err.message}`);
  }

  // Overlay colored muscles on top
  for (const muscle of muscles) {
    const rawPath = join(RAW_DIR, muscle.path);
    const tier = ACTIVE_SCHEME[muscle.tier];

    try {
      const tintedBuffer = await extractAndTintMuscle(rawPath, tier.color);
      layers.push({ input: tintedBuffer, top: 0, left: 0 });
      console.log(`  ✓ ${muscle.name}: ${muscle.tier} (${tier.color})`);
    } catch (err) {
      console.log(`  ✗ ${muscle.name}: ${err.message}`);
    }
  }

  if (layers.length > 0) {
    await sharp({
      create: {
        width: TARGET_SIZE,
        height: TARGET_SIZE,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(layers)
      .png()
      .toFile(outputPath);
  }

  return layers.length - 1; // Don't count base
}

function generateHtml() {
  const tierLegend = Object.entries(ACTIVE_SCHEME)
    .map(([id, t]) => `<div class="tier"><span class="swatch" style="background:${t.color}"></span>${t.label}</div>`)
    .join('');

  const muscleLegend = FRONT_MUSCLES
    .map(m => `<div class="muscle"><span class="dot" style="background:${ACTIVE_SCHEME[m.tier].color}"></span>${m.name}: ${m.tier}</div>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>ISOLATED Muscle Composite - Volcanic Tiers</title>
  <style>
    body { background: #1a1a1a; color: #fff; font-family: system-ui; padding: 20px; }
    h1 { text-align: center; }
    .subtitle { text-align: center; color: #888; margin-bottom: 30px; }
    .success { text-align: center; color: #4ade80; font-size: 18px; margin-bottom: 20px; }
    .container { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; }
    .view { text-align: center; }
    .view h2 { margin-bottom: 10px; }
    .view img { width: 500px; height: 500px; background: #333; border-radius: 12px; }
    .legend { margin-top: 40px; }
    .tiers { display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; }
    .tier { display: flex; align-items: center; gap: 8px; }
    .swatch { width: 24px; height: 24px; border-radius: 4px; border: 1px solid #444; }
    .muscles { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; max-width: 800px; margin: 0 auto; }
    .muscle { display: flex; align-items: center; gap: 6px; background: #333; padding: 6px 12px; border-radius: 6px; font-size: 12px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
  </style>
</head>
<body>
  <h1>ISOLATED Muscle Composite - Volcanic Scheme</h1>
  <p class="subtitle">Each muscle extracted from source, tinted to its tier color</p>
  <p class="success">✓ Only highlighted muscle pixels are visible - no overlapping bodies!</p>

  <div class="container">
    <div class="view">
      <h2>Front View</h2>
      <img src="composite-isolated-front.png">
    </div>
  </div>

  <div class="legend">
    <h3 style="text-align:center">Tier Colors</h3>
    <div class="tiers">${tierLegend}</div>

    <h3 style="text-align:center; margin-top: 30px;">Muscle Assignments</h3>
    <div class="muscles">${muscleLegend}</div>
  </div>
</body>
</html>`;
}

async function main() {
  console.log('ISOLATED Muscle Composite Test');
  console.log('==============================');
  console.log('Extracting colored pixels only, tinting to tier colors\n');

  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log('[FRONT VIEW]');
  const frontPath = join(OUTPUT_DIR, 'composite-isolated-front.png');
  const frontCount = await compositeBody(FRONT_MUSCLES, frontPath);
  console.log(`  → ${frontCount} muscles composited\n`);

  const html = generateHtml();
  await writeFile(join(OUTPUT_DIR, 'composite-isolated.html'), html);
  console.log('✓ Generated composite-isolated.html');

  console.log(`\nOpen: http://localhost:5173/temp-color-test/composite-isolated.html`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
