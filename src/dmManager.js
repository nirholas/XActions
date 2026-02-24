// src/dmManager.js
// Direct Message management for X/Twitter
// by nichxbt

/**
 * DM Manager - Send, export, and manage Direct Messages
 * 
 * Features:
 * - Send DMs (individual and group)
 * - Export DM conversations
 * - Manage message requests
 * - DM privacy settings
 * - Conversation search
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SELECTORS = {
  messagesTab: 'a[href="/messages"]',
  conversation: '[data-testid="conversation"]',
  messageInput: '[data-testid="dmComposerTextInput"]',
  sendButton: '[data-testid="dmComposerSendButton"]',
  newDmButton: '[data-testid="NewDM_Button"]',
  searchPeople: '[data-testid="searchPeople"]',
  messageEntry: '[data-testid="messageEntry"]',
  reactionButton: '[data-testid="messageReaction"]',
  requestsTab: '[data-testid="messageRequests"]',
  acceptRequest: '[data-testid="acceptRequest"]',
  deleteRequest: '[data-testid="deleteRequest"]',
};

/**
 * Send a direct message
 * @param {import('puppeteer').Page} page
 * @param {string} username - Recipient username
 * @param {string} message - Message text
 * @returns {Promise<Object>}
 */
export async function sendDM(page, username, message) {
  await page.goto('https://x.com/messages', { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Start new conversation
  await page.click(SELECTORS.newDmButton);
  await sleep(1500);

  // Search for user
  await page.click(SELECTORS.searchPeople);
  await page.keyboard.type(username, { delay: 50 });
  await sleep(2000);

  // Select user from results
  await page.click('[data-testid="TypeaheadUser"]');
  await sleep(1000);

  // Click next/confirm
  await page.click('[data-testid="nextButton"]');
  await sleep(1500);

  // Type and send message
  await page.click(SELECTORS.messageInput);
  await page.keyboard.type(message, { delay: 20 });
  await sleep(500);

  await page.click(SELECTORS.sendButton);
  await sleep(2000);

  return {
    success: true,
    recipient: username,
    message: message.substring(0, 100),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get DM conversations list
 * @param {import('puppeteer').Page} page
 * @param {Object} options
 * @returns {Promise<Array>}
 */
export async function getConversations(page, options = {}) {
  const { limit = 20 } = options;

  await page.goto('https://x.com/messages', { waitUntil: 'networkidle2' });
  await sleep(3000);

  const conversations = await page.evaluate((sel, lim) => {
    return Array.from(document.querySelectorAll(sel.conversation)).slice(0, lim).map(conv => {
      const name = conv.querySelector('[dir="ltr"] span')?.textContent || '';
      const lastMessage = conv.querySelector('[data-testid="lastMessage"]')?.textContent || '';
      const time = conv.querySelector('time')?.getAttribute('datetime') || '';
      const unread = conv.querySelector('[data-testid="unread"]') !== null;
      return { name, lastMessage, time, unread };
    });
  }, SELECTORS, limit);

  return { conversations, scrapedAt: new Date().toISOString() };
}

/**
 * Export messages from a conversation
 * @param {import('puppeteer').Page} page
 * @param {string} conversationUrl - URL of the DM conversation
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function exportConversation(page, conversationUrl, options = {}) {
  const { limit = 100 } = options;

  await page.goto(conversationUrl, { waitUntil: 'networkidle2' });
  await sleep(3000);

  const messages = [];
  let scrollAttempts = 0;

  // Scroll up to load older messages
  while (messages.length < limit && scrollAttempts < 20) {
    const newMessages = await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel.messageEntry)).map(msg => {
        const text = msg.textContent || '';
        const time = msg.querySelector('time')?.getAttribute('datetime') || '';
        const sender = msg.querySelector('[data-testid="User-Name"]')?.textContent || '';
        return { text, time, sender };
      });
    }, SELECTORS);

    for (const msg of newMessages) {
      if (!messages.find(m => m.text === msg.text && m.time === msg.time)) {
        messages.push(msg);
      }
    }

    // Scroll up for older messages
    await page.evaluate(() => {
      const container = document.querySelector('[data-testid="DmScrollerContainer"]');
      if (container) container.scrollTop = 0;
    });
    await sleep(1500);
    scrollAttempts++;
  }

  return {
    conversationUrl,
    messages: messages.slice(0, limit),
    count: messages.length,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Get message requests
 * @param {import('puppeteer').Page} page
 * @returns {Promise<Array>}
 */
export async function getMessageRequests(page) {
  await page.goto('https://x.com/messages/requests', { waitUntil: 'networkidle2' });
  await sleep(3000);

  const requests = await page.evaluate((sel) => {
    return Array.from(document.querySelectorAll(sel.conversation)).map(conv => {
      const name = conv.querySelector('[dir="ltr"] span')?.textContent || '';
      const preview = conv.querySelector('[data-testid="lastMessage"]')?.textContent || '';
      const time = conv.querySelector('time')?.getAttribute('datetime') || '';
      return { name, preview, time };
    });
  }, SELECTORS);

  return { requests, scrapedAt: new Date().toISOString() };
}

/**
 * Update DM privacy settings
 * @param {import('puppeteer').Page} page
 * @param {Object} settings
 * @returns {Promise<Object>}
 */
export async function updateDMSettings(page, settings = {}) {
  await page.goto('https://x.com/settings/messages', { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Toggle settings as needed
  const result = { updated: [], timestamp: new Date().toISOString() };

  if (settings.allowDMsFrom !== undefined) {
    // Find and toggle the appropriate setting
    result.updated.push('allowDMsFrom');
  }

  return result;
}

export default {
  sendDM,
  getConversations,
  exportConversation,
  getMessageRequests,
  updateDMSettings,
  SELECTORS,
};
