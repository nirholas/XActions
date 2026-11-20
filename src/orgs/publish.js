// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Publish approved posts for an organization.
 *
 * For each approved post that is due (no schedule, or a schedule in the
 * past), each pending target is published in order: the primary first, then
 * the variants, then the reposts of the primary. Before any write:
 *
 * - The account's daily action cap is charged (`src/mcp/action-caps.js`, the
 *   same ledger the MCP server and `xactions drafts approve` use). A target
 *   over its cap stays pending for the next run.
 * - The saved session is checked against the handle it was saved for. A jar
 *   that logs in as a different account fails the target instead of posting
 *   one account's announcement from another.
 *
 * A write X accepts but answers without a post id is recorded as
 * `unconfirmed`, not retried: retrying could post it twice. Check the account
 * and mark it yourself.
 *
 * Writes are spaced `delayMs` apart (3 seconds by default). Run this from cron
 * for scheduled posts: `xactions org publish <org>` every few minutes.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { checkAndRecord } from '../mcp/action-caps.js';
import { assertCan } from './roles.js';
import { readSession } from './sessions.js';
import { listPosts, loadOrg, orgPaths, recordAudit, recordTargetOutcome, resetFailedTargets, resolveActor } from './store.js';

/** Default pause between two writes in one run. */
export const DEFAULT_DELAY_MS = 3000;

/**
 * Build an authenticated client for a cookie jar.
 * @param {Array<{name: string, value: string}>} cookies
 * @returns {Promise<{me: Function, sendTweet: Function, retweet: Function}>}
 */
export async function createSessionClient(cookies) {
  const { Scraper } = await import('../client/index.js');
  const scraper = new Scraper();
  await scraper.setCookies(cookies);
  return scraper;
}

/**
 * Confirm a session logs in as `handle`. Returns the account's user id.
 * @param {{me: Function}} client
 * @param {string} handle
 * @returns {Promise<{userId: string, username: string}>}
 */
export async function verifyAccountSession(client, handle) {
  let me;
  try {
    me = await client.me();
  } catch (error) {
    throw new Error(`Could not confirm which account this session belongs to: ${error.message}. Export the full cookie jar, which includes the twid cookie.`, { cause: error });
  }
  const username = String(me?.username ?? '').toLowerCase();
  if (username !== handle) {
    throw new Error(`This session logs in as @${username || 'unknown'}, not @${handle}. Nothing was posted.`);
  }
  return { userId: me.id ?? null, username };
}

function isDue(post, now) {
  return !post.scheduledFor || Date.parse(post.scheduledFor) <= now;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Publish every due approved post, or one post by id.
 *
 * @param {string} slug
 * @param {object} [options]
 * @param {string} [options.as] the member publishing; needs editor or above
 * @param {string} [options.postId] publish this post only, even if scheduled later
 * @param {boolean} [options.dryRun] report what would be published; write nothing
 * @param {boolean} [options.retryFailed] reset failed targets to pending first
 * @param {number} [options.delayMs]
 * @param {number} [options.now]
 * @param {(cookies: object[], handle: string) => Promise<object>} [options.createClient]
 * @param {(line: object) => void} [options.onResult] called after each target
 * @returns {Promise<Array<{post: string, handle: string, mode: string, outcome: string, tweetId?: string|null, error?: string}>>}
 */
export async function publishDue(slug, options = {}) {
  const {
    as,
    postId,
    dryRun = false,
    retryFailed = false,
    delayMs = DEFAULT_DELAY_MS,
    now = Date.now(),
    createClient = createSessionClient,
    onResult = () => {},
  } = options;

  const org = loadOrg(slug);
  const actor = resolveActor(org, as);
  assertCan(actor, 'posts:publish');
  const paths = orgPaths(slug);
  const connected = new Set(org.accounts.map((a) => a.handle));

  if (retryFailed && !dryRun) {
    for (const p of listPosts(slug)) {
      if ((p.status === 'partial' || p.status === 'failed') && (!postId || p.id === postId)) resetFailedTargets(slug, p.id);
    }
  }

  let queue = listPosts(slug, { status: 'approved' }).reverse();
  if (postId) {
    queue = queue.filter((p) => p.id === postId);
    if (queue.length === 0) throw new Error(`${postId} is not an approved post with anything left to publish.`);
  } else {
    queue = queue.filter((p) => isDue(p, now));
  }
  queue.sort((a, b) => Date.parse(a.scheduledFor ?? a.createdAt) - Date.parse(b.scheduledFor ?? b.createdAt));

  const clients = new Map();
  const clientFor = async (handle) => {
    if (!clients.has(handle)) {
      const pending = (async () => {
        const client = await createClient(readSession(paths.session(handle)), handle);
        await verifyAccountSession(client, handle);
        return client;
      })();
      clients.set(handle, pending);
      pending.catch(() => {});
    }
    return clients.get(handle);
  };

  const results = [];
  let wrote = false;
  const report = (line) => {
    results.push(line);
    onResult(line);
  };

  for (const post of queue) {
    const primary = post.targets[0];
    let primaryTweetId = primary.status === 'published' ? primary.tweetId : null;

    for (const target of post.targets) {
      if (target.status !== 'pending') continue;
      const base = { post: post.id, handle: target.handle, mode: target.mode };

      if (target.mode === 'repost' && !primaryTweetId) {
        if (primary.status === 'failed' || primary.status === 'unconfirmed') {
          const error = primary.status === 'failed'
            ? `the primary @${primary.handle} did not publish`
            : `the primary @${primary.handle} has no confirmed post id to repost`;
          if (!dryRun) recordTargetOutcome(slug, post.id, target.handle, { status: 'failed', error });
          report({ ...base, outcome: 'failed', error });
        } else if (dryRun) {
          report({ ...base, outcome: 'would-repost', text: `repost of @${primary.handle}` });
        } else {
          report({ ...base, outcome: 'waiting', error: `waiting for the primary @${primary.handle}` });
        }
        continue;
      }

      if (dryRun) {
        report({ ...base, outcome: target.mode === 'repost' ? 'would-repost' : 'would-post', text: target.text ?? `repost of @${primary.handle}` });
        continue;
      }

      if (!connected.has(target.handle)) {
        const error = `@${target.handle} is no longer connected to "${slug}"`;
        recordTargetOutcome(slug, post.id, target.handle, { status: 'failed', error });
        report({ ...base, outcome: 'failed', error });
        if (target === primary) primary.status = 'failed';
        continue;
      }

      try {
        checkAndRecord(target.handle, target.mode === 'repost' ? 'repost' : 'post');
      } catch (error) {
        if (error.code !== 'ACTION_CAP_EXCEEDED') throw error;
        report({ ...base, outcome: 'capped', error: error.message });
        continue;
      }

      if (wrote && delayMs > 0) await sleep(delayMs);
      wrote = true;

      try {
        const client = await clientFor(target.handle);
        if (target.mode === 'repost') {
          await client.retweet(primaryTweetId);
          recordTargetOutcome(slug, post.id, target.handle, { status: 'published', tweetId: primaryTweetId });
          recordAudit(slug, actor.name, 'post.publish', { post: post.id, handle: target.handle, mode: 'repost', tweetId: primaryTweetId });
          report({ ...base, outcome: 'reposted', tweetId: primaryTweetId });
        } else {
          const tweet = await client.sendTweet(target.text);
          const tweetId = tweet?.id ? String(tweet.id) : null;
          const status = tweetId ? 'published' : 'unconfirmed';
          const error = tweetId ? null : 'X accepted the write but returned no post id; check the account before retrying';
          recordTargetOutcome(slug, post.id, target.handle, { status, tweetId, error });
          recordAudit(slug, actor.name, 'post.publish', { post: post.id, handle: target.handle, mode: 'post', tweetId, status });
          report({ ...base, outcome: status, tweetId, ...(error ? { error } : {}) });
          if (target === primary) {
            primaryTweetId = tweetId;
            primary.status = status;
          }
        }
      } catch (error) {
        recordTargetOutcome(slug, post.id, target.handle, { status: 'failed', error: error.message });
        recordAudit(slug, actor.name, 'post.fail', { post: post.id, handle: target.handle, mode: target.mode, error: error.message });
        report({ ...base, outcome: 'failed', error: error.message });
        if (target === primary) primary.status = 'failed';
      }
    }
  }
  return results;
}
