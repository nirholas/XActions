// src/pollCreator.js
// Poll creation and management for X/Twitter
// by nichxbt

/**
 * Poll Creator - Create and manage polls
 * 
 * Features:
 * - Create polls with 2-4 options
 * - Set poll duration (5min - 7 days)
 * - Image polls (2026 feature)
 * - Shuffle choices (2026, in development)
 * - Poll results scraping
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SELECTORS = {
  composeButton: 'a[data-testid="SideNav_NewTweet_Button"]',
  tweetTextarea: '[data-testid="tweetTextarea_0"]',
  tweetButton: '[data-testid="tweetButton"]',
  addPoll: '[aria-label="Add poll"]',
  pollOption: (i) => `[data-testid="pollOption_${i}"]`,
  addPollOption: '[data-testid="addPollOption"]',
  pollDurationDays: '[data-testid="pollDurationDays"]',
  pollDurationHours: '[data-testid="pollDurationHours"]',
  pollDurationMinutes: '[data-testid="pollDurationMinutes"]',
  removePoll: '[data-testid="removePoll"]',
  pollResults: '[data-testid="pollResults"]',
};

/**
 * Create a poll
 * @param {import('puppeteer').Page} page
 * @param {string} question - Poll question text
 * @param {Array<string>} choices - 2-4 poll options
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function createPoll(page, question, choices, options = {}) {
  const { durationDays = 1, durationHours = 0, durationMinutes = 0 } = options;

  if (choices.length < 2 || choices.length > 4) {
    return { success: false, error: 'Polls require 2-4 choices' };
  }

  await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Type question
  await page.click(SELECTORS.tweetTextarea);
  await page.keyboard.type(question, { delay: 30 });
  await sleep(500);

  // Add poll
  try {
    await page.click(SELECTORS.addPoll);
    await sleep(1500);
  } catch (e) {
    return { success: false, error: 'Poll button not found' };
  }

  // Fill in choices
  for (let i = 0; i < choices.length; i++) {
    if (i >= 2) {
      // Add extra option slots for 3rd and 4th choices
      try {
        await page.click(SELECTORS.addPollOption);
        await sleep(500);
      } catch (e) {
        console.log(`⚠️ Could not add option ${i + 1}`);
        break;
      }
    }

    const optionSel = SELECTORS.pollOption(i);
    try {
      await page.click(optionSel);
      await page.keyboard.type(choices[i], { delay: 20 });
      await sleep(300);
    } catch (e) {
      console.log(`⚠️ Could not fill option ${i + 1}`);
    }
  }

  // Set duration
  try {
    if (durationDays !== 1) {
      const daysInput = await page.$(SELECTORS.pollDurationDays);
      if (daysInput) {
        await daysInput.click({ clickCount: 3 });
        await daysInput.type(String(durationDays));
      }
    }
    if (durationHours > 0) {
      const hoursInput = await page.$(SELECTORS.pollDurationHours);
      if (hoursInput) {
        await hoursInput.click({ clickCount: 3 });
        await hoursInput.type(String(durationHours));
      }
    }
    if (durationMinutes > 0) {
      const minsInput = await page.$(SELECTORS.pollDurationMinutes);
      if (minsInput) {
        await minsInput.click({ clickCount: 3 });
        await minsInput.type(String(durationMinutes));
      }
    }
  } catch (e) {
    console.log('⚠️ Could not set custom duration, using default');
  }

  // Post poll
  await page.click(SELECTORS.tweetButton);
  await sleep(3000);

  return {
    success: true,
    question,
    choices,
    duration: `${durationDays}d ${durationHours}h ${durationMinutes}m`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get poll results from a tweet
 * @param {import('puppeteer').Page} page
 * @param {string} tweetUrl - URL of the poll tweet
 * @returns {Promise<Object>}
 */
export async function getPollResults(page, tweetUrl) {
  await page.goto(tweetUrl, { waitUntil: 'networkidle2' });
  await sleep(3000);

  const results = await page.evaluate(() => {
    const poll = document.querySelector('[data-testid="pollResults"], [role="group"]');
    if (!poll) return null;

    const options = [];
    poll.querySelectorAll('[role="radio"], [data-testid*="pollOption"]').forEach(opt => {
      const text = opt.textContent || '';
      const percentage = opt.querySelector('[data-testid="pollPercentage"]')?.textContent || '';
      options.push({ text: text.trim(), percentage });
    });

    const totalVotes = poll.querySelector('[data-testid="pollTotalVotes"]')?.textContent || '';
    const timeRemaining = poll.querySelector('[data-testid="pollTimeRemaining"]')?.textContent || '';

    return { options, totalVotes, timeRemaining };
  });

  return {
    url: tweetUrl,
    results: results || { error: 'Poll not found or not accessible' },
    scrapedAt: new Date().toISOString(),
  };
}

export default {
  createPoll,
  getPollResults,
  SELECTORS,
};
