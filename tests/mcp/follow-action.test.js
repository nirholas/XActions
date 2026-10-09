// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The follow flow against stub pages: what counts as a follow, what counts as
 * already done, and what must never be reported as success.
 */

import { describe, it, expect } from 'vitest';
import {
  FOLLOW_STATUS,
  performFollow,
  performUnfollow,
  describeFollowState,
  classifyBrowserError,
  isRetryableStatus,
} from '../../src/mcp/followAction.js';

const FAST = { profileTimeout: 40, verifyTimeout: 60, pollMs: 5, clickSettleMs: 0 };

const readySnap = {
  url: 'https://x.com/someone',
  testidCount: 42,
  signedIn: true,
  profileRendered: true,
  placementPresent: true,
  confirmSheet: false,
  toast: null,
  buttons: [{ testid: '123456-follow', text: 'Follow', ariaLabel: 'Follow @someone' }],
  dialogs: [],
  bodyText: 'Someone @someone',
};

const followingSnap = {
  ...readySnap,
  buttons: [{ testid: '123456-unfollow', text: 'Following', ariaLabel: 'Unfollow @someone' }],
};

const signedOutSnap = {
  url: 'https://x.com/someone',
  testidCount: 0,
  signedIn: false,
  profileRendered: false,
  placementPresent: false,
  confirmSheet: false,
  toast: null,
  buttons: [],
  dialogs: [],
  bodyText: 'Someone @someone',
};

const missingSnap = {
  ...signedOutSnap,
  bodyText: "Hmm...this page doesn't exist. Try searching for something else.",
};

/**
 * A page double: snapshots come from a queue (last one repeats), everything
 * else records what the flow asked it to do.
 */
function fakePage({ snapshots = [], goto, waitForSelector, dollar } = {}) {
  const calls = { goto: 0, evaluate: 0, dollar: 0, clicks: 0 };
  let next = 0;

  return {
    calls,
    goto: async (...args) => {
      calls.goto += 1;
      if (goto) return goto(...args);
      return { status: () => 200 };
    },
    waitForSelector: async (...args) => {
      if (waitForSelector) return waitForSelector(...args);
      return {};
    },
    evaluate: async () => {
      calls.evaluate += 1;
      const snap = snapshots.length ? snapshots[Math.min(next, snapshots.length - 1)] : undefined;
      next += 1;
      return snap;
    },
    $: async (selector) => {
      calls.dollar += 1;
      if (dollar) return dollar(selector);
      // Only the profile's own action button exists in the fixtures; X puts a
      // confirmation sheet in the way only for some actions, so the confirm
      // selector resolves to nothing here.
      if (selector.includes('placementTracking')) {
        return { click: async () => { calls.clicks += 1; } };
      }
      return null;
    },
  };
}

describe('describeFollowState', () => {
  it('reads a profile that can be followed', () => {
    expect(describeFollowState(readySnap)).toEqual({ kind: 'ready' });
  });

  it('reads a profile already followed, by testid and by label', () => {
    expect(describeFollowState(followingSnap)).toEqual({ kind: 'following' });
    expect(
      describeFollowState({ ...readySnap, buttons: [{ testid: '', text: 'Following' }] }),
    ).toEqual({ kind: 'following' });
  });

  it('reads the anonymous shell as signed out', () => {
    expect(describeFollowState(signedOutSnap)).toEqual({ kind: 'signed_out' });
  });

  it('reads a missing account', () => {
    expect(describeFollowState(missingSnap)).toEqual({ kind: 'target_not_found' });
  });

  it('reads a profile that has not rendered yet', () => {
    expect(describeFollowState({ ...readySnap, profileRendered: false, buttons: [] })).toEqual({
      kind: 'not_rendered',
    });
  });

  it('reads a rendered profile with nothing to press', () => {
    expect(describeFollowState({ ...readySnap, buttons: [{ testid: 'edit', text: 'Edit profile' }] })).toEqual({
      kind: 'no_button',
    });
  });

  it('reads a pending follow request', () => {
    expect(
      describeFollowState({ ...readySnap, buttons: [{ testid: '123456-follow', text: 'Pending' }] }),
    ).toEqual({ kind: 'pending' });
  });

  it('does not throw on a missing snapshot', () => {
    expect(describeFollowState(null)).toEqual({ kind: 'not_rendered' });
  });
});

describe('classifyBrowserError', () => {
  it('calls a dead or missing browser API a browser error', () => {
    expect(classifyBrowserError(new Error('browser.isConnected is not a function'))).toBe(FOLLOW_STATUS.BROWSER);
    expect(classifyBrowserError(new Error('Protocol error (Target.createTarget): Session closed.'))).toBe(
      FOLLOW_STATUS.BROWSER,
    );
    expect(classifyBrowserError(new Error('Navigation timeout of 30000 ms exceeded'))).toBe(FOLLOW_STATUS.BROWSER);
  });

  it('leaves everything else a plain failure', () => {
    expect(classifyBrowserError(new Error('selector exploded'))).toBe(FOLLOW_STATUS.FAILED);
  });
});

describe('isRetryableStatus', () => {
  it('retries failures and browser problems, never auth or rate limits', () => {
    expect(isRetryableStatus(FOLLOW_STATUS.FAILED)).toBe(true);
    expect(isRetryableStatus(FOLLOW_STATUS.BROWSER)).toBe(true);
    expect(isRetryableStatus(FOLLOW_STATUS.AUTH)).toBe(false);
    expect(isRetryableStatus(FOLLOW_STATUS.RATE_LIMITED)).toBe(false);
    expect(isRetryableStatus(FOLLOW_STATUS.NOT_FOUND)).toBe(false);
  });
});

describe('performFollow', () => {
  it('reports an already-followed account without clicking anything', async () => {
    const page = fakePage({ snapshots: [followingSnap] });
    const result = await performFollow(page, 'someone', FAST);

    expect(result).toMatchObject({ success: true, status: FOLLOW_STATUS.ALREADY, username: 'someone' });
    expect(page.calls.clicks).toBe(0);
    expect(page.calls.dollar).toBe(0);
  });

  it('follows and confirms only once the profile shows Following', async () => {
    const page = fakePage({ snapshots: [readySnap, readySnap, followingSnap] });
    const result = await performFollow(page, 'someone', FAST);

    expect(result).toMatchObject({ success: true, status: FOLLOW_STATUS.SUCCESS });
    expect(page.calls.clicks).toBe(1);
  });

  it('does not claim a follow the profile never confirmed', async () => {
    const page = fakePage({ snapshots: [readySnap, readySnap, readySnap, readySnap] });
    const result = await performFollow(page, 'someone', FAST);

    expect(result.success).toBe(false);
    expect(result.status).toBe(FOLLOW_STATUS.FAILED);
    expect(result.message).toContain('was not confirmed');
    expect(page.calls.clicks).toBe(1);
  });

  it('reports the signed-out shell instead of clicking into a login wall', async () => {
    const page = fakePage({ snapshots: [signedOutSnap] });
    const result = await performFollow(page, 'someone', FAST);

    expect(result).toMatchObject({ success: false, status: FOLLOW_STATUS.AUTH });
    expect(page.calls.clicks).toBe(0);
  });

  it('reports an account that does not exist', async () => {
    const page = fakePage({ snapshots: [missingSnap] });
    const result = await performFollow(page, 'nobody', FAST);

    expect(result).toMatchObject({ success: false, status: FOLLOW_STATUS.NOT_FOUND });
    expect(page.calls.clicks).toBe(0);
  });

  it('reports a browser that died during navigation', async () => {
    const page = fakePage({
      goto: () => {
        throw new Error('Protocol error (Page.navigate): Target closed.');
      },
    });
    const result = await performFollow(page, 'someone', FAST);

    expect(result).toMatchObject({ success: false, status: FOLLOW_STATUS.BROWSER });
    expect(page.calls.clicks).toBe(0);
  });

  it('reports a browser that died while waiting for the profile', async () => {
    const page = fakePage({
      waitForSelector: () => {
        throw new Error('browser.isConnected is not a function');
      },
      snapshots: [],
    });
    const result = await performFollow(page, 'someone', FAST);

    expect(result.success).toBe(false);
    expect(page.calls.clicks).toBe(0);
  });

  it('reports a rate limit X put on screen after the click', async () => {
    const page = fakePage({
      snapshots: [readySnap, { ...readySnap, toast: 'Rate limit exceeded. Try again later.' }],
    });
    const result = await performFollow(page, 'someone', FAST);

    expect(result).toMatchObject({ success: false, status: FOLLOW_STATUS.RATE_LIMITED });
  });

  it('reports a login wall that appears after the click', async () => {
    const page = fakePage({
      snapshots: [readySnap, { ...readySnap, dialogs: ['Sign in to X'] }],
    });
    const result = await performFollow(page, 'someone', FAST);

    expect(result).toMatchObject({ success: false, status: FOLLOW_STATUS.AUTH });
  });

  it('reports a lost page as a browser error rather than a success', async () => {
    const page = fakePage({ snapshots: [readySnap, undefined] });
    const result = await performFollow(page, 'someone', FAST);

    expect(result).toMatchObject({ success: false, status: FOLLOW_STATUS.BROWSER });
  });

  it('refuses to run without a page', async () => {
    const result = await performFollow(null, 'someone', FAST);
    expect(result).toMatchObject({ success: false, status: FOLLOW_STATUS.BROWSER });
  });

  it('reports a profile with no follow button', async () => {
    const page = fakePage({
      snapshots: [{ ...readySnap, buttons: [{ testid: 'edit', text: 'Edit profile' }] }],
    });
    const result = await performFollow(page, 'someone', FAST);

    expect(result).toMatchObject({ success: false, status: FOLLOW_STATUS.FAILED });
    expect(page.calls.clicks).toBe(0);
  });
});

describe('performUnfollow', () => {
  it('leaves an account that is not followed alone', async () => {
    const page = fakePage({ snapshots: [readySnap] });
    const result = await performUnfollow(page, 'someone', FAST);

    expect(result).toMatchObject({ success: true, status: FOLLOW_STATUS.ALREADY_UNFOLLOWED });
    expect(page.calls.clicks).toBe(0);
  });

  it('unfollows and confirms once the button is gone', async () => {
    const page = fakePage({ snapshots: [followingSnap, followingSnap, readySnap] });
    const result = await performUnfollow(page, 'someone', FAST);

    expect(result).toMatchObject({ success: true, status: FOLLOW_STATUS.SUCCESS });
    expect(page.calls.clicks).toBe(1);
  });

  it('does not claim an unfollow that never happened', async () => {
    const page = fakePage({ snapshots: [followingSnap, followingSnap, followingSnap, followingSnap] });
    const result = await performUnfollow(page, 'someone', FAST);

    expect(result).toMatchObject({ success: false, status: FOLLOW_STATUS.FAILED });
  });
});
