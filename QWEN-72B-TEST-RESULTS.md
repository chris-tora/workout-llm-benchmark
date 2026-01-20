# Qwen2.5-VL-72B-Instruct Test Results

## Executive Summary

**Model**: `qwen/qwen-2.5-vl-72b-instruct` (OpenRouter)  
**Test Exercise**: Butt Kick with Row  
**Test Type**: Text-only (visual test not possible due to video access issues)  
**Result**: ❌ **FAIL** - Significant hallucinations and incorrect identification

---

## Test Configuration

### Ground Truth Data
```json
{
  "name": "Butt Kick with Row",
  "id": "5fd45c67-7435-4a64-bd02-78e8fce9d962",
  "target": "hamstrings",
  "category": "plyometric",
  "equipment": "body weight",
  "description": "Butt Kick with Row is a plyometric exercise that combines high knees with a rowing motion to enhance explosive power and coordination. It primarily targets the hamstrings while also engaging the core and upper body."
}
```

### Model Configuration
```javascript
{
  "model": "qwen/qwen-2.5-vl-72b-instruct",
  "temperature": 0.1,
  "response_format": { "type": "json_object" }
}
```

---

## Results Comparison

| Field | Ground Truth | Model Output | Match |
|-------|--------------|--------------|-------|
| **Target Muscle** | hamstrings | glutes | ❌ |
| **Exercise Type** | plyometric/cardio | strength (implied) | ❌ |
| **Equipment** | body weight | dumbbells | ❌ |
| **Movement Pattern** | dynamic butt kick | static glute kickback | ❌ |
| **Rowing Component** | yes | yes | ✅ |
| **Compound Movement** | yes | yes | ✅ |

### Model Output (Full)
```json
{
  "target": "glutes",
  "description": "The Butt Kick with Row is a compound exercise that targets the glutes and upper back muscles. It combines a glute kickback with a rowing motion, enhancing both lower body strength and upper body endurance.",
  "instructions": [
    "Start in a standing position holding a dumbbell in each hand.",
    "Kick one foot back towards your glutes while simultaneously pulling the dumbbells up towards your chest in a rowing motion.",
    "Return to the starting position and repeat with the opposite leg and arm."
  ]
}
```

---

## Analysis

### ❌ Critical Failures

1. **Wrong Primary Muscle Target**
   - Identified: glutes
   - Correct: hamstrings
   - Impact: Would lead to incorrect workout programming

2. **Missed Exercise Classification**
   - Model treated it as a strength exercise
   - Completely missed the plyometric/cardio nature
   - No mention of "explosive", "power", or "dynamic" movements

3. **Hallucinated Equipment**
   - Added dumbbells that don't exist in the exercise
   - Changed the fundamental nature of the movement
   - Would confuse users trying to perform the exercise

4. **Incorrect Movement Pattern**
   - Described as "glute kickback" (static, strength-focused)
   - Should be "butt kick" (dynamic, cardio-focused)
   - Fundamentally different exercises

### ✅ Partial Successes

1. Correctly identified the rowing arm motion component
2. Recognized it as a compound movement (works multiple muscle groups)

---

## Why This Matters

### For Previous Model Comparisons
- **Qwen2-VL-7B** and other smaller models also hallucinated this exercise
- Previous models confused it with lunges
- This **72B model** confused it with glute kickbacks
- **Pattern**: Even large models struggle without visual input

### For Production Use
This test demonstrates that:
1. Text-only exercise analysis is unreliable
2. Even a 72B parameter model hallucinates significantly
3. Vision input is critical for accurate exercise identification
4. Models confuse similar-sounding exercises (butt kick vs glute kickback)

---

## Test Limitations

### Why No Visual Testing?
1. **Video Access Issue**: Exercise video stored in Supabase requires authentication
   - URL: `https://ivfllbccljoyaayftecd.supabase.co/storage/v1/object/public/exercise-videos/male-home-5477-butt-kick-with-row.mp4`
   - Returns 69 bytes (likely error response)

2. **ExerciseDB API Limitation**: GIF endpoints don't return images
   - Exercise ID is UUID (not ExerciseDB format)
   - Suggests custom exercise data, not from ExerciseDB

3. **Alternative Sources**: No publicly accessible demonstration found

### What a Full Test Would Require
1. Extract 3 frames from video at 30%, 50%, 90% of duration
2. Base64-encode frames for OpenRouter API
3. Send frames with structured prompt
4. Compare visual + text performance vs text-only

---

## Recommendations

### For Model Selection
1. ❌ **Don't use** for text-only exercise analysis
2. ⚠️ **Requires testing** with actual visual frames before production use
3. ✅ **Consider alternatives**: GPT-4V, Claude 3.5 Sonnet for vision tasks

### For Exercise Database
1. Ensure vision models have access to video frames, not just exercise names
2. Include exercise category (plyometric, strength, cardio) as explicit metadata
3. Validate model outputs against ground truth before storing

### For Future Testing
1. Create a test harness with actual video frame extraction
2. Test multiple models on the same visual input
3. Compare text-only vs vision-enabled performance systematically

---

## Conclusion

**Verdict**: ❌ **FAIL**

The Qwen2.5-VL-72B-Instruct model performed poorly on text-only exercise analysis, hallucinating:
- Wrong muscle target (glutes instead of hamstrings)
- Wrong exercise type (strength instead of plyometric)
- Non-existent equipment (dumbbells instead of bodyweight)
- Wrong movement pattern (static kickback instead of dynamic kick)

**Key Takeaway**: Without visual input, even a 72B parameter vision-language model cannot reliably identify exercises from names alone. This exercise name is particularly challenging because it combines two movements, and the model confused "butt kick" with "glute kickback".

**Next Steps**: To properly evaluate this model, we need:
1. Access to actual exercise video frames
2. A vision-enabled testing pipeline
3. Side-by-side comparison with other vision models (GPT-4V, Claude 3.5 Sonnet)
