/**
 * XActions Team Management API Routes
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { Router } from 'express';

const router = Router();

// POST /api/teams — create a team
router.post('/', async (req, res) => {
  try {
    const { createTeam } = await import('../../src/auth/teamManager.js');
    const { name, owner } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const team = await createTeam(name, owner || 'default');
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/teams/:id/members
router.get('/:id/members', async (req, res) => {
  try {
    const { listTeamMembers } = await import('../../src/auth/teamManager.js');
    const members = await listTeamMembers(req.params.id);
    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/teams/:id/invite
router.post('/:id/invite', async (req, res) => {
  try {
    const { inviteUser } = await import('../../src/auth/teamManager.js');
    const { email, role } = req.body;
    const result = await inviteUser(req.params.id, email, role);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/teams/:id/members/:username
router.delete('/:id/members/:username', async (req, res) => {
  try {
    const { removeUser } = await import('../../src/auth/teamManager.js');
    const result = await removeUser(req.params.id, req.params.username);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/teams/:id/members/:username/role
router.put('/:id/members/:username/role', async (req, res) => {
  try {
    const { updateRole } = await import('../../src/auth/teamManager.js');
    const result = await updateRole(req.params.id, req.params.username, req.body.role);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/teams/:id/activity
router.get('/:id/activity', async (req, res) => {
  try {
    const { getActivityLog } = await import('../../src/auth/teamManager.js');
    const filters = { limit: parseInt(req.query.limit) || 50, user: req.query.user };
    const log = await getActivityLog(req.params.id, filters);
    res.json({ activity: log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

// by nichxbt
