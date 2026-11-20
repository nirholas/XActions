// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Outbound URL safety: refuse URLs the server should not call on a caller's
 * behalf (callback URLs, webhooks, media and feed downloads).
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { lookup as dnsLookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { fetchWithDispatcher } from './http2.js';

/** A URL the server will not call. Retrying cannot fix it. */
export class PublicUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PublicUrlError';
    this.code = 'INVALID_URL';
    this.status = 400;
    this.retryable = false;
  }
}

const PRIVATE_RANGES = (() => {
  const list = new BlockList();
  const v4 = [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
    ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4]];
  // 64:ff9b:1::/48 is local-use NAT64; 2001::/32 is Teredo, whose embedded
  // IPv4 address is obfuscated, so the whole prefix is refused.
  const v6 = [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8],
    ['64:ff9b:1::', 48], ['2001::', 32]];
  for (const [net, prefix] of v4) list.addSubnet(net, prefix, 'ipv4');
  for (const [net, prefix] of v6) list.addSubnet(net, prefix, 'ipv6');
  return list;
})();

/** An IPv6 address as eight 16-bit groups, or null. Accepts a dotted-quad tail and a zone id. */
function ipv6Groups(address) {
  let text = address.toLowerCase().replace(/%.*$/, '');
  const quad = text.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (quad) {
    const [a, b, c, d] = quad.slice(1).map(Number);
    text = `${text.slice(0, quad.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0) return null;
  const groups = [...head, ...Array(fill).fill('0'), ...tail].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => g >= 0 && g <= 0xffff) ? groups : null;
}

/**
 * The IPv4 address an IPv6 address carries and routes to, if any: mapped
 * (::ffff:a.b.c.d), IPv4-compatible (::a.b.c.d), IPv4-translated
 * (::ffff:0:a.b.c.d), NAT64 (64:ff9b::a.b.c.d) and 6to4 (2002:aabb:ccdd::).
 * Each of these reaches the IPv4 address on a dual-stack or NAT64 host, so
 * each is judged by the IPv4 rules. URL parsing rewrites the dotted tail into
 * hex ([::ffff:127.0.0.1] becomes [::ffff:7f00:1]), so both spellings count.
 */
function embeddedIPv4(groups) {
  const v4 = (hi, lo) => `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
  const zero = (from, to) => groups.slice(from, to).every((g) => g === 0);
  if (zero(0, 5) && groups[5] === 0xffff) return v4(groups[6], groups[7]);
  if (zero(0, 6)) return v4(groups[6], groups[7]);
  if (zero(0, 4) && groups[4] === 0xffff && groups[5] === 0) return v4(groups[6], groups[7]);
  if (groups[0] === 0x64 && groups[1] === 0xff9b && zero(2, 6)) return v4(groups[6], groups[7]);
  if (groups[0] === 0x2002) return v4(groups[1], groups[2]);
  return null;
}

/** Loopback, private, link-local, carrier-grade NAT, multicast or reserved. */
export function isPrivateAddress(address) {
  const family = isIP(address);
  if (!family) return true;
  if (family === 4) return PRIVATE_RANGES.check(address, 'ipv4');
  const groups = ipv6Groups(address);
  if (!groups) return true;
  const v4 = embeddedIPv4(groups);
  if (v4) return PRIVATE_RANGES.check(v4, 'ipv4');
  return PRIVATE_RANGES.check(address.replace(/%.*$/, ''), 'ipv6');
}

/**
 * Refuse anything that is not http(s), or whose host resolves to a private or
 * local address. A self-hosted server that delivers to its own network sets
 * XACTIONS_WEBHOOK_ALLOW_PRIVATE=true.
 *
 * @param {string} raw
 * @param {string} [label='URL'] - the field name, for the error
 * @param {typeof dnsLookup} [lookup]
 * @returns {Promise<URL>}
 */
export async function assertPublicUrl(raw, label = 'URL', lookup = dnsLookup) {
  return (await resolvePublicUrl(raw, label, lookup)).url;
}

/**
 * Validate a URL as {@link assertPublicUrl} does and also return the address
 * that was checked, so the request can be sent to that address and no other.
 * `address` is null when private hosts are allowed and nothing was pinned.
 *
 * @param {string} raw
 * @param {string} [label='URL']
 * @param {typeof dnsLookup} [lookup]
 * @returns {Promise<{ url: URL, address: string | null, family: 4 | 6 | null }>}
 */
export async function resolvePublicUrl(raw, label = 'URL', lookup = dnsLookup) {
  let url;
  try {
    url = new URL(String(raw));
  } catch {
    throw new PublicUrlError(`${label} is not a valid URL`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new PublicUrlError(`${label} must be an http or https URL`);
  if (process.env.XACTIONS_WEBHOOK_ALLOW_PRIVATE === 'true') return { url, address: null, family: null };

  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses;
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await lookup(host, { all: true })).map((a) => a.address);
    } catch (err) {
      throw new PublicUrlError(`${label} host "${host}" does not resolve (${err.code || err.message})`);
    }
  }
  const blocked = addresses.find(isPrivateAddress);
  if (blocked || addresses.length === 0) {
    throw new PublicUrlError(
      `${label} resolves to a private or local address (${blocked || 'none'}). Deliveries only go to hosts on the public internet; ` +
        'a self-hosted server can allow internal hosts with XACTIONS_WEBHOOK_ALLOW_PRIVATE=true.',
    );
  }
  return { url, address: addresses[0], family: isIP(addresses[0]) === 6 ? 6 : 4 };
}

/**
 * An undici dispatcher that connects every request to one address, whatever
 * the hostname resolves to by then. TLS still verifies the certificate
 * against the URL's hostname (SNI and the check use the hostname, only the
 * socket address is fixed).
 *
 * @param {string} address
 * @param {4 | 6} family
 * @returns {Promise<import('undici').Agent | null>} null when undici is unavailable
 */
export async function pinnedDispatcher(address, family) {
  let undici;
  try {
    undici = await import('undici');
  } catch {
    return null;
  }
  return new undici.Agent({
    connect: {
      lookup(_hostname, options, callback) {
        if (options?.all) callback(null, [{ address, family }]);
        else callback(null, address, family);
      },
    },
  });
}

/**
 * Fetch a URL only if it is public, connecting to the exact address that was
 * checked. Checking a hostname and then letting fetch resolve it again leaves
 * a gap: a hostile DNS server answers the check with a public address and the
 * fetch with 127.0.0.1 or a cloud metadata address (DNS rebinding). Redirects
 * are not followed (`redirect: 'manual'` unless the caller says otherwise),
 * so a caller that follows one must call this again for the new location.
 *
 * @param {string | URL} raw
 * @param {RequestInit} [init]
 * @param {{ label?: string, lookup?: typeof dnsLookup, fetch?: typeof globalThis.fetch }} [options]
 *   `fetch` is the caller's fetch; a replaced or injected one is used as is,
 *   without pinning (tests, interceptors)
 * @returns {Promise<Response>}
 */
export async function publicFetch(raw, init = {}, { label = 'URL', lookup = dnsLookup, fetch: fetchFn = globalThis.fetch } = {}) {
  const { url, address, family } = await resolvePublicUrl(raw, label, lookup);
  const dispatcher = address ? await pinnedDispatcher(address, family) : null;
  const request = { redirect: 'manual', ...init, ...(dispatcher ? { dispatcher } : {}) };
  try {
    return await fetchWithDispatcher(fetchFn, url.href, request);
  } finally {
    // Graceful: an open response body keeps its socket until it is read.
    dispatcher?.close().catch(() => {});
  }
}
