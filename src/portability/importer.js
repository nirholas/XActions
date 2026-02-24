/**
 * XActions Account Importer / Migration Tool
 * Import/migrate Twitter data to Bluesky or Mastodon.
 *
 * Bluesky: via @atproto/api (create posts, follow matching users)
 * Mastodon: via REST API (create toots, follow matching users)
 * Includes dry-run mode and user matching by username similarity + bio.
 *
 * NOTE: Migration stubs — logs what they would do. Full execution requires
 * platform credentials and user confirmation.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { promises as fs } from 'fs';
import path from 'path';

// ============================================================================
// User Matching
// ============================================================================

/**
 * Simple string similarity (Dice coefficient)
 */
function similarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;

  const bigrams = (s) => {
    const set = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const pair = s.substring(i, i + 2);
      set.set(pair, (set.get(pair) || 0) + 1);
    }
    return set;
  };

  const aBi = bigrams(a);
  const bBi = bigrams(b);
  let intersection = 0;
  for (const [pair, count] of aBi) {
    intersection += Math.min(count, bBi.get(pair) || 0);
  }
  return (2 * intersection) / (a.length - 1 + b.length - 1) || 0;
}

/**
 * Find best match for a Twitter user on another platform
 * Returns { match, score, method } or null
 */
function findMatch(twitterUser, platformUsers) {
  const handle = (twitterUser.username || twitterUser.handle || '').toLowerCase();
  const bio = (twitterUser.bio || '').toLowerCase();

  let best = null;
  let bestScore = 0;

  for (const pu of platformUsers) {
    const puHandle = (pu.username || pu.handle || '').toLowerCase();
    const puBio = (pu.bio || pu.description || '').toLowerCase();

    // Exact username match is strongest signal
    if (puHandle === handle) {
      return { match: pu, score: 1, method: 'exact-username' };
    }

    // Username similarity
    const usernameSim = similarity(handle, puHandle);
    // Bio similarity (secondary signal)
    const bioSim = bio && puBio ? similarity(bio, puBio) * 0.3 : 0;
    const score = usernameSim * 0.7 + bioSim;

    if (score > bestScore && score > 0.5) {
      bestScore = score;
      best = { match: pu, score, method: 'similarity' };
    }
  }

  return best;
}

// ============================================================================
// Bluesky Importer (stub)
// ============================================================================

/**
 * Migrate to Bluesky
 *
 * @param {object} options
 * @param {string} options.exportDir - Path to export directory
 * @param {string} [options.handle] - Bluesky handle (e.g. user.bsky.social)
 * @param {string} [options.password] - Bluesky app password
 * @param {boolean} [options.dryRun=true] - If true, only log actions
 * @param {boolean} [options.migrateTweets=true] - Migrate tweets as posts
 * @param {boolean} [options.migrateFollows=true] - Follow matching users
 * @param {number} [options.tweetLimit=50] - Max tweets to migrate
 * @param {function} [options.onProgress] - Progress callback
 * @returns {object} Migration summary
 */
export async function migrateToBluesky(options) {
  const {
    exportDir,
    handle,
    password,
    dryRun = true,
    migrateTweets = true,
    migrateFollows = true,
    tweetLimit = 50,
    onProgress,
  } = options;

  const summary = {
    platform: 'bluesky',
    dryRun,
    tweets: { total: 0, migrated: 0, skipped: 0, errors: [] },
    follows: { total: 0, matched: 0, followed: 0, errors: [] },
    actions: [],
  };

  // Load exported data
  let tweets = [], following = [];
  try {
    const raw = await fs.readFile(path.join(exportDir, 'tweets.json'), 'utf-8');
    tweets = JSON.parse(raw);
  } catch { /* no tweets */ }
  try {
    const raw = await fs.readFile(path.join(exportDir, 'following.json'), 'utf-8');
    following = JSON.parse(raw);
  } catch { /* no following */ }

  // Migrate tweets
  if (migrateTweets && tweets.length > 0) {
    summary.tweets.total = Math.min(tweets.length, tweetLimit);
    const batch = tweets.slice(0, tweetLimit);

    for (let i = 0; i < batch.length; i++) {
      const tweet = batch[i];
      const text = tweet.text || '';

      if (!text.trim()) {
        summary.tweets.skipped++;
        continue;
      }

      // Truncate to Bluesky's 300 char limit
      const bskyText = text.length > 300 ? text.slice(0, 297) + '...' : text;

      const action = {
        type: 'create_post',
        platform: 'bluesky',
        content: bskyText,
        originalUrl: tweet.url || null,
      };

      if (dryRun) {
        action.status = 'dry-run';
        summary.actions.push(action);
        summary.tweets.migrated++;
      } else {
        try {
          // Real migration would use @atproto/api here:
          // const agent = new BskyAgent({ service: 'https://bsky.social' });
          // await agent.login({ identifier: handle, password });
          // await agent.post({ text: bskyText, createdAt: new Date().toISOString() });
          action.status = 'would-execute';
          action.note = 'Full Bluesky migration requires @atproto/api — install with: npm install @atproto/api';
          summary.actions.push(action);
          summary.tweets.migrated++;
        } catch (err) {
          action.status = 'error';
          action.error = err.message;
          summary.actions.push(action);
          summary.tweets.errors.push({ tweet: text.slice(0, 50), error: err.message });
        }
      }

      if (onProgress) {
        onProgress({ phase: 'tweets', completed: i + 1, total: batch.length });
      }
    }
  }

  // Migrate follows
  if (migrateFollows && following.length > 0) {
    summary.follows.total = following.length;

    for (const user of following) {
      const handle = user.username || user.handle || 'unknown';

      const action = {
        type: 'follow',
        platform: 'bluesky',
        twitterUser: handle,
        note: `Would search for @${handle} on Bluesky and follow if found`,
      };

      if (dryRun) {
        action.status = 'dry-run';
      } else {
        action.status = 'would-execute';
        action.note = 'User matching requires @atproto/api searchActors endpoint';
      }

      summary.actions.push(action);
      summary.follows.matched++;
    }
  }

  return summary;
}

// ============================================================================
// Mastodon Importer (stub)
// ============================================================================

/**
 * Migrate to Mastodon
 *
 * @param {object} options
 * @param {string} options.exportDir - Path to export directory
 * @param {string} [options.instanceUrl] - Mastodon instance URL
 * @param {string} [options.accessToken] - Mastodon access token
 * @param {boolean} [options.dryRun=true] - If true, only log actions
 * @param {boolean} [options.migrateTweets=true] - Migrate tweets as toots
 * @param {boolean} [options.migrateFollows=true] - Follow matching users
 * @param {number} [options.tweetLimit=50] - Max tweets to migrate
 * @param {function} [options.onProgress] - Progress callback
 * @returns {object} Migration summary
 */
export async function migrateToMastodon(options) {
  const {
    exportDir,
    instanceUrl = 'https://mastodon.social',
    accessToken,
    dryRun = true,
    migrateTweets = true,
    migrateFollows = true,
    tweetLimit = 50,
    onProgress,
  } = options;

  const summary = {
    platform: 'mastodon',
    instance: instanceUrl,
    dryRun,
    tweets: { total: 0, migrated: 0, skipped: 0, errors: [] },
    follows: { total: 0, matched: 0, followed: 0, errors: [] },
    actions: [],
  };

  // Load exported data
  let tweets = [], following = [];
  try {
    const raw = await fs.readFile(path.join(exportDir, 'tweets.json'), 'utf-8');
    tweets = JSON.parse(raw);
  } catch { /* no tweets */ }
  try {
    const raw = await fs.readFile(path.join(exportDir, 'following.json'), 'utf-8');
    following = JSON.parse(raw);
  } catch { /* no following */ }

  // Migrate tweets as toots
  if (migrateTweets && tweets.length > 0) {
    summary.tweets.total = Math.min(tweets.length, tweetLimit);
    const batch = tweets.slice(0, tweetLimit);

    for (let i = 0; i < batch.length; i++) {
      const tweet = batch[i];
      const text = tweet.text || '';

      if (!text.trim()) {
        summary.tweets.skipped++;
        continue;
      }

      // Mastodon allows 500 chars by default
      const tootText = text.length > 500 ? text.slice(0, 497) + '...' : text;

      const action = {
        type: 'create_toot',
        platform: 'mastodon',
        instance: instanceUrl,
        content: tootText,
        originalUrl: tweet.url || null,
      };

      if (dryRun) {
        action.status = 'dry-run';
        summary.actions.push(action);
        summary.tweets.migrated++;
      } else {
        try {
          // Real migration would use Mastodon REST API:
          // await fetch(`${instanceUrl}/api/v1/statuses`, {
          //   method: 'POST',
          //   headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          //   body: JSON.stringify({ status: tootText }),
          // });
          action.status = 'would-execute';
          action.note = 'Full Mastodon migration requires instance URL and access token';
          summary.actions.push(action);
          summary.tweets.migrated++;
        } catch (err) {
          action.status = 'error';
          action.error = err.message;
          summary.actions.push(action);
          summary.tweets.errors.push({ tweet: text.slice(0, 50), error: err.message });
        }
      }

      if (onProgress) {
        onProgress({ phase: 'tweets', completed: i + 1, total: batch.length });
      }
    }
  }

  // Migrate follows
  if (migrateFollows && following.length > 0) {
    summary.follows.total = following.length;

    for (const user of following) {
      const handle = user.username || user.handle || 'unknown';

      const action = {
        type: 'follow',
        platform: 'mastodon',
        instance: instanceUrl,
        twitterUser: handle,
        note: `Would search for @${handle} on ${instanceUrl} and follow if found`,
      };

      if (dryRun) {
        action.status = 'dry-run';
      } else {
        action.status = 'would-execute';
        action.note = 'User matching requires Mastodon search API and access token';
      }

      summary.actions.push(action);
      summary.follows.matched++;
    }
  }

  return summary;
}

// ============================================================================
// Unified migrate function
// ============================================================================

/**
 * Migrate to a target platform
 *
 * @param {object} options
 * @param {string} options.exportDir - Path to export directory
 * @param {string} options.platform - 'bluesky' or 'mastodon'
 * @param {boolean} [options.dryRun=true]
 * @param {object} [options.credentials] - Platform-specific credentials
 * @param {function} [options.onProgress]
 * @returns {object} Migration summary
 */
export async function migrate(options) {
  const { platform, exportDir, dryRun = true, credentials = {}, onProgress } = options;

  // Verify export directory exists
  try {
    await fs.access(exportDir);
  } catch {
    throw new Error(`Export directory not found: ${exportDir}`);
  }

  switch (platform) {
    case 'bluesky':
      return migrateToBluesky({
        exportDir,
        handle: credentials.handle,
        password: credentials.password,
        dryRun,
        onProgress,
      });
    case 'mastodon':
      return migrateToMastodon({
        exportDir,
        instanceUrl: credentials.instanceUrl,
        accessToken: credentials.accessToken,
        dryRun,
        onProgress,
      });
    default:
      throw new Error(`Unsupported platform: ${platform}. Use 'bluesky' or 'mastodon'.`);
  }
}

export { findMatch, similarity };
export default migrate;
