// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Fleet Runner
 *
 * Drives one task across N X/Twitter accounts, each egressing its own sticky
 * proxy IP. Health-buckets accounts through the proxy before running anything,
 * caps concurrency, jitters actions, parks limited/dead accounts and writes a
 * per-run JSON report.
 *
 * The per-account unit (`buildScraperForAccount` + `runTask`) is deliberately
 * standalone so a Bull worker can later call `runTask` unchanged.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { createHttpScraper } from '../scrapers/twitter/http/index.js';
import { AuthError, RateLimitError, TwitterApiError } from '../scrapers/twitter/http/errors.js';
import { USER_AGENTS, GRAPHQL, buildGraphQLVariables } from '../scrapers/twitter/http/endpoints.js';

import { makeProxiedFetch, closeFetch, fetchPublicIp, proxySelfTest, redactProxy } from './proxiedFetch.js';
import { loadAccounts, validateAccount, normalizeAccount, updateAccountStatus } from './accountStore.js';
import { TASKS, listTasks } from './tasks.js';

export { redactProxy };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RUNS_DIR = path.join(os.homedir(), '.xactions', 'fleet-runs');

/**
 * Session-auth probe. The legacy REST `verify_credentials.json` 404s on every host
 * for a cookie session (it is an OAuth1 endpoint), so we probe an AUTHENTICATED
 * GraphQL call the fleet's own reads use: HomeTimeline (the viewer's own feed) is
 * denied to guests and needs no handle. A guest / dead session comes back with a
 * `Could not authenticate you` (code 32) error instead of a timeline.
 */
const AUTH_PROBE = GRAPHQL.HomeTimeline;

const DEFAULT_CONCURRENCY = 5;
const JITTER_MIN_MS = 1000;
const JITTER_MAX_MS = 3000;
const STAGGER_STEP_MS = 400;

/** Arrays longer than this are summarised in the run report instead of embedded. */
const REPORT_ARRAY_LIMIT = 200;

// ---------------------------------------------------------------------------
// Rate-limit strategy
// ---------------------------------------------------------------------------

/**
 * Rate-limit signal that ESCAPES `client.request()`'s retry loop immediately.
 *
 * The client rethrows any `TwitterApiError` that is not a `RateLimitError`
 * (client.js:227-232). A plain `RateLimitError` instead falls through to the
 * network-retry branch, costing 3 extra requests and ~7s of sleep against an
 * account X has already throttled — which escalates a soft limit into a lock.
 */
export class FleetRateLimit extends TwitterApiError {
  constructor(endpoint, resetAt) {
    super(`Rate limited on ${endpoint}`, { status: 429, endpoint });
    this.name = 'FleetRateLimit';
    this.resetAt = resetAt;
  }
}

const FLEET_RATE_LIMIT_STRATEGY = {
  onRateLimit: ({ endpoint, resetAt }) => {
    throw new FleetRateLimit(endpoint, resetAt);
  },
};

/** True for either rate-limit shape (ours, or one raised deeper in the library). */
const isRateLimited = (error) => error instanceof FleetRateLimit || error instanceof RateLimitError;

// ---------------------------------------------------------------------------
// Small helpers (folded in — nothing importable exists for these)
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Random integer in [min, max]. */
const jitter = (min = JITTER_MIN_MS, max = JITTER_MAX_MS) =>
  Math.floor(min + Math.random() * (max - min));

/**
 * Deterministically pick a stable user-agent for a handle (FR-011).
 * Same handle → same UA on every run, without needing a write to the store.
 *
 * @param {string} handle
 * @returns {string}
 */
function stableUserAgent(handle) {
  let hash = 2166136261;
  for (const char of String(handle)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return USER_AGENTS[Math.abs(hash) % USER_AGENTS.length];
}

/**
 * Bounded worker pool draining a fixed queue (CAP intent of streaming/browserPool.js).
 * A worker rejection is contained: it becomes that item's result rather than
 * aborting `Promise.all` and discarding every sibling's completed work.
 *
 * @param {Array} items
 * @param {number} limit
 * @param {(item: any, index: number) => Promise<any>} worker
 * @returns {Promise<Array>} results in input order
 */
async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const drain = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        results[index] = { poolError: error?.message ?? String(error) };
      }
    }
  };

  const workers = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workers }, drain));
  return results;
}

/** Run a side-effect that must never sink the real result (status persist, jitter, teardown). */
async function bestEffort(label, fn) {
  try {
    await fn();
  } catch (error) {
    console.log(`⚠️ ${label} failed (ignored): ${error.message}`);
  }
}

/**
 * Shrink a task payload for the on-disk report.
 * A 40-account `scrapeFollowers --limit 1000` would otherwise write tens of MB
 * of follower records to `~/.xactions/fleet-runs/`. The full payload stays on
 * the in-memory return value.
 *
 * @param {*} data
 * @returns {*}
 */
function summarizeData(data) {
  if (data == null || typeof data !== 'object') return data ?? null;
  if (Array.isArray(data)) {
    if (data.length <= REPORT_ARRAY_LIMIT) return data;
    return { count: data.length, truncated: true, sample: data.slice(0, 3) };
  }
  return data;
}

// ---------------------------------------------------------------------------
// Per-account unit
// ---------------------------------------------------------------------------

/**
 * Build a scraper bound to one account's proxy egress.
 *
 * Deliberately built WITHOUT `cookies`: `createHttpScraper` would then run
 * `TwitterAuth.loginWithCookies`, whose internal validation egresses via
 * `globalThis.fetch` — the laptop's real IP — because TwitterAuth never picks up
 * the injected fetch. Cookies are installed offline via `client.setCookies`
 * instead, and the session is verified by a PROXIED probe (`healthProbe`).
 *
 * @param {Object} account - normalised account record
 * @param {Object} [options]
 * @param {boolean} [options.debug=false]
 * @returns {Promise<{scraper: Object, proxiedFetch: Function, userAgent: string}>}
 * @throws {Error} when the proxy cannot be built (caller parks the account)
 */
export async function buildScraperForAccount(account, { debug = false } = {}) {
  const proxiedFetch = await makeProxiedFetch(account.proxyUrl);
  const userAgent = account.userAgent || stableUserAgent(account.handle);

  const scraper = await createHttpScraper({
    fetch: proxiedFetch,
    userAgent,
    maxRetries: 3,
    rateLimitStrategy: FLEET_RATE_LIMIT_STRATEGY,
    debug,
  });

  scraper.client.setCookies(account.cookies);

  return { scraper, proxiedFetch, userAgent };
}

/**
 * Probe the session THROUGH the account's proxy and bucket the result.
 *
 * @param {Object} scraper - from buildScraperForAccount
 * @returns {Promise<{alive: boolean, status: string, reason: string|null, screenName: string|null}>}
 */
export async function healthProbe(scraper) {
  try {
    const vars = buildGraphQLVariables('HomeTimeline', { count: 1 });
    const res = await scraper.client.graphql(AUTH_PROBE.queryId, AUTH_PROBE.operationName, vars);
    const body = res?.data ?? res;

    // A GraphQL 200 can still carry an auth error in the body — inspect it.
    const errors = body?.errors ?? null;
    if (errors?.length) {
      const authRejected = errors.some(
        (e) => e.code === 32 || /authenticate|bad guest|not authorized/i.test(e.message ?? '')
      );
      if (authRejected) {
        return { alive: false, status: 'expired', reason: 'auth-rejected', screenName: null };
      }
      return { alive: false, status: 'invalid', reason: errors.map((e) => e.message).join('; '), screenName: null };
    }

    return { alive: true, status: 'active', reason: null, screenName: null };
  } catch (error) {
    if (isRateLimited(error)) {
      // Park, do NOT kill — a 429 at startup says nothing about the credential.
      return { alive: false, status: 'limited', reason: 'rate-limited', screenName: null };
    }
    if (error instanceof AuthError) {
      const reason = error.status === 401 ? 'expired' : 'forbidden';
      return { alive: false, status: reason, reason, screenName: null };
    }
    return { alive: false, status: 'invalid', reason: error.message, screenName: null };
  }
}

/**
 * Resolve a claimed handle to its live account (rest_id + screen_name), or null.
 *
 * Every REST who-am-I endpoint 404s for a cookie session, so session identity
 * cannot be read directly. This instead confirms the CLAIMED handle is a live,
 * non-suspended account — used both as a doctor signal and as the pre-check before
 * a write (the write additionally binds session→handle by reading the author off
 * the CreateTweet response). Reads the CORRECT `resp.data.data.user.result` path,
 * which the scraper's own `resolveUserId` gets wrong.
 *
 * @param {Object} scraper
 * @param {string} handle
 * @returns {Promise<{restId: string|null, screenName: string|null, reason: string|null}>}
 */
export async function resolveHandleRestId(scraper, handle) {
  try {
    const { queryId, operationName } = GRAPHQL.UserByScreenName;
    const res = await scraper.client.graphql(queryId, operationName, {
      screen_name: String(handle).replace(/^@/, ''),
      withSafetyModeUserFields: true,
    });
    const body = res?.data ?? res;
    const result = body?.data?.user?.result ?? body?.user?.result ?? null;
    if (!result) return { restId: null, screenName: null, reason: 'no such screen_name (renamed/deleted)' };
    if (result.__typename === 'UserUnavailable') {
      return { restId: null, screenName: null, reason: `unavailable: ${result.reason ?? 'suspended'}` };
    }
    return {
      restId: result.rest_id ?? null,
      screenName: result.legacy?.screen_name ?? result.core?.screen_name ?? null,
      reason: null,
    };
  } catch (error) {
    return { restId: null, screenName: null, reason: `${error.name}: ${error.message}` };
  }
}

/**
 * Pull the author's handle out of a CreateTweet result — this is the session's
 * REAL identity, observed from the tweet it just created (no who-am-I endpoint
 * exists). Used to bind session→handle after a write and roll back a mismatch.
 *
 * @param {Object} tweetResult - the object returned by scraper.postTweet
 * @returns {string|null}
 */
export function authorHandleOf(tweetResult) {
  const user =
    tweetResult?.core?.user_results?.result ??
    tweetResult?.author ??
    tweetResult?.user_results?.result ??
    null;
  return user?.legacy?.screen_name ?? user?.core?.screen_name ?? user?.screen_name ?? null;
}

/**
 * Run one task for one account. Never throws.
 *
 * `result.status` is set only when the OUTCOME SAYS SOMETHING ABOUT THE ACCOUNT
 * (auth, rate limit). A task-level failure — a bad param, a missing target —
 * leaves it undefined, so the caller must not rewrite account status from it.
 *
 * @param {Object} account - normalised account record
 * @param {string} taskName - key of TASKS
 * @param {Object} [params] - task params
 * @param {Object} [ctx] - { scraper } reused from the health pass, else built here
 * @returns {Promise<Object>} result envelope
 */
export async function runTask(account, taskName, params = {}, ctx = {}) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const envelope = { handle: account.handle, taskName, ok: false, startedAt, durationMs: 0 };

  const task = TASKS[taskName];
  if (!task) {
    return {
      ...envelope,
      skipped: true,
      reason: 'unknown-task',
      error: `❌ Unknown task "${taskName}" — available: ${listTasks().join(', ')}`,
      durationMs: Date.now() - started,
    };
  }

  let owned = null;
  try {
    let scraper = ctx.scraper;
    if (!scraper) {
      owned = await buildScraperForAccount(account, { debug: ctx.debug });
      scraper = owned.scraper;
    }

    const data = await task(scraper, account, params);
    return { ...envelope, ok: true, data, durationMs: Date.now() - started };
  } catch (error) {
    const failed = { ...envelope, ok: false, error: error.message, durationMs: Date.now() - started };

    if (isRateLimited(error)) {
      // FR-010: park the account and free its slot; the fleet keeps moving.
      return { ...failed, reason: 'rate-limited', status: 'limited' };
    }

    if (error instanceof AuthError) {
      // FR-012: re-probe before bucketing an account dead — a 403 can come from
      // the target rather than the session. NOTE: this does NOT recover a rotated
      // ct0; the client never reads Set-Cookie, so the probe resends the same
      // token. ct0 auto-refresh is deferred (FR-D4).
      const scraper = ctx.scraper ?? owned?.scraper;
      if (scraper) {
        const reprobe = await healthProbe(scraper);
        if (reprobe.alive) {
          return { ...failed, reason: 'auth-transient', status: 'active' };
        }
        return { ...failed, reason: reprobe.reason ?? 'auth-failed', status: reprobe.status };
      }
      return { ...failed, reason: 'auth-failed', status: 'invalid' };
    }

    // Task-level failure — deliberately no `status`: the account is fine.
    return { ...failed, reason: 'task-error' };
  } finally {
    if (owned) await bestEffort(`teardown ${account.handle}`, () => closeFetch(owned.proxiedFetch));
  }
}

// ---------------------------------------------------------------------------
// Fleet
// ---------------------------------------------------------------------------

/**
 * Load + validate + filter accounts for a run.
 *
 * @param {{ only?: string }} [options]
 * @returns {Promise<{accounts: Object[], all: Object[], invalid: Object[]}>}
 */
async function selectAccounts({ only } = {}) {
  const raw = await loadAccounts();
  const accounts = [];
  const invalid = [];

  raw.forEach((entry, index) => {
    const { valid, errors } = validateAccount(entry);
    if (!valid) {
      // Report by index — a record too broken to validate may have no usable handle.
      invalid.push({ handle: entry?.handle ? String(entry.handle) : `record #${index}`, errors });
      return;
    }
    accounts.push(normalizeAccount(entry));
  });

  // `all` is the whole valid store — the fleet's proxy posture must be judged on
  // it, never on a --only subset (else `--only <un-proxied>` silently goes direct).
  if (!only) return { accounts, all: accounts, invalid };

  const wanted = String(only).replace(/^@/, '').toLowerCase();
  return { accounts: accounts.filter((a) => a.handle === wanted), all: accounts, invalid };
}

/**
 * Health-bucket every account through its own proxy.
 * Builds the scraper once and hands it to the task pass.
 *
 * @param {Object[]} accounts
 * @param {Object} options
 * @returns {Promise<Object[]>} one entry per account
 */
async function healthPass(accounts, { concurrency, baselineIp, debug, allowDirect, strictProxy }) {
  return runPool(accounts, concurrency, async (account) => {
    const entry = {
      account,
      scraper: null,
      proxiedFetch: null,
      alive: false,
      status: 'invalid',
      reason: null,
      proxy: redactProxy(account.proxyUrl),
      egressIp: null,
    };

    // Co-location ban: in strict mode an account without a proxy never runs direct.
    if (!account.proxyUrl && strictProxy && !allowDirect) {
      entry.status = 'paused';
      entry.reason = 'no-proxy';
      console.log(`⚠️ @${account.handle} parked — no proxy configured (co-location ban)`);
      return entry;
    }

    if (account.proxyUrl) {
      const test = await proxySelfTest(account.proxyUrl, { baselineIp });
      if (test.ip && baselineIp && test.ip === baselineIp) {
        // Definitive co-location: the proxy is transparent and would leak our IP.
        entry.status = 'paused';
        entry.reason = 'no-proxy';
        console.log(`⚠️ @${account.handle} parked — proxy is transparent (egress IP == baseline)`);
        return entry;
      }
      if (test.ok) {
        entry.egressIp = test.ip;
      } else {
        // Inconclusive (ipify outage, timeout). Do NOT park on a third-party
        // hiccup: the health probe below runs through the SAME dispatcher, so a
        // genuinely dead proxy still fails there and can never reach X directly.
        console.log(`⚠️ @${account.handle} proxy self-test inconclusive (${test.error}) — deferring to health probe`);
      }
    }

    try {
      const built = await buildScraperForAccount(account, { debug });
      entry.scraper = built.scraper;
      entry.proxiedFetch = built.proxiedFetch;
    } catch (error) {
      entry.status = 'paused';
      entry.reason = 'no-proxy';
      console.log(`⚠️ @${account.handle} parked — proxy unusable: ${error.message}`);
      return entry;
    }

    const probe = await healthProbe(entry.scraper);
    entry.alive = probe.alive;
    entry.status = probe.status;
    entry.reason = probe.reason;

    const icon = probe.alive ? '✅' : probe.status === 'limited' ? '⚠️' : '❌';
    const where = account.proxyUrl ? ` via ${entry.egressIp ?? entry.proxy}` : ' (direct)';
    console.log(`${icon} @${account.handle} → ${probe.status}${probe.reason ? ` (${probe.reason})` : ''}${where}`);

    return entry;
  });
}

/**
 * Persist an account's status from a task result, if the result says anything
 * about the ACCOUNT. Task-level failures (bad params, missing target) leave the
 * stored status untouched — otherwise one typo in `--params` would rewrite every
 * healthy account in the store to `error`.
 *
 * @param {Object} result - envelope from runTask
 * @returns {Promise<void>}
 */
export async function persistOutcome(result) {
  const status = result.status ?? (result.ok ? 'active' : null);
  if (!status) return;
  const extra = result.reason ? { reason: result.reason } : {};
  await updateAccountStatus(result.handle, status, extra);
}

/**
 * Run one task across the whole fleet.
 *
 * @param {Object} [options]
 * @param {string} [options.taskName='ownTweets']
 * @param {Object} [options.params]
 * @param {string} [options.only] - restrict to a single handle
 * @param {boolean} [options.dryRun=false]
 * @param {boolean} [options.healthOnly=false] - bucket accounts, run no task
 * @param {boolean} [options.allowDirect=false] - permit un-proxied accounts in a mixed fleet
 * @param {number} [options.concurrency]
 * @param {boolean} [options.debug=false]
 * @returns {Promise<Object>} run report
 */
export async function runFleet(options = {}) {
  const {
    taskName = 'homeTimeline',
    params = {},
    only,
    dryRun = false,
    healthOnly = false,
    allowDirect = false,
    debug = false,
  } = options;

  const cap = options.concurrency ?? parseInt(process.env.XACTIONS_FLEET_CONCURRENCY ?? '', 10);
  const concurrencyCap = Number.isFinite(cap) && cap > 0 ? cap : DEFAULT_CONCURRENCY;

  const startedAt = new Date().toISOString();
  const runId = startedAt.replace(/[:.]/g, '-');

  if (!healthOnly && !TASKS[taskName]) {
    throw new Error(`❌ Unknown task "${taskName}" — available: ${listTasks().join(', ')}`);
  }

  const { accounts, all, invalid } = await selectAccounts({ only });
  for (const bad of invalid) {
    console.log(`❌ ${bad.handle} skipped — invalid record: ${bad.errors.join('; ')}`);
  }
  if (accounts.length === 0) {
    console.log('⚠️ No usable accounts selected.');
  }

  // A fleet is "strict" as soon as ANY account IN THE STORE declares a proxy:
  // from that point an un-proxied account is a co-location risk, not a test.
  // Judged on `all`, not the --only subset, so narrowing the run can never
  // downgrade the fleet into direct egress.
  const strictProxy = all.some((a) => a.proxyUrl);
  if (!strictProxy && accounts.length > 0) {
    console.log('⚠️ PROXY-LESS TEST MODE — no account declares a proxyUrl; every request exits this machine\'s IP.');
  }

  const reportedTask = healthOnly ? 'health' : taskName;

  if (dryRun) {
    console.log(`\n🔄 Dry run — task "${reportedTask}", ${accounts.length} account(s), cap ${concurrencyCap}`);
    for (const account of accounts) {
      const proxy = redactProxy(account.proxyUrl) ?? (strictProxy && !allowDirect ? 'NONE → would park' : 'NONE → direct');
      console.log(`   @${account.handle}  proxy: ${proxy}  ua: ${(account.userAgent || stableUserAgent(account.handle)).slice(0, 40)}…`);
    }
    console.log(`   params: ${JSON.stringify(params)}`);
    return {
      runId,
      taskName: reportedTask,
      params,
      dryRun: true,
      concurrency: concurrencyCap,
      startedAt,
      finishedAt: new Date().toISOString(),
      totals: { alive: 0, dead: 0, ok: 0, fail: 0, skipped: accounts.length },
      results: [],
    };
  }

  // Baseline egress IP — what "direct" looks like, so a transparent proxy is detectable.
  let baselineIp = null;
  if (accounts.length > 0) {
    try {
      baselineIp = await fetchPublicIp(globalThis.fetch);
      console.log(`🔄 Baseline (un-proxied) egress IP: ${baselineIp}`);
    } catch (error) {
      console.log(`⚠️ Could not determine baseline IP: ${error.message}`);
    }

    // Without a baseline, a transparent proxy is indistinguishable from a working
    // one — the co-location guard would be disarmed silently. Refuse instead.
    if (strictProxy && !baselineIp) {
      throw new Error(
        '❌ Could not determine the baseline egress IP, so a transparent proxy would be undetectable. ' +
          'Refusing to run a proxied fleet blind — retry once the network settles.'
      );
    }
  }

  const entries = await healthPass(accounts, {
    concurrency: concurrencyCap,
    baselineIp,
    debug,
    allowDirect,
    strictProxy,
  });

  const alive = entries.filter((e) => e.alive);
  const dead = entries.filter((e) => !e.alive);

  // FR-008: never more accounts in flight than there are live egress identities.
  // In strict mode every alive account owns a proxy (the rest are parked above),
  // so the account count IS the egress-IP count.
  const effectiveConcurrency = Math.max(1, Math.min(concurrencyCap, alive.length || 1));

  console.log(
    `\n🔄 Health: ${alive.length} alive / ${dead.length} parked — concurrency ${effectiveConcurrency} (cap ${concurrencyCap})`
  );

  const results = [];

  // Persist every parked account's status, and record it as a skipped result.
  for (const entry of dead) {
    await bestEffort(`status persist ${entry.account.handle}`, () =>
      updateAccountStatus(entry.account.handle, entry.status, entry.reason ? { reason: entry.reason } : {})
    );
    results.push({
      handle: entry.account.handle,
      taskName: reportedTask,
      ok: false,
      skipped: true,
      reason: entry.reason ?? entry.status,
      error: null,
      startedAt: new Date().toISOString(),
      durationMs: 0,
    });
  }

  if (healthOnly) {
    for (const entry of alive) {
      await bestEffort(`status persist ${entry.account.handle}`, () =>
        updateAccountStatus(entry.account.handle, 'active')
      );
      results.push({
        handle: entry.account.handle,
        taskName: 'health',
        ok: true,
        skipped: false,
        reason: null,
        error: null,
        egressIp: entry.egressIp,
        startedAt: new Date().toISOString(),
        durationMs: 0,
      });
    }
  } else if (alive.length > 0) {
    const taskResults = await runPool(alive, effectiveConcurrency, async (entry, index) => {
      // Stagger only the opening wave — beyond it, accounts start as slots free up.
      if (index < effectiveConcurrency) {
        await bestEffort('stagger', () => sleep(jitter(0, (index + 1) * STAGGER_STEP_MS)));
      }

      const result = await runTask(entry.account, taskName, params, { scraper: entry.scraper, debug });

      await bestEffort(`status persist ${entry.account.handle}`, () => persistOutcome(result));
      await bestEffort('jitter', () => sleep(jitter()));

      const icon = result.ok ? '✅' : result.reason === 'rate-limited' ? '⚠️' : '❌';
      console.log(
        `${icon} @${result.handle} ${taskName} ${result.ok ? 'ok' : result.error} (${result.durationMs}ms)`
      );
      return result;
    });
    results.push(...taskResults);
  }

  // FR-015: close every undici pool or the CLI hangs instead of exiting 0.
  for (const entry of entries) {
    if (entry.proxiedFetch) {
      await bestEffort(`teardown ${entry.account.handle}`, () => closeFetch(entry.proxiedFetch));
    }
  }

  const report = {
    runId,
    taskName: reportedTask,
    params,
    concurrency: effectiveConcurrency,
    startedAt,
    finishedAt: new Date().toISOString(),
    baselineIp,
    totals: {
      alive: alive.length,
      dead: dead.length,
      ok: results.filter((r) => r.ok).length,
      fail: results.filter((r) => !r.ok && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
    },
    results: results.map((r) => ('data' in r ? { ...r, data: summarizeData(r.data) } : r)),
  };

  try {
    await fs.mkdir(RUNS_DIR, { recursive: true });
    const file = path.join(RUNS_DIR, `${runId}.json`);
    await fs.writeFile(file, JSON.stringify(report, null, 2));
    console.log(`\n✅ Report → ${file}`);
  } catch (error) {
    // For write tasks the report is the only record of what was actually sent —
    // losing it silently is not acceptable. Dump it so nothing is lost.
    console.log(`❌ Could not write the run report (${error.message}) — dumping it here instead:`);
    console.log(JSON.stringify(report, null, 2));
    report.reportWriteFailed = true;
  }

  return report;
}
