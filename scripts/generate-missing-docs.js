#!/usr/bin/env node
/**
 * Generate Missing Documentation
 * Creates docs/examples/*.md for all undocumented browser scripts
 * by nichxbt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const DOCS_DIR = path.join(ROOT, 'docs', 'examples');

// ── Helpers ──────────────────────────────────────────────────

function camelToSlug(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function slugToTitle(slug) {
  const titleMap = {
    'account-health-monitor': 'Account Health Monitor',
    'algorithm-builder': 'Algorithm Builder',
    'article-publisher': 'Article Publisher',
    'audience-demographics': 'Audience Demographics',
    'audience-overlap': 'Audience Overlap',
    'auto-plug-replies': 'Auto-Plug Replies',
    'auto-reply': 'Auto-Reply',
    'bookmark-manager': 'Bookmark Manager',
    'bulk-delete-tweets': 'Bulk Delete Tweets',
    'business-tools': 'Business Tools',
    'content-calendar': 'Content Calendar',
    'content-repurposer': 'Content Repurposer',
    'continuous-monitor': 'Continuous Monitor',
    'creator-studio': 'Creator Studio',
    'dm-manager': 'DM Manager',
    'engagement-booster': 'Engagement Booster',
    'engagement-leaderboard': 'Engagement Leaderboard',
    'engagement-manager': 'Engagement Manager',
    'follow-ratio-manager': 'Follow Ratio Manager',
    'follower-growth-tracker': 'Follower Growth Tracker',
    'grok-integration': 'Grok AI Integration',
    'keyword-monitor': 'Keyword Monitor',
    'manage-muted-words': 'Manage Muted Words',
    'mass-block': 'Mass Block',
    'mass-unblock': 'Mass Unblock',
    'mute-by-keywords': 'Mute by Keywords',
    'new-followers-alert': 'New Followers Alert',
    'notification-manager': 'Notification Manager',
    'persona-engine': 'Persona Engine',
    'pin-tweet-manager': 'Pin Tweet Manager',
    'poll-creator': 'Poll Creator',
    'post-composer': 'Post Composer',
    'premium-manager': 'Premium Manager',
    'profile-manager': 'Profile Manager',
    'quote-tweet-automation': 'Quote Tweet Automation',
    'sentiment-analyzer': 'Sentiment Analyzer',
    'settings-manager': 'Settings Manager',
    'shadowban-checker': 'Shadowban Checker',
    'spaces-manager': 'Spaces Manager',
    'thread-composer': 'Thread Composer',
    'trending-topic-monitor': 'Trending Topic Monitor',
    'tweet-ab-tester': 'Tweet A/B Tester',
    'tweet-performance': 'Tweet Performance',
    'tweet-schedule-optimizer': 'Tweet Schedule Optimizer',
    'unfollow-wdfb-log': 'Unfollow Non-Followers with Logging',
    'viral-tweet-detector': 'Viral Tweet Detector',
    'welcome-new-followers': 'Welcome New Followers',
    // scripts-only
    'scrape-profile-with-replies': 'Scrape Profile with Replies',
    'scrape-analytics': 'Scrape Analytics',
    'scrape-bookmarks': 'Scrape Bookmarks',
    'scrape-cashtag-search': 'Scrape Cashtag Search',
    'scrape-dms': 'Scrape DMs',
    'scrape-explore': 'Scrape Explore',
    'scrape-followers': 'Scrape Followers',
    'scrape-following': 'Scrape Following',
    'scrape-hashtag': 'Scrape Hashtag',
    'scrape-likers': 'Scrape Likers',
    'scrape-likes': 'Scrape Likes',
    'scrape-list': 'Scrape List Members',
    'scrape-media': 'Scrape Media',
    'scrape-notifications': 'Scrape Notifications',
    'scrape-profile': 'Scrape Profile',
    'scrape-quote-retweets': 'Scrape Quote Retweets',
    'scrape-replies': 'Scrape Replies',
    'scrape-search': 'Scrape Search Results',
    'export-to-csv': 'Export to CSV',
    'dm-exporter': 'DM Exporter',
    'manage-bookmarks': 'Manage Bookmarks',
    'manage-lists': 'Manage Lists',
    'manage-notifications': 'Manage Notifications',
    'manage-settings': 'Manage Settings',
    'publish-article': 'Publish Article',
    'edit-profile': 'Edit Profile',
    'business-analytics': 'Business Analytics',
    'keyword-liker': 'Keyword Liker',
    'multi-account-timeline-liker': 'Multi-Account Timeline Liker',
    'tweet-price-correlation': 'Tweet Price Correlation',
    'thought-leader-cultivator': 'Thought Leader Cultivator',
    'viral-tweets-scraper': 'Viral Tweets Scraper',
    'auto-engage': 'Auto-Engage',
    'premium-features': 'Premium Features',
    // automation framework
    'automation-actions': 'Automation Actions Library',
    'automation-algorithm-builder': 'Automation Algorithm Builder',
    'automation-algorithm-trainer': 'Automation Algorithm Trainer',
    'automation-auto-commenter': 'Automation Auto-Commenter',
    'automation-auto-liker': 'Automation Auto-Liker',
    'automation-control-panel': 'Automation Control Panel',
    'automation-customer-service': 'Automation Customer Service Bot',
    'automation-evergreen-recycler': 'Evergreen Content Recycler',
    'automation-follow-target-users': 'Automation Follow Target Users',
    'automation-protect-active-users': 'Protect Active Users',
    'automation-quota-supervisor': 'Rate Limit & Quota Supervisor',
    'automation-rss-monitor': 'RSS Monitor & Auto-Tweet',
    'automation-session-logger': 'Session Logger',
    'automation-smart-unfollow': 'Automation Smart Unfollow',
  };
  return titleMap[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Category + icon + page info for each script
const SCRIPT_META = {
  // ── src/ scripts missing docs ──
  'account-health-monitor': { cat: 'Analytics', icon: '🏥', page: 'x.com/YOUR_USERNAME', desc: 'Comprehensive health check for your X/Twitter account. Generates a composite health score (0-100) across engagement, growth, content quality, and risk factors.', srcFile: 'src/accountHealthMonitor.js' },
  'algorithm-builder': { cat: 'Growth', icon: '🧠', page: 'x.com (any page)', desc: 'Automated account growth engine that trains the X algorithm for your niche. Likes, follows, engages, and browses to shape your For You feed over time.', srcFile: 'src/algorithmBuilder.js' },
  'article-publisher': { cat: 'Posting', icon: '📰', page: 'x.com/compose/article', desc: 'Publish long-form articles on X/Twitter (requires Premium+ subscription). Automates article creation, formatting, and publishing.', srcFile: 'src/articlePublisher.js' },
  'audience-demographics': { cat: 'Analytics', icon: '📊', page: 'x.com/YOUR_USERNAME/followers', desc: 'Analyze your follower demographics including bio keywords, locations, account age, and interests. Exports a demographic report.', srcFile: 'src/audienceDemographics.js' },
  'audience-overlap': { cat: 'Analytics', icon: '🔗', page: 'x.com (any profile)', desc: 'Compare the follower lists of two accounts to find audience overlap. Useful for finding collab partners and competitor analysis.', srcFile: 'src/audienceOverlap.js' },
  'auto-plug-replies': { cat: 'Engagement', icon: '🔌', page: 'x.com/search or timeline', desc: 'Automatically reply to viral tweets with your own content plug or CTA. Targets high-engagement tweets in your niche.', srcFile: 'src/autoPlugReplies.js' },
  'auto-reply': { cat: 'Engagement', icon: '💬', page: 'x.com/search or timeline', desc: 'Auto-reply to tweets matching your filters. Configure keywords, users, and reply templates for automated engagement.', srcFile: 'src/autoReply.js' },
  'bookmark-manager': { cat: 'Bookmarks', icon: '📚', page: 'x.com/i/bookmarks', desc: 'Full bookmark management: save, remove, organize, export, and search through your bookmarked tweets.', srcFile: 'src/bookmarkManager.js' },
  'bulk-delete-tweets': { cat: 'Content Cleanup', icon: '🗑️', page: 'x.com/YOUR_USERNAME', desc: 'Mass delete your tweets by age, keyword, engagement threshold, or date range. Keeps your profile clean.', srcFile: 'src/bulkDeleteTweets.js' },
  'business-tools': { cat: 'Business', icon: '💼', page: 'x.com (any page)', desc: 'Brand monitoring, competitor analysis, and audience insights for business accounts. Tracks mentions, sentiment, and share of voice.', srcFile: 'src/businessTools.js' },
  'content-calendar': { cat: 'Posting', icon: '📅', page: 'x.com (any page)', desc: 'Plan and visualize your posting schedule. Identifies content gaps, optimal posting times, and helps maintain consistency.', srcFile: 'src/contentCalendar.js' },
  'content-repurposer': { cat: 'Posting', icon: '♻️', page: 'x.com/YOUR_USERNAME', desc: 'Transform your existing content: turn single tweets into threads, threads into singles, add hooks, rewrite for different audiences.', srcFile: 'src/contentRepurposer.js' },
  'continuous-monitor': { cat: 'Monitoring', icon: '🔄', page: 'x.com/YOUR_USERNAME/followers', desc: 'Auto-refresh monitoring for follower/following changes. Runs continuously and alerts you to any changes in real-time.', srcFile: 'src/continuousMonitor.js' },
  'creator-studio': { cat: 'Business', icon: '🎨', page: 'x.com/settings/monetization', desc: 'Creator analytics dashboard: track subscriptions, tips, Super Follows revenue, and audience growth metrics.', srcFile: 'src/creatorStudio.js' },
  'dm-manager': { cat: 'Messaging', icon: '✉️', page: 'x.com/messages', desc: 'Full DM management: send messages, export conversations, manage message requests, and bulk operations.', srcFile: 'src/dmManager.js' },
  'engagement-booster': { cat: 'Engagement', icon: '🚀', page: 'x.com (target profile)', desc: 'Systematically engage with target accounts by liking, bookmarking, and retweeting their content to build relationships.', srcFile: 'src/engagementBooster.js' },
  'engagement-leaderboard': { cat: 'Analytics', icon: '🏆', page: 'x.com/YOUR_USERNAME', desc: 'Analyze who engages most with your tweets. Ranks your top supporters by likes, replies, retweets, and total interactions.', srcFile: 'src/engagementLeaderboard.js' },
  'engagement-manager': { cat: 'Engagement', icon: '⚡', page: 'x.com (any page)', desc: 'All-in-one engagement toolkit: like, unlike, reply, bookmark, and manage interactions from a single interface.', srcFile: 'src/engagementManager.js' },
  'follow-ratio-manager': { cat: 'Growth', icon: '⚖️', page: 'x.com/YOUR_USERNAME', desc: 'Monitor and optimize your follower/following ratio. Suggests accounts to unfollow to maintain a healthy ratio.', srcFile: 'src/followRatioManager.js' },
  'follower-growth-tracker': { cat: 'Analytics', icon: '📈', page: 'x.com/YOUR_USERNAME', desc: 'Track your follower count over time. Creates snapshots and shows growth rate, daily changes, and trend direction.', srcFile: 'src/followerGrowthTracker.js' },
  'grok-integration': { cat: 'AI', icon: '🧠', page: 'x.com/i/grok', desc: 'Interact with X\'s built-in Grok AI assistant programmatically. Send prompts, collect responses, and automate AI-powered analysis.', srcFile: 'src/grokIntegration.js' },
  'keyword-monitor': { cat: 'Monitoring', icon: '🔑', page: 'x.com/search', desc: 'Monitor search results and timelines for specific keyword mentions. Alerts you when target keywords appear in new tweets.', srcFile: 'src/keywordMonitor.js' },
  'manage-muted-words': { cat: 'Safety', icon: '🔇', page: 'x.com/settings/muted_keywords', desc: 'Bulk add, remove, and manage muted words and phrases. Filter out unwanted content from your timeline.', srcFile: 'src/manageMutedWords.js' },
  'mass-block': { cat: 'Safety', icon: '🚫', page: 'x.com (any page)', desc: 'Block multiple accounts at once from a list or timeline. Protect your account from spam, bots, and unwanted interactions.', srcFile: 'src/massBlock.js' },
  'mass-unblock': { cat: 'Safety', icon: '🔓', page: 'x.com/settings/blocked', desc: 'Unblock all or selected users from your block list. Clean up old blocks in bulk.', srcFile: 'src/massUnblock.js' },
  'mute-by-keywords': { cat: 'Safety', icon: '🔕', page: 'x.com (any page)', desc: 'Mute users whose posts contain specific keywords. Automatically filters noisy accounts from your timeline.', srcFile: 'src/muteByKeywords.js' },
  'notification-manager': { cat: 'Notifications', icon: '🔔', page: 'x.com/notifications', desc: 'Scrape, filter, and manage your notifications. Export notification history and set up custom filters.', srcFile: 'src/notificationManager.js' },
  'persona-engine': { cat: 'Growth', icon: '🎭', page: 'x.com (any page)', desc: 'Define and manage persona configurations for the algorithm builder. Create niche-specific engagement profiles.', srcFile: 'src/personaEngine.js' },
  'pin-tweet-manager': { cat: 'Posting', icon: '📌', page: 'x.com/YOUR_USERNAME', desc: 'Pin and unpin tweets programmatically. Auto-rotate your pinned tweet based on performance or schedule.', srcFile: 'src/pinTweetManager.js' },
  'poll-creator': { cat: 'Posting', icon: '📊', page: 'x.com/compose/post', desc: 'Create and manage poll tweets. Configure options, duration, and track poll results programmatically.', srcFile: 'src/pollCreator.js' },
  'post-composer': { cat: 'Posting', icon: '✏️', page: 'x.com/compose/post', desc: 'Full content creation suite: compose tweets, threads, polls, and articles with templates and scheduling.', srcFile: 'src/postComposer.js' },
  'premium-manager': { cat: 'Premium', icon: '⭐', page: 'x.com/settings/premium', desc: 'Check your Premium subscription tier and available features. Manage Premium-specific settings and capabilities.', srcFile: 'src/premiumManager.js' },
  'profile-manager': { cat: 'Account', icon: '👤', page: 'x.com/settings/profile', desc: 'Full profile management: update name, bio, avatar, header image, location, website, and verification settings.', srcFile: 'src/profileManager.js' },
  'quote-tweet-automation': { cat: 'Engagement', icon: '🔁', page: 'x.com/search or timeline', desc: 'Auto-retweet with quote-tweet templates. Add your commentary to trending content automatically.', srcFile: 'src/quoteTweetAutomation.js' },
  'sentiment-analyzer': { cat: 'Analytics', icon: '🧠', page: 'x.com (any timeline)', desc: 'Analyze tweet sentiment (positive/negative/neutral) using lexicon-based scoring. Shows trends, toxicity flags, and emotional distribution.', srcFile: 'src/sentimentAnalyzer.js' },
  'settings-manager': { cat: 'Account', icon: '⚙️', page: 'x.com/settings', desc: 'Manage account security, privacy, and preference settings. Bulk-update notification, display, and privacy options.', srcFile: 'src/settingsManager.js' },
  'shadowban-checker': { cat: 'Analytics', icon: '👻', page: 'x.com/YOUR_USERNAME', desc: 'Check if your account is shadowbanned. Tests search visibility, reply visibility, and ghost ban status.', srcFile: 'src/shadowbanChecker.js' },
  'spaces-manager': { cat: 'Spaces', icon: '🎙️', page: 'x.com/i/spaces', desc: 'Manage Twitter Spaces: find, join, schedule, and monitor live audio rooms and events.', srcFile: 'src/spacesManager.js' },
  'thread-composer': { cat: 'Posting', icon: '🧵', page: 'x.com/compose/post', desc: 'Compose and publish multi-tweet threads with draft support, character counting, and preview.', srcFile: 'src/threadComposer.js' },
  'trending-topic-monitor': { cat: 'Monitoring', icon: '📈', page: 'x.com/explore', desc: 'Monitor trending topics in real-time. Track topic velocity, tweet volume, and sentiment for any trend.', srcFile: 'src/trendingTopicMonitor.js' },
  'tweet-ab-tester': { cat: 'Analytics', icon: '🧪', page: 'x.com/YOUR_USERNAME', desc: 'A/B test tweet variations and track which performs best. Compare engagement rates across different wording, hashtags, and posting times.', srcFile: 'src/tweetABTester.js' },
  'tweet-performance': { cat: 'Analytics', icon: '📊', page: 'x.com/YOUR_USERNAME', desc: 'Compare your recent tweets side-by-side. Analyze engagement rates, impressions, and identify content patterns that work.', srcFile: 'src/tweetPerformance.js' },
  'tweet-schedule-optimizer': { cat: 'Analytics', icon: '⏰', page: 'x.com/YOUR_USERNAME', desc: 'Analyze your posting history to find optimal posting times. Shows engagement by day of week and hour.', srcFile: 'src/tweetScheduleOptimizer.js' },
  'unfollow-wdfb-log': { cat: 'Unfollow', icon: '📋', page: 'x.com/YOUR_USERNAME/following', desc: 'Unfollow non-followers with comprehensive logging. Exports a detailed report of who was unfollowed and why.', srcFile: 'src/unfollowWDFBLog.js' },
  'viral-tweet-detector': { cat: 'Analytics', icon: '🔥', page: 'x.com (any timeline)', desc: 'Scan your timeline to identify viral tweets. Detects high-engagement content based on likes, retweets, and reply ratios.', srcFile: 'src/viralTweetDetector.js' },
  'welcome-new-followers': { cat: 'Engagement', icon: '👋', page: 'x.com/YOUR_USERNAME/followers', desc: 'Auto-send welcome DMs to new followers. Customizable templates with personalization tokens.', srcFile: 'src/welcomeNewFollowers.js' },

  // ── scripts/-only (not in src/) ──
  'scrape-profile-with-replies': { cat: 'Scrapers', icon: '👤', page: 'x.com/USERNAME/with_replies', desc: 'Scrape a profile\'s tweets AND replies. Exports full conversation history including quoted tweets.', srcFile: 'scripts/scrape-profile-with-replies.js' },
  'scrape-analytics': { cat: 'Scrapers', icon: '📊', page: 'x.com/YOUR_USERNAME', desc: 'Scrape your account and post analytics. Extracts impressions, engagement rates, and audience data.', srcFile: 'scripts/scrapeAnalytics.js' },
  'scrape-bookmarks': { cat: 'Scrapers', icon: '🔖', page: 'x.com/i/bookmarks', desc: 'Scrape all your bookmarked tweets. Exports bookmarks with full metadata to JSON/CSV.', srcFile: 'scripts/scrapeBookmarks.js' },
  'scrape-cashtag-search': { cat: 'Scrapers', icon: '💲', page: 'x.com/search?q=$TICKER', desc: 'Scrape cashtag search results with sentiment analysis. Track stock/crypto ticker mentions and market sentiment.', srcFile: 'scripts/scrapeCashtagSearch.js' },
  'scrape-dms': { cat: 'Scrapers', icon: '✉️', page: 'x.com/messages', desc: 'Export your DM conversations. Scrapes message history with timestamps, sender info, and media attachments.', srcFile: 'scripts/scrapeDMs.js' },
  'scrape-explore': { cat: 'Scrapers', icon: '🔍', page: 'x.com/explore', desc: 'Scrape the Explore page trends and content. Collects trending topics, hashtags, and promoted content.', srcFile: 'scripts/scrapeExplore.js' },
  'scrape-followers': { cat: 'Scrapers', icon: '👥', page: 'x.com/USERNAME/followers', desc: 'Export a complete followers list to JSON/CSV. Includes name, bio, follower count, and verification status.', srcFile: 'scripts/scrapeFollowers.js' },
  'scrape-following': { cat: 'Scrapers', icon: '👥', page: 'x.com/USERNAME/following', desc: 'Export the full following list to JSON/CSV. See every account you follow with their metadata.', srcFile: 'scripts/scrapeFollowing.js' },
  'scrape-hashtag': { cat: 'Scrapers', icon: '#️⃣', page: 'x.com/search?q=%23hashtag', desc: 'Scrape tweets containing a specific hashtag. Collects tweet text, engagement, and author info.', srcFile: 'scripts/scrapeHashtag.js' },
  'scrape-likers': { cat: 'Scrapers', icon: '❤️', page: 'x.com/USERNAME/status/ID/likes', desc: 'Get all users who liked a specific tweet. Export likers list with profile metadata.', srcFile: 'scripts/scrapeLikers.js' },
  'scrape-likes': { cat: 'Scrapers', icon: '❤️', page: 'x.com/USERNAME/likes', desc: 'Export your liked tweets to JSON/CSV. See your full like history with engagement data.', srcFile: 'scripts/scrapeLikes.js' },
  'scrape-list': { cat: 'Scrapers', icon: '📝', page: 'x.com/i/lists/LIST_ID/members', desc: 'Scrape all members from a public Twitter list. Exports member profiles with metadata.', srcFile: 'scripts/scrapeList.js' },
  'scrape-media': { cat: 'Scrapers', icon: '🖼️', page: 'x.com/USERNAME/media', desc: 'Download all images and videos from a profile\'s media tab. Saves media files with metadata.', srcFile: 'scripts/scrapeMedia.js' },
  'scrape-notifications': { cat: 'Scrapers', icon: '🔔', page: 'x.com/notifications', desc: 'Export your notification history. Scrapes likes, retweets, follows, and mentions with timestamps.', srcFile: 'scripts/scrapeNotifications.js' },
  'scrape-profile': { cat: 'Scrapers', icon: '👤', page: 'x.com/USERNAME', desc: 'Get detailed profile data for any user. Extracts bio, stats, links, verification, and header images.', srcFile: 'scripts/scrapeProfile.js' },
  'scrape-quote-retweets': { cat: 'Scrapers', icon: '🔁', page: 'x.com/USERNAME/status/ID/retweets', desc: 'Get all quote retweets of a specific tweet. See how people are commenting on shared content.', srcFile: 'scripts/scrapeQuoteRetweets.js' },
  'scrape-replies': { cat: 'Scrapers', icon: '💬', page: 'x.com/USERNAME/status/ID', desc: 'Scrape all replies to a specific tweet. Export conversation threads with engagement data.', srcFile: 'scripts/scrapeReplies.js' },
  'scrape-search': { cat: 'Scrapers', icon: '🔍', page: 'x.com/search?q=keyword', desc: 'Search and export tweets by keyword. Supports advanced search operators and date filtering.', srcFile: 'scripts/scrapeSearch.js' },
  'export-to-csv': { cat: 'Utilities', icon: '📄', page: 'x.com (any page)', desc: 'Generic CSV export tool. Convert any scraped data array to downloadable CSV format.', srcFile: 'scripts/exportToCSV.js' },
  'dm-exporter': { cat: 'Messaging', icon: '📤', page: 'x.com/messages', desc: 'Export DM conversations with full message details. Includes timestamps, read receipts, and media links.', srcFile: 'scripts/dmExporter.js' },
  'manage-bookmarks': { cat: 'Bookmarks', icon: '📑', page: 'x.com/i/bookmarks', desc: 'Manage bookmarks via the browser UI. Add, remove, and organize bookmarks with bulk operations.', srcFile: 'scripts/manageBookmarks.js' },
  'manage-lists': { cat: 'Lists', icon: '📝', page: 'x.com/YOUR_USERNAME/lists', desc: 'Manage X Lists: create, edit, delete lists and add/remove members in bulk.', srcFile: 'scripts/manageLists.js' },
  'manage-notifications': { cat: 'Notifications', icon: '🔔', page: 'x.com/settings/notifications', desc: 'Configure notification preferences. Bulk-update which notifications you receive and how.', srcFile: 'scripts/manageNotifications.js' },
  'manage-settings': { cat: 'Account', icon: '⚙️', page: 'x.com/settings', desc: 'Manage account settings: privacy, security, display, and accessibility options.', srcFile: 'scripts/manageSettings.js' },
  'publish-article': { cat: 'Posting', icon: '📰', page: 'x.com/compose/article', desc: 'Publish articles on X (requires Premium+). Simplified article creation and formatting.', srcFile: 'scripts/publishArticle.js' },
  'edit-profile': { cat: 'Account', icon: '✏️', page: 'x.com/settings/profile', desc: 'Update profile fields via the settings page. Change name, bio, location, website, and more.', srcFile: 'scripts/editProfile.js' },
  'business-analytics': { cat: 'Business', icon: '💼', page: 'x.com (any page)', desc: 'Brand monitoring and sentiment analysis for businesses. Track mentions, engagement trends, and audience sentiment.', srcFile: 'scripts/businessAnalytics.js' },
  'keyword-liker': { cat: 'Engagement', icon: '❤️', page: 'x.com/search?q=keyword', desc: 'Like posts matching specific keywords. Enter keywords via a UI prompt and auto-like matching tweets.', srcFile: 'scripts/keywordLiker.js' },
  'multi-account-timeline-liker': { cat: 'Engagement', icon: '❤️', page: 'x.com (any profile)', desc: 'Like the entire timeline of multiple accounts. Mass-engage with content from a list of users.', srcFile: 'scripts/multiAccountTimelineLiker.js' },
  'tweet-price-correlation': { cat: 'Analytics', icon: '💹', page: 'x.com (any page)', desc: 'Correlate tweet frequency with token/stock price movements. Track if social activity predicts price action.', srcFile: 'scripts/tweetPriceCorrelation.js' },
  'thought-leader-cultivator': { cat: 'Growth', icon: '🧠', page: 'x.com (any page)', desc: 'Train the X algorithm for your niche by simulating natural browsing. Reads, likes, and bookmarks niche content to optimize your For You feed.', srcFile: 'scripts/thoughtLeaderCultivator.js' },
  'viral-tweets-scraper': { cat: 'Scrapers', icon: '🔥', page: 'x.com/search', desc: 'Find top-performing tweets in any niche. Scrapes viral content sorted by engagement metrics.', srcFile: 'scripts/viralTweetsScraper.js' },
  'auto-engage': { cat: 'Engagement', icon: '⚡', page: 'x.com (any page)', desc: 'All-in-one auto-engagement: like, reply, bookmark, and retweet matching content in a single script.', srcFile: 'scripts/autoEngage.js' },
};

// ── Doc Template ──────────────────────────────────────────────

function extractScriptInfo(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract CONFIG object keys and values
    const configMatch = content.match(/const\s+CONFIG\s*=\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
    let configLines = [];
    if (configMatch) {
      const configBlock = configMatch[1];
      const lines = configBlock.split('\n').filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('*'));
      configLines = lines.map(l => l.trim()).filter(l => l.includes(':'));
    }

    // Check for CLI/MCP variants
    const hasCLI = content.includes('xactions') || content.includes('CLI');
    const hasMCP = content.includes('MCP') || content.includes('mcp');

    return { configLines, hasCLI, hasMCP, content };
  } catch {
    return { configLines: [], hasCLI: false, hasMCP: false, content: '' };
  }
}

function generateDoc(slug, meta) {
  const title = slugToTitle(slug);
  const filePath = path.join(ROOT, meta.srcFile);
  const info = extractScriptInfo(filePath);

  // Build config table
  let configSection = '';
  if (info.configLines.length > 0) {
    configSection = `
## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
`;
    for (const line of info.configLines.slice(0, 15)) {
      const match = line.match(/(\w+)\s*:\s*(.+?)(?:,\s*$|$)/);
      if (match) {
        const key = match[1];
        let val = match[2].trim().replace(/,\s*$/, '');
        // Extract inline comment as description
        const commentMatch = val.match(/(.+?)\s*\/\/\s*(.+)/);
        let desc = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
        if (commentMatch) {
          val = commentMatch[1].trim();
          desc = commentMatch[2].trim();
        }
        configSection += `| \`${key}\` | \`${val}\` | ${desc} |\n`;
      }
    }
  }

  // Determine which page to navigate to
  const navPage = meta.page || 'x.com';

  // Build the tutorial section
  const tutorialSteps = `
## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to \`${navPage}\`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press \`F12\` or \`Ctrl+Shift+J\` (Mac: \`Cmd+Option+J\`)
- **Firefox:** Press \`F12\` or \`Ctrl+Shift+K\`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press \`Cmd+Option+C\`

### Step 3: Paste the script

Copy the entire script from [\`${meta.srcFile}\`](https://github.com/nirholas/XActions/blob/main/${meta.srcFile}) and paste it into the console.

### Step 4: Customize the CONFIG (optional)

Before running, you can modify the \`CONFIG\` object at the top of the script to adjust behavior:

\`\`\`javascript
const CONFIG = {
  // Edit these values before running
  // See Configuration table above for all options
};
\`\`\`

### Step 5: Run and monitor

Press **Enter** to run the script. Watch the console for real-time progress logs:

- ✅ Green messages = success
- 🔄 Blue messages = in progress
- ⚠️ Yellow messages = warnings
- ❌ Red messages = errors

### Step 6: Export results

Most scripts automatically download results as JSON/CSV when complete. Check your Downloads folder.`;

  const doc = `# ${meta.icon} ${title}

${meta.desc}

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- ${meta.desc}
- Automate repetitive ${meta.cat.toLowerCase()} tasks on X/Twitter
- Save time with one-click automation — no API keys needed
- Works in any modern browser (Chrome, Firefox, Edge, Safari)

---

## ⚠️ Important Notes

> **Use responsibly!** All automation should respect X/Twitter's Terms of Service. Use conservative settings and include breaks between sessions.

- This script runs in the **browser DevTools console** — not Node.js
- You must be **logged in** to x.com for the script to work
- Start with **low limits** and increase gradually
- Include **random delays** between actions to appear human
- **Don't run** multiple automation scripts simultaneously

---

## 🌐 Browser Console Usage

**Steps:**
1. Go to \`${navPage}\`
2. Open browser console (\`F12\` → Console tab)
3. Copy and paste the script from [\`${meta.srcFile}\`](https://github.com/nirholas/XActions/blob/main/${meta.srcFile})
4. Press Enter to run

\`\`\`javascript
// Quick start — copy the full script from:
// ${meta.srcFile}
//
// Or install via npm and use the CLI:
// npm install -g xactions
// xactions --help
\`\`\`
${configSection}
---
${tutorialSteps}

---

## 🖥️ CLI Usage

You can also run this via the XActions CLI:

\`\`\`bash
# Install XActions globally
npm install -g xactions

# Run via CLI
xactions --help
\`\`\`

---

## 🤖 MCP Server Usage

Use with AI agents (Claude, Cursor, etc.) via the MCP server:

\`\`\`bash
# Start MCP server
npm run mcp
\`\`\`

See the [MCP Setup Guide](../mcp-setup.md) for integration with Claude Desktop, Cursor, and other AI tools.

---

## 📁 Source Files

| File | Description |
|------|-------------|
| [\`${meta.srcFile}\`](https://github.com/nirholas/XActions/blob/main/${meta.srcFile}) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
${getRelatedLinks(slug, meta.cat)}

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)
`;

  return doc;
}

function getRelatedLinks(currentSlug, category) {
  const related = Object.entries(SCRIPT_META)
    .filter(([slug, m]) => m.cat === category && slug !== currentSlug)
    .slice(0, 5)
    .map(([slug]) => {
      const title = slugToTitle(slug);
      return `| [${title}](${slug}.md) | ${SCRIPT_META[slug].desc.split('.')[0]} |`;
    });

  if (related.length === 0) {
    return '| See [all scripts](README.md) | Browse the complete script catalog |';
  }
  return related.join('\n');
}

// ── Main ──────────────────────────────────────────────────────

function main() {
  // Get existing docs
  const existingDocs = new Set(
    fs.readdirSync(DOCS_DIR)
      .filter(f => f.endsWith('.md') && f !== 'README.md')
      .map(f => f.replace('.md', ''))
  );

  console.log(`📚 Found ${existingDocs.size} existing docs`);

  let created = 0;
  let skipped = 0;

  for (const [slug, meta] of Object.entries(SCRIPT_META)) {
    if (existingDocs.has(slug)) {
      skipped++;
      continue;
    }

    // Verify source file exists
    const srcPath = path.join(ROOT, meta.srcFile);
    if (!fs.existsSync(srcPath)) {
      console.log(`⚠️  Source not found: ${meta.srcFile} — skipping ${slug}`);
      continue;
    }

    const doc = generateDoc(slug, meta);
    const outPath = path.join(DOCS_DIR, `${slug}.md`);
    fs.writeFileSync(outPath, doc, 'utf-8');
    console.log(`✅ Created: ${slug}.md`);
    created++;
  }

  console.log('');
  console.log(`📊 Summary: ${created} created, ${skipped} already existed`);
  console.log(`📁 Total docs: ${existingDocs.size + created}`);
}

main();
