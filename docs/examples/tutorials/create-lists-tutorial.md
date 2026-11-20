---
title: "Create Lists on X (Twitter) — Tutorial"
description: "Create X Lists, add members, and export list data using XActions browser scripts."
keywords: ["twitter create list", "x list management", "xactions list manager", "add members twitter list", "export list members twitter"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Create Lists — Tutorial

> Step-by-step guide to creating X Lists, adding members, and exporting list data using XActions browser scripts.

**Works on:** Browser Console
**Difficulty:** Beginner
**Time:** 2-10 minutes
**Requirements:** Logged into x.com in your browser

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- Navigate to any x.com page (for creating lists) or a specific list page (for adding members/exporting)

---

## Quick Start

1. Open x.com (any page for list creation, or a list page for member management)
2. Press **F12** to open DevTools, then click the **Console** tab
3. Copy the script from `browser/listManager.js`
4. Edit the `CONFIG` section to enable the operations you want
5. Paste into the console and press Enter

---

## Configuration

```js
const CONFIG = {
  // Create a new list
  createList: {
    enabled: false,
    name: 'My List',
    description: 'Created by XActions',
    isPrivate: true,
  },
  // Add users to an existing list (navigate to list page first)
  addUsers: {
    enabled: true,
    usernames: [
      'user1',
      'user2',
    ],
  },
  // Export list members
  exportMembers: {
    enabled: false,
    maxMembers: 200,
  },
  actionDelay: 2000,
  scrollDelay: 1500,
};
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `createList.enabled` | `boolean` | `false` | Enable list creation |
| `createList.name` | `string` | `'My List'` | Name of the new list |
| `createList.description` | `string` | `'Created by XActions'` | Description of the new list |
| `createList.isPrivate` | `boolean` | `true` | Whether the list is private (only you can see it) |
| `addUsers.enabled` | `boolean` | `true` | Enable adding users to a list |
| `addUsers.usernames` | `string[]` | `[]` | Usernames (without @) to add |
| `exportMembers.enabled` | `boolean` | `false` | Enable member export |
| `exportMembers.maxMembers` | `number` | `200` | Maximum members to export |
| `actionDelay` | `number` | `2000` | Milliseconds between actions |
| `scrollDelay` | `number` | `1500` | Milliseconds between scroll actions |

---

## Step-by-Step Guide

### Creating a New List

**Step 1 -- Navigate to your Lists page**

Go to `https://x.com/i/lists` or click "Lists" in the sidebar.

**Step 2 -- Configure**

```js
const CONFIG = {
  createList: {
    enabled: true,
    name: 'AI Thought Leaders',
    description: 'Top voices in artificial intelligence and machine learning',
    isPrivate: false,
  },
  addUsers: { enabled: false, usernames: [] },
  exportMembers: { enabled: false, maxMembers: 200 },
  actionDelay: 2000,
  scrollDelay: 1500,
};
```

**Step 3 -- Run the script**

The script will:

1. Click the "Create List" button
2. Fill in the name and description
3. Toggle the privacy setting if needed
4. Click "Save" to create the list

### Adding Members to a List

**Step 1 -- Navigate to the list page**

Go to the specific list you want to add members to (e.g., `https://x.com/i/lists/1234567890`).

**Step 2 -- Configure**

```js
const CONFIG = {
  createList: { enabled: false, name: '', description: '', isPrivate: true },
  addUsers: {
    enabled: true,
    usernames: [
      'nichxbt',
      'elonmusk',
      'sama',
      'kaborealp',
    ],
  },
  exportMembers: { enabled: false, maxMembers: 200 },
  actionDelay: 2000,
  scrollDelay: 1500,
};
```

**Step 3 -- Run the script**

The script will:

1. Click "Add Members"
2. For each username: search, find the matching user cell, and click to add them
3. Clear the search between each user

Output:

```
Adding 4 users to list...
Added @nichxbt
Added @elonmusk
Added @sama
Added @kaborealp
```

### Exporting List Members

**Step 1 -- Navigate to the list's members page**

Go to a list page that has members visible.

**Step 2 -- Configure**

```js
const CONFIG = {
  createList: { enabled: false, name: '', description: '', isPrivate: true },
  addUsers: { enabled: false, usernames: [] },
  exportMembers: {
    enabled: true,
    maxMembers: 500,
  },
  actionDelay: 2000,
  scrollDelay: 1500,
};
```

**Step 3 -- Run the script**

The script will scroll through the members, collect usernames, display names, and bios, then auto-download a JSON file.

### Combining Operations

You can enable multiple operations in a single run:

```js
const CONFIG = {
  createList: {
    enabled: true,
    name: 'Crypto Alpha',
    description: 'Best crypto accounts for alpha',
    isPrivate: true,
  },
  addUsers: {
    enabled: true,
    usernames: ['trader1', 'analyst2', 'researcher3'],
  },
  exportMembers: { enabled: false, maxMembers: 200 },
  actionDelay: 2500,
  scrollDelay: 1500,
};
```

This creates the list first, then adds members to it.

---

## Tips & Tricks

- **Private lists are invisible to others.** Use private lists for research and competitive analysis.
- **Operations run in order.** Create -> Add Members -> Export. Enable only the ones you need.
- **Increase delays for large batches.** When adding many users, increase `actionDelay` to 3000-4000ms to avoid rate limits.
- **Export downloads automatically.** The export creates a JSON file named `xactions-list-members-YYYY-MM-DD.json` and triggers a download.
- **Users are not notified when added to private lists.** Public list additions may send notifications.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Search input not found" | The "Add Members" dialog may not have opened. Navigate to the list page and check that the add members button exists |
| User not found during add | Double-check the username spelling. The user may have changed their handle |
| List creation button not found | Navigate to `x.com/i/lists` and make sure the page has fully loaded |
| Export stops before reaching maxMembers | The list may have fewer members than expected, or you hit `maxScrollAttempts` (5 empty scrolls) |
| JSON file not downloading | Check your browser's download settings. The script uses `Blob` and a temporary `<a>` element to trigger downloads |

---

## Related Scripts

- `browser/followList.js` -- Follow, unfollow, pin, and browse lists
- `browser/manageCommunity.js` -- Similar management features for Communities
