// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The shared Puppeteer singleton must be closed when a real bulk run ends.
 * Without it the CLI process stays alive on the browser's pipes forever and
 * never exits after printing its own summary (a `bulk follow` that finishes
 * in 25s still hangs the shell).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { closeBrowser } from '../../src/mcp/local-tools.js';
import { bulkExecute } from '../../src/bulk/bulkOperations.js';

vi.mock('../../src/mcp/local-tools.js', () => ({
  closeBrowser: vi.fn(async () => {}),
}));

let stateDir;

beforeEach(() => {
  stateDir = mkdtempSync(join(tmpdir(), 'xactions-bulk-cleanup-'));
  closeBrowser.mockClear();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(stateDir, { recursive: true, force: true });
});

const base = () => ({ delayMs: 0, batchSize: 1000, maxRetries: 1, stateDir });

describe('bulkExecute — browser cleanup', () => {
  it('closes the shared browser after a real run', async () => {
    const executor = vi.fn().mockResolvedValue({ success: true, status: 'success' });

    await bulkExecute(['alpha'], 'follow', { ...base(), executor });

    expect(closeBrowser).toHaveBeenCalledTimes(1);
  });

  it('closes the shared browser even when every action failed', async () => {
    const executor = vi.fn().mockResolvedValue({
      success: false,
      status: 'failed',
      message: 'not confirmed',
    });

    const result = await bulkExecute(['alpha'], 'follow', { ...base(), executor });

    expect(result.failed).toBe(1);
    expect(closeBrowser).toHaveBeenCalledTimes(1);
  });

  it('opens nothing for a dry run and leaves it alone', async () => {
    await bulkExecute(['alpha'], 'follow', { ...base(), dryRun: true, executor: vi.fn() });

    expect(closeBrowser).not.toHaveBeenCalled();
  });
});
