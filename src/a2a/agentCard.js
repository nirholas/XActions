/**
 * XActions A2A — Agent Card Generator
 *
 * Generates, serves, and manages the A2A Agent Card — the public identity
 * document hosted at /.well-known/agent.json that tells other agents what
 * XActions can do.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { getAllSkills, getSkillCategories } from './skillRegistry.js';
import { createAgentCard, validateAgentCard } from './types.js';

// ============================================================================
// Constants
// ============================================================================

const XACTIONS_VERSION = '3.1.0';
const XACTIONS_HOMEPAGE = 'https://xactions.app';
const CARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REMOTE_FETCH_TIMEOUT = 5000;

// ============================================================================
// In-memory caches
// ============================================================================

let _cachedCard = null;
let _cachedCardAt = 0;
const _remoteCardCache = new Map(); // agentUrl → { card, fetchedAt }

// ============================================================================
// Card Generation
// ============================================================================

/**
 * Generate the full XActions Agent Card.
 *
 * @param {object} [options={}]
 * @param {string} [options.baseUrl='http://localhost:3100'] - Agent endpoint URL
 * @param {boolean} [options.enableStreaming=true]
 * @param {boolean} [options.enablePush=true]
 * @param {string[]} [options.authSchemes=['bearer']]
 * @param {string[]|'all'} [options.includeSkills='all'] - Skill categories to include
 * @returns {object} A2A Agent Card
 */
export function generateAgentCard(options = {}) {
  const {
    baseUrl = 'http://localhost:3100',
    enableStreaming = true,
    enablePush = true,
    authSchemes = ['bearer'],
    includeSkills = 'all',
  } = options;

  let skills;
  if (includeSkills === 'all') {
    skills = getAllSkills();
  } else {
    const categories = getSkillCategories();
    skills = [];
    for (const cat of includeSkills) {
      if (categories[cat]) skills.push(...categories[cat]);
    }
  }

  const card = createAgentCard({
    name: 'XActions Agent',
    description: 'The Complete X/Twitter Automation Toolkit — scraping, posting, analytics, growth automation, multi-platform support. No API fees.',
    url: baseUrl,
    version: XACTIONS_VERSION,
    capabilities: {
      streaming: enableStreaming,
      pushNotifications: enablePush,
      stateTransitionHistory: true,
    },
    skills,
    authentication: {
      schemes: authSchemes,
      credentials: `${baseUrl}/a2a/auth/credentials`,
    },
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['text/plain', 'application/json', 'image/png'],
    provider: {
      organization: 'XActions by @nichxbt',
      url: XACTIONS_HOMEPAGE,
    },
  });

  // Validate before returning
  const { valid, errors } = validateAgentCard(card);
  if (!valid) {
    console.warn('⚠️  Generated agent card has validation issues:', errors);
  }

  _cachedCard = card;
  _cachedCardAt = Date.now();
  return card;
}

/**
 * Mount the /.well-known/agent.json endpoint on an Express app.
 *
 * @param {object} app - Express app instance
 * @param {object} [options] - Same options as generateAgentCard
 */
export function serveAgentCard(app, options = {}) {
  // Pre-generate the card
  if (!_cachedCard) generateAgentCard(options);

  app.get('/.well-known/agent.json', (req, res) => {
    // Regenerate if expired
    if (Date.now() - _cachedCardAt > CARD_CACHE_TTL) {
      generateAgentCard(options);
    }

    // CORS headers for cross-origin agent discovery
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Cache-Control', `public, max-age=${Math.floor(CARD_CACHE_TTL / 1000)}`);

    if (req.query.format === 'minimal') {
      return res.json(generateMinimalCard(_cachedCard));
    }

    res.json(_cachedCard);
  });
}

/**
 * Generate a minimal (condensed) version of an agent card.
 * Contains only name, url, version, and skill IDs for fast discovery.
 *
 * @param {object} fullCard
 * @returns {object} Minimal card
 */
export function generateMinimalCard(fullCard) {
  return {
    name: fullCard.name,
    url: fullCard.url,
    version: fullCard.version,
    skillCount: fullCard.skills?.length || 0,
    skillIds: (fullCard.skills || []).map(s => s.id),
    capabilities: fullCard.capabilities,
    provider: fullCard.provider,
  };
}

/**
 * Compare two agent cards and return a diff of what changed.
 *
 * @param {object} cardA - Previous version
 * @param {object} cardB - Current version
 * @returns {object} Diff { added, removed, changed }
 */
export function diffCards(cardA, cardB) {
  const diff = { added: [], removed: [], changed: [] };

  // Compare top-level fields
  for (const key of ['name', 'description', 'url', 'version']) {
    if (cardA[key] !== cardB[key]) {
      diff.changed.push({ field: key, from: cardA[key], to: cardB[key] });
    }
  }

  // Compare skills
  const skillsA = new Map((cardA.skills || []).map(s => [s.id, s]));
  const skillsB = new Map((cardB.skills || []).map(s => [s.id, s]));

  for (const [id] of skillsB) {
    if (!skillsA.has(id)) diff.added.push(id);
  }
  for (const [id] of skillsA) {
    if (!skillsB.has(id)) diff.removed.push(id);
  }

  // Compare capabilities
  if (cardA.capabilities && cardB.capabilities) {
    for (const cap of ['streaming', 'pushNotifications', 'stateTransitionHistory']) {
      if (cardA.capabilities[cap] !== cardB.capabilities[cap]) {
        diff.changed.push({
          field: `capabilities.${cap}`,
          from: cardA.capabilities[cap],
          to: cardB.capabilities[cap],
        });
      }
    }
  }

  return diff;
}

/**
 * Fetch another agent's Agent Card from their /.well-known/agent.json.
 *
 * @param {string} agentUrl - Base URL of the remote agent
 * @returns {Promise<object|null>} The agent card, or null on failure
 */
export async function fetchRemoteAgentCard(agentUrl) {
  // Check cache first
  const cached = _remoteCardCache.get(agentUrl);
  if (cached && Date.now() - cached.fetchedAt < CARD_CACHE_TTL) {
    return cached.card;
  }

  const url = `${agentUrl.replace(/\/$/, '')}/.well-known/agent.json`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`⚠️  Failed to fetch agent card from ${url}: HTTP ${response.status}`);
      return null;
    }

    const card = await response.json();
    const { valid, errors } = validateAgentCard(card);
    if (!valid) {
      console.warn(`⚠️  Invalid agent card from ${url}:`, errors);
      return null;
    }

    // Cache valid card
    _remoteCardCache.set(agentUrl, { card, fetchedAt: Date.now() });
    return card;
  } catch (err) {
    console.warn(`⚠️  Error fetching agent card from ${url}: ${err.message}`);
    return null;
  }
}

/**
 * Clear the remote card cache (for testing or forced refresh).
 */
export function clearCardCache() {
  _cachedCard = null;
  _cachedCardAt = 0;
  _remoteCardCache.clear();
}
