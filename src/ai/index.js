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
