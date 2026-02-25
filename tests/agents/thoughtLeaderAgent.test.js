// XActions — ThoughtLeaderAgent Tests (unit-level)
// by nichxbt

import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('ThoughtLeaderAgent', () => {
  let ThoughtLeaderAgent;

  const MINIMAL_CONFIG = {
    niche: { name: 'AI', searchTerms: ['AI agents'], influencers: ['@testuser'], keywords: ['LLM'] },
    persona: { name: 'TestBot', handle: '@testbot', tone: 'friendly', expertise: ['AI'], opinions: ['Open source wins'], avoid: ['spam'] },
    llm: { provider: 'openrouter', apiKey: 'test-key', models: { fast: 'test/fast', mid: 'test/mid', smart: 'test/smart' } },
    schedule: { timezone: 'UTC', sleepHours: [23, 6] },
    limits: { dailyLikes: 10, dailyFollows: 5, dailyComments: 3, dailyPosts: 2 },
    browser: { headless: true, sessionPath: '/tmp/test-session.json' },
    dbPath: '/tmp/test-tl-agent.db',
  };

  beforeAll(async () => {
    const mod = await import('../../src/agents/thoughtLeaderAgent.js');
    ThoughtLeaderAgent = mod.ThoughtLeaderAgent;
  });

  afterAll(() => {
    // Clean up test DB
    try { fs.unlinkSync('/tmp/test-tl-agent.db'); } catch { /* ignore */ }
  });

  describe('constructor', () => {
    it('should initialize all components', () => {
      const agent = new ThoughtLeaderAgent(MINIMAL_CONFIG);
      expect(agent.persona).toBeDefined();
      expect(agent.scheduler).toBeDefined();
      expect(agent.llm).toBeDefined();
      expect(agent.browser).toBeDefined();
      expect(agent.db).toBeDefined();
      expect(agent.calendar).toBeDefined();
      expect(agent.running).toBe(false);
    });

    it('should use default limits when not specified', () => {
      const agent = new ThoughtLeaderAgent({ ...MINIMAL_CONFIG, limits: undefined });
      expect(agent.limits.dailyLikes).toBe(150);
      expect(agent.limits.dailyFollows).toBe(80);
    });

    it('should not create network if not enabled', () => {
      const agent = new ThoughtLeaderAgent(MINIMAL_CONFIG);
      expect(agent.network).toBeNull();
    });

    it('should create network when enabled', () => {
      const agent = new ThoughtLeaderAgent({ ...MINIMAL_CONFIG, network: { enabled: true } });
      expect(agent.network).toBeDefined();
    });
  });

  describe('getStatus', () => {
    it('should return status object', () => {
      const agent = new ThoughtLeaderAgent(MINIMAL_CONFIG);
      const status = agent.getStatus();
      expect(status).toHaveProperty('running');
      expect(status.running).toBe(false);
    });
  });

  describe('loadConfig', () => {
    it('should throw when config file does not exist', () => {
      expect(() => ThoughtLeaderAgent.loadConfig('/tmp/nonexistent-config.json')).toThrow('Config file not found');
    });

    it('should load a valid config file', () => {
      const tmpConfig = '/tmp/test-agent-config.json';
      fs.writeFileSync(tmpConfig, JSON.stringify(MINIMAL_CONFIG));
      try {
        const config = ThoughtLeaderAgent.loadConfig(tmpConfig);
        expect(config.niche.name).toBe('AI');
        expect(config.persona.name).toBe('TestBot');
      } finally {
        fs.unlinkSync(tmpConfig);
      }
    });
  });

  describe('stop', () => {
    it('should set running to false', async () => {
      const agent = new ThoughtLeaderAgent(MINIMAL_CONFIG);
      agent.running = true;
      await agent.stop();
      expect(agent.running).toBe(false);
    });
  });
});
