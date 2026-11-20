// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions - The Complete X/Twitter Automation Toolkit
 * 
 * "Don't Panic." - The Hitchhiker's Guide to the Galaxy
 * 
 * Features:
 * - Scrapers: Profile, followers, following, tweets, threads, media
 * - MCP Server: AI agent integration for Claude, GPT, etc.
 * - CLI: Command-line interface for all operations
 * - Browser Scripts: Copy-paste scripts for X.com console
 * - SaaS API: Self-hosted automation platform
 * - Managers: Puppeteer-based automation modules
 * 
 * No Twitter API required - saves $100-$5000+/month!
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license Apache-2.0
 * @towel Always know where yours is
 */

// ============================================================================
// Scrapers (Puppeteer-based)
// ============================================================================

export * from './scrapers/index.js';
import scrapers from './scrapers/index.js';
export { scrapers };

// ============================================================================
// Programmatic Client (HTTP-only, no Puppeteer)
// ============================================================================

export { Scraper, SearchMode, Tweet, Profile, ScraperError } from './client/index.js';
export {
  Message,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  TwitterApiError,
  GRAPHQL_ENDPOINTS,
  BEARER_TOKEN,
  DEFAULT_FEATURES,
  buildGraphQLUrl,
} from './client/index.js';

// ============================================================================
// AI: prompt-driven comment generator
// ============================================================================

export { createCommentGenerator, sanitizeComment, isGenericComment } from './ai/commentGenerator.js';

// ============================================================================
// AI: post reputation / risk scorer
// ============================================================================

export { scorePost, scorePosts, summarizeReport, scoreToGrade, DIMENSIONS } from './ai/reputationScorer.js';

// ============================================================================
// Cookie Import (painless login)
// ============================================================================
// Parse cookie exports (Netscape cookies.txt, Cookie-Editor / EditThisCookie
// JSON, Playwright / Puppeteer storageState, or a raw header string) and read
// x.com cookies straight out of a locally installed browser.

export {
  parseCookieInput,
  detectCookieFormat,
  readBrowserCookies,
  SUPPORTED_BROWSERS,
} from './client/auth/cookieImport.js';

// ============================================================================
// Plugin System
// ============================================================================

import plugins from './plugins/index.js';
export { plugins };
export {
  initializePlugins,
  installPlugin,
  removePlugin,
  listPlugins,
  getPluginTools,
  getPluginScrapers,
  getPluginRoutes,
  getPluginActions,
} from './plugins/index.js';

// ============================================================================
// Managers & Tools (Puppeteer-based ES modules)
// ============================================================================

export { default as articlePublisher } from './articlePublisher.js';
export { default as bookmarkManager } from './bookmarkManager.js';
export { default as businessTools } from './businessTools.js';
export { default as creatorStudio } from './creatorStudio.js';
export { default as discoveryExplore } from './discoveryExplore.js';
export { default as dmManager } from './dmManager.js';
export { default as engagementManager } from './engagementManager.js';
export { default as grokIntegration } from './grokIntegration.js';
export { default as notificationManager } from './notificationManager.js';
export {
  verifyWebhookSignature,
  signWebhookBody,
  deliverWebhook,
  replayDelivery as replayWebhookDelivery,
  listDeliveries as listWebhookDeliveries,
} from './notifications/webhook.js';
export { default as pollCreator } from './pollCreator.js';
export { default as postComposer } from './postComposer.js';
export { default as premiumManager } from './premiumManager.js';
export { default as profileManager } from './profileManager.js';
export { default as settingsManager } from './settingsManager.js';
export { default as spacesManager } from './spacesManager.js';

// ============================================================================
// Browser Script Catalog (IIFE scripts — paste in x.com console)
// ============================================================================

/**
 * Catalog of all browser console scripts.
 * These are IIFEs meant to be pasted into x.com Developer Console.
 * Use: `import { browserScripts } from 'xactions'` to get script metadata.
 * `file` is the script's path in the GitHub repository (browser/); the scripts
 * themselves are not part of the npm package, since they never run in Node.
 */
export const browserScripts = {
  // --- Unfollow Management ---
  unfollowEveryone: { file: 'browser/unfollowEveryone.js', description: 'Unfollow all accounts you follow' },
  unfollowback: { file: 'browser/unfollowback.js', description: 'Unfollow users who don\'t follow you back' },
  unfollowWDFBLog: { file: 'browser/unfollowWDFBLog.js', description: 'Unfollow non-followers with detailed logging' },

  // --- Content Cleanup ---
  unlikeAllPosts: { file: 'browser/unlikeAllPosts.js', description: 'Unlike all your liked posts' },
  clearAllReposts: { file: 'browser/clearAllReposts.js', description: 'Remove all your retweets' },
  clearAllBookmarks: { file: 'browser/clearAllBookmarks.js', description: 'Clear all bookmarks' },

  // --- Blocking & Muting ---
  massBlock: { file: 'browser/massBlock.js', description: 'Block a list of usernames' },
  massUnblock: { file: 'browser/massUnblock.js', description: 'Unblock all blocked accounts' },
  massUnmute: { file: 'browser/massUnmute.js', description: 'Unmute all muted accounts' },
  muteByKeywords: { file: 'browser/muteByKeywords.js', description: 'Mute users posting specific keywords' },
  manageMutedWords: { file: 'browser/manageMutedWords.js', description: 'Bulk-add muted words/phrases' },
  blockBots: { file: 'browser/blockBots.js', description: 'Detect and block bot accounts' },
  reportSpam: { file: 'browser/reportSpam.js', description: 'Report accounts for spam/abuse' },

  // --- Follower Monitoring ---
  detectUnfollowers: { file: 'browser/detectUnfollowers.js', description: 'Detect who unfollowed you' },
  newFollowersAlert: { file: 'browser/newFollowersAlert.js', description: 'Monitor for new followers' },
  continuousMonitor: { file: 'browser/continuousMonitor.js', description: 'Continuous follower monitoring' },
  monitorAccount: { file: 'browser/monitorAccount.js', description: 'Monitor account stats over time' },
  auditFollowers: { file: 'browser/auditFollowers.js', description: 'Audit follower quality (legit/suspicious/fake)' },
  removeFollowers: { file: 'browser/removeFollowers.js', description: 'Remove specific followers via soft-block' },

  // --- Analytics & Insights ---
  engagementAnalytics: { file: 'browser/engagementAnalytics.js', description: 'Analyze engagement metrics' },
  bestTimeToPost: { file: 'browser/bestTimeToPost.js', description: 'Find optimal posting times' },
  hashtagAnalytics: { file: 'browser/hashtagAnalytics.js', description: 'Analyze hashtag performance' },
  competitorAnalysis: { file: 'browser/competitorAnalysis.js', description: 'Compare account metrics' },
  sentimentAnalyzer: { file: 'browser/sentimentAnalyzer.js', description: 'Lexicon-based sentiment analysis on any timeline' },
  tweetPerformance: { file: 'browser/tweetPerformance.js', description: 'Compare tweet performance side by side with rankings' },
  viralTweetDetector: { file: 'browser/viralTweetDetector.js', description: 'Detect viral tweets by velocity and multi-factor scoring' },
  tweetScheduleOptimizer: { file: 'browser/tweetScheduleOptimizer.js', description: 'Personalized optimal posting schedule from historical data' },
  audienceDemographics: { file: 'browser/audienceDemographics.js', description: 'Analyze follower demographics, niches, and bot likelihood' },
  followerGrowthTracker: { file: 'browser/followerGrowthTracker.js', description: 'Track follower count over time with growth projections' },
  contentCalendar: { file: 'browser/contentCalendar.js', description: 'Posting frequency heatmap, gap analysis, and content queue' },
  engagementLeaderboard: { file: 'browser/engagementLeaderboard.js', description: 'Rank top engagers, identify superfans, VIP list export' },
  tweetABTester: { file: 'browser/tweetABTester.js', description: 'A/B test tweet variations with statistical comparison' },
  followRatioManager: { file: 'browser/followRatioManager.js', description: 'Monitor follow ratio with letter grades, plans, and history' },
  audienceOverlap: { file: 'browser/audienceOverlap.js', description: 'Compare follower lists between two accounts for overlap analysis' },

  // --- Content Posting ---
  postThread: { file: 'browser/postThread.js', description: 'Post multi-tweet threads' },
  schedulePosts: { file: 'browser/schedulePosts.js', description: 'Schedule future posts' },
  createPoll: { file: 'browser/createPoll.js', description: 'Create poll tweets' },
  autoRepost: { file: 'browser/autoRepost.js', description: 'Auto-retweet by keyword/user filters' },
  threadComposer: { file: 'browser/threadComposer.js', description: 'Compose, preview, and publish threads with draft persistence' },
  quoteTweetAutomation: { file: 'browser/quoteTweetAutomation.js', description: 'Auto quote-tweet with customizable templates and filters' },
  contentRepurposer: { file: 'browser/contentRepurposer.js', description: 'Repurpose tweets into threads, storms, blog outlines, and quote templates' },
  autoPlugReplies: { file: 'browser/autoPlugReplies.js', description: 'Auto-reply to own viral tweets with promotional plugs' },

  // --- Tweet Management ---
  bulkDeleteTweets: { file: 'browser/bulkDeleteTweets.js', description: 'Bulk delete tweets with keyword/date/engagement filters' },
  pinTweetManager: { file: 'browser/pinTweetManager.js', description: 'Pin/unpin tweets and find best tweet to pin' },

  // --- Messaging & Engagement ---
  sendDirectMessage: { file: 'browser/sendDirectMessage.js', description: 'Send personalized DMs' },
  welcomeNewFollowers: { file: 'browser/welcomeNewFollowers.js', description: 'Detect new followers and send welcome DMs' },
  engagementBooster: { file: 'browser/engagementBooster.js', description: 'Systematically like/reply to target account tweets' },
  autoReply: { file: 'browser/autoReply.js', description: 'Auto-reply to tweets matching keyword filters' },

  // --- Community & Lists ---
  joinCommunities: { file: 'browser/joinCommunities.js', description: 'Join communities by keyword' },
  leaveAllCommunities: { file: 'browser/leaveAllCommunities.js', description: 'Leave all joined communities' },
  listManager: { file: 'browser/listManager.js', description: 'Create and manage X Lists' },

  // --- Profile & Account ---
  updateProfile: { file: 'browser/updateProfile.js', description: 'Update bio, name, location, website' },
  backupAccount: { file: 'browser/backupAccount.js', description: 'Export account data as JSON' },
  downloadAccountData: { file: 'browser/downloadAccountData.js', description: 'Trigger official X data archive' },
  qrCodeSharing: { file: 'browser/qrCodeSharing.js', description: 'Generate QR code for profiles' },
  shadowbanChecker: { file: 'browser/shadowbanChecker.js', description: 'Multi-method shadowban detection with scoring' },
  accountHealthMonitor: { file: 'browser/accountHealthMonitor.js', description: 'Comprehensive account health scoring and diagnostics' },

  // --- Bookmarks ---
  bookmarkOrganizer: { file: 'browser/bookmarkOrganizer.js', description: 'Categorize bookmarks by keywords' },

  // --- Spaces ---
  scrapeSpaces: { file: 'browser/scrapeSpaces.js', description: 'Find live/scheduled X Spaces' },

  // --- Discovery & Monitoring ---
  trendingTopicMonitor: { file: 'browser/trendingTopicMonitor.js', description: 'Real-time trending topic monitoring with niche classification' },
  keywordMonitor: { file: 'browser/keywordMonitor.js', description: 'Monitor keyword mentions across X search with alerts and sentiment' },
};

/**
 * Quick start example:
 * 
 * ```javascript
 * // Puppeteer scrapers
 * import { createBrowser, createPage, scrapeProfile, scrapeFollowers } from 'xactions';
 * 
 * const browser = await createBrowser();
 * const page = await createPage(browser);
 * const profile = await scrapeProfile(page, 'elonmusk');
 * const followers = await scrapeFollowers(page, 'elonmusk', { limit: 100 });
 * await browser.close();
 * 
 * // Puppeteer managers
 * import { dmManager, profileManager, engagementManager } from 'xactions';
 * 
 * // Browser scripts catalog
 * import { browserScripts } from 'xactions';
 * console.log(Object.keys(browserScripts)); // List all browser scripts
 * ```
 */

