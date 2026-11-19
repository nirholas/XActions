// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§65]

// =============================================================================
// Tests for authorize middleware — RBAC permission and role checking
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authorize, requireRole, requireEnterprise } from '../../src/middleware/authorize'
import type { Request, Response, NextFunction } from 'express'
import type { TenantContext, Plan, Quotas, FeatureFlags, Organization } from 'xspace-agent/tenant/types'
// Import the mocked hasPermission so we can control its return value per test.
// The vitest alias resolves xspace-agent/rbac/permissions to a stub mock
// that exports hasPermission as a vi.fn().
import { hasPermission } from 'xspace-agent/rbac/permissions'

// authorize.ts imports hasPermission from the package root; point it at the same
// stub so the middleware actually consults the function these tests control.
vi.mock('xspace-agent', async () => {
  const rbac = await import('xspace-agent/rbac/permissions')
  return { hasPermission: rbac.hasPermission }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlan(tier: string = 'pro'): Plan {
  return {
    tier: tier as any,
    maxAgents: 10,
    maxConcurrentSessions: 5,
    maxSessionMinutesPerMonth: 10000,
    maxApiCallsPerMinute: 500,
    features: ['basic', 'advanced'],
    retentionDays: 90,
    support: 'email',
    price: 4999,
  }
}

function makeQuotas(): Quotas {
  return {
    maxAgents: 10,
    currentAgents: 2,
    maxConcurrentSessions: 5,
    currentSessions: 1,
    maxSessionMinutesPerMonth: 10000,
    usedSessionMinutes: 500,
    maxApiCallsPerMinute: 500,
  }
}

function makeFeatureFlags(): FeatureFlags {
  return {
    isEnabled: (f: string) => false,
    enabled: () => [],
  }
}

function makeOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    ownerId: 'user-1',
    plan: 'pro',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeTenantContext(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    orgId: 'org-1',
    userId: 'user-1',
    userRole: 'admin',
    plan: makePlan(),
    quotas: makeQuotas(),
    features: makeFeatureFlags(),
    org: makeOrg(),
    ...overrides,
  }
}

function mockReq(tenant?: TenantContext): Request {
  const req: any = {
    path: '/api/test',
    method: 'POST',
    ip: '127.0.0.1',
    headers: {},
    tenant,
  }
  return req
}

function mockRes(): Response & { _status: number; _json: unknown } {
  const res: any = {
    _status: 0,
    _json: null,
    status(code: number) {
      res._status = code
      return res
    },
    json(body: unknown) {
      res._json = body
      return res
    },
  }
  return res
}

// Cast hasPermission to a vi.fn type for mockReturnValue etc.
const mockHasPermission = hasPermission as unknown as ReturnType<typeof vi.fn>

// =============================================================================
// authorize(permission)
// =============================================================================

describe('authorize', () => {
  beforeEach(() => {
    // Ensure audit logs don't print during tests
    process.env.NODE_ENV = 'test'
    // Reset the mock to default (deny all)
    mockHasPermission.mockReset()
    mockHasPermission.mockReturnValue(false)
  })

  it('returns 401 when no tenant context is present', () => {
    const middleware = authorize('agents:create')
    const req = mockReq(undefined)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(401)
    expect(res._json).toMatchObject({
      error: 'Unauthorized',
      hint: 'No tenant context — authenticate first',
    })
  })

  it('returns 403 when userRole is missing (API-key-only request)', () => {
    const middleware = authorize('agents:create')
    const tenant = makeTenantContext({ userRole: undefined })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect(res._json).toMatchObject({
      error: 'Forbidden',
      required: 'agents:create',
    })
  })

  it('allows access when hasPermission returns true', () => {
    mockHasPermission.mockReturnValue(true)

    const middleware = authorize('agents:create')
    const tenant = makeTenantContext({ userRole: 'admin' })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(mockHasPermission).toHaveBeenCalledWith('agents:create', {
      role: 'admin',
      customPermissions: undefined,
    })
  })

  it('denies access when hasPermission returns false', () => {
    mockHasPermission.mockReturnValue(false)

    const middleware = authorize('agents:create')
    const tenant = makeTenantContext({ userRole: 'viewer' })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect(res._json).toMatchObject({
      error: 'Forbidden',
      required: 'agents:create',
      hint: expect.stringContaining('viewer'),
    })
  })

  it('passes customPermissions to hasPermission', () => {
    mockHasPermission.mockReturnValue(true)

    const middleware = authorize('agents:create')
    const tenant = makeTenantContext({
      userRole: 'viewer',
      customPermissions: ['agents:create'],
    })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(mockHasPermission).toHaveBeenCalledWith('agents:create', {
      role: 'viewer',
      customPermissions: ['agents:create'],
    })
  })

  it('passes wildcard customPermissions to hasPermission', () => {
    mockHasPermission.mockReturnValue(true)

    const middleware = authorize('agents:create')
    const tenant = makeTenantContext({
      userRole: 'viewer',
      customPermissions: ['agents:*'],
    })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(mockHasPermission).toHaveBeenCalledWith('agents:create', {
      role: 'viewer',
      customPermissions: ['agents:*'],
    })
  })

  it('checks the correct permission for different endpoints', () => {
    mockHasPermission.mockReturnValue(true)

    const tenant = makeTenantContext({ userRole: 'owner' })

    // billing:manage
    const mw1 = authorize('billing:manage')
    mw1(mockReq(tenant), mockRes(), vi.fn())
    expect(mockHasPermission).toHaveBeenLastCalledWith('billing:manage', expect.any(Object))

    // org:delete
    const mw2 = authorize('org:delete')
    mw2(mockReq(tenant), mockRes(), vi.fn())
    expect(mockHasPermission).toHaveBeenLastCalledWith('org:delete', expect.any(Object))
  })

  it('returns 403 with descriptive hint showing role and permission', () => {
    mockHasPermission.mockReturnValue(false)

    const middleware = authorize('agents:delete')
    const tenant = makeTenantContext({ userRole: 'developer' })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(res._status).toBe(403)
    expect(res._json).toMatchObject({
      error: 'Forbidden',
      required: 'agents:delete',
      hint: expect.stringContaining('developer'),
    })
    expect((res._json as any).hint).toContain('agents:delete')
  })
})

// =============================================================================
// requireRole
// =============================================================================

describe('requireRole', () => {
  it('returns 401 when no tenant context or userRole', () => {
    const middleware = requireRole('admin', 'owner')
    const req = mockReq(undefined)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(401)
  })

  it('returns 401 when tenant exists but userRole is missing', () => {
    const middleware = requireRole('admin')
    const tenant = makeTenantContext({ userRole: undefined })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(401)
  })

  it('allows access when user has one of the required roles', () => {
    const middleware = requireRole('admin', 'owner')
    const tenant = makeTenantContext({ userRole: 'admin' })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('denies access when user role is not in the list', () => {
    const middleware = requireRole('admin', 'owner')
    const tenant = makeTenantContext({ userRole: 'viewer' })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect(res._json).toMatchObject({
      error: 'Forbidden',
      hint: expect.stringContaining('admin'),
    })
  })

  it('works with single role', () => {
    const middleware = requireRole('owner')
    const tenant = makeTenantContext({ userRole: 'owner' })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('rejects developer when only admin and owner are allowed', () => {
    const middleware = requireRole('admin', 'owner')
    const tenant = makeTenantContext({ userRole: 'developer' })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect((res._json as any).hint).toContain('admin')
    expect((res._json as any).hint).toContain('owner')
  })
})

// =============================================================================
// requireEnterprise
// =============================================================================

describe('requireEnterprise', () => {
  it('returns 401 when no tenant context', () => {
    const middleware = requireEnterprise()
    const req = mockReq(undefined)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(401)
    expect(res._json).toMatchObject({ error: 'Unauthorized' })
  })

  it('allows access when plan tier is enterprise', () => {
    const middleware = requireEnterprise()
    const tenant = makeTenantContext({
      plan: makePlan('enterprise'),
    })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('denies access when plan tier is not enterprise', () => {
    const middleware = requireEnterprise()
    const tenant = makeTenantContext({
      plan: makePlan('pro'),
    })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect(res._json).toMatchObject({
      error: 'Forbidden',
      hint: 'This feature requires an Enterprise plan',
    })
  })

  it('denies free tier', () => {
    const middleware = requireEnterprise()
    const tenant = makeTenantContext({
      plan: makePlan('free'),
    })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
  })

  it('denies business tier', () => {
    const middleware = requireEnterprise()
    const tenant = makeTenantContext({
      plan: makePlan('business'),
    })
    const req = mockReq(tenant)
    const res = mockRes()
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
  })
})
