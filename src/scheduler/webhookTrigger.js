// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Webhook Trigger System
 * Express routes that trigger scheduler jobs from external webhooks.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import crypto from 'crypto';
import { getScheduler } from './scheduler.js';

/**
 * Constant-time comparison of two secrets. Both sides are hashed first so the
 * comparison takes the same time whatever their lengths.
 */
export function secretsMatch(presented, expected) {
  if (typeof presented !== 'string' || typeof expected !== 'string' || !presented || !expected) return false;
  const a = crypto.createHash('sha256').update(presented).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * The secret a trigger request presents: the `X-Webhook-Secret` header, or
 * `Authorization: Bearer <secret>`. The `?secret=` query parameter is still
 * read so existing callers keep working, but it is deprecated: query strings
 * end up in proxy and access logs. Send the header.
 */
export function presentedSecret(req) {
  const header = req.get?.('x-webhook-secret') ?? req.headers?.['x-webhook-secret'];
  if (header) return String(header);
  const auth = req.get?.('authorization') ?? req.headers?.authorization ?? '';
  if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '');
  const query = req.query?.secret;
  return typeof query === 'string' ? query : '';
}

/**
 * Mount webhook routes on an Express app/router
 * Usage: mountWebhookRoutes(app) or mountWebhookRoutes(router)
 *
 * A job is triggerable only once it has a webhook secret
 * (`scheduler.setWebhookSecret(name)`); a job without one answers 403, since
 * an open trigger would let anyone who can reach the server run it.
 */
export function mountWebhookRoutes(router) {
  // Trigger a job by name
  router.post('/api/webhooks/trigger/:jobName', async (req, res) => {
    try {
      const scheduler = getScheduler();
      const { jobName } = req.params;

      const job = scheduler.jobs.get(jobName);
      if (!job) return res.status(404).json({ error: `Job "${jobName}" not found` });
      if (!job.config.webhookSecret) {
        return res.status(403).json({ error: `Job "${jobName}" has no webhook secret configured, so it cannot be triggered over HTTP` });
      }
      if (!secretsMatch(presentedSecret(req), job.config.webhookSecret)) {
        return res.status(403).json({ error: 'Invalid webhook secret' });
      }

      const result = await scheduler.runJobNow(jobName);
      res.json({ status: 'triggered', job: jobName, result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // List available webhook endpoints
  router.get('/api/webhooks', (req, res) => {
    const scheduler = getScheduler();
    const endpoints = [];
    for (const [name, job] of scheduler.jobs.entries()) {
      endpoints.push({
        name,
        url: `/api/webhooks/trigger/${name}`,
        method: 'POST',
        hasSecret: !!job.config.webhookSecret,
        enabled: job.config.enabled,
      });
    }
    res.json({ endpoints });
  });

  // Incoming data webhook — stores payload for processing
  router.post('/api/webhooks/ingest', async (req, res) => {
    try {
      const { source, event, data } = req.body;
      const scheduler = getScheduler();
      scheduler.emit('webhook:received', { source, event, data, receivedAt: new Date().toISOString() });
      res.json({ status: 'received', source, event });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

// by nichxbt
