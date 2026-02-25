// XActions — EngagementNetwork Tests
// by nichxbt

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EngagementNetwork } from '../../src/agents/engagementNetwork.js';
import fs from 'fs';
import path from 'path';

const NETWORK_FILE = path.resolve('data', 'engagement-network.json');
let backupExists = false;
let backupData = null;

describe('EngagementNetwork', () => {
  let network;

  beforeEach(() => {
    if (fs.existsSync(NETWORK_FILE)) {
      backupData = fs.readFileSync(NETWORK_FILE, 'utf-8');
      backupExists = true;
    }
    network = new EngagementNetwork({ maxNetworkSize: 3 });
  });

  afterEach(() => {
    if (backupExists && backupData) {
      fs.writeFileSync(NETWORK_FILE, backupData);
    } else if (fs.existsSync(NETWORK_FILE)) {
      fs.unlinkSync(NETWORK_FILE);
    }
    backupExists = false;
    backupData = null;
  });

  describe('registerAgent / unregisterAgent', () => {
    it('should register an agent', () => {
      const result = network.registerAgent('agent-1', { niche: { name: 'AI' }, persona: { name: 'Test' } });
      expect(result).toBe(true);
      expect(network.agents.size).toBe(1);
    });

    it('should enforce max network size', () => {
      network.registerAgent('a1', { niche: { name: 'AI' } });
      network.registerAgent('a2', { niche: { name: 'Crypto' } });
      network.registerAgent('a3', { niche: { name: 'SaaS' } });
      const result = network.registerAgent('a4', { niche: { name: 'DevTools' } });
      expect(result).toBe(false);
      expect(network.agents.size).toBe(3);
    });

    it('should unregister an agent', () => {
      network.registerAgent('agent-1', { niche: { name: 'AI' } });
      network.unregisterAgent('agent-1');
      expect(network.agents.size).toBe(0);
    });
  });

  describe('shareDiscovery', () => {
    it('should share content from a registered agent', () => {
      network.registerAgent('agent-1', { niche: { name: 'AI' } });
      const result = network.shareDiscovery('agent-1', {
        tweetId: 'tw123',
        author: '@someone',
        text: 'Great insight about LLMs',
        topic: 'AI',
        relevanceScore: 0.9,
      });
      expect(result).toBe(true);
    });

    it('should reject sharing from unregistered agent', () => {
      const result = network.shareDiscovery('unknown', { text: 'test' });
      expect(result).toBe(false);
    });

    it('should update agent stats after sharing', () => {
      network.registerAgent('agent-1', { niche: { name: 'AI' } });
      network.shareDiscovery('agent-1', { text: 'content', topic: 'AI' });
      const agent = network.agents.get('agent-1');
      expect(agent.stats.contentShared).toBe(1);
    });
  });

  describe('getDiscoveriesForAgent', () => {
    it('should return unseen discoveries for an agent', () => {
      network.registerAgent('agent-1', { niche: { name: 'AI' } });
      network.registerAgent('agent-2', { niche: { name: 'AI' } });
      network.shareDiscovery('agent-1', {
        tweetId: 'tw1',
        text: 'Discovery 1',
        topic: 'AI',
        relevanceScore: 0.8,
      });
      const discoveries = network.getDiscoveriesForAgent('agent-2');
      expect(discoveries.length).toBe(1);
    });

    it('should not return own discoveries', () => {
      network.registerAgent('agent-1', { niche: { name: 'AI' } });
      network.shareDiscovery('agent-1', { tweetId: 'tw1', text: 'test', topic: 'AI' });
      const discoveries = network.getDiscoveriesForAgent('agent-1');
      expect(discoveries.length).toBe(0);
    });

    it('should return empty for unregistered agent', () => {
      const discoveries = network.getDiscoveriesForAgent('unknown');
      expect(discoveries).toEqual([]);
    });
  });

  describe('checkEthics', () => {
    it('should allow ethical interactions', () => {
      network.registerAgent('a1', { niche: { name: 'AI' } });
      network.registerAgent('a2', { niche: { name: 'AI' } });
      const result = network.checkEthics('a1', 'a2', 'content_share');
      expect(result.allowed).toBe(true);
      expect(result.violations).toEqual([]);
    });
  });

  describe('shareTrend / getRecentTrends', () => {
    it('should share and retrieve trends', () => {
      network.registerAgent('agent-1', { niche: { name: 'AI' } });
      network.shareTrend('agent-1', {
        topic: 'GPT-5',
        hashtag: '#GPT5',
        context: 'New model release',
        niches: ['AI'],
      });
      const trends = network.getRecentTrends('AI');
      expect(trends.length).toBe(1);
      expect(trends[0].topic).toBe('GPT-5');
    });
  });

  describe('getNetworkStats', () => {
    it('should return stats', () => {
      network.registerAgent('a1', { niche: { name: 'AI' } });
      const stats = network.getNetworkStats();
      expect(stats).toHaveProperty('agentCount');
      expect(stats.agentCount).toBe(1);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      network.registerAgent('a1', { niche: { name: 'AI' } });
      network.shareDiscovery('a1', { text: 'test', topic: 'AI' });
      network.reset();
      expect(network.agents.size).toBe(0);
      expect(network.sharedQueue.length).toBe(0);
      expect(network.discoveryLog.length).toBe(0);
    });
  });
});
