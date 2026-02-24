// src/postComposer.js
// Post creation, threads, polls, scheduling, articles for X/Twitter
// by nichxbt

/**
 * Post Composer - Full content creation automation
 * 
 * Features:
 * - Post tweets (text + media)
 * - Create multi-tweet threads
 * - Create polls with options (+ image polls 2026)
 * - Schedule posts (Premium)
 * - Quote posts and reposts
 * - Edit posts (Premium, 1hr window)
 * - Delete posts
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================================================
// Selectors
// ============================================================================

const SELECTORS = {
  composeButton: 'a[data-testid="SideNav_NewTweet_Button"]',
  tweetTextarea: '[data-testid="tweetTextarea_0"]',
  tweetButton: '[data-testid="tweetButton"]',
  mediaInput: '[data-testid="fileInput"]',
  addPoll: '[aria-label="Add poll"]',
  pollOption1: '[data-testid="pollOption_0"]',
  pollOption2: '[data-testid="pollOption_1"]',
  pollOption3: '[data-testid="pollOption_2"]',
  pollOption4: '[data-testid="pollOption_3"]',
  addPollOption: '[data-testid="addPollOption"]',
  pollDuration: '[data-testid="pollDuration"]',
  scheduleButton: '[data-testid="scheduleOption"]',
  scheduleDateInput: '[data-testid="scheduleDateInput"]',
  scheduleTimeInput: '[data-testid="scheduleTimeInput"]',
  scheduleConfirm: '[data-testid="scheduleConfirm"]',
  addThread: '[data-testid="addButton"]',
  gifButton: '[aria-label="Add a GIF"]',
  emojiButton: '[aria-label="Add emoji"]',
  altTextInput: '[data-testid="altTextInput"]',
  replyRestriction: '[data-testid="replyRestriction"]',
  editButton: '[data-testid="editTweet"]',
  deleteButton: '[data-testid="deleteTweet"]',
  confirmDelete: '[data-testid="confirmationSheetConfirm"]',
  quoteTweet: '[data-testid="quoteTweet"]',
  retweetButton: '[data-testid="retweet"]',
  retweetConfirm: '[data-testid="retweetConfirm"]',
  tweetArticle: 'article[data-testid="tweet"]',
};

// ============================================================================
// Posting
// ============================================================================

/**
 * Post a tweet
 * @param {import('puppeteer').Page} page
 * @param {string} text - Tweet text
 * @param {Object} options
 * @returns {Promise<Object>} Post result
 */
export async function postTweet(page, text, options = {}) {
  const { media = null, altText = null, replyTo = null } = options;

  if (replyTo) {
    await page.goto(replyTo, { waitUntil: 'networkidle2' });
    await sleep(2000);
    await page.click('[data-testid="reply"]');
    await sleep(1000);
  } else {
    await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
    await sleep(2000);
  }

  // Type text
  await page.click(SELECTORS.tweetTextarea);
  await page.keyboard.type(text, { delay: 30 });
  await sleep(500);

  // Add media if provided
  if (media) {
    const fileInput = await page.$(SELECTORS.mediaInput);
    if (fileInput) {
      await fileInput.uploadFile(media);
      await sleep(2000);

      // Add alt text if provided
      if (altText) {
        try {
          await page.click(SELECTORS.altTextInput);
          await page.keyboard.type(altText);
          await sleep(500);
        } catch (e) {
          console.log('⚠️ Alt text input not found');
        }
      }
    }
  }

  // Post
  await page.click(SELECTORS.tweetButton);
  await sleep(3000);

  return {
    success: true,
    text: text.substring(0, 100),
    hasMedia: !!media,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Post a thread (multiple linked tweets)
 * @param {import('puppeteer').Page} page
 * @param {Array<string|Object>} tweets - Array of tweet texts or { text, media } objects
 * @returns {Promise<Object>} Thread result
 */
export async function postThread(page, tweets) {
  await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
  await sleep(2000);

  const results = [];

  for (let i = 0; i < tweets.length; i++) {
    const tweet = typeof tweets[i] === 'string' ? { text: tweets[i] } : tweets[i];

    if (i > 0) {
      // Add new tweet to thread
      await page.click(SELECTORS.addThread);
      await sleep(1000);
    }

    // Type text in the current textarea
    const textareaSelector = `[data-testid="tweetTextarea_${i}"]`;
    try {
      await page.click(textareaSelector);
    } catch {
      await page.click(SELECTORS.tweetTextarea);
    }
    await page.keyboard.type(tweet.text, { delay: 20 });
    await sleep(500);

    // Add media if present
    if (tweet.media) {
      const fileInput = await page.$(SELECTORS.mediaInput);
      if (fileInput) {
        await fileInput.uploadFile(tweet.media);
        await sleep(2000);
      }
    }

    results.push({ index: i + 1, text: tweet.text.substring(0, 50) });
  }

  // Post entire thread
  await page.click(SELECTORS.tweetButton);
  await sleep(3000);

  return {
    success: true,
    tweetCount: tweets.length,
    tweets: results,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a poll
 * @param {import('puppeteer').Page} page
 * @param {string} question - Poll question
 * @param {Array<string>} choices - 2-4 poll options
 * @param {Object} options
 * @returns {Promise<Object>} Poll result
 */
export async function createPoll(page, question, choices, options = {}) {
  const { duration = '1d' } = options;

  if (choices.length < 2 || choices.length > 4) {
    throw new Error('Polls require 2-4 choices');
  }

  await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Type question
  await page.click(SELECTORS.tweetTextarea);
  await page.keyboard.type(question, { delay: 30 });
  await sleep(500);

  // Open poll interface
  await page.click(SELECTORS.addPoll);
  await sleep(1500);

  // Fill in choices
  const choiceSelectors = [
    SELECTORS.pollOption1,
    SELECTORS.pollOption2,
    SELECTORS.pollOption3,
    SELECTORS.pollOption4,
  ];

  for (let i = 0; i < choices.length; i++) {
    if (i >= 2) {
      // Need to add extra options for 3rd and 4th
      try {
        await page.click(SELECTORS.addPollOption);
        await sleep(500);
      } catch (e) {
        console.log(`⚠️ Could not add poll option ${i + 1}`);
      }
    }
    await page.click(choiceSelectors[i]);
    await page.keyboard.type(choices[i], { delay: 20 });
    await sleep(300);
  }

  // Post poll
  await page.click(SELECTORS.tweetButton);
  await sleep(3000);

  return {
    success: true,
    question,
    choices,
    duration,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Schedule a post for later (Premium required)
 * @param {import('puppeteer').Page} page
 * @param {string} text - Tweet text
 * @param {Date|string} scheduledTime - When to post
 * @returns {Promise<Object>} Schedule result
 */
export async function schedulePost(page, text, scheduledTime) {
  await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Type text
  await page.click(SELECTORS.tweetTextarea);
  await page.keyboard.type(text, { delay: 30 });
  await sleep(500);

  // Open schedule dialog
  await page.click(SELECTORS.scheduleButton);
  await sleep(1500);

  // Set date and time
  const date = new Date(scheduledTime);
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].substring(0, 5);

  try {
    await page.click(SELECTORS.scheduleDateInput);
    await page.keyboard.type(dateStr);
    await sleep(500);

    await page.click(SELECTORS.scheduleTimeInput);
    await page.keyboard.type(timeStr);
    await sleep(500);
  } catch (e) {
    console.log('⚠️ Schedule input not available — Premium required');
    return { success: false, error: 'Schedule requires Premium' };
  }

  // Confirm schedule
  await page.click(SELECTORS.scheduleConfirm);
  await sleep(2000);

  return {
    success: true,
    text: text.substring(0, 100),
    scheduledFor: date.toISOString(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Quote a post
 * @param {import('puppeteer').Page} page
 * @param {string} postUrl - URL of the post to quote
 * @param {string} commentary - Your commentary
 * @returns {Promise<Object>}
 */
export async function quotePost(page, postUrl, commentary) {
  await page.goto(postUrl, { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Click retweet button to open menu
  await page.click(SELECTORS.retweetButton);
  await sleep(1000);

  // Click "Quote Tweet"
  await page.click(SELECTORS.quoteTweet);
  await sleep(1500);

  // Type commentary
  await page.click(SELECTORS.tweetTextarea);
  await page.keyboard.type(commentary, { delay: 30 });
  await sleep(500);

  // Post
  await page.click(SELECTORS.tweetButton);
  await sleep(3000);

  return {
    success: true,
    quotedUrl: postUrl,
    commentary: commentary.substring(0, 100),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Repost/retweet a post
 * @param {import('puppeteer').Page} page
 * @param {string} postUrl
 * @returns {Promise<Object>}
 */
export async function repost(page, postUrl) {
  await page.goto(postUrl, { waitUntil: 'networkidle2' });
  await sleep(2000);

  await page.click(SELECTORS.retweetButton);
  await sleep(1000);
  await page.click(SELECTORS.retweetConfirm);
  await sleep(2000);

  return {
    success: true,
    repostedUrl: postUrl,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Delete a post
 * @param {import('puppeteer').Page} page
 * @param {string} postUrl
 * @returns {Promise<Object>}
 */
export async function deletePost(page, postUrl) {
  await page.goto(postUrl, { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Open more menu and click delete
  await page.click('[data-testid="caret"]');
  await sleep(1000);
  await page.click(SELECTORS.deleteButton);
  await sleep(1000);
  await page.click(SELECTORS.confirmDelete);
  await sleep(2000);

  return {
    success: true,
    deletedUrl: postUrl,
    timestamp: new Date().toISOString(),
  };
}

export default {
  postTweet,
  postThread,
  createPoll,
  schedulePost,
  quotePost,
  repost,
  deletePost,
  SELECTORS,
};
