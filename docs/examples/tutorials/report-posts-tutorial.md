# Report Posts or Accounts -- Tutorial

> Step-by-step guide to reporting spam, abuse, and fake accounts on X using XActions browser scripts.

## Prerequisites
- Logged into x.com in your browser
- Browser DevTools console (F12 -> Console tab)

## Quick Start
1. Navigate to any x.com page
2. Open DevTools (F12) and go to the Console tab
3. Copy the contents of `src/reportSpam.js`
4. Edit the `CONFIG` section (users, reason, dryRun)
5. Paste into the console and press Enter

## Configuration

```js
const CONFIG = {
  usersToReport: [
    'spammer1',
    'fake_account',
  ],
  reason: 'spam',           // 'spam', 'abuse', or 'fake'
  actionDelay: 4000,
  blockAfterReport: false,
  dryRun: true,
};
```

### Report Reasons

| Reason | Description | X Category |
|--------|-------------|------------|
| `'spam'` | Spammy posts, scam links, repetitive content | Spam |
| `'abuse'` | Harassment, threats, targeted abuse | Abuse/Harassment |
| `'fake'` | Impersonation, fake identity | Fake account/Impersonation |

### Full CONFIG Reference

| Option | Default | Description |
|--------|---------|-------------|
| `usersToReport` | `[]` | Array of usernames to report |
| `reason` | `'spam'` | Report category |
| `actionDelay` | `4000` | Delay between reports (ms) |
| `blockAfterReport` | `false` | Also block the user after reporting |
| `dryRun` | `true` | Preview mode -- no reports are filed |

## Step-by-Step Guide

### Report Spam Accounts

**Step 1:** Start with a dry run:

```js
const CONFIG = {
  usersToReport: [
    'obvious_spammer',
    'scam_account_123',
  ],
  reason: 'spam',
  dryRun: true,
};
```

**Step 2:** Paste `src/reportSpam.js`:

```
REPORT SPAM
DRY RUN MODE
  1. @obvious_spammer (spam)
  2. @scam_account_123 (spam)
```

**Step 3:** Set `dryRun: false` and re-paste:

```js
dryRun: false,
```

The script navigates to each profile, opens the three-dot menu, clicks "Report", and selects the spam reason:

```
Users to report: 2 (reason: spam)

Processing @obvious_spammer...
  Reported @obvious_spammer for spam

Processing @scam_account_123...
  Reported @scam_account_123 for spam

RESULTS:
  Reported: 2
  Failed: 0
```

### Report Abusive Accounts

```js
const CONFIG = {
  usersToReport: ['harasser_account'],
  reason: 'abuse',
  dryRun: false,
};
```

### Report Fake/Impersonation Accounts

```js
const CONFIG = {
  usersToReport: ['fake_celebrity'],
  reason: 'fake',
  dryRun: false,
};
```

### Report a Specific Post

For reporting individual posts (not accounts), use `src/postInteractions.js`:

```js
// First paste src/postInteractions.js, then call:
await XActions.postInteractions.reportPost(
  'https://x.com/user/status/123456789',
  'spam'
);
```

Valid categories for post reports: `spam`, `abuse`, `harmful`, `misleading`, `violence`, `privacy`, `hateful`, `self-harm`, `illegal`.

### Report Flow Details

The report process involves multiple steps in X's UI:

1. The script navigates to the user's profile
2. Clicks the three-dot menu ("More" button)
3. Finds and clicks "Report @username"
4. The report dialog opens
5. The script attempts to select the matching reason (spam/abuse/fake)
6. Clicks the submit/next button

Some report flows have additional steps that require manual completion (e.g., providing details or selecting sub-categories).

## Tips & Tricks

- **Always start with `dryRun: true`** to verify the list of accounts.
- **`actionDelay: 4000`** (4 seconds) is the minimum recommended delay. X may throttle rapid reports.
- **The report flow has multiple steps.** The script handles the initial steps but you may need to complete sub-category selection manually.
- **`blockAfterReport: false`** by default. Set to `true` to also block each reported account.
- **For individual post reports**, use `src/postInteractions.js` which provides `reportPost(url, category)`.
- **Do not abuse the report feature.** Filing false reports can result in your own account being restricted.
- **Some profiles may not load** (deleted, suspended). The script logs these as failures and moves on.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No users to report!" | Add usernames to `usersToReport` |
| "Profile not found" | Account may be deleted or suspended |
| Report dialog does not complete | Some report flows require manual steps. Complete in the UI. |
| Script navigates away from report | The `actionDelay` may be too short. Increase to 5000+. |
| "Report" option not in menu | You may have already reported this user recently |

## Related Scripts

- `src/massBlock.js` -- Block accounts in bulk
- `src/blockBots.js` -- Detect and block bot accounts
- `src/postInteractions.js` -- Report individual posts (plus many other post actions)
