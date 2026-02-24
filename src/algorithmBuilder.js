/**
 * XActions Algorithm Builder
 * 
 * 24/7 automated account growth engine powered by Puppeteer + LLM.
 * Builds up your X/Twitter algorithm and persona by:
 * - Searching niche topics and scrolling through results
 * - Liking, commenting, and following relevant accounts
 * - Creating original posts in your persona's voice
 * - Visiting profiles, checking notifications, browsing timeline
 * - Maintaining human-like activity patterns with sleep cycles
 * 
 * Everything is driven by a Persona config (see personaEngine.js).
 * LLM generates all comments and posts via OpenRouter.
 * 
 * Usage:
 *   import { startAlgorithmBuilder } from './algorithmBuilder.js';
 *   await startAlgorithmBuilder({ personaId: 'my_persona', authToken: '...' });
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import {
  loadPersona,
  savePersona,
  buildPersonaSystemPrompt,
  buildCommentPrompt,
  buildPostPrompt,
  shouldBeActive,
  getSessionDuration,
  getDelayUntilNextSession,
  planSession,
} from './personaEngine.js';

import {
  createBrowser,
  createPage,
  loginWithCookie,
} from './scrapers/index.js';

// ============================================================================
// Configuration
// ============================================================================

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const TIMING = {
  // Human-like delays with jitter
  BETWEEN_ACTIONS: { min: 2000, max: 5000 },
  SCROLL_PAUSE: { min: 1500, max: 4000 },
  READ_TIME: { min: 2000, max: 8000 },
  TYPE_DELAY: { min: 30, max: 100 },  // per character
  BEFORE_CLICK: { min: 300, max: 1000 },
  PAGE_LOAD: { min: 3000, max: 6000 },
  SEARCH_PAUSE: { min: 2000, max: 5000 },
  LONG_BREAK: { min: 30000, max: 120000 },  // occasional longer pauses
};

const SELECTORS = {
  // Tweet elements
  tweet: 'article[data-testid="tweet"]',
  tweetText: '[data-testid="tweetText"]',
  likeButton: '[data-testid="like"]',
  unlikeButton: '[data-testid="unlike"]',
  replyButton: '[data-testid="reply"]',
  retweetButton: '[data-testid="retweet"]',
  bookmarkButton: '[data-testid="bookmark"]',

  // User elements
  userCell: '[data-testid="UserCell"]',
  followButton: '[data-testid$="-follow"]',
  userAvatar: '[data-testid="UserAvatar"]',

  // Compose
  tweetTextarea: '[data-testid="tweetTextarea_0"]',
  tweetButton: '[data-testid="tweetButton"]',
  replyTextarea: '[data-testid="tweetTextarea_0"]',

  // Navigation
  searchInput: '[data-testid="SearchBox_Search_Input"]',
  searchTab: 'a[href*="/search?"]',
  topTab: 'a[role="tab"]:first-child',
  latestTab: 'a[role="tab"]:nth-child(2)',

  // Profile
  profileBio: '[data-testid="UserDescription"]',
  followersCount: 'a[href$="/followers"] span span',
  followingCount: 'a[href$="/following"] span span',

  // Misc
  confirmButton: '[data-testid="confirmationSheetConfirm"]',
  backButton: '[data-testid="app-bar-back"]',
  primaryColumn: '[data-testid="primaryColumn"]',
  timeline: 'section[role="region"]',
};

// ============================================================================
// Utility Functions
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}

function randomDelay(timing) {
  return sleep(randomBetween(timing.min, timing.max));
}

function log(emoji, message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${emoji} [${timestamp}] ${message}`);
}

/**
 * Human-like mouse movement simulation
 */
async function humanClick(page, element) {
  try {
    await randomDelay(TIMING.BEFORE_CLICK);
    const box = await element.boundingBox();
    if (!box) return false;

    // Move to element with slight offset (humans don't click exact center)
    const x = box.x + box.width * (0.3 + Math.random() * 0.4);
    const y = box.y + box.height * (0.3 + Math.random() * 0.4);

    await page.mouse.move(x, y, { steps: randomBetween(5, 15) });
    await sleep(randomBetween(50, 200));
    await page.mouse.click(x, y);
    return true;
  } catch {
    return false;
  }
}

/**
 * Human-like typing with variable speed
 */
async function humanType(page, selector, text) {
  try {
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.focus(selector);
    await sleep(randomBetween(200, 500));

    for (const char of text) {
      await page.keyboard.type(char, {
        delay: randomBetween(TIMING.TYPE_DELAY.min, TIMING.TYPE_DELAY.max),
      });
      // Occasional longer pause (simulates thinking)
      if (Math.random() < 0.05) {
        await sleep(randomBetween(300, 800));
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Human-like scrolling with variable speed and pauses
 */
async function humanScroll(page, options = {}) {
  const scrolls = options.scrolls || randomBetween(3, 8);
  const direction = options.direction || 'down';

  for (let i = 0; i < scrolls; i++) {
    const distance = randomBetween(200, 600) * (direction === 'up' ? -1 : 1);
    await page.evaluate((d) => window.scrollBy(0, d), distance);
    await randomDelay(TIMING.SCROLL_PAUSE);

    // Sometimes pause longer to "read" content
    if (Math.random() < 0.3) {
      await randomDelay(TIMING.READ_TIME);
    }
  }
}

// ============================================================================
// LLM Integration
// ============================================================================

/**
 * Call OpenRouter for text generation
 */
async function callLLM(messages, persona) {
  const apiKey = persona.llm.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    log('⚠️', 'No OpenRouter API key — skipping LLM generation');
    return null;
  }

  const model = persona.llm.models.comment;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://xactions.app',
        'X-Title': 'XActions Algorithm Builder',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: persona.llm.temperature,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      log('❌', `LLM error: ${err.slice(0, 100)}`);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    log('❌', `LLM request failed: ${err.message}`);
    return null;
  }
}

/**
 * Generate a comment for a tweet using persona's voice
 */
async function generateComment(tweetText, tweetAuthor, persona) {
  const systemPrompt = buildPersonaSystemPrompt(persona);
  const userPrompt = buildCommentPrompt(persona, tweetText, tweetAuthor);

  const content = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], persona);

  if (!content) return null;

  // Clean the response — remove quotes, labels
  return content
    .replace(/^["']|["']$/g, '')
    .replace(/^(reply|comment|response):\s*/i, '')
    .trim();
}

/**
 * Generate an original post using persona's voice
 */
async function generatePost(persona, context = {}) {
  const systemPrompt = buildPersonaSystemPrompt(persona);
  const userPrompt = buildPostPrompt(persona, context);

  const content = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], persona);

  if (!content) return null;

  return content
    .replace(/^["']|["']$/g, '')
    .trim();
}

// ============================================================================
// Page Actions — Individual browser automation tasks
// ============================================================================

/**
 * Extract visible tweets from the current page
 */
async function extractVisibleTweets(page) {
  return page.evaluate((sel) => {
    const tweets = document.querySelectorAll(sel.tweet);
    return Array.from(tweets).slice(0, 20).map(tweet => {
      const textEl = tweet.querySelector(sel.tweetText);
      const text = textEl?.textContent || '';

      // Extract author from the tweet
      const links = tweet.querySelectorAll('a[role="link"]');
      let author = '';
      for (const link of links) {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/') && !href.includes('/status/') && href.split('/').length === 2) {
          author = href.slice(1);
          break;
        }
      }

      // Check if already liked
      const isLiked = !!tweet.querySelector(sel.unlikeButton);

      // Get metrics
      const likeBtn = tweet.querySelector(sel.likeButton) || tweet.querySelector(sel.unlikeButton);
      const likes = parseInt(likeBtn?.getAttribute('aria-label')?.match(/\d+/)?.[0] || '0');

      return { text, author, isLiked, likes, index: Array.from(tweets).indexOf(tweet) };
    }).filter(t => t.text.length > 10);
  }, SELECTORS);
}

/**
 * Extract visible user cells from the current page
 */
async function extractVisibleUsers(page) {
  return page.evaluate((sel) => {
    const cells = document.querySelectorAll(sel.userCell);
    return Array.from(cells).slice(0, 15).map(cell => {
      const links = cell.querySelectorAll('a[role="link"]');
      let username = '';
      for (const link of links) {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/') && href.split('/').length === 2) {
          username = href.slice(1);
          break;
        }
      }
      const bio = cell.querySelector('[data-testid="UserDescription"]')?.textContent || '';
      const hasFollowButton = !!cell.querySelector('[data-testid$="-follow"]');
      return { username, bio, hasFollowButton };
    }).filter(u => u.username);
  }, SELECTORS);
}

/**
 * Search for a term on X
 */
async function doSearch(page, term, tab = 'top') {
  log('🔍', `Searching: "${term}" (${tab})`);
  try {
    await page.goto(`https://x.com/search?q=${encodeURIComponent(term)}&src=typed_query&f=${tab === 'latest' ? 'live' : 'top'}`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await randomDelay(TIMING.PAGE_LOAD);
    await humanScroll(page, { scrolls: randomBetween(2, 5) });
    return true;
  } catch (err) {
    log('⚠️', `Search failed: ${err.message}`);
    return false;
  }
}

/**
 * Browse home timeline
 */
async function browseHome(page) {
  log('🏠', 'Browsing home timeline');
  try {
    await page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(TIMING.PAGE_LOAD);
    await humanScroll(page, { scrolls: randomBetween(3, 8) });
    return true;
  } catch (err) {
    log('⚠️', `Home browse failed: ${err.message}`);
    return false;
  }
}

/**
 * Like a tweet on the current page
 */
async function likeTweet(page, tweetIndex = null) {
  try {
    const likeButtons = await page.$$(SELECTORS.likeButton);
    if (likeButtons.length === 0) return false;

    const idx = tweetIndex ?? randomBetween(0, Math.min(likeButtons.length - 1, 5));
    const btn = likeButtons[idx];
    if (!btn) return false;

    // Get tweet info for logging
    const tweets = await extractVisibleTweets(page);
    const tweet = tweets[idx];

    const clicked = await humanClick(page, btn);
    if (clicked) {
      log('❤️', `Liked tweet by @${tweet?.author || 'unknown'}: "${(tweet?.text || '').slice(0, 60)}..."`);
    }
    await randomDelay(TIMING.BETWEEN_ACTIONS);
    return clicked;
  } catch {
    return false;
  }
}

/**
 * Follow a user on the current page
 */
async function followUser(page, persona, username = null) {
  try {
    if (username) {
      // Navigate to specific user's profile
      await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2', timeout: 30000 });
      await randomDelay(TIMING.PAGE_LOAD);
    }

    const followButtons = await page.$$(SELECTORS.followButton);
    if (followButtons.length === 0) return null;

    const btn = followButtons[0];
    const clicked = await humanClick(page, btn);

    if (clicked) {
      const followed = username || 'user';
      log('➕', `Followed @${followed}`);

      // Track in persona state
      persona.state.followedUsers[followed] = {
        followedAt: new Date().toISOString(),
        unfollowed: false,
      };
    }

    await randomDelay(TIMING.BETWEEN_ACTIONS);
    return clicked ? username : null;
  } catch {
    return null;
  }
}

/**
 * Comment on a tweet using LLM-generated text
 */
async function commentOnTweet(page, persona, tweet) {
  if (!tweet?.text || !tweet?.author) return false;

  // Generate a comment
  const comment = await generateComment(tweet.text, tweet.author, persona);
  if (!comment) {
    log('⚠️', 'Could not generate comment, skipping');
    return false;
  }

  log('💬', `Commenting on @${tweet.author}: "${comment.slice(0, 80)}..."`);

  try {
    // Find and click reply button on the tweet
    const tweets = await page.$$(SELECTORS.tweet);
    if (!tweets[tweet.index]) return false;

    const replyBtn = await tweets[tweet.index].$(SELECTORS.replyButton);
    if (!replyBtn) return false;

    await humanClick(page, replyBtn);
    await sleep(randomBetween(1500, 3000));

    // Type the comment
    const typed = await humanType(page, SELECTORS.replyTextarea, comment);
    if (!typed) return false;

    await sleep(randomBetween(500, 1500));

    // Click the reply/post button
    const postBtn = await page.$(SELECTORS.tweetButton);
    if (postBtn) {
      await humanClick(page, postBtn);
      log('✅', 'Comment posted');
      await randomDelay(TIMING.BETWEEN_ACTIONS);
      return true;
    }
    return false;
  } catch (err) {
    log('⚠️', `Comment failed: ${err.message}`);
    return false;
  }
}

/**
 * Create an original post using LLM
 */
async function createPost(page, persona) {
  const postText = await generatePost(persona);
  if (!postText) {
    log('⚠️', 'Could not generate post, skipping');
    return false;
  }

  log('✍️', `Creating post: "${postText.slice(0, 80)}..."`);

  try {
    // Navigate to compose
    await page.goto('https://x.com/compose/post', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(randomBetween(1500, 3000));

    // Type the post with human-like speed
    const typed = await humanType(page, SELECTORS.tweetTextarea, postText);
    if (!typed) return false;

    // Pause like you're re-reading what you wrote
    await sleep(randomBetween(2000, 5000));

    // Click post button
    const postBtn = await page.$(SELECTORS.tweetButton);
    if (postBtn) {
      await humanClick(page, postBtn);
      log('🚀', 'Post published!');
      persona.state.lastPostAt = new Date().toISOString();
      await randomDelay(TIMING.BETWEEN_ACTIONS);
      return true;
    }
    return false;
  } catch (err) {
    log('⚠️', `Post failed: ${err.message}`);
    return false;
  }
}

/**
 * Visit a user's profile and browse it
 */
async function visitProfile(page, username) {
  log('👤', `Visiting @${username}'s profile`);
  try {
    await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(TIMING.PAGE_LOAD);

    // Scroll through their tweets like a human would
    await humanScroll(page, { scrolls: randomBetween(2, 6) });

    // Sometimes read the bio
    if (Math.random() < 0.5) {
      await sleep(randomBetween(1000, 3000));
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Check own profile (natural behavior)
 */
async function checkOwnProfile(page) {
  log('🪞', 'Checking own profile');
  try {
    // Click profile link in sidebar or navigate
    await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
    await sleep(1000);

    // Look for profile link in nav
    const profileLink = await page.$('a[data-testid="AppTabBar_Profile_Link"]');
    if (profileLink) {
      await humanClick(page, profileLink);
      await randomDelay(TIMING.PAGE_LOAD);
      await humanScroll(page, { scrolls: randomBetween(1, 3) });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check notifications
 */
async function checkNotifications(page) {
  log('🔔', 'Checking notifications');
  try {
    await page.goto('https://x.com/notifications', { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(TIMING.PAGE_LOAD);
    await humanScroll(page, { scrolls: randomBetween(1, 4) });
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Session Runner — Executes planned activities
// ============================================================================

/**
 * Run a single session with the given activity plan
 */
async function runSession(page, persona, plan) {
  const startTime = Date.now();
  const maxDuration = plan.duration * 60 * 1000;
  const stats = {
    searches: 0,
    likes: 0,
    follows: 0,
    comments: 0,
    posts: 0,
    profileVisits: 0,
    errors: 0,
  };

  log('🎬', `Starting session — ${plan.activities.length} activities planned, ~${plan.duration}min`);

  // Collect tweets and users as we browse
  let collectedTweets = [];
  let collectedUsers = [];
  let tweetCursor = 0;
  let userCursor = 0;

  for (const activity of plan.activities) {
    // Check time limit
    if (Date.now() - startTime > maxDuration) {
      log('⏰', 'Session time limit reached');
      break;
    }

    try {
      switch (activity.type) {
        case 'search': {
          const searched = await doSearch(page, activity.term, activity.tab);
          if (searched) {
            stats.searches++;
            // Collect tweets and users from search results
            const newTweets = await extractVisibleTweets(page);
            const newUsers = await extractVisibleUsers(page);
            collectedTweets.push(...newTweets.filter(t => !persona.state.engagedPosts.has(t.text.slice(0, 50))));
            collectedUsers.push(...newUsers);
          }
          break;
        }

        case 'browse_home': {
          await browseHome(page);
          const newTweets = await extractVisibleTweets(page);
          collectedTweets.push(...newTweets.filter(t => !persona.state.engagedPosts.has(t.text.slice(0, 50))));
          break;
        }

        case 'like': {
          // First make sure we have tweets to like
          if (collectedTweets.length === 0) {
            await browseHome(page);
            collectedTweets = await extractVisibleTweets(page);
          }

          // Like a tweet on the current page
          const liked = await likeTweet(page);
          if (liked) {
            stats.likes++;
            // Mark as engaged
            if (collectedTweets[tweetCursor]) {
              persona.state.engagedPosts.add(collectedTweets[tweetCursor].text.slice(0, 50));
              tweetCursor++;
            }
          }
          break;
        }

        case 'follow': {
          // Follow from collected users or target accounts
          let followed = null;
          if (collectedUsers.length > userCursor && collectedUsers[userCursor]?.hasFollowButton) {
            const user = collectedUsers[userCursor];
            followed = await followUser(page, persona, user.username);
            userCursor++;
          } else if (persona.niche.targetAccounts.length > 0) {
            // Visit a target account's followers and follow some
            const target = persona.niche.targetAccounts[Math.floor(Math.random() * persona.niche.targetAccounts.length)];
            await page.goto(`https://x.com/${target}/followers`, { waitUntil: 'networkidle2', timeout: 30000 });
            await randomDelay(TIMING.PAGE_LOAD);
            await humanScroll(page, { scrolls: randomBetween(1, 3) });
            const users = await extractVisibleUsers(page);
            if (users.length > 0) {
              const user = users[Math.floor(Math.random() * Math.min(users.length, 5))];
              followed = await followUser(page, persona, user.username);
            }
          }
          if (followed) stats.follows++;
          break;
        }

        case 'comment': {
          // Find a good tweet to comment on
          if (collectedTweets.length === 0) {
            await browseHome(page);
            collectedTweets = await extractVisibleTweets(page);
          }

          // Pick a tweet with decent engagement to comment on
          const goodTweets = collectedTweets.filter(t => t.likes > 5 && !t.isLiked);
          const target = goodTweets.length > 0
            ? goodTweets[Math.floor(Math.random() * Math.min(goodTweets.length, 5))]
            : collectedTweets[0];

          if (target) {
            // Navigate back to search or home to find the tweet
            const searchTerm = persona.niche.searchTerms[Math.floor(Math.random() * persona.niche.searchTerms.length)];
            await doSearch(page, searchTerm, 'top');
            const freshTweets = await extractVisibleTweets(page);
            
            if (freshTweets.length > 0) {
              const tweetToComment = freshTweets[Math.floor(Math.random() * Math.min(freshTweets.length, 3))];
              const commented = await commentOnTweet(page, persona, tweetToComment);
              if (commented) {
                stats.comments++;
                persona.state.engagedPosts.add(tweetToComment.text.slice(0, 50));
              }
            }
          }
          break;
        }

        case 'create_post': {
          const posted = await createPost(page, persona);
          if (posted) stats.posts++;
          break;
        }

        case 'profile_visit': {
          // Visit a target account or discovered user
          let username;
          if (collectedUsers.length > 0 && Math.random() > 0.3) {
            username = collectedUsers[Math.floor(Math.random() * collectedUsers.length)].username;
          } else if (persona.niche.targetAccounts.length > 0) {
            username = persona.niche.targetAccounts[Math.floor(Math.random() * persona.niche.targetAccounts.length)];
          }
          if (username) {
            await visitProfile(page, username);
            stats.profileVisits++;
          }
          break;
        }

        case 'check_own_profile': {
          await checkOwnProfile(page);
          break;
        }

        case 'check_notifications': {
          await checkNotifications(page);
          break;
        }
      }

      // Random: take a longer break between some actions (10% chance)
      if (Math.random() < 0.1) {
        const breakTime = randomBetween(TIMING.LONG_BREAK.min, TIMING.LONG_BREAK.max);
        log('☕', `Taking a ${Math.round(breakTime / 1000)}s break`);
        await sleep(breakTime);
      }

    } catch (err) {
      stats.errors++;
      log('❌', `Activity "${activity.type}" error: ${err.message}`);
      // Don't crash the session — continue with next activity
    }
  }

  // Update persona state
  const duration = Math.round((Date.now() - startTime) / 60000);
  log('📊', `Session complete in ${duration}min — ${stats.likes} likes, ${stats.follows} follows, ${stats.comments} comments, ${stats.posts} posts, ${stats.searches} searches`);

  persona.state.totalSessions++;
  persona.state.totalLikes += stats.likes;
  persona.state.totalFollows += stats.follows;
  persona.state.totalComments += stats.comments;
  persona.state.totalPosts += stats.posts;
  persona.state.totalSearches += stats.searches;
  persona.state.totalProfileVisits += stats.profileVisits;
  persona.state.lastSessionAt = new Date().toISOString();

  return stats;
}

// ============================================================================
// Main Loop — 24/7 Operation
// ============================================================================

/**
 * Start the algorithm builder — runs continuously with human-like patterns.
 * 
 * @param {Object} options
 * @param {string} options.personaId - Persona ID to load
 * @param {string} options.authToken - X/Twitter auth_token cookie value
 * @param {boolean} [options.headless=true] - Run browser in headless mode
 * @param {boolean} [options.dryRun=false] - Log actions without executing
 * @param {number} [options.maxSessions=0] - 0 = infinite, or stop after N sessions
 * @param {Function} [options.onSessionComplete] - Callback after each session
 * @param {AbortSignal} [options.signal] - AbortController signal to stop
 */
async function startAlgorithmBuilder(options = {}) {
  const {
    personaId,
    authToken,
    headless = true,
    dryRun = false,
    maxSessions = 0,
    onSessionComplete,
    signal,
  } = options;

  if (!personaId) throw new Error('personaId is required');
  if (!authToken && !process.env.XACTIONS_SESSION_COOKIE) {
    throw new Error('authToken or XACTIONS_SESSION_COOKIE env var required');
  }

  const cookie = authToken || process.env.XACTIONS_SESSION_COOKIE;
  let persona = loadPersona(personaId);

  log('🤖', `Algorithm Builder starting for persona: ${persona.name} (${persona.preset})`);
  log('📋', `Strategy: ${persona.strategy.preset} | Activity: ${persona.activityPattern.preset}`);
  log('🎯', `Topics: ${persona.niche.topics.join(', ')}`);
  log('🧠', `LLM: ${persona.llm.models.comment}`);

  if (dryRun) {
    log('🧪', 'DRY RUN MODE — no actions will be executed');
  }

  // Launch browser
  let browser, page;
  try {
    browser = await createBrowser({ headless: headless ? 'new' : false });
    page = await createPage(browser);
    await loginWithCookie(page, cookie);
    log('✅', 'Logged in to X successfully');
  } catch (err) {
    log('💀', `Failed to launch browser: ${err.message}`);
    throw err;
  }

  let sessionCount = 0;
  let running = true;

  // Handle abort signal
  if (signal) {
    signal.addEventListener('abort', () => {
      running = false;
      log('🛑', 'Abort signal received — stopping after current session');
    });
  }

  // Handle SIGINT/SIGTERM
  const gracefulShutdown = () => {
    running = false;
    log('🛑', 'Shutdown signal — stopping after current session');
  };
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  try {
    while (running) {
      // Check if we should be active right now
      if (!shouldBeActive(persona)) {
        const sleepMin = randomBetween(10, 30);
        log('😴', `Sleeping (outside active hours) — checking again in ${sleepMin}min`);
        await sleep(sleepMin * 60 * 1000);
        continue;
      }

      // Plan and execute a session
      const plan = planSession(persona);

      if (!dryRun) {
        const stats = await runSession(page, persona, plan);

        // Save persona state after each session
        savePersona(persona);

        // Callback
        if (onSessionComplete) {
          onSessionComplete({ persona, stats, sessionCount: sessionCount + 1 });
        }
      } else {
        log('🧪', `[DRY RUN] Would execute ${plan.activities.length} activities over ~${plan.duration}min`);
        plan.activities.forEach(a => log('  📌', `${a.type}${a.term ? ': ' + a.term : ''}`));
      }

      sessionCount++;
      
      // Check session limit
      if (maxSessions > 0 && sessionCount >= maxSessions) {
        log('🏁', `Reached max sessions (${maxSessions})`);
        break;
      }

      // Calculate delay until next session
      const delayMin = getDelayUntilNextSession(persona);
      log('⏳', `Next session in ~${delayMin}min`);
      
      // Wait with periodic checks for abort signal
      const delayMs = delayMin * 60 * 1000;
      const checkInterval = 30000; // check every 30s
      let waited = 0;
      while (waited < delayMs && running) {
        await sleep(Math.min(checkInterval, delayMs - waited));
        waited += checkInterval;
      }
    }
  } finally {
    // Cleanup
    log('🧹', 'Cleaning up...');
    savePersona(persona);
    try { await browser?.close(); } catch { /* ignore */ }
    process.removeListener('SIGINT', gracefulShutdown);
    process.removeListener('SIGTERM', gracefulShutdown);
    log('👋', `Algorithm Builder stopped. ${sessionCount} sessions completed.`);
  }

  return { sessionCount, persona };
}

/**
 * Run a single session (useful for testing)
 */
async function runSingleSession(options = {}) {
  return startAlgorithmBuilder({ ...options, maxSessions: 1 });
}

// ============================================================================
// Exports
// ============================================================================

export {
  startAlgorithmBuilder,
  runSingleSession,

  // Individual actions (for use in other scripts)
  doSearch,
  browseHome,
  likeTweet,
  followUser,
  commentOnTweet,
  createPost,
  visitProfile,
  checkOwnProfile,
  checkNotifications,
  extractVisibleTweets,
  extractVisibleUsers,

  // LLM
  generateComment,
  generatePost,
};
