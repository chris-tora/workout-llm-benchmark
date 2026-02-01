#!/usr/bin/env node
/**
 * Create Textured Muscle Overlays
 * 
 * This script creates tinted muscle overlays that preserve anatomical texture.
 * 
 * Approach: Use binary mask to isolate the muscle area from the raw PNG,
 * then apply color tinting using luminosity-preserving multiply blend.
 */

import sharp from 'sharp';
import { mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Paths
const RAW_MALE_FRONT = join(ROOT, 'musclewiki-assets/raw-pngs/Body parts (PNG)/Body parts MALE/Front body MALE');
const RAW_MALE_BACK = join(ROOT, 'musclewiki-assets/raw-pngs/Body parts (PNG)/Body parts MALE/Back body MALE');
const MASKS_DIR = join(ROOT, 'public/assets/muscles/male/masks');
const OUTPUT_DIR = join(ROOT, 'public/assets/muscles/male-textured');

// Color schemes (6 tiers each)
const COLOR_SCHEMES = {
  'fire-ember': ['#2D1E10', '#501611', '#8C3520', '#C6452E', '#E87B3D', '#F5D491'],
  'metallic': ['#2C3E50', '#5D6D7E', '#85929E', '#AEB6BF', '#D5D8DC', '#F8F9F9'],
  'cosmic': ['#1A0A2E', '#301C5A', '#5B2E8A', '#8E44AD', '#BB8FCE', '#E8DAEF'],
  'crimson-purple': ['#330000', '#660033', '#990066', '#CC0099', '#9933CC', '#CC99FF'],
  'ocean-depth': ['#0A1628', '#154360', '#1F618D', '#2980B9', '#5DADE2', '#AED6F1'],
  'volcanic': ['#1C1C1C', '#4A235A', '#922B21', '#C0392B', '#E74C3C', '#F5B041'],
  'sunset': ['#4A235A', '#7D3C98', '#C0392B', '#E67E22', '#F39C12', '#F7DC6F'],
  'monochrome-gold': ['#1C1C1C', '#3D3D3D', '#5E5E5E', '#B7950B', '#D4AC0D', '#F4D03F'],
  'aurora': ['#0B5345', '#117864', '#1ABC9C', '#48C9B0', '#76D7C4', '#A3E4D7'],
};

const TIER_NAMES = ['novice', 'beginner', 'intermediate', 'pro', 'advanced', 'elite'];

const FILENAME_MAP = {
  'Biceps-LONG_.png': { slug: 'biceps-long', view: 'front' },
  'Chest-LOWER_.png': { slug: 'chest-lower', view: 'front' },
  'Chest-UPPER_.png': { slug: 'chest-upper', view: 'front' },
  'Deltoids-FRONT_.png': { slug: 'deltoids-front', view: 'front' },
  'Deltoids-SIDE_.png': { slug: 'deltoids-side', view: 'front' },
  'Hip-Adductors_.png': { slug: 'hip-adductors', view: 'front' },
  'Obliques_.png': { slug: 'obliques', view: 'front' },
  'Quadriceps_.png': { slug: 'quadriceps', view: 'front' },
  'Rectus-Abdominis-LOWER_.png': { slug: 'rectus-abdominis-lower', view: 'front' },
  'Rectus-Abdominis-UPPER_.png': { slug: 'rectus-abdominis-upper', view: 'front' },
  'Wrist-extensors_.png': { slug: 'wrist-extensors', view: 'front' },
  'Biceps_LOWER.png': { slug: 'biceps-lower', view: 'back' },
  'Calves.png': { slug: 'calves', view: 'back' },
  'Deltoids-BACK.png': { slug: 'deltoids-back', view: 'back' },
  'Gluteus.png': { slug: 'gluteus', view: 'back' },
  'Hamstrings.png': { slug: 'hamstrings', view: 'back' },
  'Hip-Adductors.png': { slug: 'hip-adductors', view: 'back' },
  'Latissimus-Dorsi.png': { slug: 'latissimus-dorsi', view: 'back' },
  'lower-back copy.png': { slug: 'lower-back-copy', view: 'back' },
  'Trapezius.png': { slug: 'trapezius', view: 'back' },
  'Triceps-LOWER_.png': { slug: 'triceps-lower', view: 'back' },
  'Triceps-OUTER_.png': { slug: 'triceps-outer', view: 'back' },
  'Triceps-UPPER.png': { slug: 'triceps-upper', view: 'back' },
  'Wrist-Flexors_.png': { slug: 'wrist-flexors', view: 'back' },
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

/**
 * Create a textured tint using the mask to extract muscle area from raw PNG
 * 
 * The raw MuscleWiki PNGs show the full body with the target muscle highlighted.
 * We use the mask to identify which pixels belong to the muscle, then apply
 * a luminosity-preserving color tint.
 */
async function createTexturedTint(rawPath, maskPath, outputPath, colorHex) {
  const rgb = hexToRgb(colorHex);
  
  // Load raw image and mask
  const rawImage = sharp(rawPath);
  const maskImage = sharp(maskPath);
  
  // Get dimensions
  const [rawMeta, maskMeta] = await Promise.all([
    rawImage.metadata(),
    maskImage.metadata()
  ]);
  
  // Handle the lower-back-copy size mismatch (732x732 vs 1024x1024)
  let maskBuffer;
  if (maskMeta.width !== rawMeta.width || maskMeta.height !== rawMeta.height) {
    maskBuffer = await maskImage.resize(rawMeta.width, rawMeta.height).raw().toBuffer();
  } else {
    maskBuffer = await maskImage.raw().toBuffer();
  }
  
  // Get raw pixel data
  const rawBuffer = await rawImage.raw().toBuffer({ resolveWithObject: true });
  const { data: rawPixels, info } = rawBuffer;
  
  const pixelCount = info.width * info.height;
  const output = Buffer.alloc(pixelCount * 4);
  
  // Target color normalized
  const tr = rgb.r / 255;
  const tg = rgb.g / 255;
  const tb = rgb.b / 255;
  
  for (let i = 0; i < pixelCount; i++) {
    const r = rawPixels[i * 4];
    const g = rawPixels[i * 4 + 1];
    const b = rawPixels[i * 4 + 2];
    // Alpha from mask determines if this pixel is part of the muscle
    const maskAlpha = maskBuffer[i] || 0;
    
    if (maskAlpha > 10) {
      // This pixel is part of the muscle - apply textured tint
      // Calculate luminosity from the raw image (preserves texture detail)
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      
      // Apply slight contrast boost for better definition
      const contrastLum = Math.pow(lum, 0.85); // Gamma correction for more pop
      
      // Multiply luminosity with target color
      output[i * 4] = Math.min(255, Math.round(contrastLum * tr * 255));
      output[i * 4 + 1] = Math.min(255, Math.round(contrastLum * tg * 255));
      output[i * 4 + 2] = Math.min(255, Math.round(contrastLum * tb * 255));
      output[i * 4 + 3] = maskAlpha; // Use mask alpha
    } else {
      // Not part of muscle - fully transparent
      output[i * 4] = 0;
      output[i * 4 + 1] = 0;
      output[i * 4 + 2] = 0;
      output[i * 4 + 3] = 0;
    }
  }
  
  // Write output
  await sharp(output, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(outputPath);
}

async function processMuscle(filename, mapping) {
  const rawDir = mapping.view === 'front' ? RAW_MALE_FRONT : RAW_MALE_BACK;
  const rawPath = join(rawDir, filename);
  const maskPath = join(MASKS_DIR, mapping.view, `${mapping.slug}.png`);
  
  // Check files exist
  if (!existsSync(rawPath)) {
    console.log(`  Skip: Raw not found ${filename}`);
    return;
  }
  if (!existsSync(maskPath)) {
    console.log(`  Skip: Mask not found ${mapping.slug}`);
    return;
  }
  
  // Create output directory
  const outputViewDir = join(OUTPUT_DIR, mapping.view);
  await mkdir(outputViewDir, { recursive: true });
  
  // Process each scheme and tier
  let count = 0;
  for (const [schemeName, colors] of Object.entries(COLOR_SCHEMES)) {
    for (let tierIdx = 0; tierIdx < colors.length; tierIdx++) {
      const tierName = TIER_NAMES[tierIdx];
      const color = colors[tierIdx];
      const outputPath = join(outputViewDir, `${mapping.slug}-${schemeName}-${tierName}.png`);
      
      // Skip if exists (unless force)
      if (existsSync(outputPath) && !process.argv.includes('--force')) {
        continue;
      }
      
      try {
        await createTexturedTint(rawPath, maskPath, outputPath, color);
        count++;
      } catch (err) {
        console.error(`  Error: ${mapping.slug}-${schemeName}-${tierName}: ${err.message}`);
      }
    }
  }
  
  if (count > 0) {
    console.log(`  ✓ ${mapping.slug}: ${count} images generated`);
  } else {
    console.log(`  ✓ ${mapping.slug}: all cached`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const muscleFilter = args.find(a => a.startsWith('--muscle='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');
  
  console.log('='.repeat(60));
  console.log('Textured Muscle Overlay Generator');
  console.log('='.repeat(60));
  console.log(`Raw source: musclewiki-assets/raw-pngs/`);
  console.log(`Masks: ${MASKS_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Schemes: ${Object.keys(COLOR_SCHEMES).length} x 6 tiers`);
  console.log('-'.repeat(60));
  
  if (dryRun) {
    console.log('DRY RUN - No files will be written');
    console.log();
  }
  
  if (!dryRun) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }
  
  // Collect muscles to process
  const muscles = [];
  
  for (const [filename, mapping] of Object.entries(FILENAME_MAP)) {
    if (muscleFilter && !mapping.slug.includes(muscleFilter)) {
      continue;
    }
    muscles.push({ filename, ...mapping });
  }
  
  console.log(`Processing ${muscles.length} muscles...`);
  console.log();
  
  // Process each muscle
  let processed = 0;
  for (const muscle of muscles) {
    if (!dryRun) {
      console.log(`[${++processed}/${muscles.length}] ${muscle.slug}`);
      await processMuscle(muscle.filename, muscle);
    } else {
      console.log(`[${++processed}/${muscles.length}] ${muscle.slug} (dry run)`);
    }
  }
  
  console.log();
  console.log('='.repeat(60));
  console.log('Complete!');
  console.log(`Total possible variants: ${muscles.length} muscles × ${Object.keys(COLOR_SCHEMES).length} schemes × 6 tiers = ${muscles.length * Object.keys(COLOR_SCHEMES).length * 6} images`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
