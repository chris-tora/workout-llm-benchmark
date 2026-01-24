# Benchmark Analysis Report
**Date:** 2026-01-20
**Benchmark File:** `combined-benchmark-2026-01-20T20-06-35-369Z.json`
**Models Tested:** 6 (Claude Haiku/Sonnet 4.5, Gemini 3 Flash, GPT-4o, GPT-4o Mini, GPT-4.1 Mini)
**Scenarios:** 10
**Total Results:** 60 (10 scenarios × 6 models)

---

## TL;DR - Key Problems

| Problem | Severity | Details |
|---------|----------|---------|
| **Bench Press Obsession** | CRITICAL | 27 appearances, 46.5% of exercises are bench-related |
| **No Leg Work** | CRITICAL | <5 leg exercises across 60 workouts |
| **Push:Pull Imbalance** | HIGH | 2.8:1 ratio (should be 1:1) |
| **Isolation on Strength Days** | HIGH | Flies/pullovers on days requiring compounds only |
| **"Lever" Naming Artifacts** | MEDIUM | 25 exercises with awkward database names |
| **Missing Biceps on Arm Day** | HIGH | 0 bicep curls across all 6 models |

---

## JSON Schema Reference

### Root Structure
```json
{
  "metadata": { "combinedAt": "...", "earliestResult": "...", "latestResult": "..." },
  "models": [],           // Array of model definitions
  "scenarios": [],        // Array of test scenarios with results
  "modelStats": [],       // Aggregated per-model statistics
  "modelSummaries": {},   // Object keyed by model ID
  "totalModels": 6,
  "totalScenarios": 10,
  "version": "2.0"
}
```

### Key Fields per Result
| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "success" or "error" |
| `latency` | number | Response time in ms |
| `exerciseCount` | number | Exercises generated |
| `equipmentMatch` | number | 0-100% equipment usage |
| `workout.title` | string | Generated title (fallback = "Generated Workout") |
| `workout.tips` | string[] | Workout-specific coaching points |
| `exercises[].target` | string | Primary muscle |
| `exercises[].tempo` | string | Eccentric-pause-concentric (e.g., "2-0-1") |

---

## Executive Summary

| Category | Status | Details |
|----------|--------|---------|
| Fallback Rate | 0% (GOOD) | All 60 workouts used real LLM output |
| Model Failure Rate | 1.7% | GPT-4.1 Mini failed on 1/10 scenarios |
| Fake Exercises | 0 | All "suspicious" exercises exist in DB |
| Undersized Workouts | CRITICAL | 2 scenarios return too few exercises |
| Missing Body Parts | CRITICAL | Arms day missing ALL bicep exercises |
| Training Style Violations | 58 | Rest periods 15-25% too high |

---

## Critical Issues

### 1. ARM DAY COMPLETE FAILURE (Priority 1)

**Scenario 10: Arnold Split - Shoulders/Arms**
- **Issue:** ALL 6 models returned ZERO bicep exercises
- **Expected:** Barbell curls, dumbbell curls, preacher curls, EZ bar curls
- **Actual:** 100% shoulder-focused (lateral raises, overhead presses)

**Exercises Selected (All Models):**
- Dumbbell Standing Overhead Press
- Dumbbell Standing Arnold Press
- Cable Lateral Raise
- Band Lateral Raise
- Dumbbell Rear Lateral Raise

**Missing:**
- ANY bicep curl variation
- ANY tricep isolation (except seated close grip press)

**Root Cause Investigation:**
```
getSplitBodyParts("arnold_split", "shoulders_arms")
  → Returns: ["shoulders", "upper arms"]

filterByTargetMuscles() allows: ["delts", "biceps", "triceps", "forearms"]
  → Filter is CORRECT

Likely Issue: Database query or LLM selection bias toward shoulder exercises
```

**Location:** `index.ts:142`, `muscle-filter.ts:66`

---

### 2. PPL PUSH UNDERSIZED (Priority 1)

**Scenario 5: PPL Push - Strength + Bodybuilding - 60 min**
- **Issue:** ALL 6 models returned only 3 exercises
- **Expected:** 6-10 exercises for 60 min workout
- **Actual:** Just 3 chest presses

**Exercises Returned:**
1. Barbell Bench Press
2. Barbell Incline Bench Press (or variant)
3. Dumbbell Seated Close Grip Press

**Missing:**
- Shoulder presses
- Lateral raises
- Tricep isolation

**Root Cause:**
```typescript
// duration-calculator.ts lines 40-46
export const EXERCISE_COUNT_MATRIX = {
  STRENGTH: { 30: 3, 45: 4, 60: 5, 75: 6, 90: 7 },  // TOO LOW!
  BODYBUILD: { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 },
  ...
};
```

**Fix Required:** Increase STRENGTH matrix values:
- 60 min: 5 → 8
- 75 min: 6 → 9
- 90 min: 7 → 10

---

### 3. FULL BODY STRENGTH UNDERSIZED (Priority 2)

**Scenario 2: Full Body - Strength - 90 min**
- **Issue:** ALL 6 models returned only 5 exercises
- **Expected:** 8-10 exercises for 90 min
- **Actual:** Missing leg work entirely

**Root Cause:** Same `EXERCISE_COUNT_MATRIX` issue

---

### 4. MODEL COMPLETE FAILURE (Priority 1)

**GPT-4.1 Mini on Scenario 9:**
- Returned 0 exercises (complete generation failure)
- 1/60 total runs = 1.7% failure rate

**Fix:** Add retry logic and fallback handling

---

## Verified: All "Suspicious" Exercises Exist in Database

| Exercise Name | Status | Database ID |
|---------------|--------|-------------|
| Landmine Shoulders Press with Viking Press Attachment | EXISTS | `d5aeef84-43e9-473b-aafe-299fcbe26369` |
| Cable Incline Y Raise Wrist Straps with Back Support | EXISTS | `97b9b9d3-3b50-4a34-89a0-903bad401033` |
| Lever Pronated Grip Seated Scapula Retraction Shrug | EXISTS | `9288d71b-fb67-4105-bdde-e458c17c097f` |
| Dumbbell Press Squat | EXISTS | `744824bc-d4d1-4455-850e-7ed24038d74d` |
| Dumbbell Around Pullover | EXISTS | `172f21db-b1ca-449d-b4b5-c491f7ed2149` |
| Standing Iron Eagle | EXISTS | `d08b965a-d0f5-4439-9919-704e23d99a8e` |
| Dumbbell Incline Breeding | EXISTS (TYPO) | `0ef7b6a3-0084-4a52-938d-374f1c159acd` |

**Note:** "Dumbbell Incline Breeding" is likely a typo for "Breathing" in the original ExerciseDB data.

---

## Duplicate Exercises in Same Workout

| Scenario | Model | Duplicate |
|----------|-------|-----------|
| 4 (Full Body Endurance) | GPT-4o | "Wide Grip Pull-Up" x2 |
| 6 (Upper/Lower) | GPT-4.1 Mini | "Cable Seated Rear Delt Raise" x2 |
| 6 (Upper/Lower) | GPT-4o | "Lever Chest Press" x2 (near-duplicate) |
| 7 (Full Body Strength+Endurance) | GPT-4o Mini | "Pull-up" x3 variations |

---

## Training Style Violations (58 Total)

**Issue:** Rest periods consistently 15-25% higher than training style guidelines

### Rest Period Violations (Most Severe)

| Scenario | Style | Target Rest | Actual | Deviation |
|----------|-------|-------------|--------|-----------|
| Bro Split (Chest) | classic_bodybuilding | 60-90s | 113s | +23-53s |
| Full Body Endurance | muscular_endurance | 30-45s | 67-81s | +22-36s |
| PPL Strength+BB | blended | 90-150s | 180s | +30s |
| Upper/Lower HIT+BB | blended | 90-135s | 144-180s | +9-45s |
| Full Body Strength+Endurance | blended | 75-120s | 126-162s | +6-42s |
| Arnold Split variants | blended | 75-120s | 129-142s | +9-22s |

### Rep Range Violations

| Scenario | Target | Model | Actual | Issue |
|----------|--------|-------|--------|-------|
| Full Body Strength | 4-6 | GPT-4o, GPT-4o Mini | 3 | Too low |
| Full Body Endurance | 15-20 | GPT-4.1 Mini | 25 | Too high |
| PPL Strength+BB | 5-9 | Haiku, Gemini, 4.1 Mini, 4o Mini | 3 | Too low |
| Arnold Split BB+Endurance | 10-16 | GPT-4o, GPT-4o Mini | 8 | Too low |
| Arnold Split BB+HIT | 8-11 | All Claude + Gemini + 4o Mini | 12 | Too high |

### Model Compliance Ranking

| Model | Violations | Pattern |
|-------|-----------|---------|
| Claude 4.5 Haiku | 8 | Rest too high, bodybuilding rep bias |
| Claude Sonnet 4.5 | 8 | Same as Haiku |
| Gemini 3 Flash | 8 | Same as Haiku |
| GPT-4.1 Mini | 8 | **WORST** - complete failure on Arnold HIT |
| GPT-4o | 9 | Rest high, strength rep bias |
| GPT-4o Mini | 9 | Rest high, strength rep bias |

**Conclusion:** All models tied - issues are systematic in the edge function, not model-specific.

---

## Model Performance Summary

| Model | Issues | Recommendation |
|-------|--------|----------------|
| Claude 4.5 Haiku | Consistent, lacks arm day curls | Keep |
| Claude Sonnet 4.5 | Similar to Haiku, good variety | Keep |
| Gemini 3 Flash | Good lever machine usage, some fake-sounding names | Keep |
| GPT-4.1 Mini | **WORST** - complete failure, fake equipment, typos, duplicates | Review |
| GPT-4o | Invents unusual variations, near-duplicates | Keep with monitoring |
| GPT-4o Mini | Formatting issues, multiple pull-up variants | Keep with monitoring |

---

## Root Cause: EXERCISE_COUNT_MATRIX

**Location:** `/home/arian/expo-work/fitness-app/supabase/functions/generate-workout/phases/duration-calculator.ts`

**Current (TOO LOW):**
```typescript
export const EXERCISE_COUNT_MATRIX: Record<string, Record<number, number>> = {
  STRENGTH: { 30: 3, 45: 4, 60: 5, 75: 6, 90: 7 },
  BODYBUILD: { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 },
  HIT: { 30: 3, 45: 4, 60: 5, 75: 6, 90: 6 },
  ENDURANCE: { 30: 5, 45: 6, 60: 8, 75: 9, 90: 10 },
  AI_AUTO: { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 },
};
```

**Recommended Fix:**
```typescript
export const EXERCISE_COUNT_MATRIX: Record<string, Record<number, number>> = {
  STRENGTH: { 30: 4, 45: 6, 60: 8, 75: 9, 90: 10 },
  BODYBUILD: { 30: 5, 45: 6, 60: 8, 75: 9, 90: 10 },
  HIT: { 30: 3, 45: 4, 60: 5, 75: 6, 90: 6 },  // Keep (HIT uses fewer exercises)
  ENDURANCE: { 30: 5, 45: 6, 60: 8, 75: 9, 90: 10 },
  AI_AUTO: { 30: 5, 45: 6, 60: 8, 75: 9, 90: 10 },
};
```

---

## Recommended Actions

### Immediate (Priority 1)
1. **Reduce Bench Press frequency** - Add prompt: "Avoid Barbell Bench Press if used recently". Cap at 2x per 10 workouts.
2. **Add leg exercise requirement** - All Full Body scenarios MUST include 1 leg compound
3. **Fix EXERCISE_COUNT_MATRIX** - Increase values for STRENGTH and BODYBUILD styles
4. **Add pulling exercise requirement** - Minimum 1 pull per session to fix 2.8:1 push:pull ratio

### Short-term (Priority 2)
5. **Strip "Lever" prefix** - Normalize exercise names in edge function output
6. **Add deduplication logic** - Prevent same exercise appearing twice in workout
7. **Enforce training style rules** - No isolation on STRENGTH, max 4-6 exercises on HIT
8. **Investigate bicep availability** - Query DB for bicep exercises with required equipment

### Long-term (Priority 3)
9. **Review rest period calculations** - Reduce 15-25% inflation
10. **Add exercise diversity scoring** - Track and penalize overused exercises
11. **Consider removing GPT-4.1 Mini** - Highest failure rate + worst diversity

---

## Files Modified for Investigation

| File | Purpose |
|------|---------|
| `duration-calculator.ts:40-46` | EXERCISE_COUNT_MATRIX (root cause) |
| `index.ts:122-161` | getSplitBodyParts() mapping |
| `index.ts:163-180` | bodyPartMapping to ExerciseDB |
| `muscle-filter.ts:65-66` | Target muscle allow list |
| `chain-orchestrator.ts:335-341` | Exercise count passed to LLM |

---

## Exercise Staleness & Repetition (NEW)

### Most Overused Exercises

| Rank | Exercise | Appearances | Expected | Problem |
|------|----------|-------------|----------|---------|
| 1 | Barbell Bench Press | 27 | ~10 | 2.7x overused |
| 2 | Dumbbell Seated Close Grip Press | 19 | ~6 | 3x overused |
| 3 | Dumbbell Bench Press | 15 | ~6 | 2.5x overused |
| 4 | Barbell Incline Bench Press | 10 | ~4 | 2.5x overused |

**5 of the top 9 "stale" exercises are bench press variants.** Models show zero creativity.

### What's Missing (Severely Underrepresented)

| Category | Appearances | Status |
|----------|-------------|--------|
| Deadlifts | 0-1 | MISSING |
| Squats | 0-1 | MISSING |
| Pull-ups/Chin-ups | <3 | MINIMAL |
| Olympic Lifts | 0 | MISSING |
| Leg Press | <1 | MISSING |

### Model Diversity Ranking

| Rank | Model | Unique Exercises | Rating |
|------|-------|------------------|--------|
| 1 | GPT-4o Mini | 44 | Best |
| 2 | GPT-4o | 39 | Good |
| 3 | Claude Haiku | 37 | Average |
| 4 | GPT-4.1 Mini | 37 | Average |
| 5 | Gemini 3 Flash | 33 | Poor |
| 6 | Claude Sonnet 4.5 | 31 | Worst |

**Surprise:** Fast-tier GPT-4o Mini beats premium Claude Sonnet. Problem is system design, not model capability.

---

## Training Style Appropriateness (NEW)

### Issues Found: 50% of Scenarios QUESTIONABLE

| Scenario | Style | Rating | Issue |
|----------|-------|--------|-------|
| Full Body Strength | STRENGTH | ⚠️ | Isolation exercises (Flies, Pullovers) on strength day |
| Full Body HIT | HIT | ⚠️ | Too many exercises (5+), includes isolation raises |
| Upper/Lower HIT+BB | Dual | ⚠️ | 4-set isolation breaks HIT 2-set rule |
| Arnold Split B+HIT | Dual | ⚠️ | Flies and Cable Pulldowns in HIT section |
| Bro Split Chest | BB | ✅ | Correct mix of compounds + isolation |
| Full Body Endurance | Endurance | ✅ | High rep, good mix |
| PPL Strength+BB | Dual | ✅ | Proper strength→hypertrophy progression |

### Style Rule Violations

| Style | Rule | Violation |
|-------|------|-----------|
| STRENGTH | Compounds only, no isolation | Flies, Pullovers appearing |
| HIT | 4-6 exercises max, 2 sets | 5+ exercises, isolation included |
| HIT | Compounds to failure only | Lateral raises, rear delt raises |

---

## "Lever" Naming Artifacts (NEW)

**25 exercises (86% of weird findings)** have awkward "Lever" prefix from ExerciseDB:

| Example | Word Count | Problem |
|---------|------------|---------|
| "Lever Pronated Grip Seated Scapula Retraction Shrug (plate loaded)" | 9 | Impractical name |
| "Lever Bent Over Neutral Grip Row (with chest support)" | 8 | Over-specified |
| "Lever Pec Deck Fly" | 4 | Should just be "Pec Deck Fly" |

**Root Cause:** ExerciseDB has equipment category ("Lever") bleeding into exercise names. Fix: Strip "Lever" prefix in edge function output.

---

## Red Flags: What Constitutes "Unconventional" Workouts

### Critical Issues (Immediate Failure)

| Issue | Detection | Example |
|-------|-----------|---------|
| **Wrong Equipment** | Equipment match rate <70% | Returning dumbbells when user only has barbell |
| **Wrong Body Parts** | Exercises don't match split day | Bicep curls on chest-focused day |
| **Missing Exercises** | Less than 4 for 60min | Returns 2 exercises when expecting 5-7 |
| **Parse Error** | Invalid JSON | Missing `sections`, malformed arrays |
| **API Error** | HTTP 400+ | Edge function error before LLM ran |
| **Fallback Title** | `title === "Generated Workout"` | Should be contextual like "Chest Day - Bodybuilding" |
| **Generic Tips** | `["Focus on form", "Control eccentric"]` | Real LLM produces workout-specific guidance |

### Training Style Red Flags

| Style | Red Flags |
|-------|-----------|
| **HIT (Mentzer)** | More than 2 sets/exercise, doesn't mention "to failure", rest under 120s |
| **Endurance** | No circuits/tri-sets, rest >45s, reps under 15 |
| **Strength** | Includes supersets (should be straight sets), reps over 6 |
| **Bodybuilding** | Missing isolation exercises, all compounds |

### Blending Violations

For scenarios with 2 styles (e.g., Strength + Endurance):
- First half should use Strength params (heavy compounds, 4-6 reps, 2-4min rest)
- Second half should use Endurance params (high reps 15-20, short rest 30-45s)

---

## Benchmark Scenarios Tested (26 Total)

| Category | Scenarios |
|----------|-----------|
| Bro Split | Chest, Back, Shoulders, Arms, Legs |
| Strength | Upper/Lower (Upper), Upper/Lower (Lower), Full Body |
| HIT | Upper/Lower (Upper), Full Body, Upper/Lower (Lower) |
| Endurance | Full Body, Upper/Lower (Upper) |
| PPL | Bodybuilding (Push, Pull, Legs) |
| Blended | PPL Strength+BB, Upper/Lower HIT+BB, Full Body Strength+Endurance |
| Arnold Split | BB (Chest/Back), BB (Shoulders/Arms), BB+Endurance variants, BB+HIT variants |

---

## ROOT CAUSE ANALYSIS: Bench Press Bias & Missing Legs

### Summary of Bias Sources

| Type | Location | Impact | Severity |
|------|----------|--------|----------|
| **Explicit Prompt Bias** | exercise-selector.ts:94-99 | "bench" named in STRENGTH prompt | CRITICAL |
| **Default Muscle Mapping** | chain-orchestrator.ts:211-227 | Push/Upper defaults to pectorals | HIGH |
| **Database Imbalance** | Supabase exercises table | 73 bench variants, 1 hamstring in core tier | CRITICAL |
| **Prompt Gap** | exercise-selector.ts | No leg enforcement rule | HIGH |
| **Scenario Gap** | benchmark-scenarios.mjs | Only 10 scenarios ran, skipped leg days | MEDIUM |

---

### 1. EXPLICIT PROMPT BIAS

**File:** `/home/arian/expo-work/fitness-app/supabase/functions/generate-workout/phases/exercise-selector.ts`
**Lines:** 94-99

```typescript
STRENGTH TRAINING PHILOSOPHY:
- PRIORITIZE heavy compound movements (squat, deadlift, bench, row, press)
- Focus on progressive overload with 80-95% 1RM weights
```

**Problem:** "bench" is explicitly named but **no other style mentions leg exercises by name**.
This creates primacy bias - LLMs fixate on named exercises.

**Missing in other styles:**
- BODYBUILD prompt: No leg exercise examples
- ENDURANCE prompt: No leg exercise examples
- HIT prompt: No leg exercise examples

---

### 2. DEFAULT MUSCLE MAPPING (Implicit Bias)

**File:** `/home/arian/expo-work/fitness-app/supabase/functions/generate-workout/phases/chain-orchestrator.ts`
**Lines:** 211-227

```typescript
const PRIMARY_MUSCLE_BY_DAY: Record<string, string> = {
  push: "pectorals",      // ← Push = chest first
  upper: "pectorals",     // ← Upper = chest first
  pull: "lats",
  lower: "quads",
  legs: "quads",
  full_body: "pectorals", // ← Full Body = chest first!
  chest: "pectorals",
  back: "lats",
  shoulders: "delts",
  arms: "biceps",
  chest_back: "pectorals",
  shoulders_arms: "delts",
};
```

**Problem:** When filtering exercises, `pectorals` is the default for:
- Push days
- Upper days
- Full Body days
- Chest/Back days

This means 4 out of 12 day types default to chest exercises, while legs only gets priority in 2 (lower, legs).

---

### 3. DATABASE IMBALANCE (Core Tier)

**Analysis of core tier exercises by target muscle:**

| Target Muscle | Core Tier Count | Percentage |
|--------------|-----------------|------------|
| Quads | 28 | 37.8% |
| Pectorals | 15 | 20.3% |
| Lats | 12 | 16.2% |
| Delts | 8 | 10.8% |
| Glutes | 5 | 6.8% |
| Abs | 3 | 4.1% |
| Biceps | 2 | 2.7% |
| **Hamstrings** | **1** | **1.4%** |
| **Triceps** | **0** | **0%** |

**Critical Gaps:**
- Only **1 hamstring** exercise in core tier
- **0 triceps** exercises in core tier
- This explains why arm days have no tricep isolation

**Bench Press Variants in Database:** 73 total variations
- Barbell Bench Press
- Incline Bench Press
- Decline Bench Press
- Close Grip Bench Press
- Dumbbell Bench Press (multiple)
- Machine Bench Press
- Smith Machine Bench Press
- ... 60+ more

---

### 4. PROMPT GAP: No Leg Enforcement

The exercise selector prompt has no rule like:
```
"For FULL_BODY days, you MUST include at least 1 lower body compound (squat, deadlift, leg press)"
```

Current prompts let the LLM freely choose, and given:
- Bench is explicitly named
- Chest has 73 variants to choose from
- LLMs have training bias toward popular exercises

...the result is bench press dominance.

---

### 5. BENCHMARK SCENARIO GAP

**What ran:** Only 10 scenarios out of 66+ possible
**What was skipped:**
- PPL - Legs Day
- Upper/Lower - Lower Day
- Arnold - Legs Day
- Bro Split - Legs Day

This means **leg-specific scenarios were never tested**, masking the leg exercise selection problem.

---

### Recommended Fixes

**Priority 1 - Prompt Updates:**
```typescript
// exercise-selector.ts - Add to ALL training styles
"DISTRIBUTION RULE: For sessions targeting 3+ body parts,
distribute exercises proportionally. Full Body MUST include
at least 1 lower body compound (squat, deadlift, leg press, lunge)."
```

**Priority 2 - Database Fixes:**
```sql
-- Add missing core tier exercises
UPDATE exercises SET tier = 'core' WHERE name IN (
  'Barbell Romanian Deadlift',
  'Lying Leg Curl',
  'Seated Leg Curl',
  'Tricep Pushdown',
  'Overhead Tricep Extension'
);
```

**Priority 3 - Default Mapping:**
```typescript
// chain-orchestrator.ts - Update full_body default
const PRIMARY_MUSCLE_BY_DAY = {
  full_body: null, // Don't default to any muscle - use proportional distribution
  // ...
};
```

**Priority 4 - Benchmark Coverage:**
- Add dedicated leg day scenarios to benchmark
- Run at least 1 scenario per split/day combination

---

## WAVE 3: Deep Dive Analysis

### Quantitative Evidence: Leg Exercise Shortage

| Metric | Value | Severity |
|--------|-------|----------|
| Total exercises in benchmark | 624 | — |
| Leg exercises total | **11** | CRITICAL |
| Leg exercise percentage | **1.76%** | CRITICAL |
| Bench press variants | 70 | — |
| Chest-to-Leg ratio | **13.6:1** | CRITICAL |

**Only 3 unique leg exercises were selected across all 624 exercises:**
1. Dumbbell Press Squat (9x)
2. Kettlebell Two Arm Clean (1x)
3. Sumo Deadlift High Pull (1x)

### Full Body Scenarios - Lower Body Breakdown

| Scenario | Leg Exercises | Leg % | Expected |
|----------|--------------|-------|----------|
| Full Body - Strength | 6/60 | 10.0% | 20%+ |
| Full Body - Strength + Endurance | 2/60 | 3.33% | 20%+ |
| Full Body - HIT | 2/60 | 3.33% | 20%+ |
| Full Body - Endurance | 1/60 | 1.67% | 20%+ |
| **Combined** | **11/240** | **4.58%** | **20-30%** |

### HIT Training Style - Specific Bugs Found

**Bug 1: PREFER_MACHINES Never Implemented**
- `types.ts` line 107: `specialLogic: ["HARD_CAP_SETS", "PREFER_MACHINES", "FAILURE_REQUIRED"]`
- **PREFER_MACHINES is defined but NO CODE exists to apply it**
- LLM sees guidance in prompt but no actual filtering/weighting toward machines

**Bug 2: Muscle Coverage Enforcement Bypassed**
- `chain-orchestrator.ts` lines 522-525:
  ```typescript
  if (request.targetMuscles && request.targetMuscles.length > 0) {
    selection = enforceMusclesCoverage(...);
  }
  ```
- Full Body sends `bodyParts`, not `targetMuscles`
- Muscle coverage enforcement **never runs** for Full Body scenarios

**Bug 3: Fallback Drops Target Filter**
- `index.ts` lines 989-1009: When < 5 exercises found, code drops `targetMuscles` filter entirely
- This allows any exercises through, biased toward chest (most variants in DB)

### Per-Model HIT Leg Distribution

| Model | Leg Exercises | Leg % |
|-------|--------------|-------|
| Claude 4.5 Haiku | 0 | 0.0% |
| Claude Sonnet 4.5 | 1 | 10.0% |
| Gemini 3 Flash | 1 | 10.0% |
| GPT-4.1 Mini | 0 | 0.0% |
| GPT-4o | 0 | 0.0% |
| GPT-4o Mini | 0 | 0.0% |

**4 out of 6 models returned ZERO leg exercises for Full Body - HIT.**

---

## Next Benchmark Run Checklist

- [ ] Apply EXERCISE_COUNT_MATRIX fix
- [ ] Verify bicep exercises available for shoulders_arms day
- [ ] Add exercise deduplication
- [ ] Monitor GPT-4.1 Mini for failures
- [ ] Track rest period compliance
- [ ] Check blending violations for multi-style scenarios
- [ ] Validate fallback detection (title + tips)
- [ ] **NEW:** Add leg enforcement rule to prompts
- [ ] **NEW:** Add core tier exercises for hamstrings/triceps
- [ ] **NEW:** Run dedicated leg day scenarios in benchmark
- [ ] **NEW:** Remove explicit "bench" from STRENGTH prompt (use "compound press" instead)

---

## WAVE 5: Implementing Fixes (2026-01-21)

### Fixes In Progress

| Fix | Agent | File | Status |
|-----|-------|------|--------|
| Remove "bench" from STRENGTH prompt | Agent 1 | `exercise-selector.ts:94-99` | Running |
| Fix muscle coverage bypass | Agent 2 | `chain-orchestrator.ts:522-525` | Running |
| Balance PRIMARY_MUSCLE defaults | Agent 3 | `chain-orchestrator.ts:211-227` | Running |
| Find core tier exercise data | Agent 4 | Supabase migrations/seeds | Running |

### Summary of 8-Layer Bias Analysis

The bench press obsession and missing legs issue stems from 8 compounding layers:

| Layer | Description | Impact |
|-------|-------------|--------|
| 1 | "bench" explicitly named in STRENGTH prompt | LLM primacy bias |
| 2 | PRIMARY_MUSCLE defaults to pectorals for 4/12 day types | Filtering bias |
| 3 | Database has 73 bench variants, 1 hamstring in core tier | Pool bias |
| 4 | Muscle coverage enforcement skipped for Full Body | No diversity check |
| 5 | Fallback logic drops targetMuscles filter | Allows any exercise |
| 6 | PREFER_MACHINES defined but never implemented | Dead code |
| 7 | Equipment AND logic overly restrictive | Eliminates leg options |
| 8 | Benchmark scenarios don't cover leg days | Masked problem |

### Quantitative Evidence

- 11 leg exercises / 624 total = **1.76%**
- 70 bench press occurrences across 53 workouts
- Chest-to-leg ratio: **13.6:1**
- 4/6 models returned ZERO leg exercises for Full Body HIT

### Expected Post-Fix Results

After implementing fixes 1-4:
- Leg percentage should increase from 1.76% to 15-20%
- Bench press occurrences should decrease from 70 to ~25
- Chest-to-leg ratio should balance to ~2:1
