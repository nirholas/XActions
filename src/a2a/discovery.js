/**
 * XActions A2A — Agent Discovery Service
 *
 * Discover, register, and manage external A2A agents. Includes skill matching,
 * trust scoring, and persistence of agent metadata.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fetchRemoteAgentCard } from './agentCard.js';
import { applyAuth } from './auth.js';

// ============================================================================
// Constants
// ============================================================================

const CACHE_DIR = path.join(os.homedir(), '.xactions', 'agents');
const AGENTS_FILE = path.join(CACHE_DIR, 'registry.json');
const TRUST_FILE = path.join(CACHE_DIR, 'trust.json');
const DEFAULT_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Helpers
// ============================================================================

async function ensureDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf-8'));
  } catch {
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

async function writeJson(filePath, data) {
  await ensureDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// ============================================================================
// AgentRegistry
// ============================================================================

export class AgentRegistry {
  /**
   * @param {object} [options={}]
   * @param {number} [options.refreshInterval=300000]
   */
  constructor(options = {}) {
    this.refreshInterval = options.refreshInterval || DEFAULT_REFRESH_MS;
    /** @type {Map<string, { card: object, registeredAt: string, lastHealthy: string|null, healthy: boolean }>} */
    this._agents = new Map();
    this._loaded = false;
    this._refreshTimer = null;
  }

  /** Load persisted registry from disk. */
  async _ensureLoaded() {
    if (this._loaded) return;
    const data = await readJson(AGENTS_FILE, {});
    for (const [url, entry] of Object.entries(data)) {
      this._agents.set(url, entry);
    }
    this._loaded = true;
  }

  /** Persist registry to disk. */
  async _save() {
    const obj = {};
    for (const [url, entry] of this._agents) obj[url] = entry;
    await writeJson(AGENTS_FILE, obj);
  }

  /**
   * Register a remote agent by fetching its agent card.
   *
   * @param {string} agentUrl
   * @returns {Promise<object|null>} The agent card, or null on failure
   */
  async register(agentUrl) {
    await this._ensureLoaded();
    const card = await fetchRemoteAgentCard(agentUrl);
    if (!card) {
      console.warn(`⚠️  Could not register agent at ${agentUrl}: failed to fetch agent card`);
      return null;
    }
    this._agents.set(agentUrl, {
      card,
      registeredAt: new Date().toISOString(),
      lastHealthy: new Date().toISOString(),
      healthy: true,
    });
    await this._save();
    console.log(`✅ Registered A2A agent: ${card.name} (${agentUrl}) — ${card.skills?.length || 0} skills`);
    return card;
  }

  /**
   * Remove an agent from the registry.
   *
   * @param {string} agentUrl
   * @returns {Promise<boolean>}
   */
  async unregister(agentUrl) {
    await this._ensureLoaded();
    const existed = this._agents.delete(agentUrl);
    if (existed) await this._save();
    return existed;
  }

  /**
   * Get a registered agent's info.
   *
   * @param {string} agentUrl
   * @returns {Promise<object|null>}
   */
  async get(agentUrl) {
    await this._ensureLoaded();
    return this._agents.get(agentUrl) || null;
  }

  /**
   * List registered agents with optional filtering.
   *
   * @param {object} [filters={}]
   * @param {string} [filters.hasSkill]
   * @param {string} [filters.hasTag]
   * @param {boolean} [filters.isHealthy]
   * @param {string} [filters.provider]
   * @returns {Promise<Array<{ url: string, name: string, card: object, healthy: boolean }>>}
   */
  async list(filters = {}) {
    await this._ensureLoaded();
    let results = [];
    for (const [url, entry] of this._agents) {
      results.push({ url, name: entry.card?.name || url, ...entry });
    }

    if (filters.isHealthy !== undefined) {
      results = results.filter(a => a.healthy === filters.isHealthy);
    }
    if (filters.hasSkill) {
      results = results.filter(a =>
        a.card?.skills?.some(s => s.id === filters.hasSkill || s.name === filters.hasSkill)
      );
    }
    if (filters.hasTag) {
      results = results.filter(a =>
        a.card?.skills?.some(s => s.tags?.includes(filters.hasTag))
      );
    }
    if (filters.provider) {
      results = results.filter(a =>
        a.card?.provider?.organization?.toLowerCase().includes(filters.provider.toLowerCase())
      );
    }

    return results;
  }

  /**
   * Refresh one or all agent cards.
   *
   * @param {string} [agentUrl] - If omitted, refreshes all
   * @returns {Promise<number>} Number of agents refreshed
   */
  async refresh(agentUrl) {
    await this._ensureLoaded();
    const urls = agentUrl ? [agentUrl] : Array.from(this._agents.keys());
    let refreshed = 0;

    for (const url of urls) {
      const card = await fetchRemoteAgentCard(url);
      if (card) {
        const existing = this._agents.get(url) || {};
        this._agents.set(url, {
          ...existing,
          card,
          lastHealthy: new Date().toISOString(),
          healthy: true,
        });
        refreshed++;
      } else {
        const existing = this._agents.get(url);
        if (existing) existing.healthy = false;
      }
    }

    await this._save();
    return refreshed;
  }

  /**
   * Check if an agent is reachable.
   *
   * @param {string} agentUrl
   * @returns {Promise<boolean>}
   */
  async health(agentUrl) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const headers = {};
      await applyAuth(headers, agentUrl);
      const resp = await fetch(`${agentUrl.replace(/\/$/, '')}/a2a/health`, {
        method: 'GET',
        signal: controller.signal,
        headers,
      });
      clearTimeout(timer);
      const isHealthy = resp.ok;

      await this._ensureLoaded();
      const entry = this._agents.get(agentUrl);
      if (entry) {
        entry.healthy = isHealthy;
        if (isHealthy) entry.lastHealthy = new Date().toISOString();
        await this._save();
      }
      return isHealthy;
    } catch {
      return false;
    }
  }

  /**
   * Start periodic refresh of all agents.
   */
  startAutoRefresh() {
    if (this._refreshTimer) return;
    this._refreshTimer = setInterval(() => this.refresh(), this.refreshInterval);
  }

  /**
   * Stop periodic refresh.
   */
  stopAutoRefresh() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  }
}

// ============================================================================
// SkillMatcher — Find agents for tasks
// ============================================================================

export class SkillMatcher {
  /**
   * @param {AgentRegistry} registry
   */
  constructor(registry) {
    this.registry = registry;
  }

  /**
   * Find agents that can handle a given task description.
   *
   * @param {string} taskDescription
   * @returns {Promise<Array<{ agentUrl: string, agentName: string, matchingSkills: object[], score: number }>>}
   */
  async findAgentsForTask(taskDescription) {
    const tokens = taskDescription.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const agents = await this.registry.list({ isHealthy: true });
    const results = [];

    for (const agent of agents) {
      const skills = agent.card?.skills || [];
      const matchingSkills = [];

      for (const skill of skills) {
        const searchText = `${skill.id} ${skill.name} ${skill.description} ${(skill.tags || []).join(' ')}`.toLowerCase();
        const matchCount = tokens.filter(t => searchText.includes(t)).length;
        if (matchCount > 0) {
          matchingSkills.push({ ...skill, _matchScore: matchCount });
        }
      }

      if (matchingSkills.length > 0) {
        const score = matchingSkills.reduce((sum, s) => sum + s._matchScore, 0);
        results.push({
          agentUrl: agent.url,
          agentName: agent.name,
          matchingSkills: matchingSkills.map(({ _matchScore, ...rest }) => rest),
          score,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Find agents that provide a specific skill.
   *
   * @param {string} skillId
   * @returns {Promise<Array<{ agentUrl: string, agentName: string }>>}
   */
  async findAgentForSkill(skillId) {
    const agents = await this.registry.list({ isHealthy: true });
    return agents
      .filter(a => a.card?.skills?.some(s => s.id === skillId))
      .map(a => ({ agentUrl: a.url, agentName: a.name }));
  }

  /**
   * Find agents with skills that XActions doesn't have.
   *
   * @param {string[]} mySkillIds
   * @returns {Promise<Array<{ agentUrl: string, agentName: string, uniqueSkills: string[] }>>}
   */
  async findComplementaryAgents(mySkillIds) {
    const mySet = new Set(mySkillIds);
    const agents = await this.registry.list({ isHealthy: true });
    const results = [];

    for (const agent of agents) {
      const uniqueSkills = (agent.card?.skills || [])
        .filter(s => !mySet.has(s.id))
        .map(s => s.id);
      if (uniqueSkills.length > 0) {
        results.push({ agentUrl: agent.url, agentName: agent.name, uniqueSkills });
      }
    }

    return results.sort((a, b) => b.uniqueSkills.length - a.uniqueSkills.length);
  }
}

// ============================================================================
// TrustScorer
// ============================================================================

export class TrustScorer {
  constructor() {
    this._history = {}; // agentUrl → { events: [], firstSeen }
    this._loaded = false;
  }

  async _ensureLoaded() {
    if (this._loaded) return;
    this._history = await readJson(TRUST_FILE, {});
    this._loaded = true;
  }

  async _save() {
    await writeJson(TRUST_FILE, this._history);
  }

  /**
   * Calculate a trust score (0-100) for an agent.
   *
   * @param {string} agentUrl
   * @returns {Promise<number>}
   */
  async score(agentUrl) {
    await this._ensureLoaded();
    const record = this._history[agentUrl];
    if (!record || !record.events || record.events.length === 0) return 50; // Neutral default

    const events = record.events;
    const total = events.length;
    const successes = events.filter(e => e.type === 'success').length;
    const failures = events.filter(e => e.type === 'failure').length;

    // Success ratio (0-40 points)
    const successRatio = total > 0 ? (successes / total) * 40 : 20;

    // Longevity (0-20 points) — more points for being known longer
    const daysKnown = record.firstSeen
      ? (Date.now() - new Date(record.firstSeen).getTime()) / 86400000
      : 0;
    const longevity = Math.min(daysKnown / 30, 1) * 20;

    // Recency (0-20 points) — recent successes score higher
    const recentEvents = events.filter(e => Date.now() - new Date(e.timestamp).getTime() < 86400000);
    const recentSuccesses = recentEvents.filter(e => e.type === 'success').length;
    const recency = recentEvents.length > 0 ? (recentSuccesses / recentEvents.length) * 20 : 10;

    // Volume (0-20 points) — agents we've used more get more points
    const volume = Math.min(total / 100, 1) * 20;

    return Math.round(Math.min(100, successRatio + longevity + recency + volume));
  }

  /**
   * Record an interaction with an agent.
   *
   * @param {string} agentUrl
   * @param {{ type: 'success'|'failure'|'timeout', duration?: number }} event
   */
  async record(agentUrl, event) {
    await this._ensureLoaded();
    if (!this._history[agentUrl]) {
      this._history[agentUrl] = { firstSeen: new Date().toISOString(), events: [] };
    }
    this._history[agentUrl].events.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
    // Keep only last 1000 events per agent
    if (this._history[agentUrl].events.length > 1000) {
      this._history[agentUrl].events = this._history[agentUrl].events.slice(-1000);
    }
    await this._save();
  }

  /**
   * Get interaction history for an agent.
   *
   * @param {string} agentUrl
   * @returns {Promise<object>}
   */
  async getHistory(agentUrl) {
    await this._ensureLoaded();
    return this._history[agentUrl] || { firstSeen: null, events: [] };
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a fully configured Discovery service.
 *
 * @param {object} [options={}]
 * @returns {{ registry: AgentRegistry, matcher: SkillMatcher, trust: TrustScorer }}
 */
export function createDiscovery(options = {}) {
  const registry = new AgentRegistry(options);
  const matcher = new SkillMatcher(registry);
  const trust = new TrustScorer();

  return { registry, matcher, trust };
}
