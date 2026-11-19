// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

// =============================================================================
// Outbound webhook URL safety
// =============================================================================
//
// Webhook URLs are tenant-supplied, so delivery must not reach loopback,
// private, link-local (cloud metadata at 169.254.169.254), CGNAT, multicast
// or reserved addresses. The check runs at connect time, through the agents'
// `lookup`, so a hostname that re-resolves between a check and the request
// (DNS rebinding) is still refused. Node skips `lookup` for IP-literal hosts,
// so those are checked up front by assertDeliverableUrl().
//
// A self-hosted deployment that delivers to its own network sets
// XSPACE_WEBHOOK_ALLOW_PRIVATE=true.

import dns from 'dns'
import http from 'http'
import https from 'https'
import { BlockList, isIP } from 'net'
import type { LookupFunction } from 'net'

const PRIVATE_RANGES = (() => {
  const list = new BlockList()
  const v4: Array<[string, number]> = [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
    ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
  ]
  const v6: Array<[string, number]> = [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]]
  for (const [net, prefix] of v4) list.addSubnet(net, prefix, 'ipv4')
  for (const [net, prefix] of v6) list.addSubnet(net, prefix, 'ipv6')
  return list
})()

/** A webhook URL delivery refuses to call. Retrying cannot fix it. */
export class WebhookUrlError extends Error {
  readonly code = 'WEBHOOK_URL_BLOCKED'
  constructor(message: string) {
    super(message)
    this.name = 'WebhookUrlError'
  }
}

function allowPrivate(): boolean {
  return process.env.XSPACE_WEBHOOK_ALLOW_PRIVATE === 'true'
}

/** Loopback, private, link-local, CGNAT, multicast or reserved (unparseable counts as private). */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address)
  if (!family) return true
  const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return PRIVATE_RANGES.check(mapped[1], 'ipv4')
  return PRIVATE_RANGES.check(address, family === 4 ? 'ipv4' : 'ipv6')
}

const blockedMessage = (host: string, address: string) =>
  `Webhook host "${host}" resolves to a private or local address (${address}). ` +
  'Deliveries only go to the public internet; a self-hosted server can allow internal hosts with XSPACE_WEBHOOK_ALLOW_PRIVATE=true.'

/**
 * Synchronous pre-flight: http(s) only, and an IP-literal host must be public.
 * Hostnames are checked at connect time by publicOnlyLookup.
 */
export function assertDeliverableUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new WebhookUrlError('Webhook URL is not a valid URL')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new WebhookUrlError('Webhook URL must be http or https')
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (!allowPrivate() && isIP(host) && isPrivateAddress(host)) {
    throw new WebhookUrlError(blockedMessage(host, host))
  }
  return url
}

/**
 * dns.lookup that fails when any resolved address is private, so the socket
 * never connects to one. `resolve` is injectable for tests.
 */
export function createPublicOnlyLookup(resolve: typeof dns.lookup = dns.lookup): LookupFunction {
  return ((hostname: string, options: dns.LookupOptions, callback: (...args: any[]) => void) => {
    resolve(hostname, { ...options, all: true }, (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => {
      if (err) return callback(err)
      if (!allowPrivate()) {
        const blocked = addresses.find((a) => isPrivateAddress(a.address))
        if (blocked || addresses.length === 0) {
          return callback(new WebhookUrlError(blockedMessage(hostname, blocked?.address ?? 'none')))
        }
      }
      if (options.all) return callback(null, addresses)
      callback(null, addresses[0].address, addresses[0].family)
    })
  }) as LookupFunction
}

const lookup = createPublicOnlyLookup()

/** Agents for axios: every connection goes through the public-only lookup. */
export const publicOnlyAgents = {
  httpAgent: new http.Agent({ lookup }),
  httpsAgent: new https.Agent({ lookup }),
}
