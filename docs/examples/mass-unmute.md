# 🔊 Mass Unmute

Unmute all muted accounts from your X/Twitter settings.

---

## 📋 What It Does

1. Navigates to your Muted Accounts settings page
2. Finds all muted users in the list
3. Clicks the Unmute button for each one
4. Scrolls to load more and repeats until all are unmuted

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com/settings/muted/all`
2. Open console (F12) and paste `browser/massUnmute.js`

**Configuration:**
```javascript
const CONFIG = {
  scrollCycles: 20,
  delayBetweenUnmutes: 1500,
};
```

---

## 📁 Files

- `browser/massUnmute.js` — Browser console mass unmute
- `browser/muteByKeywords.js` — Mute users by keywords (counterpart)

## ⚠️ Notes

- Must start on the Muted Accounts page (`x.com/settings/muted/all`)
- If you have many muted accounts, the script will need multiple scroll cycles
- This unmutes **users**, not muted **words** — use settings to manage muted words
