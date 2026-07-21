// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions AI Module — Public API
 * 
 * Voice analysis + AI tweet generation.
 * The moat: scrape → analyze voice → generate in their style.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

export { analyzeVoice, summarizeVoiceProfile, buildVoicePrompt } from './voiceAnalyzer.js';
export {
  generateTweet,
  generateThread,
  rewriteTweet,
  generateWeek,
  generateReply,
  analyzeCompetitorAndGenerate,
} from './tweetGenerator.js';

// Content Optimizer (09-J)
export { suggestHashtags, optimizeTweet, predictPerformance, generateVariations, analyzeVoice as analyzeContentVoice } from './contentOptimizer.js';
