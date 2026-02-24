// src/spacesManager.js
// Spaces, Live Streams, and Events management for X/Twitter
// by nichxbt

/**
 * Spaces Manager - Live audio/video, events, and Circles
 * 
 * Features:
 * - Scrape live and scheduled Spaces
 * - Monitor Space metadata (speakers, listeners)
 * - Create and schedule Spaces
 * - Event creation and management
 * - Circle management
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SELECTORS = {
  spacesNav: 'a[href*="/spaces"]',
  startSpace: '[data-testid="SpaceButton"]',
  joinSpace: '[data-testid="joinSpace"]',
  spaceSpeakers: '[data-testid="spaceSpeakers"]',
  spaceListeners: '[data-testid="spaceListeners"]',
  spaceRecording: '[data-testid="spaceRecording"]',
  scheduleSpace: '[data-testid="scheduleSpace"]',
  spaceTopic: '[data-testid="spaceTopic"]',
  spaceTitle: '[data-testid="spaceTitle"]',
};

/**
 * Get live Spaces
 * @param {import('puppeteer').Page} page
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function getLiveSpaces(page, options = {}) {
  const { query = '', limit = 20 } = options;

  const url = query
    ? `https://x.com/search?q=${encodeURIComponent(query)}&f=live_spaces`
    : 'https://x.com/i/spaces';
  
  await page.goto(url, { waitUntil: 'networkidle2' });
  await sleep(3000);

  const spaces = await page.evaluate((max) => {
    const items = [];
    document.querySelectorAll('[data-testid="SpaceCard"], [data-testid="space"]').forEach(card => {
      items.push({
        title: card.querySelector('[data-testid="spaceTitle"]')?.textContent || '',
        host: card.querySelector('[data-testid="spaceHost"]')?.textContent || '',
        listeners: card.querySelector('[data-testid="spaceListeners"]')?.textContent || '0',
        speakers: card.querySelector('[data-testid="spaceSpeakers"]')?.textContent || '0',
        topic: card.querySelector('[data-testid="spaceTopic"]')?.textContent || '',
        link: card.querySelector('a')?.href || '',
        isLive: true,
      });
    });
    return items.slice(0, max);
  }, limit);

  return {
    spaces,
    count: spaces.length,
    query,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Get scheduled Spaces
 * @param {import('puppeteer').Page} page
 * @param {string} username
 * @returns {Promise<Object>}
 */
export async function getScheduledSpaces(page, username) {
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await sleep(2000);

  const scheduled = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('[data-testid="scheduledSpace"]').forEach(el => {
      items.push({
        title: el.querySelector('[data-testid="spaceTitle"]')?.textContent || '',
        scheduledFor: el.querySelector('time')?.getAttribute('datetime') || '',
        link: el.querySelector('a')?.href || '',
      });
    });
    return items;
  });

  return {
    username,
    scheduledSpaces: scheduled,
    count: scheduled.length,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Scrape Space metadata
 * @param {import('puppeteer').Page} page
 * @param {string} spaceUrl
 * @returns {Promise<Object>}
 */
export async function scrapeSpace(page, spaceUrl) {
  await page.goto(spaceUrl, { waitUntil: 'networkidle2' });
  await sleep(5000);

  const metadata = await page.evaluate((sel) => {
    return {
      title: document.querySelector(sel.spaceTitle)?.textContent || '',
      topic: document.querySelector(sel.spaceTopic)?.textContent || '',
      speakers: document.querySelector(sel.spaceSpeakers)?.textContent || '0',
      listeners: document.querySelector(sel.spaceListeners)?.textContent || '0',
      isRecording: !!document.querySelector(sel.spaceRecording),
      participantList: Array.from(document.querySelectorAll('[data-testid="UserCell"]')).map(u =>
        u.querySelector('[dir="ltr"]')?.textContent || ''
      ),
    };
  }, SELECTORS);

  return {
    url: spaceUrl,
    ...metadata,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Create an event
 * @param {import('puppeteer').Page} page
 * @param {Object} event - { title, description, date, time, location? }
 * @returns {Promise<Object>}
 */
export async function createEvent(page, event) {
  const { title, description, date, time, location = '' } = event;

  // X Events are typically created through Communities or Spaces
  await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Post event announcement
  const eventText = [
    `📅 ${title}`,
    '',
    description,
    '',
    `🗓 ${date} at ${time}`,
    location ? `📍 ${location}` : '',
    '',
    '#event',
  ].filter(Boolean).join('\n');

  await page.click('[data-testid="tweetTextarea_0"]');
  await page.keyboard.type(eventText, { delay: 20 });
  await sleep(500);

  await page.click('[data-testid="tweetButton"]');
  await sleep(3000);

  return {
    success: true,
    event: { title, date, time, location },
    timestamp: new Date().toISOString(),
  };
}

export default {
  getLiveSpaces,
  getScheduledSpaces,
  scrapeSpace,
  createEvent,
  SELECTORS,
};
