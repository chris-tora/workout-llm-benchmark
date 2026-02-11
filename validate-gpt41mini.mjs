import fs from "fs";

const files = [
  "benchmark-results/model-openai-gpt-4-1-mini-2026-02-10T12-19-06-576Z.json",
  "benchmark-results/model-openai-gpt-4-1-mini-2026-02-10T12-53-05-442Z.json",
  "benchmark-results/model-openai-gpt-4-1-mini-2026-02-10T13-08-33-813Z.json",
  "benchmark-results/model-openai-gpt-4-1-mini-2026-01-24T18-12-27-548Z.json"
];

for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const scenarios = data.scenarios || [];
    const successes = scenarios.filter(s => s.success === true);
    const errors = scenarios.filter(s => s.success === false || s.error);

    console.log("\n========================================");
    console.log("FILE: " + file.split("/").pop());
    console.log("========================================");
    console.log("Model: " + data.modelId + " (" + data.modelName + ")");
    console.log("Tier: " + data.tier);
    console.log("Timestamp: " + data.timestamp);
    console.log("Total scenarios: " + data.totalScenarios + " (array: " + scenarios.length + ")");
    console.log("Successes: " + successes.length);
    console.log("Errors: " + errors.length);

    if (errors.length > 0) {
      console.log("\nERROR DETAILS:");
      errors.forEach(e => {
        console.log("  - " + e.name + " (" + e.split + "/" + e.dayFocus + "/" + e.duration + "min): " + (e.error || "success=false"));
      });
    }

    // Latency analysis
    const latencies = successes.map(r => r.latency).filter(Boolean);
    if (latencies.length > 0) {
      const sorted = [...latencies].sort((a, b) => a - b);
      console.log("\nLATENCY (ms):");
      console.log("  min=" + sorted[0] + ", max=" + sorted[sorted.length - 1]);
      console.log("  avg=" + Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length));
      console.log("  median=" + sorted[Math.floor(sorted.length / 2)]);
      console.log("  p95=" + sorted[Math.floor(sorted.length * 0.95)]);
    }

    // Equipment match rates
    const matchRates = successes.map(r => r.equipmentMatchRate).filter(v => v !== undefined && v !== null);
    if (matchRates.length > 0) {
      console.log("\nEQUIPMENT MATCH RATE:");
      console.log("  min=" + Math.min(...matchRates) + "%, max=" + Math.max(...matchRates) + "%");
      console.log("  avg=" + (matchRates.reduce((a, b) => a + b, 0) / matchRates.length).toFixed(1) + "%");
      const perfect = matchRates.filter(r => r === 100).length;
      console.log("  100% matches: " + perfect + "/" + matchRates.length);
    }

    // Workout validity checks
    let emptyExercises = 0;
    let missingWorkout = 0;
    let fallbacks = 0;
    let totalExerciseCount = 0;
    let genericTipsCount = 0;
    let exerciseMissingFields = 0;

    const genericTips = ["Focus on form", "Control the eccentric phase"];

    for (const r of successes) {
      const workout = r.workout;
      if (workout === null || workout === undefined) { missingWorkout++; continue; }

      // Check title for fallback
      if (workout.title === "Generated Workout") fallbacks++;

      // Check tips
      if (workout.tips) {
        const isGeneric = genericTips.every(gt => workout.tips.includes(gt));
        if (isGeneric && workout.tips.length <= 3) genericTipsCount++;
      }

      // Get exercises from sections or direct
      let exercises = workout.exercises || [];
      if (exercises.length === 0 && workout.sections) {
        exercises = workout.sections.flatMap(s => s.exercises || []);
      }

      if (exercises.length === 0) { emptyExercises++; continue; }
      totalExerciseCount += exercises.length;

      // Validate exercise fields
      for (const ex of exercises) {
        if (ex.sets === undefined || ex.reps === undefined || ex.restSeconds === undefined) {
          exerciseMissingFields++;
          break;
        }
      }
    }

    console.log("\nWORKOUT VALIDITY:");
    console.log("  Missing workout object: " + missingWorkout);
    console.log("  Empty exercises: " + emptyExercises);
    console.log("  Missing exercise fields (sets/reps/rest): " + exerciseMissingFields);
    console.log("  Fallback titles ('Generated Workout'): " + fallbacks);
    console.log("  Generic tips (fallback indicator): " + genericTipsCount);
    console.log("  Total exercises across all: " + totalExerciseCount);
    console.log("  Avg exercises per workout: " + (successes.length > 0 ? (totalExerciseCount / successes.length).toFixed(1) : "N/A"));

    // Scenario breakdown by split type
    const splitCounts = {};
    for (const s of scenarios) {
      const key = s.split + "/" + s.dayFocus;
      if (splitCounts[key] === undefined) splitCounts[key] = { success: 0, fail: 0 };
      if (s.success) splitCounts[key].success++;
      else splitCounts[key].fail++;
    }
    console.log("\nSCENARIO BREAKDOWN:");
    for (const [key, val] of Object.entries(splitCounts)) {
      console.log("  " + key + ": " + val.success + " ok" + (val.fail > 0 ? ", " + val.fail + " FAIL" : ""));
    }

    // Duration breakdown
    const durCounts = {};
    for (const s of scenarios) {
      const dur = s.duration + "min";
      if (durCounts[dur] === undefined) durCounts[dur] = 0;
      durCounts[dur]++;
    }
    console.log("\nDURATION BREAKDOWN: " + Object.entries(durCounts).map(([k, v]) => k + "=" + v).join(", "));

    // Sample 2 workouts
    console.log("\nSAMPLE WORKOUTS:");
    for (let i = 0; i < Math.min(2, successes.length); i++) {
      const s = successes[i];
      const w = s.workout;
      if (w) {
        let exercises = w.exercises || [];
        if (exercises.length === 0 && w.sections) {
          exercises = w.sections.flatMap(sec => sec.exercises || []);
        }
        console.log("  [" + i + "] " + s.name + " -> title=" + JSON.stringify(w.title));
        console.log("      exercises=" + exercises.length + ", latency=" + s.latency + "ms, equipMatch=" + s.equipmentMatchRate + "%");
        if (exercises[0]) {
          const ex = exercises[0];
          console.log("      First: " + ex.name + " | sets=" + ex.sets + " reps=" + ex.reps + " rest=" + ex.restSeconds + "s");
        }
      }
    }

  } catch (e) {
    console.log("\n=== " + file + " ===");
    console.log("ERROR: " + e.message);
  }
}
