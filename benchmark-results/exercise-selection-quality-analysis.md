# Exercise Selection Quality Analysis

**Date:** 2026-01-24
**Benchmark:** Dry-run with updated tier values (489 exercises reclassified)
**Models Tested:** Claude 4.5 Haiku, Gemini 3 Flash
**Scenarios:** 5 body parts × 3 durations = 15 per model

---

## Executive Summary

The benchmark achieved **100% technical success rate** but exercise selection quality reveals significant issues:

| Issue | Severity | Affected |
|-------|----------|----------|
| Missing muscle groups in 30min workouts | Critical | Legs, Shoulders, Arms |
| Available equipment not utilized | High | All body parts |
| `usedFallback: body_part_dropped` triggered | Critical | Legs, Arms |
| Bicep/Tricep imbalance on Arms day | Critical | Arms |
| Equipment constraint violations (Gemini) | Medium | Legs |

---

## Body Part Analysis

### Legs (30/60/90 min)

**Rating:** 30min = Needs Improvement | 60min = Acceptable | 90min = Acceptable

| Issue | Details |
|-------|---------|
| **No hamstrings in 30min** | Leg Curl Machine available but unused |
| **Leg Extension NEVER used** | Available in all scenarios, never selected |
| **Equipment mismatch** | Cable/Resistance Band exercises selected when NOT in available equipment (validation bug) |
| **Quad-dominant** | 30min has 2 quad exercises, 0 hamstring |

**Muscle Coverage by Duration:**
| Duration | Quads | Hamstrings | Glutes | Calves |
|----------|-------|------------|--------|--------|
| 30min | 2 exercises | **NONE** | Secondary | 1 exercise |
| 60min | 2 exercises | 2 exercises | 1 exercise | 1 exercise |
| 90min | 3 exercises | 3 exercises | 1 exercise | 1 exercise |

---

### Shoulders (30/60/90 min)

**Rating:** 30min = Needs Improvement | 60min = Acceptable | 90min = Acceptable

| Issue | Details |
|-------|---------|
| **No rear delts in 30min** | Only anterior + lateral covered |
| **Leverage Machine NEVER used** | Available in all scenarios |
| **Clean & Press selected** | Not typical "classic bodybuilding" style |
| **Redundant pressing in 90min** | Barbell + Dumbbell overhead press |

**Deltoid Coverage by Duration:**
| Duration | Anterior | Lateral | Posterior |
|----------|----------|---------|-----------|
| 30min | Yes | Yes | **NO** |
| 60min | Yes | Yes | Yes |
| 90min | Yes (excess) | Yes | Yes |

---

### Arms (30/60/90 min)

**Rating:** 30min = Needs Improvement | 60min = Needs Improvement | 90min = Acceptable

| Issue | Details |
|-------|---------|
| **Severe bicep/tricep imbalance** | 60min has 4 tricep : 1 bicep (4:1 ratio!) |
| **EZ Bar NEVER used** | Available in all scenarios |
| **3 redundant cable pushdowns** | 90min has V-bar, One Arm, SZ bar |
| **Fallback triggered** | `body_part_dropped` in all scenarios |

**Bicep:Tricep Ratio by Duration:**
| Duration | Bicep | Tricep | Ratio |
|----------|-------|--------|-------|
| 30min | 1 | 2 | 33% bicep |
| 60min | 1 | 4 | **20% bicep** |
| 90min | 3 | 5 | 37% bicep |

---

### Chest (30/60/90 min)

*Analysis pending...*

---

### Back (30/60/90 min)

*Analysis pending...*

---

## Claude vs Gemini Comparison

### Key Findings

| Aspect | Claude 4.5 Haiku | Gemini 3 Flash |
|--------|------------------|----------------|
| **Chest Selection** | Identical to Gemini | Identical to Claude |
| **Equipment Compliance** | Strict (stays within list) | Violated (used unavailable lever machine) |
| **Latency** | ~11-13s | ~10-12s (faster) |
| **Fallback Triggered** | Yes (legs) | Yes (legs) |

### Chest 30min - IDENTICAL Selections
Both models selected:
1. Barbell Bench Press (4x8)
2. Dumbbell Incline Bench Press (4x10)
3. Cable Bent Over Single Arm Crossover (4x12)

**Implication:** Exercise pool filtering strongly converges on "obvious" choices - LLM has limited influence.

### Legs 30min - Minor Differences
| Exercise | Claude | Gemini |
|----------|--------|--------|
| Squat | Barbell Full Squat | Barbell Squat |
| Leg Press | One Leg (unilateral) | Standard bilateral |
| Calf Raise | Dumbbell (compliant) | Lever Machine (NOT available) |

**Winner:** Claude (better equipment compliance)

---

## Critical Bug: `usedFallback: body_part_dropped`

Multiple scenarios triggered fallback logic with reason `body_part_dropped`:
- **Legs** - Both Claude and Gemini
- **Arms** - All durations

This indicates the LLM selection was **overridden by fallback logic**, likely because:
1. Exercise pool filtering removed too many options
2. Target muscle mapping is incomplete
3. LLM failed to cover all required muscle groups

**Action Required:** Investigate `fetchExercises()` and fallback logic in edge function.

---

## Equipment Utilization Issues

| Equipment | Never Used In |
|-----------|---------------|
| Leg Extension Machine | All Legs scenarios |
| Leg Curl Machine | 30min Legs |
| EZ Bar | All Arms scenarios |
| Leverage Machine | All Shoulders scenarios |
| Pec Deck | Chest (needs verification) |
| Chest Press | Chest (needs verification) |

---

## Recommendations

### Immediate Fixes

1. **Fix equipment validation** - Exercises using Cable/Resistance Band selected when not in available equipment list but reported as 100% match

2. **Enforce muscle balance for Arms** - ~50/50 bicep/tricep split for dedicated arms day

3. **Require hamstring exercise** when Leg Curl Machine is available

4. **Require rear delt exercise** for all shoulder workouts

### Prompt Engineering

1. **Add explicit muscle coverage requirements** to Exercise Selector prompt
2. **List available equipment with "MUST USE AT LEAST ONE"** instruction
3. **Penalize redundant exercise patterns** (e.g., 3 pushdown variations)

### Edge Function Logic

1. **Investigate `body_part_dropped` fallback** - why is it triggering?
2. **Add equipment utilization scoring** - prefer exercises that use available machines
3. **Post-selection validation** - reject workouts missing key muscle groups

---

## Files Referenced

- Benchmark results: `model-anthropic-claude-haiku-4-5-2026-01-24T12-21-46-159Z.json`
- Benchmark results: `model-google-gemini-3-flash-preview-2026-01-24T12-21-46-174Z.json`
- Edge function: `/home/arian/expo-work/fitness-app/supabase/functions/generate-workout/index.ts`
- Tier update SQL: `/home/arian/expo-work/showcase/tier-update.sql`
