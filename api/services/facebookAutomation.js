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

  // maxBatch enforced in both dry-run and real — preview must reflect real constraints
  if (items.length > maxBatch) {
    throw new Error(
      `❌ Batch size ${items.length} exceeds maxBatch limit of ${maxBatch}. ` +
      `Split into smaller batches or raise maxBatch explicitly.`
    );
  }

  // --- dry-run branch ---
  if (dryRun) {
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
