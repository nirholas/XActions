# XActions - CLI Demo
# Run with: vhs cli.tape

Output cli.gif
Output cli.webm

Set Shell "bash"
Set FontSize 16
Set Width 900
Set Height 500
Set Theme "Catppuccin Mocha"
Set Padding 20
Set Framerate 30

# Title
Type "# 🚀 XActions CLI"
Enter
Sleep 500ms
Enter

# Show help
Type "npx xactions --help"
Enter
Sleep 1s

# Simulated help output
Type@100ms "
🚀 XActions - X/Twitter Automation Toolkit

Usage: xactions <command> [options]

Commands:
  unfollow     Unfollow accounts (non-followers, everyone)
  scrape       Scrape followers, following, tweets
  monitor      Monitor account for changes
  mcp          Start MCP server for AI agents
  detect       Detect unfollowers

Options:
  --help       Show help
  --version    Show version

Examples:
  xactions unfollow --non-followers
  xactions scrape --followers @username
  xactions mcp --stdio
"
Sleep 2s
Enter

# Run a command
Type "npx xactions mcp --stdio"
Enter
Sleep 1s

Type@50ms "🤖 MCP Server started on stdio"
Enter
Type@50ms "📡 Waiting for AI agent connections..."
Enter
Sleep 2s
