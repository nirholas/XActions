# Autonomous Space Agent

> Let AI agents join, listen, and speak in X/Twitter Spaces — powered by voice AI.

XActions integrates the [`xspace-agent`](https://github.com/nirholas/xspace-agent) SDK to enable AI agents to autonomously participate in live X Spaces. Agents can join a Space, transcribe other speakers in real time, generate intelligent responses with an LLM, and speak them back into the Space via text-to-speech.

## How It Works

```
┌──────────────────┐
│   X Space (live)  │
└────────┬─────────┘
         │  Puppeteer + headless browser
┌────────▼─────────┐
│ Join Space &      │  Authenticates → joins → requests speaker access
│ Capture Audio     │  Hooks WebRTC to capture PCM audio
└────────┬─────────┘
         │
   ┌─────┼─────┐
   │     │     │
   ▼     ▼     ▼
  STT   LLM   TTS
Whisper  Any   ElevenLabs
(Groq/  provider OpenAI
OpenAI)  ↓     Browser
         │
         ▼
  Agent speaks in Space
```

1. A headless Chromium browser logs into X with your session cookies
2. The browser joins the Space and requests speaker access
3. Audio from other speakers is captured via WebRTC and transcribed (Whisper STT)
4. Transcriptions are sent to your chosen LLM (OpenAI, Claude, or Groq) with a system prompt
5. The LLM response is converted to speech (ElevenLabs, OpenAI TTS, or browser TTS)
6. The synthesized audio is injected back into the Space via WebRTC

## Prerequisites

- **Node.js 18+**
- **X (Twitter) account** with access to Spaces
- **AI provider API key** — at least one of: OpenAI, Anthropic (Claude), or Groq
- **Optional:** ElevenLabs API key for high-quality TTS voices

## Installation

```bash
npm install xactions xspace-agent
```

`xspace-agent` is an optional peer dependency — it's only needed if you want to use the Space agent features.

## Authentication

The agent needs your X session cookies. Get them from your browser:

1. Open **x.com** and log in
2. Open DevTools (`F12` or `Cmd+Option+I`)
3. Go to **Application** > **Cookies** > `https://x.com`
4. Copy `auth_token` and `ct0`

```bash
export X_AUTH_TOKEN="your_auth_token_value"
export X_CT0="your_ct0_value"
```

## Quick Start

### Via MCP Server (Claude Desktop, Cursor, etc.)

If you already have XActions configured as an MCP server, the Space agent tools are available immediately:

```
"Join this Space as an AI agent: https://x.com/i/spaces/1abc..."
```

Claude will call the `x_space_join` tool and your agent will enter the Space.

### Via Node.js

```javascript
import { joinSpace, leaveSpace, getSpaceAgentStatus, getSpaceTranscript } from 'xactions/spaces/agent';

// Join a Space
const result = await joinSpace({
  url: 'https://x.com/i/spaces/1abc123',
  provider: 'openai',                    // or 'claude', 'groq'
  apiKey: process.env.OPENAI_API_KEY,
  systemPrompt: 'You are a helpful AI participant. Keep responses under 2 sentences.',
});
console.log(result);
// { success: true, message: '✅ Joined Space: ...', status: 'listening' }

// Check status
const status = getSpaceAgentStatus();
console.log(status);
// { active: true, duration: '120s', transcriptions: 15, responses: 3 }

// Get transcriptions
const transcript = getSpaceTranscript({ limit: 10 });
console.log(transcript.transcriptions);

// Leave the Space
const summary = await leaveSpace();
console.log(summary);
// { success: true, duration: '300s', transcriptions: 42, responses: 8 }
```

### Via CLI

```bash
# Join a Space with default settings (uses env vars)
xactions space join https://x.com/i/spaces/1abc123

# Join with a custom system prompt
xactions space join https://x.com/i/spaces/1abc123 \
  --provider claude \
  --system-prompt "You are a crypto analyst. Share concise market insights."
```

## MCP Tools Reference

| Tool | Description | Input |
|------|-------------|-------|
| `x_space_join` | Join a Space with an autonomous AI voice agent | `{ url, provider?, apiKey?, systemPrompt?, model?, voiceId?, headless? }` |
| `x_space_leave` | Leave the active Space and get session summary | `{}` |
| `x_space_status` | Get agent status (duration, transcription/response counts) | `{}` |
| `x_space_transcript` | Get recent transcriptions from the active Space | `{ limit? }` |
| `x_get_spaces` | Discover live or scheduled Spaces | `{ filter: 'live'\|'scheduled'\|'all', topic?, limit? }` |
| `x_scrape_space` | Scrape metadata from a specific Space | `{ url }` |

## Configuration

### `joinSpace()` Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | `string` | **required** | Space URL (e.g. `https://x.com/i/spaces/1abc123`) |
| `provider` | `string` | `'openai'` | LLM provider: `openai`, `claude`, `groq` |
| `apiKey` | `string` | from env | AI provider API key |
| `systemPrompt` | `string` | generic | Custom personality/behavior prompt |
| `model` | `string` | provider default | LLM model name (e.g. `gpt-4o`, `claude-sonnet-4-20250514`) |
| `voiceId` | `string` | provider default | TTS voice ID (for ElevenLabs or OpenAI) |
| `ttsProvider` | `string` | `'openai'` | TTS provider: `openai`, `elevenlabs`, `browser` |
| `sttProvider` | `string` | `'groq'` | STT provider: `groq`, `openai` |
| `headless` | `boolean` | `true` | Run browser in headless mode |
| `maxHistory` | `number` | — | Max conversation history messages for context |
| `silenceThreshold` | `number` | `1500` | Milliseconds of silence before finalizing audio chunk |
| `turnDelay` | `number` | — | Delay (ms) before agent responds after silence |
| `chromePath` | `string` | auto-detect | Path to Chrome/Chromium executable |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `X_AUTH_TOKEN` | X session cookie (`auth_token`) |
| `X_CT0` | X CSRF token (`ct0`) |
| `OPENAI_API_KEY` | OpenAI API key (LLM + STT + TTS) |
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude LLM) |
| `GROQ_API_KEY` | Groq API key (LLM + fast STT) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key (premium TTS) |
| `DEEPGRAM_API_KEY` | Deepgram API key (STT) |
| `XSPACE_AI_PROVIDER` | Default LLM provider (`openai`, `claude`, `groq`) |
| `XSPACE_SYSTEM_PROMPT` | Default system prompt for the agent |
| `XSPACE_TTS_PROVIDER` | Default TTS provider |
| `XSPACE_STT_PROVIDER` | Default STT provider |
| `XSPACE_VOICE_ID` | Default TTS voice ID |

## Events

The agent emits events you can listen to for logging, monitoring, or custom behavior:

| Event | Data | Description |
|-------|------|-------------|
| `transcription` | `{ speaker, text }` | Another speaker's audio was transcribed |
| `response` | `{ text }` | The agent generated and spoke a response |
| `status` | `string` | Agent lifecycle change (`launching`, `authenticating`, `joining`, `listening`, `speaking`) |
| `error` | `Error` | An error occurred |
| `space-ended` | — | The Space was closed by the host |

## What the Agent Can Do

- Join any live X Space (public or invite-only if your account has access)
- Request speaker access automatically (host must approve)
- Listen to and transcribe all speakers in real time
- Generate contextually relevant responses using your chosen LLM
- Speak responses aloud in the Space via TTS
- Track conversation context, sentiment, and topics
- Handle turn-taking and avoid interrupting speakers
- Leave gracefully when the Space ends or on command
- Report session metrics (transcription count, response count, duration)

## Limitations

- **One Space at a time** — the agent is a singleton; call `leaveSpace()` before joining another
- **Speaker access requires host approval** — the agent requests to speak but cannot force it
- **Cannot host Spaces** — hosting requires 600+ followers (X restriction)
- **Cannot record Spaces** — recording is controlled by the host
- **Audio quality depends on providers** — ElevenLabs gives the best TTS quality, Groq gives the fastest STT

## Example: Crypto Alpha Space Agent

```javascript
import { joinSpace } from 'xactions/spaces/agent';

await joinSpace({
  url: 'https://x.com/i/spaces/1abc123',
  provider: 'claude',
  apiKey: process.env.ANTHROPIC_API_KEY,
  systemPrompt: `You are a knowledgeable crypto market analyst participating in an X Space.
    - Share concise, data-driven insights
    - Reference on-chain metrics when relevant
    - Keep responses under 3 sentences
    - Be respectful of other speakers' opinions
    - If asked about price predictions, caveat with "not financial advice"`,
  model: 'claude-sonnet-4-20250514',
  ttsProvider: 'elevenlabs',
  voiceId: 'pNInz6obpgDQGcFmaJgB',  // ElevenLabs "Adam" voice
});
```

## Example: Multi-Agent Debate

Using the `xspace-agent` SDK directly, you can coordinate multiple AI agents in a single Space:

```javascript
import { AgentTeam } from 'xspace-agent';

const team = new AgentTeam({
  auth: { token: process.env.X_AUTH_TOKEN, ct0: process.env.X_CT0 },
  agents: [
    {
      name: 'Optimist',
      ai: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        systemPrompt: 'You always see the positive side of technology trends.',
      },
    },
    {
      name: 'Skeptic',
      ai: {
        provider: 'claude',
        apiKey: process.env.ANTHROPIC_API_KEY,
        systemPrompt: 'You question hype and push for evidence-based reasoning.',
      },
    },
  ],
});

await team.join('https://x.com/i/spaces/1abc123');
```

## Related Resources

- [`xspace-agent` SDK docs](https://github.com/nirholas/xspace-agent) — full SDK reference
- [Spaces & Live Audio examples](docs/examples/spaces-live-audio.md) — scraping and metadata
- [MCP Setup Guide](docs/mcp-setup.md) — configure the MCP server
- [Spaces skill](skills/spaces-live/SKILL.md) — browser-based Spaces interaction
