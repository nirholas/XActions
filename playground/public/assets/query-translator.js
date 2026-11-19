// GENERATED FILE. Do not edit.
// Source: src/codegen/queryTranslator.js
// Rebuild: node scripts/build-playground.mjs

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Query Translator
 *
 * One query, expressed in every interface XActions ships.
 *
 * The gap between "I tried the demo" and "I installed it" is usually a person
 * not knowing which of four entry points they want or what the equivalent
 * incantation is. This module closes that gap: give it a query descriptor and
 * it emits the exact command line, the exact Node.js program, the exact HTTP
 * request, and the exact sentence to say to an MCP-connected agent, all
 * producing the same answer.
 *
 * It is deliberately dependency-free and side-effect-free so the identical
 * file runs in Node (tests, the CLI) and in the browser (the playground page
 * imports it as a module). Do not add imports here.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://github.com/nirholas/XActions
 * @license Apache-2.0
 */

/** Default origin for the generated HTTP examples. */
export const DEFAULT_API_BASE = 'https://xactions.app';

/**
 * The queries the playground can run, and the shape of their inputs.
 *
 * `tier` is the honest constraint: X serves profiles and public user
 * timelines to a logged-out client and nothing else, so everything here is
 * built from those two endpoints. Search, followers and DMs need a session
 * and are documented as such rather than offered and then failing.
 */
export const QUERIES = Object.freeze({
  profile: {
    label: 'Profile',
    summary: 'Everything X publishes about an account: bio, counts, join date, verification.',
    tier: 'guest',
    icon: '👤',
    params: [{ name: 'username', type: 'string', required: true, placeholder: 'nasa', label: 'Username' }],
  },
  timeline: {
    label: 'Timeline',
    summary: 'Recent posts with likes, reposts, replies and views.',
    tier: 'guest',
    icon: '📜',
    params: [
      { name: 'username', type: 'string', required: true, placeholder: 'nasa', label: 'Username' },
      { name: 'limit', type: 'number', required: false, default: 20, min: 1, max: 50, label: 'Posts' },
    ],
  },
  report: {
    label: 'Account report',
    summary: 'Engagement rate, posting cadence, content mix, best hour, top posts. Computed from public data.',
    tier: 'guest',
    icon: '📊',
    params: [
      { name: 'username', type: 'string', required: true, placeholder: 'nasa', label: 'Username' },
      { name: 'limit', type: 'number', required: false, default: 50, min: 10, max: 100, label: 'Sample size' },
    ],
  },
  compare: {
    label: 'Compare',
    summary: 'Two to four accounts side by side on audience, output and engagement.',
    tier: 'guest',
    icon: '⚖️',
    params: [
      { name: 'users', type: 'list', required: true, placeholder: 'nasa, spacex', label: 'Usernames' },
      { name: 'limit', type: 'number', required: false, default: 30, min: 10, max: 100, label: 'Sample size' },
    ],
  },
});

/**
 * Normalise a username: strip a leading @, a full profile URL, and whitespace.
 * @param {string} raw
 * @returns {string}
 */
export function normalizeUsername(raw) {
  const text = String(raw || '').trim();
  const fromUrl = text.match(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i);
  if (fromUrl) return fromUrl[1];
  return text.replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, '');
}

/**
 * Parse a comma, space or newline separated list of usernames.
 * @param {string|string[]} raw
 * @returns {string[]} Deduplicated, normalised, empty entries removed
 */
export function normalizeUsernames(raw) {
  const parts = Array.isArray(raw) ? raw : String(raw || '').split(/[\s,]+/);
  const seen = new Set();
  const out = [];
  for (const part of parts) {
    const name = normalizeUsername(part);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
  }
  return out;
}

/**
 * Clamp a numeric parameter into the range its descriptor declares.
 * @param {*} value
 * @param {{default?: number, min?: number, max?: number}} spec
 * @returns {number}
 */
export function clampParam(value, spec) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return spec.default ?? spec.min ?? 1;
  return Math.min(Math.max(parsed, spec.min ?? 1), spec.max ?? Number.MAX_SAFE_INTEGER);
}

/**
 * Resolve raw user input into the validated parameters a query needs.
 *
 * @param {string} kind - A key of QUERIES
 * @param {Record<string, *>} input
 * @returns {{kind: string, username?: string, users?: string[], limit?: number}}
 * @throws {Error} When the query is unknown or a required parameter is empty
 */
export function resolveQuery(kind, input = {}) {
  const spec = QUERIES[kind];
  if (!spec) throw new Error(`Unknown query "${kind}". Expected one of: ${Object.keys(QUERIES).join(', ')}`);

  const resolved = { kind };

  for (const param of spec.params) {
    if (param.type === 'list') {
      const users = normalizeUsernames(input[param.name]);
      if (param.required && users.length < 2) {
        throw new Error('Give at least two usernames to compare, for example: nasa, spacex');
      }
      if (users.length > 4) throw new Error('Compare at most four accounts at once');
      resolved[param.name] = users;
    } else if (param.type === 'number') {
      resolved[param.name] = clampParam(input[param.name], param);
    } else {
      const value = normalizeUsername(input[param.name]);
      if (param.required && !value) throw new Error(`"${param.label}" is required`);
      resolved[param.name] = value;
    }
  }

  return resolved;
}

/**
 * The playground API path a resolved query maps to.
 * @param {object} query - Output of resolveQuery
 * @returns {string} Path with a leading slash, query string included
 */
export function apiPathFor(query) {
  switch (query.kind) {
    case 'profile':
      return `/api/playground/profile/${encodeURIComponent(query.username)}`;
    case 'timeline':
      return `/api/playground/timeline/${encodeURIComponent(query.username)}?limit=${query.limit}`;
    case 'report':
      return `/api/playground/report/${encodeURIComponent(query.username)}?limit=${query.limit}`;
    case 'compare':
      return `/api/playground/compare?users=${encodeURIComponent(query.users.join(','))}&limit=${query.limit}`;
    default:
      throw new Error(`No API path for query "${query.kind}"`);
  }
}

/**
 * A shareable playground URL for a resolved query.
 * @param {object} query
 * @param {string} [base='']
 * @returns {string}
 */
export function permalinkFor(query, base = '') {
  const params = new URLSearchParams({ q: query.kind });
  if (query.username) params.set('u', query.username);
  if (query.users) params.set('u', query.users.join(','));
  if (query.limit) params.set('n', String(query.limit));
  return `${base}/playground?${params.toString()}`;
}

/**
 * Read a resolved query back out of a playground URL.
 * @param {string|URLSearchParams} search
 * @returns {{kind: string, username?: string, users?: string, limit?: number}|null}
 */
export function queryFromSearch(search) {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const kind = params.get('q');
  if (!kind || !QUERIES[kind]) return null;
  const raw = params.get('u') || '';
  const limit = params.get('n');
  const input = { limit: limit ?? undefined };
  if (kind === 'compare') input.users = raw;
  else input.username = raw;
  try {
    return resolveQuery(kind, input);
  } catch {
    return null;
  }
}

// ============================================================================
// Snippet generation
// ============================================================================

/**
 * @param {object} query
 * @returns {string}
 */
function cliSnippet(query) {
  switch (query.kind) {
    case 'profile':
      return `npx xactions profile ${query.username}`;
    case 'timeline':
      return `npx xactions tweets ${query.username} --limit ${query.limit}`;
    case 'report':
      return `npx xactions analyze ${query.username} --limit ${query.limit}`;
    case 'compare':
      return `npx xactions analyze ${query.users.join(' ')} --limit ${query.limit}`;
    default:
      return '';
  }
}

/**
 * @param {object} query
 * @returns {string}
 */
function nodeSnippet(query) {
  const header = "import { Scraper } from 'xactions/client';\n\nconst scraper = new Scraper();\n";

  switch (query.kind) {
    case 'profile':
      return `${header}
const profile = await scraper.getProfile('${query.username}');

console.log(profile.name, profile.followersCount);`;

    case 'timeline':
      return `${header}
// Timelines are async generators, so a huge account can be stopped early.
for await (const tweet of scraper.getTweets('${query.username}', ${query.limit})) {
  console.log(tweet.likes, tweet.text);
}`;

    case 'report':
      return `import { Scraper } from 'xactions/client';
import { buildAccountReport } from 'xactions/analysis';

const scraper = new Scraper();

const profile = await scraper.getProfile('${query.username}');
const tweets = [];
for await (const tweet of scraper.getTweets('${query.username}', ${query.limit})) {
  tweets.push(tweet);
}

const report = buildAccountReport({ profile, tweets });

console.log(report.engagement.rate + '% engagement rate');
console.log('Best hour (UTC):', report.timing.bestHourUTC);
for (const signal of report.signals) {
  console.log(signal.level.toUpperCase(), signal.title);
}`;

    case 'compare':
      return `import { Scraper } from 'xactions/client';
import { buildAccountReport, compareReports } from 'xactions/analysis';

const scraper = new Scraper();
const usernames = ${JSON.stringify(query.users)};

const reports = [];
for (const username of usernames) {
  const profile = await scraper.getProfile(username);
  const tweets = [];
  for await (const tweet of scraper.getTweets(username, ${query.limit})) {
    tweets.push(tweet);
  }
  reports.push(buildAccountReport({ profile, tweets }));
}

const { accounts, leaders } = compareReports(reports);
console.table(accounts);
console.log('Highest engagement rate:', leaders.engagementRate);`;

    default:
      return '';
  }
}

/**
 * @param {object} query
 * @param {string} apiBase
 * @returns {string}
 */
function curlSnippet(query, apiBase) {
  const url = `${apiBase}${apiPathFor(query)}`;
  return `curl -s '${url}' | jq`;
}

/**
 * @param {object} query
 * @returns {string}
 */
function mcpSnippet(query) {
  switch (query.kind) {
    case 'profile':
      return `Look up @${query.username} on X and tell me what the account is for.`;
    case 'timeline':
      return `Pull @${query.username}'s last ${query.limit} posts and summarise what they have been talking about.`;
    case 'report':
      return `Run an account report on @${query.username} using a sample of ${query.limit} posts. Tell me the engagement rate, when they should be posting, and what is working.`;
    case 'compare':
      return `Compare ${query.users.map((u) => `@${u}`).join(' and ')} on X: audience, posting cadence and engagement rate. Say who is actually winning and why.`;
    default:
      return '';
  }
}

/**
 * The MCP tool call an agent makes for this query, so a developer wiring
 * their own client can skip the natural-language layer.
 * @param {object} query
 * @returns {string}
 */
function mcpToolCall(query) {
  const call = (name, args) => JSON.stringify({ name, arguments: args }, null, 2);
  switch (query.kind) {
    case 'profile':
      return call('x_get_profile', { username: query.username });
    case 'timeline':
      return call('x_get_tweets', { username: query.username, limit: query.limit });
    case 'report':
      return call('x_account_report', { username: query.username, limit: query.limit });
    case 'compare':
      return call('x_account_report', { username: query.users, limit: query.limit });
    default:
      return '';
  }
}

/**
 * Translate a resolved query into every interface XActions offers.
 *
 * @param {object} query - Output of resolveQuery
 * @param {object} [options]
 * @param {string} [options.apiBase] - Origin for the HTTP example
 * @returns {Array<{id: string, label: string, lang: string, code: string, note: string}>}
 */
export function translateQuery(query, { apiBase = DEFAULT_API_BASE } = {}) {
  return [
    {
      id: 'cli',
      label: 'CLI',
      lang: 'bash',
      code: cliSnippet(query),
      note: 'No install and no account. npx fetches it, runs it, and throws it away.',
    },
    {
      id: 'node',
      label: 'Node.js',
      lang: 'javascript',
      code: nodeSnippet(query),
      note: 'npm install xactions. The same client the CLI and the MCP server use.',
    },
    {
      id: 'http',
      label: 'HTTP',
      lang: 'bash',
      code: curlSnippet(query, apiBase),
      note: 'The public playground API. Rate limited, cached, and open to anyone.',
    },
    {
      id: 'mcp',
      label: 'AI agent',
      lang: 'text',
      code: mcpSnippet(query),
      note: 'Say this to Claude, Cursor or any MCP client with the XActions server connected.',
    },
    {
      id: 'tool',
      label: 'MCP call',
      lang: 'json',
      code: mcpToolCall(query),
      note: 'The underlying tool call, for wiring your own agent instead of asking in English.',
    },
  ].filter((lane) => lane.code);
}
