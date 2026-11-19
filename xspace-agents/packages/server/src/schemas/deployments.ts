// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§82]

// =============================================================================
// Deployment / CI-CD Zod schemas
// =============================================================================

import { z } from 'zod'

const VALID_ENVIRONMENTS = ['development', 'staging', 'production'] as const

export const VersionParamsSchema = z.object({
  id: z.string().min(1),
  version: z.string().refine(
    (v) => !isNaN(parseInt(v, 10)),
    { message: 'Version must be a number' },
  ),
})

export const CreateVersionBodySchema = z.object({
  config: z.record(z.string(), z.any()).refine((v) => Object.keys(v).length > 0, {
    message: 'config is required',
  }),
  changelog: z.string().optional(),
})

export const RunTestsBodySchema = z.object({
  versionId: z.string().min(1, 'versionId is required'),
  tests: z.array(z.object({
    name: z.string(),
    input: z.string(),
    expectedOutput: z.string().optional(),
  }).passthrough()).min(1, 'At least one test is required'),
})

export const DeployBodySchema = z.object({
  versionId: z.string().min(1, 'versionId is required'),
  environment: z.enum(VALID_ENVIRONMENTS, {
    error: `Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`,
  }),
})

export const PromoteBodySchema = z.object({
  versionId: z.string().min(1, 'versionId is required'),
  targetEnvironment: z.enum(VALID_ENVIRONMENTS, {
    error: `Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`,
  }),
})

export const RollbackBodySchema = z.object({
  environment: z.enum(VALID_ENVIRONMENTS, {
    error: `Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`,
  }),
  reason: z.string().min(1, 'reason is required'),
})
