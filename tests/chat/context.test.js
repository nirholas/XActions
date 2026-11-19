// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Chat context is the only thing between a stranger's post and a model's
 * prompt, and between a citation number and the link it opens. These tests
 * pin attachment parsing, the untrusted-input sanitiser, citation numbering
 * across items, and the token budget, against injected readers rather than
 * live X.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { describe, it, expect } from 'vitest';

import {
  buildContextBlock,
  estimateTokens,
  parseAttachment,
  resolveAttachment,
  sanitizeItems,
  toContextPost,
} from '../../src/chat/context.js';

/**
 * A post in the shape the edge timeline reader returns.
 * @param {string} id
 * @param {object} [overrides]
 * @returns {object}
 */
function edgePost(id, overrides = {}) {
  return {
    id,
    text: `post ${id}`,
    createdAt: '2026-11-18T10:00:00.000Z',
    author: { username: 'alpha', name: 'Alpha' },
    metrics: { likes: 10, retweets: 2, replies: 1, views: 500 },
    isReply: false,
    isRetweet: false,
    quotedTweet: null,
    ...overrides,
  };
}

/** A reader that never touches the network. */
function fakeReader({ posts = [edgePost('101'), edgePost('102')], thread, threadError } = {}) {
  return {
    getProfile: async (username) => {
      if (username === 'missing') return null;
      return { id: '1', username: username === 'locked' ? 'locked' : 'alpha', name: 'Alpha', bio: 'Builds things', followers: 5000, following: 10, tweets: 900, joined: '2020-01-01T00:00:00.000Z', protected: username === 'locked' };
    },
    getTweets: async () => ({ tweets: posts }),
    getThread: async (id) => {
      if (threadError) throw threadError;
      return thread || { posts: [edgePost(id)], truncated: false };
    },
    getPost: async (id) => edgePost(id),
  };
}

describe('parseAttachment', () => {
  it('reads post links in every form X uses', () => {
    expect(parseAttachment('https://x.com/alpha/status/1234567890')).toEqual({ kind: 'post', id: '1234567890' });
    expect(parseAttachment('twitter.com/alpha/status/1234567890?s=20')).toEqual({ kind: 'post', id: '1234567890' });
    expect(parseAttachment('https://x.com/i/web/status/1234567890')).toEqual({ kind: 'post', id: '1234567890' });
    expect(parseAttachment('1234567890123')).toEqual({ kind: 'post', id: '1234567890123' });
  });

  it('reads handles and profile links', () => {
    expect(parseAttachment('@alpha')).toEqual({ kind: 'account', username: 'alpha' });
    expect(parseAttachment('alpha_2')).toEqual({ kind: 'account', username: 'alpha_2' });
    expect(parseAttachment('https://x.com/alpha')).toEqual({ kind: 'account', username: 'alpha' });
    expect(parseAttachment('https://mobile.twitter.com/alpha/')).toEqual({ kind: 'account', username: 'alpha' });
  });

  it('refuses X pages that are not accounts, and things that are not handles', () => {
    expect(parseAttachment('https://x.com/home')).toBeNull();
    expect(parseAttachment('https://x.com/explore')).toBeNull();
    expect(parseAttachment('far_too_long_for_a_handle')).toBeNull();
    expect(parseAttachment('https://example.com/alpha')).toBeNull();
    expect(parseAttachment('')).toBeNull();
  });
});

describe('toContextPost', () => {
  it('normalises the timeline shape', () => {
    const post = toContextPost(edgePost('101', { quotedTweet: { author: { username: 'beta' }, text: 'quoted words' } }));
    expect(post).toMatchObject({ id: '101', url: 'https://x.com/alpha/status/101', author: 'alpha', likes: 10, reposts: 2, replies: 1, views: 500 });
    expect(post.quoted).toBe('@beta: quoted words');
  });

  it('normalises the single-post shape', () => {
    const post = toContextPost({ id: '7', text: 'hi', author: { username: 'beta' }, metrics: { likes: 1, reposts: 3 }, replyTo: { id: '6' } });
    expect(post).toMatchObject({ reposts: 3, isReply: true, url: 'https://x.com/beta/status/7' });
  });

  it('drops posts without a numeric id', () => {
    expect(toContextPost({ id: 'abc', text: 'x' })).toBeNull();
    expect(toContextPost(null)).toBeNull();
  });
});

describe('sanitizeItems', () => {
  const good = { id: 'account-alpha', kind: 'account', label: '@alpha', url: 'https://x.com/alpha', profile: { username: 'alpha', followers: 5 }, posts: [toContextPost(edgePost('101'))] };

  it('keeps a well-formed item intact', () => {
    const [item] = sanitizeItems([good]);
    expect(item.posts[0]).toMatchObject({ id: '101', reposts: 2, url: 'https://x.com/alpha/status/101' });
    expect(item.profile.followers).toBe(5);
  });

  it('never lets a citation point anywhere but X', () => {
    const [item] = sanitizeItems([{ ...good, url: 'javascript:alert(1)', posts: [{ ...good.posts[0], url: 'https://evil.example/phish' }] }]);
    expect(item.url).toBe('');
    expect(item.posts[0].url).toBe('https://x.com/alpha/status/101');
  });

  it('drops unknown kinds, bad posts and empty items, and caps the count', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ ...good, id: `a${i}` }));
    expect(sanitizeItems(many)).toHaveLength(8);
    expect(sanitizeItems([{ ...good, kind: 'script' }])).toEqual([]);
    expect(sanitizeItems([{ ...good, profile: null, posts: [{ id: 'nope' }] }])).toEqual([]);
    expect(sanitizeItems('not an array')).toEqual([]);
  });

  it('caps post text so one item cannot fill the prompt', () => {
    const [item] = sanitizeItems([{ ...good, posts: [{ ...good.posts[0], text: 'x'.repeat(10_000) }] }]);
    expect(item.posts[0].text.length).toBeLessThanOrEqual(1500);
  });
});

describe('buildContextBlock', () => {
  const a = { id: 'a', kind: 'account', label: '@alpha', profile: { username: 'alpha', name: 'Alpha', followers: 5000, following: 10, posts: 900, bio: 'Builds' }, posts: [toContextPost(edgePost('1')), toContextPost(edgePost('2'))] };
  const b = { id: 'b', kind: 'post', label: 'Post by @beta', profile: null, posts: [toContextPost(edgePost('3', { author: { username: 'beta' } }))] };

  it('numbers posts across items so every citation is unique', () => {
    const { text, sources } = buildContextBlock([a, b]);
    expect(sources.map((s) => [s.n, s.url])).toEqual([
      [1, 'https://x.com/alpha/status/1'],
      [2, 'https://x.com/alpha/status/2'],
      [3, 'https://x.com/beta/status/3'],
    ]);
    expect(text).toContain('ACCOUNT @alpha (Alpha)');
    expect(text).toContain('followers 5000');
    expect(text).toContain('[3] @beta');
  });

  it('trims the largest item first when over budget, and says how many were dropped', () => {
    const big = { ...a, posts: Array.from({ length: 40 }, (_, i) => toContextPost(edgePost(String(100 + i), { text: 'word '.repeat(80) }))) };
    const { tokens, dropped, sources } = buildContextBlock([big, b], { budget: 2000 });
    expect(tokens).toBeLessThanOrEqual(2000);
    expect(dropped).toBeGreaterThan(0);
    // The small attachment survives whole.
    expect(sources.some((s) => s.url.endsWith('/status/3'))).toBe(true);
  });

  it('estimates tokens at four characters each', () => {
    expect(estimateTokens('abcd'.repeat(10))).toBe(10);
    expect(estimateTokens('')).toBe(0);
  });
});

describe('resolveAttachment', () => {
  it('reads an account with its profile and recent posts', async () => {
    const item = await resolveAttachment('@alpha', fakeReader());
    expect(item).toMatchObject({ id: 'account-alpha', kind: 'account', label: '@alpha', url: 'https://x.com/alpha' });
    expect(item.profile).toMatchObject({ followers: 5000, following: 10, posts: 900 });
    expect(item.posts).toHaveLength(2);
    expect(item.tokens).toBeGreaterThan(0);
  });

  it('reads a post link as a thread when there is one', async () => {
    const thread = { posts: [edgePost('1860000000000000010'), edgePost('1860000000000000011')], truncated: true };
    const item = await resolveAttachment('https://x.com/alpha/status/1860000000000000011', fakeReader({ thread }));
    expect(item.kind).toBe('thread');
    expect(item.truncated).toBe(true);
    expect(item.url).toBe('https://x.com/alpha/status/1860000000000000011');
  });

  it('falls back to the single post when the thread walk fails', async () => {
    const item = await resolveAttachment('https://x.com/alpha/status/1860000000000000012', fakeReader({ threadError: new Error('rate limited') }));
    expect(item.kind).toBe('post');
    expect(item.posts.map((p) => p.id)).toEqual(['1860000000000000012']);
  });

  it('explains what went wrong in words a person can act on', async () => {
    await expect(resolveAttachment('not a link at all!', fakeReader())).rejects.toMatchObject({ status: 400 });
    await expect(resolveAttachment('@missing', fakeReader())).rejects.toMatchObject({ status: 404 });
    await expect(resolveAttachment('@locked', fakeReader())).rejects.toMatchObject({ status: 403 });
    const gone = Object.assign(new Error('gone'), { name: 'NotFoundError' });
    await expect(resolveAttachment('https://x.com/a/status/1860000000000000099', fakeReader({ threadError: gone }))).rejects.toMatchObject({ status: 404 });
  });
});
