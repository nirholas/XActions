/**
 * XActions Auto-Snapshot — Periodic account metric snapshots
 * Automatically captures follower counts, engagement, and growth metrics on a schedule.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { saveAccountSnapshot, saveDailyEngagement } from './historyStore.js';

// ============================================================================
// Active Snapshot Schedules
// ============================================================================

const activeSnapshots = new Map(); // username → { intervalId, intervalMinutes, startedAt }

/**
 * Start auto-snapshots for a username
 * @param {string} username - Twitter username
 * @param {number} intervalMinutes - Minutes between snapshots (default 60)
 * @param {Function} [scrapeFn] - Custom scrape function, defaults to lazy-loading scrapers
 */
export async function startAutoSnapshot(username, intervalMinutes = 60, scrapeFn = null) {
  const user = username.toLowerCase().replace('@', '');

  if (activeSnapshots.has(user)) {
    console.log(`⚠️  Auto-snapshot already running for @${user}`);
    return { status: 'already_running', username: user };
  }

  const scrape = scrapeFn || (async (u) => {
    const scrapers = await import('../scrapers/index.js');
    const browser = await scrapers.createBrowser({ headless: true });
    const page = await scrapers.createPage(browser);
    try {
      const profile = await scrapers.scrapeProfile(page, u);
      return profile;
    } finally {
      await browser.close();
    }
  });

  // Track daily engagement (one check per day)
  let lastDailyDate = null;

  const doSnapshot = async () => {
    try {
      console.log(`📸 Taking snapshot for @${user}...`);
      const profile = await scrape(user);
      saveAccountSnapshot(user, {
        followers_count: profile.followersCount || profile.followers_count || 0,
        following_count: profile.followingCount || profile.following_count || 0,
        tweet_count: profile.tweetCount || profile.tweet_count || 0,
        listed_count: profile.listedCount || profile.listed_count || 0,
        verified: profile.verified || false,
      });

      const today = new Date().toISOString().split('T')[0];
      if (lastDailyDate !== today) {
        lastDailyDate = today;
        saveDailyEngagement(user, {
          date: today,
          avg_engagement_rate: profile.engagementRate || 0,
          total_impressions: profile.impressions || 0,
          total_engagements: profile.engagements || 0,
        });
      }

      console.log(`✅ Snapshot saved for @${user} — ${profile.followersCount || profile.followers_count || '?'} followers`);
    } catch (error) {
      console.error(`❌ Snapshot failed for @${user}: ${error.message}`);
    }
  };

  // Take first snapshot immediately
  await doSnapshot();

  // Set up recurring snapshots
  const intervalId = setInterval(doSnapshot, intervalMinutes * 60 * 1000);

  activeSnapshots.set(user, {
    intervalId,
    intervalMinutes,
    startedAt: new Date().toISOString(),
  });

  console.log(`🔄 Auto-snapshot started for @${user} — every ${intervalMinutes} minutes`);
  return { status: 'started', username: user, intervalMinutes };
}

/**
 * Stop auto-snapshots for a username
 */
export function stopAutoSnapshot(username) {
  const user = username.toLowerCase().replace('@', '');
  const entry = activeSnapshots.get(user);
  if (!entry) {
    return { status: 'not_running', username: user };
  }

  clearInterval(entry.intervalId);
  activeSnapshots.delete(user);
  console.log(`⏹️  Auto-snapshot stopped for @${user}`);
  return { status: 'stopped', username: user };
}

/**
 * List all active snapshot schedules
 */
export function listActiveSnapshots() {
  const result = [];
  for (const [username, info] of activeSnapshots) {
    result.push({
      username,
      intervalMinutes: info.intervalMinutes,
      startedAt: info.startedAt,
    });
  }
  return result;
}

/**
 * Stop all auto-snapshots — for graceful shutdown
 */
export function stopAllSnapshots() {
  for (const [username] of activeSnapshots) {
    stopAutoSnapshot(username);
  }
}

// Graceful shutdown
process.on('SIGINT', stopAllSnapshots);
process.on('SIGTERM', stopAllSnapshots);
process.on('exit', stopAllSnapshots);

// by nichxbt
