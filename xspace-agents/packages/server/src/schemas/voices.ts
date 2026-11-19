// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§84]

// =============================================================================
// Voice Cloning Zod schemas
// =============================================================================

import { z } from 'zod'

/** Schema for voice cloning via audio sample upload. */
export const CloneVoiceBodySchema = z.object({
  name: z.string().min(1, 'Voice name is required').max(100),
  consent: z.object({
    consentType: z.enum(['self', 'authorized', 'synthetic']),
    consentDocument: z.string().optional(),
    agreedToTerms: z.literal(true, {
      error: 'You must agree to the terms of service',
    }),
  }),
})

/** Schema for designing a voice from a text description. */
export const DesignVoiceBodySchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters').max(500),
  gender: z.enum(['male', 'female', 'neutral']),
  age: z.enum(['young', 'middle', 'senior']),
  accent: z.string().max(50).optional(),
  style: z.enum(['conversational', 'professional', 'energetic', 'calm', 'authoritative']),
})

/** Schema for updating a voice. */
export const UpdateVoiceBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  settings: z.object({
    stability: z.number().min(0).max(1).optional(),
    similarityBoost: z.number().min(0).max(1).optional(),
    style: z.number().min(0).max(1).optional(),
    speed: z.number().min(0.5).max(2.0).optional(),
  }).optional(),
})

/** Schema for voice preview request. */
export const PreviewVoiceBodySchema = z.object({
  text: z.string().min(1, 'Preview text is required').max(1000),
})

/** Schema for assigning a voice to an agent. */
export const AssignVoiceParamsSchema = z.object({
  id: z.string().min(1, 'Voice ID is required'),
  agentId: z.string().min(1, 'Agent ID is required'),
})

/** Schema for publishing to marketplace. */
export const PublishVoiceBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(2000),
  tags: z.array(z.string().max(50)).max(10),
  pricePerMonth: z.number().min(0).max(10000),
  previewText: z.string().min(1).max(500),
})
