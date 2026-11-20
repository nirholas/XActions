// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Scheduler API Routes
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Automation routes control the owner's account, so they carry the same
// authentication as /api/crm and /api/automations. A public deployment
// (the repo ships Railway, Fly, Render and Docker configs) would
// otherwise let anyone list and trigger the owner's automations.
// These routes drive the server's single, operator-wide instance (not
// per-user state), so they are for the operator: any signed-in user could
// once read or change them.
router.use(authMiddleware, requireAdmin);


// GET /api/schedule — list all jobs
router.get('/', async (req, res) => {
  try {
    const { getScheduler } = await import('../../src/scheduler/scheduler.js');
    const scheduler = getScheduler();
    await scheduler.load();
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
    // `command` is an xactions CLI command line (for example "unfollow-non-followers --max 50").
    // The route used to pass it as `action`, which the scheduler never read, so every add failed.
    const { name, cron, command, action, args } = req.body;
    const cli = command || action;
    if (!name || !cron || !cli) return res.status(400).json({ error: 'name, cron and command required' });
    await scheduler.load();
    scheduler.addJob({ name, cron, command: cli, args: Array.isArray(args) ? args.map(String) : [] });
    res.json({ status: 'scheduled', name, cron, command: cli });
  } catch (error) {
    res.status(/already exists|requires|Invalid/.test(error.message) ? 400 : 500).json({ error: error.message });
  }
});

// DELETE /api/schedule/:name — remove a job
router.delete('/:name', async (req, res) => {
  try {
    const { getScheduler } = await import('../../src/scheduler/scheduler.js');
    const scheduler = getScheduler();
    await scheduler.load();
    const result = scheduler.removeJob(req.params.name);
    if (result?.error) return res.status(404).json(result);
    res.json({ status: 'removed', name: req.params.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schedule/:name/run — run a job now
router.post('/:name/run', async (req, res) => {
  try {
    const { getScheduler } = await import('../../src/scheduler/scheduler.js');
    const scheduler = getScheduler();
    await scheduler.load();
    const result = await scheduler.runJobNow(req.params.name);
    if (result?.error) return res.status(404).json(result);
    if (result.status === 'failed') return res.status(500).json(result);
    res.json({ status: 'executed', name: req.params.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

// by nichxbt
