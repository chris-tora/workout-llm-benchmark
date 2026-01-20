import Ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENROUTER_API_KEY = "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";
const VIDEO_PATH = "/mnt/e/Workouts/optimized-videos-all/6267_Pass-Through-with-Towel-(male)_Shoulders_.mp4";
const MODEL = "qwen/qwen2.5-vl-72b-instruct";
const TEMPERATURE = 0.3;

console.log("\n=== QWEN FRAME VERIFICATION TEST ===\n");
console.log("Video: " + VIDEO_PATH);
console.log("Model: " + MODEL);
console.log("Temperature: " + TEMPERATURE + "\n");

// Extract 3 frames from the video
async function extractFrames(videoPath) {
  console.log("[1/5] Extracting 3 frames from video...\n");
  
  const frames = [];
  const tmpDir = '/tmp/qwen-frames';
  
  // Create temp directory
  await fs.mkdir(tmpDir, { recursive: true });
  
  // Get video duration first
  const duration = await new Promise((resolve, reject) => {
    Ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration);
    });
  });
  
  console.log("Video duration: " + duration.toFixed(2) + "s");
  
  // Extract 3 frames at 25%, 50%, 75%
  const timestamps = [
    duration * 0.25,
    duration * 0.50,
    duration * 0.75
  ];
  
  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];
    const outputPath = path.join(tmpDir, "frame_" + i + ".jpg");
    
    await new Promise((resolve, reject) => {
      Ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    
    // Read frame and convert to base64
    const frameBuffer = await fs.readFile(outputPath);
    const base64 = frameBuffer.toString('base64');
    
    console.log("Frame " + (i + 1) + " (at " + timestamp.toFixed(2) + "s):");
    console.log("  - File size: " + frameBuffer.length + " bytes");
    console.log("  - Base64 length: " + base64.length + " characters");
    console.log("  - First 100 chars: " + base64.substring(0, 100));
    console.log("  - Last 100 chars: " + base64.substring(base64.length - 100) + "\n");
    
    frames.push({
      timestamp,
      base64,
      size: frameBuffer.length,
      base64Length: base64.length
    });
  }
  
  return frames;
}

// Build Qwen API request
function buildRequest(frames) {
  console.log("[2/5] Building Qwen API request...\n");
  
  const content = [
    {
      type: "text",
      text: "You are analyzing frames from an exercise video for \"Pass Through with Towel\".\n\nPlease analyze these frames and provide:\n1. Equipment visible (towel, other items)\n2. Movement description\n3. Body parts engaged\n4. Form cues\n\nRespond in JSON format:\n{\n  \"equipment\": [\"item1\", \"item2\"],\n  \"movement\": \"description\",\n  \"bodyParts\": [\"part1\", \"part2\"],\n  \"formCues\": [\"cue1\", \"cue2\"]\n}"
    }
  ];
  
  // Add each frame
  frames.forEach((frame, i) => {
    content.push({
      type: "image_url",
      image_url: {
        url: "data:image/jpeg;base64," + frame.base64
      }
    });
  });
  
  const request = {
    model: MODEL,
    temperature: TEMPERATURE,
    messages: [
      {
        role: "user",
        content
      }
    ]
  };
  
  return request;
}

// Log request with truncated base64
function logRequest(request) {
  console.log("[3/5] Request payload (base64 truncated):\n");
  
  const truncated = JSON.parse(JSON.stringify(request));
  
  truncated.messages[0].content.forEach(item => {
    if (item.type === "image_url") {
      const original = item.image_url.url;
      const prefix = original.substring(0, 50);
      const suffix = original.substring(original.length - 50);
      item.image_url.url = prefix + "...[TRUNCATED " + original.length + " chars]..." + suffix;
    }
  });
  
  console.log(JSON.stringify(truncated, null, 2));
  console.log("\n");
}

// Make API call
async function callQwen(request) {
  console.log("[4/5] Calling Qwen API...\n");
  
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + OPENROUTER_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("API error: " + response.status + " " + response.statusText + "\n" + errorText);
  }
  
  const data = await response.json();
  
  console.log("Response received:");
  console.log("  - Status: " + response.status + " " + response.statusText);
  console.log("  - Model: " + (data.model || 'N/A'));
  console.log("  - ID: " + (data.id || 'N/A'));
  
  if (data.choices && data.choices[0]) {
    console.log("  - Finish reason: " + data.choices[0].finish_reason);
    console.log("  - Content length: " + data.choices[0].message.content.length + " chars\n");
    console.log("Response content:\n");
    console.log(data.choices[0].message.content);
  }
  
  if (data.usage) {
    console.log("\nToken usage:");
    console.log("  - Prompt: " + data.usage.prompt_tokens);
    console.log("  - Completion: " + data.usage.completion_tokens);
    console.log("  - Total: " + data.usage.total_tokens + "\n");
  }
  
  return data;
}

// Save outputs
async function saveOutputs(request, response) {
  console.log("[5/5] Saving outputs...\n");
  
  await fs.writeFile('/tmp/qwen-request.json', JSON.stringify(request, null, 2));
  console.log("Saved full request to: /tmp/qwen-request.json");
  
  await fs.writeFile('/tmp/qwen-response.json', JSON.stringify(response, null, 2));
  console.log("Saved response to: /tmp/qwen-response.json\n");
}

// Main
async function main() {
  try {
    const frames = await extractFrames(VIDEO_PATH);
    const request = buildRequest(frames);
    logRequest(request);
    const response = await callQwen(request);
    await saveOutputs(request, response);
    
    console.log("=== TEST COMPLETE ===\n");
    
  } catch (error) {
    console.error("\n!!! ERROR !!!");
    console.error(error);
    process.exit(1);
  }
}

main();
