/**
 * XActions A2A — Push Notifications
 *
 * Webhook-based push notifications for async task completion between agents.
 * Supports HMAC verification, retry with backoff, and subscription management.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import crypto from 'crypto';

// ============================================================================
// PushNotificationServer
// ============================================================================

export class PushNotificationServer {
  /**
   * @param {object} options
   * @param {string} options.callbackBaseUrl - e.g. 'https://agent.xactions.app'
   * @param {string} [options.secret] - HMAC secret for token verification
   */
  constructor(options = {}) {
    this.callbackBaseUrl = (options.callbackBaseUrl || 'http://localhost:3100').replace(/\/$/, '');
    this.secret = options.secret || crypto.randomBytes(32).toString('hex');
    /** @type {Array<function>} listeners */
    this._listeners = [];
  }

  /**
   * Register a listener for incoming push notifications.
   * @param {function} fn - (taskId, notification) => void
   */
  onNotification(fn) {
    this._listeners.push(fn);
  }

  /**
   * Generate a unique callback URL for a task with HMAC verification.
   *
   * @param {string} taskId
   * @returns {string}
   */
  generateCallbackUrl(taskId) {
    const token = crypto.createHmac('sha256', this.secret).update(taskId).digest('hex');
    return `${this.callbackBaseUrl}/a2a/callbacks/${taskId}?token=${token}`;
  }

  /**
   * Verify the HMAC token for a callback.
   *
   * @param {string} taskId
   * @param {string} token
   * @returns {boolean}
   */
  verifyToken(taskId, token) {
    const expected = crypto.createHmac('sha256', this.secret).update(taskId).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  }

  /**
   * Handle an incoming callback POST.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  handleCallback(req, res) {
    const { taskId } = req.params;
    const { token } = req.query;

    if (!token || !this.verifyToken(taskId, token)) {
      return res.status(401).json({ error: 'Invalid callback token' });
    }

    const notification = req.body;
    if (!notification || !notification.taskId) {
      return res.status(400).json({ error: 'Missing notification body' });
    }

    // Emit to listeners
    for (const fn of this._listeners) {
      try { fn(taskId, notification); } catch { /* swallow */ }
    }

    res.status(200).json({ received: true });
  }

  /**
   * Mount callback endpoints on an Express app.
   *
   * @param {import('express').Express} app
   */
  mountEndpoints(app) {
    app.post('/a2a/callbacks/:taskId', (req, res) => this.handleCallback(req, res));
  }
}

// ============================================================================
// PushNotificationClient
// ============================================================================

export class PushNotificationClient {
  /**
   * @param {object} [options={}]
   * @param {string} [options.secret] - Secret for signing outbound notifications
   * @param {number} [options.maxRetries=3]
   */
  constructor(options = {}) {
    this.secret = options.secret || '';
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Send a notification to a callback URL.
   *
   * @param {string} callbackUrl
   * @param {object} notification
   * @returns {Promise<boolean>} true if delivered
   */
  async sendNotification(callbackUrl, notification) {
    const body = JSON.stringify({
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
    });

    const signature = this.secret
      ? crypto.createHmac('sha256', this.secret).update(body).digest('hex')
      : '';

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(callbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(signature && { 'X-XActions-Signature': signature }),
          },
          body,
        });

        if (response.ok) return true;

        // Retry only on 5xx
        if (response.status < 500 || attempt >= this.maxRetries) {
          console.warn(`⚠️  Push notification failed: HTTP ${response.status} to ${callbackUrl}`);
          return false;
        }
      } catch (err) {
        if (attempt >= this.maxRetries) {
          console.warn(`⚠️  Push notification error: ${err.message} to ${callbackUrl}`);
          return false;
        }
      }

      // Exponential backoff
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }

    return false;
  }

  /** Convenience: notify task completed */
  async notifyTaskComplete(callbackUrl, taskId, result) {
    return this.sendNotification(callbackUrl, { taskId, state: 'completed', result });
  }

  /** Convenience: notify task failed */
  async notifyTaskFailed(callbackUrl, taskId, error) {
    return this.sendNotification(callbackUrl, { taskId, state: 'failed', error });
  }

  /** Convenience: notify task progress */
  async notifyTaskProgress(callbackUrl, taskId, progress) {
    return this.sendNotification(callbackUrl, { taskId, state: 'working', progress });
  }
}

// ============================================================================
// Subscription Manager
// ============================================================================

export class SubscriptionManager {
  constructor() {
    /** @type {Map<string, Set<string>>} taskId → Set<callbackUrl> */
    this._subscriptions = new Map();
    this._client = new PushNotificationClient();
  }

  /**
   * Subscribe a callback URL for task updates.
   *
   * @param {string} taskId
   * @param {string} callbackUrl
   */
  subscribe(taskId, callbackUrl) {
    if (!this._subscriptions.has(taskId)) {
      this._subscriptions.set(taskId, new Set());
    }
    this._subscriptions.get(taskId).add(callbackUrl);
  }

  /**
   * Unsubscribe all callbacks for a task.
   *
   * @param {string} taskId
   */
  unsubscribe(taskId) {
    this._subscriptions.delete(taskId);
  }

  /**
   * Get subscriptions for a task.
   *
   * @param {string} taskId
   * @returns {string[]} callback URLs
   */
  getSubscriptions(taskId) {
    const subs = this._subscriptions.get(taskId);
    return subs ? Array.from(subs) : [];
  }

  /**
   * Send a notification to all subscribers for a task.
   *
   * @param {string} taskId
   * @param {object} event
   * @returns {Promise<void>}
   */
  async notifySubscribers(taskId, event) {
    const urls = this.getSubscriptions(taskId);
    if (urls.length === 0) return;

    const notification = { taskId, ...event, timestamp: new Date().toISOString() };
    await Promise.allSettled(
      urls.map(url => this._client.sendNotification(url, notification))
    );
  }
}
