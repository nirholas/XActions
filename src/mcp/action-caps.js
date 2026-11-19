// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Persistent per-account daily action caps.
 *
 * X suspends accounts that follow, like, or post faster than a person could.
 * Its rate limits are enforced server-side, but by the time X says "you are
 * over the limit" the account is already flagged. This module keeps the
 * agent under the line on purpose: every write tool call is charged against
 * a rolling 24 hour budget for its action class, and a call that would go
 * over is refused before anything reaches X.
 *
 * The ledger is a JSON file, `action-ledger.json`, under XACTIONS_HOME
 * (default `~/.xactions`), so the budget survives a restart of the MCP
 * server, a crash, or a fresh `npx xactions-mcp`. A cap that resets when the
 * process does is not a cap.
 *
 * Shape on disk:
 *
 *   { "version": 1, "accounts": { "<account>": { "<class>": [<epoch ms>, ...] } } }
 *
 * Each timestamp is one recorded action. Entries older than the 24 hour
 * window are dropped whenever the file is read, so it stays small.
 *
 * Defaults come from X's published limits
 * (https://help.x.com/en/rules-and-policies/x-limits): 2,400 posts per day
 * (that page also states the 300 per 3 hours technical limit, 300 * 8 = 2,400),
 * 500 direct messages per day, and 400 follows per day. Likes are not on
 * that page; the v2 API allows 50 likes per 15 minutes per user (4,800 a
 * day) but accounts that sustain anything near that get read-limited, so
 * the default is the widely reported 500. Classes X does not publish a
 * number for (unfollow, repost, block, mute, delete) reuse the closest
 * published figure. Override any of them with XACTIONS_ACTION_CAPS (a JSON
 * object) or `$XACTIONS_HOME/action-caps.json`.
 *
 * Modelled on the daily action budget in ihuzaifashoukat/x-use.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { withFileLock } from '../utils/fileLock.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const LEDGER_FILENAME = 'action-ledger.json';
export const CAPS_FILENAME = 'action-caps.json';
export const WINDOW_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_ACCOUNT = 'default';

/** Every action class the ledger tracks, in display order. */
export const ACTION_CLASSES = Object.freeze([
  'post', 'reply', 'like', 'repost', 'follow', 'unfollow', 'dm', 'block', 'mute', 'delete',
]);

/**
 * Default daily caps per class. See the module comment for sources.
 * @type {Readonly<Record<string, number>>}
 */
export const DEFAULT_CAPS = Object.freeze({
  post: 2400,
  reply: 2400,
  like: 500,
  repost: 500,
  follow: 400,
  unfollow: 400,
  dm: 500,
  block: 500,
  mute: 500,
  delete: 2400,
});

/**
 * Thrown by checkAndRecord() when an action would exceed its cap.
 */
export class ActionCapExceededError extends Error {
  /**
   * @param {object} info
   * @param {string} info.account
   * @param {string} info.actionClass
   * @param {number} info.cap
   * @param {number} info.used
   * @param {Date} info.resetAt when the oldest counted action leaves the window
   */
  constructor({ account, actionClass, cap, used, resetAt }) {
    super(
      `Daily cap reached for "${actionClass}" on account "${account}": ${used}/${cap} in the last 24h. ` +
      `Next slot frees at ${resetAt.toISOString()}.`
    );
    this.name = 'ActionCapExceededError';
    this.code = 'ACTION_CAP_EXCEEDED';
    this.account = account;
    this.actionClass = actionClass;
    this.cap = cap;
    this.used = used;
    this.resetAt = resetAt;
  }
}

/**
 * Directory that holds XActions state. Honours XACTIONS_HOME.
 * @returns {string}
 */
export function getXactionsHome() {
  return process.env.XACTIONS_HOME || join(homedir(), '.xactions');
}

/** @returns {string} absolute path of the ledger file */
export function getLedgerPath() {
  return join(getXactionsHome(), LEDGER_FILENAME);
}

/** @returns {string} absolute path of the optional caps override file */
export function getCapsConfigPath() {
  return join(getXactionsHome(), CAPS_FILENAME);
}

function normalizeAccount(account) {
  const s = typeof account === 'string' ? account.trim().replace(/^@/, '').toLowerCase() : '';
  return s || DEFAULT_ACCOUNT;
}

function assertClass(actionClass) {
  if (!ACTION_CLASSES.includes(actionClass)) {
    throw new Error(
      `Unknown action class "${actionClass}". Known classes: ${ACTION_CLASSES.join(', ')}`
    );
  }
}

/**
 * Read a caps override object. Accepts either a flat `{ class: n }` map, or
 * `{ class: n, accounts: { name: { class: n } } }` for per-account values.
 * Non-numeric or negative values are ignored; `0` disables a class entirely.
 */
function parseCapsObject(raw, source) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${source} must be a JSON object of { actionClass: dailyCap }`);
  }
  const global = {};
  const accounts = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'accounts' && value && typeof value === 'object') {
      for (const [name, caps] of Object.entries(value)) {
        accounts[normalizeAccount(name)] = parseCapsObject(caps, `${source}.accounts.${name}`).global;
      }
      continue;
    }
    if (!ACTION_CLASSES.includes(key)) {
      throw new Error(`${source}: unknown action class "${key}". Known classes: ${ACTION_CLASSES.join(', ')}`);
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error(`${source}: cap for "${key}" must be a non-negative number, got ${JSON.stringify(value)}`);
    }
    global[key] = Math.floor(n);
  }
  return { global, accounts };
}

function loadOverrides() {
  const layers = [];
  const file = getCapsConfigPath();
  if (existsSync(file)) {
    const text = readFileSync(file, 'utf8');
    if (text.trim()) layers.push(parseCapsObject(JSON.parse(text), file));
  }
  const env = process.env.XACTIONS_ACTION_CAPS;
  if (env && env.trim()) {
    let parsed;
    try {
      parsed = JSON.parse(env);
    } catch (error) {
      throw new Error(`XACTIONS_ACTION_CAPS is not valid JSON: ${error.message}`);
    }
    layers.push(parseCapsObject(parsed, 'XACTIONS_ACTION_CAPS'));
  }
  return layers;
}

/**
 * Effective caps for an account: defaults, then the caps file, then the
 * XACTIONS_ACTION_CAPS env var, each layer's global values first and its
 * per-account values on top.
 *
 * @param {string} [account]
 * @returns {Record<string, number>}
 */
export function resolveCaps(account = DEFAULT_ACCOUNT) {
  const name = normalizeAccount(account);
  const caps = { ...DEFAULT_CAPS };
  for (const layer of loadOverrides()) {
    Object.assign(caps, layer.global, layer.accounts[name] || {});
  }
  return caps;
}

/**
 * Account names are X handles, and `constructor`, `toString` and `__proto__`
 * are all valid handles. A plain object would resolve them to Object.prototype
 * members, so the accounts map has no prototype.
 */
function accountsMap(source = {}) {
  return Object.assign(Object.create(null), source);
}

function emptyLedger() {
  return { version: 1, accounts: accountsMap() };
}

function readLedger() {
  const file = getLedgerPath();
  if (!existsSync(file)) return emptyLedger();
  const raw = readFileSync(file, 'utf8');
  if (!raw.trim()) return emptyLedger();
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || typeof parsed.accounts !== 'object') {
    throw new Error(`Action ledger at ${file} is not a ledger object`);
  }
  parsed.accounts = accountsMap(parsed.accounts);
  return parsed;
}

/**
 * Write the ledger atomically (temp file plus rename) so a crash mid-write
 * cannot leave a half-written file behind.
 */
function writeLedger(ledgerData) {
  const file = getLedgerPath();
  mkdirSync(getXactionsHome(), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(ledgerData, null, 2) + '\n', 'utf8');
  renameSync(tmp, file);
}

/** Drop timestamps outside the window and empty buckets. Mutates and returns. */
function prune(ledgerData, now) {
  const cutoff = now - WINDOW_MS;
  for (const [account, classes] of Object.entries(ledgerData.accounts)) {
    for (const [cls, stamps] of Object.entries(classes)) {
      const kept = (Array.isArray(stamps) ? stamps : []).filter((t) => typeof t === 'number' && t > cutoff);
      if (kept.length) classes[cls] = kept;
      else delete classes[cls];
    }
    if (!Object.keys(classes).length) delete ledgerData.accounts[account];
  }
  return ledgerData;
}

/**
 * Charge one action against the account's budget for that class, or throw
 * ActionCapExceededError without recording anything.
 *
 * The action is recorded before it runs, not after. An attempt that fails
 * halfway still cost a request to X, and counting attempts keeps the ledger
 * on the safe side of the limit.
 *
 * @param {string} account username without @, or "default"
 * @param {string} actionClass one of ACTION_CLASSES
 * @param {{ now?: number, count?: number }} [options] `count` charges several
 *   actions at once (a bulk tool); `now` overrides the clock
 * @returns {{ account: string, actionClass: string, cap: number, used: number, remaining: number, resetAt: Date | null }}
 */
export function checkAndRecord(account, actionClass, { now = Date.now(), count = 1 } = {}) {
  return checkAndRecordMany(account, [{ actionClass, count }], { now })[0];
}

/**
 * Charge several classes in one go, all or nothing: every class is checked
 * before any is recorded, and the ledger is written once. A sweep that likes
 * and replies and is refused on replies must not keep the likes it charged.
 *
 * The read, check and write happen under a cross-process lock, so two
 * servers (Claude Desktop and Claude Code each start one) cannot both read
 * the same count and overwrite each other's charges.
 *
 * @param {string} account
 * @param {Array<{ actionClass: string, count?: number }>} charges
 * @param {{ now?: number }} [options]
 * @returns {Array<{ account: string, actionClass: string, cap: number, used: number, remaining: number, resetAt: Date | null }>}
 */
export function checkAndRecordMany(account, charges, { now = Date.now() } = {}) {
  for (const { actionClass } of charges) assertClass(actionClass);
  const name = normalizeAccount(account);
  const caps = resolveCaps(name);

  return withFileLock(getLedgerPath(), () => {
    const ledgerData = prune(readLedger(), now);
    const buckets = Object.hasOwn(ledgerData.accounts, name) ? ledgerData.accounts[name] : {};

    // Sum charges per class first, so two entries for one class are checked
    // against the cap together.
    const totals = new Map();
    for (const { actionClass, count = 1 } of charges) {
      totals.set(actionClass, (totals.get(actionClass) || 0) + Math.max(1, Math.floor(count)));
    }

    for (const [actionClass, charge] of totals) {
      const cap = caps[actionClass];
      const bucket = buckets[actionClass] || [];
      const used = bucket.length;
      if (used + charge > cap) {
        // The slot frees when the oldest counted action ages out of the
        // window; with a cap of 0 the class is disabled and never frees.
        const oldest = bucket.length ? Math.min(...bucket) : now;
        const resetAt = new Date(cap === 0 ? now + WINDOW_MS : oldest + WINDOW_MS);
        throw new ActionCapExceededError({ account: name, actionClass, cap, used, resetAt });
      }
    }

    const results = [];
    for (const [actionClass, charge] of totals) {
      const bucket = buckets[actionClass] || [];
      const used = bucket.length;
      for (let i = 0; i < charge; i++) bucket.push(now);
      buckets[actionClass] = bucket;
      const cap = caps[actionClass];
      results.push({
        account: name,
        actionClass,
        cap,
        used: used + charge,
        remaining: cap - used - charge,
        resetAt: new Date(Math.min(...bucket) + WINDOW_MS),
      });
    }
    ledgerData.accounts[name] = buckets;
    writeLedger(ledgerData);
    return results;
  });
}

/**
 * Remaining budget per class for an account, without recording anything.
 *
 * @param {string} [account]
 * @param {{ now?: number }} [options]
 * @returns {{ account: string, windowHours: number, classes: Record<string, { cap: number, used: number, remaining: number, resetAt: string | null }> }}
 */
export function remaining(account = DEFAULT_ACCOUNT, { now = Date.now() } = {}) {
  const name = normalizeAccount(account);
  const caps = resolveCaps(name);
  const ledgerData = prune(readLedger(), now);
  const buckets = ledgerData.accounts[name] || {};
  const classes = {};
  for (const cls of ACTION_CLASSES) {
    const stamps = buckets[cls] || [];
    const cap = caps[cls];
    classes[cls] = {
      cap,
      used: stamps.length,
      remaining: Math.max(0, cap - stamps.length),
      resetAt: stamps.length ? new Date(Math.min(...stamps) + WINDOW_MS).toISOString() : null,
    };
  }
  return { account: name, windowHours: WINDOW_MS / 3_600_000, classes };
}

/**
 * The whole ledger after pruning: every account with its per-class
 * timestamps. Read-only snapshot; editing it changes nothing on disk.
 *
 * @param {{ now?: number }} [options]
 * @returns {{ version: number, accounts: Record<string, Record<string, number[]>> }}
 */
export function ledger({ now = Date.now() } = {}) {
  return prune(readLedger(), now);
}

/**
 * Clear recorded actions for one account, or for every account when no
 * account is given. Returns how many recorded actions were dropped.
 *
 * @param {string} [account]
 * @returns {number}
 */
export function resetLedger(account) {
  const ledgerData = readLedger();
  let dropped = 0;
  const countOf = (classes) => Object.values(classes).reduce((n, s) => n + (Array.isArray(s) ? s.length : 0), 0);
  if (account === undefined) {
    for (const classes of Object.values(ledgerData.accounts)) dropped += countOf(classes);
    ledgerData.accounts = {};
  } else {
    const name = normalizeAccount(account);
    if (ledgerData.accounts[name]) {
      dropped = countOf(ledgerData.accounts[name]);
      delete ledgerData.accounts[name];
    }
  }
  writeLedger(ledgerData);
  return dropped;
}

export default {
  LEDGER_FILENAME,
  CAPS_FILENAME,
  WINDOW_MS,
  DEFAULT_ACCOUNT,
  ACTION_CLASSES,
  DEFAULT_CAPS,
  ActionCapExceededError,
  getXactionsHome,
  getLedgerPath,
  getCapsConfigPath,
  resolveCaps,
  checkAndRecord,
  remaining,
  ledger,
  resetLedger,
};
