// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * x_clear_bookmarks: one-by-one removal, and what counts as removed.
 *
 * X dropped the "Clear all bookmarks" menu item, so the tool clicks each
 * post's own remove button. What this protects: a removal is counted only
 * after that post has left the feed, an unconfirmed removal stops the run
 * instead of clicking the same post again, rate-limit cooldowns are bounded,
 * and a page with no buttons is a failure unless X itself says it is empty.
 * The page-side functions run for real against a jsdom feed.
 *
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://x.com/i/bookmarks" }
 * @author nich (@nichxbt)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { jsdomPage } from './jsdom-page.js';
import {
  clearBookmarksOneByOne,
  permalinkOfPost,
  postIsGone,
  isRateLimitedInPage,
} from '../../src/mcp/clearBookmarks.js';

const FAST = {
  pause: async () => {},
  scrollPause: async () => {},
  cooldownMs: 1,
  confirmTimeout: 60,
  maxEmptyScrolls: 2,
  renderTimeout: 30,
};

/**
 * Render bookmarked posts. `sticky` ids ignore the click, as when X does not
 * act on it; the others leave the feed shortly after the click.
 */
function renderFeed(ids, { sticky = [], permalink = true } = {}) {
  const feed = document.createElement('section');
  for (const id of ids) {
    const article = document.createElement('article');
    article.setAttribute('data-testid', 'tweet');
    article.innerHTML = `
      <div data-testid="tweetText">post ${id}</div>
      ${permalink ? `<a href="/someone/status/${id}"><time datetime="2026-11-01T00:00:00Z">Nov 1</time></a>` : ''}
      <button data-testid="removeBookmark" aria-label="Remove from Bookmarks"></button>`;
    article.querySelector('button').addEventListener('click', () => {
      if (!sticky.includes(id)) setTimeout(() => article.remove(), 5);
    });
    feed.appendChild(article);
  }
  document.body.appendChild(feed);
}

function showToast(text) {
  const toast = document.createElement('div');
  toast.setAttribute('data-testid', 'toast');
  toast.textContent = text;
  document.body.appendChild(toast);
  return toast;
}

beforeEach(() => {
  document.body.innerHTML = '';
  window.scrollTo = () => {};
});

describe('clearBookmarksOneByOne', () => {
  it('removes every bookmark and counts each one once it has left the feed', async () => {
    renderFeed(['1', '2', '3']);
    const page = jsdomPage();

    const result = await clearBookmarksOneByOne(page, FAST);

    expect(result).toMatchObject({ success: true, removed: 3 });
    expect(document.querySelectorAll('article').length).toBe(0);
    expect(page.log.goto).toEqual([
      { url: 'https://x.com/i/bookmarks', opts: { waitUntil: 'domcontentloaded' } },
    ]);
  });

  it('stops on a removal X does not confirm, without counting it', async () => {
    renderFeed(['1', '2', '3'], { sticky: ['2'] });
    const page = jsdomPage();

    const result = await clearBookmarksOneByOne(page, FAST);

    expect(result).toMatchObject({
      success: false,
      removed: 1,
      unconfirmedBookmark: '/someone/status/2',
    });
    // Post 2 was clicked once and never again; post 3 was never touched.
    expect(page.log.clicks.length).toBe(2);
    expect(document.querySelectorAll('article').length).toBe(2);
  });

  it('stops when it cannot tell which post a button belongs to', async () => {
    renderFeed(['1'], { permalink: false });
    const result = await clearBookmarksOneByOne(jsdomPage(), FAST);
    expect(result).toMatchObject({ success: false, removed: 0 });
    expect(result.message).toMatch(/identify/);
  });

  it('reports success with nothing removed only when X shows its empty state', async () => {
    document.body.innerHTML = '<div data-testid="emptyState">Save posts for later</div>';
    const result = await clearBookmarksOneByOne(jsdomPage(), FAST);
    expect(result).toMatchObject({ success: true, removed: 0 });
  });

  it('fails when no remove buttons render and X has not said the list is empty', async () => {
    document.body.innerHTML = '<main></main>';
    const result = await clearBookmarksOneByOne(jsdomPage(), FAST);
    expect(result).toMatchObject({ success: false, removed: 0 });
    expect(result.message).toMatch(/logged in/);
  });

  it('cools down on a rate-limit toast, then carries on', async () => {
    renderFeed(['1', '2']);
    const toast = showToast('You are over the rate limit. Try again later.');
    let cooldownsSeen = 0;
    const page = jsdomPage();
    const evaluate = page.evaluate;
    page.evaluate = async (fn, ...args) => {
      const value = await evaluate(fn, ...args);
      if (fn.name === 'isRateLimitedInPage' && value && ++cooldownsSeen === 1) toast.remove();
      return value;
    };

    const result = await clearBookmarksOneByOne(page, FAST);
    expect(cooldownsSeen).toBe(1);
    expect(result).toMatchObject({ success: true, removed: 2 });
  });

  it('gives up after a bounded number of cooldowns', async () => {
    renderFeed(['1']);
    showToast('Slow down. Too many requests.');

    const result = await clearBookmarksOneByOne(jsdomPage(), { ...FAST, maxCooldowns: 2 });
    expect(result).toMatchObject({ success: false, removed: 0 });
    expect(result.message).toMatch(/rate-limit/);
  });

  it('can skip navigation for a caller already on the page', async () => {
    renderFeed(['1']);
    const page = jsdomPage();
    await clearBookmarksOneByOne(page, { ...FAST, navigate: false });
    expect(page.log.goto).toEqual([]);
  });
});

describe('page-side helpers', () => {
  it('reads the permalink from the post a button sits in', () => {
    renderFeed(['42']);
    expect(permalinkOfPost(document.querySelector('button'))).toBe('/someone/status/42');
  });

  it('knows when a post has left the feed', () => {
    renderFeed(['7', '8']);
    expect(postIsGone('/someone/status/7')).toBe(false);
    document.querySelector('article').remove();
    expect(postIsGone('/someone/status/7')).toBe(true);
  });

  it('spots the rate-limit wording the console script spots', () => {
    expect(isRateLimitedInPage()).toBe(false);
    showToast('Your post was sent.');
    expect(isRateLimitedInPage()).toBe(false);
    document.body.innerHTML = '';
    showToast('Too many requests');
    expect(isRateLimitedInPage()).toBe(true);
  });
});
