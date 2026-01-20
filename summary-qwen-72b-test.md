# Qwen2.5-VL-72B-Instruct Test: Butt Kick with Row

## Test Summary

**Model Tested**: `qwen/qwen-2.5-vl-72b-instruct`  
**Exercise**: Butt Kick with Row  
**Exercise ID**: `5fd45c67-7435-4a64-bd02-78e8fce9d962`

## Ground Truth
- **Target Muscle**: hamstrings
- **Exercise Type**: Plyometric (bodyweight)
- **Description**: "Butt Kick with Row is a plyometric exercise that combines high knees with a rowing motion to enhance explosive power and coordination. It primarily targets the hamstrings while also engaging the core and upper body."
- **Instructions**: 
  1. Start in a standing position with feet hip-width apart
  2. Perform a butt kick while simultaneously pulling arms back in a rowing motion
  3. Alternate legs while maintaining the rowing motion throughout

## Test Results (Text-Only Input)

### Model Output
- **Target Muscle**: glutes ❌
- **Description**: "The Butt Kick with Row is a compound exercise that targets the glutes and upper back muscles. It combines a glute kickback with a rowing motion, enhancing both lower body strength and upper body endurance."
- **Instructions**:
  1. Start in a standing position holding a dumbbell in each hand
  2. Kick one foot back towards your glutes while simultaneously pulling the dumbbells up towards your chest in a rowing motion
  3. Return to the starting position and repeat with the opposite leg and arm

### Analysis

#### ❌ Major Failures
1. **Wrong Target Muscle**: Identified as "glutes" instead of "hamstrings"
2. **Missed Exercise Category**: No mention of plyometric/explosive/cardio nature
3. **Hallucinated Equipment**: Added dumbbells (this is a bodyweight exercise)
4. **Incorrect Movement Pattern**: Described as static "glute kickback" instead of dynamic "butt kick"

#### ✅ Correct Elements
1. Recognized the rowing arm motion
2. Identified it as a compound movement

### Verdict
**❌ FAIL** - The 72B model hallucinated significantly even with just text input:
- Confused butt kick (dynamic, plyometric) with glute kickback (static, strength)
- Invented equipment requirements
- Misidentified primary muscle target
- Completely missed the cardio/plyometric classification

## Test Limitations

**Important**: This test used **text-only input** (exercise name only), not visual frames.

### Why Visual Testing Failed
1. Exercise video stored in Supabase requires authentication
2. Video URL: `https://ivfllbccljoyaayftecd.supabase.co/storage/v1/object/public/exercise-videos/male-home-5477-butt-kick-with-row.mp4`
3. ExerciseDB API doesn't provide accessible GIF URLs for this exercise
4. Exercise ID is a UUID (not ExerciseDB format), suggesting it's custom data

### Proper Test Would Require
1. Access to the actual video file
2. FFmpeg to extract frames at 30%, 50%, 90% of duration
3. Base64-encode frames for OpenRouter vision API
4. Send frames with exercise analysis prompt
5. Compare visual + text performance vs text-only

## Comparison to Previous Models

Previous testing showed that smaller Qwen models also hallucinated this exercise:
- Models confused it with lunges or other leg exercises
- This 72B model confused it with glute kickbacks
- **Pattern**: Without visual input, models struggle with nuanced plyometric exercises

## Recommendations

1. **For Production**: Don't rely on text-only exercise analysis
2. **For Testing**: Need actual video frames to properly evaluate vision models
3. **For This Exercise**: The 72B model performs poorly even on basic text reasoning
4. **Alternative Models**: Consider testing GPT-4V or Claude 3.5 Sonnet for vision tasks

## Next Steps

To complete a proper vision test:
1. Extract 3 frames from the exercise video
2. Create a vision test script with base64-encoded frames
3. Test the same exercise with visual input
4. Compare text-only vs vision-enabled performance
