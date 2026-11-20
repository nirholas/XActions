# Follow Accounts -- Tutorial

> Step-by-step guide to following accounts on X using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)

## Quick Start
1. Navigate to `https://x.com`
2. Open DevTools (F12) and go to the Console tab
3. Copy the contents of the script you need (see table below)
4. Edit the `CONFIG` section
5. Paste into the console and press Enter

## Scripts Overview

| Script | Requires core.js | Purpose |
|--------|-----------------|---------|
| `browser/followAccount.js` | No | Follow a list of specific usernames |
| `src/automation/followTargetUsers.js` | Yes | Follow followers/following of target accounts |
| `src/automation/keywordFollow.js` | Yes | Search keywords and follow matching users |

## Configuration

### browser/followAccount.js

```js
const CONFIG = {
  usernames: [
    'nichxbt',
    'openai',
    'anthropic',
  ],
  maxFollows: 50,
  skipAlreadyFollowing: true,
  skipProtected: false,
  skipSuspended: true,
  minDelay: 2000,
  maxDelay: 4000,
  navigationDelay: 3000,
  rateLimitPauseMs: 60000,
  trackFollowed: true,
};
```

### src/automation/followTargetUsers.js (requires core.js)

```js
const CONFIG = {
  TARGET_ACCOUNTS: ['elonmusk', 'naval'],
  LIST_TYPE: 'followers',        // 'followers' or 'following'
  MAX_FOLLOWS_PER_ACCOUNT: 20,
  TOTAL_MAX_FOLLOWS: 50,
  FILTERS: {
    MIN_FOLLOWERS: 100,
    MAX_FOLLOWERS: 50000,
    MIN_FOLLOWING: 10,
    MAX_FOLLOWING: 5000,
  },
};
```

### src/automation/keywordFollow.js (requires core.js)

```js
const OPTIONS = {
  KEYWORDS: ['web3 developer', 'solidity engineer', 'crypto founder'],
  MAX_FOLLOWS_PER_KEYWORD: 10,
  MAX_FOLLOWS_TOTAL: 30,
  MIN_FOLLOWERS: 100,
  MAX_FOLLOWERS: 100000,
  MUST_HAVE_BIO: true,
  BIO_KEYWORDS: [],
  SKIP_IF_FOLLOWING: true,
  DELAY_BETWEEN_FOLLOWS: 3000,
  DELAY_BETWEEN_SEARCHES: 10000,
};
```

## Step-by-Step Guide

### Follow Specific Users by Username

**Step 1:** Add usernames to `browser/followAccount.js`:

```js
const CONFIG = {
  usernames: [
    'nichxbt',
    'openai',
    'anthropic',
  ],
  maxFollows: 50,
};
```

**Step 2:** Paste the script. It navigates to each profile and clicks the follow button:

```
Following 3 accounts (max: 50)...

@nichxbt...
  Followed! (1/50)
@openai...
  Already following
@anthropic...
  Followed! (2/50)

Summary:
  Followed: 2
  Already following: 1
```

**Step 3:** Results are saved to sessionStorage under `xactions_followed`.

### Follow Followers of Target Accounts

This requires pasting `src/automation/core.js` first.

**Step 1:** Paste `src/automation/core.js` into the console.

**Step 2:** Configure and paste `src/automation/followTargetUsers.js`:

```js
const CONFIG = {
  TARGET_ACCOUNTS: ['naval', 'pmarca'],
  LIST_TYPE: 'followers',
  MAX_FOLLOWS_PER_ACCOUNT: 15,
  TOTAL_MAX_FOLLOWS: 30,
  FILTERS: {
    MIN_FOLLOWERS: 100,
    MAX_FOLLOWERS: 50000,
    MUST_HAVE_BIO: true,
  },
};
```

The script navigates to each target account's follower list, filters users by your criteria, and follows them.

### Keyword-Based Follow

**Step 1:** Paste `src/automation/core.js` first.

**Step 2:** Configure and paste `src/automation/keywordFollow.js`:

```js
const OPTIONS = {
  KEYWORDS: ['AI startup founder', 'machine learning engineer'],
  MAX_FOLLOWS_PER_KEYWORD: 10,
  MAX_FOLLOWS_TOTAL: 20,
  MIN_FOLLOWERS: 100,
  MUST_HAVE_BIO: true,
  BIO_KEYWORDS: ['AI', 'ML', 'startup'],
};
```

**Step 3:** The script searches for each keyword on X, finds matching user profiles, and follows them:

```
Starting Keyword Follow Bot...
Keywords: AI startup founder, machine learning engineer
Max follows: 20

Searching for: "AI startup founder"
Found match: @aifounder [bio: "Building the future of AI..."]
Followed @aifounder - #1

Searching for: "machine learning engineer"
Found match: @mlengineer [bio: "ML researcher at..."]
Followed @mlengineer - #2

Done! Followed 2 new users.
```

**Step 4:** Run `src/automation/smartUnfollow.js` later to remove users who did not follow back.

### Filtering Users

All automation scripts support filtering to ensure quality follows:

```js
FILTERS: {
  MIN_FOLLOWERS: 100,       // Skip accounts with few followers
  MAX_FOLLOWERS: 50000,     // Skip mega accounts (won't follow back)
  MUST_HAVE_BIO: true,      // Skip blank profiles
  BIO_KEYWORDS: ['AI', 'dev'],  // Bio must contain one of these
},
```

## Tips & Tricks

- **X rate limits follows aggressively.** Keep `maxFollows` under 50 per session and use 2-4 second delays.
- **Use `skipAlreadyFollowing: true`** to avoid re-processing accounts you already follow.
- **`trackFollowed: true`** saves a record in sessionStorage. This helps avoid duplicate follows across runs.
- **Keyword follow + smart unfollow** is a powerful growth strategy: follow relevant people, then unfollow those who do not reciprocate after a few days.
- **Bio keyword filtering** helps target the right audience. Use it with keyword follow to find high-quality accounts.
- **The script validates usernames** and skips invalid ones (too long, special characters, etc.).
- **Suspended and non-existent accounts** are detected and skipped automatically.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Please add usernames to CONFIG.usernames" | Add at least one username to the array |
| "Core module not loaded!" | Paste `src/automation/core.js` before the automation script |
| "Rate limited by X" | Wait 60 seconds (auto-pause). Reduce follow speed. |
| "Account does not exist" | Username is invalid or the account was deleted |
| "Follow button not found" | X may have changed the follow button selector |
| Too many consecutive errors | The script aborts after 5 errors. Check your connection. |

## Related Scripts

- `browser/unfollowEveryone.js` -- Unfollow all accounts
- `browser/unfollowback.js` -- Unfollow non-followers
- `src/automation/smartUnfollow.js` -- Time-based smart unfollow
- `src/automation/keywordFollow.js` -- Keyword-based follow
