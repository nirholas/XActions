// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent)

import http from 'http'
import type { AddressInfo } from 'net'
import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest'
import {
  assertDeliverableUrl,
  createPublicOnlyLookup,
  isPrivateAddress,
  WebhookUrlError,
} from '../webhooks/public-url'
import { WebhookDeliveryService } from '../webhooks/delivery'

afterEach(() => {
  delete process.env.XSPACE_WEBHOOK_ALLOW_PRIVATE
})

describe('isPrivateAddress', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', 'not-an-ip'])(
    'treats %s as private',
    (addr) => expect(isPrivateAddress(addr)).toBe(true),
  )

  it.each(['93.184.216.34', '1.1.1.1', '2606:4700:4700::1111'])('treats %s as public', (addr) => {
    expect(isPrivateAddress(addr)).toBe(false)
  })
})

describe('assertDeliverableUrl', () => {
  it('rejects non-http schemes and private IP literals', () => {
    for (const url of ['ftp://example.com/x', 'file:///etc/passwd', 'http://127.0.0.1/hook', 'http://169.254.169.254/latest/meta-data', 'http://[::1]:8080/']) {
      expect(() => assertDeliverableUrl(url), url).toThrow(WebhookUrlError)
    }
  })

  it('accepts public hosts and public IP literals', () => {
    expect(assertDeliverableUrl('https://hooks.example.com/x').hostname).toBe('hooks.example.com')
    expect(assertDeliverableUrl('http://93.184.216.34/x').hostname).toBe('93.184.216.34')
  })

  it('allows private targets only with the explicit opt-out', () => {
    process.env.XSPACE_WEBHOOK_ALLOW_PRIVATE = 'true'
    expect(() => assertDeliverableUrl('http://127.0.0.1/hook')).not.toThrow()
  })
})

describe('createPublicOnlyLookup', () => {
  const fakeResolve = (addresses: Array<{ address: string; family: number }>) =>
    ((_host: string, _opts: unknown, cb: (err: null, a: typeof addresses) => void) => cb(null, addresses)) as any

  const run = (lookup: any, all: boolean) =>
    new Promise<{ err: Error | null; result: unknown }>((resolve) =>
      lookup('hooks.example.com', { all }, (err: Error | null, address: unknown) => resolve({ err, result: address })),
    )

  it('fails when any resolved address is private (rebinding to metadata)', async () => {
    const lookup = createPublicOnlyLookup(fakeResolve([{ address: '93.184.216.34', family: 4 }, { address: '169.254.169.254', family: 4 }]))
    const { err } = await run(lookup, false)
    expect(err).toBeInstanceOf(WebhookUrlError)
  })

  it('passes public addresses through in both callback shapes', async () => {
    const lookup = createPublicOnlyLookup(fakeResolve([{ address: '93.184.216.34', family: 4 }]))
    expect((await run(lookup, false)).result).toBe('93.184.216.34')
    expect((await run(lookup, true)).result).toEqual([{ address: '93.184.216.34', family: 4 }])
  })
})

describe('WebhookDeliveryService delivery to a local target', () => {
  let server: http.Server
  let port: number
  let hits = 0

  beforeAll(async () => {
    server = http.createServer((_req, res) => { hits++; res.end('ok') })
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()))
    port = (server.address() as AddressInfo).port
  })
  afterAll(() => new Promise<void>((r) => server.close(() => r())))

  const attempt = () => {
    const service = new WebhookDeliveryService({ requestTimeoutMs: 2000 })
    const webhook = { id: 'wh1', url: `http://localhost:${port}/hook`, secret: 's', headers: null } as any
    const payload = { id: 'evt1', type: 'test', data: {} } as any
    return (service as any).executeRequest(webhook, payload)
  }

  it('refuses a hostname that resolves to loopback, so the request never lands', async () => {
    hits = 0
    const result = await attempt()
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/private or local address/)
    expect(hits).toBe(0)
  })

  it('delivers to it when XSPACE_WEBHOOK_ALLOW_PRIVATE=true', async () => {
    hits = 0
    process.env.XSPACE_WEBHOOK_ALLOW_PRIVATE = 'true'
    const result = await attempt()
    expect(result.success).toBe(true)
    expect(hits).toBe(1)
  })
})
