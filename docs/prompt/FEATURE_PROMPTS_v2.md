

## Prompt 5: Thread Reader Web Tool (Traffic Engine)

```
I'm building a web-based Twitter thread reader for XActions (github.com/nirholas/XActions).

## What Already Exists

- src/scrapers/threadUnroller.js — 171-line browser console script that scrolls through threads, extracts tweet text/media/stats, exports as markdown/text/JSON
- scripts/threadUnroller.js — standalone version
- api/ — Express.js backend
- dashboard/ — web pages

## What to Build

### 1. Dashboard Page: dashboard/thread.html

Clean, minimal reading experience. This page should look BEAUTIFUL — it's a public-facing traffic page.

UI Flow:
1. Input: big centered input "Paste thread URL" + "Read Thread" button
2. Loading: skeleton loader mimicking tweet cards
3. Result: clean threaded view
   - Author header: avatar, name, username, date
   - Thread tweets in order, numbered (1/N, 2/N...)
   - Images/videos embedded inline
   - Tweet stats (likes, retweets) shown subtly
   - Bottom: "Read on X" link + share buttons
4. AI Summary (the differentiator!):
   - Collapsible "AI Summary" section at top
   - 3-5 bullet point summary of the thread
   - Key takeaways highlighted
   - Uses OpenRouter (env: OPENROUTER_API_KEY), falls back to "no summary available" if no key

SEO optimized page:
- Title: "Thread by @{author}: {first_tweet_preview} | XActions Thread Reader"
- Clean URL: xactions.app/thread/{tweet_id}
- Full thread text in HTML (indexable by search engines)
- Open Graph: thread preview for social sharing

### 2. API Route: api/routes/thread.js

POST /api/thread/unroll
- Input: { url: "https://x.com/user/status/123" }
- Process: use Puppeteer to load thread → extract all tweets in order
- Response: { author: { name, username, avatar }, tweets: [{ text, media[], stats, timestamp }], threadLength }
- Cache: Redis, by tweet ID, TTL 24 hours (threads don't change often)

POST /api/thread/summarize
- Input: { tweets: [...] } or { url }
- Process: send thread text to OpenRouter for summarization
- Response: { summary: string, keyPoints: string[], readingTime: "2 min" }

GET /api/thread/{tweetId}
- Returns cached unrolled thread if available
- Used for shareable/SEO URLs

### 3. Puppeteer Thread Extractor: api/services/threadExtractor.js

- Load tweet URL
- Detect if it's a thread (author has "Show this thread" or multiple connected tweets)
- Scroll down to load all tweets in thread
- Extract in order: text, media URLs, engagement stats, timestamps
- Handle "Show more replies" clicks for long threads
- Timeout: 30 seconds max

### 4. AI Summary: api/services/threadSummarizer.js

- Takes thread text array
- Builds prompt: "Summarize this Twitter thread in 3-5 bullet points. Include key facts, arguments, and conclusions."
- Uses OpenRouter with fast model (gemini-flash or gpt-4o-mini)
- Returns structured summary
- Graceful fallback: if no API key, show "Enable AI summaries by adding OPENROUTER_API_KEY"

### 5. Reading Experience Features

- Dark/light mode toggle (default: dark to match X)
- Font size adjustment
- "Copy as text" — clean plaintext of entire thread
- "Copy as markdown" — formatted markdown
- "Save as PDF" — window.print() styled version
- Bookmarklet: drag to bookmarks bar, click on any thread → goes to xactions.app/thread/{id}

Add to navigation on all dashboard pages as "Thread Reader".
```

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

## Build Order (Priority)

| # | Feature | Effort | Impact | Why |
|---|---------|--------|--------|-----|
| 1 | **Browser Extension** | 2 days | Huge | Unlocks non-developers. Biggest TAM expansion. |
| 2 | **Video Downloader Web** | 4 hours | Huge | Traffic magnet. 50M+ monthly searches for "twitter video download". |
| 3 | **Thread Reader Web** | 4 hours | High | Traffic engine + AI summary differentiator. |
| 4 | **AI Tweet Writer** | 1 day | High | Unique moat. Nobody else has scrape → analyze → generate. |
| 5 | **Unfollower Dashboard** | 6 hours | High | Daily retention. People check this every day. |
| 6 | **MCP Polish** | 3 hours | Medium | Developer audience → GitHub stars. |

**Total estimated time: 4-5 days for all 6 features.**

---

## License Compatibility Notes

| Repo | License | Can We... |
|------|---------|-----------|
| control-panel-for-twitter | MIT | ✅ Study, adapt, copy patterns, reference code |
| refined-twitter | MIT | ✅ Study, adapt, copy patterns, reference code |
| tvdl-2 | Apache-2.0 | ✅ Study, adapt, must include Apache notice if using code |
| cobalt | AGPL-3.0 | ⚠️ Study only. Do NOT copy code. AGPL requires your entire project to become AGPL. |
| twitterxdownload | AGPL-3.0 | ⚠️ Study only. Same AGPL restriction. |

**Rule of thumb:** Study AGPL repos for UX/approach/architecture, write your own code. MIT/Apache repos can be more directly referenced.
