---
name: community-management
description: Manages X/Twitter community memberships. Bulk-leave all communities, join communities by topic, and manage community interactions. Use when leaving all communities, joining niche communities, or managing community presence.
license: MIT
metadata:
  author: nichxbt
  version: "4.0"
---

# Community Management

Browser console scripts for managing X/Twitter Communities — leaving, joining, and interacting.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Leave ALL communities | `src/leaveAllCommunities.js` | `x.com/communities` |
| Join communities by topic | `src/joinCommunities.js` | `x.com/i/communities/suggested` |

## Leave All Communities

**File:** `src/leaveAllCommunities.js`

Paste into DevTools on `x.com/communities`.

### How It Works

The script navigates between pages to process each community:

1. **On communities list** — Finds all community links, navigates to first unprocessed one
2. **On community page** — Clicks "Joined" button → confirms Leave → marks as processed → navigates back
3. **On completion** — Displays final count and exports results as JSON

Uses `sessionStorage` key `xactions_left_communities` (JSON array of community IDs) to survive page navigations. Re-running resumes where it stopped.

### Controls

- `window.XActions.pause()` — Pause execution
- `window.XActions.resume()` — Resume
- `window.XActions.abort()` — Stop and export progress

### Reset Progress

```javascript
sessionStorage.removeItem('xactions_left_communities')
```

Note: `sessionStorage` clears automatically when the browser tab closes.

## Join Communities

**File:** `src/joinCommunities.js`

Navigate to community discovery pages and paste the script to auto-join communities matching your interests.

### How It Works

1. Scrapes visible community cards from the suggestions page
2. Filters by keyword matching against community names and descriptions
3. Clicks "Join" on matching communities with delays between actions
4. Tracks joined communities to avoid duplicates

## DOM Selectors

| Element | Selector | Notes |
|---------|----------|-------|
| Community links | `a[href^="/i/communities/"]` | Links to individual communities |
| Joined button | `button[aria-label^="Joined"]` | Shows "Joined" status |
| Join button | `[data-testid="TopicFollow"]` | Join community button |
| Community name | `[data-testid="communityName"]` | Community title text |
| Confirmation dialog | `[data-testid="confirmationSheetConfirm"]` | Leave confirmation |
| Back button | `[data-testid="app-bar-back"]` | Navigate back |
| Communities nav | `a[aria-label="Communities"]` | Main nav link |

## Rate Limiting & Safety

- **Leave delay:** 2–3 seconds between leave actions (includes navigation time)
- **Join delay:** 1–2 seconds between joins
- **Rate limit detection:** Checks for toast warnings after each action
- **X limits:** Communities have daily join limits (~20-30/day)
- **Recovery:** If restricted, wait 12-24 hours before continuing

## Strategy Guide

### Cleaning up community memberships

1. Navigate to `x.com/communities` to see all your communities
2. Paste `src/leaveAllCommunities.js` and let it run
3. If interrupted (tab close, navigation), re-paste the script — it resumes from sessionStorage
4. Verify completion by refreshing the communities page

### Joining niche communities for growth

1. Navigate to `x.com/i/communities/suggested`
2. Paste `src/joinCommunities.js`
3. Configure keywords matching your niche
4. The script joins matching communities and skips already-joined ones

### Community engagement strategy

1. Join 5-10 relevant communities in your niche
2. Use `src/engagementBooster.js` to engage with community members' content
3. Post valuable content in communities to build authority
4. Use `src/audienceDemographics.js` to understand community member demographics
5. Leave inactive communities periodically with `leaveAllCommunities.js`

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Script navigates but doesn't click Leave | "Joined" button selector may have changed — inspect the button |
| Script gets stuck on a community page | Click back manually, then re-run — sessionStorage tracks progress |
| "Joined" button not found | Community may use a different membership model |
| Progress lost between runs | `sessionStorage` clears on tab close — keep tab open during execution |
| Communities page is empty | You may not have joined any communities yet |
| Script leaves communities you want to keep | Currently no whitelist — abort early and manually rejoin |

## Related Skills

- **growth-automation** — Join communities to grow your audience
- **engagement-interaction** — Engage with community content
- **content-posting** — Post in communities
- **analytics-insights** — Track community engagement metrics
