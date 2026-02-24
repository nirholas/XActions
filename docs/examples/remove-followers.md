# 🚫 Remove Followers

Remove unwanted followers using the soft-block technique (block then immediately unblock).

---

## ⚠️ WARNING

> **Be cautious with mass-removing!**
> - Removed users will no longer see your tweets in their timeline
> - They are NOT notified they've been removed
> - They can re-follow you at any time
> - Start with `dryRun: true` to preview

---

## 📋 What It Does

1. Reads your list of usernames to remove
2. For each user, navigates to their profile
3. Uses the "Remove this follower" option (or block → unblock as fallback)
4. Logs success/failure for each user
5. Downloads a summary report

---

## 🌐 Browser Console Script

**Steps:**
1. Go to your followers page (`x.com/yourusername/followers`)
2. Edit CONFIG with usernames to remove
3. Set `dryRun: false` when ready
4. Open console (F12) and paste `src/removeFollowers.js`

**Configuration:**
```javascript
const CONFIG = {
  usersToRemove: ['spambot1', 'fakeaccount2'],
  delayBetweenRemovals: 3000,
  dryRun: true,
};
```

---

## 📁 Files

- `src/removeFollowers.js` — Browser console follower removal
- `src/auditFollowers.js` — Audit followers first (companion script)

## ⚠️ Notes

- Must be logged in to do this
- The "soft-block" technique (block + unblock) removes followers without a permanent block
- Users can still visit your profile and re-follow
- Use `src/auditFollowers.js` first to identify which followers to remove
