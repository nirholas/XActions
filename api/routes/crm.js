/**
 * XActions CRM API Routes
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { Router } from 'express';

const router = Router();

// POST /api/crm/sync/:username
router.post('/sync/:username', async (req, res) => {
  try {
    const { syncFollowers } = await import('../../src/analytics/followerCRM.js');
    const result = await syncFollowers(req.params.username);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/crm/tag
router.post('/tag', async (req, res) => {
  try {
    const { tagContact } = await import('../../src/analytics/followerCRM.js');
    const { username, tag } = req.body;
    tagContact(username, tag);
    res.json({ status: 'tagged', username, tag });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/crm/search?q=...
router.get('/search', async (req, res) => {
  try {
    const { searchContacts } = await import('../../src/analytics/followerCRM.js');
    const results = searchContacts(req.query.q || '');
    res.json({ contacts: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/crm/segment/:name
router.get('/segment/:name', async (req, res) => {
  try {
    const { getSegment } = await import('../../src/analytics/followerCRM.js');
    const members = getSegment(req.params.name);
    res.json({ segment: req.params.name, members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/crm/score — auto-score all contacts
router.post('/score', async (req, res) => {
  try {
    const { autoScore } = await import('../../src/analytics/followerCRM.js');
    const result = autoScore();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

// by nichxbt
