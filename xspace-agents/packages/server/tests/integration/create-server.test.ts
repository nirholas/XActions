// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§32]

import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest'
import request from 'supertest'
import type { XSpaceServer } from '../../src/create-server'

// ---------------------------------------------------------------------------
// Mocks — isolate from real xspace-agent runtime dependencies
// ---------------------------------------------------------------------------

// vi.hoisted runs BEFORE vi.mock factories, allowing shared state.
const mocks = vi.hoisted(() => {
  const noopLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    child: () => noopLogger,
  } as any
  noopLogger.child = () => noopLogger

  const metricsCollector = {
    counter: () => {},
    histogram: () => {},
    gauge: () => {},
    toPrometheus: () => '# HELP xspace_up\nxspace_up 1\n',
    toJSON: () => ({ counters: {}, histograms: {}, gauges: {} }),
  }

  // Generic stub class constructor
  class StubRepo {
    [key: string]: any
    constructor() {
      return new Proxy(this, {
        get: (_target, prop) => {
          if (typeof prop === 'string') return () => Promise.resolve(prop === 'search' || prop === 'list' ? [] : null)
          return undefined
        },
      })
    }
  }

  return { noopLogger, metricsCollector, StubRepo }
})

// Main xspace-agent mock — covers all top-level imports used by create-server
// and its transitive dependencies (routes, middleware, etc.).
vi.mock('xspace-agent', () => {
  const { noopLogger, metricsCollector, StubRepo } = mocks

  return {
    XSpaceAgent: class MockXSpaceAgent {},
    BrowserLifecycle: class MockBrowserLifecycle {},
    redactSecrets: (s: string) => s,
    getAppLogger: () => noopLogger,
    getMetrics: () => metricsCollector,
    startProcessMetrics: () => {},
    createStreamingLogger: () => noopLogger,
    setAppLogger: () => {},
    initDatabase: () => {},
    initRedis: () => ({ connect: () => Promise.resolve() }),
    checkDatabaseHealth: () => Promise.resolve({ ok: true }),
    checkRedisHealth: () => Promise.resolve({ ok: true }),
    closeDatabase: () => Promise.resolve(),
    closeRedis: () => Promise.resolve(),
    XSpaceError: class XSpaceError extends Error {
      code: string
      hint?: string
      docsUrl?: string
      constructor(message: string, code: string) {
        super(message)
        this.code = code
      }
    },
    // Marketplace repositories (routes/marketplace.ts)
    MarketplaceListingRepository: StubRepo,
    MarketplaceInstallRepository: StubRepo,
    MarketplaceReviewRepository: StubRepo,
    PublisherPayoutRepository: StubRepo,
    // Onboarding functions (routes/onboarding.ts)
    startOnboarding: () => Promise.resolve({}),
    getOnboardingState: () => Promise.resolve(null),
    completeWelcomeWizard: () => Promise.resolve({}),
    completeAgentCreation: () => Promise.resolve({}),
    completeAgentTest: () => Promise.resolve({}),
    completeOnboarding: () => Promise.resolve({}),
    skipToStep: () => Promise.resolve({}),
    getRecommendedTemplate: () => null,
    getOnboardingProgress: () => ({}),
    AGENT_TEMPLATES: [],
    getTemplate: () => null,
    getTemplatesByCategory: () => [],
    getFeaturedTemplates: () => [],
    getTemplatesForPlan: () => [],
    evaluateUpgradeTriggers: () => [],
    dismissUpgradePrompt: () => {},
    getActivationSummary: () => ({}),
    trackActivation: () => {},
    enrollInDripCampaign: () => Promise.resolve({}),
    getDripCampaignState: () => Promise.resolve(null),
    unsubscribeFromDripCampaign: () => {},
    evaluateDueEmails: () => [],
    getAchievedActivations: () => [],
    getOrCreateReferralCode: () => Promise.resolve('REF123'),
    getReferralByCode: () => Promise.resolve(null),
    markReferralSignedUp: () => {},
    getReferralSummary: () => Promise.resolve({}),
    getRecentEvents: () => [],
    getFunnelMetrics: () => ({}),
    // Builder functions (routes/builder.ts)
    getFlowTemplates: () => [],
    getFlowTemplate: () => null,
    getFlowTemplatesByCategory: () => [],
    validateFlow: () => ({ valid: true, errors: [] }),
    transpileFlowToConfig: () => ({}),
    // Analytics (routes/analytics.ts)
    AnalyticsRepository: StubRepo,
    runAnalyticsPipeline: () => Promise.resolve({}),
    generateInsights: () => Promise.resolve([]),
    scoreSentiment: () => 0,
    SessionRepository: StubRepo,
    ConversationRepository: StubRepo,
    // Deployments (routes/deployments.ts)
    AgentRepository: StubRepo,
    AgentVersionRepository: StubRepo,
    AgentDeploymentRepository: StubRepo,
    AuditRepository: StubRepo,
    // Quota middleware (middleware/quota.ts)
    UsageTracker: StubRepo,
    RATE_LIMITS_BY_PLAN: {},
    ENDPOINT_GROUP_LIMITS: {},
    getQuotaLimit: () => Infinity,
    UsageRepository: StubRepo,
    // Analytics + deployments now import these from the package root
    ConversationDBRepository: StubRepo,
    CICDService: StubRepo,
    // Org / RBAC (routes/org.ts, middleware/authorize.ts)
    OrganizationRepository: StubRepo,
    MemberRepository: StubRepo,
    CustomRoleRepository: StubRepo,
    InvitationRepository: StubRepo,
    TeamRepository: StubRepo,
    UserRepository: StubRepo,
    ROLES: {},
    hasPermission: () => true,
    isRoleAtLeast: () => true,
    resolvePermissions: () => new Set<string>(),
    validatePermissions: () => ({ valid: true, invalid: [] }),
    // Templates, events, white-label, admin
    AgentTemplateRepository: StubRepo,
    ConnectionManager: StubRepo,
    CustomDomainService: StubRepo,
    ImpersonationService: StubRepo,
    ResellerRepository: StubRepo,
    ResellerService: StubRepo,
  }
})

// Sub-path mocks — handled via aliases in vitest.config.ts pointing to
// stub files in tests/__mocks__/. No additional vi.mock calls needed.

// ---------------------------------------------------------------------------
// Environment — ADMIN_API_KEY must be set before the factory runs
// ---------------------------------------------------------------------------

const TEST_API_KEY = 'test-integration-api-key-32chars!'

beforeAll(() => {
  process.env.ADMIN_API_KEY = TEST_API_KEY
  // Prevent validateEnvironment from warning about missing X auth
  process.env.X_AUTH_TOKEN = 'fake-token'
  process.env.X_CT0 = 'fake-ct0'
  process.env.OPENAI_API_KEY = 'fake-openai-key'
})

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('createServer integration', () => {
  let server: XSpaceServer

  afterEach(async () => {
    if (server) {
      await server.stop()
    }
  })

  // Helper: lazy-import to ensure mocks are registered before module loads
  async function buildServer(port?: number): Promise<XSpaceServer> {
    const { createServer } = await import('../../src/create-server')
    server = createServer({ port: port ?? 0, headless: true })
    return server
  }

  // --------------------------------------------------------------------------
  // 1. Factory returns the correct shape
  // --------------------------------------------------------------------------

  it('createServer() returns object with start, stop, getApp, and getIO methods', async () => {
    const srv = await buildServer()

    expect(srv).toBeDefined()
    expect(typeof srv.start).toBe('function')
    expect(typeof srv.stop).toBe('function')
    expect(typeof srv.getApp).toBe('function')
    expect(typeof srv.getIO).toBe('function')
  })

  // --------------------------------------------------------------------------
  // 2. GET /health returns 200
  // --------------------------------------------------------------------------

  it('GET /health returns 200 with status and uptime', async () => {
    const srv = await buildServer()
    const app = srv.getApp()

    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('status')
    expect(res.body).toHaveProperty('uptime')
    expect(res.body).toHaveProperty('timestamp')
    expect(res.body).toHaveProperty('agent')
  })

  // --------------------------------------------------------------------------
  // 3. GET /metrics returns Prometheus text
  // --------------------------------------------------------------------------

  it('GET /metrics returns Prometheus-formatted text', async () => {
    const srv = await buildServer()
    const app = srv.getApp()

    const res = await request(app).get('/metrics')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/plain/)
    expect(res.text).toContain('xspace_up')
  })

  // --------------------------------------------------------------------------
  // 4. GET / returns HTML
  // --------------------------------------------------------------------------

  it('GET / returns HTML content', async () => {
    const srv = await buildServer()
    const app = srv.getApp()

    const res = await request(app).get('/')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/html/)
  })

  // --------------------------------------------------------------------------
  // 5. Protected endpoints return 401 without API key
  // --------------------------------------------------------------------------

  // /config is deliberately public: public/js/agent-loader.js fetches it without
  // credentials to pick a voice provider. It must expose nothing beyond that.
  it('GET /config is public and exposes only aiProvider and status', async () => {
    const srv = await buildServer()
    const app = srv.getApp()

    const res = await request(app).get('/config')

    expect(res.status).toBe(200)
    expect(Object.keys(res.body).sort()).toEqual(['aiProvider', 'status'])
  })

  it('GET /state returns 401 without API key', async () => {
    const srv = await buildServer()
    const app = srv.getApp()

    const res = await request(app).get('/state')

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'Unauthorized')
  })

  it('GET /admin returns 401 without API key', async () => {
    const srv = await buildServer()
    const app = srv.getApp()

    const res = await request(app).get('/admin')

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'Unauthorized')
  })

  it('GET /config returns 200 with valid API key in X-API-Key header', async () => {
    const srv = await buildServer()
    const app = srv.getApp()

    const res = await request(app)
      .get('/config')
      .set('X-API-Key', TEST_API_KEY)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('aiProvider')
    expect(res.body).toHaveProperty('status')
  })

  it('GET /config returns 200 with valid API key in Authorization Bearer header', async () => {
    const srv = await buildServer()
    const app = srv.getApp()

    const res = await request(app)
      .get('/config')
      .set('Authorization', `Bearer ${TEST_API_KEY}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('aiProvider')
  })

  // --------------------------------------------------------------------------
  // 6. CORS headers present
  // --------------------------------------------------------------------------

  it('responses include CORS headers', async () => {
    // Set CORS_ORIGINS so the origin check matches our test origin
    process.env.CORS_ORIGINS = 'http://test-origin.example.com'
    const srv = await buildServer()
    const app = srv.getApp()

    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://test-origin.example.com')

    // cors middleware sets access-control-allow-origin when origin matches
    expect(res.headers['access-control-allow-origin']).toBe('http://test-origin.example.com')

    // Clean up
    delete process.env.CORS_ORIGINS
  })

  // --------------------------------------------------------------------------
  // 7. X-Request-ID header added
  // --------------------------------------------------------------------------

  it('responses include X-Request-ID header', async () => {
    const srv = await buildServer()
    const app = srv.getApp()

    const res = await request(app).get('/health')

    expect(res.headers['x-request-id']).toBeDefined()
    // Should be a UUID format (8-4-4-4-12 hex)
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  // --------------------------------------------------------------------------
  // 8. 404 for unknown routes
  // --------------------------------------------------------------------------

  it('returns 404 for unknown routes', async () => {
    const srv = await buildServer()
    const app = srv.getApp()

    const res = await request(app).get('/nonexistent-route-xyz')

    expect(res.status).toBe(404)
  })

  // --------------------------------------------------------------------------
  // 9. Forwards existing X-Request-ID
  // --------------------------------------------------------------------------

  it('forwards client-provided X-Request-ID', async () => {
    const srv = await buildServer()
    const app = srv.getApp()
    const customId = 'my-custom-request-id-12345'

    const res = await request(app)
      .get('/health')
      .set('X-Request-ID', customId)

    expect(res.headers['x-request-id']).toBe(customId)
  })

  // --------------------------------------------------------------------------
  // 10. stop() gracefully shuts down
  // --------------------------------------------------------------------------

  it('stop() gracefully shuts down the server', async () => {
    const srv = await buildServer()
    await srv.start()

    // Server should be listening
    const app = srv.getApp()
    const healthRes = await request(app).get('/health')
    expect(healthRes.status).toBe(200)

    // Stop should resolve without throwing
    await expect(srv.stop()).resolves.toBeUndefined()

    // After stop, mark as cleaned up so afterEach doesn't double-stop
    server = undefined as any
  })

  // --------------------------------------------------------------------------
  // Additional: GET /builder returns HTML (unauthenticated static route)
  // --------------------------------------------------------------------------

  it('GET /builder returns HTML content without auth', async () => {
    const srv = await buildServer()
    const app = srv.getApp()

    const res = await request(app).get('/builder')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/html/)
  })

  // --------------------------------------------------------------------------
  // Additional: GET /metrics/json returns JSON format
  // --------------------------------------------------------------------------

  it('GET /metrics/json returns JSON metrics', async () => {
    const srv = await buildServer()
    const app = srv.getApp()

    const res = await request(app).get('/metrics/json')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.body).toBeDefined()
  })
})
