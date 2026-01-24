import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ivfllbccljoyaayftecd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZmxsYmNjbGpveWFheWZ0ZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTkwMTQsImV4cCI6MjA4MTY5NTAxNH0.714kFWsFFKwVAywLY5NOyZz2_eMoi7-Js8JGCwtpycs';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fetch video URLs from database
async function fetchVideoUrls() {
  const videoUrls = {};
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, video_url')
      .not('video_url', 'is', null)
      .range(offset, offset + pageSize - 1);
    if (error || !data || data.length === 0) break;
    for (const ex of data) videoUrls[ex.id] = ex.video_url;
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  console.log(`Loaded ${Object.keys(videoUrls).length} video URLs from database`);
  return videoUrls;
}

// Only the 6 model files from our 18:12 run
const latestFiles = [
  'model-anthropic-claude-haiku-4-5-2026-01-24T18-12-27-519Z.json',
  'model-anthropic-claude-sonnet-4-5-2026-01-24T18-12-27-536Z.json',
  'model-google-gemini-3-flash-preview-2026-01-24T18-12-27-545Z.json',
  'model-openai-gpt-4-1-mini-2026-01-24T18-12-27-548Z.json',
  'model-openai-gpt-4o-2026-01-24T18-12-27-539Z.json',
  'model-openai-gpt-4o-mini-2026-01-24T18-12-27-536Z.json',
];

const models = latestFiles.map(f => {
  const data = JSON.parse(fs.readFileSync(path.join('benchmark-results', f)));
  return data;
});

// Main async function
async function main() {
  // Fetch video URLs from database
  const videoUrls = await fetchVideoUrls();

  // Build scenario-centric structure
  const scenarioMap = new Map();
  models.forEach(model => {
    model.scenarios.forEach(scenario => {
      if (!scenarioMap.has(scenario.name)) {
        scenarioMap.set(scenario.name, {
          name: scenario.name,
          split: scenario.split,
          duration: scenario.duration || parseInt(scenario.name.match(/\((\d+)min\)/)?.[1]) || 60,
          equipment: scenario.equipment,
          dayFocus: scenario.dayFocus,
          trainingStyles: scenario.trainingStyles,
          results: [] // Array, not object
        });
      }

      // Extract exercises from workout sections, look up videoUrl from database by exercise ID
      let exercises = [];
      if (scenario.workout?.sections) {
        exercises = scenario.workout.sections.flatMap(s =>
          (s.exercises || []).map(e => ({
            name: e.name,
            target: e.target,
            equipment: e.equipment,
            sets: e.sets,
            reps: e.reps,
            rest: e.restSeconds || e.rest || 60,
            notes: e.notes || null,
            videoUrl: videoUrls[e.id] || videoUrls[e.exerciseId] || null // Fetch from database by ID
          }))
        );
      }

      // Push result with correct field names for LLMBenchmark.jsx
      scenarioMap.get(scenario.name).results.push({
        modelId: model.modelId,
        model: model.modelName,
        status: scenario.success ? 'success' : 'error',
        latency: scenario.latency,
        exerciseCount: scenario.exerciseCount,
        equipmentMatch: scenario.equipmentMatchRate || 0, // Note: equipmentMatch not equipmentMatchRate
        avgSets: scenario.avgSets,
        avgReps: scenario.avgReps,
        avgRest: scenario.avgRest,
        exercises,
        error: scenario.error,
        workout: scenario.workout,
        meta: scenario.meta
      });
    });
  });

  // Build model summaries
  const modelSummaries = models.map(m => ({
    modelId: m.modelId,
    modelName: m.modelName,
    tier: m.tier,
    totalScenarios: m.totalScenarios,
    summary: m.summary
  }));

  // Build modelStats (required by LLMBenchmark component)
  const modelStats = models.map(m => ({
    modelId: m.modelId,
    modelName: m.modelName,
    tier: m.tier,
    successRate: m.summary?.successRate || 100,
    avgLatency: m.summary?.avgLatency || 0,
    avgExerciseCount: m.summary?.avgExerciseCount || 0,
    avgEquipmentMatchRate: m.summary?.avgEquipmentMatchRate || 100,
    successCount: m.summary?.successCount || m.totalScenarios,
    parseErrorCount: m.summary?.parseErrorCount || 0,
    avgSets: m.summary?.avgSets || 0,
    avgReps: m.summary?.avgReps || '0',
    avgRest: m.summary?.avgRest || 0
  }));

  const combined = {
    timestamp: new Date().toISOString(),
    version: '2.1-clean',
    sourceFiles: latestFiles,
    totalModels: models.length,
    totalScenarios: scenarioMap.size,
    modelSummaries,
    modelStats,
    scenarios: Array.from(scenarioMap.values())
  };

  fs.writeFileSync('public/benchmark-data.json', JSON.stringify(combined, null, 2));
  console.log('Created clean combined file');
  console.log('Models:', combined.totalModels);
  console.log('Scenarios:', combined.totalScenarios);

  // Count video URLs
  let withVideo = 0, withoutVideo = 0;
  combined.scenarios.forEach(s => s.results.forEach(r => r.exercises.forEach(e => e.videoUrl ? withVideo++ : withoutVideo++)));
  console.log('Exercises with video:', withVideo);
  console.log('Exercises without video:', withoutVideo);
}

main().catch(console.error);
