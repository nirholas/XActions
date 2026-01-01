# Profile Scraping

Scrape complete profile information from any X/Twitter user.

## What You Get

- Name, username, bio
- Follower/following counts
- Location, website, join date
- Verified status, protected status
- Avatar and header images

---

## Example 1: Browser Console (Quick)

**Best for:** Quick one-off lookups, no setup required

```javascript
// ============================================
// XActions - Profile Scraper (Browser Console)
// Go to any profile page, open console (F12), paste this
// ============================================

(() => {
  // Helper to safely get text content
  const getText = (selector) => {
    const el = document.querySelector(selector);
    return el ? el.textContent.trim() : null;
  };

  // Helper to get attribute
  const getAttr = (selector, attr) => {
    const el = document.querySelector(selector);
    return el ? el.getAttribute(attr) : null;
  };

  // Extract profile data
  const profile = {
    // Basic info
    name: (() => {
      const nameEl = document.querySelector('[data-testid="UserName"]');
      return nameEl ? nameEl.textContent.split('@')[0].trim() : null;
    })(),
    
    username: window.location.pathname.slice(1).split('/')[0],
    
    bio: getText('[data-testid="UserDescription"]'),
    
    // Location and links
    location: getText('[data-testid="UserLocation"]'),
    website: getAttr('[data-testid="UserUrl"] a', 'href'),
    
    // Dates
    joined: getText('[data-testid="UserJoinDate"]'),
    birthday: getText('[data-testid="UserBirthday"]'),
    
    // Stats
    following: (() => {
      const el = document.querySelector('a[href$="/following"] span span');
      return el ? el.textContent : null;
    })(),
    
    followers: (() => {
      const el = document.querySelector('a[href$="/verified_followers"] span span, a[href$="/followers"] span span');
      return el ? el.textContent : null;
    })(),
    
    // Status flags
    verified: !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Verified"]'),
    protected: !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Protected"]'),
    
    // Images
    avatar: document.querySelector('[data-testid*="UserAvatar"] img')?.src || null,
    
    // Metadata
    scrapedAt: new Date().toISOString(),
    profileUrl: window.location.href,
  };

  // Display results
  console.log('📊 Profile Data:');
  console.table(profile);
  
  // Copy to clipboard
  const json = JSON.stringify(profile, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    console.log('✅ Copied to clipboard!');
  });
  
  // Also return for further use
  return profile;
})();
```

**Output:**
```json
{
  "name": "Elon Musk",
  "username": "elonmusk",
  "bio": "Mars & Cars, Chips & Dips",
  "location": "𝕏",
  "website": "https://x.com",
  "joined": "Joined June 2009",
  "following": "1,234",
  "followers": "200.5M",
  "verified": true,
  "protected": false,
  "scrapedAt": "2026-01-01T12:00:00.000Z"
}
```

---

## Example 2: Node.js with Puppeteer (Robust)

**Best for:** Automation, batch processing, scheduled jobs

```javascript
// ============================================
// XActions - Profile Scraper (Node.js)
// Save as: scrape-profile.js
// Run: node scrape-profile.js elonmusk
// ============================================

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Scrape a Twitter/X profile
 * @param {string} username - Twitter username (without @)
 * @param {Object} options - Configuration options
 * @returns {Object} Profile data
 */
async function scrapeProfile(username, options = {}) {
  const {
    headless = true,
    authToken = null, // Optional: for private profiles you follow
    timeout = 30000,
  } = options;

  console.log(`🔍 Scraping profile: @${username}`);

  // Launch browser
  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Set realistic viewport and user agent
    await page.setViewport({ 
      width: 1280 + Math.floor(Math.random() * 100), 
      height: 800 + Math.floor(Math.random() * 100),
    });
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Optional: Set auth cookie for logged-in view
    if (authToken) {
      await page.setCookie({
        name: 'auth_token',
        value: authToken,
        domain: '.x.com',
        path: '/',
        httpOnly: true,
        secure: true,
      });
    }

    // Navigate to profile
    await page.goto(`https://x.com/${username}`, {
      waitUntil: 'networkidle2',
      timeout,
    });

    // Wait for profile to load
    await page.waitForSelector('[data-testid="UserName"]', { timeout: 10000 });
    
    // Add a small random delay (human-like)
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

    // Extract profile data
    const profile = await page.evaluate(() => {
      const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
      const getAttr = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) || null;

      // Parse name section
      const nameSection = document.querySelector('[data-testid="UserName"]');
      const fullText = nameSection?.textContent || '';
      const usernameMatch = fullText.match(/@(\w+)/);

      // Get follower/following counts
      const followingEl = document.querySelector('a[href$="/following"] span span');
      const followersEl = document.querySelector('a[href$="/verified_followers"] span span, a[href$="/followers"] span span');

      // Get header image
      const headerEl = document.querySelector('[data-testid="UserProfileHeader_Items"]');
      const headerImg = headerEl?.closest('div')?.previousElementSibling?.querySelector('img');

      return {
        name: fullText.split('@')[0]?.trim() || null,
        username: usernameMatch?.[1] || null,
        bio: getText('[data-testid="UserDescription"]'),
        location: getText('[data-testid="UserLocation"]'),
        website: getAttr('[data-testid="UserUrl"] a', 'href'),
        joined: getText('[data-testid="UserJoinDate"]'),
        birthday: getText('[data-testid="UserBirthday"]'),
        following: followingEl?.textContent || null,
        followers: followersEl?.textContent || null,
        verified: !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Verified"]'),
        protected: !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Protected"]'),
        avatar: document.querySelector('[data-testid*="UserAvatar"] img')?.src || null,
        header: headerImg?.src || null,
      };
    });

    // Add metadata
    profile.scrapedAt = new Date().toISOString();
    profile.profileUrl = `https://x.com/${username}`;

    console.log('✅ Profile scraped successfully!');
    return profile;

  } finally {
    await browser.close();
  }
}

/**
 * Save profile to file
 */
async function saveProfile(profile, filename) {
  const json = JSON.stringify(profile, null, 2);
  await fs.writeFile(filename, json);
  console.log(`💾 Saved to ${filename}`);
}

// ============================================
// CLI Usage
// ============================================

const username = process.argv[2];

if (!username) {
  console.log(`
Usage: node scrape-profile.js <username>

Examples:
  node scrape-profile.js elonmusk
  node scrape-profile.js naval
  node scrape-profile.js pmarca
`);
  process.exit(1);
}

// Run the scraper
scrapeProfile(username)
  .then(async (profile) => {
    console.log('\n📊 Profile Data:');
    console.log(JSON.stringify(profile, null, 2));
    
    // Save to file
    await saveProfile(profile, `${username}-profile.json`);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
```

**Run it:**
```bash
node scrape-profile.js elonmusk
```

**Output file (`elonmusk-profile.json`):**
```json
{
  "name": "Elon Musk",
  "username": "elonmusk",
  "bio": "Mars & Cars, Chips & Dips",
  "location": "𝕏",
  "website": "https://x.com",
  "joined": "Joined June 2009",
  "birthday": null,
  "following": "1,234",
  "followers": "200.5M",
  "verified": true,
  "protected": false,
  "avatar": "https://pbs.twimg.com/profile_images/...",
  "header": "https://pbs.twimg.com/profile_banners/...",
  "scrapedAt": "2026-01-01T12:00:00.000Z",
  "profileUrl": "https://x.com/elonmusk"
}
```

---

## Tips

### Rate Limiting
- Add 2-5 second delays between profile scrapes
- Don't scrape hundreds of profiles in quick succession

### Authentication
For private profiles you follow, pass your `auth_token`:
```javascript
const profile = await scrapeProfile('privateuser', {
  authToken: 'your_auth_token_here'
});
```

### Error Handling
```javascript
try {
  const profile = await scrapeProfile(username);
} catch (error) {
  if (error.message.includes('timeout')) {
    console.log('Profile page took too long to load');
  } else if (error.message.includes('UserName')) {
    console.log('Profile not found or suspended');
  }
}
```

---

## Website Alternative

Don't want to code? Use [xactions.app](https://xactions.app):
1. Login with your X account
2. Enter any username
3. Click "Scrape Profile"
4. Download JSON or view in dashboard
