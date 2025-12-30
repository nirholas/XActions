# Getting Started with UnfollowX

Welcome! This guide will walk you through using UnfollowX to clean up your X (Twitter) following list. No coding experience needed.

---

## What Does UnfollowX Do?

UnfollowX helps you:
- **Unfollow people who don't follow you back** — clean up one-sided follows
- **Unfollow everyone** — start fresh with a clean following list
- **Keep a record** — optionally download a list of everyone you unfollowed
- **Detect who unfollowed you** — find out who stopped following you
- **Monitor any account** — track follows/unfollows on any public profile

---

## Before You Start

You'll need:
1. A computer (Windows, Mac, or Linux)
2. A web browser (Chrome, Firefox, Edge, or Safari)
3. An X (Twitter) account

**Time needed:** About 5 minutes to set up, then the script runs automatically.

---

## Step-by-Step Instructions

### Step 1: Open X and Go to Your Following List

1. Open your web browser
2. Go to [twitter.com](https://twitter.com) and log in
3. Click on your profile picture
4. Click **"Following"** to see everyone you follow

Or go directly to: `https://twitter.com/YOUR_USERNAME/following`  
(Replace `YOUR_USERNAME` with your actual username)

---

### Step 2: Open the Developer Console

This is where you'll paste the script. Don't worry — it sounds technical but it's easy!

**On Windows/Linux:**
- Press `Ctrl` + `Shift` + `J` (Chrome)
- Or press `F12`, then click the "Console" tab

**On Mac:**
- Press `Cmd` + `Option` + `J` (Chrome)
- Or press `Cmd` + `Option` + `I`, then click the "Console" tab

You should see a panel open at the bottom or side of your browser with a blinking cursor.

---

### Step 3: Choose Your Script

Pick the script that matches what you want to do:

| I want to... | Use this script |
|--------------|-----------------|
| Unfollow people who don't follow me back | `src/unfollowback.js` |
| Unfollow everyone | `src/unfollowEveryone.js` |
| Unfollow non-followers AND save a list | `src/unfollowWDFBLog.js` |

---

### Step 4: Copy the Script

1. Go to the [UnfollowX GitHub repository](https://github.com/nirholas/UnfollowX)
2. Open the `src` folder
3. Click on the script file you want (e.g., `unfollowback.js`)
4. Click the **"Copy raw file"** button (or select all the code and copy it)

---

### Step 5: Paste and Run

1. Click inside the Developer Console (the panel you opened in Step 2)
2. Paste the code (`Ctrl+V` on Windows/Linux, `Cmd+V` on Mac)
3. Press `Enter` to run it

---

### Step 6: Watch It Work

The script will:
1. Scroll down your following list
2. Click "Unfollow" on each person (skipping those who follow you back, if applicable)
3. Confirm each unfollow automatically
4. Keep going until it's done

**You'll see messages in the console like:**
```
WAITING FOR 1 SECONDS...
UNFOLLOWING 10 USERS...
NO ACCOUNTS FOUND, SO I THINK WE'RE DONE
```

---

## Tips & Tricks

### Go Slow to Avoid Rate Limits
X (Twitter) may temporarily limit your account if you unfollow too many people too fast. The script has built-in delays, but if you're unfollowing thousands of people:
- Run the script in batches
- Wait 15-30 minutes between runs

### Keep Your Browser Open
Don't close the tab or put your computer to sleep while the script is running.

### Missed Some People?
Just reload the page and run the script again. It will pick up where it left off.

---

## Troubleshooting

### "Nothing is happening"
- Make sure you're on the Following page (not Followers)
- Try scrolling down manually first to load some accounts
- Reload the page and try again

### "I see an error message"
- Copy the error message
- [Open an issue](https://github.com/nirholas/UnfollowX/issues) on GitHub and paste it there

### "The console closed"
- Press the keyboard shortcut again to reopen it
- You may need to paste and run the script again

---

## Safety & Privacy

✅ **Safe:** This script only clicks buttons in your browser — the same actions you'd do manually  
✅ **Private:** No data is sent anywhere; everything runs locally in your browser  
✅ **Open Source:** All code is visible on GitHub so you can verify exactly what it does  

---

## 🔭 Want to Monitor Followers Instead?

Check out the [Monitoring Guide](monitoring.md) to learn how to:
- Find out who unfollowed you
- Track your new followers
- Monitor any public account's activity
- Set up continuous monitoring with alerts

---

## Need Help?

- 📖 [Full documentation](https://github.com/nirholas/UnfollowX/tree/main/docs)
- 🔭 [Monitoring Guide](monitoring.md)
- 🐛 [Report a bug](https://github.com/nirholas/UnfollowX/issues)
- 💬 [Ask a question](https://github.com/nirholas/UnfollowX/discussions)

---

Happy unfollowing! 🎉
