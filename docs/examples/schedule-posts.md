# 📅 Schedule Posts

Queue tweets to be posted at specific future times using X/Twitter's native scheduler.

---

## ⚠️ WARNING

> **Requires X Premium / Blue subscription for the native scheduling feature.**
> - The scheduler uses X's built-in scheduling UI
> - Times are in your local timezone

---

## 📋 What It Does

1. Opens the tweet compose box
2. Types your tweet text
3. Clicks the schedule button
4. Sets the target date and time
5. Confirms the scheduled post
6. Repeats for each queued tweet

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com/home`
2. Edit the posts array with your content and times
3. Open console (F12) and paste `src/schedulePosts.js`

**Configuration:**
```javascript
const CONFIG = {
  posts: [
    { text: 'Good morning! ☀️', date: '2026-02-15', time: '09:00' },
    { text: 'Afternoon update 📊', date: '2026-02-15', time: '14:00' },
  ],
  delayBetweenPosts: 5000,
};
```

---

## 📁 Files

- `src/schedulePosts.js` — Browser console scheduler

## ⚠️ Notes

- Requires X Premium for native scheduling
- Dates must be in `YYYY-MM-DD` format, times in `HH:MM` (24-hour)
- Each post gets a 5-second gap to avoid UI race conditions
- If scheduling fails, the script logs an error and continues to the next post
