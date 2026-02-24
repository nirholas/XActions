/**
 * XActions AI Tweet Generator
 * 
 * Uses OpenRouter to generate tweets in a user's voice.
 * Supports single tweets, threads, rewrites, weekly calendars, and replies.
 * 
 * The moat: scrape tweets → analyze voice → generate in their style.
 * Nobody else has this integrated with Twitter scraping.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { buildVoicePrompt } from './voiceAnalyzer.js';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_MODEL = 'google/gemini-flash-2.0';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ============================================================================
// OpenRouter Client
// ============================================================================

/**
 * Call OpenRouter API
 */
async function callOpenRouter(messages, options = {}) {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API key required. Set OPENROUTER_API_KEY env var or pass apiKey option.');
  }

  const model = options.model || DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.8;
  const maxTokens = options.maxTokens || 2000;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://xactions.app',
      'X-Title': 'XActions AI Tweet Writer',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  return {
    content,
    model: data.model || model,
    usage: data.usage || {},
  };
}

/**
 * Parse JSON from LLM response (handles markdown code blocks)
 */
function parseJSON(content) {
  // Try direct parse first
  try {
    return JSON.parse(content);
  } catch { /* continue */ }

  // Try extracting from markdown code block
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch { /* continue */ }
  }

  // Try extracting any JSON object/array
  const objMatch = content.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[1]);
    } catch { /* continue */ }
  }

  throw new Error('Failed to parse JSON from LLM response');
}

// ============================================================================
// Tweet Generation Functions
// ============================================================================

/**
 * Generate tweets matching a user's voice
 * 
 * @param {object} voiceProfile - VoiceProfile from analyzeVoice()
 * @param {object} options
 * @param {string} options.topic - Topic or prompt for the tweet
 * @param {string} [options.style] - Optional style override: 'hot-take', 'educational', 'personal', 'promotional'
 * @param {number} [options.count=3] - Number of variations to generate (1-5)
 * @param {string} [options.model] - OpenRouter model override
 * @param {string} [options.apiKey] - OpenRouter API key override
 * @returns {Promise<{ tweets: Array<{ text: string, estimatedEngagement: string, reasoning: string }>, model: string }>}
 */
export async function generateTweet(voiceProfile, options = {}) {
  const { topic, style, count = 3, model, apiKey } = options;

  if (!topic) throw new Error('topic is required');
  if (!voiceProfile) throw new Error('voiceProfile is required');

  const systemPrompt = buildVoicePrompt(voiceProfile);

  const userPrompt = `Generate ${Math.min(count, 5)} tweet variations about: "${topic}"
${style ? `\nStyle: ${style}` : ''}

Each tweet must:
- Be under 280 characters
- Match @${voiceProfile.username}'s voice exactly
- Be authentic and engaging

Respond with ONLY a JSON array:
[
  {
    "text": "the tweet text",
    "estimatedEngagement": "high" | "medium" | "low",
    "reasoning": "why this should perform well"
  }
]`;

  const result = await callOpenRouter([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { model, apiKey, temperature: 0.85 });

  const tweets = parseJSON(result.content);

  return {
    tweets: Array.isArray(tweets) ? tweets.slice(0, 5) : [tweets],
    model: result.model,
    usage: result.usage,
  };
}

/**
 * Generate a Twitter thread
 * 
 * @param {object} voiceProfile - VoiceProfile from analyzeVoice()
 * @param {object} options
 * @param {string} options.topic - Topic for the thread
 * @param {number} [options.length=5] - Number of tweets in thread (3-10)
 * @param {boolean} [options.hooks=true] - Whether to include a hook opener and CTA closer
 * @param {string} [options.model] - OpenRouter model override
 * @param {string} [options.apiKey] - OpenRouter API key override
 * @returns {Promise<{ thread: Array<{ position: number, text: string, purpose: string }>, model: string }>}
 */
export async function generateThread(voiceProfile, options = {}) {
  const { topic, length = 5, hooks = true, model, apiKey } = options;

  if (!topic) throw new Error('topic is required');

  const systemPrompt = buildVoicePrompt(voiceProfile);
  const threadLength = Math.min(Math.max(length, 3), 10);

  const userPrompt = `Write a ${threadLength}-tweet thread about: "${topic}"

Structure:
${hooks ? '1. Tweet 1: Attention-grabbing hook (create curiosity or state a bold claim)' : '1. Tweet 1: Introduction'}
2. Tweets 2-${threadLength - 1}: Main points (each tweet should stand alone but flow together)
${hooks ? `3. Tweet ${threadLength}: Call to action (ask for follow, retweet, or reply)` : `3. Tweet ${threadLength}: Conclusion`}

Rules:
- Each tweet MUST be under 280 characters
- Number each tweet (1/${threadLength}, 2/${threadLength}, etc.)
- Match @${voiceProfile.username}'s voice
- Make it engaging and valuable

Respond with ONLY a JSON array:
[
  {
    "position": 1,
    "text": "1/${threadLength} the tweet text",
    "purpose": "hook" | "point" | "example" | "cta"
  }
]`;

  const result = await callOpenRouter([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { model, apiKey, temperature: 0.8, maxTokens: 3000 });

  const thread = parseJSON(result.content);

  return {
    thread: Array.isArray(thread) ? thread : [thread],
    model: result.model,
    usage: result.usage,
  };
}

/**
 * Rewrite/improve an existing tweet
 * 
 * @param {object} voiceProfile - VoiceProfile from analyzeVoice()
 * @param {string} originalText - The original tweet to improve
 * @param {object} [options]
 * @param {string} [options.goal='more_engaging'] - 'more_engaging' | 'shorter' | 'add_hook' | 'more_casual' | 'more_formal' | 'add_cta'
 * @param {number} [options.count=3] - Number of variations
 * @param {string} [options.model] - OpenRouter model override
 * @param {string} [options.apiKey] - OpenRouter API key override
 * @returns {Promise<{ original: string, rewrites: Array<{ text: string, improvement: string }>, model: string }>}
 */
export async function rewriteTweet(voiceProfile, originalText, options = {}) {
  const { goal = 'more_engaging', count = 3, model, apiKey } = options;

  if (!originalText) throw new Error('originalText is required');

  const systemPrompt = buildVoicePrompt(voiceProfile);

  const goalInstructions = {
    'more_engaging': 'Make it more attention-grabbing and likely to get engagement (likes, replies, retweets)',
    'shorter': 'Make it more concise and punchy while keeping the core message',
    'add_hook': 'Add a strong opening hook that creates curiosity or controversy',
    'more_casual': 'Make it sound more casual, conversational, and relatable',
    'more_formal': 'Make it sound more professional and authoritative',
    'add_cta': 'Add a clear call-to-action that drives engagement',
  };

  const userPrompt = `Rewrite this tweet ${count} different ways:

Original: "${originalText}"

Goal: ${goalInstructions[goal] || goalInstructions['more_engaging']}

Rules:
- Keep under 280 characters
- Maintain @${voiceProfile.username}'s voice
- Each variation should be meaningfully different

Respond with ONLY a JSON array:
[
  {
    "text": "the rewritten tweet",
    "improvement": "what was changed and why"
  }
]`;

  const result = await callOpenRouter([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { model, apiKey, temperature: 0.85 });

  const rewrites = parseJSON(result.content);

  return {
    original: originalText,
    goal,
    rewrites: Array.isArray(rewrites) ? rewrites.slice(0, 5) : [rewrites],
    model: result.model,
    usage: result.usage,
  };
}

/**
 * Generate a week's content calendar
 * 
 * @param {object} voiceProfile - VoiceProfile from analyzeVoice()
 * @param {object} [options]
 * @param {string[]} [options.topics] - Topics to cover (auto-generated from pillars if not provided)
 * @param {number} [options.postsPerDay=2] - Posts per day (1-5)
 * @param {number} [options.days=7] - Number of days (1-14)
 * @param {string} [options.model] - OpenRouter model override
 * @param {string} [options.apiKey] - OpenRouter API key override
 * @returns {Promise<{ calendar: Array<{ day: string, slot: string, topic: string, text: string, type: string }>, model: string }>}
 */
export async function generateWeek(voiceProfile, options = {}) {
  const { topics, postsPerDay = 2, days = 7, model, apiKey } = options;

  const resolvedTopics = topics && topics.length > 0
    ? topics
    : voiceProfile.contentPillars.map(p => p.topic);

  const dayCount = Math.min(Math.max(days, 1), 14);
  const ppd = Math.min(Math.max(postsPerDay, 1), 5);
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const slots = ['morning', 'afternoon', 'evening'];

  const systemPrompt = buildVoicePrompt(voiceProfile);

  const userPrompt = `Create a ${dayCount}-day content calendar with ${ppd} tweets per day.

Topics to cover: ${resolvedTopics.join(', ')}

For each tweet provide:
- The day (${dayNames.slice(0, dayCount).join(', ')})
- Time slot (${slots.slice(0, ppd).join(', ')})
- The actual tweet text (under 280 chars)
- Type: "single", "thread-hook", "question", "hot-take", "value-bomb", "personal"

Mix up the types for variety. Create a good rhythm.
Match @${voiceProfile.username}'s voice.

Respond with ONLY a JSON array:
[
  {
    "day": "Monday",
    "slot": "morning",
    "topic": "the topic",
    "text": "the tweet text",
    "type": "single"
  }
]`;

  const result = await callOpenRouter([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { model, apiKey, temperature: 0.85, maxTokens: 4000 });

  const calendar = parseJSON(result.content);

  return {
    calendar: Array.isArray(calendar) ? calendar : [calendar],
    days: dayCount,
    postsPerDay: ppd,
    topics: resolvedTopics,
    model: result.model,
    usage: result.usage,
  };
}

/**
 * Generate a reply to someone else's tweet
 * 
 * @param {object} voiceProfile - VoiceProfile from analyzeVoice()
 * @param {string} originalTweet - The tweet to reply to
 * @param {object} [options]
 * @param {string} [options.tone] - 'agree', 'disagree', 'add-on', 'question', 'funny', 'supportive'
 * @param {number} [options.count=3] - Number of reply variations
 * @param {string} [options.model] - OpenRouter model override
 * @param {string} [options.apiKey] - OpenRouter API key override
 * @returns {Promise<{ originalTweet: string, replies: Array<{ text: string, tone: string, reasoning: string }>, model: string }>}
 */
export async function generateReply(voiceProfile, originalTweet, options = {}) {
  const { tone, count = 3, model, apiKey } = options;

  if (!originalTweet) throw new Error('originalTweet is required');

  const systemPrompt = buildVoicePrompt(voiceProfile);

  const userPrompt = `Generate ${Math.min(count, 5)} reply variations to this tweet:

"${originalTweet}"

${tone ? `Desired tone: ${tone}` : 'Choose the most natural tone for this reply.'}

Rules:
- Keep under 280 characters
- Sound natural, not generic
- Match @${voiceProfile.username}'s voice
- Be thoughtful, not spammy
- Add value to the conversation

Respond with ONLY a JSON array:
[
  {
    "text": "the reply text",
    "tone": "agree" | "disagree" | "add-on" | "question" | "funny" | "supportive",
    "reasoning": "why this reply works"
  }
]`;

  const result = await callOpenRouter([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { model, apiKey, temperature: 0.85 });

  const replies = parseJSON(result.content);

  return {
    originalTweet,
    replies: Array.isArray(replies) ? replies.slice(0, 5) : [replies],
    model: result.model,
    usage: result.usage,
  };
}

// ============================================================================
// Convenience: Competitor Analysis
// ============================================================================

/**
 * Analyze competitor's top-performing patterns and generate tweets for YOUR voice
 * The killer feature: scrape competitor → analyze what works → generate in YOUR voice
 * 
 * @param {object} myVoiceProfile - Your VoiceProfile
 * @param {object} competitorVoiceProfile - Competitor's VoiceProfile
 * @param {object} [options]
 * @param {number} [options.count=5] - Number of tweets to generate
 * @param {string} [options.model] - OpenRouter model override
 * @param {string} [options.apiKey] - OpenRouter API key override
 * @returns {Promise<{ insights: string, tweets: Array<{ text: string, inspiredBy: string }>, model: string }>}
 */
export async function analyzeCompetitorAndGenerate(myVoiceProfile, competitorVoiceProfile, options = {}) {
  const { count = 5, model, apiKey } = options;

  const myPrompt = buildVoicePrompt(myVoiceProfile);

  const competitorInsights = [];
  competitorInsights.push(`## Competitor Analysis: @${competitorVoiceProfile.username}`);
  
  if (competitorVoiceProfile.bestPerforming.commonTraits.length > 0) {
    competitorInsights.push(`\nWhat works for them:`);
    for (const trait of competitorVoiceProfile.bestPerforming.commonTraits) {
      competitorInsights.push(`- ${trait}`);
    }
  }

  if (competitorVoiceProfile.bestPerforming.examples.length > 0) {
    competitorInsights.push(`\nTheir top tweets:`);
    for (const ex of competitorVoiceProfile.bestPerforming.examples.slice(0, 3)) {
      competitorInsights.push(`"${ex.text}" (❤️${ex.likes})`);
    }
  }

  if (competitorVoiceProfile.contentPillars.length > 0) {
    competitorInsights.push(`\nTheir topics: ${competitorVoiceProfile.contentPillars.map(p => p.topic).join(', ')}`);
  }

  const userPrompt = `I want to learn from what works for @${competitorVoiceProfile.username} and create ${count} tweets in MY voice (@${myVoiceProfile.username}).

${competitorInsights.join('\n')}

Generate ${count} tweets that:
1. Are inspired by the competitor's successful patterns/topics
2. But written in @${myVoiceProfile.username}'s voice and style
3. Add my unique perspective — don't copy, be original
4. Under 280 characters each

Respond with ONLY a JSON object:
{
  "insights": "brief analysis of what works for the competitor",
  "tweets": [
    {
      "text": "the tweet",
      "inspiredBy": "what pattern/topic from the competitor inspired this"
    }
  ]
}`;

  const result = await callOpenRouter([
    { role: 'system', content: myPrompt },
    { role: 'user', content: userPrompt },
  ], { model, apiKey, temperature: 0.85, maxTokens: 3000 });

  const parsed = parseJSON(result.content);

  return {
    insights: parsed.insights || '',
    tweets: parsed.tweets || [],
    model: result.model,
    usage: result.usage,
  };
}

export default {
  generateTweet,
  generateThread,
  rewriteTweet,
  generateWeek,
  generateReply,
  analyzeCompetitorAndGenerate,
};
