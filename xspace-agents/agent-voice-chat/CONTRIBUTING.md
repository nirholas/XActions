# Contributing to agent-voice-chat

Thanks for your interest in contributing! This guide covers development setup, code style, and how to submit changes.

## Development Setup

### Prerequisites

- Node.js 18+
- npm
- A microphone (for testing voice features)
- API key for at least one provider (OpenAI, Anthropic, or Groq)

### Getting Started

```bash
git clone https://github.com/anthropics/agent-voice-chat.git
cd agent-voice-chat
npm install
cp .env.example .env   # Add your API keys
npm run dev             # Starts with nodemon (auto-reload)
```

The dev server runs on `http://localhost:3000` with auto-reload on file changes.

### Project Structure

```
server.js                 # Express + Socket.IO server
agents.config.json        # Agent personality definitions
agent-registry.js         # Dynamic agent management
room-manager.js           # Room isolation
providers/
  index.js                # Provider factory
  openai-realtime.js      # WebRTC provider
  openai-chat.js          # OpenAI Chat provider
  claude.js               # Claude provider
  groq.js                 # Groq provider
  stt.js                  # Speech-to-text
  tts.js                  # Text-to-speech
  conversation-history.js # Per-agent message history
public/
  index.html              # Landing page
  voice.html              # Dynamic agent page
  js/
    agent-common.js        # Base client class
    agent-loader.js        # Provider initialization
    provider-socket.js     # Socket audio pipeline
    provider-openai-realtime.js  # WebRTC client
packages/
  widget/                 # Embeddable widget package
docs/                     # Documentation
```

## Making Changes

### Branching

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```
2. Make your changes
3. Test manually (see below)
4. Commit with a descriptive message
5. Open a pull request

### Commit Messages

Use conventional commits:

```
feat: add Deepgram STT provider
fix: prevent turn queue deadlock on disconnect
docs: add ElevenLabs voice setup guide
refactor: extract SSE parser from openai-chat and groq
```

### Code Style

- **No semicolons** — the project doesn't use them (match existing style)
- **Single quotes** for strings
- **2-space indentation**
- **Console logging** — use `console.log` with descriptive prefixes: `[STT]`, `[TTS]`, `[LLM]`, `[Socket]`, `[Room]`
- **Error handling** — catch errors and log them; don't let the server crash. Use fallbacks where possible (e.g., browser TTS when server TTS fails).

### Testing

Currently, the project relies on manual testing. When testing changes:

1. **Test with text input first.** Set `INPUT_CHAT=true` and type messages. This isolates LLM/TTS issues from audio capture issues.
2. **Test with voice.** Once text works, test the full voice pipeline.
3. **Test with different providers.** If your change touches providers, test with at least two (e.g., OpenAI Chat and Claude).
4. **Test the widget.** If your change affects the client, test the embedded widget too.

### Adding a New Provider

See [docs/custom-providers.md](docs/custom-providers.md) for the full guide. In short:

1. Create `providers/my-provider.js` implementing the provider interface
2. Register it in `providers/index.js`
3. Add required env vars to `.env.example`
4. Update documentation

## Pull Request Process

1. **Describe what changed and why.** Not just "fixed bug" — explain the root cause and your approach.
2. **Keep PRs focused.** One feature or fix per PR. If you notice unrelated issues, open separate PRs.
3. **Update docs.** If your change affects configuration, APIs, or user-facing behavior, update the relevant docs.
4. **Don't break existing setups.** Changes should be backward-compatible. If a breaking change is necessary, document it clearly.

## Reporting Issues

When filing a bug, include:

- Your `AI_PROVIDER`, `STT_PROVIDER`, and `TTS_PROVIDER` settings
- Server console output (with any error messages)
- Browser console output
- Steps to reproduce
- Expected vs. actual behavior

## License

By contributing, you agree that your contributions will be licensed under the [Apache 2.0 License](LICENSE).
