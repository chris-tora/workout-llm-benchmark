#!/usr/bin/env node
/**
 * Persona Cost Simulation
 * Calls production edge functions with realistic per-persona parameters
 * to collect actual LLM cost data from llm_usage_logs.
 *
 * Usage:
 *   node persona-cost-simulation.mjs                    # Full simulation
 *   PERSONAS=alex,jordan node persona-cost-simulation.mjs
 *   DRY_RUN=true node persona-cost-simulation.mjs
 *   MAX_BUDGET_USD=5 node persona-cost-simulation.mjs
 *   SCALE=0.25 node persona-cost-simulation.mjs         # 25% of monthly calls
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ivfllbccljoyaayftecd.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZmxsYmNjbGpveWFheWZ0ZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTkwMTQsImV4cCI6MjA4MTY5NTAxNH0.714kFWsFFKwVAywLY5NOyZz2_eMoi7-Js8JGCwtpycs';
const DB_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZmxsYmNjbGpveWFheWZ0ZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjExOTAxNCwiZXhwIjoyMDgxNjk1MDE0fQ.0-GD_WvgZlCOMFThc-4mLMS80GE5wLKFetHe_X_ovUc';

const DRY_RUN = process.env.DRY_RUN === 'true';
const SCALE = parseFloat(process.env.SCALE) || 1.0;
const MAX_BUDGET_USD = parseFloat(process.env.MAX_BUDGET_USD) || 10.0;

// Per-call cost estimates for budget enforcement
const COST_ESTIMATES = {
  'generate-workout': 0.025,
  'analyze-equipment': 0.001,
  'parse-equipment-text': 0.0001,
  'classify-equipment': 0.0001,
};

// ─── MODEL INFO (from edge function code audit) ──────────────────────────
const MODEL_INFO = {
  'generate-workout': {
    models: ['anthropic/claude-sonnet-4'],
    calls: '2 sequential (exercise-selector + param-assigner)',
    type: 'Text',
  },
  'analyze-equipment': {
    models: ['qwen/qwen3-vl-32b-instruct'],
    calls: '1 (vision)',
    type: 'Vision',
  },
  'parse-equipment-text': {
    models: ['openai/gpt-4o-mini'],
    calls: '1 (text)',
    type: 'Text',
  },
  'classify-equipment': {
    models: ['google/gemini-3-flash-preview', 'openai/gpt-4o-mini'],
    calls: '1 per exercise (text or vision mode)',
    type: 'Text/Vision',
  },
};

// ─── REVENUE MODEL (sourced from RevenueCat + App Store Connect) ──────────
// RevenueCat Project: proja1ccb05f | Entitlement: "Repgen Pro" (entlf6d0367a51)
// Apple commission: 15% (Small Business Program, <$1M revenue)
// RevenueCat fee: 0% (under $2,500 MTR) — not included below, add 1.2% when MTR > $2,500
const APPLE_COMMISSION = 0.15;

const REVENUE_MODEL = {
  offerings: {
    default: {
      monthly: { gross: 9.99, storeId: 'com.repgen.app.monthly' },
      annual:  { gross: 59.99, storeId: 'com.repgen.app.annual' },
    },
    skip_trial_15: {
      monthly: { gross: 8.49, storeId: 'com.repgen.app.monthly.15off' },
      annual:  { gross: 50.99, storeId: 'com.repgen.app.annual.15off' },
    },
    abandonment_25: {
      monthly: { gross: 9.99, storeId: 'com.repgen.app.monthly' },  // anchor, no discount
      annual:  { gross: 44.99, storeId: 'com.repgen.app.annual.25off' },
    },
    abandonment_30: {
      monthly: { gross: 9.99, storeId: 'com.repgen.app.monthly' },  // anchor, no discount
      annual:  { gross: 41.99, storeId: 'com.repgen.app.annual.30off' },
    },
    winback_40: {
      monthly: null,  // no monthly in this offering
      annual:  { gross: 35.99, storeId: 'com.repgen.app.annual.40off' },
    },
    winback_50: {
      annual:  { gross: 29.99, storeId: 'com.repgen.app.annual.50off' },
    },
  },

  // Expected plan mix (moderate estimate from revenue-pricing.md)
  planMix: {
    'default:annual':       0.55,  // Trial → Annual (default selection, "BEST VALUE" badge)
    'skip_trial_15:annual': 0.10,  // Skip trial toggle → Annual 15% off
    'default:monthly':      0.15,  // Trial → Monthly
    'skip_trial_15:monthly': 0.05, // Skip trial → Monthly 15% off
    'abandonment_25:annual': 0.10, // Close paywall 1st time → 25% off annual
    'abandonment_30:annual': 0.03, // Close paywall no trial → 30% off annual
    'winback_40:annual':    0.01,  // Trial cancelled winback → 40% off
    'winback_50:annual':    0.01,  // Sub cancelled winback → 50% off
  },
};

// Compute net revenue for a given offering+plan
function netRevenue(offeringKey, planType) {
  const offering = REVENUE_MODEL.offerings[offeringKey];
  if (!offering) return 0;
  const plan = offering[planType];
  if (!plan) return 0;
  const net = plan.gross * (1 - APPLE_COMMISSION);
  return planType === 'annual' ? net / 12 : net;  // normalize to monthly
}

// Compute blended monthly net revenue from plan mix
function computeBlendedRevenue() {
  let blended = 0;
  for (const [key, weight] of Object.entries(REVENUE_MODEL.planMix)) {
    const [offering, plan] = key.split(':');
    blended += netRevenue(offering, plan) * weight;
  }
  return blended;
}

// Minimal 1x1 JPEG for equipment scan testing (LLM still processes it)
const TEST_IMAGE_BASE64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=';

// Sample text inputs for parse-equipment-text
const TEXT_PARSE_INPUTS = [
  'dumbbells and a pull up bar',
  'i have a barbell, bench, and some resistance bands',
  'cable machine, dumbbells, ez curl bar',
  'just bodyweight exercises',
  'treadmill, bike, rowing machine, and some dumbbells',
  'full home gym with squat rack, barbell, dumbbells, and a cable machine',
  'hotel gym - dumbbells up to 50lbs and a bench',
];

// Sample exercises for classify-equipment
const CLASSIFY_EXERCISES = [
  { id: 'ex1', name: 'Lever Chest Press', equipment: 'leverage machine', bodypart: 'chest' },
  { id: 'ex2', name: 'Lever Seated Leg Curl', equipment: 'leverage machine', bodypart: 'upper legs' },
  { id: 'ex3', name: 'Sled Leg Press', equipment: 'sled machine', bodypart: 'upper legs' },
  { id: 'ex4', name: 'Lever Lat Pulldown', equipment: 'leverage machine', bodypart: 'back' },
  { id: 'ex5', name: 'Lever Seated Shoulder Press', equipment: 'leverage machine', bodypart: 'shoulders' },
];

// ============================================================================
// ANSI COLORS
// ============================================================================

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// ============================================================================
// PERSONA DEFINITIONS
// ============================================================================

const PERSONAS = [
  {
    name: 'alex',
    label: 'Alex — Casual Beginner',
    userMix: 0.25,
    projectedMonthlyCost: 0.170,
    subscriptionPlan: { offering: 'default', plan: 'annual' },
    get netRevenuePerMonth() { return netRevenue(this.subscriptionPlan.offering, this.subscriptionPlan.plan); },
    workoutGenerations: 6,
    workoutRegenerations: 0,
    equipmentScans: 1,
    textParses: 1,
    durations: [30, 45],
    experienceLevels: [2, 3, 4],
    equipmentSets: [
      ['Dumbbells'],
      ['Dumbbells', 'Flat Bench'],
      ['Dumbbells', 'Barbell'],
    ],
    bodyPartSets: [['chest'], ['upper legs'], ['back'], ['chest', 'shoulders']],
    styles: [['STRENGTH'], ['BODYBUILD']],
    goals: ['general fitness', 'muscle gain'],
    splits: ['full_body'],
    dayTypes: ['Full Body'],
  },
  {
    name: 'jordan',
    label: 'Jordan — Steady Regular',
    userMix: 0.25,
    projectedMonthlyCost: 0.337,
    subscriptionPlan: { offering: 'default', plan: 'annual' },
    get netRevenuePerMonth() { return netRevenue(this.subscriptionPlan.offering, this.subscriptionPlan.plan); },
    workoutGenerations: 8,
    workoutRegenerations: 4,
    equipmentScans: 1,
    textParses: 0,
    durations: [45, 60],
    experienceLevels: [5, 6, 7],
    equipmentSets: [
      ['Dumbbells', 'Barbell', 'Cable Machine', 'Flat Bench'],
      ['Dumbbells', 'Barbell', 'Cable Machine', 'Lat Pulldown', 'Leg Press'],
    ],
    bodyPartSets: [['chest', 'shoulders', 'upper arms'], ['back', 'upper arms'], ['upper legs', 'lower legs'], ['chest', 'back', 'shoulders']],
    styles: [['STRENGTH'], ['BODYBUILD'], ['STRENGTH', 'BODYBUILD']],
    goals: ['muscle gain', 'strength'],
    splits: ['upper_lower', 'push_pull_legs'],
    dayTypes: ['Upper', 'Lower', 'Push', 'Pull', 'Legs'],
  },
  {
    name: 'sam',
    label: 'Sam — Power User',
    userMix: 0.08,
    projectedMonthlyCost: 0.675,
    subscriptionPlan: { offering: 'skip_trial_15', plan: 'annual' },
    get netRevenuePerMonth() { return netRevenue(this.subscriptionPlan.offering, this.subscriptionPlan.plan); },
    workoutGenerations: 16,
    workoutRegenerations: 8,
    equipmentScans: 2,
    textParses: 1,
    durations: [60, 75, 90],
    experienceLevels: [8, 9, 10],
    equipmentSets: [
      ['Dumbbells', 'Barbell', 'Cable Machine', 'EZ Bar', 'Squat Rack', 'Flat Bench', 'Incline Bench'],
      ['Dumbbells', 'Barbell', 'Cable Machine', 'Smith Machine', 'Leg Press', 'Leg Curl Machine'],
    ],
    bodyPartSets: [['chest'], ['back'], ['shoulders', 'upper arms'], ['upper legs', 'lower legs'], ['chest', 'back'], ['shoulders']],
    styles: [['BODYBUILD'], ['STRENGTH'], ['HIT']],
    goals: ['muscle gain', 'strength', 'muscle gain'],
    splits: ['push_pull_legs', 'arnold_split', 'bro_split'],
    dayTypes: ['Push', 'Pull', 'Legs', 'Chest', 'Back', 'Shoulders', 'Arms'],
  },
  {
    name: 'riley',
    label: 'Riley — Gym Hopper',
    userMix: 0.07,
    projectedMonthlyCost: 0.370,
    subscriptionPlan: { offering: 'default', plan: 'monthly' },
    get netRevenuePerMonth() { return netRevenue(this.subscriptionPlan.offering, this.subscriptionPlan.plan); },
    workoutGenerations: 10,
    workoutRegenerations: 3,
    equipmentScans: 6,
    textParses: 2,
    durations: [30, 45, 60],
    experienceLevels: [5, 6, 7],
    equipmentSets: [
      ['Dumbbells'],
      ['Dumbbells', 'Cable Machine'],
      ['Dumbbells', 'Barbell', 'Cable Machine', 'Flat Bench'],
      ['Dumbbells', 'Barbell', 'Cable Machine', 'Leg Press', 'Smith Machine'],
    ],
    bodyPartSets: [['chest', 'back'], ['upper legs'], ['shoulders', 'upper arms'], ['chest', 'shoulders']],
    styles: [['STRENGTH'], ['BODYBUILD'], ['ENDURANCE']],
    goals: ['general fitness', 'muscle gain', 'strength'],
    splits: ['full_body', 'upper_lower'],
    dayTypes: ['Full Body', 'Upper', 'Lower'],
  },
  {
    name: 'taylor',
    label: 'Taylor — Trial Explorer',
    userMix: 0.20,
    projectedMonthlyCost: 0.650,
    subscriptionPlan: { offering: 'default', plan: 'annual', conversionRate: 0.30 },
    get netRevenuePerMonth() { return netRevenue('default', 'annual') * this.subscriptionPlan.conversionRate; },
    workoutGenerations: 15,
    workoutRegenerations: 8,
    equipmentScans: 4,
    textParses: 2,
    durations: [30, 45, 60, 90],
    experienceLevels: [3, 4, 5, 6],
    equipmentSets: [
      ['Dumbbells'],
      ['Dumbbells', 'Barbell'],
      ['Dumbbells', 'Barbell', 'Cable Machine'],
      ['Dumbbells', 'Barbell', 'Cable Machine', 'Flat Bench', 'Squat Rack'],
    ],
    bodyPartSets: [['chest'], ['back'], ['upper legs'], ['shoulders'], ['chest', 'back'], ['upper legs', 'lower legs'], ['chest', 'shoulders', 'upper arms']],
    styles: [['STRENGTH'], ['BODYBUILD'], ['HIT'], ['ENDURANCE']],
    goals: ['muscle gain', 'strength', 'general fitness'],
    splits: ['full_body', 'upper_lower', 'push_pull_legs', 'bro_split'],
    dayTypes: ['Full Body', 'Upper', 'Lower', 'Push', 'Pull', 'Legs', 'Chest', 'Back'],
  },
  {
    name: 'morgan',
    label: 'Morgan — Weekend Warrior',
    userMix: 0.10,
    projectedMonthlyCost: 0.112,
    subscriptionPlan: { offering: 'default', plan: 'monthly' },
    get netRevenuePerMonth() { return netRevenue(this.subscriptionPlan.offering, this.subscriptionPlan.plan); },
    workoutGenerations: 3,
    workoutRegenerations: 1,
    equipmentScans: 0,
    textParses: 0,
    durations: [30, 45],
    experienceLevels: [3, 4, 5],
    equipmentSets: [
      ['Dumbbells', 'Barbell', 'Flat Bench'],
      ['Dumbbells', 'Cable Machine'],
    ],
    bodyPartSets: [['chest', 'back', 'shoulders'], ['upper legs', 'lower legs'], ['chest', 'back', 'upper legs']],
    styles: [['STRENGTH'], ['BODYBUILD']],
    goals: ['general fitness'],
    splits: ['full_body'],
    dayTypes: ['Full Body'],
  },
  {
    name: 'casey',
    label: 'Casey — Returning Seasonal',
    userMix: 0.05,
    projectedMonthlyCost: 0.394,
    subscriptionPlan: { offering: 'default', plan: 'monthly' },
    get netRevenuePerMonth() { return netRevenue(this.subscriptionPlan.offering, this.subscriptionPlan.plan); },
    workoutGenerations: 10,
    workoutRegenerations: 4,
    equipmentScans: 2,
    textParses: 0,
    durations: [45, 60],
    experienceLevels: [4, 5, 6],
    equipmentSets: [
      ['Dumbbells', 'Barbell', 'Cable Machine'],
      ['Dumbbells', 'Barbell', 'Cable Machine', 'Flat Bench', 'Squat Rack'],
    ],
    bodyPartSets: [['chest'], ['back'], ['upper legs'], ['chest', 'back'], ['shoulders', 'upper arms']],
    styles: [['BODYBUILD'], ['STRENGTH']],
    goals: ['muscle gain', 'strength'],
    splits: ['upper_lower', 'push_pull_legs'],
    dayTypes: ['Upper', 'Lower', 'Push', 'Pull', 'Legs'],
  },
];

// ============================================================================
// HELPERS
// ============================================================================

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function scaledCount(count) {
  return Math.max(0, Math.round(count * SCALE));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pad(str, len) {
  return String(str).padEnd(len);
}

function padLeft(str, len) {
  return String(str).padStart(len);
}

function formatUsd(amount) {
  return `$${amount.toFixed(4)}`;
}

function formatMs(ms) {
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function isoTimestamp() {
  return new Date().toISOString();
}

function fileTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

// ============================================================================
// REQUEST BODY BUILDERS
// ============================================================================

function generateWorkoutBody(persona, isRegeneration = false) {
  const duration = pick(persona.durations);
  const equipment = pick(persona.equipmentSets);
  const bodyParts = pick(persona.bodyPartSets);
  const style = pick(persona.styles);
  const goal = pick(persona.goals);
  const split = pick(persona.splits);
  const dayType = pick(persona.dayTypes);

  return {
    equipment,
    bodyParts,
    duration,
    experienceLevel: pick(persona.experienceLevels),
    goal,
    selectedStyles: style,
    workoutSplit: split,
    dayType,
    splitDayType: dayType.toLowerCase(),
    includeWarmup: true,
    isRegeneration,
  };
}

function generateEquipmentScanBody() {
  return { image: TEST_IMAGE_BASE64 };
}

function generateTextParseBody() {
  return { text: pick(TEXT_PARSE_INPUTS) };
}

function generateClassifyBody() {
  // Pick 1-3 random exercises from the pool
  const count = Math.floor(Math.random() * 3) + 1;
  const shuffled = [...CLASSIFY_EXERCISES].sort(() => Math.random() - 0.5);
  return { exercises: shuffled.slice(0, count) };
}

// ============================================================================
// EDGE FUNCTION CALLER
// ============================================================================

let cumulativeCostEstimate = 0;
let budgetExceeded = false;

const callStats = {
  total: 0,
  success: 0,
  failed: 0,
  byFunction: {},
};

async function callEdgeFunction(functionName, body) {
  const estimatedCost = COST_ESTIMATES[functionName] || 0;

  // Budget enforcement check
  if (cumulativeCostEstimate + estimatedCost > MAX_BUDGET_USD) {
    budgetExceeded = true;
    return {
      success: false,
      status: 0,
      latencyMs: 0,
      error: `Budget exceeded: $${cumulativeCostEstimate.toFixed(4)} + $${estimatedCost.toFixed(4)} > $${MAX_BUDGET_USD.toFixed(2)}`,
      skipped: true,
    };
  }

  cumulativeCostEstimate += estimatedCost;
  callStats.total++;

  if (!callStats.byFunction[functionName]) {
    callStats.byFunction[functionName] = { total: 0, success: 0, failed: 0, totalLatency: 0 };
  }
  callStats.byFunction[functionName].total++;

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - startTime;
    let data;
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    const success = response.ok && !data.error;

    if (success) {
      callStats.success++;
      callStats.byFunction[functionName].success++;
    } else {
      callStats.failed++;
      callStats.byFunction[functionName].failed++;
    }
    callStats.byFunction[functionName].totalLatency += latencyMs;

    return {
      success,
      status: response.status,
      latencyMs,
      error: data.error || null,
      skipped: false,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    callStats.failed++;
    callStats.byFunction[functionName].failed++;
    callStats.byFunction[functionName].totalLatency += latencyMs;

    return {
      success: false,
      status: 0,
      latencyMs,
      error: error.message,
      skipped: false,
    };
  }
}

// ============================================================================
// DATABASE QUERY
// ============================================================================

async function queryUsageLogs(startTime, endTime) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/llm_usage_logs`);
  url.searchParams.set('select', 'function_name,model,cost_usd,latency_ms,success,prompt_tokens,completion_tokens,total_tokens,created_at');
  url.searchParams.set('created_at', `gte.${startTime}`);
  url.searchParams.set('created_at', `lte.${endTime}`);
  url.searchParams.set('order', 'created_at.asc');
  url.searchParams.set('limit', '1000');

  // PostgREST needs both gte and lte — use the filter header for compound conditions
  const filterUrl = `${SUPABASE_URL}/rest/v1/llm_usage_logs?select=function_name,model,cost_usd,latency_ms,success,prompt_tokens,completion_tokens,total_tokens,created_at&and=(created_at.gte.${startTime},created_at.lte.${endTime})&order=created_at.asc&limit=1000`;

  const response = await fetch(filterUrl, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${DB_SERVICE_ROLE_KEY}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`${C.red}Failed to query llm_usage_logs: ${response.status} ${text}${C.reset}`);
    return [];
  }

  return response.json();
}

// ============================================================================
// SIMULATION PLAN
// ============================================================================

function getSelectedPersonas() {
  if (process.env.PERSONAS) {
    const names = process.env.PERSONAS.split(',').map(n => n.trim().toLowerCase());
    return PERSONAS.filter(p => names.includes(p.name));
  }
  return PERSONAS;
}

function buildSimulationPlan(personas) {
  const plan = [];
  let totalCalls = 0;
  let totalEstimatedCost = 0;

  for (const persona of personas) {
    const gens = scaledCount(persona.workoutGenerations);
    const regens = scaledCount(persona.workoutRegenerations);
    const scans = scaledCount(persona.equipmentScans);
    const parses = scaledCount(persona.textParses);

    const callCount = gens + regens + scans + parses;
    const estimatedCost =
      (gens + regens) * COST_ESTIMATES['generate-workout'] +
      scans * COST_ESTIMATES['analyze-equipment'] +
      parses * COST_ESTIMATES['parse-equipment-text'];

    plan.push({
      persona,
      gens,
      regens,
      scans,
      parses,
      callCount,
      estimatedCost,
    });

    totalCalls += callCount;
    totalEstimatedCost += estimatedCost;
  }

  return { plan, totalCalls, totalEstimatedCost };
}

function printSimulationPlan(plan, totalCalls, totalEstimatedCost) {
  console.log(`\n${C.bold}${C.cyan}${'='.repeat(70)}${C.reset}`);
  console.log(`${C.bold}${C.cyan}  PERSONA COST SIMULATION${DRY_RUN ? ' (DRY RUN)' : ''}${C.reset}`);
  console.log(`${C.bold}${C.cyan}${'='.repeat(70)}${C.reset}\n`);

  console.log(`  ${C.dim}Scale:${C.reset}  ${SCALE === 1.0 ? '100% (full monthly)' : `${(SCALE * 100).toFixed(0)}% of monthly calls`}`);
  console.log(`  ${C.dim}Budget:${C.reset} ${C.yellow}$${MAX_BUDGET_USD.toFixed(2)}${C.reset}`);
  console.log(`  ${C.dim}Target:${C.reset} ${SUPABASE_URL}`);
  console.log(`  ${C.dim}Date:${C.reset}   ${new Date().toISOString()}\n`);

  if (DRY_RUN) {
    console.log(`  ${C.bgYellow}${C.bold} DRY RUN — No API calls will be made ${C.reset}\n`);
  }

  for (const item of plan) {
    const p = item.persona;
    console.log(`  ${C.bold}${C.white}${p.label}${C.reset} ${C.dim}(${(p.userMix * 100).toFixed(0)}% of users)${C.reset}`);
    console.log(`    Workout generations:    ${padLeft(item.gens, 3)}${SCALE !== 1.0 ? ` ${C.dim}(base: ${p.workoutGenerations})${C.reset}` : ''}`);
    console.log(`    Workout regenerations:  ${padLeft(item.regens, 3)}${SCALE !== 1.0 ? ` ${C.dim}(base: ${p.workoutRegenerations})${C.reset}` : ''}`);
    console.log(`    Equipment scans:        ${padLeft(item.scans, 3)}${SCALE !== 1.0 ? ` ${C.dim}(base: ${p.equipmentScans})${C.reset}` : ''}`);
    console.log(`    Text parses:            ${padLeft(item.parses, 3)}${SCALE !== 1.0 ? ` ${C.dim}(base: ${p.textParses})${C.reset}` : ''}`);
    console.log(`    ${C.dim}Total calls:${C.reset} ${item.callCount}  ${C.dim}|${C.reset}  ${C.dim}Est cost:${C.reset} ${C.green}${formatUsd(item.estimatedCost)}${C.reset}  ${C.dim}|${C.reset}  ${C.dim}Projected/mo:${C.reset} ${formatUsd(p.projectedMonthlyCost)}`);
    console.log('');
  }

  console.log(`  ${C.bold}${'─'.repeat(50)}${C.reset}`);
  console.log(`  ${C.bold}Total calls:${C.reset}          ${totalCalls}`);
  console.log(`  ${C.bold}Estimated cost:${C.reset}       ${C.green}${formatUsd(totalEstimatedCost)}${C.reset}`);
  console.log(`  ${C.bold}Budget limit:${C.reset}         ${C.yellow}$${MAX_BUDGET_USD.toFixed(2)}${C.reset}`);

  if (totalEstimatedCost > MAX_BUDGET_USD) {
    console.log(`\n  ${C.bgRed}${C.bold} WARNING: Estimated cost exceeds budget! Simulation will abort early. ${C.reset}`);
  }

  console.log('');
}

// ============================================================================
// PERSONA RUNNER
// ============================================================================

async function runPersona(item) {
  const { persona, gens, regens, scans, parses } = item;
  const results = {
    personaName: persona.name,
    personaLabel: persona.label,
    userMix: persona.userMix,
    projectedMonthlyCost: persona.projectedMonthlyCost,
    startTime: isoTimestamp(),
    endTime: null,
    calls: [],
    totalCalls: 0,
    successCalls: 0,
    failedCalls: 0,
    totalLatencyMs: 0,
  };

  const logCall = (type, index, total, result) => {
    results.calls.push({ type, index, ...result });
    results.totalCalls++;
    results.totalLatencyMs += result.latencyMs;
    if (result.success) results.successCalls++;
    else results.failedCalls++;

    const statusIcon = result.success ? `${C.green}OK${C.reset}` : (result.skipped ? `${C.yellow}SKIP${C.reset}` : `${C.red}FAIL${C.reset}`);
    const latencyStr = result.latencyMs > 0 ? ` ${C.dim}${formatMs(result.latencyMs)}${C.reset}` : '';
    console.log(`    ${C.dim}[${index + 1}/${total}]${C.reset} ${pad(type, 24)} ${statusIcon}${latencyStr}${result.error ? ` ${C.red}${result.error.substring(0, 60)}${C.reset}` : ''}`);
  };

  // --- Workout generations ---
  if (gens > 0) {
    console.log(`\n    ${C.blue}Workout generations (${gens})${C.reset}`);
    for (let i = 0; i < gens; i++) {
      if (budgetExceeded) break;
      const body = generateWorkoutBody(persona, false);
      const result = await callEdgeFunction('generate-workout', body);
      logCall('generate-workout', i, gens, result);
      if (i < gens - 1) await sleep(500);
    }
  }

  // --- Workout regenerations ---
  if (regens > 0 && !budgetExceeded) {
    console.log(`\n    ${C.blue}Workout regenerations (${regens})${C.reset}`);
    for (let i = 0; i < regens; i++) {
      if (budgetExceeded) break;
      const body = generateWorkoutBody(persona, true);
      const result = await callEdgeFunction('generate-workout', body);
      logCall('generate-workout:regen', i, regens, result);
      if (i < regens - 1) await sleep(500);
    }
  }

  // --- Equipment scans ---
  if (scans > 0 && !budgetExceeded) {
    console.log(`\n    ${C.blue}Equipment scans (${scans})${C.reset}`);
    for (let i = 0; i < scans; i++) {
      if (budgetExceeded) break;
      const body = generateEquipmentScanBody();
      const result = await callEdgeFunction('analyze-equipment', body);
      logCall('analyze-equipment', i, scans, result);
      if (i < scans - 1) await sleep(500);
    }
  }

  // --- Text parses ---
  if (parses > 0 && !budgetExceeded) {
    console.log(`\n    ${C.blue}Text parses (${parses})${C.reset}`);
    for (let i = 0; i < parses; i++) {
      if (budgetExceeded) break;
      const body = generateTextParseBody();
      const result = await callEdgeFunction('parse-equipment-text', body);
      logCall('parse-equipment-text', i, parses, result);
      if (i < parses - 1) await sleep(500);
    }
  }

  results.endTime = isoTimestamp();
  return results;
}

// ============================================================================
// RESULTS ANALYSIS
// ============================================================================

function analyzeUsageLogs(logs, personaResults) {
  // Aggregate by persona using time windows
  const personaAnalysis = [];

  for (const pr of personaResults) {
    const personaLogs = logs.filter(
      log => log.created_at >= pr.startTime && log.created_at <= pr.endTime
    );

    const totalCostUsd = personaLogs.reduce((sum, l) => sum + (parseFloat(l.cost_usd) || 0), 0);
    const totalTokens = personaLogs.reduce((sum, l) => sum + (l.total_tokens || 0), 0);
    const avgLatency = personaLogs.length > 0
      ? personaLogs.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / personaLogs.length
      : 0;

    // Breakdown by function
    const byFunction = {};
    for (const log of personaLogs) {
      const fn = log.function_name;
      if (!byFunction[fn]) {
        byFunction[fn] = { count: 0, cost: 0, tokens: 0, latency: 0 };
      }
      byFunction[fn].count++;
      byFunction[fn].cost += parseFloat(log.cost_usd) || 0;
      byFunction[fn].tokens += log.total_tokens || 0;
      byFunction[fn].latency += log.latency_ms || 0;
    }

    // Scale up to monthly if simulation was scaled down
    const monthlyProjection = SCALE < 1.0 ? totalCostUsd / SCALE : totalCostUsd;

    personaAnalysis.push({
      name: pr.personaName,
      label: pr.personaLabel,
      userMix: pr.userMix,
      projectedMonthlyCost: pr.projectedMonthlyCost,
      logCount: personaLogs.length,
      callsMade: pr.totalCalls,
      successCalls: pr.successCalls,
      failedCalls: pr.failedCalls,
      actualCostUsd: totalCostUsd,
      monthlyProjection,
      totalTokens,
      avgLatencyMs: Math.round(avgLatency),
      byFunction,
      variance: monthlyProjection > 0 && pr.projectedMonthlyCost > 0
        ? ((monthlyProjection - pr.projectedMonthlyCost) / pr.projectedMonthlyCost * 100)
        : 0,
    });
  }

  return personaAnalysis;
}

function computeBlendedCost(personaAnalysis) {
  let blended = 0;
  for (const pa of personaAnalysis) {
    blended += pa.monthlyProjection * pa.userMix;
  }
  return blended;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function printResultsTable(personaAnalysis) {
  console.log(`\n${C.bold}${C.cyan}${'='.repeat(70)}${C.reset}`);
  console.log(`${C.bold}${C.cyan}  SIMULATION RESULTS${C.reset}`);
  console.log(`${C.bold}${C.cyan}${'='.repeat(70)}${C.reset}\n`);

  // Header
  console.log(`  ${C.bold}${pad('Persona', 28)} ${padLeft('Calls', 6)} ${padLeft('DB Logs', 8)} ${padLeft('Proj $/mo', 10)} ${padLeft('Act $/mo', 10)} ${padLeft('Variance', 10)} ${padLeft('Avg Lat', 8)}${C.reset}`);
  console.log(`  ${'─'.repeat(80)}`);

  for (const pa of personaAnalysis) {
    const varianceStr = pa.variance > 0
      ? `${C.red}+${pa.variance.toFixed(1)}%${C.reset}`
      : `${C.green}${pa.variance.toFixed(1)}%${C.reset}`;

    console.log(`  ${pad(pa.label, 28)} ${padLeft(pa.callsMade, 6)} ${padLeft(pa.logCount, 8)} ${padLeft(formatUsd(pa.projectedMonthlyCost), 10)} ${padLeft(formatUsd(pa.monthlyProjection), 10)} ${padLeft(varianceStr, 20)} ${padLeft(formatMs(pa.avgLatencyMs), 8)}`);
  }

  console.log(`  ${'─'.repeat(80)}`);

  // Blended cost
  const blended = computeBlendedCost(personaAnalysis);
  const projectedBlended = personaAnalysis.reduce((sum, pa) => sum + pa.projectedMonthlyCost * pa.userMix, 0);

  console.log(`\n  ${C.bold}Blended Cost per User/Month:${C.reset}`);
  console.log(`    ${C.dim}Projected:${C.reset}  ${C.yellow}${formatUsd(projectedBlended)}${C.reset}`);
  console.log(`    ${C.dim}Actual:${C.reset}     ${C.green}${formatUsd(blended)}${C.reset}`);
  console.log(`    ${C.dim}Variance:${C.reset}   ${blended > projectedBlended ? C.red : C.green}${((blended - projectedBlended) / projectedBlended * 100).toFixed(1)}%${C.reset}`);
}

function printFunctionBreakdown(personaAnalysis) {
  console.log(`\n${C.bold}${C.cyan}  PER-FUNCTION BREAKDOWN${C.reset}\n`);

  const aggregated = {};
  for (const pa of personaAnalysis) {
    for (const [fn, data] of Object.entries(pa.byFunction)) {
      if (!aggregated[fn]) aggregated[fn] = { count: 0, cost: 0, tokens: 0, latency: 0 };
      aggregated[fn].count += data.count;
      aggregated[fn].cost += data.cost;
      aggregated[fn].tokens += data.tokens;
      aggregated[fn].latency += data.latency;
    }
  }

  console.log(`  ${C.bold}${pad('Function', 24)} ${padLeft('Calls', 6)} ${padLeft('Total $', 10)} ${padLeft('Avg $/call', 11)} ${padLeft('Tokens', 10)} ${padLeft('Avg Lat', 8)}  ${pad('Model(s)', 40)}${C.reset}`);
  console.log(`  ${'─'.repeat(110)}`);

  for (const [fn, data] of Object.entries(aggregated)) {
    const avgCost = data.count > 0 ? data.cost / data.count : 0;
    const avgLat = data.count > 0 ? data.latency / data.count : 0;
    const modelInfo = MODEL_INFO[fn];
    const modelStr = modelInfo ? `${modelInfo.models.join(', ')} [${modelInfo.type}]` : '—';
    console.log(`  ${pad(fn, 24)} ${padLeft(data.count, 6)} ${padLeft(formatUsd(data.cost), 10)} ${padLeft(formatUsd(avgCost), 11)} ${padLeft(data.tokens.toLocaleString(), 10)} ${padLeft(formatMs(avgLat), 8)}  ${C.dim}${modelStr}${C.reset}`);
  }
}

function printMarginAnalysis(personaAnalysis) {
  const blended = computeBlendedCost(personaAnalysis);
  const blendedRevenue = computeBlendedRevenue();

  console.log(`\n${C.bold}${C.cyan}  MARGIN ANALYSIS${C.reset}\n`);

  console.log(`  ${C.dim}Revenue model (RevenueCat — ${Object.keys(REVENUE_MODEL.offerings).length} offerings, ${APPLE_COMMISSION * 100}% Apple commission):${C.reset}`);
  console.log(`  ${C.bold}${pad('Offering', 24)} ${padLeft('Monthly', 12)} ${padLeft('Annual/mo', 12)} ${padLeft('Mix Weight', 12)}${C.reset}`);
  console.log(`  ${'─'.repeat(62)}`);

  for (const [offeringKey, offering] of Object.entries(REVENUE_MODEL.offerings)) {
    const monthlyNet = offering.monthly ? netRevenue(offeringKey, 'monthly') : null;
    const annualNet = offering.annual ? netRevenue(offeringKey, 'annual') : null;
    const monthlyMix = REVENUE_MODEL.planMix[`${offeringKey}:monthly`] || 0;
    const annualMix = REVENUE_MODEL.planMix[`${offeringKey}:annual`] || 0;
    const totalMix = monthlyMix + annualMix;
    console.log(`  ${pad(offeringKey, 24)} ${padLeft(monthlyNet !== null ? `$${monthlyNet.toFixed(2)}` : '—', 12)} ${padLeft(annualNet !== null ? `$${annualNet.toFixed(2)}` : '—', 12)} ${padLeft(totalMix > 0 ? `${(totalMix * 100).toFixed(0)}%` : '—', 12)}`);
  }

  console.log(`  ${'─'.repeat(62)}`);
  console.log(`  ${C.bold}${pad('Blended net revenue/mo', 24)} ${padLeft(`$${blendedRevenue.toFixed(2)}`, 12)}${C.reset}`);
  console.log('');
  console.log(`  ${C.dim}Cost:${C.reset}`);
  console.log(`    Blended LLM cost/user/mo:    ${C.green}${formatUsd(blended)}${C.reset}`);
  console.log('');
  console.log(`  ${C.dim}AI Models:${C.reset}`);
  console.log(`    Workout generation:    ${C.cyan}anthropic/claude-sonnet-4${C.reset} (2 calls x $${(COST_ESTIMATES['generate-workout'] / 2).toFixed(4)})`);
  console.log(`    Equipment scanning:    ${C.cyan}qwen/qwen3-vl-32b-instruct${C.reset} (${formatUsd(COST_ESTIMATES['analyze-equipment'])})`);
  console.log(`    Text parsing:          ${C.cyan}openai/gpt-4o-mini${C.reset} (${formatUsd(COST_ESTIMATES['parse-equipment-text'])})`);
  console.log(`    Equipment classify:    ${C.cyan}gemini-3-flash / gpt-4o-mini${C.reset} (${formatUsd(COST_ESTIMATES['classify-equipment'])})`);
  console.log('');
  console.log(`  ${C.bold}Margin:${C.reset}`);
  console.log(`    Per user/month:              ${C.green}${formatUsd(blendedRevenue - blended)}${C.reset}`);
  console.log(`    Margin %:                    ${C.green}${((1 - blended / blendedRevenue) * 100).toFixed(1)}%${C.reset}`);
  console.log(`    Cost as % of revenue:        ${blended / blendedRevenue * 100 < 5 ? C.green : C.yellow}${(blended / blendedRevenue * 100).toFixed(2)}%${C.reset}`);
  console.log('');

  // Break-even analysis
  const breakEvenUsers = blended > 0 ? Math.ceil(1 / blended) : Infinity;
  console.log(`  ${C.dim}Break-even:${C.reset}`);
  console.log(`    $1 LLM spend covers:         ${breakEvenUsers} users/month`);
  console.log(`    1000 users costs:            ${formatUsd(blended * 1000)}/month in LLM`);
  console.log(`    10,000 users costs:          ${formatUsd(blended * 10000)}/month in LLM`);

  // Per-persona margins
  console.log(`\n  ${C.bold}Per-Persona Margins (Actual LLM Cost vs Revenue):${C.reset}\n`);
  console.log(`  ${C.bold}${pad('Persona', 28)} ${padLeft('Subscription', 24)} ${padLeft('Revenue', 10)} ${padLeft('LLM Cost', 10)} ${padLeft('Margin', 10)} ${padLeft('Margin %', 10)}${C.reset}`);
  console.log(`  ${'─'.repeat(94)}`);

  for (const pa of personaAnalysis) {
    const persona = PERSONAS.find(p => p.name === pa.name);
    const revenue = persona?.netRevenuePerMonth || 0;
    const margin = revenue - pa.monthlyProjection;
    const marginPct = revenue > 0 ? ((margin / revenue) * 100) : 0;
    const subLabel = persona?.subscriptionPlan
      ? `${persona.subscriptionPlan.offering}:${persona.subscriptionPlan.plan}${persona.subscriptionPlan.conversionRate ? ` (${(persona.subscriptionPlan.conversionRate * 100).toFixed(0)}% conv)` : ''}`
      : '—';
    const marginColor = marginPct >= 90 ? C.green : marginPct >= 50 ? C.yellow : C.red;
    console.log(`  ${pad(pa.label, 28)} ${padLeft(subLabel, 24)} ${padLeft(`$${revenue.toFixed(2)}`, 10)} ${padLeft(formatUsd(pa.monthlyProjection), 10)} ${padLeft(`$${margin.toFixed(2)}`, 10)} ${marginColor}${padLeft(marginPct.toFixed(1) + '%', 10)}${C.reset}`);
  }
}

function generateMarkdownReport(personaAnalysis, simulationMeta) {
  const blended = computeBlendedCost(personaAnalysis);
  const projectedBlended = personaAnalysis.reduce((sum, pa) => sum + pa.projectedMonthlyCost * pa.userMix, 0);

  let md = `# Persona Cost Simulation Report\n\n`;
  md += `**Date:** ${simulationMeta.timestamp}\n`;
  md += `**Scale:** ${(SCALE * 100).toFixed(0)}%\n`;
  md += `**Budget:** $${MAX_BUDGET_USD.toFixed(2)}\n`;
  md += `**Total API Calls:** ${simulationMeta.totalApiCalls}\n`;
  md += `**Total Duration:** ${formatMs(simulationMeta.totalDurationMs)}\n\n`;

  // Per-persona table
  md += `## Per-Persona Results\n\n`;
  md += `| Persona | Mix | Calls | DB Logs | Projected $/mo | Actual $/mo | Variance | Avg Latency |\n`;
  md += `|---------|-----|-------|---------|----------------|-------------|----------|-------------|\n`;

  for (const pa of personaAnalysis) {
    const varianceStr = `${pa.variance > 0 ? '+' : ''}${pa.variance.toFixed(1)}%`;
    md += `| ${pa.label} | ${(pa.userMix * 100).toFixed(0)}% | ${pa.callsMade} | ${pa.logCount} | ${formatUsd(pa.projectedMonthlyCost)} | ${formatUsd(pa.monthlyProjection)} | ${varianceStr} | ${formatMs(pa.avgLatencyMs)} |\n`;
  }

  // Function breakdown
  md += `\n## Per-Function Breakdown\n\n`;
  md += `| Function | Calls | Total Cost | Avg $/call | Total Tokens | Avg Latency |\n`;
  md += `|----------|-------|------------|------------|-------------|-------------|\n`;

  const aggregated = {};
  for (const pa of personaAnalysis) {
    for (const [fn, data] of Object.entries(pa.byFunction)) {
      if (!aggregated[fn]) aggregated[fn] = { count: 0, cost: 0, tokens: 0, latency: 0 };
      aggregated[fn].count += data.count;
      aggregated[fn].cost += data.cost;
      aggregated[fn].tokens += data.tokens;
      aggregated[fn].latency += data.latency;
    }
  }

  for (const [fn, data] of Object.entries(aggregated)) {
    const avgCost = data.count > 0 ? data.cost / data.count : 0;
    const avgLat = data.count > 0 ? data.latency / data.count : 0;
    md += `| ${fn} | ${data.count} | ${formatUsd(data.cost)} | ${formatUsd(avgCost)} | ${data.tokens.toLocaleString()} | ${formatMs(avgLat)} |\n`;
  }

  // AI model usage
  md += `\n## AI Model Usage\n\n`;
  md += `| Edge Function | Model(s) | Call Type | Calls/Invocation | Est. Cost/Call |\n`;
  md += `|---------------|----------|-----------|-----------------|----------------|\n`;

  for (const [fn, info] of Object.entries(MODEL_INFO)) {
    const modelStr = info.models.map(m => `\`${m}\``).join(', ');
    const costPerCall = COST_ESTIMATES[fn] ? formatUsd(COST_ESTIMATES[fn]) : '—';
    md += `| ${fn} | ${modelStr} | ${info.type} | ${info.calls} | ${costPerCall} |\n`;
  }

  // Blended cost
  md += `\n## Blended Cost Comparison\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Projected blended $/user/mo | ${formatUsd(projectedBlended)} |\n`;
  md += `| Actual blended $/user/mo | ${formatUsd(blended)} |\n`;
  md += `| Variance | ${((blended - projectedBlended) / projectedBlended * 100).toFixed(1)}% |\n`;

  // Margin analysis
  const blendedRevenue = computeBlendedRevenue();
  md += `\n## Revenue Model\n\n`;
  md += `Apple commission: ${APPLE_COMMISSION * 100}% (Small Business Program)\n\n`;
  md += `| Offering | Monthly Net | Annual Net/mo | Mix Weight |\n`;
  md += `|----------|------------|--------------|------------|\n`;

  for (const [offeringKey, offering] of Object.entries(REVENUE_MODEL.offerings)) {
    const monthlyNet = offering.monthly ? netRevenue(offeringKey, 'monthly') : null;
    const annualNet = offering.annual ? netRevenue(offeringKey, 'annual') : null;
    const monthlyMix = REVENUE_MODEL.planMix[`${offeringKey}:monthly`] || 0;
    const annualMix = REVENUE_MODEL.planMix[`${offeringKey}:annual`] || 0;
    const totalMix = monthlyMix + annualMix;
    md += `| ${offeringKey} | ${monthlyNet !== null ? `$${monthlyNet.toFixed(2)}` : '—'} | ${annualNet !== null ? `$${annualNet.toFixed(2)}` : '—'} | ${totalMix > 0 ? `${(totalMix * 100).toFixed(0)}%` : '—'} |\n`;
  }

  md += `\n**Blended net revenue/mo:** $${blendedRevenue.toFixed(2)}\n`;

  md += `\n## Margin Analysis\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Blended net revenue | $${blendedRevenue.toFixed(2)}/mo |\n`;
  md += `| Blended LLM cost/user/mo | ${formatUsd(blended)} |\n`;
  md += `| Margin per user/mo | ${formatUsd(blendedRevenue - blended)} |\n`;
  md += `| Margin % | ${((1 - blended / blendedRevenue) * 100).toFixed(1)}% |\n`;
  md += `| Cost as % of revenue | ${(blended / blendedRevenue * 100).toFixed(2)}% |\n`;
  md += `| 1,000 users LLM cost/mo | ${formatUsd(blended * 1000)} |\n`;
  md += `| 10,000 users LLM cost/mo | ${formatUsd(blended * 10000)} |\n`;

  // Per-persona margin table
  md += `\n## Per-Persona Margin Analysis\n\n`;
  md += `| Persona | Subscription | Revenue/mo | LLM Cost/mo | Margin/mo | Margin % |\n`;
  md += `|---------|-------------|-----------|-------------|----------|----------|\n`;

  for (const pa of personaAnalysis) {
    const persona = PERSONAS.find(p => p.name === pa.name);
    const revenue = persona?.netRevenuePerMonth || 0;
    const margin = revenue - pa.monthlyProjection;
    const marginPct = revenue > 0 ? ((margin / revenue) * 100) : 0;
    const subLabel = persona?.subscriptionPlan
      ? `${persona.subscriptionPlan.offering}:${persona.subscriptionPlan.plan}${persona.subscriptionPlan.conversionRate ? ` (${(persona.subscriptionPlan.conversionRate * 100).toFixed(0)}% conv)` : ''}`
      : '—';
    md += `| ${pa.label} | ${subLabel} | $${revenue.toFixed(2)} | ${formatUsd(pa.monthlyProjection)} | $${margin.toFixed(2)} | ${marginPct.toFixed(1)}% |\n`;
  }

  return md;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const startTimestamp = isoTimestamp();
  const startMs = Date.now();

  const selectedPersonas = getSelectedPersonas();

  if (selectedPersonas.length === 0) {
    console.error(`${C.red}No matching personas found. Available: ${PERSONAS.map(p => p.name).join(', ')}${C.reset}`);
    process.exit(1);
  }

  const { plan, totalCalls, totalEstimatedCost } = buildSimulationPlan(selectedPersonas);

  // Print plan
  printSimulationPlan(plan, totalCalls, totalEstimatedCost);

  // Dry run exits here
  if (DRY_RUN) {
    console.log(`${C.dim}  Dry run complete. Remove DRY_RUN=true to execute.${C.reset}\n`);
    process.exit(0);
  }

  // Confirmation
  console.log(`${C.bold}${C.yellow}  Starting simulation in 3 seconds... (Ctrl+C to abort)${C.reset}\n`);
  await sleep(3000);

  // Run each persona sequentially
  const allPersonaResults = [];

  for (let i = 0; i < plan.length; i++) {
    const item = plan[i];
    const persona = item.persona;

    console.log(`\n${C.bold}${C.magenta}${'━'.repeat(60)}${C.reset}`);
    console.log(`${C.bold}${C.magenta}  [${i + 1}/${plan.length}] ${persona.label}${C.reset}`);
    console.log(`${C.bold}${C.magenta}${'━'.repeat(60)}${C.reset}`);

    if (budgetExceeded) {
      console.log(`  ${C.bgRed}${C.bold} BUDGET EXCEEDED — Skipping remaining personas ${C.reset}`);
      break;
    }

    const personaResult = await runPersona(item);
    allPersonaResults.push(personaResult);

    // Summary for this persona
    console.log(`\n    ${C.dim}━━━ ${persona.name} summary: ${personaResult.successCalls}/${personaResult.totalCalls} OK, ${formatMs(personaResult.totalLatencyMs)} total${C.reset}`);

    // Wait between personas (except last)
    if (i < plan.length - 1 && !budgetExceeded) {
      console.log(`\n    ${C.dim}Waiting 3s before next persona...${C.reset}`);
      await sleep(3000);
    }
  }

  // Wait for fire-and-forget DB writes
  console.log(`\n${C.bold}${C.yellow}  Waiting 5s for DB writes to settle...${C.reset}`);
  await sleep(5000);

  // Query usage logs
  const endTimestamp = isoTimestamp();
  console.log(`\n${C.bold}${C.cyan}  Querying llm_usage_logs...${C.reset}`);
  console.log(`  ${C.dim}Window: ${startTimestamp} → ${endTimestamp}${C.reset}`);

  const usageLogs = await queryUsageLogs(startTimestamp, endTimestamp);
  console.log(`  ${C.dim}Found ${usageLogs.length} log entries${C.reset}`);

  // Analyze results
  const personaAnalysis = analyzeUsageLogs(usageLogs, allPersonaResults);

  // Print results
  printResultsTable(personaAnalysis);
  printFunctionBreakdown(personaAnalysis);
  printMarginAnalysis(personaAnalysis);

  // Save reports
  const totalDurationMs = Date.now() - startMs;
  const simulationMeta = {
    timestamp: startTimestamp,
    endTimestamp,
    scale: SCALE,
    budget: MAX_BUDGET_USD,
    totalApiCalls: callStats.total,
    totalSuccess: callStats.success,
    totalFailed: callStats.failed,
    totalDurationMs,
    budgetExceeded,
    cumulativeCostEstimate,
  };

  const outputDir = path.join(__dirname, 'simulation-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ts = fileTimestamp();

  // JSON report
  const jsonReport = {
    meta: simulationMeta,
    personaAnalysis,
    usageLogs,
    callStats,
    rawPersonaResults: allPersonaResults,
  };
  const jsonPath = path.join(outputDir, `simulation-${ts}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));

  // Markdown report
  const mdReport = generateMarkdownReport(personaAnalysis, simulationMeta);
  const mdPath = path.join(outputDir, `simulation-${ts}.md`);
  fs.writeFileSync(mdPath, mdReport);

  // Print save locations
  console.log(`\n${C.bold}${C.cyan}${'='.repeat(70)}${C.reset}`);
  console.log(`${C.bold}${C.cyan}  SIMULATION COMPLETE${C.reset}`);
  console.log(`${C.bold}${C.cyan}${'='.repeat(70)}${C.reset}\n`);

  console.log(`  ${C.dim}Duration:${C.reset}    ${formatMs(totalDurationMs)}`);
  console.log(`  ${C.dim}API Calls:${C.reset}   ${callStats.total} (${C.green}${callStats.success} OK${C.reset}, ${callStats.failed > 0 ? C.red : C.dim}${callStats.failed} failed${C.reset})`);
  console.log(`  ${C.dim}Cost Est:${C.reset}    ${formatUsd(cumulativeCostEstimate)}`);
  console.log(`  ${C.dim}DB Logs:${C.reset}     ${usageLogs.length} entries`);
  console.log(`  ${C.dim}JSON:${C.reset}        ${jsonPath}`);
  console.log(`  ${C.dim}Markdown:${C.reset}    ${mdPath}`);
  console.log('');
}

main().catch(err => {
  console.error(`${C.red}${C.bold}Simulation failed:${C.reset} ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
