/**
 * XActions — Engagement Network
 * Multi-agent coordination with ethical guidelines
 *
 * ⚠️  ETHICAL WARNING: This module is for coordinating CONTENT DISCOVERY
 * across multiple accounts you own. It is NOT for artificial engagement
 * manipulation, astroturfing, or creating fake amplification networks.
 *
 * Using this to create fake engagement rings violates X/Twitter's ToS
 * and may result in account suspension. Use responsibly.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// by nichxbt

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('data');
const NETWORK_FILE = path.join(DATA_DIR, 'engagement-network.json');

export class EngagementNetwork {
  constructor(config = {}) {
    this.config = config;
    this.agents = new Map();
    this.sharedQueue = [];
    this.discoveryLog = [];
    this.ethicsPolicy = {
      maxInteractionsPerPair: config.maxInteractionsPerPair || 3,
      minDelayBetweenInteractions: config.minDelayHours || 24,
      maxNetworkSize: config.maxNetworkSize || 5,
      allowSelfRetweet: false,
      allowCoordinatedLiking: false,
      allowContentSharing: true,
      allowTrendDiscovery: true,
      requireHumanReview: config.requireHumanReview ?? true,
    };
    this._load();
  }

  // ── Load / Save ──────────────────────────────────────────────────────────

  _load() {
    try {
      if (fs.existsSync(NETWORK_FILE)) {
        const data = JSON.parse(fs.readFileSync(NETWORK_FILE, 'utf-8'));
        this.discoveryLog = data.discoveryLog || [];
        this.sharedQueue = data.sharedQueue || [];
      }
    } catch { /* start fresh */ }
  }

  _save() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(NETWORK_FILE, JSON.stringify({
      discoveryLog: this.discoveryLog.slice(-500),
      sharedQueue: this.sharedQueue.slice(-100),
      updatedAt: new Date().toISOString(),
    }, null, 2));
  }

  // ── Agent Registration ───────────────────────────────────────────────────

  /**
   * Register an agent in the network
   * @param {string} id - Unique agent identifier
   * @param {object} agent - Agent metadata
   */
  registerAgent(id, agent) {
    if (this.agents.size >= this.ethicsPolicy.maxNetworkSize) {
      console.warn(`⚠️ Network at max capacity (${this.ethicsPolicy.maxNetworkSize}). Cannot add ${id}.`);
      return false;
    }

    this.agents.set(id, {
      id,
      niche: agent.niche,
      persona: agent.persona,
      registeredAt: new Date().toISOString(),
      lastActive: null,
      stats: { contentShared: 0, trendsDiscovered: 0 },
    });

    console.log(`🔗 Agent registered: ${id} (niche: ${agent.niche?.name || 'unknown'})`);
    return true;
  }

  /**
   * Remove an agent from the network
   */
  unregisterAgent(id) {
    this.agents.delete(id);
    console.log(`🔗 Agent unregistered: ${id}`);
  }

  // ── Content Discovery Sharing ────────────────────────────────────────────

  /**
   * Share a discovered piece of high-quality content with the network.
   * Other agents can use this to find relevant content to engage with organically.
   *
   * ⚠️ This is NOT for coordinated engagement. Each agent independently
   * decides whether to engage based on its own persona and relevance scoring.
   *
   * @param {string} fromAgent - Agent ID that discovered the content
   * @param {object} content - Content metadata
   */
  shareDiscovery(fromAgent, content) {
    if (!this.ethicsPolicy.allowContentSharing) {
      console.warn('⚠️ Content sharing is disabled by ethics policy');
      return false;
    }

    // Validate the agent is registered
    if (!this.agents.has(fromAgent)) {
      console.warn(`⚠️ Unknown agent: ${fromAgent}`);
      return false;
    }

    const discovery = {
      id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromAgent,
      content: {
        tweetId: content.tweetId,
        author: content.author,
        text: content.text?.slice(0, 300),
        topic: content.topic,
        relevanceScore: content.relevanceScore,
      },
      sharedAt: new Date().toISOString(),
      seenBy: [fromAgent],
      engagedBy: [],
    };

    this.discoveryLog.push(discovery);
    this.sharedQueue.push(discovery);

    // Update agent stats
    const agent = this.agents.get(fromAgent);
    if (agent) {
      agent.stats.contentShared++;
      agent.lastActive = new Date().toISOString();
    }

    this._save();
    console.log(`📤 Content shared by ${fromAgent}: "${content.text?.slice(0, 60)}..."`);
    return true;
  }

  /**
   * Get content discoveries relevant to a specific agent
   * Only returns content the agent hasn't seen yet
   */
  getDiscoveriesForAgent(agentId, limit = 10) {
    const agent = this.agents.get(agentId);
    if (!agent) return [];

    // Filter: not seen by this agent, not from this agent, recent (last 48h)
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;

    return this.sharedQueue
      .filter((d) => {
        return (
          d.fromAgent !== agentId &&
          !d.seenBy.includes(agentId) &&
          new Date(d.sharedAt).getTime() > cutoff
        );
      })
      .slice(-limit);
  }

  /**
   * Mark a discovery as seen by an agent
   */
  markSeen(discoveryId, agentId) {
    const disc = this.sharedQueue.find((d) => d.id === discoveryId);
    if (disc && !disc.seenBy.includes(agentId)) {
      disc.seenBy.push(agentId);
      this._save();
    }
  }

  /**
   * Record that an agent organically engaged with discovered content
   * Enforces interaction limits between agent pairs
   */
  recordEngagement(discoveryId, agentId) {
    const disc = this.sharedQueue.find((d) => d.id === discoveryId);
    if (!disc) return false;

    // Check interaction limits between this pair
    const pair = [disc.fromAgent, agentId].sort().join(':');
    const recentInteractions = this.discoveryLog.filter((d) => {
      const dpair = [d.fromAgent, ...(d.engagedBy || [])].sort();
      const cutoff = Date.now() - this.ethicsPolicy.minDelayBetweenInteractions * 3600000;
      return (
        dpair.includes(disc.fromAgent) &&
        dpair.includes(agentId) &&
        new Date(d.sharedAt).getTime() > cutoff
      );
    });

    if (recentInteractions.length >= this.ethicsPolicy.maxInteractionsPerPair) {
      console.warn(`⚠️ Interaction limit reached for pair ${pair}. Skipping to avoid detection.`);
      return false;
    }

    disc.engagedBy.push(agentId);
    this._save();
    return true;
  }

  // ── Trend Discovery ──────────────────────────────────────────────────────

  /**
   * Share a trending topic or hashtag across the network.
   * Agents can independently create content about the trend.
   */
  shareTrend(fromAgent, trend) {
    if (!this.ethicsPolicy.allowTrendDiscovery) {
      return false;
    }

    const trendEntry = {
      id: `trend-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromAgent,
      topic: trend.topic,
      hashtag: trend.hashtag,
      context: trend.context?.slice(0, 200),
      sharedAt: new Date().toISOString(),
      relevantTo: trend.niches || [],
    };

    this.discoveryLog.push(trendEntry);

    const agent = this.agents.get(fromAgent);
    if (agent) {
      agent.stats.trendsDiscovered++;
      agent.lastActive = new Date().toISOString();
    }

    this._save();
    console.log(`📈 Trend shared by ${fromAgent}: ${trend.topic}`);
    return true;
  }

  /**
   * Get recent trends, optionally filtered by niche
   */
  getRecentTrends(niche, limit = 5) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // Last 24h

    return this.discoveryLog
      .filter((d) => {
        if (!d.topic) return false;
        if (new Date(d.sharedAt).getTime() < cutoff) return false;
        if (niche && d.relevantTo?.length > 0 && !d.relevantTo.includes(niche)) return false;
        return true;
      })
      .slice(-limit);
  }

  // ── Ethics & Safety ──────────────────────────────────────────────────────

  /**
   * Check if an interaction would violate ethics policy
   */
  checkEthics(fromAgent, toAgent, interactionType) {
    const violations = [];

    if (interactionType === 'retweet' && !this.ethicsPolicy.allowSelfRetweet) {
      violations.push('Self-retweet coordination is disabled');
    }

    if (interactionType === 'like' && !this.ethicsPolicy.allowCoordinatedLiking) {
      violations.push('Coordinated liking is disabled');
    }

    if (this.ethicsPolicy.requireHumanReview) {
      violations.push('Human review required before cross-agent engagement');
    }

    return { allowed: violations.length === 0, violations };
  }

  /**
   * Get network health metrics
   */
  getNetworkStats() {
    const agents = Array.from(this.agents.values());
    const activeAgents = agents.filter((a) => {
      if (!a.lastActive) return false;
      return Date.now() - new Date(a.lastActive).getTime() < 24 * 60 * 60 * 1000;
    });

    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      totalDiscoveries: this.discoveryLog.length,
      pendingQueue: this.sharedQueue.filter((d) => d.engagedBy.length === 0).length,
      ethicsPolicy: { ...this.ethicsPolicy },
    };
  }

  /**
   * Reset the network (clear all data)
   */
  reset() {
    this.agents.clear();
    this.sharedQueue = [];
    this.discoveryLog = [];
    this._save();
    console.log('🔗 Engagement network reset');
  }
}

export default EngagementNetwork;
