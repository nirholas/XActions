# 🚨 Report Spam

Report multiple accounts for spam, abuse, or fake/impersonation.

---

## ⚠️ WARNING

> **Only report accounts that genuinely violate X's rules!**
> - False reporting can result in your own account being actioned
> - Always run with `dryRun: true` first

---

## 📋 What It Does

1. For each target username, navigates to their profile
2. Clicks the "…" menu → Report
3. Selects the appropriate report reason
4. Submits the report
5. Moves to the next account

---

## 🌐 Browser Console Script

**Steps:**
1. Go to any page on `x.com`
2. Edit CONFIG with target accounts and reason
3. Set `dryRun: false` when ready
4. Open console (F12) and paste `src/reportSpam.js`

**Configuration:**
```javascript
const CONFIG = {
  accounts: ['spambot1', 'fakeaccount2'],
  reason: 'spam',  // 'spam', 'abuse', 'fake'
  delayBetweenReports: 5000,
  dryRun: true,
};
```

---

## 📁 Files

- `src/reportSpam.js` — Spam/abuse reporter
- `src/blockBots.js` — Detect bots first (companion)
- `src/massBlock.js` — Block accounts (companion)

## ⚠️ Notes

- The script navigates between profiles, so don't interact while it runs
- X may rate-limit reporting — use long delays (5+ seconds)
- Use `src/blockBots.js` or `src/auditFollowers.js` first to identify targets
- Reports are anonymous — the reported user won't know who reported them
