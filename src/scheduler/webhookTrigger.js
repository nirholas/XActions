/**
 * XActions Webhook Trigger System
 * Express routes that trigger scheduler jobs from external webhooks.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { getScheduler } from './scheduler.js';

/**
 * Mount webhook routes on an Express app/router
 * Usage: mountWebhookRoutes(app) or mountWebhookRoutes(router)
 */
export function mountWebhookRoutes(router) {
  // Trigger a job by name
  router.post('/api/webhooks/trigger/:jobName', async (req, res) => {
    try {
      const scheduler = getScheduler();
      const { jobName } = req.params;
      const { secret } = req.query;

      // Optional secret check
      const job = scheduler.jobs.get(jobName);
      if (!job) return res.status(404).json({ error: `Job "${jobName}" not found` });
      if (job.config.webhookSecret && job.config.webhookSecret !== secret) {
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
