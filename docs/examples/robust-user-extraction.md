# 🎯 Robust User Extraction from Twitter DOM

How to reliably extract user information from X/Twitter's UserCell elements using a cascading fallback strategy.

**Author:** nich ([@nichxbt](https://x.com/nichxbt))

---

## 📋 What It Does

1. **Extracts rich user data** — Username, display name, bio, follower count, and status flags (verified, protected, follows you) from any `[data-testid="UserCell"]` element
2. **Uses 4-strategy cascading fallback** — Bio extraction tries multiple DOM strategies in priority order, so scripts keep working when X/Twitter changes their markup
3. **Includes extraction metadata** — The `_meta` field tells you which strategy was used, making it easy to debug when selectors break

**Use cases:**
- Building follower/following scraping scripts
- Filtering users by bio keywords (keyword follow, block bots)
- Auditing your audience composition
- Any automation that needs to read user data from a list page

---

## 🔧 Using the Core Module

The canonical extraction function lives in `src/automation/core.js`. Load it first, then use `extractUserFromCell` on any page that renders UserCell elements.

**Steps:**
1. Go to any X/Twitter page with user lists (e.g. `x.com/YOUR_USERNAME/following`)
2. Open browser console (F12 → Console tab)
3. Paste the contents of `src/automation/core.js`
4. Run the extraction code below

```javascript
// ============================================
// XActions - Robust User Extraction (Core Module)
// Author: nich (@nichxbt)
// Prerequisite: paste src/automation/core.js first
// ============================================

(() => {
  const { extractUserFromCell, SELECTORS } = window.XActions.Core;

  // Get all user cells currently rendered on the page
  const cells = document.querySelectorAll(SELECTORS.userCell);
  console.log(`📋 Found ${cells.length} UserCell elements`);

  // Extract user info from each cell
  const users = Array.from(cells).map(extractUserFromCell).filter(Boolean);
  console.log(`✅ Successfully extracted ${users.length} users`);

  // Display results
  users.forEach(user => {
    console.log(`@${user.username} — ${user.bio.substring(0, 60)}${user.bio.length > 60 ? '...' : ''}`);
    console.log(`  Display name: ${user.displayName}`);
    console.log(`  Followers: ${user.followers}`);
    console.log(`  Follows you: ${user.followsYou}`);
    console.log(`  Verified: ${user.isVerified}`);
    console.log(`  Bio strategy: ${user._meta.bioStrategy}`);
    console.log('');
  });

  // Copy to clipboard as JSON
  const json = JSON.stringify(users, null, 2);
  copy(json);
  console.log('📋 Copied full results to clipboard as JSON');
})();
```

### Return Value Shape

Each extracted user object looks like this:

```javascript
{
  username: "nichxbt",          // handle (lowercase, no @)
  displayName: "nich",          // display name
  bio: "Building XActions...",  // bio text (may be empty)
  followers: 12500,             // parsed follower count (number)
  isFollowing: true,            // you follow this user
  followsYou: true,             // this user follows you
  isVerified: false,            // has verified badge
  isProtected: false,           // has protected/locked account
  _meta: {
    bioStrategy: "testid",      // which strategy found the bio
    nameStrategy: "testid"      // which strategy found the name
  }
}
```

---

## 🌐 Standalone Version (No Core Dependency)

If you don't want to load the full core module, here's a self-contained extraction script you can paste directly into the browser console.

```javascript
// ============================================
// XActions - Standalone User Extraction
// Author: nich (@nichxbt)
// Go to: x.com/YOUR_USERNAME/following (or /followers)
// Open console (F12), paste this
// ============================================

(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Bio extraction with 4-strategy fallback chain
  // (Standalone copy of the logic in src/automation/core.js)
  const extractBio = (cell, displayName) => {
    // Strategy 1: data-testid="UserDescription" (most reliable)
    const testId = cell.querySelector('[data-testid="UserDescription"]');
    if (testId?.textContent?.trim()) return { bio: testId.textContent.trim(), strategy: 'testid' };

    // Strategy 2: dir="auto" excluding testid elements
    const autoDir = cell.querySelector('[dir="auto"]:not([data-testid])');
    if (autoDir?.textContent?.trim()?.length >= 10) {
      const text = autoDir.textContent.trim();
      if (!text.startsWith('@') && text !== displayName) {
        return { bio: text, strategy: 'dir-auto' };
      }
    }

    // Strategy 3: dir="auto" excluding role attributes
    const candidates = cell.querySelectorAll('[dir="auto"]:not([role])');
    for (const el of candidates) {
      if (el.closest('a')) continue;
      const text = el.textContent.trim();
      if (text && !text.startsWith('@') && text.length >= 10 && text !== displayName) {
        return { bio: text, strategy: 'dir-no-role' };
      }
    }

    // Strategy 4: span scan (last resort)
    const spans = cell.querySelectorAll('span');
    for (const span of spans) {
      if (span.closest('a')) continue;
      const text = span.textContent.trim();
      if (text.startsWith('@') || text.length < 15) continue;
      if (text === displayName) continue;
      if (/^\d[\d,.]*[KMB]?\s*(followers?|following)/i.test(text)) continue;
      return { bio: text, strategy: 'span-scan' };
    }

    return { bio: '', strategy: 'none' };
  };

  // Parse follower counts like "12.5K" → 12500
  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '');
    const num = parseFloat(str);
    if (str.endsWith('K')) return Math.round(num * 1000);
    if (str.endsWith('M')) return Math.round(num * 1000000);
    if (str.endsWith('B')) return Math.round(num * 1000000000);
    return Math.round(num) || 0;
  };

  // Extract all data from a single UserCell
  const extractUser = (cell) => {
    if (!cell) return null;
    try {
      // Username from first link href
      let username = '';
      const link = cell.querySelector('a[href^="/"]');
      if (link) {
        const match = link.getAttribute('href').match(/^\/([^/]+)$/);
        if (match) username = match[1].toLowerCase();
      }
      if (!username) return null;

      // Display name
      let displayName = '';
      const nameEl = cell.querySelector('[data-testid="User-Name"]');
      if (nameEl) {
        for (const span of nameEl.querySelectorAll('span')) {
          const text = span.textContent.trim();
          if (text && !text.startsWith('@') && text.length > 0) {
            displayName = text;
            break;
          }
        }
      }
      if (!displayName) displayName = username;

      // Bio (4-strategy fallback)
      const { bio, strategy: bioStrategy } = extractBio(cell, displayName);

      // Follower count
      let followers = 0;
      const followerMatch = (cell.textContent || '').match(/(\d[\d,]*\.?\d*[KMB]?)\s*Follower/i);
      if (followerMatch) followers = parseCount(followerMatch[1]);

      // Status flags
      const isFollowing = !!cell.querySelector('[data-testid$="-unfollow"]');
      const followsYou = !!cell.querySelector('[data-testid="userFollowIndicator"]');
      const isVerified = !!cell.querySelector('[data-testid="icon-verified"]') ||
                         !!cell.querySelector('svg[aria-label*="Verified"]');

      return { username, displayName, bio, followers, isFollowing, followsYou, isVerified, _meta: { bioStrategy } };
    } catch (e) {
      console.error(`❌ Extraction error: ${e.message}`);
      return null;
    }
  };

  // --- Main ---
  console.log('🎯 XActions - Standalone User Extraction');
  console.log('=========================================');

  const cells = document.querySelectorAll('[data-testid="UserCell"]');
  const users = Array.from(cells).map(extractUser).filter(Boolean);

  console.log(`✅ Extracted ${users.length} users from ${cells.length} cells\n`);

  // Summary table
  const strategyCount = {};
  users.forEach(u => {
    const s = u._meta.bioStrategy;
    strategyCount[s] = (strategyCount[s] || 0) + 1;
  });
  console.log('📊 Bio extraction strategies used:');
  Object.entries(strategyCount).forEach(([s, n]) => console.log(`   ${s}: ${n}`));
  console.log('');

  // Print each user
  users.forEach(u => {
    console.log(`@${u.username} (${u.displayName}) — ${u.bio.substring(0, 60)}${u.bio.length > 60 ? '...' : ''}`);
  });

  // Copy to clipboard
  try {
    copy(JSON.stringify(users, null, 2));
    console.log('\n📋 Results copied to clipboard!');
  } catch {
    console.log('\n💡 Tip: run copy(JSON.stringify(users)) to copy results');
  }
})();
```

---

## 🧪 Testing Your Extraction

Follow these steps to verify extraction is working on your account:

### Quick Test (Core Module)

```
1. Go to x.com/YOUR_USERNAME/following
2. Open console (F12 → Console tab)
3. Paste the contents of src/automation/core.js → you should see "✅ XActions Core loaded!"
4. Run:
```

```javascript
const cells = document.querySelectorAll(window.XActions.Core.SELECTORS.userCell);
const sample = window.XActions.Core.extractUserFromCell(cells[0]);
console.log(JSON.stringify(sample, null, 2));
```

**What to check:**
- `username` should be a valid handle (lowercase, no `@`)
- `displayName` should match what you see on the page
- `bio` should contain actual bio text (not empty, not a username)
- `_meta.bioStrategy` should be `"testid"` for most cells — if you see `"fallback"` frequently, Twitter may have changed their DOM

### Quick Test (Standalone)

```
1. Go to x.com/YOUR_USERNAME/followers
2. Paste the standalone script above
3. Check console output for strategy breakdown
4. If most bios show strategy "none", selectors may need updating
```

---

## 📊 Strategy Reference Table

The bio extraction uses a cascading fallback — it tries each strategy in order and stops at the first successful match.

| Priority | Strategy | Selector | When It Works |
|----------|----------|----------|---------------|
| 1 | `testid` | `[data-testid="UserDescription"]` | Standard UserCell rendering (most common) |
| 2 | `dir-auto` | `[dir="auto"]:not([data-testid])` | Variant DOM without testids |
| 3 | `dir-no-role` | `[dir="auto"]:not([role])` | Further variant DOMs (skips link elements) |
| 4 | `span-scan` | All `span` elements | Last resort — major DOM changes |

**How to interpret `_meta.bioStrategy`:**

- **`testid`** — Everything is normal, Twitter's standard test IDs are present
- **`dir-auto`** or **`dir-no-role`** — Variant rendering detected, but extraction succeeded
- **`span-scan`** — Fallback mode; extraction worked but DOM has changed significantly
- **`none`** — No bio found (user may genuinely have no bio, or all strategies failed)

---

## ⚠️ Notes

- Always load `core.js` before other automation scripts — it sets up `window.XActions.Core` which other modules depend on
- The `_meta` field is for debugging only — if you see `"fallback"` or `"span-scan"` frequently, Twitter may have changed their DOM and selectors may need updating
- Test with small samples first before running on large lists
- Results may vary across different X/Twitter page types (following, followers, search results, list members)
- The standalone version is a snapshot of the core logic — for the latest strategies, always prefer loading `core.js` directly
- Scroll the page to load more UserCells before extraction — only visible/rendered cells can be extracted
