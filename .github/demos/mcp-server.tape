# XActions - MCP Server Demo
# Run with: vhs mcp-server.tape

Output mcp-server.gif
Output mcp-server.webm

Set Shell "bash"
Set FontSize 16
Set Width 900
Set Height 600
Set Theme "Catppuccin Mocha"
Set Padding 20
Set Framerate 30

# Title
Type "# 🤖 XActions MCP Server - For Claude & AI Agents"
Enter
Sleep 500ms
Enter

# Show config setup
Type "# Add to Claude Desktop config (~/.config/claude/config.json)"
Enter
Sleep 500ms
Type "cat claude-config.json"
Enter
Sleep 500ms

Type@30ms '{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["xactions", "mcp", "--stdio"]
    }
  }
}'
Enter
Sleep 2s
Enter

# Start MCP server
Type "npx xactions mcp --stdio"
Enter
Sleep 1s

Type@50ms "🤖 XActions MCP Server v1.0.0"
Enter
Type@50ms "📡 Listening on stdio..."
Enter
Type@50ms ""
Enter
Type@50ms "Available Tools:"
Enter
Type@50ms "  • scrape_followers - Get account followers"
Enter
Type@50ms "  • scrape_following - Get accounts someone follows"
Enter
Type@50ms "  • scrape_tweets    - Get user's tweets"
Enter
Type@50ms "  • detect_unfollowers - Find who unfollowed you"
Enter
Type@50ms "  • unfollow_non_followers - Clean up following list"
Enter
Sleep 1s

Type@50ms ""
Enter
Type@50ms "⚡ Ready for AI agent requests!"
Enter
Sleep 3s
