#!/usr/bin/env node
/**
 * LLM Benchmark Parallel Orchestrator
 *
 * Spawns all 8 model benchmarks in parallel, tracks progress,
 * and combines results when all complete.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-or-... node benchmark-orchestrator.mjs
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// All available models - ordered CHEAPEST FIRST for sequential mode safety
// Gemini 3 Pro removed (too slow: 60s+ avg latency)
// Grok 4.1 Fast excluded 2026-01-18
// GPT-5 series excluded 2026-01-20 (using GPT-4 series instead)
const ALL_MODELS = [
  // Fast/cheap tier first (most likely to complete before credits run out)
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude 4.5 Haiku', tier: 'fast' },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', tier: 'fast' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', tier: 'fast' },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', tier: 'fast' },
  // { id: 'x-ai/grok-4.1-fast', name: 'Grok 4.1 Fast', tier: 'fast' },
  // Premium tier last (run these after cheap models have data)
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', tier: 'premium' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', tier: 'premium' },
  // GPT-5 series (excluded - edge function errors / high latency)
  // { id: 'openai/gpt-5-nano', name: 'GPT-5 Mini', tier: 'fast' },
  // { id: 'openai/gpt-5.2', name: 'GPT-5.2', tier: 'premium' },
];

// Fast models for dry runs (DRY_RUN=1)
const DRY_RUN_MODELS = [
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude 4.5 Haiku' },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash' },
];

// Select models based on DRY_RUN env var
const MODELS = process.env.DRY_RUN === '1' ? DRY_RUN_MODELS : ALL_MODELS;

// SEQUENTIAL=1 runs models one at a time, cheapest first (safer for credit limits)
const SEQUENTIAL_MODE = process.env.SEQUENTIAL === '1';

// ABORT_ON_CONSECUTIVE_FAILURES - stop if N models fail in a row (likely credit exhaustion)
const ABORT_THRESHOLD = parseInt(process.env.ABORT_THRESHOLD, 10) || 2;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`${colors.dim}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`);
}

function logModelStart(model) {
  log(`[START] ${model.name} (${model.id})`, colors.blue);
}

function logModelComplete(model, success, duration) {
  const status = success
    ? `${colors.bgGreen}${colors.bright} DONE ${colors.reset}`
    : `${colors.bgRed}${colors.bright} FAIL ${colors.reset}`;
  const durationStr = `${(duration / 1000).toFixed(1)}s`;
  log(`${status} ${model.name} completed in ${durationStr}`, success ? colors.green : colors.red);
}

function logProgress(completed, total, successes, failures) {
  const bar = '='.repeat(completed) + '-'.repeat(total - completed);
  const pct = Math.round((completed / total) * 100);
  log(`[PROGRESS] [${bar}] ${completed}/${total} (${pct}%) | Success: ${successes} | Failed: ${failures}`, colors.cyan);
}

/**
 * Run a single model benchmark
 */
function runModelBenchmark(model) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    logModelStart(model);

    const proc = spawn('node', ['benchmark-single-model.mjs', model.id], {
      cwd: __dirname,
      env: {
        ...process.env,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        FORCE_COLOR: '1'
      },
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      // Stream output lines prefixed with model name
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        console.log(`${colors.dim}[${model.name}]${colors.reset} ${line}`);
      });
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      // Stream error output
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => {
        console.log(`${colors.red}[${model.name}]${colors.reset} ${line}`);
      });
    });

    proc.on('close', (code) => {
      const duration = Date.now() - startTime;
      const success = code === 0;
      logModelComplete(model, success, duration);
      resolve({
        model,
        success,
        code,
        duration,
        stdout,
        stderr
      });
    });

    proc.on('error', (err) => {
      const duration = Date.now() - startTime;
      log(`[ERROR] ${model.name}: ${err.message}`, colors.red);
      resolve({
        model,
        success: false,
        code: -1,
        duration,
        stdout,
        stderr: err.message,
        error: err
      });
    });
  });
}

/**
 * Run the result combiner
 */
function runCombiner() {
  return new Promise((resolve) => {
    log('[COMBINER] Starting result aggregation...', colors.magenta);

    const proc = spawn('node', ['benchmark-combiner.mjs'], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    proc.on('close', (code) => {
      if (code === 0) {
        log('[COMBINER] Results combined successfully', colors.green);
      } else {
        log(`[COMBINER] Failed with code ${code}`, colors.red);
      }
      resolve(code === 0);
    });

    proc.on('error', (err) => {
      log(`[COMBINER] Error: ${err.message}`, colors.red);
      resolve(false);
    });
  });
}

/**
 * Main orchestration function
 */
async function main() {
  console.log('\n');
  log('========================================', colors.bright);
  log(`  LLM BENCHMARK ${SEQUENTIAL_MODE ? 'SEQUENTIAL' : 'PARALLEL'} ORCHESTRATOR  `, colors.bright + colors.cyan);
  log('========================================', colors.bright);
  console.log('\n');

  // Check for API key
  if (!process.env.OPENROUTER_API_KEY) {
    log('ERROR: OPENROUTER_API_KEY environment variable is required', colors.red);
    log('Usage: OPENROUTER_API_KEY=sk-or-... node benchmark-orchestrator.mjs', colors.yellow);
    process.exit(1);
  }

  if (SEQUENTIAL_MODE) {
    log(`Running ${MODELS.length} models SEQUENTIALLY (cheapest first, safer for credits)`, colors.yellow);
    log(`Will abort after ${ABORT_THRESHOLD} consecutive failures (likely credit exhaustion)`, colors.yellow);
  } else {
    log(`Launching ${MODELS.length} model benchmarks in parallel...`, colors.yellow);
  }
  console.log('\n');

  const startTime = Date.now();
  let completed = 0;
  let successes = 0;
  let failures = 0;
  let consecutiveFailures = 0;
  let abortedEarly = false;
  const results = [];

  if (SEQUENTIAL_MODE) {
    // Sequential mode: run one at a time, cheapest first
    for (const model of MODELS) {
      const result = await runModelBenchmark(model);
      results.push(result);
      completed++;

      if (result.success) {
        successes++;
        consecutiveFailures = 0; // Reset on success
      } else {
        failures++;
        consecutiveFailures++;

        // Check for early abort
        if (consecutiveFailures >= ABORT_THRESHOLD) {
          log(`\n${colors.bgYellow}${colors.bright} EARLY ABORT ${colors.reset} ${consecutiveFailures} consecutive failures - likely credit exhaustion`, colors.yellow);
          log(`Completed ${successes} models successfully before stopping.`, colors.yellow);
          abortedEarly = true;
          break;
        }
      }
      logProgress(completed, MODELS.length, successes, failures);
    }
  } else {
    // Parallel mode: launch all at once
    const promises = MODELS.map(async (model) => {
      const result = await runModelBenchmark(model);
      completed++;
      if (result.success) {
        successes++;
      } else {
        failures++;
      }
      logProgress(completed, MODELS.length, successes, failures);
      return result;
    });

    // Wait for all to complete
    results.push(...await Promise.all(promises));
  }

  const totalDuration = Date.now() - startTime;

  console.log('\n');
  log('========================================', colors.bright);
  log('           BENCHMARK SUMMARY           ', colors.bright + colors.cyan);
  log('========================================', colors.bright);
  console.log('\n');

  // Summary table
  log(`Total models: ${MODELS.length}${abortedEarly ? ` (aborted after ${completed})` : ''}`, colors.reset);
  log(`Successful: ${successes}`, colors.green);
  log(`Failed: ${failures}`, failures > 0 ? colors.red : colors.reset);
  if (abortedEarly) {
    log(`Skipped: ${MODELS.length - completed} (early abort due to credit exhaustion)`, colors.yellow);
  }
  log(`Total time: ${(totalDuration / 1000).toFixed(1)}s`, colors.reset);
  console.log('\n');

  // Detailed results
  log('Individual Results:', colors.bright);
  results.forEach(r => {
    const status = r.success ? `${colors.green}[OK]${colors.reset}` : `${colors.red}[FAIL]${colors.reset}`;
    const duration = `${(r.duration / 1000).toFixed(1)}s`;
    console.log(`  ${status} ${r.model.name.padEnd(20)} ${duration.padStart(8)}`);
  });
  console.log('\n');

  // Run combiner if there were any successes
  if (successes > 0) {
    log('Running result combiner...', colors.magenta);
    const combinerSuccess = await runCombiner();
    if (!combinerSuccess) {
      log('Warning: Combiner encountered issues', colors.yellow);
    }
  } else {
    log('Skipping combiner - no successful benchmarks to combine', colors.yellow);
  }

  console.log('\n');
  log('========================================', colors.bright);
  log('         ORCHESTRATION COMPLETE        ', colors.bright + colors.green);
  log('========================================', colors.bright);
  console.log('\n');

  // Exit with error code if any failed
  process.exit(failures > 0 ? 1 : 0);
}

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`, colors.red);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${reason}`, colors.red);
  process.exit(1);
});

// Run
main();
