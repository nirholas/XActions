/**
 * XActions Sentiment Analysis Engine
 * 
 * Built-in rule-based analyzer (zero dependencies, works offline)
 * Optional LLM mode via OpenRouter API for nuanced analysis.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// AFINN-style Keyword Lexicon (compact, high-signal subset)
// Score range: -5 to +5
// ============================================================================

const LEXICON = {
  // Strong positive (+4/+5)
  'love': 4, 'amazing': 5, 'excellent': 5, 'incredible': 5, 'fantastic': 5,
  'brilliant': 5, 'outstanding': 5, 'perfect': 5, 'wonderful': 5, 'superb': 5,
  'awesome': 4, 'beautiful': 4, 'best': 4, 'extraordinary': 5, 'magnificent': 5,
  'phenomenal': 5, 'spectacular': 5, 'stellar': 4, 'masterpiece': 5,

  // Moderate positive (+2/+3)
  'good': 3, 'great': 3, 'nice': 2, 'happy': 3, 'glad': 2, 'helpful': 2,
  'impressive': 3, 'solid': 2, 'strong': 2, 'valuable': 3, 'cool': 2,
  'fun': 3, 'exciting': 3, 'enjoy': 3, 'like': 2, 'agree': 2, 'useful': 2,
  'clean': 2, 'smooth': 2, 'smart': 3, 'innovative': 3, 'powerful': 3,
  'reliable': 2, 'effective': 3, 'efficient': 2, 'elegant': 3, 'fast': 2,
  'easy': 2, 'convenient': 2, 'quality': 3, 'recommend': 3, 'support': 2,
  'win': 3, 'winning': 3, 'success': 3, 'successful': 3, 'progress': 2,
  'growth': 2, 'improvement': 2, 'upgrade': 2, 'bullish': 3, 'moon': 2,
  'rocket': 2, 'fire': 2, 'gem': 3, 'undervalued': 2, 'promising': 3,

  // Mild positive (+1)
  'ok': 1, 'okay': 1, 'fine': 1, 'decent': 1, 'fair': 1, 'alright': 1,
  'interesting': 1, 'hope': 1, 'thanks': 1, 'thank': 1,

  // Mild negative (-1)
  'meh': -1, 'boring': -1, 'slow': -1, 'mediocre': -1, 'overrated': -1,
  'underwhelming': -1, 'concerned': -1, 'doubt': -1, 'uncertain': -1,

  // Moderate negative (-2/-3)
  'bad': -3, 'poor': -3, 'weak': -2, 'ugly': -3, 'annoying': -2, 'broken': -3,
  'bug': -2, 'crash': -3, 'error': -2, 'fail': -3, 'failure': -3, 'hate': -3,
  'angry': -3, 'sad': -2, 'disappointed': -3, 'disappointing': -3, 'wrong': -2,
  'worst': -3, 'useless': -3, 'waste': -3, 'terrible': -3, 'awful': -3,
  'expensive': -2, 'overpriced': -2, 'slow': -2, 'laggy': -2, 'buggy': -3,
  'unreliable': -3, 'confusing': -2, 'complicated': -2, 'frustrating': -3,
  'bearish': -3, 'dump': -3, 'scam': -3, 'rug': -3, 'ponzi': -3, 'fraud': -3,
  'toxic': -3, 'manipulate': -3, 'manipulation': -3,

  // Strong negative (-4/-5)
  'horrible': -5, 'disgusting': -5, 'disastrous': -5, 'catastrophic': -5,
  'abysmal': -5, 'pathetic': -4, 'atrocious': -5, 'dreadful': -5,
  'nightmare': -4, 'devastated': -4, 'furious': -4, 'outraged': -4,
  'appalling': -5, 'deplorable': -5, 'despicable': -5, 'vile': -5,
};

// ============================================================================
// Negation words — flip sentiment of the next word
// ============================================================================

const NEGATORS = new Set([
  'not', "n't", 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere',
  'nor', 'cannot', "can't", "won't", "don't", "doesn't", "didn't",
  "isn't", "aren't", "wasn't", "weren't", "wouldn't", "shouldn't",
  "couldn't", "hasn't", "haven't", "hadn't", 'barely', 'hardly', 'scarcely',
]);

// ============================================================================
// Intensifiers — amplify next word's score
// ============================================================================

const INTENSIFIERS = {
  'very': 1.5, 'really': 1.5, 'extremely': 2.0, 'incredibly': 2.0,
  'absolutely': 2.0, 'totally': 1.5, 'completely': 1.5, 'super': 1.5,
  'highly': 1.5, 'so': 1.3, 'quite': 1.2, 'pretty': 1.2, 'rather': 1.1,
  'utterly': 2.0, 'insanely': 2.0,
};

// ============================================================================
// Emoji scoring
// ============================================================================

const EMOJI_SCORES = {
  // Positive
  '😀': 2, '😃': 2, '😄': 3, '😁': 3, '😆': 3, '😊': 2, '🥰': 4,
  '😍': 4, '🤩': 4, '😘': 3, '❤️': 4, '💕': 3, '💖': 3, '💗': 3,
  '👍': 2, '👏': 2, '🎉': 3, '🎊': 3, '🙌': 3, '✅': 2, '💪': 2,
  '🔥': 2, '⭐': 2, '🌟': 3, '✨': 2, '🚀': 3, '💎': 3, '🏆': 3,
  '👑': 3, '💯': 3, '🤝': 2, '🫡': 2, '😎': 2,
  // Negative
  '😢': -2, '😭': -3, '😡': -4, '🤬': -5, '😤': -3, '😞': -2,
  '😔': -2, '😩': -2, '😫': -2, '💀': -1, '👎': -2, '🤡': -2,
  '🗑️': -3, '❌': -2, '⚠️': -1, '😑': -1, '😐': 0, '🤮': -4,
  '💩': -3, '🙄': -2, '😒': -2,
};

// ============================================================================
// Tokenizer
// ============================================================================

/**
 * Tokenize text into words, preserving emojis
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];

  // Extract emojis
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  const emojis = text.match(emojiRegex) || [];

  // Lowercase and split words
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);

  return { words, emojis };
}

// ============================================================================
// Rule-based analyzer
// ============================================================================

/**
 * Analyze sentiment using rule-based AFINN-style scoring
 * @param {string} text - Text to analyze
 * @returns {{ score: number, label: string, confidence: number, keywords: string[] }}
 */
function analyzeRuleBased(text) {
  const { words, emojis } = tokenize(text);

  if (words.length === 0 && emojis.length === 0) {
    return { score: 0, label: 'neutral', confidence: 0, keywords: [] };
  }

  let totalScore = 0;
  let wordCount = 0;
  let scoredCount = 0;
  const keywords = [];
  let negated = false;
  let intensifier = 1.0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    wordCount++;

    // Check negation
    if (NEGATORS.has(word)) {
      negated = true;
      continue;
    }

    // Check intensifier
    if (INTENSIFIERS[word]) {
      intensifier = INTENSIFIERS[word];
      continue;
    }

    // Score word
    if (LEXICON[word] !== undefined) {
      let wordScore = LEXICON[word] * intensifier;
      if (negated) {
        wordScore *= -0.75; // Negation flips and slightly weakens
        keywords.push(`NOT ${word}`);
      } else {
        keywords.push(word);
      }
      totalScore += wordScore;
      scoredCount++;
    }

    // Reset modifiers
    negated = false;
    intensifier = 1.0;
  }

  // Score emojis
  for (const emoji of emojis) {
    if (EMOJI_SCORES[emoji] !== undefined) {
      totalScore += EMOJI_SCORES[emoji];
      scoredCount++;
      keywords.push(emoji);
    }
  }

  // Normalize score to -1..1 range
  const maxPossible = Math.max(scoredCount, 1) * 5;
  const normalizedScore = Math.max(-1, Math.min(1, totalScore / maxPossible));

  // Determine label
  let label;
  if (normalizedScore > 0.05) label = 'positive';
  else if (normalizedScore < -0.05) label = 'negative';
  else label = 'neutral';

  // Confidence: based on how many words were scored vs total
  const coverage = scoredCount / Math.max(wordCount + emojis.length, 1);
  const confidence = Math.min(1, coverage * 2); // Double coverage as rough confidence

  return {
    score: Math.round(normalizedScore * 1000) / 1000,
    label,
    confidence: Math.round(confidence * 1000) / 1000,
    keywords: [...new Set(keywords)].slice(0, 10),
  };
}

// ============================================================================
// LLM-based analyzer (OpenRouter)
// ============================================================================

/**
 * Analyze sentiment using an LLM via OpenRouter
 * @param {string} text - Text to analyze
 * @param {object} [options]
 * @param {string} [options.apiKey] - OpenRouter API key (or env OPENROUTER_API_KEY)
 * @param {string} [options.model] - Model to use (default: meta-llama/llama-3.1-8b-instruct:free)
 * @returns {Promise<{ score: number, label: string, confidence: number, keywords: string[] }>}
 */
async function analyzeLLM(text, options = {}) {
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API key required for LLM sentiment analysis. Set OPENROUTER_API_KEY env var or pass apiKey option.');
  }

  const model = options.model || 'meta-llama/llama-3.1-8b-instruct:free';

  const systemPrompt = `You are a sentiment analysis engine. Analyze the sentiment of the given text and respond with ONLY a JSON object (no markdown, no explanation):
{
  "score": <number from -1.0 to 1.0>,
  "label": "<positive|neutral|negative>",
  "confidence": <number from 0.0 to 1.0>,
  "keywords": [<up to 10 key sentiment-bearing words or phrases>]
}

Rules:
- score must be between -1.0 and 1.0
- label must be exactly "positive", "neutral", or "negative"
- confidence reflects how certain you are
- keywords are the words/phrases that most influenced the sentiment
- Consider sarcasm, irony, and context
- For tweets/social media, consider crypto/finance slang, internet culture`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://xactions.app',
      'X-Title': 'XActions Sentiment Analysis',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const result = JSON.parse(jsonMatch[0]);
    return {
      score: Math.max(-1, Math.min(1, Number(result.score) || 0)),
      label: ['positive', 'neutral', 'negative'].includes(result.label) ? result.label : 'neutral',
      confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0.5)),
      keywords: Array.isArray(result.keywords) ? result.keywords.slice(0, 10) : [],
    };
  } catch {
    // Fallback: run rule-based if LLM response is unparseable
    console.warn('⚠️ LLM response unparseable, falling back to rule-based analysis');
    return analyzeRuleBased(text);
  }
}

// ============================================================================
// Main public API
// ============================================================================

/**
 * Analyze sentiment of text
 * 
 * @param {string} text - Text to analyze
 * @param {object} [options]
 * @param {string} [options.mode] - 'rules' (default) or 'llm'
 * @param {string} [options.apiKey] - OpenRouter API key for LLM mode
 * @param {string} [options.model] - LLM model for LLM mode
 * @returns {Promise<{ score: number, label: string, confidence: number, keywords: string[] }>}
 */
export async function analyzeSentiment(text, options = {}) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { score: 0, label: 'neutral', confidence: 0, keywords: [] };
  }

  const mode = options.mode || 'rules';

  if (mode === 'llm') {
    return await analyzeLLM(text, options);
  }

  return analyzeRuleBased(text);
}

/**
 * Analyze sentiment of multiple texts (batch)
 * 
 * @param {string[]} texts - Array of texts to analyze
 * @param {object} [options] - Same options as analyzeSentiment
 * @returns {Promise<Array<{ text: string, score: number, label: string, confidence: number, keywords: string[] }>>}
 */
export async function analyzeBatch(texts, options = {}) {
  const results = [];
  for (const text of texts) {
    const result = await analyzeSentiment(text, options);
    results.push({ text: text.slice(0, 280), ...result });
  }
  return results;
}

/**
 * Compute aggregate statistics from batch results
 * 
 * @param {Array<{ score: number, label: string }>} results
 * @returns {{ average: number, median: number, distribution: { positive: number, neutral: number, negative: number }, trend: string }}
 */
export function aggregateResults(results) {
  if (!results || results.length === 0) {
    return {
      average: 0,
      median: 0,
      distribution: { positive: 0, neutral: 0, negative: 0 },
      trend: 'stable',
    };
  }

  const scores = results.map(r => r.score);
  const sorted = [...scores].sort((a, b) => a - b);

  const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  const distribution = {
    positive: results.filter(r => r.label === 'positive').length,
    neutral: results.filter(r => r.label === 'neutral').length,
    negative: results.filter(r => r.label === 'negative').length,
  };

  // Trend: compare first half vs second half
  let trend = 'stable';
  if (results.length >= 4) {
    const mid = Math.floor(results.length / 2);
    const firstHalf = scores.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
    const secondHalf = scores.slice(mid).reduce((s, v) => s + v, 0) / (scores.length - mid);
    const diff = secondHalf - firstHalf;
    if (diff > 0.1) trend = 'improving';
    else if (diff < -0.1) trend = 'declining';
  }

  return {
    average: Math.round(average * 1000) / 1000,
    median: Math.round(median * 1000) / 1000,
    distribution,
    trend,
  };
}

export default {
  analyzeSentiment,
  analyzeBatch,
  aggregateResults,
};
