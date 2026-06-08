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
export const randomDelay = (min = 1000, max = 3000) =>
  sleep(min + Math.random() * (max - min));

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
 * @param {number}  [options.maxBatch=20] - Hard cap on batch size
 * @param {Function} [options.onProgress] - Called after each item: ({ attempted, total })
 * @returns {Promise<Object>} Structured result (AC4 shape)
 */
export async function runGuardedBatch(items, actionFn, options = {}) {
  const {
    dryRun = true,
    delay = randomDelay,
    maxBatch = 20,
    onProgress,
  } = options;

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

  // Reject oversized batches (no unbounded write loops — ADR-007 / AC2.6)
  if (items.length > maxBatch) {
    throw new Error(
      `❌ Batch size ${items.length} exceeds maxBatch limit of ${maxBatch}. ` +
      `Split into smaller batches or raise maxBatch explicitly.`
    );
  }

  // Surface account-risk warning before first real write (AC2.7)
  console.warn(ACCOUNT_RISK_WARNING);

  const results = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      await actionFn(item);
      results.push({ target: item, ok: true });
      succeeded++;
    } catch (err) {
      results.push({ target: item, ok: false, error: err?.message ?? String(err) });
      failed++;
    }

    if (onProgress) onProgress({ attempted: i + 1, total: items.length });

    // Delay between actions except after the last item
    if (i < items.length - 1) {
      await delay(1000, 3000);
    }
  }

  return {
    dryRun: false,
    platform: 'facebook',
    attempted: items.length,
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
