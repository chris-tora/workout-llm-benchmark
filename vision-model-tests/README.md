# Vision Model Exercise Identification Test

## Test: Qwen3-VL-235B-A22B-Thinking on "Butt Kick with Row"

This directory contains test results for evaluating the Qwen3-VL-235B-A22B-Thinking model's ability to identify exercises from video frames.

### Files

- `butt-kick-row.mp4` - Original exercise video (3.9s)
- `frame_30.jpg`, `frame_50.jpg`, `frame_90.jpg` - Extracted frames at 30%, 50%, 90%
- `frame_*.b64` - Base64-encoded frames for API requests
- `test-qwen-235b.mjs` - Test script
- `test-results-summary.md` - Detailed analysis and results

### Quick Summary

**Exercise:** Butt Kick with Row (plyometric)
**Ground Truth Target:** Hamstrings
**Model Prediction:** Forward Lunge (Quadriceps)
**Accuracy:** 0/10 - Complete hallucination

### Key Findings

1. Both Qwen3-VL-32B and Qwen3-VL-235B-A22B-Thinking failed to identify this exercise
2. Both models confidently misidentified it as a "Forward Lunge"
3. The reasoning pathways in the 235B model did not improve accuracy
4. Vision models should NOT be used for exercise identification in production

### Viewing the Frames

The three extracted frames show:
1. **Frame 1 (30%):** Standing position, arms forward
2. **Frame 2 (50%):** Knee up with rowing motion (the key movement)
3. **Frame 3 (90%):** Return to standing, arms back

### Running the Test

```bash
cd /home/arian/expo-work/showcase/vision-model-tests
OPENROUTER_API_KEY=your-key node test-qwen-235b.mjs
```

### Cost
- Model: qwen/qwen3-vl-235b-a22b-thinking
- Tokens: 3,541 total (2,828 prompt + 713 completion, 509 reasoning)
- Latency: 18.8 seconds
- Cost: $0.00559
