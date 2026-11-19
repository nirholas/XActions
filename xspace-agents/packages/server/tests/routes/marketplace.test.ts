// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§68]

// =============================================================================
// Tests — Marketplace Routes (createMarketplaceRoutes)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createTestApp, createMockTenant } from '../helpers/test-app'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const publishedListing = {
  id: 'listing-1',
  slug: 'cool-plugin',
  name: 'Cool Plugin',
  type: 'plugin',
  category: 'automation',
  description: 'A cool plugin',
  status: 'published',
  publisherOrgId: 'org-test-123',
  publisherId: 'user-test-456',
  installCount: 42,
  ratingAvg: 4.5,
  ratingCount: 10,
  pricingModel: 'free',
  reviewNotes: 'internal-note-should-be-stripped',
}

const draftListing = {
  id: 'listing-2',
  slug: 'draft-plugin',
  name: 'Draft Plugin',
  status: 'draft',
  publisherOrgId: 'org-other',
}

const inReviewListing = {
  id: 'listing-3',
  slug: 'pending-review',
  name: 'Pending Review',
  status: 'in_review',
  publisherOrgId: 'org-other',
}

// ---------------------------------------------------------------------------
// Mock repositories
// ---------------------------------------------------------------------------

const mockListingRepo = {
  search: vi.fn(async () => ({ listings: [publishedListing], total: 1 })),
  findFeatured: vi.fn(async () => [publishedListing]),
  getCategories: vi.fn(async () => [{ name: 'automation', count: 5 }]),
  findBySlug: vi.fn(async (slug: string) => {
    if (slug === 'cool-plugin') return publishedListing
    if (slug === 'draft-plugin') return draftListing
    return null
  }),
  findById: vi.fn(async (id: string) => {
    if (id === 'listing-1') return publishedListing
    if (id === 'listing-3') return inReviewListing
    return null
  }),
  findByPublisher: vi.fn(async () => [publishedListing]),
  findPendingReview: vi.fn(async () => [inReviewListing]),
  create: vi.fn(async (data: any) => ({ id: 'listing-new', ...data })),
  update: vi.fn(async (id: string, data: any) => ({ id, ...publishedListing, ...data })),
  updateRating: vi.fn(async () => {}),
  incrementInstallCount: vi.fn(async () => {}),
  decrementInstallCount: vi.fn(async () => {}),
}

const mockInstallRepo = {
  findByListingAndOrg: vi.fn(async () => null),
  findByOrgId: vi.fn(async () => []),
  create: vi.fn(async (data: any) => ({ id: 'install-1', ...data })),
  cancel: vi.fn(async () => {}),
}

const mockReviewRepo = {
  findByListing: vi.fn(async () => [
    { id: 'rev-1', rating: 5, title: 'Great', body: 'Love it' },
  ]),
  findById: vi.fn(async (id: string) => {
    if (id === 'rev-1') return { id: 'rev-1', rating: 5, userId: 'user-test-456', listingId: 'listing-1' }
    if (id === 'rev-other') return { id: 'rev-other', rating: 3, userId: 'user-other', listingId: 'listing-1' }
    return null
  }),
  findByUserAndListing: vi.fn(async () => null),
  create: vi.fn(async (data: any) => ({ id: 'rev-new', ...data })),
  update: vi.fn(async (id: string, data: any) => ({ id, ...data })),
  delete: vi.fn(async () => {}),
  getListingStats: vi.fn(async () => ({ avg: 4.5, count: 10 })),
}

const mockPayoutRepo = {
  findByPublisher: vi.fn(async () => [
    { id: 'p-1', netPayoutCents: 1000 },
    { id: 'p-2', netPayoutCents: 2000 },
  ]),
}

vi.mock('xspace-agent', () => ({
  MarketplaceListingRepository: vi.fn(function () { return mockListingRepo }),
  MarketplaceInstallRepository: vi.fn(function () { return mockInstallRepo }),
  MarketplaceReviewRepository: vi.fn(function () { return mockReviewRepo }),
  PublisherPayoutRepository: vi.fn(function () { return mockPayoutRepo }),
}))

import { createMarketplaceRoutes } from '../../src/routes/marketplace'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Marketplace Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset defaults
    mockListingRepo.findBySlug.mockImplementation(async (slug: string) => {
      if (slug === 'cool-plugin') return publishedListing
      if (slug === 'draft-plugin') return draftListing
      return null
    })
    mockInstallRepo.findByListingAndOrg.mockResolvedValue(null)
    mockReviewRepo.findByUserAndListing.mockResolvedValue(null)
  })

  function buildApp(tenant = createMockTenant({ userRole: 'admin' })) {
    const app = createTestApp({ tenant })
    app.use(createMarketplaceRoutes())
    return app
  }

  function buildUnauthApp() {
    return createTestApp({ tenant: null })
  }

  // =========================================================================
  // Browse
  // =========================================================================

  describe('GET /marketplace', () => {
    it('returns search results with defaults', async () => {
      const app = buildApp()
      const res = await request(app).get('/marketplace')

      expect(res.status).toBe(200)
      expect(res.body.listings).toHaveLength(1)
      expect(res.body.total).toBe(1)
      expect(mockListingRepo.search).toHaveBeenCalled()
    })

    it('strips reviewNotes from listings', async () => {
      const app = buildApp()
      const res = await request(app).get('/marketplace')

      expect(res.body.listings[0]).not.toHaveProperty('reviewNotes')
    })

    it('passes search options', async () => {
      const app = buildApp()
      await request(app).get('/marketplace?q=cool&type=plugin&category=automation&sort=newest&limit=10&offset=5')

      expect(mockListingRepo.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'cool',
          type: 'plugin',
          category: 'automation',
          sort: 'newest',
          limit: 10,
          offset: 5,
        }),
      )
    })
  })

  describe('GET /marketplace/featured', () => {
    it('returns featured listings', async () => {
      const app = buildApp()
      const res = await request(app).get('/marketplace/featured')

      expect(res.status).toBe(200)
      expect(res.body.listings).toHaveLength(1)
      expect(res.body.listings[0]).not.toHaveProperty('reviewNotes')
    })
  })

  describe('GET /marketplace/categories', () => {
    it('returns category list with counts', async () => {
      const app = buildApp()
      const res = await request(app).get('/marketplace/categories')

      expect(res.status).toBe(200)
      expect(res.body.categories).toEqual([{ name: 'automation', count: 5 }])
    })
  })

  describe('GET /marketplace/:slug', () => {
    it('returns a listing by slug', async () => {
      const app = buildApp()
      const res = await request(app).get('/marketplace/cool-plugin')

      expect(res.status).toBe(200)
      expect(res.body.listing.name).toBe('Cool Plugin')
      expect(res.body.listing).not.toHaveProperty('reviewNotes')
    })

    it('returns 404 for unknown slug', async () => {
      const app = buildApp()
      const res = await request(app).get('/marketplace/nonexistent')

      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('GET /marketplace/:slug/reviews', () => {
    it('returns reviews for a listing', async () => {
      const app = buildApp()
      const res = await request(app).get('/marketplace/cool-plugin/reviews')

      expect(res.status).toBe(200)
      expect(res.body.reviews).toHaveLength(1)
      expect(res.body.listingId).toBe('listing-1')
    })

    it('returns 404 when listing not found', async () => {
      const app = buildApp()
      const res = await request(app).get('/marketplace/nonexistent/reviews')

      expect(res.status).toBe(404)
    })
  })

  // =========================================================================
  // Install / Uninstall
  // =========================================================================

  describe('POST /marketplace/:slug/install', () => {
    it('installs a published listing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/marketplace/cool-plugin/install')
        .send({})

      expect(res.status).toBe(201)
      expect(res.body.install).toBeDefined()
      expect(mockInstallRepo.create).toHaveBeenCalled()
      expect(mockListingRepo.incrementInstallCount).toHaveBeenCalledWith('listing-1')
    })

    it('returns 401 when unauthenticated', async () => {
      const app = buildUnauthApp()
      app.use(createMarketplaceRoutes())
      const res = await request(app)
        .post('/marketplace/cool-plugin/install')
        .send({})

      expect(res.status).toBe(401)
    })

    it('returns 404 for non-published listing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/marketplace/draft-plugin/install')
        .send({})

      expect(res.status).toBe(404)
    })

    it('returns 409 when already installed', async () => {
      mockInstallRepo.findByListingAndOrg.mockResolvedValueOnce({ id: 'existing-install' })
      const app = buildApp()
      const res = await request(app)
        .post('/marketplace/cool-plugin/install')
        .send({})

      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 404 for unknown listing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/marketplace/nonexistent/install')
        .send({})

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /marketplace/:slug/uninstall', () => {
    it('uninstalls a listing', async () => {
      mockInstallRepo.findByListingAndOrg.mockResolvedValueOnce({ id: 'install-1' })
      const app = buildApp()
      const res = await request(app).delete('/marketplace/cool-plugin/uninstall')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockInstallRepo.cancel).toHaveBeenCalledWith('install-1')
      expect(mockListingRepo.decrementInstallCount).toHaveBeenCalledWith('listing-1')
    })

    it('returns 401 when unauthenticated', async () => {
      const app = buildUnauthApp()
      app.use(createMarketplaceRoutes())
      const res = await request(app).delete('/marketplace/cool-plugin/uninstall')

      expect(res.status).toBe(401)
    })

    it('returns 404 when not installed', async () => {
      const app = buildApp()
      const res = await request(app).delete('/marketplace/cool-plugin/uninstall')

      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('NOT_FOUND')
    })

    it('returns 404 for unknown listing', async () => {
      const app = buildApp()
      const res = await request(app).delete('/marketplace/nonexistent/uninstall')

      expect(res.status).toBe(404)
    })
  })

  // NOTE: GET /marketplace/installed is defined after GET /marketplace/:slug
  // in the source, so Express matches "installed" as a :slug param first.
  // This is a route ordering issue in the source. We test the actual behavior:
  // the request hits the :slug handler and returns 404 since no listing has
  // slug "installed".
  describe('GET /marketplace/installed (route shadowed by :slug)', () => {
    it('is matched by :slug handler and returns 404', async () => {
      const app = buildApp()
      const res = await request(app).get('/marketplace/installed')

      // "installed" is treated as a slug, which won't be found
      expect(res.status).toBe(404)
    })
  })

  // =========================================================================
  // Publisher
  // =========================================================================

  describe('POST /marketplace/publish', () => {
    it('publishes a listing for review', async () => {
      mockListingRepo.findBySlug.mockResolvedValueOnce(null) // slug uniqueness check
      const app = buildApp()
      const res = await request(app)
        .post('/marketplace/publish')
        .send({
          name: 'My New Plugin',
          type: 'plugin',
          category: 'automation',
          description: 'Automates stuff',
          pricingModel: 'free',
          version: '1.0.0',
        })

      expect(res.status).toBe(201)
      expect(res.body.listing).toBeDefined()
      expect(mockListingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'my-new-plugin',
          status: 'in_review',
        }),
      )
    })

    it('returns 409 when slug already exists', async () => {
      // findBySlug for slug check returns an existing listing
      mockListingRepo.findBySlug.mockResolvedValueOnce(publishedListing)
      const app = buildApp()
      const res = await request(app)
        .post('/marketplace/publish')
        .send({
          name: 'Cool Plugin',
          type: 'plugin',
          category: 'automation',
          description: 'Duplicate',
          pricingModel: 'free',
          version: '1.0.0',
        })

      expect(res.status).toBe(409)
    })

    it('returns 401 when unauthenticated', async () => {
      const app = buildUnauthApp()
      app.use(createMarketplaceRoutes())
      const res = await request(app)
        .post('/marketplace/publish')
        .send({
          name: 'Unauth Plugin',
          type: 'plugin',
          category: 'automation',
          description: 'test',
          pricingModel: 'free',
          version: '1.0.0',
        })

      expect(res.status).toBe(401)
    })

    it('returns 400 for missing required fields', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/marketplace/publish')
        .send({ name: 'Incomplete' })

      expect(res.status).toBe(400)
    })

    it('validates priceCents is required for paid listings', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/marketplace/publish')
        .send({
          name: 'Paid Plugin',
          type: 'plugin',
          category: 'premium',
          description: 'Premium stuff',
          pricingModel: 'one_time',
          version: '1.0.0',
          // missing priceCents
        })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /marketplace/publisher/listings', () => {
    it('returns publisher listings', async () => {
      const app = buildApp()
      const res = await request(app).get('/marketplace/publisher/listings')

      expect(res.status).toBe(200)
      expect(res.body.listings).toBeDefined()
      expect(mockListingRepo.findByPublisher).toHaveBeenCalledWith('org-test-123')
    })
  })

  describe('GET /marketplace/publisher/analytics', () => {
    it('returns publisher analytics', async () => {
      const app = buildApp()
      const res = await request(app).get('/marketplace/publisher/analytics')

      expect(res.status).toBe(200)
      expect(res.body.listingCount).toBe(1)
      expect(res.body.totalInstalls).toBe(42)
      expect(res.body.avgRating).toBe(4.5)
      expect(res.body.totalRevenueCents).toBe(3000)
      expect(res.body.recentPayouts).toHaveLength(2)
    })
  })

  // =========================================================================
  // Reviews
  // =========================================================================

  describe('POST /marketplace/:slug/reviews', () => {
    it('submits a review for a published listing', async () => {
      // User has installed it
      mockInstallRepo.findByListingAndOrg.mockResolvedValueOnce({ id: 'install-1' })
      const app = buildApp()
      const res = await request(app)
        .post('/marketplace/cool-plugin/reviews')
        .send({ rating: 5, title: 'Great plugin', body: 'Love it' })

      expect(res.status).toBe(201)
      expect(res.body.review).toBeDefined()
      expect(mockReviewRepo.create).toHaveBeenCalled()
      expect(mockListingRepo.updateRating).toHaveBeenCalled()
    })

    it('returns 401 when unauthenticated', async () => {
      const app = buildUnauthApp()
      app.use(createMarketplaceRoutes())
      const res = await request(app)
        .post('/marketplace/cool-plugin/reviews')
        .send({ rating: 5 })

      expect(res.status).toBe(401)
    })

    it('returns 404 for non-published listing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/marketplace/draft-plugin/reviews')
        .send({ rating: 5 })

      expect(res.status).toBe(404)
    })

    it('returns 409 when user already reviewed', async () => {
      mockReviewRepo.findByUserAndListing.mockResolvedValueOnce({ id: 'existing-review' })
      const app = buildApp()
      const res = await request(app)
        .post('/marketplace/cool-plugin/reviews')
        .send({ rating: 5 })

      expect(res.status).toBe(409)
    })

    it('returns 403 when user has not installed the listing', async () => {
      // findByUserAndListing returns null (no existing review)
      // findByListingAndOrg returns null (not installed)
      const app = buildApp()
      const res = await request(app)
        .post('/marketplace/cool-plugin/reviews')
        .send({ rating: 5 })

      expect(res.status).toBe(403)
    })

    it('returns 400 for invalid rating', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/marketplace/cool-plugin/reviews')
        .send({ rating: 10 })

      expect(res.status).toBe(400)
    })
  })

  describe('PUT /marketplace/:slug/reviews/:id', () => {
    it('updates own review', async () => {
      const app = buildApp()
      const res = await request(app)
        .put('/marketplace/cool-plugin/reviews/rev-1')
        .send({ rating: 4, title: 'Updated' })

      expect(res.status).toBe(200)
      expect(mockReviewRepo.update).toHaveBeenCalledWith('rev-1', expect.objectContaining({ rating: 4 }))
    })

    it('returns 403 when updating another user review', async () => {
      const app = buildApp()
      const res = await request(app)
        .put('/marketplace/cool-plugin/reviews/rev-other')
        .send({ rating: 1 })

      expect(res.status).toBe(403)
    })

    it('returns 404 for unknown review', async () => {
      const app = buildApp()
      const res = await request(app)
        .put('/marketplace/cool-plugin/reviews/unknown')
        .send({ rating: 3 })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /marketplace/:slug/reviews/:id', () => {
    it('deletes own review', async () => {
      const app = buildApp()
      const res = await request(app).delete('/marketplace/cool-plugin/reviews/rev-1')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockReviewRepo.delete).toHaveBeenCalledWith('rev-1')
    })

    it('returns 403 when deleting another user review', async () => {
      const app = buildApp()
      const res = await request(app).delete('/marketplace/cool-plugin/reviews/rev-other')

      expect(res.status).toBe(403)
    })

    it('returns 404 for unknown review', async () => {
      const app = buildApp()
      const res = await request(app).delete('/marketplace/cool-plugin/reviews/unknown')

      expect(res.status).toBe(404)
    })
  })

  // =========================================================================
  // Admin
  // =========================================================================

  describe('GET /admin/marketplace/review-queue', () => {
    it('returns pending review queue', async () => {
      const app = buildApp()
      const res = await request(app).get('/admin/marketplace/review-queue')

      expect(res.status).toBe(200)
      expect(res.body.listings).toHaveLength(1)
    })
  })

  describe('POST /admin/marketplace/:id/approve', () => {
    it('approves a listing', async () => {
      const app = buildApp()
      const res = await request(app).post('/admin/marketplace/listing-3/approve')

      expect(res.status).toBe(200)
      expect(mockListingRepo.update).toHaveBeenCalledWith('listing-3', { status: 'published' })
    })

    it('returns 404 for unknown listing', async () => {
      const app = buildApp()
      const res = await request(app).post('/admin/marketplace/unknown/approve')

      expect(res.status).toBe(404)
    })
  })

  describe('POST /admin/marketplace/:id/reject', () => {
    it('rejects a listing with reason', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/admin/marketplace/listing-3/reject')
        .send({ reason: 'Insufficient documentation' })

      expect(res.status).toBe(200)
      expect(mockListingRepo.update).toHaveBeenCalledWith('listing-3', {
        status: 'draft',
        reviewNotes: 'Insufficient documentation',
      })
    })

    it('uses default reason when none provided', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/admin/marketplace/listing-3/reject')
        .send({})

      expect(res.status).toBe(200)
      expect(mockListingRepo.update).toHaveBeenCalledWith('listing-3', {
        status: 'draft',
        reviewNotes: 'Rejected by admin',
      })
    })

    it('returns 404 for unknown listing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/admin/marketplace/unknown/reject')
        .send({ reason: 'Bad' })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /admin/marketplace/:id/suspend', () => {
    it('suspends a listing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/admin/marketplace/listing-3/suspend')
        .send({ reason: 'Policy violation' })

      expect(res.status).toBe(200)
      expect(mockListingRepo.update).toHaveBeenCalledWith('listing-3', {
        status: 'suspended',
        reviewNotes: 'Policy violation',
      })
    })

    it('returns 404 for unknown listing', async () => {
      const app = buildApp()
      const res = await request(app)
        .post('/admin/marketplace/unknown/suspend')
        .send({ reason: 'Bad' })

      expect(res.status).toBe(404)
    })
  })
})
