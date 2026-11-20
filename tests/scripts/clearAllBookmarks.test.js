// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * browser/clearAllBookmarks.js: the route guard.
 *
 * Some accounts are redirected from the bookmarks page to /i/history, and
 * the guard refused to run there. This pastes the real script into a jsdom
 * window the way DevTools would and checks which paths it accepts. Adapted
 * from @CameronHN's test in https://github.com/nirholas/XActions/pull/88.
 *
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://x.com/" }
 * @author nich (@nichxbt)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(here, '../../browser/clearAllBookmarks.js'), 'utf8');
const REFUSAL = '❌ Navigate to x.com/i/bookmarks first!';

/** Paste the script into the current jsdom window. */
function paste() {
  new Function(SOURCE)();
}

/** Point jsdom at a URL without reloading the document. */
function visit(url) {
  window.history.replaceState({}, '', url);
}

/**
 * The script tries X's bulk-clear button before anything else, so its
 * presence is a quick way to see that the guard let the run through.
 */
function addBulkClearButtons() {
  const clearAll = document.createElement('button');
  clearAll.setAttribute('data-testid', 'clearBookmarks');
  const confirm = document.createElement('button');
  confirm.setAttribute('data-testid', 'confirmationSheetConfirm');
  const clicks = { clearAll: 0, confirm: 0 };
  clearAll.addEventListener('click', () => { clicks.clearAll++; });
  confirm.addEventListener('click', () => { clicks.confirm++; });
  document.body.append(clearAll, confirm);
  return clicks;
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
  it.each(['/i/bookmarks', '/i/bookmarks/1234567890', '/i/history'])('runs on %s', async (path) => {
    vi.useFakeTimers();
    visit(path);
    const clicks = addBulkClearButtons();

    paste();
    await vi.runAllTimersAsync();

    expect(console.error).not.toHaveBeenCalledWith(REFUSAL);
    expect(clicks).toEqual({ clearAll: 1, confirm: 1 });
  });

  it.each(['/settings', '/search?q=/bookmarks', '/nasa/status/1/history'])('refuses %s', (url) => {
    visit(url);
    const clicks = addBulkClearButtons();

    paste();

    expect(console.error).toHaveBeenCalledWith(REFUSAL);
    expect(clicks).toEqual({ clearAll: 0, confirm: 0 });
  });
});
