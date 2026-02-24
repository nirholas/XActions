# 💔 Unlike All Posts

Mass-unlike all liked posts on your X/Twitter account.

---

## 📋 What It Does

1. Navigates your likes page
2. Finds all unlike buttons
3. Clicks each one with configurable delays
4. Scrolls to load more likes
5. Repeats until all likes are removed

**Use cases:**
- Clean up your likes history
- Privacy reset
- Remove old likes from years ago
- Start fresh with a clean engagement history

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com/YOUR_USERNAME/likes`
2. Open browser console (F12 → Console tab)
3. Paste the script from `src/unlikeAllPosts.js`
4. Press Enter

**Configuration:**
```javascript
const CONFIG = {
  maxUnlikes: Infinity,  // Set a number to limit
  minDelay: 800,         // Minimum delay between unlikes (ms)
  maxDelay: 2000,        // Maximum delay
  scrollDelay: 1500,     // Delay after scrolling
  maxRetries: 5,         // Stop after this many empty scrolls
};
```

---

## ⚠️ Notes

- This action cannot be undone — the original posts remain, but your likes are removed
- X may rate-limit you if you unlike too quickly — adjust delays if needed
- The script logs progress every 10 unlikes
- If the script stops, reload the page and run it again — it picks up from where it left off

## 📁 Files

- `src/unlikeAllPosts.js` — Main script
- `scripts/twitter/unlike-all.js` — Extended DevTools version
