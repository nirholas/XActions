// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * scripts/engageProfile.js — boot, feed detection, and post parsing.
 *
 * A console script has no import surface to test, so this loads the real file
 * into a jsdom window the way a paste into DevTools would, then asserts on the
 * panel and on `window.XEngage`. What it protects is the part that breaks
 * silently: the URL patterns that decide which feed is on screen, and the DOM
 * reading that decides which post a row actually refers to.
 *
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://x.com/" }
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(here, '../../scripts/engageProfile.js'), 'utf8');

/** Paste the script into the current jsdom window. */
function paste() {
  new Function(SOURCE)();
}

/** Point jsdom at a URL without reloading the document. */
function visit(url) {
  window.history.replaceState({}, '', url);
}

/**
 * Build one timeline row close enough to X's real DOM for the reader:
 * a permalink wrapped around the timestamp, a name block, action buttons.
 */
function addArticle({
  id = '1',
  author = 'nasa',
  name = 'NASA',
  text = 'We are going',
  liked = false,
  reposted = false,
  social = '',
  verified = false,
  likeLabel = '12 likes. Like',
  quoteId = null,
} = {}) {
  const article = document.createElement('article');
  article.setAttribute('data-testid', 'tweet');
  article.innerHTML = `
    ${social ? `<div data-testid="socialContext">${social}</div>` : ''}
    <div data-testid="User-Name"><span>${name}</span><span>@${author}</span></div>
    ${verified ? '<svg data-testid="icon-verified"></svg>' : ''}
    ${quoteId ? `<a href="/someone/status/${quoteId}"><div data-testid="tweetText">quoted text</div></a>` : ''}
    <div data-testid="tweetText">${text}</div>
    <a href="/${author}/status/${id}"><time datetime="2026-08-20T00:00:00.000Z">Aug 20</time></a>
    <button data-testid="${liked ? 'unlike' : 'like'}" aria-label="${likeLabel}"></button>
    <button data-testid="${reposted ? 'unretweet' : 'retweet'}"></button>
    <button data-testid="reply"></button>
  `;
  document.body.appendChild(article);
  return article;
}

/** The sidebar link the script reads to learn who is signed in. */
function signInAs(handle) {
  const link = document.createElement('a');
  link.setAttribute('data-testid', 'AppTabBar_Profile_Link');
  link.setAttribute('href', `/${handle}`);
  document.body.appendChild(link);
}

beforeEach(() => {
  document.body.innerHTML = '';
  window.localStorage.clear();
  delete window.XEngage;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  // The panel log mirrors 'warn' lines to console.warn ("This feed mixes authors").
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('boot and feed detection', () => {
  it('mounts a panel on a profile and exposes the console API', () => {
    visit('https://x.com/nasa');
    paste();

    expect(document.getElementById('xep-panel')).toBeTruthy();
    expect(typeof window.XEngage.start).toBe('function');
    expect(typeof window.XEngage.stop).toBe('function');
    expect(typeof window.XEngage.undo).toBe('function');
    expect(document.querySelector('#xep-panel .xep-head b').textContent).toContain('@nasa');
    // Dry run is the default, every time.
    expect(window.XEngage.config.dryRun).toBe(true);
    expect(document.getElementById('xep-dry').checked).toBe(true);
  });

  it('does not mount twice', () => {
    visit('https://x.com/nasa');
    paste();
    paste();
    expect(document.querySelectorAll('#xep-panel')).toHaveLength(1);
  });

  it.each([
    ['https://x.com/nasa', '@nasa'],
    ['https://x.com/nasa/with_replies', '@nasa + replies'],
    ['https://x.com/search?q=open%20source&src=typed_query', 'search "open source"'],
    ['https://x.com/i/lists/1234567890', 'list 1234567890'],
    ['https://x.com/hashtag/solana?src=hashtag_click', '#solana'],
    ['https://x.com/home', 'your home timeline'],
  ])('recognises %s', (url, label) => {
    visit(url);
    paste();
    expect(document.querySelector('#xep-panel .xep-head b').textContent).toBe(`Sweep ${label}`);
  });

  it('turns on replies when the replies tab is open', () => {
    visit('https://x.com/nasa/with_replies');
    paste();
    expect(window.XEngage.config.includeReplies).toBe(true);
  });

  it('allows reposts by default on a feed that mixes authors', () => {
    visit('https://x.com/search?q=ai');
    paste();
    expect(window.XEngage.config.includeReposts).toBe(true);

    document.body.innerHTML = '';
    delete window.XEngage;
    visit('https://x.com/nasa');
    paste();
    expect(window.XEngage.config.includeReposts).toBe(false);
  });

  it('refuses a page with no post feed, and says where to go instead', () => {
    visit('https://x.com/settings/account');
    paste();
    expect(document.getElementById('xep-panel')).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('no post feed to sweep'));
  });

  it('does not mistake a reserved path for a handle', () => {
    for (const url of ['https://x.com/explore', 'https://x.com/messages', 'https://x.com/i/bookmarks']) {
      document.body.innerHTML = '';
      delete window.XEngage;
      visit(url);
      paste();
      const heading = document.querySelector('#xep-panel .xep-head b');
      if (heading) expect(heading.textContent).not.toMatch(/Sweep @(explore|messages|i)$/);
    }
  });

  it('keeps progress per feed, so a search sweep does not inherit a profile sweep', () => {
    window.localStorage.setItem('xactions_engage_profile_nasa', JSON.stringify({ done: { 1: { liked: true } } }));
    visit('https://x.com/nasa');
    paste();
    expect(window.XEngage.state.done.size).toBe(1);

    document.body.innerHTML = '';
    delete window.XEngage;
    visit('https://x.com/search?q=nasa');
    paste();
    expect(window.XEngage.state.done.size).toBe(0);
  });
});

describe('reading a post', () => {
  it('targets the post itself, not a post it quotes', () => {
    visit('https://x.com/nasa');
    addArticle({ id: '999', author: 'nasa', quoteId: '111' });
    paste();

    const [post] = window.XEngage.inspect();
    // The quoted post's /status/ link comes first in the DOM. Engaging that
    // one instead would like a stranger's post and look like a bug nobody
    // can reproduce, so the parser keys off the timestamp anchor.
    expect(post.id).toBe('999');
    expect(post.eligible).toBe(true);
  });

  it('reads author, text, and like count off the row', () => {
    visit('https://x.com/nasa');
    addArticle({ id: '1', author: 'nasa', name: 'NASA', text: 'Launch window opens', likeLabel: '1,234 likes. Like' });
    paste();

    expect(window.XEngage.inspect()[0]).toMatchObject({
      id: '1', author: 'nasa', text: 'Launch window opens', likes: 1234, eligible: true,
    });
  });

  it('scales K and M like counts', () => {
    visit('https://x.com/nasa');
    addArticle({ id: '1', likeLabel: '12.5K likes. Like' });
    addArticle({ id: '2', likeLabel: '3M likes. Like' });
    paste();
    expect(window.XEngage.inspect().map((p) => p.likes)).toEqual([12500, 3000000]);
  });

  it('notices what is already liked or reposted', () => {
    visit('https://x.com/nasa');
    addArticle({ id: '1', liked: true, reposted: true });
    paste();
    expect(window.XEngage.inspect()[0]).toMatchObject({ liked: true, reposted: true });
  });

  it('treats another account on a profile as a repost, but not on a mixed feed', () => {
    visit('https://x.com/nasa');
    addArticle({ id: '1', author: 'esa' });
    paste();
    expect(window.XEngage.inspect()[0]).toMatchObject({ isRepost: true, eligible: false, why: 'repost' });

    document.body.innerHTML = '';
    delete window.XEngage;
    visit('https://x.com/search?q=space');
    addArticle({ id: '1', author: 'esa' });
    paste();
    expect(window.XEngage.inspect()[0]).toMatchObject({ isRepost: false, eligible: true });
  });

  it('skips ads', () => {
    visit('https://x.com/home');
    const article = addArticle({ id: '1' });
    const ad = document.createElement('div');
    ad.setAttribute('data-testid', 'placementTracking');
    article.appendChild(ad);
    paste();
    expect(window.XEngage.inspect()[0]).toMatchObject({ eligible: false, why: 'ad' });
  });

  it('never engages your own post', () => {
    visit('https://x.com/home');
    signInAs('me');
    addArticle({ id: '1', author: 'me' });
    addArticle({ id: '2', author: 'nasa' });
    paste();
    const [mine, theirs] = window.XEngage.inspect();
    expect(mine).toMatchObject({ eligible: false, why: 'your own post' });
    expect(theirs.eligible).toBe(true);
  });

  it('applies each panel filter and names the one that rejected the post', () => {
    visit('https://x.com/search?q=space');
    addArticle({ id: '1', author: 'nasa', text: 'solana mainnet update', likeLabel: '5 likes. Like' });
    addArticle({ id: '2', author: 'spammer', text: 'free airdrop giveaway', likeLabel: '900 likes. Like' });
    addArticle({ id: '3', author: 'esa', text: 'rust in orbit', likeLabel: '60 likes. Like', verified: true });
    paste();

    document.getElementById('xep-skipUsers').value = 'spammer';
    document.getElementById('xep-keywords').value = 'solana, rust';
    document.getElementById('xep-minLikes').value = '10';
    let rows = window.XEngage.inspect();
    expect(rows.map((r) => [r.id, r.eligible, r.why])).toEqual([
      ['1', false, 'only 5 likes'],
      ['2', false, '@spammer is on the skip list'],
      ['3', true, null],
    ]);

    document.getElementById('xep-minLikes').value = '0';
    document.getElementById('xep-skipVerified').checked = true;
    rows = window.XEngage.inspect();
    expect(rows.find((r) => r.id === '3')).toMatchObject({ eligible: false, why: 'verified account' });
    expect(rows.find((r) => r.id === '1')).toMatchObject({ eligible: true });

    document.getElementById('xep-onlyFrom').value = 'nasa';
    expect(window.XEngage.inspect().find((r) => r.id === '3'))
      .toMatchObject({ eligible: false, why: '@esa is not on the only-from list' });
  });

  it('reports what an earlier run already did to a post', () => {
    window.localStorage.setItem(
      'xactions_engage_profile_nasa',
      JSON.stringify({ done: { 42: { liked: true, reposted: false, commented: true } } }),
    );
    visit('https://x.com/nasa');
    addArticle({ id: '42' });
    paste();
    expect(window.XEngage.inspect()[0].doneEarlier).toMatchObject({ liked: true, commented: true });
  });
});

describe('panel controls', () => {
  it('exposes the filter inputs that aim a mixed-feed sweep', () => {
    visit('https://x.com/search?q=ai');
    paste();
    for (const id of ['xep-onlyFrom', 'xep-skipUsers', 'xep-keywords', 'xep-skipKeywords', 'xep-minLikes', 'xep-maxLikes', 'xep-skipVerified']) {
      expect(document.getElementById(id), `${id} is missing from the panel`).toBeTruthy();
    }
  });

  it('reads filters out of the panel when a run starts', () => {
    visit('https://x.com/search?q=ai');
    signInAs('me');
    paste();

    document.getElementById('xep-onlyFrom').value = '@nasa, esa';
    document.getElementById('xep-keywords').value = 'solana, rust';
    document.getElementById('xep-minLikes').value = '25';
    document.getElementById('xep-comment').checked = false;
    document.getElementById('xep-comment').dispatchEvent(new window.Event('change'));
    document.getElementById('xep-start').click();

    expect(window.XEngage.config.onlyFrom).toEqual(['nasa', 'esa']);
    expect(window.XEngage.config.keywords).toEqual(['solana', 'rust']);
    expect(window.XEngage.config.minLikes).toBe(25);
    window.XEngage.stop();
  });

  it('refuses to start with every action switched off', () => {
    visit('https://x.com/nasa');
    paste();
    for (const id of ['xep-like', 'xep-repost', 'xep-comment']) {
      const box = document.getElementById(id);
      box.checked = false;
      box.dispatchEvent(new window.Event('change'));
    }
    document.getElementById('xep-start').click();
    expect(window.XEngage.state.running).toBe(false);
    expect(document.getElementById('xep-log').textContent).toContain('Pick at least one action');
  });

  it('requires a key before an xAI sweep starts', () => {
    visit('https://x.com/nasa');
    paste();
    document.getElementById('xep-mode').value = 'ai';
    document.getElementById('xep-mode').dispatchEvent(new window.Event('change'));
    document.getElementById('xep-key').value = '';
    document.getElementById('xep-start').click();
    expect(window.XEngage.state.running).toBe(false);
    expect(document.getElementById('xep-log').textContent).toContain('needs an API key');
  });

  it('clears saved progress on reset', () => {
    window.localStorage.setItem('xactions_engage_profile_nasa', JSON.stringify({ done: { 1: { liked: true } } }));
    visit('https://x.com/nasa');
    paste();
    expect(window.XEngage.state.done.size).toBe(1);
    document.getElementById('xep-reset').click();
    expect(window.XEngage.state.done.size).toBe(0);
    expect(window.localStorage.getItem('xactions_engage_profile_nasa')).toBeNull();
  });

  it('never writes the API key to storage unless asked', () => {
    visit('https://x.com/nasa');
    paste();
    document.getElementById('xep-key').value = 'xai-secret';
    document.getElementById('xep-rememberKey').checked = false;
    document.getElementById('xep-comment').checked = false;
    document.getElementById('xep-comment').dispatchEvent(new window.Event('change'));
    document.getElementById('xep-start').click();
    expect(window.localStorage.getItem('xactions_engage_ai_key')).toBeNull();
    window.XEngage.stop();
  });
});
