# Benchmark Run + Vercel Deploy Plan
## 6 Blended + 4 Non-Blended Scenarios

---

## Overview

This plan covers:
1. **Run** benchmark with 10 selected scenarios (6 blended + 4 non-blended)
2. **Combine** results into `benchmark-data.json`
3. **Deploy** to Vercel
4. **Verify** deployment using agent-browser CDP automation

---

## Phase 1: Pre-Flight Checks

### 1.1 Verify Chrome CDP is Running (Port 9333)

```bash
# Check if Chrome is listening on port 9333
nc -zv localhost 9333 2>/dev/null || echo "Chrome CDP not running"

# If not running, start it:
powershell.exe -Command "Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' \
  -ArgumentList '--remote-debugging-port=9333','--user-data-dir=C:\Users\Arian\chrome-profiles\expo-work'"
```

### 1.2 Verify Environment

```bash
cd /home/arian/expo-work/showcase

# Check API key
export OPENROUTER_API_KEY=$(grep "OPENROUTER_API_KEY" .env | cut -d= -f2)
echo "API Key: ${OPENROUTER_API_KEY:0:20}..."

# Check Vercel login
vercel whoami
```

---

## Phase 2: Run Benchmark

### 2.1 Run Selected Scenarios

**Configuration:** 10 scenarios (indices: 0,4,6,10,17,18,19,22,23,25)

| # | Index | Scenario | Type |
|---|-------|----------|------|
| 1 | 0 | Bro Split (Chest) | Non-blended |
| 2 | 4 | Bro Split (Legs) | Non-blended |
| 3 | 6 | Upper/Lower - Strength (Upper) | Non-blended |
| 4 | 10 | Full Body - HIT | Non-blended |
| 5 | 17 | PPL - Strength + Bodybuilding (Push) | Blended |
| 6 | 18 | Upper/Lower - HIT + Bodybuilding (Upper) | Blended |
| 7 | 19 | Full Body - Strength + Endurance | Blended |
| 8 | 22 | Arnold Split - Bodybuilding + Endurance (Chest/Back) | Blended |
| 9 | 23 | Arnold Split - Bodybuilding + HIT (Chest/Back) | Blended |
| 10 | 25 | Arnold Split - Bodybuilding + HIT (Shoulders/Arms) | Blended |

**Execute:**
```bash
cd /home/arian/expo-work/showcase
export OPENROUTER_API_KEY=$(grep "OPENROUTER_API_KEY" .env | cut -d= -f2)

# Run with selected scenarios
SCENARIOS=0,4,6,10,17,18,19,22,23,25 node benchmark-orchestrator.mjs
```

**Expected Output:**
- `model-google-gemini-3-flash-preview-*.json`
- `model-openai-gpt-4-1-mini-*.json`
- Auto-triggers `benchmark-combiner.mjs`

---

## Phase 3: Combine Results

### 3.1 Verify Combiner Output

The orchestrator auto-runs the combiner, but verify:

```bash
ls -la benchmark-results/combined-benchmark-*.json | tail -5
ls -la public/benchmark-data.json
```

### 3.2 Manual Combine (if needed)

```bash
node benchmark-combiner.mjs
```

This creates:
- `benchmark-results/combined-benchmark-<timestamp>.json`
- `benchmark-results/combined-benchmark-<timestamp>.md`

---

## Phase 4: Deploy to Vercel

### 4.1 Build & Deploy

```bash
cd /home/arian/expo-work/showcase

# Option A: Deploy to production
vercel --prod

# Option B: Deploy to preview (recommended for testing)
vercel
```

**Expected Output:**
```
🔍  Inspect: https://vercel.com/arian-cayton/llm-benchmark-showcase/<deployment-id>
✅  Production: https://llm-benchmark-showcase.vercel.app
```

### 4.2 Get Deployment URL

```bash
# Capture the deployment URL
DEPLOY_URL=$(vercel ls --json | jq -r '.[0].url')
echo "Deployed to: https://${DEPLOY_URL}"
```

---

## Phase 5: Verify with agent-browser (CDP Mode)

### 5.1 Prerequisites

Ensure Chrome is running with CDP on port 9333:

```bash
# Verify connection
agent-browser --cdp 9333 --session cdp9333 get title
```

### 5.2 Verification Script

**Workflow:** Always `snapshot` first to get element refs, then interact.

```bash
# Step 1: Open the deployed URL
agent-browser --cdp 9333 --session cdp9333 open "https://${DEPLOY_URL}"

# Step 2: Get snapshot (element refs like @e1, @e2)
agent-browser --cdp 9333 --session cdp9333 snapshot

# Step 3: Screenshot for verification
agent-browser --cdp 9333 --session cdp9333 screenshot /tmp/benchmark-verify-1.png
```

### 5.3 Verification Checklist

**Navigate to benchmark results:**
```bash
# Snapshot to find navigation elements
agent-browser --cdp 9333 --session cdp9333 snapshot

# Click on benchmark/results link (adjust @e{n} based on snapshot)
agent-browser --cdp 9333 --session cdp9333 click @e5

# Screenshot results page
agent-browser --cdp 9333 --session cdp9333 screenshot /tmp/benchmark-verify-2.png
```

**Verify data loaded:**
```bash
# Get page text content
agent-browser --cdp 9333 --session cdp9333 get text

# Should contain:
# - "Gemini 3 Flash"
# - "GPT-4.1 Mini"
# - "Blended" scenario names
# - Success rates, latency metrics
```

---

## Full Automation Script

Save this as `run-and-verify.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Benchmark Run + Vercel Deploy + Verify Pipeline
 * 
 * Usage: node run-and-verify.mjs
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';

const SCENARIOS = '0,4,6,10,17,18,19,22,23,25';
const CDP_PORT = '9333';
const SESSION = 'cdp9333';

function runCommand(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args, {
      cwd: '/home/arian/expo-work/showcase',
      env: { ...process.env, ...env },
      stdio: 'inherit'
    });
    proc.on('close', (code) => {
      code === 0 ? resolve() : reject(new Error(`Exit code ${code}`));
    });
  });
}

function agentBrowser(args) {
  const cmd = `agent-browser --cdp ${CDP_PORT} --session ${SESSION} ${args}`;
  console.log(`🌐 ${cmd}`);
  return execSync(cmd, { encoding: 'utf8', cwd: '/home/arian/expo-work/showcase' });
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  BENCHMARK + DEPLOY + VERIFY PIPELINE                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // Phase 1: Run Benchmark
  console.log('\n📊 Phase 1: Running Benchmark...');
  await runCommand('node', ['benchmark-orchestrator.mjs'], {
    SCENARIOS,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY
  });

  // Phase 2: Deploy to Vercel
  console.log('\n🚀 Phase 2: Deploying to Vercel...');
  const deployOutput = execSync('vercel --prod --yes', {
    encoding: 'utf8',
    cwd: '/home/arian/expo-work/showcase'
  });
  console.log(deployOutput);

  // Extract URL from output
  const urlMatch = deployOutput.match(/https:\/\/[^\s]+/);
  const deployUrl = urlMatch ? urlMatch[0] : null;
  
  if (!deployUrl) {
    throw new Error('Could not extract deployment URL');
  }
  console.log(`\n✅ Deployed to: ${deployUrl}`);

  // Phase 3: Verify with agent-browser
  console.log('\n🔍 Phase 3: Verifying deployment...');
  
  // Open URL
  agentBrowser(`open ${deployUrl}`);
  
  // Take screenshot
  agentBrowser('screenshot /tmp/benchmark-verify-home.png');
  console.log('📸 Screenshot saved: /tmp/benchmark-verify-home.png');
  
  // Get snapshot
  const snapshot = agentBrowser('snapshot');
  console.log('📄 Page snapshot captured');
  
  // Verify content
  const text = agentBrowser('get text');
  const hasGemini = text.includes('Gemini 3 Flash');
  const hasGPT = text.includes('GPT-4.1 Mini');
  
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  VERIFICATION RESULTS                                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  URL: ${deployUrl}`);
  console.log(`  ✓ Gemini 3 Flash data present: ${hasGemini}`);
  console.log(`  ✓ GPT-4.1 Mini data present: ${hasGPT}`);
  console.log(`  ✓ Screenshot: /tmp/benchmark-verify-home.png`);
  console.log('');
  
  if (hasGemini && hasGPT) {
    console.log('✅ All verifications passed!');
    process.exit(0);
  } else {
    console.log('❌ Verification failed - data not found on page');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Pipeline failed:', err.message);
  process.exit(1);
});
```

---

## Manual Step-by-Step Commands

```bash
# 1. Start Chrome CDP (if not running)
powershell.exe -Command "Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' \
  -ArgumentList '--remote-debugging-port=9333','--user-data-dir=C:\Users\Arian\chrome-profiles\expo-work'"

# 2. Run benchmark
cd /home/arian/expo-work/showcase
export OPENROUTER_API_KEY=$(grep "OPENROUTER_API_KEY" .env | cut -d= -f2)
SCENARIOS=0,4,6,10,17,18,19,22,23,25 node benchmark-orchestrator.mjs

# 3. Deploy
vercel --prod

# 4. Verify (replace with actual URL from deploy output)
DEPLOY_URL="llm-benchmark-showcase.vercel.app"
agent-browser --cdp 9333 --session cdp9333 open "https://${DEPLOY_URL}"
agent-browser --cdp 9333 --session cdp9333 snapshot
agent-browser --cdp 9333 --session cdp9333 screenshot /tmp/verify.png
```

---

## Troubleshooting

### Issue: Chrome CDP not connecting
```bash
# Check if port is listening
netstat -tlnp | grep 9333

# Kill existing Chrome and restart
taskkill //F //IM chrome.exe 2>/dev/null
powershell.exe -Command "Start-Process 'chrome.exe' ..."
```

### Issue: agent-browser daemon conflict
```bash
# Kill existing daemon
pkill -f "agent-browser.*daemon"

# Use fresh session name
agent-browser --cdp 9333 --session cdp9333-$(date +%s) snapshot
```

### Issue: Vercel deploy fails
```bash
# Re-login to Vercel
vercel login

# Or use token
vercel --token $VERCEL_TOKEN
```

---

## Success Criteria

- [ ] Benchmark completes for both models (Gemini 3 Flash + GPT-4.1 Mini)
- [ ] Combined results JSON is generated
- [ ] Vercel deployment succeeds
- [ ] agent-browser can navigate to deployed URL
- [ ] Screenshot shows benchmark results
- [ ] Page contains both model names
