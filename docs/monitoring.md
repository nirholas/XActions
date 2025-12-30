# Monitoring Guide

Track followers, unfollowers, and account activity on X (Twitter).

---

## 🔭 Available Monitoring Scripts

| Script | Use Case | Page to Use On |
|--------|----------|----------------|
| `detectUnfollowers.js` | See who unfollowed you | Your `/followers` page |
| `newFollowersAlert.js` | Track new followers | Your `/followers` page |
| `monitorAccount.js` | Watch any public account | Any `/followers` or `/following` page |
| `continuousMonitor.js` | Auto-monitoring with alerts | Any `/followers` or `/following` page |

---

## 📊 Detect Who Unfollowed You

Want to know who stopped following you? Here's how:

### Step 1: Go to Your Followers Page
```
https://twitter.com/YOUR_USERNAME/followers
```

### Step 2: Run the Script
Open Developer Console and paste the contents of [`src/detectUnfollowers.js`](../src/detectUnfollowers.js)

### Step 3: Run Again Later
The script saves a snapshot. Run it again (hours, days, weeks later) to see:
- 🚨 Who unfollowed you
- 🎉 Who started following you

### How It Works
```
First run:  📸 Takes snapshot of all your followers
            💾 Saves to browser localStorage

Later runs: 📸 Takes new snapshot
            📊 Compares with previous
            📋 Shows who left / who's new
            📥 Downloads list of unfollowers
```

---

## 🎉 Track New Followers

Use `newFollowersAlert.js` to see your new followers:

1. Go to `https://twitter.com/YOUR_USERNAME/followers`
2. Paste the script and run
3. First run saves your current followers
4. Run again later to see who's new!

**Bonus features:**
- Shows display names alongside usernames
- Generates welcome message templates
- Also shows who unfollowed you

---

## 🔍 Monitor ANY Public Account

Want to track someone else's followers or following list? Use `monitorAccount.js`:

### Track Who Follows Someone
```
https://twitter.com/elonmusk/followers
→ Run script
→ See who starts/stops following them
```

### Track Who Someone Follows
```
https://twitter.com/elonmusk/following
→ Run script  
→ See who they follow/unfollow
```

### Example Use Cases
- Track a competitor's new followers
- See who a celebrity unfollowed
- Monitor your favorite creator's following activity
- Research influencer engagement patterns

### Privacy Note
This only works on **public accounts**. Private accounts hide their follower/following lists.

---

## 🔄 Continuous Monitoring

Want real-time alerts? Use `continuousMonitor.js`:

### Features
- ⏰ Automatic checking (default: every 5 minutes)
- 🔔 Browser notifications
- 🔊 Sound alerts
- 📊 Console logging

### Configuration
Edit these values at the top of the script:
```js
const CONFIG = {
  CHECK_INTERVAL_MINUTES: 5,     // How often to check
  ENABLE_NOTIFICATIONS: true,    // Browser notifications
  ENABLE_SOUND: true,           // Sound on changes
  AUTO_SCROLL: true,            // Load all users (slower but complete)
};
```

### How to Use
1. Go to any `/followers` or `/following` page
2. Paste the script
3. **Keep the tab open** — it checks automatically
4. Get notified when someone follows/unfollows!

### Stop Monitoring
Run this in the console:
```js
stopUnfollowXMonitor()
```

---

## 💾 Data Storage

All monitoring data is stored in your browser's `localStorage`:
- Data stays on YOUR computer
- Nothing is sent to any server
- Persists between browser sessions
- Clears if you clear browser data

### View Stored Data
```js
// See all UnfollowX data
Object.keys(localStorage)
  .filter(k => k.startsWith('unfollowx'))
  .forEach(k => console.log(k, JSON.parse(localStorage[k])));
```

### Clear All Data
```js
// Remove all UnfollowX snapshots
Object.keys(localStorage)
  .filter(k => k.startsWith('unfollowx'))
  .forEach(k => localStorage.removeItem(k));
```

---

## ⚠️ Limitations

1. **Rate Limits**: Scrolling too fast may trigger X's protections. The scripts have built-in delays.

2. **Large Accounts**: Accounts with 100k+ followers take a long time to scan. Consider using `AUTO_SCROLL: false` for quicker (partial) scans.

3. **Private Accounts**: Can't monitor private accounts — their lists are hidden.

4. **Page Must Stay Open**: For continuous monitoring, keep the browser tab open and active.

5. **Browser Data**: If you clear your browser data, snapshots are lost.

---

## 🤔 FAQ

**Q: Is this against Twitter's rules?**
A: These scripts only read public information that's visible to anyone. They don't use any APIs or automation that would violate terms of service.

**Q: Can people see that I'm monitoring them?**
A: No. You're just viewing public pages — same as any visitor.

**Q: Why doesn't it show all followers?**
A: Large accounts take time to scroll through. Let the script run longer, or run it multiple times.

**Q: The unfollower count seems wrong?**
A: Some accounts may have been suspended or deleted. They won't appear in the current scan.

---

## 💡 Pro Tips

1. **Schedule checks**: Run the detection script at the same time each day/week for consistent tracking.

2. **Export data**: The scripts download `.txt` files of unfollowers. Save these for long-term records.

3. **Multiple accounts**: Each account's data is stored separately, so you can monitor multiple accounts.

4. **Use incognito**: If you don't want data persisting, run in incognito mode (data clears when closed).

---

Happy monitoring! 🔭
