// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

/**
 * In-memory automation state, scoped per user (userId -> Map(automationId -> state))
 * In production, this would be backed by Redis or Prisma
 */
const automationState = new Map();

const AUTOMATION_DEFINITIONS = {
  'auto-liker': {
    name: 'Auto Liker',
    description: 'Automatically likes tweets in your timeline or by keyword',
    defaults: { delay: 2000, maxActions: 50, keywords: [], enabled: true }
  },
  'smart-unfollow': {
    name: 'Smart Unfollow',
    description: 'Unfollows accounts that don\'t follow you back',
    defaults: { delay: 3000, maxActions: 100, skipVerified: true, skipOlderThan: 30, enabled: true }
  },
  'keyword-follow': {
    name: 'Keyword Follow',
    description: 'Follows users who tweet about specific keywords',
    defaults: { delay: 2500, maxActions: 30, keywords: [], bioFilter: '', enabled: true }
  },
  'growth-suite': {
    name: 'Growth Suite',
    description: 'Combined follow, like, and engage strategy for growth',
    defaults: { delay: 3000, maxActions: 50, strategy: 'balanced', enabled: true }
  },
  'auto-commenter': {
    name: 'Auto Commenter',
    description: 'Posts automated replies on matching tweets',
    defaults: { delay: 5000, maxActions: 20, templates: [], keywords: [], enabled: true }
  },
  'follow-engagers': {
    name: 'Follow Engagers',
    description: 'Follows users who engage with specific accounts or tweets',
    defaults: { delay: 2500, maxActions: 40, targetAccounts: [], enabled: true }
  }
};

/**
 * Get (initializing if needed) the automation state map for a single user.
 * Automations are process-wide definitions, but their running state must be
 * isolated per user so one tenant can't start/stop/reconfigure another's.
 */
function getUserAutomations(userId) {
  if (!automationState.has(userId)) {
    const userState = new Map();
    for (const [id, def] of Object.entries(AUTOMATION_DEFINITIONS)) {
      userState.set(id, {
        id,
        name: def.name,
        description: def.description,
        status: 'stopped',
        actionCount: 0,
        startedAt: null,
        settings: { ...def.defaults },
        lastAction: null,
        errors: 0
      });
    }
    automationState.set(userId, userState);
  }
  return automationState.get(userId);
}

/**
 * GET /api/automations/status
 * Returns status of all automations
 */
router.get('/status', (req, res) => {
  try {
    const userAutomations = getUserAutomations(req.user.id);
    const statuses = {};
    for (const [id, state] of userAutomations) {
      statuses[id] = { ...state };
    }
    res.json({ automations: statuses });
  } catch (error) {
    console.error('❌ Status error:', error);
    res.status(500).json({ error: 'Failed to get automation status' });
  }
});

/**
 * POST /api/automations/:name/start
 * Start a specific automation
 */
router.post('/:name/start', (req, res) => {
  try {
    const { name } = req.params;
    const settings = req.body.settings || {};
    const userAutomations = getUserAutomations(req.user.id);

    if (!userAutomations.has(name)) {
      return res.status(404).json({ error: `Automation '${name}' not found` });
    }

    const state = userAutomations.get(name);
    if (state.status === 'running') {
      return res.status(400).json({ error: `Automation '${name}' is already running` });
    }

    // Merge user settings with current settings
    state.status = 'running';
    state.startedAt = new Date().toISOString();
    state.actionCount = 0;
    state.errors = 0;
    state.settings = { ...state.settings, ...settings };

    userAutomations.set(name, state);

    // Emit Socket.IO event if io is available
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard').emit('automation:started', { id: name, ...state });
    }

    res.json({ status: 'started', automation: state });
  } catch (error) {
    console.error('❌ Start error:', error);
    res.status(500).json({ error: 'Failed to start automation' });
  }
});

/**
 * POST /api/automations/:name/stop
 * Stop a specific automation
 */
router.post('/:name/stop', (req, res) => {
  try {
    const { name } = req.params;
    const userAutomations = getUserAutomations(req.user.id);

    if (!userAutomations.has(name)) {
      return res.status(404).json({ error: `Automation '${name}' not found` });
    }

    const state = userAutomations.get(name);
    state.status = 'stopped';
    state.startedAt = null;

    userAutomations.set(name, state);

    // Emit Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard').emit('automation:stopped', { id: name, ...state });
    }

    res.json({ status: 'stopped', automation: state });
  } catch (error) {
    console.error('❌ Stop error:', error);
    res.status(500).json({ error: 'Failed to stop automation' });
  }
});

/**
 * POST /api/automations/:name/settings
 * Update settings for a specific automation
 */
router.post('/:name/settings', (req, res) => {
  try {
    const { name } = req.params;
    const { settings } = req.body;
    const userAutomations = getUserAutomations(req.user.id);

    if (!userAutomations.has(name)) {
      return res.status(404).json({ error: `Automation '${name}' not found` });
    }

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    const state = userAutomations.get(name);
    state.settings = { ...state.settings, ...settings };
    userAutomations.set(name, state);

    res.json({ status: 'updated', automation: state });
  } catch (error) {
    console.error('❌ Settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * POST /api/automations/stop-all
 * Emergency stop — halt all running automations
 */
router.post('/stop-all', (req, res) => {
  try {
    const userAutomations = getUserAutomations(req.user.id);
    const stopped = [];
    for (const [id, state] of userAutomations) {
      if (state.status === 'running') {
        state.status = 'stopped';
        state.startedAt = null;
        userAutomations.set(id, state);
        stopped.push(id);
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to('dashboard').emit('automation:allStopped', { stopped });
    }

    res.json({ status: 'all_stopped', stopped });
  } catch (error) {
    console.error('❌ Stop all error:', error);
    res.status(500).json({ error: 'Failed to stop all automations' });
  }
});

export default router;
