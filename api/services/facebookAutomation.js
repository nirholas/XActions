// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
// by nichxbt

import {
  loginWithCookie,
  createBrowser,
  createPage,
} from '../../src/scrapers/facebook/index.js';

// ============================================================================
// Delay seam — injectable in tests via options.delay
// ============================================================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const randomDelay = (min = 1000, max = 3000) => {
  if (min > max) throw new Error(`randomDelay: min (${min}) must be <= max (${max})`);
  return sleep(min + Math.random() * (max - min));
};

// ============================================================================
// Account-risk warning (surfaced before every real write batch)
// ============================================================================

export const ACCOUNT_RISK_WARNING =
  '⚠️ WARNING: Real writes enabled. Automated actions risk account restriction or lock. ' +
  'Use a test account. Proceeding with dryRun=false batch.';

// ============================================================================
// Guardrail helper — single chokepoint for all Facebook write loops
// ============================================================================

/**
 * Run a bounded, guarded batch of write actions on Facebook.
 *
 * @param {Array} items - Targets to act on (e.g. post URLs, user IDs)
 * @param {Function} actionFn - async (item) => any — called per item when dryRun=false
 * @param {Object} options
 * @param {boolean} [options.dryRun=true] - Default true; no real write unless explicitly false
 * @param {Function} [options.delay=randomDelay] - Injectable delay seam; pass () => {} in tests
 * @param {number}  [options.maxBatch=20] - Hard cap on batch size (enforced in both dry-run and real)
 * @param {number}  [options.maxRetry=1] - Max retries per item on failure (0 = no retry)
 * @param {Function} [options.shouldStop] - (results: Array) => boolean — called after each item; return true to abort
 * @param {Function} [options.onProgress] - Called after each item: ({ attempted, total })
 * @returns {Promise<Object>} Structured result (AC4 shape)
 */
export async function runGuardedBatch(items, actionFn, options = {}) {
  if (!Array.isArray(items)) {
    throw new Error('❌ runGuardedBatch: items must be an array');
  }

  const {
    dryRun = true,
    delay = randomDelay,
    maxBatch = 20,
    maxRetry = 1,
    shouldStop,
    onProgress,
  } = options;

  if (typeof maxBatch !== 'number' || !Number.isFinite(maxBatch) || maxBatch < 1) {
    throw new Error(`❌ runGuardedBatch: maxBatch must be a finite number >= 1, got ${maxBatch}`);
  }

  // maxRetry must be finite & non-negative — Infinity would hang the loop on persistent failures
  if (typeof maxRetry !== 'number' || !Number.isFinite(maxRetry) || maxRetry < 0) {
    throw new Error(`❌ runGuardedBatch: maxRetry must be a finite number >= 0, got ${maxRetry}`);
  }

  // maxBatch enforced in both dry-run and real — preview must reflect real constraints
  if (items.length > maxBatch) {
    throw new Error(
      `❌ Batch size ${items.length} exceeds maxBatch limit of ${maxBatch}. ` +
      `Split into smaller batches or raise maxBatch explicitly.`
    );
  }

  // Strict dry-run gate: anything except explicit `false` stays in dry-run.
  // JS destructuring only substitutes the default for `undefined`, so `dryRun: null`
  // would otherwise be falsy and trigger real writes — unsafe for an automation guardrail.
  const isRealRun = dryRun === false;

  // --- dry-run branch ---
  if (!isRealRun) {
    const preview = items.map((item) => ({ target: item, action: 'pending' }));
    return {
      dryRun: true,
      platform: 'facebook',
      attempted: 0,
      succeeded: 0,
      failed: 0,
      preview,
      results: [],
      warning: null,
    };
  }

  // --- real-write branch ---

  // Validate actionFn before any real write — otherwise null/non-function actionFn
  // is silently caught per-item, marking every target failed with an opaque TypeError.
  if (typeof actionFn !== 'function') {
    throw new Error('❌ runGuardedBatch: actionFn must be a function for real writes');
  }

  // Surface account-risk warning before first real write (AC2.7)
  console.warn(ACCOUNT_RISK_WARNING);

  const results = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Skip null/undefined items rather than passing them to actionFn
    if (item == null) {
      results.push({ target: item, ok: false, error: 'null/undefined item skipped' });
      failed++;
    } else {
      let lastErr = null;
      let attempts = 0;
      const totalAttempts = 1 + Math.max(0, Math.floor(maxRetry));

      while (attempts < totalAttempts) {
        try {
          await actionFn(item);
          results.push({ target: item, ok: true });
          succeeded++;
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          attempts++;
        }
      }

      if (lastErr !== null) {
        results.push({ target: item, ok: false, error: lastErr?.message ?? String(lastErr) });
        failed++;
      }
    }

    // onProgress — guarded against non-function and throwing callbacks
    if (typeof onProgress === 'function') {
      try {
        onProgress({ attempted: i + 1, total: items.length });
      } catch (_) {
        // onProgress errors must not corrupt batch state
      }
    }

    // shouldStop — caller can abort remaining items
    if (typeof shouldStop === 'function' && shouldStop(results)) {
      break;
    }

    // Delay between actions except after the last item
    if (i < items.length - 1) {
      try {
        await delay(1000, 3000);
      } catch (err) {
        // delay errors must not abort batch; log and continue
        console.warn(`⚠️ runGuardedBatch: delay threw — ${err?.message ?? err}. Continuing.`);
      }
    }
  }

  return {
    dryRun: false,
    platform: 'facebook',
    attempted: results.length,
    succeeded,
    failed,
    preview: [],
    results,
    warning: ACCOUNT_RISK_WARNING,
  };
}

// ============================================================================
// Re-export login/browser helpers (convenience — callers don't need two imports)
// ============================================================================

export { loginWithCookie, createBrowser, createPage };

// ============================================================================
// Facebook Like Automation (Story 2.2)
// ============================================================================

/**
 * Find Like button with locale-aware selectors.
 * Single chokepoint for locale strings (AC2.5).
 *
 * @param {Object} page - Puppeteer page
 * @returns {Promise<{element: Object, alreadyLiked: boolean}>}
 * @throws {Error} If Like button not found (locale unsupported or post unreachable)
 */
async function findLikeButton(page) {
  // Supported locales: en, vi (from docs/agents/selectors-facebook.md)
  const likeSelectors = [
    '[aria-label="Like"]',      // en
    '[aria-label="Thích"]',     // vi
  ];

  const unlikeSelectors = [
    '[aria-label="Remove Like"]', // en
    '[aria-label="Bỏ thích"]',    // vi
  ];

  // Check if already liked first
  for (const selector of unlikeSelectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        return { element, alreadyLiked: true };
      }
    } catch (_) {
      // Continue to next selector
    }
  }

  // Check for unliked state
  for (const selector of likeSelectors) {
    try {
      const element = await page.waitForSelector(selector, { timeout: 5000 });
      if (element) {
        return { element, alreadyLiked: false };
      }
    } catch (_) {
      // Continue to next selector
    }
  }

  // Button not found in any locale
  throw new Error(
    `❌ Like button not found; locale unsupported or post unreachable`
  );
}

/**
 * Like a single Facebook post (AC2).
 * Internal helper for likeFacebookPosts.
 *
 * @param {Object} page - Puppeteer page
 * @param {string} postUrl - Full URL to Facebook post
 * @returns {Promise<{liked: boolean, alreadyLiked: boolean}>}
 * @throws {Error} If Like button not found
 */
async function likeSinglePost(page, postUrl) {
  // Navigate to post (AC2.4)
  await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 30000 });

  // Small delay for stability (AC2.4 mentions delay seam if available)
  await sleep(500);

  // Find Like button with locale-aware lookup (AC2.5)
  const { element, alreadyLiked } = await findLikeButton(page);

  // If already liked, return without clicking (AC2.6)
  if (alreadyLiked) {
    return { liked: false, alreadyLiked: true };
  }

  // Click to like (AC2.4)
  await element.click();

  // Brief wait for click to register
  await sleep(300);

  return { liked: true, alreadyLiked: false };
}

/**
 * Auto-like one or more Facebook posts with dry-run preview (Story 2.2).
 *
 * @param {Object} page - Puppeteer page (authenticated)
 * @param {string[]} postUrls - Array of Facebook post URLs to like
 * @param {Object} options - Configuration options
 * @param {boolean} [options.dryRun=true] - Preview mode (default); set false for real writes
 * @param {Function} [options.delay] - Injectable delay between actions
 * @param {number} [options.maxBatch=20] - Max posts per batch
 * @param {number} [options.maxRetry=1] - Retry attempts per post on failure
 * @param {Function} [options.likeFn] - Injectable like function (for testing); defaults to likeSinglePost
 * @returns {Promise<Object>} Result with dryRun, preview, results, attempted, succeeded, failed
 */
export async function likeFacebookPosts(page, postUrls, options = {}) {
  const { likeFn = likeSinglePost, ...guardedOptions } = options;

  // Capture return values from likeFn via closure (AC3.9)
  const capturedResults = new Map();

  // Build actionFn that wraps likeFn with page (AC1.2)
  const actionFn = async (postUrl) => {
    const result = await likeFn(page, postUrl);
    // Capture the return value so we can merge it into results later
    capturedResults.set(postUrl, result);
    return result;
  };

  // Route through runGuardedBatch — single chokepoint (AC1.2)
  const batchResult = await runGuardedBatch(postUrls, actionFn, guardedOptions);

  // Post-process real-run results to include alreadyLiked field (AC3.9)
  if (!batchResult.dryRun && batchResult.results.length > 0) {
    batchResult.results = batchResult.results.map((r) => {
      const captured = capturedResults.get(r.target);
      // Only add alreadyLiked for successful results where we have captured data
      if (captured && r.ok) {
        return { ...r, alreadyLiked: captured.alreadyLiked };
      }
      return r;
    });
  }

  return batchResult;
}

// ============================================================================
// Facebook Comment Automation (Story 2.3)
// ============================================================================

/**
 * Find comment input with locale-aware selectors.
 *
 * @param {Object} page - Puppeteer page
 * @returns {Promise<Object>} Comment input element
 * @throws {Error} If comment input not found (locale unsupported or post unreachable)
 */
async function findCommentInput(page) {
  // Supported locales: en, vi (from docs/agents/selectors-facebook.md)
  const commentSelectors = [
    '[aria-label*="Write a comment"]',      // en
    '[placeholder*="Write a comment"]',     // en fallback
    '[aria-label*="Viết bình luận"]',       // vi
    '[placeholder*="Viết bình luận"]',      // vi fallback
  ];

  for (const selector of commentSelectors) {
    try {
      const element = await page.waitForSelector(selector, { timeout: 5000 });
      if (element) {
        return element;
      }
    } catch (_) {
      // Continue to next selector
    }
  }

  // Input not found in any locale
  throw new Error(
    `❌ Comment input not found; locale unsupported or post unreachable`
  );
}

/**
 * Comment on a single Facebook post (AC2).
 * Internal helper for commentOnFacebookPosts.
 *
 * @param {Object} page - Puppeteer page
 * @param {string} postUrl - Full URL to Facebook post
 * @param {string} commentText - User-provided comment content
 * @returns {Promise<{commented: boolean}>}
 * @throws {Error} If comment input not found
 */
async function commentSinglePost(page, postUrl, commentText) {
  // Navigate to post (AC2.5)
  await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 30000 });

  // Small delay for stability
  await sleep(500);

  // Find comment input with locale-aware lookup (AC2.6)
  const inputElement = await findCommentInput(page);

  // Click to focus
  await inputElement.click();
  await sleep(200);

  // Type comment text (AC2.6)
  await page.keyboard.type(commentText);

  // Submit via Enter key (AC2.7)
  await page.keyboard.press('Enter');

  // Brief wait for comment to post
  await sleep(500);

  return { commented: true };
}

/**
 * Auto-comment on one or more Facebook posts with dry-run preview (Story 2.3).
 *
 * @param {Object} page - Puppeteer page (authenticated)
 * @param {string[]} postUrls - Array of Facebook post URLs to comment on
 * @param {string} commentText - User-provided comment content
 * @param {Object} options - Configuration options
 * @param {boolean} [options.dryRun=true] - Preview mode (default); set false for real writes
 * @param {Function} [options.delay] - Injectable delay between actions
 * @param {number} [options.maxBatch=20] - Max posts per batch
 * @param {number} [options.maxRetry=1] - Retry attempts per post on failure
 * @param {Function} [options.commentFn] - Injectable comment function (for testing); defaults to commentSinglePost
 * @returns {Promise<Object>} Result with dryRun, preview, results, attempted, succeeded, failed
 */
export async function commentOnFacebookPosts(page, postUrls, commentText, options = {}) {
  const { commentFn = commentSinglePost, ...guardedOptions } = options;

  // Build actionFn that wraps commentFn with page and commentText (AC1.2)
  const actionFn = async (postUrl) => {
    return await commentFn(page, postUrl, commentText);
  };

  // Route through runGuardedBatch — single chokepoint (AC1.2)
  const batchResult = await runGuardedBatch(postUrls, actionFn, guardedOptions);

  // Enhance dry-run preview with comment text (AC3.9)
  if (batchResult.dryRun && batchResult.preview.length > 0) {
    batchResult.preview = batchResult.preview.map((p) => ({
      ...p,
      previewComment: commentText,
    }));
  }

  // Enhance real-run results with comment text (AC3.10)
  if (!batchResult.dryRun && batchResult.results.length > 0) {
    batchResult.results = batchResult.results.map((r) => ({
      ...r,
      commentText,
    }));
  }

  return batchResult;
}

// ============================================================================
// Facebook Post Creation (Story 2.4)
// ============================================================================

/**
 * Find post composer with locale-aware selectors.
 *
 * @param {Object} page - Puppeteer page
 * @returns {Promise<Object>} Post composer element
 * @throws {Error} If post composer not found (locale unsupported or page unreachable)
 */
async function findPostComposer(page) {
  // Supported locales: en, vi (from docs/agents/selectors-facebook.md)
  const composerSelectors = [
    '[aria-label*="What\'s on your mind"]',      // en
    '[role="textbox"][data-text*="What\'s on your mind"]',  // en fallback
    '[aria-label*="Bạn đang nghĩ gì"]',          // vi
    '[role="textbox"][data-text*="Bạn đang nghĩ gì"]',      // vi fallback
  ];

  for (const selector of composerSelectors) {
    try {
      const element = await page.waitForSelector(selector, { timeout: 5000 });
      if (element) {
        return element;
      }
    } catch (_) {
      // Continue to next selector
    }
  }

  // Composer not found in any locale
  throw new Error(
    `❌ Post composer not found; locale unsupported or page unreachable`
  );
}

/**
 * Find post submit button with locale-aware selectors.
 *
 * @param {Object} page - Puppeteer page
 * @returns {Promise<Object>} Submit button element
 * @throws {Error} If submit button not found
 */
async function findPostSubmitButton(page) {
  const submitSelectors = [
    '[aria-label="Post"]',     // en
    '[aria-label="Đăng"]',     // vi
  ];

  for (const selector of submitSelectors) {
    try {
      const element = await page.waitForSelector(selector, { timeout: 3000 });
      if (element) {
        return element;
      }
    } catch (_) {
      // Continue to next selector
    }
  }

  throw new Error(`❌ Post submit button not found`);
}

/**
 * Create a single Facebook post (AC2).
 * Internal helper for createFacebookPost.
 *
 * @param {Object} page - Puppeteer page
 * @param {string} content - User-provided post content
 * @returns {Promise<{posted: boolean, postUrl?: string}>}
 * @throws {Error} If post composer or submit button not found
 */
async function createSinglePost(page, content) {
  // Navigate to Facebook home (AC2.5)
  await page.goto('https://facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });

  // Small delay for stability
  await sleep(500);

  // Find post composer with locale-aware lookup (AC2.6)
  const composerElement = await findPostComposer(page);

  // Click to focus composer
  await composerElement.click();
  await sleep(300);

  // Type post content (AC2.6)
  await page.keyboard.type(content);
  await sleep(200);

  // Find and click submit button (AC2.7)
  const submitElement = await findPostSubmitButton(page);
  await submitElement.click();

  // Wait for post to be created
  await sleep(2000);

  // Try to extract post URL from current page location
  const currentUrl = page.url();
  const postUrl = currentUrl.includes('/posts/') || currentUrl.includes('/permalink/') 
    ? currentUrl 
    : undefined;

  return { posted: true, postUrl };
}

/**
 * Create a Facebook text post with dry-run preview (Story 2.4).
 *
 * @param {Object} page - Puppeteer page (authenticated)
 * @param {string} content - User-provided post content
 * @param {Object} options - Configuration options
 * @param {boolean} [options.dryRun=true] - Preview mode (default); set false for real writes
 * @param {Function} [options.delay] - Injectable delay (not used for single post)
 * @param {number} [options.maxBatch=20] - Max batch size (enforced even for single item)
 * @param {number} [options.maxRetry=1] - Retry attempts on failure
 * @param {Function} [options.createPostFn] - Injectable create function (for testing); defaults to createSinglePost
 * @returns {Promise<Object>} Result with dryRun, preview, results, attempted, succeeded, failed
 */
export async function createFacebookPost(page, content, options = {}) {
  const { createPostFn = createSinglePost, ...guardedOptions } = options;

  // Build actionFn that wraps createPostFn with page (AC1.2)
  const actionFn = async (contentItem) => {
    return await createPostFn(page, contentItem);
  };

  // Route through runGuardedBatch with single-item array — ensures guardrail consistency (AC4.13)
  const batchResult = await runGuardedBatch([content], actionFn, guardedOptions);

  // Enhance dry-run preview with content preview (AC3.9)
  if (batchResult.dryRun && batchResult.preview.length > 0) {
    batchResult.preview = batchResult.preview.map((p) => ({
      ...p,
      previewContent: p.target,
    }));
  }

  // Enhance real-run results with content and postUrl (AC3.10)
  if (!batchResult.dryRun && batchResult.results.length > 0) {
    batchResult.results = batchResult.results.map((r) => ({
      ...r,
      content: r.target,
      // postUrl will be in captured results if createPostFn returned it
    }));
  }

  return batchResult;
}

export default {
  runGuardedBatch,
  randomDelay,
  ACCOUNT_RISK_WARNING,
  loginWithCookie,
  createBrowser,
  createPage,
  likeFacebookPosts,
  commentOnFacebookPosts,
  createFacebookPost,
};
