---
title: "View & Manage Notifications on X (Twitter) — Tutorial"
description: "Scrape, filter, mute, and manage notification preferences on X/Twitter using XActions scripts."
keywords: ["twitter notifications", "manage notifications x", "mute twitter users", "xactions notifications", "twitter notification filter", "mute words twitter"]
author: "nich (@nichxbt)"
date: "2026-03-30"
---

# View & Manage Notifications — Tutorial

> Step-by-step guide to scraping, filtering, muting users/keywords, and managing notification preferences on X/Twitter using XActions scripts.

**Works on:** Node.js (Puppeteer)
**Difficulty:** Beginner
**Time:** 2-5 minutes
**Requirements:** Node.js environment with Puppeteer and an authenticated session

---

## Prerequisites

- Node.js >= 18 installed with XActions dependencies (`npm install`)
- A Puppeteer page authenticated with your X session cookie
- Set `XACTIONS_SESSION_COOKIE` in your `.env` file

---

## Quick Start

1. Set up a Puppeteer page with your X session cookie
2. Import functions from `src/notificationManager.js`
3. Call the desired function (e.g., `getNotifications`, `muteUser`, `muteWord`)
4. Process the returned data
5. Take action based on results

---

## Configuration

The `notificationManager.js` module exports several functions:

```js
import {
  getNotifications,
  muteUser,
  unmuteUser,
  muteWord,
  getNotificationSettings,
} from './src/notificationManager.js';
```

---

## Step-by-Step Guide

### Scraping Notifications

**Step 1 -- Get all notifications**

```js
import { getNotifications } from './src/notificationManager.js';

const { type, notifications, scrapedAt } = await getNotifications(page, {
  limit: 50,
  type: 'all',   // 'all' or 'mentions'
});

console.log(`Scraped ${notifications.length} notifications at ${scrapedAt}`);
```

**Step 2 -- Process results**

```js
notifications.forEach(notif => {
  console.log(`[${notif.time}] ${notif.text.substring(0, 100)}`);
  notif.links.forEach(link => {
    console.log(`  -> ${link.text}: ${link.href}`);
  });
});
```

**Example output:**

```
[2026-03-30T14:00:00Z] nichxbt liked your post
  -> nichxbt: https://x.com/nichxbt
[2026-03-30T13:45:00Z] alice_dev replied to your post: "Great thread!..."
  -> alice_dev: https://x.com/alice_dev
```

### Filtering Mentions Only

```js
const { notifications } = await getNotifications(page, {
  limit: 100,
  type: 'mentions',
});

console.log(`${notifications.length} mentions found`);
```

This navigates to `x.com/notifications/mentions` instead of the main notifications tab.

### Muting a User

```js
import { muteUser } from './src/notificationManager.js';

const result = await muteUser(page, 'spammer_account');
console.log(result);
// { success: true, action: 'muted', username: 'spammer_account', timestamp: '...' }
```

The script:

1. Navigates to the user's profile
2. Clicks the more options menu
3. Clicks "Mute"

### Unmuting a User

```js
import { unmuteUser } from './src/notificationManager.js';

const result = await unmuteUser(page, 'spammer_account');
console.log(result);
// { success: true, action: 'unmuted', username: 'spammer_account', timestamp: '...' }
```

### Muting Words/Phrases

Block notifications containing specific keywords:

```js
import { muteWord } from './src/notificationManager.js';

// Mute a word forever
await muteWord(page, 'crypto airdrop', { duration: 'forever' });

// Mute for 24 hours
await muteWord(page, 'spoiler', { duration: '24h' });

// Mute for 7 days
await muteWord(page, 'election', { duration: '7d' });

// Mute for 30 days
await muteWord(page, 'promo', { duration: '30d' });
```

Duration options: `'forever'`, `'24h'`, `'7d'`, `'30d'`.

The script:

1. Navigates to `x.com/settings/muted_keywords`
2. Clicks "Add muted word"
3. Types the word or phrase
4. Saves the setting

### Viewing Notification Settings

```js
import { getNotificationSettings } from './src/notificationManager.js';

const { settings, scrapedAt } = await getNotificationSettings(page);

console.log('Notification Settings:');
settings.forEach(setting => {
  console.log(`  ${setting.label}: ${setting.enabled ? 'ON' : 'OFF'}`);
});
```

**Example output:**

```
Notification Settings:
  Push notifications: ON
  Email notifications: OFF
  Filter low-quality notifications: ON
  Mute notifications from people you don't follow: OFF
```

### Building a Notification Filter Pipeline

Combine multiple functions for automated notification management:

```js
import { getNotifications, muteUser, muteWord } from './src/notificationManager.js';

// Step 1: Get recent notifications
const { notifications } = await getNotifications(page, { limit: 100 });

// Step 2: Find spammy patterns
const spamKeywords = ['airdrop', 'giveaway', 'follow for follow'];
const spamUsers = new Set();

for (const notif of notifications) {
  const text = notif.text.toLowerCase();
  if (spamKeywords.some(kw => text.includes(kw))) {
    // Extract usernames from notification links
    for (const link of notif.links) {
      const match = link.href.match(/x\.com\/(\w+)$/);
      if (match) spamUsers.add(match[1]);
    }
  }
}

// Step 3: Mute spammy users
console.log(`Found ${spamUsers.size} potentially spammy users`);
for (const user of spamUsers) {
  console.log(`Muting @${user}...`);
  await muteUser(page, user);
}

// Step 4: Mute common spam phrases
for (const keyword of spamKeywords) {
  await muteWord(page, keyword, { duration: 'forever' });
}
```

---

## Tips & Tricks

- **Use `type: 'mentions'` for focused review.** Mentions are usually more important than likes/follows.
- **Muting is reversible.** You can always unmute users and remove muted words later.
- **Muted words affect your entire timeline.** Words you mute will be hidden from notifications, timeline, and search.
- **Scrape notifications regularly.** Build a history of who engages with your content.
- **Filter before muting.** Always review the list of users/words before bulk muting.
- **Duration matters for muted words.** Use `'forever'` for persistent spam, and `'24h'` or `'7d'` for temporary topics.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No notifications returned | The page may not have loaded. Increase the initial sleep time or check your session cookie |
| Mute action fails | The user's profile may not have loaded, or the more options menu has changed |
| "page.click is not a function" | Make sure you are passing a Puppeteer page instance |
| Settings page shows no toggles | The notification settings page may have changed. Navigate manually to check |
| Muted word not saving | The muted keywords page may require scrolling to find the "Add" button |
| Session expired mid-script | Re-authenticate by setting a fresh `XACTIONS_SESSION_COOKIE` |

---

## Related Scripts

- `src/discoveryExplore.js` -- Search and trend monitoring
- `src/topicManager.js` -- Manage topics to control what appears in your feed
- `src/timelineViewer.js` -- View and export timeline posts
