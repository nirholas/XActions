// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Take everything private out of a doctor report before anyone pastes it.
 *
 * A report is pasted into a public issue, so it must never carry a cookie, a
 * token, a username, an account id, a proxy URL, a home directory path or the
 * value of an environment variable. Check details are free text built from
 * error messages and paths, so they cannot be trusted to be clean. Two passes
 * make them clean:
 *
 * 1. Known values. Every value this machine is known to hold (each environment
 *    variable value, the saved cookies and config, the OS account, the
 *    hostname, the signed-in handle and id) is replaced wherever it appears.
 *    The home directory becomes `~` so paths stay readable.
 * 2. Shapes. Whatever was not known up front is caught by its shape: URLs,
 *    `key=value` credentials, `Bearer` headers, email addresses, @handles,
 *    long digit runs (X account ids), long token-like strings and IP
 *    addresses.
 *
 * Environment values shorter than six characters are not replaced: a value
 * like `1` or `true` cannot carry a secret, and replacing it would shred the
 * text. Version strings are not replaced either, because the official Node
 * image sets `NODE_VERSION` and removing it would erase the Node version the
 * report exists to carry. Nor is a value that exactly equals a public fact the
 * report prints on purpose (the caller passes these as `keep`): npm and npx
 * export the package.json they run in as `npm_package_name=xactions` and
 * `npm_package_engines_node=>=22.19`, and removing those would erase the
 * product name and the engines range from every report run through npm.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

/** Replacement for a value removed by the report. */
export const REDACTED = '[redacted]';

/** Shortest environment or saved value that is treated as a secret. */
const MIN_SECRET_LENGTH = 6;

/**
 * OS accounts that are shared defaults rather than a person: containers run
 * as `node` or `root`, CI as `runner`, devcontainers as `vscode`. Replacing
 * `node` would also eat the word in ordinary text.
 */
const SYSTEM_ACCOUNTS = new Set(['root', 'node', 'runner', 'vscode', 'codespace', 'ubuntu', 'user', 'admin', 'docker', 'app']);

/** Hosts whose name may stay in a report; only the host survives, never the path. */
const KNOWN_HOSTS = ['x.com', 'twitter.com', 'twimg.com', 'github.com', 'githubusercontent.com', 'nodejs.org', 'npmjs.org', 'npmjs.com', 'xactions.app'];

const VERSION_LIKE = /^v?\d+(\.\d+){1,3}([-+][\w.]+)?$/;

/**
 * @typedef {object} Secret
 * @property {string} value - Exact text to find
 * @property {string} replacement
 * @property {boolean} [word] - Match only as a whole word, ignoring case
 */

/**
 * Escape a string for use inside a RegExp.
 * @param {string} text
 * @returns {string}
 */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Every value on this machine that must not reach a report.
 *
 * @param {object} context
 * @param {Record<string, string|undefined>} [context.env] - Every value of length >= 6 is a secret
 * @param {string} [context.homedir] - Replaced by `~`, in both slash styles
 * @param {string} [context.username] - The OS account, matched as a whole word
 * @param {string} [context.hostname]
 * @param {Array<string|null|undefined>} [context.values] - Saved cookies, config values, the signed-in handle and id
 * @param {Array<string|null|undefined>} [context.keep] - Public facts the report prints; an env value equal to one is not a secret
 * @returns {Secret[]} Longest first, so a value is never half replaced by a shorter one inside it
 */
export function collectSecrets({ env = {}, homedir, username, hostname, values = [], keep = [] } = {}) {
  const publicFacts = new Set(keep.filter((k) => typeof k === 'string').map((k) => k.trim()));
  /** @type {Map<string, Secret>} */
  const byValue = new Map();
  const add = (value, replacement = REDACTED, word = false) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (trimmed.length < MIN_SECRET_LENGTH && !word) return;
    if (!trimmed) return;
    byValue.set(trimmed, { value: trimmed, replacement, word });
  };

  for (const value of Object.values(env)) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!VERSION_LIKE.test(trimmed) && !publicFacts.has(trimmed)) add(value);
  }
  for (const value of values) add(value);
  if (hostname && hostname.length >= 3) add(hostname, REDACTED, true);
  if (username && username.length >= 3 && !SYSTEM_ACCOUNTS.has(username.toLowerCase())) add(username, REDACTED, true);
  // The home directory last, so `~` wins over the generic replacement when
  // HOME (or USERPROFILE) is also an environment value.
  if (homedir && homedir.length > 1) {
    add(homedir, '~');
    add(homedir.replace(/\\/g, '/'), '~');
    add(homedir.replace(/\//g, '\\'), '~');
  }

  return [...byValue.values()].sort((a, b) => b.value.length - a.value.length);
}

/**
 * Keep the host of a known URL and drop the rest; remove any other URL whole.
 * A query string can hold a screen name, and a proxy URL can hold a password.
 * @param {string} raw
 * @returns {string}
 */
function scrubUrl(raw) {
  const trailing = raw.match(/[.,;:!?]+$/)?.[0] || '';
  const text = trailing ? raw.slice(0, -trailing.length) : raw;
  let url;
  try {
    url = new URL(text);
  } catch {
    return `[redacted-url]${trailing}`;
  }
  const host = url.hostname.toLowerCase();
  const known = KNOWN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  if (!known || url.username || url.password || url.port || !/^https?:$/.test(url.protocol)) {
    return `[redacted-url]${trailing}`;
  }
  const hasMore = (url.pathname && url.pathname !== '/') || url.search || url.hash;
  return `${url.protocol}//${host}${hasMore ? '/[path removed]' : ''}${trailing}`;
}

/**
 * Shape rules, applied in order after the known values are gone.
 * @type {Array<[RegExp, (match: string, ...groups: string[]) => string]>}
 */
const SHAPES = [
  // Any URL. Runs first so the rules below never see a credential inside one.
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>`)\]]+/gi, scrubUrl],
  // Authorization headers.
  [/\b(Bearer|Basic|Token)\s+[^\s"'`,;]+/g, (_m, kind) => `${kind} ${REDACTED}`],
  // key=value and key: value credentials, including cookie headers.
  [
    /\b(auth_token|ct0|twid|kdt|csrf[_-]?token|access[_-]?token|refresh[_-]?token|api[_-]?key|secret|password|passwd)(\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s;,&"'`]+)/gi,
    (_m, key, sep) => `${key}${sep}${REDACTED}`,
  ],
  [/\b(cookie)(\s*:\s*)[^\n|]+/gi, (_m, key, sep) => `${key}${sep}${REDACTED}`],
  // Email addresses, before handles so the local part is not read as one.
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, () => '[redacted-email]'],
  // @handles, but not npm scopes like @x402/core.
  [/(?<![\w@])@[A-Za-z0-9_]{1,15}(?![\w/])/g, () => `@${REDACTED}`],
  // X account ids and other long numbers.
  [/(?<![\w.])\d{9,}(?![\w.])/g, () => '[redacted-id]'],
  // Token-like runs: long, and mixing letters with digits.
  [/(?<![\w%-])(?=[\w%-]*\d)(?=[\w%-]*[A-Za-z])[\w%-]{20,}(?![\w%-])/g, () => '[redacted-token]'],
  // IPv4 addresses.
  [/(?<![\w.])\d{1,3}(\.\d{1,3}){3}(?![\w.])/g, () => '[redacted-ip]'],
];

/**
 * Remove every secret from a piece of text.
 * @param {string} text
 * @param {Secret[]} secrets - From collectSecrets()
 * @returns {string}
 */
export function scrub(text, secrets) {
  let out = String(text);
  for (const secret of secrets) {
    const pattern = secret.word
      ? new RegExp(`(?<![A-Za-z0-9_-])${escapeRegExp(secret.value)}(?![A-Za-z0-9_-])`, 'gi')
      : new RegExp(escapeRegExp(secret.value), 'g');
    out = out.replace(pattern, () => secret.replacement);
  }
  for (const [pattern, replace] of SHAPES) {
    out = out.replace(pattern, replace);
  }
  return out;
}
