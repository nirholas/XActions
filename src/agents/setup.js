#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions — Agent Setup Wizard
// Interactive first-time configuration for the Thought Leader Agent
// by nichxbt

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { BrowserDriver } from './browserDriver.js';

const DATA_DIR = path.resolve('data');
const CONFIG_DIR = path.resolve('config');
const CONFIG_OUT = path.resolve(DATA_DIR, 'agent-config.json');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));
const log = (msg) => console.log(msg);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Helpers ────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => ({
    name: f.replace('.json', ''),
    path: path.join(dir, f),
  }));
}

function loadJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

async function choose(prompt, options) {
  log('');
  log(prompt);
  options.forEach((opt, i) => log(`  ${i + 1}. ${opt.label}`));
  const answer = await ask(`\nChoice [1-${options.length}]: `);
  const idx = parseInt(answer, 10) - 1;
  if (idx >= 0 && idx < options.length) return options[idx];
  log('⚠️ Invalid choice, using first option.');
  return options[0];
}

// ─── Steps ──────────────────────────────────────────────────────

async function step1_niche() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  📌 Step 1/8: Select Your Niche');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const niches = listJsonFiles(path.join(CONFIG_DIR, 'niches'));
  const options = niches.map((n) => ({ label: n.name.replace(/-/g, ' '), value: n }));
  options.push({ label: 'Create custom niche', value: null });

  const choice = await choose('Select a pre-built niche or create your own:', options);

  if (choice.value) {
    return loadJson(choice.value.path);
  }

  // Custom niche
  const name = await ask('Niche name (e.g., "AI Engineering"): ');
  const termsRaw = await ask('Search terms (comma-separated): ');
  const influencersRaw = await ask('Influencer handles (comma-separated, no @): ');
  const keywordsRaw = await ask('Keywords (comma-separated): ');

  return {
    name: name.trim() || 'Custom',
    searchTerms: termsRaw.split(',').map((s) => s.trim()).filter(Boolean),
    influencers: influencersRaw.split(',').map((s) => s.trim().replace('@', '')).filter(Boolean),
    keywords: keywordsRaw.split(',').map((s) => s.trim()).filter(Boolean),
    topics: [],
    hashtagsToFollow: [],
  };
}

async function step2_persona() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  🎭 Step 2/8: Select Your Persona');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const personas = listJsonFiles(path.join(CONFIG_DIR, 'personas'));
  const options = personas.map((p) => ({ label: p.name.replace(/-/g, ' '), value: p }));
  options.push({ label: 'Create custom persona', value: null });

  const choice = await choose('Select a persona template:', options);

  if (choice.value) {
    const persona = loadJson(choice.value.path);
    const handle = await ask(`Your X handle (e.g., @yourname): `);
    persona.handle = handle.trim();
    return persona;
  }

  const name = await ask('Persona name: ');
  const handle = await ask('X handle (e.g., @yourname): ');
  const tone = await ask('Tone (e.g., "curious, witty, technical"): ');
  const expertiseRaw = await ask('Expertise areas (comma-separated): ');
  const opinionsRaw = await ask('Key opinions (comma-separated): ');
  const avoidRaw = await ask('Things to avoid (comma-separated): ');

  return {
    name: name.trim() || 'Agent',
    handle: handle.trim(),
    tone: tone.trim() || 'knowledgeable and approachable',
    expertise: expertiseRaw.split(',').map((s) => s.trim()).filter(Boolean),
    opinions: opinionsRaw.split(',').map((s) => s.trim()).filter(Boolean),
    avoid: avoidRaw.split(',').map((s) => s.trim()).filter(Boolean),
    exampleTweets: [],
    replyStyles: { question: 20, agreement: 30, insight: 30, humor: 15, pushback: 5 },
  };
}

async function step3_llmProvider() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  🧠 Step 3/8: Configure LLM Provider');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const choice = await choose('Select your LLM provider:', [
    { label: 'OpenRouter (recommended — multi-model, best pricing)', value: 'openrouter' },
    { label: 'OpenAI (direct API)', value: 'openai' },
    { label: 'Ollama (local, no cost)', value: 'ollama' },
  ]);

  const provider = choice.value;
  let apiKey = '';
  let models = {
    fast: 'deepseek/deepseek-chat',
    mid: 'anthropic/claude-3.5-haiku',
    smart: 'anthropic/claude-sonnet-4',
  };

  if (provider !== 'ollama') {
    apiKey = await ask(`API key for ${provider}: `);

    // Validate API key with a test call
    if (apiKey) {
      log('  🔄 Validating API key...');
      try {
        const { LLMBrain } = await import('./llmBrain.js');
        const brain = new LLMBrain({ provider, apiKey, models });
        const score = await brain.scoreRelevance('Testing connection', ['test']);
        log(`  ✅ API key valid (test score: ${score})`);
      } catch (err) {
        log(`  ⚠️ Validation failed: ${err.message}`);
        log('  You can update the key later in data/agent-config.json');
      }
    }
  } else {
    models = {
      fast: 'llama3.2:3b',
      mid: 'llama3.2:3b',
      smart: 'llama3.1:8b',
    };
  }

  return { provider, apiKey, models };
}

async function step4_timezone() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  🕐 Step 4/8: Set Timezone');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const choice = await choose('Select your timezone:', [
    { label: 'US Eastern (New York)', value: 'America/New_York' },
    { label: 'US Central (Chicago)', value: 'America/Chicago' },
    { label: 'US Pacific (Los Angeles)', value: 'America/Los_Angeles' },
    { label: 'UK (London)', value: 'Europe/London' },
    { label: 'EU Central (Berlin)', value: 'Europe/Berlin' },
    { label: 'Custom (enter manually)', value: null },
  ]);

  if (choice.value) return choice.value;
  const tz = await ask('Enter IANA timezone (e.g., Asia/Tokyo): ');
  return tz.trim() || 'America/New_York';
}

async function step5_intensity() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  ⚡ Step 5/8: Activity Intensity');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const choice = await choose('How aggressive should the agent be?', [
    { label: 'Gentle — 50 likes, 20 follows, 5 comments/day (safe for new accounts)', value: 'gentle' },
    { label: 'Normal — 150 likes, 80 follows, 25 comments/day (recommended)', value: 'normal' },
    { label: 'Active — 250 likes, 120 follows, 40 comments/day', value: 'active' },
    { label: 'Grind — 400 likes, 200 follows, 60 comments/day (risky)', value: 'grind' },
  ]);

  const limits = {
    gentle: { dailyLikes: 50, dailyFollows: 20, dailyComments: 5, dailyPosts: 2 },
    normal: { dailyLikes: 150, dailyFollows: 80, dailyComments: 25, dailyPosts: 5 },
    active: { dailyLikes: 250, dailyFollows: 120, dailyComments: 40, dailyPosts: 8 },
    grind: { dailyLikes: 400, dailyFollows: 200, dailyComments: 60, dailyPosts: 12 },
  };

  return limits[choice.value] || limits.normal;
}

async function step6_login() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  🔑 Step 6/8: X.com Login');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const answer = await ask('Open browser for X.com login now? [Y/n]: ');
  if (answer.toLowerCase() === 'n') {
    log('  ℹ️ Skipped. Run with --login later to authenticate.');
    return false;
  }

  log('  🌐 Opening browser... Log in to X.com manually.');

  const driver = new BrowserDriver({ headless: false, sessionPath: 'data/session.json' });
  try {
    await driver.launch();
    await driver.navigate('https://x.com/login');
    log('  👉 Complete the login in the browser, then press Enter here...');
    await ask('');
    await driver.saveSession();
    const loggedIn = await driver.isLoggedIn();
    if (loggedIn) {
      log('  ✅ Login successful! Session saved.');
    } else {
      log('  ⚠️ Login validation failed. Session saved anyway — you can retry later.');
    }
    await driver.close();
    return loggedIn;
  } catch (err) {
    log(`  ❌ Login error: ${err.message}`);
    log('  You can retry with: node src/agents/thoughtLeaderAgent.js --login');
    await driver.close().catch(() => {});
    return false;
  }
}

async function step7_testRun(config) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  🧪 Step 7/8: Test Run');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const answer = await ask('Run a 2-minute test? [Y/n]: ');
  if (answer.toLowerCase() === 'n') {
    log('  ℹ️ Skipped.');
    return;
  }

  log('  🔄 Starting 2-minute test...');

  try {
    const { ThoughtLeaderAgent } = await import('./thoughtLeaderAgent.js');
    const agent = new ThoughtLeaderAgent(config);

    // Auto-stop after 2 minutes
    const timer = setTimeout(async () => {
      await agent.stop();
    }, 2 * 60 * 1000);

    await agent.start();
    clearTimeout(timer);
    log('  ✅ Test completed successfully!');
  } catch (err) {
    log(`  ⚠️ Test error: ${err.message}`);
    log('  The config is saved — you can debug and re-run.');
  }
}

async function step8_summary(config) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  ✅ Step 8/8: Setup Complete!');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('');
  log(`  Config saved to: ${CONFIG_OUT}`);
  log(`  Niche: ${config.niche.name}`);
  log(`  Persona: ${config.persona.name}`);
  log(`  LLM: ${config.llm.provider}`);
  log(`  Timezone: ${config.schedule.timezone}`);
  log(`  Limits: ${config.limits.dailyLikes} likes, ${config.limits.dailyFollows} follows, ${config.limits.dailyComments} comments/day`);
  log('');
  log('  ┌──────────────────────────────────────────┐');
  log('  │  Quick Start Commands                     │');
  log('  ├──────────────────────────────────────────┤');
  log('  │  Login:     node src/agents/thoughtLeaderAgent.js --login    │');
  log('  │  Test:      node src/agents/thoughtLeaderAgent.js --test     │');
  log('  │  Start:     node src/agents/thoughtLeaderAgent.js            │');
  log('  │  Edit:      nano data/agent-config.json                      │');
  log('  └──────────────────────────────────────────┘');
  log('');
}

// ─── Main ───────────────────────────────────────────────────────

async function run() {
  log('');
  log('⚡ XActions Thought Leader Agent — Setup Wizard');
  log('═══════════════════════════════════════════════');
  log('');

  ensureDir(DATA_DIR);

  // Check for existing config
  if (fs.existsSync(CONFIG_OUT)) {
    const answer = await ask('⚠️ Existing config found. Overwrite? [y/N]: ');
    if (answer.toLowerCase() !== 'y') {
      log('Kept existing config. Exiting setup.');
      rl.close();
      return;
    }
  }

  // Run all steps
  const niche = await step1_niche();
  const persona = await step2_persona();
  const llm = await step3_llmProvider();
  const timezone = await step4_timezone();
  const limits = await step5_intensity();
  const loggedIn = await step6_login();

  // Assemble config
  const config = {
    niche,
    persona,
    llm,
    schedule: { timezone, sleepHours: [23, 6] },
    limits,
    browser: { headless: true, sessionPath: 'data/session.json' },
  };

  // Save config
  ensureDir(DATA_DIR);
  fs.writeFileSync(CONFIG_OUT, JSON.stringify(config, null, 2));
  log(`\n💾 Config saved to ${CONFIG_OUT}`);

  // Optional test run
  if (loggedIn) {
    await step7_testRun(config);
  }

  await step8_summary(config);

  rl.close();
}

// Run if executed directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('setup.js') || process.argv[1].endsWith('setup')
);

if (isMain) {
  run().catch((err) => {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  });
}

export { run as runSetup };
