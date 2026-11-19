// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§32]

// =============================================================================
// Webhooks Module — Public Exports
// =============================================================================

// Types
export {
  WEBHOOK_EVENTS,
  DEFAULT_RETRY_CONFIG,
  type WebhookEventType,
  type WebhookPayload,
  type DeliveryStatus,
  type RetryConfig,
  type WebhookDeliveryHeaders,
  type DeliveryAttemptResult,
} from './types'

// Signing
export {
  signPayload,
  verifySignature,
  generateWebhookSecret,
  generateEventId,
} from './signing'

// Outbound URL safety
export {
  assertDeliverableUrl,
  isPrivateAddress,
  WebhookUrlError,
} from './public-url'

// Delivery service
export {
  WebhookDeliveryService,
  type WebhookDeliveryServiceOptions,
} from './delivery'
