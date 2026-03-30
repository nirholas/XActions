# xactions-mcp

> XActions MCP Server — X/Twitter automation for AI agents. No API fees.

This is the standalone MCP server package for [XActions](https://github.com/nirholas/XActions). It enables AI assistants like Claude, Cursor, Windsurf, and GPT to automate X/Twitter tasks.

## Quick Start

```bash
npx xactions-mcp
```

## Claude Desktop Config

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions-mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
      }
    }
  }
}
```

## Documentation

See the full setup guide: [xactions.app](https://xactions.app) | [GitHub](https://github.com/nirholas/XActions)

## License

MIT — by [@nichxbt](https://x.com/nichxbt)
