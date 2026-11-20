# 🚫 Mass Block & Unblock

Block or unblock multiple X/Twitter accounts at once.

---

## 📋 What It Does

### Mass Block
1. Takes a list of usernames
2. Navigates to each profile
3. Opens the three-dot menu → Block → Confirm
4. Tracks results (blocked, failed, not found)

### Mass Unblock
1. Goes to your blocked accounts page
2. Clicks unblock on each user
3. Confirms the unblock action
4. Scrolls to find all blocked users

---

## 🌐 Mass Block — Browser Console Script

**Steps:**
1. Go to x.com (any page)
2. Edit `CONFIG.usersToBlock` with usernames
3. Set `CONFIG.dryRun = false` to enable
4. Open console (F12) and paste `browser/massBlock.js`

**Configuration:**
```javascript
const CONFIG = {
  usersToBlock: ['spammer1', 'spammer2'],
  actionDelay: 3000,
  dryRun: true,  // SAFETY: Set to false to actually block
};
```

---

## 🌐 Mass Unblock — Browser Console Script

**Steps:**
1. Go to `x.com/settings/blocked/all`
2. Open console (F12) and paste `browser/massUnblock.js`

---

## 🤖 Block Bots

Automatically detect and block likely bot accounts using heuristics.

**File:** `browser/blockBots.js`

**Steps:**
1. Go to any followers/following list
2. Open console (F12) and paste the script
3. Review the detection report
4. Set `dryRun = false` to actually block

**Detection criteria:**
- Default/no profile picture
- High digit-to-letter ratio in username
- No bio
- Zero followers/following
- Generated-looking display names

---

## ⚠️ Notes

- Mass blocking navigates between pages — this is expected
- Always use dry-run mode first to review the list
- Bot detection has false positives — review before blocking
- Unblocking from settings page is faster than individual visits

## 📁 Files

- `browser/massBlock.js` — Block multiple users from a list
- `browser/massUnblock.js` — Unblock all blocked users
- `browser/blockBots.js` — Detect and block bot accounts
