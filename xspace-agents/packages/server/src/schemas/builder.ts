// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§71]

// =============================================================================
// Builder / Flow Zod schemas
// =============================================================================

import { z } from 'zod'

const PersonalitySchema = z.object({
  name: z.string(),
  role: z.string(),
  tone: z.number().min(0).max(100),
  energy: z.number().min(0).max(100),
  detail: z.number().min(0).max(100),
  humor: z.number().min(0).max(100),
  knowledgeAreas: z.array(z.string()),
  excludeTopics: z.array(z.string()),
  exampleConversations: z.array(z.any()),
})

export const CreateFlowBodySchema = z.object({
  name: z.string().min(1, 'Flow name is required'),
  description: z.string().optional().default(''),
  nodes: z.array(z.any()).optional().default([]),
  connections: z.array(z.any()).optional().default([]),
  variables: z.array(z.any()).optional().default([]),
  personality: PersonalitySchema.optional(),
  templateId: z.string().optional(),
})

export const UpdateFlowBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  nodes: z.array(z.any()).optional(),
  connections: z.array(z.any()).optional(),
  variables: z.array(z.any()).optional(),
  personality: PersonalitySchema.optional(),
})

export const ValidateFlowBodySchema = z.object({
  nodes: z.array(z.any()).min(1, 'At least one node is required'),
  connections: z.array(z.any()).optional().default([]),
  variables: z.array(z.any()).optional().default([]),
}).passthrough()

export const DeployFlowBodySchema = z.object({
  platform: z.string().min(1, 'Deploy platform is required'),
  mode: z.string().optional(),
  credentials: z.record(z.string(), z.string()).optional(),
}).passthrough()

export const PreviewFlowBodySchema = z.object({
  platform: z.string().optional().default('x_spaces'),
})

export const FromTemplateBodySchema = z.object({
  name: z.string().optional(),
})
