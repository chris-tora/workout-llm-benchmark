#!/usr/bin/env node

/**
 * test-blend-comparison.mjs
 *
 * Generates comparison images for all 4 blend techniques across
 * a full color scheme to validate visual quality before regeneration.
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuration
const RAW_PATH = join(PROJECT_ROOT, 'musclewiki-assets/raw-pngs/Body parts (PNG)/Body parts MALE/Front body MALE/Chest-UPPER_.png');
const OUTPUT_DIR = join(PROJECT_ROOT, 'public/temp-color-test');
const TARGET_SIZE = 1024;

// Volcanic scheme - 6 tiers
const VOLCANIC_TIERS = [
  { id: 'novice', label: 'Ash', color: '#1a1a1a' },
  { id: 'beginner', label: 'Charcoal', color: '#3d2817' },
  { id: 'intermediate', label: 'Cinder', color: '#92400e' },
  { id: 'pro', label: 'Magma', color: '#dc2626' },
  { id: 'advanced', label: 'Lava', color: '#ef4444' },
  { id: 'elite', label: 'Molten', color: '#fca5a5' },
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
// Blend modes
// ---------------------------------------------------------------------------

function blendMultiply(lum, colorVal) {
  return Math.round((lum / 255) * colorVal);
}

function blendOverlay(lum, colorVal) {
  const l = lum / 255;
  const c = colorVal / 255;
  if (l < 0.5) {
    return Math.round(255 * 2 * l * c);
  }
  return Math.round(255 * (1 - 2 * (1 - l) * (1 - c)));
}

function blendOverlayMultiply(lum, colorVal) {
  const l = lum / 255;
  const c = colorVal / 255;
  const overlayResult = l < 0.5 ? 2 * l * c : 1 - 2 * (1 - l) * (1 - c);
  return Math.round(255 * overlayResult * l);
}

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

async function generateImage(rawBuf, meta, hex, blendMode, outputPath) {
  const { r, g, b } = hexToRgb(hex);
  const pixels = meta.width * meta.height;
  const ch = meta.channels;
  const out = Buffer.alloc(pixels * 4);

  if (blendMode === 'color') {
    const { h: targetH, s: targetS } = rgbToHsl(r, g, b);
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
  } else {
    const blendFn = {
      multiply: blendMultiply,
      overlay: blendOverlay,
      'overlay-multiply': blendOverlayMultiply,
    }[blendMode];

    for (let i = 0; i < pixels; i++) {
      const si = i * ch;
      const di = i * 4;
      const lum = rawBuf[si];
      const alpha = ch === 4 ? rawBuf[si + 3] : 255;
      out[di] = blendFn(lum, r);
      out[di + 1] = blendFn(lum, g);
      out[di + 2] = blendFn(lum, b);
      out[di + 3] = alpha;
    }
  }

  let img = sharp(out, { raw: { width: meta.width, height: meta.height, channels: 4 } });
  if (meta.width !== TARGET_SIZE || meta.height !== TARGET_SIZE) {
    img = img.resize(TARGET_SIZE, TARGET_SIZE, { kernel: sharp.kernel.lanczos3 });
  }
  await img.png().toFile(outputPath);
}

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

function generateHtml(tiers, techniques) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Blend Mode Comparison - Volcanic Scheme</title>
  <style>
    body { background: #1a1a1a; color: #fff; font-family: system-ui; padding: 20px; }
    h1 { text-align: center; margin-bottom: 5px; }
    .subtitle { text-align: center; color: #888; margin-bottom: 30px; }
    .grid { display: grid; grid-template-columns: 100px repeat(${tiers.length}, 1fr); gap: 10px; margin-bottom: 40px; }
    .header { font-weight: bold; color: #aaa; text-align: center; padding: 10px 0; }
    .tier-header { display: flex; flex-direction: column; align-items: center; }
    .tier-color { width: 30px; height: 30px; border-radius: 4px; margin-bottom: 5px; border: 1px solid #444; }
    .technique-label { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 14px; color: #888; padding: 10px; }
    .cell { text-align: center; }
    .cell img { width: 100%; max-width: 150px; height: auto; border-radius: 8px; background: #333; }
    .cell p { font-size: 10px; color: #666; margin: 4px 0 0; }
    .recommended { border: 2px solid gold; }
    .legend { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
    .legend span { color: gold; }
  </style>
</head>
<body>
  <h1>Blend Mode Comparison - Volcanic Scheme</h1>
  <p class="subtitle">Testing visibility of expertise tiers (novice → elite) across 4 blend techniques</p>

  <div class="grid">
    <div class="header"></div>
    ${tiers.map(t => `
    <div class="header tier-header">
      <div class="tier-color" style="background: ${t.color}"></div>
      <div>${t.label}</div>
      <div style="font-size: 10px; color: #666">${t.color}</div>
    </div>`).join('')}

    ${techniques.map(tech => `
    <div class="technique-label">${tech.toUpperCase()}${tech === 'color' ? ' ⭐' : ''}</div>
    ${tiers.map(t => `
    <div class="cell">
      <img src="chest-upper-${tech}-${t.id}.png" class="${tech === 'color' ? 'recommended' : ''}">
    </div>`).join('')}`).join('')}
  </div>

  <div class="legend">
    <span>⭐ Gold border = COLOR blend mode (recommended)</span><br>
    Look for: Clear tier progression • Visible texture/shading • No muddy colors
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Blend Mode Comparison Test');
  console.log('==========================');
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log('');

  await mkdir(OUTPUT_DIR, { recursive: true });

  // Load raw image once
  console.log('Loading raw image...');
  const rawBuf = await sharp(RAW_PATH).raw().toBuffer();
  const meta = await sharp(RAW_PATH).metadata();
  console.log(`  Size: ${meta.width}x${meta.height}, ${meta.channels} channels`);

  const techniques = ['color', 'multiply', 'overlay', 'overlay-multiply'];
  let count = 0;

  for (const tech of techniques) {
    console.log(`\n[${tech.toUpperCase()}]`);
    for (const tier of VOLCANIC_TIERS) {
      const filename = `chest-upper-${tech}-${tier.id}.png`;
      const outputPath = join(OUTPUT_DIR, filename);
      await generateImage(rawBuf, meta, tier.color, tech, outputPath);
      console.log(`  ✓ ${filename} (${tier.color})`);
      count++;
    }
  }

  // Generate HTML comparison
  const html = generateHtml(VOLCANIC_TIERS, techniques);
  await writeFile(join(OUTPUT_DIR, 'index.html'), html);
  console.log('\n✓ Generated index.html');

  console.log(`\nDone! ${count} images generated.`);
  console.log(`Open: file://${OUTPUT_DIR}/index.html`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
