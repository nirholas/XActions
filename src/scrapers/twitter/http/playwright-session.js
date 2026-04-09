// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * Playwright Session Harvester — Zero-credential guest session for Twitter API
 *
 * Uses a real browser (Playwright/Chromium) to load a public Twitter profile,
 * intercepts the outgoing GraphQL request, and copies the actual request headers
 * (including Authorization, x-guest-token, cookie, csrf token) for reuse in
 * direct API calls — no login, no API key, no developer account needed.
 *
 * Why: Twitter's guest/activate.json endpoint has become unreliable. This
 * approach works because public profiles are viewable without login, so the
 * browser gets a real guest session automatically. Intercepting the request
 * gives us working headers without guessing.
 *
 * Usage:
 *   import { harvestSession, createClientFromSession } from './playwright-session.js';
 *
 *   const headers = await harvestSession();
 *   // Use headers directly with fetch():
 *   const res = await fetch(url, { headers });
 *
 *   // Or create a TwitterHttpClient pre-loaded with the session:
 *   const client = await createClientFromSession();
 *   const profile = await scrapeProfile(client, 'username');
 *
 * Requirements:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * @module scrapers/twitter/http/playwright-session
 * @author nich (@nichxbt)
 * @license MIT
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Public profile used to trigger the GraphQL request — well-known, always exists */
const PROBE_PROFILE = 'x';

/** Max ms to wait for a GraphQL request to fire after page load */
const INTERCEPT_TIMEOUT_MS = 12_000;

/** How many requests to make per session before harvesting a fresh one */
export const DEFAULT_SESSION_TTL = 80;

// ---------------------------------------------------------------------------
// harvestSession
// ---------------------------------------------------------------------------

/**
 * Launch a headless Chromium browser, navigate to a public X profile, and
 * intercept the first outgoing UserByScreenName GraphQL request. Returns a
 * copy of its request headers for use with `fetch()`.
 *
 * The browser is closed immediately after harvesting — it is not kept alive.
 *
 * @param {object} [options]
 * @param {string} [options.probeProfile='x'] - Public username to load (triggers the GraphQL request)
 * @param {string} [options.userAgent]         - Override the browser user agent
 * @param {boolean} [options.headless=true]    - Run browser in headless mode
 * @returns {Promise<Record<string, string>>}  - Request headers ready for use with fetch()
 * @throws {Error} If no GraphQL request is observed within the timeout
 *
 * @example
 * const headers = await harvestSession();
 * const res = await fetch('https://x.com/i/api/graphql/...', { headers });
 */
export async function harvestSession({
  probeProfile = PROBE_PROFILE,
  userAgent = DEFAULT_UA,
  headless = true,
} = {}) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error(
      'playwright is required for harvestSession(). Install it: npm install playwright && npx playwright install chromium',
    );
  }

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ userAgent, locale: 'en-US' });
  const page = await context.newPage();

  let harvestedHeaders = null;
  const ready = new Promise((resolve) => {
    // Intercept outgoing GraphQL requests and steal headers from the first one
    page.route('**/graphql/**', async (route) => {
      const req = route.request();
      if (!harvestedHeaders) {
        harvestedHeaders = { ...req.headers() };
        resolve();
      }
      await route.continue();
    });
  });

  try {
    await page.goto(`https://x.com/${probeProfile}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // Wait for intercept or timeout
    await Promise.race([
      ready,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`No GraphQL request observed within ${INTERCEPT_TIMEOUT_MS}ms`)),
          INTERCEPT_TIMEOUT_MS,
        ),
      ),
    ]);
  } finally {
    await browser.close();
  }

  if (!harvestedHeaders) {
    throw new Error('Failed to harvest session — no GraphQL request intercepted');
  }

  return harvestedHeaders;
}

// ---------------------------------------------------------------------------
// SessionPool
// ---------------------------------------------------------------------------

/**
 * Manages a pool of harvested sessions, rotating them as they exhaust their
 * request budget. Concurrent-safe: multiple parallel callers share the pool.
 *
 * @example
 * const pool = new SessionPool({ size: 2, ttl: 100 });
 * await pool.init();
 *
 * // In a parallel scraping loop:
 * const headers = await pool.getHeaders();
 * const res = await fetch(url, { headers });
 *
 * @example Single-session (default)
 * const pool = new SessionPool();
 * const headers = await pool.getHeaders(); // harvests on first call
 */
export class SessionPool {
  /**
   * @param {object} [options]
   * @param {number} [options.size=1]    - Number of concurrent sessions to maintain
   * @param {number} [options.ttl]       - Requests per session before rotation (default: DEFAULT_SESSION_TTL)
   * @param {object} [options.harvest]   - Options forwarded to harvestSession()
   */
  constructor({ size = 1, ttl = DEFAULT_SESSION_TTL, harvest = {} } = {}) {
    this._size = size;
    this._ttl = ttl;
    this._harvestOpts = harvest;

    /** @type {Array<{ headers: Record<string, string>, uses: number }>} */
    this._sessions = [];
    this._index = 0;
    this._refreshing = false;
    this._refreshPromise = null;
  }

  /**
   * Pre-fill the pool with `size` sessions.
   * Call this before starting your scraping loop to avoid cold-start latency.
   * @returns {Promise<void>}
   */
  async init() {
    const needed = this._size - this._sessions.length;
    for (let i = 0; i < needed; i++) {
      const headers = await harvestSession(this._harvestOpts);
      this._sessions.push({ headers, uses: 0 });
    }
  }

  /**
   * Get headers from the next available session.
   * Automatically harvests a fresh session if the current one is exhausted.
   * @returns {Promise<Record<string, string>>}
   */
  async getHeaders() {
    // Wait if a refresh is already in progress
    if (this._refreshPromise) await this._refreshPromise;

    if (this._sessions.length === 0) {
      await this.init();
    }

    const session = this._sessions[this._index % this._sessions.length];
    session.uses++;

    // Rotate to a fresh session when TTL is reached
    if (session.uses >= this._ttl) {
      await this._rotate(this._index % this._sessions.length);
    }

    this._index++;
    return session.headers;
  }

  /**
   * Force-refresh a specific session slot.
   * @param {number} slotIndex
   * @returns {Promise<void>}
   */
  async _rotate(slotIndex) {
    if (this._refreshing) {
      await this._refreshPromise;
      return;
    }
    this._refreshing = true;
    this._refreshPromise = (async () => {
      const headers = await harvestSession(this._harvestOpts);
      this._sessions[slotIndex] = { headers, uses: 0 };
    })().finally(() => {
      this._refreshing = false;
      this._refreshPromise = null;
    });
    await this._refreshPromise;
  }

  /**
   * Force-refresh all sessions (e.g. after an auth failure).
   * @returns {Promise<void>}
   */
  async refreshAll() {
    this._sessions = [];
    await this.init();
  }
}

// ---------------------------------------------------------------------------
// createClientFromSession (convenience)
// ---------------------------------------------------------------------------

/**
 * Harvest a session and return a configured `TwitterHttpClient` instance.
 *
 * The client is pre-loaded with the harvested cookie and guest token so you
 * can use it with `scrapeProfile`, `scrapeProfileById`, etc. immediately.
 *
 * @param {object} [options] - Forwarded to harvestSession()
 * @returns {Promise<import('./client.js').TwitterHttpClient>}
 *
 * @example
 * import { createClientFromSession } from './playwright-session.js';
 * import { scrapeProfile } from './profile.js';
 *
 * const client = await createClientFromSession();
 * const profile = await scrapeProfile(client, 'elonmusk');
 */
export async function createClientFromSession(options = {}) {
  let TwitterHttpClient;
  try {
    ({ TwitterHttpClient } = await import('./client.js'));
  } catch {
    throw new Error('TwitterHttpClient not found — ensure client.js is present');
  }

  const headers = await harvestSession(options);

  // Extract the cookie string and build a client from it
  const cookie = headers['cookie'] || '';
  return new TwitterHttpClient({ cookies: cookie });
}
