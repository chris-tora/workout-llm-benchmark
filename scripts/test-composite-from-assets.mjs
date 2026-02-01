#!/usr/bin/env node

/**
 * test-composite-from-assets.mjs
 *
 * Creates composite body map using PRE-GENERATED tinted assets
 * to validate tier color differentiation.
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const OUTPUT_DIR = join(PROJECT_ROOT, 'public/temp-color-test');
const ASSETS_DIR = join(PROJECT_ROOT, 'public/assets/muscles/male');
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

// Front muscles with tiers - use asset filenames
const FRONT_MUSCLES = [
  { slug: 'chest-upper', tier: 'elite' },
  { slug: 'chest-lower', tier: 'advanced' },
  { slug: 'deltoids-front', tier: 'pro' },
  { slug: 'deltoids-side', tier: 'intermediate' },
  { slug: 'biceps-long', tier: 'beginner' },
  { slug: 'rectus-abdominis-upper', tier: 'novice' },
  { slug: 'rectus-abdominis-lower', tier: 'intermediate' },
  { slug: 'obliques', tier: 'pro' },
  { slug: 'quadriceps', tier: 'advanced' },
];

// Back muscles with tiers
const BACK_MUSCLES = [
  { slug: 'trapezius', tier: 'elite' },
  { slug: 'latissimus-dorsi', tier: 'advanced' },
  { slug: 'deltoids-back', tier: 'pro' },
  { slug: 'triceps-upper', tier: 'intermediate' },
  { slug: 'triceps-lower', tier: 'beginner' },
  { slug: 'lower-back-copy', tier: 'novice' },
  { slug: 'gluteus', tier: 'pro' },
  { slug: 'hamstrings', tier: 'advanced' },
  { slug: 'calves', tier: 'intermediate' },
];

async function compositeBody(muscles, view, outputPath) {
  const layers = [];

  for (const muscle of muscles) {
    const filename = `${muscle.slug}-volcanic-${muscle.tier}.png`;
    const assetPath = join(ASSETS_DIR, view, filename);
    const tier = VOLCANIC[muscle.tier];

    try {
      const buffer = await sharp(assetPath).toBuffer();
      layers.push({ input: buffer, top: 0, left: 0 });
      console.log(`  ✓ ${muscle.slug}: ${muscle.tier} (${tier.color})`);
    } catch (err) {
      console.log(`  ✗ ${muscle.slug}: ${err.message}`);
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

  return layers.length;
}

function generateHtml() {
  const tierLegend = Object.entries(VOLCANIC)
    .map(([id, t]) => `<div class="tier"><span class="swatch" style="background:${t.color}"></span>${t.label} (${id})</div>`)
    .join('');

  const frontLegend = FRONT_MUSCLES
    .map(m => `<div class="muscle">${m.slug}: <span style="color:${VOLCANIC[m.tier].color}">${m.tier}</span></div>`)
    .join('');

  const backLegend = BACK_MUSCLES
    .map(m => `<div class="muscle">${m.slug}: <span style="color:${VOLCANIC[m.tier].color}">${m.tier}</span></div>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>Multi-Muscle Composite - Volcanic Tiers (From Assets)</title>
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
  <p class="subtitle">Using PRE-GENERATED tinted assets - each muscle at different expertise tier</p>

  <div class="container">
    <div class="view">
      <h2>Front View</h2>
      <img src="composite-front-assets.png">
    </div>
    <div class="view">
      <h2>Back View</h2>
      <img src="composite-back-assets.png">
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

async function main() {
  console.log('Multi-Muscle Composite Test (From Pre-Generated Assets)');
  console.log('=========================================================\n');

  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log('[FRONT VIEW]');
  const frontPath = join(OUTPUT_DIR, 'composite-front-assets.png');
  const frontCount = await compositeBody(FRONT_MUSCLES, 'front', frontPath);
  console.log(`  → ${frontCount} muscles composited\n`);

  console.log('[BACK VIEW]');
  const backPath = join(OUTPUT_DIR, 'composite-back-assets.png');
  const backCount = await compositeBody(BACK_MUSCLES, 'back', backPath);
  console.log(`  → ${backCount} muscles composited\n`);

  const html = generateHtml();
  await writeFile(join(OUTPUT_DIR, 'composite-assets.html'), html);
  console.log('✓ Generated composite-assets.html');

  console.log(`\nOpen: http://localhost:5173/temp-color-test/composite-assets.html`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
