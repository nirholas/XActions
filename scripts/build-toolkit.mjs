#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). All rights reserved.
/**
 * Builds scripts/twitter/xactions-command-center.js: the single "master"
 * browser-console script that bundles every tool in scripts/twitter/ behind a
 * searchable command-palette UI. Users paste ONE script and pick any tool from
 * a menu instead of hunting for individual files.
 *
 * How it works:
 *   1. Reads the UI shell (scripts/twitter/_command-center-shell.js).
 *   2. Reads every scripts/twitter/<tool>.js, extracts its CONFIG defaults,
 *      injects a launcher-config override hook, strips the leading comment
 *      banner, and wraps it as register('<id>', function(){ ...tool IIFE... }).
 *   3. Injects the tool catalog (curated metadata below) + all registrations
 *      into the shell at the __XA_INJECT_DATA__ marker.
 *   4. Writes the runnable bundle and validates it with `node --check`.
 *
 * Run:  node scripts/build-toolkit.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TW = join(ROOT, 'scripts', 'twitter');
const SHELL = join(TW, '_command-center-shell.js');
const OUT = join(TW, 'xactions-command-center.js');
const VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Ordered categories shown as filter chips in the palette.
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { id: 'create', label: 'Create & Post', emoji: '✍️' },
  { id: 'scrape', label: 'Scrape & Export', emoji: '📥' },
  { id: 'analyze', label: 'Analytics', emoji: '📊' },
  { id: 'grow', label: 'Grow', emoji: '🌱' },
  { id: 'engage', label: 'Engage', emoji: '💬' },
  { id: 'cleanup', label: 'Clean Up', emoji: '🧹' },
  { id: 'moderate', label: 'Moderate', emoji: '🛡️' },
  { id: 'lists', label: 'Lists', emoji: '🗂️' },
  { id: 'community', label: 'Communities', emoji: '👥' },
  { id: 'profile', label: 'Profile', emoji: '🪪' },
  { id: 'utility', label: 'Utilities', emoji: '🧰' }
];

// Reusable "where to run" hints.
const W = {
  any: { label: 'Any X page' },
  home: { label: 'Your Home timeline', url: 'https://x.com/home', match: ['^/home'] },
  yourProfile: { label: 'Your own profile page' },
  anyProfile: { label: 'The profile you want to target (x.com/username)' },
  yourFollowers: { label: 'Your Followers page (x.com/<you>/followers)', match: ['/followers'] },
  yourFollowing: { label: 'Your Following page (x.com/<you>/following)', match: ['/following'] },
  yourLikes: { label: 'Your Likes page (x.com/<you>/likes)', match: ['/likes'] },
  bookmarks: { label: 'Your Bookmarks', url: 'https://x.com/i/bookmarks', match: ['^/i/bookmarks'] },
  messages: { label: 'Your Messages', url: 'https://x.com/messages', match: ['^/messages'] },
  settingsProfile: { label: 'Edit profile', url: 'https://x.com/settings/profile', match: ['^/settings/profile'] },
  blocked: { label: 'Blocked accounts', url: 'https://x.com/settings/blocked_all', match: ['^/settings/blocked'] },
  muted: { label: 'Muted accounts', url: 'https://x.com/settings/muted_all', match: ['^/settings/muted'] },
  searchPeople: { label: 'Search → People tab (x.com/search?...&f=user)', match: ['^/search.*f=user', '^/search'] },
  searchLive: { label: 'Search → Latest tab (x.com/search?...&f=live)', match: ['^/search'] },
  openTweet: { label: 'The open tweet/thread (its status page)', match: ['/status/'] },
  communities: { label: 'Your Communities', url: 'https://x.com/i/communities', match: ['communities'] },
  compose: { label: 'The post composer', url: 'https://x.com/compose/post', match: ['^/compose'] },
  notifications: { label: 'Your Notifications', url: 'https://x.com/notifications', match: ['^/notifications'] },
  mentions: { label: 'Your Mentions tab', url: 'https://x.com/notifications/mentions', match: ['^/notifications/mentions'] },
  listsHome: { label: 'Your Lists', url: 'https://x.com/i/lists', match: ['/lists'] },
  listPage: { label: 'A List page (x.com/i/lists/<id>)', match: ['/lists/'] },
  listMembers: { label: "A List's members page", match: ['/lists/.*members', '/members'] },
  explore: { label: 'Explore / Trends', url: 'https://x.com/explore', match: ['^/explore'] },
  mutedWords: { label: 'Muted words settings', url: 'https://x.com/settings/muted_keywords', match: ['muted_keywords'] },
  settings: { label: 'Settings', url: 'https://x.com/settings', match: ['^/settings'] },
  mediaTab: { label: "A profile's Media tab", match: ['/media'] },
  tweetLikes: { label: "A tweet's Likes page (.../likes)", match: ['/status/.*likes', '/likes'] },
  tweetReposts: { label: "A tweet's Reposts page (.../retweets)", match: ['/status/.*(retweets|quotes)'] }
};

// ---------------------------------------------------------------------------
// Curated per-tool metadata. Every scripts/twitter/*.js tool has an entry.
// danger: 'safe' (read/export) | 'caution' (writes at human pace) |
//         'destructive' (bulk / irreversible).
// ---------------------------------------------------------------------------
const META = {
  // ---- Scrape & Export ----
  'scrape-profile-posts': { title: 'Scrape Profile Posts', emoji: '📜', category: 'scrape', danger: 'safe', where: W.anyProfile, desc: 'Scrape every post from any profile with filters, analytics, and JSON/CSV/MD exports.' },
  'scrape-profile-with-replies': { title: 'Scrape Posts + Replies', emoji: '🧵', category: 'scrape', danger: 'safe', where: W.anyProfile, desc: 'Scrape a profile including its replies, from the With replies tab.' },
  'scraper-toolbox': { title: 'Scraper Toolbox', emoji: '🧰', category: 'scrape', danger: 'safe', where: W.any, desc: 'Full on-page scraping control panel: start/pause/stop, live filters, one-click exports.' },
  'viral-tweets-scraper': { title: 'Viral Tweets Finder', emoji: '🔥', category: 'scrape', danger: 'safe', where: W.anyProfile, desc: 'Find the top-performing viral posts from a search or any account.' },
  'link-scraper': { title: 'Link Scraper', emoji: '🔗', category: 'scrape', danger: 'safe', where: W.anyProfile, desc: 'Extract every external link a user has shared.' },
  'thread-unroller': { title: 'Thread Unroller', emoji: '🪡', category: 'scrape', danger: 'safe', where: W.openTweet, desc: 'Save any thread as clean text, markdown, or JSON.' },
  'bookmark-exporter': { title: 'Bookmark Exporter', emoji: '🔖', category: 'scrape', danger: 'safe', where: W.bookmarks, desc: 'Export all of your bookmarks to JSON and CSV.' },
  'video-downloader': { title: 'Video Downloader', emoji: '🎬', category: 'scrape', danger: 'safe', where: W.openTweet, desc: 'Download the video from any post, at your chosen quality.' },
  'backup-account': { title: 'Account Backup', emoji: '💾', category: 'scrape', danger: 'safe', where: W.yourProfile, desc: 'Make a comprehensive backup of your account data.' },

  // ---- Analytics ----
  'audit-followers': { title: 'Follower Audit', emoji: '🔍', category: 'analyze', danger: 'safe', where: W.yourFollowers, desc: 'Score follower quality and surface likely fakes and inactives.' },
  'best-time-to-post': { title: 'Best Time to Post', emoji: '⏰', category: 'analyze', danger: 'safe', where: W.yourProfile, desc: 'Find when your audience is most active.' },
  'competitor-analysis': { title: 'Competitor Analysis', emoji: '🕵️', category: 'analyze', danger: 'safe', where: W.anyProfile, desc: 'Analyze a competitor account for content and engagement insights.' },
  'engagement-analytics': { title: 'Engagement Analytics', emoji: '📈', category: 'analyze', danger: 'safe', where: W.yourProfile, desc: 'Break down likes, replies, and reposts across your posts.' },
  'find-fake-followers': { title: 'Fake Follower Finder', emoji: '🤖', category: 'analyze', danger: 'safe', where: W.yourFollowers, desc: 'Identify likely bot/fake accounts in your audience.' },
  'followers-growth-tracker': { title: 'Growth Tracker', emoji: '📉', category: 'analyze', danger: 'safe', where: W.yourProfile, desc: 'Track follower growth over time with saved history.' },
  'hashtag-analytics': { title: 'Hashtag Analytics', emoji: '#️⃣', category: 'analyze', danger: 'safe', where: W.yourProfile, desc: 'Measure how your hashtags perform.' },
  'profile-stats': { title: 'Profile Stats', emoji: '📊', category: 'analyze', danger: 'safe', where: W.anyProfile, desc: 'Get a quick, comprehensive stats card for any profile.' },
  'monitor-account': { title: 'Account Monitor', emoji: '👀', category: 'analyze', danger: 'safe', where: W.anyProfile, desc: 'Track follower/following changes on any public account.' },
  'continuous-monitor': { title: 'Continuous Monitor', emoji: '🔄', category: 'analyze', danger: 'safe', where: W.yourProfile, desc: 'Auto-refresh watch with browser notifications on follower changes.' },
  'detect-unfollowers': { title: 'Unfollower Detector', emoji: '💔', category: 'analyze', danger: 'safe', where: W.yourFollowers, desc: 'Compare against a saved snapshot to see who unfollowed you.' },
  'new-followers-alert': { title: 'New Follower Alerts', emoji: '🔔', category: 'analyze', danger: 'safe', where: W.yourFollowers, desc: 'Track new followers with optional welcome-message templates.' },

  // ---- Grow ----
  'keyword-follow': { title: 'Keyword Follow', emoji: '🔑', category: 'grow', danger: 'caution', where: W.searchPeople, desc: 'Follow users matching a keyword search, with bio filters.' },
  'follow-engagers': { title: 'Follow Engagers', emoji: '🧲', category: 'grow', danger: 'caution', where: W.openTweet, desc: 'Follow the people who liked or reposted a specific tweet.' },
  'follow-target-users': { title: 'Follow Target Audience', emoji: '🎯', category: 'grow', danger: 'caution', where: W.anyProfile, desc: "Follow the followers/following of accounts you specify." },
  'growth-suite': { title: 'Growth Suite', emoji: '🚀', category: 'grow', danger: 'caution', where: W.any, desc: 'All-in-one growth: auto-like, auto-follow, and smart-unfollow together.' },

  // ---- Engage ----
  'auto-liker': { title: 'Auto Liker', emoji: '❤️', category: 'engage', danger: 'caution', where: W.anyProfile, desc: 'Like posts in a timeline or on a profile, at a human pace.' },
  'auto-commenter': { title: 'Auto Commenter', emoji: '💬', category: 'engage', danger: 'caution', where: W.anyProfile, desc: "Comment on a target user's posts with your templates." },
  'like-by-feed': { title: 'Like Home Feed', emoji: '🏠', category: 'engage', danger: 'caution', where: W.home, desc: 'Auto-like posts as you scroll your home timeline.' },
  'like-by-hashtag': { title: 'Like by Hashtag', emoji: '#️⃣', category: 'engage', danger: 'caution', where: W.searchLive, desc: 'Auto-like posts containing specific hashtags.' },
  'like-by-location': { title: 'Like by Location', emoji: '📍', category: 'engage', danger: 'caution', where: W.searchLive, desc: 'Auto-like posts from a geographic area.' },
  'like-by-user': { title: 'Like a User', emoji: '👤', category: 'engage', danger: 'caution', where: W.anyProfile, desc: "Auto-like posts from a specific user's profile." },
  'like-user-replies': { title: 'Like Replies', emoji: '↩️', category: 'engage', danger: 'caution', where: W.openTweet, desc: "Auto-like the replies under a specific post." },
  'comment-by-hashtag': { title: 'Comment by Hashtag', emoji: '🗨️', category: 'engage', danger: 'caution', where: W.searchLive, desc: 'Find hashtag posts and comment with your templates.' },
  'comment-by-location': { title: 'Comment by Location', emoji: '📍', category: 'engage', danger: 'caution', where: W.searchLive, desc: 'Find posts from a location and comment on them.' },
  'interact-by-hashtag': { title: 'Interact by Hashtag', emoji: '#️⃣', category: 'engage', danger: 'caution', where: W.searchLive, desc: 'Like/follow/reply on posts matching a hashtag.' },
  'interact-by-place': { title: 'Interact by Place', emoji: '📍', category: 'engage', danger: 'caution', where: W.searchLive, desc: 'Like/follow/reply on posts from a location.' },
  'interact-by-users': { title: 'Interact with Users', emoji: '🎯', category: 'engage', danger: 'caution', where: W.anyProfile, desc: 'Full like/follow/reply suite aimed at specific users.' },
  'interact-with-likers': { title: 'Interact with Likers', emoji: '🧲', category: 'engage', danger: 'caution', where: W.openTweet, desc: 'Engage the users who liked a specific post.' },

  // ---- Clean Up ----
  'unfollow-everyone': { title: 'Unfollow Everyone', emoji: '🧹', category: 'cleanup', danger: 'destructive', where: W.yourFollowing, desc: 'Mass-unfollow every account you follow.' },
  'unfollow-non-followers': { title: 'Unfollow Non-Followers', emoji: '✂️', category: 'cleanup', danger: 'destructive', where: W.yourFollowing, desc: "Unfollow accounts that don't follow you back." },
  'unfollow-with-log': { title: 'Unfollow + Log', emoji: '📝', category: 'cleanup', danger: 'destructive', where: W.yourFollowing, desc: 'Unfollow non-followers and download a log of who was removed.' },
  'smart-unfollow': { title: 'Smart Unfollow', emoji: '🧠', category: 'cleanup', danger: 'destructive', where: W.yourFollowing, desc: "Unfollow accounts that didn't follow back within N days (respects your whitelist).", },
  'unlike-all': { title: 'Unlike Everything', emoji: '💔', category: 'cleanup', danger: 'destructive', where: W.yourLikes, desc: 'Remove every like from your Likes page.' },
  'unlike-old': { title: 'Unlike Old Likes', emoji: '🕰️', category: 'cleanup', danger: 'destructive', where: W.yourLikes, desc: 'Remove likes older than a number of days you set.' },
  'clear-all-likes': { title: 'Clear All Likes', emoji: '🗑️', category: 'cleanup', danger: 'destructive', where: W.yourLikes, desc: 'Remove all likes from your account.' },
  'clear-all-retweets': { title: 'Clear All Reposts', emoji: '🔁', category: 'cleanup', danger: 'destructive', where: W.yourProfile, desc: 'Undo all of your reposts.' },
  'clear-all-bookmarks': { title: 'Clear All Bookmarks', emoji: '🔖', category: 'cleanup', danger: 'destructive', where: W.bookmarks, desc: 'Remove all of your bookmarks.' },

  // ---- Moderate ----
  'mass-block': { title: 'Mass Block', emoji: '⛔', category: 'moderate', danger: 'destructive', where: W.any, desc: 'Block every user in a list you provide.' },
  'mass-unblock': { title: 'Mass Unblock', emoji: '✅', category: 'moderate', danger: 'destructive', where: W.blocked, desc: 'Unblock accounts in bulk from your blocked list.' },
  'mass-unmute': { title: 'Mass Unmute', emoji: '🔊', category: 'moderate', danger: 'destructive', where: W.muted, desc: 'Unmute accounts in bulk from your muted list.' },
  'block-bots': { title: 'Block Bots', emoji: '🤖', category: 'moderate', danger: 'destructive', where: W.yourFollowers, desc: 'Detect and block likely bots by ratio, age, and bio.' },
  'block-by-keywords': { title: 'Block by Keywords', emoji: '🚫', category: 'moderate', danger: 'destructive', where: W.yourFollowers, desc: 'Block users whose bio contains keywords you set.' },
  'block-by-ratio': { title: 'Block by Ratio', emoji: '📛', category: 'moderate', danger: 'destructive', where: W.yourFollowers, desc: 'Block accounts by follower/following ratio.' },
  'mute-by-keywords': { title: 'Mute by Keywords', emoji: '🔇', category: 'moderate', danger: 'destructive', where: W.yourFollowers, desc: 'Mute users whose bio contains keywords you set.' },
  'report-spam': { title: 'Report Spam', emoji: '🚩', category: 'moderate', danger: 'destructive', where: W.yourFollowers, desc: 'Report spam accounts from your followers or mentions.' },

  // ---- Communities ----
  'join-communities': { title: 'Join Communities', emoji: '➕', category: 'community', danger: 'caution', where: W.any, desc: 'Join multiple Communities from a list of IDs.' },
  'leave-community': { title: 'Leave a Community', emoji: '➖', category: 'community', danger: 'caution', where: W.communities, desc: 'Leave one Community by name or ID.' },
  'leave-all-communities': { title: 'Leave All Communities', emoji: '🚪', category: 'community', danger: 'destructive', where: W.communities, desc: 'Leave every Community you have joined.' },

  // ---- Profile & Account ----
  'update-bio': { title: 'Update Bio', emoji: '✍️', category: 'profile', danger: 'caution', where: W.settingsProfile, desc: 'Update your profile bio.' },
  'update-banner': { title: 'Update Banner', emoji: '🖼️', category: 'profile', danger: 'caution', where: W.settingsProfile, desc: 'Guided helper for changing your profile banner.' },
  'update-profile-picture': { title: 'Update Avatar', emoji: '🖼️', category: 'profile', danger: 'caution', where: W.settingsProfile, desc: 'Guided helper for changing your profile picture.' },
  'send-direct-message': { title: 'Send DMs', emoji: '✉️', category: 'profile', danger: 'caution', where: W.messages, desc: 'Send direct messages, with per-recipient personalization.' },
  'multi-account': { title: 'Multi-Account Manager', emoji: '🔀', category: 'profile', danger: 'safe', where: W.any, desc: 'Manage and switch between multiple accounts.' },

  // ---- Utilities ----
  'protect-active-users': { title: 'Protect Active Users', emoji: '🛡️', category: 'utility', danger: 'safe', where: W.yourProfile, desc: 'Scan your posts for engaged users and protect them from unfollow.' },
  'blacklist': { title: 'Blacklist Manager', emoji: '📕', category: 'utility', danger: 'safe', where: W.any, desc: 'Maintain a list of users other tools should skip.' },
  'whitelist': { title: 'Whitelist Manager', emoji: '📗', category: 'utility', danger: 'safe', where: W.any, desc: 'Maintain a list of users to protect from actions.' },
  'filter-manager': { title: 'Filter Manager', emoji: '🎚️', category: 'utility', danger: 'safe', where: W.any, desc: 'Configure shared filters used across the automation tools.' },
  'rate-limiter': { title: 'Rate Limiter', emoji: '⏱️', category: 'utility', danger: 'safe', where: W.any, desc: 'Tune the pacing/quota helper shared by the action tools.' },

  // ---- Create & Post ----
  'post-tweet': { title: 'Post a Tweet', emoji: '✍️', category: 'create', danger: 'caution', where: W.compose, desc: 'Compose and publish a single tweet from the console.' },
  'post-thread': { title: 'Post a Thread', emoji: '🧵', category: 'create', danger: 'caution', where: W.compose, desc: 'Publish a multi-tweet thread from a list of texts.' },
  'schedule-post': { title: 'Schedule a Post', emoji: '🗓️', category: 'create', danger: 'caution', where: W.compose, desc: "Schedule a tweet using X's native scheduler." },
  'create-poll': { title: 'Create a Poll', emoji: '📊', category: 'create', danger: 'caution', where: W.compose, desc: 'Publish a poll with your choices and duration.' },
  'quote-tweet': { title: 'Quote Tweet', emoji: '💬', category: 'create', danger: 'caution', where: W.openTweet, desc: 'Quote-tweet the post you are viewing with your own text.' },
  'pin-tweet': { title: 'Pin / Unpin Tweet', emoji: '📌', category: 'create', danger: 'caution', where: W.yourProfile, desc: 'Pin or unpin one of your own tweets.' },

  // ---- Engage (additions) ----
  'auto-repost': { title: 'Auto Repost', emoji: '🔁', category: 'engage', danger: 'caution', where: W.searchLive, desc: 'Repost posts matching your criteria as you scroll.' },
  'auto-reply-mentions': { title: 'Auto-Reply Mentions', emoji: '📨', category: 'engage', danger: 'caution', where: W.mentions, desc: 'Reply to your recent mentions with rotating templates.' },
  'vote-in-polls': { title: 'Vote in Polls', emoji: '🗳️', category: 'engage', danger: 'caution', where: W.searchLive, desc: 'Auto-vote a chosen option on polls in the timeline.' },

  // ---- Clean Up (addition) ----
  'delete-tweets': { title: 'Bulk Delete Your Posts', emoji: '🗑️', category: 'cleanup', danger: 'destructive', where: W.yourProfile, desc: 'Delete your own tweets by age, keyword, or engagement (dry-run by default).' },

  // ---- Scrape & Export (additions) ----
  'scrape-followers': { title: 'Scrape Followers', emoji: '👥', category: 'scrape', danger: 'safe', where: W.yourFollowers, desc: 'Export a profile’s followers to JSON/CSV.' },
  'scrape-following': { title: 'Scrape Following', emoji: '👣', category: 'scrape', danger: 'safe', where: W.yourFollowing, desc: 'Export who a profile follows to JSON/CSV.' },
  'scrape-likers': { title: 'Scrape Post Likers', emoji: '❤️', category: 'scrape', danger: 'safe', where: W.tweetLikes, desc: 'Export the users who liked a post.' },
  'scrape-retweeters': { title: 'Scrape Reposters', emoji: '🔁', category: 'scrape', danger: 'safe', where: W.tweetReposts, desc: 'Export reposters and quote-tweeters of a post.' },
  'scrape-user-likes': { title: "Scrape a User's Likes", emoji: '💗', category: 'scrape', danger: 'safe', where: W.yourLikes, desc: 'Export the posts a user has liked.' },
  'scrape-search': { title: 'Scrape Search Results', emoji: '🔎', category: 'scrape', danger: 'safe', where: W.searchLive, desc: 'Export posts from a search query.' },
  'scrape-hashtag': { title: 'Scrape a Hashtag', emoji: '#️⃣', category: 'scrape', danger: 'safe', where: W.searchLive, desc: 'Export posts for a hashtag.' },
  'scrape-list': { title: 'Scrape a List', emoji: '📋', category: 'scrape', danger: 'safe', where: W.listPage, desc: 'Export a List’s timeline or members.' },
  'scrape-media': { title: 'Scrape Profile Media', emoji: '🖼️', category: 'scrape', danger: 'safe', where: W.mediaTab, desc: 'Export image and video URLs from a profile.' },
  'scrape-replies': { title: 'Scrape Tweet Replies', emoji: '💬', category: 'scrape', danger: 'safe', where: W.openTweet, desc: 'Export the replies under a post.' },
  'scrape-notifications': { title: 'Scrape Notifications', emoji: '🔔', category: 'scrape', danger: 'safe', where: W.notifications, desc: 'Export your notifications feed.' },
  'scrape-dms': { title: 'Scrape DMs', emoji: '✉️', category: 'scrape', danger: 'safe', where: W.messages, desc: 'Export the open DM conversation.' },
  'scrape-spaces': { title: 'Scrape Spaces', emoji: '🎙️', category: 'scrape', danger: 'safe', where: W.anyProfile, desc: 'Capture Spaces info from a profile or Space.' },

  // ---- Lists ----
  'list-manager': { title: 'List Manager', emoji: '🗂️', category: 'lists', danger: 'caution', where: W.listsHome, desc: 'Create, rename, or delete a List.' },
  'add-to-list': { title: 'Add Users to List', emoji: '➕', category: 'lists', danger: 'caution', where: W.listsHome, desc: 'Add specified users to one of your Lists.' },
  'follow-list-members': { title: 'Follow List Members', emoji: '👣', category: 'lists', danger: 'caution', where: W.listMembers, desc: 'Follow every member of a List.' },

  // ---- Profile & Account (additions) ----
  'bulk-dm': { title: 'Bulk / Welcome DM', emoji: '📤', category: 'profile', danger: 'caution', where: W.messages, desc: 'DM a list of users with a personalized template.' },
  'auto-reply-dms': { title: 'Auto-Reply DMs', emoji: '💌', category: 'profile', danger: 'caution', where: W.messages, desc: 'Auto-reply to unread DM conversations with a template.' },
  'edit-profile': { title: 'Edit Profile', emoji: '🪪', category: 'profile', danger: 'caution', where: W.settingsProfile, desc: 'Update your name, bio, location, website, or birthday.' },
  'account-settings': { title: 'Privacy & Settings', emoji: '⚙️', category: 'profile', danger: 'caution', where: W.settings, desc: 'Toggle common privacy and safety settings.' },

  // ---- Moderate (additions) ----
  'remove-follower': { title: 'Remove a Follower', emoji: '🚪', category: 'moderate', danger: 'caution', where: W.yourFollowers, desc: 'Remove followers without blocking (dry-run by default).' },
  'block-list-transfer': { title: 'Block List Import/Export', emoji: '🧱', category: 'moderate', danger: 'destructive', where: W.blocked, desc: 'Export your block list, import-and-block a list, or block an account’s followers.' },
  'manage-muted-words': { title: 'Muted Words', emoji: '🔇', category: 'moderate', danger: 'caution', where: W.mutedWords, desc: 'Add, remove, or list your muted words and phrases.' },

  // ---- Grow (addition) ----
  'follow-back': { title: 'Follow Back Everyone', emoji: '🔗', category: 'grow', danger: 'caution', where: W.yourFollowers, desc: 'Follow accounts that follow you but you don’t follow back.' },

  // ---- Utilities (addition) ----
  'notification-manager': { title: 'Notification Cleaner', emoji: '🔕', category: 'utility', danger: 'safe', where: W.notifications, desc: 'Mark notifications read and summarize them.' },

  // ---- Analytics (additions) ----
  'shadowban-checker': { title: 'Shadowban Checker', emoji: '🚦', category: 'analyze', danger: 'safe', where: W.yourProfile, desc: 'Heuristic search-suggestion / search-ban / reply-deboost check.' },
  'tweet-performance': { title: 'Tweet Performance', emoji: '📊', category: 'analyze', danger: 'safe', where: W.yourProfile, desc: 'Rank your recent posts by engagement.' },
  'sentiment-analyzer': { title: 'Sentiment Analyzer', emoji: '🧠', category: 'analyze', danger: 'safe', where: W.any, desc: 'Score sentiment across posts on the current view.' },
  'audience-overlap': { title: 'Audience Overlap', emoji: '🔀', category: 'analyze', danger: 'safe', where: W.any, desc: 'Compare two follower sets for overlap and unique handles.' },
  'trending-monitor': { title: 'Trending Monitor', emoji: '📈', category: 'analyze', danger: 'safe', where: W.explore, desc: 'Capture current trends and watch for your keywords.' }
};

// ---------------------------------------------------------------------------
// Source processing
// ---------------------------------------------------------------------------

// Locate the top-level `var CONFIG = { ... }` object literal via a brace scan
// that skips strings and comments. Returns { open, close } indices of the {}.
function findConfig(src) {
  const m = /(?:^|\n)\s*(?:var|const|let)\s+CONFIG\s*=\s*\{/.exec(src);
  if (!m) return null;
  const open = src.indexOf('{', m.index);
  let depth = 0, inStr = null, esc = false;
  for (let i = open; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '/' && n === '/') { const nl = src.indexOf('\n', i); i = nl < 0 ? src.length : nl; continue; }
    if (c === '/' && n === '*') { const end = src.indexOf('*/', i + 2); i = end < 0 ? src.length : end + 1; continue; }
    if (c === '\'' || c === '"' || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return { open, close: i }; }
  }
  return null;
}

// Strip the leading license line + first JSDoc banner so the bundle is smaller.
function stripBanner(src) {
  let i = 0;
  const len = src.length;
  for (;;) {
    while (i < len && /\s/.test(src[i])) i++;
    if (src.startsWith('//', i)) { const nl = src.indexOf('\n', i); i = nl < 0 ? len : nl + 1; continue; }
    if (src.startsWith('/*', i)) { const end = src.indexOf('*/', i + 2); i = end < 0 ? len : end + 2; continue; }
    break;
  }
  return src.slice(i);
}

const OVERRIDE_HOOK = "\ntry{if(typeof window!=='undefined'&&window.__XA_LAUNCH_CFG){Object.assign(CONFIG,window.__XA_LAUNCH_CFG);}}catch(_xa){}\n";

function processTool(id, raw) {
  // Extract CONFIG defaults (best effort) and inject the override hook.
  let defaults = {};
  const cf = findConfig(raw);
  let src = raw;
  if (cf) {
    const objText = raw.slice(cf.open, cf.close + 1);
    try { defaults = vm.runInNewContext('(' + objText + ')', {}, { timeout: 1000 }); }
    catch { defaults = {}; }
    // Insert the hook after the statement's terminating semicolon (or the `}`).
    let insertAt = cf.close + 1;
    while (insertAt < raw.length && /[\s;]/.test(raw[insertAt])) { if (raw[insertAt] === ';') { insertAt++; break; } insertAt++; }
    src = raw.slice(0, insertAt) + OVERRIDE_HOOK + raw.slice(insertAt);
  }
  src = stripBanner(src);
  return { defaults, src };
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const files = readdirSync(TW)
  .filter((f) => f.endsWith('.js') && !f.startsWith('_') && f !== 'xactions-command-center.js')
  .map((f) => f.replace(/\.js$/, ''))
  .sort();

const catalog = [];
const registrations = [];
const missingMeta = [];

for (const id of files) {
  const meta = META[id];
  if (!meta) { missingMeta.push(id); continue; }
  const raw = readFileSync(join(TW, id + '.js'), 'utf-8');
  const stopGlobal = (raw.match(/window\.(stop\w+)\s*=/) || [])[1] || null;
  const { defaults, src } = processTool(id, raw);
  catalog.push({ id, title: meta.title, emoji: meta.emoji, category: meta.category, danger: meta.danger, desc: meta.desc, where: meta.where, defaults, stopGlobal });
  registrations.push(`  register(${JSON.stringify(id)}, function(){\n${src}\n});`);
}

// Every tool file must be catalogued, and every META id must map to a real file.
const orphanMeta = Object.keys(META).filter((id) => !files.includes(id));
if (missingMeta.length) { console.error('✖ Tool files with no catalog entry (add to META):\n  ' + missingMeta.join('\n  ')); process.exit(1); }
if (orphanMeta.length) { console.error('✖ Catalog entries with no tool file (stale META):\n  ' + orphanMeta.join('\n  ')); process.exit(1); }

// Order the catalog by category order, then title, so the palette reads well.
const catOrder = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, i]));
catalog.sort((a, b) => (catOrder[a.category] - catOrder[b.category]) || a.title.localeCompare(b.title));

const dataBlock = [
  'const CATALOG = ' + JSON.stringify(catalog) + ';',
  'const CATEGORIES = ' + JSON.stringify(CATEGORIES) + ';',
  'const TOOLS = {};',
  'function register(id, fn){ TOOLS[id] = fn; }',
  ...registrations
].join('\n');

let shell = readFileSync(SHELL, 'utf-8');
// Use function replacers: a string replacement would interpret `$` sequences in
// the tool source (e.g. a regex template literal like `/?$`) as special replace
// patterns and corrupt the output.
shell = shell.replace('/* __XA_INJECT_DATA__ */', () => dataBlock).replace(/__XA_VERSION__/g, () => VERSION);

const header = `// Copyright (c) 2024-2026 nich (@nichxbt). All rights reserved.
/**
 * ============================================================
 * ⚡ XActions Command Center  (v${VERSION})
 * ============================================================
 * The one script to run them all. Paste this into your browser's DevTools
 * console on x.com and a searchable command palette appears with every
 * XActions tool (${catalog.length} of them): scrape, analyze, grow, engage,
 * clean up, moderate, and more. Pick a tool, set its options, press Run.
 *
 *   1. Open x.com and press F12 (or Cmd+Option+I) → Console tab.
 *   2. Paste this entire file and press Enter.
 *   3. Search, choose a tool, and click Run. Reopen anytime with the
 *      ⚡ button (bottom-right) or Cmd/Ctrl+K.
 *
 * @name        XActions Command Center
 * @description One console script that opens a searchable menu of every XActions tool (scrape, analyze, grow, engage, clean up, and moderate) with per-tool options and one-click run.
 * @version     ${VERSION}
 * @author      nichxbt (https://x.com/nichxbt)
 *
 * GENERATED FILE. Do not edit by hand. Source: scripts/twitter/_command-center-shell.js
 * + scripts/build-toolkit.mjs. Regenerate with: node scripts/build-toolkit.mjs
 * @repository https://github.com/nirholas/XActions
 */
`;

writeFileSync(OUT, header + shell);

// Validate the generated bundle actually parses.
try {
  execFileSync('node', ['--check', OUT], { stdio: 'pipe' });
} catch (e) {
  console.error('✖ Generated bundle failed `node --check`:');
  console.error(e.stderr ? e.stderr.toString() : e.message);
  process.exit(1);
}

const bytes = Buffer.byteLength(header + shell);
console.log(`✅ Built ${OUT.replace(ROOT + '/', '')}`);
console.log(`   ${catalog.length} tools bundled across ${CATEGORIES.length} categories · ${(bytes / 1024).toFixed(0)} KB`);
