# 📥 Download Account Data

Trigger X/Twitter's official data archive download from your settings.

---

## 📋 What It Does

1. Navigates to Settings → Your Account → Download an archive
2. Clicks "Request archive" if not already pending
3. Monitors the archive status
4. When ready, guides you to download it

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com/settings/download_your_data`
2. Open console (F12) and paste `browser/downloadAccountData.js`

---

## 📁 Files

- `browser/downloadAccountData.js` — Trigger official data archive
- `browser/backupAccount.js` — Custom backup (instant, partial data)

## ⚠️ Notes

- X's official archive takes 24-48 hours to prepare
- The archive includes: tweets, DMs, likes, followers, ad data, and more
- You'll receive a notification when it's ready to download
- This is different from `browser/backupAccount.js` which exports instantly but with less data
- You may need to re-enter your password when accessing this settings page
