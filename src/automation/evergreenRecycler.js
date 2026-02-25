/**
 * XActions Evergreen Content Recycler
 * Identifies top-performing tweets and automatically re-posts them on a schedule.
 *
 * Kills: Hypefury (evergreen queue)
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.xactions');
const QUEUE_FILE = path.join(CONFIG_DIR, 'evergreen-queue.json');

// Words that indicate time-sensitive content
const TIME_SENSITIVE_WORDS = ['breaking', 'just now', 'today', 'right now', 'happening', 'just happened', 'this morning', 'tonight', 'yesterday', 'live now'];

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Analyze tweets and rank evergreen candidates
 */
export async function analyzeEvergreenCandidates(username, options = {}) {
  const {
    minAge = 30,
    minLikes = 10,
    minEngagementRate = 0.02,
    limit = 50,
    excludeReplies = true,
    excludeRetweets = true,
  } = options;

  console.log(`🔍 Analyzing evergreen candidates for @${username}...`);

  let tweets = [];
  try {
    const scrapers = await import('../scrapers/index.js');
    const browser = await scrapers.createBrowser({ headless: true });
    const page = await scrapers.createPage(browser);
    try {
      tweets = await scrapers.scrapeTweets(page, username, { limit: Math.max(200, limit * 3) });
    } finally {
      await browser.close();
    }
  } catch (error) {
    return { error: `Failed to scrape tweets: ${error.message}` };
  }

  const now = Date.now();
  const minAgeMs = minAge * 86400000;

  const candidates = tweets
    .filter(tweet => {
      const text = tweet.text || tweet.fullText || '';
      const createdAt = new Date(tweet.createdAt || tweet.created_at || 0);
      const age = now - createdAt.getTime();
      const likes = tweet.likes || tweet.likeCount || 0;

      // Filter criteria
      if (age < minAgeMs) return false;
      if (likes < minLikes) return false;
      if (excludeReplies && text.startsWith('@')) return false;
      if (excludeRetweets && (tweet.isRetweet || text.startsWith('RT @'))) return false;
      if (hasAtMentions(text)) return false;
      if (isTimeSensitive(text)) return false;

      return true;
    })
    .map(tweet => {
      const text = tweet.text || tweet.fullText || '';
      const likes = tweet.likes || tweet.likeCount || 0;
      const retweets = tweet.retweets || tweet.retweetCount || 0;
      const replies = tweet.replies || tweet.replyCount || 0;
      const views = tweet.views || tweet.viewCount || 1;
      const engagementRate = views > 0 ? (likes + retweets + replies) / views : 0;

      return {
        tweetId: tweet.id || tweet.tweetId,
        text,
        likes,
        retweets,
        replies,
        views,
        engagementRate: Math.round(engagementRate * 10000) / 100,
        createdAt: tweet.createdAt || tweet.created_at,
        suggestedRepostTime: getSuggestedTime(),
      };
    })
    .filter(t => t.engagementRate >= minEngagementRate * 100)
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, limit);

  console.log(`✅ Found ${candidates.length} evergreen candidates`);
  return { username, candidates, total: candidates.length };
}

/**
 * Create an evergreen queue from candidates
 */
export async function createEvergreenQueue(username, tweets, options = {}) {
  const {
    frequency = 'daily',
    timeSlots = ['09:00', '14:00', '19:00'],
    maxPerDay = 2,
    variation = true,
  } = options;

  const queue = {
    username,
    frequency,
    timeSlots,
    maxPerDay,
    variation,
    items: [],
    paused: false,
    createdAt: new Date().toISOString(),
    lastPosted: null,
  };

  // Space out tweets — never re-post within 30 days
  const now = new Date();
  let dayOffset = 0;
  let slotIndex = 0;
  let postsToday = 0;

  for (const tweet of tweets) {
    if (postsToday >= maxPerDay) {
      dayOffset++;
      postsToday = 0;
      slotIndex = 0;
    }

    const scheduledDate = new Date(now);
    scheduledDate.setDate(scheduledDate.getDate() + dayOffset);
    const [hours, minutes] = timeSlots[slotIndex % timeSlots.length].split(':');
    scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const text = variation ? varyTweet(tweet.text).varied : tweet.text;

    queue.items.push({
      tweetId: tweet.tweetId,
      originalText: tweet.text,
      postText: text,
      scheduledAt: scheduledDate.toISOString(),
      posted: false,
      postedAt: null,
      originalMetrics: { likes: tweet.likes, retweets: tweet.retweets, views: tweet.views },
    });

    postsToday++;
    slotIndex++;
  }

  // Save queue
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  await fsp.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));
  console.log(`📋 Evergreen queue created: ${queue.items.length} tweets queued`);

  return queue;
}

/**
 * Run one evergreen cycle — post due tweets
 */
export async function runEvergreenCycle() {
  let queue;
  try {
    queue = JSON.parse(await fsp.readFile(QUEUE_FILE, 'utf-8'));
  } catch {
    return { error: 'No evergreen queue found. Run evergreen:queue first.' };
  }

  if (queue.paused) {
    return { status: 'paused', message: 'Evergreen recycler is paused' };
  }

  const now = new Date();
  const due = queue.items.filter(item => !item.posted && new Date(item.scheduledAt) <= now);

  if (due.length === 0) {
    console.log('📭 No tweets due for posting');
    return { status: 'idle', dueCount: 0 };
  }

  let posted = 0;
  for (const item of due) {
    try {
      const localTools = await import('../mcp/local-tools.js');
      if (localTools.x_post_tweet) {
        await localTools.x_post_tweet({ text: item.postText });
      }
      item.posted = true;
      item.postedAt = now.toISOString();
      posted++;
      console.log(`✅ Recycled tweet posted: "${item.postText.slice(0, 50)}..."`);

      // Delay between posts
      if (due.indexOf(item) < due.length - 1) {
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (error) {
      console.error(`❌ Failed to post recycled tweet: ${error.message}`);
    }
  }

  queue.lastPosted = now.toISOString();
  await fsp.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));

  return { status: 'posted', count: posted, total: due.length };
}

/**
 * Pause evergreen recycler
 */
export async function pauseEvergreen() {
  try {
    const queue = JSON.parse(await fsp.readFile(QUEUE_FILE, 'utf-8'));
    queue.paused = true;
    await fsp.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));
    return { status: 'paused' };
  } catch {
    return { error: 'No queue found' };
  }
}

/**
 * Resume evergreen recycler
 */
export async function resumeEvergreen() {
  try {
    const queue = JSON.parse(await fsp.readFile(QUEUE_FILE, 'utf-8'));
    queue.paused = false;
    await fsp.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));
    return { status: 'resumed' };
  } catch {
    return { error: 'No queue found' };
  }
}

/**
 * Get evergreen stats
 */
export async function getEvergreenStats() {
  try {
    const queue = JSON.parse(await fsp.readFile(QUEUE_FILE, 'utf-8'));
    const posted = queue.items.filter(i => i.posted);
    const pending = queue.items.filter(i => !i.posted);

    return {
      username: queue.username,
      totalQueued: queue.items.length,
      posted: posted.length,
      pending: pending.length,
      paused: queue.paused,
      lastPosted: queue.lastPosted,
      createdAt: queue.createdAt,
    };
  } catch {
    return { error: 'No queue found' };
  }
}

// ============================================================================
// Content Variation Engine
// ============================================================================

const SYNONYMS = {
  'I think': ['IMO', 'In my opinion', 'My take:', 'I believe'],
  "Here's": ['Check out', "Here is", 'Take a look at'],
  'Amazing': ['Incredible', 'Remarkable', 'Outstanding', 'Fantastic'],
  'Great': ['Excellent', 'Solid', 'Impressive', 'Top-notch'],
  'Important': ['Crucial', 'Key', 'Essential', 'Critical'],
  'Simple': ['Straightforward', 'Easy', 'Clean'],
  'Best': ['Top', 'Ideal', 'Optimal', 'Perfect'],
};

const EMOJI_SWAPS = {
  '🔥': ['💥', '⚡', '🚀'],
  '💡': ['🧠', '✨', '💭'],
  '👇': ['⬇️', '🔽'],
  '🧵': ['📌', '💬'],
  '✅': ['☑️', '✔️', '👍'],
};

/**
 * Vary a tweet to avoid duplicate detection
 */
export function varyTweet(text) {
  let varied = text;
  const changes = [];

  // Swap synonyms (preserve @mentions, links, hashtags)
  for (const [original, replacements] of Object.entries(SYNONYMS)) {
    if (varied.includes(original)) {
      const replacement = replacements[Math.floor(Math.random() * replacements.length)];
      varied = varied.replace(original, replacement);
      changes.push(`"${original}" → "${replacement}"`);
    }
  }

  // Swap emojis
  for (const [original, replacements] of Object.entries(EMOJI_SWAPS)) {
    if (varied.includes(original)) {
      const replacement = replacements[Math.floor(Math.random() * replacements.length)];
      varied = varied.replace(original, replacement);
      changes.push(`${original} → ${replacement}`);
    }
  }

  return { original: text, varied, changeDescription: changes.join(', ') || 'No changes made' };
}

// ============================================================================
// Helpers
// ============================================================================

function hasAtMentions(text) {
  // Check for @mentions that aren't at the start (replies)
  const matches = text.match(/@\w+/g) || [];
  // Allow hashtags and URLs
  return matches.some(m => !text.startsWith(m));
}

function isTimeSensitive(text) {
  const lower = text.toLowerCase();
  return TIME_SENSITIVE_WORDS.some(word => lower.includes(word));
}

function getSuggestedTime() {
  const hours = [9, 12, 14, 17, 19];
  const hour = hours[Math.floor(Math.random() * hours.length)];
  return `${String(hour).padStart(2, '0')}:00`;
}

// by nichxbt
