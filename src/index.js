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
 * @license MIT
 * @towel Always know where yours is
 */

// ============================================================================
// Scrapers (Puppeteer-based)
// ============================================================================

export * from './scrapers/index.js';
import scrapers from './scrapers/index.js';
export { scrapers };

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
 */
export const browserScripts = {
  // --- Unfollow Management ---
  unfollowEveryone: { file: 'src/unfollowEveryone.js', description: 'Unfollow all accounts you follow' },
  unfollowback: { file: 'src/unfollowback.js', description: 'Unfollow users who don\'t follow you back' },
  unfollowWDFBLog: { file: 'src/unfollowWDFBLog.js', description: 'Unfollow non-followers with detailed logging' },

  // --- Content Cleanup ---
  unlikeAllPosts: { file: 'src/unlikeAllPosts.js', description: 'Unlike all your liked posts' },
  clearAllReposts: { file: 'src/clearAllReposts.js', description: 'Remove all your retweets' },
  clearAllBookmarks: { file: 'src/clearAllBookmarks.js', description: 'Clear all bookmarks' },

  // --- Blocking & Muting ---
  massBlock: { file: 'src/massBlock.js', description: 'Block a list of usernames' },
  massUnblock: { file: 'src/massUnblock.js', description: 'Unblock all blocked accounts' },
  massUnmute: { file: 'src/massUnmute.js', description: 'Unmute all muted accounts' },
  muteByKeywords: { file: 'src/muteByKeywords.js', description: 'Mute users posting specific keywords' },
  manageMutedWords: { file: 'src/manageMutedWords.js', description: 'Bulk-add muted words/phrases' },
  blockBots: { file: 'src/blockBots.js', description: 'Detect and block bot accounts' },
  reportSpam: { file: 'src/reportSpam.js', description: 'Report accounts for spam/abuse' },

  // --- Follower Monitoring ---
  detectUnfollowers: { file: 'src/detectUnfollowers.js', description: 'Detect who unfollowed you' },
  newFollowersAlert: { file: 'src/newFollowersAlert.js', description: 'Monitor for new followers' },
  continuousMonitor: { file: 'src/continuousMonitor.js', description: 'Continuous follower monitoring' },
  monitorAccount: { file: 'src/monitorAccount.js', description: 'Monitor account stats over time' },
  auditFollowers: { file: 'src/auditFollowers.js', description: 'Audit follower quality (legit/suspicious/fake)' },
  removeFollowers: { file: 'src/removeFollowers.js', description: 'Remove specific followers via soft-block' },

  // --- Analytics & Insights ---
  engagementAnalytics: { file: 'src/engagementAnalytics.js', description: 'Analyze engagement metrics' },
  bestTimeToPost: { file: 'src/bestTimeToPost.js', description: 'Find optimal posting times' },
  hashtagAnalytics: { file: 'src/hashtagAnalytics.js', description: 'Analyze hashtag performance' },
  competitorAnalysis: { file: 'src/competitorAnalysis.js', description: 'Compare account metrics' },

  // --- Content Posting ---
  postThread: { file: 'src/postThread.js', description: 'Post multi-tweet threads' },
  schedulePosts: { file: 'src/schedulePosts.js', description: 'Schedule future posts' },
  createPoll: { file: 'src/createPoll.js', description: 'Create poll tweets' },
  autoRepost: { file: 'src/autoRepost.js', description: 'Auto-retweet by keyword/user filters' },

  // --- Messaging & Engagement ---
  sendDirectMessage: { file: 'src/sendDirectMessage.js', description: 'Send personalized DMs' },

  // --- Community & Lists ---
  joinCommunities: { file: 'src/joinCommunities.js', description: 'Join communities by keyword' },
  leaveAllCommunities: { file: 'src/leaveAllCommunities.js', description: 'Leave all joined communities' },
  listManager: { file: 'src/listManager.js', description: 'Create and manage X Lists' },

  // --- Profile & Account ---
  updateProfile: { file: 'src/updateProfile.js', description: 'Update bio, name, location, website' },
  backupAccount: { file: 'src/backupAccount.js', description: 'Export account data as JSON' },
  downloadAccountData: { file: 'src/downloadAccountData.js', description: 'Trigger official X data archive' },
  qrCodeSharing: { file: 'src/qrCodeSharing.js', description: 'Generate QR code for profiles' },

  // --- Bookmarks ---
  bookmarkOrganizer: { file: 'src/bookmarkOrganizer.js', description: 'Categorize bookmarks by keywords' },

  // --- Spaces ---
  scrapeSpaces: { file: 'src/scrapeSpaces.js', description: 'Find live/scheduled X Spaces' },
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

