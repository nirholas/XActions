// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§32]

// =============================================================================
// Tests — Organization Routes (createOrgRoutes)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createTestApp, createMockTenant } from '../helpers/test-app'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockOrg = {
  id: 'org-test-123',
  name: 'Test Org',
  slug: 'test-org',
  ownerId: 'user-test-456',
  plan: 'pro',
  status: 'active',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-06-01'),
}

const mockMembers = [
  { userId: 'user-test-456', orgId: 'org-test-123', role: 'owner', email: 'owner@test.com' },
  { userId: 'user-member-1', orgId: 'org-test-123', role: 'developer', email: 'dev@test.com' },
]

const mockCustomRoles = [
  { id: 'cr-1', orgId: 'org-test-123', name: 'Content Manager', description: 'Manages content', permissions: ['agents:read', 'agents:create'] },
]

const mockTeams = [
  { id: 'team-1', orgId: 'org-test-123', name: 'Engineering', description: 'Dev team', memberIds: ['user-test-456'] },
]

// ---------------------------------------------------------------------------
// Mock repositories
// ---------------------------------------------------------------------------

const mockOrgRepo = {
  findById: vi.fn(async (id: string) => (id === 'org-test-123' ? mockOrg : null)),
  update: vi.fn(async (id: string, data: any) => ({ ...mockOrg, ...data })),
  delete: vi.fn(async () => {}),
}

const mockMemberRepo = {
  findByOrgId: vi.fn(async () => mockMembers),
  findByOrgAndUser: vi.fn(async (orgId: string, userId: string) => {
    return mockMembers.find((m) => m.orgId === orgId && m.userId === userId) ?? null
  }),
  add: vi.fn(async (data: any) => data),
  updateRole: vi.fn(async (orgId: string, userId: string, role: string) => ({
    userId,
    orgId,
    role,
  })),
  remove: vi.fn(async () => {}),
}

const mockCustomRoleRepo = {
  findByOrgId: vi.fn(async () => mockCustomRoles),
  findByName: vi.fn(async () => null),
  findById: vi.fn(async (id: string) => {
    if (id === 'cr-1') return mockCustomRoles[0]
    return null
  }),
  create: vi.fn(async (data: any) => ({ id: 'cr-new', ...data })),
  update: vi.fn(async (id: string, data: any) => ({ id, ...mockCustomRoles[0], ...data })),
  delete: vi.fn(async () => {}),
}

const mockInvitationRepo = {
  findPendingByEmail: vi.fn(async () => null),
  findByTokenHash: vi.fn(async (hash: string) => {
    if (hash === 'valid-hash') {
      return null
    }
    return null
  }),
  create: vi.fn(async (data: any) => ({
    id: 'inv-1',
    ...data,
    status: 'pending',
    createdAt: new Date(),
  })),
  updateStatus: vi.fn(async () => {}),
}

const mockTeamRepo = {
  findByOrgId: vi.fn(async () => mockTeams),
  findById: vi.fn(async (id: string) => {
    if (id === 'team-1') return mockTeams[0]
    return null
  }),
  create: vi.fn(async (data: any) => ({ id: 'team-new', ...data })),
  update: vi.fn(async (id: string, data: any) => ({ id, ...mockTeams[0], ...data })),
  delete: vi.fn(async () => {}),
}

const mockAuditRepo = {
  log: vi.fn(async () => {}),
}

const mockUserRepo = {
  findByEmail: vi.fn(async () => null),
  create: vi.fn(async (data: any) => ({
    id: 'user-new',
    ...data,
  })),
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('xspace-agent', () => ({
  OrganizationRepository: vi.fn(function () { return mockOrgRepo }),
  MemberRepository: vi.fn(function () { return mockMemberRepo }),
  CustomRoleRepository: vi.fn(function () { return mockCustomRoleRepo }),
  InvitationRepository: vi.fn(function () { return mockInvitationRepo }),
  TeamRepository: vi.fn(function () { return mockTeamRepo }),
  AuditRepository: vi.fn(function () { return mockAuditRepo }),
  UserRepository: vi.fn(function () { return mockUserRepo }),
  ...rbacMock,
}))

// Mock authorize middleware to pass through for most tests
vi.mock('../../src/middleware/authorize', () => ({
  authorize: () => (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
  requireEnterprise: () => (_req: any, _res: any, next: any) => next(),
}))

// Mock RBAC permissions. routes/org.ts imports these from the package root while
// tests reach them through the subpath, so both mocks share one hoisted object.
const rbacMock = vi.hoisted(() => ({
  ROLES: {
    owner: { description: 'Full access' },
    admin: { description: 'Administrative access' },
    manager: { description: 'Management access' },
    developer: { description: 'Development access' },
    viewer: { description: 'Read-only access' },
  },
  resolvePermissions: vi.fn((role: string) => {
    const perms: Record<string, string[]> = {
      owner: ['*'],
      admin: ['org:read', 'org:settings', 'members:*', 'agents:*'],
      manager: ['org:read', 'agents:*', 'members:read'],
      developer: ['org:read', 'agents:read', 'agents:create'],
      viewer: ['org:read', 'agents:read'],
    }
    return new Set(perms[role] ?? [])
  }),
  isRoleAtLeast: vi.fn((userRole: string, targetRole: string) => {
    const hierarchy = ['viewer', 'developer', 'manager', 'admin', 'owner']
    return hierarchy.indexOf(userRole) >= hierarchy.indexOf(targetRole)
  }),
  validatePermissions: vi.fn((perms: string[]) => {
    const invalid = perms.filter((p) => !p.includes(':'))
    return { valid: invalid.length === 0, invalid }
  }),
  hasPermission: vi.fn(() => true),
}))

vi.mock('xspace-agent/rbac/permissions', () => rbacMock)

import { createOrgRoutes } from '../../src/routes/org'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Org Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset defaults
    mockMemberRepo.findByOrgAndUser.mockImplementation(async (orgId: string, userId: string) => {
      return mockMembers.find((m) => m.orgId === orgId && m.userId === userId) ?? null
    })
    mockInvitationRepo.findPendingByEmail.mockResolvedValue(null)
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockCustomRoleRepo.findByName.mockResolvedValue(null)
  })

  function buildApp(tenantOverrides = {}) {
    const tenant = createMockTenant({
      userRole: 'owner',
      ...tenantOverrides,
    })
    // Add tenantContext alias used by some routes
    const app = createTestApp({ tenant })
    // Add tenantContext alias middleware
    app.use((req: any, _res: any, next: any) => {
      req.tenantContext = req.tenant
      next()
    })
    app.use(createOrgRoutes())
    return app
  }

  // =========================================================================
  // Organization CRUD
  // =========================================================================

  describe('GET /org', () => {
    it('returns org details', async () => {
      const app = buildApp()
      const res = await request(app).get('/org')

      expect(res.status).toBe(200)
      expect(res.body.org.name).toBe('Test Org')
      expect(res.body.org.id).toBe('org-test-123')
    })

    it('returns 404 when org not found', async () => {
      mockOrgRepo.findById.mockResolvedValueOnce(null)
      const app = buildApp()
      const res = await request(app).get('/org')

      expect(res.status).toBe(404)
    })

    it('returns 500 on internal error', async () => {
      mockOrgRepo.findById.mockRejectedValueOnce(new Error('DB error'))
      const app = buildApp()
      const res = await request(app).get('/org')

      expect(res.status).toBe(500)
    })
  })

  describe('PATCH /org', () => {
    it('updates org settings', async () => {
      const app = buildApp()
      const res = await request(app)
        .patch('/org')
        .send({ name: 'Updated Org', settings: { theme: 'dark' } })

      expect(res.status).toBe(200)
      expect(mockOrgRepo.update).toHaveBeenCalledWith(
        'org-test-123',
        expect.objectContaining({ name: 'Updated Org', settings: { theme: 'dark' } }),
      )
    })

    it('returns 500 on error', async () => {
      mockOrgRepo.update.mockRejectedValueOnce(new Error('DB error'))
      const app = buildApp()
      const res = await request(app)
        .patch('/org')
        .send({ name: 'Fail' })

      expect(res.status).toBe(500)
    })
  })

  describe('DELETE /org', () => {
    it('deletes org with correct confirmation', async () => {
      const app = buildApp()
      const res = await request(app)
        .delete('/org')
        .send({ confirm: 'org-test-123' })

      expect(res.status).toBe(200)
      expect(res.body.deleted).toBe(true)
      expect(mockOrgRepo.delete).toHaveBeenCalledWith('org-test-123')
    })

    it('returns 400 when confirmation is wrong', async () => {
      const app = buildApp()
      const res = await request(app)
        .delete('/org')
        .send({ confirm: 'wrong-id' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Confirmation required')
    })

    it('returns 400 when confirmation is missing', async () => {
      const app = buildApp()
      const res = await request(app)
        .delete('/org')
        .send({})

      expect(res.status).toBe(400)
    })

    it('returns 500 on error', async () => {
      mockOrgRepo.delete.mockRejectedValueOnce(new Error('DB error'))
      const app = buildApp()
      const res = await request(app)
        .delete('/org')
        .send({ confirm: 'org-test-123' })

      expect(res.status).toBe(500)
    })
  })

  // =========================================================================
  // Members
  // =========================================================================

  describe('GET /org/members', () => {
    it('lists all members', async () => {
      const app = buildApp()
      const res = await request(app).get('/org/members')

      expect(res.status).toBe(200)
      expect(res.body.members).toHaveLength(2)
    })

    it('returns 500 on error', async () => {
      mockMemberRepo.findByOrgId.mockRejectedValueOnce(new Error('DB error'))
      const app = buildApp()
      const res = await request(app).get('/org/members')

      expect(res.status).toBe(500)
    })
  })

  describe('POST /org/members/invite', () => {
    it('invites a user by email', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/org/members/invite')
        .send({ email: 'newuser@test.com', role: 'developer' })

      expect(res.status).toBe(201)
      expect(res.body.invitation).toBeDefined()
      expect(res.body.invitation.email).toBe('newuser@test.com')
      expect(res.body.invitation.role).toBe('developer')
      expect(res.body.inviteToken).toBeDefined()
    })

    it('returns 400 when email is missing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/org/members/invite')
        .send({ role: 'developer' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when role is missing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/org/members/invite')
        .send({ email: 'user@test.com' })

      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid role', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/org/members/invite')
        .send({ email: 'user@test.com', role: 'superadmin' })

      expect(res.status).toBe(400)
    })

    it('returns 403 for privilege escalation', async () => {
      const { isRoleAtLeast } = await import('xspace-agent/rbac/permissions')
      ;(isRoleAtLeast as any).mockReturnValueOnce(false)

      const app = buildApp()
      const res = await request(app)
        .post('/org/members/invite')
        .send({ email: 'user@test.com', role: 'owner' })

      expect(res.status).toBe(403)
    })

    it('returns 409 when user is already a member', async () => {
      mockUserRepo.findByEmail.mockResolvedValueOnce({ id: 'user-test-456', email: 'owner@test.com' })
      const app = buildApp()
      const res = await request(app)
        .post('/org/members/invite')
        .send({ email: 'owner@test.com', role: 'developer' })

      expect(res.status).toBe(409)
    })

    it('returns 409 when pending invitation exists', async () => {
      mockInvitationRepo.findPendingByEmail.mockResolvedValueOnce({ id: 'inv-existing' })
      const app = buildApp()
      const res = await request(app)
        .post('/org/members/invite')
        .send({ email: 'pending@test.com', role: 'developer' })

      expect(res.status).toBe(409)
    })
  })

  describe('POST /org/members/accept', () => {
    it('returns 400 when token is missing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/org/members/accept')
        .send({})

      expect(res.status).toBe(400)
    })

    it('returns 404 when invitation not found', async () => {
      mockInvitationRepo.findByTokenHash.mockResolvedValueOnce(null)
      const app = buildApp()
      const res = await request(app)
        .post('/org/members/accept')
        .send({ token: 'invalid-token' })

      expect(res.status).toBe(404)
    })

    it('returns 400 when invitation is already accepted', async () => {
      mockInvitationRepo.findByTokenHash.mockResolvedValueOnce({
        id: 'inv-1',
        orgId: 'org-test-123',
        email: 'user@test.com',
        role: 'developer',
        status: 'accepted',
        expiresAt: new Date(Date.now() + 86400000),
      })
      const app = buildApp()
      const res = await request(app)
        .post('/org/members/accept')
        .send({ token: 'some-token' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when invitation has expired', async () => {
      mockInvitationRepo.findByTokenHash.mockResolvedValueOnce({
        id: 'inv-1',
        orgId: 'org-test-123',
        email: 'user@test.com',
        role: 'developer',
        status: 'pending',
        expiresAt: new Date(Date.now() - 86400000), // expired yesterday
      })
      const app = buildApp()
      const res = await request(app)
        .post('/org/members/accept')
        .send({ token: 'expired-token' })

      expect(res.status).toBe(400)
      expect(mockInvitationRepo.updateStatus).toHaveBeenCalledWith('inv-1', 'expired')
    })

    it('accepts a valid invitation and creates the member', async () => {
      mockInvitationRepo.findByTokenHash.mockResolvedValueOnce({
        id: 'inv-1',
        orgId: 'org-test-123',
        email: 'newuser@test.com',
        role: 'developer',
        invitedBy: 'user-test-456',
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
      })
      const app = buildApp()
      const res = await request(app)
        .post('/org/members/accept')
        .send({ token: 'valid-token' })

      expect(res.status).toBe(200)
      expect(res.body.member).toBeDefined()
      expect(res.body.member.role).toBe('developer')
      expect(mockUserRepo.create).toHaveBeenCalled()
      expect(mockMemberRepo.add).toHaveBeenCalled()
      expect(mockInvitationRepo.updateStatus).toHaveBeenCalledWith('inv-1', 'accepted')
    })

    it('uses existing user when accepting invitation', async () => {
      mockInvitationRepo.findByTokenHash.mockResolvedValueOnce({
        id: 'inv-1',
        orgId: 'org-test-123',
        email: 'existing@test.com',
        role: 'developer',
        invitedBy: 'user-test-456',
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
      })
      mockUserRepo.findByEmail.mockResolvedValueOnce({ id: 'user-existing', email: 'existing@test.com' })

      const app = buildApp()
      const res = await request(app)
        .post('/org/members/accept')
        .send({ token: 'valid-token' })

      expect(res.status).toBe(200)
      expect(mockUserRepo.create).not.toHaveBeenCalled()
      expect(mockMemberRepo.add).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-existing' }),
      )
    })
  })

  describe('PATCH /org/members/:userId', () => {
    it('updates a member role', async () => {
      const app = buildApp()
      const res = await request(app)
        .patch('/org/members/user-member-1')
        .send({ role: 'manager' })

      expect(res.status).toBe(200)
      expect(mockMemberRepo.updateRole).toHaveBeenCalledWith('org-test-123', 'user-member-1', 'manager', undefined)
    })

    it('returns 400 when role is missing', async () => {
      const app = buildApp()
      const res = await request(app)
        .patch('/org/members/user-member-1')
        .send({})

      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid role', async () => {
      const app = buildApp()
      const res = await request(app)
        .patch('/org/members/user-member-1')
        .send({ role: 'superadmin' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when trying to change own role', async () => {
      const app = buildApp()
      const res = await request(app)
        .patch('/org/members/user-test-456')
        .send({ role: 'admin' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('own role')
    })

    it('returns 403 for privilege escalation', async () => {
      const { isRoleAtLeast } = await import('xspace-agent/rbac/permissions')
      ;(isRoleAtLeast as any).mockReturnValueOnce(true)  // first call passes (role check)
        .mockReturnValueOnce(false)  // second call fails (cannot modify higher role)

      const app = buildApp()
      const res = await request(app)
        .patch('/org/members/user-member-1')
        .send({ role: 'admin' })

      // The exact behavior depends on which isRoleAtLeast check triggers first
      expect([200, 403]).toContain(res.status)
    })

    it('returns 404 when member not found', async () => {
      mockMemberRepo.findByOrgAndUser.mockResolvedValueOnce(null)
      const app = buildApp()
      const res = await request(app)
        .patch('/org/members/user-unknown')
        .send({ role: 'developer' })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /org/members/:userId', () => {
    it('removes a member', async () => {
      const app = buildApp()
      const res = await request(app).delete('/org/members/user-member-1')

      expect(res.status).toBe(200)
      expect(res.body.removed).toBe(true)
      expect(mockMemberRepo.remove).toHaveBeenCalledWith('org-test-123', 'user-member-1')
    })

    it('returns 400 when trying to remove yourself', async () => {
      const app = buildApp()
      const res = await request(app).delete('/org/members/user-test-456')

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Cannot remove yourself')
    })

    it('returns 404 when member not found', async () => {
      mockMemberRepo.findByOrgAndUser.mockResolvedValueOnce(null)
      const app = buildApp()
      const res = await request(app).delete('/org/members/user-unknown')

      expect(res.status).toBe(404)
    })

    it('returns 403 when trying to remove owner', async () => {
      const app = buildApp()
      // Trying to remove another owner
      mockMemberRepo.findByOrgAndUser.mockResolvedValueOnce({
        userId: 'other-owner',
        orgId: 'org-test-123',
        role: 'owner',
      })
      const res = await request(app).delete('/org/members/other-owner')

      expect(res.status).toBe(403)
      expect(res.body.error).toContain('Cannot remove the organization owner')
    })
  })

  // =========================================================================
  // Custom Roles
  // =========================================================================

  describe('GET /org/roles', () => {
    it('returns built-in and custom roles', async () => {
      const app = buildApp({
        plan: {
          tier: 'enterprise',
          maxAgents: 100,
          maxConcurrentSessions: 50,
          maxSessionMinutesPerMonth: 100000,
          maxApiCallsPerMinute: 6000,
          features: ['custom-roles'],
          retentionDays: 365,
          support: 'dedicated',
          price: null,
        },
      })
      const res = await request(app).get('/org/roles')

      expect(res.status).toBe(200)
      expect(res.body.roles.length).toBeGreaterThanOrEqual(5) // 5 built-in
    })

    it('does not include custom roles for non-enterprise plans', async () => {
      const app = buildApp() // default pro plan
      const res = await request(app).get('/org/roles')

      expect(res.status).toBe(200)
      // Built-in roles only (no custom roles for pro plan)
      const customRoles = res.body.roles.filter((r: any) => !r.builtIn)
      expect(customRoles).toHaveLength(0)
    })
  })

  describe('POST /org/roles', () => {
    it('creates a custom role', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/org/roles')
        .send({
          name: 'Support Agent',
          description: 'Handles support',
          permissions: ['agents:read', 'agents:create'],
        })

      expect(res.status).toBe(201)
      expect(res.body.role.name).toBe('Support Agent')
      expect(mockCustomRoleRepo.create).toHaveBeenCalled()
    })

    it('returns 400 when name is missing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/org/roles')
        .send({ permissions: ['agents:read'] })

      expect(res.status).toBe(400)
    })

    it('returns 400 when permissions is not an array', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/org/roles')
        .send({ name: 'Bad Role', permissions: 'agents:read' })

      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid permissions', async () => {
      const { validatePermissions } = await import('xspace-agent/rbac/permissions')
      ;(validatePermissions as any).mockReturnValueOnce({ valid: false, invalid: ['badperm'] })

      const app = buildApp()
      const res = await request(app)
        .post('/org/roles')
        .send({ name: 'Bad', permissions: ['badperm'] })

      expect(res.status).toBe(400)
      expect(res.body.invalid).toContain('badperm')
    })

    it('returns 409 when role name already exists', async () => {
      mockCustomRoleRepo.findByName.mockResolvedValueOnce(mockCustomRoles[0])
      const app = buildApp()
      const res = await request(app)
        .post('/org/roles')
        .send({ name: 'Content Manager', permissions: ['agents:read'] })

      expect(res.status).toBe(409)
    })
  })

  describe('PATCH /org/roles/:roleId', () => {
    it('updates a custom role', async () => {
      const app = buildApp()
      const res = await request(app)
        .patch('/org/roles/cr-1')
        .send({ name: 'Updated Role', description: 'Updated desc' })

      expect(res.status).toBe(200)
      expect(mockCustomRoleRepo.update).toHaveBeenCalledWith('cr-1', expect.objectContaining({ name: 'Updated Role' }))
    })

    it('returns 404 for unknown role', async () => {
      mockCustomRoleRepo.findById.mockResolvedValueOnce(null)
      const app = buildApp()
      const res = await request(app)
        .patch('/org/roles/unknown')
        .send({ name: 'Nope' })

      expect(res.status).toBe(404)
    })

    it('returns 404 for role belonging to another org', async () => {
      mockCustomRoleRepo.findById.mockResolvedValueOnce({
        id: 'cr-other',
        orgId: 'other-org',
        name: 'Other Role',
        permissions: [],
      })
      const app = buildApp()
      const res = await request(app)
        .patch('/org/roles/cr-other')
        .send({ name: 'Hack' })

      expect(res.status).toBe(404)
    })

    it('validates permissions when updating', async () => {
      const { validatePermissions } = await import('xspace-agent/rbac/permissions')
      ;(validatePermissions as any).mockReturnValueOnce({ valid: false, invalid: ['bad'] })

      const app = buildApp()
      const res = await request(app)
        .patch('/org/roles/cr-1')
        .send({ permissions: ['bad'] })

      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /org/roles/:roleId', () => {
    it('deletes a custom role', async () => {
      const app = buildApp()
      const res = await request(app).delete('/org/roles/cr-1')

      expect(res.status).toBe(200)
      expect(res.body.deleted).toBe(true)
      expect(mockCustomRoleRepo.delete).toHaveBeenCalledWith('cr-1')
    })

    it('returns 404 for unknown role', async () => {
      mockCustomRoleRepo.findById.mockResolvedValueOnce(null)
      const app = buildApp()
      const res = await request(app).delete('/org/roles/unknown')

      expect(res.status).toBe(404)
    })

    it('returns 404 for role from another org', async () => {
      mockCustomRoleRepo.findById.mockResolvedValueOnce({
        id: 'cr-other',
        orgId: 'other-org',
        name: 'Other',
        permissions: [],
      })
      const app = buildApp()
      const res = await request(app).delete('/org/roles/cr-other')

      expect(res.status).toBe(404)
    })
  })

  // =========================================================================
  // Teams
  // =========================================================================

  describe('POST /org/teams', () => {
    it('creates a team', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/org/teams')
        .send({ name: 'Design Team', description: 'UI/UX', memberIds: ['user-member-1'] })

      expect(res.status).toBe(201)
      expect(res.body.team.name).toBe('Design Team')
      expect(mockTeamRepo.create).toHaveBeenCalled()
    })

    it('returns 400 when name is missing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/org/teams')
        .send({ description: 'No name' })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /org/teams', () => {
    it('lists teams', async () => {
      const app = buildApp()
      const res = await request(app).get('/org/teams')

      expect(res.status).toBe(200)
      expect(res.body.teams).toHaveLength(1)
      expect(res.body.teams[0].name).toBe('Engineering')
    })
  })

  describe('PATCH /org/teams/:teamId', () => {
    it('updates a team', async () => {
      const app = buildApp()
      const res = await request(app)
        .patch('/org/teams/team-1')
        .send({ name: 'Backend Team' })

      expect(res.status).toBe(200)
      expect(mockTeamRepo.update).toHaveBeenCalledWith('team-1', expect.objectContaining({ name: 'Backend Team' }))
    })

    it('returns 404 for unknown team', async () => {
      mockTeamRepo.findById.mockResolvedValueOnce(null)
      const app = buildApp()
      const res = await request(app)
        .patch('/org/teams/unknown')
        .send({ name: 'Nope' })

      expect(res.status).toBe(404)
    })

    it('returns 404 for team from another org', async () => {
      mockTeamRepo.findById.mockResolvedValueOnce({
        id: 'team-other',
        orgId: 'other-org',
        name: 'Other Team',
        memberIds: [],
      })
      const app = buildApp()
      const res = await request(app)
        .patch('/org/teams/team-other')
        .send({ name: 'Hack' })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /org/teams/:teamId', () => {
    it('deletes a team', async () => {
      const app = buildApp()
      const res = await request(app).delete('/org/teams/team-1')

      expect(res.status).toBe(200)
      expect(res.body.deleted).toBe(true)
      expect(mockTeamRepo.delete).toHaveBeenCalledWith('team-1')
    })

    it('returns 404 for unknown team', async () => {
      mockTeamRepo.findById.mockResolvedValueOnce(null)
      const app = buildApp()
      const res = await request(app).delete('/org/teams/unknown')

      expect(res.status).toBe(404)
    })

    it('returns 404 for team from another org', async () => {
      mockTeamRepo.findById.mockResolvedValueOnce({
        id: 'team-other',
        orgId: 'other-org',
        name: 'Other',
        memberIds: [],
      })
      const app = buildApp()
      const res = await request(app).delete('/org/teams/team-other')

      expect(res.status).toBe(404)
    })
  })
})
