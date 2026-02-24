---
name: algorithm-cultivation
description: Trains an X/Twitter account's algorithmic feed to surface niche-relevant content and positions the account as a thought leader. Browser scripts for manual operation, Persona Engine for identity management, and 24/7 Algorithm Builder with LLM-powered engagement via Puppeteer. Use when a user wants to build their algorithm, cultivate their feed for a niche, grow a fresh account, become a thought leader, or run automated engagement with AI-generated content.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Algorithm Cultivation & Thought Leadership

Train your X/Twitter algorithm for a specific niche. Three approaches:

1. **Browser script** — paste into DevTools console for manual sessions
2. **CLI + Persona Engine** — create personas and run from the command line
3. **24/7 Algorithm Builder** — headless Puppeteer + LLM running continuously

## Quick Reference

| Goal | Solution |
|------|----------|
| Create a persona (CLI) | `xactions persona create` |
| Run 24/7 with LLM (CLI) | `xactions persona run <id>` |
| Check persona status | `xactions persona status <id>` |
| Browser console (with core.js) | `src/automation/algorithmBuilder.js` |
| Browser console (standalone) | `scripts/thoughtLeaderCultivator.js` |
| Browser console (algorithm trainer) | `src/automation/algorithmTrainer.js` |
| Persona Engine (Node.js module) | `src/personaEngine.js` |
| Algorithm Builder (Node.js module) | `src/algorithmBuilder.js` |

## Core Concepts

- **Persona** — identity config: niche, activity pattern, engagement strategy, topics
- **Session** — one period of activity (search, browse, engage, post)
- **Strategy** — engagement limits (aggressive/moderate/conservative/thoughtleader)
- **Activity pattern** — human-like schedule (night-owl/early-bird/nine-to-five/always-on/weekend-warrior)

## Algorithm Builder — `src/algorithmBuilder.js`

24/7 headless automation: Puppeteer + stealth + OpenRouter LLM.

```js
import { startAlgorithmBuilder } from './algorithmBuilder.js';

await startAlgorithmBuilder({
  personaId: 'persona_1234',
  authToken: 'your_auth_token',
  headless: true,
  dryRun: false,
  maxSessions: 0, // 0 = infinite
});
```

Requires `OPENROUTER_API_KEY` env var for LLM-generated comments and posts.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | Required for LLM-generated comments and posts |
| `XACTIONS_SESSION_COOKIE` | X auth token (alternative to `--token` flag) |

## Detailed References

Load these on demand for deeper context:

- **Persona Engine details** — `skills/algorithm-cultivation/references/persona-engine.md` (presets, strategies, CLI commands, exports)
- **Browser scripts** — `skills/algorithm-cultivation/references/browser-scripts.md` (3 scripts, configs, controls, training phases)
- **Algorithm internals** — `skills/algorithm-cultivation/references/algorithm-internals.md` (signal weights, phase model, architecture diagram, cost estimate)
- **Research: algorithm internals** — `docs/research/algorithm-cultivation.md`
- **Research: LLM architecture** — `docs/research/llm-powered-thought-leader.md`

## Notes

- Browser scripts require navigating to x.com first
- `algorithmBuilder.js` and `algorithmTrainer.js` require pasting `src/automation/core.js` first
- `thoughtLeaderCultivator.js` is standalone (no dependencies)
- Default engagement strategy: 1-3s delays between actions
- Fresh accounts should start with conservative strategy for 1-2 weeks
