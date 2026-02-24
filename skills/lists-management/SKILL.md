---
name: lists-management
description: Creates and manages X/Twitter lists including adding members, exporting list data, pinning lists, and organizing curated timelines. Use when users want to create, manage, or automate X lists.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Lists Management

Browser console script for creating and managing X/Twitter lists.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| List Manager | `src/listManager.js` | Create lists, add/remove members, export member data |

## List Manager

**File:** `src/listManager.js`

Programmatically creates, populates, and manages X lists.

### Configuration

```javascript
const CONFIG = {
  createList: { enabled: true, name: 'My List', isPrivate: true },
  addUsers: { enabled: true, usernames: ['user1', 'user2'] },
  exportMembers: { enabled: false, maxMembers: 200 },
};
```

### How to use

1. Navigate to `x.com/YOUR_USERNAME/lists`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Features

- **Create** new lists (public or private)
- **Add members** by searching usernames
- **Export** list members as JSON
- **Pin/unpin** lists for quick access

### Key Selectors

| Element | Selector |
|---------|----------|
| Create list | `[data-testid="createList"]` |
| List name | `[data-testid="listName"]` |
| List description | `[data-testid="listDescription"]` |
| Pin list | `[data-testid="pinList"]` |
| Add member | `[data-testid="addMember"]` |
| List members | `[data-testid="UserCell"]` |

## Notes

- Lists can be public (visible to anyone) or private (only you see them)
- Maximum 1,000 lists per account, 5,000 members per list
- Pinned lists appear in your sidebar for quick access
