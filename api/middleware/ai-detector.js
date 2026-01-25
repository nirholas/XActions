/**
 * AI Agent Detection Middleware
 * 
 * Distinguishes between human users and AI agents to route them appropriately:
 * - Humans → Free browser scripts and dashboard
 * - AI Agents → Paid API endpoints via x402
 * 
 * Detection methods:
 * 1. User-Agent analysis (AI SDKs, automation tools)
 * 2. Request patterns (structured JSON, no cookies)
 * 3. Explicit headers (X-AI-Agent, Authorization: Bearer)
 * 4. Path-based (/api/ai/* always treated as AI)
 */

// Known AI agent User-Agent patterns
const AI_USER_AGENTS = [
  // LLM providers
  /openai/i,
  /anthropic/i,
  /claude/i,
  /gpt/i,
  /langchain/i,
  /llamaindex/i,
  /autogpt/i,
  /babyagi/i,
  
  // Automation tools
  /axios/i,
  /node-fetch/i,
  /python-requests/i,
  /python-urllib/i,
  /httpx/i,
  /aiohttp/i,
  /curl/i,
  /wget/i,
  /postman/i,
  /insomnia/i,
  /httpie/i,
  
  // Bot patterns
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  
  // MCP clients
  /mcp/i,
  /model-context-protocol/i,
  
  // Custom AI patterns
  /ai-agent/i,
  /autonomous/i,
  /assistant/i,
  /copilot/i,
];

// Known browser User-Agent patterns (humans)
const BROWSER_USER_AGENTS = [
  /mozilla/i,
  /chrome/i,
  /safari/i,
  /firefox/i,
  /edge/i,
  /opera/i,
  /brave/i,
  /vivaldi/i,
];

// Headers that indicate programmatic access
const PROGRAMMATIC_HEADERS = [
  'x-ai-agent',
  'x-agent-type',
  'x-automation',
  'x-bot',
  'x-mcp-client',
];

/**
 * Detect if request is from an AI agent
 */
export function isAIAgent(req) {
  // Explicit AI endpoint - always AI
  if (req.path.startsWith('/api/ai/')) {
    return true;
  }
  
  // Explicit AI headers
  for (const header of PROGRAMMATIC_HEADERS) {
    if (req.headers[header]) {
      return true;
    }
  }
  
  // Check User-Agent
  const userAgent = req.headers['user-agent'] || '';
  
  // No User-Agent = likely programmatic
  if (!userAgent) {
    return true;
  }
  
  // Match against AI patterns
  for (const pattern of AI_USER_AGENTS) {
    if (pattern.test(userAgent)) {
      return true;
    }
  }
  
  // Has browser UA but no typical browser headers
  const hasBrowserUA = BROWSER_USER_AGENTS.some(p => p.test(userAgent));
  const hasBrowserHeaders = req.headers['accept-language'] && 
                            req.headers['accept-encoding'] &&
                            req.headers['accept'];
  
  if (hasBrowserUA && !hasBrowserHeaders) {
    return true; // Spoofed browser UA
  }
  
  // Bearer token without session cookie = likely API client
  const hasBearer = req.headers['authorization']?.startsWith('Bearer ');
  const hasSessionCookie = req.cookies?.auth_token || req.cookies?.session;
  
  if (hasBearer && !hasSessionCookie) {
    return true;
  }
  
  // JSON-only Accept header (no HTML)
  const acceptHeader = req.headers['accept'] || '';
  if (acceptHeader === 'application/json' && !acceptHeader.includes('text/html')) {
    // Could be API client, but not definitive
    // Only flag if combined with other signals
  }
  
  return false;
}

/**
 * Get agent type for logging/analytics
 */
export function getAgentType(req) {
  const userAgent = req.headers['user-agent'] || '';
  
  // Check explicit header first
  const explicitType = req.headers['x-agent-type'] || req.headers['x-ai-agent'];
  if (explicitType) return explicitType.toLowerCase();
  
  // LLM providers
  if (/openai|gpt/i.test(userAgent)) return 'openai';
  if (/anthropic|claude/i.test(userAgent)) return 'anthropic';
  if (/langchain/i.test(userAgent)) return 'langchain';
  if (/llamaindex/i.test(userAgent)) return 'llamaindex';
  if (/autogpt/i.test(userAgent)) return 'autogpt';
  
  // MCP
  if (/mcp|model-context-protocol/i.test(userAgent)) return 'mcp';
  
  // Languages/tools
  if (/python/i.test(userAgent)) return 'python';
  if (/node|axios/i.test(userAgent)) return 'nodejs';
  if (/curl/i.test(userAgent)) return 'curl';
  if (/postman/i.test(userAgent)) return 'postman';
  if (/insomnia/i.test(userAgent)) return 'insomnia';
  
  // Browsers (human)
  if (/chrome/i.test(userAgent)) return 'chrome';
  if (/firefox/i.test(userAgent)) return 'firefox';
  if (/safari/i.test(userAgent)) return 'safari';
  if (/edge/i.test(userAgent)) return 'edge';
  
  return 'unknown';
}

/**
 * Get detailed agent info for analytics
 */
export function getAgentInfo(req) {
  const userAgent = req.headers['user-agent'] || '';
  
  return {
    isAI: isAIAgent(req),
    type: getAgentType(req),
    userAgent: userAgent.substring(0, 200), // Truncate for safety
    hasAuth: !!req.headers['authorization'],
    hasCookies: !!(req.cookies?.auth_token || req.cookies?.session),
    ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
    path: req.path,
    method: req.method,
  };
}

/**
 * AI Detection Middleware
 * 
 * Adds req.isAI, req.agentType, and req.agentInfo for downstream use
 */
export function aiDetectorMiddleware(req, res, next) {
  req.isAI = isAIAgent(req);
  req.agentType = req.isAI ? getAgentType(req) : 'human';
  req.agentInfo = getAgentInfo(req);
  
  // Add response header indicating detection (useful for debugging)
  res.set('X-XActions-Client', req.agentType);
  
  // Log AI requests for analytics (in production, send to analytics service)
  if (req.isAI && req.path.startsWith('/api/')) {
    console.log(`🤖 AI Request: ${req.agentType} → ${req.method} ${req.path}`);
  }
  
  next();
}

/**
 * Middleware to block non-AI requests from AI endpoints
 * Use this on routes that should ONLY be accessible to paying AI agents
 */
export function requireAIAgent(req, res, next) {
  if (!req.isAI) {
    return res.status(403).json({
      error: 'AI Agent Required',
      message: 'This endpoint is for AI agents only. Humans should use free browser scripts.',
      humanAlternative: 'https://xactions.app/run.html',
    });
  }
  next();
}

/**
 * Middleware to redirect AI agents away from human endpoints
 * Use this on routes that should ONLY be for humans
 */
export function requireHuman(req, res, next) {
  if (req.isAI) {
    return res.status(403).json({
      error: 'Human Access Only',
      message: 'This endpoint is for human users. AI agents should use the paid API.',
      aiEndpoint: '/api/ai/',
      docs: 'https://xactions.app/docs/ai-api',
    });
  }
  next();
}

export default aiDetectorMiddleware;
