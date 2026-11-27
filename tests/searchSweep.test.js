// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * searchSweep Test Suite
 *
 * browser/searchSweep.js is a paste-in console script, so the only way to run the real
 * implementation is the way core.js is covered in extractUserFromCell.test.js: boot a
 * jsdom window pointed at a real x.com search URL, eval the source inside it, and drive
 * the API it exposes on window.
 *
 * The DOM fragments below are the shapes x.com actually serves for a search result: a
 * permalink anchor wrapping the timestamp, a tweetText node, and like/repost buttons
 * carrying their counts in aria-label.
 *
 * @author nichxbt
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEARCH_URL = 'https://x.com/search?q=from%3Acryptopumps%20%40nichxbt&src=typed_query&f=live';

/** One search result, in the markup x.com renders. */
function articleHtml({ author, id, text, when, likes = 0, reposts = 0, social = '' }) {
  return `
    <article data-testid="tweet" role="article">
      ${social ? `<div data-testid="socialContext">${social}</div>` : ''}
      <div data-testid="User-Name"><span>${author} display</span><span>@${author}</span></div>
      <a href="/${author}/status/${id}"><time datetime="${when}">time</time></a>
      <div data-testid="tweetText">${text}</div>
      <button data-testid="reply" aria-label="2 Replies. Reply"></button>
      <button data-testid="retweet" aria-label="${reposts} reposts. Repost"></button>
      <button data-testid="like" aria-label="${likes} Likes. Like"></button>
      <button data-testid="caret" aria-label="More"></button>
    </article>`;
}

const RESULTS = [
  // Mine, old, unloved: the post the sweep exists to remove.
  articleHtml({ author: 'cryptopumps', id: '1000000000000000001', text: 'hey @nichxbt what do you think', when: '2024-03-04T10:00:00.000Z' }),
  // Mine, but it did numbers. The maxLikes filter should protect it.
  articleHtml({ author: 'cryptopumps', id: '1000000000000000002', text: 'big thread for @nichxbt', when: '2024-05-01T10:00:00.000Z', likes: 412, reposts: 30 }),
  // Someone else's. Never deletable.
  articleHtml({ author: 'nichxbt', id: '1000000000000000003', text: 'replying to @cryptopumps', when: '2024-05-02T10:00:00.000Z', likes: 3 }),
];

let win;

beforeAll(() => {
  const source = readFileSync(resolve(ROOT, 'browser', 'searchSweep.js'), 'utf8');
  const dom = new JSDOM(
    `<!DOCTYPE html><html><head></head><body>
       <nav><a data-testid="AppTabBar_Profile_Link" href="/cryptopumps">Profile</a></nav>
       <main>${RESULTS.join('')}</main>
     </body></html>`,
    { url: SEARCH_URL, pretendToBeVisual: true, runScripts: 'outside-only' },
  );
  win = dom.window;
  win.eval(source);
});

describe('searchSweep: loading', () => {
  it('mounts its panel and exposes the console API', () => {
    expect(win.document.getElementById('xsw-panel')).toBeTruthy();
    expect(typeof win.XSearchSweep.start).toBe('function');
    expect(typeof win.XSearchSweep.preview).toBe('function');
  });

  it('adopts the query already in the address bar instead of its own defaults', () => {
    expect(win.XSearchSweep.config.query.raw).toBe('from:cryptopumps @nichxbt');
    expect(win.XSearchSweep.config.query.latest).toBe(true);
    expect(win.XSearchSweep.query()).toBe('from:cryptopumps @nichxbt');
  });

  it('starts in dry run with delete selected and the engagement actions off', () => {
    expect(win.XSearchSweep.config.dryRun).toBe(true);
    expect(win.XSearchSweep.config.actions.delete).toBe(true);
    expect(win.XSearchSweep.config.actions.like).toBe(false);
  });
});

describe('searchSweep: query building', () => {
  it('assembles from/mentions into an X search query, resolving "me" to the signed-in handle', () => {
    const { config } = win.XSearchSweep;
    config.query.raw = '';
    config.query.from = 'me';
    config.query.mentions = '@nichxbt';
    config.query.contains = '';
    expect(win.XSearchSweep.query()).toBe('from:cryptopumps @nichxbt');
  });

  it('keeps extra operators and a to: target', () => {
    const { config } = win.XSearchSweep;
    config.query.to = 'nichxbt';
    config.query.contains = 'filter:replies -filter:links';
    expect(win.XSearchSweep.query()).toBe('from:cryptopumps @nichxbt to:nichxbt filter:replies -filter:links');
    config.query.to = '';
    config.query.contains = '';
  });

  it('lets a raw query override the fields', () => {
    const { config } = win.XSearchSweep;
    config.query.raw = 'from:cryptopumps since:2024-01-01';
    expect(win.XSearchSweep.query()).toBe('from:cryptopumps since:2024-01-01');
    config.query.raw = '';
  });
});

describe('searchSweep: reading results', () => {
  it('reads author, id, timestamp and counts off each result', () => {
    const rows = win.XSearchSweep.preview();
    expect(rows).toHaveLength(3);
    const [first, second, third] = rows;
    expect(first.id).toBe('1000000000000000001');
    expect(first.author).toBe('cryptopumps');
    expect(first.isMine).toBe(true);
    expect(second.likes).toBe(412);
    expect(second.reposts).toBe(30);
    expect(third.author).toBe('nichxbt');
    expect(third.isMine).toBe(false);
  });
});

describe('searchSweep: what it will and will not touch', () => {
  it('refuses to delete a post that is not yours', () => {
    win.XSearchSweep.config.actions.delete = true;
    const rows = win.XSearchSweep.preview();
    const theirs = rows.find((r) => r.author === 'nichxbt');
    expect(theirs.verdict.ok).toBe(false);
    expect(theirs.verdict.why).toBe('not yours');
  });

  it('will like someone else\'s post when delete is off', () => {
    const { config } = win.XSearchSweep;
    config.actions.delete = false;
    config.actions.like = true;
    const theirs = win.XSearchSweep.preview().find((r) => r.author === 'nichxbt');
    expect(theirs.verdict.ok).toBe(true);
    config.actions.delete = true;
    config.actions.like = false;
  });

  it('protects a post that outperformed the maxLikes ceiling', () => {
    const { config } = win.XSearchSweep;
    config.filters.maxLikes = 100;
    const rows = win.XSearchSweep.preview();
    expect(rows.find((r) => r.id === '1000000000000000002').verdict).toEqual({ ok: false, why: '412 likes' });
    expect(rows.find((r) => r.id === '1000000000000000001').verdict.ok).toBe(true);
    config.filters.maxLikes = null;
  });

  it('honours an excludeKeywords guard', () => {
    const { config } = win.XSearchSweep;
    config.filters.excludeKeywords = ['big thread'];
    const row = win.XSearchSweep.preview().find((r) => r.id === '1000000000000000002');
    expect(row.verdict.ok).toBe(false);
    expect(row.verdict.why).toContain('big thread');
    config.filters.excludeKeywords = [];
  });

  it('skips posts newer than the age floor', () => {
    const { config } = win.XSearchSweep;
    config.filters.olderThanDays = 1;
    expect(win.XSearchSweep.preview().every((r) => r.verdict.ok || r.verdict.why === 'not yours')).toBe(true);
    config.filters.olderThanDays = 400000;
    expect(win.XSearchSweep.preview().find((r) => r.id === '1000000000000000001').verdict.ok).toBe(false);
    config.filters.olderThanDays = null;
  });
});

describe('searchSweep: the panel', () => {
  const setChecked = (id, value) => {
    const input = win.document.getElementById(id);
    input.checked = value;
    input.dispatchEvent(new win.Event('change', { bubbles: true }));
  };

  it('unticks and locks the engagement actions when delete is chosen', () => {
    setChecked('xsw-a-delete', false);
    setChecked('xsw-a-like', true);
    setChecked('xsw-a-repost', true);
    expect(win.XSearchSweep.config.actions.like).toBe(true);

    setChecked('xsw-a-delete', true);

    expect(win.document.getElementById('xsw-a-like').checked).toBe(false);
    expect(win.document.getElementById('xsw-a-repost').checked).toBe(false);
    expect(win.XSearchSweep.config.actions.like).toBe(false);
    expect(win.document.getElementById('xsw-chip-like').classList.contains('locked')).toBe(true);
  });

  it('releases the lock and says what will happen when delete is turned off', () => {
    setChecked('xsw-a-delete', false);
    setChecked('xsw-a-reply', true);

    expect(win.document.getElementById('xsw-chip-like').classList.contains('locked')).toBe(false);
    expect(win.document.getElementById('xsw-actions-hint').textContent).toContain('reply');
    expect(win.document.getElementById('xsw-reply-section').style.display).toBe('');

    setChecked('xsw-a-reply', false);
    setChecked('xsw-a-delete', true);
  });

  it('shows the query it would run, and flags the empty case', () => {
    const raw = win.document.getElementById('xsw-raw');
    raw.value = 'from:cryptopumps @nichxbt';
    raw.dispatchEvent(new win.Event('input', { bubbles: true }));
    expect(win.document.getElementById('xsw-preview').textContent).toBe('from:cryptopumps @nichxbt');

    raw.value = '';
    win.document.getElementById('xsw-from').value = '';
    win.document.getElementById('xsw-mentions').value = '';
    raw.dispatchEvent(new win.Event('input', { bubbles: true }));
    expect(win.document.getElementById('xsw-preview').textContent).toBe('(empty query)');
  });

  it('marks dry run as armed once it is switched off', () => {
    setChecked('xsw-dry', false);
    expect(win.document.getElementById('xsw-dry-wrap').classList.contains('xsw-danger-on')).toBe(true);
    setChecked('xsw-dry', true);
    expect(win.document.getElementById('xsw-dry-wrap').classList.contains('xsw-danger-on')).toBe(false);
  });
});
