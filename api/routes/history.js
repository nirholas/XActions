/**
 * XActions History & Analytics API Routes
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { Router } from 'express';

const router = Router();

// GET /api/analytics/history/:username — get account history
router.get('/history/:username', async (req, res) => {
  try {
    const { getAccountHistory } = await import('../../src/analytics/historyStore.js');
    const days = parseInt(req.query.days) || 30;
    const from = new Date(Date.now() - days * 86400000).toISOString();
    const data = getAccountHistory(req.params.username, { from, interval: req.query.interval || 'day' });
    res.json({ snapshots: data, username: req.params.username, days });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/growth/:username — get growth rate
router.get('/growth/:username', async (req, res) => {
  try {
    const { getGrowthRate } = await import('../../src/analytics/historyStore.js');
    const days = parseInt(req.query.days) || 7;
    const data = getGrowthRate(req.params.username, days);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analytics/compare — compare accounts
router.post('/compare', async (req, res) => {
  try {
    const { compareAccounts } = await import('../../src/analytics/historyStore.js');
    const { usernames, metric, days } = req.body;
    const from = new Date(Date.now() - (days || 30) * 86400000).toISOString();
    const data = compareAccounts(usernames, metric, { from });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/export/:username — export history
router.get('/export/:username', async (req, res) => {
  try {
    const { exportHistory } = await import('../../src/analytics/historyStore.js');
    const format = req.query.format || 'json';
    const data = exportHistory(req.params.username, format);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${req.params.username}-history.csv`);
    }
    res.send(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/overlap — audience overlap
router.get('/overlap', async (req, res) => {
  try {
    const { analyzeOverlap } = await import('../../src/analytics/audienceOverlap.js');
    const { username1, username2 } = req.query;
    if (!username1 || !username2) return res.status(400).json({ error: 'username1 and username2 required' });
    const data = await analyzeOverlap(username1, username2);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

// by nichxbt
