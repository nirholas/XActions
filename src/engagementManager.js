// src/engagementManager.js
// Engagement and interaction automation for X/Twitter
// by nichxbt

/**
 * Engagement Manager - Likes, replies, bookmarks, reactions, analytics
 * 
 * Features:
 * - Like/unlike posts
 * - Reply to posts
 * - Bookmark management
 * - Hide replies
 * - Set reply limits
 * - Get engagement analytics
 * - Video reactions
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SELECTORS = {
  like: '[data-testid="like"]',
  unlike: '[data-testid="unlike"]',
  reply: '[data-testid="reply"]',
  retweet: '[data-testid="retweet"]',
  bookmark: '[data-testid="bookmark"]',
  removeBookmark: '[data-testid="removeBookmark"]',
  share: '[data-testid="share"]',
  tweet: 'article[data-testid="tweet"]',
  tweetText: '[data-testid="tweetText"]',
  replyInput: '[data-testid="tweetTextarea_0"]',
  replySubmit: '[data-testid="tweetButton"]',
  hideReply: '[data-testid="hideReply"]',
  caret: '[data-testid="caret"]',
  replyRestriction: '[data-testid="replyRestriction"]',
  analyticsLink: '[data-testid="analyticsButton"]',
  impressionCount: '[data-testid="impressions"]',
};

/**
 * Like a tweet by URL
 * @param {import('puppeteer').Page} page
 * @param {string} tweetUrl
 * @returns {Promise<Object>}
 */
export async function likeTweet(page, tweetUrl) {
  await page.goto(tweetUrl, { waitUntil: 'networkidle2' });
  await sleep(2000);

  const alreadyLiked = await page.$(SELECTORS.unlike);
  if (alreadyLiked) {
    return { success: true, action: 'already_liked', url: tweetUrl };
  }

  await page.click(SELECTORS.like);
  await sleep(1500);

  return { success: true, action: 'liked', url: tweetUrl, timestamp: new Date().toISOString() };
}

/**
 * Unlike a tweet by URL
 * @param {import('puppeteer').Page} page
 * @param {string} tweetUrl
 * @returns {Promise<Object>}
 */
export async function unlikeTweet(page, tweetUrl) {
  await page.goto(tweetUrl, { waitUntil: 'networkidle2' });
  await sleep(2000);

  const likedButton = await page.$(SELECTORS.unlike);
  if (!likedButton) {
    return { success: true, action: 'not_liked', url: tweetUrl };
  }

  await page.click(SELECTORS.unlike);
  await sleep(1500);

  return { success: true, action: 'unliked', url: tweetUrl, timestamp: new Date().toISOString() };
}

/**
 * Reply to a tweet
 * @param {import('puppeteer').Page} page
 * @param {string} tweetUrl
 * @param {string} replyText
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function replyToTweet(page, tweetUrl, replyText, options = {}) {
  const { media = null } = options;

  await page.goto(tweetUrl, { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Click reply area
  await page.click(SELECTORS.replyInput);
  await sleep(500);

  // Type reply
  await page.keyboard.type(replyText, { delay: 30 });
  await sleep(500);

  // Add media if provided
  if (media) {
    const fileInput = await page.$('[data-testid="fileInput"]');
    if (fileInput) {
      await fileInput.uploadFile(media);
      await sleep(2000);
    }
  }

  // Submit reply
  await page.click(SELECTORS.replySubmit);
  await sleep(3000);

  return {
    success: true,
    action: 'replied',
    url: tweetUrl,
    reply: replyText.substring(0, 100),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Bookmark a tweet
 * @param {import('puppeteer').Page} page
 * @param {string} tweetUrl
 * @returns {Promise<Object>}
 */
export async function bookmarkTweet(page, tweetUrl) {
  await page.goto(tweetUrl, { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Click share button to access bookmark
  await page.click(SELECTORS.share);
  await sleep(1000);
  await page.click(SELECTORS.bookmark);
  await sleep(1500);

  return { success: true, action: 'bookmarked', url: tweetUrl, timestamp: new Date().toISOString() };
}

/**
 * Remove a bookmark
 * @param {import('puppeteer').Page} page
 * @param {string} tweetUrl
 * @returns {Promise<Object>}
 */
export async function unbookmarkTweet(page, tweetUrl) {
  await page.goto(tweetUrl, { waitUntil: 'networkidle2' });
  await sleep(2000);

  await page.click(SELECTORS.share);
  await sleep(1000);
  await page.click(SELECTORS.removeBookmark);
  await sleep(1500);

  return { success: true, action: 'unbookmarked', url: tweetUrl, timestamp: new Date().toISOString() };
}

/**
 * Hide a reply on your post
 * @param {import('puppeteer').Page} page
 * @param {string} replyUrl
 * @returns {Promise<Object>}
 */
export async function hideReply(page, replyUrl) {
  await page.goto(replyUrl, { waitUntil: 'networkidle2' });
  await sleep(2000);

  await page.click(SELECTORS.caret);
  await sleep(1000);
  await page.click(SELECTORS.hideReply);
  await sleep(1500);

  return { success: true, action: 'hidden', url: replyUrl, timestamp: new Date().toISOString() };
}

/**
 * Auto-like posts in a feed based on keywords
 * @param {import('puppeteer').Page} page
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function autoLikeByKeyword(page, options = {}) {
  const { keywords = [], limit = 20, delay = 2000, url = 'https://x.com/home' } = options;

  await page.goto(url, { waitUntil: 'networkidle2' });
  await sleep(3000);

  let liked = 0;
  let scrollAttempts = 0;

  while (liked < limit && scrollAttempts < limit * 2) {
    const tweets = await page.$$(SELECTORS.tweet);

    for (const tweet of tweets) {
      if (liked >= limit) break;

      const text = await tweet.$eval(SELECTORS.tweetText, el => el.textContent).catch(() => '');

      const matches = keywords.length === 0 || keywords.some(kw =>
        text.toLowerCase().includes(kw.toLowerCase())
      );

      if (matches) {
        const likeBtn = await tweet.$(SELECTORS.like);
        if (likeBtn) {
          await likeBtn.click();
          liked++;
          console.log(`❤️ Liked (${liked}/${limit}): ${text.substring(0, 50)}...`);
          await sleep(delay);
        }
      }
    }

    await page.evaluate(() => window.scrollBy(0, 800));
    await sleep(1500);
    scrollAttempts++;
  }

  return {
    success: true,
    liked,
    keywords,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get engagement analytics for a post
 * @param {import('puppeteer').Page} page
 * @param {string} tweetUrl
 * @returns {Promise<Object>}
 */
export async function getEngagementAnalytics(page, tweetUrl) {
  await page.goto(tweetUrl, { waitUntil: 'networkidle2' });
  await sleep(2000);

  const analytics = await page.evaluate((sel) => {
    const tweet = document.querySelector(sel.tweet);
    if (!tweet) return null;

    const getText = (s) => tweet.querySelector(s)?.textContent?.trim() || '0';

    return {
      likes: getText(sel.like + ' span') || getText(sel.unlike + ' span'),
      reposts: getText(sel.retweet + ' span'),
      replies: getText('[data-testid="reply"] span'),
      impressions: getText(sel.impressionCount),
    };
  }, SELECTORS);

  return {
    url: tweetUrl,
    analytics,
    scrapedAt: new Date().toISOString(),
  };
}

export default {
  likeTweet,
  unlikeTweet,
  replyToTweet,
  bookmarkTweet,
  unbookmarkTweet,
  hideReply,
  autoLikeByKeyword,
  getEngagementAnalytics,
  SELECTORS,
};
