// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§78]

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Hoisted mocks ───────────────────────────────────────────────────────────

const mockResolveConfig = vi.hoisted(() => vi.fn())
const mockConfigToEnv = vi.hoisted(() => vi.fn())

vi.mock('../../src/config', () => ({
  resolveConfig: mockResolveConfig,
  configToEnv: mockConfigToEnv,
  getDefaults: vi.fn().mockReturnValue({
    ai: { provider: 'openai', model: 'gpt-4o-mini' },
    voice: { provider: 'openai' },
    auth: {},
    behavior: { autoRespond: true, silenceThreshold: 1.5 },
  }),
}))

vi.mock('../../src/logger', () => ({
  banner: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  spacer: vi.fn(),
  label: vi.fn(),
}))

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    text: '',
  })),
}))

vi.mock('chalk', () => {
  const identity = (s: string) => s
  const handler: ProxyHandler<any> = {
    get: () => new Proxy(identity, handler),
    apply: (_target, _this, args) => args[0],
  }
  return { default: new Proxy(identity, handler) }
})

// Mock dotenv
vi.mock('dotenv', () => ({
  config: vi.fn(),
}))

// Mock xspace-agent module to avoid real browser/agent instantiation
const mockJoin = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockOn = vi.hoisted(() => vi.fn())
const mockLeave = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('xspace-agent', () => ({
  // A regular function, not an arrow: vitest 4 refuses `new` on arrow implementations.
  XSpaceAgent: vi.fn().mockImplementation(function () {
    return { join: mockJoin, on: mockOn, leave: mockLeave }
  }),
}))

import { joinCommand } from '../../src/commands/join'
import { error as logError } from '../../src/logger'

// ── Tests ───────────────────────────────────────────────────────────────────

describe('joinCommand', () => {
  const savedEnv = { ...process.env }

  const defaultConfig = {
    ai: { provider: 'openai', model: 'gpt-4o-mini', systemPrompt: 'You are a helpful AI agent participating in an X Space.' },
    voice: { provider: 'openai' },
    auth: {},
    behavior: { autoRespond: true, silenceThreshold: 1.5 },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveConfig.mockReturnValue(defaultConfig)
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`)
    }) as any)
  })

  afterEach(() => {
    process.env = { ...savedEnv }
  })

  // ── URL validation ────────────────────────────────────────────────────

  describe('URL validation', () => {
    it('rejects empty URL', async () => {
      await expect(
        joinCommand('', { config: 'xspace.config.json' })
      ).rejects.toThrow('process.exit(1)')

      expect(logError).toHaveBeenCalledWith(
        'Invalid Space URL. Expected format: https://x.com/i/spaces/...'
      )
    })

    it('rejects non-X Space URL', async () => {
      await expect(
        joinCommand('https://example.com/space/123', { config: 'xspace.config.json' })
      ).rejects.toThrow('process.exit(1)')

      expect(logError).toHaveBeenCalledWith(
        'Invalid Space URL. Expected format: https://x.com/i/spaces/...'
      )
    })

    it('rejects twitter.com URL without spaces path', async () => {
      await expect(
        joinCommand('https://x.com/elonmusk/status/123', { config: 'xspace.config.json' })
      ).rejects.toThrow('process.exit(1)')
    })

    it('accepts valid X Space URL', async () => {
      await joinCommand('https://x.com/i/spaces/1eaKbrPAqbwKX', {
        config: 'xspace.config.json',
      })

      expect(mockJoin).toHaveBeenCalledWith('https://x.com/i/spaces/1eaKbrPAqbwKX')
    })
  })

  // ── Config resolution ─────────────────────────────────────────────────

  describe('config resolution', () => {
    it('calls resolveConfig with correct config path', async () => {
      await joinCommand('https://x.com/i/spaces/test123', {
        config: 'custom.json',
      })

      expect(mockResolveConfig).toHaveBeenCalledWith('custom.json', {})
    })

    it('passes provider override as CLI flag', async () => {
      await joinCommand('https://x.com/i/spaces/test123', {
        config: 'xspace.config.json',
        provider: 'claude',
      })

      expect(mockResolveConfig).toHaveBeenCalledWith('xspace.config.json', {
        ai: { provider: 'claude' },
      })
    })

    it('calls configToEnv with resolved config', async () => {
      const customConfig = { ...defaultConfig, ai: { ...defaultConfig.ai, provider: 'groq' } }
      mockResolveConfig.mockReturnValue(customConfig)

      await joinCommand('https://x.com/i/spaces/test123', {
        config: 'xspace.config.json',
      })

      expect(mockConfigToEnv).toHaveBeenCalledWith(customConfig)
    })
  })

  // ── Agent creation ────────────────────────────────────────────────────

  describe('agent creation', () => {
    it('creates XSpaceAgent and calls join with the URL', async () => {
      const { XSpaceAgent } = await import('xspace-agent')

      await joinCommand('https://x.com/i/spaces/test123', {
        config: 'xspace.config.json',
      })

      expect(XSpaceAgent).toHaveBeenCalled()
      expect(mockJoin).toHaveBeenCalledWith('https://x.com/i/spaces/test123')
    })

    it('sets autoRespond to false in listen-only mode', async () => {
      const { XSpaceAgent } = await import('xspace-agent')

      await joinCommand('https://x.com/i/spaces/test123', {
        config: 'xspace.config.json',
        listenOnly: true,
      })

      const constructorCall = (XSpaceAgent as any).mock.calls[0][0]
      expect(constructorCall.behavior.autoRespond).toBe(false)
    })

    it('sets headless to true by default', async () => {
      const { XSpaceAgent } = await import('xspace-agent')

      await joinCommand('https://x.com/i/spaces/test123', {
        config: 'xspace.config.json',
      })

      const constructorCall = (XSpaceAgent as any).mock.calls[0][0]
      expect(constructorCall.browser.headless).toBe(true)
    })

    it('sets headless to false when explicitly set', async () => {
      const { XSpaceAgent } = await import('xspace-agent')

      await joinCommand('https://x.com/i/spaces/test123', {
        config: 'xspace.config.json',
        headless: false,
      })

      const constructorCall = (XSpaceAgent as any).mock.calls[0][0]
      expect(constructorCall.browser.headless).toBe(false)
    })

    it('passes CDP config in connect browser mode', async () => {
      const { XSpaceAgent } = await import('xspace-agent')

      await joinCommand('https://x.com/i/spaces/test123', {
        config: 'xspace.config.json',
        browser: 'connect',
        cdpEndpoint: 'ws://localhost:9222/devtools/browser/abc',
        cdpPort: '9222',
      })

      const constructorCall = (XSpaceAgent as any).mock.calls[0][0]
      expect(constructorCall.browser.mode).toBe('connect')
      expect(constructorCall.browser.cdpEndpoint).toBe('ws://localhost:9222/devtools/browser/abc')
      expect(constructorCall.browser.cdpPort).toBe(9222)
    })

    it('registers event listeners on the agent', async () => {
      await joinCommand('https://x.com/i/spaces/test123', {
        config: 'xspace.config.json',
      })

      const registeredEvents = mockOn.mock.calls.map((call: any[]) => call[0])
      expect(registeredEvents).toContain('status')
      expect(registeredEvents).toContain('transcription')
      expect(registeredEvents).toContain('response')
      expect(registeredEvents).toContain('error')
    })
  })

  // ── Error handling ────────────────────────────────────────────────────

  describe('error handling', () => {
    it('catches agent join errors and exits with code 1', async () => {
      mockJoin.mockRejectedValueOnce(new Error('Connection refused'))

      await expect(
        joinCommand('https://x.com/i/spaces/test123', { config: 'xspace.config.json' })
      ).rejects.toThrow('process.exit(1)')

      expect(logError).toHaveBeenCalledWith('Connection refused')
    })

    it('handles non-Error thrown values', async () => {
      mockJoin.mockRejectedValueOnce('network failure')

      await expect(
        joinCommand('https://x.com/i/spaces/test123', { config: 'xspace.config.json' })
      ).rejects.toThrow('process.exit(1)')

      expect(logError).toHaveBeenCalledWith('network failure')
    })
  })
})
