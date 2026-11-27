// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The checks behind `node scripts/live-check.mjs`.
 *
 * Each check calls the same library code the CLI command it stands for calls,
 * against stable public accounts and posts, and either returns a short detail
 * (pass), returns `{status, detail}` (skipped, or a fail that carries items),
 * or throws (fail, or `limited` when X rate limited it). Nothing here writes
 * to X: every request is a read or a page load.
 *
 * Being a good citizen: one guest client is shared by the HTTP checks, the
 * probe's clients do not trigger background query-ID discovery, a failure is
 * retried once after a backoff, a rate limit is recorded and not retried, and
 * checks are spaced by the same 1 to 3 second delay the scrapers use.
 *
 * The CLI's read commands live inline in src/cli/index.js and are not
 * importable, so where a command has a logged-out fallback (thread, media)
 * the fallback is mirrored here and named in the check's detail.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { classifyError, parseSelectorsDoc } from '../../src/utils/liveStatus.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SELECTORS_DOC = path.join(ROOT, 'docs', 'agents', 'selectors.md');

/** Public inputs that have existed for years and are not going anywhere. */
export const STABLE = Object.freeze({
  profile: 'NASA',
  signingProfile: 'jack',
  postId: '266031293945503744',
  postAuthor: 'BarackObama',
  postUrl: 'https://x.com/BarackObama/status/266031293945503744',
  hashtag: 'nasa',
  searchQuery: 'nasa',
  edgeUrl: 'https://xactions.app/mcp',
});

/** Pages the selector checks load: a profile and a single post. */
export const SELECTOR_PAGES = Object.freeze([`https://x.com/${STABLE.profile}`, STABLE.postUrl]);

/**
 * Selectors from docs/agents/selectors.md, by row name, that a public profile
 * or post page renders. The session list adds the ones only a signed-in page
 * shows. Rows are looked up in the doc at run time, so the doc stays the one
 * place a selector is written down.
 */
export const GUEST_SELECTORS = Object.freeze([
  'Tweet', 'Tweet text', 'Back button', 'Verification badge', 'Like button', 'Reply button', 'Retweet button',
]);
export const SESSION_SELECTORS = Object.freeze([
  ...GUEST_SELECTORS, 'User actions menu', 'Share button', 'Bookmark button', 'Search input',
]);

/** The repository secret that turns the logged-in checks on. */
export const COOKIE_ENV = 'XACTIONS_LIVE_CHECK_COOKIES';

/** Spacing between checks: the scrapers' own randomDelay range. */
export const DELAY_MS = Object.freeze({ min: 1000, max: 3000 });

/** Backoff before the one retry a failed check gets. */
export const RETRY_DELAY_MS = 5000;

const EDGE_TIMEOUT_MS = 20_000;
const PAGE_TIMEOUT_MS = 30_000;
const DETAIL_MAX = 300;

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The platform fetch with the shared HTTP/2 dispatcher, so a wrapper around
 * it (the signing check's) negotiates h2 exactly as the clients do.
 * @returns {Promise<typeof globalThis.fetch>}
 */
async function platformFetch() {
  const { withHttp2, fetchWithDispatcher } = await import('../../src/utils/http2.js');
  return async (url, init = {}) => fetchWithDispatcher(globalThis.fetch, url, await withHttp2({ ...init }, globalThis.fetch));
}

/** Read one header from a fetch init's headers, whatever their shape. */
function headerOf(headers, name) {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') return headers.get(name) ?? undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? headers[key] : undefined;
}

/**
 * Shared state for one run: the injected fetch (recorded responses in tests,
 * the network otherwise), the optional test-account cookies, and lazily built
 * clients and browser.
 *
 * @param {object} [options]
 * @param {typeof globalThis.fetch} [options.fetch]  Omit for the network
 * @param {string|null} [options.cookies]  A dedicated test account's cookie string
 * @param {string} [options.selectorsDoc]  Markdown; read from docs/agents/selectors.md when omitted
 */
export function createContext({ fetch: fetchFn, cookies = null, selectorsDoc } = {}) {
  const lazy = {};
  const ctx = {
    fetch: fetchFn ?? null,
    cookies: cookies || null,

    async guestScraper() {
      if (!lazy.guest) {
        const { Scraper } = await import('../../src/client/index.js');
        lazy.guest = new Scraper(ctx.fetch ? { fetch: ctx.fetch } : {});
      }
      return lazy.guest;
    },

    async sessionScraper() {
      if (!lazy.session) {
        const { Scraper } = await import('../../src/client/index.js');
        const scraper = new Scraper(ctx.fetch ? { fetch: ctx.fetch } : {});
        await scraper.setCookies(ctx.cookies);
        lazy.session = scraper;
      }
      return lazy.session;
    },

    async httpClient() {
      if (!lazy.http) {
        const { TwitterHttpClient } = await import('../../src/scrapers/twitter/http/client.js');
        lazy.http = new TwitterHttpClient({ maxRetries: 1, autoRefreshQueryIds: false, ...(ctx.fetch ? { fetch: ctx.fetch } : {}) });
      }
      return lazy.http;
    },

    /** The browser, or null with `browserError` set when Puppeteer or Chromium is missing. */
    async browser() {
      if (lazy.browser === undefined) {
        try {
          const scrapers = await import('../../src/scrapers/index.js');
          lazy.browser = await scrapers.createBrowser();
        } catch (error) {
          lazy.browser = null;
          ctx.browserError = error.message.split('\n')[0];
        }
      }
      return lazy.browser;
    },

    /**
     * A fresh page. Guest pages come from scrapers.createPage, as the CLI's
     * do; a session page lives in its own browser context so the test
     * account's cookies never reach a guest check.
     */
    async newPage({ session = false } = {}) {
      const browser = await ctx.browser();
      const scrapers = await import('../../src/scrapers/index.js');
      if (!session) return { page: await scrapers.createPage(browser), close: async () => {} };
      const context = await browser.createBrowserContext();
      await context.setCookie(...cookieParams(ctx.cookies));
      const page = await scrapers.createPage(context);
      return { page, close: () => context.close() };
    },

    async selectorsDoc() {
      if (lazy.doc === undefined) lazy.doc = selectorsDoc ?? (await fs.readFile(SELECTORS_DOC, 'utf8'));
      return lazy.doc;
    },

    async close() {
      if (lazy.browser) await lazy.browser.close().catch(() => {});
      lazy.browser = undefined;
    },
  };
  return ctx;
}

/**
 * Turn a `name=value; name2=value2` cookie string into Puppeteer cookie params for x.com.
 * @param {string} cookieString
 */
export function cookieParams(cookieString) {
  return String(cookieString || '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.includes('='))
    .map((part) => {
      const at = part.indexOf('=');
      return { name: part.slice(0, at).trim(), value: part.slice(at + 1).trim(), domain: '.x.com', path: '/', secure: true };
    });
}

/**
 * One JSON-RPC call to the hosted MCP endpoint. Accepts a JSON body or a
 * Streamable HTTP event stream.
 */
async function edgeRpc(ctx, id, method, params) {
  const fetchFn = ctx.fetch ?? globalThis.fetch;
  const res = await fetchFn(STABLE.edgeUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) }),
    signal: AbortSignal.timeout(EDGE_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw Object.assign(new Error(`HTTP ${res.status} from ${STABLE.edgeUrl} on ${method}`), { status: res.status });
  }
  const text = await res.text();
  const payload = text.trimStart().startsWith('{')
    ? text
    : text.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
  let message;
  try {
    message = JSON.parse(payload);
  } catch {
    throw new Error(`${STABLE.edgeUrl} answered ${method} with something that is not JSON-RPC: ${text.slice(0, 80)}`);
  }
  if (message.error) throw new Error(`${method} returned JSON-RPC error ${message.error.code}: ${message.error.message}`);
  return message.result;
}

/** Collect up to `limit` items from an async iterator. */
async function take(iterable, limit) {
  const out = [];
  for await (const item of iterable) {
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/** Count matches per selector on the current page, plus every data-testid. */
async function countSelectors(page, selectors) {
  return page.evaluate((list) => ({
    counts: list.map((s) => document.querySelectorAll(s).length),
    testIds: document.querySelectorAll('[data-testid]').length,
  }), selectors);
}

/** The DOM selector check, logged out or with the test account. */
async function selectorCheck(ctx, { session }) {
  const browser = await ctx.browser();
  if (!browser) return { status: 'skipped', detail: `No browser: ${ctx.browserError}` };

  const rows = parseSelectorsDoc(await ctx.selectorsDoc());
  const names = session ? SESSION_SELECTORS : GUEST_SELECTORS;
  const wanted = names.map((name) => rows.find((r) => r.name === name)).filter(Boolean);
  if (wanted.length === 0) throw new Error('None of the checked selector rows are in docs/agents/selectors.md');

  const totals = wanted.map(() => 0);
  let testIds = 0;
  for (const url of SELECTOR_PAGES) {
    const { page, close } = await ctx.newPage({ session });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
      await page.waitForSelector('[data-testid]', { timeout: 15_000 }).catch(() => {});
      await defaultSleep(2000);
      const { counts, testIds: ids } = await countSelectors(page, wanted.map((w) => w.selector));
      counts.forEach((n, i) => { totals[i] += n; });
      testIds += ids;
    } finally {
      await page.close().catch(() => {});
      await close();
    }
  }

  const items = wanted.map((w, i) => ({ name: w.name, section: w.section, selector: w.selector, matched: totals[i] > 0, count: totals[i] }));
  const matched = items.filter((i) => i.matched).length;
  const where = SELECTOR_PAGES.map((u) => u.replace('https://x.com/', '')).join(' and ');
  if (matched === items.length) return { detail: `${matched}/${items.length} documented selectors match on ${where}`, items };

  const who = session ? 'the test account' : 'a logged-out visitor';
  const detail = testIds === 0
    ? `x.com served ${who} its newer x-web client, which has no data-testid attributes: ${matched}/${items.length} documented selectors match`
    : `${matched}/${items.length} documented selectors match on ${where}; missing: ${items.filter((i) => !i.matched).map((i) => i.name).join(', ')}`;
  return { status: 'fail', detail, items };
}

/**
 * Every check, in run order: HTTP reads, the hosted endpoint, then the browser.
 * @type {Array<{id: string, label: string, feature: string, tier: 'guest'|'session', run: (ctx: ReturnType<typeof createContext>) => Promise<{detail: string, status?: string, items?: object[]}>}>}
 */
export const CHECKS = [
  {
    id: 'query-ids',
    label: 'Query-ID discovery',
    feature: 'Fresh GraphQL query IDs read from x.com\'s own bundles, so reads survive an ID rotation',
    tier: 'guest',
    async run(ctx) {
      const { discoverQueryIds } = await import('../../src/scrapers/twitter/http/queryIds.js');
      try {
        // An explicit fetch: the default attaches a saved session, and this is the guest tier.
        const result = await discoverQueryIds({ persist: false, fetch: ctx.fetch ?? globalThis.fetch });
        return { detail: `${result.count} operations from ${result.source.chunksFetched} bundles` };
      } catch (error) {
        if (error.code === 'X_WEB_CLIENT') {
          throw new Error('x.com served a logged-out visitor its newer x-web client, which has no classic bundle to read query IDs from; the IDs pinned in endpoints.js stay in use', { cause: error });
        }
        throw error;
      }
    },
  },
  {
    id: 'profile',
    label: 'Profile',
    feature: '`xactions profile`, `x_get_profile`',
    tier: 'guest',
    async run(ctx) {
      const profile = await (await ctx.guestScraper()).getProfile(STABLE.profile);
      if (!profile?.id) throw new Error(`X answered with no profile data for @${STABLE.profile}`);
      return { detail: `@${profile.username}, ${Number(profile.followersCount).toLocaleString('en-US')} followers` };
    },
  },
  {
    id: 'tweets',
    label: 'Posts',
    feature: '`xactions tweets`, `analyze`, `brief`',
    tier: 'guest',
    async run(ctx) {
      const tweets = await take((await ctx.guestScraper()).getTweets(STABLE.profile, 5), 5);
      const real = tweets.filter((t) => t?.id && typeof t.text === 'string');
      if (real.length === 0) throw new Error(`The timeline for @${STABLE.profile} came back empty`);
      return { detail: `${real.length} posts from @${STABLE.profile}` };
    },
  },
  {
    id: 'thread',
    label: 'Thread',
    feature: '`xactions thread`',
    tier: 'guest',
    async run(ctx) {
      const { scrapeFullThread } = await import('../../src/scrapers/twitter/http/thread.js');
      const { AuthError } = await import('../../src/scrapers/twitter/http/errors.js');
      let posts;
      let rail = 'TweetDetail';
      try {
        const result = await scrapeFullThread(await ctx.httpClient(), STABLE.postId);
        posts = [result.rootTweet, ...result.authorReplies].filter(Boolean);
      } catch (error) {
        // The CLI's logged-out fallback: TweetDetail answers 403 to a guest.
        if (!(error instanceof AuthError)) throw error;
        const { getThread } = await import('../../src/edge/postReader.js');
        posts = (await getThread(STABLE.postId, { limit: 10 })).posts;
        rail = 'the guest rails (TweetDetail needs a session)';
      }
      if (!posts?.length) throw new Error(`No posts came back for ${STABLE.postUrl}`);
      return { detail: `${posts.length} post${posts.length === 1 ? '' : 's'} via ${rail}` };
    },
  },
  {
    id: 'media',
    label: 'Media',
    feature: '`xactions media`',
    tier: 'guest',
    async run(ctx) {
      const { scrapeMedia } = await import('../../src/scrapers/twitter/http/media.js');
      const { AuthError } = await import('../../src/scrapers/twitter/http/errors.js');
      let count;
      let rail = 'UserMedia';
      try {
        count = (await scrapeMedia(await ctx.httpClient(), STABLE.profile, { limit: 3 })).length;
      } catch (error) {
        // The CLI's logged-out fallback: the media tab is 403 to a guest, the timeline is not.
        if (!(error instanceof AuthError)) throw error;
        rail = 'the timeline fallback (UserMedia needs a session)';
        count = 0;
        for await (const tweet of (await ctx.guestScraper()).getTweets(STABLE.profile, 20)) {
          count += (tweet.photos?.length || 0) + (tweet.videos?.filter((v) => v.url).length || 0);
          if (count >= 3) break;
        }
      }
      if (!count) throw new Error(`No media came back for @${STABLE.profile}`);
      return { detail: `${count} media items via ${rail}` };
    },
  },
  {
    id: 'signing',
    label: 'Request signing',
    feature: 'The `x-client-transaction-id` header every GraphQL call carries',
    tier: 'guest',
    async run(ctx) {
      const base = ctx.fetch ?? (await platformFetch());
      const signed = [];
      const recording = (url, init = {}) => {
        if (String(url).includes('/graphql/')) signed.push(Boolean(headerOf(init.headers, 'x-client-transaction-id')));
        return base(url, init);
      };
      const { Scraper } = await import('../../src/client/index.js');
      const { transactionIdStatus } = await import('../../src/scrapers/twitter/http/transactionId.js');
      const profile = await new Scraper({ fetch: recording, transactionId: true }).getProfile(STABLE.signingProfile);
      if (signed.length === 0) throw new Error('No GraphQL request was sent');
      if (!signed.every(Boolean)) throw new Error('The request went out unsigned: no transaction keys could be obtained');
      if (!profile?.id) throw new Error('The signed request was answered with no data');
      return { detail: `Signed UserByScreenName accepted (keys from the ${transactionIdStatus().source ?? 'unknown'} source)` };
    },
  },
  {
    id: 'edge-tools',
    label: 'Hosted MCP: tools/list',
    feature: '`https://xactions.app/mcp` lists its tools',
    tier: 'guest',
    async run(ctx) {
      await edgeRpc(ctx, 1, 'initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'xactions-live-check', version: '1' },
      });
      const result = await edgeRpc(ctx, 2, 'tools/list');
      const names = (result?.tools || []).map((t) => t.name);
      if (!names.includes('x_post')) throw new Error(`tools/list did not include x_post (got ${names.join(', ') || 'nothing'})`);
      return { detail: `${names.length} tools: ${names.join(', ')}` };
    },
  },
  {
    id: 'edge-read',
    label: 'Hosted MCP: free read',
    feature: '`x_post` on `https://xactions.app/mcp`, no account and no payment',
    tier: 'guest',
    async run(ctx) {
      const result = await edgeRpc(ctx, 3, 'tools/call', { name: 'x_post', arguments: { post: STABLE.postUrl } });
      const text = (result?.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
      if (result?.isError) throw new Error(`x_post answered with an error: ${text}`);
      if (!text.includes(`@${STABLE.postAuthor}`)) throw new Error(`x_post answered without the post: ${text.slice(0, 120)}`);
      return { detail: text.split('\n')[0] };
    },
  },
  {
    id: 'hashtag',
    label: 'Hashtag',
    feature: '`xactions hashtag`',
    tier: 'guest',
    async run(ctx) {
      const browser = await ctx.browser();
      if (!browser) return { status: 'skipped', detail: `No browser: ${ctx.browserError}` };
      const scrapers = await import('../../src/scrapers/index.js');
      const { page, close } = await ctx.newPage({ session: false });
      try {
        const tweets = await scrapers.scrapeHashtag(page, STABLE.hashtag, { limit: 3 });
        if (tweets.length > 0) return { detail: `${tweets.length} posts for #${STABLE.hashtag}` };
        if (/\/i\/(flow\/login|jf\/onboarding)/.test(page.url())) {
          throw new Error('x.com sends a logged-out visitor\'s search page to its login flow, so a hashtag read now needs a session');
        }
        throw new Error(`The search page for #${STABLE.hashtag} rendered no posts`);
      } finally {
        await page.close().catch(() => {});
        await close();
      }
    },
  },
  {
    id: 'selectors',
    label: 'DOM selectors, logged out',
    feature: 'Browser scripts and `docs/agents/selectors.md`, on public pages',
    tier: 'guest',
    run: (ctx) => selectorCheck(ctx, { session: false }),
  },
  {
    id: 'search',
    label: 'Search',
    feature: '`xactions search`, with a session',
    tier: 'session',
    async run(ctx) {
      const { SearchMode } = await import('../../src/client/index.js');
      const tweets = await take((await ctx.sessionScraper()).searchTweets(STABLE.searchQuery, 5, SearchMode.Latest), 5);
      if (tweets.length === 0) throw new Error(`Search for "${STABLE.searchQuery}" came back empty`);
      return { detail: `${tweets.length} posts for "${STABLE.searchQuery}"` };
    },
  },
  {
    id: 'followers',
    label: 'Followers',
    feature: '`xactions followers`, with a session',
    tier: 'session',
    async run(ctx) {
      const users = await take((await ctx.sessionScraper()).getFollowers(STABLE.profile, 5), 5);
      if (users.length === 0) throw new Error(`No followers came back for @${STABLE.profile}`);
      return { detail: `${users.length} followers of @${STABLE.profile}` };
    },
  },
  {
    id: 'selectors-session',
    label: 'DOM selectors, signed in',
    feature: 'Browser scripts and `docs/agents/selectors.md`, where they actually run',
    tier: 'session',
    run: (ctx) => selectorCheck(ctx, { session: true }),
  },
];

/** First line of an error, without the long query strings X endpoints carry. */
function errorDetail(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.split('\n')[0].replace(/(https:\/\/[^\s?]+)\?\S+/g, '$1');
}

/**
 * Run one check, retrying a failure once after a backoff. A rate limit is
 * recorded as `limited` and not retried; a session check with no test
 * account is skipped without running.
 *
 * @param {typeof CHECKS[number]} def
 * @param {ReturnType<typeof createContext>} ctx
 * @param {{sleep?: (ms: number) => Promise<void>, retryDelayMs?: number}} [options]
 * @returns {Promise<import('../../src/utils/liveStatus.js').CheckResult & {attempts: number}>}
 */
export async function runCheck(def, ctx, { sleep = defaultSleep, retryDelayMs = RETRY_DELAY_MS } = {}) {
  const base = { id: def.id, label: def.label, feature: def.feature, tier: def.tier };
  if (def.tier === 'session' && !ctx.cookies) {
    return { ...base, status: 'skipped', ms: 0, detail: `Off: set the ${COOKIE_ENV} secret to a dedicated test account's cookies to run it`, attempts: 0 };
  }

  let attempts = 0;
  for (;;) {
    attempts += 1;
    const started = performance.now();
    let outcome;
    try {
      const result = await def.run(ctx);
      outcome = { status: result.status ?? 'pass', detail: result.detail, items: result.items };
    } catch (error) {
      outcome = { status: classifyError(error), detail: errorDetail(error) };
    }
    const ms = Math.round(performance.now() - started);
    if (outcome.status === 'fail' && attempts === 1) {
      await sleep(retryDelayMs);
      continue;
    }
    return {
      ...base,
      status: outcome.status,
      ms,
      detail: String(outcome.detail ?? '').slice(0, DETAIL_MAX),
      ...(outcome.items ? { items: outcome.items } : {}),
      attempts,
    };
  }
}

/**
 * Run checks in order, spaced by the scrapers' delay.
 *
 * @param {ReturnType<typeof createContext>} ctx
 * @param {{only?: string[], checks?: typeof CHECKS, sleep?: (ms: number) => Promise<void>, retryDelayMs?: number, onResult?: (r: object) => void}} [options]
 */
export async function runChecks(ctx, { only, checks = CHECKS, sleep = defaultSleep, retryDelayMs, onResult } = {}) {
  const selected = only ? checks.filter((c) => only.includes(c.id)) : checks;
  const results = [];
  let ranOne = false;
  for (const def of selected) {
    const willRun = !(def.tier === 'session' && !ctx.cookies);
    if (willRun && ranOne) await sleep(DELAY_MS.min + Math.random() * (DELAY_MS.max - DELAY_MS.min));
    const result = await runCheck(def, ctx, { sleep, ...(retryDelayMs === undefined ? {} : { retryDelayMs }) });
    if (willRun) ranOne = true;
    results.push(result);
    onResult?.(result);
  }
  return results;
}
