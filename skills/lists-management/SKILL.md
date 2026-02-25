---
name: lists-management
description: Creates, populates, and exports X/Twitter lists from the browser console. Supports creating public or private lists, bulk-adding members by username, and exporting list members as JSON. Use when users want to create lists, add members to lists, or export list data on X.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Lists Management

Browser console script for creating and managing X/Twitter lists.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Create a new list | `src/listManager.js` | `x.com/USERNAME/lists` |
| Add users to a list | `src/listManager.js` | List page |
| Export list members | `src/listManager.js` | List members page |

## List Manager

**File:** `src/listManager.js`

Browser console script that creates lists, adds members by username, and exports member data.

### How to Use

1. Navigate to `x.com/YOUR_USERNAME/lists` (or an existing list page)
2. Open DevTools (F12) → Console
3. Edit the CONFIG section to enable desired operations
4. Paste the script → Enter

### Configuration

```javascript
const CONFIG = {
  createList: {
    enabled: false,
    name: 'My List',
    description: 'Created by XActions',
    isPrivate: true,
  },
  addUsers: {
    enabled: true,
    usernames: ['user1', 'user2'],
  },
  exportMembers: {
    enabled: false,
    maxMembers: 200,
  },
  actionDelay: 2000,
};
```

### Create List

Sets `createList.enabled: true` to create a new list. Fills in the name, description, and privacy toggle, then saves.

### Add Members

Sets `addUsers.enabled: true` with a list of usernames. Opens the add-member search, types each username, clicks the matching user cell, and repeats. Navigate to the target list page first.

### Export Members

Sets `exportMembers.enabled: true`. Scrolls through the list members page and exports all members (username, display name, bio) as a JSON download.

## DOM Selectors

| Element | Selector |
|---------|----------|
| Create list button | `[data-testid="createList"]` |
| List name input | `[data-testid="listNameInput"]` |
| List description | `[data-testid="listDescriptionInput"]` |
| Private toggle | `[data-testid="listPrivateToggle"]` |
| Save button | `[data-testid="listSaveButton"]` |
| Add members | `[data-testid="addMembers"]` |
| Search people | `[data-testid="searchPeople"]` |
| User cell | `[data-testid="UserCell"]` |

## Rate Limiting

- 2s delay between adding individual users
- 1.5s scroll delay when exporting members
- Up to 5 retries when no new members load during export scroll

## X List Limits

- Maximum 1,000 lists per account
- Maximum 5,000 members per list
- Lists can be public (visible to anyone) or private (only you)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Create button not found | Navigate to `x.com/USERNAME/lists` first |
| User not found when adding | Verify username spelling; user may have changed handle |
| Export stops early | Page may have finished scrolling; increase `maxMembers` if needed |
| Search input not found | Ensure you clicked "Add member" — script expects the search overlay |
