---
name: messaging-engagement
description: Manage direct messages and engagement interactions on X/Twitter. Send personalized DMs, auto-engage with tweets, interact with communities, and manage Spaces. Use when users want to automate messaging, engagement, or find X Spaces.
license: MIT
metadata:
  author: nichxbt
  version: "3.0"
---

# Messaging & Engagement with XActions

Browser console scripts for managing DMs, engagement, and social interactions on X/Twitter.

## Available Scripts

| Script | File | Purpose |
|--------|------|---------|
| Send Direct Messages | `src/sendDirectMessage.js` | Send personalized DMs to a list of users |
| Join Communities | `src/joinCommunities.js` | Discover and join communities by keywords |
| Leave All Communities | `src/leaveAllCommunities.js` | Bulk-leave all communities |
| List Manager | `src/listManager.js` | Create lists, add members, export members |
| Scrape Spaces | `src/scrapeSpaces.js` | Find and collect X Spaces metadata |
| Bookmark Organizer | `src/bookmarkOrganizer.js` | Organize and categorize bookmarks |

## Send Direct Messages

**File:** `src/sendDirectMessage.js`

Send personalized DMs to a list of users with message templates and rate limiting.

### Configuration

```javascript
const CONFIG = {
  targetUsers: ['user1', 'user2'],
  messageTemplate: 'Hey {username}! 👋 Just wanted to connect.',
  limits: {
    messagesPerSession: 10,
    delayBetweenMessages: 30000,
  },
  skipIfAlreadyMessaged: true,
  dryRun: true,
};
```

### How to use

1. Navigate to `x.com/messages`
2. Edit CONFIG with users and message
3. Set `dryRun = false`
4. Open DevTools (F12) → Console
5. Paste the script → Enter

### Safety features

- Tracks sent messages in localStorage to avoid duplicates
- Configurable delay between messages (30s default)
- Session limit prevents over-messaging
- Dry-run mode for previewing

### ⚠️ Warning

Mass DMing can get your account restricted. Only message users who have open DMs or follow you.

## Join Communities

**File:** `src/joinCommunities.js`

Discover and join X communities matching your interests.

### Configuration

```javascript
const CONFIG = {
  keywords: ['crypto', 'AI', 'javascript'],
  maxJoins: 20,
  dryRun: true,
};
```

### How to use

1. Navigate to `x.com/i/communities/suggested`
2. Edit CONFIG with keywords
3. Open DevTools (F12) → Console
4. Paste the script → Enter

## List Manager

**File:** `src/listManager.js`

Create, populate, and manage X lists programmatically.

### Features

- **Create** new lists (public or private)
- **Add members** by username search
- **Export** list members as JSON

### Configuration

```javascript
const CONFIG = {
  createList: { enabled: true, name: 'My List', isPrivate: true },
  addUsers: { enabled: true, usernames: ['user1', 'user2'] },
  exportMembers: { enabled: false, maxMembers: 200 },
};
```

## Scrape Spaces

**File:** `src/scrapeSpaces.js`

Find X Spaces from search results or timelines. Identifies live, scheduled, and ended Spaces.

### How to use

1. Navigate to a search or timeline with Spaces
2. Open DevTools (F12) → Console
3. Paste the script → Enter

### Output

- Live/scheduled/ended counts
- Host and title for each Space
- Direct links to join
- JSON export

## Bookmark Organizer

**File:** `src/bookmarkOrganizer.js`

Auto-categorize your bookmarks by keywords and export organized data.

### Configuration

```javascript
const CONFIG = {
  categories: {
    'Tech': ['javascript', 'python', 'coding', 'ai'],
    'Crypto': ['bitcoin', 'eth', 'web3'],
    'Funny': ['lmao', 'lol', '😂'],
  },
  exportFormat: 'json',  // or 'csv'
};
```

### How to use

1. Navigate to `x.com/i/bookmarks`
2. Open DevTools (F12) → Console
3. Paste the script → Enter

## Key DM Selectors

| Element | Selector |
|---------|----------|
| New message button | `[data-testid="NewDM_Button"]` |
| Search people | `[data-testid="searchPeople"]` |
| Message input | `[data-testid="dmComposerTextInput"]` |
| Send button | `[data-testid="dmComposerSendButton"]` |
| Back button | `[data-testid="app-bar-back"]` |

## Notes

- DM scripts require being on the Messages page (`x.com/messages`)
- Community scripts work on the communities pages
- All scripts include dry-run mode by default
- Bookmark organizer supports both JSON and CSV export
- Spaces scraping captures metadata only (not audio content)
