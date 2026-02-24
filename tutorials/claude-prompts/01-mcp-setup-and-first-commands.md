# Tutorial: Setting Up XActions MCP Server with Claude

You are helping me set up the XActions MCP server so I can control my X/Twitter account directly from this Claude chat. Walk me through every step like I'm a beginner. Be thorough but friendly.

## Context

XActions is an open-source X/Twitter automation toolkit (https://github.com/nirholas/XActions). It includes an MCP (Model Context Protocol) server that gives you, Claude, the ability to directly interact with X/Twitter — scrape profiles, manage followers, post tweets, search, and more — all through natural conversation with me.

The MCP server is located at `src/mcp/server.js` in the XActions package.

## What I Need You To Do

### Step 1: Installation
Walk me through installing XActions. Cover both methods:
- `npm install xactions` (for using as a package)
- Cloning the repo from GitHub

Make sure I have Node.js 18+ installed. If I don't, help me install it.

### Step 2: Claude Desktop Configuration
Help me configure my `claude_desktop_config.json` file. The location depends on my OS:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

The config should look like this:

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["xactions", "mcp"],
      "env": {}
    }
  }
}
```

Or if installed from source:

```json
{
  "mcpServers": {
    "xactions": {
      "command": "node",
      "args": ["/full/path/to/xactions/src/mcp/server.js"],
      "env": {}
    }
  }
}
```

Remind me to restart Claude Desktop after saving.

### Step 3: Getting My Auth Token
Walk me through getting my `auth_token` cookie from X.com:
1. Open x.com in my browser and make sure I'm logged in
2. Open Developer Tools (F12 or Cmd+Option+I on Mac)
3. Go to Application tab → Cookies → x.com
4. Find `auth_token` and copy the value
5. Warn me: never share this publicly, it gives full access to my account

### Step 4: First Connection Test
Once the MCP server is connected, have me test with these commands:
1. Login: "Login to X with this auth token: [my_token]"  
2. Get my profile: "Get my X profile for [my_username]"
3. Check followers: "How many followers do I have?"

### Step 5: Show Me What's Possible
After setup is confirmed working, give me a tour of ALL 12 core MCP tools:
- `x_login` — Authenticate with session cookie
- `x_get_profile` — Get any user's profile info
- `x_get_followers` — Scrape a user's followers list  
- `x_get_following` — See who someone follows
- `x_get_non_followers` — Find people who don't follow you back
- `x_get_tweets` — Scrape recent tweets from any account
- `x_search_tweets` — Search tweets with advanced operators
- `x_follow` / `x_unfollow` — Follow or unfollow users
- `x_post_tweet` — Post a tweet
- `x_like` — Like a tweet by URL
- `x_retweet` — Retweet by URL

And the extended tools:
- `x_post_thread` — Post multi-tweet threads
- `x_create_poll` — Create polls
- `x_schedule_post` — Schedule future posts
- `x_reply` — Reply to tweets
- `x_bookmark` / `x_get_bookmarks` / `x_clear_bookmarks` — Bookmark management
- `x_auto_like` — Auto-like by keywords
- `x_get_trends` / `x_get_explore` — Discover trending content  
- `x_get_notifications` — Read notifications
- `x_send_dm` / `x_get_conversations` / `x_export_dms` — DM management
- `x_grok_query` / `x_grok_summarize` — Grok AI integration
- `x_update_profile` — Edit your profile
- `x_brand_monitor` — Monitor brand mentions with sentiment
- `x_competitor_analysis` — Compare competitor accounts
- `x_get_analytics` / `x_get_post_analytics` — Engagement analytics
- `x_creator_analytics` — Creator dashboard stats
- `x_publish_article` — Publish long-form articles
- `x_get_spaces` / `x_scrape_space` — Spaces discovery
- `x_stream_start` / `x_stream_stop` — Real-time event streaming

Give me 3 quick example prompts for each category so I can start using them immediately.

### Step 6: Troubleshooting
Cover common issues:
- "Server not connecting" → Check config path, restart Claude Desktop, verify Node.js version
- "Authentication failing" → Cookie may have expired, get a fresh one
- "Empty results" → Account might be private, or rate limited
- "Cannot find module" → Run `npm install` in the xactions directory

## Important Notes
- The MCP server uses Puppeteer (headless Chrome) for browser automation
- It includes built-in rate limiting with human-like delays
- My auth_token is only stored in memory during the session
- All operations are free — no Twitter API key needed

Please walk me through this step by step, checking in with me after each step before moving on.
