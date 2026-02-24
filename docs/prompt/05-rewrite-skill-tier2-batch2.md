# Prompt 05: Rewrite Tier-2 Skills — Batch 2 (7 Skills)

You are an expert at Claude Agent Skills, following the official best practices from https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

You are working on the XActions project — an open-source X/Twitter automation toolkit by nichxbt.

## Your Task

Rewrite 7 more SKILL.md files to match the quality standard. Same rules as Batch 1.

## Rules (same as Batch 1)

1. **Only reference files that actually exist.** Source files available:

```
src/notificationManager.js    src/premiumManager.js
src/profileManager.js         src/updateProfile.js
src/settingsManager.js        src/manageMutedWords.js
src/spacesManager.js          src/scrapeSpaces.js
src/sendDirectMessage.js      src/dmManager.js
src/removeFollowers.js        src/reportSpam.js
src/qrCodeSharing.js
```

2. YAML frontmatter starts with `---` on line 1
3. name: lowercase-letters-numbers-hyphens, max 64 chars
4. description: third person, what + when, max 1024 chars
5. `license: MIT`, `metadata: { author: nichxbt, version: "3.0" }`
6. Body under 120 lines (aim 60-100)
7. Delete agent.md files — fold useful content into SKILL.md or discard
8. No API endpoints, no MCP tools (unless the skill is about MCP)
9. Third-person descriptions

## Skills to Rewrite (Batch 2)

### 1. `notifications-management`
**Existing source files:** `src/notificationManager.js`
**What it should cover:** Managing, filtering, and automating X notification handling

### 2. `premium-subscriptions`
**Existing source files:** `src/premiumManager.js`
**What it should cover:** X Premium subscription management, feature access

### 3. `profile-management`
**Existing source files:** `src/profileManager.js`, `src/updateProfile.js`, `src/qrCodeSharing.js`
**What it should cover:** Updating profile info, bio, avatar, banner, QR code sharing

### 4. `settings-privacy`
**Existing source files:** `src/settingsManager.js`, `src/manageMutedWords.js`
**What it should cover:** X privacy settings, muted words management, account configuration

### 5. `spaces-live`
**Existing source files:** `src/spacesManager.js`, `src/scrapeSpaces.js`
**What it should cover:** X Spaces (live audio), joining, scraping space data

### 6. `direct-messages` (already merged in Prompt 01, but now rewrite body)
**Existing source files:** `src/sendDirectMessage.js`, `src/dmManager.js`
**What it should cover:** Sending, managing, and automating X direct messages
**Note:** This skill was the merge target from Prompt 01. Now rewrite the body content to match the quality standard, keeping whatever was merged.

### 7. `blocking-muting-management`
**Existing source files:** `src/massBlock.js`, `src/massUnblock.js`, `src/massUnmute.js`, `src/blockBots.js`, `src/muteByKeywords.js`, `src/reportSpam.js`, `src/removeFollowers.js`
**What it should cover:** Mass blocking, unblocking, muting, bot blocking, keyword muting, spam reporting, removing followers
**Note:** This skill has proper frontmatter already but is 145 lines. Tighten it up to ~100 lines while keeping all script references.

## Output Format

For each skill:
1. Complete new SKILL.md content
2. Whether agent.md should be deleted
3. Line count

Summary table at end.
