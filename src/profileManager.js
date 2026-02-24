// src/profileManager.js
// Profile management automation for X/Twitter
// by nichxbt

/**
 * Profile Manager - Automate profile updates and management
 * 
 * Features:
 * - Update display name, bio, location, website
 * - Change profile picture and header image
 * - Manage verification and labels
 * - Filter posts by latest/most liked (2026)
 * - Generate QR codes
 * - Sync contacts
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================================================
// Selectors
// ============================================================================

const SELECTORS = {
  editProfileButton: '[data-testid="editProfileButton"]',
  nameInput: 'input[name="displayName"]',
  bioTextarea: 'textarea[name="description"]',
  locationInput: 'input[name="location"]',
  websiteInput: 'input[name="url"]',
  saveButton: '[data-testid="Profile_Save_Button"]',
  avatarEdit: '[data-testid="editProfileAvatar"]',
  headerEdit: '[data-testid="editProfileHeader"]',
  verificationBadge: '[data-testid="icon-verified"]',
  followerCount: 'a[href$="/followers"] span',
  followingCount: 'a[href$="/following"] span',
  profileName: '[data-testid="UserName"]',
  profileBio: '[data-testid="UserDescription"]',
  profileLocation: '[data-testid="UserLocation"]',
  profileUrl: '[data-testid="UserUrl"]',
  profileJoinDate: '[data-testid="UserJoinDate"]',
  postFilterLatest: '[data-testid="sortByLatest"]',
  postFilterLiked: '[data-testid="sortByLiked"]',
};

// ============================================================================
// Profile Reading
// ============================================================================

/**
 * Scrape detailed profile information
 * @param {import('puppeteer').Page} page - Puppeteer page
 * @param {string} username - Twitter username (without @)
 * @returns {Promise<Object>} Profile data
 */
export async function getProfile(page, username) {
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await sleep(2000);

  const profile = await page.evaluate((sel) => {
    const getText = (s) => document.querySelector(s)?.textContent?.trim() || null;
    const getAttr = (s, attr) => document.querySelector(s)?.getAttribute(attr) || null;

    return {
      name: getText(sel.profileName),
      bio: getText(sel.profileBio),
      location: getText(sel.profileLocation),
      website: getText(sel.profileUrl),
      joinDate: getText(sel.profileJoinDate),
      isVerified: !!document.querySelector(sel.verificationBadge),
      followers: getText(sel.followerCount),
      following: getText(sel.followingCount),
      avatarUrl: getAttr('img[alt="Opens profile photo"]', 'src'),
    };
  }, SELECTORS);

  return { username, ...profile, scrapedAt: new Date().toISOString() };
}

/**
 * Filter a user's posts by latest or most liked (2026 feature)
 * @param {import('puppeteer').Page} page
 * @param {string} username
 * @param {string} sort - 'latest' or 'most_liked'
 * @param {Object} options
 * @returns {Promise<Array>} Sorted posts
 */
export async function filterPosts(page, username, sort = 'latest', options = {}) {
  const { limit = 50, type = 'all' } = options;
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Click sort filter if available
  const sortSelector = sort === 'most_liked' ? SELECTORS.postFilterLiked : SELECTORS.postFilterLatest;
  try {
    await page.click(sortSelector);
    await sleep(1500);
  } catch (e) {
    console.log(`⚠️ Sort filter not available, using default order`);
  }

  const posts = [];
  let scrollAttempts = 0;
  const maxScrolls = Math.ceil(limit / 5);

  while (posts.length < limit && scrollAttempts < maxScrolls) {
    const newPosts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('article[data-testid="tweet"]')).map(tweet => {
        const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
        const likes = tweet.querySelector('[data-testid="like"] span')?.textContent || '0';
        const reposts = tweet.querySelector('[data-testid="retweet"] span')?.textContent || '0';
        const replies = tweet.querySelector('[data-testid="reply"] span')?.textContent || '0';
        const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
        return { text, time, likes, reposts, replies, link };
      });
    });

    for (const post of newPosts) {
      if (!posts.find(p => p.link === post.link)) {
        posts.push(post);
      }
    }

    await page.evaluate(() => window.scrollBy(0, 1000));
    await sleep(1500);
    scrollAttempts++;
  }

  return posts.slice(0, limit);
}

// ============================================================================
// Profile Updating
// ============================================================================

/**
 * Update profile fields
 * @param {import('puppeteer').Page} page
 * @param {Object} updates - Fields to update { name, bio, location, website }
 * @returns {Promise<Object>} Update result
 */
export async function updateProfile(page, updates = {}) {
  await page.goto('https://x.com/settings/profile', { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Click edit profile
  try {
    await page.click(SELECTORS.editProfileButton);
    await sleep(1500);
  } catch (e) {
    // May already be in edit mode on settings/profile
  }

  const fieldUpdated = [];

  if (updates.name) {
    const nameInput = await page.$(SELECTORS.nameInput);
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type(updates.name);
      fieldUpdated.push('name');
    }
  }

  if (updates.bio) {
    const bioInput = await page.$(SELECTORS.bioTextarea);
    if (bioInput) {
      await bioInput.click({ clickCount: 3 });
      await bioInput.type(updates.bio);
      fieldUpdated.push('bio');
    }
  }

  if (updates.location) {
    const locInput = await page.$(SELECTORS.locationInput);
    if (locInput) {
      await locInput.click({ clickCount: 3 });
      await locInput.type(updates.location);
      fieldUpdated.push('location');
    }
  }

  if (updates.website) {
    const urlInput = await page.$(SELECTORS.websiteInput);
    if (urlInput) {
      await urlInput.click({ clickCount: 3 });
      await urlInput.type(updates.website);
      fieldUpdated.push('website');
    }
  }

  // Save changes
  if (fieldUpdated.length > 0) {
    await page.click(SELECTORS.saveButton);
    await sleep(2000);
  }

  return {
    success: fieldUpdated.length > 0,
    updated: fieldUpdated,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Upload profile picture
 * @param {import('puppeteer').Page} page
 * @param {string} imagePath - Local path to image file
 */
export async function uploadAvatar(page, imagePath) {
  await page.goto('https://x.com/settings/profile', { waitUntil: 'networkidle2' });
  await sleep(2000);

  try {
    await page.click(SELECTORS.editProfileButton);
    await sleep(1500);
  } catch (e) {}

  const avatarButton = await page.$(SELECTORS.avatarEdit);
  if (avatarButton) {
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      avatarButton.click(),
    ]);
    await fileChooser.accept([imagePath]);
    await sleep(2000);
    await page.click(SELECTORS.saveButton);
    await sleep(2000);
    return { success: true, field: 'avatar' };
  }
  return { success: false, error: 'Avatar edit button not found' };
}

/**
 * Upload header/banner image
 * @param {import('puppeteer').Page} page
 * @param {string} imagePath
 */
export async function uploadHeader(page, imagePath) {
  await page.goto('https://x.com/settings/profile', { waitUntil: 'networkidle2' });
  await sleep(2000);

  try {
    await page.click(SELECTORS.editProfileButton);
    await sleep(1500);
  } catch (e) {}

  const headerButton = await page.$(SELECTORS.headerEdit);
  if (headerButton) {
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      headerButton.click(),
    ]);
    await fileChooser.accept([imagePath]);
    await sleep(2000);
    await page.click(SELECTORS.saveButton);
    await sleep(2000);
    return { success: true, field: 'header' };
  }
  return { success: false, error: 'Header edit button not found' };
}

export default {
  getProfile,
  filterPosts,
  updateProfile,
  uploadAvatar,
  uploadHeader,
  SELECTORS,
};
