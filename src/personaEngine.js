/**
 * XActions Persona Engine
 * 
 * Defines, stores, and manages persona configurations for algorithm building.
 * A persona is a complete identity: niche, topics, tone, engagement style,
 * target accounts, activity patterns, and growth goals.
 * 
 * Used by algorithmBuilder.js to run 24/7 automated account growth.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ============================================================================
// Constants
// ============================================================================

const PERSONAS_DIR = join(homedir(), '.xactions', 'personas');
const DEFAULT_MODELS = {
  comment: 'google/gemini-flash-2.0',
  post: 'google/gemini-flash-2.0',
  reply: 'google/gemini-flash-2.0',
};

// ============================================================================
// Preset Niches — quick-start persona templates
// ============================================================================

const NICHE_PRESETS = {
  'crypto-degen': {
    name: 'Crypto Degen',
    topics: ['crypto', 'defi', 'web3', 'bitcoin', 'ethereum', 'solana', 'memecoins', 'airdrops', 'onchain'],
    searchTerms: ['crypto alpha', 'defi yield', 'new token launch', 'solana ecosystem', 'bitcoin analysis', 'web3 builder', 'airdrop farming'],
    targetAccounts: ['0xCygaar', 'blaboratory', 'coaboratory', 'DefiIgnas', 'Route2FI'],
    tone: 'degen casual — short, punchy, uses crypto slang (gm, wagmi, ngmi, ser, anon, lfg, bullish), emojis like 🔥💰🚀',
    commentStyle: 'brief, hype-driven, uses crypto lingo, asks about alpha, shares quick takes',
    bioTemplate: 'onchain explorer | building in crypto | {niche_detail} | gm',
    postTopics: ['market analysis', 'project reviews', 'alpha finds', 'onchain data', 'defi strategies'],
  },
  'tech-builder': {
    name: 'Tech Builder',
    topics: ['programming', 'ai', 'startups', 'saas', 'open source', 'javascript', 'python', 'devtools', 'shipping'],
    searchTerms: ['building in public', 'ship fast', 'saas founder', 'ai tools', 'developer tools', 'open source project', 'indie hacker'],
    targetAccounts: ['levelsio', 'marc_louvion', 'tdinh_me', 'dannypostmaa', 'yaboratory'],
    tone: 'builder mindset — pragmatic, sharing learnings, technical but accessible, enthusiastic about shipping',
    commentStyle: 'asks "how did you build this?", shares related experiences, offers specific feedback, celebrates launches',
    bioTemplate: 'building {niche_detail} | shipping fast | sharing the journey | indie maker',
    postTopics: ['build updates', 'technical learnings', 'tool recommendations', 'launch stories', 'growth metrics'],
  },
  'ai-researcher': {
    name: 'AI Researcher',
    topics: ['artificial intelligence', 'machine learning', 'llm', 'gpt', 'claude', 'transformers', 'agents', 'agi', 'alignment'],
    searchTerms: ['ai research paper', 'llm benchmark', 'ai agents', 'machine learning breakthrough', 'ai safety', 'new model release', 'ai open source'],
    targetAccounts: ['kaboratory', 'jimfan', 'ylecun', 'sama', 'EMostaque'],
    tone: 'thoughtful analytical — shares insights on papers, explains concepts clearly, optimistic but grounded',
    commentStyle: 'asks about methodology, shares related research, provides nuanced takes, connects ideas across papers',
    bioTemplate: 'exploring AI frontiers | {niche_detail} | papers → insights | building with LLMs',
    postTopics: ['paper breakdowns', 'model comparisons', 'ai tools reviews', 'research threads', 'industry analysis'],
  },
  'growth-marketer': {
    name: 'Growth Marketer',
    topics: ['growth', 'marketing', 'content creation', 'audience building', 'copywriting', 'personal branding', 'twitter growth'],
    searchTerms: ['twitter growth tips', 'content strategy', 'viral tweet', 'audience building', 'personal brand', 'copywriting tips', 'founder marketing'],
    targetAccounts: ['dickiebush', 'nicolascole77', 'JustinWelsh', 'SahilBloom', 'alexgarcia_atx'],
    tone: 'authoritative but approachable — uses frameworks, numbered lists, actionable advice, storytelling',
    commentStyle: 'adds specific value, shares frameworks, provides examples, asks follow-up questions',
    bioTemplate: 'helping {niche_detail} grow | content + strategy | sharing what works',
    postTopics: ['growth frameworks', 'content strategy', 'case studies', 'copywriting tips', 'audience insights'],
  },
  'finance-investor': {
    name: 'Finance Investor',
    topics: ['investing', 'stocks', 'markets', 'economics', 'personal finance', 'real estate', 'wealth building'],
    searchTerms: ['stock analysis', 'market outlook', 'investing strategy', 'earnings report', 'economic data', 'portfolio management', 'value investing'],
    targetAccounts: ['chaaboratory', 'WarrenBuffett', 'compound248', 'BrianFeroldi', 'saxena_puru'],
    tone: 'data-driven, measured — uses numbers, charts references, balanced perspective, long-term thinking',
    commentStyle: 'asks about thesis, shares relevant data points, provides counterarguments respectfully',
    bioTemplate: 'markets & investing | {niche_detail} | long-term thinker | data > narrative',
    postTopics: ['market analysis', 'company deep dives', 'economic trends', 'investing frameworks', 'portfolio updates'],
  },
  'creative-writer': {
    name: 'Creative Writer',
    topics: ['writing', 'storytelling', 'creativity', 'books', 'fiction', 'poetry', 'screenwriting', 'journalism'],
    searchTerms: ['writing tips', 'storytelling craft', 'creative writing', 'book recommendation', 'author interview', 'writing process', 'publishing'],
    targetAccounts: ['jaboratory', 'naboratory', 'StephenKing', 'MaaboratoryMoyes', 'rmaboratoryidis'],
    tone: 'eloquent and observational — vivid language, metaphors, emotional resonance, wit',
    commentStyle: 'shares beautiful observations, connects to literary references, asks about creative process',
    bioTemplate: 'words & worlds | {niche_detail} | finding stories everywhere',
    postTopics: ['writing craft', 'book insights', 'creative observations', 'micro-stories', 'language appreciation'],
  },
  'custom': {
    name: 'Custom',
    topics: [],
    searchTerms: [],
    targetAccounts: [],
    tone: '',
    commentStyle: '',
    bioTemplate: '',
    postTopics: [],
  },
};

// ============================================================================
// Activity Pattern Presets — simulate different human schedules
// ============================================================================

const ACTIVITY_PATTERNS = {
  'night-owl': {
    name: 'Night Owl',
    description: 'Active late night through afternoon, peak around midnight-2am',
    activeHours: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3],
    peakHours: [21, 22, 23, 0, 1, 2],
    sleepHours: [4, 5, 6, 7, 8, 9],
  },
  'early-bird': {
    name: 'Early Bird',
    description: 'Active from 5am, peak morning, winds down by 10pm',
    activeHours: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    peakHours: [6, 7, 8, 9, 10, 11],
    sleepHours: [22, 23, 0, 1, 2, 3, 4],
  },
  'nine-to-five': {
    name: '9-to-5 Worker',
    description: 'Checks in before/after work, active evenings, light during work hours',
    activeHours: [7, 8, 12, 13, 17, 18, 19, 20, 21, 22, 23],
    peakHours: [7, 8, 12, 18, 19, 20, 21],
    sleepHours: [0, 1, 2, 3, 4, 5, 6],
  },
  'always-on': {
    name: 'Always Online',
    description: 'Active throughout the day with short breaks, common for full-time creators',
    activeHours: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0],
    peakHours: [9, 10, 11, 14, 15, 19, 20, 21],
    sleepHours: [1, 2, 3, 4, 5, 6],
  },
  'weekend-warrior': {
    name: 'Weekend Warrior',
    description: 'Light weekday activity, heavy weekends',
    activeHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
    peakHours: [10, 11, 14, 15, 20, 21],
    sleepHours: [0, 1, 2, 3, 4, 5, 6, 7],
    weekendMultiplier: 2.5,  // 2.5x more active on weekends
  },
};

// ============================================================================
// Engagement Strategies
// ============================================================================

const ENGAGEMENT_STRATEGIES = {
  'aggressive': {
    name: 'Aggressive Growth',
    description: 'Maximum engagement — high follow/like/comment rates',
    dailyLimits: { follows: 80, likes: 150, comments: 40, posts: 5, searches: 20, profileVisits: 30 },
    followBackRatio: 0.7,     // Follow 70% of relevant users found
    likeRatio: 0.8,           // Like 80% of on-topic tweets seen
    commentRatio: 0.3,        // Comment on 30% of liked tweets
    unfollowAfterDays: 3,     // Quick unfollow cycle
    sessionLength: { min: 20, max: 45 }, // minutes per session
    sessionsPerDay: { min: 6, max: 10 },
  },
  'moderate': {
    name: 'Moderate Growth',
    description: 'Balanced engagement — steady growth without overexposure',
    dailyLimits: { follows: 40, likes: 80, comments: 20, posts: 3, searches: 12, profileVisits: 15 },
    followBackRatio: 0.5,
    likeRatio: 0.6,
    commentRatio: 0.2,
    unfollowAfterDays: 5,
    sessionLength: { min: 15, max: 30 },
    sessionsPerDay: { min: 4, max: 7 },
  },
  'conservative': {
    name: 'Conservative Growth',
    description: 'Slow and safe — mimics very casual user behavior',
    dailyLimits: { follows: 15, likes: 40, comments: 8, posts: 1, searches: 6, profileVisits: 8 },
    followBackRatio: 0.3,
    likeRatio: 0.4,
    commentRatio: 0.1,
    unfollowAfterDays: 7,
    sessionLength: { min: 10, max: 20 },
    sessionsPerDay: { min: 2, max: 4 },
  },
  'thoughtleader': {
    name: 'Thought Leader',
    description: 'Quality over quantity — fewer follows, more high-value comments and posts',
    dailyLimits: { follows: 20, likes: 60, comments: 30, posts: 4, searches: 10, profileVisits: 20 },
    followBackRatio: 0.3,
    likeRatio: 0.5,
    commentRatio: 0.4,        // High comment ratio — build reputation through replies
    unfollowAfterDays: 7,
    sessionLength: { min: 15, max: 35 },
    sessionsPerDay: { min: 4, max: 8 },
  },
};

// ============================================================================
// Persona Class
// ============================================================================

/**
 * Create a new persona configuration
 */
function createPersona(options = {}) {
  const preset = NICHE_PRESETS[options.preset] || NICHE_PRESETS['custom'];
  const activityPattern = ACTIVITY_PATTERNS[options.activityPattern] || ACTIVITY_PATTERNS['always-on'];
  const strategy = ENGAGEMENT_STRATEGIES[options.strategy] || ENGAGEMENT_STRATEGIES['moderate'];

  const persona = {
    // Identity
    id: options.id || `persona_${Date.now()}`,
    name: options.name || preset.name,
    preset: options.preset || 'custom',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    // Niche & Topics
    niche: {
      topics: options.topics || [...preset.topics],
      searchTerms: options.searchTerms || [...preset.searchTerms],
      targetAccounts: options.targetAccounts || [...preset.targetAccounts],
      avoidTopics: options.avoidTopics || [],
      avoidAccounts: options.avoidAccounts || [],
    },

    // Voice & Writing Style
    voice: {
      tone: options.tone || preset.tone,
      commentStyle: options.commentStyle || preset.commentStyle,
      bioTemplate: options.bioTemplate || preset.bioTemplate,
      postTopics: options.postTopics || [...preset.postTopics],
      emojiUsage: options.emojiUsage ?? 'moderate',  // none, light, moderate, heavy
      hashtagUsage: options.hashtagUsage ?? 'light',  // none, light, moderate, heavy
      language: options.language || 'en',
      maxCommentLength: options.maxCommentLength || 200,
      maxPostLength: options.maxPostLength || 280,
    },

    // Activity Pattern
    activityPattern: {
      preset: options.activityPattern || 'always-on',
      ...activityPattern,
      timezone: options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },

    // Engagement Strategy
    strategy: {
      preset: options.strategy || 'moderate',
      ...strategy,
    },

    // LLM Configuration
    llm: {
      provider: 'openrouter',
      models: {
        comment: options.commentModel || DEFAULT_MODELS.comment,
        post: options.postModel || DEFAULT_MODELS.post,
        reply: options.replyModel || DEFAULT_MODELS.reply,
      },
      apiKey: options.apiKey || null,  // falls back to env OPENROUTER_API_KEY
      temperature: options.temperature ?? 0.85,
      systemPrompt: options.systemPrompt || null,  // auto-generated if null
    },

    // Growth Goals
    goals: {
      targetFollowers: options.targetFollowers || 10000,
      targetPostsPerDay: options.targetPostsPerDay || 3,
      targetEngagementRate: options.targetEngagementRate || 0.05,
      milestonesReached: [],
    },

    // Runtime State (updated by algorithmBuilder)
    state: {
      totalSessions: 0,
      totalFollows: 0,
      totalLikes: 0,
      totalComments: 0,
      totalPosts: 0,
      totalSearches: 0,
      totalProfileVisits: 0,
      totalUnfollows: 0,
      followedUsers: {},         // username → { followedAt, unfollowed }
      engagedPosts: new Set(),
      lastSessionAt: null,
      lastPostAt: null,
      currentFollowers: 0,
      followerHistory: [],       // [{ date, count }]
      errors: [],
    },
  };

  return persona;
}

// ============================================================================
// System Prompt Builder
// ============================================================================

/**
 * Build the LLM system prompt from persona config
 */
function buildPersonaSystemPrompt(persona) {
  if (persona.llm.systemPrompt) return persona.llm.systemPrompt;

  const topics = persona.niche.topics.join(', ');

  return `You are a Twitter/X user with a specific personality and expertise. Here is your identity:

NICHE & EXPERTISE:
- Topics you care about: ${topics}
- You are knowledgeable and passionate about these subjects.

WRITING STYLE:
- Tone: ${persona.voice.tone}
- Comment style: ${persona.voice.commentStyle}
- Emoji usage: ${persona.voice.emojiUsage}
- Hashtag usage: ${persona.voice.hashtagUsage}
- Language: ${persona.voice.language}

RULES:
- Write like a REAL person, not a bot. Be authentic, have opinions, show personality.
- Keep responses concise. Comments should be 1-3 sentences max.
- Posts should be ${persona.voice.maxPostLength} characters or less.
- Comments should be ${persona.voice.maxCommentLength} characters or less.
- Add genuine value — don't just say "great post!" or generic praise.
- Share your own perspective, ask thoughtful questions, or add a relevant insight.
- Vary your style — sometimes short and punchy, sometimes more detailed.
- Occasionally be contrarian (respectfully) or share a different angle.
- Use emojis naturally if your tone calls for it, but don't overdo it.
- Never mention that you are an AI, bot, or automated system.
- Never use corporate/marketing language unless your persona is a marketer.
- React to the SPECIFIC content of the tweet, not generically.

WHAT MAKES A GREAT COMMENT:
- Asks a specific follow-up question about the content
- Shares a related experience or data point
- Offers a different perspective or adds nuance
- Makes a relevant joke or observation
- Provides a useful resource or suggestion
- Connects the idea to something else in your niche`;
}

/**
 * Build a comment generation prompt for a specific tweet
 */
function buildCommentPrompt(persona, tweetText, tweetAuthor) {
  return `You're scrolling Twitter and you see this tweet from @${tweetAuthor}:

"${tweetText}"

Write a natural reply/comment. Remember your persona and expertise areas. Be specific to THIS tweet content. Keep it under ${persona.voice.maxCommentLength} characters.

Respond with ONLY the comment text, nothing else.`;
}

/**
 * Build a post generation prompt
 */
function buildPostPrompt(persona, context = {}) {
  const topicSuggestion = context.topic || persona.voice.postTopics[Math.floor(Math.random() * persona.voice.postTopics.length)];
  const style = context.style || ['take', 'story', 'tip', 'question', 'observation', 'thread-starter'][Math.floor(Math.random() * 6)];

  return `Write a tweet about: ${topicSuggestion}

Style: ${style}
- "take" = share an opinion or hot take
- "story" = share a brief personal experience or observation
- "tip" = share actionable advice
- "question" = ask an engaging question to spark discussion
- "observation" = share something interesting you noticed
- "thread-starter" = an intriguing hook that makes people want to read more

Keep it under ${persona.voice.maxPostLength} characters. Write ONLY the tweet text. No quotes, no labels.`;
}

/**
 * Build a reply prompt for a specific conversation
 */
function buildReplyPrompt(persona, originalTweet, replyTo) {
  return `You're in a conversation on Twitter.

Original tweet by @${originalTweet.author}: "${originalTweet.text}"
Reply from @${replyTo.author}: "${replyTo.text}"

Write your reply to @${replyTo.author}. Stay on topic, be natural, add value. Under ${persona.voice.maxCommentLength} characters.

Respond with ONLY the reply text.`;
}

// ============================================================================
// Persona Storage (filesystem-based)
// ============================================================================

/**
 * Ensure personas directory exists
 */
function ensureDir() {
  if (!existsSync(PERSONAS_DIR)) {
    mkdirSync(PERSONAS_DIR, { recursive: true });
  }
}

/**
 * Save persona to disk
 */
function savePersona(persona) {
  ensureDir();
  // Convert Sets to arrays for JSON serialization
  const serializable = {
    ...persona,
    state: {
      ...persona.state,
      engagedPosts: [...(persona.state.engagedPosts || [])],
    },
  };
  const filePath = join(PERSONAS_DIR, `${persona.id}.json`);
  writeFileSync(filePath, JSON.stringify(serializable, null, 2));
  return filePath;
}

/**
 * Load persona from disk
 */
function loadPersona(id) {
  const filePath = join(PERSONAS_DIR, `${id}.json`);
  if (!existsSync(filePath)) {
    throw new Error(`Persona not found: ${id}`);
  }
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  // Restore Set from array
  data.state.engagedPosts = new Set(data.state.engagedPosts || []);
  return data;
}

/**
 * List all saved personas
 */
function listPersonas() {
  ensureDir();
  const files = readdirSync(PERSONAS_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => {
    try {
      const data = JSON.parse(readFileSync(join(PERSONAS_DIR, f), 'utf-8'));
      return {
        id: data.id,
        name: data.name,
        preset: data.preset,
        strategy: data.strategy?.preset,
        totalSessions: data.state?.totalSessions || 0,
        totalFollows: data.state?.totalFollows || 0,
        totalLikes: data.state?.totalLikes || 0,
        totalComments: data.state?.totalComments || 0,
        currentFollowers: data.state?.currentFollowers || 0,
        createdAt: data.createdAt,
        lastSessionAt: data.state?.lastSessionAt,
      };
    } catch {
      return { id: f.replace('.json', ''), name: '(corrupted)', error: true };
    }
  });
}

/**
 * Delete a persona
 */
function deletePersona(id) {
  const filePath = join(PERSONAS_DIR, `${id}.json`);
  if (!existsSync(filePath)) {
    throw new Error(`Persona not found: ${id}`);
  }
  unlinkSync(filePath);
  return true;
}

// ============================================================================
// Activity Scheduler
// ============================================================================

/**
 * Determine if the persona should be active right now
 */
function shouldBeActive(persona) {
  const now = new Date();
  const hour = now.getHours();
  const pattern = persona.activityPattern;
  
  // Check if current hour is in active hours
  if (pattern.sleepHours.includes(hour)) return false;
  if (!pattern.activeHours.includes(hour)) return false;

  return true;
}

/**
 * Get the intensity multiplier for the current time
 * Peak hours = more activity, off-peak = less
 */
function getActivityIntensity(persona) {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  const pattern = persona.activityPattern;

  let intensity = 1.0;

  // Peak hours get higher intensity
  if (pattern.peakHours.includes(hour)) {
    intensity = 1.5;
  }

  // Weekend multiplier
  if ((dayOfWeek === 0 || dayOfWeek === 6) && pattern.weekendMultiplier) {
    intensity *= pattern.weekendMultiplier;
  }

  // Add randomness (±20%) to avoid machine-like patterns
  intensity *= 0.8 + Math.random() * 0.4;

  return Math.max(0.3, Math.min(3.0, intensity));
}

/**
 * Calculate how long the next session should be (in minutes)
 */
function getSessionDuration(persona) {
  const strategy = persona.strategy;
  const intensity = getActivityIntensity(persona);
  const baseMin = strategy.sessionLength.min;
  const baseMax = strategy.sessionLength.max;
  const duration = baseMin + Math.random() * (baseMax - baseMin);
  return Math.round(duration * intensity);
}

/**
 * Calculate delay until next session (in minutes)
 */
function getDelayUntilNextSession(persona) {
  const strategy = persona.strategy;
  const sessionsPerDay = strategy.sessionsPerDay.min + Math.random() * (strategy.sessionsPerDay.max - strategy.sessionsPerDay.min);
  const activeHoursCount = persona.activityPattern.activeHours.length;
  
  // Distribute sessions across active hours
  const avgGapMinutes = (activeHoursCount * 60) / sessionsPerDay;
  
  // Add randomness (±40%) for natural variation
  const gap = avgGapMinutes * (0.6 + Math.random() * 0.8);
  
  return Math.round(Math.max(10, gap)); // minimum 10 minutes between sessions
}

/**
 * Choose what actions to perform this session
 * Returns a shuffled activity plan
 */
function planSession(persona) {
  const strategy = persona.strategy;
  const intensity = getActivityIntensity(persona);
  const duration = getSessionDuration(persona);

  // Scale daily limits to per-session based on sessions per day
  const avgSessions = (strategy.sessionsPerDay.min + strategy.sessionsPerDay.max) / 2;
  const scale = (1 / avgSessions) * intensity;

  const plan = {
    duration,
    activities: [],
  };

  // Build activity list based on strategy ratios
  const numSearches = Math.ceil(strategy.dailyLimits.searches * scale);
  const numFollows = Math.ceil(strategy.dailyLimits.follows * scale);
  const numLikes = Math.ceil(strategy.dailyLimits.likes * scale);
  const numComments = Math.ceil(strategy.dailyLimits.comments * scale);
  const numProfileVisits = Math.ceil(strategy.dailyLimits.profileVisits * scale);

  // Always start with search/browse to seem natural
  for (let i = 0; i < numSearches; i++) {
    const term = persona.niche.searchTerms[Math.floor(Math.random() * persona.niche.searchTerms.length)];
    plan.activities.push({ type: 'search', term, tab: Math.random() > 0.5 ? 'top' : 'latest' });
  }

  // Scroll home timeline
  plan.activities.push({ type: 'browse_home' });

  // Like posts
  for (let i = 0; i < numLikes; i++) {
    plan.activities.push({ type: 'like' });
  }

  // Follow users
  for (let i = 0; i < numFollows; i++) {
    plan.activities.push({ type: 'follow' });
  }

  // Comment on posts (LLM-generated)
  for (let i = 0; i < numComments; i++) {
    plan.activities.push({ type: 'comment' });
  }

  // Visit target account profiles
  for (let i = 0; i < numProfileVisits; i++) {
    plan.activities.push({ type: 'profile_visit' });
  }

  // Sometimes create an original post (1 per ~3 sessions)
  if (Math.random() < (strategy.dailyLimits.posts / avgSessions)) {
    plan.activities.push({ type: 'create_post' });
  }

  // Visit own profile occasionally (10% chance)
  if (Math.random() < 0.1) {
    plan.activities.push({ type: 'check_own_profile' });
  }

  // Check notifications (20% chance)
  if (Math.random() < 0.2) {
    plan.activities.push({ type: 'check_notifications' });
  }

  // Shuffle middle activities (keep search at start for natural flow)
  const searches = plan.activities.filter(a => a.type === 'search');
  const rest = plan.activities.filter(a => a.type !== 'search');
  shuffleArray(rest);
  plan.activities = [...searches, ...rest];

  return plan;
}

// ============================================================================
// Helpers
// ============================================================================

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ============================================================================
// Exports
// ============================================================================

export {
  // Persona lifecycle
  createPersona,
  savePersona,
  loadPersona,
  listPersonas,
  deletePersona,

  // Prompt building
  buildPersonaSystemPrompt,
  buildCommentPrompt,
  buildPostPrompt,
  buildReplyPrompt,

  // Scheduling
  shouldBeActive,
  getActivityIntensity,
  getSessionDuration,
  getDelayUntilNextSession,
  planSession,

  // Presets
  NICHE_PRESETS,
  ACTIVITY_PATTERNS,
  ENGAGEMENT_STRATEGIES,
};
