// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§83]

// =============================================================================
// Webhooks — Delivery Service
// =============================================================================
//
// Handles dispatching webhook events, HTTP delivery with retries, and
// auto-disabling webhooks after repeated failures. Uses an in-process timer
// for retry scheduling (can be replaced with BullMQ when queue system lands).
// =============================================================================

import axios from 'axios'
import { EventEmitter } from 'events'
import { WebhookRepository, WebhookDeliveryRepository } from '../db/repositories'
import type { Webhook } from '../db/repositories/webhook'
import type { WebhookDelivery } from '../db/repositories/webhook-delivery'
import { signPayload, generateEventId } from './signing'
import { assertDeliverableUrl, publicOnlyAgents } from './public-url'
import {
  DEFAULT_RETRY_CONFIG,
  type WebhookEventType,
  type WebhookPayload,
  type RetryConfig,
  type DeliveryAttemptResult,
  type DeliveryStatus,
} from './types'

export interface WebhookDeliveryServiceOptions {
  /** Override retry configuration. */
  retryConfig?: Partial<RetryConfig>
  /** Polling interval for retryable deliveries in ms (default: 30000). */
  retryPollIntervalMs?: number
  /** Timeout for individual HTTP requests in ms (default: 30000). */
  requestTimeoutMs?: number
  /** API version string (default: '2024-01-15'). */
  apiVersion?: string
}

/**
 * Events emitted by the delivery service:
 * - 'delivered' — successful delivery
 * - 'failed'    — delivery attempt failed (will retry)
 * - 'exhausted' — all retries exhausted for a delivery
 * - 'disabled'  — webhook auto-disabled after repeated failures
 */
export class WebhookDeliveryService extends EventEmitter {
  private webhookRepo: WebhookRepository
  private deliveryRepo: WebhookDeliveryRepository
  private retryConfig: RetryConfig
  private retryPollIntervalMs: number
  private requestTimeoutMs: number
  private apiVersion: string
  private retryTimer: ReturnType<typeof setInterval> | null = null
  private running = false

  constructor(options: WebhookDeliveryServiceOptions = {}) {
    super()
    this.webhookRepo = new WebhookRepository()
    this.deliveryRepo = new WebhookDeliveryRepository()
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig }
    this.retryPollIntervalMs = options.retryPollIntervalMs ?? 30_000
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000
    this.apiVersion = options.apiVersion ?? '2024-01-15'
  }

  /** Start the retry polling loop. */
  start(): void {
    if (this.running) return
    this.running = true
    this.retryTimer = setInterval(() => this.processRetries(), this.retryPollIntervalMs)
  }

  /** Stop the retry polling loop. */
  stop(): void {
    this.running = false
    if (this.retryTimer) {
      clearInterval(this.retryTimer)
      this.retryTimer = null
    }
  }

  /**
   * Dispatch a webhook event to all matching endpoints for an org.
   * Creates delivery records and attempts immediate delivery.
   */
  async dispatch(
    orgId: string,
    eventType: WebhookEventType,
    data: Record<string, unknown>,
  ): Promise<string[]> {
    const webhooks = await this.webhookRepo.findActiveForEvent(orgId, eventType)
    if (webhooks.length === 0) return []

    const eventId = generateEventId()
    const payload: WebhookPayload = {
      id: eventId,
      type: eventType,
      created: Math.floor(Date.now() / 1000),
      data: { object: data },
      org_id: orgId,
      api_version: this.apiVersion,
    }

    const deliveryIds: string[] = []

    for (const webhook of webhooks) {
      const delivery = await this.deliveryRepo.create({
        webhookId: webhook.id,
        eventType,
        payload,
        status: 'pending',
        attempts: 0,
      })
      deliveryIds.push(delivery.id)

      // Fire-and-forget immediate delivery attempt
      this.attemptDelivery(webhook, delivery, payload).catch(() => {})
    }

    return deliveryIds
  }

  /**
   * Send a test event to a specific webhook endpoint.
   */
  async sendTestEvent(webhookId: string): Promise<DeliveryAttemptResult> {
    const webhook = await this.webhookRepo.findById(webhookId)
    if (!webhook) {
      return { success: false, durationMs: 0, error: 'Webhook not found' }
    }

    const payload: WebhookPayload = {
      id: generateEventId(),
      type: 'agent.created',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'agt_test_000000000000',
          name: 'Test Agent',
          status: 'idle',
          test: true,
        },
      },
      org_id: webhook.orgId!,
      api_version: this.apiVersion,
    }

    return this.executeRequest(webhook, payload)
  }

  /** Manually retry a specific delivery. */
  async retryDelivery(deliveryId: string): Promise<DeliveryAttemptResult> {
    const delivery = await this.deliveryRepo.findById(deliveryId)
    if (!delivery) {
      return { success: false, durationMs: 0, error: 'Delivery not found' }
    }

    const webhook = await this.webhookRepo.findById(delivery.webhookId!)
    if (!webhook) {
      return { success: false, durationMs: 0, error: 'Webhook not found' }
    }

    return this.attemptDelivery(webhook, delivery, delivery.payload as WebhookPayload)
  }

  /** Process all retryable deliveries (called by the polling loop). */
  async processRetries(): Promise<number> {
    const retryable = await this.deliveryRepo.findRetryable()
    let processed = 0

    for (const delivery of retryable) {
      const webhook = await this.webhookRepo.findById(delivery.webhookId!)
      if (!webhook || webhook.active !== 'true') continue

      await this.attemptDelivery(webhook, delivery, delivery.payload as WebhookPayload)
      processed++
    }

    return processed
  }

  /** Attempt delivery of a webhook payload. Handles success, failure, and exhaustion. */
  private async attemptDelivery(
    webhook: Webhook,
    delivery: WebhookDelivery,
    payload: WebhookPayload,
  ): Promise<DeliveryAttemptResult> {
    const attempt = (delivery.attempts ?? 0) + 1
    const result = await this.executeRequest(webhook, payload)
    const now = new Date()

    if (result.success) {
      await this.deliveryRepo.updateStatus(delivery.id, {
        status: 'delivered',
        attempts: attempt,
        lastAttemptAt: now,
        nextRetryAt: null,
        responseStatus: result.statusCode,
        responseBody: result.responseBody?.slice(0, 2048),
        durationMs: result.durationMs,
      })
      await this.webhookRepo.resetFailureCount(webhook.id)
      this.emit('delivered', { deliveryId: delivery.id, webhookId: webhook.id })
      return result
    }

    // Failed attempt
    if (attempt >= this.retryConfig.maxAttempts) {
      // Exhausted all retries
      await this.deliveryRepo.updateStatus(delivery.id, {
        status: 'exhausted' as DeliveryStatus,
        attempts: attempt,
        lastAttemptAt: now,
        nextRetryAt: null,
        responseStatus: result.statusCode,
        responseBody: result.responseBody?.slice(0, 2048),
        durationMs: result.durationMs,
      })
      this.emit('exhausted', { deliveryId: delivery.id, webhookId: webhook.id })

      // Check if we should auto-disable
      const failureCount = await this.webhookRepo.incrementFailureCount(webhook.id)
      if (failureCount >= this.retryConfig.autoDisableThreshold) {
        await this.webhookRepo.update(webhook.id, { active: 'false' })
        this.emit('disabled', { webhookId: webhook.id, url: webhook.url, failureCount })
      }
    } else {
      // Schedule retry with exponential backoff + jitter
      const baseDelay = this.retryConfig.backoffDelaysMs[attempt] ?? this.retryConfig.backoffDelaysMs[this.retryConfig.backoffDelaysMs.length - 1]
      const jitter = Math.floor(Math.random() * baseDelay * 0.1) // ±10% jitter
      const nextRetry = new Date(now.getTime() + baseDelay + jitter)

      await this.deliveryRepo.updateStatus(delivery.id, {
        status: 'failed',
        attempts: attempt,
        lastAttemptAt: now,
        nextRetryAt: nextRetry,
        responseStatus: result.statusCode,
        responseBody: result.responseBody?.slice(0, 2048),
        durationMs: result.durationMs,
      })
      this.emit('failed', { deliveryId: delivery.id, webhookId: webhook.id, attempt, nextRetry })
    }

    return result
  }

  /** Execute the actual HTTP request to a webhook endpoint. */
  private async executeRequest(
    webhook: Webhook,
    payload: WebhookPayload,
  ): Promise<DeliveryAttemptResult> {
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = signPayload(payload, webhook.secret, timestamp)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'XSpaceAgent-Webhook/1.0',
      'X-Webhook-Id': payload.id,
      'X-Webhook-Timestamp': String(timestamp),
      'X-Webhook-Signature': signature,
      // Merge any custom headers from the webhook config
      ...(typeof webhook.headers === 'object' && webhook.headers !== null ? webhook.headers as Record<string, string> : {}),
    }

    const start = Date.now()
    try {
      // Tenant-supplied URL: refuse private/local targets, checked again at
      // connect time by the agents so DNS rebinding cannot slip past.
      assertDeliverableUrl(webhook.url)
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: this.requestTimeoutMs,
        validateStatus: () => true, // Don't throw on non-2xx
        maxRedirects: 0,
        ...publicOnlyAgents,
      })

      const durationMs = Date.now() - start
      const success = response.status >= 200 && response.status < 300

      return {
        success,
        statusCode: response.status,
        responseBody: typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data),
        durationMs,
      }
    } catch (err: any) {
      return {
        success: false,
        durationMs: Date.now() - start,
        error: err.message ?? 'Unknown error',
      }
    }
  }
}
