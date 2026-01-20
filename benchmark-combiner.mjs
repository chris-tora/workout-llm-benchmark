#!/usr/bin/env node
/**
 * LLM Benchmark Results Combiner
 *
 * Combines individual model benchmark result files into a unified report.
 * Designed to work with the parallel benchmark runner that produces separate
 * model-*.json files for each tested model.
 *
 * Usage:
 *   node benchmark-combiner.mjs                    # Combine results
 *   node benchmark-combiner.mjs --cleanup          # Combine and delete individual files
 *
 * Expected input files: benchmark-results/model-*.json
 * Output files:
 *   - benchmark-results/combined-benchmark-{timestamp}.json
 *   - benchmark-results/combined-benchmark-{timestamp}.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, 'benchmark-results');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ivfllbccljoyaayftecd.supabase.co';
const GIF_BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/exercise-gifs`;

// Training style params for markdown report reference
const TRAINING_STYLE_PARAMS = {
  classic_bodybuilding: {
    name: 'Classic Bodybuilding',
    sets: { min: 3, max: 4 },
    reps: { min: 8, max: 12 },
    rest: { min: 60, max: 90 },
  },
  strength_focused: {
    name: 'Strength Focused',
    sets: { min: 4, max: 5 },
    reps: { min: 4, max: 6 },
    rest: { min: 120, max: 240 },
  },
  high_intensity_hit: {
    name: 'High Intensity (HIT)',
    sets: { min: 1, max: 2 },
    reps: { min: 6, max: 10 },
    rest: { min: 120, max: 180 },
  },
  muscular_endurance: {
    name: 'Muscular Endurance',
    sets: { min: 2, max: 3 },
    reps: { min: 15, max: 20 },
    rest: { min: 30, max: 45 },
  },
};

// Model metadata (sync with benchmark-orchestrator.mjs)
const MODEL_METADATA = {
  'anthropic/claude-haiku-4.5': { name: 'Claude 4.5 Haiku', tier: 'fast' },
  'anthropic/claude-sonnet-4.5': { name: 'Claude Sonnet 4.5', tier: 'premium' },
  'google/gemini-3-flash-preview': { name: 'Gemini 3 Flash', tier: 'fast' },
  'openai/gpt-4o-mini': { name: 'GPT-4o Mini', tier: 'fast' },
  'openai/gpt-4.1-mini': { name: 'GPT-4.1 Mini', tier: 'fast' },
  'openai/gpt-4o': { name: 'GPT-4o', tier: 'premium' },
};

// Legacy lookup for tier only
const MODEL_TIERS = Object.fromEntries(
  Object.entries(MODEL_METADATA).map(([id, meta]) => [id, meta.tier])
);

// ============================================================================
// FILE DISCOVERY
// ============================================================================

function discoverModelFiles() {
  if (!fs.existsSync(RESULTS_DIR)) {
    console.error(`Error: Results directory does not exist: ${RESULTS_DIR}`);
    console.error('Run the parallel benchmark first to generate model-*.json files.');
    process.exit(1);
  }

  const files = fs.readdirSync(RESULTS_DIR)
    .filter(f => f.startsWith('model-') && f.endsWith('.json'))
    .map(f => path.join(RESULTS_DIR, f));

  if (files.length === 0) {
    console.error('Error: No model-*.json files found in benchmark-results/');
    console.error('Expected files like: model-openai-gpt-5.json, model-anthropic-claude-sonnet-4.json');
    process.exit(1);
  }

  return files;
}

// ============================================================================
// FILE PARSING
// ============================================================================

function parseModelFile(filePath) {
  const fileName = path.basename(filePath);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Support both old format (modelId/modelName) and new format (model object)
    if (!data.scenarios) {
      console.warn(`  Warning: ${fileName} missing scenarios array`);
      return null;
    }

    // Normalize to new format if using old format
    if (!data.model && (data.modelId || data.modelName)) {
      data.model = {
        id: data.modelId,
        name: data.modelName,
        tier: data.tier || 'unknown',
      };
    }

    if (!data.model) {
      console.warn(`  Warning: ${fileName} missing model information`);
      return null;
    }

    // Enrich model metadata from MODEL_METADATA
    const metadata = MODEL_METADATA[data.model.id];
    if (metadata) {
      if (!data.model.tier || data.model.tier === 'unknown') {
        data.model.tier = metadata.tier;
      }
      // Use canonical display name
      data.model.name = metadata.name;
    }

    return {
      fileName,
      filePath,
      data,
    };
  } catch (error) {
    console.warn(`  Warning: Failed to parse ${fileName}: ${error.message}`);
    return null;
  }
}

// ============================================================================
// RESULTS COMBINATION
// ============================================================================

// Scenario metadata to derive split and duration from scenario names
const SCENARIO_METADATA = {
  'Classic Bodybuilding - Chest & Triceps': { split: 'bro_split', duration: 60, dayFocus: 'Chest' },
  'Classic Bodybuilding - Back & Biceps': { split: 'bro_split', duration: 60, dayFocus: 'Back' },
  'Bodybuilding - Shoulder Focus': { split: 'bro_split', duration: 60, dayFocus: 'Shoulders' },
  'High Volume Leg Day': { split: 'bro_split', duration: 75, dayFocus: 'Legs' },
  'Strength Focused - Upper Body': { split: 'upper_lower', duration: 60, dayFocus: 'Upper' },
  'Strength Focused - Lower Body': { split: 'upper_lower', duration: 60, dayFocus: 'Lower' },
  'PPL - Push Day': { split: 'ppl', duration: 60, dayFocus: 'Push' },
  'PPL - Pull Day': { split: 'ppl', duration: 60, dayFocus: 'Pull' },
  'PPL - Legs': { split: 'ppl', duration: 60, dayFocus: 'Legs' },
  'Full Body - Strength': { split: 'full_body', duration: 45, dayFocus: 'Full Body' },
  'Full Body - Hypertrophy': { split: 'full_body', duration: 60, dayFocus: 'Full Body' },
  'Arnold Split - Chest & Back': { split: 'arnold_split', duration: 75, dayFocus: 'Chest/Back' },
  'Arnold Split - Shoulders & Arms': { split: 'arnold_split', duration: 60, dayFocus: 'Shoulders/Arms' },
};

// ============================================================================
// EXERCISE NAME HELPERS
// ============================================================================

/**
 * Fetch exercise names from Supabase
 */
async function fetchExerciseNames() {
  try {
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZmxsYmNjbGpveWFheWZ0ZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTkwMTQsImV4cCI6MjA4MTY5NTAxNH0.714kFWsFFKwVAywLY5NOyZz2_eMoi7-Js8JGCwtpycs';
    const response = await fetch(`${SUPABASE_URL}/rest/v1/exercises?select=id,name`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
      },
    });

    if (!response.ok) {
      console.warn(`Warning: Failed to fetch exercise names from Supabase: ${response.statusText}`);
      return {};
    }

    const exercises = await response.json();
    const nameMap = {};
    for (const ex of exercises) {
      nameMap[ex.id] = ex.name;
    }
    return nameMap;
  } catch (error) {
    console.warn(`Warning: Error fetching exercise names: ${error.message}`);
    return {};
  }
}

/**
 * Get exercise name from ID using the fetched map
 */
function getExerciseName(exerciseId, exerciseNames) {
  return exerciseNames[exerciseId] || `Exercise ${exerciseId}`;
}

function combineResults(modelFiles, exerciseNames) {
  const parsedFiles = [];
  const allModels = [];
  const modelSummaries = {};
  const scenarioMap = new Map(); // scenario name -> { scenario info, modelResults[] }

  console.log('\nParsing model files...');

  for (const filePath of modelFiles) {
    const parsed = parseModelFile(filePath);
    if (parsed) {
      parsedFiles.push(parsed);
      console.log(`  [OK] ${parsed.fileName}`);
    }
  }

  if (parsedFiles.length === 0) {
    console.error('Error: No valid model files found.');
    process.exit(1);
  }

  console.log(`\nSuccessfully parsed ${parsedFiles.length} model files.`);

  // Extract models and build summaries
  for (const { data } of parsedFiles) {
    const model = data.model;
    allModels.push(model);

    // Build or use existing summary
    if (data.summary) {
      // Ensure summary has model name and tier
      modelSummaries[model.id] = {
        ...data.summary,
        name: data.summary.name || model.name,
        tier: data.summary.tier || model.tier,
      };
    } else {
      // Calculate summary from scenarios if not provided
      modelSummaries[model.id] = calculateModelSummary(model, data.scenarios);
    }

    // Process each scenario
    for (const scenarioResult of data.scenarios) {
      const scenarioName = scenarioResult.name;

      if (!scenarioMap.has(scenarioName)) {
        // Extract scenario metadata from the request object if available
        const req = scenarioResult.request || {};
        const meta = SCENARIO_METADATA[scenarioName] || {};
        scenarioMap.set(scenarioName, {
          name: scenarioResult.name,
          category: scenarioResult.category,
          // Include fields expected by LLMBenchmark.jsx
          split: scenarioResult.split || req.split || meta.split || 'other',
          duration: scenarioResult.duration || req.duration || meta.duration || 60,
          equipment: scenarioResult.equipment || req.equipment || [],
          dayFocus: scenarioResult.dayFocus || req.dayFocus || meta.dayFocus || '',
          trainingStyles: scenarioResult.trainingStyles || req.trainingStyles || [scenarioResult.category || 'bodybuilding'],
          // Keep original fields for reference
          request: scenarioResult.request,
          expectations: scenarioResult.expectations,
          exercisesAvailable: scenarioResult.exercisesAvailable,
          results: [], // LLMBenchmark.jsx expects 'results', not 'modelResults'
        });
      }

      const scenario = scenarioMap.get(scenarioName);

      // Add this model's result to the scenario
      // Support both old format (workout, metrics at top level) and new format (parsedWorkout, metrics nested)
      const metrics = scenarioResult.metrics || {
        // Old format has metrics at top level
        exerciseCount: scenarioResult.exerciseCount,
        equipmentMatchRate: scenarioResult.equipmentMatchRate,
        avgSets: scenarioResult.avgSets,
        avgReps: scenarioResult.avgReps,
        avgRest: scenarioResult.avgRest,
      };

      // Flatten the result object for LLMBenchmark.jsx consumption
      // The component expects flat fields, not nested structures
      const workout = scenarioResult.parsedWorkout || scenarioResult.workout;
      // Flatten exercises from ALL sections, not just the first one
      // Enrich with exercise names and GIF URLs
      const exercises = (workout?.sections?.flatMap(s => s?.exercises || []) || []).map(e => ({
        id: e.id,
        name: e.name || getExerciseName(e.id, exerciseNames),
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds || e.rest || 60,
        notes: e.notes || null,
        gifUrl: `${GIF_BASE_URL}/${e.id}.gif`,
      }));

      scenario.results.push({
        // Flat model identifier
        modelId: model.id,
        model: model.name,
        // Convert boolean success to status string
        status: scenarioResult.success ? 'success' : 'error',
        latency: scenarioResult.latency,
        // Flat metrics fields
        exerciseCount: metrics.exerciseCount,
        equipmentMatch: metrics.equipmentMatchRate || 0,
        avgSets: metrics.avgSets,
        avgReps: metrics.avgReps,
        avgRest: metrics.avgRest,
        // Flat exercises array (extracted from sections)
        exercises,
        error: scenarioResult.error || scenarioResult.parseError,
        // Keep original nested data for backwards compatibility / markdown report
        _model: model,
        parsedWorkout: scenarioResult.parsedWorkout,
        workout: scenarioResult.workout,
        metrics,
        rawResponse: scenarioResult.rawResponse,
      });
    }
  }

  // Convert scenario map to array
  const scenarios = Array.from(scenarioMap.values());

  // Get timestamps from files for metadata
  const timestamps = parsedFiles
    .map(f => f.data.timestamp)
    .filter(Boolean)
    .sort();

  // Transform modelSummaries object to modelStats array for LLMBenchmark.jsx
  const modelStats = Object.entries(modelSummaries).map(([modelId, summary]) => ({
    modelId,
    modelName: summary.name,
    tier: summary.tier || 'unknown',
    successRate: summary.successRate,
    avgLatency: summary.avgLatency || 0,
    avgExerciseCount: summary.avgExerciseCount || 0,
    avgEquipmentMatchRate: summary.avgEquipmentMatchRate || 0,
    successCount: summary.successCount || 0,
    parseErrorCount: summary.parseErrorCount || 0,
    totalRuns: summary.totalTests,
  }));

  const combined = {
    timestamp: new Date().toISOString(),
    version: '2.1-parallel',
    sourceFiles: parsedFiles.map(f => f.fileName),
    totalModels: allModels.length,
    totalScenarios: scenarios.length,
    models: allModels,
    modelSummaries,
    modelStats,
    scenarios,
    metadata: {
      combinedAt: new Date().toISOString(),
      earliestResult: timestamps[0] || null,
      latestResult: timestamps[timestamps.length - 1] || null,
    },
  };

  return combined;
}

function calculateModelSummary(model, scenarios) {
  const summary = {
    name: model.name,
    tier: model.tier,
    totalTests: scenarios.length,
    successCount: 0,
    parseErrorCount: 0,
    apiErrorCount: 0,
    totalLatency: 0,
    totalExerciseCount: 0,
    totalEquipmentMatchRate: 0,
    totalSets: 0,
    totalRest: 0,
    repsCounts: {},
  };

  for (const scenario of scenarios) {
    // Support both old format (workout) and new format (parsedWorkout)
    const hasWorkout = scenario.parsedWorkout || scenario.workout;

    if (scenario.success && hasWorkout) {
      summary.successCount++;
      summary.totalLatency += scenario.latency || 0;

      // Support both nested metrics and top-level metrics (old format)
      const metrics = scenario.metrics || {
        exerciseCount: scenario.exerciseCount,
        equipmentMatchRate: scenario.equipmentMatchRate,
        avgSets: scenario.avgSets,
        avgReps: scenario.avgReps,
        avgRest: scenario.avgRest,
      };
      summary.totalExerciseCount += metrics.exerciseCount || 0;
      summary.totalEquipmentMatchRate += metrics.equipmentMatchRate || 0;
      summary.totalSets += metrics.avgSets || 0;
      summary.totalRest += metrics.avgRest || 0;

      const reps = String(metrics.avgReps || '-');
      summary.repsCounts[reps] = (summary.repsCounts[reps] || 0) + 1;
    } else if (scenario.success && scenario.parseError) {
      summary.parseErrorCount++;
    } else {
      summary.apiErrorCount++;
    }
  }

  // Calculate averages
  if (summary.successCount > 0) {
    summary.avgLatency = Math.round(summary.totalLatency / summary.successCount);
    summary.avgExerciseCount = Math.round((summary.totalExerciseCount / summary.successCount) * 10) / 10;
    summary.avgEquipmentMatchRate = Math.round(summary.totalEquipmentMatchRate / summary.successCount);
    summary.avgSets = Math.round((summary.totalSets / summary.successCount) * 10) / 10;
    summary.avgRest = Math.round(summary.totalRest / summary.successCount);

    // Find most common reps
    let mostCommonReps = '-';
    let maxCount = 0;
    for (const [reps, count] of Object.entries(summary.repsCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonReps = reps;
      }
    }
    summary.avgReps = mostCommonReps;
  }

  summary.successRate = Math.round((summary.successCount / summary.totalTests) * 100);

  return summary;
}

// ============================================================================
// MARKDOWN REPORT GENERATION
// ============================================================================

function generateMarkdownReport(results) {
  let md = `# LLM Workout Generation Benchmark - Combined Results\n\n`;
  md += `**Generated:** ${results.timestamp}\n`;
  md += `**Version:** ${results.version}\n`;
  md += `**Scenarios Tested:** ${results.totalScenarios}\n`;
  md += `**Models Tested:** ${results.totalModels}\n`;
  md += `**Source Files:** ${results.sourceFiles.length}\n\n`;

  if (results.metadata) {
    md += `**Results Period:** ${results.metadata.earliestResult || 'N/A'} to ${results.metadata.latestResult || 'N/A'}\n\n`;
  }

  // Models Overview
  md += `## Models Overview\n\n`;
  md += `| Model | Tier | Success Rate | Avg Latency | Exercises | Equip Match | Avg Sets | Avg Reps | Avg Rest |\n`;
  md += `|-------|------|--------------|-------------|-----------|-------------|----------|----------|----------|\n`;

  // Sort models by success rate for display
  const sortedModels = [...results.models].sort((a, b) => {
    const summaryA = results.modelSummaries[a.id];
    const summaryB = results.modelSummaries[b.id];
    return (summaryB?.successRate || 0) - (summaryA?.successRate || 0);
  });

  for (const model of sortedModels) {
    const summary = results.modelSummaries[model.id];
    if (!summary) continue;

    md += `| ${model.name} | ${model.tier || '-'} | ${summary.successRate}% | ${summary.avgLatency || '-'}ms | ${summary.avgExerciseCount || '-'} | ${summary.avgEquipmentMatchRate || '-'}% | ${summary.avgSets || '-'} | ${summary.avgReps || '-'} | ${summary.avgRest || '-'}s |\n`;
  }

  // Quick Stats
  md += `\n## Quick Stats\n\n`;

  const rankedModels = Object.values(results.modelSummaries)
    .filter(s => s.successCount > 0);

  if (rankedModels.length > 0) {
    // Fastest
    const fastestSuccessful = rankedModels
      .filter(s => s.avgLatency)
      .sort((a, b) => a.avgLatency - b.avgLatency)[0];
    if (fastestSuccessful) {
      md += `- **Fastest Response:** ${fastestSuccessful.name} (${fastestSuccessful.avgLatency}ms avg)\n`;
    }

    // Highest success rate
    const highestSuccess = rankedModels.sort((a, b) => b.successRate - a.successRate)[0];
    if (highestSuccess) {
      md += `- **Highest Success Rate:** ${highestSuccess.name} (${highestSuccess.successRate}%)\n`;
    }

    // Best equipment match
    const bestEquipment = rankedModels
      .sort((a, b) => (b.avgEquipmentMatchRate || 0) - (a.avgEquipmentMatchRate || 0))[0];
    if (bestEquipment && bestEquipment.avgEquipmentMatchRate) {
      md += `- **Best Equipment Match:** ${bestEquipment.name} (${bestEquipment.avgEquipmentMatchRate}%)\n`;
    }

    // Most exercises on average
    const mostExercises = rankedModels
      .sort((a, b) => (b.avgExerciseCount || 0) - (a.avgExerciseCount || 0))[0];
    if (mostExercises && mostExercises.avgExerciseCount) {
      md += `- **Most Exercises (avg):** ${mostExercises.name} (${mostExercises.avgExerciseCount})\n`;
    }
  }

  // Results by Category
  md += `\n## Results by Category\n\n`;

  const categories = [...new Set(results.scenarios.map(s => s.category).filter(Boolean))];

  // If no categories, use "uncategorized" for all scenarios
  if (categories.length === 0) {
    categories.push(undefined);
  }

  for (const category of categories) {
    const categoryName = category
      ? category.charAt(0).toUpperCase() + category.slice(1)
      : 'Uncategorized';
    md += `### ${categoryName} Scenarios\n\n`;

    const categoryScenarios = results.scenarios.filter(s => s.category === category);

    for (const scenario of categoryScenarios) {
      md += `#### ${scenario.name}\n\n`;

      if (scenario.request) {
        const equipment = scenario.request.equipment?.join(', ') || 'N/A';
        const style = scenario.request.trainingStyle || 'N/A';
        const duration = scenario.request.duration || 'N/A';
        md += `**Config:** ${equipment} | ${style} | ${duration}min\n\n`;
      }

      md += `| Model | Status | Latency | Exercises | Equip Match | Avg Sets | Avg Reps | Avg Rest |\n`;
      md += `|-------|--------|---------|-----------|-------------|----------|----------|----------|\n`;

      for (const result of scenario.results) {
        const hasWorkout = result.parsedWorkout || result.workout;
        const status = result.status === 'success' && hasWorkout ? 'OK' :
                       result.status === 'success' ? 'Parse Err' : 'API Err';
        const latency = result.latency ? `${result.latency}ms` : '-';
        const exercises = result.exerciseCount || result.metrics?.exerciseCount || '-';
        const equipMatch = result.equipmentMatch !== undefined ?
                          `${result.equipmentMatch}%` : (result.metrics?.equipmentMatchRate !== undefined ?
                          `${result.metrics.equipmentMatchRate}%` : '-');
        const avgSets = result.avgSets || result.metrics?.avgSets || '-';
        const avgReps = result.avgReps || result.metrics?.avgReps || '-';
        const avgRest = result.avgRest !== undefined ?
                       `${result.avgRest}s` : (result.metrics?.avgRest !== undefined ?
                       `${result.metrics.avgRest}s` : '-');

        md += `| ${result.model} | ${status} | ${latency} | ${exercises} | ${equipMatch} | ${avgSets} | ${avgReps} | ${avgRest} |\n`;
      }

      md += `\n`;
    }
  }

  // Methodology Reference
  md += `## Methodology\n\n`;
  md += `### Metrics Reported\n\n`;
  md += `- **Exercise Count:** Number of exercises in the workout\n`;
  md += `- **Equipment Match Rate:** Percentage of exercises using requested equipment\n`;
  md += `- **Avg Sets:** Average sets per exercise\n`;
  md += `- **Avg Reps:** Most common reps value returned\n`;
  md += `- **Avg Rest:** Average rest period in seconds\n\n`;

  md += `### Training Style Parameters (Reference)\n\n`;
  md += `| Style | Sets | Reps | Rest |\n`;
  md += `|-------|------|------|------|\n`;
  for (const [key, params] of Object.entries(TRAINING_STYLE_PARAMS)) {
    md += `| ${params.name} | ${params.sets.min}-${params.sets.max} | ${params.reps.min}-${params.reps.max} | ${params.rest.min}-${params.rest.max}s |\n`;
  }

  md += `\n---\n\n`;
  md += `*Combined from ${results.sourceFiles.length} individual model result files.*\n`;

  return md;
}

// ============================================================================
// CONSOLE SUMMARY
// ============================================================================

function printSummary(results, outputPaths) {
  console.log('\n' + '='.repeat(90));
  console.log('COMBINED BENCHMARK RESULTS');
  console.log('='.repeat(90));

  console.log('\nSOURCE FILES COMBINED:');
  for (const fileName of results.sourceFiles) {
    console.log(`  - ${fileName}`);
  }

  console.log('\nMODEL RANKINGS:');
  console.log('-'.repeat(90));
  console.log('| Rank | Model                | Success | Latency | Exercises | Equip Match | Sets | Reps |');
  console.log('|------|----------------------|---------|---------|-----------|-------------|------|------|');

  const rankedModels = Object.values(results.modelSummaries)
    .filter(s => s.successCount > 0)
    .sort((a, b) => {
      // Sort by success rate, then by latency
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      return (a.avgLatency || Infinity) - (b.avgLatency || Infinity);
    });

  rankedModels.forEach((model, index) => {
    const rank = String(index + 1).padEnd(4);
    const name = model.name.padEnd(20);
    const success = `${model.successRate}%`.padEnd(7);
    const latency = `${model.avgLatency || '-'}ms`.padEnd(7);
    const exercises = String(model.avgExerciseCount || '-').padEnd(9);
    const equipMatch = `${model.avgEquipmentMatchRate || '-'}%`.padEnd(11);
    const sets = String(model.avgSets || '-').padEnd(4);
    const reps = String(model.avgReps || '-').padEnd(4);

    console.log(`| ${rank} | ${name} | ${success} | ${latency} | ${exercises} | ${equipMatch} | ${sets} | ${reps} |`);
  });

  console.log('\nQUICK STATS:');
  console.log('-'.repeat(90));

  if (rankedModels.length > 0) {
    const fastestSuccessful = rankedModels
      .filter(s => s.avgLatency)
      .sort((a, b) => a.avgLatency - b.avgLatency)[0];
    if (fastestSuccessful) {
      console.log(`  Fastest Response:       ${fastestSuccessful.name} (${fastestSuccessful.avgLatency}ms avg)`);
    }

    const highestSuccess = rankedModels[0];
    console.log(`  Highest Success Rate:   ${highestSuccess.name} (${highestSuccess.successRate}%)`);

    const bestEquipment = rankedModels
      .sort((a, b) => (b.avgEquipmentMatchRate || 0) - (a.avgEquipmentMatchRate || 0))[0];
    if (bestEquipment && bestEquipment.avgEquipmentMatchRate) {
      console.log(`  Best Equipment Match:   ${bestEquipment.name} (${bestEquipment.avgEquipmentMatchRate}%)`);
    }
  }

  console.log('\nOUTPUT FILES:');
  console.log('-'.repeat(90));
  console.log(`  JSON: ${outputPaths.json}`);
  console.log(`  Markdown: ${outputPaths.md}`);

  console.log('\n' + '='.repeat(90));
  console.log('Combination complete!');
  console.log('='.repeat(90) + '\n');
}

// ============================================================================
// CLEANUP
// ============================================================================

function cleanupModelFiles(modelFiles) {
  console.log('\nCleaning up individual model files...');

  for (const filePath of modelFiles) {
    try {
      fs.unlinkSync(filePath);
      console.log(`  [DELETED] ${path.basename(filePath)}`);
    } catch (error) {
      console.warn(`  [FAILED] ${path.basename(filePath)}: ${error.message}`);
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const shouldCleanup = args.includes('--cleanup');

  console.log('LLM Benchmark Results Combiner');
  console.log('==============================\n');

  // Discover model files
  const modelFiles = discoverModelFiles();
  console.log(`Found ${modelFiles.length} model result files.`);

  // Fetch exercise names from Supabase
  console.log('\nFetching exercise names from Supabase...');
  const exerciseNames = await fetchExerciseNames();
  console.log(`Loaded ${Object.keys(exerciseNames).length} exercise names.`);

  // Combine results
  const combined = combineResults(modelFiles, exerciseNames);

  // Create output directory if needed
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  // Generate timestamp for filenames
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Save JSON
  const jsonPath = path.join(RESULTS_DIR, `combined-benchmark-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(combined, null, 2));

  // Generate and save Markdown
  const mdContent = generateMarkdownReport(combined);
  const mdPath = path.join(RESULTS_DIR, `combined-benchmark-${timestamp}.md`);
  fs.writeFileSync(mdPath, mdContent);

  // Print summary
  printSummary(combined, { json: jsonPath, md: mdPath });

  // Cleanup if requested
  if (shouldCleanup) {
    cleanupModelFiles(modelFiles);
    console.log('\nIndividual model files cleaned up.');
  } else {
    console.log('\nTip: Run with --cleanup to delete individual model files after combining.');
  }
}

main();
