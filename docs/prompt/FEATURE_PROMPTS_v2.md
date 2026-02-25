

---

## Prompt 6: Polish MCP Server (Developer Audience = GitHub Stars)

```
I'm polishing the MCP server for XActions (github.com/nirholas/XActions) to make it the definitive free Twitter MCP.

## What Already Exists

- src/mcp/server.js — MCP server using @modelcontextprotocol/sdk with StdioServerTransport
- src/mcp/local-tools.js — local tool definitions
- src/mcp/x402-client.js — x402 payment client
- All scrapers work: profile, followers, following, tweets, search, video, thread
- CLI entry: `npm run mcp` / `node src/mcp/server.js`

## What Needs Polish

### 1. npx Support (Zero Install)

Make `npx xactions-mcp` work — the #1 way people try MCP servers.

- Ensure package.json bin includes: "xactions-mcp": "./src/mcp/server.js"
- Add shebang to server.js: #!/usr/bin/env node
- Test: npx xactions@latest mcp

### 2. Comprehensive Tool Set

Ensure ALL of these tools are registered and working:

Scraping Tools:
- x_get_profile — scrape any user's profile
- x_get_followers — scrape followers list
- x_get_following — scrape following list
- x_get_tweets — scrape user's tweets
- x_search_tweets — search tweets by query
- x_get_thread — unroll a thread
- x_get_video — extract video URL from tweet

Analysis Tools:
- x_detect_unfollowers — compare follower snapshots
- x_analyze_sentiment — sentiment analysis of text/tweets
- x_best_time_to_post — analyze posting patterns
- x_competitor_analysis — compare accounts

Action Tools:
- x_follow — follow a user
- x_unfollow — unfollow a user
- x_like — like a tweet
- x_post_tweet — post a tweet
- x_post_thread — post a thread

AI Tools (if OPENROUTER_API_KEY is set):
- x_analyze_voice — analyze a user's writing style
- x_generate_tweet — generate tweets in a user's voice
- x_summarize_thread — AI summarize a thread

Each tool must have:
- Clear name and description
- JSON Schema for input parameters
- Proper error handling
- Helpful error messages when auth is missing

### 3. Setup Wizard

When server starts, detect if auth_token is configured:
- If not: print clear instructions for getting auth_token from browser cookies
- If yes: print "✅ Authenticated" + list of available tools

### 4. Documentation: docs/mcp-setup.md

One-page setup guide:
- 30-second quickstart (npx command + Claude Desktop config)
- Getting your auth_token
- Claude Desktop configuration (JSON to copy-paste)
- Cursor configuration
- Windsurf configuration
- GPT configuration (if applicable)
- Example prompts to try
- Troubleshooting

### 5. Claude Desktop Config Generator

CLI command: `xactions mcp-config`
- Detects OS (macOS, Windows, Linux)
- Generates the correct claude_desktop_config.json snippet
- Optionally writes it directly to the config file path
- Shows "restart Claude Desktop to apply"

### 6. README Section

Update the MCP section in README.md with:
- Copy-paste config block
- 3 example prompts showing real value
- "Works with Claude, Cursor, Windsurf, and any MCP client"
```

---

## Clone Commands (Run Before Building)

```bash
# Study these repos for architecture patterns (MIT licensed — safe to learn from)
mkdir -p /tmp/reference

# Chrome extension reference (THE gold standard for X/Twitter extension)
git clone --depth 1 https://github.com/insin/control-panel-for-twitter.git /tmp/reference/control-panel
# Key files to study: manifest.json, src/ directory structure

# Refined Twitter (Sindre Sorhus quality)
git clone --depth 1 https://github.com/sindresorhus/refined-twitter.git /tmp/reference/refined-twitter
# Key files: source/ directory, manifest.json

# Twitter video download (Apache 2.0 — can adapt patterns)
git clone --depth 1 https://github.com/saifalfalah/tvdl-2.git /tmp/reference/tvdl
# Key files: extraction logic, API patterns

# Study structure only (don't copy AGPL code from these):
# - https://github.com/imputnet/cobalt — study UX/API design
# - https://github.com/imtonyjaa/twitterxdownload — study web app approach
```

---