// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Account Import
 *
 * Turns a bulk account list into the `~/.xactions/accounts.json` store. Two input
 * shapes are accepted:
 *   - combolist  : `login:password:email:emailpass:auth_token:2fa` per line
 *                  (the 40-hex field is auth_token, the trailing base32 is the TOTP)
 *   - tsv/csv    : header row with `handle` + either `cookies` or `auth_token`+`ct0`
 *
 * A combolist carries no ct0, so one is MINTED per account (32 hex). X's CSRF is a
 * double-submit check — header must equal the ct0 cookie, which the client always
 * satisfies — so a self-minted ct0 authenticates a valid auth_token. Only
 * handle + auth_token + minted ct0 are persisted; passwords, emails and 2FA secrets
 * are dropped as pure secret-at-rest surface.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { randomBytes } from 'node:crypto';

import { validateAccount, normalizeAccount, saveAccounts } from './accountStore.js';
import { redactProxy } from './proxiedFetch.js';

const AUTH_TOKEN_RE = /^[a-f0-9]{35,50}$/i;

/** Mint a ct0 cookie value (32 hex, X's usual shape). */
const mintCt0 = () => randomBytes(16).toString('hex');

const clean = (s) => (s ?? '').trim().replace(/^["']|["']$/g, '');

/**
 * Parse a combolist. Extracts the handle (first field) and the auth_token (the
 * 40-hex field, wherever it sits), and mints a ct0.
 *
 * @param {string} text
 * @returns {{ records: Object[], problems: string[] }}
 */
export function parseCombolist(text) {
  const records = [];
  const problems = [];

  text.replace(/^﻿/, '').split(/\r?\n/).forEach((line, i) => {
    const raw = clean(line);
    if (!raw || raw.startsWith('#')) return;

    const fields = raw.split(':').map(clean);
    const handle = fields[0];
    const token = fields.find((f) => AUTH_TOKEN_RE.test(f));

    if (!handle) {
      problems.push(`line ${i + 1}: no handle`);
      return;
    }
    if (!token) {
      problems.push(`line ${i + 1} (${handle}): no 40-hex auth_token field found`);
      return;
    }
    records.push({
      handle: handle.replace(/^@/, '').toLowerCase(),
      cookies: `auth_token=${token}; ct0=${mintCt0()}`,
      proxyUrl: null,
      userAgent: null,
      status: 'active',
      lastUsed: null,
    });
  });

  return { records, problems };
}

/**
 * Parse a tab/comma file with a header. Recognised columns: handle, cookies,
 * auth_token, ct0, proxy/proxyUrl, userAgent. Mints a ct0 when only auth_token
 * is supplied.
 *
 * @param {string} text
 * @returns {{ records: Object[], problems: string[] }}
 */
export function parseTable(text) {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const records = [];
  const problems = [];
  if (lines.length === 0) return { records, problems };

  const delim = lines[0].includes('\t') ? '\t' : ',';
  const cols = lines[0].split(delim).map((c) => c.toLowerCase().replace(/[\s_-]/g, ''));
  const idx = (name) => cols.indexOf(name);

  lines.slice(1).forEach((line, i) => {
    const cells = line.split(delim).map(clean);
    const at = (name) => (idx(name) === -1 ? null : cells[idx(name)]);

    const handle = at('handle');
    const full = at('cookies');
    const authToken = at('authtoken');
    const ct0 = at('ct0');
    const cookies = full || (authToken ? `auth_token=${authToken}; ct0=${ct0 || mintCt0()}` : null);

    if (!handle) { problems.push(`line ${i + 2}: no handle`); return; }
    if (!cookies) { problems.push(`line ${i + 2} (${handle}): no cookies / auth_token`); return; }

    records.push({
      handle: handle.replace(/^@/, '').toLowerCase(),
      cookies,
      proxyUrl: at('proxyurl') || at('proxy') || null,
      userAgent: at('useragent') || null,
      status: 'active',
      lastUsed: null,
    });
  });

  return { records, problems };
}

/**
 * Pair a proxy list 1:1 onto records, by line order. Refuses on shortage or
 * duplicates — the fleet never double-books an egress IP.
 *
 * @param {Object[]} records
 * @param {string} proxyText
 * @returns {string[]} problems (empty on success; records mutated in place)
 */
export function pairProxies(records, proxyText) {
  const proxies = proxyText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  if (proxies.length < records.length) {
    return [`${proxies.length} proxies for ${records.length} accounts — need one per account (surplus accounts would be parked).`];
  }
  if (new Set(proxies).size !== proxies.length) {
    return ['proxy list has duplicates — two accounts would share one egress IP.'];
  }
  records.forEach((r, i) => { r.proxyUrl = proxies[i]; });
  return [];
}

/**
 * Full import: parse → (pair proxies) → validate + dedup → optionally persist.
 * Never persists a partially-broken set.
 *
 * `problems` are hard errors that block the write; `skipped` are benign dedups
 * (the same session appearing twice) that do NOT block — combolists routinely
 * carry a handful of duplicate tokens.
 *
 * @param {Object} opts
 * @param {string} opts.text - combolist or table text
 * @param {string} [opts.proxyText] - optional 1:1 proxy list
 * @param {boolean} [opts.write=false] - persist to the store (else dry run)
 * @returns {Promise<{accounts: Object[], problems: string[], skipped: string[], written: boolean}>}
 */
export async function importAccounts({ text, proxyText, write = false }) {
  const looksTable = /\t/.test(text) || /^[^\n:]*\b(handle|cookies|auth_?token)\b/i.test(text.split('\n')[0] ?? '');
  const { records, problems } = looksTable ? parseTable(text) : parseCombolist(text);
  const skipped = [];

  const seenHandle = new Map();
  const seenToken = new Map();
  const good = [];
  records.forEach((r) => {
    const { valid, errors } = validateAccount(r);
    if (!valid) { problems.push(`${r.handle}: ${errors.join('; ')}`); return; }
    // Dedup on the auth_token, not the full cookie — ct0 may be freshly minted and differ.
    const token = (r.cookies.match(/auth_token=([^;\s]+)/) ?? [])[1] ?? r.cookies;
    if (seenToken.has(token)) { skipped.push(`${r.handle}: same session as ${seenToken.get(token)} — skipped`); return; }
    // Same handle under a DIFFERENT token is a genuine conflict, not a dedup.
    if (seenHandle.has(r.handle)) { problems.push(`${r.handle}: duplicate handle with a different auth_token — conflicting sessions`); return; }
    seenHandle.set(r.handle, r.handle);
    seenToken.set(token, r.handle);
    good.push(normalizeAccount(r));
  });

  // Proxies are paired only onto the accepted, deduped set — 1:1, by order.
  if (proxyText) problems.push(...pairProxies(good, proxyText));

  const written = write && problems.length === 0 && good.length > 0;
  if (written) await saveAccounts(good);

  return { accounts: good, problems, skipped, written };
}

/** One display line per imported account — never prints a cookie value. */
export function describeAccount(a) {
  const at = (a.cookies.match(/auth_token=([^;\s]+)/) ?? [])[1] ?? '';
  const ct = (a.cookies.match(/ct0=([^;\s]+)/) ?? [])[1] ?? '';
  return `@${a.handle}  auth_token:${at.length}ch  ct0:${ct.length}ch  proxy: ${redactProxy(a.proxyUrl) ?? 'none'}`;
}
