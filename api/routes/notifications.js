/**
 * XActions Notifications API Routes
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { Router } from 'express';

const router = Router();

// POST /api/notifications/send
router.post('/send', async (req, res) => {
  try {
    const { getNotifier } = await import('../../src/notifications/notifier.js');
    const notifier = await getNotifier();
    const { title, message, severity } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const result = await notifier.send({ title, message, severity });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/test/:channel
router.post('/test/:channel', async (req, res) => {
  try {
    const { getNotifier } = await import('../../src/notifications/notifier.js');
    const notifier = await getNotifier();
    const result = await notifier.test(req.params.channel);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/configure
router.post('/configure', async (req, res) => {
  try {
    const { getNotifier } = await import('../../src/notifications/notifier.js');
    const notifier = await getNotifier();
    const result = notifier.configure(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

// by nichxbt
