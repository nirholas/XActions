---
name: delegate-access
description: Add, remove, and manage delegate accounts on X/Twitter. Delegates can post, reply, or like on behalf of your account. Use when users want to grant or revoke access to their account for a team member or manager.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Delegate Access Management

Browser console script for managing who can post on behalf of your X account.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| View and manage delegates | `src/delegateAccess.js` | `x.com` |

## Quick Start

1. Go to `x.com`
2. Open DevTools (F12) → Console
3. Edit CONFIG if needed
4. Paste `src/delegateAccess.js` → Enter

## Configuration

```js
const CONFIG = {
  autoNavigate: true,         // Navigate to delegate settings automatically
  scanDelegates: true,        // List current delegates
  showPermissionsInfo: true,  // Display permissions reference
  delayBetweenActions: 2000, // ms between UI actions
  scrollDelay: 1500,          // ms between scroll actions
};
```

## Permission Types

| Permission | Icon | Description |
|-----------|------|-------------|
| `post` | ✍️ | Post tweets on your behalf |
| `reply` | 💬 | Reply to tweets on your behalf |
| `like` | ❤️ | Like tweets on your behalf |
| `dm` | 📨 | Send DMs on your behalf |

## Available Functions

```js
XActions.delegates.list()                    // List all current delegates
XActions.delegates.add('username', perms)    // Add a delegate with permissions
XActions.delegates.remove('username')        // Remove a delegate
XActions.delegates.setPermissions('username', perms) // Update permissions
```

## Notes

- Delegate access requires X Premium
- Delegates navigate to your profile and can act on your behalf within granted permissions
- Data is cached in `sessionStorage` under `xactions_delegates`
- Navigate to `x.com/settings/delegate` to view X's native delegate management UI

## Related Skills

- **premium-subscriptions** — Manage X Premium features
- **settings-privacy** — Configure account privacy and access settings
- **teams-management** — API-based team and multi-user management
