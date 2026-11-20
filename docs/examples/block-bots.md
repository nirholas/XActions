# 🤖 Block Bots

Detect and block bot/fake accounts on your follower list using heuristic analysis.

---

## 📋 What It Does

1. Scrolls your followers page collecting profile data
2. Analyzes each follower for bot indicators:
   - Username has high digit ratio (e.g., `user183749283`)
   - Default/missing avatar
   - Empty or very short bio
   - Account created very recently
   - Following count >> follower count
3. Assigns a bot-likelihood score
4. Blocks detected bots (in non-dry-run mode)
5. Exports detected bots as JSON

---

## 🌐 Browser Console Script

**Steps:**
1. Go to your followers page (`x.com/yourusername/followers`)
2. Set `dryRun: false` when ready to block
3. Open console (F12) and paste `browser/blockBots.js`

**Configuration:**
```javascript
const CONFIG = {
  scrollCycles: 15,
  botScoreThreshold: 5,
  delayBetweenBlocks: 2000,
  dryRun: true,
};
```

---

## 📁 Files

- `browser/blockBots.js` — Bot detection and blocking
- `browser/auditFollowers.js` — Full follower audit (companion)
- `browser/massBlock.js` — Block a specific list of users

## ⚠️ Notes

- Always run with `dryRun: true` first to review detected bots
- The heuristic is not perfect — review the exported JSON before blocking
- Threshold of 5 is a good starting point; lower = more aggressive
- Blocked accounts can be unblocked later using `browser/massUnblock.js`
