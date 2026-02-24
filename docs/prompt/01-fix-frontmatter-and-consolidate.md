# Prompt 01: Fix Broken Frontmatter & Consolidate Duplicate Skills

You are an expert at Claude Agent Skills architecture. You are working on the XActions project — an open-source X/Twitter automation toolkit.

## Your Task

Fix **15 SKILL.md files** that have broken YAML frontmatter and **merge 2 pairs of duplicate skills**.

## Problem 1: Broken Frontmatter

15 of 27 skills have their YAML frontmatter wrapped in a ` ```skill ` code fence, which prevents YAML parsers from reading the metadata. Claude's skill discovery relies on proper `---` delimited frontmatter.

**Broken format (current):**
````
```skill
---
name: posting-content
description: ...
---

# Content here
```
````

**Correct format (target):**
```
---
name: posting-content
description: ...
---

# Content here
```

### Files to fix (all in `/skills/*/SKILL.md`):

1. `articles-longform/SKILL.md`
2. `bookmarks-management/SKILL.md`  
3. `business-ads/SKILL.md`
4. `creator-monetization/SKILL.md`
5. `direct-messages/SKILL.md`
6. `discovery-explore/SKILL.md`
7. `engagement-interaction/SKILL.md`
8. `grok-ai/SKILL.md`
9. `lists-management/SKILL.md`
10. `notifications-management/SKILL.md`
11. `posting-content/SKILL.md`
12. `premium-subscriptions/SKILL.md`
13. `profile-management/SKILL.md`
14. `settings-privacy/SKILL.md`
15. `spaces-live/SKILL.md`

### Rules

For each file:
- Remove the opening ` ```skill ` line (first line of the file)
- Remove the closing ` ``` ` line (last line of the file, if present)
- Ensure the file starts with `---` on line 1
- Keep all content between frontmatter and closing fence exactly as-is
- Keep the `license`, `metadata` fields — they're fine

## Problem 2: Duplicate Skills

### Merge 1: `content-posting` + `posting-content` → keep `content-posting`

`content-posting/SKILL.md` (147 lines, proper frontmatter) references actual scripts: `src/postThread.js`, `src/schedulePosts.js`, `src/createPoll.js`, `src/autoRepost.js`. This is the higher-quality one.

`posting-content/SKILL.md` (98 lines, broken frontmatter) has useful additions: MCP tools list, API endpoints, additional selectors, and info about 2026 features.

**Merge strategy:**
1. Start with `content-posting/SKILL.md` as the base
2. Add a new `## MCP Tools` section from `posting-content`'s MCP Tools list
3. Add a `## Key Selectors` section from `posting-content`'s selector table
4. Add a brief `## 2026 Features` note (2-3 lines mentioning image polls, audio articles, shuffle choices — keep it very short)
5. Do NOT include the API endpoints — those belong in API docs, not a skill file
6. Delete the `posting-content/` directory entirely (both SKILL.md and agent.md)
7. Ensure the merged file stays under 200 lines

### Merge 2: `messaging-engagement` + `direct-messages` → keep `direct-messages`

`direct-messages/SKILL.md` (79 lines, broken frontmatter) focuses narrowly on DM features + has `agent.md`.

`messaging-engagement/SKILL.md` (170 lines, proper frontmatter) is a superset covering DMs, communities, Spaces, and engagement — too broad for one skill (those topics have their own skills).

**Merge strategy:**
1. Fix `direct-messages/SKILL.md` frontmatter (remove code fence)
2. From `messaging-engagement`, take ONLY the DM-specific content (send DM script, DM selectors, auto-DM features) and merge into `direct-messages`
3. Delete the `messaging-engagement/` directory entirely
4. Ensure the merged file stays under 120 lines
5. Update description to: "Send, manage, and automate direct messages on X/Twitter. View DM history, auto-send welcome DMs, and filter conversations. Use when users need to manage DMs or automate direct messaging."

## Validation

After all changes:
1. Every SKILL.md file must start with `---` on line 1
2. Every SKILL.md must have valid `name` and `description` fields
3. No file should start with ` ```skill `
4. No duplicate skill directories should remain
5. Total skills should be 25 (27 - 2 removed)
6. All `name` fields must use lowercase-letters-numbers-hyphens only

## Output

For each file you change, show the complete new file content. For directories you delete, confirm the deletion.
