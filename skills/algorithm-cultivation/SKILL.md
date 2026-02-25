---
name: algorithm-cultivation
description: Trains an X/Twitter account's algorithmic feed to surface niche-relevant content and positions the account as a thought leader. Browser scripts for manual operation, Persona Engine for identity management, and 24/7 Algorithm Builder with LLM-powered engagement via Puppeteer. Use when a user wants to build their algorithm, cultivate their feed for a niche, grow a fresh account, become a thought leader, or run automated engagement with AI-generated content.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Algorithm Cultivation & Thought Leadership

Train your X/Twitter algorithm for a specific niche. Three approaches:

1. **Browser script** -- paste into DevTools console for manual sessions
2. **CLI + Persona Engine** -- create personas and run from the command line
3. **24/7 Algorithm Builder** -- headless Puppeteer + LLM running continuously

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

- **Persona** -- identity config: niche, activity pattern, engagement strategy, topics
- **Session** -- one period of activity (search, browse, engage, post)
- **Strategy** -- engagement limits (aggressive/moderate/conservative/thoughtleader)
- **Activity pattern** -- human-like schedule (night-owl/early-bird/nine-to-five/always-on/weekend-warrior)

## Algorithm Builder -- `src/algorithmBuilder.js`

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

## Algorithm Trainer -- `src/automation/algorithmTrainer.js`

Browser console script for manual training sessions. Requires `src/automation/core.js` pasted first.

### Training Phases (cycles through all 8)
1. Search top tweets for niche keywords
2. Search latest tweets for niche keywords
3. Follow people from search results
4. Engage with home feed (like/reply)
5. Visit influencer profiles
6. Browse random profiles in niche
7. Explore page browsing
8. Idle dwell time (human-like pauses)

### Controls
- `stopTrainer()` -- Stop training
- `trainerStatus()` -- Current phase, actions taken, rate limits
- `trainerReset()` -- Reset counters

### Intensity Presets
| Preset | Actions/hour | Daily cap |
|--------|-------------|-----------|
| chill | 10-15 | 100 |
| normal | 20-30 | 300 |
| active | 40-60 | 500 |

## Strategy Guide

### Fresh account (week 1-2)
1. Create a persona with `xactions persona create` or configure algorithmTrainer manually
2. Use conservative/chill intensity -- X flags aggressive new accounts
3. Focus on phases 1-2 (search) and 7 (explore) to signal interests
4. Follow 5-10 niche accounts per day manually
5. Like 20-30 niche tweets per day

### Established account pivoting niches
1. Aggressively engage with new niche content for 1-2 weeks
2. Use `src/automation/algorithmTrainer.js` on `active` intensity
3. Unfollow accounts from the old niche gradually with `src/automation/smartUnfollow.js`
4. The algorithm typically adjusts within 3-7 days of consistent signals

### Running 24/7 with LLM
1. Set `OPENROUTER_API_KEY` for AI-generated replies
2. `xactions persona create` -- configure niche, strategy, schedule
3. `xactions persona run <id>` -- starts headless Puppeteer session
4. Monitor: `xactions persona status <id>`
5. Cost estimate: ~$0.50-2.00/day depending on model and activity level

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | Required for LLM-generated comments and posts |
| `XACTIONS_SESSION_COOKIE` | X auth token (alternative to `--token` flag) |

## Detailed References

Load these on demand for deeper context:

- **Persona Engine details** -- `skills/algorithm-cultivation/references/persona-engine.md`
- **Browser scripts** -- `skills/algorithm-cultivation/references/browser-scripts.md`
- **Algorithm internals** -- `skills/algorithm-cultivation/references/algorithm-internals.md`
- **Research: algorithm internals** -- `docs/research/algorithm-cultivation.md`
- **Research: LLM architecture** -- `docs/research/llm-powered-thought-leader.md`

## Notes
- Browser scripts require navigating to x.com first
- `algorithmBuilder.js` and `algorithmTrainer.js` require pasting `src/automation/core.js` first
- `thoughtLeaderCultivator.js` is standalone (no dependencies)
- Default engagement strategy: 1-3s delays between actions
- Fresh accounts should start with conservative strategy for 1-2 weeks
