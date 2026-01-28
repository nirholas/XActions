# Using xActions with OpenRouter

xActions is an MCP server that provides AI agents with the ability to interact with social platforms like Twitter/X. Use it with any OpenRouter-powered AI client.

## What is OpenRouter?

[OpenRouter](https://openrouter.ai) provides a unified API to access 200+ AI models from Anthropic, OpenAI, Google, Meta, and more.

## Quick Setup

### 1. Get Your OpenRouter API Key

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Generate an API key at [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)

### 2. Configure Your AI Client

Set OpenRouter as your model provider in your AI client (Claude Desktop, Cursor, etc.):

```json
{
  "modelProvider": {
    "type": "openrouter",
    "apiKey": "sk-or-v1-your-key-here"
  }
}
```

### 3. Add xActions MCP Server

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "@nirholas/xactions"],
      "env": {
        "TWITTER_API_KEY": "your-twitter-api-key",
        "TWITTER_API_SECRET": "your-twitter-api-secret",
        "TWITTER_ACCESS_TOKEN": "your-access-token",
        "TWITTER_ACCESS_SECRET": "your-access-secret"
      }
    }
  }
}
```

### 4. Start Using

Ask your AI to:
- "Post a tweet about the latest ETH price"
- "Search for tweets about Solana"
- "Get the latest tweets from @VitalikButerin"
- "Reply to this tweet with a summary"

## Available Tools

| Tool | Description |
|------|-------------|
| `post_tweet` | Post a new tweet |
| `search_tweets` | Search for tweets by query |
| `get_user_tweets` | Get tweets from a specific user |
| `reply_to_tweet` | Reply to an existing tweet |
| `like_tweet` | Like a tweet |
| `retweet` | Retweet a post |
| `get_trending` | Get trending topics |

## Getting Twitter API Keys

1. Apply for a Twitter Developer account at [developer.twitter.com](https://developer.twitter.com)
2. Create a new project and app
3. Generate your API keys and access tokens
4. Add them to your MCP server configuration

## Resources

- [GitHub Repository](https://github.com/nirholas/xactions)
- [Twitter API Documentation](https://developer.twitter.com/en/docs)
- [OpenRouter Documentation](https://openrouter.ai/docs)

## Support

- [GitHub Issues](https://github.com/nirholas/xactions/issues)
- Twitter: [@nichxbt](https://x.com/nichxbt)
