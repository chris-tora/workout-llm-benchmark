# Qwen3-VL-235B-A22B-Thinking Test Results
## Butt Kick with Row Exercise Analysis

**Test Date:** 2026-01-18
**Model:** qwen/qwen3-vl-235b-a22b-thinking
**Exercise ID:** 5fd45c67-7435-4a64-bd02-78e8fce9d962

---

## Ground Truth

| Attribute | Value |
|-----------|-------|
| **Exercise Name** | Butt Kick with Row (female) |
| **Primary Target** | Hamstrings |
| **Body Part** | Plyometrics |
| **Equipment** | Body weight |
| **Description** | Plyometric exercise that combines high knees with a rowing motion to enhance explosive power and coordination. Primarily targets the hamstrings while also engaging the core and upper body. |

**Instructions:**
1. Start in a standing position with feet shoulder-width apart and arms extended forward.
2. Drive one knee up towards the chest while simultaneously pulling the opposite arm back in a rowing motion.
3. Alternate legs and arms in a dynamic, explosive movement, ensuring the heel of the kicking foot reaches the glutes.

---

## Test Setup

**Video Source:** `https://ivfllbccljoyaayftecd.supabase.co/storage/v1/object/public/exercise-videos/5477-male-home-butt-kick-with-row.mp4`
**Duration:** 3.9 seconds
**Frames Extracted:** 30% (1.17s), 50% (1.95s), 90% (3.51s)

**Frame Analysis:**
- **Frame 1 (30%):** Standing position, arms extended forward, quadriceps and abs highlighted
- **Frame 2 (50%):** One leg lifted (knee toward chest), arms in rowing position, obliques and hamstrings highlighted
- **Frame 3 (90%):** Transitioning back to standing, arms pulled back, full body activation

---

## Model Response

**Latency:** 18,823 ms (~18.8 seconds)
**Token Usage:**
- Prompt: 2,828 tokens
- Completion: 713 tokens (509 reasoning tokens)
- Total: 3,541 tokens
- Cost: $0.00559

### Model's Analysis

```json
{
  "exercise_name": "Forward Lunge",
  "primary_target": "Quadriceps",
  "description": "The movement begins with a standing position (Frame 1, 30% completion), progresses to a mid-phase where one leg is lifted and driven forward while the body shifts weight (Frame 2, 50% completion), and approaches the end range with the front leg nearly in a lunge position, knee bent and body lowered (Frame 3, 90% completion).",
  "confidence": "high",
  "reasoning": "The sequential frames show a single-leg forward stepping motion with knee flexion and hip extension, characteristic of a forward lunge. Muscle activation (highlighted in red) focuses on the quadriceps, glutes, and hamstrings, with the quadriceps being the primary driver during the eccentric and concentric phases of the lunge. The movement pattern and biomechanics align with standard forward lunge execution."
}
```

---

## Evaluation Results

| Criterion | Result | Notes |
|-----------|--------|-------|
| **Name Recognition** | ❌ FAIL | Identified as "Forward Lunge" instead of "Butt Kick with Row" |
| **Target Muscle** | ❌ FAIL | Identified "Quadriceps" instead of "Hamstrings" |
| **Confidence Level** | High | Model was highly confident in incorrect answer |
| **Overall Score** | 0/10 | Complete hallucination |

---

## Analysis

### Why the Model Failed

1. **Misinterpreted Movement Pattern:**
   - The model saw the leg lifting in Frame 2 and incorrectly assumed it was stepping forward into a lunge
   - Failed to recognize the dynamic, alternating nature of the plyometric movement
   - Did not detect the rowing arm motion as a key differentiator

2. **Incorrect Muscle Activation:**
   - Model focused on quadriceps activation visible in the frames
   - Missed that the butt kick motion (heel to glutes) primarily engages hamstrings
   - Confused the visible muscle highlighting with the primary target

3. **High Confidence in Wrong Answer:**
   - The model provided detailed biomechanical reasoning for its incorrect identification
   - This suggests the reasoning pathways reinforced the wrong interpretation rather than correcting it

### Comparison to Qwen3-VL-32B

**Previous 32B Model Performance:** 0/10 (also hallucinated as lunge)

**Does 235B with Reasoning Do Better?** NO

Both models:
- Misidentified the exercise as a lunge variant
- Showed high confidence in the wrong answer
- Failed to recognize the plyometric/cardio nature of the movement
- Missed the distinctive "butt kick" + "rowing" combination

The larger model with explicit reasoning pathways did not improve accuracy. In fact, the reasoning tokens (509 tokens) seemed to elaborate on the wrong interpretation rather than self-correct.

---

## Implications for Fitness App

### Equipment Analysis Feature
This exercise demonstrates a critical limitation of vision models for exercise identification:

1. **Plyometric exercises are high-risk for misidentification** - Dynamic movements with leg raises are often confused with lunges
2. **Compound movements with multiple elements** (butt kick + row) are not well recognized
3. **Model confidence does not correlate with accuracy** - Both models were highly confident while being completely wrong

### Recommendations

1. **Use vision AI only for equipment detection, not exercise identification**
2. **Do not rely on vision models to identify specific exercises from single frames or short clips**
3. **For exercise selection, use structured inputs (user selections, text prompts) rather than computer vision**
4. **If using vision, add validation layers:**
   - Cross-reference with exercise database
   - Require user confirmation for unusual exercise names
   - Flag low-confidence or ambiguous results

---

## Conclusion

The Qwen3-VL-235B-A22B-Thinking model **failed completely** at identifying the Butt Kick with Row exercise, achieving a 0/10 score identical to the smaller 32B model. The addition of reasoning pathways did not improve accuracy and may have reinforced the incorrect interpretation with more elaborate (but still wrong) biomechanical explanations.

**Verdict:** Vision models should not be trusted for exercise identification in the fitness app context.
