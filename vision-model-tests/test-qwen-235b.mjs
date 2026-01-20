#!/usr/bin/env node

import { readFileSync } from 'fs';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const MODEL = 'qwen/qwen3-vl-235b-a22b-thinking';

// Read base64 encoded frames
const frame30 = readFileSync('/tmp/exercise-test/frame_30.b64', 'utf8');
const frame50 = readFileSync('/tmp/exercise-test/frame_50.b64', 'utf8');
const frame90 = readFileSync('/tmp/exercise-test/frame_90.b64', 'utf8');

const prompt = `You are an expert exercise physiologist analyzing workout movements.

I'm showing you 3 frames from an exercise demonstration video:
- Frame 1: 30% through the movement
- Frame 2: 50% through the movement
- Frame 3: 90% through the movement

Please analyze these frames and provide:

1. **Exercise Name**: What is this exercise called?
2. **Primary Target Muscle**: Which muscle group is primarily targeted?
3. **Movement Description**: Describe what you see happening in the movement.
4. **Key Characteristics**: What are the defining features of this exercise?

Respond in JSON format:
{
  "exercise_name": "...",
  "primary_target": "...",
  "description": "...",
  "confidence": "high/medium/low",
  "reasoning": "..."
}`;

const payload = {
  model: MODEL,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${frame30}` }
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${frame50}` }
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${frame90}` }
        }
      ]
    }
  ],
  temperature: 0.1,
  max_tokens: 1000
};

console.log('Testing Qwen3-VL-235B-A22B-Thinking on Butt Kick with Row...\n');
console.log('Ground Truth:');
console.log('  Exercise: Butt Kick with Row');
console.log('  Target: hamstrings');
console.log('  Description: Plyometric exercise combining high knees with rowing motion\n');
console.log('Sending request to OpenRouter...\n');

const startTime = Date.now();

try {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/fitness-app',
      'X-Title': 'Fitness App Exercise Vision Test'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  const latency = Date.now() - startTime;

  console.log(`Response received in ${latency}ms\n`);

  if (data.error) {
    console.error('❌ API Error:', data.error);
    process.exit(1);
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    console.error('❌ No content in response');
    console.log('Full response:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('Raw Response:');
  console.log(content);
  console.log('\n' + '='.repeat(80));

  // Try to parse JSON from response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('\nParsed Analysis:');
      console.log(`  Exercise Name: ${parsed.exercise_name}`);
      console.log(`  Primary Target: ${parsed.primary_target}`);
      console.log(`  Confidence: ${parsed.confidence}`);
      console.log(`  Description: ${parsed.description}`);
      if (parsed.reasoning) {
        console.log(`  Reasoning: ${parsed.reasoning}`);
      }

      // Evaluate accuracy
      console.log('\n' + '='.repeat(80));
      console.log('Evaluation:');

      const nameMatch = parsed.exercise_name.toLowerCase().includes('butt') &&
                       parsed.exercise_name.toLowerCase().includes('kick');
      const targetMatch = parsed.primary_target.toLowerCase().includes('hamstring');

      console.log(`  ✓ Name Recognition: ${nameMatch ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`  ✓ Target Muscle: ${targetMatch ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`  ✓ Confidence: ${parsed.confidence}`);

      const overall = nameMatch && targetMatch ? '✅ SUCCESS' : '❌ FAILED';
      console.log(`\nOverall: ${overall}`);

      if (!nameMatch || !targetMatch) {
        console.log('\n⚠️  Model hallucinated - Previous 32B model failed with 0/10 (saw it as lunge)');
        console.log('   Does 235B with reasoning do better? ' + (nameMatch || targetMatch ? 'SOMEWHAT' : 'NO'));
      }

    } else {
      console.log('\n⚠️  Could not parse JSON from response');
    }
  } catch (parseError) {
    console.log('\n⚠️  Error parsing JSON:', parseError.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('Token Usage:', data.usage);

} catch (error) {
  console.error('❌ Request failed:', error.message);
  process.exit(1);
}
