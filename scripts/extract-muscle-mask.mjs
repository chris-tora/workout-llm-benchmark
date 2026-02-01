#!/usr/bin/env node

/**
 * extract-muscle-mask.mjs
 *
 * Extracts the HIGHLIGHTED MUSCLE AREA from MuscleWiki PNGs.
 * The source images show grayscale bodies with the target muscle in orange/red.
 * This script isolates ONLY the colored (non-grayscale) pixels.
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const OUTPUT_DIR = join(PROJECT_ROOT, 'public/temp-color-test/isolated');
const RAW_DIR = join(PROJECT_ROOT, 'musclewiki-assets/raw-pngs/Body parts (PNG)/Body parts MALE');

// Test muscles
const TEST_MUSCLES = [
  { name: 'chest-upper', path: 'Front body MALE/Chest-UPPER_.png' },
  { name: 'biceps-long', path: 'Front body MALE/Biceps-LONG_.png' },
  { name: 'quadriceps', path: 'Front body MALE/Quadriceps_.png' },
  { name: 'deltoids-front', path: 'Front body MALE/Deltoids-FRONT_.png' },
];

// Threshold for detecting "colored" vs "grayscale" pixels
// If abs(R-G) + abs(G-B) + abs(R-B) > threshold, it's colored
const COLOR_THRESHOLD = 30;

async function extractMuscle(rawPath, outputPath) {
  const rawBuf = await sharp(rawPath).raw().toBuffer();
  const meta = await sharp(rawPath).metadata();
  const pixels = meta.width * meta.height;
  const ch = meta.channels;

  const out = Buffer.alloc(pixels * 4);
  let coloredPixels = 0;

  for (let i = 0; i < pixels; i++) {
    const si = i * ch;
    const di = i * 4;

    const r = rawBuf[si];
    const g = rawBuf[si + 1];
    const b = rawBuf[si + 2];
    const a = ch === 4 ? rawBuf[si + 3] : 255;

    // Calculate "colorfulness" - how far from grayscale
    const colorDiff = Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);

    if (colorDiff > COLOR_THRESHOLD && a > 10) {
      // This is a colored (highlighted) pixel - keep it
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = a;
      coloredPixels++;
    } else {
      // Grayscale or transparent - make transparent
      out[di] = 0;
      out[di + 1] = 0;
      out[di + 2] = 0;
      out[di + 3] = 0;
    }
  }

  await sharp(out, {
    raw: { width: meta.width, height: meta.height, channels: 4 },
  }).png().toFile(outputPath);

  return { total: pixels, colored: coloredPixels, pct: (coloredPixels / pixels * 100).toFixed(2) };
}

async function main() {
  console.log('Muscle Mask Extraction Test');
  console.log('===========================\n');
  console.log('Isolating colored (highlighted) pixels from MuscleWiki PNGs\n');

  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const muscle of TEST_MUSCLES) {
    const rawPath = join(RAW_DIR, muscle.path);
    const outputPath = join(OUTPUT_DIR, `${muscle.name}-isolated.png`);

    try {
      const stats = await extractMuscle(rawPath, outputPath);
      console.log(`✓ ${muscle.name}: ${stats.colored} colored pixels (${stats.pct}%)`);
    } catch (err) {
      console.log(`✗ ${muscle.name}: ${err.message}`);
    }
  }

  console.log(`\nOutput: ${OUTPUT_DIR}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
