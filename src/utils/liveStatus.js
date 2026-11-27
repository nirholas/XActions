// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The nightly live check's status file, and every decision made from it.
 *
 * `scripts/live-check.mjs` runs the real read paths against x.com once a night
 * and publishes three files on the repository's `status` branch:
 *
 *   status.json   this run: one row per check, the regression state, the
 *                 package version and a timestamp. Read by the status page,
 *                 by `xactions doctor`, and by the next night's run.
 *   badge.json    the same result in the shields.io endpoint schema, for the
 *                 README badge. shields rejects any key outside its schema, so
 *                 the badge cannot read status.json directly.
 *   history.json  one summary line per run, newest last, for the status page.
 *
 * Everything here is pure, so the regression rule, the `limited` case and the
 * issue plan are tested without a network.
 *
 * Check statuses:
 *   pass     the feature returned real rows
 *   fail     it did not
 *   limited  X rate limited the probe; inconclusive, never a regression
 *   skipped  not run (no browser, or a logged-in check with no test account)
 *
 * The regression rule: a check regresses when it fails now and its last
 * conclusive result (pass or fail, looking through limited and skipped runs)
 * was a pass. A regression stays open until that check passes again.
 *
 * @module utils/liveStatus
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

/** Where the files are published: an orphan branch, so main gets no nightly commit. */
export const LIVE_STATUS_REPO = 'nirholas/XActions';
export const LIVE_STATUS_BRANCH = 'status';
const RAW_BASE = `https://raw.githubusercontent.com/${LIVE_STATUS_REPO}/${LIVE_STATUS_BRANCH}`;
export const LIVE_STATUS_URL = `${RAW_BASE}/status.json`;
export const LIVE_BADGE_URL = `${RAW_BASE}/badge.json`;
export const LIVE_HISTORY_URL = `${RAW_BASE}/history.json`;

/** The human page that renders status.json. */
export const LIVE_STATUS_PAGE = 'https://xactions.app/status';

/** The label on the one issue the workflow keeps open while something is broken. */
export const ISSUE_LABEL = 'x-changed';

/** Runs kept in history.json: two months of nightly runs. */
export const HISTORY_LIMIT = 60;

export const STATUS_FILE_VERSION = 1;
export const CHECK_STATUSES = Object.freeze(['pass', 'fail', 'limited', 'skipped']);
const CONCLUSIVE = new Set(['pass', 'fail']);

/**
 * @typedef {'pass'|'fail'|'limited'|'skipped'} CheckStatus
 *
 * @typedef {object} CheckResult
 * @property {string} id
 * @property {string} label
 * @property {string} feature   What a user would notice break
 * @property {'guest'|'session'} tier
 * @property {CheckStatus} status
 * @property {number} ms
 * @property {string} detail
 * @property {Array<object>} [items]  Per-item results, e.g. one per selector
 *
 * @typedef {CheckResult & {lastPassedAt: string|null, lastConclusive: 'pass'|'fail'|null}} StatusCheck
 *
 * @typedef {object} LiveStatus
 * @property {1} version
 * @property {string} generatedAt
 * @property {string} date
 * @property {{name: string, version: string}} package
 * @property {string} node
 * @property {number} durationMs
 * @property {boolean} ok
 * @property {{total: number, checked: number, pass: number, fail: number, limited: number, skipped: number}} summary
 * @property {string[]} regressions      Checks that regressed in this run
 * @property {string[]} openRegressions  Regressed and not passed since
 * @property {StatusCheck[]} checks
 * @property {{url?: string, sha?: string}} [run]
 */

/**
 * Was this error X rate limiting us. A rate limit says nothing about whether
 * the feature works, so it is recorded as `limited` rather than `fail`.
 *
 * Recognises the two clients' errors (`RATE_LIMITED` from src/client,
 * `RateLimitError` from the HTTP scraper), any error carrying HTTP 429, and
 * X's own "Rate limit exceeded" wording.
 *
 * @param {unknown} error
 * @returns {'limited'|'fail'}
 */
export function classifyError(error) {
  if (!error || typeof error !== 'object') return 'fail';
  const e = /** @type {Record<string, any>} */ (error);
  if (e.code === 'RATE_LIMITED' || e.name === 'RateLimitError') return 'limited';
  if (e.status === 429 || e.httpStatus === 429) return 'limited';
  if (typeof e.message === 'string' && /\b429\b|rate[ -]?limit/i.test(e.message)) return 'limited';
  return 'fail';
}

/**
 * Read the previous run's checks by id, ignoring a file that is not ours.
 * @param {unknown} previous
 * @returns {Map<string, StatusCheck>}
 */
function previousChecks(previous) {
  const map = new Map();
  if (!previous || typeof previous !== 'object') return map;
  const p = /** @type {Record<string, any>} */ (previous);
  if (p.version !== STATUS_FILE_VERSION || !Array.isArray(p.checks)) return map;
  for (const c of p.checks) {
    if (c && typeof c.id === 'string') map.set(c.id, c);
  }
  return map;
}

/**
 * The last pass or fail a check recorded, looking through limited and skipped.
 * @param {StatusCheck|undefined} check
 * @returns {'pass'|'fail'|null}
 */
function conclusiveOf(check) {
  if (!check) return null;
  if (CONCLUSIVE.has(check.status)) return /** @type {'pass'|'fail'} */ (check.status);
  return CONCLUSIVE.has(check.lastConclusive) ? check.lastConclusive : null;
}

/**
 * Assemble status.json from this run's check results and the previous file.
 *
 * @param {object} input
 * @param {CheckResult[]} input.checks
 * @param {unknown} [input.previous]  The last published status.json, or null
 * @param {string} input.generatedAt  ISO timestamp of this run
 * @param {string} input.packageVersion
 * @param {string} input.node
 * @param {number} input.durationMs
 * @param {{url?: string, sha?: string}} [input.run]
 * @returns {LiveStatus}
 */
export function buildStatus({ checks, previous = null, generatedAt, packageVersion, node, durationMs, run }) {
  const seen = new Set();
  for (const c of checks) {
    if (seen.has(c.id)) throw new Error(`Duplicate check id in live check results: ${c.id}`);
    seen.add(c.id);
  }

  const prior = previousChecks(previous);
  const regressions = [];

  const out = checks.map((c) => {
    const before = prior.get(c.id);
    const priorConclusive = conclusiveOf(before);
    if (c.status === 'fail' && priorConclusive === 'pass') regressions.push(c.id);
    return {
      ...c,
      lastPassedAt: c.status === 'pass' ? generatedAt : (before?.lastPassedAt ?? null),
      lastConclusive: CONCLUSIVE.has(c.status) ? /** @type {'pass'|'fail'} */ (c.status) : priorConclusive,
    };
  });

  const status = Object.fromEntries(out.map((c) => [c.id, c.status]));
  const priorOpen = Array.isArray(/** @type {any} */ (previous)?.openRegressions) && prior.size > 0
    ? /** @type {any} */ (previous).openRegressions.filter((id) => typeof id === 'string')
    : [];
  const openRegressions = [...new Set([...priorOpen, ...regressions])]
    .filter((id) => id in status && status[id] !== 'pass');

  const count = (s) => out.filter((c) => c.status === s).length;
  const summary = {
    total: out.length,
    checked: count('pass') + count('fail'),
    pass: count('pass'),
    fail: count('fail'),
    limited: count('limited'),
    skipped: count('skipped'),
  };

  return {
    version: STATUS_FILE_VERSION,
    generatedAt,
    date: generatedAt.slice(0, 10),
    package: { name: 'xactions', version: packageVersion },
    node,
    durationMs,
    ok: summary.fail === 0,
    summary,
    regressions,
    openRegressions,
    checks: out,
    ...(run ? { run } : {}),
  };
}

/**
 * Check a parsed status.json. Returns the problems found, empty when valid.
 * The status page, doctor and the issue step all refuse a file that fails this.
 *
 * @param {unknown} status
 * @returns {string[]}
 */
export function validateStatus(status) {
  if (!status || typeof status !== 'object') return ['status is not an object'];
  const s = /** @type {Record<string, any>} */ (status);
  const problems = [];
  if (s.version !== STATUS_FILE_VERSION) problems.push(`version must be ${STATUS_FILE_VERSION}`);
  if (typeof s.generatedAt !== 'string' || Number.isNaN(Date.parse(s.generatedAt))) problems.push('generatedAt must be an ISO timestamp');
  if (typeof s.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) problems.push('date must be YYYY-MM-DD');
  if (typeof s.package?.version !== 'string') problems.push('package.version must be a string');
  if (typeof s.ok !== 'boolean') problems.push('ok must be a boolean');
  for (const key of ['total', 'checked', 'pass', 'fail', 'limited', 'skipped']) {
    if (!Number.isInteger(s.summary?.[key])) problems.push(`summary.${key} must be an integer`);
  }
  for (const key of ['regressions', 'openRegressions']) {
    if (!Array.isArray(s[key])) problems.push(`${key} must be a list`);
  }
  if (!Array.isArray(s.checks)) {
    problems.push('checks must be a list');
    return problems;
  }
  s.checks.forEach((c, i) => {
    const where = `checks[${i}]`;
    if (!c || typeof c !== 'object') {
      problems.push(`${where} is not an object`);
      return;
    }
    for (const key of ['id', 'label', 'feature', 'detail']) {
      if (typeof c[key] !== 'string') problems.push(`${where}.${key} must be a string`);
    }
    if (!['guest', 'session'].includes(c.tier)) problems.push(`${where}.tier must be guest or session`);
    if (!CHECK_STATUSES.includes(c.status)) problems.push(`${where}.status must be one of ${CHECK_STATUSES.join(', ')}`);
    if (!Number.isFinite(c.ms) || c.ms < 0) problems.push(`${where}.ms must be a non-negative number`);
    if (c.lastPassedAt !== null && typeof c.lastPassedAt !== 'string') problems.push(`${where}.lastPassedAt must be a timestamp or null`);
    if (c.items !== undefined && !Array.isArray(c.items)) problems.push(`${where}.items must be a list`);
  });
  return problems;
}

/**
 * The shields.io endpoint document for the README badge. Only keys in
 * shields' schema: its validator rejects anything else.
 *
 * @param {LiveStatus} status
 * @returns {{schemaVersion: 1, label: string, message: string, color: string, cacheSeconds: number}}
 */
export function buildBadge(status) {
  const { pass, checked } = status.summary;
  let color = 'brightgreen';
  if (status.openRegressions.length > 0) color = 'red';
  else if (status.summary.fail > 0) color = 'yellow';
  return {
    schemaVersion: 1,
    label: 'verified against x.com',
    message: `${status.date}, ${pass}/${checked} pass`,
    color,
    cacheSeconds: 3600,
  };
}

/**
 * Append this run's summary to history.json, newest last, trimmed.
 *
 * @param {unknown} history  The published history.json, or anything else
 * @param {LiveStatus} status
 * @param {number} [limit=HISTORY_LIMIT]
 * @returns {Array<{generatedAt: string, date: string, pass: number, fail: number, limited: number, skipped: number, failing: string[], regressions: string[]}>}
 */
export function appendHistory(history, status, limit = HISTORY_LIMIT) {
  const list = Array.isArray(history) ? history.filter((e) => e && typeof e.generatedAt === 'string') : [];
  const entry = {
    generatedAt: status.generatedAt,
    date: status.date,
    pass: status.summary.pass,
    fail: status.summary.fail,
    limited: status.summary.limited,
    skipped: status.summary.skipped,
    failing: status.checks.filter((c) => c.status === 'fail').map((c) => c.id),
    regressions: [...status.regressions],
  };
  return [...list, entry].slice(-limit);
}

/**
 * Exit code for the probe: non-zero only when a check that passed last time
 * fails now. A failure that was already known is on the status page, not a
 * reason to fail the run every night.
 *
 * @param {LiveStatus} status
 * @returns {0|1}
 */
export function exitCodeFor(status) {
  return status.regressions.length > 0 ? 1 : 0;
}

/**
 * Markdown list of the failing checks, new regressions marked.
 * @param {LiveStatus} status
 * @returns {string}
 */
function failingList(status) {
  const fresh = new Set(status.regressions);
  return status.checks
    .filter((c) => c.status === 'fail')
    .map((c) => {
      const since = c.lastPassedAt ? `, last passed ${c.lastPassedAt.slice(0, 10)}` : '';
      return `- ${fresh.has(c.id) ? '**new** ' : ''}\`${c.id}\` (${c.feature}): ${c.detail}${since}`;
    })
    .join('\n');
}

/**
 * Decide what the workflow does with the `x-changed` issue. Never more than
 * one: a new regression opens it, or comments on it when one is already open,
 * and it is closed once every regressed check has passed again.
 *
 * @param {object} input
 * @param {LiveStatus} input.status
 * @param {number|null} input.openIssue  Number of the open x-changed issue, if any
 * @param {string} [input.runUrl]
 * @returns {{action: 'none'} | {action: 'open', title: string, body: string} | {action: 'comment'|'close', issue: number, body: string}}
 */
export function planIssueAction({ status, openIssue, runUrl }) {
  const links = [runUrl ? `Run: ${runUrl}` : null, `Status page: ${LIVE_STATUS_PAGE}`].filter(Boolean).join('\n');

  if (status.regressions.length > 0) {
    const report = [
      `The nightly check against x.com on ${status.date} (xactions ${status.package.version}) found checks that passed before and fail now.`,
      '',
      failingList(status),
      '',
      links,
    ].join('\n');
    if (openIssue) return { action: 'comment', issue: openIssue, body: report };
    return {
      action: 'open',
      title: `x.com changed: ${status.regressions.join(', ')} failing since ${status.date}`,
      body: [
        report,
        '',
        'This issue was opened by `.github/workflows/live-check.yml`. It gets a comment when another check breaks and is closed on its own when every check listed here passes again. Run it by hand with `gh workflow run live-check.yml`, or locally with `node scripts/live-check.mjs`.',
      ].join('\n'),
    };
  }

  if (openIssue && status.openRegressions.length === 0) {
    return {
      action: 'close',
      issue: openIssue,
      body: `All the checks that regressed pass again as of ${status.date} (xactions ${status.package.version}).\n\n${links}`,
    };
  }

  return { action: 'none' };
}

/**
 * Read the selector tables in docs/agents/selectors.md: `| Name | \`selector\` |`
 * rows under `## Section` headings.
 *
 * @param {string} markdown
 * @returns {Array<{section: string, name: string, selector: string}>}
 */
export function parseSelectorsDoc(markdown) {
  const rows = [];
  let section = '';
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      section = heading[1];
      continue;
    }
    const row = line.match(/^\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|\s*$/);
    if (row && section) rows.push({ section, name: row[1], selector: row[2] });
  }
  return rows;
}
