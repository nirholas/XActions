// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§69]

// =============================================================================
// Tests — Analytics Routes (createAnalyticsRoutes)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createTestApp, createMockTenant } from '../helpers/test-app'
import { createAnalyticsRoutes } from '../../src/routes/analytics'

// ---------------------------------------------------------------------------
// Mock xspace-agent imports
// ---------------------------------------------------------------------------

const mockGetBySessionId = vi.fn()
const mockGetSentimentTimeseries = vi.fn()
const mockGetAggregateStats = vi.fn()
const mockGetByOrgId = vi.fn()
const mockUpsertSessionAnalytics = vi.fn()
const mockDeleteSentimentBySessionId = vi.fn()
const mockInsertSentimentBatch = vi.fn()

const mockFindById = vi.fn()
const mockFindBySessionId = vi.fn()

vi.mock('xspace-agent', () => ({
  AnalyticsRepository: vi.fn().mockImplementation(function (this: any) {
    this.getBySessionId = mockGetBySessionId
    this.getSentimentTimeseries = mockGetSentimentTimeseries
    this.getAggregateStats = mockGetAggregateStats
    this.getByOrgId = mockGetByOrgId
    this.upsertSessionAnalytics = mockUpsertSessionAnalytics
    this.deleteSentimentBySessionId = mockDeleteSentimentBySessionId
    this.insertSentimentBatch = mockInsertSentimentBatch
  }),
  SessionRepository: vi.fn().mockImplementation(function (this: any) {
    this.findById = mockFindById
  }),
  // routes/analytics.ts imports core's ConversationRepository under this alias.
  ConversationDBRepository: vi.fn().mockImplementation(function (this: any) {
    this.findBySessionId = mockFindBySessionId
  }),
  runAnalyticsPipeline: vi.fn().mockReturnValue({
    metrics: {
      durationSeconds: 3600,
      activeSpeakingSeconds: 2400,
      silenceSeconds: 1200,
      participantCount: 3,
      totalTurns: 50,
      avgTurnLengthSeconds: 48,
    },
    sentimentAvg: 0.5,
    sentimentMin: -0.3,
    sentimentMax: 0.9,
    sentimentTrend: 'improving',
    topics: [{ topic: 'AI', messageCount: 20 }],
    primaryTopic: 'AI',
    speakers: [{ name: 'Alice', talkTimePct: 60, engagementScore: 0.8 }],
    sentimentPoints: [],
  }),
  generateInsights: vi.fn().mockReturnValue({
    summary: 'A productive session about AI.',
    keyDecisions: ['Use GPT-4 for production'],
    actionItems: ['Deploy by Friday'],
    recommendations: ['Increase session frequency'],
    highlights: [{ text: 'Great point about LLMs', speaker: 'Alice' }],
    riskFlags: [],
  }),
  scoreSentiment: vi.fn().mockReturnValue({ value: 0.5, label: 'positive' }),
}))

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const mockAnalytics = {
  sessionId: 'sess-123',
  orgId: 'org-test-123',
  durationSeconds: 3600,
  activeSpeakingSeconds: 2400,
  silenceSeconds: 1200,
  participantCount: 3,
  totalTurns: 50,
  avgTurnLengthSeconds: 48,
  sentimentAvg: 0.5,
  sentimentMin: -0.3,
  sentimentMax: 0.9,
  sentimentTrend: 'improving',
  topics: [{ topic: 'AI', messageCount: 20 }],
  primaryTopic: 'AI',
  speakers: [{ name: 'Alice', talkTimePct: 60, engagementScore: 0.8 }],
  summary: 'A productive discussion about AI.',
  keyDecisions: ['Use GPT-4 for production'],
  actionItems: ['Deploy by Friday'],
  recommendations: ['Increase session frequency'],
  highlights: [{ text: 'Great point about LLMs', speaker: 'Alice' }],
  riskFlags: [],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildApp(tenantOverride?: ReturnType<typeof createMockTenant> | null) {
  const tenant = tenantOverride === null ? null : (tenantOverride ?? createMockTenant())
  const app = createTestApp({ tenant })
  app.use(createAnalyticsRoutes())
  return app
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Analytics Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── GET /analytics/sessions/:id ───────────────────────────────────────

  describe('GET /analytics/sessions/:id', () => {
    it('returns full analytics for a session', async () => {
      mockGetBySessionId.mockResolvedValue(mockAnalytics)

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/sess-123')

      expect(res.status).toBe(200)
      expect(res.body.sessionId).toBe('sess-123')
      expect(res.body.primaryTopic).toBe('AI')
      expect(res.body.participantCount).toBe(3)
    })

    it('returns 404 when analytics not found', async () => {
      mockGetBySessionId.mockResolvedValue(null)

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/nonexistent')

      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('NOT_FOUND')
    })

    it('returns 403 when analytics belong to a different org', async () => {
      mockGetBySessionId.mockResolvedValue({ ...mockAnalytics, orgId: 'org-other' })

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/sess-123')

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })

    it('returns 401 without tenant context', async () => {
      const app = buildApp(null)
      const res = await request(app).get('/analytics/sessions/sess-123')

      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('AUTH_REQUIRED')
    })

    it('returns 500 on internal error', async () => {
      mockGetBySessionId.mockRejectedValue(new Error('DB down'))

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/sess-123')

      expect(res.status).toBe(500)
      expect(res.body.error.code).toBe('INTERNAL_ERROR')
    })
  })

  // ── GET /analytics/sessions/:id/sentiment ─────────────────────────────

  describe('GET /analytics/sessions/:id/sentiment', () => {
    it('returns sentiment timeseries', async () => {
      const timeseries = [
        { timestamp: 1000, speaker: 'Alice', sentiment: 0.6 },
        { timestamp: 2000, speaker: 'Bob', sentiment: -0.1 },
      ]
      mockGetSentimentTimeseries.mockResolvedValue(timeseries)

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/sess-123/sentiment')

      expect(res.status).toBe(200)
      expect(res.body.sessionId).toBe('sess-123')
      expect(res.body.points).toHaveLength(2)
    })

    it('passes speaker filter when provided', async () => {
      mockGetSentimentTimeseries.mockResolvedValue([])

      const app = buildApp()
      await request(app).get('/analytics/sessions/sess-123/sentiment?speaker=Alice')

      expect(mockGetSentimentTimeseries).toHaveBeenCalledWith('sess-123', { speaker: 'Alice' })
    })

    it('returns 401 without tenant context', async () => {
      const app = buildApp(null)
      const res = await request(app).get('/analytics/sessions/sess-123/sentiment')

      expect(res.status).toBe(401)
    })
  })

  // ── GET /analytics/sessions/:id/topics ────────────────────────────────

  describe('GET /analytics/sessions/:id/topics', () => {
    it('returns topic breakdown for a session', async () => {
      mockGetBySessionId.mockResolvedValue(mockAnalytics)

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/sess-123/topics')

      expect(res.status).toBe(200)
      expect(res.body.sessionId).toBe('sess-123')
      expect(res.body.primaryTopic).toBe('AI')
      expect(res.body.topics).toHaveLength(1)
    })

    it('returns 404 when analytics not found', async () => {
      mockGetBySessionId.mockResolvedValue(null)

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/sess-123/topics')

      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('NOT_FOUND')
    })

    it('returns 401 without tenant context', async () => {
      const app = buildApp(null)
      const res = await request(app).get('/analytics/sessions/sess-123/topics')

      expect(res.status).toBe(401)
    })
  })

  // ── GET /analytics/sessions/:id/speakers ──────────────────────────────

  describe('GET /analytics/sessions/:id/speakers', () => {
    it('returns speaker analytics for a session', async () => {
      mockGetBySessionId.mockResolvedValue(mockAnalytics)

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/sess-123/speakers')

      expect(res.status).toBe(200)
      expect(res.body.sessionId).toBe('sess-123')
      expect(res.body.speakers).toHaveLength(1)
      expect(res.body.speakers[0].name).toBe('Alice')
      expect(res.body.participantCount).toBe(3)
    })

    it('returns 404 when analytics not found', async () => {
      mockGetBySessionId.mockResolvedValue(null)

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/sess-123/speakers')

      expect(res.status).toBe(404)
    })

    it('returns 401 without tenant context', async () => {
      const app = buildApp(null)
      const res = await request(app).get('/analytics/sessions/sess-123/speakers')

      expect(res.status).toBe(401)
    })
  })

  // ── GET /analytics/sessions/:id/insights ──────────────────────────────

  describe('GET /analytics/sessions/:id/insights', () => {
    it('returns AI-generated insights for a session', async () => {
      mockGetBySessionId.mockResolvedValue(mockAnalytics)

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/sess-123/insights')

      expect(res.status).toBe(200)
      expect(res.body.sessionId).toBe('sess-123')
      expect(res.body.summary).toBeDefined()
      expect(res.body.keyDecisions).toBeInstanceOf(Array)
      expect(res.body.actionItems).toBeInstanceOf(Array)
      expect(res.body.recommendations).toBeInstanceOf(Array)
      expect(res.body.highlights).toBeInstanceOf(Array)
      expect(res.body.riskFlags).toBeInstanceOf(Array)
    })

    it('returns 404 when analytics not found', async () => {
      mockGetBySessionId.mockResolvedValue(null)

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/sess-123/insights')

      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('NOT_FOUND')
    })

    it('returns 401 without tenant context', async () => {
      const app = buildApp(null)
      const res = await request(app).get('/analytics/sessions/sess-123/insights')

      expect(res.status).toBe(401)
    })
  })

  // ── GET /analytics/sessions/:id/transcript ────────────────────────────

  describe('GET /analytics/sessions/:id/transcript', () => {
    it('returns annotated transcript', async () => {
      mockFindBySessionId.mockResolvedValue([
        {
          messages: [
            { speaker: 'Alice', text: 'Hello everyone', timestamp: 1000 },
            { speaker: 'Bob', text: 'Hi Alice', timestamp: 2000 },
          ],
        },
      ])
      mockGetBySessionId.mockResolvedValue(mockAnalytics)

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/sess-123/transcript')

      expect(res.status).toBe(200)
      expect(res.body.sessionId).toBe('sess-123')
      expect(res.body.messageCount).toBe(2)
      expect(res.body.transcript).toHaveLength(2)
      expect(res.body.transcript[0].speaker).toBe('Alice')
      expect(res.body.transcript[0].sentiment).toBeDefined()
    })

    it('returns 404 when no conversations found', async () => {
      mockFindBySessionId.mockResolvedValue([])

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/sess-123/transcript')

      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('NOT_FOUND')
    })

    it('returns 404 when conversations is null', async () => {
      mockFindBySessionId.mockResolvedValue(null)

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/sess-123/transcript')

      expect(res.status).toBe(404)
    })

    it('skips messages with empty text', async () => {
      mockFindBySessionId.mockResolvedValue([
        {
          messages: [
            { speaker: 'Alice', text: 'Hello', timestamp: 1000 },
            { speaker: 'Bob', text: '', timestamp: 2000 },
            { speaker: 'Charlie', content: '', timestamp: 3000 },
          ],
        },
      ])
      mockGetBySessionId.mockResolvedValue(mockAnalytics)

      const app = buildApp()
      const res = await request(app).get('/analytics/sessions/sess-123/transcript')

      expect(res.status).toBe(200)
      expect(res.body.messageCount).toBe(1)
    })

    it('returns 401 without tenant context', async () => {
      const app = buildApp(null)
      const res = await request(app).get('/analytics/sessions/sess-123/transcript')

      expect(res.status).toBe(401)
    })
  })

  // ── GET /analytics/aggregate ──────────────────────────────────────────

  describe('GET /analytics/aggregate', () => {
    it('returns aggregate analytics', async () => {
      const stats = { totalSessions: 10, avgSentiment: 0.4, avgDuration: 2400 }
      mockGetAggregateStats.mockResolvedValue(stats)

      const app = buildApp()
      const res = await request(app).get('/analytics/aggregate')

      expect(res.status).toBe(200)
      expect(res.body.totalSessions).toBe(10)
    })

    it('passes parsed period as since date', async () => {
      mockGetAggregateStats.mockResolvedValue({})

      const app = buildApp()
      await request(app).get('/analytics/aggregate?period=7d')

      expect(mockGetAggregateStats).toHaveBeenCalledWith(
        'org-test-123',
        expect.objectContaining({ since: expect.any(Date) }),
      )
    })

    it('returns 401 without tenant context', async () => {
      const app = buildApp(null)
      const res = await request(app).get('/analytics/aggregate')

      expect(res.status).toBe(401)
    })

    it('returns 400 for invalid period format', async () => {
      const app = buildApp()
      const res = await request(app).get('/analytics/aggregate?period=invalid')

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // ── GET /analytics/trends ─────────────────────────────────────────────

  describe('GET /analytics/trends', () => {
    it('returns trend data for default 30 days', async () => {
      mockGetByOrgId.mockResolvedValue({
        rows: [
          {
            processedAt: new Date('2025-06-10'),
            sentimentAvg: 0.5,
            durationSeconds: 3600,
          },
          {
            processedAt: new Date('2025-06-10'),
            sentimentAvg: 0.3,
            durationSeconds: 1800,
          },
          {
            processedAt: new Date('2025-06-11'),
            sentimentAvg: 0.7,
            durationSeconds: 2400,
          },
        ],
        total: 3,
      })

      const app = buildApp()
      const res = await request(app).get('/analytics/trends')

      expect(res.status).toBe(200)
      expect(res.body.period).toBe('30d')
      expect(res.body.trends).toBeInstanceOf(Array)
      expect(res.body.trends.length).toBeGreaterThanOrEqual(1)

      // Trends should be sorted by date
      for (let i = 1; i < res.body.trends.length; i++) {
        expect(res.body.trends[i].date >= res.body.trends[i - 1].date).toBe(true)
      }
    })

    it('computes daily averages correctly', async () => {
      mockGetByOrgId.mockResolvedValue({
        rows: [
          { processedAt: new Date('2025-06-10'), sentimentAvg: 0.4, durationSeconds: 1000 },
          { processedAt: new Date('2025-06-10'), sentimentAvg: 0.6, durationSeconds: 3000 },
        ],
        total: 2,
      })

      const app = buildApp()
      const res = await request(app).get('/analytics/trends')

      expect(res.status).toBe(200)
      const day = res.body.trends.find((t: any) => t.date === '2025-06-10')
      expect(day).toBeDefined()
      expect(day.sessionCount).toBe(2)
      expect(day.avgSentiment).toBeCloseTo(0.5, 5)
      expect(day.avgDurationSeconds).toBe(2000)
    })

    it('accepts custom days parameter', async () => {
      mockGetByOrgId.mockResolvedValue({ rows: [], total: 0 })

      const app = buildApp()
      const res = await request(app).get('/analytics/trends?days=7')

      expect(res.status).toBe(200)
      expect(res.body.period).toBe('7d')
    })

    it('returns 401 without tenant context', async () => {
      const app = buildApp(null)
      const res = await request(app).get('/analytics/trends')

      expect(res.status).toBe(401)
    })

    it('handles empty rows', async () => {
      mockGetByOrgId.mockResolvedValue({ rows: [], total: 0 })

      const app = buildApp()
      const res = await request(app).get('/analytics/trends')

      expect(res.status).toBe(200)
      expect(res.body.trends).toEqual([])
    })
  })
})
