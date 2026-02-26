#!/usr/bin/env node
/**
 * XActions Local Tools (Puppeteer-based)
 * Free mode — all scraping delegated to canonical scrapers (single source of truth).
 * Action tools (follow, like, post, etc.) implemented directly via Puppeteer.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import {
  createBrowser,
  createPage,
  loginWithCookie,
  scrapeProfile,
  scrapeFollowers,
  scrapeFollowing,
  scrapeTweets,
  searchTweets,
  scrapeThread,
  scrapeLikes,
  scrapeMedia,
  scrapeListMembers,
  scrapeBookmarks,
  scrapeNotifications,
  scrapeTrending,
  scrapeSpaces,
} from '../scrapers/index.js';

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// ============================================================================
// Singleton Browser Management
// ============================================================================

let browser = null;
let page = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min = 1000, max = 3000) =>
  sleep(min + Math.random() * (max - min));

/**
 * Ensure a browser/page pair is available, creating if needed.
 * Uses createBrowser/createPage from the canonical scrapers module.
 */
async function ensureBrowser() {
  if (!browser || !browser.isConnected()) {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    browser = await createBrowser();
    page = await createPage(browser);
  }
  return { browser, page };
}

/**
 * Close browser (called by server.js on SIGINT/SIGTERM)
 */
export async function closeBrowser() {
  if (browser) {
    try {
      await browser.close();
    } catch {}
    browser = null;
    page = null;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Wait for a selector and click it. Returns true if clicked.
 */
async function clickIfPresent(pg, selector, { timeout = 3000 } = {}) {
  try {
    await pg.waitForSelector(selector, { timeout });
    const el = await pg.$(selector);
    if (el) {
      await el.click();
      return true;
    }
  } catch {}
  return false;
}

/**
 * Find a menu item by text pattern and click it.
 */
async function clickMenuItemByText(pg, pattern) {
  const items = await pg.$$('[role="menuitem"]');
  for (const item of items) {
    const text = await item.evaluate((el) => el.textContent);
    if (pattern.test(text)) {
      await item.click();
      return true;
    }
  }
  return false;
}

/**
 * Scroll-and-collect pattern using a Map for dedup.
 * @param {Object} pg - Puppeteer page
 * @param {Function} extractFn - page.evaluate callback returning [{key, ...data}]
 * @param {Object} opts
 */
async function scrollCollect(pg, extractFn, { limit = 100, maxRetries = 10 } = {}) {
  const collected = new Map();
  let retries = 0;

  while (collected.size < limit && retries < maxRetries) {
    const items = await pg.evaluate(extractFn);
    const prev = collected.size;
    items.forEach((item) => {
      if (item._key) {
        collected.set(item._key, item);
      }
    });
    if (collected.size === prev) retries++;
    else retries = 0;

    await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 3000);
  }

  return Array.from(collected.values())
    .map(({ _key, ...rest }) => rest)
    .slice(0, limit);
}

// ============================================================================
// 1. Auth
// ============================================================================

export async function x_login({ cookie }) {
  const { page: pg } = await ensureBrowser();
  await loginWithCookie(pg, cookie);
  return { success: true, message: 'Logged in with session cookie' };
}

// ============================================================================
// 2–7. Scraping — delegated to ../scrapers (single source of truth)
// ============================================================================

export async function x_get_profile({ username }) {
  const { page: pg } = await ensureBrowser();
  return scrapeProfile(pg, username);
}

export async function x_get_followers({ username, limit = 100 }) {
  const { page: pg } = await ensureBrowser();
  return scrapeFollowers(pg, username, { limit });
}

export async function x_get_following({ username, limit = 100 }) {
  const { page: pg } = await ensureBrowser();
  return scrapeFollowing(pg, username, { limit });
}

export async function x_get_non_followers({ username }) {
  const { page: pg } = await ensureBrowser();
  const followers = await scrapeFollowers(pg, username, { limit: 5000 });
  const following = await scrapeFollowing(pg, username, { limit: 5000 });

  const followerSet = new Set(followers.map((f) => f.username));
  const nonFollowers = following.filter((f) => !followerSet.has(f.username));

  return {
    nonFollowers: nonFollowers.map((f) => f.username),
    count: nonFollowers.length,
    totalFollowing: following.length,
    totalFollowers: followers.length,
  };
}

export async function x_get_tweets({ username, limit = 50 }) {
  const { page: pg } = await ensureBrowser();
  return scrapeTweets(pg, username, { limit });
}

export async function x_search_tweets({ query, limit = 50 }) {
  const { page: pg } = await ensureBrowser();
  return searchTweets(pg, query, { limit });
}

// ============================================================================
// 7b. Thread / Best Time to Post
// ============================================================================

export async function x_get_thread({ url }) {
  const { page: pg } = await ensureBrowser();
  return scrapeThread(pg, url);
}

export async function x_best_time_to_post({ username, limit = 100 }) {
  const { page: pg } = await ensureBrowser();
  const tweets = await scrapeTweets(pg, username, { limit });

  if (!tweets || !tweets.length) {
    return { error: `No tweets found for @${username}` };
  }

  const hourBuckets = Array.from({ length: 24 }, () => ({ count: 0, totalEngagement: 0 }));
  const dayBuckets = Array.from({ length: 7 }, () => ({ count: 0, totalEngagement: 0 }));
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const tweet of tweets) {
    const dateStr = tweet.time || tweet.timestamp || tweet.date;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) continue;

    const hour = d.getUTCHours();
    const day = d.getUTCDay();
    const engagement = (parseInt(tweet.likes) || 0) + (parseInt(tweet.retweets) || 0) + (parseInt(tweet.replies) || 0);

    hourBuckets[hour].count++;
    hourBuckets[hour].totalEngagement += engagement;
    dayBuckets[day].count++;
    dayBuckets[day].totalEngagement += engagement;
  }

  const bestHours = hourBuckets
    .map((b, i) => ({ hour: i, ...b, avgEngagement: b.count ? (b.totalEngagement / b.count) : 0 }))
    .filter(b => b.count > 0)
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 5);

  const bestDays = dayBuckets
    .map((b, i) => ({ day: dayNames[i], ...b, avgEngagement: b.count ? (b.totalEngagement / b.count) : 0 }))
    .filter(b => b.count > 0)
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  return {
    username,
    tweetsAnalyzed: tweets.length,
    bestHoursUTC: bestHours.map(h => ({ hour: `${h.hour}:00 UTC`, posts: h.count, avgEngagement: Math.round(h.avgEngagement) })),
    bestDays: bestDays.map(d => ({ day: d.day, posts: d.count, avgEngagement: Math.round(d.avgEngagement) })),
    recommendation: bestHours.length
      ? `Post around ${bestHours[0].hour}:00 UTC on ${bestDays[0]?.day || 'any day'} for best engagement`
      : 'Not enough data to recommend',
  };
}

// ============================================================================
// 8–9. Follow / Unfollow
// ============================================================================

export async function x_follow({ username }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await randomDelay();

  // The follow button is the primary action in the placement tracking area,
  // but only if the user isn't already followed (no -unfollow testid).
  const followBtn = await pg.$('[data-testid="placementTracking"] [role="button"]:not([data-testid$="-unfollow"])');
  if (followBtn) {
    await followBtn.click();
    await randomDelay();
    return { success: true, message: `Followed @${username}` };
  }
  return { success: false, message: `Could not follow @${username}` };
}

export async function x_unfollow({ username }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await randomDelay();

  if (await clickIfPresent(pg, '[data-testid$="-unfollow"]')) {
    await sleep(500);
    await clickIfPresent(pg, '[data-testid="confirmationSheetConfirm"]');
    await randomDelay();
    return { success: true, message: `Unfollowed @${username}` };
  }
  return { success: false, message: `Could not unfollow @${username}` };
}

// ============================================================================
// 10–11. Bulk Operations
// ============================================================================

export async function x_unfollow_non_followers({ username, maxUnfollows = 100, dryRun = false }) {
  const result = await x_get_non_followers({ username });
  const toUnfollow = result.nonFollowers.slice(0, maxUnfollows);

  if (dryRun) {
    return { dryRun: true, wouldUnfollow: toUnfollow, count: toUnfollow.length };
  }

  const results = [];
  for (const user of toUnfollow) {
    const r = await x_unfollow({ username: user });
    results.push({ username: user, ...r });
    await sleep(2000); // Rate-limit protection
  }

  return {
    unfollowed: results.filter((r) => r.success).map((r) => r.username),
    failed: results.filter((r) => !r.success).map((r) => r.username),
    count: results.filter((r) => r.success).length,
  };
}

export async function x_detect_unfollowers({ username }) {
  const { page: pg } = await ensureBrowser();
  const followers = await scrapeFollowers(pg, username, { limit: 1000 });
  return {
    username,
    currentFollowers: followers.map((f) => f.username),
    count: followers.length,
    timestamp: new Date().toISOString(),
    note: 'Compare with previous snapshot to detect unfollowers',
  };
}

// ============================================================================
// 12–14. Post / Like / Retweet
// ============================================================================

export async function x_post_tweet({ text }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
  await randomDelay();

  const textbox = await pg.$('[data-testid="tweetTextarea_0"]');
  if (textbox) {
    await textbox.type(text, { delay: 50 });
    await sleep(500);
    if (await clickIfPresent(pg, '[data-testid="tweetButton"]')) {
      await randomDelay();
      return { success: true, message: 'Tweet posted successfully' };
    }
  }
  return { success: false, message: 'Could not post tweet' };
}

export async function x_like({ url }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay();

  if (await clickIfPresent(pg, '[data-testid="like"]')) {
    await randomDelay();
    return { success: true, message: 'Tweet liked' };
  }
  return { success: false, message: 'Could not like tweet' };
}

export async function x_retweet({ url }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay();

  if (await clickIfPresent(pg, '[data-testid="retweet"]')) {
    await sleep(500);
    await clickIfPresent(pg, '[data-testid="retweetConfirm"]');
    await randomDelay();
    return { success: true, message: 'Retweeted' };
  }
  return { success: false, message: 'Could not retweet' };
}

// ============================================================================
// 15. Download Video
// ============================================================================

export async function x_download_video({ tweetUrl }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto(tweetUrl, { waitUntil: 'networkidle2' });
  await randomDelay();

  const videoUrls = await pg.evaluate(() => {
    const videos = [];
    const html = document.documentElement.innerHTML;
    const patterns = [
      /https:\/\/video\.twimg\.com\/[^"'\s]+\.mp4[^"'\s]*/g,
      /https:\/\/[^"'\s]*\/amplify_video[^"'\s]*\.mp4[^"'\s]*/g,
      /https:\/\/[^"'\s]*\/ext_tw_video[^"'\s]*\.mp4[^"'\s]*/g,
    ];

    patterns.forEach((pattern) => {
      (html.match(pattern) || []).forEach((url) => {
        let clean = url
          .replace(/\\u002F/g, '/')
          .replace(/\\/g, '')
          .split('"')[0]
          .split("'")[0];
        if (clean.includes('.mp4')) {
          const quality = clean.match(/\/(\d+x\d+)\//)?.[1] || 'unknown';
          videos.push({ url: clean, quality });
        }
      });
    });

    const seen = new Set();
    return videos.filter((v) => {
      const key = v.url.split('?')[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  if (!videoUrls.length) {
    return { success: false, message: 'No video found in tweet' };
  }

  videoUrls.sort((a, b) => {
    const res = (q) => parseInt(q.match(/(\d+)x(\d+)/)?.[2] || '0');
    return res(b.quality) - res(a.quality);
  });

  return {
    success: true,
    videos: videoUrls,
    bestQuality: videoUrls[0],
    message: `Found ${videoUrls.length} video(s)`,
  };
}

// ============================================================================
// 16. Profile Management
// ============================================================================

export async function x_update_profile({ name, bio, location, website }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/settings/profile', { waitUntil: 'networkidle2' });
  await randomDelay();

  // If redirected to the profile page, open the edit dialog
  const editBtn = await pg.$('[data-testid="editProfileButton"]');
  if (editBtn) {
    await editBtn.click();
    await sleep(1500);
  }

  const fillField = async (selector, value) => {
    if (value === undefined) return;
    const el = await pg.$(selector);
    if (el) {
      await el.click({ clickCount: 3 });
      await el.type(value, { delay: 30 });
    }
  };

  await fillField('input[name="displayName"]', name);
  await fillField('textarea[name="description"]', bio);
  await fillField('input[name="location"]', location);
  await fillField('input[name="url"]', website);

  if (await clickIfPresent(pg, '[data-testid="Profile_Save_Button"]')) {
    await randomDelay();
    return { success: true, message: 'Profile updated' };
  }
  return { success: false, message: 'Could not save profile changes' };
}

// ============================================================================
// 17–20. Posting & Content
// ============================================================================

export async function x_post_thread({ tweets }) {
  if (!tweets || tweets.length < 2) {
    return { success: false, message: 'Thread requires at least 2 tweets' };
  }

  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
  await randomDelay();

  const textbox = await pg.$('[data-testid="tweetTextarea_0"]');
  if (!textbox) return { success: false, message: 'Could not open compose' };
  await textbox.type(tweets[0], { delay: 40 });
  await sleep(500);

  for (let i = 1; i < tweets.length; i++) {
    // Click "Add another tweet" button
    await clickIfPresent(pg, '[data-testid="addButton"]');
    await sleep(500);
    const nextBox = await pg.$(`[data-testid="tweetTextarea_${i}"]`);
    if (nextBox) {
      await nextBox.type(tweets[i], { delay: 40 });
      await sleep(300);
    }
  }

  if (await clickIfPresent(pg, '[data-testid="tweetButton"]')) {
    await randomDelay();
    return { success: true, message: `Thread posted (${tweets.length} tweets)` };
  }
  return { success: false, message: 'Could not post thread' };
}

export async function x_create_poll({ question, options, durationMinutes = 1440 }) {
  if (!options || options.length < 2 || options.length > 4) {
    return { success: false, message: 'Polls require 2–4 options' };
  }

  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
  await randomDelay();

  const textbox = await pg.$('[data-testid="tweetTextarea_0"]');
  if (!textbox) return { success: false, message: 'Could not open compose' };
  await textbox.type(question, { delay: 40 });
  await sleep(500);

  // Open poll UI
  const pollBtn = await pg.$('[data-testid="pollButton"]');
  if (!pollBtn) return { success: false, message: 'Poll button not found (may require Premium)' };
  await pollBtn.click();
  await sleep(1000);

  // Fill poll options (3rd/4th may need "+ Add" click first)
  for (let i = 0; i < options.length; i++) {
    if (i >= 2) {
      await clickIfPresent(pg, '[data-testid="addPollOption"]');
      await sleep(300);
    }
    const input = await pg.$(`[data-testid="pollOption${i + 1}"]`);
    if (input) {
      await input.type(options[i], { delay: 30 });
      await sleep(200);
    }
  }

  if (await clickIfPresent(pg, '[data-testid="tweetButton"]')) {
    await randomDelay();
    return { success: true, message: `Poll posted with ${options.length} options` };
  }
  return { success: false, message: 'Could not post poll' };
}

export async function x_schedule_post({ text, scheduledAt }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
  await randomDelay();

  const textbox = await pg.$('[data-testid="tweetTextarea_0"]');
  if (!textbox) return { success: false, message: 'Could not open compose' };
  await textbox.type(text, { delay: 40 });
  await sleep(500);

  const schedBtn = await pg.$('[data-testid="scheduleButton"]');
  if (!schedBtn) return { success: false, message: 'Schedule button not found (requires Premium)' };
  await schedBtn.click();
  await sleep(1000);

  // Confirm the scheduling dialog
  if (await clickIfPresent(pg, '[data-testid="scheduledConfirmationPrimaryAction"]')) {
    await sleep(500);
    if (await clickIfPresent(pg, '[data-testid="tweetButton"]')) {
      await randomDelay();
      return { success: true, message: `Tweet scheduled for ${scheduledAt}` };
    }
  }
  return { success: false, message: 'Could not schedule tweet' };
}

export async function x_delete_tweet({ url }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay();

  // Open the caret "⋯" menu on the tweet
  if (await clickIfPresent(pg, '[data-testid="caret"]')) {
    await sleep(500);
    // Click "Delete" from dropdown
    if (await clickMenuItemByText(pg, /delete/i)) {
      await sleep(500);
      if (await clickIfPresent(pg, '[data-testid="confirmationSheetConfirm"]')) {
        await randomDelay();
        return { success: true, message: 'Tweet deleted' };
      }
    }
  }
  return { success: false, message: 'Could not delete tweet (you may not own this tweet)' };
}

// ============================================================================
// 21–25. Engagement
// ============================================================================

export async function x_reply({ url, text }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay();

  const replyBox = await pg.$('[data-testid="tweetTextarea_0"]');
  if (replyBox) {
    await replyBox.type(text, { delay: 50 });
    await sleep(500);
    // Try inline button first, then regular
    if (
      (await clickIfPresent(pg, '[data-testid="tweetButtonInline"]')) ||
      (await clickIfPresent(pg, '[data-testid="tweetButton"]'))
    ) {
      await randomDelay();
      return { success: true, message: 'Reply posted' };
    }
  }
  return { success: false, message: 'Could not reply to tweet' };
}

export async function x_bookmark({ url }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay();

  if (await clickIfPresent(pg, '[data-testid="bookmark"]')) {
    await randomDelay();
    return { success: true, message: 'Tweet bookmarked' };
  }
  return { success: false, message: 'Could not bookmark tweet' };
}

export async function x_get_bookmarks({ limit = 100 }) {
  const { page: pg } = await ensureBrowser();
  return scrapeBookmarks(pg, { limit });
}

export async function x_clear_bookmarks() {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/i/bookmarks', { waitUntil: 'networkidle2' });
  await randomDelay();

  // Open the ⋯ overflow menu
  if (await clickIfPresent(pg, '[data-testid="caret"], [aria-label="More"]')) {
    await sleep(500);
    if (await clickMenuItemByText(pg, /clear all bookmarks/i)) {
      await sleep(500);
      if (await clickIfPresent(pg, '[data-testid="confirmationSheetConfirm"]')) {
        await randomDelay();
        return { success: true, message: 'All bookmarks cleared' };
      }
    }
  }
  return { success: false, message: 'Could not clear bookmarks' };
}

export async function x_auto_like({ keywords = [], maxLikes = 20 }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/home', { waitUntil: 'networkidle2' });
  await randomDelay();

  let liked = 0;
  const maxScrolls = maxLikes * 2;

  for (let scroll = 0; scroll < maxScrolls && liked < maxLikes; scroll++) {
    const tweets = await pg.$$('article[data-testid="tweet"]');

    for (const tweet of tweets) {
      if (liked >= maxLikes) break;

      const text = await tweet
        .$eval('[data-testid="tweetText"]', (el) => el.textContent)
        .catch(() => '');
      const matches =
        keywords.length === 0 ||
        keywords.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));

      if (matches) {
        const likeBtn = await tweet.$('[data-testid="like"]');
        if (likeBtn) {
          await likeBtn.click();
          liked++;
          await randomDelay();
        }
      }
    }
    await pg.evaluate(() => window.scrollBy(0, window.innerHeight));
    await sleep(1500);
  }
  return { success: true, liked, message: `Liked ${liked} tweets` };
}

// ============================================================================
// 26–27. Discovery
// ============================================================================

export async function x_get_trends({ category, limit = 30 }) {
  const { page: pg } = await ensureBrowser();
  return scrapeTrending(pg, { limit });
}

export async function x_get_explore({ category, limit = 30 }) {
  const { page: pg } = await ensureBrowser();
  // Explore and trending share the same underlying page data
  return scrapeTrending(pg, { limit });
}

// ============================================================================
// 28–30. Notifications & Muting
// ============================================================================

export async function x_get_notifications({ limit = 100, filter = 'all' }) {
  const { page: pg } = await ensureBrowser();
  const tab = filter === 'mentions' ? 'mentions' : 'all';
  return scrapeNotifications(pg, { limit, tab });
}

export async function x_mute_user({ username }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await randomDelay();

  if (await clickIfPresent(pg, '[data-testid="userActions"]')) {
    await sleep(500);
    if (await clickMenuItemByText(pg, /^mute @/i)) {
      await randomDelay();
      return { success: true, message: `Muted @${username}` };
    }
  }
  return { success: false, message: `Could not mute @${username}` };
}

export async function x_unmute_user({ username }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await randomDelay();

  if (await clickIfPresent(pg, '[data-testid="userActions"]')) {
    await sleep(500);
    if (await clickMenuItemByText(pg, /^unmute @/i)) {
      await randomDelay();
      return { success: true, message: `Unmuted @${username}` };
    }
  }
  return { success: false, message: `Could not unmute @${username}` };
}

// ============================================================================
// 31–33. Direct Messages
// ============================================================================

export async function x_send_dm({ username, message }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/messages', { waitUntil: 'networkidle2' });
  await randomDelay();

  // Start new conversation
  if (await clickIfPresent(pg, '[data-testid="NewDM_Button"]')) {
    await sleep(1000);
    const search = await pg.$('[data-testid="searchPeople"]');
    if (search) {
      await search.type(username, { delay: 50 });
      await sleep(1500);

      if (await clickIfPresent(pg, '[data-testid="TypeaheadUser"]')) {
        await sleep(500);
        if (await clickIfPresent(pg, '[data-testid="nextButton"]')) {
          await sleep(1000);

          const msgBox = await pg.$('[data-testid="dmComposerTextInput"]');
          if (msgBox) {
            await msgBox.type(message, { delay: 40 });
            await sleep(300);
            if (await clickIfPresent(pg, '[data-testid="dmComposerSendButton"]')) {
              await randomDelay();
              return { success: true, message: `DM sent to @${username}` };
            }
          }
        }
      }
    }
  }
  return { success: false, message: `Could not send DM to @${username}` };
}

export async function x_get_conversations({ limit = 20 }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/messages', { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);

  const conversations = await pg.evaluate((max) => {
    const els = document.querySelectorAll('[data-testid="conversation"]');
    return Array.from(els)
      .slice(0, max)
      .map((el) => {
        const nameEl = el.querySelector('[dir="ltr"] > span');
        const previewEl = el.querySelector('[dir="auto"]');
        const timeEl = el.querySelector('time');
        return {
          name: nameEl?.textContent || null,
          preview: previewEl?.textContent || null,
          time: timeEl?.getAttribute('datetime') || null,
        };
      });
  }, limit);

  return conversations;
}

export async function x_export_dms({ limit = 100 }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/messages', { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);

  const convos = await x_get_conversations({ limit: 10 });
  const allMessages = [];
  const convEls = await pg.$$('[data-testid="conversation"]');
  const toProcess = Math.min(convEls.length, Math.ceil(limit / 10));

  for (let i = 0; i < toProcess; i++) {
    // Re-query because DOM may have changed after navigation
    const currentConvEls = await pg.$$('[data-testid="conversation"]');
    if (!currentConvEls[i]) break;
    await currentConvEls[i].click();
    await sleep(2000);

    const messages = await pg.evaluate(() => {
      const msgEls = document.querySelectorAll('[data-testid="messageEntry"]');
      return Array.from(msgEls).map((msg) => {
        const text =
          msg.querySelector('[data-testid="tweetText"]')?.textContent ||
          msg.innerText?.slice(0, 500);
        const time = msg.querySelector('time')?.getAttribute('datetime');
        return { text, time };
      });
    });

    allMessages.push({
      conversation: convos[i]?.name || `Conversation ${i + 1}`,
      messages,
    });

    await clickIfPresent(pg, '[data-testid="app-bar-back"]');
    await sleep(1000);
  }

  return {
    conversations: allMessages,
    total: allMessages.reduce((sum, c) => sum + c.messages.length, 0),
  };
}

// ============================================================================
// 34–35. Grok AI
// ============================================================================

export async function x_grok_query({ query, mode = 'default' }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/i/grok', { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);

  // Find input
  const input = await pg.$(
    '[data-testid="grokTextArea"], textarea, [contenteditable="true"]'
  );
  if (!input) {
    return { success: false, message: 'Grok interface not found (requires Premium)' };
  }

  await input.type(query, { delay: 40 });
  await sleep(500);

  // Select mode if not default
  if (mode !== 'default') {
    const modeMap = { deepsearch: 'DeepSearch', think: 'Think' };
    const target = modeMap[mode];
    if (target) {
      const modeBtn = await pg.$(`[data-testid="grok${target}Button"]`);
      if (modeBtn) await modeBtn.click();
      await sleep(500);
    }
  }

  // Submit
  const sendBtn = await pg.$(
    '[data-testid="grokSendButton"], button[type="submit"]'
  );
  if (sendBtn) {
    await sendBtn.click();
    // Wait for response — longer for DeepSearch
    await sleep(mode === 'deepsearch' ? 15000 : 5000);

    const response = await pg.evaluate(() => {
      const blocks = document.querySelectorAll(
        '[data-testid="grokResponse"], [class*="response"]'
      );
      const last = blocks[blocks.length - 1];
      return last?.textContent || null;
    });

    if (response) {
      return { success: true, response, mode };
    }
  }
  return { success: false, message: 'Could not get Grok response' };
}

export async function x_grok_summarize({ topic }) {
  return x_grok_query({
    query: `Summarize what people on X/Twitter are saying about: ${topic}`,
    mode: 'default',
  });
}

// ============================================================================
// 36–37. Lists
// ============================================================================

export async function x_get_lists({ limit = 50 }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/i/lists', { waitUntil: 'networkidle2' });
  await randomDelay();

  const lists = await pg.evaluate((max) => {
    const els = document.querySelectorAll('a[href*="/i/lists/"]');
    return Array.from(els)
      .slice(0, max)
      .map((el) => {
        const nameEl = el.querySelector('span');
        return { name: nameEl?.textContent || null, url: el.href || null };
      })
      .filter((l) => l.name);
  }, limit);

  return lists;
}

export async function x_get_list_members({ listUrl, limit = 100 }) {
  const { page: pg } = await ensureBrowser();
  return scrapeListMembers(pg, listUrl, { limit });
}

// ============================================================================
// 38–39. Spaces
// ============================================================================

export async function x_get_spaces({ filter = 'live', topic, limit = 20 }) {
  const { page: pg } = await ensureBrowser();
  const query = topic || 'twitter spaces';
  return scrapeSpaces(pg, query, { limit });
}

export async function x_scrape_space({ url }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay(3000, 5000);

  const space = await pg.evaluate(() => {
    const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
    const title =
      getText('[data-testid="SpaceTitle"]') || getText('h1') || getText('h2');
    const host = getText('[data-testid="SpaceHost"]');
    const listeners = getText('[data-testid="SpaceListenerCount"]');
    const state = getText('[data-testid="SpaceState"]') || 'unknown';

    const speakers = Array.from(
      document.querySelectorAll('[data-testid="SpaceSpeaker"]')
    ).map((el) => ({
      name: el.querySelector('span')?.textContent || null,
    }));

    return { title, host, listeners, speakers, state };
  });

  return { success: true, ...space, url };
}

// ============================================================================
// 40–41. Analytics
// ============================================================================

export async function x_get_analytics({ period = '28d' }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/i/account_analytics', { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);

  const analytics = await pg.evaluate(() => {
    const metrics = {};
    const statEls = document.querySelectorAll(
      '[data-testid="analyticsMetric"], [class*="metric"]'
    );
    statEls.forEach((el) => {
      const label = el.querySelector('[class*="label"], small')?.textContent;
      const value = el.querySelector(
        '[class*="value"], strong, span:first-child'
      )?.textContent;
      if (label && value) metrics[label.trim()] = value.trim();
    });

    // Fallback: regex extract from page text
    if (!Object.keys(metrics).length) {
      const text = document.body.innerText;
      const extract = (pattern) => text.match(pattern)?.[1] || null;
      const impressions = extract(/impressions[:\s]+([\d,.KMB]+)/i);
      const engagements = extract(/engagements[:\s]+([\d,.KMB]+)/i);
      const followers = extract(/followers[:\s]+([\d,.KMB]+)/i);
      if (impressions) metrics.impressions = impressions;
      if (engagements) metrics.engagements = engagements;
      if (followers) metrics.followers = followers;
    }

    return metrics;
  });

  return { period, analytics };
}

export async function x_get_post_analytics({ url }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay();

  const analytics = await pg.evaluate(() => {
    const article = document.querySelector('article[data-testid="tweet"]');
    if (!article) return null;

    const stat = (testid) =>
      article.querySelector(`[data-testid="${testid}"] span span`)?.textContent || '0';

    return {
      text:
        article.querySelector('[data-testid="tweetText"]')?.textContent || '',
      likes: stat('like'),
      retweets: stat('retweet'),
      replies: stat('reply'),
      views:
        article.querySelector('a[href*="/analytics"] span span')?.textContent ||
        null,
      bookmarks: stat('bookmark'),
    };
  });

  if (!analytics) return { success: false, message: 'Could not find tweet' };
  return { success: true, url, ...analytics };
}

// ============================================================================
// 42–44. Settings & Blocked
// ============================================================================

export async function x_get_settings() {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/settings/account', { waitUntil: 'networkidle2' });
  await randomDelay();

  return pg.evaluate(() => {
    const items = {};
    document.querySelectorAll('a[href*="/settings/"]').forEach((link) => {
      const label = link.querySelector('span')?.textContent;
      const value = link.querySelector('[dir="ltr"]')?.textContent;
      if (label) items[label.trim()] = value?.trim() || 'configured';
    });
    return items;
  });
}

export async function x_toggle_protected({ enabled }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/settings/audience_and_tagging', {
    waitUntil: 'networkidle2',
  });
  await randomDelay();

  const checkbox = await pg.$('input[type="checkbox"]');
  if (checkbox) {
    const isChecked = await checkbox.evaluate((el) => el.checked);
    if ((enabled && !isChecked) || (!enabled && isChecked)) {
      await checkbox.click();
      await sleep(500);
      await clickIfPresent(pg, '[data-testid="confirmationSheetConfirm"]');
      await randomDelay();
      return {
        success: true,
        protected: enabled,
        message: `Account ${enabled ? 'protected' : 'set to public'}`,
      };
    }
    return {
      success: true,
      protected: enabled,
      message: `Already ${enabled ? 'protected' : 'public'}`,
    };
  }
  return { success: false, message: 'Could not find protect toggle' };
}

export async function x_get_blocked({ limit = 200 }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/settings/blocked/all', {
    waitUntil: 'networkidle2',
  });
  await randomDelay();

  return scrollCollect(
    pg,
    () => {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      return Array.from(cells)
        .map((cell) => {
          const link = cell.querySelector('a[href^="/"]');
          const nameEl = cell.querySelector('[dir="ltr"] > span');
          const username =
            link?.getAttribute('href')?.split('/')[1] || null;
          return {
            _key: username,
            username,
            name: nameEl?.textContent || null,
          };
        })
        .filter((u) => u.username);
    },
    { limit }
  );
}

// ============================================================================
// 45–46. Business
// ============================================================================

export async function x_brand_monitor({ brand, limit = 50, sentiment = true }) {
  const { page: pg } = await ensureBrowser();
  const tweets = await searchTweets(pg, brand, { limit });

  if (!sentiment) {
    return { brand, mentions: tweets, count: tweets.length };
  }

  // Simple keyword-based sentiment classification
  const posWords = [
    'love', 'great', 'amazing', 'best', 'awesome', 'excellent', 'good', 'fantastic',
  ];
  const negWords = [
    'hate', 'awful', 'terrible', 'worst', 'bad', 'horrible', 'poor', 'disappointing',
  ];

  const analyzed = tweets.map((tweet) => {
    const text = (tweet.text || '').toLowerCase();
    const pos = posWords.filter((w) => text.includes(w)).length;
    const neg = negWords.filter((w) => text.includes(w)).length;
    const label = pos > neg ? 'positive' : neg > pos ? 'negative' : 'neutral';
    return { ...tweet, sentiment: label };
  });

  const summary = {
    positive: analyzed.filter((t) => t.sentiment === 'positive').length,
    neutral: analyzed.filter((t) => t.sentiment === 'neutral').length,
    negative: analyzed.filter((t) => t.sentiment === 'negative').length,
  };

  return { brand, mentions: analyzed, count: analyzed.length, sentiment: summary };
}

export async function x_competitor_analysis({ handles }) {
  if (!handles || handles.length < 2) {
    return { success: false, message: 'Provide at least 2 handles to compare' };
  }

  const { page: pg } = await ensureBrowser();
  const profiles = [];
  for (const handle of handles) {
    const profile = await scrapeProfile(pg, handle.replace('@', ''));
    profiles.push(profile);
    await sleep(1000);
  }

  return {
    accounts: profiles,
    comparison: profiles.map((p) => ({
      username: p.username,
      followers: p.followers,
      following: p.following,
      tweetCount: p.tweetCount || p.tweets,
    })),
  };
}

// ============================================================================
// 47. Premium
// ============================================================================

export async function x_check_premium() {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/settings/your_twitter_data/account', {
    waitUntil: 'networkidle2',
  });
  await randomDelay();

  return pg.evaluate(() => {
    const text = document.body.innerText;
    const isPremium = /premium|blue|verified|subscriber/i.test(text);
    const tier =
      text.match(/(basic|premium\s*\+?|premium\s*plus)/i)?.[1] || null;
    return { isPremium, tier };
  });
}

// ============================================================================
// 48. Articles
// ============================================================================

export async function x_publish_article({ title, body, publish = false }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/i/articles/new', { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);

  const titleEl = await pg.$(
    '[data-testid="articleTitle"], [contenteditable="true"]:first-child, input[placeholder*="Title"]'
  );
  if (!titleEl) {
    return { success: false, message: 'Article editor not found (requires Premium+)' };
  }
  await titleEl.type(title, { delay: 30 });
  await sleep(500);

  const bodyEl = await pg.$(
    '[data-testid="articleBody"], [contenteditable="true"]:last-child'
  );
  if (bodyEl) {
    await bodyEl.type(body, { delay: 20 });
    await sleep(500);
  }

  if (publish) {
    if (await clickIfPresent(pg, '[data-testid="publishButton"]')) {
      await randomDelay();
      return { success: true, message: 'Article published' };
    }
  } else {
    if (await clickIfPresent(pg, '[data-testid="saveDraftButton"]')) {
      await randomDelay();
      return { success: true, message: 'Article saved as draft' };
    }
  }
  return { success: false, message: 'Could not save article' };
}

// ============================================================================
// 49. Creator Analytics
// ============================================================================

export async function x_creator_analytics({ period = '28d' }) {
  const { page: pg } = await ensureBrowser();
  await pg.goto('https://x.com/i/monetization', { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);

  return pg.evaluate(() => {
    const metrics = {};
    const text = document.body.innerText;
    const extract = (pattern) => text.match(pattern)?.[1] || null;

    const revenue = extract(/revenue[:\s]*\$?([\d,.]+)/i);
    const subscribers = extract(/subscribers[:\s]*([\d,.]+)/i);
    const views = extract(/views[:\s]*([\d,.KMB]+)/i);

    if (revenue) metrics.revenue = revenue;
    if (subscribers) metrics.subscribers = subscribers;
    if (views) metrics.views = views;

    return metrics;
  });
}

// ============================================================================
// HTTP Client Tools (no Puppeteer — faster, lightweight)
// ============================================================================

import { Scraper, SearchMode } from '../client/index.js';

/**
 * Helper: create a Scraper instance with saved cookies if available.
 */
async function getClientScraper() {
  const scraper = new Scraper();
  const cookiePath = path.join(os.homedir(), '.xactions', 'cookies.json');
  try {
    await fs.access(cookiePath);
    await scraper.loadCookies(cookiePath);
  } catch {
    // No saved cookies — will use guest token for read-only operations
  }
  return scraper;
}

/** Get a user's profile using the HTTP client (no browser needed). */
export async function x_client_get_profile({ username }) {
  const scraper = await getClientScraper();
  return scraper.getProfile(username);
}

/** Get a single tweet by ID using the HTTP client. */
export async function x_client_get_tweet({ tweetId }) {
  const scraper = await getClientScraper();
  return scraper.getTweet(tweetId);
}

/** Search tweets using the HTTP client. */
export async function x_client_search({ query, count = 20, mode = 'Latest' }) {
  const scraper = await getClientScraper();
  const results = [];
  for await (const tweet of scraper.searchTweets(query, count, mode)) {
    results.push(tweet);
  }
  return results;
}

/** Post a tweet using the HTTP client (requires saved auth cookies). */
export async function x_client_send_tweet({ text }) {
  const scraper = await getClientScraper();
  return scraper.sendTweet(text);
}

/** Get a user's followers using the HTTP client. */
export async function x_client_get_followers({ username, count = 100 }) {
  const scraper = await getClientScraper();
  const profile = await scraper.getProfile(username);
  const followers = [];
  for await (const follower of scraper.getFollowers(profile.id, count)) {
    followers.push(follower);
  }
  return followers;
}

/** Get trending topics using the HTTP client. */
export async function x_client_get_trends() {
  const scraper = await getClientScraper();
  return scraper.getTrends();
}

// ============================================================================
// Tool Map — all tools matching server.js TOOLS (excluding streaming)
// ============================================================================

export const toolMap = {
  // Auth
  x_login,
  // Scraping (delegated to scrapers/index.js — single source of truth)
  x_get_profile,
  x_get_followers,
  x_get_following,
  x_get_non_followers,
  x_get_tweets,
  x_search_tweets,
  x_get_thread,
  x_best_time_to_post,
  // Core actions
  x_follow,
  x_unfollow,
  // Bulk
  x_unfollow_non_followers,
  x_detect_unfollowers,
  // Post / Like / Retweet
  x_post_tweet,
  x_like,
  x_retweet,
  x_download_video,
  // Profile management
  x_update_profile,
  // Posting & content
  x_post_thread,
  x_create_poll,
  x_schedule_post,
  x_delete_tweet,
  // Engagement
  x_reply,
  x_bookmark,
  x_get_bookmarks,
  x_clear_bookmarks,
  x_auto_like,
  // Discovery
  x_get_trends,
  x_get_explore,
  // Notifications
  x_get_notifications,
  x_mute_user,
  x_unmute_user,
  // Direct messages
  x_send_dm,
  x_get_conversations,
  x_export_dms,
  // Grok AI
  x_grok_query,
  x_grok_summarize,
  // Lists
  x_get_lists,
  x_get_list_members,
  // Spaces
  x_get_spaces,
  x_scrape_space,
  // Analytics
  x_get_analytics,
  x_get_post_analytics,
  // Settings
  x_get_settings,
  x_toggle_protected,
  x_get_blocked,
  // Business
  x_brand_monitor,
  x_competitor_analysis,
  // Premium / Creator
  x_check_premium,
  x_publish_article,
  x_creator_analytics,
  // ── HTTP Client Tools (no Puppeteer — faster) ───────────────────────────
  x_client_get_profile,
  x_client_get_tweet,
  x_client_search,
  x_client_send_tweet,
  x_client_get_followers,
  x_client_get_trends,
  // Utility (not an MCP tool, used by server.js cleanup)
  closeBrowser,
};

export default toolMap;
