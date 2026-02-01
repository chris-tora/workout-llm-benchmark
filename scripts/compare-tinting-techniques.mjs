#!/usr/bin/env node
/**
 * Compare different muscle tinting techniques on a single muscle
 * Generates side-by-side comparison images for visual evaluation
 */

import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Test muscle
const TEST_MUSCLE = join(ROOT, 'musclewiki-assets/raw-pngs/Body parts (PNG)/Body parts MALE/Front body MALE/Chest-UPPER_.png');
const OUTPUT_DIR = join(ROOT, 'scripts/output/tinting-comparison');

// Test colors from different schemes
const TEST_COLORS = [
  { name: 'Fire-Ember Elite', hex: '#F5D491' },
  { name: 'Metallic Elite', hex: '#F8F9F9' },
  { name: 'Cosmic Pro', hex: '#8E44AD' },
  { name: 'Ocean Pro', hex: '#2980B9' },
  { name: 'Volcanic Advanced', hex: '#E74C3C' },
  { name: 'Aurora Intermediate', hex: '#1ABC9C' },
];

/**
 * Technique 1: Simple Flat Tint (current approach - for comparison)
 */
async function tintFlat(sourceBuffer, color) {
  const rgb = hexToRgb(color);
  const { data, info } = await sharp(sourceBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const output = Buffer.alloc(info.width * info.height * 4);
  
  for (let i = 0; i < info.width * info.height; i++) {
    const a = data[i * 4 + 3];
    // Binary mask approach: if pixel has any alpha, output full color
    if (a > 10) {
      output[i * 4] = rgb.r;
      output[i * 4 + 1] = rgb.g;
      output[i * 4 + 2] = rgb.b;
      output[i * 4 + 3] = a;
    } else {
      output[i * 4] = 0;
      output[i * 4 + 1] = 0;
      output[i * 4 + 2] = 0;
      output[i * 4 + 3] = 0;
    }
  }
  
  return sharp(output, { raw: info }).png().toBuffer();
}

/**
 * Technique 2: Luminosity-Preserving Multiply (RECOMMENDED)
 */
async function tintLuminosityMultiply(sourceBuffer, color) {
  const rgb = hexToRgb(color);
  const { data, info } = await sharp(sourceBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const output = Buffer.alloc(info.width * info.height * 4);
  const tr = rgb.r / 255;
  const tg = rgb.g / 255;
  const tb = rgb.b / 255;
  
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    const a = data[i * 4 + 3];
    
    // Calculate luminosity (perceived brightness)
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    
    // Multiply luminosity with target color
    output[i * 4] = Math.min(255, Math.round(lum * tr * 255));
    output[i * 4 + 1] = Math.min(255, Math.round(lum * tg * 255));
    output[i * 4 + 2] = Math.min(255, Math.round(lum * tb * 255));
    output[i * 4 + 3] = a;
  }
  
  return sharp(output, { raw: info }).png().toBuffer();
}

/**
 * Technique 3: Color-Dominant Blend (more color saturation)
 */
async function tintColorDominant(sourceBuffer, color) {
  const rgb = hexToRgb(color);
  const { data, info } = await sharp(sourceBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const output = Buffer.alloc(info.width * info.height * 4);
  const tr = rgb.r / 255;
  const tg = rgb.g / 255;
  const tb = rgb.b / 255;
  
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    const a = data[i * 4 + 3];
    
    // Get max channel for more vivid coloring
    const maxChannel = Math.max(r, g, b);
    
    // Blend: 70% luminosity, 30% original color saturation
    const blend = maxChannel * 0.3 + (r * 0.299 + g * 0.587 + b * 0.114) * 0.7;
    
    output[i * 4] = Math.min(255, Math.round(blend * tr * 255));
    output[i * 4 + 1] = Math.min(255, Math.round(blend * tg * 255));
    output[i * 4 + 2] = Math.min(255, Math.round(blend * tb * 255));
    output[i * 4 + 3] = a;
  }
  
  return sharp(output, { raw: info }).png().toBuffer();
}

/**
 * Technique 4: Overlay with Contrast Boost
 */
async function tintOverlayContrast(sourceBuffer, color) {
  const rgb = hexToRgb(color);
  const { data, info } = await sharp(sourceBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const output = Buffer.alloc(info.width * info.height * 4);
  
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    const a = data[i * 4 + 3];
    
    // Get luminosity
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    
    // Contrast boost (S-curve approximation)
    const contrast = (lum - 0.5) * 1.2 + 0.5;
    const clampedContrast = Math.max(0, Math.min(1, contrast));
    
    output[i * 4] = Math.min(255, Math.round(clampedContrast * rgb.r));
    output[i * 4 + 1] = Math.min(255, Math.round(clampedContrast * rgb.g));
    output[i * 4 + 2] = Math.min(255, Math.round(clampedContrast * rgb.b));
    output[i * 4 + 3] = a;
  }
  
  return sharp(output, { raw: info }).png().toBuffer();
}

/**
 * Technique 5: Two-Tone (Highlights/Lowlights)
 * Creates a more illustrated look with distinct light/dark areas
 */
async function tintTwoTone(sourceBuffer, color, shadowColor = null) {
  const rgb = hexToRgb(color);
  const shadowRgb = shadowColor ? hexToRgb(shadowColor) : {
    r: Math.round(rgb.r * 0.5),
    g: Math.round(rgb.g * 0.5),
    b: Math.round(rgb.b * 0.5)
  };
  
  const { data, info } = await sharp(sourceBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const output = Buffer.alloc(info.width * info.height * 4);
  
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    const a = data[i * 4 + 3];
    
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    
    // Two-tone: blend between highlight and shadow based on luminosity
    const t = lum; // 0 = shadow, 1 = highlight
    
    output[i * 4] = Math.min(255, Math.round(shadowRgb.r * (1 - t) + rgb.r * t));
    output[i * 4 + 1] = Math.min(255, Math.round(shadowRgb.g * (1 - t) + rgb.g * t));
    output[i * 4 + 2] = Math.min(255, Math.round(shadowRgb.b * (1 - t) + rgb.b * t));
    output[i * 4 + 3] = a;
  }
  
  return sharp(output, { raw: info }).png().toBuffer();
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

/**
 * Create a comparison grid showing all techniques
 */
async function createComparisonGrid() {
  const sourceBuffer = await sharp(TEST_MUSCLE).toBuffer();
  const { width, height } = await sharp(sourceBuffer).metadata();
  
  // Scale down for comparison (smaller output)
  const scale = 0.3;
  const thumbWidth = Math.round(width * scale);
  const thumbHeight = Math.round(height * scale);
  
  const techniques = [
    { name: 'Original', fn: () => sharp(sourceBuffer).resize(thumbWidth, thumbHeight).toBuffer() },
    { name: 'Flat (Current)', fn: () => sharp(sourceBuffer).resize(thumbWidth, thumbHeight).toBuffer().then(b => tintFlat(b, TEST_COLORS[0].hex)) },
    { name: 'Luminosity', fn: () => sharp(sourceBuffer).resize(thumbWidth, thumbHeight).toBuffer().then(b => tintLuminosityMultiply(b, TEST_COLORS[0].hex)) },
    { name: 'Color-Dominant', fn: () => sharp(sourceBuffer).resize(thumbWidth, thumbHeight).toBuffer().then(b => tintColorDominant(b, TEST_COLORS[0].hex)) },
    { name: 'Overlay', fn: () => sharp(sourceBuffer).resize(thumbWidth, thumbHeight).toBuffer().then(b => tintOverlayContrast(b, TEST_COLORS[0].hex)) },
    { name: 'Two-Tone', fn: () => sharp(sourceBuffer).resize(thumbWidth, thumbHeight).toBuffer().then(b => tintTwoTone(b, TEST_COLORS[0].hex)) },
  ];
  
  console.log('Generating comparison images...');
  
  // Generate individual comparison for each technique
  const results = [];
  for (const tech of techniques) {
    console.log(`  Processing: ${tech.name}`);
    const buffer = await tech.fn();
    results.push({ name: tech.name, buffer });
    await sharp(buffer).toFile(join(OUTPUT_DIR, `chest-${tech.name.toLowerCase().replace(/[()\s]/g, '-')}.png`));
  }
  
  // Create a horizontal strip comparison
  const stripWidth = thumbWidth * results.length;
  const stripHeight = thumbHeight + 40; // Extra space for labels
  
  const strip = sharp({
    create: {
      width: stripWidth,
      height: stripHeight,
      channels: 4,
      background: { r: 30, g: 30, b: 30, alpha: 1 }
    }
  });
  
  const composites = results.map((r, i) => ({
    input: r.buffer,
    left: i * thumbWidth,
    top: 40
  }));
  
  // Note: text overlay would require additional libraries, skipping for now
  
  await strip
    .composite(composites)
    .toFile(join(OUTPUT_DIR, 'comparison-strip.png'));
  
  console.log(`✓ Comparison strip saved: ${join(OUTPUT_DIR, 'comparison-strip.png')}`);
}

/**
 * Create a color palette test showing all schemes
 */
async function createColorPaletteTest() {
  const sourceBuffer = await sharp(TEST_MUSCLE).toBuffer();
  const scale = 0.25;
  const { width, height } = await sharp(sourceBuffer).metadata();
  const thumbWidth = Math.round(width * scale);
  const thumbHeight = Math.round(height * scale);
  
  const schemes = [
    { id: 'fire-ember', colors: ['#2D1E10', '#501611', '#8C3520', '#C6452E', '#E87B3D', '#F5D491'] },
    { id: 'metallic', colors: ['#2C3E50', '#5D6D7E', '#85929E', '#AEB6BF', '#D5D8DC', '#F8F9F9'] },
    { id: 'cosmic', colors: ['#1A0A2E', '#301C5A', '#5B2E8A', '#8E44AD', '#BB8FCE', '#E8DAEF'] },
    { id: 'ocean', colors: ['#0A1628', '#154360', '#1F618D', '#2980B9', '#5DADE2', '#AED6F1'] },
    { id: 'volcanic', colors: ['#1C1C1C', '#4A235A', '#922B21', '#C0392B', '#E74C3C', '#F5B041'] },
  ];
  
  console.log('Generating color palette tests...');
  
  for (const scheme of schemes) {
    const images = [];
    for (const color of scheme.colors) {
      const tinted = await tintLuminosityMultiply(
        await sharp(sourceBuffer).resize(thumbWidth, thumbHeight).toBuffer(),
        color
      );
      images.push(tinted);
    }
    
    // Create horizontal strip for this scheme
    const stripWidth = thumbWidth * images.length;
    const stripHeight = thumbHeight;
    
    const composites = images.map((img, i) => ({
      input: img,
      left: i * thumbWidth,
      top: 0
    }));
    
    await sharp({
      create: {
        width: stripWidth,
        height: stripHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite(composites)
    .toFile(join(OUTPUT_DIR, `palette-${scheme.id}.png`));
    
    console.log(`  ✓ ${scheme.id}`);
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  
  console.log('='.repeat(60));
  console.log('Muscle Tinting Technique Comparison');
  console.log('='.repeat(60));
  console.log();
  
  await createComparisonGrid();
  console.log();
  await createColorPaletteTest();
  
  console.log();
  console.log('='.repeat(60));
  console.log('Done! Check output directory:');
  console.log(OUTPUT_DIR);
  console.log('='.repeat(60));
}

main().catch(console.error);
