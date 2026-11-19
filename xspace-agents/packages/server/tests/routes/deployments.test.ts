// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§67]

// =============================================================================
// Tests — Deployment Routes (createDeploymentRoutes)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createTestApp, createMockTenant } from '../helpers/test-app'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockVersions = [
  { id: 'v1', agentId: 'agent-1', version: 1, config: { name: 'Agent' }, changelog: 'Initial', createdAt: '2025-01-01' },
  { id: 'v2', agentId: 'agent-1', version: 2, config: { name: 'Agent v2' }, changelog: 'Update', createdAt: '2025-02-01' },
]

const mockDeployments = [
  { id: 'dep-1', agentId: 'agent-1', versionId: 'v1', environment: 'staging', status: 'active', deployedAt: '2025-01-15' },
]

const mockCicd = {
  listVersions: vi.fn(async () => mockVersions),
  getVersion: vi.fn(async (agentId: string, version: number) => {
    return mockVersions.find((v) => v.agentId === agentId && v.version === version) ?? null
  }),
  createVersion: vi.fn(async (opts: any) => ({
    id: 'v-new',
    agentId: opts.agentId,
    version: 3,
    config: opts.config,
    changelog: opts.changelog,
    createdBy: opts.createdBy,
    createdAt: new Date().toISOString(),
  })),
  runTests: vi.fn(async () => ({
    passed: 2,
    failed: 0,
    total: 2,
    results: [],
  })),
  deploy: vi.fn(async (opts: any) => ({
    id: 'dep-new',
    agentId: opts.agentId,
    versionId: opts.versionId,
    environment: opts.environment,
    status: 'active',
    deployedBy: opts.deployedBy,
    deployedAt: new Date().toISOString(),
  })),
  listDeployments: vi.fn(async () => mockDeployments),
  promote: vi.fn(async (opts: any) => ({
    id: 'dep-promoted',
    agentId: opts.agentId,
    versionId: opts.versionId,
    environment: opts.targetEnvironment,
    status: 'active',
    deployedAt: new Date().toISOString(),
  })),
  rollback: vi.fn(async () => ({
    rolledBack: { id: 'dep-1', status: 'rolled_back' },
    reactivated: { id: 'dep-prev', status: 'active' },
  })),
}

// ---------------------------------------------------------------------------
// Mock xspace-agent repositories and CICDService
// ---------------------------------------------------------------------------

// Regular functions, not arrows: vitest 4 refuses `new` on arrow implementations.
// routes/deployments.ts imports CICDService from the package root.
vi.mock('xspace-agent', () => ({
  AgentRepository: vi.fn(),
  AgentVersionRepository: vi.fn(),
  AgentDeploymentRepository: vi.fn(),
  AuditRepository: vi.fn(function () {
    return { log: vi.fn(async () => {}) }
  }),
  CICDService: vi.fn(function () { return mockCicd }),
}))

// Mock authorize middleware to pass through (tenant is injected by test-app)
vi.mock('../../src/middleware/authorize', () => ({
  authorize: () => (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
  requireEnterprise: () => (_req: any, _res: any, next: any) => next(),
}))

import { createDeploymentRoutes } from '../../src/routes/deployments'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Deployment Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function buildApp() {
    const tenant = createMockTenant({ userRole: 'admin' })
    const app = createTestApp({ tenant })
    app.use(createDeploymentRoutes())
    return app
  }

  // =========================================================================
  // Versions
  // =========================================================================

  describe('GET /agents/:id/versions', () => {
    it('lists all versions for an agent', async () => {
      const app = buildApp()
      const res = await request(app).get('/agents/agent-1/versions')

      expect(res.status).toBe(200)
      expect(res.body.versions).toHaveLength(2)
      expect(mockCicd.listVersions).toHaveBeenCalledWith('agent-1')
    })

    it('returns 500 when listVersions fails', async () => {
      mockCicd.listVersions.mockRejectedValueOnce(new Error('DB error'))
      const app = buildApp()
      const res = await request(app).get('/agents/agent-1/versions')

      expect(res.status).toBe(500)
      expect(res.body.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('GET /agents/:id/versions/:version', () => {
    it('returns a specific version', async () => {
      const app = buildApp()
      const res = await request(app).get('/agents/agent-1/versions/1')

      expect(res.status).toBe(200)
      expect(res.body.version).toBe(1)
      expect(res.body.config.name).toBe('Agent')
    })

    it('returns 404 for unknown version', async () => {
      const app = buildApp()
      const res = await request(app).get('/agents/agent-1/versions/99')

      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('NOT_FOUND')
    })

    it('returns 400 for non-numeric version', async () => {
      const app = buildApp()
      const res = await request(app).get('/agents/agent-1/versions/abc')

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /agents/:id/versions', () => {
    it('creates a new version', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/versions')
        .send({ config: { name: 'Agent v3' }, changelog: 'New features' })

      expect(res.status).toBe(201)
      expect(res.body.version).toBe(3)
      expect(mockCicd.createVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agent-1',
          config: { name: 'Agent v3' },
          changelog: 'New features',
        }),
      )
    })

    it('returns 400 when config is missing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/versions')
        .send({ changelog: 'Oops' })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when config is empty object', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/versions')
        .send({ config: {} })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 404 when agent is not found', async () => {
      mockCicd.createVersion.mockRejectedValueOnce(new Error('Agent not found'))
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/versions')
        .send({ config: { name: 'Test' } })

      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('NOT_FOUND')
    })
  })

  // =========================================================================
  // Testing
  // =========================================================================

  describe('POST /agents/:id/test', () => {
    it('runs tests against a version', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/test')
        .send({
          versionId: 'v1',
          tests: [
            { name: 'test-1', input: 'Hello' },
            { name: 'test-2', input: 'World', expectedOutput: 'Response' },
          ],
        })

      expect(res.status).toBe(200)
      expect(res.body.passed).toBe(2)
      expect(res.body.failed).toBe(0)
      expect(res.body.total).toBe(2)
    })

    it('returns 400 when tests array is empty', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/test')
        .send({ versionId: 'v1', tests: [] })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when versionId is missing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/test')
        .send({ tests: [{ name: 'test', input: 'hello' }] })

      expect(res.status).toBe(400)
    })

    it('returns 404 when version not found', async () => {
      mockCicd.runTests.mockRejectedValueOnce(new Error('Version not found'))
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/test')
        .send({
          versionId: 'v-missing',
          tests: [{ name: 'test', input: 'hello' }],
        })

      expect(res.status).toBe(404)
    })
  })

  // =========================================================================
  // Deploy
  // =========================================================================

  describe('POST /agents/:id/deploy', () => {
    it('deploys a version to an environment', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/deploy')
        .send({ versionId: 'v1', environment: 'staging' })

      expect(res.status).toBe(201)
      expect(res.body.environment).toBe('staging')
      expect(res.body.status).toBe('active')
    })

    it('returns 400 for invalid environment', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/deploy')
        .send({ versionId: 'v1', environment: 'invalid' })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when versionId is missing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/deploy')
        .send({ environment: 'staging' })

      expect(res.status).toBe(400)
    })

    it('returns 404 when version not found', async () => {
      mockCicd.deploy.mockRejectedValueOnce(new Error('Version not found'))
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/deploy')
        .send({ versionId: 'v-missing', environment: 'staging' })

      expect(res.status).toBe(404)
    })
  })

  describe('GET /agents/:id/deployments', () => {
    it('lists deployment history', async () => {
      const app = buildApp()
      const res = await request(app).get('/agents/agent-1/deployments')

      expect(res.status).toBe(200)
      expect(res.body.deployments).toHaveLength(1)
      expect(mockCicd.listDeployments).toHaveBeenCalledWith('agent-1')
    })

    it('returns 500 when listing fails', async () => {
      mockCicd.listDeployments.mockRejectedValueOnce(new Error('DB error'))
      const app = buildApp()
      const res = await request(app).get('/agents/agent-1/deployments')

      expect(res.status).toBe(500)
      expect(res.body.error.code).toBe('INTERNAL_ERROR')
    })
  })

  // =========================================================================
  // Promote
  // =========================================================================

  describe('POST /agents/:id/promote', () => {
    it('promotes a version to the next environment', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/promote')
        .send({ versionId: 'v1', targetEnvironment: 'production' })

      expect(res.status).toBe(200)
      expect(res.body.environment).toBe('production')
      expect(mockCicd.promote).toHaveBeenCalled()
    })

    it('returns 400 for invalid target environment', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/promote')
        .send({ versionId: 'v1', targetEnvironment: 'invalid' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when promotion is not allowed', async () => {
      mockCicd.promote.mockRejectedValueOnce(new Error('Cannot promote to production without staging'))
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/promote')
        .send({ versionId: 'v1', targetEnvironment: 'production' })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 404 when version not found', async () => {
      mockCicd.promote.mockRejectedValueOnce(new Error('Version not found'))
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/promote')
        .send({ versionId: 'v-missing', targetEnvironment: 'production' })

      expect(res.status).toBe(404)
    })
  })

  // =========================================================================
  // Rollback
  // =========================================================================

  describe('POST /agents/:id/rollback', () => {
    it('rolls back to the previous version', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/rollback')
        .send({ environment: 'production', reason: 'Bug found' })

      expect(res.status).toBe(200)
      expect(res.body.rolledBack).toBeDefined()
      expect(res.body.reactivated).toBeDefined()
      expect(mockCicd.rollback).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agent-1',
          environment: 'production',
          reason: 'Bug found',
        }),
      )
    })

    it('returns 400 when reason is missing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/rollback')
        .send({ environment: 'production' })

      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid environment', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/rollback')
        .send({ environment: 'invalid', reason: 'Bug' })

      expect(res.status).toBe(400)
    })

    it('returns 404 when no active deployment found', async () => {
      mockCicd.rollback.mockRejectedValueOnce(new Error('No active deployment'))
      const app = buildApp()
      const res = await request(app)
        .post('/agents/agent-1/rollback')
        .send({ environment: 'production', reason: 'Bug' })

      expect(res.status).toBe(404)
    })
  })
})
