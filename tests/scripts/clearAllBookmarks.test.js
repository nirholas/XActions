// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests — src/clearAllBookmarks.js
 * @author nich (@nichxbt)
 *
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://x.com/" }
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(here, '../../src/clearAllBookmarks.js'), 'utf8');

function paste() {
  new Function(SOURCE)();
}

function visit(path) {
  window.history.replaceState({}, '', path);
}

function addBulkClearButtons() {
  const clearAllButton = document.createElement('button');
  clearAllButton.setAttribute('data-testid', 'clearBookmarks');
  vi.spyOn(clearAllButton, 'click');

  const confirmButton = document.createElement('button');
  confirmButton.setAttribute('data-testid', 'confirmationSheetConfirm');
  vi.spyOn(confirmButton, 'click');

  document.body.append(clearAllButton, confirmButton);
  return { clearAllButton, confirmButton };
}

beforeEach(() => {
  document.body.innerHTML = '';
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('bookmarks route guard', () => {
  it.each(['/history', '/bookmarks', '/i/bookmarks'])('runs on %s', async (path) => {
    vi.useFakeTimers();
    visit(path);
    const { clearAllButton, confirmButton } = addBulkClearButtons();

    paste();
    await vi.runAllTimersAsync();

    expect(clearAllButton.click).toHaveBeenCalledOnce();
    expect(confirmButton.click).toHaveBeenCalledOnce();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('rejects unrelated routes', () => {
    visit('/settings');
    paste();

    expect(console.error).toHaveBeenCalledWith('❌ Navigate to x.com/i/history first!');
  });
});