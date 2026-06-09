// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
// XActions — Facebook Automation Guardrail Tests
// by nichxbt

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  commentOnFacebookPosts,
  createFacebookPost,
  runGuardedBatch,
  randomDelay,
  ACCOUNT_RISK_WARNING,
  likeFacebookPosts,
} from '../../api/services/facebookAutomation.js';

const noDelay = () => {};

describe('runGuardedBatch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Input validation
  // -------------------------------------------------------------------------

  describe('input validation', () => {
    it('throws when items is null', async () => {
      await expect(runGuardedBatch(null, vi.fn())).rejects.toThrow(/items must be an array/i);
    });

    it('throws when items is undefined', async () => {
      await expect(runGuardedBatch(undefined, vi.fn())).rejects.toThrow(/items must be an array/i);
    });

    it('throws when items is a string', async () => {
      await expect(runGuardedBatch('post-1', vi.fn())).rejects.toThrow(/items must be an array/i);
    });

    it('throws when maxBatch is NaN', async () => {
      await expect(
        runGuardedBatch([], vi.fn(), { dryRun: false, maxBatch: NaN })
      ).rejects.toThrow(/maxBatch/i);
    });

    it('throws when maxBatch is 0', async () => {
      await expect(
        runGuardedBatch([], vi.fn(), { dryRun: false, maxBatch: 0 })
      ).rejects.toThrow(/maxBatch/i);
    });

    it('throws when maxBatch is negative', async () => {
      await expect(
        runGuardedBatch([], vi.fn(), { dryRun: false, maxBatch: -5 })
      ).rejects.toThrow(/maxBatch/i);
    });

    // Patch: maxRetry must be finite (Infinity would hang the loop on persistent failures)
    it('throws when maxRetry is Infinity', async () => {
      await expect(
        runGuardedBatch(['x'], vi.fn(), { dryRun: false, maxRetry: Infinity })
      ).rejects.toThrow(/maxRetry/i);
    });

    it('throws when maxRetry is NaN', async () => {
      await expect(
        runGuardedBatch(['x'], vi.fn(), { dryRun: false, maxRetry: NaN })
      ).rejects.toThrow(/maxRetry/i);
    });

    it('throws when maxRetry is negative', async () => {
      await expect(
        runGuardedBatch(['x'], vi.fn(), { dryRun: false, maxRetry: -1 })
      ).rejects.toThrow(/maxRetry/i);
    });

    // Patch: actionFn must be a function for real writes (else silent per-item TypeError)
    it('throws when actionFn is null and dryRun is false', async () => {
      await expect(
        runGuardedBatch(['x'], null, { dryRun: false })
      ).rejects.toThrow(/actionFn must be a function/i);
    });

    it('throws when actionFn is undefined and dryRun is false', async () => {
      await expect(
        runGuardedBatch(['x'], undefined, { dryRun: false })
      ).rejects.toThrow(/actionFn must be a function/i);
    });

    it('throws when actionFn is a string and dryRun is false', async () => {
      await expect(
        runGuardedBatch(['x'], 'notAFunction', { dryRun: false })
      ).rejects.toThrow(/actionFn must be a function/i);
    });

    // dryRun=true with non-function actionFn should NOT throw — preview path doesn't call it
    it('does NOT validate actionFn in dry-run mode (preview path)', async () => {
      const result = await runGuardedBatch(['x'], null);
      expect(result.dryRun).toBe(true);
      expect(result.preview).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Patch: strict dry-run gate — falsy non-boolean must NOT trigger real writes
  // -------------------------------------------------------------------------

  describe('strict dryRun gate (HIGH safety guard)', () => {
    it('dryRun: null stays in dry-run (does NOT enable real writes)', async () => {
      const actionFn = vi.fn();
      const result = await runGuardedBatch(['x'], actionFn, { dryRun: null, delay: noDelay });
      expect(actionFn).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
      expect(result.warning).toBeNull();
    });

    it('dryRun: 0 stays in dry-run', async () => {
      const actionFn = vi.fn();
      const result = await runGuardedBatch(['x'], actionFn, { dryRun: 0, delay: noDelay });
      expect(actionFn).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
    });

    it('dryRun: "" stays in dry-run', async () => {
      const actionFn = vi.fn();
      const result = await runGuardedBatch(['x'], actionFn, { dryRun: '', delay: noDelay });
      expect(actionFn).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
    });

    it('only explicit dryRun:false enables real writes', async () => {
      const actionFn = vi.fn().mockResolvedValue(undefined);
      const result = await runGuardedBatch(['x'], actionFn, { dryRun: false, delay: noDelay });
      expect(actionFn).toHaveBeenCalledTimes(1);
      expect(result.dryRun).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // AC2.4 / AC3 — dry-run is the default
  // -------------------------------------------------------------------------

  describe('dry-run default', () => {
    it('returns preview without calling actionFn', async () => {
      const actionFn = vi.fn();
      const items = ['post-1', 'post-2', 'post-3'];

      const result = await runGuardedBatch(items, actionFn);

      expect(actionFn).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
      expect(result.platform).toBe('facebook');
      expect(result.attempted).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('preview contains one entry per item with target + action fields', async () => {
      const items = ['post-a', 'post-b'];
      const result = await runGuardedBatch(items, vi.fn());

      expect(result.preview).toHaveLength(2);
      result.preview.forEach((entry, i) => {
        expect(entry).toHaveProperty('target', items[i]);
        expect(entry).toHaveProperty('action');
      });
    });

    it('results array is empty on dry-run', async () => {
      const result = await runGuardedBatch(['x'], vi.fn());
      expect(result.results).toEqual([]);
    });

    it('explicit dryRun:true also skips actionFn', async () => {
      const actionFn = vi.fn();
      await runGuardedBatch(['post-1'], actionFn, { dryRun: true, delay: noDelay });
      expect(actionFn).not.toHaveBeenCalled();
    });

    it('dry-run also enforces maxBatch — throws on oversized batch', async () => {
      const items = Array.from({ length: 21 }, (_, i) => `post-${i}`);
      await expect(
        runGuardedBatch(items, vi.fn(), { dryRun: true })
      ).rejects.toThrow(/maxBatch/i);
    });

    it('dry-run accepts exactly maxBatch items', async () => {
      const items = Array.from({ length: 20 }, (_, i) => `post-${i}`);
      await expect(runGuardedBatch(items, vi.fn(), { dryRun: true })).resolves.not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // AC2 / AC3 — dryRun:false invokes actionFn per item
  // -------------------------------------------------------------------------

  describe('dryRun:false — real write branch', () => {
    it('calls actionFn once per item', async () => {
      const actionFn = vi.fn().mockResolvedValue(undefined);
      const items = ['post-1', 'post-2', 'post-3'];

      const result = await runGuardedBatch(items, actionFn, {
        dryRun: false,
        delay: noDelay,
      });

      expect(actionFn).toHaveBeenCalledTimes(3);
      items.forEach((item, i) => {
        expect(actionFn).toHaveBeenNthCalledWith(i + 1, item);
      });
    });

    it('returns correct attempted/succeeded counts', async () => {
      const actionFn = vi.fn().mockResolvedValue(undefined);
      const items = ['a', 'b', 'c'];

      const result = await runGuardedBatch(items, actionFn, {
        dryRun: false,
        delay: noDelay,
      });

      expect(result.dryRun).toBe(false);
      expect(result.platform).toBe('facebook');
      expect(result.attempted).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('tracks failed items without throwing', async () => {
      const actionFn = vi.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce(undefined);

      const result = await runGuardedBatch(['a', 'b', 'c'], actionFn, {
        dryRun: false,
        delay: noDelay,
        maxRetry: 0,
      });

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
      const failedEntry = result.results.find((r) => !r.ok);
      expect(failedEntry.error).toContain('network error');
    });

    it('results array has one entry per item', async () => {
      const actionFn = vi.fn().mockResolvedValue(undefined);
      const items = ['x', 'y'];

      const result = await runGuardedBatch(items, actionFn, {
        dryRun: false,
        delay: noDelay,
      });

      expect(result.results).toHaveLength(2);
      result.results.forEach((r, i) => {
        expect(r.target).toBe(items[i]);
        expect(r.ok).toBe(true);
      });
    });

    it('preview is empty on real run', async () => {
      const result = await runGuardedBatch(['x'], vi.fn().mockResolvedValue(undefined), {
        dryRun: false,
        delay: noDelay,
      });
      expect(result.preview).toEqual([]);
    });

    it('skips null items and records them as failed', async () => {
      const actionFn = vi.fn().mockResolvedValue(undefined);
      const result = await runGuardedBatch([null, 'post-1', undefined], actionFn, {
        dryRun: false,
        delay: noDelay,
        maxRetry: 0,
      });

      expect(actionFn).toHaveBeenCalledTimes(1);
      expect(actionFn).toHaveBeenCalledWith('post-1');
      expect(result.failed).toBe(2);
      expect(result.succeeded).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // AC2.6 — batch over maxBatch is rejected (dry-run AND real)
  // -------------------------------------------------------------------------

  describe('maxBatch enforcement', () => {
    it('throws when items.length > maxBatch (default 20) — real run', async () => {
      const items = Array.from({ length: 21 }, (_, i) => `post-${i}`);
      await expect(
        runGuardedBatch(items, vi.fn(), { dryRun: false, delay: noDelay })
      ).rejects.toThrow(/maxBatch/i);
    });

    it('throws when items.length > maxBatch (default 20) — dry-run', async () => {
      const items = Array.from({ length: 21 }, (_, i) => `post-${i}`);
      await expect(
        runGuardedBatch(items, vi.fn(), { dryRun: true })
      ).rejects.toThrow(/maxBatch/i);
    });

    it('accepts exactly maxBatch items', async () => {
      const items = Array.from({ length: 20 }, (_, i) => `post-${i}`);
      const actionFn = vi.fn().mockResolvedValue(undefined);
      await expect(
        runGuardedBatch(items, actionFn, { dryRun: false, delay: noDelay })
      ).resolves.not.toThrow();
      expect(actionFn).toHaveBeenCalledTimes(20);
    });

    it('throws when items.length > custom maxBatch', async () => {
      const items = ['a', 'b', 'c', 'd', 'e', 'f'];
      await expect(
        runGuardedBatch(items, vi.fn(), { dryRun: false, delay: noDelay, maxBatch: 5 })
      ).rejects.toThrow(/maxBatch/i);
    });
  });

  // -------------------------------------------------------------------------
  // AC2.7 — account-risk warning present before first real batch
  // -------------------------------------------------------------------------

  describe('account-risk warning', () => {
    it('result.warning is populated on real run', async () => {
      const result = await runGuardedBatch(['post-1'], vi.fn().mockResolvedValue(undefined), {
        dryRun: false,
        delay: noDelay,
      });
      expect(result.warning).toBeTruthy();
      expect(result.warning).toMatch(/warning/i);
    });

    it('console.warn is called before first real write', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const actionFn = vi.fn().mockResolvedValue(undefined);

      await runGuardedBatch(['post-1', 'post-2'], actionFn, {
        dryRun: false,
        delay: noDelay,
      });

      expect(warnSpy).toHaveBeenCalledWith(ACCOUNT_RISK_WARNING);
      const warnOrder = warnSpy.mock.invocationCallOrder[0];
      const firstActionOrder = actionFn.mock.invocationCallOrder[0];
      expect(warnOrder).toBeLessThan(firstActionOrder);
    });

    it('warning is null on dry-run (no real writes, no risk)', async () => {
      const result = await runGuardedBatch(['post-1'], vi.fn());
      expect(result.warning).toBeNull();
    });

    it('ACCOUNT_RISK_WARNING constant mentions account risk', () => {
      expect(ACCOUNT_RISK_WARNING).toMatch(/risk|lock|restrict/i);
    });
  });

  // -------------------------------------------------------------------------
  // AC4 — result shape
  // -------------------------------------------------------------------------

  describe('result shape', () => {
    it('dry-run result has all required fields', async () => {
      const result = await runGuardedBatch(['post-1'], vi.fn());
      expect(result).toMatchObject({
        dryRun: true,
        platform: 'facebook',
        attempted: expect.any(Number),
        succeeded: expect.any(Number),
        failed: expect.any(Number),
        preview: expect.any(Array),
        results: expect.any(Array),
      });
    });

    it('real-run result has all required fields', async () => {
      const result = await runGuardedBatch(['post-1'], vi.fn().mockResolvedValue(undefined), {
        dryRun: false,
        delay: noDelay,
      });
      expect(result).toMatchObject({
        dryRun: false,
        platform: 'facebook',
        attempted: expect.any(Number),
        succeeded: expect.any(Number),
        failed: expect.any(Number),
        preview: expect.any(Array),
        results: expect.any(Array),
        warning: expect.any(String),
      });
    });
  });

  // -------------------------------------------------------------------------
  // Delay seam — injectable (AC2.4 blocker from Epic 1 lessons)
  // -------------------------------------------------------------------------

  describe('delay seam', () => {
    it('uses injected delay function between items', async () => {
      const delaySpy = vi.fn().mockResolvedValue(undefined);
      const items = ['a', 'b', 'c'];

      await runGuardedBatch(items, vi.fn().mockResolvedValue(undefined), {
        dryRun: false,
        delay: delaySpy,
      });

      expect(delaySpy).toHaveBeenCalledTimes(items.length - 1);
    });

    it('does not call delay in dry-run', async () => {
      const delaySpy = vi.fn();
      await runGuardedBatch(['a', 'b'], vi.fn(), { dryRun: true, delay: delaySpy });
      expect(delaySpy).not.toHaveBeenCalled();
    });

    it('batch continues when delay throws — does not abort', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const delayThatThrows = vi.fn().mockRejectedValue(new Error('delay failed'));
      const actionFn = vi.fn().mockResolvedValue(undefined);

      const result = await runGuardedBatch(['a', 'b', 'c'], actionFn, {
        dryRun: false,
        delay: delayThatThrows,
      });

      expect(actionFn).toHaveBeenCalledTimes(3);
      expect(result.succeeded).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // maxRetry — bounded retry per item
  // -------------------------------------------------------------------------

  describe('maxRetry', () => {
    it('retries failed item up to maxRetry times', async () => {
      const actionFn = vi.fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce(undefined);

      const result = await runGuardedBatch(['post-1'], actionFn, {
        dryRun: false,
        delay: noDelay,
        maxRetry: 1,
      });

      expect(actionFn).toHaveBeenCalledTimes(2);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('records failed after exhausting retries', async () => {
      const actionFn = vi.fn().mockRejectedValue(new Error('persistent'));

      const result = await runGuardedBatch(['post-1'], actionFn, {
        dryRun: false,
        delay: noDelay,
        maxRetry: 2,
      });

      expect(actionFn).toHaveBeenCalledTimes(3); // 1 attempt + 2 retries
      expect(result.failed).toBe(1);
      expect(result.succeeded).toBe(0);
    });

    it('maxRetry=0 means no retry — single attempt only', async () => {
      const actionFn = vi.fn().mockRejectedValue(new Error('fail'));

      const result = await runGuardedBatch(['post-1'], actionFn, {
        dryRun: false,
        delay: noDelay,
        maxRetry: 0,
      });

      expect(actionFn).toHaveBeenCalledTimes(1);
      expect(result.failed).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // shouldStop — explicit stop condition
  // -------------------------------------------------------------------------

  describe('shouldStop', () => {
    it('stops batch early when shouldStop returns true', async () => {
      const actionFn = vi.fn().mockResolvedValue(undefined);
      let callCount = 0;
      const shouldStop = vi.fn().mockImplementation(() => {
        callCount++;
        return callCount >= 2; // stop after 2 items
      });

      const result = await runGuardedBatch(['a', 'b', 'c', 'd', 'e'], actionFn, {
        dryRun: false,
        delay: noDelay,
        shouldStop,
      });

      expect(actionFn).toHaveBeenCalledTimes(2);
      expect(result.succeeded).toBe(2);
    });

    it('shouldStop receives current results array', async () => {
      const actionFn = vi.fn().mockResolvedValue(undefined);
      const capturedResults = [];
      const shouldStop = vi.fn().mockImplementation((results) => {
        capturedResults.push([...results]);
        return false;
      });

      await runGuardedBatch(['a', 'b'], actionFn, {
        dryRun: false,
        delay: noDelay,
        shouldStop,
      });

      expect(capturedResults[0]).toHaveLength(1);
      expect(capturedResults[1]).toHaveLength(2);
    });

    it('does not call shouldStop in dry-run', async () => {
      const shouldStop = vi.fn().mockReturnValue(false);
      await runGuardedBatch(['a', 'b'], vi.fn(), { dryRun: true, shouldStop });
      expect(shouldStop).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // onProgress — guarded against non-function and throwing callbacks
  // -------------------------------------------------------------------------

  describe('onProgress', () => {
    it('calls onProgress after each item with correct counts', async () => {
      const onProgress = vi.fn();
      await runGuardedBatch(['a', 'b', 'c'], vi.fn().mockResolvedValue(undefined), {
        dryRun: false,
        delay: noDelay,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenNthCalledWith(1, { attempted: 1, total: 3 });
      expect(onProgress).toHaveBeenNthCalledWith(3, { attempted: 3, total: 3 });
    });

    it('non-function onProgress does not throw', async () => {
      await expect(
        runGuardedBatch(['a'], vi.fn().mockResolvedValue(undefined), {
          dryRun: false,
          delay: noDelay,
          onProgress: true,
        })
      ).resolves.not.toThrow();
    });

    it('throwing onProgress does not corrupt batch state', async () => {
      const actionFn = vi.fn().mockResolvedValue(undefined);
      const onProgress = vi.fn().mockImplementation(() => { throw new Error('progress error'); });

      const result = await runGuardedBatch(['a', 'b', 'c'], actionFn, {
        dryRun: false,
        delay: noDelay,
        onProgress,
      });

      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // randomDelay — guard min > max
  // -------------------------------------------------------------------------

  describe('randomDelay', () => {
    it('throws when min > max', () => {
      expect(() => randomDelay(3000, 1000)).toThrow(/min.*max/i);
    });

    it('accepts equal min and max', async () => {
      await expect(randomDelay(0, 0)).resolves.toBeUndefined();
    });
  });
});

// =============================================================================
// likeFacebookPosts (Story 2.2)
// =============================================================================

describe('likeFacebookPosts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // AC1, AC3.8 — dry-run default (no likeFn invocation, preview returned)
  // -------------------------------------------------------------------------

  describe('dry-run default', () => {
    it('returns preview without calling likeFn', async () => {
      const fakePage = {};
      const likeFnSpy = vi.fn();
      const postUrls = ['https://facebook.com/post/1', 'https://facebook.com/post/2'];

      const result = await likeFacebookPosts(fakePage, postUrls, { likeFn: likeFnSpy });

      expect(likeFnSpy).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
      expect(result.preview).toHaveLength(2);
      expect(result.preview[0].target).toBe(postUrls[0]);
    });
  });

  // -------------------------------------------------------------------------
  // AC1.3 — dryRun:false invokes likeFn per URL with delay seam
  // -------------------------------------------------------------------------

  describe('dryRun:false — real write', () => {
    it('calls likeFn once per URL through runGuardedBatch', async () => {
      const fakePage = {};
      const likeFnSpy = vi.fn().mockResolvedValue({ liked: true, alreadyLiked: false });
      const postUrls = ['https://facebook.com/post/1', 'https://facebook.com/post/2'];

      const result = await likeFacebookPosts(fakePage, postUrls, {
        dryRun: false,
        likeFn: likeFnSpy,
        delay: noDelay,
      });

      expect(likeFnSpy).toHaveBeenCalledTimes(2);
      expect(likeFnSpy).toHaveBeenNthCalledWith(1, fakePage, postUrls[0]);
      expect(likeFnSpy).toHaveBeenNthCalledWith(2, fakePage, postUrls[1]);
      expect(result.dryRun).toBe(false);
      expect(result.succeeded).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // AC3.9 — alreadyLiked field in result
  // -------------------------------------------------------------------------

  describe('alreadyLiked handling', () => {
    it('includes alreadyLiked:true in result when post already liked', async () => {
      const fakePage = {};
      const likeFnSpy = vi.fn().mockResolvedValue({ liked: false, alreadyLiked: true });
      const postUrls = ['https://facebook.com/post/already-liked'];

      const result = await likeFacebookPosts(fakePage, postUrls, {
        dryRun: false,
        likeFn: likeFnSpy,
        delay: noDelay,
      });

      expect(result.results[0].ok).toBe(true);
      expect(result.results[0].alreadyLiked).toBe(true);
    });

    it('includes alreadyLiked:false when newly liked', async () => {
      const fakePage = {};
      const likeFnSpy = vi.fn().mockResolvedValue({ liked: true, alreadyLiked: false });
      const postUrls = ['https://facebook.com/post/new'];

      const result = await likeFacebookPosts(fakePage, postUrls, {
        dryRun: false,
        likeFn: likeFnSpy,
        delay: noDelay,
      });

      expect(result.results[0].ok).toBe(true);
      expect(result.results[0].alreadyLiked).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // AC2.7 — button not found error propagates as result.ok=false
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('records ok:false when likeFn throws (button not found)', async () => {
      const fakePage = {};
      const likeFnSpy = vi.fn().mockRejectedValue(new Error('❌ Like button not found'));
      const postUrls = ['https://facebook.com/post/broken'];

      const result = await likeFacebookPosts(fakePage, postUrls, {
        dryRun: false,
        likeFn: likeFnSpy,
        delay: noDelay,
        maxRetry: 0,
      });

      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].error).toContain('Like button not found');
      expect(result.failed).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // AC1.2, AC4.11 — over-maxBatch throws (inherited from runGuardedBatch)
  // -------------------------------------------------------------------------

  describe('maxBatch enforcement', () => {
    it('throws when postUrls.length > maxBatch (inherited)', async () => {
      const fakePage = {};
      const postUrls = Array.from({ length: 21 }, (_, i) => `https://facebook.com/post/${i}`);

      await expect(
        likeFacebookPosts(fakePage, postUrls, { dryRun: false, delay: noDelay })
      ).rejects.toThrow(/maxBatch/i);
    });
  });
});

// =============================================================================
// commentOnFacebookPosts (Story 2.3)
// =============================================================================

describe('commentOnFacebookPosts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // AC1, AC3.9 — dry-run default (no commentFn invocation, preview returned)
  // -------------------------------------------------------------------------

  describe('dry-run default', () => {
    it('returns preview without calling commentFn', async () => {
      const fakePage = {};
      const commentFnSpy = vi.fn();
      const postUrls = ['https://facebook.com/post/1', 'https://facebook.com/post/2'];
      const commentText = 'Great post!';

      const result = await commentOnFacebookPosts(fakePage, postUrls, commentText, { commentFn: commentFnSpy });

      expect(commentFnSpy).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
      expect(result.preview).toHaveLength(2);
      expect(result.preview[0].target).toBe(postUrls[0]);
      expect(result.preview[0].previewComment).toBe(commentText);
    });
  });

  // -------------------------------------------------------------------------
  // AC1.3 — dryRun:false invokes commentFn per URL with delay seam
  // -------------------------------------------------------------------------

  describe('dryRun:false — real write', () => {
    it('calls commentFn once per URL through runGuardedBatch', async () => {
      const fakePage = {};
      const commentFnSpy = vi.fn().mockResolvedValue({ commented: true });
      const postUrls = ['https://facebook.com/post/1', 'https://facebook.com/post/2'];
      const commentText = 'Nice work!';

      const result = await commentOnFacebookPosts(fakePage, postUrls, commentText, {
        dryRun: false,
        commentFn: commentFnSpy,
        delay: noDelay,
      });

      expect(commentFnSpy).toHaveBeenCalledTimes(2);
      expect(commentFnSpy).toHaveBeenNthCalledWith(1, fakePage, postUrls[0], commentText);
      expect(commentFnSpy).toHaveBeenNthCalledWith(2, fakePage, postUrls[1], commentText);
      expect(result.dryRun).toBe(false);
      expect(result.succeeded).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // AC3.10 — commentText field in result
  // -------------------------------------------------------------------------

  describe('commentText in results', () => {
    it('includes commentText in real-run results', async () => {
      const fakePage = {};
      const commentFnSpy = vi.fn().mockResolvedValue({ commented: true });
      const postUrls = ['https://facebook.com/post/test'];
      const commentText = 'Test comment';

      const result = await commentOnFacebookPosts(fakePage, postUrls, commentText, {
        dryRun: false,
        commentFn: commentFnSpy,
        delay: noDelay,
      });

      expect(result.results[0].ok).toBe(true);
      expect(result.results[0].commentText).toBe(commentText);
    });
  });

  // -------------------------------------------------------------------------
  // AC2.8 — comment input not found error propagates as result.ok=false
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('records ok:false when commentFn throws (input not found)', async () => {
      const fakePage = {};
      const commentFnSpy = vi.fn().mockRejectedValue(new Error('❌ Comment input not found'));
      const postUrls = ['https://facebook.com/post/broken'];
      const commentText = 'Test';

      const result = await commentOnFacebookPosts(fakePage, postUrls, commentText, {
        dryRun: false,
        commentFn: commentFnSpy,
        delay: noDelay,
        maxRetry: 0,
      });

      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].error).toContain('Comment input not found');
      expect(result.failed).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // AC1.2 — over-maxBatch throws (inherited from runGuardedBatch)
  // -------------------------------------------------------------------------

  describe('maxBatch enforcement', () => {
    it('throws when postUrls.length > maxBatch (inherited)', async () => {
      const fakePage = {};
      const postUrls = Array.from({ length: 21 }, (_, i) => `https://facebook.com/post/${i}`);
      const commentText = 'Test';

      await expect(
        commentOnFacebookPosts(fakePage, postUrls, commentText, { dryRun: false, delay: noDelay })
      ).rejects.toThrow(/maxBatch/i);
    });
  });
});

// =============================================================================
// createFacebookPost (Story 2.4)
// =============================================================================

describe('createFacebookPost', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // AC1, AC3.9 — dry-run default (no createPostFn invocation, preview returned)
  // -------------------------------------------------------------------------

  describe('dry-run default', () => {
    it('returns preview without calling createPostFn', async () => {
      const fakePage = {};
      const createPostFnSpy = vi.fn();
      const content = 'Hello from XActions!';

      const result = await createFacebookPost(fakePage, content, { createPostFn: createPostFnSpy });

      expect(createPostFnSpy).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
      expect(result.preview).toHaveLength(1);
      expect(result.preview[0].target).toBe(content);
      expect(result.preview[0].previewContent).toBe(content);
    });
  });

  // -------------------------------------------------------------------------
  // AC1.3 — dryRun:false invokes createPostFn with content
  // -------------------------------------------------------------------------

  describe('dryRun:false — real write', () => {
    it('calls createPostFn once with correct content', async () => {
      const fakePage = {};
      const createPostFnSpy = vi.fn().mockResolvedValue({ posted: true, postUrl: 'https://facebook.com/posts/123' });
      const content = 'Test post content';

      const result = await createFacebookPost(fakePage, content, {
        dryRun: false,
        createPostFn: createPostFnSpy,
        delay: noDelay,
      });

      expect(createPostFnSpy).toHaveBeenCalledTimes(1);
      expect(createPostFnSpy).toHaveBeenCalledWith(fakePage, content);
      expect(result.dryRun).toBe(false);
      expect(result.succeeded).toBe(1);
    });

    it('routes through single-item batch for guardrail consistency', async () => {
      const fakePage = {};
      const createPostFnSpy = vi.fn().mockResolvedValue({ posted: true });
      const content = 'Single post content';

      const result = await createFacebookPost(fakePage, content, {
        dryRun: false,
        createPostFn: createPostFnSpy,
        delay: noDelay,
      });

      expect(result.attempted).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].target).toBe(content);
    });
  });

  // -------------------------------------------------------------------------
  // AC3.10 — content field in result
  // -------------------------------------------------------------------------

  describe('content in results', () => {
    it('includes content in real-run results', async () => {
      const fakePage = {};
      const createPostFnSpy = vi.fn().mockResolvedValue({ posted: true });
      const content = 'My post text';

      const result = await createFacebookPost(fakePage, content, {
        dryRun: false,
        createPostFn: createPostFnSpy,
        delay: noDelay,
      });

      expect(result.results[0].ok).toBe(true);
      expect(result.results[0].content).toBe(content);
    });
  });

  // -------------------------------------------------------------------------
  // AC2.8 — composer not found error propagates as result.ok=false
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('records ok:false when createPostFn throws (composer not found)', async () => {
      const fakePage = {};
      const createPostFnSpy = vi.fn().mockRejectedValue(new Error('❌ Post composer not found'));
      const content = 'Test post';

      const result = await createFacebookPost(fakePage, content, {
        dryRun: false,
        createPostFn: createPostFnSpy,
        delay: noDelay,
        maxRetry: 0,
      });

      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].error).toContain('Post composer not found');
      expect(result.failed).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // AC4 — account-risk warning fires before real write
  // -------------------------------------------------------------------------

  describe('account-risk warning', () => {
    it('surfaces account-risk warning on real run', async () => {
      const fakePage = {};
      const createPostFnSpy = vi.fn().mockResolvedValue({ posted: true });
      const content = 'Test post';

      const result = await createFacebookPost(fakePage, content, {
        dryRun: false,
        createPostFn: createPostFnSpy,
        delay: noDelay,
      });

      expect(result.warning).toBeTruthy();
      expect(result.warning).toMatch(/warning/i);
    });

    it('no warning on dry-run', async () => {
      const fakePage = {};
      const content = 'Test post';

      const result = await createFacebookPost(fakePage, content, { createPostFn: vi.fn() });

      expect(result.warning).toBeNull();
    });
  });
});
