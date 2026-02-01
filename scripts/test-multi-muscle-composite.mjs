#!/usr/bin/env node

/**
 * test-multi-muscle-composite.mjs
 *
 * Creates a composite body map with DIFFERENT muscles at DIFFERENT expertise tiers
 * to validate that tier colors are visually distinguishable on the same body.
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

// Volcanic scheme tiers
const VOLCANIC = {
  novice: { label: 'Ash', color: '#1a1a1a' },
  beginner: { label: 'Charcoal', color: '#3d2817' },
  intermediate: { label: 'Cinder', color: '#92400e' },
  pro: { label: 'Magma', color: '#dc2626' },
  advanced: { label: 'Lava', color: '#ef4444' },
  elite: { label: 'Molten', color: '#fca5a5' },
};

// Front muscles with their raw PNG paths and assigned tiers
const FRONT_MUSCLES = [
  { name: 'chest-upper', tier: 'elite', path: 'Front body MALE/Chest-UPPER_.png' },
  { name: 'chest-lower', tier: 'advanced', path: 'Front body MALE/Chest-LOWER_.png' },
  { name: 'deltoids-front', tier: 'pro', path: 'Front body MALE/Deltoids-FRONT_.png' },
  { name: 'deltoids-side', tier: 'intermediate', path: 'Front body MALE/Deltoids-SIDE_.png' },
  { name: 'biceps', tier: 'beginner', path: 'Front body MALE/Biceps-LONG_.png' },
  { name: 'abs-upper', tier: 'novice', path: 'Front body MALE/Rectus-Abdominis-UPPER_.png' },
  { name: 'abs-lower', tier: 'intermediate', path: 'Front body MALE/Rectus-Abdominis-LOWER_.png' },
  { name: 'obliques', tier: 'pro', path: 'Front body MALE/Obliques_.png' },
  { name: 'quads', tier: 'advanced', path: 'Front body MALE/Quadriceps_.png' },
];

// Back muscles with assigned tiers
const BACK_MUSCLES = [
  { name: 'traps', tier: 'elite', path: 'Back body MALE/Trapezius.png' },
  { name: 'lats', tier: 'advanced', path: 'Back body MALE/Latissimus-Dorsi.png' },
  { name: 'deltoids-back', tier: 'pro', path: 'Back body MALE/Deltoids-BACK.png' },
  { name: 'triceps-upper', tier: 'intermediate', path: 'Back body MALE/Triceps-UPPER.png' },
  { name: 'triceps-lower', tier: 'beginner', path: 'Back body MALE/Triceps-LOWER_.png' },
  { name: 'lower-back', tier: 'novice', path: 'Back body MALE/lower-back copy.png' },
  { name: 'glutes', tier: 'pro', path: 'Back body MALE/Gluteus.png' },
  { name: 'hamstrings', tier: 'advanced', path: 'Back body MALE/Hamstrings.png' },
  { name: 'calves', tier: 'intermediate', path: 'Back body MALE/Calves.png' },
];

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

async function tintMuscle(rawPath, hex) {
  const { r, g, b } = hexToRgb(hex);
  const { h: targetH, s: targetS } = rgbToHsl(r, g, b);

  const rawBuf = await sharp(rawPath).raw().toBuffer();
  const meta = await sharp(rawPath).metadata();
  const pixels = meta.width * meta.height;
  const ch = meta.channels;

  const out = Buffer.alloc(pixels * 4);
  for (let i = 0; i < pixels; i++) {
    const si = i * ch;
    const di = i * 4;
    const sourceLum = rawBuf[si] / 255;
    const alpha = ch === 4 ? rawBuf[si + 3] : 255;
    const rgb = hslToRgb(targetH, targetS, sourceLum);
    out[di] = rgb.r;
    out[di + 1] = rgb.g;
    out[di + 2] = rgb.b;
    out[di + 3] = alpha;
  }

  let img = sharp(out, { raw: { width: meta.width, height: meta.height, channels: 4 } });
  if (meta.width !== TARGET_SIZE || meta.height !== TARGET_SIZE) {
    img = img.resize(TARGET_SIZE, TARGET_SIZE, { kernel: sharp.kernel.lanczos3 });
  }
  return img.png().toBuffer();
}

async function compositeBody(muscles, outputPath, view) {
  // Start with transparent base
  let composite = sharp({
    create: {
      width: TARGET_SIZE,
      height: TARGET_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const layers = [];

  for (const muscle of muscles) {
    const rawPath = join(RAW_DIR, muscle.path);
    const tier = VOLCANIC[muscle.tier];
    console.log(`  ${muscle.name}: ${muscle.tier} (${tier.color})`);

    try {
      const tintedBuffer = await tintMuscle(rawPath, tier.color);
      layers.push({ input: tintedBuffer, top: 0, left: 0 });
    } catch (err) {
      console.log(`    ⚠ Skipped: ${err.message}`);
    }
  }

  if (layers.length > 0) {
    await composite.composite(layers).png().toFile(outputPath);
  }

  return layers.length;
}

function generateHtml() {
  const tierLegend = Object.entries(VOLCANIC)
    .map(([id, t]) => `<div class="tier"><span class="swatch" style="background:${t.color}"></span>${t.label} (${id})</div>`)
    .join('');

  const frontLegend = FRONT_MUSCLES
    .map(m => `<div class="muscle">${m.name}: <span style="color:${VOLCANIC[m.tier].color}">${m.tier}</span></div>`)
    .join('');

  const backLegend = BACK_MUSCLES
    .map(m => `<div class="muscle">${m.name}: <span style="color:${VOLCANIC[m.tier].color}">${m.tier}</span></div>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>Multi-Muscle Composite - Volcanic Tiers</title>
  <style>
    body { background: #1a1a1a; color: #fff; font-family: system-ui; padding: 20px; }
    h1 { text-align: center; }
    .subtitle { text-align: center; color: #888; margin-bottom: 30px; }
    .container { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; }
    .view { text-align: center; }
    .view h2 { margin-bottom: 10px; }
    .view img { width: 400px; height: 400px; background: #333; border-radius: 12px; }
    .legend { margin-top: 40px; text-align: center; }
    .tiers { display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; }
    .tier { display: flex; align-items: center; gap: 8px; }
    .swatch { width: 20px; height: 20px; border-radius: 4px; border: 1px solid #444; }
    .muscles { display: flex; gap: 40px; justify-content: center; }
    .muscle-list { text-align: left; }
    .muscle-list h3 { margin-bottom: 10px; color: #888; }
    .muscle { font-size: 12px; color: #aaa; margin: 4px 0; }
  </style>
</head>
<body>
  <h1>Multi-Muscle Composite - Volcanic Scheme</h1>
  <p class="subtitle">Each muscle is assigned a different expertise tier to verify visual differentiation</p>

  <div class="container">
    <div class="view">
      <h2>Front View</h2>
      <img src="composite-front-volcanic.png">
    </div>
    <div class="view">
      <h2>Back View</h2>
      <img src="composite-back-volcanic.png">
    </div>
  </div>

  <div class="legend">
    <h3>Tier Legend (Novice → Elite)</h3>
    <div class="tiers">${tierLegend}</div>

    <div class="muscles">
      <div class="muscle-list">
        <h3>Front Muscles</h3>
        ${frontLegend}
      </div>
      <div class="muscle-list">
        <h3>Back Muscles</h3>
        ${backLegend}
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Multi-Muscle Composite Test');
  console.log('===========================');
  console.log('Creating composite bodies with different muscles at different tiers\n');

  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log('[FRONT VIEW]');
  const frontPath = join(OUTPUT_DIR, 'composite-front-volcanic.png');
  const frontCount = await compositeBody(FRONT_MUSCLES, frontPath, 'front');
  console.log(`  → ${frontCount} muscles composited\n`);

  console.log('[BACK VIEW]');
  const backPath = join(OUTPUT_DIR, 'composite-back-volcanic.png');
  const backCount = await compositeBody(BACK_MUSCLES, backPath, 'back');
  console.log(`  → ${backCount} muscles composited\n`);

  // Generate HTML
  const html = generateHtml();
  await writeFile(join(OUTPUT_DIR, 'composite.html'), html);
  console.log('✓ Generated composite.html');

  console.log(`\nDone! Open: file://${OUTPUT_DIR}/composite.html`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
