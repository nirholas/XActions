---
title: "Manage Communities on X (Twitter) — Tutorial"
description: "Manage X Community members, roles, rules, and posts using XActions browser scripts."
keywords: ["manage twitter community", "x community admin", "xactions community management", "community members export", "community rules update"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# Manage Communities — Tutorial

> Step-by-step guide to managing X Community members, roles, rules, and posting using XActions browser scripts.

**Works on:** Browser Console
**Difficulty:** Intermediate
**Time:** 2-10 minutes
**Requirements:** Logged into x.com, admin/moderator access to the community

---

## Prerequisites

- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)
- Navigate to your community page (`https://x.com/i/communities/YOUR_COMMUNITY_ID`)
- You must be an admin or moderator of the community for most actions

---

## Quick Start

1. Open x.com and navigate to your **Community** page
2. Press **F12** to open DevTools, then click the **Console** tab
3. Copy the script from `browser/manageCommunity.js`
4. Set `CONFIG.action` to the desired operation
5. Paste into the console and press Enter

---

## Configuration

```js
const CONFIG = {
  action: 'listMembers',
  //   'listMembers'   -- export list of community members
  //   'updateRules'   -- update community rules
  //   'postMessage'   -- post a message to the community
  //   'pinPost'       -- pin a specific post (provide postUrl)
  //   'removeMember'  -- remove a member (provide targetUser)

  // Parameters (depending on action)
  targetUser: '',                  // Username for removeMember
  postUrl: '',                     // URL of post to pin
  message: '',                     // Message to post
  newRules: [],                    // Array of rule strings for updateRules

  // List Members Settings
  maxMembers: 100,
  exportFormat: 'json',            // 'json' or 'csv'

  // Timing
  scrollDelay: 2000,
  actionDelay: 2000,
  typeCharDelay: 50,
  maxScrollAttempts: 30,

  // Safety
  dryRun: true,
};
```

### Available Actions

| Action | Required Config | Description |
|--------|----------------|-------------|
| `listMembers` | `maxMembers`, `exportFormat` | Export community members as JSON or CSV |
| `updateRules` | `newRules` | Replace community rules with new ones |
| `postMessage` | `message` | Post a message to the community timeline |
| `pinPost` | `postUrl` | Pin a specific post to the top of the community |
| `removeMember` | `targetUser` | Remove a user from the community |

---

## Step-by-Step Guide

### Exporting Community Members

**Step 1 -- Navigate to your community page**

Go to `https://x.com/i/communities/YOUR_COMMUNITY_ID`.

**Step 2 -- Configure**

```js
const CONFIG = {
  action: 'listMembers',
  maxMembers: 200,
  exportFormat: 'json',    // or 'csv'
  dryRun: false,           // Safe -- only reads data
};
```

**Step 3 -- Run the script**

The script will:

1. Click the "Members" tab
2. Scroll through the member list
3. Extract username, display name, and bio for each member
4. Output the data as JSON or CSV in the console

**JSON output example:**

```json
[
  {
    "username": "alice_dev",
    "displayName": "Alice",
    "bio": "Full-stack developer building cool stuff"
  },
  {
    "username": "bob_crypto",
    "displayName": "Bob",
    "bio": "DeFi researcher"
  }
]
```

**CSV output example:**

```
username,displayName,bio
"alice_dev","Alice","Full-stack developer building cool stuff"
"bob_crypto","Bob","DeFi researcher"
```

### Updating Community Rules

```js
const CONFIG = {
  action: 'updateRules',
  newRules: [
    'Be respectful and constructive',
    'No spam or self-promotion',
    'Stay on topic -- this is a tech community',
    'Use English for all posts',
    'No NSFW content',
  ],
  dryRun: true,
};
```

The script navigates to community settings, finds the rules section, and replaces each rule field with the new text.

### Posting a Message to the Community

```js
const CONFIG = {
  action: 'postMessage',
  message: 'Welcome to our community! Please read the rules in the sidebar before posting.',
  dryRun: true,
};
```

The script finds the tweet composer on the community page, types your message, and clicks the post button.

### Pinning a Post

```js
const CONFIG = {
  action: 'pinPost',
  postUrl: 'https://x.com/nichxbt/status/1234567890',
  dryRun: true,
};
```

The script navigates to the post, opens the more menu (caret), and clicks "Pin to community."

### Removing a Member

```js
const CONFIG = {
  action: 'removeMember',
  targetUser: 'spammer_account',
  dryRun: true,
};
```

The script navigates to the members tab, finds the user, opens their action menu, and clicks "Remove."

---

## Runtime Controls

While the script is running:

```js
// Check progress
window.XActions.status();

// Stop the script
window.XActions.abort();
```

---

## Tips & Tricks

- **Export members regularly.** Use `listMembers` with `exportFormat: 'csv'` for spreadsheet analysis.
- **`listMembers` is read-only.** You can safely run it with `dryRun: false` since it only reads data and does not modify anything.
- **Pin important announcements.** Use `pinPost` to keep community guidelines or important updates visible at the top.
- **Increase `maxScrollAttempts` for large communities.** If your community has hundreds of members, set this to 50 or higher.
- **Test `updateRules` carefully.** Always dry run first, as rule updates replace existing rules.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Unknown action" | Check that `CONFIG.action` matches one of: `listMembers`, `updateRules`, `postMessage`, `pinPost`, `removeMember` |
| "No rules provided" | For `updateRules`, fill in `CONFIG.newRules` with an array of rule strings |
| "No message provided" | For `postMessage`, fill in `CONFIG.message` |
| "No targetUser provided" | For `removeMember`, fill in `CONFIG.targetUser` with the username |
| Members tab not found | Make sure you are on the community page. The members tab selector may have changed |
| Cannot remove a member | You must be an admin or moderator. Regular members cannot remove others |
| Pin option not in menu | The post must belong to the community. You cannot pin external posts |

---

## Related Scripts

- `browser/createCommunity.js` -- Create a new community
- `browser/joinCommunities.js` -- Find and join communities by keyword
