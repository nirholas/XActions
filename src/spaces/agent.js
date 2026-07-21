// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions — X Space Agent Integration
 * 
 * Wraps the xspace-agent SDK to let AI agents autonomously join,
 * listen, and speak in X/Twitter Spaces via voice.
 * 
 * Requires: npm install xspace-agent (optional dependency)
 * 
 * Environment Variables:
 *   X_AUTH_TOKEN      — X/Twitter auth token (from browser cookies)
 *   X_CT0             — X/Twitter ct0 cookie
 *   OPENAI_API_KEY    — For LLM + STT + TTS (default provider)
 *   ANTHROPIC_API_KEY — For Claude as LLM provider
 *   GROQ_API_KEY      — For Groq as LLM provider
 *   ELEVENLABS_API_KEY — For ElevenLabs TTS
 *   DEEPGRAM_API_KEY  — For Deepgram STT
 * 
 * @author nich (@nichxbt)
 * @license MIT
 */

// Singleton agent instance — only one Space at a time
let activeAgent = null;
let XSpaceAgent = null;

/**
 * Lazily loads the xspace-agent SDK.
 * Throws a helpful error if the package isn't installed.
 */
async function loadSDK() {
  if (XSpaceAgent) return;
  try {
    const mod = await import('xspace-agent');
    XSpaceAgent = mod.XSpaceAgent;
  } catch {
    throw new Error(
      '❌ xspace-agent is not installed. Run: npm install xspace-agent\n' +
      'See: https://github.com/nirholas/xspace-agent'
    );
  }
}

/**
 * Builds agent config from user args + environment variables.
 */
function buildConfig(args = {}) {
  const authToken = args.authToken || process.env.X_AUTH_TOKEN || process.env.XACTIONS_SESSION_COOKIE;
  const ct0 = args.ct0 || process.env.X_CT0;

  if (!authToken) {
    throw new Error('❌ X_AUTH_TOKEN (or XACTIONS_SESSION_COOKIE) is required. Get it from your browser cookies on x.com.');
  }

  const aiProvider = args.provider || process.env.XSPACE_AI_PROVIDER || 'openai';
  const aiApiKey = args.apiKey
    || process.env.OPENAI_API_KEY
    || process.env.ANTHROPIC_API_KEY
    || process.env.GROQ_API_KEY;

  if (!aiApiKey) {
    throw new Error('❌ An AI API key is required (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GROQ_API_KEY).');
  }

  const systemPrompt = args.systemPrompt
    || process.env.XSPACE_SYSTEM_PROMPT
    || 'You are a knowledgeable and engaging AI participant in an X Space. Listen carefully, respond concisely, and add value to the conversation.';

  const config = {
    auth: {
      token: authToken,
      ...(ct0 ? { ct0 } : {}),
    },
    ai: {
      provider: aiProvider,
      apiKey: aiApiKey,
      systemPrompt,
      ...(args.model ? { model: args.model } : {}),
      ...(args.maxHistory ? { maxHistory: args.maxHistory } : {}),
    },
    browser: {
      headless: args.headless !== false,
      ...(args.chromePath ? { executablePath: args.chromePath } : {}),
    },
  };

  // Voice config (optional)
  const ttsProvider = args.ttsProvider || process.env.XSPACE_TTS_PROVIDER;
  const sttProvider = args.sttProvider || process.env.XSPACE_STT_PROVIDER;
  const voiceId = args.voiceId || process.env.XSPACE_VOICE_ID;

  if (ttsProvider || sttProvider || voiceId) {
    config.voice = {};
    if (ttsProvider) config.voice.provider = ttsProvider;
    if (sttProvider) config.voice.sttProvider = sttProvider;
    if (voiceId) config.voice.voiceId = voiceId;
    if (args.ttsApiKey || process.env.ELEVENLABS_API_KEY) {
      config.voice.apiKey = args.ttsApiKey || process.env.ELEVENLABS_API_KEY;
    }
  }

  // Behavior config (optional)
  if (args.silenceThreshold || args.turnDelay) {
    config.behavior = {};
    if (args.silenceThreshold) config.behavior.silenceThreshold = args.silenceThreshold;
    if (args.turnDelay) config.behavior.turnDelay = args.turnDelay;
  }

  return config;
}

/**
 * Join an X Space with an AI agent.
 * 
 * @param {object} args
 * @param {string} args.url — Space URL (e.g. https://x.com/i/spaces/abc123)
 * @param {string} [args.provider] — AI provider: openai, claude, groq
 * @param {string} [args.apiKey] — AI provider API key
 * @param {string} [args.systemPrompt] — Custom system prompt
 * @param {string} [args.model] — LLM model name
 * @param {string} [args.voiceId] — TTS voice ID
 * @param {string} [args.ttsProvider] — TTS provider: openai, elevenlabs
 * @param {string} [args.sttProvider] — STT provider: openai, deepgram, groq
 * @param {boolean} [args.headless] — Run browser headless (default: true)
 * @returns {Promise<object>} Join result with status
 */
export async function joinSpace(args = {}) {
  if (!args.url) {
    throw new Error('❌ Space URL is required (e.g. https://x.com/i/spaces/abc123)');
  }

  if (activeAgent) {
    throw new Error('⚠️ An agent is already active in a Space. Call leaveSpace() first.');
  }

  await loadSDK();

  const config = buildConfig(args);
  const agent = new XSpaceAgent(config);

  // Wire up event forwarding for logging
  const events = [];
  agent.on('transcription', (data) => {
    events.push({ type: 'transcription', ...data, timestamp: Date.now() });
    console.log(`🎙️ [${data.speaker || 'unknown'}]: ${data.text}`);
  });
  agent.on('response', (data) => {
    events.push({ type: 'response', ...data, timestamp: Date.now() });
    console.log(`🤖 Agent: ${data.text}`);
  });
  agent.on('status', (status) => {
    console.log(`🔄 Agent status: ${status}`);
  });
  agent.on('error', (err) => {
    console.error(`❌ Agent error: ${err.message}`);
  });
  agent.on('space-ended', () => {
    console.log('📡 Space has ended');
    activeAgent = null;
  });

  await agent.join(args.url);
  activeAgent = { agent, url: args.url, joinedAt: Date.now(), events };

  return {
    success: true,
    message: `✅ Joined Space: ${args.url}`,
    url: args.url,
    provider: config.ai.provider,
    status: 'listening',
  };
}

/**
 * Leave the currently active Space.
 * @returns {Promise<object>} Leave result
 */
export async function leaveSpace() {
  if (!activeAgent) {
    return { success: false, message: '⚠️ No active Space agent to leave.' };
  }

  const { agent, url, joinedAt, events } = activeAgent;
  await agent.leave();
  activeAgent = null;

  const duration = Math.round((Date.now() - joinedAt) / 1000);

  return {
    success: true,
    message: `✅ Left Space: ${url}`,
    url,
    duration: `${duration}s`,
    transcriptions: events.filter(e => e.type === 'transcription').length,
    responses: events.filter(e => e.type === 'response').length,
  };
}

/**
 * Get the status of the currently active Space agent.
 * @returns {object} Current agent status
 */
export function getSpaceAgentStatus() {
  if (!activeAgent) {
    return { active: false, message: 'No active Space agent.' };
  }

  const { agent, url, joinedAt, events } = activeAgent;
  const duration = Math.round((Date.now() - joinedAt) / 1000);

  return {
    active: true,
    url,
    status: agent.status || agent.getStatus?.() || 'active',
    duration: `${duration}s`,
    transcriptions: events.filter(e => e.type === 'transcription').length,
    responses: events.filter(e => e.type === 'response').length,
    recentEvents: events.slice(-10),
  };
}

/**
 * Get recent transcriptions from the active Space.
 * @param {object} [args]
 * @param {number} [args.limit] — Max transcriptions to return (default: 50)
 * @returns {object} Transcription data
 */
export function getSpaceTranscript(args = {}) {
  if (!activeAgent) {
    return { success: false, message: 'No active Space agent.' };
  }

  const limit = args.limit || 50;
  const transcriptions = activeAgent.events
    .filter(e => e.type === 'transcription')
    .slice(-limit);

  return {
    success: true,
    url: activeAgent.url,
    count: transcriptions.length,
    transcriptions,
  };
}

export default {
  joinSpace,
  leaveSpace,
  getSpaceAgentStatus,
  getSpaceTranscript,
};
