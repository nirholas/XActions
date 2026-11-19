# XActions Claude Tutorial Prompts

> **23 ready-to-paste prompt files** that turn Claude into your personal X/Twitter automation expert. Each file is a complete, self-contained tutorial covering one feature area of [XActions](https://github.com/nirholas/XActions).

Looking for step-by-step walkthroughs you run yourself instead? Those are one
level up, in [`tutorials/`](../). This folder is prompts you hand to an
assistant.

## How to Use

1. **Pick a tutorial** from the list below
2. **Open the `.md` file** and copy the entire content
3. **Paste into a new Claude chat** (or any AI assistant)
4. **Fill in your details** at the bottom (marked with placeholders)
5. **Follow Claude's step-by-step guidance**

Each prompt is designed to:
- Give Claude full context about XActions features
- Walk you through setup, configuration, and usage
- Include real code examples and configurations
- Let you customize everything to your needs

---

## Tutorials

### Getting Started
| # | Tutorial | Description |
|---|----------|-------------|
| 01 | [MCP Setup & First Commands](01-mcp-setup-and-first-commands.md) | Install XActions MCP server, connect to Claude Desktop, run your first commands |
| 15 | [CLI Mastery Guide](15-cli-mastery-guide.md) | Master the `xactions` command-line tool: setup, the read commands, output flags, and shell workflows |
| 16 | [Browser Automation Framework](16-browser-automation-framework.md) | Learn the core.js + actions.js browser automation system |

### Follower Management
| # | Tutorial | Description |
|---|----------|-------------|
| 02 | [Unfollow Non-Followers & Cleanup](02-unfollow-non-followers-cleanup.md) | Find and remove people who don't follow you back |
| 03 | [Growth Automation Suite](03-growth-automation-suite.md) | Keyword follow, auto-like, smart unfollow — the complete growth engine |
| 07 | [Auto-Liker & Auto-Commenter](07-auto-liker-auto-commenter.md) | Automated engagement with keyword targeting and templates |

### Content & Posting
| # | Tutorial | Description |
|---|----------|-------------|
| 05 | [Content Posting, Threads & Scheduling](05-content-posting-threads-scheduling.md) | Post tweets, create threads, schedule content, manage polls |
| 13 | [Content Cleanup (Unlike, Clear)](13-content-cleanup-unlike-clear.md) | Mass unlike, remove reposts, delete old tweets |

### Analytics & Intelligence
| # | Tutorial | Description |
|---|----------|-------------|
| 04 | [Scraping, Research & Analysis](04-scraping-research-analysis.md) | Scrape profiles, followers, tweets, hashtags — extract data from X |
| 06 | [Analytics & Competitor Intelligence](06-analytics-competitor-intelligence.md) | Track your performance and analyze competitors |
| 14 | [Brand Monitoring & Business Tools](14-brand-monitoring-business-tools.md) | Real-time brand monitoring, streaming, and business intelligence |
| 18 | [Grok AI & Sentiment Analysis](18-grok-ai-sentiment-analysis.md) | Query Grok AI, analyze sentiment, monitor reputation |

### Media & Export
| # | Tutorial | Description |
|---|----------|-------------|
| 12 | [Bookmark Management & Export](12-bookmark-management-export.md) | Save, organize, export, and manage bookmarks |
| 17 | [Video Download, Threads & Media](17-video-download-thread-media.md) | Download videos, unroll threads, scrape media, export content |

### Communication
| # | Tutorial | Description |
|---|----------|-------------|
| 08 | [Blocking, Muting & Spam Protection](08-blocking-muting-spam-protection.md) | Block, mute, and protect your account from spam |
| 09 | [DM Management & Automation](09-dm-management-automation.md) | Send, read, export, and automate direct messages |
| 10 | [Communities, Lists & Spaces](10-communities-lists-spaces.md) | Manage lists, participate in Spaces, Community features |
| 19 | [Customer Service Bot](19-customer-service-bot.md) | Automate customer support with templated responses and business hours |

### Account & Settings
| # | Tutorial | Description |
|---|----------|-------------|
| 11 | [Profile, Backup & Settings](11-profile-backup-settings.md) | Update profile, manage settings, privacy, premium features |
| 20 | [Session Logging & Safety](20-session-logging-safety.md) | Track automation activity, manage rate limits, stay safe |
| 21 | [Workflows & Account Portability](21-workflows-account-portability.md) | Build automated workflows, export account, migrate to Bluesky/Mastodon |

Reading your own X data export (`xactions archive summary|export|migrate`) has
its own walkthrough: [tutorial 07](../07-your-x-archive.md).

### Spaces & Voice AI
| # | Tutorial | Description |
|---|----------|-------------|
| 23 | [Autonomous Space Agent](23-autonomous-space-agent.md) | Deploy AI voice agents that join, listen, and speak in live X Spaces |

### Advanced
| # | Tutorial | Description |
|---|----------|-------------|
| 22 | [Advanced Power User Playbook](22-advanced-power-user-playbook.md) | 10 multi-feature strategies — growth engine, brand command center, content machine, and more |

---

## Quick Start Recommendations

**"I just want to clean up my account"**
→ Start with [Tutorial 02](02-unfollow-non-followers-cleanup.md) (Unfollow Non-Followers)

**"I want to grow my following"**
→ Start with [Tutorial 03](03-growth-automation-suite.md) (Growth Suite), then [Tutorial 22](22-advanced-power-user-playbook.md) (Power User Playbook)

**"I want to use XActions with Claude Desktop (MCP)"**
→ Start with [Tutorial 01](01-mcp-setup-and-first-commands.md) (MCP Setup)

**"I want to analyze my competitors"**
→ Start with [Tutorial 06](06-analytics-competitor-intelligence.md) (Analytics & Intelligence)

**"I want to automate everything"**
→ Start with [Tutorial 21](21-workflows-account-portability.md) (Workflows), then [Tutorial 22](22-advanced-power-user-playbook.md) (Power User Playbook)

**"I want to put an AI agent in an X Space"**
→ Start with [Tutorial 23](23-autonomous-space-agent.md) (Autonomous Space Agent)

**"I want to monitor my brand"**
→ Start with [Tutorial 18](18-grok-ai-sentiment-analysis.md) (Sentiment Analysis) + [Tutorial 14](14-brand-monitoring-business-tools.md) (Brand Monitoring)

**"I want to download/save content from X"**
→ Start with [Tutorial 17](17-video-download-thread-media.md) (Video/Media) + [Tutorial 12](12-bookmark-management-export.md) (Bookmarks)

---

## Coverage Map

What these 23 prompts cover, and where the authoritative list of each thing
lives:

| Surface | Size | Prompts | Full list |
|---------|------|---------|-----------|
| MCP tools | 152 | 01-23 | [docs/mcp-setup.md](../../docs/mcp-setup.md) |
| CLI commands | 56 top-level | 15 | [docs/cli-reference.md](../../docs/cli-reference.md) |
| Browser console scripts | 95 | 03, 07, 16, 19, 20 | [docs/browser-scripts.md](../../docs/browser-scripts.md) |
| Agent skills | 49 | 01 | [docs/skills.md](../../docs/skills.md) |
| Platform scrapers | 4 (X, Bluesky, Mastodon, Threads) | 04, 17 | [docs/api-reference.md](../../docs/api-reference.md) |

Feature areas with a prompt of their own: autonomous Space agent (23), workflow
engine (21), real-time streaming (14, 21), sentiment analysis (18), account
portability (21), customer service (19), session logging and rate-limit safety
(20).

These prompts are context for an assistant, not a reference manual. They do not
enumerate all 155 tools or all 57 commands; `xactions --help`, `xactions help
<command>`, and the docs linked above do.

---

## About XActions

[XActions](https://github.com/nirholas/XActions) is the complete X/Twitter automation toolkit — scrapers, MCP server for AI agents, CLI, browser scripts. No API fees. Open source. By [nichxbt](https://x.com/nichxbt).

**Star us on GitHub:** https://github.com/nirholas/XActions ⭐
