// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions A2A — Skill Registry
 *
 * Bridges MCP tool definitions to A2A skill descriptors. Maintains a
 * searchable, categorized registry of all capabilities the XActions agent
 * can advertise to other A2A agents.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

// ============================================================================
// MCP Tool Definitions
// ============================================================================
// Skills are derived from the MCP server's own TOOLS export, so the A2A agent
// advertises exactly the tools (names, descriptions and input schemas) the MCP
// server serves. Importing server.js does not start a transport: its main()
// only runs when the file is the process entry point.

import { TOOLS } from '../mcp/server.js';
import { getPluginTools } from '../plugins/index.js';

// ============================================================================
// Skill Categories
// ============================================================================

const CATEGORY_PATTERNS = {
  scraping: /^x_(get|scrape)_/,
  posting: /^x_(post|tweet|reply|retweet|repost|create_poll|quote_tweet|auto_comment|auto_retweet|auto_like)/,
  analytics: /^x_(analytics|engagement|performance|audience|creator|get_analytics|get_post_analytics|audience_insights|engagement_report|creator_analytics|predict|best_time|analyze_voice|analyze_sentiment)/,
  automation: /^x_(auto_|schedule|workflow|bulk|evergreen|rss)/,
  management: /^x_(unfollow|follow|block|mute|unmute|detect_unfollowers|smart_unfollow|detect_bots)/,
  profile: /^x_(profile|update_profile|get_settings|toggle_protected|check_premium)/,
  graph: /^x_graph_/,
  persona: /^x_persona_/,
  streaming: /^x_stream_/,
  content: /^x_(generate|rewrite|optimize|summarize|suggest_hashtags|generate_variations|publish_article)/,
  monitoring: /^x_(monitor_|follower_alerts|track_engagement|brand_monitor|reputation)/,
  data: /^x_(export|import|convert|migrate|diff|dataset|history|growth_rate|compare_accounts|audience_overlap)/,
  crm: /^x_crm_/,
  messaging: /^x_(send_dm|get_conversations|export_dms|notify)/,
  discovery: /^x_(get_trends|get_explore|find_influencers|smart_target|get_recommendations|crypto_analyze)/,
  lists: /^x_(get_lists|get_list_members)/,
  spaces: /^x_(get_spaces|scrape_space)/,
  grok: /^x_grok_/,
  teams: /^x_team_/,
  bookmarks: /^x_(bookmark|get_bookmarks|clear_bookmarks)/,
  video: /^x_download_video/,
};

/** Platform tags inferred from tool capabilities */
const PLATFORM_KEYWORDS = {
  twitter: ['twitter', 'tweet', 'retweet', 'dm', 'x_'],
  bluesky: ['bluesky', 'bsky'],
  mastodon: ['mastodon', 'fediverse'],
  threads: ['threads'],
};

// ============================================================================
// Registry State (singleton)
// ============================================================================

let _skills = null;
let _initialized = false;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Convert an MCP tool definition to an A2A skill descriptor.
 *
 * @param {object} tool - MCP tool { name, description, inputSchema }
 * @returns {object} A2A skill
 */
export function convertMcpToolToA2aSkill(tool) {
  const id = `xactions.${tool.name}`;
  const nameParts = tool.name.replace(/^x_/, '').split('_');
  const displayName = nameParts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Generate tags from tool name
  const tags = [...new Set([
    ...nameParts,
    ...detectPlatformTags(tool),
    detectCategoryTag(tool.name),
  ].filter(Boolean))];

  return {
    id,
    name: displayName,
    description: tool.description || '',
    tags,
    inputSchema: tool.inputSchema || { type: 'object', properties: {} },
    outputSchema: { type: 'object', properties: { result: { type: 'object' } } },
  };
}

/**
 * Detect platform tags from a tool definition.
 *
 * @param {object} tool
 * @returns {string[]}
 */
function detectPlatformTags(tool) {
  const tags = ['twitter']; // Default: all tools support Twitter
  const desc = (tool.description || '').toLowerCase();
  const schema = JSON.stringify(tool.inputSchema || {}).toLowerCase();
  if (desc.includes('bluesky') || schema.includes('bluesky')) tags.push('bluesky');
  if (desc.includes('mastodon') || schema.includes('mastodon')) tags.push('mastodon');
  if (desc.includes('threads') || schema.includes('threads')) tags.push('threads');
  return tags;
}

/**
 * Detect the primary category tag for a tool name.
 *
 * @param {string} toolName
 * @returns {string|null}
 */
function detectCategoryTag(toolName) {
  for (const [cat, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    if (pattern.test(toolName)) return cat;
  }
  return null;
}

/**
 * Initialize the skill registry.
 */
function ensureInitialized() {
  if (_initialized) return;
  _skills = new Map();
  for (const tool of TOOLS) {
    const skill = convertMcpToolToA2aSkill(tool);
    _skills.set(skill.id, skill);
  }
  // Try to load plugin tools (best-effort, non-blocking)
  try {
    const pluginTools = getPluginTools();
    if (Array.isArray(pluginTools)) {
      for (const tool of pluginTools) {
        const skill = convertMcpToolToA2aSkill(tool);
        _skills.set(skill.id, skill);
      }
    }
  } catch {
    // Plugins not yet initialized — base tools are sufficient
  }
  _initialized = true;
  console.log(`📋 A2A Skill Registry initialized: ${_skills.size} skills registered`);
}

/**
 * Get skill categories as an array of category names.
 *
 * @returns {string[]}
 */
export function getSkillCategories() {
  ensureInitialized();
  const categoryMap = {};
  for (const skill of _skills.values()) {
    const toolName = skill.id.replace('xactions.', '');
    for (const [cat, pattern] of Object.entries(CATEGORY_PATTERNS)) {
      if (pattern.test(toolName)) {
        if (!categoryMap[cat]) categoryMap[cat] = [];
        categoryMap[cat].push(skill);
        break;
      }
    }
  }
  return categoryMap;
}

/**
 * Search skills by query text and/or tags.
 *
 * @param {string|object} [queryOrOpts=''] - Text to search, or options { query, category, tags }
 * @param {string[]} [tagsArg=[]] - Tags to filter by (OR matching)
 * @returns {object[]} Matching skills
 */
export function searchSkills(queryOrOpts = '', tagsArg = []) {
  ensureInitialized();
  let query = '';
  let category = null;
  let tags = tagsArg;
  if (typeof queryOrOpts === 'object' && queryOrOpts !== null) {
    query = queryOrOpts.query || '';
    category = queryOrOpts.category || null;
    tags = queryOrOpts.tags || tags;
  } else {
    query = queryOrOpts || '';
  }
  const q = query.toLowerCase();
  const results = [];
  for (const skill of _skills.values()) {
    let match = false;
    if (q && (
      skill.id.toLowerCase().includes(q) ||
      skill.name.toLowerCase().includes(q) ||
      skill.description.toLowerCase().includes(q)
    )) {
      match = true;
    }
    if (category) {
      const toolName = skill.id.replace('xactions.', '');
      const pattern = CATEGORY_PATTERNS[category];
      if (pattern && pattern.test(toolName)) {
        match = true;
      }
    }
    if (tags.length > 0 && tags.some(t => skill.tags.includes(t))) {
      match = true;
    }
    if (!q && !category && tags.length === 0) match = true;
    if (match) results.push(skill);
  }
  return results;
}

/**
 * Get a single skill by its A2A skill ID.
 *
 * @param {string} skillId - e.g. 'xactions.x_get_profile'
 * @returns {object|null}
 */
export function getSkillById(skillId) {
  ensureInitialized();
  return _skills.get(skillId) ?? null;
}

/**
 * Get all registered A2A skills.
 *
 * @returns {object[]}
 */
export function getAllSkills() {
  ensureInitialized();
  return Array.from(_skills.values());
}

/**
 * Re-scan MCP tools and plugins to rebuild the skill list.
 *
 * @returns {Promise<number>} New skill count
 */
export function refreshSkills() {
  _initialized = false;
  _skills = null;
  ensureInitialized();
  return _skills.size;
}
