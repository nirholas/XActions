// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Following on X, with the result proved before it is reported.
 *
 * The old path clicked whatever matched a selector and returned
 * `{ success: true }` because no exception was thrown. On a logged-out
 * session X serves a shell with no `data-testid` in it, nothing matched, no
 * follow happened, and `bulk follow` still printed `✅`. Here a follow counts
 * only once the profile's own button has moved to the following state, and
 * every other outcome carries a status the caller can act on.
 *
 * Everything takes its `page` as an argument, so the same flow runs against a
 * real tab and against the stub pages the tests drive.
 *
 * @module mcp/followAction
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

/** Statuses every action in this module can report. */
export const FOLLOW_STATUS = Object.freeze({
  SUCCESS: 'success',
  ALREADY: 'already_following',
  ALREADY_UNFOLLOWED: 'already_unfollowed',
  FAILED: 'failed',
  BROWSER: 'browser_error',
  AUTH: 'auth_error',
  RATE_LIMITED: 'rate_limited',
  NOT_FOUND: 'target_not_found',
});

/** Statuses worth repeating: the browser may just need relaunching. */
const RETRYABLE = new Set([FOLLOW_STATUS.FAILED, FOLLOW_STATUS.BROWSER]);

/**
 * Should a bulk run try this status again?
 * @param {string} status
 * @returns {boolean}
 */
export function isRetryableStatus(status) {
  return RETRYABLE.has(status);
}

/**
 * Statuses that mean the wanted state already holds.
 * @param {string} status
 * @returns {boolean}
 */
export function isSuccessStatus(status) {
  return status === FOLLOW_STATUS.SUCCESS || status === FOLLOW_STATUS.ALREADY;
}

const PROFILE_HEADER = '[data-testid="UserName"]';
const PLACEMENT = '[data-testid="placementTracking"]';
const FOLLOW_SELECTOR = `${PLACEMENT} [data-testid$="-follow"]:not([data-testid$="-unfollow"])`;
const UNFOLLOW_SELECTOR = `${PLACEMENT} [data-testid$="-unfollow"]`;
const CONFIRM_SELECTOR = '[data-testid="confirmationSheetConfirm"]';

const MISSING_PROFILE_RE = /doesn['’]t exist|Hmm\.\.\.|не існує|не существует|account suspended|заблокован/i;
const RATE_LIMIT_RE = /rate limit|too many|забагато|слишком много|try again later/i;
const LOGIN_DIALOG_RE = /sign in|log in|sign up|увійти|зареєстру|login/i;
const PENDING_RE = /pending|requested|запит надіслано|очікує/i;

const BROWSER_DEATH_RE =
  /is not a function|Target closed|Session closed|Protocol error|Connection closed|Navigation timeout|net::ERR_|Execution context was destroyed|frame got detached|Page closed|page has been closed/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The part of a profile page a follow decision needs. Runs inside the page,
 * so it closes over nothing.
 *
 * @returns {object} snapshot
 */
export function captureFollowSnapshot() {
  const q = (sel) => document.querySelector(sel);
  const placement = q('[data-testid="placementTracking"]');
  const buttons = placement
    ? Array.from(placement.querySelectorAll('[role="button"], button')).map((b) => ({
        testid: b.getAttribute('data-testid') || '',
        text: (b.textContent || '').trim().slice(0, 40),
        ariaLabel: b.getAttribute('aria-label') || '',
      }))
    : [];

  const body = document.body ? document.body.innerText : '';
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
    .map((d) => (d.innerText || '').trim().slice(0, 200))
    .filter(Boolean);

  return {
    url: String(location.href),
    testidCount: document.querySelectorAll('[data-testid]').length,
    signedIn: !!q('[data-testid="SideNav_NewTweet_Button"]'),
    profileRendered: !!q('[data-testid="UserName"]'),
    placementPresent: !!placement,
    confirmSheet: !!q('[data-testid="confirmationSheetConfirm"]'),
    toast: (q('[data-testid="toast"]')?.textContent || '').trim().slice(0, 200) || null,
    buttons,
    dialogs,
    bodyText: body.slice(0, 4000),
  };
}

/**
 * What the snapshot says about the account, without touching the page.
 *
 * @param {object|null} snap
 * @returns {{kind: string, detail?: string}}
 */
export function describeFollowState(snap) {
  if (!snap || typeof snap !== 'object') return { kind: 'not_rendered' };

  const buttons = Array.isArray(snap.buttons) ? snap.buttons : [];
  const body = typeof snap.bodyText === 'string' ? snap.bodyText : '';
  const rendered = !!snap.profileRendered;

  const following = buttons.some(
    (b) => /-unfollow$/.test(b.testid || '') || /^(following|unfollow)$/i.test((b.text || '').trim()),
  );
  const pending = !following && buttons.some((b) => PENDING_RE.test(b.text || ''));
  const canFollow = buttons.some(
    (b) => /-follow$/.test(b.testid || '') && !/-unfollow$/.test(b.testid || ''),
  );

  if (!rendered && MISSING_PROFILE_RE.test(body)) return { kind: 'target_not_found' };

  // X ships a stripped shell — no data-testid anywhere — to visitors it does
  // not know. There is no button to press and no session to press it with.
  if ((snap.testidCount || 0) < 5) return { kind: 'signed_out' };
  if (!rendered) return { kind: 'not_rendered' };

  if (following) return { kind: 'following' };
  if (pending) return { kind: 'pending' };
  if (canFollow) return { kind: 'ready' };
  return { kind: 'no_button' };
}

/**
 * Which status a thrown Puppeteer error deserves.
 *
 * @param {Error} error
 * @returns {string}
 */
export function classifyBrowserError(error) {
  const message = error?.message || String(error);
  return BROWSER_DEATH_RE.test(message) ? FOLLOW_STATUS.BROWSER : FOLLOW_STATUS.FAILED;
}

/**
 * Read the snapshot without letting a dead page take the caller down.
 *
 * @param {object} page
 * @returns {Promise<object|null>}
 */
async function snapshot(page) {
  try {
    const snap = await page.evaluate(captureFollowSnapshot);
    return snap && typeof snap === 'object' ? snap : null;
  } catch {
    return null;
  }
}

/**
 * Is this snapshot showing a login wall rather than a profile?
 *
 * @param {object} snap
 * @returns {boolean}
 */
function showsLoginWall(snap) {
  if (!snap) return false;
  const dialogs = Array.isArray(snap.dialogs) ? snap.dialogs.join(' ') : '';
  return LOGIN_DIALOG_RE.test(dialogs);
}

/**
 * Navigate to a profile and wait for it to be recognizable.
 *
 * @param {object} page
 * @param {string} username
 * @param {number} profileTimeout
 * @returns {Promise<{ok: true}|{ok: false, status: string, message: string}>}
 */
async function openProfile(page, username, profileTimeout) {
  try {
    await page.goto(`https://x.com/${username}`, { waitUntil: 'domcontentloaded' });
  } catch (error) {
    return {
      ok: false,
      status: classifyBrowserError(error),
      message: `Could not open @${username}: ${error.message}`,
    };
  }

  try {
    await page.waitForSelector(PROFILE_HEADER, { timeout: profileTimeout });
  } catch {
    // Missing profile, signed-out shell and slow render are told apart by the
    // snapshot below, which reads the page either way.
  }
  return { ok: true };
}

/**
 * Click the confirmation sheet if X put one in the way.
 *
 * @param {object} page
 * @returns {Promise<void>}
 */
async function confirmIfPresent(page) {
  try {
    const confirm = await page.$(CONFIRM_SELECTOR);
    if (confirm) await confirm.click();
  } catch {
    // A missing sheet is the normal case; a dead page is caught by the poll.
  }
}

/**
 * Keep reading the profile until the button state settles.
 *
 * @param {object} page
 * @param {{verifyTimeout: number, pollMs: number}} opts
 * @returns {Promise<{kind: string, snap: object|null}>}
 */
async function waitForOutcome(page, { verifyTimeout, pollMs }) {
  const deadline = Date.now() + verifyTimeout;
  let snap = null;

  for (;;) {
    snap = await snapshot(page);
    if (!snap) return { kind: 'browser_error', snap };

    const state = describeFollowState(snap);
    if (state.kind === 'following') return { kind: 'success', snap };
    if (state.kind === 'pending') return { kind: 'pending', snap };
    if (showsLoginWall(snap)) return { kind: 'auth_error', snap };
    if (snap.toast && RATE_LIMIT_RE.test(snap.toast)) return { kind: 'rate_limited', snap };
    if (snap.confirmSheet) await confirmIfPresent(page);

    if (Date.now() >= deadline) return { kind: 'unconfirmed', snap };
    await sleep(pollMs);
  }
}

/**
 * Follow an account and prove it.
 *
 * @param {object} page - an open Puppeteer page (or a test double)
 * @param {string} username - handle without `@`
 * @param {{profileTimeout?: number, verifyTimeout?: number, pollMs?: number, clickSettleMs?: number}} [options]
 * @returns {Promise<{success: boolean, status: string, message: string, username: string}>}
 */
export async function performFollow(page, username, options = {}) {
  const {
    profileTimeout = 20_000,
    verifyTimeout = 15_000,
    pollMs = 700,
    clickSettleMs = 400,
  } = options;

  const done = (success, status, message) => ({ success, status, message, username });

  if (!page || typeof page.goto !== 'function') {
    return done(false, FOLLOW_STATUS.BROWSER, 'No browser page available');
  }

  const opened = await openProfile(page, username, profileTimeout);
  if (!opened.ok) return done(false, opened.status, opened.message);

  let snap = await snapshot(page);
  if (!snap) return done(false, FOLLOW_STATUS.BROWSER, `Lost the page while opening @${username}`);

  const state = describeFollowState(snap);
  if (state.kind === 'target_not_found') {
    return done(false, FOLLOW_STATUS.NOT_FOUND, `@${username} does not exist on X`);
  }
  if (state.kind === 'following') {
    return done(true, FOLLOW_STATUS.ALREADY, `Already following @${username}`);
  }
  if (state.kind === 'pending') {
    return done(true, FOLLOW_STATUS.ALREADY, `Follow request to @${username} is already pending`);
  }
  if (state.kind === 'signed_out') {
    return done(
      false,
      FOLLOW_STATUS.AUTH,
      'Not logged in to X: run `xactions login` (or `xactions connect`), or set XACTIONS_SESSION_COOKIE',
    );
  }
  if (state.kind === 'no_button') {
    return done(false, FOLLOW_STATUS.FAILED, `No follow button on @${username}'s profile`);
  }
  if (state.kind !== 'ready') {
    return done(false, FOLLOW_STATUS.FAILED, `@${username}'s profile did not finish loading`);
  }

  let button = null;
  try {
    button = await page.$(FOLLOW_SELECTOR);
  } catch (error) {
    return done(false, classifyBrowserError(error), `Could not reach the follow button: ${error.message}`);
  }
  if (!button) {
    return done(false, FOLLOW_STATUS.FAILED, `Follow button on @${username} disappeared before the click`);
  }

  try {
    await button.click();
  } catch (error) {
    return done(false, classifyBrowserError(error), `Clicking follow failed: ${error.message}`);
  }

  await sleep(clickSettleMs);
  await confirmIfPresent(page);

  const verdict = await waitForOutcome(page, { verifyTimeout, pollMs });
  if (verdict.kind === 'success') {
    return done(true, FOLLOW_STATUS.SUCCESS, `Following @${username}`);
  }
  if (verdict.kind === 'pending') {
    return done(true, FOLLOW_STATUS.SUCCESS, `Follow request sent to @${username} (protected account)`);
  }
  if (verdict.kind === 'browser_error') {
    return done(false, FOLLOW_STATUS.BROWSER, `Lost the page while confirming @${username}`);
  }
  if (verdict.kind === 'auth_error') {
    return done(false, FOLLOW_STATUS.AUTH, `X asked for a login while following @${username}`);
  }
  if (verdict.kind === 'rate_limited') {
    return done(
      false,
      FOLLOW_STATUS.RATE_LIMITED,
      `X refused the follow for @${username}: ${verdict.snap?.toast || 'rate limit'}`,
    );
  }

  snap = verdict.snap || snap;
  const after = describeFollowState(snap);
  const detail =
    snap?.toast ||
    (after.kind === 'ready' ? 'the button still reads Follow' : `state is ${after.kind}`);
  return done(false, FOLLOW_STATUS.FAILED, `Follow of @${username} was not confirmed: ${detail}`);
}

/**
 * Unfollow an account and prove it.
 *
 * @param {object} page
 * @param {string} username
 * @param {{profileTimeout?: number, verifyTimeout?: number, pollMs?: number, clickSettleMs?: number}} [options]
 * @returns {Promise<{success: boolean, status: string, message: string, username: string}>}
 */
export async function performUnfollow(page, username, options = {}) {
  const {
    profileTimeout = 20_000,
    verifyTimeout = 15_000,
    pollMs = 700,
    clickSettleMs = 400,
  } = options;

  const done = (success, status, message) => ({ success, status, message, username });

  if (!page || typeof page.goto !== 'function') {
    return done(false, FOLLOW_STATUS.BROWSER, 'No browser page available');
  }

  const opened = await openProfile(page, username, profileTimeout);
  if (!opened.ok) return done(false, opened.status, opened.message);

  let snap = await snapshot(page);
  if (!snap) return done(false, FOLLOW_STATUS.BROWSER, `Lost the page while opening @${username}`);

  let state = describeFollowState(snap);
  if (state.kind === 'target_not_found') {
    return done(false, FOLLOW_STATUS.NOT_FOUND, `@${username} does not exist on X`);
  }
  if (state.kind === 'signed_out') {
    return done(
      false,
      FOLLOW_STATUS.AUTH,
      'Not logged in to X: run `xactions login` (or `xactions connect`), or set XACTIONS_SESSION_COOKIE',
    );
  }
  if (state.kind !== 'following') {
    return done(true, FOLLOW_STATUS.ALREADY_UNFOLLOWED, `Not following @${username}`);
  }

  let button = null;
  try {
    button = await page.$(UNFOLLOW_SELECTOR);
    if (!button) return done(true, FOLLOW_STATUS.ALREADY_UNFOLLOWED, `Not following @${username}`);
    await button.click();
  } catch (error) {
    return done(false, classifyBrowserError(error), `Could not unfollow @${username}: ${error.message}`);
  }

  await sleep(clickSettleMs);
  await confirmIfPresent(page);

  const deadline = Date.now() + verifyTimeout;
  for (;;) {
    snap = await snapshot(page);
    if (!snap) return done(false, FOLLOW_STATUS.BROWSER, `Lost the page while unfollowing @${username}`);
    state = describeFollowState(snap);
    if (state.kind !== 'following') {
      return done(true, FOLLOW_STATUS.SUCCESS, `Unfollowed @${username}`);
    }
    if (showsLoginWall(snap)) {
      return done(false, FOLLOW_STATUS.AUTH, `X asked for a login while unfollowing @${username}`);
    }
    if (snap.toast && RATE_LIMIT_RE.test(snap.toast)) {
      return done(false, FOLLOW_STATUS.RATE_LIMITED, `X refused the unfollow: ${snap.toast}`);
    }
    if (Date.now() >= deadline) {
      return done(false, FOLLOW_STATUS.FAILED, `Unfollow of @${username} was not confirmed`);
    }
    await sleep(pollMs);
  }
}
