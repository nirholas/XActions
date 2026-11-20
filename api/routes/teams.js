// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Team Management API Routes
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { Router } from 'express';
import { prisma } from '../../src/utils/prisma.js';
import { authenticate as authMiddleware } from '../middleware/auth.js';

const router = Router();

// Every team route acts for a signed-in user. Most of them once had no auth at
// all: anyone could create teams, invite, remove members or read activity.
router.use(authMiddleware);

const teams = () => import('../../src/auth/teamManager.js');

/**
 * The signed-in caller as teamManager keys members: by user id, with the
 * username as a display field (and to claim memberships written before ids).
 */
const caller = (req) => ({ id: req.user.id, username: req.user.username });

/**
 * The member a :username path segment names. A username an account holds now
 * resolves to that account's id, so the entry of someone who has since renamed
 * is never matched by their old name. A name no account holds falls back to
 * the entry with that display name.
 */
async function target(req) {
  const { username } = req.params;
  if (username === req.user.username) return caller(req);
  const user = await prisma.user.findFirst({ where: { username }, select: { id: true, username: true } });
  return user ? { id: user.id, username: user.username } : { username };
}

/**
 * Continue only if the caller belongs to the team, and when `action` is given,
 * only if their role allows it. Answers 404 rather than 403 to non-members, so
 * team ids cannot be probed.
 */
function requireTeamRole(action) {
  return async (req, res, next) => {
    try {
      const { checkPermission, getUserRole } = await teams();
      const role = await getUserRole(req.params.id, caller(req));
      if (!role) return res.status(404).json({ error: 'Team not found' });
      if (action && !checkPermission(role, action)) {
        return res.status(403).json({ error: `Your role (${role}) cannot ${action.replace('-', ' ')}` });
      }
      req.teamRole = role;
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
}

// GET /api/teams — the teams the caller belongs to
router.get('/', async (req, res) => {
  try {
    const { getUserTeams } = await teams();
    res.json({ teams: await getUserTeams(caller(req)) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/teams — create a team owned by the caller
router.post('/', async (req, res) => {
  try {
    const { createTeam } = await teams();
    const { name } = req.body;
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name required' });
    res.json(await createTeam(name.trim().slice(0, 100), caller(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/teams/:id/members — members only
router.get('/:id/members', requireTeamRole(), async (req, res) => {
  try {
    const { listTeamMembers } = await teams();
    res.json({ members: await listTeamMembers(req.params.id) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/teams/:id/invite — needs a role that manages members
router.post('/:id/invite', requireTeamRole('manage-members'), async (req, res) => {
  try {
    const { inviteUser } = await teams();
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    res.json(await inviteUser(req.params.id, email, role));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/teams/:id/members/:username — manage-members, or leaving yourself
router.delete('/:id/members/:username', async (req, res, next) => {
  if (req.params.username === req.user.username) return requireTeamRole()(req, res, next);
  return requireTeamRole('manage-members')(req, res, next);
}, async (req, res) => {
  try {
    const { removeUser } = await teams();
    res.json(await removeUser(req.params.id, await target(req)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/teams/:id/members/:username/role — needs a role that manages members
router.put('/:id/members/:username/role', requireTeamRole('manage-members'), async (req, res) => {
  try {
    const { updateRole } = await teams();
    res.json(await updateRole(req.params.id, await target(req), req.body.role));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/teams/:id/activity — members only
router.get('/:id/activity', requireTeamRole(), async (req, res) => {
  try {
    const { getActivityLog } = await teams();
    const filters = { limit: parseInt(req.query.limit) || 50, user: req.query.user };
    res.json({ activity: await getActivityLog(req.params.id, filters) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

// by nichxbt
