// src/grokIntegration.js
// Grok AI integration for X/Twitter
// by nichxbt

/**
 * Grok Integration - Interact with Grok AI features
 * 
 * Features:
 * - Send queries to Grok
 * - Image generation (Premium+)
 * - Content summarization
 * - Post analysis and ranking prediction
 * - Topic summaries (2026)
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SELECTORS = {
  grokNav: 'a[href="/i/grok"]',
  chatInput: '[data-testid="grokInput"]',
  sendButton: '[data-testid="grokSendButton"]',
  responseArea: '[data-testid="grokResponse"]',
  newChat: '[data-testid="grokNewChat"]',
  imageGen: '[data-testid="grokImageGen"]',
  chatHistory: '[data-testid="grokChatHistory"]',
  responseText: '[data-testid="grokResponseText"]',
};

/**
 * Send a query to Grok AI
 * @param {import('puppeteer').Page} page
 * @param {string} query - The question/prompt for Grok
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function queryGrok(page, query, options = {}) {
  const { newChat = true, waitTime = 15000 } = options;

  await page.goto('https://x.com/i/grok', { waitUntil: 'networkidle2' });
  await sleep(3000);

  if (newChat) {
    try {
      await page.click(SELECTORS.newChat);
      await sleep(1000);
    } catch (e) {
      // New chat button may not be visible if already in new chat
    }
  }

  // Type query
  await page.click(SELECTORS.chatInput);
  await page.keyboard.type(query, { delay: 20 });
  await sleep(500);

  // Send
  await page.click(SELECTORS.sendButton);

  // Wait for response
  await sleep(waitTime);

  // Extract response
  const response = await page.evaluate((sel) => {
    const responses = document.querySelectorAll(sel.responseText || sel.responseArea);
    if (responses.length === 0) return null;
    const lastResponse = responses[responses.length - 1];
    return lastResponse?.textContent?.trim() || null;
  }, SELECTORS);

  return {
    success: !!response,
    query,
    response: response || 'No response received (try increasing waitTime)',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate an image with Grok AI (Premium+ required)
 * @param {import('puppeteer').Page} page
 * @param {string} prompt - Image generation prompt
 * @returns {Promise<Object>}
 */
export async function generateImage(page, prompt) {
  await page.goto('https://x.com/i/grok', { waitUntil: 'networkidle2' });
  await sleep(3000);

  // Start new chat
  try {
    await page.click(SELECTORS.newChat);
    await sleep(1000);
  } catch (e) {}

  // Type image generation prompt
  const imagePrompt = `Generate an image: ${prompt}`;
  await page.click(SELECTORS.chatInput);
  await page.keyboard.type(imagePrompt, { delay: 20 });
  await sleep(500);

  await page.click(SELECTORS.sendButton);
  await sleep(20000); // Image generation takes longer

  // Try to extract image URL
  const result = await page.evaluate(() => {
    const images = document.querySelectorAll('img[src*="grok"]');
    if (images.length > 0) {
      const lastImg = images[images.length - 1];
      return { imageUrl: lastImg.src, alt: lastImg.alt };
    }
    return null;
  });

  return {
    success: !!result,
    prompt,
    ...(result || { error: 'Image generation failed or Premium+ required' }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Summarize a topic or thread using Grok
 * @param {import('puppeteer').Page} page
 * @param {string} topic - Topic or thread URL to summarize
 * @returns {Promise<Object>}
 */
export async function summarize(page, topic) {
  const prompt = topic.startsWith('http')
    ? `Summarize this thread/post: ${topic}`
    : `Summarize the latest discussion about: ${topic}`;

  return queryGrok(page, prompt, { waitTime: 20000 });
}

/**
 * Analyze a post's potential performance
 * @param {import('puppeteer').Page} page
 * @param {string} postText - The post text to analyze
 * @returns {Promise<Object>}
 */
export async function analyzePost(page, postText) {
  const prompt = `Analyze this X/Twitter post for potential engagement and reach. Rate it 1-10 and suggest improvements:\n\n"${postText}"`;
  return queryGrok(page, prompt, { waitTime: 15000 });
}

export default {
  queryGrok,
  generateImage,
  summarize,
  analyzePost,
  SELECTORS,
};
