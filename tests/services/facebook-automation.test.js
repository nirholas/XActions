// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
// XActions — Facebook Automation Guardrail Tests
// by nichxbt

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runGuardedBatch,
  ACCOUNT_RISK_WARNING,
} from '../../api/services/facebookAutomation.js';

const noDelay = () => {};

describe('runGuardedBatch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
  });

  // -------------------------------------------------------------------------
  // AC2.6 — batch over maxBatch is rejected
  // -------------------------------------------------------------------------

  describe('maxBatch enforcement', () => {
    it('throws when items.length > maxBatch (default 20)', async () => {
      const items = Array.from({ length: 21 }, (_, i) => `post-${i}`);
      await expect(
        runGuardedBatch(items, vi.fn(), { dryRun: false, delay: noDelay })
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

    it('does NOT throw on oversized batch in dry-run (no real action)', async () => {
      const items = Array.from({ length: 100 }, (_, i) => `post-${i}`);
      await expect(
        runGuardedBatch(items, vi.fn(), { dryRun: true })
      ).resolves.not.toThrow();
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
      // Warning fires before first actionFn call
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

      // delay called between items: N-1 times for N items
      expect(delaySpy).toHaveBeenCalledTimes(items.length - 1);
    });

    it('does not call delay in dry-run', async () => {
      const delaySpy = vi.fn();
      await runGuardedBatch(['a', 'b'], vi.fn(), { dryRun: true, delay: delaySpy });
      expect(delaySpy).not.toHaveBeenCalled();
    });
  });
});
