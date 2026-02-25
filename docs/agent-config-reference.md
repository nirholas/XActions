# Thought Leader Agent — Configuration Reference

> Every configuration option for the agent, with defaults and examples.

---

## Table of Contents

- [Config File Location](#config-file-location)
- [Full Example](#full-example)
- [Section Reference](#section-reference)
  - [niche](#niche)
  - [persona](#persona)
  - [llm](#llm)
  - [schedule](#schedule)
  - [limits](#limits)
  - [browser](#browser)
  - [dbPath](#dbpath)
  - [network](#network)
- [Niche Config Files](#niche-config-files)
- [Persona Config Files](#persona-config-files)
- [Environment Variables](#environment-variables)

---

## Config File Location

The agent reads config from `data/agent-config.json` by default. Override with `--config`:

```bash
node src/agents/thoughtLeaderAgent.js --config ./my-config.json
```

---

## Full Example

See [`config/agent-config.example.json`](../config/agent-config.example.json) for a complete annotated example.

```json
{
  "niche": {
    "name": "AI & Engineering",
    "searchTerms": [
      "AI agents",
      "LLM engineering",
      "open source AI",
      "RAG pipeline",
      "prompt engineering"
    ],
    "influencers": [
      "karpathy",
      "AndrewYNg",
      "ylecun"
    ],
    "keywords": [
      "AI", "LLM", "GPT", "machine learning",
      "neural network", "transformer", "RAG"
    ]
  },
  "persona": {
    "name": "Alex",
    "handle": "@alexbuilds",
    "niche": "AI & developer tools",
    "tone": "curious, technical but accessible, witty",
    "expertise": ["LLM engineering", "devtools", "AI agents"],
    "opinions": [
      "Open source wins",
      "AI augments developers, doesn't replace them",
      "Ship fast, iterate faster"
    ],
    "avoid": [
      "corporate jargon",
      "hashtag spam",
      "engagement bait",
      "political opinions"
    ],
    "exampleTweets": [
      "Just spent 3 hours debugging a prompt. The future of programming is proofreading.",
      "Hot take: Most AI wrappers would be better as a bash script."
    ],
    "replyStyles": {
      "question": 20,
      "agreement": 25,
      "insight": 35,
      "humor": 15,
      "pushback": 5
    }
  },
  "llm": {
    "provider": "openrouter",
    "apiKey": "sk-or-v1-YOUR-KEY-HERE",
    "models": {
      "fast": "deepseek/deepseek-chat",
      "mid": "anthropic/claude-3.5-haiku",
      "smart": "anthropic/claude-sonnet-4"
    }
  },
  "schedule": {
    "timezone": "America/New_York",
    "sleepHours": [23, 6]
  },
  "limits": {
    "dailyLikes": 100,
    "dailyFollows": 50,
    "dailyComments": 15,
    "dailyPosts": 3
  },
  "browser": {
    "headless": true,
    "sessionPath": "data/session.json",
    "proxy": null
  },
  "dbPath": "data/agent.db",
  "network": {
    "enabled": false
  }
}
```

---

## Section Reference

### niche

Defines the topical focus area for content engagement and creation.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | yes | — | Human-readable niche name |
| `searchTerms` | string[] | yes | — | X.com search queries for finding relevant content |
| `influencers` | string[] | yes | — | Usernames (without @) of key accounts to study and engage with |
| `keywords` | string[] | yes | — | Keywords for relevance scoring — the LLM uses these to grade tweets |

**Tips:**
- Include 20–50 search terms for variety
- Mix broad terms (`"AI"`) with specific ones (`"RAG pipeline optimization"`)
- List 10–25 influencers across different sub-niches
- Keywords should cover the core vocabulary of your domain

### persona

Defines the agent's voice, personality, and content guardrails.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | no | `"Agent"` | Display name for the persona |
| `handle` | string | no | — | X handle (e.g., `"@alexbuilds"`) |
| `niche` | string | no | — | Short niche description for LLM context |
| `tone` | string | no | `"knowledgeable and approachable"` | Comma-separated tone descriptors |
| `expertise` | string[] | no | `[]` | Areas of expertise the agent should demonstrate |
| `opinions` | string[] | no | `[]` | Opinionated stances that give the persona character |
| `avoid` | string[] | no | `[]` | Topics, phrases, or patterns to never produce |
| `exampleTweets` | string[] | no | `[]` | Voice samples the LLM uses as stylistic reference |
| `replyStyles` | object | no | see below | Weighted distribution of reply approaches |

**Default `replyStyles`:**

```json
{
  "question": 20,
  "agreement": 30,
  "insight": 30,
  "humor": 15,
  "pushback": 5
}
```

Values are relative weights (don't need to sum to 100).

| Style | Description |
|---|---|
| `question` | Ask a follow-up or Socratic question |
| `agreement` | Build on the author's point with added nuance |
| `insight` | Share a unique perspective or data point |
| `humor` | Witty observation or analogy |
| `pushback` | Respectfully challenge the take |

### llm

Configures the LLM provider for scoring, reply generation, and content creation.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `provider` | string | no | `"openrouter"` | `"openrouter"`, `"openai"`, or `"ollama"` |
| `apiKey` | string | yes* | env var | API key (*not needed for Ollama) |
| `baseUrl` | string | no | auto-detected | Custom API base URL |
| `models.fast` | string | no | `"deepseek/deepseek-chat"` | Model for scoring (high volume, cheap) |
| `models.mid` | string | no | `"anthropic/claude-3.5-haiku"` | Model for reply generation |
| `models.smart` | string | no | `"anthropic/claude-sonnet-4"` | Model for content creation and strategy |

**Provider URLs (auto-detected):**

| Provider | Base URL |
|---|---|
| `openrouter` | `https://openrouter.ai/api/v1/chat/completions` |
| `openai` | `https://api.openai.com/v1/chat/completions` |
| `ollama` | `http://localhost:11434/v1/chat/completions` |

**Environment variable fallbacks:**
- OpenRouter: `OPENROUTER_API_KEY`
- OpenAI: `OPENAI_API_KEY`

**Cost estimates per day (Normal intensity):**

| Model Tier | Daily Calls | Avg Tokens/Call | Est. Cost |
|---|---|---|---|
| Fast (scoring) | ~200 | 500 input / 50 output | ~$0.02 |
| Mid (replies) | ~25 | 800 input / 200 output | ~$0.03 |
| Smart (content) | ~5 | 1500 input / 500 output | ~$0.05 |
| **Total** | | | **~$0.10/day** |

### schedule

Controls when the agent is active.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `timezone` | string | no | `"America/New_York"` | IANA timezone string |
| `sleepHours` | [number, number] | no | `[23, 6]` | Sleep start and end hours (24h format) |

The agent follows a circadian rhythm with peak activity at 10–11 AM and 7–8 PM. Activity drops to near-zero during sleep hours and early morning.

### limits

Daily rate limits to prevent detection. These are hard caps — the agent stops the activity type once the limit is reached.

| Field | Type | Default | Description |
|---|---|---|---|
| `dailyLikes` | number | `150` | Maximum likes per day |
| `dailyFollows` | number | `80` | Maximum follows per day |
| `dailyComments` | number | `25` | Maximum replies per day |
| `dailyPosts` | number | `5` | Maximum original posts per day |

**Recommended limits by account age:**

| Account Age | Likes | Follows | Comments | Posts |
|---|---|---|---|---|
| < 1 month | 30 | 10 | 5 | 1 |
| 1–6 months | 80 | 30 | 12 | 3 |
| 6+ months | 150 | 80 | 25 | 5 |
| 1+ year | 200 | 100 | 40 | 8 |

### browser

Puppeteer browser configuration.

| Field | Type | Default | Description |
|---|---|---|---|
| `headless` | boolean | `true` | Run without visible window (`false` for debugging) |
| `sessionPath` | string | `"data/session.json"` | Path to store login cookies |
| `proxy` | string\|null | `null` | HTTP/SOCKS5 proxy URL (e.g., `"socks5://user:pass@host:port"`) |

### dbPath

| Field | Type | Default | Description |
|---|---|---|---|
| `dbPath` | string | `"data/agent.db"` | Path to SQLite database file |

### network

Configuration for the Engagement Network (multi-agent coordination). Disabled by default.

| Field | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `false` | Enable multi-agent content sharing |
| `maxInteractionsPerPair` | number | `3` | Max interactions between any two agents per day |
| `minDelayHours` | number | `24` | Min hours between interactions within a pair |
| `maxNetworkSize` | number | `5` | Max agents in the network |
| `requireHumanReview` | boolean | `true` | Require manual approval for cross-agent actions |

---

## Niche Config Files

Pre-built niche configs are stored in `config/niches/`:

| File | Niche | Terms | Influencers | Keywords |
|---|---|---|---|---|
| `ai-engineering.json` | AI & LLM Engineering | 50+ | 22 | 40+ |
| `web3-crypto.json` | Web3, DeFi & Crypto | 50+ | 20 | 40+ |
| `saas-startups.json` | SaaS & Startups | 50+ | 20 | 40+ |

**Creating a custom niche:**

```json
{
  "name": "DevOps & Platform Engineering",
  "searchTerms": [
    "Kubernetes best practices",
    "platform engineering",
    "SRE incident management",
    "terraform modules",
    "GitOps workflow"
  ],
  "influencers": [
    "kelaboratory",
    "brendandburns"
  ],
  "keywords": [
    "Kubernetes", "Docker", "Terraform",
    "CI/CD", "GitOps", "SRE", "platform"
  ]
}
```

Save to `config/niches/devops.json` and select it during setup.

---

## Persona Config Files

Pre-built personas are stored in `config/personas/`:

| File | Archetype | Tone | Best For |
|---|---|---|---|
| `technical-builder.json` | Builder | Practical, show-don't-tell | Engineers, makers |
| `thought-leader.json` | Visionary | Opinionated, first-principles | Founders, analysts |
| `community-builder.json` | Connector | Encouraging, inclusive | Community, DevRel |

---

## Environment Variables

These can be set instead of (or in addition to) config file values:

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key (fallback for `llm.apiKey`) |
| `OPENAI_API_KEY` | OpenAI API key (fallback for `llm.apiKey`) |
| `AGENT_CONFIG_PATH` | Default config path (fallback for `--config`) |
