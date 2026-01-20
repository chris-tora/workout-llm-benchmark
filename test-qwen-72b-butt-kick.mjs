/**
 * Test Qwen2.5-VL-72B-Instruct on Butt Kick with Row
 *
 * Tests if the model can correctly identify:
 * - Target muscle: hamstrings
 * - Description: plyometric + rowing motion
 * - Instructions: dynamic movement with coordination
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const groundTruth = {
  name: "Butt Kick with Row",
  target: "hamstrings",
  description: "Butt Kick with Row is a plyometric exercise that combines high knees with a rowing motion to enhance explosive power and coordination. It primarily targets the hamstrings while also engaging the core and upper body.",
  instructions: [
    "Start in a standing position with feet hip-width apart",
    "Perform a butt kick while simultaneously pulling arms back in a rowing motion",
    "Alternate legs while maintaining the rowing motion throughout"
  ]
};

const prompt = `You are analyzing the exercise "Butt Kick with Row".

Based on the name and common exercise patterns, provide:

1. **Target Muscle**: The primary muscle group targeted (one word: e.g., "quads", "hamstrings", "glutes", "calves")

2. **Description**: A concise description (2-3 sentences) explaining what this exercise is, what muscle groups it works, and its primary benefit.

3. **Instructions**: Step-by-step instructions (3-4 steps) on how to perform this exercise correctly.

Respond ONLY with valid JSON in this exact format:
{
  "target": "muscle_name",
  "description": "description text",
  "instructions": ["step 1", "step 2", "step 3"]
}`;

console.log("Testing Qwen2.5-VL-72B-Instruct on Butt Kick with Row\n");
console.log("Ground Truth:");
console.log("  Target:", groundTruth.target);
console.log("  Description:", groundTruth.description);
console.log("\nTesting model...\n");

try {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen/qwen-2.5-vl-72b-instruct",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  console.log("Model Response:");
  console.log("  Target:", result.target);
  console.log("  Description:", result.description);
  console.log("  Instructions:", result.instructions);

  console.log("\n" + "=".repeat(80));
  console.log("COMPARISON:");
  console.log("=".repeat(80));

  // Compare target
  const targetMatch = result.target.toLowerCase() === groundTruth.target.toLowerCase();
  console.log(`\nTarget Muscle: ${targetMatch ? "✅ MATCH" : "❌ MISMATCH"}`);
  console.log(`  Ground Truth: ${groundTruth.target}`);
  console.log(`  Model Output: ${result.target}`);

  // Check description quality
  const descLower = result.description.toLowerCase();
  const hasPlyo = descLower.includes("plyometric") || descLower.includes("explosive") || descLower.includes("power");
  const hasRow = descLower.includes("row") || descLower.includes("pulling");
  const hasHamstrings = descLower.includes("hamstring");

  console.log(`\nDescription Quality:`);
  console.log(`  Mentions plyometric/explosive: ${hasPlyo ? "✅" : "❌"}`);
  console.log(`  Mentions rowing motion: ${hasRow ? "✅" : "❌"}`);
  console.log(`  Mentions hamstrings: ${hasHamstrings ? "✅" : "❌"}`);

  // Check instructions
  console.log(`\nInstructions: ${result.instructions.length} steps`);
  result.instructions.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step}`);
  });

  // Overall verdict
  console.log("\n" + "=".repeat(80));
  if (targetMatch && hasPlyo && hasRow) {
    console.log("✅ PASS: Model correctly identified the exercise");
  } else {
    console.log("❌ FAIL: Model hallucinated or missed key details");
    if (!targetMatch) console.log("  - Incorrect target muscle");
    if (!hasPlyo) console.log("  - Missed plyometric nature");
    if (!hasRow) console.log("  - Missed rowing motion");
  }
  console.log("=".repeat(80));

} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
