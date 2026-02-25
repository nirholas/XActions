# XActions Extension — User Guide

Complete guide to installing and using the XActions browser extension for X/Twitter automation.

---

## Table of Contents

- [Installation](#installation)
- [First Launch](#first-launch)
- [Popup Overview](#popup-overview)
- [Automations Reference](#automations-reference)
- [Dashboard & Filtering](#dashboard--filtering)
- [Activity Log](#activity-log)
- [Settings](#settings)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Right-Click Menus](#right-click-menus)
- [Rate Limits & Safety](#rate-limits--safety)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Installation

### Chrome / Edge / Brave (Load Unpacked)

1. Open `chrome://extensions/` (or `edge://extensions/` / `brave://extensions/`)
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` directory from the XActions repository
5. The **XA** icon appears in your toolbar
6. **Pin it** — right-click the icon → Pin for easy access

### Firefox (Temporary Add-on)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `extension/manifest.json`
4. The **XA** icon appears in your toolbar

> **Note:** Firefox temporary add-ons are removed when Firefox closes. For persistent installation, the extension must be signed via [addons.mozilla.org](https://addons.mozilla.org).

### Verify Installation

After loading, navigate to **x.com**. Click the **XA** icon:

- **Green dot** in the header = Connected to X ✓
- **Grey dot** = Not on an X/Twitter tab — navigate to x.com first

---

## First Launch

On first install, a **Welcome to XActions** modal appears:

1. Review the featured automations (Auto-Liker, Smart Unfollow, Video Downloader, Thread Reader)
2. The **"Enable popular features"** checkbox is pre-checked — this auto-configures Video Downloader and Thread Reader with sensible defaults
3. Click **Get Started** to dismiss

You can always reconfigure these in each card's settings later.

---

## Popup Overview

The popup has three tabs:

### Header

| Element | Description |
|---|---|
| **XA** logo | Brand identifier |
| Green/grey dot | Connection status — green when active tab is x.com |
| ⏸ button | **Pause/Resume** all automations (preserves state) |
| ⏹ red button | **Emergency Stop** — instantly halts everything |

### Disconnected Banner

When the active tab is **not** x.com, a prominent yellow banner appears:

> 🔗 Not connected to X — Open x.com in a tab to start using automations

### Account Info

Shows your X account name, handle, and avatar (scraped from the page DOM when connected).

### Automations Tab

- **Dashboard** — 4-stat grid: Running (count), Today (actions today), Total (all-time), Uptime (session duration)
- **Category filters** — [All] [Growth] [Tools] [Analytics] pill buttons
- **Search bar** — Type to filter automations by name or keywords
- **11 automation cards** — Each with status badge, progress bar, settings panel

### Activity Tab

- **Filter dropdown** — Filter log entries by automation
- **Clear button** — Wipe the log
- **Scrollable log** — Relative timestamps ("2m ago"), color-coded by type

### Settings Tab

- Global delay settings (min/max ms)
- Debug logging toggle
- Export/Import/Reset buttons
- GitHub link and version

---

## Automations Reference

### ❤️ Auto-Liker

**Category:** Growth | **Navigate to:** Home feed or any profile

Scrolls the feed and likes tweets matching your keywords.

| Setting | Type | Default | Description |
|---|---|---|---|
| Keywords | text (comma-separated) | empty (= like all) | Only like tweets containing these words |
| Max likes per session | number | 20 | Stop after this many likes |
| Speed | preset (Safe/Normal/Fast) | Normal | Controls delay between actions |
| Delay between actions | range slider | 2.0s — 5.0s | Fine-tune timing |

**How it works:**
1. Scans visible tweets for `[data-testid="tweet"]`
2. Checks keyword match (empty = all tweets)
3. Skips ads, already-liked tweets, replies
4. Clicks the heart button
5. Scrolls 800px, waits, repeats
6. Stops at max likes or stop button press

**Rate limit:** Max 200 likes/day (enforced internally)

---

### 👋 Smart Unfollow

**Category:** Growth | **Navigate to:** `x.com/YOUR_USERNAME/following`

Unfollows users who don't follow you back.

| Setting | Type | Default | Description |
|---|---|---|---|
| Days to wait | number | 3 | Skip users you followed recently |
| Max unfollows per session | number | 50 | Session limit |
| Whitelist | text (comma-separated) | empty | Usernames to never unfollow |
| Speed | preset | Normal | Action pacing |
| Dry run | checkbox | off | Preview mode — logs unfollows without executing |

**Prerequisites:** You must be on your `/following` page.

**How it works:**
1. Scans `[data-testid="UserCell"]` elements
2. Checks if `userFollowIndicator` exists (= follows you back → skip)
3. Checks whitelist
4. Clicks unfollow → confirms the dialog
5. Scrolls and repeats

---

### 🔍 Keyword Follow

**Category:** Growth | **Navigate to:** Any page (navigates automatically)

Searches for keywords on X and follows matching users.

| Setting | Type | Default | Description |
|---|---|---|---|
| Keywords | text (comma-separated) | — | Search terms |
| Max follows per keyword | number | 10 | Limit per keyword |
| Max follows total | number | 30 | Session cap |
| Min followers on user | number | 100 | Quality filter |
| Speed | preset | Safe | Slower by default for safety |
| Must have bio | checkbox | off | Skip accounts with empty bios |

**How it works:**
1. For each keyword, navigates to `x.com/search?q={keyword}&f=user`
2. Scans user cells, checks min followers
3. Clicks follow button
4. Moves to next keyword when per-keyword limit reached

**Rate limit:** Max 100 follows/day (enforced internally)

---

### 🚀 Growth Suite

**Category:** Growth | **Navigate to:** Home feed

All-in-one automation that runs like, follow, and unfollow phases in sequence.

| Setting | Type | Default | Description |
|---|---|---|---|
| Keywords | text | — | Filter for like phase |
| Session duration | number (minutes) | 30 | Total runtime |
| Max likes | number | 30 | Like phase limit |
| Max follows | number | 20 | Follow phase limit |
| Max unfollows | number | 15 | Unfollow phase limit |
| Speed | preset | Safe | Conservative pacing |
| Enable follow | checkbox | ✓ | Include follow phase |
| Enable like | checkbox | ✓ | Include like phase |
| Enable unfollow | checkbox | ✓ | Include unfollow phase |

**How it works:**
1. Phase 1 (Like): Scrolls feed, likes keyword-matching tweets
2. Phase 2 (Follow): _Placeholder — not yet implemented_
3. Phase 3 (Unfollow): _Placeholder — not yet implemented_
4. Stops at session duration or all phase limits reached

---

### 💬 Auto-Commenter

**Category:** Growth | **Navigate to:** A user's profile or any feed

Auto-replies to new posts with random comments from your list.

| Setting | Type | Default | Description |
|---|---|---|---|
| Comments | text (comma-separated) | — | Pool of comments to randomly pick from |
| Keywords filter | text | empty (= all posts) | Only reply to posts matching these words |
| Check interval | number (seconds) | 60 | How often to scan for new posts |
| Max comments per session | number | 5 | Session limit |

**How it works:**
1. Scans tweets, skips already-commented
2. Checks keyword filter
3. Clicks reply button, waits for textbox
4. Types a random comment from pool using `execCommand('insertText')`
5. Clicks the tweet/submit button
6. Waits check interval, repeats

---

### 👥 Follow Engagers

**Category:** Growth | **Navigate to:** A specific tweet (`x.com/user/status/12345`)

Follows users who liked or retweeted a specific tweet.

| Setting | Type | Default | Description |
|---|---|---|---|
| Mode | select | Likers | Likers or Retweeters |
| Max follows | number | 30 | Session limit |
| Min followers | number | 50 | Quality filter |
| Speed | preset | Safe | Conservative pacing |

**Prerequisites:** You must be viewing a tweet page (URL contains `/status/`).

**How it works:**
1. Clicks the "likes" link on the tweet
2. Scans the likers/retweeters list
3. Follows users meeting the min followers threshold
4. Scrolls to load more users

---

### 🎬 Video Downloader

**Category:** Tools | **Navigate to:** Any feed or tweet page

Adds a ⬇ download button to tweets that contain video.

| Setting | Type | Default | Description |
|---|---|---|---|
| Quality | select | Highest | Preferred quality: Highest, 720p, 480p |
| Auto-download | checkbox | off | Download on detection without clicking |
| Show button | checkbox | ✓ | Add ⬇ button to tweets with video |

**How it works:**
1. Uses MutationObserver to continuously watch for new tweets
2. For each tweet with a `<video>` element, injects a styled ⬇ button into the action bar
3. On click: extracts video URL from `<video src>`, `<source>`, or `a[href*=".mp4"]`
4. Triggers download via `<a download>` element
5. Runs persistently until stopped

**Also available via right-click:** Right-click any tweet → "Download video (XActions)"

---

### 🔔 Who Unfollowed Me

**Category:** Analytics | **Navigate to:** `x.com/YOUR_USERNAME/followers`

Detects unfollowers by comparing follower snapshots over time.

| Setting | Type | Default | Description |
|---|---|---|---|
| Check frequency | number (hours) | 24 | How often to auto-check |
| Notifications | checkbox | ✓ | Browser notifications for unfollowers |
| Keep history | checkbox | ✓ | Store unfollower history (max 50 entries) |

**Prerequisites:** You must be on your `/followers` page.

**How it works:**
1. Scrolls your followers page, collects all usernames into a Set
2. Stops after 5 consecutive scrolls with no new users (or 100 scroll attempts)
3. Loads previous snapshot from localStorage
4. Computes diff: unfollowers (in previous but not current) and new followers
5. Logs results, saves current snapshot with timestamp

---

### 📊 Best Time to Post

**Category:** Analytics | **Navigate to:** Your profile (tweets tab)

Analyzes engagement patterns to find optimal posting times.

| Setting | Type | Default | Description |
|---|---|---|---|
| Tweets to analyze | number | 50 | Sample size |
| Timezone | select | Local | Local time or UTC |

**How it works:**
1. Scrolls your tweets, extracts: datetime, likes, retweets, replies (from `aria-label` on engagement buttons)
2. Groups by hour (0–23) and day (Mon–Sun)
3. Averages engagement per time slot
4. Sorts descending, logs top 3 hours and best day
5. Saves results to localStorage

---

### 🧵 Thread Reader

**Category:** Tools | **Navigate to:** Any feed

Adds an "Unroll 🧵" button to detected threads and shows a clean readable overlay.

| Setting | Type | Default | Description |
|---|---|---|---|
| Show Unroll button | checkbox | ✓ | Add 🧵 button to thread tweets |
| Auto-detect threads | checkbox | ✓ | Automatically find threads |
| Max tweets to unroll | number | 50 | Limit per thread |

**How it works:**
1. Uses MutationObserver to watch for new tweets
2. Detects threads via: "Show this thread" link text, `tweet-thread-line` testid, or `border-left` styles
3. Injects 🧵 button into action bars
4. On click: collects all tweet texts, shows fullscreen overlay with numbered tweets
5. "📋 Copy Thread" button copies formatted text to clipboard

**Also available via right-click:** Right-click any tweet → "Unroll thread (XActions)"

---

### ⚡ Quick Stats

**Category:** Analytics | **Navigate to:** Your profile

Calculates your engagement rate and shows a floating overlay.

| Setting | Type | Default | Description |
|---|---|---|---|
| Show overlay | checkbox | ✓ | Display stats panel on your profile |
| Track daily | checkbox | ✓ | Save daily snapshots (max 90 days) |
| Tweets to sample | number | 20 | Sample size |

**How it works:**
1. Scrolls your profile, collects likes/retweets/replies/views from `aria-label` on action buttons
2. Computes: engagement rate (total engagement / total views), avg likes, avg RTs, avg replies
3. Injects a fixed-position overlay (bottom-right) with a 2×2 stats grid
4. Saves to localStorage; if track daily enabled, appends to history

**Also available via right-click:** Right-click on any profile → "Analyze account (XActions)"

---

## Dashboard & Filtering

### Dashboard Stats

The 4-stat grid at the top of the Automations tab:

| Stat | Description |
|---|---|
| **Running** | Number of currently active automations (green when > 0) |
| **Today** | Total actions performed today (resets at midnight) |
| **Total** | All-time action count across all automations |
| **Uptime** | Time since the earliest running automation started |

### Category Filters

Click a category pill to filter cards:

| Filter | Shows |
|---|---|
| All | All 11 cards |
| Growth | Auto-Liker, Smart Unfollow, Keyword Follow, Growth Suite, Auto-Commenter, Follow Engagers |
| Tools | Video Downloader, Thread Reader |
| Analytics | Who Unfollowed Me, Best Time to Post, Quick Stats |

### Search

Type in the search bar to filter by name or keywords. Press `/` to focus, `Esc` to clear.

If no cards match, an empty state message appears: "🔍 No automations match your filter"

---

## Activity Log

The Activity tab shows a real-time log of all automation events.

### Entry Types

| Icon | Type | Color | Description |
|---|---|---|---|
| ▶️ | start | Blue | Automation started |
| ⏹ | stop | Yellow | Automation stopped |
| 🔧 | action | White | Individual action performed (like, follow, etc.) |
| ✅ | complete | Green | Automation finished its run |
| ❌ | error | Red | Error occurred |

### Filtering

Use the dropdown to filter by automation:
- **All** — Show everything
- **❤️ Liker, 👋 Unfollow, 🔍 Follow, 🚀 Growth, 💬 Commenter, 👥 Engagers** — Growth automations
- **🎬 Video, 🧵 Thread** — Tool automations
- **🔔 Unfollower, 📊 Best Time, ⚡ Stats** — Analytics automations

### Timestamps

Entries show relative time ("2m ago", "1h ago") by default. Hover to see the exact time.

### Limits

- Max 500 entries stored (oldest pruned automatically)
- Max 100 entries displayed at once

---

## Settings

### Global Settings

| Setting | Default | Description |
|---|---|---|
| Default min delay | 2000ms | Minimum wait between actions |
| Default max delay | 5000ms | Maximum wait between actions |
| Debug logging | On | Enable console.log output in browser DevTools |

Global settings auto-save on change.

### Data Management

| Button | Action |
|---|---|
| **Export settings** | Downloads all settings as `xactions-settings-YYYY-MM-DD.json` |
| **Import settings** | Upload a previously exported JSON file |
| **Reset all data** | Clears ALL storage (requires confirmation) |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Shift + S` | Emergency stop all automations |
| `Ctrl + Shift + P` | Pause / Resume all automations |
| `/` | Focus the search bar |
| `Esc` | Clear search and unfocus |

---

## Right-Click Menus

Right-click on any x.com page to access:

| Menu Item | Action |
|---|---|
| **Download video (XActions)** | Triggers Video Downloader on current page |
| **Unroll thread (XActions)** | Triggers Thread Reader on current tweet |
| **Analyze account (XActions)** | Triggers Quick Stats on current profile |

These work even if the corresponding automation isn't running in the popup.

---

## Rate Limits & Safety

### Built-in Protections

- **Hourly/daily action caps**: Max 200 likes/day, 100 follows/day (enforced internally)
- **Randomized delays**: All actions have random delay jitter to appear human
- **Rate limit detection**: Extension monitors HTTP 429 responses from X's API
- **Auto-pause**: When rate limit detected, all automations pause automatically
- **Warning banner**: Yellow banner appears in popup with "Dismiss" button

### Speed Presets

| Preset | Min Delay | Max Delay | Use Case |
|---|---|---|---|
| **Safe** | 3.0s | 6.0s | New accounts, conservative use |
| **Normal** | 2.0s | 5.0s | Standard operation |
| **Fast** | 1.0s | 2.5s | Experienced users only — higher risk |

### Recommendations

- Start with **Safe** speed and low action limits
- Don't run more than 2 growth automations simultaneously
- Monitor the Activity tab for any error messages
- If you get rate-limited, wait at least 15 minutes before resuming

---

## Troubleshooting

### Extension Not Connecting

**Symptom:** Grey dot, disconnected banner

**Fix:**
1. Make sure you're on `x.com` or `twitter.com`
2. Refresh the page
3. If still disconnected, go to `chrome://extensions/`, find XActions, click the reload ↻ button

### Automation Not Working

**Symptom:** Started but 0 actions

**Fix:**
1. Check you're on the correct page for that automation (see table above)
2. Check the Activity tab for error messages
3. Ensure keywords match actual tweet content (empty = match all)
4. Open DevTools console (F12) and check for errors

### Rate Limited

**Symptom:** Yellow "Rate limit detected" banner

**Fix:**
1. Click Dismiss
2. Wait 15–30 minutes
3. Reduce speed to Safe
4. Lower max action limits

### Settings Not Saving

**Symptom:** Settings reset when reopening popup

**Fix:**
1. Check that `chrome.storage.local` isn't full (5MB limit)
2. Try Export → Reset All → Import
3. Reload the extension

---

## FAQ

**Q: Does this use the X/Twitter API?**
No. XActions operates entirely through browser DOM automation — it clicks real buttons on the real x.com page. No API keys, no fees.

**Q: Can X detect this?**
XActions mimics human behavior with randomized delays, but no automation is 100% undetectable. Use conservative settings and don't exceed daily limits.

**Q: Does it work when the popup is closed?**
Persistent automations (Video Downloader, Thread Reader) run via MutationObserver in the page and stay active as long as the x.com tab is open. Action-based automations (Auto-Liker, etc.) run in the page context and continue even when the popup is closed.

**Q: Firefox support?**
Works as a temporary add-on. Most features work with Manifest V3 in Firefox 109+. Full Firefox Add-ons Store support is planned.

**Q: Can I run multiple automations at once?**
Yes. The dashboard shows how many are running simultaneously. Be cautious — running too many at once increases rate limit risk.

**Q: Where is my data stored?**
Everything is stored locally in `chrome.storage.local` — never sent to any server. Export to back up your settings.

**Q: How do I uninstall?**
Go to `chrome://extensions/`, find XActions, click Remove. All stored data is deleted automatically.
