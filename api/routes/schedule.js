/**
 * XActions Scheduler API Routes
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { Router } from 'express';

const router = Router();

// GET /api/schedule — list all jobs
router.get('/', async (req, res) => {
  try {
    const { getScheduler } = await import('../../src/scheduler/scheduler.js');
    const scheduler = getScheduler();
    res.json({ jobs: scheduler.listJobs() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schedule — add a job
router.post('/', async (req, res) => {
  try {
    const { getScheduler } = await import('../../src/scheduler/scheduler.js');
    const scheduler = getScheduler();
    const { name, cron, action } = req.body;
    if (!name || !cron) return res.status(400).json({ error: 'name and cron required' });
    scheduler.addJob({ name, cron, action: action || name });
    res.json({ status: 'scheduled', name, cron });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/schedule/:name — remove a job
router.delete('/:name', async (req, res) => {
  try {
    const { getScheduler } = await import('../../src/scheduler/scheduler.js');
    getScheduler().removeJob(req.params.name);
    res.json({ status: 'removed', name: req.params.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schedule/:name/run — run a job now
router.post('/:name/run', async (req, res) => {
  try {
    const { getScheduler } = await import('../../src/scheduler/scheduler.js');
    await getScheduler().runJobNow(req.params.name);
    res.json({ status: 'executed', name: req.params.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

// by nichxbt
