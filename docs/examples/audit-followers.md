# 🔍 Audit Followers

Analyze and categorize your followers as legitimate, suspicious, or likely fake.

---

## 📋 What It Does

1. Goes to your followers page
2. Scrolls to collect follower profile cards
3. Scores each follower based on heuristics:
   - Default/missing avatar → suspicious
   - No bio → suspicious
   - High digits in username → suspicious
   - Very new account → suspicious
   - Extremely high following-to-follower ratio → suspicious
4. Categorizes as: legitimate, suspicious, or fake
5. Prints summary statistics
6. Exports full results as JSON

---

## 🌐 Browser Console Script

**Steps:**
1. Go to your followers page (`x.com/yourusername/followers`)
2. Open console (F12) and paste `src/auditFollowers.js`

**Configuration:**
```javascript
const CONFIG = {
  scrollCycles: 20,
  delayBetweenScrolls: 1500,
  thresholds: {
    suspicious: 3,   // Score >= 3 = suspicious
    fake: 6,          // Score >= 6 = likely fake
  },
};
```

---

## 📊 Output

```
🔍 FOLLOWER AUDIT RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━

Total analyzed: 500
✅ Legitimate: 420 (84%)
⚠️ Suspicious: 60 (12%)
🤖 Likely fake: 20 (4%)

Top suspicious accounts listed with scores...
```

---

## 📁 Files

- `src/auditFollowers.js` — Follower audit script
- `src/blockBots.js` — Block detected bots (companion script)
- `src/removeFollowers.js` — Remove specific followers

## ⚠️ Notes

- Accuracy depends on visible profile data (avatar, bio, stats)
- The heuristic scores are tunable via `thresholds` in CONFIG
- Not all "suspicious" accounts are bots — use as guidance
- For higher accuracy, combine with `src/blockBots.js` which checks additional signals
