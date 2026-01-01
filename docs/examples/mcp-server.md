# 🤖 MCP Server - AI Agent Integration

Integrate X/Twitter automation directly with AI assistants like Claude using the Model Context Protocol.

---

## 🧠 What It Is

**Model Context Protocol (MCP)** is a cutting-edge standard that enables AI assistants to interact with external tools and services. XActions includes a fully-featured MCP server that exposes X/Twitter automation capabilities directly to AI agents.

**This means you can:**
- Ask Claude to analyze your Twitter followers
- Have AI find accounts that don't follow you back
- Let AI search and analyze tweets on any topic
- Automate posting, following, and engagement through natural language

**The future of social media automation is conversational.**

> 🚀 **Cutting-Edge Technology**
>
> MCP is the protocol powering the next generation of AI agent integrations.
> XActions is one of the first open-source tools to offer full MCP support for X/Twitter.

---

## 📋 Prerequisites

Before using the MCP server:

1. ✅ Node.js 18+ installed
2. ✅ XActions package installed (`npm install xactions`)
3. ✅ Claude Desktop app (for Claude integration)
4. ✅ Your X/Twitter `auth_token` cookie (for authenticated operations)

---

## 🔧 Setup for Claude Desktop

To connect XActions with Claude Desktop, add the following to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

### Configuration

```json
{
  "mcpServers": {
    "xactions": {
      "command": "node",
      "args": ["/path/to/your/node_modules/xactions/src/mcp/server.js"],
      "env": {}
    }
  }
}
```

**Or if you cloned the repository:**

```json
{
  "mcpServers": {
    "xactions": {
      "command": "node",
      "args": ["/path/to/xactions/src/mcp/server.js"],
      "env": {}
    }
  }
}
```

**Using npx (easiest):**

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

After saving, restart Claude Desktop to load the MCP server.

---

## 🛠️ Available Tools

The XActions MCP server exposes **12 powerful tools** for X/Twitter automation:

### 🔐 Authentication

| Tool | Description |
|------|-------------|
| `x_login` | Login to X/Twitter using a session cookie (`auth_token`). Required before authenticated operations. |

### 📊 Data Scraping

| Tool | Description |
|------|-------------|
| `x_get_profile` | Get profile information for any user including bio, follower count, location, website, and join date. |
| `x_get_followers` | Scrape followers for an account. Returns usernames, display names, and bios. |
| `x_get_following` | Scrape accounts a user follows. Includes whether they follow back. |
| `x_get_non_followers` | Find accounts you follow that don't follow you back. |
| `x_get_tweets` | Scrape recent tweets from any user's profile with engagement stats. |
| `x_search_tweets` | Search for tweets matching any query. Supports advanced operators. |

### ⚡ Actions

| Tool | Description |
|------|-------------|
| `x_follow` | Follow an X/Twitter user. |
| `x_unfollow` | Unfollow an X/Twitter user. |
| `x_post_tweet` | Post a new tweet (max 280 characters). |
| `x_like` | Like a tweet by its URL. |
| `x_retweet` | Retweet a tweet by its URL. |

---

## 📖 Tool Reference

### x_login

Login using your session cookie. Required before most operations.

**Parameters:**
- `cookie` (required): Your `auth_token` cookie value from X.com

**Example:**
```
"Login to X with cookie abc123xyz..."
```

---

### x_get_profile

Get detailed profile information for any X user.

**Parameters:**
- `username` (required): Twitter username without @

**Returns:** Name, username, bio, location, website, join date, follower count, following count

---

### x_get_followers

Scrape a user's followers list.

**Parameters:**
- `username` (required): Twitter username without @
- `limit` (optional): Maximum followers to scrape (default: 100)

**Returns:** Array of followers with username, name, and bio

---

### x_get_following

Scrape accounts a user follows.

**Parameters:**
- `username` (required): Twitter username without @
- `limit` (optional): Maximum to scrape (default: 100)

**Returns:** Array with username, name, and whether they follow back

---

### x_get_non_followers

Find accounts you follow that don't follow back.

**Parameters:**
- `username` (required): Your Twitter username without @

**Returns:** Total following count, list of non-followers, non-follower count

---

### x_get_tweets

Scrape recent tweets from a user's profile.

**Parameters:**
- `username` (required): Twitter username without @
- `limit` (optional): Maximum tweets (default: 50)

**Returns:** Array of tweets with text, timestamp, likes, retweets, replies, and URL

---

### x_search_tweets

Search for tweets matching a query.

**Parameters:**
- `query` (required): Search query (supports operators like `from:`, `to:`, `#hashtag`)
- `limit` (optional): Maximum results (default: 50)

**Returns:** Array of tweets with text, author, timestamp, and URL

---

### x_follow

Follow a user on X/Twitter.

**Parameters:**
- `username` (required): Username to follow without @

**Returns:** Success/failure status

---

### x_unfollow

Unfollow a user on X/Twitter.

**Parameters:**
- `username` (required): Username to unfollow without @

**Returns:** Success/failure status

---

### x_post_tweet

Post a new tweet.

**Parameters:**
- `text` (required): Tweet content (max 280 characters)

**Returns:** Success/failure status

---

### x_like

Like a tweet by URL.

**Parameters:**
- `url` (required): Full URL of the tweet

**Returns:** Success/failure status

---

### x_retweet

Retweet a tweet by URL.

**Parameters:**
- `url` (required): Full URL of the tweet

**Returns:** Success/failure status

---

## 💬 Example Prompts for Claude

Once configured, you can interact with X/Twitter through natural conversation:

### Finding Non-Followers

```
"Find everyone I follow who doesn't follow me back. My username is johndoe."
```

```
"Who are my non-followers? I'm @techfounder"
```

### Searching Tweets

```
"Search for tweets about AI startups from the last week"
```

```
"Find tweets mentioning #buildinpublic from indie hackers"
```

```
"Search for tweets from @elonmusk about AI"
```

### Profile Analysis

```
"Get profile info for @elonmusk"
```

```
"What does Elon Musk's Twitter bio say? How many followers?"
```

```
"Analyze the profile of @paulg - what topics does he tweet about?"
```

### Scraping Followers/Following

```
"Get the first 50 followers of @ycombinator"
```

```
"Who is @naval following? Show me the first 100 accounts."
```

### Posting & Engagement

```
"Post a tweet saying: Just discovered XActions - the best X automation toolkit! 🚀"
```

```
"Like this tweet: https://x.com/user/status/123456789"
```

```
"Retweet the latest announcement from @OpenAI"
```

### Advanced Analysis

```
"Scrape the last 50 tweets from @pmarca and summarize the main topics"
```

```
"Find my non-followers and analyze their profiles - which ones are bots?"
```

```
"Search for tweets about 'YC startup' and identify the most engaged ones"
```

---

## 🚀 Running the MCP Server

### Via npm script

```bash
npm run mcp
```

### Direct execution

```bash
node src/mcp/server.js
```

### Via npx

```bash
npx xactions mcp
```

The server runs on **stdio** (standard input/output) which is the transport Claude Desktop uses to communicate with MCP servers.

---

## 🔐 Authentication Flow

The MCP server uses session cookie authentication:

1. **Get your auth_token:**
   - Open X.com in your browser
   - Open Developer Tools (F12)
   - Go to Application → Cookies → x.com
   - Find `auth_token` and copy the value

2. **Login via Claude:**
   ```
   "Login to X with this auth token: [your_token_here]"
   ```

3. **Use any tool:**
   Once logged in, all authenticated operations will work.

> ⚠️ **Security Note:**
> Your auth_token is sensitive. Never share it publicly. The MCP server only stores it in memory during the session.

---

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Claude Desktop │ ──MCP── │  XActions Server │ ──HTTP──│   X.com     │
│   (AI Agent)    │  stdio  │   (Puppeteer)    │         │  (Twitter)  │
└─────────────────┘         └──────────────────┘         └─────────────┘
```

The XActions MCP server uses:
- **Puppeteer** with stealth plugins to avoid detection
- **Human-like delays** between actions
- **Session persistence** for authenticated operations
- **Headless Chrome** for efficient scraping

---

## ⚡ Rate Limiting

The MCP server includes built-in rate limiting:

- Random delays between 1-3 seconds per action
- Automatic retry logic for scraping
- Scroll-based pagination for large lists

This mimics human behavior and helps avoid rate limits from X/Twitter.

---

## 🐛 Troubleshooting

### Server not connecting to Claude

1. Check the path in `claude_desktop_config.json` is correct
2. Ensure Node.js 18+ is installed
3. Restart Claude Desktop after config changes

### Authentication failing

1. Make sure your `auth_token` cookie is current (cookies expire)
2. Get a fresh cookie from X.com
3. Ensure you're logged into X.com in your browser first

### Scraping returns empty results

1. The account might be private
2. X.com might have rate limited your session
3. Try with a smaller `limit` parameter

### "Cannot find module" errors

```bash
cd /path/to/xactions
npm install
```

---

## 📚 Learn More

- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
- [XActions Documentation](https://xactions.app/docs)

---

## 👤 Author

**nich** ([@nichxbt](https://x.com/nichxbt)) - Creator of XActions

---

## 📄 License

MIT License - Use freely in your own projects.
