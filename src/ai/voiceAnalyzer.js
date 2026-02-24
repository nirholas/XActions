/**
 * XActions Voice Analyzer
 * 
 * Analyzes a user's writing style from their tweets to build a VoiceProfile.
 * The killer feature: scrape tweets → analyze voice → generate in their style.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// Stop Words (filtered from vocabulary analysis)
// ============================================================================

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which',
  'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just',
  'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good',
  'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now',
  'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
  'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well',
  'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give',
  'day', 'most', 'us', 'is', 'are', 'was', 'were', 'been', 'has',
  'had', 'did', 'am', 'does', 'doing', 'did', 'rt', 'via', 'http',
  'https', 'www', 'com', 'co',
]);

// ============================================================================
// Emoji regex
// ============================================================================

const EMOJI_REGEX = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

// ============================================================================
// Topic Keywords (for content pillar clustering)
// ============================================================================

const TOPIC_CLUSTERS = {
  'tech': ['ai', 'ml', 'api', 'code', 'dev', 'software', 'app', 'tech', 'programming', 'developer', 'javascript', 'python', 'react', 'node', 'web3', 'blockchain', 'cloud', 'data', 'startup', 'saas', 'product', 'engineer', 'deploy', 'ship', 'build', 'debug', 'git', 'open-source', 'opensource'],
  'crypto': ['bitcoin', 'btc', 'eth', 'ethereum', 'crypto', 'defi', 'nft', 'token', 'wallet', 'chain', 'sol', 'solana', 'web3', 'degen', 'airdrop', 'mint', 'stake', 'yield', 'dao', 'protocol', 'onchain'],
  'finance': ['stock', 'market', 'invest', 'trading', 'portfolio', 'roi', 'revenue', 'profit', 'growth', 'funding', 'vc', 'valuation', 'ipo', 'earnings', 'bull', 'bear', 'hedge'],
  'marketing': ['brand', 'marketing', 'growth', 'audience', 'content', 'creator', 'viral', 'engagement', 'followers', 'reach', 'impressions', 'ctr', 'conversion', 'funnel', 'seo'],
  'personal': ['life', 'family', 'health', 'fitness', 'mindset', 'motivation', 'gratitude', 'morning', 'routine', 'habit', 'book', 'reading', 'learn', 'journey', 'lesson', 'story'],
  'politics': ['election', 'vote', 'government', 'policy', 'democrat', 'republican', 'congress', 'senate', 'president', 'law', 'rights', 'freedom', 'democracy'],
  'entertainment': ['movie', 'music', 'game', 'show', 'series', 'film', 'album', 'song', 'concert', 'sport', 'team', 'player', 'season', 'win', 'championship'],
  'design': ['design', 'ui', 'ux', 'figma', 'pixel', 'typography', 'color', 'layout', 'visual', 'brand', 'logo', 'creative', 'aesthetic'],
  'career': ['job', 'career', 'hire', 'hiring', 'resume', 'interview', 'salary', 'remote', 'freelance', 'promotion', 'manager', 'leadership', 'team'],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract clean text from a tweet (remove URLs, @mentions for analysis)
 */
function cleanTweetText(text) {
  if (!text) return '';
  return text
    .replace(/https?:\/\/\S+/g, '')     // remove URLs
    .replace(/@\w+/g, '')                // remove @mentions  
    .replace(/\n+/g, ' ')               // normalize newlines
    .trim();
}

/**
 * Tokenize text into lowercase words
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s#-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

/**
 * Extract n-grams (bigrams/trigrams) from words
 */
function extractNGrams(words, n = 2) {
  const ngrams = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  return ngrams;
}

/**
 * Get engagement score for a tweet
 */
function getEngagement(tweet) {
  const likes = Number(tweet.likes || tweet.likeCount || 0);
  const retweets = Number(tweet.retweets || tweet.retweetCount || tweet.reposts || 0);
  const replies = Number(tweet.replies || tweet.replyCount || 0);
  const views = Number(tweet.views || tweet.viewCount || 0);
  // Weighted engagement: replies worth most, then retweets, then likes
  return (replies * 3) + (retweets * 2) + likes + (views * 0.001);
}

// ============================================================================
// Voice Analysis Functions
// ============================================================================

/**
 * Analyze style metrics from tweets
 */
function analyzeStyle(tweets) {
  const lengths = [];
  let emojiCount = 0;
  let hashtagCount = 0;
  let questionCount = 0;
  let threadCount = 0;
  let urlCount = 0;
  let mentionCount = 0;

  for (const tweet of tweets) {
    const text = tweet.text || tweet.fullText || tweet.content || '';
    lengths.push(text.length);

    // Emoji usage
    const emojis = text.match(EMOJI_REGEX) || [];
    emojiCount += emojis.length;

    // Hashtags
    const hashtags = text.match(/#\w+/g) || [];
    hashtagCount += hashtags.length;

    // Questions
    if (text.includes('?')) questionCount++;

    // Threads (heuristic: numbered tweets like "1/", "🧵", or "Thread:")
    if (/(\d+\/\d+|🧵|thread:|a thread)/i.test(text)) threadCount++;

    // URLs
    if (/https?:\/\/\S+/.test(text)) urlCount++;

    // Mentions
    const mentions = text.match(/@\w+/g) || [];
    mentionCount += mentions.length;
  }

  const count = tweets.length || 1;
  const avgLength = lengths.reduce((a, b) => a + b, 0) / count;

  return {
    avgLength: Math.round(avgLength),
    medianLength: lengths.sort((a, b) => a - b)[Math.floor(lengths.length / 2)] || 0,
    emojiRate: Math.round((emojiCount / count) * 100) / 100,
    hashtagRate: Math.round((hashtagCount / count) * 100) / 100,
    questionRate: Math.round((questionCount / count) * 100) / 100,
    threadRate: Math.round((threadCount / count) * 100) / 100,
    urlRate: Math.round((urlCount / count) * 100) / 100,
    mentionRate: Math.round((mentionCount / count) * 100) / 100,
  };
}

/**
 * Analyze tone dimensions from tweets
 */
function analyzeTone(tweets) {
  let formalSignals = 0;
  let casualSignals = 0;
  let humorSignals = 0;
  let seriousSignals = 0;
  let controversySignals = 0;
  let technicalSignals = 0;
  let totalSignals = 0;

  const formalWords = new Set(['therefore', 'however', 'furthermore', 'consequently', 'regarding', 'nonetheless', 'moreover', 'hereby', 'pursuant', 'accordingly']);
  const casualWords = new Set(['lol', 'lmao', 'bruh', 'ngl', 'tbh', 'fr', 'imo', 'lowkey', 'highkey', 'vibes', 'vibe', 'bro', 'dude', 'haha', 'omg', 'btw', 'idk', 'smh', 'fwiw', 'icymi', 'ong', 'nah', 'yeah', 'yep', 'gonna', 'wanna', 'gotta']);
  const humorWords = new Set(['lol', 'lmao', 'haha', 'joke', 'funny', 'hilarious', 'rofl', '😂', '🤣', 'comedy', 'meme', 'clown', '💀', 'dead', 'crying']);
  const controversyWords = new Set(['unpopular', 'hot take', 'controversial', 'disagree', 'wrong', 'overrated', 'underrated', 'debate', 'fight', 'ratio', 'cope', 'cringe']);
  const technicalWords = new Set(['api', 'algorithm', 'framework', 'architecture', 'implementation', 'infrastructure', 'deployment', 'scalable', 'optimization', 'latency', 'throughput', 'benchmark', 'regression', 'dependency']);

  for (const tweet of tweets) {
    const text = (tweet.text || tweet.fullText || tweet.content || '').toLowerCase();
    const words = text.split(/\s+/);

    for (const word of words) {
      const clean = word.replace(/[^a-z]/g, '');
      if (formalWords.has(clean)) formalSignals++;
      if (casualWords.has(clean)) casualSignals++;
      if (humorWords.has(clean)) humorSignals++;
      if (controversyWords.has(clean)) controversySignals++;
      if (technicalWords.has(clean)) technicalSignals++;
      totalSignals++;
    }

    // Sentence structure signals
    if (/[.;:]$/.test(text.trim())) formalSignals++;
    if (/[!]{2,}/.test(text)) casualSignals++;
    if (/[A-Z]{3,}/.test(tweet.text || '')) casualSignals++; // ALL CAPS
    if (/\b(data|research|study|paper|analysis)\b/i.test(text)) seriousSignals++;
    if (/😂|🤣|💀|lmao|lol/i.test(text)) humorSignals++;
  }

  const count = tweets.length || 1;
  const norm = (val) => Math.min(1, Math.round(val * 100) / 100);

  // Compute 0-1 scales
  const formality = norm((formalSignals - casualSignals + count) / (count * 2));
  const humor = norm(humorSignals / count);
  const controversy = norm(controversySignals / (count * 0.3));
  const technicality = norm((technicalSignals + seriousSignals) / (count * 0.5));

  return {
    formality: Math.max(0, formality),
    humor: Math.max(0, humor),
    controversy: Math.max(0, controversy),
    technicality: Math.max(0, technicality),
  };
}

/**
 * Extract vocabulary patterns from tweets
 */
function analyzeVocabulary(tweets) {
  const wordFreq = {};
  const phraseFreq = {};
  const starterFreq = {};

  for (const tweet of tweets) {
    const text = cleanTweetText(tweet.text || tweet.fullText || tweet.content || '');
    const words = tokenize(text);

    // Word frequency (excluding stop words)
    for (const word of words) {
      if (!STOP_WORDS.has(word) && word.length > 2) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }

    // Bigram phrases
    const bigrams = extractNGrams(words.filter(w => !STOP_WORDS.has(w) && w.length > 2), 2);
    for (const phrase of bigrams) {
      phraseFreq[phrase] = (phraseFreq[phrase] || 0) + 1;
    }

    // Sentence starters (first 2-3 words of tweet)
    const rawWords = text.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
    if (rawWords.length > 3) {
      starterFreq[rawWords] = (starterFreq[rawWords] || 0) + 1;
    }
  }

  // Sort and take top results
  const sortByFreq = (obj, limit = 20) =>
    Object.entries(obj)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([word, count]) => ({ word, count }));

  return {
    topWords: sortByFreq(wordFreq, 30),
    topPhrases: sortByFreq(phraseFreq, 15).filter(p => p.count > 1),
    sentenceStarters: sortByFreq(starterFreq, 10).filter(s => s.count > 1),
  };
}

/**
 * Identify content pillars (top topics the user tweets about)
 */
function analyzeContentPillars(tweets) {
  const topicScores = {};
  const topicEngagement = {};
  const topicCounts = {};

  for (const topic of Object.keys(TOPIC_CLUSTERS)) {
    topicScores[topic] = 0;
    topicEngagement[topic] = [];
    topicCounts[topic] = 0;
  }

  for (const tweet of tweets) {
    const text = (tweet.text || tweet.fullText || tweet.content || '').toLowerCase();
    const engagement = getEngagement(tweet);

    for (const [topic, keywords] of Object.entries(TOPIC_CLUSTERS)) {
      let matches = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword)) matches++;
      }
      if (matches > 0) {
        topicScores[topic] += matches;
        topicEngagement[topic].push(engagement);
        topicCounts[topic]++;
      }
    }
  }

  // Build pillars sorted by frequency
  const pillars = Object.entries(topicScores)
    .filter(([, score]) => score > 0)
    .map(([topic, score]) => ({
      topic,
      frequency: Math.round((topicCounts[topic] / (tweets.length || 1)) * 100) / 100,
      matchScore: score,
      tweetCount: topicCounts[topic],
      avgEngagement: topicEngagement[topic].length > 0
        ? Math.round(topicEngagement[topic].reduce((a, b) => a + b, 0) / topicEngagement[topic].length)
        : 0,
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);

  return pillars;
}

/**
 * Identify best-performing tweet patterns
 */
function analyzeBestPerforming(tweets) {
  if (tweets.length === 0) return { commonTraits: [], examples: [] };

  // Sort by engagement
  const sorted = [...tweets]
    .map(t => ({ ...t, _engagement: getEngagement(t) }))
    .sort((a, b) => b._engagement - a._engagement);

  // Top 20% or at least 5 tweets
  const topCount = Math.max(5, Math.ceil(tweets.length * 0.2));
  const topTweets = sorted.slice(0, topCount);

  // Analyze common traits of top performers
  const traits = [];
  const topStyle = analyzeStyle(topTweets);
  const avgStyle = analyzeStyle(tweets);

  if (topStyle.emojiRate > avgStyle.emojiRate * 1.3) traits.push('Uses more emojis than average');
  if (topStyle.emojiRate < avgStyle.emojiRate * 0.7) traits.push('Uses fewer emojis than average');
  if (topStyle.questionRate > avgStyle.questionRate * 1.3) traits.push('Asks questions more often');
  if (topStyle.hashtagRate > avgStyle.hashtagRate * 1.3) traits.push('Uses more hashtags');
  if (topStyle.avgLength > avgStyle.avgLength * 1.2) traits.push('Longer than average tweets');
  if (topStyle.avgLength < avgStyle.avgLength * 0.8) traits.push('Shorter, punchier tweets');
  if (topStyle.urlRate > avgStyle.urlRate * 1.3) traits.push('Includes links more often');
  if (topStyle.threadRate > avgStyle.threadRate * 1.5) traits.push('Threads perform well');

  // Check for patterns in top tweets
  const hasNumbers = topTweets.filter(t => /\d/.test(t.text || t.fullText || t.content || '')).length;
  if (hasNumbers / topCount > 0.5) traits.push('Includes numbers/stats');

  const hasLists = topTweets.filter(t => /(\n[-•]|\d\.\s)/.test(t.text || t.fullText || t.content || '')).length;
  if (hasLists / topCount > 0.3) traits.push('Uses list format');

  // Extract example tweets (top 5)
  const examples = topTweets.slice(0, 5).map(t => ({
    text: (t.text || t.fullText || t.content || '').slice(0, 280),
    engagement: t._engagement,
    likes: Number(t.likes || t.likeCount || 0),
    retweets: Number(t.retweets || t.retweetCount || t.reposts || 0),
    replies: Number(t.replies || t.replyCount || 0),
  }));

  return { commonTraits: traits, examples };
}

// ============================================================================
// Main Public API
// ============================================================================

/**
 * Analyze a user's voice/writing style from their tweets
 * 
 * @param {string} username - Twitter username
 * @param {Array<object>} tweets - Array of tweet objects from scraper
 * @param {object} [options]
 * @param {number} [options.minTweets=20] - Minimum tweets for reliable analysis
 * @returns {object} VoiceProfile
 */
export function analyzeVoice(username, tweets, options = {}) {
  const { minTweets = 20 } = options;

  // Filter out retweets for style analysis (keep for engagement analysis)
  const originalTweets = tweets.filter(t => {
    const text = t.text || t.fullText || t.content || '';
    return !text.startsWith('RT @');
  });

  if (originalTweets.length < minTweets) {
    console.warn(`⚠️ Only ${originalTweets.length} original tweets found. Analysis may be less accurate with < ${minTweets} tweets.`);
  }

  const style = analyzeStyle(originalTweets);
  const tone = analyzeTone(originalTweets);
  const vocabulary = analyzeVocabulary(originalTweets);
  const contentPillars = analyzeContentPillars(originalTweets);
  const bestPerforming = analyzeBestPerforming(originalTweets);

  return {
    username: username.replace(/^@/, ''),
    tweetCount: originalTweets.length,
    totalTweetsAnalyzed: tweets.length,
    analyzedAt: new Date().toISOString(),
    style,
    tone,
    vocabulary,
    contentPillars,
    bestPerforming,
  };
}

/**
 * Generate a human-readable summary of a voice profile
 * 
 * @param {object} profile - VoiceProfile object
 * @returns {string} Human-readable summary
 */
export function summarizeVoiceProfile(profile) {
  const lines = [];
  lines.push(`📊 Voice Profile: @${profile.username}`);
  lines.push(`   Analyzed ${profile.tweetCount} original tweets\n`);

  // Style
  lines.push(`✍️ Writing Style:`);
  lines.push(`   • Avg tweet length: ${profile.style.avgLength} chars`);
  lines.push(`   • Emoji usage: ${profile.style.emojiRate}/tweet`);
  lines.push(`   • Hashtag usage: ${profile.style.hashtagRate}/tweet`);
  lines.push(`   • Question rate: ${Math.round(profile.style.questionRate * 100)}%`);
  lines.push(`   • Thread rate: ${Math.round(profile.style.threadRate * 100)}%`);

  // Tone
  lines.push(`\n🎭 Tone:`);
  const toneBar = (val) => '█'.repeat(Math.round(val * 10)) + '░'.repeat(10 - Math.round(val * 10));
  lines.push(`   Formality:    ${toneBar(profile.tone.formality)} ${Math.round(profile.tone.formality * 100)}%`);
  lines.push(`   Humor:        ${toneBar(profile.tone.humor)} ${Math.round(profile.tone.humor * 100)}%`);
  lines.push(`   Controversy:  ${toneBar(profile.tone.controversy)} ${Math.round(profile.tone.controversy * 100)}%`);
  lines.push(`   Technicality: ${toneBar(profile.tone.technicality)} ${Math.round(profile.tone.technicality * 100)}%`);

  // Vocabulary
  if (profile.vocabulary.topWords.length > 0) {
    lines.push(`\n📝 Top Words: ${profile.vocabulary.topWords.slice(0, 10).map(w => w.word).join(', ')}`);
  }
  if (profile.vocabulary.topPhrases.length > 0) {
    lines.push(`📝 Top Phrases: ${profile.vocabulary.topPhrases.slice(0, 5).map(p => p.word).join(', ')}`);
  }

  // Content Pillars
  if (profile.contentPillars.length > 0) {
    lines.push(`\n📌 Content Pillars:`);
    for (const pillar of profile.contentPillars) {
      lines.push(`   • ${pillar.topic}: ${Math.round(pillar.frequency * 100)}% of tweets (avg engagement: ${pillar.avgEngagement})`);
    }
  }

  // Best Performing
  if (profile.bestPerforming.commonTraits.length > 0) {
    lines.push(`\n🏆 Best Performing Traits:`);
    for (const trait of profile.bestPerforming.commonTraits) {
      lines.push(`   • ${trait}`);
    }
  }

  return lines.join('\n');
}

/**
 * Build a system prompt from a voice profile for LLM tweet generation
 * 
 * @param {object} profile - VoiceProfile object
 * @returns {string} System prompt for LLM
 */
export function buildVoicePrompt(profile) {
  const parts = [];

  parts.push(`You are a ghostwriter for @${profile.username} on X/Twitter.`);
  parts.push(`Your job is to write tweets that match their exact voice, style, and personality.`);
  parts.push('');

  // Style guidelines
  parts.push('## Writing Style');
  parts.push(`- Average tweet length: ~${profile.style.avgLength} characters`);
  parts.push(`- Emoji usage: ${profile.style.emojiRate > 0.5 ? 'Frequent' : profile.style.emojiRate > 0.1 ? 'Occasional' : 'Rare'} (${profile.style.emojiRate}/tweet)`);
  parts.push(`- Hashtag usage: ${profile.style.hashtagRate > 0.5 ? 'Frequent' : profile.style.hashtagRate > 0.1 ? 'Occasional' : 'Rare'} (${profile.style.hashtagRate}/tweet)`);
  parts.push(`- Questions: ${profile.style.questionRate > 0.2 ? 'Often asks questions' : 'Rarely asks questions'}`);
  parts.push(`- Threads: ${profile.style.threadRate > 0.1 ? 'Sometimes writes threads' : 'Prefers single tweets'}`);
  parts.push(`- Links: ${profile.style.urlRate > 0.3 ? 'Often includes links' : 'Rarely includes links'}`);
  parts.push('');

  // Tone
  parts.push('## Tone');
  const toneLevels = (val) => val > 0.7 ? 'Very' : val > 0.4 ? 'Moderately' : val > 0.15 ? 'Slightly' : 'Not';
  parts.push(`- Formality: ${toneLevels(profile.tone.formality)} formal`);
  parts.push(`- Humor: ${toneLevels(profile.tone.humor)} humorous`);
  parts.push(`- Controversy: ${toneLevels(profile.tone.controversy)} provocative`);
  parts.push(`- Technicality: ${toneLevels(profile.tone.technicality)} technical`);
  parts.push('');

  // Vocabulary
  if (profile.vocabulary.topWords.length > 0) {
    parts.push('## Frequently Used Words');
    parts.push(profile.vocabulary.topWords.slice(0, 15).map(w => w.word).join(', '));
    parts.push('');
  }

  if (profile.vocabulary.topPhrases.length > 0) {
    parts.push('## Common Phrases');
    parts.push(profile.vocabulary.topPhrases.slice(0, 10).map(p => p.word).join(', '));
    parts.push('');
  }

  if (profile.vocabulary.sentenceStarters.length > 0) {
    parts.push('## Sentence Starters They Use');
    parts.push(profile.vocabulary.sentenceStarters.slice(0, 8).map(s => `"${s.word}..."`).join(', '));
    parts.push('');
  }

  // Content pillars
  if (profile.contentPillars.length > 0) {
    parts.push('## Topics They Tweet About');
    for (const p of profile.contentPillars) {
      parts.push(`- ${p.topic} (${Math.round(p.frequency * 100)}% of tweets)`);
    }
    parts.push('');
  }

  // Best performing traits
  if (profile.bestPerforming.commonTraits.length > 0) {
    parts.push('## What Gets High Engagement');
    for (const trait of profile.bestPerforming.commonTraits) {
      parts.push(`- ${trait}`);
    }
    parts.push('');
  }

  // Example tweets
  if (profile.bestPerforming.examples.length > 0) {
    parts.push('## Example Tweets (highest engagement)');
    for (const ex of profile.bestPerforming.examples) {
      parts.push(`"${ex.text}" (❤️${ex.likes} 🔁${ex.retweets} 💬${ex.replies})`);
    }
    parts.push('');
  }

  parts.push('## Rules');
  parts.push('- Match their voice EXACTLY — do not sound generic');
  parts.push('- Keep tweets under 280 characters unless writing a thread');
  parts.push('- Use their vocabulary and sentence patterns');
  parts.push('- Match their emoji and hashtag frequency');
  parts.push('- Write content that fits their topic pillars');
  parts.push('- Prioritize patterns that correlate with high engagement');

  return parts.join('\n');
}

export default {
  analyzeVoice,
  summarizeVoiceProfile,
  buildVoicePrompt,
};
