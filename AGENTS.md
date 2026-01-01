# AGENTS.md - AI Agent Instructions for XActions

This file provides guidance for AI coding agents (GitHub Copilot, Claude, Cursor, etc.) working on the XActions codebase.

## 🎯 Project Overview

**XActions** is a complete X/Twitter automation toolkit that provides:
- Browser console scripts (paste-and-run automation)
- CLI tools for power users
- Node.js library for developers
- MCP server for AI agents
- Web dashboard for non-coders

**Author:** nichxbt ([@nichxbt](https://twitter.com/nichxbt))

## 📁 Project Structure

```
xactions/
├── src/                    # Core scripts and modules
│   ├── automation/         # Automation features (autoLiker, followEngagers, etc.)
│   ├── scrapers/           # Scraping modules
│   ├── cli/                # CLI implementation
│   ├── mcp/                # MCP server for AI agents
│   └── *.js                # Standalone scripts (unfollowEveryone, leaveAllCommunities, etc.)
├── api/                    # Express.js backend
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic
│   ├── middleware/         # Auth, rate limiting
│   └── config/             # Configuration
├── dashboard/              # Static HTML frontend
├── docs/                   # Documentation
│   └── examples/           # Script usage examples (one .md per feature)
├── archive/                # Legacy/browser-only scripts
├── prisma/                 # Database schema
└── bin/                    # CLI entry point
```

## 🔧 Key Patterns

### Browser Console Scripts

Scripts in `src/` and `archive/` are designed to run in browser console on x.com:

```javascript
// Standard pattern for browser scripts
(() => {
  // Selectors - use data-testid when available
  const $someButton = '[data-testid="someButton"]';
  const $someElement = 'button[aria-label^="Something"]';
  
  // Sleep helper
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Main async function
  const run = async () => {
    // Script logic
  };
  
  run();
})();
```

### Important Selectors (X/Twitter DOM)

These selectors are known to work as of January 2026:

| Element | Selector |
|---------|----------|
| Unfollow button | `[data-testid$="-unfollow"]` |
| Confirmation button | `[data-testid="confirmationSheetConfirm"]` |
| Back button | `[data-testid="app-bar-back"]` |
| Joined (community) | `button[aria-label^="Joined"]` |
| Communities nav | `a[aria-label="Communities"]` |
| Community links | `a[href^="/i/communities/"]` |
| Follow indicator | `[data-testid="userFollowIndicator"]` |
| Tweet | `article[data-testid="tweet"]` |
| Tweet text | `[data-testid="tweetText"]` |
| Like button | `[data-testid="like"]` |
| User cell | `[data-testid="UserCell"]` |

### State Persistence

For scripts that navigate between pages, use `sessionStorage`:

```javascript
// Track processed items to avoid loops
const getProcessed = () => {
  try { return JSON.parse(sessionStorage.getItem('xactions_key') || '[]'); }
  catch { return []; }
};

const markProcessed = (id) => {
  const items = getProcessed();
  if (!items.includes(id)) {
    items.push(id);
    sessionStorage.setItem('xactions_key', JSON.stringify(items));
  }
};
```

## 📝 Adding New Features

When adding a new automation feature:

1. **Create the script** in `src/` following existing patterns
2. **Add documentation** in `docs/examples/your-feature.md`
3. **Update README.md** - add to examples and feature matrix
4. **Keep archive copy** in `archive/` if it's a browser-only script

### Documentation Template

```markdown
# 🎯 Feature Name

Brief description.

## 📋 What It Does

1. Step one
2. Step two

## 🌐 Browser Console Script

\`\`\`javascript
// Go to: x.com/relevant/page
// Paste script here
\`\`\`

## ⚠️ Notes

- Important caveats
```

## 🚫 Common Pitfalls

1. **DOM changes** - X/Twitter frequently updates their DOM. Always verify selectors.
2. **Rate limiting** - Add delays between actions (1-3 seconds minimum)
3. **Navigation** - Scripts stop on page navigation. Use sessionStorage for state.
4. **Confirmation dialogs** - Many actions require clicking a confirm button
5. **Loops** - Track processed items to avoid infinite loops

## 🧪 Testing Scripts

1. Test on x.com in browser console
2. Start with small batches
3. Watch for rate limit errors
4. Verify selectors still work

## 💡 Code Style

- Use `const` over `let` when possible
- Async/await over raw promises
- Descriptive console.log with emojis for visibility
- Comment complex selectors
- Author credit: `// by nichxbt`

## 🔗 Useful References

- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [docs/examples/](docs/examples/) - All feature documentation
- [archive/](archive/) - Legacy browser scripts
- Working scripts to reference:
  - `src/unfollowEveryone.js`
  - `src/leaveAllCommunities.js`
  - `archive/unfollowback.js`
