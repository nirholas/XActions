#!/usr/bin/env node
/**
 * XActions Local Tools (Puppeteer-based)
 * Free mode - runs browser automation locally
 * 
 * Extracted from original server.js for modular architecture
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

// Browser instance (reused across calls)
let browser = null;
let page = null;

/**
 * Initialize browser with stealth mode
 */
async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }
  return { browser, page };
}

/**
 * Human-like delay
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () => sleep(1000 + Math.random() * 2000);

/**
 * Close browser (for cleanup)
 */
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
}

/**
 * Login to X/Twitter using session cookie
 */
export async function x_login({ cookie }) {
  const { page } = await initBrowser();
  await page.setCookie({
    name: 'auth_token',
    value: cookie,
    domain: '.x.com',
    path: '/',
    httpOnly: true,
    secure: true,
  });
  await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
  return { success: true, message: 'Logged in with session cookie' };
}

/**
 * Get user profile information
 */
export async function x_get_profile({ username }) {
  const { page } = await initBrowser();
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await randomDelay();

  return await page.evaluate(() => {
    const nameEl = document.querySelector('[data-testid="UserName"]');
    const bioEl = document.querySelector('[data-testid="UserDescription"]');
    const locationEl = document.querySelector('[data-testid="UserLocation"]');
    const websiteEl = document.querySelector('[data-testid="UserUrl"] a');
    const joinedEl = document.querySelector('[data-testid="UserJoinDate"]');
    
    const followingEl = document.querySelector('a[href$="/following"] span');
    const followersEl = document.querySelector('a[href$="/verified_followers"] span, a[href$="/followers"] span');

    return {
      name: nameEl?.textContent?.split('@')[0]?.trim() || null,
      username: nameEl?.textContent?.match(/@(\w+)/)?.[1] || null,
      bio: bioEl?.textContent || null,
      location: locationEl?.textContent || null,
      website: websiteEl?.href || null,
      joined: joinedEl?.textContent || null,
      following: followingEl?.textContent || null,
      followers: followersEl?.textContent || null,
    };
  });
}

/**
 * Scrape followers for a user
 */
export async function x_get_followers({ username, limit = 100 }) {
  const { page } = await initBrowser();
  await page.goto(`https://x.com/${username}/followers`, { waitUntil: 'networkidle2' });
  await randomDelay();

  const followers = new Set();
  let retries = 0;

  while (followers.size < limit && retries < 10) {
    const users = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      return Array.from(cells).map((cell) => {
        const link = cell.querySelector('a[href^="/"]');
        const nameEl = cell.querySelector('[dir="ltr"] > span');
        const bioEl = cell.querySelector('[data-testid="UserDescription"]');
        return {
          username: link?.href?.split('/')[3] || null,
          name: nameEl?.textContent || null,
          bio: bioEl?.textContent || null,
        };
      }).filter(u => u.username);
    });

    const prevSize = followers.size;
    users.forEach((u) => followers.add(JSON.stringify(u)));
    
    if (followers.size === prevSize) retries++;
    else retries = 0;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay();
  }

  return Array.from(followers).map((s) => JSON.parse(s)).slice(0, limit);
}

/**
 * Scrape following for a user
 */
export async function x_get_following({ username, limit = 100 }) {
  const { page } = await initBrowser();
  await page.goto(`https://x.com/${username}/following`, { waitUntil: 'networkidle2' });
  await randomDelay();

  const following = new Set();
  let retries = 0;

  while (following.size < limit && retries < 10) {
    const users = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      return Array.from(cells).map((cell) => {
        const link = cell.querySelector('a[href^="/"]');
        const nameEl = cell.querySelector('[dir="ltr"] > span');
        const followsBack = cell.querySelector('[data-testid="userFollowIndicator"]');
        return {
          username: link?.href?.split('/')[3] || null,
          name: nameEl?.textContent || null,
          followsBack: !!followsBack,
        };
      }).filter(u => u.username);
    });

    const prevSize = following.size;
    users.forEach((u) => following.add(JSON.stringify(u)));
    
    if (following.size === prevSize) retries++;
    else retries = 0;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay();
  }

  return Array.from(following).map((s) => JSON.parse(s)).slice(0, limit);
}

/**
 * Get non-followers (people you follow who don't follow back)
 */
export async function x_get_non_followers({ username }) {
  const following = await x_get_following({ username, limit: 500 });
  const nonFollowers = following.filter(u => !u.followsBack);
  return {
    total: following.length,
    nonFollowers: nonFollowers.map(u => u.username),
    count: nonFollowers.length,
  };
}

/**
 * Scrape tweets from a user's profile
 */
export async function x_get_tweets({ username, limit = 50 }) {
  const { page } = await initBrowser();
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await randomDelay();

  const tweets = new Set();
  let retries = 0;

  while (tweets.size < limit && retries < 10) {
    const tweetData = await page.evaluate(() => {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      return Array.from(articles).map((article) => {
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const timeEl = article.querySelector('time');
        const likesEl = article.querySelector('[data-testid="like"] span');
        const retweetsEl = article.querySelector('[data-testid="retweet"] span');
        const repliesEl = article.querySelector('[data-testid="reply"] span');
        const linkEl = article.querySelector('a[href*="/status/"]');
        
        return {
          text: textEl?.textContent || null,
          timestamp: timeEl?.getAttribute('datetime') || null,
          likes: likesEl?.textContent || '0',
          retweets: retweetsEl?.textContent || '0',
          replies: repliesEl?.textContent || '0',
          url: linkEl?.href || null,
        };
      }).filter(t => t.text);
    });

    const prevSize = tweets.size;
    tweetData.forEach((t) => tweets.add(JSON.stringify(t)));
    
    if (tweets.size === prevSize) retries++;
    else retries = 0;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay();
  }

  return Array.from(tweets).map((s) => JSON.parse(s)).slice(0, limit);
}

/**
 * Search tweets by keyword
 */
export async function x_search_tweets({ query, limit = 50 }) {
  const { page } = await initBrowser();
  const encodedQuery = encodeURIComponent(query);
  await page.goto(`https://x.com/search?q=${encodedQuery}&src=typed_query&f=live`, {
    waitUntil: 'networkidle2',
  });
  await randomDelay();

  const tweets = new Set();
  let retries = 0;

  while (tweets.size < limit && retries < 10) {
    const tweetData = await page.evaluate(() => {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      return Array.from(articles).map((article) => {
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const authorEl = article.querySelector('[data-testid="User-Name"] a');
        const timeEl = article.querySelector('time');
        const linkEl = article.querySelector('a[href*="/status/"]');
        
        return {
          text: textEl?.textContent || null,
          author: authorEl?.href?.split('/')[3] || null,
          timestamp: timeEl?.getAttribute('datetime') || null,
          url: linkEl?.href || null,
        };
      }).filter(t => t.text);
    });

    const prevSize = tweets.size;
    tweetData.forEach((t) => tweets.add(JSON.stringify(t)));
    
    if (tweets.size === prevSize) retries++;
    else retries = 0;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay();
  }

  return Array.from(tweets).map((s) => JSON.parse(s)).slice(0, limit);
}

/**
 * Follow a user
 */
export async function x_follow({ username }) {
  const { page } = await initBrowser();
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await randomDelay();

  const followBtn = await page.$('[data-testid$="-follow"]');
  if (followBtn) {
    await followBtn.click();
    await randomDelay();
    return { success: true, message: `Followed @${username}` };
  }
  
  return { success: false, message: `Could not follow @${username}` };
}

/**
 * Unfollow a user
 */
export async function x_unfollow({ username }) {
  const { page } = await initBrowser();
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await randomDelay();

  // Click the Following button
  const followingBtn = await page.$('[data-testid$="-unfollow"]');
  if (followingBtn) {
    await followingBtn.click();
    await sleep(500);
    
    // Confirm unfollow
    const confirmBtn = await page.$('[data-testid="confirmationSheetConfirm"]');
    if (confirmBtn) {
      await confirmBtn.click();
      await randomDelay();
      return { success: true, message: `Unfollowed @${username}` };
    }
  }
  
  return { success: false, message: `Could not unfollow @${username}` };
}

/**
 * Post a tweet
 */
export async function x_post_tweet({ text }) {
  const { page } = await initBrowser();
  await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
  await randomDelay();

  // Type the tweet
  const textbox = await page.$('[data-testid="tweetTextarea_0"]');
  if (textbox) {
    await textbox.type(text, { delay: 50 });
    await sleep(500);
    
    // Click post
    const postBtn = await page.$('[data-testid="tweetButton"]');
    if (postBtn) {
      await postBtn.click();
      await randomDelay();
      return { success: true, message: 'Tweet posted successfully' };
    }
  }
  
  return { success: false, message: 'Could not post tweet' };
}

/**
 * Like a tweet by URL
 */
export async function x_like({ url }) {
  const { page } = await initBrowser();
  await page.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay();

  const likeBtn = await page.$('[data-testid="like"]');
  if (likeBtn) {
    await likeBtn.click();
    await randomDelay();
    return { success: true, message: 'Tweet liked' };
  }
  
  return { success: false, message: 'Could not like tweet' };
}

/**
 * Retweet a tweet by URL
 */
export async function x_retweet({ url }) {
  const { page } = await initBrowser();
  await page.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay();

  const rtBtn = await page.$('[data-testid="retweet"]');
  if (rtBtn) {
    await rtBtn.click();
    await sleep(500);
    
    const confirmRt = await page.$('[data-testid="retweetConfirm"]');
    if (confirmRt) {
      await confirmRt.click();
      await randomDelay();
      return { success: true, message: 'Retweeted' };
    }
  }
  
  return { success: false, message: 'Could not retweet' };
}

/**
 * Unfollow non-followers (bulk operation)
 */
export async function x_unfollow_non_followers({ username, maxUnfollows = 100, dryRun = false }) {
  const nonFollowersResult = await x_get_non_followers({ username });
  const toUnfollow = nonFollowersResult.nonFollowers.slice(0, maxUnfollows);
  
  if (dryRun) {
    return {
      dryRun: true,
      wouldUnfollow: toUnfollow,
      count: toUnfollow.length,
    };
  }
  
  const results = [];
  for (const user of toUnfollow) {
    const result = await x_unfollow({ username: user });
    results.push({ username: user, ...result });
    await sleep(2000); // Rate limiting
  }
  
  return {
    unfollowed: results.filter(r => r.success).map(r => r.username),
    failed: results.filter(r => !r.success).map(r => r.username),
    count: results.filter(r => r.success).length,
  };
}

/**
 * Detect unfollowers (requires previous snapshot)
 */
export async function x_detect_unfollowers({ username }) {
  const STORAGE_KEY = `xactions_mcp_followers_${username}`;
  const followers = await x_get_followers({ username, limit: 1000 });
  const currentFollowers = followers.map(f => f.username);
  
  // In MCP context, we'd need to persist this somehow
  // For now, return current state and let AI manage comparison
  return {
    username,
    currentFollowers,
    count: currentFollowers.length,
    timestamp: new Date().toISOString(),
    note: 'Compare with previous snapshot to detect unfollowers',
  };
}

/**
 * Download video from tweet (returns URL, actual download happens client-side)
 */
export async function x_download_video({ tweetUrl }) {
  const { page } = await initBrowser();
  await page.goto(tweetUrl, { waitUntil: 'networkidle2' });
  await randomDelay();

  // Extract video URLs from page
  const videoUrls = await page.evaluate(() => {
    const videos = [];
    const html = document.documentElement.innerHTML;
    const patterns = [
      /https:\/\/video\.twimg\.com\/[^"'\s]+\.mp4[^"'\s]*/g,
      /https:\/\/[^"'\s]*\/amplify_video[^"'\s]*\.mp4[^"'\s]*/g,
      /https:\/\/[^"'\s]*\/ext_tw_video[^"'\s]*\.mp4[^"'\s]*/g,
    ];

    patterns.forEach(pattern => {
      (html.match(pattern) || []).forEach(url => {
        let clean = url.replace(/\\u002F/g, '/').replace(/\\/g, '').split('"')[0].split("'")[0];
        if (clean.includes('.mp4')) {
          const quality = clean.match(/\/(\d+x\d+)\//)?.[1] || 'unknown';
          videos.push({ url: clean, quality });
        }
      });
    });

    // Deduplicate
    const seen = new Set();
    return videos.filter(v => {
      const key = v.url.split('?')[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  if (videoUrls.length === 0) {
    return { success: false, message: 'No video found in tweet' };
  }

  // Sort by quality (highest first)
  videoUrls.sort((a, b) => {
    const res = q => parseInt(q.match(/(\d+)x(\d+)/)?.[2] || 0);
    return res(b.quality) - res(a.quality);
  });

  return {
    success: true,
    videos: videoUrls,
    bestQuality: videoUrls[0],
    message: `Found ${videoUrls.length} video(s)`,
  };
}

// Export all tools as a map for dynamic lookup
export const toolMap = {
  x_login,
  x_get_profile,
  x_get_followers,
  x_get_following,
  x_get_non_followers,
  x_get_tweets,
  x_search_tweets,
  x_follow,
  x_unfollow,
  x_post_tweet,
  x_like,
  x_retweet,
  x_unfollow_non_followers,
  x_detect_unfollowers,
  x_download_video,
};

export default toolMap;
