# UnfollowX

![UnfollowX by nirholas](https://raw.githubusercontent.com/nirholas/UnfollowX/refs/heads/main/.github/UnfollowX.png)

**Clean up your X (Twitter) following list in seconds.** Free, open-source browser scripts that automate unfollowing — no apps, no sign-ins, no data collection.

🌐 **[Visit the Website](https://unfollowx.vercel.app)** | 📖 **[Getting Started Guide](docs/getting-started.md)** | 🐛 **[Report an Issue](https://github.com/nirholas/UnfollowX/issues)**

---

## ✨ What Can UnfollowX Do?

### 🧹 Unfollow Tools
| Feature | Description |
|---------|-------------|
| **Unfollow Non-Followers** | Remove people who don't follow you back |
| **Unfollow Everyone** | Clean slate — unfollow your entire following list |
| **Unfollow with Log** | Unfollow non-followers AND download a list of who was unfollowed |

### 🔭 Monitoring Tools
| Feature | Description |
|---------|-------------|
| **Detect Unfollowers** | Find out who stopped following YOU |
| **New Follower Alerts** | Track when you gain new followers |
| **Monitor Any Account** | Track follows/unfollows on ANY public account |
| **Continuous Monitoring** | Auto-check with browser notifications |

### 🤖 Automation Framework (NEW!)
| Feature | Description |
|---------|-------------|
| **XActions Library** | Complete X/Twitter API with 100+ actions available |
| **Auto-Liker** | Automatically like posts matching keywords or from specific users |
| **Keyword Follow** | Search keywords and auto-follow matching profiles |
| **Smart Unfollow** | Unfollow users who don't follow back after X days |
| **Link Scraper** | Extract all links shared by any user |
| **Auto-Commenter** | Auto-comment on a user's new posts |
| **Multi-Account** | Manage multiple X accounts with user:pass import |
| **Growth Suite** | All-in-one automation combining follow, like, and unfollow |
| **Follow Target Users** | Follow followers/following of any account |
| **Follow Engagers** | Follow people who liked/retweeted specific posts |
| **Protect Active Users** | Don't unfollow users who engage with your content |
| **Quota Supervisor** | Sophisticated rate limiting to protect your account |
| **Session Logger** | Track all actions with analytics and reports |
| **Customer Service Bot** | Automate customer support responses for business accounts |

---

## 🚀 Quick Start (60 seconds)

### 1. Go to your Following page
```
https://twitter.com/YOUR_USERNAME/following
```

### 2. Open Developer Console
| System | Shortcut |
|--------|----------|
| **Windows/Linux** | `Ctrl` + `Shift` + `J` |
| **Mac** | `Cmd` + `Option` + `J` |

### 3. Copy & paste a script

**Unfollow people who don't follow you back:**
```js
// Unfollow non-followers on X — by @nichxbt
// https://github.com/nirholas/UnfollowX
(() => {
  const $followButtons = '[data-testid$="-unfollow"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';
  const retry = { count: 0, limit: 3 };

  const sleep = (s) => new Promise(r => setTimeout(r, s * 1000));
  const scroll = () => window.scrollTo(0, document.body.scrollHeight);

  const unfollowAll = async (buttons) => {
    for (const btn of buttons) {
      btn.click();
      await sleep(1);
      document.querySelector($confirmButton)?.click();
      await sleep(0.5);
    }
  };

  const run = async () => {
    scroll();
    await sleep(1);
    let buttons = [...document.querySelectorAll($followButtons)]
      .filter(b => !b.closest('[data-testid="UserCell"]')?.querySelector('[data-testid="userFollowIndicator"]'));
    
    if (buttons.length) {
      console.log(`Unfollowing ${buttons.length} users...`);
      await unfollowAll(buttons);
      retry.count = 0;
      await sleep(2);
      return run();
    }
    
    if (++retry.count < retry.limit) {
      await sleep(2);
      return run();
    }
    console.log('✅ Done! Reload and run again if any were missed.');
  };

  run();
})();
```

### 4. Press Enter and watch it work! 🎉

---

## 📁 Available Scripts

All scripts are in the [`src/`](src/) folder:

### 🧹 Unfollow Scripts
| File | What it does |
|------|--------------|
| [`unfollowback.js`](src/unfollowback.js) | Unfollow users who don't follow you back |
| [`unfollowEveryone.js`](src/unfollowEveryone.js) | Unfollow everyone in your following list |
| [`unfollowWDFBLog.js`](src/unfollowWDFBLog.js) | Unfollow non-followers + download a `.txt` log file |

### 🔭 Monitoring Scripts
| File | What it does |
|------|--------------|
| [`detectUnfollowers.js`](src/detectUnfollowers.js) | Find out who unfollowed YOU — run on your followers page |
| [`newFollowersAlert.js`](src/newFollowersAlert.js) | Track your new followers over time |
| [`monitorAccount.js`](src/monitorAccount.js) | Monitor ANY public account's followers or following |
| [`continuousMonitor.js`](src/continuousMonitor.js) | Auto-refresh monitoring with browser notifications |

### 🤖 Automation Scripts
| File | What it does |
|------|--------------|
| [`automation/core.js`](src/automation/core.js) | Core utilities required by all automation scripts |
| [`automation/autoLiker.js`](src/automation/autoLiker.js) | Auto-like timeline posts with keyword filtering |
| [`automation/keywordFollow.js`](src/automation/keywordFollow.js) | Search and auto-follow users matching keywords |
| [`automation/smartUnfollow.js`](src/automation/smartUnfollow.js) | Unfollow non-followers after a grace period |
| [`automation/linkScraper.js`](src/automation/linkScraper.js) | Extract all links from a user's profile |
| [`automation/autoCommenter.js`](src/automation/autoCommenter.js) | Auto-comment on new posts from a target user |
| [`automation/multiAccount.js`](src/automation/multiAccount.js) | Manage multiple X accounts (user:pass import) |
| [`automation/growthSuite.js`](src/automation/growthSuite.js) | All-in-one growth automation suite |
| [`automation/followTargetUsers.js`](src/automation/followTargetUsers.js) | Follow the followers/following of target accounts |
| [`automation/followEngagers.js`](src/automation/followEngagers.js) | Follow users who liked/retweeted specific posts |
| [`automation/protectActiveUsers.js`](src/automation/protectActiveUsers.js) | Protect users who engage with your content |
| [`automation/quotaSupervisor.js`](src/automation/quotaSupervisor.js) | Rate limiting and action management |
| [`automation/sessionLogger.js`](src/automation/sessionLogger.js) | Track actions with analytics and reporting |
| [`automation/customerService.js`](src/automation/customerService.js) | Customer service bot for business accounts |
| [`automation/actions.js`](src/automation/actions.js) | **Complete XActions library — 100+ X/Twitter actions** |

---

## 📖 Documentation

- **[Getting Started Guide](docs/getting-started.md)** — Step-by-step instructions with screenshots
- **[Monitoring Guide](docs/monitoring.md)** — How to use monitoring scripts
- **[Automation Guide](docs/automation.md)** — Full automation framework documentation
- **[Usage Guide](docs/usage.md)** — Detailed usage information
- **[Examples](examples/README.md)** — Quick examples and use cases
- **[Contributing](CONTRIBUTING.md)** — How to contribute to the project

---

## 🛠️ How It Works

UnfollowX is a collection of JavaScript snippets that run in your browser's Developer Console. Here's what happens:

```
┌─────────────────────────────────────────────────────────────┐
│  1. Script scrolls down to load more accounts               │
│  2. Finds "Following" buttons on screen                     │
│  3. Filters out people who follow you back (optional)       │
│  4. Clicks "Unfollow" on each one                          │
│  5. Confirms the unfollow in the popup                     │
│  6. Repeats until no more accounts are found               │
└─────────────────────────────────────────────────────────────┘
```

**No external servers. No data collection. Everything runs locally in YOUR browser.**

---

## ⚠️ Important Notes

### Rate Limits
X (Twitter) may temporarily limit your account if you unfollow too quickly. Tips:
- The script has built-in delays (1-2 seconds between unfollows)
- For large following lists (1000+), run in batches and take breaks
- If you hit a limit, wait 15-30 minutes and try again

### Browser Compatibility
Works best in:
- ✅ Google Chrome
- ✅ Microsoft Edge
- ✅ Firefox
- ✅ Safari

### Stay on the Page
Keep the browser tab open and active while the script runs. Don't minimize or switch tabs.

---

## 🔧 Customization

Want to adjust the script? Here are some tweaks:

### Change the delay between unfollows
```js
// Find this line and change the number (seconds):
await sleep(1);  // Change 1 to 2 for slower, 0.5 for faster
```

### Add a maximum unfollow limit
```js
// Add this at the top of the script:
let unfollowCount = 0;
const MAX_UNFOLLOWS = 100;

// Then check before each unfollow:
if (unfollowCount >= MAX_UNFOLLOWS) {
  console.log('Reached limit!');
  return;
}
unfollowCount++;
```

---

## 🤔 FAQ

**Q: Is this safe to use?**  
A: Yes! The script only automates clicks — the same actions you'd do manually. No passwords or data are accessed.

**Q: Will I get banned?**  
A: Unlikely if you use it reasonably. Avoid unfollowing thousands of accounts in minutes. Use the built-in delays.

**Q: Can I undo this?**  
A: No — unfollows are permanent. Use the logging script (`unfollowWDFBLog.js`) to keep a record of who you unfollowed.

**Q: It stopped working — help!**  
A: X sometimes updates their website. [Open an issue](https://github.com/nirholas/UnfollowX/issues) and we'll update the script.

---

## 🌟 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Ways to help:
- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve documentation
- 🔧 Submit pull requests

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 💜 Credits

Created by **[Nicholas Resendez](https://x.com/nichxbt)** ([@nichxbt](https://x.com/nichxbt))

### Contributors
- [Ethan JL](https://github.com/tahajalili) — Added unfollow logging feature

---

<p align="center">
  Made with 🤍 by the community
  <br>
  <a href="https://github.com/nirholas/UnfollowX">⭐ Star this repo</a> if you found it helpful!
</p>
