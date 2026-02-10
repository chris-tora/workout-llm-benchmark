#!/usr/bin/env node
/**
 * Benchmark Configuration: 6 Blended + 4 Non-Blended Scenarios
 * 
 * This file documents the specific scenario selection for targeted
 * blended vs non-blended testing.
 * 
 * Usage:
 *   export OPENROUTER_API_KEY=sk-or-...
 *   SCENARIOS=0,4,6,10,17,18,19,22,23,25 node benchmark-orchestrator.mjs
 * 
 * Or run directly:
 *   node benchmark-blended-config.mjs
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// =============================================================================
// SCENARIO SELECTION: 6 BLENDED + 4 NON-BLENDED
// =============================================================================

const SELECTED_SCENARIOS = {
  // NON-BLENDED (4) - Single training style
  nonBlended: [
    { index: 0,  name: 'Bro Split (Chest)',              style: 'classic_bodybuilding' },
    { index: 4,  name: 'Bro Split (Legs)',                 style: 'classic_bodybuilding' },
    { index: 6,  name: 'Upper/Lower - Strength (Upper)',   style: 'strength_focused' },
    { index: 10, name: 'Full Body - HIT',                  style: 'high_intensity_hit' },
  ],
  
  // BLENDED (6) - Multiple training styles
  blended: [
    { index: 17, name: 'PPL - Strength + Bodybuilding (Push)',                  styles: 'strength_focused + classic_bodybuilding' },
    { index: 18, name: 'Upper/Lower - HIT + Bodybuilding (Upper)',              styles: 'high_intensity_hit + classic_bodybuilding' },
    { index: 19, name: 'Full Body - Strength + Endurance',                      styles: 'strength_focused + muscular_endurance' },
    { index: 22, name: 'Arnold Split - Bodybuilding + Endurance (Chest/Back)',  styles: 'classic_bodybuilding + muscular_endurance' },
    { index: 23, name: 'Arnold Split - Bodybuilding + HIT (Chest/Back)',        styles: 'classic_bodybuilding + high_intensity_hit' },
    { index: 25, name: 'Arnold Split - Bodybuilding + HIT (Shoulders/Arms)',    styles: 'classic_bodybuilding + high_intensity_hit' },
  ]
};

// Combined indices for SCENARIOS env var
const SCENARIO_INDICES = [
  ...SELECTED_SCENARIOS.nonBlended.map(s => s.index),
  ...SELECTED_SCENARIOS.blended.map(s => s.index)
].join(',');

// =============================================================================
// MODELS TO TEST
// =============================================================================

const MODELS = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', tier: 'fast' },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', tier: 'fast' },
];

// =============================================================================
// DISPLAY CONFIGURATION
// =============================================================================

function printConfig() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     BENCHMARK CONFIG: 6 BLENDED + 4 NON-BLENDED SCENARIOS       ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  console.log('📋 SELECTED MODELS:');
  console.log('   ────────────────────────────────────────────────────────────────');
  MODELS.forEach(m => {
    console.log(`   • ${m.name} (${m.id})`);
  });
  
  console.log('\n📋 NON-BLENDED SCENARIOS (4):');
  console.log('   ────────────────────────────────────────────────────────────────');
  SELECTED_SCENARIOS.nonBlended.forEach(s => {
    console.log(`   [${s.index.toString().padStart(2)}] ${s.name.padEnd(45)} | ${s.style}`);
  });
  
  console.log('\n📋 BLENDED SCENARIOS (6):');
  console.log('   ────────────────────────────────────────────────────────────────');
  SELECTED_SCENARIOS.blended.forEach(s => {
    console.log(`   [${s.index.toString().padStart(2)}] ${s.name.padEnd(45)} | ${s.styles}`);
  });
  
  console.log('\n📋 ENVIRONMENT VARIABLE:');
  console.log('   ────────────────────────────────────────────────────────────────');
  console.log(`   SCENARIOS=${SCENARIO_INDICES}`);
  
  console.log('\n📋 COMMAND TO RUN:');
  console.log('   ────────────────────────────────────────────────────────────────');
  console.log(`   SCENARIOS=${SCENARIO_INDICES} node benchmark-orchestrator.mjs`);
  console.log('\n');
}

// =============================================================================
// EXECUTE BENCHMARK
// =============================================================================

function runBenchmark() {
  console.log('\n🚀 Launching benchmark with selected scenarios...\n');
  
  const proc = spawn('node', ['benchmark-orchestrator.mjs'], {
    cwd: __dirname,
    env: {
      ...process.env,
      SCENARIOS: SCENARIO_INDICES,
      FORCE_COLOR: '1'
    },
    stdio: 'inherit'
  });
  
  proc.on('close', (code) => {
    process.exit(code);
  });
}

// =============================================================================
// MAIN
// =============================================================================

printConfig();

// Check for --dry-run flag (just print config, don't execute)
if (process.argv.includes('--dry-run')) {
  console.log('✅ Dry run complete. Use without --dry-run to execute.\n');
  process.exit(0);
}

// Check for OPENROUTER_API_KEY
if (!process.env.OPENROUTER_API_KEY) {
  console.log('⚠️  Warning: OPENROUTER_API_KEY not set in environment\n');
  console.log('   Set it with: export OPENROUTER_API_KEY=sk-or-...\n');
  process.exit(1);
}

// Run the benchmark
runBenchmark();
