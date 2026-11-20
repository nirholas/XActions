// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Read-only views over an organization: the calendar and the numbers.
 *
 * `orgCalendar()` reads only local state. `orgStats()` reads each account's
 * public profile and the public metrics of posts the org published, which
 * need no login, plus each account's remaining daily post budget from the
 * action ledger.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { remaining } from '../mcp/action-caps.js';
import { assertCan } from './roles.js';
import { listPosts, loadOrg, resolveActor } from './store.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Most published posts per account whose metrics are fetched in one run. */
export const DEFAULT_METRIC_SAMPLE = 20;

/**
 * Upcoming and unscheduled work, grouped by UTC day.
 * @param {string} slug
 * @param {{as?: string, days?: number, now?: number}} [options]
 * @returns {{days: Array<{date: string, items: object[]}>, unscheduled: object[]}}
 */
export function orgCalendar(slug, { as, days = 14, now = Date.now() } = {}) {
  const org = loadOrg(slug);
  assertCan(resolveActor(org, as), 'posts:read');
  const end = now + days * DAY_MS;
  const byDay = new Map();
  const unscheduled = [];

  for (const post of listPosts(slug).reverse()) {
    if (!['draft', 'approved'].includes(post.status)) continue;
    const item = {
      post: post.id,
      status: post.status,
      scheduledFor: post.scheduledFor,
      accounts: post.targets.map((t) => (t.mode === 'repost' ? `↻@${t.handle}` : `@${t.handle}`)),
      text: post.targets[0].text,
    };
    if (!post.scheduledFor) {
      unscheduled.push(item);
      continue;
    }
    const t = Date.parse(post.scheduledFor);
    if (t > end) continue;
    const date = t < now ? 'overdue' : post.scheduledFor.slice(0, 10);
    if (!byDay.has(date)) byDay.set(date, []);
    byDay.get(date).push(item);
  }

  const order = [...byDay.keys()].sort((a, b) => (a === 'overdue' ? -1 : b === 'overdue' ? 1 : a.localeCompare(b)));
  return {
    days: order.map((date) => ({ date, items: byDay.get(date).sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)) })),
    unscheduled,
  };
}

/**
 * Per-account and rolled-up numbers.
 *
 * @param {string} slug
 * @param {object} [options]
 * @param {string} [options.as]
 * @param {number} [options.days] window for "published" counts and metrics
 * @param {number} [options.sample] most posts per account to fetch metrics for
 * @param {number} [options.now]
 * @param {() => Promise<{getProfile: Function, getTweet: Function}>} [options.createReader]
 * @returns {Promise<{org: string, days: number, accounts: object[], totals: object}>}
 */
export async function orgStats(slug, options = {}) {
  const { as, days = 30, sample = DEFAULT_METRIC_SAMPLE, now = Date.now(), createReader = defaultReader } = options;
  const org = loadOrg(slug);
  assertCan(resolveActor(org, as), 'posts:read');
  const cutoff = now - days * DAY_MS;
  const reader = await createReader();

  const published = new Map(org.accounts.map((a) => [a.handle, []]));
  for (const post of listPosts(slug)) {
    for (const t of post.targets) {
      if (t.status !== 'published' || !t.publishedAt || Date.parse(t.publishedAt) < cutoff) continue;
      if (!published.has(t.handle)) continue;
      published.get(t.handle).push({ post: post.id, mode: t.mode, tweetId: t.tweetId, publishedAt: t.publishedAt });
    }
  }

  const accounts = [];
  for (const account of org.accounts) {
    const row = {
      handle: account.handle,
      label: account.label,
      kind: account.kind,
      followers: null,
      following: null,
      tweets: null,
      published: published.get(account.handle).length,
      reposts: published.get(account.handle).filter((p) => p.mode === 'repost').length,
      likes: 0,
      retweets: 0,
      replies: 0,
      views: 0,
      sampled: 0,
      postBudgetLeft: remaining(account.handle, { now }).classes.post.remaining,
      error: null,
    };
    try {
      const profile = await reader.getProfile(account.handle);
      row.followers = profile.followersCount ?? null;
      row.following = profile.followingCount ?? null;
      row.tweets = profile.tweetCount ?? null;
    } catch (error) {
      row.error = `profile: ${error.message}`;
    }
    const own = published
      .get(account.handle)
      .filter((p) => p.mode === 'post' && p.tweetId)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, sample);
    for (const p of own) {
      try {
        const tweet = await reader.getTweet(p.tweetId);
        row.likes += tweet?.likes ?? 0;
        row.retweets += tweet?.retweets ?? 0;
        row.replies += tweet?.replies ?? 0;
        row.views += tweet?.views ?? 0;
        row.sampled++;
      } catch (error) {
        row.error = row.error ?? `post ${p.tweetId}: ${error.message}`;
      }
    }
    accounts.push(row);
  }

  const sum = (key) => accounts.reduce((n, a) => n + (a[key] ?? 0), 0);
  return {
    org: slug,
    days,
    accounts,
    totals: {
      accounts: accounts.length,
      followers: sum('followers'),
      published: sum('published'),
      likes: sum('likes'),
      retweets: sum('retweets'),
      replies: sum('replies'),
      views: sum('views'),
    },
  };
}

async function defaultReader() {
  const { Scraper } = await import('../client/index.js');
  return new Scraper();
}
