// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§73]

// =============================================================================
// Onboarding Zod schemas
// =============================================================================

import { z } from 'zod'

export const StartOnboardingBodySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  orgId: z.string().min(1, 'orgId is required'),
  signupMethod: z.string().optional().default('email'),
  referralCode: z.string().optional(),
})

export const OnboardingParamsSchema = z.object({
  orgId: z.string().min(1),
  userId: z.string().min(1),
})

export const WelcomeWizardBodySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  orgId: z.string().min(1, 'orgId is required'),
  answers: z.object({
    useCase: z.string().optional(),
    teamSize: z.string().optional(),
    experience: z.string().optional(),
  }).passthrough(),
})

export const CreateAgentBodySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  orgId: z.string().min(1, 'orgId is required'),
  input: z.object({
    name: z.string().optional(),
    templateId: z.string().optional(),
  }).passthrough(),
})

export const UserOrgBodySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  orgId: z.string().min(1, 'orgId is required'),
})

export const SkipStepBodySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  orgId: z.string().min(1, 'orgId is required'),
  targetStep: z.string().min(1, 'targetStep is required'),
})

export const EvaluateTriggersBodySchema = z.object({
  orgId: z.string().min(1, 'orgId is required'),
  currentPlan: z.string().min(1, 'currentPlan is required'),
  quotas: z.record(z.string(), z.any()),
  context: z.any().optional(),
})

export const DismissTriggerBodySchema = z.object({
  orgId: z.string().min(1, 'orgId is required'),
  triggerId: z.string().min(1, 'triggerId is required'),
})

export const TrackActivationBodySchema = z.object({
  event: z.string().min(1, 'event is required'),
  userId: z.string().min(1, 'userId is required'),
  orgId: z.string().min(1, 'orgId is required'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const DripEvaluateBodySchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  orgId: z.string().min(1, 'orgId is required'),
  currentPlan: z.string().min(1, 'currentPlan is required'),
})

export const ReferralSignupBodySchema = z.object({
  code: z.string().min(1, 'code is required'),
  referredUserId: z.string().min(1, 'referredUserId is required'),
  referredOrgId: z.string().min(1, 'referredOrgId is required'),
})

export const FunnelQuerySchema = z.object({
  start: z.string().min(1, 'start query parameter is required (ISO date)'),
  end: z.string().min(1, 'end query parameter is required (ISO date)'),
})
