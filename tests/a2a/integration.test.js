/**
 * Tests — A2A Integration Tests
 *
 * End-to-end tests spanning multiple modules:
 *   types + skillRegistry + agentCard + taskManager + bridge + server
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createA2AServer } from '../../src/a2a/server.js';
import { getAllSkills, searchSkills, getSkillById } from '../../src/a2a/skillRegistry.js';
import { generateAgentCard, clearCardCache } from '../../src/a2a/agentCard.js';
import { createTask, createTextPart, TASK_STATES, jsonRpcSuccess } from '../../src/a2a/types.js';
import { TaskDecomposer } from '../../src/a2a/orchestrator.js';

// ── Server lifecycle ─────────────────────────────────────────────────────────

let agent, server;
const PORT = 31998;
const BASE = `http://localhost:${PORT}`;

beforeAll(async () => {
  agent = createA2AServer({
    port: PORT,
    enableAuth: false,
    enableRateLimit: false,
    enableLogging: false,
    mode: 'local',
  });
  server = await agent.start(PORT);
});

afterAll(() => {
  agent.shutdown();
  clearCardCache();
});

// ── Agent Card → Skills round-trip ──────────────────────────────────────────

describe('Agent Card reflects skill registry', () => {
  it('agent card skills count matches registry', async () => {
    const res = await fetch(`${BASE}/.well-known/agent.json`);
    const card = await res.json();
    const registrySkills = getAllSkills();
    expect(card.skills.length).toBe(registrySkills.length);
  });

  it('card skill IDs match registry IDs', async () => {
    const res = await fetch(`${BASE}/.well-known/agent.json`);
    const card = await res.json();
    const ids = new Set(card.skills.map(s => s.id));
    const regIds = new Set(getAllSkills().map(s => s.id));
    // Every registry skill should appear in the card
    for (const id of regIds) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('searching skills via API matches direct search', async () => {
    const directResults = searchSkills({ query: 'follower' });
    const res = await fetch(`${BASE}/a2a/skills?q=follower`);
    const apiResults = await res.json();
    expect(apiResults.total).toBe(directResults.length);
  });
});

// ── Full task lifecycle via HTTP ────────────────────────────────────────────

describe('Task lifecycle', () => {
  it('create → get → cancel flow', async () => {
    // create
    const createRes = await fetch(`${BASE}/a2a/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tasks/sendSubscribe',
        params: {
          message: { role: 'user', parts: [{ type: 'text', text: 'integration test' }] },
        },
        id: 'integ-1',
      }),
    });
    const created = await createRes.json();
    expect(created.result.status.state).toBe(TASK_STATES.SUBMITTED);
    const taskId = created.result.id;

    // get
    const getRes = await fetch(`${BASE}/a2a/tasks/${taskId}`);
    const got = await getRes.json();
    expect(got.result.id).toBe(taskId);

    // cancel
    const cancelRes = await fetch(`${BASE}/a2a/tasks/${taskId}/cancel`, { method: 'POST' });
    const canceled = await cancelRes.json();
    expect(canceled.result.status.state).toBe(TASK_STATES.CANCELED);

    // verify
    const finalRes = await fetch(`${BASE}/a2a/tasks/${taskId}`);
    const final = await finalRes.json();
    expect(final.result.status.state).toBe(TASK_STATES.CANCELED);
  });
});

// ── Orchestration decomposition ─────────────────────────────────────────────

describe('Task decomposition integration', () => {
  const decomposer = new TaskDecomposer();

  it('decomposes "analyze @elonmusk and tweet about it"', () => {
    const steps = decomposer.decompose('analyze @elonmusk and post the findings');
    expect(steps.length).toBeGreaterThan(1);
    expect(steps[0].label).toContain('elonmusk');
  });

  it('decomposes "compare @nichxbt and @elonmusk"', () => {
    const steps = decomposer.decompose('compare @nichxbt and @elonmusk');
    expect(steps.length).toBe(3);
    expect(steps[2].deps).toBeDefined();
  });

  it('single tasks are not decomposed', () => {
    const steps = decomposer.decompose('get my profile');
    expect(steps.length).toBe(1);
  });

  it('parallelizable identification works', () => {
    const steps = decomposer.decompose('compare nichxbt and elonmusk');
    const { parallel } = decomposer.identifyParallelizable(steps);
    // First two steps (independent profiles) should be parallel
    expect(parallel.length).toBeGreaterThan(0);
  });
});

// ── Internal wiring ─────────────────────────────────────────────────────────

describe('Server internal wiring', () => {
  it('exposes taskStore', () => {
    expect(agent.taskStore).toBeDefined();
    expect(typeof agent.taskStore.create).toBe('function');
  });

  it('exposes bridge', () => {
    expect(agent.bridge).toBeDefined();
    expect(typeof agent.bridge.execute).toBe('function');
  });

  it('exposes orchestrator', () => {
    expect(agent.orchestrator).toBeDefined();
    expect(typeof agent.orchestrator.execute).toBe('function');
  });

  it('exposes discovery', () => {
    expect(agent.discovery).toBeDefined();
  });
});

// ── Skill search consistency ────────────────────────────────────────────────

describe('Skill search consistency', () => {
  it('getSkillById returns same object as search result', () => {
    const results = searchSkills({ query: 'x_get_profile' });
    if (results.length > 0) {
      const byId = getSkillById(results[0].id);
      expect(byId.id).toBe(results[0].id);
    }
  });
});
