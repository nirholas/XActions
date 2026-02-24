# XActions Browser Extension

> Run XActions automation scripts on X/Twitter without browser console access. Dark-themed popup with toggle cards, per-automation settings, live activity log, and global controls.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Chrome](https://img.shields.io/badge/Chrome-✓-green)
![Firefox](https://img.shields.io/badge/Firefox-✓-green)

## Features

### Automations (6)
- **Auto-Liker** — Like tweets matching keywords in your feed
- **Smart Unfollow** — Unfollow users who don't follow back
- **Keyword Follow** — Search keywords and follow matching users
- **Growth Suite** — All-in-one: like, follow, unfollow non-followers
- **Auto-Commenter** — Auto-reply to new posts with configurable comments
- **Follow Engagers** — Follow users who liked/retweeted a specific tweet

### Tools (5)
- **Video Downloader** — Adds a download button (⬇) to every tweet with video
- **Who Unfollowed Me** — Scans your followers, compares to last snapshot, shows unfollowers
- **Best Time to Post** — Analyzes engagement by hour/day, finds optimal posting times
- **Thread Reader** — Adds "Unroll" button (🧵) to threads, shows clean readable overlay
- **Quick Stats** — Calculates engagement rate and shows floating overlay on profile page

### Global Features
- **Right-click context menu** — "Download video", "Unroll thread", "Analyze account"
- **First-run onboarding** — Welcome modal with one-click popular feature enablement
- **Rate limit detection** — Auto-pauses automations on HTTP 429, shows warning banner
- **Emergency stop** — Red button stops all running automations instantly
- **Import/Export settings** — Backup and restore all settings as JSON
- **Activity log** — Real-time log of all actions across all automations
- **Badge counter** — Extension badge shows total action count

Each automation has:
- Configurable settings (delays, limits, keywords, filters)
- Start/Stop toggle
- Live action counter
- Activity logging

## Installation

### Chrome (Load Unpacked)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` directory from this repository
5. The XActions icon ("XA") appears in your toolbar
6. Pin it for easy access

### Firefox (Temporary Add-on)

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select the `extension/manifest.json` file
4. The XActions icon appears in your toolbar

> **Note:** Firefox temporary add-ons are removed when Firefox closes. For permanent installation, the extension would need to be signed via [addons.mozilla.org](https://addons.mozilla.org).

## Usage

1. Navigate to **x.com** (or twitter.com)
2. Click the **XA** icon in your browser toolbar
3. The popup shows your connection status (green dot = connected)
4. Configure an automation's settings via the ⚙️ button
5. Click ▶️ to start, ⏹ to stop
6. Watch the **Activity** tab for real-time logs
7. Use the red **⏹** button in the header for emergency stop all

### Automation Tips

| Feature | Navigate to | Notes |
|---|---|---|
| Auto-Liker | Home feed or any profile | Scrolls and likes matching tweets |
| Smart Unfollow | `x.com/YOUR_USERNAME/following` | Must be on your following page |
| Keyword Follow | Any page (it searches) | Navigates to search automatically |
| Growth Suite | Home feed | Runs like + follow + unfollow phases |
| Auto-Commenter | A user's profile | Monitors for new posts |
| Follow Engagers | A specific tweet | Opens the likers panel |
| Video Downloader | Any feed or tweet | Adds ⬇ button to tweets with video |
| Who Unfollowed Me | `x.com/YOUR_USERNAME/followers` | Must be on your followers page |
| Best Time to Post | Your profile (tweets tab) | Scrolls and analyzes engagement data |
| Thread Reader | Any feed | Adds 🧵 button to detected threads |
| Quick Stats | Your profile | Samples tweets for engagement rate |

## Architecture

```
extension/
├── manifest.json              # Manifest V3 configuration
├── background/
│   └── service-worker.js      # State management, badge, alarms
├── content/
│   ├── bridge.js              # Content script — message bridge
│   └── injected.js            # Page-context script — automation engine
├── popup/
│   ├── popup.html             # Popup UI
│   ├── popup.css              # Dark theme styles
│   └── popup.js               # Popup controller
├── icons/
│   ├── icon16.png             # Toolbar icon
│   ├── icon48.png             # Extension page icon
│   └── icon128.png            # Store icon
└── README.md                  # This file
```

### Communication Flow

```
┌─────────┐     chrome.runtime      ┌───────────────┐     chrome.runtime      ┌─────────┐
│  Popup   │ ◄──────────────────────► │  Background   │ ◄──────────────────────► │ Content │
│ popup.js │    sendMessage           │ service-worker│    sendMessage           │ bridge  │
└─────────┘                          └───────────────┘                          └────┬────┘
                                                                                     │
                                                                              window.postMessage
                                                                                     │
                                                                              ┌──────▼──────┐
                                                                              │   Injected   │
                                                                              │  injected.js │
                                                                              │ (page context)│
                                                                              └──────────────┘
```

- **Popup** ↔ **Background**: `chrome.runtime.sendMessage` for start/stop commands and state queries
- **Background** ↔ **Content (Bridge)**: `chrome.tabs.sendMessage` to relay commands to specific tabs
- **Content (Bridge)** ↔ **Injected (Page)**: `window.postMessage` since they share the same page but different JS contexts
- **Settings**: persisted in `chrome.storage.local`

## Settings Storage

All settings are stored per-automation in `chrome.storage.local`:

```
settings_autoLiker: { keywords: [...], maxActions: 20, minDelay: 2000, ... }
settings_smartUnfollow: { daysToWait: 3, maxActions: 50, ... }
settings_videoDownloader: { quality: 'highest', showButton: true, ... }
settings_unfollowerDetector: { checkFrequency: 24, notifications: true, ... }
settings_bestTimeToPost: { tweetCount: 50, timezone: 'local' }
settings_threadReader: { showUnrollBtn: true, autoDetect: true, maxTweets: 50 }
settings_quickStats: { showOverlay: true, trackDaily: true, sampleSize: 20 }
globalSettings: { minDelay: 2000, maxDelay: 5000, debug: true }
activityLog: [ { time, type, automation, message }, ... ]
automations: { autoLiker: { running, actionCount, startedAt }, ... }
firstRun: true/false
rateLimited: true/false
```

## Permissions

| Permission | Reason |
|---|---|
| `activeTab` | Access the current X tab to inject scripts |
| `storage` | Persist settings and activity log |
| `alarms` | Periodic health checks |
| `scripting` | Programmatic script injection |
| `contextMenus` | Right-click menu: Download video, Unroll thread, Analyze account |
| `notifications` | Alert when rate limits are detected |
| `host_permissions: x.com, twitter.com` | Only runs on X/Twitter pages |

## Development

To modify automations, edit `content/injected.js`. Each automation is registered via `registerAutomation(id, asyncRunnerFn)`.

To add a new automation:

1. Add a `registerAutomation('myNew', async (settings) => { ... })` block in `injected.js`
2. Add a card in `popup.html` with `data-automation="myNew"`
3. The settings/toggle/log infrastructure handles the rest automatically

## Credits

Built by [nichxbt](https://x.com/nichxbt) as part of [XActions](https://github.com/nirholas/XActions).
