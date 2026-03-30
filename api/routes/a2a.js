// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * Agent-to-Agent (A2A) Task Delegation Routes
 *
 * Allows external AI agents to discover XActions skills and submit tasks
 * using the A2A protocol task envelope format.
 *
 * Routes:
 *   GET  /api/a2a/skills  — list all registered skills (free, no payment)
 *   POST /api/a2a/task    — submit a task, returns operationId for polling
 *
 * @author nichxbt
 */

import { Router } from 'express';
import { errorResponse } from '../utils/errorResponse.js';

const router = Router();

/**
 * GET /api/a2a/skills
 * Returns the XActions skill registry for agent discovery.
 * Free — no x402 payment required.
 */
router.get('/skills', async (req, res) => {
  try {
    const { getAllSkills } = await import('../../src/a2a/skillRegistry.js');
    const skills = getAllSkills();
    return res.json({
      success: true,
      data: {
        agent: 'XActions',
        version: '2.0.0',
        skills,
        count: skills.length,
        taskEndpoint: '/api/a2a/task',
        docs: 'https://xactions.app/docs/a2a',
      },
    });
  } catch (err) {
    return errorResponse(res, 503, 'SKILLS_UNAVAILABLE', err.message, { retryable: true });
  }
});

/**
 * POST /api/a2a/task
 * Accept an A2A task envelope and route it to the Bull job queue.
 *
 * Body (A2A Task Envelope):
 *   id          {string}  optional  Client-supplied idempotency key
 *   skill       {string}  required  A2A skill ID (e.g. 'xactions.x_unfollow_non_followers')
 *   input       {object}  required  Skill input parameters (sessionCookie, config, …)
 *   callbackUrl {string}  optional  Webhook URL — result is POSTed here on completion
 *   contextId   {string}  optional  Conversation/thread ID for multi-step workflows
 */
router.post('/task', async (req, res) => {
  const { id, skill, input, callbackUrl, contextId } = req.body;

  if (!skill) {
    return errorResponse(res, 400, 'INVALID_INPUT', 'skill is required', { retryable: false });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return errorResponse(res, 400, 'INVALID_INPUT', 'input must be a plain object', { retryable: false });
  }
  if (callbackUrl) {
    try {
      const u = new URL(callbackUrl);
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    } catch {
      return errorResponse(res, 400, 'INVALID_INPUT', 'callbackUrl must be a valid http/https URL', { retryable: false });
    }
  }

  try {
    const { getAllSkills } = await import('../../src/a2a/skillRegistry.js');
    const skills = getAllSkills();
    const skillDef = skills.find(s => s.id === skill || s.name === skill);

    if (!skillDef) {
      return errorResponse(res, 404, 'SKILL_NOT_FOUND', `Skill "${skill}" is not registered`, {
        retryable: false,
        availableSkills: skills.map(s => s.id || s.name),
        hint: 'GET /api/a2a/skills for a full list',
      });
    }

    const jobType = skillToJobType(skill);
    const { addJob } = await import('../services/jobQueue.js');

    const { jobId } = await addJob(jobType, {
      config: { ...input, callbackUrl: callbackUrl || null },
      a2aTaskId: id || null,
      a2aSkill: skill,
      contextId: contextId || null,
      source: 'a2a',
    });

    return res.status(202).json({
      success: true,
      data: {
        taskId: jobId,
        a2aTaskId: id || null,
        skill,
        status: 'queued',
        polling: {
          endpoint: `/api/ai/action/status/${jobId}`,
          recommendedIntervalMs: 5000,
        },
        streaming: {
          event: 'job:join',
          room: jobId,
          description: 'Emit job:join with the taskId over WebSocket for live progress',
        },
      },
      meta: { createdAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error('❌ A2A task error:', err);
    return errorResponse(res, 500, 'TASK_FAILED', err.message);
  }
});

/**
 * Map an A2A skill ID to a Bull job type name.
 * Convention: 'xactions.x_unfollow_non_followers' → 'unfollowNonFollowers'
 */
function skillToJobType(skillId) {
  const raw = skillId
    .replace(/^xactions\.x_/, '')   // strip 'xactions.x_' prefix
    .replace(/^x_/, '');            // strip plain 'x_' prefix
  return raw.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export default router;
