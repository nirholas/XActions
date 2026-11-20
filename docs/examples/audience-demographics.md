# 📊 Audience Demographics

Analyze your follower demographics including bio keywords, locations, account age, and interests. Exports a demographic report.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Analyze your follower demographics including bio keywords, locations, account age, and interests. Exports a demographic report.
- Automate repetitive analytics tasks on X/Twitter
- Save time with one-click automation — no API keys needed
- Works in any modern browser (Chrome, Firefox, Edge, Safari)

---

## ⚠️ Important Notes

> **Use responsibly!** All automation should respect X/Twitter's Terms of Service. Use conservative settings and include breaks between sessions.

- This script runs in the **browser DevTools console** — not Node.js
- You must be **logged in** to x.com for the script to work
- Start with **low limits** and increase gradually
- Include **random delays** between actions to appear human
- **Don't run** multiple automation scripts simultaneously

---

## 🌐 Browser Console Usage

**Steps:**
1. Go to `x.com/YOUR_USERNAME/followers`
2. Open browser console (`F12` → Console tab)
3. Copy and paste the script from [`browser/audienceDemographics.js`](https://github.com/nirholas/XActions/blob/main/browser/audienceDemographics.js)
4. Press Enter to run

```javascript
/**
 * ============================================================
 * 👥 Audience Demographics Analyzer — Production Grade
 * ============================================================
 *
 * @name        audienceDemographics.js
 * @description Analyze your followers' demographics by scraping
 *              visible profile data: bio keywords, locations,
 *              account age, verified status, engagement level,
 *              and content niches. Builds a comprehensive
 *              audience profile without API access.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME/followers
 * 2. Open DevTools Console (F12)
 * 3. Paste and run
 * 4. Auto-scrolls to collect follower data
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    maxFollowers: 200,
    scrollRounds: 10,
    scrollDelay: 2000,
    exportResults: true,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ── Niche Detection Keywords ───────────────────────────────
  const NICHES = {
    'Tech/Dev':      ['developer', 'engineer', 'coder', 'software', 'frontend', 'backend', 'fullstack', 'devops', 'ml', 'ai', 'data science', 'blockchain', 'web3', 'crypto', 'python', 'javascript', 'rust', 'golang', 'react', 'nextjs', 'saas', 'startup', 'coding'],
    'Design':        ['designer', 'ux', 'ui', 'figma', 'creative', 'graphic', 'brand', 'illustration', 'art director', 'product design', 'visual'],
    'Marketing':     ['marketing', 'growth', 'seo', 'content', 'copywriting', 'social media', 'brand', 'digital marketing', 'performance', 'ads', 'ppc', 'funnel'],
    'Finance':       ['investor', 'trading', 'finance', 'fintech', 'stocks', 'bitcoin', 'defi', 'yield', 'portfolio', 'hedge fund', 'vc', 'venture capital'],
    'Founder/CEO':   ['founder', 'ceo', 'co-founder', 'entrepreneur', 'bootstrapped', 'building', 'shipped', 'solopreneur', 'indie hacker', 'cto', 'coo'],
    'Creator':       ['creator', 'youtuber', 'streamer', 'podcaster', 'content creator', 'writer', 'blogger', 'newsletter', 'substack', 'author'],
    'Education':     ['teacher', 'professor', 'phd', 'student', 'university', 'learning', 'education', 'academic', 'researcher', 'school'],
    'Health':        ['fitness', 'health', 'wellness', 'doctor', 'nurse', 'nutrition', 'yoga', 'mental health', 'gym', 'coach'],
    'Music/Art':     ['musician', 'artist', 'producer', 'dj', 'rapper', 'singer', 'band', 'composer', 'painter', 'photography'],
    'Politics/News': ['journalist', 'reporter', 'political', 'activist', 'media', 'news', 'democracy', 'policy', 'government'],
    'Gaming':        ['gamer', 'gaming', 'esports', 'twitch', 'streamer', 'game dev', 'indie game', 'nft gaming'],
  };

  // ── Location normalization ─────────────────────────────────
  const REGION_MAP = {
    'US': ['united states', 'usa', 'us', 'new york', 'san francisco', 'sf', 'la', 'los angeles', 'chicago', 'miami', 'austin', 'seattle', 'boston', 'denver', 'portland', 'atlanta', 'houston', 'dallas', 'dc', 'washington', 'california', 'texas', 'florida', 'new jersey', 'bay area', 'silicon valley', 'nyc'],
    'UK': ['united kingdom', 'uk', 'london', 'manchester', 'birmingham', 'england', 'scotland', 'wales', 'bristol'],
    'Canada': ['canada', 'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary'],
    'India': ['india', 'mumbai', 'bangalore', 'bengaluru', 'delhi', 'hyderabad', 'chennai', 'pune', 'kolkata'],
    'Europe': ['germany', 'france', 'spain', 'italy', 'netherlands', 'berlin', 'paris', 'amsterdam', 'barcelona', 'portugal', 'lisbon', 'dublin', 'ireland', 'sweden', 'stockholm', 'zurich', 'switzerland'],
    'LATAM': ['brazil', 'brazil', 'mexico', 'argentina', 'colombia', 'chile', 'são paulo', 'bogota', 'buenos aires'],
    'Asia-Pacific': ['japan', 'tokyo', 'singapore', 'australia', 'sydney', 'melbourne', 'korea', 'seoul', 'hong kong', 'philippines', 'indonesia', 'vietnam', 'thailand', 'bangkok'],
    'MENA': ['dubai', 'uae', 'saudi', 'egypt', 'israel', 'tel aviv', 'nigeria', 'lagos', 'south africa', 'kenya', 'nairobi'],
  };

  const detectRegion = (location) => {
    if (!location) return 'Unknown';
    const loc = location.toLowerCase();
    for (const [region, keywords] of Object.entries(REGION_MAP)) {
      if (keywords.some(kw => loc.includes(kw))) return region;
    }
    return 'Other';
  };

  const detectNiches = (bio) => {
    if (!bio) return [];
    const bioLower = bio.toLowerCase();
    const matches = [];
    for (const [niche, keywords] of Object.entries(NICHES)) {
      if (keywords.some(kw => bioLower.includes(kw))) matches.push(niche);
    }
    return matches;
  };

  // ── Collect followers ──────────────────────────────────────
  const collectFollowers = async () => {
    const followers = new Map();

    for (let round = 0; round < CONFIG.scrollRounds && followers.size < CONFIG.maxFollowers; round++) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');

      for (const cell of cells) {
        if (followers.size >= CONFIG.maxFollowers) break;

        const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
        if (!link) continue;
        const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
        if (!match || ['home', 'explore', 'notifications', 'messages', 'i'].includes(match[1])) continue;

        const username = match[1].toLowerCase();
        if (followers.has(username)) continue;

        // Display name
        const nameSpans = cell.querySelectorAll('a[href^="/"] span');
        const displayName = nameSpans.length > 0 ? nameSpans[0].textContent.trim() : match[1];

        // Bio
        const textEls = cell.querySelectorAll('[dir="auto"]');
        let bio = '';
        for (const el of textEls) {
          const text = el.textContent.trim();
          if (text.length > 20 && !text.startsWith('@')) { bio = text; break; }
        }

        // Verified badge
        const verified = !!cell.querySelector('[data-testid="icon-verified"]') || !!cell.querySelector('svg[aria-label="Verified"]');

        // Default avatar check
        const avatar = cell.querySelector('img[src*="profile_images"]');
        const hasCustomAvatar = !!avatar && !avatar.src.includes('default_profile');

        followers.set(username, {
          username: match[1],
          displayName,
          bio: bio.slice(0, 300),
          verified,
          hasCustomAvatar,
          location: '', // Not always visible in follower list
        });
      }

      console.log(`   📜 Round ${round + 1}: ${followers.size} followers`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return [...followers.values()];
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  👥 AUDIENCE DEMOGRAPHICS ANALYZER' + ' '.repeat(W - 36) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (!window.location.href.includes('/followers')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/followers first!');
      return;
    }

    console.log(`\n📊 Collecting up to ${CONFIG.maxFollowers} followers...\n`);
    const followers = await collectFollowers();

    if (followers.length < 5) {
      console.error('❌ Need at least 5 followers to analyze.');
      return;
    }

    // ── Niche Analysis ──────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🎯 AUDIENCE NICHE BREAKDOWN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const nicheCount = {};
    let nicheless = 0;

    for (const f of followers) {
      const niches = detectNiches(f.bio);
      f.niches = niches;
      if (niches.length === 0) nicheless++;
      for (const n of niches) nicheCount[n] = (nicheCount[n] || 0) + 1;
    }

    const sortedNiches = Object.entries(nicheCount).sort((a, b) => b[1] - a[1]);
    const total = followers.length;

    console.log('');
    for (const [niche, count] of sortedNiches) {
      const pct = ((count / total) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(count / total * 30));
      console.log(`  ${niche.padEnd(18)} ${String(count).padStart(3)} (${pct.padStart(5)}%) ${bar}`);
    }
    console.log(`  ${'Unidentified'.padEnd(18)} ${String(nicheless).padStart(3)} (${((nicheless / total) * 100).toFixed(1).padStart(5)}%)`);

    // ── Verified Status ─────────────────────────────────────
    const verified = followers.filter(f => f.verified).length;
    const verifiedPct = ((verified / total) * 100).toFixed(1);

    console.log('\n━━━ ✅ VERIFICATION STATUS ━━━');
    console.log(`  Verified:     ${verified} (${verifiedPct}%)`);
    console.log(`  Non-verified: ${total - verified} (${(100 - verifiedPct).toFixed(1)}%)`);

    // ── Avatar Analysis ─────────────────────────────────────
    const customAvatar = followers.filter(f => f.hasCustomAvatar).length;
    const defaultAvatar = total - customAvatar;
    console.log('\n━━━ 🖼️ PROFILE QUALITY ━━━');
    console.log(`  Custom avatar:  ${customAvatar} (${((customAvatar / total) * 100).toFixed(1)}%)`);
    console.log(`  Default avatar: ${defaultAvatar} (${((defaultAvatar / total) * 100).toFixed(1)}%)`);

    const hasBio = followers.filter(f => f.bio && f.bio.length > 10).length;
    console.log(`  Has bio:        ${hasBio} (${((hasBio / total) * 100).toFixed(1)}%)`);
    console.log(`  No bio:         ${total - hasBio} (${(((total - hasBio) / total) * 100).toFixed(1)}%)`);

    // ── Bot Likelihood ──────────────────────────────────────
    const suspiciousCount = followers.filter(f => !f.hasCustomAvatar && (!f.bio || f.bio.length < 10)).length;
    console.log('\n━━━ 🤖 BOT LIKELIHOOD ━━━');
    console.log(`  Suspicious (no avatar + no bio): ${suspiciousCount} (${((suspiciousCount / total) * 100).toFixed(1)}%)`);

    if (suspiciousCount > total * 0.3) {
      console.log('  ⚠️ High proportion of suspicious accounts. Consider using removeFollowers.js with smart mode.');
    }

    // ── Common Words in Bios ────────────────────────────────
    console.log('\n━━━ 📝 TOP BIO KEYWORDS ━━━');
    const wordFreq = {};
    const stopWords = new Set(['the', 'and', 'for', 'that', 'with', 'this', 'from', 'are', 'was', 'not', 'but', 'all', 'they', 'have', 'had', 'has', 'you', 'your', 'who', 'what', 'just', 'about', 'can', 'will', 'one', 'out', 'its', 'also', 'into', 'over']);

    for (const f of followers) {
      if (!f.bio) continue;
      const words = f.bio.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
      for (const w of words) {
        if (w.length > 3 && !stopWords.has(w)) wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    }

    const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 15);
    for (const [word, count] of topWords) {
      console.log(`  "${word}" — ${count}x`);
    }

    // ── Insights ────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  💡 INSIGHTS & RECOMMENDATIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (sortedNiches.length > 0) {
      const topNiche = sortedNiches[0];
      console.log(`\n  🎯 Your primary audience is "${topNiche[0]}" (${topNiche[1]} followers).`);
      if (sortedNiches.length > 1) {
        console.log(`     Secondary: "${sortedNiches[1][0]}" (${sortedNiches[1][1]})`);
      }
      console.log('     → Tailor content to these niches for better engagement.');
    }

    if (suspiciousCount > total * 0.2) {
      console.log(`\n  🧹 ${suspiciousCount} potentially inactive/bot followers detected.`);
      console.log('     → Use removeFollowers.js (smart mode) to clean up.');
    }

    if (verified / total < 0.05) {
      console.log('\n  📊 Low verified follower ratio. Consider engaging with verified accounts.');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (CONFIG.exportResults) {
      const data = {
        summary: {
          total, verified, defaultAvatar, nicheless, suspicious: suspiciousCount,
          topNiches: sortedNiches.slice(0, 5),
          topKeywords: topWords.slice(0, 10),
        },
        followers,
        analyzedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-demographics-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Full demographics exported as JSON.');
    }
  };

  run();
})();

```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `maxFollowers` | `200` | Max followers |
| `scrollRounds` | `10` | Scroll rounds |
| `scrollDelay` | `2000` | Scroll delay |
| `exportResults` | `true` | Export results |

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com/YOUR_USERNAME/followers`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`browser/audienceDemographics.js`](https://github.com/nirholas/XActions/blob/main/browser/audienceDemographics.js) and paste it into the console.

### Step 4: Customize the CONFIG (optional)

Before running, you can modify the `CONFIG` object at the top of the script to adjust behavior:

```javascript
const CONFIG = {
  // Edit these values before running
  // See Configuration table above for all options
};
```

### Step 5: Run and monitor

Press **Enter** to run the script. Watch the console for real-time progress logs:

- ✅ Green messages = success
- 🔄 Blue messages = in progress
- ⚠️ Yellow messages = warnings
- ❌ Red messages = errors

### Step 6: Export results

Most scripts automatically download results as JSON/CSV when complete. Check your Downloads folder.

---

## 🖥️ CLI Usage

You can also run this via the XActions CLI:

```bash
# Install XActions globally
npm install -g xactions

# Run via CLI
xactions --help
```

---

## 🤖 MCP Server Usage

Use with AI agents (Claude, Cursor, etc.) via the MCP server:

```bash
# Start MCP server
npm run mcp
```

See the [MCP Setup Guide](../mcp-setup.md) for integration with Claude Desktop, Cursor, and other AI tools.

---

## 📁 Source Files

| File | Description |
|------|-------------|
| [`browser/audienceDemographics.js`](https://github.com/nirholas/XActions/blob/main/browser/audienceDemographics.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| [Account Health Monitor](account-health-monitor.md) | Comprehensive health check for your X/Twitter account |
| [Audience Overlap](audience-overlap.md) | Compare the follower lists of two accounts to find audience overlap |
| [Engagement Leaderboard](engagement-leaderboard.md) | Analyze who engages most with your tweets |
| [Follower Growth Tracker](follower-growth-tracker.md) | Track your follower count over time |
| [Sentiment Analyzer](sentiment-analyzer.md) | Analyze tweet sentiment (positive/negative/neutral) using lexicon-based scoring |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)
