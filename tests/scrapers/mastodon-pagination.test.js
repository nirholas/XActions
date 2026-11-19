// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Mastodon follower/following pagination follows the Link header.
 *
 * Mastodon pages these lists by the id of the follow relationship, which only
 * appears in `Link: <...max_id=N>; rel="next"`. Paging by the last account's
 * id (a snowflake far larger than any relationship id) asked for "everything
 * below that id" again and returned duplicates or nothing new.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { scrapeFollowers, scrapeFollowing, parseNextLink } from '../../src/scrapers/mastodon/index.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * A server holding `total` follow relationships with ids total..1 (newest
 * first). Account ids are unrelated snowflakes, as on a real instance.
 */
function mastodonServer(total) {
  const follows = Array.from({ length: total }, (_, i) => ({
    followId: total - i,
    account: { id: String(110000000000000000n + BigInt(i * 7919)), acct: `u${i}`, display_name: `U ${i}`, note: '<p>hi &amp; bye</p>' },
  }));
  const requests = [];
  const fetch = vi.fn(async (url) => {
    const u = new URL(url);
    requests.push(u);
    if (u.pathname.endsWith('/accounts/lookup')) return new Response(JSON.stringify({ id: '1', acct: 'me' }));
    const limit = Number(u.searchParams.get('limit'));
    const maxId = u.searchParams.get('max_id');
    const rows = follows.filter((f) => !maxId || f.followId < Number(maxId)).slice(0, limit);
    const last = rows.at(-1);
    const more = last && last.followId > 1;
    const headers = more
      ? { link: `<${u.origin}${u.pathname}?max_id=${last.followId}>; rel="next", <${u.origin}${u.pathname}?since_id=${rows[0].followId}>; rel="prev"` }
      : {};
    return new Response(JSON.stringify(rows.map((r) => r.account)), { headers });
  });
  return { fetch, requests };
}

describe('parseNextLink', () => {
  it('picks rel="next" out of a multi-link header', () => {
    expect(parseNextLink('<https://m.example/api/v1/a?max_id=5>; rel="next", <https://m.example/api/v1/a?since_id=9>; rel="prev"')).toBe(
      'https://m.example/api/v1/a?max_id=5',
    );
    expect(parseNextLink('<https://m.example/x?since_id=9>; rel="prev"')).toBeNull();
    expect(parseNextLink(null)).toBeNull();
  });
});

describe('Mastodon account lists', () => {
  it('scrapeFollowers collects every follower exactly once across pages', async () => {
    const server = mastodonServer(200);
    vi.stubGlobal('fetch', server.fetch);
    const followers = await scrapeFollowers({ instance: 'https://m.example' }, 'me', { limit: 200 });
    expect(followers).toHaveLength(200);
    expect(new Set(followers.map((f) => f.id)).size).toBe(200);
    expect(followers[0]).toMatchObject({ username: 'u0', bio: 'hi & bye', platform: 'mastodon' });
    // Page two was asked for with the relationship id from the Link header.
    const pages = server.requests.filter((u) => u.pathname.endsWith('/followers'));
    expect(pages[1].searchParams.get('max_id')).toBe('121');
  });

  it('scrapeFollowing stops at the limit and when the Link header has no next', async () => {
    const server = mastodonServer(90);
    vi.stubGlobal('fetch', server.fetch);
    const some = await scrapeFollowing({ instance: 'https://m.example' }, 'me', { limit: 85 });
    expect(some).toHaveLength(85);
    const all = await scrapeFollowing({ instance: 'https://m.example' }, 'me', { limit: 500 });
    expect(all).toHaveLength(90);
    expect(new Set(all.map((f) => f.id)).size).toBe(90);
  });
});
