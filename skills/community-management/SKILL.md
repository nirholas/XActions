---
name: community-management
description: Bulk-leaves all X/Twitter communities via browser console script. Navigates to each community, clicks Leave, confirms, and tracks progress across page navigations using sessionStorage. Use when leaving all Twitter communities at once or bulk-removing community memberships.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Community Management

## Leave all communities

**File:** `src/leaveAllCommunities.js`

Paste into DevTools on `x.com/communities`.

### Behavior

The script navigates between pages:
1. On communities list → finds community links, navigates to first unprocessed one
2. On community page → clicks "Joined" button → confirms → marks processed → navigates back
3. Repeats until all communities are left

Uses `sessionStorage` key `xactions_left_communities` (JSON array of community IDs) to survive page navigations. Re-running the script resumes where it stopped.

### DOM selectors

| Element | Selector |
|---------|----------|
| Community links | `a[href^="/i/communities/"]` |
| Joined button | `button[aria-label^="Joined"]` |
| Communities nav | `a[aria-label="Communities"]` |
| Confirmation | `[data-testid="confirmationSheetConfirm"]` |
| Back button | `[data-testid="app-bar-back"]` |

### Reset progress

```javascript
sessionStorage.removeItem('xactions_left_communities')
```

Note: `sessionStorage` clears when the browser tab closes.
