// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions A2A — Outbound URL guard
 *
 * The A2A server calls URLs a remote caller hands it: push notification
 * callbacks and agent discovery. Without a check, a caller can point either at
 * the host's own loopback services, the cloud metadata endpoint, or anything
 * else on the private network, and use the agent as a proxy into it. This
 * refuses anything that is not http(s), and any host that resolves to a
 * loopback, private, link-local, carrier-grade NAT, multicast or reserved
 * address.
 *
 * A deployment whose agents genuinely talk over a private network opts out
 * with the `allowPrivateUrls` server option or XACTIONS_A2A_ALLOW_PRIVATE=true.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { lookup as dnsLookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

/** A URL the agent will not call. */
export class UnsafeUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsafeUrlError';
    this.code = 'UNSAFE_URL';
  }
}

const PRIVATE_RANGES = (() => {
  const list = new BlockList();
  const v4 = [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
    ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4]];
  const v6 = [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]];
  for (const [net, prefix] of v4) list.addSubnet(net, prefix, 'ipv4');
  for (const [net, prefix] of v6) list.addSubnet(net, prefix, 'ipv6');
  return list;
})();

/**
 * Loopback, private, link-local, CGNAT, multicast or reserved. Anything that
 * is not an IP literal counts as private, so a caller cannot slip a name past.
 *
 * @param {string} address
 * @returns {boolean}
 */
export function isPrivateAddress(address) {
  const family = isIP(address);
  if (!family) return true;
  const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return PRIVATE_RANGES.check(mapped[1], 'ipv4');
  return PRIVATE_RANGES.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

/**
 * Is the private-address opt-out on for this process?
 * @returns {boolean}
 */
export function privateUrlsAllowedByEnv() {
  return process.env.XACTIONS_A2A_ALLOW_PRIVATE === 'true';
}

/**
 * Resolve `raw` and throw UnsafeUrlError unless it is an http(s) URL whose
 * every address is public.
 *
 * @param {string} raw
 * @param {object} [options]
 * @param {string} [options.label='URL'] field name, for the error message
 * @param {boolean} [options.allowPrivate=false] skip the address check
 * @param {typeof dnsLookup} [options.lookup] resolver (tests inject one)
 * @returns {Promise<URL>}
 */
export async function assertSafeOutboundUrl(raw, { label = 'URL', allowPrivate = false, lookup = dnsLookup } = {}) {
  let url;
  try {
    url = new URL(String(raw));
  } catch {
    throw new UnsafeUrlError(`${label} is not a valid URL`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new UnsafeUrlError(`${label} must be an http or https URL`);
  }
  if (allowPrivate) return url;

  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses;
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await lookup(host, { all: true })).map((a) => a.address);
    } catch (err) {
      throw new UnsafeUrlError(`${label} host "${host}" does not resolve (${err.code || err.message})`);
    }
  }
  const blocked = addresses.find(isPrivateAddress);
  if (blocked || addresses.length === 0) {
    throw new UnsafeUrlError(
      `${label} resolves to a private or local address (${blocked || 'none'}). The A2A agent only calls hosts on the public internet; ` +
        'set allowPrivateUrls or XACTIONS_A2A_ALLOW_PRIVATE=true if your agents run on a private network.',
    );
  }
  return url;
}
