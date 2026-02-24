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
╔════════════════════════════════════════════════════╗
║  🌊 NATURAL FLOW — Session Setup                  ║
╚════════════════════════════════════════════════════╝

Choose a preset:
  [1] 👀 Lurker     — mostly scroll, like a few, no replies
  [2] 🤝 Friendly   — like + occasional reply, 1-2 follows
  [3] 🚀 Growth     — max engagement, replies + follows
  [4] ⚙️ Custom     — set everything manually

Enter keywords (comma-separated):
> crypto, bitcoin, web3
```

### 5. Watch it run

The console shows a **live progress bar** and real-time activity:

```
📱 PHASE 1 — Home Timeline
   ████████░░░░░░░░ 8/15 liked · 2 replied · 12 skipped
   ❤️ @crypto_alice: "Bitcoin just broke resistance at..."
   💬 @defi_bob: "Really interesting take on this"
   ⏭️ Skipped (no keyword match)
   ❤️ @web3_carol: "The future of DeFi governance..."
```

### 6. Session summary + export

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🌊 NATURAL FLOW — SESSION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ❤️  Liked:      12
  💬  Replied:    2
  ➕  Followed:   3
  📜  Scrolls:    15
  ⏱️  Duration:   4.2 min
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 Session log exported.
```

A JSON log file auto-downloads with every action timestamped.

---

## ⚙️ Configuration Reference

### Keywords

```javascript
keywords: ['crypto', 'bitcoin', 'web3']
```

Only engage with posts containing at least one keyword. Empty array = engage with everything (not recommended).

### Timeline

| Option | Default | Description |
|--------|---------|-------------|
| `scrolls` | 12 | Number of scroll cycles |
| `maxLikes` | 15 | Hard cap on likes per session |
| `likeChance` | 0.6 | Probability of liking a keyword match (0-1) |

### Replies

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | true | Toggle replies on/off |
| `max` | 3 | Hard cap on replies per session |
| `chance` | 0.15 | Probability of replying to a liked post |
| `templates` | 6 built-in | Array of reply strings — **customize these!** |

### Follows

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | true | Toggle follows on/off |
| `max` | 4 | Hard cap on follows per session |
| `chance` | 0.2 | Probability of following a liked post's author |

### Timing

| Delay | Range | Purpose |
|-------|-------|---------|
| `betweenActions` | 3-7s | Pause between likes/follows |
| `betweenPhases` | 8-15s | Pause when switching pages |
| `readingPause` | 2-6s | Simulate reading before liking |
| `scrollPause` | 1.5-3s | Pause after each scroll |
| `replyTyping` | 3-6s | Simulate typing a reply |

### Safety

| Option | Default | Description |
|--------|---------|-------------|
| `dryRun` | **true** | Preview mode — nothing gets clicked |
| `skipKeywords` | promoted, ad, giveaway, sponsor | Auto-skip these |

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

- **Rate limit detection** — auto-pauses 120s if X shows rate limit warnings
- **Duplicate prevention** — never engages with the same tweet twice (per session)
- **Skip filters** — auto-skips promoted content, ads, giveaways
- **Probability-based** — not every match gets liked; randomness is built in
- **Abort anytime** — `XActions.stop()` in console
- **Session log export** — JSON file auto-downloads for review

---

## 📁 Related Scripts

| Script | Purpose |
|--------|---------|
| `scripts/keywordLiker.js` | Like-only with keyword prompt input |
| `scripts/multiAccountTimelineLiker.js` | Like timelines of multiple accounts |
| `scripts/autoEngage.js` | Simple auto-like/bookmark |
| `src/engagementBooster.js` | Production-grade engagement with reply templates |

---

## 💡 Tips

1. **Customize reply templates** — generic replies get flagged. Write 10+ that sound like you.
2. **Rotate keywords** — don't use the same keywords every session.
3. **Vary session length** — sometimes do 5 likes, sometimes 20.
4. **Manual first** — browse manually for 5 min before running the script.
5. **Review the log** — check the exported JSON to see what was engaged with.
