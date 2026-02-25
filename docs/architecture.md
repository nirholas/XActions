# Architecture

> XActions v3.1.0 — System architecture, project structure, and design decisions.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Clients                                │
├────────────┬───────────┬──────────┬────────────┬─────────────┤
│ CLI        │ MCP       │ Dashboard│ Extension  │ Browser     │
│ (Terminal) │ (AI Agent)│ (Web UI) │ (Chrome)   │ (DevTools)  │
└─────┬──────┴─────┬─────┴────┬─────┴─────┬──────┴──────┬──────┘
      │            │          │           │             │
      ▼            ▼          ▼           ▼             ▼
┌──────────────────────────────────────────────┐  ┌────────────┐
│          Express.js API Server               │  │ Direct DOM │
│          (api/server.js — port 3001)         │  │ Automation │
│                                              │  │ (x.com)    │
│  ┌──────────┐ ┌────────────┐ ┌────────────┐ │  └────────────┘
│  │ Routes   │ │ Services   │ │ Middleware  │ │
│  │ (36+)    │ │ (Puppeteer)│ │ (Auth/CORS)│ │
│  └────┬─────┘ └─────┬──────┘ └────────────┘ │
│       │              │                       │
│  ┌────▼──────────────▼───────────────┐       │
│  │  Browser Automation (Puppeteer)   │       │
│  │  + Stealth Plugin                 │       │
│  └────────────────┬──────────────────┘       │
└───────────────────┼──────────────────────────┘
                    │
          ┌─────────▼─────────┐
          │ PostgreSQL (Prisma)│
          │ + Redis (Bull)     │
          └───────────────────┘
```

## Project Structure

```
xactions/
├── api/                    # Express.js backend
│   ├── server.js           # Main server entry point
│   ├── config/             # Server configuration (x402, etc.)
│   ├── middleware/          # Auth, rate limiting, x402, AI detection
│   ├── realtime/           # Socket.IO handlers
│   ├── routes/             # 36+ route files (~170 endpoints)
│   │   ├── auth.js         # POST /register, /login, /refresh
│   │   ├── user.js         # GET/PATCH /profile, GET /stats
│   │   ├── operations.js   # Unfollow, detect unfollowers
│   │   ├── video.js        # Video extraction & download
│   │   ├── posting.js      # Tweet, thread, poll, schedule
│   │   ├── engagement.js   # Like, reply, bookmark, auto-like
│   │   ├── analytics.js    # Sentiment, monitoring, reports
│   │   ├── workflows.js    # Automation workflows
│   │   ├── streams.js      # Real-time event streaming
│   │   ├── graph.js        # Social network graph
│   │   ├── ai/             # Modular AI API routes
│   │   └── ...             # 25+ more route files
│   ├── services/           # Business logic layer
│   │   ├── browserAutomation.js  # Puppeteer scraping (14+ functions)
│   │   ├── videoExtractor.js     # Video URL extraction
│   │   ├── threadExtractor.js    # Thread unrolling
│   │   ├── followerScanner.js    # Follower change detection
│   │   ├── jobQueue.js           # Bull queue for background jobs
│   │   ├── licenseManager.js     # License key management
│   │   └── operations/           # Operation implementations
│   └── utils/              # Shared utilities
│
├── src/                    # Core source code
│   ├── cli/                # CLI entry point
│   │   └── index.js        # 80+ commands (2983 lines)
│   ├── mcp/                # MCP server
│   │   └── server.js       # 87 tools (3899 lines)
│   ├── scrapers/           # Multi-platform scrapers
│   │   ├── twitter/        # Twitter Puppeteer scrapers
│   │   ├── bluesky/        # Bluesky AT Protocol scrapers
│   │   ├── mastodon/       # Mastodon REST API scrapers
│   │   ├── threads/        # Threads Puppeteer scrapers
│   │   └── adapters/       # Unified scraper interface
│   ├── automation/         # Browser automation framework
│   │   ├── core.js         # Module system (paste first)
│   │   ├── actions.js      # 100+ browser actions
│   │   └── *.js            # 18+ automation scripts
│   ├── analytics/          # Sentiment & reputation
│   ├── streaming/          # Real-time event streaming
│   ├── plugins/            # Plugin system
│   ├── agents/             # Thought leader agent
│   ├── graph/              # Social network graph
│   └── *.js                # 80+ browser scripts
│
├── dashboard/              # Static HTML frontend
│   ├── index.html          # Main dashboard
│   ├── css/                # Stylesheets
│   ├── js/                 # Client-side JavaScript
│   └── *.html              # 38 pages
│
├── extension/              # Chrome/Edge extension (MV3)
│   ├── manifest.json
│   ├── popup/              # Extension popup UI
│   ├── background/         # Service worker
│   └── content/            # Content scripts
│
├── prisma/                 # Database
│   ├── schema.prisma       # 11 models
│   └── seed.js             # Seed data
│
├── config/                 # Configuration
│   ├── personas/           # Persona templates (JSON)
│   └── niches/             # Niche configurations (JSON)
│
├── skills/                 # 31 AI agent skills
│   └── */SKILL.md          # Skill instructions
│
├── scripts/                # Utility scripts
├── tests/                  # Vitest test suite
├── types/                  # TypeScript definitions
├── docs/                   # This documentation
└── data/                   # Data files
```

## Key Design Decisions

### No Twitter API Required

XActions uses **browser automation** (Puppeteer) instead of the Twitter API. This means:
- No API keys or developer account needed
- No rate limit tiers or paid access
- Works with a simple session cookie (`auth_token`)
- Can access features Twitter doesn't expose via API

### Multi-Platform Architecture

Scrapers use an **adapter pattern** (`src/scrapers/adapters/`) that normalizes data across platforms:

```
User Request → CLI/MCP/API
                    ↓
          Platform Router (--platform flag)
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
 Twitter         Bluesky         Mastodon
 (Puppeteer)   (AT Protocol)   (REST API)
    ↓               ↓               ↓
    └───────────────┼───────────────┘
                    ↓
          Normalized Output (JSON/CSV/MD)
```

### Service Layer Pattern

API routes delegate to services (`api/services/`):
- **Routes** handle HTTP concerns (validation, response formatting)
- **Services** handle business logic (browser automation, data processing)
- **Operations** are tracked in PostgreSQL for async monitoring

### Browser Script Independence

Scripts in `src/` are designed to run standalone in a browser DevTools console — no build step, no bundler. They use:
- `sessionStorage` for persistence (lost on tab close)
- DOM selectors from `docs/dom-selectors.md`
- `console.log` with emojis for output
- 1-3 second delays between actions (rate limit safety)

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Backend | Express.js (Node.js) |
| Database | PostgreSQL + Prisma ORM |
| Job Queue | Bull + Redis |
| Browser Automation | Puppeteer + Stealth Plugin |
| Real-time | Socket.IO |
| Frontend | Static HTML/CSS/JS (no framework) |
| CLI | Commander.js + Ora + Chalk |
| MCP | @modelcontextprotocol/sdk |
| Testing | Vitest |
| Auth | JWT + bcrypt |
| Payments | Stripe + x402 micropayments |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Production | PostgreSQL connection string |
| `JWT_SECRET` | Production | JWT signing secret |
| `SESSION_SECRET` | No | Express session secret |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | `development` or `production` |
| `REDIS_URL` | No | Redis for Bull queue |
| `STRIPE_SECRET_KEY` | No | Stripe payments |
| `OPENROUTER_API_KEY` | No | AI features (OpenRouter) |
| `X_SESSION_COOKIE` | No | Default auth_token for CLI |

## Port Assignments

| Port | Service |
|------|---------|
| 3001 | API server + Dashboard |
| 5432 | PostgreSQL |
| 6379 | Redis |

---

*XActions v3.1.0 — by nichxbt*
