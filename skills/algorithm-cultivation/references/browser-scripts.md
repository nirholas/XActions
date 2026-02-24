# Browser Scripts Reference

Three browser console scripts for algorithm cultivation, with different trade-offs.

## algorithmBuilder.js (Full-featured)

**File:** `src/automation/algorithmBuilder.js`
**Requires:** Paste `src/automation/core.js` first.

969-line browser automation with LLM-powered comment generation.

### Features

- 6 activity cycles: Search & Engage, Browse Home, Target Account, Explore, Search People, Own Profile
- Weighted cycle selection with natural activity rotation
- LLM-powered comment generation (OpenRouter or any OpenAI-compatible endpoint)
- Session/break cycling for 24/7 operation
- Peak/off-peak hour awareness
- Per-session and per-day rate limits
- Full state persistence via localStorage

### Configuration

- `NICHE_CONFIG.KEYWORDS` — search terms for your niche
- `NICHE_CONFIG.PERSONA` — your niche identity (used for LLM persona)
- `NICHE_CONFIG.TARGET_ACCOUNTS` — accounts to engage with
- `NICHE_CONFIG.BIO_KEYWORDS` — only follow users matching these
- `LLM_CONFIG.ENABLED` — enable AI-generated comments
- `LLM_CONFIG.API_KEY` — your OpenRouter API key
- `LLM_CONFIG.MODEL` — LLM model to use
- `BEHAVIOR` — all timing, limits, and probability settings

### Controls

- `window.stopAlgoBuilder()` — stop after current action
- `window.algoStats()` — print all-time stats
- `window.algoReset()` — clear state and start fresh
- `window.algoConfig()` — show current configuration

## thoughtLeaderCultivator.js (Standalone)

**File:** `scripts/thoughtLeaderCultivator.js`

Zero dependencies. Paste directly into DevTools console on x.com.

### Controls

- `stopCultivator()` — stop after current action
- `cultivatorStatus()` — print current stats
- `cultivatorReset()` — clear all tracking data

## algorithmTrainer.js (Multi-niche)

**File:** `src/automation/algorithmTrainer.js`
**Requires:** Paste `src/automation/core.js` first.

Multi-niche rotation, intensity presets, cycle-based architecture.

### Controls

- `stopTrainer()` — stop
- `trainerStatus()` — status report
- `trainerReset()` — clear data

## Training Phases

All browser scripts cycle through these phases with randomized order:

1. **Search Top** — search a niche term, scroll top results, engage
2. **Search Latest** — same term, latest tab (catch fresh content)
3. **Search People** — follow qualifying accounts in the niche
4. **Home Feed** — scroll and engage to reinforce algorithm learning
5. **Influencer Visit** — visit niche leaders' profiles with boosted engagement
6. **Own Profile** — visit own profile (active user signal)
7. **Explore** — browse trending topics (normalization behavior)
8. **Idle** — dwell period simulating human rest
