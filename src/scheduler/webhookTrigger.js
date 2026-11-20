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

/** Shortest secret accepted, the same floor as a job's webhookSecret. */
const MIN_SECRET_LENGTH = 16;

/**
 * Mount webhook routes on an Express app/router
 * Usage: mountWebhookRoutes(app) or mountWebhookRoutes(router)
 *
 * Every route needs a secret, presented the same way (see presentedSecret()):
 *
 * - `POST /api/webhooks/trigger/:jobName` runs a job, and needs that job's
 *   secret (`scheduler.setWebhookSecret(name)`); a job without one answers 403,
 *   since an open trigger would let anyone who can reach the server run it.
 * - `POST /api/webhooks/ingest` emits `webhook:received` on the scheduler, and
 *   needs the ingest secret (`options.ingestSecret`, default
 *   XACTIONS_SCHEDULER_INGEST_SECRET); with none configured it answers 403.
 *
 * There is no listing route. `GET /api/webhooks` once answered every job's
 * name, and whether it had a secret, to anyone who asked; nothing called it.
 *
 * @param {import('express').Router|import('express').Express} router
 * @param {object} [options]
 * @param {string} [options.ingestSecret] secret for the ingest route, at least
 *   16 characters
 */
export function mountWebhookRoutes(router, options = {}) {
  const ingestSecret = options.ingestSecret ?? process.env.XACTIONS_SCHEDULER_INGEST_SECRET;
  if (ingestSecret !== undefined && ingestSecret !== '' && String(ingestSecret).length < MIN_SECRET_LENGTH) {
    throw new Error(`The scheduler ingest secret must be at least ${MIN_SECRET_LENGTH} characters`);
  }

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

  // Incoming data webhook — hands the payload to `webhook:received` listeners
  router.post('/api/webhooks/ingest', async (req, res) => {
    try {
      if (!ingestSecret) {
        return res.status(403).json({ error: 'No ingest secret is configured (XACTIONS_SCHEDULER_INGEST_SECRET), so data cannot be ingested over HTTP' });
      }
      if (!secretsMatch(presentedSecret(req), String(ingestSecret))) {
        return res.status(403).json({ error: 'Invalid webhook secret' });
      }
      const { source, event, data } = req.body || {};
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
