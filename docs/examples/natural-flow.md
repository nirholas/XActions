# 🌊 Natural Flow — Human-Like Browsing Session

Simulates a real person using X/Twitter: scroll timeline, like keyword posts, reply occasionally, retweet, bookmark, follow interesting accounts, check your own profile, read notifications, and return home.

---

## 📋 What It Does

Unlike single-purpose scripts (auto-liker, keyword-follow), Natural Flow chains multiple behaviors into one session that looks like genuine browsing:

| Phase | Action | Automated? |
|-------|--------|------------|
| 1. Home timeline | Scroll, like keyword-matched posts, reply, retweet, bookmark, queue follows | ✅ Like, Reply, RT, Bookmark, Follow |
| 2. Own profile | Visit your profile, scroll your recent posts | 👀 Read-only |
| 3. Notifications | Check notifications, scroll briefly | 👀 Read-only |
| 4. Return home | Navigate back, brief final scroll | 👀 Read-only |

**Why this matters:**
- Bots like the same things at constant rates — humans browse, pause, switch pages
- Mixing read-only phases with engagement phases mimics real usage patterns
- Randomized timing, probabilities, and scroll distances add variance every run
- Cooldown escalation makes delays gradually increase as the session progresses — just like a real person slowing down

---

## ⚠️ IMPORTANT WARNINGS

> **🚨 USE RESPONSIBLY.** X actively detects automation. This script adds human-like patterns but cannot make you invisible.

**Before you start:**
- ❌ **DON'T** run more than 1-2 sessions per day
- ❌ **DON'T** set maxLikes above 30 per session
- ❌ **DON'T** enable replies with generic templates on high-profile accounts
- ❌ **DON'T** run alongside other automation scripts
- ✅ **DO** start with `dryRun: true` to preview everything
- ✅ **DO** customize reply templates to sound like you
- ✅ **DO** keep follows under 5 per session
- ✅ **DO** mix with genuine manual activity

---

## 🚀 Quick Start

### 1. Go to x.com/home

Open your browser, make sure you're logged in.

### 2. Open DevTools Console

Press **F12** → click **Console** tab

### 3. Paste the script

Copy the contents of `scripts/naturalFlow.js`, paste into console, press Enter.

### 4. First run: Interactive setup

The script shows an **interactive setup prompt** on first run. Pick a preset or customize:

```
🌊 NATURAL FLOW — Choose a mode:

  1  👀 Lurker    — mostly scroll, like a few, no replies
  2  🤝 Friendly  — like + occasional reply, 1-2 follows
  3  🚀 Growth    — max engagement, replies + follows + retweets
  4  ⚙️  Custom    — set everything manually
  5  🏃 Dry Run   — preview the full session (safe)

Enter 1-5:
```

Then it asks for **keywords** and optionally **reply templates**. No editing config objects — everything happens through prompt dialogs.

### 5. Watch it run

A **floating HUD** appears in the bottom-right corner of the page showing live stats:

```
┌──────────────────────────────┐
│  🌊 Natural Flow   Phase 1/4│
│  ████████░░░░░░░░ (53%)     │
│                              │
│  ❤️ Liked       8            │
│  💬 Replied     2            │
│  🔄 Retweeted   1            │
│  🔖 Bookmarked  2            │
│  ➕ Followed    1            │
│  ⏭️ Skipped     12           │
│                              │
│  ❤️ @crypto_alice: Bitcoin...│
│                              │
│  [⏸ Pause]    [⏹ Stop]      │
└──────────────────────────────┘
```

Plus console output with phase progress:

```
📱 PHASE 1 — Scrolling home timeline...
   Keywords: crypto, bitcoin, web3
   📜 Scroll 1/15 — 3 liked (20%), 5 skipped
   📜 Scroll 2/15 — 6 liked (40%), 9 skipped
   ✅ Timeline: 15 liked, 3 replied, 1 RT, 2 saved
```

### 6. Session summary + export

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🌊 NATURAL FLOW — SESSION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ❤️  Liked:       12
  💬  Replied:     2
  🔄  Retweeted:   1
  🔖  Bookmarked:  3
  ➕  Followed:    3
  📜  Scrolls:     15
  ⏭️  Skipped:     18
  ⏱️  Duration:    4.2 min
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Engaged with 8 unique accounts
📥 Session log exported.
```

A JSON log file auto-downloads with every action timestamped.

---

## ⚙️ Configuration Reference

All settings are configured through the **interactive setup prompt** — no editing config objects. Here's what each preset gives you:

### Presets

| Preset | Likes | Replies | Follows | Retweets | Bookmarks | Like % |
|--------|-------|---------|---------|----------|-----------|--------|
| 👀 Lurker | 8 | 0 | 0 | 0 | 2 | 40% |
| 🤝 Friendly | 15 | 3 | 2 | 1 | 3 | 60% |
| 🚀 Growth | 25 | 5 | 4 | 3 | 5 | 75% |
| ⚙️ Custom | you choose | you choose | you choose | you choose | 3 | 60% |

### Keywords

Prompted during setup. Comma-separated list. Empty = engage with everything (not recommended).

### Timeline

| Option | Default | Description |
|--------|---------|-------------|
| `scrolls` | 15 | Number of scroll cycles |
| `maxLikes` | per preset | Hard cap on likes per session |
| `likeChance` | per preset | Probability of liking a keyword match (0-1) |
| `minEngagement` | 2 | Skip posts with fewer than N total engagements |

### Replies

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | per preset | Toggle replies on/off |
| `max` | per preset | Hard cap on replies per session |
| `chance` | 0.2 | Probability of replying to a liked post |
| `templates` | 8 built-in | Array of reply strings — **prompted during setup** |

Replies are **context-aware**: the script picks templates that match the tweet's tone (e.g., "Great breakdown" for threads, "The data speaks for itself" for stats-heavy posts).

### Retweets

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | per preset | Toggle retweets on/off |
| `max` | per preset | Hard cap on retweets per session |
| `chance` | 0.1 | Probability of retweeting a liked post |

Retweets only trigger on posts with **10+ engagements** — prevents retweeting low-quality content.

### Bookmarks

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | per preset | Toggle bookmarks on/off |
| `max` | per preset | Hard cap on bookmarks per session |
| `chance` | 0.15 | Probability of bookmarking a liked post |

### Follows

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | per preset | Toggle follows on/off |
| `max` | per preset | Hard cap on follows per session |
| `chance` | 0.25 | Probability of following a liked post's author |

### Timing

| Delay | Range | Purpose |
|-------|-------|---------|
| `betweenActions` | 3-7s | Pause between likes/follows |
| `betweenPhases` | 8-15s | Pause when switching pages |
| `readingPause` | 2-6s | Simulate reading before liking |
| `scrollPause` | 1.5-3s | Pause after each scroll |
| `replyTyping` | 3-6s | Simulate typing a reply |

All delays are subject to **cooldown escalation** — they increase by ~3% per action taken. By the end of a session, delays are noticeably longer than at the start, mimicking a real person slowing down.

---

## 🔄 Multi-Page Resume (Live Mode)

In live mode (`dryRun: false`), navigating to your profile/notifications kills the script context. The script uses `sessionStorage` to track progress:

1. **Phase 1 completes** → saves state → navigates to your profile
2. **You re-paste the script** → it detects Phase 2, scrolls your profile
3. **Phase 2 completes** → saves state → navigates to notifications
4. **You re-paste the script** → it detects Phase 3, reads notifications
5. **Phase 3 completes** → navigates home → you re-paste for Phase 4

Each paste picks up exactly where you left off. Stats accumulate across phases.

**Reset:** `sessionStorage.removeItem('xactions_natural_flow')`

---

## 🛡️ Safety Features

- **Floating HUD** — on-page overlay with ⏸ Pause and ⏹ Stop buttons (no console needed)
- **Rate limit detection** — auto-pauses 120s if X shows rate limit warnings
- **Duplicate prevention** — never engages with the same tweet twice (per session)
- **Skip filters** — auto-skips promoted content, ads, giveaways, sponsors
- **Engagement scoring** — skips very low-engagement posts (configurable threshold)
- **Cooldown escalation** — delays increase ~3% per action so the session naturally slows
- **Session history** — warns you if you ran less than 2 hours ago (uses localStorage)
- **Probability-based** — not every match gets liked; randomness is built in
- **Abort anytime** — `XActions.stop()` in console, or click 🛑 on the HUD
- **Pause/resume** — `XActions.pause()` in console, or click ⏸ on the HUD
- **Session log export** — JSON file auto-downloads with every action timestamped
- **Dry run mode** — preset 5 previews the entire session without clicking anything

---

## 📁 Related Scripts

| Script | Purpose |
|--------|---------|
| `scripts/keywordLiker.js` | Like-only with keyword prompt input |
| `scripts/multiAccountTimelineLiker.js` | Like timelines of multiple accounts |
| `scripts/autoEngage.js` | Simple auto-like/bookmark |
| `browser/engagementBooster.js` | Production-grade engagement with reply templates |

---

## 💡 Tips

1. **Start with Dry Run** — always use preset 5 first to see what would happen.
2. **Customize reply templates** — generic replies get flagged. Write 10+ that sound like you.
3. **Rotate keywords** — don't use the same keywords every session.
4. **Vary session length** — sometimes do 5 likes, sometimes 20. Use different presets.
5. **Manual first** — browse manually for 5 min before running the script.
6. **Review the log** — check the exported JSON to see what was engaged with.
7. **Use the HUD** — pause the session if someone messages you, resume after.
8. **Session history** — the script remembers past sessions in localStorage. If it warns you about running too soon, listen to it.
9. **Clear state** — `sessionStorage.removeItem('xactions_natural_flow')` to reset a stuck session.
10. **Clear history** — `localStorage.removeItem('xactions_nf_history')` to reset session history.
