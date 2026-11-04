// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§82]

// =============================================================================
// Marketplace Zod schemas
// =============================================================================

import { z } from 'zod'

const VALID_LISTING_TYPES = ['template', 'plugin', 'voice_pack', 'integration'] as const
const VALID_PRICING_MODELS = ['free', 'one_time', 'monthly', 'usage'] as const
const VALID_SORT_OPTIONS = ['popular', 'newest', 'rating', 'name'] as const

export const MarketplaceSearchQuerySchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  pricing: z.string().optional(),
  sort: z.enum(VALID_SORT_OPTIONS).optional().default('popular'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export const PublishListingBodySchema = z.object({
  name: z.string().min(1, 'name is required'),
  type: z.enum(VALID_LISTING_TYPES, {
    error: `Must be one of: ${VALID_LISTING_TYPES.join(', ')}`,
  }),
  category: z.string().min(1, 'category is required'),
  description: z.string().min(1, 'description is required'),
  pricingModel: z.enum(VALID_PRICING_MODELS, {
    error: `Must be one of: ${VALID_PRICING_MODELS.join(', ')}`,
  }),
  version: z.string().min(1, 'version is required'),
  longDescription: z.string().optional(),
  priceCents: z.number().int().positive().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  iconUrl: z.string().url().optional(),
  screenshots: z.array(z.string().url()).optional().default([]),
  demoUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
  documentationUrl: z.string().url().optional(),
  supportEmail: z.string().email().optional(),
  manifest: z.record(z.string(), z.any()).optional().default({}),
  minPlatformVersion: z.string().optional(),
}).refine(
  (data) => data.pricingModel === 'free' || (data.priceCents != null && data.priceCents > 0),
  { message: 'priceCents is required for paid listings', path: ['priceCents'] },
)

export const SubmitReviewBodySchema = z.object({
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  title: z.string().optional(),
  body: z.string().optional(),
})

export const UpdateReviewBodySchema = z.object({
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5').optional(),
  title: z.string().optional(),
  body: z.string().optional(),
})

export const InstallBodySchema = z.object({
  config: z.record(z.string(), z.any()).optional().default({}),
})

export const AdminRejectBodySchema = z.object({
  reason: z.string().optional().default('Rejected by admin'),
})
