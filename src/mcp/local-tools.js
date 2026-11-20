#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Local Tools (Puppeteer-based)
 * Free mode — all scraping delegated to canonical scrapers (single source of truth).
 * Action tools (follow, like, post, etc.) implemented directly via Puppeteer.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license Apache-2.0
 */

import {
  createBrowser,
  createPage,
  loginWithCookie,
  scrapeProfile,
  scrapeFollowers,
  scrapeFollowing,
  scrapeTweets,
  searchTweets,
  scrapeThread,
  scrapeListMembers,
  scrapeBookmarks,
  scrapeNotifications,
  scrapeTrending,
  scrapeSpaces,
} from '../scrapers/index.js';

import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'fs/promises';
import path from 'path';

import { isBrowserConnected, isPageUsable } from '../utils/browserState.js';
import { loadSavedSession, sessionDir } from '../utils/savedSession.js';
import { performFollow, performUnfollow, FOLLOW_STATUS } from './followAction.js';
import { TwitterHttpClient } from '../scrapers/twitter/http/client.js';
import { uploadMedia } from '../scrapers/twitter/http/media.js';
import {
  postTweet as httpPostTweet,
  postThread as httpPostThread,
  replyToTweet as httpReplyToTweet,
  quoteTweet as httpQuoteTweet,
  schedulePost as httpSchedulePost,
} from '../scrapers/twitter/http/actions.js';
import { gotoAndRender } from '../utils/navigation.js';
import {
  openComposer,
  typeIntoComposer,
  clickPostButton,
  confirmPosted,
  setDialogSelects,
  scheduleSelectValues,
  pollDurationValues,
} from './composer.js';
import { clearBookmarksOneByOne } from './clearBookmarks.js';
import { isLiveRun } from './tool-groups.js';

// ============================================================================
// Singleton Browser Management
// ============================================================================

let browser = null;
let page = null;
let appliedSessionStamp = null;

// ----------------------------------------------------------------------------
// One page, one tool at a time
// ----------------------------------------------------------------------------
//
// Every browser-lane tool drives the same page. The MCP SDK runs requests
// concurrently and clients send tool calls in parallel, so without a lock two
// x_like calls both navigate, both click the second post (the second click
// undoing the like), and both report success; two composers type into each
// other. The lock is taken the first time a call reaches the browser and held
// until that call returns, so HTTP-only tools (x_engage, the x_client_* tools)
// never wait behind a browser action. It is reentrant through
// AsyncLocalStorage: a tool that calls another tool already holds it.

const toolContext = new AsyncLocalStorage();
let browserLockTail = Promise.resolve();

function acquireBrowserLock() {
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  const previous = browserLockTail;
  browserLockTail = previous.then(() => held);
  return previous.then(() => release);
}

/**
 * Run one tool call in its own context, releasing the browser lock (if the
 * call took it) when the call settles.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withToolContext(fn) {
  if (toolContext.getStore()) return fn();
  const store = { release: null };
  try {
    return await toolContext.run(store, fn);
  } finally {
    store.release?.();
  }
}

export async function holdBrowser() {
  const store = toolContext.getStore();
  if (!store || store.release) return;
  store.release = await acquireBrowserLock();
}

/**
 * Fingerprint of the on-disk session the browser was last primed with.
 *
 * `applySavedSession` injects cookies once at browser launch, but a
 * `login`/`connect` in another process rewrites the jar at any moment —
 * and without this check every browser-lane tool keeps running the stale
 * logged-out page and silently returns `[]` until the server restarts.
 * mtime-based, covers both the jar and the `config.json` token mirror.
 */
async function sessionStamp() {
  if (process.env.XACTIONS_SESSION_COOKIE) return 'env-session';
  const dir = sessionDir();
  let stamp = '';
  for (const f of ['cookies.json', 'config.json']) {
    try {
      const s = await fs.stat(path.join(dir, f));
      stamp += `${s.mtimeMs}:${s.size};`;
    } catch {
      stamp += '0:';
    }
  }
  return stamp;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min = 1000, max = 3000) =>
  sleep(min + Math.random() * (max - min));

/**
 * Put the saved session on a freshly opened page.
 *
 * Without this the whole Puppeteer path runs logged out: X serves a shell
 * with no `data-testid` in it to visitors it does not know, so no action
 * selector ever matches and the tools report a failure that reads like a
 * missing feature. `loadSavedSession` prefers `XACTIONS_SESSION_COOKIE` when
 * it is set, then falls back to the jar `xactions connect` wrote.
 *
 * @param {object} pg
 * @returns {Promise<void>}
 */
async function applySavedSession(pg) {
  const session = await loadSavedSession();
  if (!session) return;
  try {
    await pg.setCookie({
      name: 'auth_token',
      value: session.authToken,
      domain: '.x.com',
      path: '/',
      httpOnly: true,
      secure: true,
    });
    if (session.ct0) {
      await pg.setCookie({
        name: 'ct0',
        value: session.ct0,
        domain: '.x.com',
        path: '/',
        httpOnly: true,
        secure: true,
      });
    }
  } catch (err) {
    console.error('[xactions] browser session could not be applied:', err.message);
  }
}

/**
 * Ensure a browser/page pair is available, creating if needed.
 * Uses createBrowser/createPage from the canonical scrapers module.
 */
async function ensureBrowser() {
  await holdBrowser();
  const stamp = await sessionStamp();
  if (!isBrowserConnected(browser) || !isPageUsable(page) || stamp !== appliedSessionStamp) {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Replacing a dead or stale browser; it may already be gone.
      }
    }
    browser = null;
    page = null;
    browser = await createBrowser();
    page = await createPage(browser);
    await applySavedSession(page);
    appliedSessionStamp = stamp;
  }
  return { browser, page };
}

// ============================================================================
// HTTP client (no browser) — preferred for public reads
// ============================================================================

let httpScraper = null;

/**
 * Lazily build the HTTP-only Scraper, authenticated when a session cookie is
 * configured.
 *
 * X stopped serving profile and timeline content to logged-out browsers, so
 * the Puppeteer path returned a page with nothing on it and these tools
 * answered agents with every field set to null — indistinguishable from an
 * empty account, so agents reported confidently wrong answers instead of
 * failing. The internal GraphQL API still serves public reads to guest tokens,
 * needs no Chromium, and returns in milliseconds.
 *
 * @returns {Promise<import('../client/index.js').Scraper>}
 */
async function ensureHttpScraper() {
  if (httpScraper) return httpScraper;

  const { Scraper } = await import('../client/index.js');
  httpScraper = new Scraper();

  const authToken = process.env.XACTIONS_SESSION_COOKIE;
  const csrfToken = process.env.XACTIONS_CSRF_TOKEN;
  if (authToken) {
    const parts = [`auth_token=${authToken}`];
    if (csrfToken) parts.push(`ct0=${csrfToken}`);
    await httpScraper.setCookies(parts.join('; '));
  }

  return httpScraper;
}

/**
 * Try the HTTP client first and fall back to the browser.
 *
 * The browser path still wins for anything that needs a rendered page or a
 * logged-in UI action, so it stays as the fallback rather than being removed.
 *
 * @template T
 * @param {() => Promise<T>} viaHttp
 * @param {() => Promise<T>} viaBrowser
 * @returns {Promise<T>}
 */
async function preferHttp(viaHttp, viaBrowser) {
  try {
    return await viaHttp();
  } catch (httpError) {
    try {
      return await viaBrowser();
    } catch {
      // Report the HTTP failure: it carries the actionable message
      // ("authenticate first"), while the browser failure is usually a
      // downstream symptom of the same missing session.
      throw httpError;
    }
  }
}

export async function getPage() {
  const { page } = await ensureBrowser();
  return page;
}

/**
 * Close browser (called by server.js on SIGINT/SIGTERM)
 */
export async function closeBrowser() {
  if (browser) {
    try {
      await browser.close();
    } catch {
      // Shutting down: a browser that already exited is the goal state.
    }
    browser = null;
    page = null;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Wait for a selector and click it. Returns true if clicked.
 */
async function clickIfPresent(pg, selector, { timeout = 3000 } = {}) {
  try {
    await pg.waitForSelector(selector, { timeout });
    const el = await pg.$(selector);
    if (el) {
      await el.click();
      return true;
    }
  } catch {
    // Probe for an optional control: absent within the timeout means false,
    // which every caller checks.
  }
  return false;
}

/**
 * Find a menu item by text pattern and click it.
 */
async function clickMenuItemByText(pg, pattern) {
  const items = await pg.$$('[role="menuitem"]');
  for (const item of items) {
    const text = await item.evaluate((el) => el.textContent);
    if (pattern.test(text)) {
      await item.click();
      return true;
    }
  }
  return false;
}

/**
 * Scroll-and-collect pattern using a Map for dedup.
 * @param {Object} pg - Puppeteer page
 * @param {Function} extractFn - page.evaluate callback returning [{key, ...data}]
 * @param {Object} opts
 */
async function scrollCollect(pg, extractFn, { limit = 100, maxRetries = 10 } = {}) {
  const collected = new Map();
  let retries = 0;

  while (collected.size < limit && retries < maxRetries) {
    const items = await pg.evaluate(extractFn);
    const prev = collected.size;
    items.forEach((item) => {
      if (item._key) {
        collected.set(item._key, item);
      }
    });
    if (collected.size === prev) retries++;
    else retries = 0;

    await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 3000);
  }

  return Array.from(collected.values())
    .map(({ _key, ...rest }) => rest)
    .slice(0, limit);
}

// ============================================================================
// 1. Auth
// ============================================================================

export async function x_login({ cookie }) {
  const { page: pg } = await ensureBrowser();
  await loginWithCookie(pg, cookie);
  // Setting a cookie proves nothing: a dead token lands on the login flow.
  // The profile tab in the side nav exists only for a signed-in session and
  // carries the handle, which the action ledger needs to charge the right
  // account from here on.
  const state = await pg.evaluate(() => ({
    url: location.href,
    profileHref: document.querySelector('a[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href') || '',
  }));
  const username = state.profileHref.replace(/^\//, '').split(/[/?#]/)[0] || null;
  if (!username && /\/(login|i\/flow)/.test(state.url)) {
    return { success: false, message: 'X rejected the session cookie (redirected to the login page)' };
  }
  return {
    success: true,
    username,
    message: username ? `Logged in as @${username}` : 'Session cookie set; the account handle could not be read from the page',
  };
}

// ============================================================================
// 2–7. Scraping — delegated to ../scrapers (single source of truth)
// ============================================================================

export async function x_get_profile({ username }) {
  return preferHttp(
    async () => {
      const scraper = await ensureHttpScraper();
      const profile = await scraper.getProfile(username);

      // A profile object with no id is X saying "nothing here" in a shape that
      // looks like success. Treat it as the failure it is so the browser
      // fallback gets a turn instead of the agent getting nulls.
      if (!profile?.id) throw new Error(`No profile data returned for @${username}`);

      return {
        name: profile.name,
        username: profile.username,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        joined: profile.joined,
        following: profile.followingCount,
        followers: profile.followersCount,
        tweets: profile.tweetCount,
        likes: profile.likesCount,
        listed: profile.listedCount,
        media: profile.mediaCount,
        avatar: profile.avatar,
        header: profile.banner,
        verified: profile.verified || profile.isBlueVerified,
        protected: profile.protected,
        pinnedTweetIds: profile.pinnedTweetIds,
        platform: 'twitter',
      };
    },
    async () => {
      const { page: pg } = await ensureBrowser();
      return scrapeProfile(pg, username);
    },
  );
}

export async function x_get_followers({ username, limit = 100 }) {
  const { page: pg } = await ensureBrowser();
  return scrapeFollowers(pg, username, { limit });
}

export async function x_get_following({ username, limit = 100 }) {
  const { page: pg } = await ensureBrowser();
  return scrapeFollowing(pg, username, { limit });
}

export async function x_get_non_followers({ username }) {
  const { page: pg } = await ensureBrowser();
  const followers = await scrapeFollowers(pg, username, { limit: 5000 });
  const following = await scrapeFollowing(pg, username, { limit: 5000 });

  const followerSet = new Set(followers.map((f) => f.username));
  const nonFollowers = following.filter((f) => !followerSet.has(f.username));

  return {
    nonFollowers: nonFollowers.map((f) => f.username),
    count: nonFollowers.length,
    totalFollowing: following.length,
    totalFollowers: followers.length,
  };
}

export async function x_get_tweets({ username, limit = 50 }) {
  return preferHttp(
    async () => {
      const scraper = await ensureHttpScraper();
      const tweets = [];
      for await (const tweet of scraper.getTweets(username, limit)) {
        tweets.push(tweet);
      }
      if (tweets.length === 0) throw new Error(`No tweets returned for @${username}`);
      return tweets;
    },
    async () => {
      const { page: pg } = await ensureBrowser();
      return scrapeTweets(pg, username, { limit });
    },
  );
}

export async function x_search_tweets({ query, limit = 50, filter = 'latest' }) {
  const { page: pg } = await ensureBrowser();
  return searchTweets(pg, query, { limit, filter });
}

// ============================================================================
// 7b. Thread / Best Time to Post
// ============================================================================

export async function x_get_thread({ url }) {
  const { page: pg } = await ensureBrowser();
  return scrapeThread(pg, url);
}

/**
 * Full text of an X long-form Article, in one GraphQL read and no browser.
 *
 * Uses the http layer's `scrapeArticle`, which asks `TweetResultByRestId` for
 * the article body (`withArticlePlainText`). A response carrying only the
 * preview is an error, not a short article.
 *
 * @param {{url: string}} args Article URL, status URL, or numeric id
 * @returns {Promise<object>}
 */
export async function x_get_article({ url }) {
  const [{ TwitterHttpClient }, { scrapeArticle }] = await Promise.all([
    import('../scrapers/twitter/http/client.js'),
    import('../scrapers/twitter/http/tweets.js'),
  ]);

  const authToken = process.env.XACTIONS_SESSION_COOKIE;
  const csrfToken = process.env.XACTIONS_CSRF_TOKEN;
  const cookies = authToken ? [`auth_token=${authToken}`, csrfToken && `ct0=${csrfToken}`].filter(Boolean).join('; ') : null;
  const client = new TwitterHttpClient(cookies ? { cookies } : {});

  const article = await scrapeArticle(client, url);
  if (!article.text) {
    throw new Error(`X returned only the preview of article ${article.id}, not its body. Set XACTIONS_SESSION_COOKIE and retry.`);
  }
  return article;
}

/**
 * Collect a profile and a timeline sample, then run the shared analyser.
 *
 * The HTTP client is used rather than the browser because X stopped serving
 * profile and timeline content to a logged-out browser: the DOM scrape came
 * back empty and the analysis was computed over nothing.
 *
 * @param {string} username
 * @param {number} limit
 * @returns {Promise<object>} A report from src/analysis/accountReport.js
 */
async function collectReport(username, limit) {
  const { buildAccountReport } = await import('../analysis/accountReport.js');
  const scraper = await ensureHttpScraper();

  const profile = await scraper.getProfile(username);
  if (!profile?.id) throw new Error(`No profile data returned for @${username}`);

  const tweets = [];
  for await (const tweet of scraper.getTweets(username, limit)) {
    tweets.push(tweet);
    if (tweets.length >= limit) break;
  }

  return buildAccountReport({ profile, tweets });
}

/**
 * Full account report: engagement, cadence, content mix, timing, top posts.
 *
 * Accepts one username or several. With several it also returns the
 * side-by-side comparison, so an agent asking "who is doing better" gets the
 * answer rather than four reports to reconcile itself.
 *
 * @param {{username: string|string[], limit?: number}} args
 * @returns {Promise<object>}
 */
export async function x_account_report({ username, limit = 50 }) {
  const names = (Array.isArray(username) ? username : [username]).map((n) => String(n).replace(/^@/, ''));
  const sample = Math.min(Math.max(parseInt(limit, 10) || 50, 5), 200);

  const reports = [];
  for (const name of names) {
    reports.push(await collectReport(name, sample));
  }

  if (reports.length === 1) return reports[0];

  const { compareReports } = await import('../analysis/accountReport.js');
  return { comparison: compareReports(reports), reports };
}

/**
 * Research a list of accounts before posting about them: what each is posting,
 * the figures they publish about themselves (with the post each came from),
 * their account statistics, who they tag, and which accounts several of them
 * mention that are not on the list. Shares its cache with `xactions brief`.
 *
 * @param {{usernames: string|string[], topic?: string, limit?: number, days?: number, recent?: number, format?: 'markdown'|'json', refresh?: boolean}} args
 * @returns {Promise<object>}
 */
export async function x_account_brief({ usernames, topic, limit = 60, days = 30, recent = 5, format = 'markdown', refresh = false }) {
  const { parseAccountList, renderBriefMarkdown } = await import('../analysis/accountBrief.js');
  const { runBrief, clampInt, DEFAULT_CACHE_HOURS, MIN_LIMIT, MAX_LIMIT } = await import('../analysis/briefSource.js');

  const rejected = [];
  const accounts = parseAccountList((Array.isArray(usernames) ? usernames : [usernames]).join('\n'), rejected);
  if (!accounts.length) throw new Error('No valid usernames given.');
  if (accounts.length > 25) throw new Error(`${accounts.length} accounts is more than one call should read; split the list into groups of 25 or fewer.`);

  const { ecosystem } = await runBrief({
    accounts,
    getScraper: ensureHttpScraper,
    topic,
    limit: clampInt(limit, 60, MIN_LIMIT, MAX_LIMIT),
    days: clampInt(days, 30, 1, 3650),
    recent: clampInt(recent, 5, 0, 50),
    cacheHours: refresh ? 0 : DEFAULT_CACHE_HOURS,
  });

  if (!ecosystem.accounts.length) {
    throw new Error(`Could not read any of the accounts: ${ecosystem.failures.map((f) => `@${f.username} (${f.error})`).join('; ')}`);
  }

  const skipped = rejected.map((token) => ({ username: token, error: 'not a valid X handle' }));
  if (format === 'json') return { ...ecosystem, failures: [...ecosystem.failures, ...skipped] };

  return {
    brief: renderBriefMarkdown(ecosystem),
    tagLine: ecosystem.tagLine,
    alsoTag: ecosystem.alsoTag.map((e) => e.username),
    failures: [...ecosystem.failures, ...skipped],
  };
}

/**
 * When an account's posts actually perform.
 *
 * Derived from the same report as `x_account_report` rather than recomputing
 * its own buckets, so the two tools can never disagree about the best hour.
 *
 * @param {{username: string, limit?: number}} args
 * @returns {Promise<object>}
 */
export async function x_best_time_to_post({ username, limit = 100 }) {
  const sample = Math.min(Math.max(parseInt(limit, 10) || 100, 5), 200);
  const report = await collectReport(String(username).replace(/^@/, ''), sample);

  const rank = (buckets, label) =>
    buckets
      .filter((b) => b.posts >= report.timing.minimumBucketSample)
      .sort((a, b) => b.medianEngagement - a.medianEngagement)
      .map((b) => ({ [label]: b.label ?? `${String(b.index).padStart(2, '0')}:00 UTC`, posts: b.posts, medianEngagement: b.medianEngagement }));

  const bestHours = rank(report.timing.byHourUTC, 'hour').slice(0, 5);
  const bestDays = rank(report.timing.byWeekday, 'day');

  return {
    username: report.identity.username,
    postsAnalyzed: report.meta.sampleSize,
    sampleSpanDays: report.meta.sampleSpanDays,
    minimumPostsPerBucket: report.timing.minimumBucketSample,
    bestHoursUTC: bestHours,
    bestDays,
    medianEngagementOverall: report.engagement.medianPerPost,
    recommendation: bestHours.length
      ? `Post around ${bestHours[0].hour} on ${bestDays[0]?.day || 'any day'}. Ranked by median engagement, not by post count, so a single lucky post cannot pick the winner.`
      : `Not enough data. No hour in the sample has the ${report.timing.minimumBucketSample} posts needed to rank it. Raise limit and try again.`,
  };
}

// ============================================================================
// 8–9. Follow / Unfollow
// ============================================================================

export async function x_follow({ username }) {
  const handle = String(username || '').trim().replace(/^@/, '');
  if (!handle) {
    return { success: false, status: FOLLOW_STATUS.FAILED, message: 'No username given' };
  }

  let pg;
  try {
    ({ page: pg } = await ensureBrowser());
  } catch (error) {
    return {
      success: false,
      status: FOLLOW_STATUS.BROWSER,
      message: `Could not start a browser: ${error.message}`,
      username: handle,
    };
  }

  const result = await performFollow(pg, handle);
  if (result.status === FOLLOW_STATUS.BROWSER) await closeBrowser();
  return result;
}

export async function x_unfollow({ username }) {
  const handle = String(username || '').trim().replace(/^@/, '');
  if (!handle) {
    return { success: false, status: FOLLOW_STATUS.FAILED, message: 'No username given' };
  }

  let pg;
  try {
    ({ page: pg } = await ensureBrowser());
  } catch (error) {
    return {
      success: false,
      status: FOLLOW_STATUS.BROWSER,
      message: `Could not start a browser: ${error.message}`,
      username: handle,
    };
  }

  const result = await performUnfollow(pg, handle);
  if (result.status === FOLLOW_STATUS.BROWSER) await closeBrowser();
  return result;
}

// ============================================================================
// 10–11. Bulk Operations
// ============================================================================

export async function x_unfollow_non_followers({ username, maxUnfollows = 100, dryRun = false }) {
  const result = await x_get_non_followers({ username });
  const toUnfollow = result.nonFollowers.slice(0, maxUnfollows);

  if (dryRun) {
    return { dryRun: true, wouldUnfollow: toUnfollow, count: toUnfollow.length };
  }

  const results = [];
  for (const user of toUnfollow) {
    const r = await x_unfollow({ username: user });
    results.push({ username: user, ...r });
    await sleep(2000); // Rate-limit protection
  }

  return {
    unfollowed: results.filter((r) => r.success).map((r) => r.username),
    failed: results.filter((r) => !r.success).map((r) => r.username),
    count: results.filter((r) => r.success).length,
  };
}

export async function x_detect_unfollowers({ username }) {
  const { page: pg } = await ensureBrowser();
  const followers = await scrapeFollowers(pg, username, { limit: 1000 });
  return {
    username,
    currentFollowers: followers.map((f) => f.username),
    count: followers.length,
    timestamp: new Date().toISOString(),
    note: 'Compare with previous snapshot to detect unfollowers',
  };
}

// ============================================================================
// 12–14. Post / Like / Retweet
// ============================================================================

/**
 * Shared failure messages for the compose-based tools, so each one says
 * which step X refused rather than a bare "could not post".
 */
const COMPOSE_FAIL = {
  open: 'Could not open the composer. Check that the MCP browser is logged in (xactions login).',
  typed: 'The text did not reach the composer, so nothing was posted.',
  button: 'The post button never became enabled, so nothing was posted.',
};

/**
 * Press post and wait for X to confirm it.
 *
 * @returns {Promise<{ ok: boolean, message?: string, confirmation?: object }>}
 */
async function postAndConfirm(pg, typed, { testids } = {}) {
  if (!(await clickPostButton(pg, testids ? { testids } : undefined))) {
    return { ok: false, message: COMPOSE_FAIL.button };
  }
  const confirmation = await confirmPosted(pg, { typed });
  if (!confirmation.ok) return { ok: false, message: confirmation.reason, confirmation };
  return { ok: true, confirmation };
}

// ============================================================================
// HTTP write-lane helpers — shared by every tool that accepts mediaPath
// ============================================================================

/**
 * Normalise a mediaPath arg (string | string[]) into 1-4 non-empty paths.
 * Throws on empty input or more than 4 paths — callers turn that into
 * { success: false } before any upload happens.
 */
export function validateMediaPaths(mediaPath) {
  const paths = (Array.isArray(mediaPath) ? mediaPath : [mediaPath])
    .filter((p) => typeof p === 'string' && p.length > 0);
  if (paths.length === 0 || paths.length > 4) {
    throw new Error('mediaPath accepts 1-4 file paths');
  }
  return paths;
}

/**
 * Authenticated HTTP client from the saved session cookie jar — the same
 * auth_token/ct0 pattern x_post_tweet established. Returns { client } or
 * { error } so callers can fail with a readable message.
 */
export async function httpClientFromSavedSession() {
  const session = await loadSavedSession();
  if (!session) {
    return {
      error: 'No saved session — run `xactions login` or export XACTIONS_SESSION_COOKIE to post media',
    };
  }
  const cookies = `auth_token=${session.authToken}${session.ct0 ? `; ct0=${session.ct0}` : ''}`;
  return { client: new TwitterHttpClient({ cookies, rateLimitStrategy: 'wait' }) };
}

/**
 * Upload every path in a mediaPath arg and return the media ids in order.
 * altText (optional) is applied to each upload of the call.
 */
export async function uploadMediaPaths(client, mediaPath, altText) {
  const paths = validateMediaPaths(mediaPath);
  const mediaIds = [];
  for (const filePath of paths) {
    const { mediaId } = await uploadMedia(client, filePath, altText ? { altText } : {});
    mediaIds.push(mediaId);
  }
  return mediaIds;
}

/**
 * Pull { id, url } out of a CreateTweet result — the result nests differently
 * depending on the mutation (post, reply, quote, thread entry).
 */
export function tweetPostedResult(result) {
  const id = result?.rest_id ?? result?.legacy?.id_str ?? result?.tweet?.rest_id ?? null;
  const user = result?.core?.user_results?.result;
  const handle = user?.core?.screen_name ?? user?.legacy?.screen_name;
  const url = id ? (handle ? `https://x.com/${handle}/status/${id}` : `https://x.com/i/web/status/${id}`) : null;
  return { id, url };
}

/**
 * Resolve the tweet id a reply/quote targets. Accepts a status URL
 * (x.com or twitter.com, with or without query string) or a raw tweetId —
 * the A2A registry sends the raw id.
 */
export function resolveTweetId({ url, tweetUrl, tweetId } = {}) {
  // Try each key in priority order: a status URL anywhere wins, then a bare
  // numeric id. A non-status `url` must not shadow a usable `tweetUrl`/`tweetId`.
  for (const raw of [url, tweetUrl, tweetId]) {
    if (raw === undefined || raw === null || raw === '') continue;
    const str = String(raw).trim();
    const fromUrl = str.match(/status\/(\d+)/)?.[1];
    if (fromUrl) return fromUrl;
    if (/^\d+$/.test(str)) return str;
  }
  return null;
}

export async function x_post_tweet({ text, mediaPath, altText }) {
  // With media, post through the HTTP lane: the Puppeteer composer never
  // attached files, and uploadMedia → CreateTweet mediaIds is the flow the
  // API processors already use. Text-only posts keep the browser lane.
  if (mediaPath !== undefined && mediaPath !== null) {
    try {
      validateMediaPaths(mediaPath);
    } catch (e) {
      return { success: false, message: e.message };
    }
    if (typeof text !== 'string' || !text.trim()) {
      return { success: false, message: 'text is required' };
    }
    const session = await httpClientFromSavedSession();
    if (session.error) return { success: false, message: session.error };
    try {
      const mediaIds = await uploadMediaPaths(session.client, mediaPath, altText);
      const result = await httpPostTweet(session.client, text, { mediaIds, premium: text.length > 280 });
      const { id, url } = tweetPostedResult(result);
      return {
        success: Boolean(id),
        tweetId: id,
        url,
        message: id ? 'Tweet posted successfully' : 'Tweet posted but X did not return an id',
      };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  const { page: pg } = await ensureBrowser();
  if (!(await openComposer(pg))) return { success: false, message: COMPOSE_FAIL.open };
  await randomDelay();

  if (!(await typeIntoComposer(pg, 0, text))) return { success: false, message: COMPOSE_FAIL.typed };
  await sleep(500);

  const posted = await postAndConfirm(pg, text);
  if (!posted.ok) return { success: false, message: posted.message };
  await randomDelay();
  return { success: true, message: 'Tweet posted', confirmedBy: posted.confirmation.via };
}

export async function x_like({ url }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, url, '[data-testid="like"], [data-testid="unlike"]');
  await randomDelay();

  if (await clickIfPresent(pg, '[data-testid="like"]')) {
    await randomDelay();
    return { success: true, message: 'Tweet liked' };
  }
  return { success: false, message: 'Could not like tweet' };
}

export async function x_retweet({ url }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, url, '[data-testid="retweet"], [data-testid="unretweet"]');
  await randomDelay();

  if (await clickIfPresent(pg, '[data-testid="retweet"]')) {
    await sleep(500);
    await clickIfPresent(pg, '[data-testid="retweetConfirm"]');
    await randomDelay();
    return { success: true, message: 'Retweeted' };
  }
  return { success: false, message: 'Could not retweet' };
}


// ============================================================================
// Engagement sweeps (profile / search / list)
// ============================================================================

/**
 * Sweep a feed: like, repost, and reply to its posts.
 *
 * The same engine the `xactions engage` CLI runs (src/engage/), so a sweep an
 * agent starts and a sweep a human starts behave identically, share the
 * `~/.xactions/engage/` progress files, and skip what the other already did.
 *
 * Replies come from `templates` or, when `prompt` is set, from an LLM given
 * that brief. This runs on the HTTP client, so any provider works: there is
 * no page CSP in the way as there is in the browser script.
 *
 * @param {object} args
 * @param {string} [args.username] - Profile to sweep
 * @param {string} [args.search] - Search query to sweep instead
 * @param {string} [args.list] - List ID to sweep instead
 * @param {boolean} [args.like=true]
 * @param {boolean} [args.repost=false]
 * @param {boolean} [args.comment=false]
 * @param {number} [args.limit=20]
 * @param {string} [args.prompt] - Brief for LLM-written replies
 * @param {string[]} [args.templates] - Reply templates ({author}, {name})
 * @param {boolean} [args.dryRun=true] - Defaults to a preview, on purpose
 * @returns {Promise<object>} Run report
 */
export async function x_engage(args = {}) {
  const {
    username, search, list, mode,
    like = true, repost = false, comment = false,
    limit = 20, includeReplies = false, includeReposts = false,
    since, onlyFrom = [], skipUsers = [], keywords = [], skipKeywords = [],
    minLikes = 0, maxLikes = 0,
    prompt, persona, provider, model, apiKey, baseUrl,
    templates = [], delaySeconds = 20, jitterSeconds = 10,
    reset = false, resume = true,
  } = args;
  // Missing or null is a preview; false, 0 or "" acts. The action-cap
  // resolver reads the same rule, so a live sweep is always charged.
  const dryRun = !isLiveRun(args.dryRun);

  const engage = await import('../engage/runner.js');
  const { createEngageState } = await import('../engage/state.js');

  const actions = { like: !!like, repost: !!repost, comment: !!comment };
  if (!actions.like && !actions.repost && !actions.comment) {
    throw new Error('x_engage: enable at least one of like, repost, comment');
  }

  const source = engage.resolveSource({ username, search, list, includeReplies, mode });
  const scraper = await ensureHttpScraper();

  let me = '';
  if (!dryRun) {
    const loggedIn = await scraper.isLoggedIn().catch(() => false);
    if (!loggedIn) {
      throw new Error('x_engage: not authenticated. Set XACTIONS_SESSION_COOKIE (auth_token) and XACTIONS_CSRF_TOKEN (ct0), or call with dryRun: true to preview.');
    }
    me = await scraper.me().then((p) => p?.username || '').catch(() => '');
  }

  let generator = null;
  if (actions.comment) {
    if (prompt) {
      const { createCommentGenerator } = await import('../ai/commentGenerator.js');
      generator = createCommentGenerator({ prompt, persona, provider, model, apiKey, baseUrl });
    } else if (templates.length === 0) {
      throw new Error('x_engage: comment needs either a prompt (LLM) or at least one template');
    }
  }

  const state = await createEngageState({
    stateKey: source.stateKey,
    enabled: resume !== false,
    reset: !!reset,
  });

  const filters = {
    actions,
    includeReplies: !!includeReplies,
    includeReposts: !!includeReposts,
    since: since ? new Date(since) : null,
    done: state.done,
    onlyFrom, skipUsers, keywords, skipKeywords,
    minLikes: Number(minLikes) || 0,
    maxLikes: Number(maxLikes) || 0,
    self: me,
  };

  const cappedLimit = Math.max(1, Math.min(Number(limit) || 20, 200));
  const { fetched, selected, skipped } = await engage.collectTweets(scraper, source, filters, cappedLimit);

  if (fetched.length === 0) {
    throw new Error(`x_engage: X returned no posts for ${source.label}. Check the target, or authenticate if it is a protected or search feed.`);
  }

  if (selected.length === 0) {
    const reasons = {};
    for (const s of skipped) reasons[s.why] = (reasons[s.why] || 0) + 1;
    return {
      source: source.label,
      kind: source.kind,
      dryRun: !!dryRun,
      processed: 0,
      message: 'Every post was filtered out. Nothing was engaged.',
      skippedReasons: reasons,
      priorRuns: state.priorCount,
    };
  }

  const report = await engage.runEngage({
    scraper,
    source,
    tweets: selected,
    actions,
    done: state.done,
    templates,
    generator,
    dryRun: !!dryRun,
    delay: Number(delaySeconds) || 0,
    jitter: Number(jitterSeconds) || 0,
    onProgressSaved: state.save,
  });

  return {
    ...report,
    read: fetched.length,
    skipped: skipped.length,
    priorRuns: state.priorCount,
    stateFile: state.file,
    commentSource: generator ? `ai:${generator.target.provider}/${generator.target.model}` : (actions.comment ? 'templates' : null),
    note: dryRun ? 'Dry run: nothing was posted. Call again with dryRun: false to act.' : undefined,
  };
}

// ============================================================================
// 15. Download Video
// ============================================================================

export async function x_download_video({ tweetUrl }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, tweetUrl, 'article[data-testid="tweet"]');
  // The player mounts after the post itself; give it a moment, but a post
  // with no video is answered below, not here.
  await pg.waitForSelector('article[data-testid="tweet"] video', { timeout: 5000 }).catch(() => {});
  await randomDelay();

  const videoUrls = await pg.evaluate(() => {
    const videos = [];
    const html = document.documentElement.innerHTML;
    const patterns = [
      /https:\/\/video\.twimg\.com\/[^"'\s]+\.mp4[^"'\s]*/g,
      /https:\/\/[^"'\s]*\/amplify_video[^"'\s]*\.mp4[^"'\s]*/g,
      /https:\/\/[^"'\s]*\/ext_tw_video[^"'\s]*\.mp4[^"'\s]*/g,
    ];

    patterns.forEach((pattern) => {
      (html.match(pattern) || []).forEach((url) => {
        let clean = url
          .replace(/\\u002F/g, '/')
          .replace(/\\/g, '')
          .split('"')[0]
          .split("'")[0];
        if (clean.includes('.mp4')) {
          const quality = clean.match(/\/(\d+x\d+)\//)?.[1] || 'unknown';
          videos.push({ url: clean, quality });
        }
      });
    });

    const seen = new Set();
    return videos.filter((v) => {
      const key = v.url.split('?')[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  if (!videoUrls.length) {
    return { success: false, message: 'No video found in tweet' };
  }

  videoUrls.sort((a, b) => {
    const res = (q) => parseInt(q.match(/(\d+)x(\d+)/)?.[2] || '0');
    return res(b.quality) - res(a.quality);
  });

  return {
    success: true,
    videos: videoUrls,
    bestQuality: videoUrls[0],
    message: `Found ${videoUrls.length} video(s)`,
  };
}

// ============================================================================
// 16. Profile Management
// ============================================================================

export async function x_update_profile({ name, bio, location, website }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, 'https://x.com/settings/profile', '[data-testid="editProfileButton"], input[name="displayName"]');
  await randomDelay();

  // If redirected to the profile page, open the edit dialog
  const editBtn = await pg.$('[data-testid="editProfileButton"]');
  if (editBtn) {
    await editBtn.click();
    await sleep(1500);
  }

  const fillField = async (selector, value) => {
    if (value === undefined) return;
    const el = await pg.$(selector);
    if (el) {
      await el.click({ clickCount: 3 });
      await el.type(value, { delay: 30 });
    }
  };

  await fillField('input[name="displayName"]', name);
  await fillField('textarea[name="description"]', bio);
  await fillField('input[name="location"]', location);
  await fillField('input[name="url"]', website);

  if (await clickIfPresent(pg, '[data-testid="Profile_Save_Button"]')) {
    await randomDelay();
    return { success: true, message: 'Profile updated' };
  }
  return { success: false, message: 'Could not save profile changes' };
}

// ============================================================================
// 17–20. Posting & Content
// ============================================================================

export async function x_post_thread({ tweets, altText }) {
  if (!tweets || tweets.length < 2) {
    return { success: false, message: 'Thread requires at least 2 tweets' };
  }

  // Items may be plain strings or { text, mediaPath?, altText? } objects.
  // mediaPath on ANY item (or any object item) flips the whole thread to the
  // HTTP lane — the browser composer cannot attach files.
  const useHttp = tweets.some((t) => t !== null && typeof t === 'object');

  if (useHttp) {
    const items = tweets.map((t) =>
      typeof t === 'string' ? { text: t } : { text: t?.text, mediaPath: t?.mediaPath, altText: t?.altText },
    );
    for (const item of items) {
      if (typeof item.text !== 'string' || !item.text.trim()) {
        return { success: false, message: 'Each thread tweet requires non-empty text' };
      }
      if (item.mediaPath !== undefined && item.mediaPath !== null) {
        try {
          validateMediaPaths(item.mediaPath);
        } catch (e) {
          return { success: false, message: e.message };
        }
      }
    }

    const session = await httpClientFromSavedSession();
    if (session.error) return { success: false, message: session.error };
    try {
      const threadTweets = [];
      for (const item of items) {
        const mediaIds =
          item.mediaPath !== undefined && item.mediaPath !== null
            ? await uploadMediaPaths(session.client, item.mediaPath, item.altText ?? altText)
            : [];
        threadTweets.push({ text: item.text, mediaIds });
      }
      const results = await httpPostThread(session.client, threadTweets, {
        premium: items.some((i) => i.text.length > 280),
      });
      const parsed = results.map((r) => tweetPostedResult(r));
      const tweetIds = parsed.map((p) => p.id);
      const url = parsed[0]?.url;
      return {
        success: parsed.every((p) => p.id),
        tweetIds,
        url,
        message: `Thread posted (${tweetIds.length} tweets)`,
      };
    } catch (e) {
      // postThread still rejects, but carries the confirmed prefix
      // (partialResults) and the stop position (failedIndex) — surface them
      // so the caller can resume instead of re-posting tweets already live.
      const partial = Array.isArray(e?.partialResults) ? e.partialResults : [];
      const confirmed = partial.map((r) => tweetPostedResult(r)).filter((p) => p.id);
      return {
        success: false,
        message: `post ${(e?.failedIndex ?? confirmed.length) + 1} failed: ${e.message}`,
        tweetIds: confirmed.map((p) => p.id),
        url: confirmed[0]?.url ?? null,
        postedCount: confirmed.length,
        totalCount: items.length,
        stoppedAt: typeof e?.failedIndex === 'number' ? e.failedIndex : null,
      };
    }
  }

  const { page: pg } = await ensureBrowser();
  if (!(await openComposer(pg))) return { success: false, message: COMPOSE_FAIL.open };
  await randomDelay();

  if (!(await typeIntoComposer(pg, 0, tweets[0], { delay: 40 }))) {
    return { success: false, message: COMPOSE_FAIL.typed };
  }
  await sleep(500);

  for (let i = 1; i < tweets.length; i++) {
    // "Add another post" opens the next editor. A thread missing a post must
    // not go out, so a box that never takes its text stops the whole thread.
    await clickIfPresent(pg, '[role="dialog"] [data-testid="addButton"], [data-testid="addButton"]');
    await sleep(500);
    if (!(await typeIntoComposer(pg, i, tweets[i], { delay: 40 }))) {
      return { success: false, message: `Post ${i + 1} of the thread did not reach the composer, so nothing was posted.` };
    }
    await sleep(300);
  }

  const posted = await postAndConfirm(pg, tweets[0]);
  if (!posted.ok) return { success: false, message: posted.message };
  await randomDelay();
  return { success: true, message: `Thread posted (${tweets.length} tweets)`, confirmedBy: posted.confirmation.via };
}

export async function x_create_poll({ question, options, durationMinutes = 1440 }) {
  if (!options || options.length < 2 || options.length > 4) {
    return { success: false, message: 'Polls require 2–4 options' };
  }

  const minutes = Math.round(Number(durationMinutes));
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 7 * 24 * 60) {
    return { success: false, message: 'Poll duration must be between 5 minutes and 7 days' };
  }

  const { page: pg } = await ensureBrowser();
  if (!(await openComposer(pg))) return { success: false, message: COMPOSE_FAIL.open };
  await randomDelay();

  if (!(await typeIntoComposer(pg, 0, question, { delay: 40 }))) {
    return { success: false, message: COMPOSE_FAIL.typed };
  }
  await sleep(500);

  // Open poll UI. The aria-label and testid variants are the ones the
  // repo's console poll scripts use.
  const pollBtn = await pg.$('[aria-label="Add poll"], [data-testid="pollButton"], [data-testid="createPoll"]');
  if (!pollBtn) return { success: false, message: 'Poll button not found (may require Premium)' };
  await pollBtn.click();
  await sleep(1000);

  // Fill poll options (3rd/4th may need "+ Add" click first). Option inputs
  // are native <input>s, so ElementHandle.type() reaches React for these.
  for (let i = 0; i < options.length; i++) {
    if (i >= 2) {
      await clickIfPresent(pg, '[data-testid="addPollOption"], [data-testid="addPollOptionButton"], [aria-label="Add a choice"]');
      await sleep(300);
    }
    const input = await pg.$(
      `[data-testid="pollOption${i + 1}"], [data-testid="pollOption_${i}"], [data-testid="pollOptionTextInput_${i}"]`
    );
    if (!input) {
      return { success: false, message: `Poll choice ${i + 1} was not found, so nothing was posted.` };
    }
    await input.type(options[i], { delay: 30 });
    await sleep(200);
  }

  // X's picker defaults to one day; anything else has to be set, and a poll
  // must not go out with a length the caller did not ask for.
  if (minutes !== 1440) {
    const { failed } = await setDialogSelects(pg, pollDurationValues(minutes));
    if (failed.length) {
      return { success: false, message: `Could not set the poll length (${failed.join(', ')}), so nothing was posted.` };
    }
    await sleep(400);
  }

  const posted = await postAndConfirm(pg, question);
  if (!posted.ok) return { success: false, message: posted.message };
  await randomDelay();
  return {
    success: true,
    message: `Poll posted with ${options.length} options`,
    durationMinutes: minutes,
    confirmedBy: posted.confirmation.via,
  };
}

export async function x_schedule_post({ text, scheduledAt, scheduledTime, mediaPath, altText }) {
  // A2A callers send scheduledTime; the MCP schema uses scheduledAt — accept both.
  const scheduledFor = scheduledAt ?? scheduledTime;
  const when = scheduledFor instanceof Date ? scheduledFor : new Date(scheduledFor);
  if (Number.isNaN(when.getTime())) {
    return { success: false, message: `scheduledAt is not a valid date/time: "${scheduledFor}"` };
  }
  if (when.getTime() <= Date.now()) {
    return { success: false, message: 'scheduledAt is in the past; pick a future date/time' };
  }

  // With media, schedule through the HTTP lane (CreateScheduledTweet): it
  // sends an explicit execute_at with media_ids and returns a
  // scheduledTweetId the caller can verify. The browser dialog has no
  // file-attach step.
  if (mediaPath !== undefined && mediaPath !== null) {
    if (typeof text !== 'string' || !text.trim()) {
      return { success: false, message: 'text is required' };
    }
    try {
      validateMediaPaths(mediaPath);
    } catch (e) {
      return { success: false, message: e.message };
    }
    const session = await httpClientFromSavedSession();
    if (session.error) return { success: false, message: session.error };
    try {
      const mediaIds = await uploadMediaPaths(session.client, mediaPath, altText);
      const { scheduledTweetId } = await httpSchedulePost(session.client, text, when, {
        mediaIds,
        premium: text.length > 280,
      });
      return {
        success: Boolean(scheduledTweetId),
        scheduledTweetId,
        scheduledAt: when.toISOString(),
        message: scheduledTweetId
          ? `Tweet scheduled for ${when.toISOString()}`
          : 'Tweet scheduled but X did not return an id',
      };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  const { page: pg } = await ensureBrowser();
  if (!(await openComposer(pg))) return { success: false, message: COMPOSE_FAIL.open };
  await randomDelay();

  if (!(await typeIntoComposer(pg, 0, text, { delay: 40 }))) {
    return { success: false, message: COMPOSE_FAIL.typed };
  }
  await sleep(500);

  // `scheduleOption` is the testid the repo's schedule scripts use;
  // `scheduleButton` is the one this tool used before.
  const schedBtn = await pg.$('[data-testid="scheduleOption"], [data-testid="scheduleButton"]');
  if (!schedBtn) return { success: false, message: 'Schedule button not found (requires Premium)' };
  await schedBtn.click();
  await sleep(1000);

  // Set the date and time. Without this the dialog's default time was
  // confirmed and the tool still reported the time it had been asked for.
  const { found, failed } = await setDialogSelects(pg, scheduleSelectValues(when));
  if (!found || failed.length) {
    return {
      success: false,
      message: found
        ? `Could not set ${failed.join(', ')} in the schedule dialog, so nothing was scheduled.`
        : 'The schedule dialog did not open, so nothing was scheduled.',
    };
  }
  await sleep(500);

  if (!(await clickIfPresent(pg, '[data-testid="scheduledConfirmationPrimaryAction"]'))) {
    return { success: false, message: 'Could not confirm the schedule dialog, so nothing was scheduled.' };
  }
  await sleep(500);

  // The post button now reads "Schedule"; X confirms with a toast.
  const posted = await postAndConfirm(pg, text);
  if (!posted.ok) return { success: false, message: posted.message };
  await randomDelay();
  return {
    success: true,
    message: `Tweet scheduled for ${when.toString()}`,
    scheduledAt: when.toISOString(),
    confirmedBy: posted.confirmation.via,
  };
}

export async function x_delete_tweet({ url }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, url, '[data-testid="caret"]');
  await randomDelay();

  // Open the caret "⋯" menu on the tweet
  if (await clickIfPresent(pg, '[data-testid="caret"]')) {
    await sleep(500);
    // Click "Delete" from dropdown
    if (await clickMenuItemByText(pg, /delete/i)) {
      await sleep(500);
      if (await clickIfPresent(pg, '[data-testid="confirmationSheetConfirm"]')) {
        await randomDelay();
        return { success: true, message: 'Tweet deleted' };
      }
    }
  }
  return { success: false, message: 'Could not delete tweet (you may not own this tweet)' };
}

// ============================================================================
// 21–25. Engagement
// ============================================================================

export async function x_reply({ url, tweetUrl, tweetId, text, mediaPath, altText }) {
  // With media, reply through the HTTP lane (CreateTweet reply + mediaIds);
  // the browser path below has no file-attach step.
  if (mediaPath !== undefined && mediaPath !== null) {
    const targetId = resolveTweetId({ url, tweetUrl, tweetId });
    if (!targetId) {
      return { success: false, message: 'url or tweetId of the tweet to reply to is required' };
    }
    if (typeof text !== 'string' || !text.trim()) {
      return { success: false, message: 'text is required' };
    }
    try {
      validateMediaPaths(mediaPath);
    } catch (e) {
      return { success: false, message: e.message };
    }
    const session = await httpClientFromSavedSession();
    if (session.error) return { success: false, message: session.error };
    try {
      const mediaIds = await uploadMediaPaths(session.client, mediaPath, altText);
      const result = await httpReplyToTweet(session.client, targetId, text, {
        mediaIds,
        premium: text.length > 280,
      });
      const { id, url: postUrl } = tweetPostedResult(result);
      return {
        success: Boolean(id),
        tweetId: id,
        url: postUrl,
        inReplyTo: targetId,
        message: id ? 'Reply posted' : 'Reply posted but X did not return an id',
      };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  // Same target rule as the HTTP lane: resolve a status id from
  // url/tweetUrl/tweetId before navigating — a non-status url cannot shadow
  // a usable tweetId.
  const targetId = resolveTweetId({ url, tweetUrl, tweetId });
  if (!targetId) {
    return { success: false, message: 'url or tweetId of the tweet to reply to is required' };
  }
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, `https://x.com/i/status/${targetId}`, '[data-testid="tweetTextarea_0"]');
  await randomDelay();

  // The inline reply box is the same contenteditable editor as the compose
  // dialog, so it takes the same click-then-keyboard input.
  if (!(await typeIntoComposer(pg, 0, text, { delay: 50 }))) {
    return { success: false, message: 'Could not reply to tweet: the reply box did not take the text' };
  }
  await sleep(500);

  // Inline button first, then the dialog's.
  const posted = await postAndConfirm(pg, text, { testids: ['tweetButtonInline', 'tweetButton'] });
  if (!posted.ok) return { success: false, message: `Could not reply to tweet: ${posted.message}` };
  await randomDelay();
  return { success: true, message: 'Reply posted', confirmedBy: posted.confirmation.via };
}

/**
 * Media-capable quote tweet. Called by x_quote_tweet when mediaPath is set —
 * the Puppeteer quote path has no file-attach step, so media args route
 * through the HTTP lane instead.
 */
export async function quoteTweetWithMedia({ url, tweetUrl, tweetId, text, mediaPath, altText }) {
  const targetId = resolveTweetId({ url, tweetUrl, tweetId });
  if (!targetId) {
    return { success: false, message: 'tweetUrl or tweetId of the tweet to quote is required' };
  }
  if (typeof text !== 'string' || !text.trim()) {
    return { success: false, message: 'text is required' };
  }
  try {
    validateMediaPaths(mediaPath);
  } catch (e) {
    return { success: false, message: e.message };
  }
  const session = await httpClientFromSavedSession();
  if (session.error) return { success: false, message: session.error };
  try {
    const mediaIds = await uploadMediaPaths(session.client, mediaPath, altText);
    const result = await httpQuoteTweet(session.client, targetId, text, {
      mediaIds,
      premium: text.length > 280,
    });
    const { id, url: postUrl } = tweetPostedResult(result);
    return {
      success: Boolean(id),
      tweetId: id,
      url: postUrl,
      quoteOf: targetId,
      message: id ? 'Quote tweet posted' : 'Quote tweet posted but X did not return an id',
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Quote tweet. Registered in toolMap so MCP local dispatch, the A2A bridge
 * and executeXeepyTool all share this one handler. mediaPath goes through
 * the HTTP lane; text-only quotes use the browser composer.
 */
export async function x_quote_tweet({ url, tweetUrl, tweetId, text, mediaPath, altText }) {
  if (mediaPath !== undefined && mediaPath !== null) {
    return quoteTweetWithMedia({ url, tweetUrl, tweetId, text, mediaPath, altText });
  }

  if (typeof text !== 'string' || !text.trim()) {
    return { success: false, message: 'text is required' };
  }
  // Same target rule as the HTTP lane: resolve a status id from
  // url/tweetUrl/tweetId before navigating — never goto(undefined), and a
  // non-status url cannot shadow a usable tweetId.
  const targetId = resolveTweetId({ url, tweetUrl, tweetId });
  if (!targetId) {
    return { success: false, message: 'url or tweetId of the tweet to quote is required' };
  }
  const quoteUrl = `https://x.com/i/status/${targetId}`;

  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, quoteUrl, '[data-testid="retweet"]');
  const retweetButton = await pg.$('[data-testid="retweet"]');
  if (!retweetButton) {
    return { success: false, message: 'The repost button was not on the post', quoteOf: targetId };
  }
  await retweetButton.click();
  await sleep(1000);
  const quoteOption = await pg.$('text/Quote');
  if (!quoteOption) {
    return { success: false, message: 'The Quote option was not in the repost menu', quoteOf: targetId };
  }
  await quoteOption.click();
  await sleep(1500);

  if (!(await typeIntoComposer(pg, 0, text))) {
    return { success: false, message: 'The quote text did not reach the composer, so nothing was posted', quoteOf: targetId };
  }
  await sleep(500);
  const posted = await postAndConfirm(pg, text);
  if (!posted.ok) return { success: false, message: posted.message, quoteOf: targetId };
  await randomDelay();
  return { success: true, quoteOf: targetId, quotedUrl: quoteUrl, text, confirmedBy: posted.confirmation.via };
}

export async function x_bookmark({ url }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, url, '[data-testid="bookmark"], [data-testid="removeBookmark"]');
  await randomDelay();

  if (await clickIfPresent(pg, '[data-testid="bookmark"]')) {
    await randomDelay();
    return { success: true, message: 'Tweet bookmarked' };
  }
  return { success: false, message: 'Could not bookmark tweet' };
}

export async function x_get_bookmarks({ limit = 100 }) {
  const { page: pg } = await ensureBrowser();
  return scrapeBookmarks(pg, { limit });
}

export async function x_clear_bookmarks() {
  const { page: pg } = await ensureBrowser();
  // X dropped the "Clear all bookmarks" menu item, so each bookmark is
  // removed through its own button; see src/mcp/clearBookmarks.js.
  return clearBookmarksOneByOne(pg);
}

export async function x_auto_like({ keywords = [], maxLikes = 20 }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, 'https://x.com/home', 'article[data-testid="tweet"]');
  await randomDelay();

  let liked = 0;
  const maxScrolls = maxLikes * 2;

  for (let scroll = 0; scroll < maxScrolls && liked < maxLikes; scroll++) {
    const tweets = await pg.$$('article[data-testid="tweet"]');

    for (const tweet of tweets) {
      if (liked >= maxLikes) break;

      const text = await tweet
        .$eval('[data-testid="tweetText"]', (el) => el.textContent)
        .catch(() => '');
      const matches =
        keywords.length === 0 ||
        keywords.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));

      if (matches) {
        const likeBtn = await tweet.$('[data-testid="like"]');
        if (likeBtn) {
          await likeBtn.click();
          liked++;
          await randomDelay();
        }
      }
    }
    await pg.evaluate(() => window.scrollBy(0, window.innerHeight));
    await sleep(1500);
  }
  return { success: true, liked, message: `Liked ${liked} tweets` };
}

// ============================================================================
// 26–27. Discovery
// ============================================================================

export async function x_get_trends({ category, limit = 30 }) {
  const { page: pg } = await ensureBrowser();
  return scrapeTrending(pg, { category: category || 'trending', limit });
}

export async function x_get_explore({ category, limit = 30 }) {
  const { page: pg } = await ensureBrowser();
  // Explore and trending share the same underlying page data
  return scrapeTrending(pg, { category: category || 'trending', limit });
}

export async function x_get_home_timeline({ timeline = 'for_you', limit = 25 }) {
  const { page: pg } = await ensureBrowser();

  const normalizedTimeline = timeline === 'following' ? 'following' : 'for_you';
  const targetLabel = normalizedTimeline === 'following' ? 'Following' : 'For you';

  await gotoAndRender(pg, 'https://x.com/home', 'article[data-testid="tweet"]');
  await randomDelay(2000, 3000);

  await pg.evaluate(async (label) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const tabs = Array.from(document.querySelectorAll('[data-testid="ScrollSnap-List"] a, [role="tab"]'));
    const wanted = tabs.find((tab) => (tab.textContent || '').trim().toLowerCase().includes(label.toLowerCase()));
    if (wanted && wanted.getAttribute('aria-selected') !== 'true') {
      wanted.click();
      await sleep(2000);
    }
  }, targetLabel);

  const posts = new Map();
  let emptyScrolls = 0;

  while (posts.size < limit && emptyScrolls < 5) {
    const batch = await pg.evaluate(() => {
      const parseMetric = (value) => {
        if (!value) return 0;
        const cleaned = String(value).replace(/,/g, '').trim();
        const match = cleaned.match(/([\d.]+)\s*([KMB]?)/i);
        if (!match) return 0;
        const num = parseFloat(match[1]);
        const suffix = (match[2] || '').toUpperCase();
        const mult = suffix === 'K' ? 1e3 : suffix === 'M' ? 1e6 : suffix === 'B' ? 1e9 : 1;
        return Math.round(num * mult);
      };

      return Array.from(document.querySelectorAll('article[data-testid="tweet"]')).map((tweet) => {
        const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || '';
        const timeEl = tweet.querySelector('time');
        const statusLink = tweet.querySelector('a[href*="/status/"]');
        const userLinks = Array.from(tweet.querySelectorAll('[data-testid="User-Name"] a[href^="/"]'));

        let username = '';
        let displayName = '';
        for (const link of userLinks) {
          const href = link.getAttribute('href') || '';
          if (!href.startsWith('/') || href.includes('/status/')) continue;
          if (!username) username = href.replace(/^\//, '');
          if (!displayName) displayName = link.textContent?.trim() || '';
        }

        const replyAria = tweet.querySelector('[data-testid="reply"]')?.getAttribute('aria-label') || '';
        const retweetAria = tweet.querySelector('[data-testid="retweet"]')?.getAttribute('aria-label') || '';
        const likeAria = tweet.querySelector('[data-testid="like"], [data-testid="unlike"]')?.getAttribute('aria-label') || '';
        const viewText = tweet.querySelector('[data-testid="app-text-transition-container"]')?.textContent?.trim() || '';
        const quotedText = Array.from(tweet.querySelectorAll('[data-testid="tweetText"]')).slice(1).map((el) => el.textContent?.trim()).filter(Boolean);

        return {
          id: statusLink?.getAttribute('href') || `${username}:${text.slice(0, 80)}`,
          username,
          displayName,
          text,
          timestamp: timeEl?.getAttribute('datetime') || '',
          url: statusLink ? `https://x.com${statusLink.getAttribute('href')}` : '',
          replies: parseMetric(replyAria),
          retweets: parseMetric(retweetAria),
          likes: parseMetric(likeAria),
          views: parseMetric(viewText),
          quotedText,
          isRepost: !!tweet.querySelector('[data-testid="socialContext"]'),
        };
      }).filter((item) => item.id && item.text);
    });

    const before = posts.size;
    for (const item of batch) {
      if (!posts.has(item.id)) posts.set(item.id, item);
      if (posts.size >= limit) break;
    }

    emptyScrolls = posts.size === before ? emptyScrolls + 1 : 0;
    if (posts.size >= limit) break;

    await pg.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
    await sleep(1800);
  }

  return {
    timeline: normalizedTimeline,
    count: Math.min(posts.size, limit),
    posts: Array.from(posts.values()).slice(0, limit),
  };
}

// ============================================================================
// 28–30. Notifications & Muting
// ============================================================================

export async function x_get_notifications({ limit = 100, filter = 'all' }) {
  const { page: pg } = await ensureBrowser();
  const tab = filter === 'mentions' ? 'mentions' : 'all';
  return scrapeNotifications(pg, { limit, tab });
}

export async function x_mute_user({ username }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, `https://x.com/${username}`, '[data-testid="userActions"]');
  await randomDelay();

  if (await clickIfPresent(pg, '[data-testid="userActions"]')) {
    await sleep(500);
    if (await clickMenuItemByText(pg, /^mute @/i)) {
      await randomDelay();
      return { success: true, message: `Muted @${username}` };
    }
  }
  return { success: false, message: `Could not mute @${username}` };
}

export async function x_unmute_user({ username }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, `https://x.com/${username}`, '[data-testid="userActions"]');
  await randomDelay();

  if (await clickIfPresent(pg, '[data-testid="userActions"]')) {
    await sleep(500);
    if (await clickMenuItemByText(pg, /^unmute @/i)) {
      await randomDelay();
      return { success: true, message: `Unmuted @${username}` };
    }
  }
  return { success: false, message: `Could not unmute @${username}` };
}

// ============================================================================
// 31–33. Direct Messages
// ============================================================================

export async function x_send_dm({ username, message }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, 'https://x.com/messages', '[data-testid="NewDM_Button"]');
  await randomDelay();

  // Start new conversation
  if (await clickIfPresent(pg, '[data-testid="NewDM_Button"]')) {
    await sleep(1000);
    const search = await pg.$('[data-testid="searchPeople"]');
    if (search) {
      await search.type(username, { delay: 50 });
      await sleep(1500);

      if (await clickIfPresent(pg, '[data-testid="TypeaheadUser"]')) {
        await sleep(500);
        if (await clickIfPresent(pg, '[data-testid="nextButton"]')) {
          await sleep(1000);

          const msgBox = await pg.$('[data-testid="dmComposerTextInput"]');
          if (msgBox) {
            await msgBox.type(message, { delay: 40 });
            await sleep(300);
            if (await clickIfPresent(pg, '[data-testid="dmComposerSendButton"]')) {
              await randomDelay();
              return { success: true, message: `DM sent to @${username}` };
            }
          }
        }
      }
    }
  }
  return { success: false, message: `Could not send DM to @${username}` };
}

export async function x_get_conversations({ limit = 20 }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, 'https://x.com/messages', '[data-testid="conversation"]');
  await randomDelay(2000, 3000);

  const conversations = await pg.evaluate((max) => {
    const els = document.querySelectorAll('[data-testid="conversation"]');
    return Array.from(els)
      .slice(0, max)
      .map((el) => {
        const nameEl = el.querySelector('[dir="ltr"] > span');
        const previewEl = el.querySelector('[dir="auto"]');
        const timeEl = el.querySelector('time');
        return {
          name: nameEl?.textContent || null,
          preview: previewEl?.textContent || null,
          time: timeEl?.getAttribute('datetime') || null,
        };
      });
  }, limit);

  return conversations;
}

export async function x_export_dms({ limit = 100 }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, 'https://x.com/messages', '[data-testid="conversation"]');
  await randomDelay(2000, 3000);

  const convos = await x_get_conversations({ limit: 10 });
  const allMessages = [];
  const convEls = await pg.$$('[data-testid="conversation"]');
  const toProcess = Math.min(convEls.length, Math.ceil(limit / 10));

  for (let i = 0; i < toProcess; i++) {
    // Re-query because DOM may have changed after navigation
    const currentConvEls = await pg.$$('[data-testid="conversation"]');
    if (!currentConvEls[i]) break;
    await currentConvEls[i].click();
    await sleep(2000);

    const messages = await pg.evaluate(() => {
      const msgEls = document.querySelectorAll('[data-testid="messageEntry"]');
      return Array.from(msgEls).map((msg) => {
        const text =
          msg.querySelector('[data-testid="tweetText"]')?.textContent ||
          msg.innerText?.slice(0, 500);
        const time = msg.querySelector('time')?.getAttribute('datetime');
        return { text, time };
      });
    });

    allMessages.push({
      conversation: convos[i]?.name || `Conversation ${i + 1}`,
      messages,
    });

    await clickIfPresent(pg, '[data-testid="app-bar-back"]');
    await sleep(1000);
  }

  return {
    conversations: allMessages,
    total: allMessages.reduce((sum, c) => sum + c.messages.length, 0),
  };
}

// ============================================================================
// 34–35. Grok AI
// ============================================================================

export async function x_grok_query({ query, mode = 'default' }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, 'https://x.com/i/grok', '[data-testid="grokTextArea"], textarea, [contenteditable="true"]');
  await randomDelay(2000, 3000);

  // Find input
  const input = await pg.$(
    '[data-testid="grokTextArea"], textarea, [contenteditable="true"]'
  );
  if (!input) {
    return { success: false, message: 'Grok interface not found (requires Premium)' };
  }

  await input.type(query, { delay: 40 });
  await sleep(500);

  // Select mode if not default
  if (mode !== 'default') {
    const modeMap = { deepsearch: 'DeepSearch', think: 'Think' };
    const target = modeMap[mode];
    if (target) {
      const modeBtn = await pg.$(`[data-testid="grok${target}Button"]`);
      if (modeBtn) await modeBtn.click();
      await sleep(500);
    }
  }

  // Submit
  const sendBtn = await pg.$(
    '[data-testid="grokSendButton"], button[type="submit"]'
  );
  if (sendBtn) {
    await sendBtn.click();
    // Wait for response — longer for DeepSearch
    await sleep(mode === 'deepsearch' ? 15000 : 5000);

    const response = await pg.evaluate(() => {
      const blocks = document.querySelectorAll(
        '[data-testid="grokResponse"], [class*="response"]'
      );
      const last = blocks[blocks.length - 1];
      return last?.textContent || null;
    });

    if (response) {
      return { success: true, response, mode };
    }
  }
  return { success: false, message: 'Could not get Grok response' };
}

export async function x_grok_summarize({ topic }) {
  return x_grok_query({
    query: `Summarize what people on X/Twitter are saying about: ${topic}`,
    mode: 'default',
  });
}

// ============================================================================
// 36–37. Lists
// ============================================================================

export async function x_get_lists({ limit = 50 }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, 'https://x.com/i/lists', 'a[href*="/i/lists/"]');
  await randomDelay();

  const lists = await pg.evaluate((max) => {
    const els = document.querySelectorAll('a[href*="/i/lists/"]');
    return Array.from(els)
      .slice(0, max)
      .map((el) => {
        const nameEl = el.querySelector('span');
        return { name: nameEl?.textContent || null, url: el.href || null };
      })
      .filter((l) => l.name);
  }, limit);

  return lists;
}

export async function x_get_list_members({ listUrl, limit = 100 }) {
  const { page: pg } = await ensureBrowser();
  return scrapeListMembers(pg, listUrl, { limit });
}

// ============================================================================
// 38–39. Spaces
// ============================================================================

export async function x_get_spaces({ filter = 'live', topic, limit = 20 }) {
  const { page: pg } = await ensureBrowser();
  const query = topic || 'twitter spaces';
  return scrapeSpaces(pg, query, { limit });
}

export async function x_scrape_space({ url }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, url, '[data-testid="primaryColumn"]');
  await randomDelay(3000, 5000);

  const space = await pg.evaluate(() => {
    const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
    const title =
      getText('[data-testid="SpaceTitle"]') || getText('h1') || getText('h2');
    const host = getText('[data-testid="SpaceHost"]');
    const listeners = getText('[data-testid="SpaceListenerCount"]');
    const state = getText('[data-testid="SpaceState"]') || 'unknown';

    const speakers = Array.from(
      document.querySelectorAll('[data-testid="SpaceSpeaker"]')
    ).map((el) => ({
      name: el.querySelector('span')?.textContent || null,
    }));

    return { title, host, listeners, speakers, state };
  });

  return { success: true, ...space, url };
}

// ============================================================================
// 40–41. Analytics
// ============================================================================

export async function x_get_analytics({ period = '28d' }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, 'https://x.com/i/account_analytics', '[data-testid="primaryColumn"]');
  await randomDelay(2000, 3000);

  const analytics = await pg.evaluate(() => {
    const metrics = {};
    const statEls = document.querySelectorAll(
      '[data-testid="analyticsMetric"], [class*="metric"]'
    );
    statEls.forEach((el) => {
      const label = el.querySelector('[class*="label"], small')?.textContent;
      const value = el.querySelector(
        '[class*="value"], strong, span:first-child'
      )?.textContent;
      if (label && value) metrics[label.trim()] = value.trim();
    });

    // Fallback: regex extract from page text
    if (!Object.keys(metrics).length) {
      const text = document.body.innerText;
      const extract = (pattern) => text.match(pattern)?.[1] || null;
      const impressions = extract(/impressions[:\s]+([\d,.KMB]+)/i);
      const engagements = extract(/engagements[:\s]+([\d,.KMB]+)/i);
      const followers = extract(/followers[:\s]+([\d,.KMB]+)/i);
      if (impressions) metrics.impressions = impressions;
      if (engagements) metrics.engagements = engagements;
      if (followers) metrics.followers = followers;
    }

    return metrics;
  });

  return { period, analytics };
}

export async function x_get_post_analytics({ url }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, url, 'article[data-testid="tweet"]');
  await randomDelay();

  const analytics = await pg.evaluate(() => {
    const article = document.querySelector('article[data-testid="tweet"]');
    if (!article) return null;

    const stat = (testid) =>
      article.querySelector(`[data-testid="${testid}"] span span`)?.textContent || '0';

    return {
      text:
        article.querySelector('[data-testid="tweetText"]')?.textContent || '',
      likes: stat('like'),
      retweets: stat('retweet'),
      replies: stat('reply'),
      views:
        article.querySelector('a[href*="/analytics"] span span')?.textContent ||
        null,
      bookmarks: stat('bookmark'),
    };
  });

  if (!analytics) return { success: false, message: 'Could not find tweet' };
  return { success: true, url, ...analytics };
}

// ============================================================================
// 42–44. Settings & Blocked
// ============================================================================

export async function x_get_settings() {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, 'https://x.com/settings/account', 'a[href*="/settings/"]');
  await randomDelay();

  return pg.evaluate(() => {
    const items = {};
    document.querySelectorAll('a[href*="/settings/"]').forEach((link) => {
      const label = link.querySelector('span')?.textContent;
      const value = link.querySelector('[dir="ltr"]')?.textContent;
      if (label) items[label.trim()] = value?.trim() || 'configured';
    });
    return items;
  });
}

export async function x_toggle_protected({ enabled }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, 'https://x.com/settings/audience_and_tagging', 'input[type="checkbox"]');
  await randomDelay();

  const checkbox = await pg.$('input[type="checkbox"]');
  if (checkbox) {
    const isChecked = await checkbox.evaluate((el) => el.checked);
    if ((enabled && !isChecked) || (!enabled && isChecked)) {
      await checkbox.click();
      await sleep(500);
      await clickIfPresent(pg, '[data-testid="confirmationSheetConfirm"]');
      await randomDelay();
      return {
        success: true,
        protected: enabled,
        message: `Account ${enabled ? 'protected' : 'set to public'}`,
      };
    }
    return {
      success: true,
      protected: enabled,
      message: `Already ${enabled ? 'protected' : 'public'}`,
    };
  }
  return { success: false, message: 'Could not find protect toggle' };
}

export async function x_get_blocked({ limit = 200 }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, 'https://x.com/settings/blocked/all', '[data-testid="UserCell"], [data-testid="primaryColumn"]');
  await randomDelay();

  return scrollCollect(
    pg,
    () => {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      return Array.from(cells)
        .map((cell) => {
          const link = cell.querySelector('a[href^="/"]');
          const nameEl = cell.querySelector('[dir="ltr"] > span');
          const username =
            link?.getAttribute('href')?.split('/')[1] || null;
          return {
            _key: username,
            username,
            name: nameEl?.textContent || null,
          };
        })
        .filter((u) => u.username);
    },
    { limit }
  );
}

// ============================================================================
// 45–46. Business
// ============================================================================

export async function x_brand_monitor({ brand, limit = 50, sentiment = true }) {
  const { page: pg } = await ensureBrowser();
  const tweets = await searchTweets(pg, brand, { limit });

  if (!sentiment) {
    return { brand, mentions: tweets, count: tweets.length };
  }

  // Simple keyword-based sentiment classification
  const posWords = [
    'love', 'great', 'amazing', 'best', 'awesome', 'excellent', 'good', 'fantastic',
  ];
  const negWords = [
    'hate', 'awful', 'terrible', 'worst', 'bad', 'horrible', 'poor', 'disappointing',
  ];

  const analyzed = tweets.map((tweet) => {
    const text = (tweet.text || '').toLowerCase();
    const pos = posWords.filter((w) => text.includes(w)).length;
    const neg = negWords.filter((w) => text.includes(w)).length;
    const label = pos > neg ? 'positive' : neg > pos ? 'negative' : 'neutral';
    return { ...tweet, sentiment: label };
  });

  const summary = {
    positive: analyzed.filter((t) => t.sentiment === 'positive').length,
    neutral: analyzed.filter((t) => t.sentiment === 'neutral').length,
    negative: analyzed.filter((t) => t.sentiment === 'negative').length,
  };

  return { brand, mentions: analyzed, count: analyzed.length, sentiment: summary };
}

export async function x_competitor_analysis({ handles }) {
  if (!handles || handles.length < 2) {
    return { success: false, message: 'Provide at least 2 handles to compare' };
  }

  const { page: pg } = await ensureBrowser();
  const profiles = [];
  for (const handle of handles) {
    const profile = await scrapeProfile(pg, handle.replace('@', ''));
    profiles.push(profile);
    await sleep(1000);
  }

  return {
    accounts: profiles,
    comparison: profiles.map((p) => ({
      username: p.username,
      followers: p.followers,
      following: p.following,
      tweetCount: p.tweetCount || p.tweets,
    })),
  };
}

// ============================================================================
// 47. Premium
// ============================================================================

export async function x_check_premium() {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, 'https://x.com/settings/your_twitter_data/account', '[data-testid="primaryColumn"]');
  await randomDelay();

  return pg.evaluate(() => {
    const text = document.body.innerText;
    const isPremium = /premium|blue|verified|subscriber/i.test(text);
    const tier =
      text.match(/(basic|premium\s*\+?|premium\s*plus)/i)?.[1] || null;
    return { isPremium, tier };
  });
}

// ============================================================================
// 48. Articles
// ============================================================================

export async function x_publish_article({ title, body, publish = false }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, 'https://x.com/i/articles/new', '[data-testid="articleTitle"], [contenteditable="true"], input[placeholder*="Title"]');
  await randomDelay(2000, 3000);

  const titleEl = await pg.$(
    '[data-testid="articleTitle"], [contenteditable="true"]:first-child, input[placeholder*="Title"]'
  );
  if (!titleEl) {
    return { success: false, message: 'Article editor not found (requires Premium+)' };
  }
  await titleEl.type(title, { delay: 30 });
  await sleep(500);

  const bodyEl = await pg.$(
    '[data-testid="articleBody"], [contenteditable="true"]:last-child'
  );
  if (bodyEl) {
    await bodyEl.type(body, { delay: 20 });
    await sleep(500);
  }

  if (publish) {
    if (await clickIfPresent(pg, '[data-testid="publishButton"]')) {
      await randomDelay();
      return { success: true, message: 'Article published' };
    }
  } else {
    if (await clickIfPresent(pg, '[data-testid="saveDraftButton"]')) {
      await randomDelay();
      return { success: true, message: 'Article saved as draft' };
    }
  }
  return { success: false, message: 'Could not save article' };
}

// ============================================================================
// 49. Creator Analytics
// ============================================================================

export async function x_creator_analytics({ period = '28d' }) {
  const { page: pg } = await ensureBrowser();
  await gotoAndRender(pg, 'https://x.com/i/monetization', '[data-testid="primaryColumn"]');
  await randomDelay(2000, 3000);

  return pg.evaluate(() => {
    const metrics = {};
    const text = document.body.innerText;
    const extract = (pattern) => text.match(pattern)?.[1] || null;

    const revenue = extract(/revenue[:\s]*\$?([\d,.]+)/i);
    const subscribers = extract(/subscribers[:\s]*([\d,.]+)/i);
    const views = extract(/views[:\s]*([\d,.KMB]+)/i);

    if (revenue) metrics.revenue = revenue;
    if (subscribers) metrics.subscribers = subscribers;
    if (views) metrics.views = views;

    return metrics;
  });
}

// ============================================================================
// HTTP Client Tools (no Puppeteer — faster, lightweight)
// ============================================================================

import { Scraper } from '../client/index.js';

/**
 * Helper: create a Scraper instance with saved cookies if available.
 */
async function getClientScraper() {
  const scraper = new Scraper();
  const cookiePath = path.join(sessionDir(), 'cookies.json');
  try {
    await fs.access(cookiePath);
    await scraper.loadCookies(cookiePath);
  } catch {
    // No saved cookies — will use guest token for read-only operations
  }
  return scraper;
}

/** Get a user's profile using the HTTP client (no browser needed). */
export async function x_client_get_profile({ username }) {
  const scraper = await getClientScraper();
  return scraper.getProfile(username);
}

/** Get a single tweet by ID using the HTTP client. */
export async function x_client_get_tweet({ tweetId }) {
  const scraper = await getClientScraper();
  return scraper.getTweet(tweetId);
}

/** Search tweets using the HTTP client. */
export async function x_client_search({ query, count = 20, mode = 'Latest' }) {
  const scraper = await getClientScraper();
  const results = [];
  for await (const tweet of scraper.searchTweets(query, count, mode)) {
    results.push(tweet);
  }
  return results;
}

/** Post a tweet using the HTTP client (requires saved auth cookies). */
export async function x_client_send_tweet({ text }) {
  const scraper = await getClientScraper();
  return scraper.sendTweet(text);
}

/** Get a user's followers using the HTTP client. */
export async function x_client_get_followers({ username, count = 100 }) {
  const scraper = await getClientScraper();
  const profile = await scraper.getProfile(username);
  const followers = [];
  for await (const follower of scraper.getFollowers(profile.id, count)) {
    followers.push(follower);
  }
  return followers;
}

/** Get trending topics using the HTTP client. */
export async function x_client_get_trends() {
  const scraper = await getClientScraper();
  return scraper.getTrends();
}

// ============================================================================
// Tool Map — all tools matching server.js TOOLS (excluding streaming)
// ============================================================================

export const toolMap = {
  // Auth
  x_login,
  // Scraping (delegated to scrapers/index.js — single source of truth)
  x_get_profile,
  x_get_followers,
  x_get_following,
  x_get_non_followers,
  x_get_tweets,
  x_search_tweets,
  x_get_thread,
  x_get_article,
  x_best_time_to_post,
  x_account_report,
  x_account_brief,
  // Core actions
  x_follow,
  x_unfollow,
  // Bulk
  x_unfollow_non_followers,
  x_detect_unfollowers,
  // Post / Like / Retweet
  x_post_tweet,
  x_like,
  x_retweet,
  x_download_video,
  // Profile management
  x_update_profile,
  // Posting & content
  x_post_thread,
  x_create_poll,
  x_schedule_post,
  x_delete_tweet,
  // Engagement
  x_reply,
  x_quote_tweet,
  x_bookmark,
  x_get_bookmarks,
  x_clear_bookmarks,
  x_auto_like,
  x_engage,
  // Discovery
  x_get_trends,
  x_get_explore,
  x_get_home_timeline,
  // Notifications
  x_get_notifications,
  x_mute_user,
  x_unmute_user,
  // Direct messages
  x_send_dm,
  x_get_conversations,
  x_export_dms,
  // Grok AI
  x_grok_query,
  x_grok_summarize,
  // Lists
  x_get_lists,
  x_get_list_members,
  // Spaces
  x_get_spaces,
  x_scrape_space,
  // Analytics
  x_get_analytics,
  x_get_post_analytics,
  // Settings
  x_get_settings,
  x_toggle_protected,
  x_get_blocked,
  // Business
  x_brand_monitor,
  x_competitor_analysis,
  // Premium / Creator
  x_check_premium,
  x_publish_article,
  x_creator_analytics,
  // ── HTTP Client Tools (no Puppeteer — faster) ───────────────────────────
  x_client_get_profile,
  x_client_get_tweet,
  x_client_search,
  x_client_send_tweet,
  x_client_get_followers,
  x_client_get_trends,
  // Utility (not an MCP tool, used by server.js cleanup)
  getPage,
  closeBrowser,
  withToolContext,
};

// Each tool runs in its own context so the browser lock is per call.
for (const [name, fn] of Object.entries(toolMap)) {
  if (name.startsWith('x_')) toolMap[name] = (...args) => withToolContext(() => fn(...args));
}

export default toolMap;
