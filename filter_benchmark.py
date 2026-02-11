#!/usr/bin/env python3
"""
Filter benchmark-data.json to only the 10 planned scenarios from the Feb 10 benchmark run.
6 blended + 4 non-blended scenarios, 2 models each = 20 total results.

Recalculates modelStats and modelSummaries from the filtered data.
"""

import json
from datetime import datetime, timezone

DATA_PATH = "/home/arian/expo-work/showcase/public/benchmark-data.json"

# The 10 planned scenario names (from benchmark-deploy-plan.md)
TARGET_SCENARIOS = [
    # Non-blended (4)
    "Bro Split (Chest)",
    "Bro Split (Legs)",
    "Upper/Lower - Strength (Upper)",
    "Full Body - HIT",
    # Blended (6)
    "PPL - Strength + Bodybuilding (Push)",
    "Upper/Lower - HIT + Bodybuilding (Upper)",
    "Full Body - Strength + Endurance",
    "Arnold Split - Bodybuilding + Endurance (Chest/Back)",
    "Arnold Split - Bodybuilding + HIT (Chest/Back)",
    "Arnold Split - Bodybuilding + HIT (Shoulders/Arms)",
]

def recalculate_model_stats(scenarios, models):
    """Recalculate modelSummaries and modelStats from filtered scenario data."""
    model_summaries = {}
    model_stats = []

    for model in models:
        model_id = model["id"]
        model_name = model["name"]
        tier = model["tier"]

        total_tests = 0
        success_count = 0
        parse_error_count = 0
        api_error_count = 0
        total_latency = 0
        total_exercise_count = 0
        total_equipment_match_rate = 0
        total_sets = 0
        total_rest = 0
        total_reps = 0

        for scenario in scenarios:
            for result in scenario.get("results", []):
                if result.get("modelId") != model_id:
                    continue
                total_tests += 1
                status = result.get("status", "")
                if status == "success":
                    success_count += 1
                    total_latency += result.get("latency", 0)
                    total_exercise_count += result.get("exerciseCount", 0)
                    total_equipment_match_rate += result.get("equipmentMatch", 0)
                    total_sets += result.get("avgSets", 0)
                    total_rest += result.get("avgRest", 0)
                    total_reps += result.get("avgReps", 0)
                elif status == "parse_error":
                    parse_error_count += 1
                elif status == "api_error":
                    api_error_count += 1

        if success_count > 0:
            avg_latency = round(total_latency / success_count)
            avg_exercise_count = round(total_exercise_count / success_count, 1)
            avg_equipment_match_rate = round(total_equipment_match_rate / success_count)
            avg_sets = round(total_sets / success_count, 1)
            avg_rest = round(total_rest / success_count)
            avg_reps = round(total_reps / success_count, 1)
        else:
            avg_latency = 0
            avg_exercise_count = 0
            avg_equipment_match_rate = 0
            avg_sets = 0
            avg_rest = 0
            avg_reps = 0

        success_rate = round((success_count / total_tests) * 100) if total_tests > 0 else 0

        model_summaries[model_id] = {
            "name": model_name,
            "tier": tier,
            "totalTests": total_tests,
            "successCount": success_count,
            "parseErrorCount": parse_error_count,
            "apiErrorCount": api_error_count,
            "totalLatency": total_latency,
            "totalExerciseCount": total_exercise_count,
            "totalEquipmentMatchRate": total_equipment_match_rate,
            "totalSets": total_sets,
            "totalRest": total_rest,
            "totalReps": total_reps,
            "avgLatency": avg_latency,
            "avgExerciseCount": avg_exercise_count,
            "avgEquipmentMatchRate": avg_equipment_match_rate,
            "avgSets": avg_sets,
            "avgRest": avg_rest,
            "avgReps": avg_reps,
            "successRate": success_rate,
        }

        model_stats.append({
            "modelId": model_id,
            "modelName": model_name,
            "tier": tier,
            "successRate": success_rate,
            "avgLatency": avg_latency,
            "avgExerciseCount": avg_exercise_count,
            "avgEquipmentMatchRate": avg_equipment_match_rate,
            "successCount": success_count,
            "parseErrorCount": parse_error_count,
            "totalRuns": total_tests,
        })

    return model_summaries, model_stats


def main():
    with open(DATA_PATH) as f:
        data = json.load(f)

    print(f"BEFORE: {len(data['scenarios'])} scenarios")

    # Filter to only the 10 target scenarios
    target_set = set(TARGET_SCENARIOS)
    filtered_scenarios = [s for s in data["scenarios"] if s["name"] in target_set]

    # Verify we got exactly 10
    found_names = [s["name"] for s in filtered_scenarios]
    missing = target_set - set(found_names)
    if missing:
        print(f"ERROR: Missing scenarios: {missing}")
        return

    print(f"AFTER:  {len(filtered_scenarios)} scenarios")

    # Count total results
    total_results = sum(len(s.get("results", [])) for s in filtered_scenarios)
    print(f"Total results: {total_results}")

    # List what we kept
    for s in filtered_scenarios:
        styles = s.get("trainingStyles", [])
        blended = "BLENDED" if len(styles) > 1 else "NON-BLENDED"
        n_results = len(s.get("results", []))
        print(f"  [{blended:11s}] {s['name']:55s} | {n_results} results")

    # Recalculate model stats
    model_summaries, model_stats = recalculate_model_stats(filtered_scenarios, data["models"])

    # Print recalculated stats
    print("\nRecalculated model stats:")
    for ms in model_stats:
        print(f"  {ms['modelName']:20s} | success={ms['successRate']}% ({ms['successCount']}/{ms['totalRuns']}) | avgLatency={ms['avgLatency']}ms | avgExercises={ms['avgExerciseCount']} | equipMatch={ms['avgEquipmentMatchRate']}%")

    # Update the data
    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    data["timestamp"] = now
    data["totalScenarios"] = len(filtered_scenarios)
    data["scenarios"] = filtered_scenarios
    data["modelSummaries"] = model_summaries
    data["modelStats"] = model_stats

    # Update metadata if present
    if "metadata" in data:
        data["metadata"]["filteredAt"] = now
        data["metadata"]["filterReason"] = "Filtered to 10 planned scenarios (6 blended + 4 non-blended) from Feb 10 benchmark run"

    # Write back
    with open(DATA_PATH, "w") as f:
        json.dump(data, f, indent=2)

    print(f"\nSaved to {DATA_PATH}")
    print("Done!")


if __name__ == "__main__":
    main()
