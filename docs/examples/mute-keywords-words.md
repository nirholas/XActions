# 🔇 Mute by Keywords & Manage Muted Words

Mute users who post specific keywords, and bulk-add words to your muted word list.

---

## 🔇 Mute Users by Keywords (`src/muteByKeywords.js`)

### What It Does

1. Scrolls the timeline collecting tweets
2. Checks tweet text against your keyword list
3. When a match is found, clicks the tweet's menu → Mute
4. Tracks muted users to avoid duplicates

### Steps

1. Go to `x.com/home`
2. Edit CONFIG with your keywords
3. Open console (F12) and paste `src/muteByKeywords.js`

```javascript
const CONFIG = {
  keywords: ['crypto scam', 'dm me', 'giveaway'],
  scrollCycles: 10,
  delayBetweenMutes: 2000,
};
```

---

## 📝 Manage Muted Words (`src/manageMutedWords.js`)

### What It Does

1. Navigates to Settings → Muted Words
2. Adds each word from your list
3. Configures duration and scope (Home timeline, Notifications, or both)

### Steps

1. Go to `x.com/settings/muted_keywords`
2. Edit CONFIG with your words
3. Open console (F12) and paste `src/manageMutedWords.js`

```javascript
const CONFIG = {
  words: ['crypto scam', 'follow for follow', 'dm me'],
  duration: 'forever',  // 'forever', '24h', '7d', '30d'
  scope: 'both',        // 'home', 'notifications', 'both'
  delayBetweenAdds: 2000,
};
```

---

## 📁 Files

- `src/muteByKeywords.js` — Mute users by content keywords
- `src/manageMutedWords.js` — Bulk-add muted words
- `src/massUnmute.js` — Unmute all users

## ⚠️ Notes

- Muting a user hides their tweets without unfollowing
- Muted words hide tweets containing those words from your timeline
- Duration options: forever, 24 hours, 7 days, 30 days
- Scope: applies to home timeline, notifications, or both
