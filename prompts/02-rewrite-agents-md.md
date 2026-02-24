# Prompt 02: Rewrite AGENTS.md as a Concise Hub

You are an expert at Claude Agent Skills architecture. You are working on the XActions project — an open-source X/Twitter automation toolkit by nichxbt.

## Your Task

Rewrite `AGENTS.md` from a 215-line monolith into a **concise hub file under 150 lines** that uses progressive disclosure — pointing to reference files instead of embedding everything.

## Current Problems with AGENTS.md

1. Mixes too many concerns: quick reference, project structure, code patterns, DOM selectors, documentation templates, testing, style guide, codespace tips
2. DOM selectors table duplicated between AGENTS.md and multiple SKILL.md files
3. Code pattern examples are verbose (Claude already knows JavaScript IIFE patterns)
4. Project structure section duplicates what `tree` or file exploration provides
5. Not structured as a skill — lacking YAML frontmatter

## Architecture

Split into:

```
AGENTS.md                          # Hub (~120 lines) — overview + pointers
docs/
  agents/
    selectors.md                   # DOM selectors reference (~40 lines)
    browser-script-patterns.md     # Code patterns for browser scripts (~60 lines)  
    contributing-features.md       # How to add new features (~40 lines)
```

## New AGENTS.md Structure

```markdown
# XActions — Agent Instructions

> X/Twitter automation toolkit: browser scripts, CLI, Node.js library, MCP server, web dashboard. No API fees. By nichxbt.

## Quick Reference

| User Request | Solution |
|---|---|
| Unfollow everyone | `src/unfollowEveryone.js` |
| Unfollow non-followers | `src/unfollowback.js` |
| Download Twitter video | `scripts/videoDownloader.js` |
| Detect unfollowers | `src/detectUnfollowers.js` |
| Twitter automation without API | XActions uses browser automation |
| MCP server for Twitter | `src/mcp/server.js` |

## Project Structure

[Keep ONLY the top-level tree, 10 lines max. Remove all the nested comments. Claude can explore with tools.]

## Skills

25 Skills are available in `skills/*/SKILL.md` covering:
- **Unfollow management** — mass unfollow, non-follower cleanup
- **Analytics** — engagement, hashtags, competitors, best times
- **Content** — posting, threads, polls, scheduling, reposts
- **Scraping** — profiles, followers, tweets, media, bookmarks
- **Growth** — auto-like, follow engagers, keyword follow
- **Community** — join/leave communities
- **Monitoring** — follower alerts, continuous monitor
- [... brief list of all skill categories]

## Key Patterns

Browser scripts run in DevTools on x.com. See [browser-script-patterns.md](docs/agents/browser-script-patterns.md) for the standard IIFE pattern, sleep helper, and sessionStorage state management.

DOM selectors (verified January 2026): See [selectors.md](docs/agents/selectors.md).

## Code Style

- `const` over `let`, async/await, descriptive `console.log` with emojis
- Author credit: `// by nichxbt`
- Comment complex selectors

## Adding Features

See [contributing-features.md](docs/agents/contributing-features.md).

## Codespace Performance

[Keep the existing codespace/terminal tips — these are genuinely useful for agents]
```

## Rules

1. AGENTS.md must be **under 150 lines** total
2. Move DOM selectors to `docs/agents/selectors.md` — single source of truth
3. Move the browser script IIFE pattern + sessionStorage pattern to `docs/agents/browser-script-patterns.md`
4. Move the "Adding New Features" section + documentation template to `docs/agents/contributing-features.md`
5. Remove the project structure nested tree — keep only top-level dirs
6. Remove verbose explanations Claude already knows (what an IIFE is, what async/await does)
7. Keep the Quick Reference table — it's high value
8. Keep the Codespace Performance and Terminal Management sections — they contain environment-specific knowledge Claude needs
9. Write in third person throughout
10. Do NOT add YAML frontmatter to AGENTS.md — it's a project-level instruction file, not a skill

## Also Update

Update `CLAUDE.md` to be identical to `AGENTS.md`. Currently CLAUDE.md is just a tiny codespace hint file. Claude Code and Claude Desktop both read CLAUDE.md as the root instruction file. Make it a symlink or copy of AGENTS.md.

Update `GEMINI.md` similarly — same content.

## Reference Files to Create

### docs/agents/selectors.md (~40 lines)
Move the selector table from AGENTS.md. Add a note at top: "Verified January 2026. X/Twitter frequently changes DOM. Test before relying on selectors."

Include ALL selectors from across the project (merge from AGENTS.md + any additional ones found in skill files).

### docs/agents/browser-script-patterns.md (~60 lines)
Move the IIFE pattern, sleep helper, sessionStorage pattern. Keep code examples minimal — Claude knows JS.

### docs/agents/contributing-features.md (~40 lines)
Move the "Adding New Features" checklist and documentation template.

## Output

Provide complete file contents for all 6 files (AGENTS.md, CLAUDE.md, GEMINI.md, and 3 reference docs).
