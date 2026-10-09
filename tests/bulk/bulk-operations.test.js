// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Bulk counts. A follow that X never confirmed must not reach the "Succeeded"
 * tally, `--dry-run` must touch nothing, and `--resume` must skip what a
 * previous run already reported.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bulkExecute, parseBulkInput } from '../../src/bulk/bulkOperations.js';

let stateDir;
let logs;

beforeEach(() => {
  stateDir = mkdtempSync(join(tmpdir(), 'xactions-bulk-'));
  logs = [];
  vi.spyOn(console, 'log').mockImplementation((...args) => {
    logs.push(args.join(' '));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(stateDir, { recursive: true, force: true });
});

// A getter, not a literal: stateDir only exists once beforeEach has run, and
// a literal would capture the value it had when this module was evaluated.
const base = () => ({ delayMs: 0, batchSize: 1000, maxRetries: 1, stateDir });
const output = () => logs.join('\n');

describe('bulkExecute — dry run', () => {
  it('prints what it would do and runs nothing', async () => {
    const executor = vi.fn();
    const result = await bulkExecute(['alpha', 'beta'], 'follow', {
      ...base(),
      dryRun: true,
      executor,
    });

    expect(executor).not.toHaveBeenCalled();
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(output()).toContain('[DRY RUN] [1/2] Would follow @alpha');
    expect(output()).toContain('[DRY RUN] [2/2] Would follow @beta');
    expect(readdirSync(stateDir).filter((f) => f.startsWith('bulk-progress-'))).toHaveLength(0);
  });
});

describe('bulkExecute — outcomes', () => {
  it('counts a confirmed follow as succeeded', async () => {
    const executor = vi.fn().mockResolvedValue({
      success: true,
      status: 'success',
      message: 'Following @alpha',
    });

    const result = await bulkExecute(['alpha'], 'follow', { ...base(), executor });

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.results.succeeded).toEqual(['alpha']);
    expect(output()).toContain('✅ follow @alpha');
  });

  it('does not count a follow X never confirmed', async () => {
    const executor = vi.fn().mockResolvedValue({
      success: false,
      status: 'failed',
      message: 'Follow of @alpha was not confirmed: the button still reads Follow',
    });

    const result = await bulkExecute(['alpha'], 'follow', { ...base(), executor });

    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.results.failed[0]).toMatchObject({
      username: 'alpha',
      status: 'failed',
      error: 'Follow of @alpha was not confirmed: the button still reads Follow',
    });
    expect(output()).not.toContain('✅ follow @alpha');
    expect(output()).toContain('❌ Failed @alpha');
  });

  it('separates an account already followed from a new follow', async () => {
    const executor = vi.fn().mockResolvedValue({
      success: true,
      status: 'already_following',
      message: 'Already following @alpha',
    });

    const result = await bulkExecute(['alpha'], 'follow', { ...base(), executor });

    expect(result.succeeded).toBe(0);
    expect(result.alreadyFollowing).toBe(1);
    expect(output()).toContain('Already following @alpha');
    expect(output()).toContain('Already following: 1');
  });

  it('treats a tool that reports nothing as having run nothing', async () => {
    const result = await bulkExecute(['alpha'], 'block', { ...base(), executor: async () => undefined });

    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.results.failed[0].error).toContain('no implementation');
  });

  it('counts an unconfirmed object without a status as success', async () => {
    const result = await bulkExecute(['alpha'], 'scrape-profile', {
      ...base(),
      executor: async () => ({ username: 'alpha', followers: 10 }),
    });

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('counts an explicit success:false as failure', async () => {
    const result = await bulkExecute(['alpha'], 'follow', {
      ...base(),
      executor: async () => ({ success: false, message: 'Could not follow @alpha' }),
    });

    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.results.failed[0].error).toBe('Could not follow @alpha');
  });
});

describe('bulkExecute — errors and retries', () => {
  it('classifies a browser lifecycle error and reports the real reason', async () => {
    const executor = vi.fn().mockRejectedValue(new Error('browser.isConnected is not a function'));

    const result = await bulkExecute(['alpha'], 'follow', { ...base(), executor, maxRetries: 1 });

    expect(executor).toHaveBeenCalledTimes(2);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.results.failed[0]).toMatchObject({
      username: 'alpha',
      status: 'browser_error',
      error: 'browser.isConnected is not a function',
    });
    expect(output()).toContain('Retry 1/1 for @alpha: browser.isConnected is not a function');
    expect(output()).toContain('❌ Failed @alpha: browser.isConnected is not a function');
    expect(output()).not.toContain('✅ follow @alpha');
  });

  it('does not retry an authentication failure', async () => {
    const executor = vi.fn().mockResolvedValue({
      success: false,
      status: 'auth_error',
      message: 'Not logged in to X',
    });

    const result = await bulkExecute(['alpha'], 'follow', { ...base(), executor, maxRetries: 3 });

    expect(executor).toHaveBeenCalledTimes(1);
    expect(result.failed).toBe(1);
    expect(result.results.failed[0].status).toBe('auth_error');
  });

  it('stops early when the session refuses every account', async () => {
    const executor = vi.fn().mockResolvedValue({
      success: false,
      status: 'auth_error',
      message: 'Not logged in to X',
    });

    const result = await bulkExecute(['a', 'b', 'c', 'd', 'e'], 'follow', {
      ...base(),
      executor,
      maxRetries: 0,
    });

    expect(executor).toHaveBeenCalledTimes(3);
    expect(result.failed).toBe(3);
    expect(result.remaining).toBe(2);
    expect(result.stoppedEarly).toContain('xactions login');
    expect(output()).toContain('stopped early');
  });

  it('keeps going after a failure that is worth retrying', async () => {
    const executor = vi
      .fn()
      .mockRejectedValueOnce(new Error('Navigation timeout of 30000 ms exceeded'))
      .mockResolvedValueOnce({ success: true, status: 'success' });

    const result = await bulkExecute(['alpha'], 'follow', { ...base(), executor, maxRetries: 1 });

    expect(executor).toHaveBeenCalledTimes(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
  });
});

describe('bulkExecute — summary', () => {
  it('prints counts that match what actually happened', async () => {
    const executor = vi
      .fn()
      .mockResolvedValueOnce({ success: true, status: 'success' })
      .mockResolvedValueOnce({ success: true, status: 'already_following' })
      .mockResolvedValueOnce({ success: false, status: 'failed', message: 'nope' });

    const result = await bulkExecute(['a', 'b', 'c'], 'follow', { ...base(), executor });

    expect(result.total).toBe(3);
    expect(result.succeeded).toBe(1);
    expect(result.alreadyFollowing).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(0);

    const text = output();
    expect(text).toContain('📊 Bulk follow complete:');
    expect(text).toContain('✅ Succeeded: 1');
    expect(text).toContain('Already following: 1');
    expect(text).toContain('❌ Failed: 1');
    expect(text).toContain('Blacklisted: 0');
  });

  it('skips blacklisted accounts before touching the executor', async () => {
    writeFileSync(join(stateDir, 'blacklist.txt'), 'alpha\n');
    const executor = vi.fn().mockResolvedValue({ success: true, status: 'success' });

    const result = await bulkExecute(['alpha', 'beta'], 'follow', { ...base(), executor });

    expect(result.skippedBlacklist).toBe(1);
    expect(executor).toHaveBeenCalledTimes(1);
    expect(executor).toHaveBeenCalledWith('beta', expect.anything());
  });
});

describe('bulkExecute — resume', () => {
  it('skips users a previous run already reported', async () => {
    const first = vi.fn().mockResolvedValue({ success: true, status: 'success' });
    await bulkExecute(['alpha', 'beta'], 'follow', { ...base(), executor: first });

    const second = vi.fn().mockResolvedValue({ success: true, status: 'success' });
    const result = await bulkExecute(['alpha', 'beta'], 'follow', {
      ...base(),
      executor: second,
      resume: true,
    });

    expect(second).not.toHaveBeenCalled();
    expect(result.total).toBe(0);
    expect(output()).toMatch(/Resuming: skipping 2 already-processed users/);
  });

  it('resumes from an explicit progress file', async () => {
    const progressFile = join(stateDir, 'bulk-progress-1.json');
    writeFileSync(
      progressFile,
      JSON.stringify({ action: 'follow', succeeded: ['alpha'], failed: [], already: [] }),
    );

    const executor = vi.fn().mockResolvedValue({ success: true, status: 'success' });
    const result = await bulkExecute(['alpha', 'beta'], 'follow', {
      ...base(),
      executor,
      resumeFrom: progressFile,
    });

    expect(executor).toHaveBeenCalledTimes(1);
    expect(executor).toHaveBeenCalledWith('beta', expect.anything());
    expect(result.total).toBe(1);
  });
});

describe('parseBulkInput', () => {
  it('reads one username per line and drops comments', async () => {
    const file = join(stateDir, 'targets.txt');
    writeFileSync(file, '# targets\n@alpha\n\nbeta\n');
    expect(await parseBulkInput(file)).toEqual(['alpha', 'beta']);
  });

  it('reads a CSV header column', async () => {
    const file = join(stateDir, 'targets.csv');
    writeFileSync(file, 'username,followers\nalpha,10\nbeta,20\n');
    expect(await parseBulkInput(file)).toEqual(['alpha', 'beta']);
  });
});
