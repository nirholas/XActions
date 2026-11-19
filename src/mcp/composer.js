// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Driving X's post composer from Puppeteer.
 *
 * X changed the composer under the MCP tools in two ways at once, which is
 * why `x_post_tweet` answered "Could not post tweet" on every call
 * (diagnosed by @MurlocYat in https://github.com/nirholas/XActions/pull/25):
 *
 *   1. `/compose/tweet` now redirects to `/compose/post`, so going straight to
 *      the old route raced the redirect. The composer is opened the way a
 *      person opens it: from /home, through the sidebar's post button.
 *   2. The text area is a contenteditable DIV run by React, not an input.
 *      `ElementHandle.type()` focuses it programmatically, which does not
 *      give the editor a caret, so the keystrokes never reached React state
 *      and the post button stayed disabled. Clicking the editor first and
 *      typing through `page.keyboard` does.
 *
 * On top of the PR, every step here checks its own result: the text is read
 * back out of the editor before anything is posted, the post button must be
 * enabled before it is clicked, and a post only counts once X confirms it
 * (the typed text has left every composer, or X shows a toast that is not an
 * error). Before this the tools returned success as soon as a click landed.
 *
 * The page-side functions passed to `evaluate` and `waitForFunction` are
 * self-contained on purpose: Puppeteer serialises them into the page.
 *
 * @module mcp/composer
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { gotoAndRender } from '../utils/navigation.js';

export const COMPOSE_SELECTORS = Object.freeze({
  // The sidebar button. The href forms are the PR's fallback for an
  // account whose sidebar renders without the testid.
  openButton:
    'a[data-testid="SideNav_NewTweet_Button"], a[href="/compose/post"], a[href="/compose/tweet"]',
  textbox: (index = 0) => `[data-testid="tweetTextarea_${index}"]`,
  dialogTextbox: (index = 0) => `[role="dialog"] [data-testid="tweetTextarea_${index}"]`,
  toast: '[data-testid="toast"]',
});

/**
 * Toast text that reports a failure rather than a sent post. X uses the same
 * toast for "Your post was sent" and for "Whoops! You already said that."
 */
export const ERROR_TOAST_PATTERN =
  "went wrong|already said|try again|couldn.?t|could not|failed|limit|not allowed|suspended|locked|restricted";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Open the compose dialog.
 *
 * @param {object} pg Puppeteer page
 * @param {object} [options]
 * @param {number} [options.timeout=8000] how long to wait for the editor after the click
 * @returns {Promise<boolean>} whether an editor is on screen
 */
export async function openComposer(pg, { timeout = 8000 } = {}) {
  const navReady = await gotoAndRender(pg, 'https://x.com/home', COMPOSE_SELECTORS.openButton);
  if (navReady) {
    const button = await pg.$(COMPOSE_SELECTORS.openButton);
    if (button) {
      await button.click();
      // /home carries its own inline composer, so only the dialog's editor
      // proves the click opened anything.
      if (await waitForSelectorQuietly(pg, COMPOSE_SELECTORS.dialogTextbox(0), timeout)) return true;
    }
  }
  // Fall back to the route itself, the one /compose/tweet redirects to.
  return gotoAndRender(pg, 'https://x.com/compose/post', COMPOSE_SELECTORS.textbox(0));
}

/**
 * Click the editor and type into it with real key events, then read it back.
 *
 * @param {object} pg Puppeteer page
 * @param {number} index which editor (threads number them 0, 1, 2, ...)
 * @param {string} text
 * @param {object} [options]
 * @param {number} [options.delay=30] ms between keystrokes
 * @param {number} [options.timeout=5000] how long to wait for the editor
 * @returns {Promise<boolean>} whether the text is now in the editor
 */
export async function typeIntoComposer(pg, index, text, { delay = 30, timeout = 5000 } = {}) {
  if (!(await waitForSelectorQuietly(pg, COMPOSE_SELECTORS.textbox(index), timeout))) return false;

  const handle = await pg.evaluateHandle(pickComposerTextbox, index);
  const editor = handle?.asElement?.() || null;
  if (!editor) {
    await handle?.dispose?.();
    return false;
  }

  await editor.click();
  await pg.keyboard.type(text, { delay });
  await sleep(300);

  return editor.evaluate((el, expected) => {
    const squash = (s) => String(s || '').replace(/\s+/g, '');
    return squash(el.textContent).includes(squash(expected));
  }, text);
}

/**
 * Wait for the post button to enable, then click it from inside the page.
 *
 * The PR clicks through `evaluate` rather than a synthetic mouse click; a
 * DOM click reaches React's root listener even when an overlay (the mention
 * typeahead, a toast) sits over the button's centre.
 *
 * @param {object} pg Puppeteer page
 * @param {object} [options]
 * @param {string[]} [options.testids] candidates, in preference order
 * @param {number} [options.timeout=5000]
 * @returns {Promise<boolean>} whether a button was clicked
 */
export async function clickPostButton(pg, { testids = ['tweetButton'], timeout = 5000 } = {}) {
  try {
    await pg.waitForFunction(findEnabledPostButton, { timeout, polling: 200 }, testids, false);
  } catch {
    return false;
  }
  return pg.evaluate(findEnabledPostButton, testids, true);
}

/**
 * Wait for X to confirm that what was typed has been posted.
 *
 * Confirmation is either a toast that is not an error, or the typed text no
 * longer being in any editor (the dialog closed, or the inline reply box
 * cleared). An error toast fails at once; silence fails at the timeout.
 *
 * @param {object} pg Puppeteer page
 * @param {object} options
 * @param {string} options.typed the text that went into the first editor
 * @param {number} [options.timeout=10000]
 * @returns {Promise<{ ok: boolean, via?: string, toast?: string, reason?: string }>}
 */
export async function confirmPosted(pg, { typed, timeout = 10000 }) {
  try {
    const handle = await pg.waitForFunction(
      readPostOutcome,
      { timeout, polling: 250 },
      { typed, errorPattern: ERROR_TOAST_PATTERN },
    );
    const outcome = await handle.jsonValue();
    await handle.dispose?.();
    if (outcome.ok) return outcome;
    return { ...outcome, reason: `X refused the post: ${outcome.toast}` };
  } catch {
    return {
      ok: false,
      reason: `X did not confirm the post within ${Math.round(timeout / 1000)}s; the composer still holds the text`,
    };
  }
}

/**
 * Set native <select> elements in the topmost dialog that has any, by label.
 *
 * X's schedule dialog and poll length picker are plain selects. Each wanted
 * entry is matched by aria-label or id, then by its position as a fallback,
 * and the option by visible text or value. The logic follows
 * `scripts/twitter/schedule-post.js`.
 *
 * @param {object} pg Puppeteer page
 * @param {Array<{ label: string, value: string, position?: number }>} wanted
 * @returns {Promise<{ found: boolean, failed: string[] }>}
 */
export async function setDialogSelects(pg, wanted) {
  return pg.evaluate((entries) => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
      .filter((d) => d.querySelector('select'));
    const root = dialogs[dialogs.length - 1] || document;
    const selects = Array.from(root.querySelectorAll('select'));
    if (selects.length === 0) return { found: false, failed: entries.map((e) => e.label) };

    const byLabel = (label) => selects.find((s) => {
      const aria = (s.getAttribute('aria-label') || '').toLowerCase();
      const id = (s.getAttribute('id') || '').toLowerCase();
      return aria.includes(label) || id.includes(label);
    });
    const setByText = (select, value) => {
      const target = String(value).trim().toLowerCase();
      const opts = Array.from(select.options);
      const match =
        opts.find((o) => o.textContent.trim().toLowerCase() === target) ||
        opts.find((o) => o.value.trim().toLowerCase() === target) ||
        opts.find((o) => o.textContent.trim().toLowerCase().startsWith(target));
      if (!match) return false;
      select.value = match.value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };

    const failed = [];
    for (const { label, value, position } of entries) {
      const select = byLabel(label.toLowerCase()) ||
        (Number.isInteger(position) ? selects[position] : undefined);
      if (!select || !setByText(select, value)) failed.push(label);
    }
    return { found: true, failed };
  }, wanted);
}

/**
 * The schedule dialog's select values for a local date and time.
 *
 * @param {Date} when
 * @returns {Array<{ label: string, value: string, position: number }>}
 */
export function scheduleSelectValues(when) {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const hours = when.getHours();
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return [
    { label: 'month', value: MONTHS[when.getMonth()], position: 0 },
    { label: 'day', value: String(when.getDate()), position: 1 },
    { label: 'year', value: String(when.getFullYear()), position: 2 },
    { label: 'hour', value: String(hour12), position: 3 },
    { label: 'minute', value: String(when.getMinutes()).padStart(2, '0'), position: 4 },
    { label: 'am', value: hours < 12 ? 'AM' : 'PM', position: 5 },
  ];
}

/**
 * The poll length picker's select values for a duration in minutes.
 *
 * @param {number} totalMinutes 5 to 10080 (seven days)
 * @returns {Array<{ label: string, value: string }>}
 */
export function pollDurationValues(totalMinutes) {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [
    { label: 'days', value: String(days) },
    { label: 'hours', value: String(hours) },
    { label: 'minutes', value: String(minutes) },
  ];
}

// ---------------------------------------------------------------------------
// Page-side functions (serialised into the page; keep them self-contained)
// ---------------------------------------------------------------------------

/**
 * The editor to type into: the dialog's when a dialog is open, otherwise the
 * last one on the page (dialogs mount after the timeline's inline composer).
 */
export function pickComposerTextbox(index) {
  const all = Array.from(document.querySelectorAll(`[data-testid="tweetTextarea_${index}"]`));
  if (all.length === 0) return null;
  return all.find((el) => el.closest('[role="dialog"]')) || all[all.length - 1];
}

/**
 * True once one of the candidate post buttons is present and enabled (the
 * dialog's in preference to the page's); with `press`, also clicks it.
 */
export function findEnabledPostButton(ids, press) {
  for (const id of ids) {
    const all = Array.from(document.querySelectorAll(`[data-testid="${id}"]`));
    const btn = all.find((b) => b.closest('[role="dialog"]')) || all[all.length - 1];
    if (btn && btn.getAttribute('aria-disabled') !== 'true' && !btn.disabled) {
      if (press) btn.click();
      return true;
    }
  }
  return false;
}

/** Falsy while undecided; an outcome object once X has answered. */
export function readPostOutcome({ typed, errorPattern }) {
  const toast = document.querySelector('[data-testid="toast"]');
  const toastText = toast ? toast.textContent.trim() : '';
  if (toastText && new RegExp(errorPattern, 'i').test(toastText)) {
    return { ok: false, via: 'toast', toast: toastText };
  }
  if (toastText) return { ok: true, via: 'toast', toast: toastText };

  const squash = (s) => String(s || '').replace(/\s+/g, '');
  const wanted = squash(typed);
  if (!wanted) return false;
  const editors = Array.from(document.querySelectorAll('[data-testid^="tweetTextarea_"]'));
  const stillThere = editors.some((el) => squash(el.textContent).includes(wanted));
  return stillThere ? false : { ok: true, via: 'composer-closed' };
}

async function waitForSelectorQuietly(pg, selector, timeout) {
  try {
    await pg.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}
