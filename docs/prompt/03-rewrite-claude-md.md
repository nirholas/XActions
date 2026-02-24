# Prompt 03: Rewrite CLAUDE.md as a Proper Root Instruction File

You are an expert at Claude Agent Skills architecture and Claude Code/Claude Desktop configuration. You are working on the XActions project.

## Context

Claude Code reads `CLAUDE.md` from the project root as its primary instruction file. Claude Desktop's MCP integration also checks for it. Currently, XActions' `CLAUDE.md` is just 35 lines of codespace hints — wasting the most important file for Claude agent configuration.

## Your Task

Transform `CLAUDE.md` into the **optimal root instruction file** for Claude agents working on XActions. This is NOT a copy of AGENTS.md — it's specifically optimized for Claude's behavior.

## What CLAUDE.md Should Contain (~120 lines max)

### Section 1: Project Identity (5 lines)
```
# XActions

X/Twitter automation toolkit: browser scripts, CLI, Node.js library, MCP server, dashboard.
By nichxbt. MIT license. No Twitter API fees — uses browser automation.
```

### Section 2: Architecture Quick Map (15 lines)
Brief overview of where things live. NOT a full tree — just the top-level directories with one-line purposes. Claude can explore with tools.

### Section 3: Skills System (10 lines)
Explain that 25 skills exist in `skills/*/SKILL.md` and Claude should read the relevant SKILL.md when a user's request matches a skill category. List the skill names in a compact format (comma-separated, not a table).

### Section 4: Key Technical Context (20 lines)
Things Claude genuinely doesn't know and can't infer:
- Browser scripts run in DevTools console on x.com, NOT in Node.js
- Scripts use `data-testid` selectors that change — see `docs/agents/selectors.md` for current verified selectors
- `src/automation/core.js` must be pasted first before any script in `src/automation/` 
- State persistence uses `sessionStorage` (lost on tab close)
- CLI entry point is `bin/unfollowx`, installed via `npm install -g xactions`
- MCP server is `src/mcp/server.js`

### Section 5: Code Conventions (10 lines)
Only conventions that differ from defaults:
- `const` over `let`
- Author credit: `// by nichxbt`
- Console logs use emojis for visibility
- Sleep between actions: 1-3s minimum to avoid rate limits

### Section 6: Codespace/Environment (15 lines)
Keep the existing terminal management and performance tips — these are critical for agent operation in Codespaces.

### Section 7: When Making Changes (10 lines)
- Test browser scripts on x.com in DevTools console
- Start with small batches
- Update SKILL.md if adding features to a skill area
- Update docs/examples/ for new features
- Keep README.md feature matrix current

## Rules

1. **Under 120 lines** — every line must justify its token cost
2. **No explanations of things Claude already knows** (what JavaScript is, what async/await does, what an API is)
3. **Third person** throughout
4. **No YAML frontmatter** — CLAUDE.md is not a skill file
5. **No emojis in headers** — clean, scannable
6. **Progressive disclosure** — point to reference files, don't embed
7. **Test the "Does Claude need this?" question** on every paragraph

## Anti-Patterns to Avoid

- Don't list every file in src/ — Claude can explore
- Don't explain DOM concepts — Claude knows HTML/CSS
- Don't put the full selector table here — reference it
- Don't include setup instructions — Claude can read package.json
- Don't add a CONTRIBUTING section — reference CONTRIBUTING.md

## Output

Provide the complete CLAUDE.md file content. Count the lines and confirm it's under 120.
