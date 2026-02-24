# Prompt 04: Rewrite Tier-2 Skills — Batch 1 (8 Skills)

You are an expert at Claude Agent Skills, following the official best practices from https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

You are working on the XActions project — an open-source X/Twitter automation toolkit by nichxbt.

## Your Task

Rewrite 8 SKILL.md files that are currently generic/aspirational to be **specific, actionable, and concise** — matching the quality of the project's best skills (like `unfollow-management` and `analytics-insights`).

## Quality Standard (from the best existing skills)

The good skills share these traits:
1. Start with a **script selection table** linking to actual files
2. Explain **what each script does** concisely (2-3 sentences)
3. Include **how to use** (navigate to URL → paste → run)
4. List **DOM selectors** the script depends on
5. Note **timing/rate-limit considerations**
6. No fluff, no explaining what X/Twitter is, no restating what Claude already knows

## Rules for ALL rewrites

1. **Only reference files that actually exist** in the repository. Here are the actual source files:

```
src/articlePublisher.js       src/bookmarkManager.js
src/bookmarkOrganizer.js      src/businessTools.js  
src/clearAllBookmarks.js      src/creatorStudio.js
src/discoveryExplore.js       src/dmManager.js
src/engagementManager.js      src/grokIntegration.js
src/listManager.js            src/manageMutedWords.js
src/notificationManager.js    src/pollCreator.js
src/premiumManager.js         src/profileManager.js
src/qrCodeSharing.js          src/removeFollowers.js
src/reportSpam.js             src/scrapeSpaces.js
src/sendDirectMessage.js      src/settingsManager.js
src/spacesManager.js          src/unlikeAllPosts.js
src/updateProfile.js
scripts/scrapeBookmarks.js    scripts/scrapeLikes.js
```

2. **YAML frontmatter** must start with `---` on line 1 (no code fences)
3. **name**: lowercase-letters-numbers-hyphens only, max 64 chars
4. **description**: third person, includes what it does AND when to use it, max 1024 chars
5. Keep `license: MIT` and `metadata: { author: nichxbt, version: "3.0" }`
6. **Body under 120 lines** per skill (aim for 60-100)
7. **Remove agent.md** files — their content should be folded into SKILL.md where useful, or discarded if it's just generic capability descriptions
8. **No API endpoint listings** — those belong in API docs
9. **No MCP tool listings** unless the skill is specifically about MCP
10. Descriptions should NOT start with "This skill..." — describe the action directly

## Skills to Rewrite (Batch 1)

### 1. `articles-longform` → rename to `articles-longform`
**Existing source files:** `src/articlePublisher.js`
**What it should cover:** Publishing long-form articles on X (Premium+ feature), formatting, embeds
**Keep it short** — this is a single-script skill

### 2. `bookmarks-management`
**Existing source files:** `src/bookmarkManager.js`, `src/bookmarkOrganizer.js`, `src/clearAllBookmarks.js`, `scripts/scrapeBookmarks.js`
**What it should cover:** Managing, organizing, clearing, and exporting X bookmarks

### 3. `business-ads`
**Existing source files:** `src/businessTools.js`
**What it should cover:** X business features, professional tools. Keep it honest — if there's only one script, don't oversell it.

### 4. `creator-monetization`
**Existing source files:** `src/creatorStudio.js`
**What it should cover:** X creator tools, monetization dashboard, analytics for creators

### 5. `discovery-explore`
**Existing source files:** `src/discoveryExplore.js`
**What it should cover:** Navigating X's Explore page, trending topics, search features

### 6. `engagement-interaction`
**Existing source files:** `src/engagementManager.js`
**What it should cover:** Managing engagement — likes, replies, interactions. NOT analytics (separate skill).

### 7. `grok-ai`
**Existing source files:** `src/grokIntegration.js`  
**What it should cover:** Interacting with X's Grok AI features from the browser

### 8. `lists-management`
**Existing source files:** `src/listManager.js`
**What it should cover:** Creating, managing, and automating X lists

## Output Format

For each skill, provide:
1. The complete new SKILL.md content
2. Confirmation that agent.md should be deleted (if it existed)
3. Line count of the new SKILL.md

At the end, provide a summary table of all 8 skills with their line counts.
