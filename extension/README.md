# XActions Browser Extension

> Run XActions automations on X/Twitter directly from your browser toolbar. No console access needed. Dark-themed popup with 11 automation cards, live dashboard, category filtering, search, progress tracking, and keyboard shortcuts.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Chrome](https://img.shields.io/badge/Chrome-✓-green)
![Firefox](https://img.shields.io/badge/Firefox-✓-green)
![11 Automations](https://img.shields.io/badge/Automations-11-orange)

## Quick Start

1. Open `chrome://extensions/` → Enable **Developer mode** → **Load unpacked** → select the `extension/` folder
2. Navigate to **x.com**
3. Click the **XA** icon in your toolbar
4. Pick an automation, configure settings, click ▶️

Full installation guide: [docs/extension.md](../docs/extension.md)

## Features

### Growth Automations (6)

| Automation | What it does | Settings |
|---|---|---|
| ❤️ **Auto-Liker** | Like tweets matching keywords in your feed | Keywords, max likes, speed preset |
| 👋 **Smart Unfollow** | Unfollow non-followers from your /following page | Days to wait, whitelist, dry run |
| 🔍 **Keyword Follow** | Search keywords and follow matching users | Keywords, max per keyword, min followers |
| 🚀 **Growth Suite** | All-in-one: like + follow + unfollow in one session | Session duration, per-action limits |
| 💬 **Auto-Commenter** | Reply to posts with random comments from your list | Comment pool, check interval, keyword filter |
| 👥 **Follow Engagers** | Follow users who liked/retweeted a specific tweet | Mode (likers/retweeters), min followers |

### Tools (2)

| Automation | What it does | Settings |
|---|---|---|
| 🎬 **Video Downloader** | Adds ⬇ button to tweets with video | Quality, auto-download, show button |
| 🧵 **Thread Reader** | Adds 🧵 Unroll button to threads, shows clean overlay | Show button, auto-detect, max tweets |

### Analytics (3)

| Automation | What it does | Settings |
|---|---|---|
| 🔔 **Who Unfollowed Me** | Scans followers, compares snapshots, detects unfollowers | Check frequency, notifications, history |
| 📊 **Best Time to Post** | Analyzes engagement patterns by hour/day | Sample size, timezone |
| ⚡ **Quick Stats** | Calculates engagement rate, shows floating overlay | Show overlay, track daily, sample size |

### UX Features

- **Dashboard** — 4-stat summary: running count, today's actions, total actions, uptime
- **Category filters** — All / Growth / Tools / Analytics pill buttons
- **Search** — Instant filter across all automations (press `/` to focus)
- **Progress bars** — Visual progress on running cards (e.g., 12/50)
- **Session timers** — Live elapsed time per running automation
- **Speed presets** — Safe / Normal / Fast instead of raw millisecond inputs
- **Delay sliders** — Range sliders with human-readable labels (2.0s — 5.0s)
- **Toast notifications** — Styled feedback for start/stop/import/export/errors
- **Disconnected banner** — Prominent alert when not on x.com with link
- **Activity log filtering** — Dropdown to filter by automation type
- **Relative timestamps** — "2m ago" in logs (hover for full time)
- **Pause/Resume** — ⏸ button pauses all without stopping
- **Emergency stop** — ⏹ instantly stops everything (no confirm dialog)
- **Keyboard shortcuts** — `Ctrl+Shift+S` stop, `Ctrl+Shift+P` pause, `/` search, `Esc` clear
- **Right-click menus** — "Download video", "Unroll thread", "Analyze account"
- **First-run onboarding** — Welcome modal with one-click feature setup
- **Rate limit detection** — Auto-pauses on HTTP 429
- **Import/Export** — Backup and restore all settings as JSON
- **Badge** — Green badge shows running automation count

## Architecture

```
extension/
├── manifest.json                  Manifest V3 configuration
├── background/
│   └── service-worker.js          State management, badge, context menus, rate limits
├── content/
│   ├── bridge.js                  Content script — message relay
│   └── injected.js                Page-context script — 11 automation runners
├── popup/
│   ├── popup.html                 Popup UI (632 lines)
│   ├── popup.css                  Dark theme styles (1086 lines)
│   └── popup.js                   Popup controller (782 lines)
└── icons/
    ├── icon16.png, icon48.png, icon128.png
```

### Message Flow

```
Popup  ──chrome.runtime──►  Background  ──chrome.tabs──►  Bridge  ──postMessage──►  Injected
popup.js                    service-worker.js              bridge.js                 injected.js
       ◄──chrome.runtime──              ◄──chrome.runtime──        ◄──postMessage──
```

## Detailed Docs

| Document | Contents |
|---|---|
| [Extension User Guide](../docs/extension.md) | Installation, usage, each automation explained, tips, FAQ |
| [Extension Internal API](../docs/extension-api.md) | Message protocol, storage schema, event flow |
| [Extension Developer Guide](../docs/extension-dev.md) | Adding automations, modifying UI, DOM selectors, testing |

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Access the current X tab |
| `storage` | Persist settings and activity log |
| `alarms` | Periodic health checks |
| `scripting` | Inject automation code |
| `contextMenus` | Right-click: Download video, Unroll thread, Analyze account |
| `notifications` | Rate limit alerts |
| `host_permissions` | Only x.com and twitter.com |

## Credits

Built by [nichxbt](https://x.com/nichxbt) as part of [XActions](https://github.com/nirholas/XActions).
