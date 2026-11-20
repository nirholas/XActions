# Tutorial: Autonomous AI Voice Agent in X Spaces with Claude

You are my X/Twitter Spaces voice agent expert. I want to use XActions to deploy AI agents that can autonomously join live X Spaces, listen to conversations, and speak with real-time voice AI. Help me set up, configure, and run Space agents.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit that integrates the `xspace-agent` SDK. This lets AI agents participate in X Spaces with full voice capabilities — transcription, LLM reasoning, and text-to-speech — all running locally via a headless browser.

## What I Need You To Do

### Part 1: Understanding the Space Agent

Explain the architecture and capabilities:

1. **How the agent works:**
   - Launches a headless Chromium browser via Puppeteer
   - Authenticates with X using session cookies
   - Joins a live Space and requests speaker access
   - Captures audio from other speakers via WebRTC
   - Transcribes speech using Whisper STT (via Groq or OpenAI)
   - Sends transcriptions to an LLM (OpenAI, Claude, or Groq) with a system prompt
   - Converts the LLM response to speech via TTS (ElevenLabs, OpenAI, or browser)
   - Injects the synthesized audio back into the Space

2. **What the agent can do:**
   - Join any public live Space
   - Request speaker access (host must approve)
   - Listen to and transcribe all speakers in real time
   - Generate contextually relevant responses
   - Speak aloud in the Space
   - Track conversation context and sentiment
   - Handle turn-taking without interrupting
   - Leave gracefully on command or when the Space ends

3. **Limitations:**
   - One Space at a time (singleton agent)
   - Cannot host Spaces (X requires 600+ followers)
   - Cannot force speaker access (host must approve)
   - Cannot record Spaces (host-controlled)

### Part 2: Setup & Authentication

Walk me through the complete setup:

1. **Install dependencies:**
   ```bash
   npm install xactions xspace-agent
   ```

2. **Get X session cookies:**
   - Open x.com in your browser and log in
   - Open DevTools (F12 or Cmd+Option+I)
   - Go to Application > Cookies > https://x.com
   - Copy the `auth_token` and `ct0` values

3. **Set environment variables:**
   ```bash
   # Required: X authentication
   export X_AUTH_TOKEN="your_auth_token_value"
   export X_CT0="your_ct0_value"

   # Required: At least one AI provider
   export OPENAI_API_KEY="sk-..."           # For OpenAI (LLM + STT + TTS)
   export ANTHROPIC_API_KEY="sk-ant-..."    # For Claude (LLM only)
   export GROQ_API_KEY="gsk_..."            # For Groq (LLM + fast STT)

   # Optional: Premium voice
   export ELEVENLABS_API_KEY="..."          # High-quality TTS voices
   export DEEPGRAM_API_KEY="..."            # Alternative STT
   ```

4. **Verify the setup:**
   - Confirm `xspace-agent` is installed: `npm list xspace-agent`
   - Confirm cookies are valid (they expire — refresh if needed)
   - Test your AI API key with a simple request

### Part 3: Joining a Space via MCP

If XActions is configured as an MCP server (Claude Desktop, Cursor, etc.):

1. **Find a Space to join:**
   ```
   "Find live X Spaces about AI"
   ```
   This calls `x_get_spaces` with `filter: 'live'` and `topic: 'AI'`.

2. **Join a Space:**
   ```
   "Join this Space as an AI agent: https://x.com/i/spaces/1abc123"
   ```
   This calls `x_space_join`. The agent launches a headless browser, logs in, joins the Space, and starts listening.

3. **Check agent status:**
   ```
   "What's the status of my Space agent?"
   ```
   Returns duration, transcription count, response count, and recent events.

4. **Read the transcript:**
   ```
   "Show me the last 20 transcriptions from the Space"
   ```

5. **Leave the Space:**
   ```
   "Leave the Space and show me the session summary"
   ```
   Returns total duration, number of transcriptions, and number of responses.

### Part 4: Joining a Space via Node.js

For programmatic control:

```javascript
import { joinSpace, leaveSpace, getSpaceAgentStatus, getSpaceTranscript } from 'xactions/spaces';

// Join with full configuration
const result = await joinSpace({
  url: 'https://x.com/i/spaces/1abc123',
  provider: 'openai',                     // LLM: 'openai', 'claude', 'groq'
  apiKey: process.env.OPENAI_API_KEY,
  systemPrompt: `You are a knowledgeable AI participant in an X Space.
    Listen carefully and respond concisely. Add value to the conversation.
    Keep responses under 2 sentences.`,
  model: 'gpt-4o',                        // Optional: specific model
  ttsProvider: 'elevenlabs',              // Optional: 'openai', 'elevenlabs', 'browser'
  voiceId: 'pNInz6obpgDQGcFmaJgB',       // Optional: ElevenLabs voice ID
  headless: true,                          // Run browser headlessly
});

console.log(result);
// { success: true, message: '✅ Joined Space', status: 'listening', provider: 'openai' }

// Monitor the agent
setInterval(() => {
  const status = getSpaceAgentStatus();
  console.log(`Duration: ${status.duration}, Transcriptions: ${status.transcriptions}, Responses: ${status.responses}`);
}, 30000);

// Get transcript on demand
const transcript = getSpaceTranscript({ limit: 20 });
transcript.transcriptions.forEach(t => {
  console.log(`[${t.speaker}]: ${t.text}`);
});

// Leave when done
const summary = await leaveSpace();
console.log(`Session: ${summary.duration}, ${summary.transcriptions} heard, ${summary.responses} spoken`);
```

### Part 5: Configuring the AI Provider

Walk me through choosing and configuring different providers:

1. **OpenAI (default — best all-rounder):**
   ```javascript
   await joinSpace({
     url: spaceUrl,
     provider: 'openai',
     apiKey: process.env.OPENAI_API_KEY,
     model: 'gpt-4o',         // Fast and capable
   });
   ```
   - Handles LLM + STT (Whisper) + TTS in one provider
   - Best for: general-purpose agents

2. **Claude (best reasoning):**
   ```javascript
   await joinSpace({
     url: spaceUrl,
     provider: 'claude',
     apiKey: process.env.ANTHROPIC_API_KEY,
     model: 'claude-sonnet-4-20250514',
   });
   ```
   - LLM only — needs separate STT and TTS providers
   - Best for: nuanced, thoughtful responses

3. **Groq (fastest):**
   ```javascript
   await joinSpace({
     url: spaceUrl,
     provider: 'groq',
     apiKey: process.env.GROQ_API_KEY,
   });
   ```
   - Very fast LLM + fast Whisper STT
   - Best for: low-latency conversational agents

4. **Mix and match providers:**
   ```javascript
   await joinSpace({
     url: spaceUrl,
     provider: 'claude',                  // LLM
     apiKey: process.env.ANTHROPIC_API_KEY,
     sttProvider: 'groq',                  // Fast transcription
     ttsProvider: 'elevenlabs',            // Premium voice
   });
   ```

### Part 6: Crafting System Prompts

The system prompt defines the agent's personality and behavior. Help me write effective prompts:

1. **Generic helpful assistant:**
   ```
   You are a friendly and knowledgeable AI assistant participating in an X Space.
   Listen carefully to what others say. Respond concisely and add value.
   Keep responses under 2 sentences. Be respectful of other speakers.
   ```

2. **Crypto market analyst:**
   ```
   You are a crypto market analyst participating in an X Space.
   Share concise, data-driven insights about crypto markets.
   Reference on-chain metrics when relevant.
   Keep responses under 3 sentences.
   Always caveat price predictions with "not financial advice."
   ```

3. **Tech podcast co-host:**
   ```
   You are a tech industry expert co-hosting an X Space.
   Share opinions on tech trends, startups, and AI developments.
   Ask follow-up questions to keep the conversation flowing.
   Use a conversational tone. Keep responses under 3 sentences.
   ```

4. **Community moderator:**
   ```
   You are a community moderator in this X Space.
   Welcome new speakers. Summarize key points when asked.
   Keep the conversation on topic. Be neutral and inclusive.
   If someone asks a question nobody answers, provide a helpful response.
   ```

5. **Debate participant:**
   ```
   You represent the skeptical perspective in this discussion.
   Question assumptions and push for evidence-based reasoning.
   Be respectful but direct. Acknowledge good points from others.
   Keep responses focused and under 3 sentences.
   ```

### Part 7: Voice Configuration

Walk me through choosing the right voice for the agent:

1. **ElevenLabs (highest quality):**
   ```javascript
   await joinSpace({
     url: spaceUrl,
     ttsProvider: 'elevenlabs',
     voiceId: 'pNInz6obpgDQGcFmaJgB',  // "Adam" — clear male voice
   });
   ```
   - Requires `ELEVENLABS_API_KEY`
   - Most natural-sounding voices
   - Many voice options and custom voice cloning

2. **OpenAI TTS:**
   ```javascript
   await joinSpace({
     url: spaceUrl,
     ttsProvider: 'openai',
     voiceId: 'nova',   // Options: alloy, echo, fable, onyx, nova, shimmer
   });
   ```
   - Uses your existing OpenAI API key
   - Good quality, six built-in voices

3. **Browser TTS (free, no API key):**
   ```javascript
   await joinSpace({
     url: spaceUrl,
     ttsProvider: 'browser',
   });
   ```
   - Uses the browser's built-in speech synthesis
   - Lower quality but completely free

### Part 8: Behavior Tuning

Fine-tune how the agent listens and responds:

1. **Silence threshold** — how long to wait after someone stops speaking before processing:
   ```javascript
   await joinSpace({
     url: spaceUrl,
     silenceThreshold: 1500,  // 1.5 seconds (default)
   });
   ```
   - Lower (800ms): Agent responds faster, may cut people off
   - Higher (3000ms): Agent waits longer, less likely to interrupt

2. **Turn delay** — extra pause before the agent starts speaking:
   ```javascript
   await joinSpace({
     url: spaceUrl,
     turnDelay: 500,   // 500ms pause before responding
   });
   ```

3. **Conversation history** — how much context the LLM receives:
   ```javascript
   await joinSpace({
     url: spaceUrl,
     maxHistory: 20,   // Last 20 messages as context
   });
   ```
   - More history = better context but higher token cost
   - Less history = cheaper but may miss context

### Part 9: Multi-Agent Setup

For advanced use cases, deploy multiple AI agents with different personalities using the `xspace-agent` SDK directly:

```javascript
import { AgentTeam } from 'xspace-agent';

const team = new AgentTeam({
  auth: {
    token: process.env.X_AUTH_TOKEN,
    ct0: process.env.X_CT0,
  },
  agents: [
    {
      name: 'Optimist',
      ai: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        systemPrompt: 'You always see the positive side of technology trends. Be enthusiastic but grounded.',
      },
    },
    {
      name: 'Skeptic',
      ai: {
        provider: 'claude',
        apiKey: process.env.ANTHROPIC_API_KEY,
        systemPrompt: 'You question hype and push for evidence. Be respectful but critical.',
      },
    },
  ],
});

await team.join('https://x.com/i/spaces/1abc123');
```

This creates a multi-agent debate where each agent has a distinct personality and LLM provider.

### Part 10: MCP Tools Reference

Complete reference for all Space-related MCP tools:

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `x_space_join` | Join a Space with an AI voice agent | `url` (required), `provider`, `apiKey`, `systemPrompt`, `model`, `voiceId`, `headless` |
| `x_space_leave` | Leave the active Space | None |
| `x_space_status` | Get agent status | None |
| `x_space_transcript` | Get recent transcriptions | `limit` (default: 50) |
| `x_get_spaces` | Discover live/scheduled Spaces | `filter` (live/scheduled/all), `topic`, `limit` |
| `x_scrape_space` | Scrape Space metadata | `url` |

### Part 11: Monitoring & Debugging

Help me monitor and troubleshoot my Space agent:

1. **Check if the agent is active:**
   ```
   "What's the status of my Space agent?"
   ```

2. **Watch the transcript in real time:**
   ```
   "Show me the latest transcriptions from the Space"
   ```

3. **Common issues:**
   - **"xspace-agent is not installed"** — Run `npm install xspace-agent`
   - **"X_AUTH_TOKEN is required"** — Set your session cookies (they expire, refresh from browser)
   - **"An agent is already active"** — Call `leaveSpace()` before joining another
   - **Agent joins but doesn't speak** — Host hasn't approved speaker request yet
   - **Poor transcription quality** — Try switching STT provider (Groq is fastest, OpenAI is most accurate)
   - **High latency responses** — Switch to Groq for LLM, reduce `maxHistory`

4. **Event logging:**
   The agent logs events to the console:
   - `🎙️ [Speaker]: text` — Someone spoke and was transcribed
   - `🤖 Agent: text` — The agent generated and spoke a response
   - `🔄 Agent status: ...` — Lifecycle change
   - `❌ Agent error: ...` — Something went wrong
   - `📡 Space has ended` — The host closed the Space

### Part 12: Best Practices

1. **Start as a listener** — Let the agent listen for 30-60 seconds before it starts responding to understand the conversation context
2. **Keep responses short** — 1-2 sentences works best in live audio; long responses lose the audience
3. **Use a clear system prompt** — Define the agent's role, tone, and topic boundaries explicitly
4. **Choose the right voice** — ElevenLabs for professional settings, OpenAI TTS for casual, browser TTS for testing
5. **Monitor the agent** — Check status and transcript periodically to ensure quality
6. **Be transparent** — Consider having the agent identify itself as AI when it first speaks
7. **Respect rate limits** — Don't rapidly join and leave Spaces; X may flag the account
8. **Rotate cookies** — Session cookies expire; check and refresh them regularly
9. **Test in small Spaces first** — Join a Space with a few listeners before deploying to large audiences
10. **Have a shutdown plan** — Always be ready to call `leaveSpace()` if the agent misbehaves

## My Space Agent Goals

(Replace before pasting)
- What kind of Spaces do I want to join? TOPIC_OR_NICHE
- What role should the agent play? ROLE (e.g., expert, moderator, co-host)
- Which AI provider do I prefer? PROVIDER (openai, claude, groq)
- Do I need premium voice quality? YES/NO
- Am I running via MCP, Node.js, or CLI? RUNTIME

Start with Part 2 — help me get authenticated and join my first Space with an AI agent.
