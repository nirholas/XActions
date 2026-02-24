# Prompt 08: Validate and Test All Skills

You are an expert at Claude Agent Skills quality assurance. You are working on the XActions project.

## Context

The XActions project has just undergone a major skills overhaul:
- 15 SKILL.md files had broken frontmatter → fixed
- 2 duplicate skills merged → 25 core skills remain
- 5 new workflow skills added → 30 total skills
- AGENTS.md rewritten as a concise hub
- CLAUDE.md rewritten as the root instruction file
- Progressive disclosure added (reference files) to 5 complex skills
- AGENT_PROMPTS.md monolith replaced with individual skills

## Your Task

Perform a comprehensive validation of the entire skills system.

## Validation Checklist

### 1. YAML Frontmatter Validation (ALL 30 skills)

For every file matching `skills/*/SKILL.md`:

- [ ] File starts with `---` on line 1 (not ` ```skill ` or anything else)
- [ ] Has `name` field: lowercase-letters-numbers-hyphens only, max 64 chars
- [ ] Has `description` field: non-empty, max 1024 chars, no XML tags
- [ ] `name` does not contain "anthropic" or "claude"
- [ ] Description is in third person (no "I", "you", "we")
- [ ] Description includes BOTH what the skill does AND when to use it

Report any failures with the exact file path and issue.

### 2. Body Length Check

For every SKILL.md:
- [ ] Body (after frontmatter) is under 500 lines
- [ ] Ideally under 120 lines
- [ ] If over 120 lines, has reference files for progressive disclosure

Report line counts for all skills, sorted longest to shortest.

### 3. File Reference Integrity

For every SKILL.md that contains markdown links:
- [ ] All referenced files actually exist at the linked path
- [ ] References are one level deep (no chains: SKILL.md → ref.md → ref2.md)
- [ ] Referenced source files (`src/*.js`, `scripts/*.js`) actually exist

Report any broken links.

### 4. No Duplicates

- [ ] No two skills have the same `name` field value
- [ ] No two skills cover substantially identical functionality
- [ ] Old duplicate directories (`posting-content/`, `messaging-engagement/`) are deleted

### 5. Consistency Check

- [ ] All skills use the same metadata format (`license: MIT`, `metadata: { author: nichxbt, version: "3.0" }`)
- [ ] All descriptions end with a period
- [ ] No descriptions start with "This skill..."
- [ ] Naming follows gerund or noun-phrase pattern consistently
- [ ] All use the same heading style (# for title, ## for sections)

### 6. Hub Files Check

- [ ] `AGENTS.md` is under 150 lines
- [ ] `CLAUDE.md` is under 120 lines
- [ ] Both reference the skills system
- [ ] `docs/agents/selectors.md` exists and has the selector table
- [ ] `docs/agents/browser-script-patterns.md` exists
- [ ] `docs/agents/contributing-features.md` exists
- [ ] `AGENT_PROMPTS.md` is deleted

### 7. Progressive Disclosure Check

For skills with `references/` directories:
- [ ] SKILL.md links to reference files
- [ ] Reference files have a table of contents (if >50 lines)
- [ ] No circular or deeply nested references

### 8. Discovery Test

Simulate Claude's skill discovery by reading ONLY the name + description of all 30 skills. For each of these user queries, determine which skill(s) should activate:

| Query | Expected Skill(s) |
|-------|-------------------|
| "Unfollow everyone who doesn't follow me back" | unfollow-management |
| "Analyze my tweet engagement" | analytics-insights |
| "Post a thread about AI" | content-posting |
| "Scrape all followers of @elonmusk" | twitter-scraping |
| "Block all bot accounts" | blocking-muting-management |
| "Find leads in the SaaS industry on Twitter" | lead-generation |
| "Generate a viral thread" | viral-thread-generation |
| "Check my account health" | community-health-monitoring |
| "Analyze my competitor @rival" | competitor-intelligence |
| "Manage my X lists" | lists-management |
| "Leave all Twitter communities" | community-management |
| "Download a Twitter video" | twitter-scraping |
| "Set up the MCP server" | xactions-mcp-server |
| "Auto-like tweets about crypto" | growth-automation |
| "Clear all my bookmarks" | bookmarks-management |

If any query would fail to match or would match the wrong skill, flag it and suggest description improvements.

## Output Format

### Pass/Fail Summary
```
Frontmatter:     X/30 pass
Body length:     X/30 pass  
References:      X/X valid
No duplicates:   PASS/FAIL
Consistency:     X issues found
Hub files:       X/7 pass
Disclosure:      X/X valid
Discovery:       X/15 correct matches
```

### Issues List
For each issue found:
- File path
- Issue type (frontmatter/length/reference/duplicate/consistency/hub/disclosure/discovery)
- Specific problem
- Suggested fix

### Recommended Priority Fixes
Rank the top 5 most important issues to fix first.
