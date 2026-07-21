#!/usr/bin/env node
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Build Individual HTML Pages for Every Browser Console Script
 * Scans: src/*.js, src/automation/*.js, scripts/*.js, scripts/twitter/*.js
 * Outputs to: dashboard/scripts/<slug>.html + dashboard/scripts/index.html
 * by nichxbt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'dashboard', 'scripts');
const SITE_URL = 'https://xactions.app';

// ─── Category Mappings ─────────────────────────────────────────────
const CATEGORIES = {
  // Featured: the one-script launcher for everything below.
  'xactions-command-center': { cat: 'Command Center', icon: '⚡', priority: 1.0 },
  // Unfollow
  'unfollow-everyone': { cat: 'Unfollow Tools', icon: '👋', priority: 0.8 },
  'unfollowback': { cat: 'Unfollow Tools', icon: '🧹', priority: 0.8 },
  'unfollow-non-followers': { cat: 'Unfollow Tools', icon: '🧹', priority: 0.8 },
  'unfollow-wdfb-log': { cat: 'Unfollow Tools', icon: '📋', priority: 0.7 },
  'unfollow-with-log': { cat: 'Unfollow Tools', icon: '📋', priority: 0.7 },
  'smart-unfollow': { cat: 'Unfollow Tools', icon: '🧠', priority: 0.8 },
  'follow-ratio-manager': { cat: 'Unfollow Tools', icon: '⚖️', priority: 0.7 },
  // Follower Monitoring
  'detect-unfollowers': { cat: 'Follower Monitoring', icon: '🔍', priority: 0.8 },
  'new-followers-alert': { cat: 'Follower Monitoring', icon: '🔔', priority: 0.7 },
  'audit-followers': { cat: 'Follower Monitoring', icon: '📊', priority: 0.7 },
  'remove-followers': { cat: 'Follower Monitoring', icon: '🚫', priority: 0.7 },
  'continuous-monitor': { cat: 'Follower Monitoring', icon: '🔄', priority: 0.7 },
  'monitor-account': { cat: 'Follower Monitoring', icon: '📊', priority: 0.7 },
  'follower-growth-tracker': { cat: 'Follower Monitoring', icon: '📈', priority: 0.7 },
  'follower-tools': { cat: 'Follower Monitoring', icon: '👥', priority: 0.7 },
  'followers-growth-tracker': { cat: 'Follower Monitoring', icon: '📈', priority: 0.7 },
  'find-fake-followers': { cat: 'Follower Monitoring', icon: '🤖', priority: 0.7 },
  'welcome-new-followers': { cat: 'Follower Monitoring', icon: '👋', priority: 0.7 },
  // Engagement
  'auto-liker': { cat: 'Engagement', icon: '❤️', priority: 0.7 },
  'auto-commenter': { cat: 'Engagement', icon: '💬', priority: 0.7 },
  'auto-repost': { cat: 'Engagement', icon: '🔁', priority: 0.7 },
  'auto-reply': { cat: 'Engagement', icon: '💬', priority: 0.7 },
  'auto-plug-replies': { cat: 'Engagement', icon: '🔌', priority: 0.7 },
  'auto-engage': { cat: 'Engagement', icon: '⚡', priority: 0.7 },
  'engagement-booster': { cat: 'Engagement', icon: '🚀', priority: 0.7 },
  'engagement-manager': { cat: 'Engagement', icon: '⚡', priority: 0.7 },
  'engagement-leaderboard': { cat: 'Engagement', icon: '🏆', priority: 0.7 },
  'quote-tweet-automation': { cat: 'Engagement', icon: '🔁', priority: 0.7 },
  'keyword-liker': { cat: 'Engagement', icon: '❤️', priority: 0.7 },
  'multi-account-timeline-liker': { cat: 'Engagement', icon: '❤️', priority: 0.6 },
  'like-post': { cat: 'Engagement', icon: '❤️', priority: 0.6 },
  'repost-post': { cat: 'Engagement', icon: '🔁', priority: 0.6 },
  'post-interactions': { cat: 'Engagement', icon: '💬', priority: 0.6 },
  'like-by-feed': { cat: 'Engagement', icon: '❤️', priority: 0.6 },
  'like-by-hashtag': { cat: 'Engagement', icon: '❤️', priority: 0.6 },
  'like-by-location': { cat: 'Engagement', icon: '❤️', priority: 0.6 },
  'like-by-user': { cat: 'Engagement', icon: '❤️', priority: 0.6 },
  'like-user-replies': { cat: 'Engagement', icon: '❤️', priority: 0.6 },
  'interact-by-hashtag': { cat: 'Engagement', icon: '💬', priority: 0.6 },
  'interact-by-place': { cat: 'Engagement', icon: '💬', priority: 0.6 },
  'interact-by-users': { cat: 'Engagement', icon: '💬', priority: 0.6 },
  'interact-with-likers': { cat: 'Engagement', icon: '💬', priority: 0.6 },
  'comment-by-hashtag': { cat: 'Engagement', icon: '💬', priority: 0.6 },
  'comment-by-location': { cat: 'Engagement', icon: '💬', priority: 0.6 },
  'mention-users': { cat: 'Engagement', icon: '💬', priority: 0.6 },
  // Growth
  'follow-engagers': { cat: 'Growth', icon: '🎯', priority: 0.7 },
  'follow-target-users': { cat: 'Growth', icon: '🎯', priority: 0.7 },
  'keyword-follow': { cat: 'Growth', icon: '🔑', priority: 0.7 },
  'growth-suite': { cat: 'Growth', icon: '🚀', priority: 0.8 },
  'natural-flow': { cat: 'Growth', icon: '🌊', priority: 0.7 },
  'algorithm-builder': { cat: 'Growth', icon: '🧠', priority: 0.8 },
  'algorithm-trainer': { cat: 'Growth', icon: '🧠', priority: 0.8 },
  'persona-engine': { cat: 'Growth', icon: '🎭', priority: 0.7 },
  'thought-leader-cultivator': { cat: 'Growth', icon: '🧠', priority: 0.7 },
  'follow-account': { cat: 'Growth', icon: '➕', priority: 0.6 },
  'follow-list': { cat: 'Growth', icon: '📋', priority: 0.6 },
  // Scrapers
  'scrape-followers': { cat: 'Scrapers', icon: '👥', priority: 0.7 },
  'scrape-following': { cat: 'Scrapers', icon: '👥', priority: 0.7 },
  'scrape-likes': { cat: 'Scrapers', icon: '❤️', priority: 0.7 },
  'scrape-likers': { cat: 'Scrapers', icon: '❤️', priority: 0.7 },
  'scrape-profile': { cat: 'Scrapers', icon: '👤', priority: 0.7 },
  'scrape-profile-posts': { cat: 'Scrapers', icon: '👤', priority: 0.7 },
  'scrape-profile-with-replies': { cat: 'Scrapers', icon: '👤', priority: 0.7 },
  'scrape-hashtag': { cat: 'Scrapers', icon: '#️⃣', priority: 0.7 },
  'scrape-search': { cat: 'Scrapers', icon: '🔍', priority: 0.7 },
  'scrape-media': { cat: 'Scrapers', icon: '🖼️', priority: 0.7 },
  'scrape-list': { cat: 'Scrapers', icon: '📝', priority: 0.7 },
  'scrape-bookmarks': { cat: 'Scrapers', icon: '🔖', priority: 0.7 },
  'scrape-dms': { cat: 'Scrapers', icon: '✉️', priority: 0.7 },
  'scrape-explore': { cat: 'Scrapers', icon: '🔍', priority: 0.7 },
  'scrape-notifications': { cat: 'Scrapers', icon: '🔔', priority: 0.7 },
  'scrape-quote-retweets': { cat: 'Scrapers', icon: '🔁', priority: 0.7 },
  'scrape-replies': { cat: 'Scrapers', icon: '💬', priority: 0.7 },
  'scrape-spaces': { cat: 'Scrapers', icon: '🎙️', priority: 0.7 },
  'scrape-analytics': { cat: 'Scrapers', icon: '📊', priority: 0.7 },
  'scrape-cashtag-search': { cat: 'Scrapers', icon: '💲', priority: 0.7 },
  'link-scraper': { cat: 'Scrapers', icon: '🔗', priority: 0.7 },
  'viral-tweets-scraper': { cat: 'Scrapers', icon: '🔥', priority: 0.7 },
  'export-to-csv': { cat: 'Scrapers', icon: '📄', priority: 0.6 },
  // Content Tools
  'video-downloader': { cat: 'Content Tools', icon: '🎬', priority: 0.8 },
  'thread-unroller': { cat: 'Content Tools', icon: '🧵', priority: 0.7 },
  'bookmark-exporter': { cat: 'Content Tools', icon: '📚', priority: 0.7 },
  'bookmark-organizer': { cat: 'Content Tools', icon: '📂', priority: 0.7 },
  'bookmark-manager': { cat: 'Content Tools', icon: '📚', priority: 0.7 },
  'manage-bookmarks': { cat: 'Content Tools', icon: '📑', priority: 0.6 },
  'clear-all-bookmarks': { cat: 'Content Tools', icon: '🗑️', priority: 0.6 },
  'clear-all-reposts': { cat: 'Content Tools', icon: '🗑️', priority: 0.6 },
  'clear-all-retweets': { cat: 'Content Tools', icon: '🗑️', priority: 0.6 },
  'clear-all-likes': { cat: 'Content Tools', icon: '🗑️', priority: 0.6 },
  'unlike-all-posts': { cat: 'Content Tools', icon: '💔', priority: 0.6 },
  'unlike-all': { cat: 'Content Tools', icon: '💔', priority: 0.6 },
  'unlike-old': { cat: 'Content Tools', icon: '💔', priority: 0.6 },
  'bulk-delete-tweets': { cat: 'Content Tools', icon: '🗑️', priority: 0.7 },
  'content-repurposer': { cat: 'Content Tools', icon: '♻️', priority: 0.7 },
  'text-formatting': { cat: 'Content Tools', icon: '✏️', priority: 0.5 },
  'share-embed': { cat: 'Content Tools', icon: '🔗', priority: 0.5 },
  'video-captions': { cat: 'Content Tools', icon: '📝', priority: 0.6 },
  // Posting
  'post-thread': { cat: 'Posting', icon: '🧵', priority: 0.7 },
  'post-composer': { cat: 'Posting', icon: '✏️', priority: 0.7 },
  'post-advanced': { cat: 'Posting', icon: '✏️', priority: 0.7 },
  'schedule-posts': { cat: 'Posting', icon: '⏰', priority: 0.7 },
  'create-poll': { cat: 'Posting', icon: '📊', priority: 0.6 },
  'poll-creator': { cat: 'Posting', icon: '📊', priority: 0.6 },
  'thread-composer': { cat: 'Posting', icon: '🧵', priority: 0.7 },
  'content-calendar': { cat: 'Posting', icon: '📅', priority: 0.7 },
  'pin-tweet-manager': { cat: 'Posting', icon: '📌', priority: 0.6 },
  'publish-article': { cat: 'Posting', icon: '📰', priority: 0.5 },
  'article-publisher': { cat: 'Posting', icon: '📰', priority: 0.6 },
  'edit-post': { cat: 'Posting', icon: '✏️', priority: 0.6 },
  'tweet-ab-tester': { cat: 'Posting', icon: '🧪', priority: 0.7 },
  'evergeen-recycler': { cat: 'Posting', icon: '♻️', priority: 0.6 },
  // Messaging
  'send-direct-message': { cat: 'Messaging', icon: '📬', priority: 0.6 },
  'dm-manager': { cat: 'Messaging', icon: '✉️', priority: 0.7 },
  'dm-exporter': { cat: 'Messaging', icon: '📤', priority: 0.6 },
  'dm-calls': { cat: 'Messaging', icon: '📞', priority: 0.6 },
  'group-dm': { cat: 'Messaging', icon: '👥', priority: 0.6 },
  'encrypted-dm': { cat: 'Messaging', icon: '🔒', priority: 0.6 },
  // Analytics
  'engagement-analytics': { cat: 'Analytics', icon: '📈', priority: 0.7 },
  'hashtag-analytics': { cat: 'Analytics', icon: '#️⃣', priority: 0.7 },
  'best-time-to-post': { cat: 'Analytics', icon: '⏰', priority: 0.7 },
  'competitor-analysis': { cat: 'Analytics', icon: '🔍', priority: 0.7 },
  'account-health-monitor': { cat: 'Analytics', icon: '🏥', priority: 0.7 },
  'audience-demographics': { cat: 'Analytics', icon: '📊', priority: 0.7 },
  'audience-overlap': { cat: 'Analytics', icon: '🔗', priority: 0.7 },
  'sentiment-analyzer': { cat: 'Analytics', icon: '🧠', priority: 0.7 },
  'shadowban-checker': { cat: 'Analytics', icon: '👻', priority: 0.7 },
  'trending-topic-monitor': { cat: 'Analytics', icon: '📈', priority: 0.7 },
  'tweet-performance': { cat: 'Analytics', icon: '📊', priority: 0.7 },
  'tweet-schedule-optimizer': { cat: 'Analytics', icon: '⏰', priority: 0.7 },
  'viral-tweet-detector': { cat: 'Analytics', icon: '🔥', priority: 0.7 },
  'keyword-monitor': { cat: 'Analytics', icon: '🔑', priority: 0.7 },
  'notification-manager': { cat: 'Analytics', icon: '🔔', priority: 0.6 },
  'manage-notifications': { cat: 'Analytics', icon: '🔔', priority: 0.6 },
  'view-analytics': { cat: 'Analytics', icon: '📊', priority: 0.7 },
  'tweet-price-correlation': { cat: 'Analytics', icon: '💹', priority: 0.6 },
  'profile-stats': { cat: 'Analytics', icon: '📊', priority: 0.6 },
  'timeline-viewer': { cat: 'Analytics', icon: '📊', priority: 0.6 },
  // Safety & Privacy
  'block-bots': { cat: 'Safety & Privacy', icon: '🤖', priority: 0.7 },
  'mass-block': { cat: 'Safety & Privacy', icon: '🚫', priority: 0.7 },
  'mass-unblock': { cat: 'Safety & Privacy', icon: '🔓', priority: 0.6 },
  'mass-unmute': { cat: 'Safety & Privacy', icon: '🔊', priority: 0.6 },
  'mute-by-keywords': { cat: 'Safety & Privacy', icon: '🔕', priority: 0.6 },
  'manage-muted-words': { cat: 'Safety & Privacy', icon: '🔇', priority: 0.6 },
  'report-spam': { cat: 'Safety & Privacy', icon: '⚠️', priority: 0.6 },
  'settings-manager': { cat: 'Safety & Privacy', icon: '⚙️', priority: 0.6 },
  'manage-settings': { cat: 'Safety & Privacy', icon: '⚙️', priority: 0.6 },
  'block-by-keywords': { cat: 'Safety & Privacy', icon: '🚫', priority: 0.6 },
  'block-by-ratio': { cat: 'Safety & Privacy', icon: '🚫', priority: 0.6 },
  'blacklist': { cat: 'Safety & Privacy', icon: '🚫', priority: 0.6 },
  'whitelist': { cat: 'Safety & Privacy', icon: '✅', priority: 0.6 },
  'filter-manager': { cat: 'Safety & Privacy', icon: '🔍', priority: 0.6 },
  'verified-only': { cat: 'Safety & Privacy', icon: '✅', priority: 0.5 },
  'id-verification': { cat: 'Safety & Privacy', icon: '🪪', priority: 0.5 },
  // Account Management
  'backup-account': { cat: 'Account Management', icon: '💾', priority: 0.7 },
  'download-account-data': { cat: 'Account Management', icon: '📥', priority: 0.7 },
  'profile-manager': { cat: 'Account Management', icon: '👤', priority: 0.6 },
  'update-profile': { cat: 'Account Management', icon: '✏️', priority: 0.6 },
  'edit-profile': { cat: 'Account Management', icon: '✏️', priority: 0.6 },
  'multi-account': { cat: 'Account Management', icon: '👥', priority: 0.6 },
  'qr-code-sharing': { cat: 'Account Management', icon: '📱', priority: 0.5 },
  'delegate-access': { cat: 'Account Management', icon: '🔑', priority: 0.6 },
  'upload-contacts': { cat: 'Account Management', icon: '📇', priority: 0.5 },
  'update-banner': { cat: 'Account Management', icon: '🖼️', priority: 0.5 },
  'update-bio': { cat: 'Account Management', icon: '✏️', priority: 0.5 },
  'update-profile-picture': { cat: 'Account Management', icon: '🖼️', priority: 0.5 },
  'subscribe-premium': { cat: 'Account Management', icon: '⭐', priority: 0.5 },
  // Lists & Communities
  'list-manager': { cat: 'Lists & Communities', icon: '📝', priority: 0.6 },
  'advanced-lists': { cat: 'Lists & Communities', icon: '📝', priority: 0.6 },
  'manage-lists': { cat: 'Lists & Communities', icon: '📝', priority: 0.6 },
  'join-communities': { cat: 'Lists & Communities', icon: '🏘️', priority: 0.6 },
  'leave-all-communities': { cat: 'Lists & Communities', icon: '🚪', priority: 0.6 },
  'leave-community': { cat: 'Lists & Communities', icon: '🚪', priority: 0.6 },
  'create-community': { cat: 'Lists & Communities', icon: '🏘️', priority: 0.6 },
  'manage-community': { cat: 'Lists & Communities', icon: '🏘️', priority: 0.6 },
  // AI & Developer
  'grok-integration': { cat: 'AI & Developer', icon: '🧠', priority: 0.7 },
  // Spaces & Live
  'spaces-manager': { cat: 'Spaces & Live', icon: '🎙️', priority: 0.6 },
  'host-space': { cat: 'Spaces & Live', icon: '🎙️', priority: 0.6 },
  'join-space': { cat: 'Spaces & Live', icon: '🎙️', priority: 0.6 },
  // Premium
  'premium-manager': { cat: 'Premium', icon: '⭐', priority: 0.5 },
  'premium-features': { cat: 'Premium', icon: '⭐', priority: 0.5 },
  'premium-gifting': { cat: 'Premium', icon: '🎁', priority: 0.5 },
  'creator-subscriptions': { cat: 'Premium', icon: '💰', priority: 0.5 },
  // Business
  'business-tools': { cat: 'Business', icon: '💼', priority: 0.6 },
  'business-analytics': { cat: 'Business', icon: '💼', priority: 0.6 },
  'creator-studio': { cat: 'Business', icon: '🎨', priority: 0.6 },
  'ads-manager': { cat: 'Business', icon: '📢', priority: 0.6 },
  'media-studio': { cat: 'Business', icon: '🖼️', priority: 0.6 },
  // Discovery
  'discovery-explore': { cat: 'Discovery', icon: '🔍', priority: 0.5 },
  'topic-manager': { cat: 'Discovery', icon: '🏷️', priority: 0.5 },
  'save-search': { cat: 'Discovery', icon: '🔍', priority: 0.5 },
  'x-pro': { cat: 'Discovery', icon: '⚡', priority: 0.5 },
  // Automation
  'control-panel': { cat: 'Automation', icon: '🎛️', priority: 0.7 },
  'actions': { cat: 'Automation', icon: '⚡', priority: 0.7 },
  'core': { cat: 'Automation', icon: '⚙️', priority: 0.8 },
  'session-logger': { cat: 'Automation', icon: '📋', priority: 0.6 },
  'quota-supervisor': { cat: 'Automation', icon: '⚠️', priority: 0.6 },
  'protect-active-users': { cat: 'Automation', icon: '🛡️', priority: 0.6 },
  'rate-limiter': { cat: 'Automation', icon: '⏱️', priority: 0.6 },
  'customer-service': { cat: 'Automation', icon: '🤝', priority: 0.6 },
  'rss-monitor': { cat: 'Automation', icon: '📡', priority: 0.6 },
};

// ─── Script Sources ────────────────────────────────────────────────
const SCRIPT_DIRS = [
  { dir: 'src', label: 'Core Library', context: 'browser' },
  { dir: 'src/automation', label: 'Automation Suite', context: 'browser', requiresCore: true },
  { dir: 'scripts', label: 'Standalone Scripts', context: 'browser' },
  { dir: 'scripts/twitter', label: 'Twitter Scripts', context: 'browser' },
];

// Files to skip (not user-facing scripts)
const SKIP_FILES = new Set([
  'index.js', 'build-docs-pages.js', 'build-all-docs.js', 'build-script-pages.js',
  'generate-license.js', 'generate-missing-docs.js', 'test-x402-payment.js',
  'verify-x402.js', 'script-template.js',
  // Command Center build inputs: the shell is a source template, not a
  // runnable script, and build-toolkit.mjs is a Node build tool.
  '_command-center-shell.js', 'build-toolkit.mjs',
  // Node build/utility scripts (not browser console scripts).
  'build-sitemap.js', 'fix-doc-links.js', 'gen3.js', 'version.js',
  'generate-seo-articles.js', 'generate-seo-articles-2.js', 'submit-to-glama.js',
]);

const SKIP_DIRS_IN_SRC = new Set([
  'cli', 'mcp', 'scrapers', 'client', 'agents', 'analytics', 'streaming',
  'plugins', 'ai', 'a2a', 'workflows', 'utils', 'automation',
]);

// ─── Helpers ────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(filename) {
  return filename
    .replace(/\.js$/, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')  // camelCase → kebab-case
    .toLowerCase()
    .replace(/[^\w-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function slugToTitle(slug) {
  const acronyms = new Set(['dm', 'dms', 'csv', 'qr', 'ab', 'rss', 'ai', 'id', 'x']);
  return slug
    .split('-')
    .map(w => acronyms.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getCategoryInfo(slug) {
  if (CATEGORIES[slug]) return CATEGORIES[slug];
  // Try partial matching
  for (const [key, val] of Object.entries(CATEGORIES)) {
    if (slug.includes(key) || key.includes(slug)) return val;
  }
  return { cat: 'Other Tools', icon: '⚡', priority: 0.5 };
}

// ─── JS File Parser ─────────────────────────────────────────────────

function parseScriptFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const result = {
    name: '',
    description: '',
    author: '',
    version: '',
    date: '',
    usage: [],
    warnings: [],
    controls: [],
    configBlock: '',
    configComments: [],
    fullCode: code,
    lineCount: code.split('\n').length,
  };

  // Extract JSDoc-style header
  const jsdocMatch = code.match(/\/\*\*[\s\S]*?\*\//);
  const headerComment = jsdocMatch ? jsdocMatch[0] : '';

  // Also try line comments at top
  const lineComments = [];
  for (const line of code.split('\n')) {
    if (line.trim().startsWith('//')) lineComments.push(line.trim().replace(/^\/\/\s?/, ''));
    else if (line.trim() === '') continue;
    else break;
  }

  // Extract @tags from JSDoc
  const tagPattern = /@(\w+)\s+(.+)/g;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(headerComment)) !== null) {
    const [, tag, value] = tagMatch;
    if (tag === 'name') result.fileName = value.trim();
    if (tag === 'description') result.description = value.trim();
    if (tag === 'author') result.author = value.trim();
    if (tag === 'version') result.version = value.trim();
    if (tag === 'date') result.date = value.trim();
  }

  // Extract title from emoji headers like "🚫 Unfollow Everyone — Production Grade"
  const titleMatch = headerComment.match(/\*\s+[^\n]*?([A-Z][\w\s/&—–-]+(?:—[^*\n]+)?)/);
  if (titleMatch) {
    result.name = titleMatch[1].replace(/\s*—[\s\S]*$/, '').replace(/Production Grade/i, '').replace(/\s+/g, ' ').trim();
  }

  // Extract description from header comment if not found via @tag
  if (!result.description) {
    // Try first meaningful line comment. Skip the copyright/license banner that
    // `add-license-notices` prepends to every script — it is not a description.
    const descLine = lineComments.find(l =>
      l.length > 15 && !l.startsWith('==') && !l.startsWith('http') &&
      !l.startsWith('REQUIRES') && !l.startsWith('HOW TO') &&
      !l.match(/^\d+\./) && !l.startsWith('Last Updated') &&
      !/^(copyright|spdx|licen[sc]e|all rights reserved)\b/i.test(l) &&
      !/\ball rights reserved\b|\blicense\b/i.test(l)
    );
    if (descLine) result.description = descLine;
  }

  // Extract USAGE section
  const usageMatch = headerComment.match(/USAGE[^:]*:\s*\n([\s\S]*?)(?:\n\s*\*\s*(?:CONTROLS|⚠️|===|\*\/))/i) ||
    code.match(/\/\/\s*HOW TO USE:\s*\n([\s\S]*?)(?:\n\s*(?:\/\/\s*$|\(\(\)|const ))/im);
  if (usageMatch) {
    result.usage = usageMatch[1]
      .split('\n')
      .map(l => l.replace(/^\s*\*\s?/, '').replace(/^\/\/\s?/, '').trim())
      .filter(l => l && !l.startsWith('==='));
  }

  // Extract CONTROLS section
  const controlsMatch = headerComment.match(/CONTROLS[^:]*:\s*\n([\s\S]*?)(?:\n\s*\*\s*(?:===|\*\/))/i);
  if (controlsMatch) {
    result.controls = controlsMatch[1]
      .split('\n')
      .map(l => l.replace(/^\s*\*\s?/, '').trim())
      .filter(l => l);
  }

  // Extract warnings
  const warningMatch = headerComment.match(/⚠️[^\n]*/g);
  if (warningMatch) {
    result.warnings = warningMatch.map(w => w.replace(/^\s*\*\s?/, '').trim());
  }

  // Extract CONFIG/OPTIONS block
  const configMatch = code.match(/(?:const|let)\s+(?:CONFIG|OPTIONS)\s*=\s*\{([\s\S]*?)^\s*\};/m);
  if (configMatch) {
    result.configBlock = configMatch[0];
    // Parse inline comments as config docs
    const configLines = configMatch[1].split('\n');
    for (const line of configLines) {
      const commentMatch = line.match(/(\w+)\s*:\s*([^,]+),?\s*\/\/\s*(.+)/);
      if (commentMatch) {
        result.configComments.push({
          key: commentMatch[1].trim(),
          default: commentMatch[2].trim(),
          description: commentMatch[3].trim(),
        });
      }
    }
  }

  return result;
}

// ─── HTML Generator ─────────────────────────────────────────────────

function generateScriptPage({ slug, title, description, category, icon, sourceDir, parsed, requiresCore, relatedPages }) {
  const seoTitle = `${title} — Free X/Twitter Script | XActions`;
  const seoDesc = (description || `${title} — Free browser console script for X/Twitter automation. No API keys needed.`).slice(0, 160);
  const canonicalUrl = `${SITE_URL}/scripts/${slug}`;
  const keywords = ['xactions', 'twitter automation', 'x automation', 'browser script', 'devtools console', 'free', 'open source',
    ...slug.split('-').filter(w => w.length > 2), category.toLowerCase()].join(', ');

  const usageHtml = parsed.usage.length > 0
    ? `<ol class="usage-steps">${parsed.usage
        .filter(l => l.match(/^\d+\./))
        .map(l => `<li>${escapeHtml(l.replace(/^\d+\.\s*/, ''))}</li>`)
        .join('\n')}</ol>`
    : `<ol class="usage-steps">
        <li>Navigate to <a href="https://x.com" rel="noopener">x.com</a> and log in</li>
        <li>Open DevTools Console (F12 or Cmd+Option+I)</li>
        ${requiresCore ? '<li>Paste <code>src/automation/core.js</code> first</li>' : ''}
        <li>Paste the script below and press Enter</li>
      </ol>`;

  const warningsHtml = parsed.warnings.length > 0
    ? `<div class="warning-box">${parsed.warnings.map(w => `<p>${escapeHtml(w)}</p>`).join('')}</div>`
    : '';

  const controlsHtml = parsed.controls.length > 0
    ? `<div class="controls-box">
        <h3>Runtime Controls</h3>
        <pre><code>${parsed.controls.map(c => escapeHtml(c)).join('\n')}</code></pre>
      </div>`
    : '';

  const configHtml = parsed.configComments.length > 0
    ? `<section class="config-section">
        <h2>Configuration Options</h2>
        <table>
          <thead><tr><th>Option</th><th>Default</th><th>Description</th></tr></thead>
          <tbody>
            ${parsed.configComments.map(c => `<tr><td><code>${escapeHtml(c.key)}</code></td><td><code>${escapeHtml(c.default)}</code></td><td>${escapeHtml(c.description)}</td></tr>`).join('\n')}
          </tbody>
        </table>
      </section>`
    : '';

  const configBlockHtml = parsed.configBlock
    ? `<section class="config-code">
        <h2>Default Configuration</h2>
        <div class="code-block">
          <button class="copy-btn" onclick="navigator.clipboard.writeText(this.nextElementSibling.querySelector('code').textContent).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',2000)})">Copy</button>
          <pre><code>${escapeHtml(parsed.configBlock)}</code></pre>
        </div>
      </section>`
    : '';

  const relatedHtml = relatedPages
    .filter(p => p.slug !== slug)
    .slice(0, 10)
    .map(p => `<a href="/scripts/${p.slug}">${p.icon} ${escapeHtml(p.title)}</a>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(seoTitle)}</title>
  <meta name="description" content="${escapeHtml(seoDesc)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <meta name="author" content="nich (@nichxbt)">
  <meta name="robots" content="index, follow">

  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)} — XActions">
  <meta property="og:description" content="${escapeHtml(seoDesc)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="XActions">
  <meta property="og:image" content="${SITE_URL}/og-image.png">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@nichxbt">
  <meta name="twitter:title" content="${escapeHtml(title)} — XActions">
  <meta name="twitter:description" content="${escapeHtml(seoDesc)}">

  <link rel="canonical" href="${canonicalUrl}">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": ${JSON.stringify(seoTitle)},
    "description": ${JSON.stringify(seoDesc)},
    "url": "${canonicalUrl}",
    "author": { "@type": "Person", "name": "nich", "url": "https://x.com/nichxbt" },
    "publisher": { "@type": "Organization", "name": "XActions", "url": "${SITE_URL}" },
    "datePublished": "2026-03-30",
    "dateModified": "2026-03-30",
    "articleSection": ${JSON.stringify(category)},
    "keywords": ${JSON.stringify(keywords)}
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "${SITE_URL}" },
      { "@type": "ListItem", "position": 2, "name": "Scripts", "item": "${SITE_URL}/scripts" },
      { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(category)}, "item": "${SITE_URL}/scripts#${slugify(category)}" },
      { "@type": "ListItem", "position": 4, "name": ${JSON.stringify(title)}, "item": "${canonicalUrl}" }
    ]
  }
  </script>

  <link rel="stylesheet" href="/css/common.css">
  <style>
    .article { padding: 24px 20px; }
    .article h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 8px; line-height: 1.2; }
    .article h2 { font-size: 1.375rem; font-weight: 700; margin: 32px 0 12px; padding-top: 16px; border-top: 1px solid var(--border); }
    .article h3 { font-size: 1.125rem; font-weight: 600; margin: 24px 0 8px; color: var(--accent); }
    .article p { color: var(--text-secondary); font-size: 0.9375rem; margin-bottom: 16px; }
    .article a { color: var(--accent); text-decoration: none; }
    .article a:hover { text-decoration: underline; }
    .article strong { color: var(--text-primary); }
    .article code { background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; font-family: 'Monaco','Menlo','Consolas', monospace; font-size: 0.875rem; color: var(--accent); }
    .article pre { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 16px; overflow-x: auto; margin: 16px 0; }
    .article pre code { background: none; padding: 0; color: var(--text-primary); font-size: 0.8125rem; display: block; }
    .article table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.875rem; }
    .article th { background: var(--bg-secondary); padding: 10px 12px; text-align: left; border: 1px solid var(--border); font-weight: 600; }
    .article td { padding: 10px 12px; border: 1px solid var(--border); color: var(--text-secondary); }
    .cat-badge { display: inline-block; background: var(--accent-light); color: var(--accent); padding: 4px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; margin-bottom: 16px; }
    .meta-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; font-size: 0.8125rem; color: var(--text-secondary); }
    .meta-row span { display: flex; align-items: center; gap: 4px; }
    .usage-steps { margin-left: 24px; margin-bottom: 16px; }
    .usage-steps li { color: var(--text-secondary); font-size: 0.9375rem; margin-bottom: 8px; padding-left: 4px; }
    .warning-box { background: rgba(244, 33, 46, 0.1); border: 1px solid var(--error); border-radius: 12px; padding: 16px; margin: 16px 0; }
    .warning-box p { color: var(--error); margin: 0; font-size: 0.875rem; }
    .controls-box { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin: 16px 0; }
    .controls-box h3 { margin: 0 0 8px; font-size: 1rem; }
    .code-block { position: relative; }
    .copy-btn { position: absolute; top: 8px; right: 8px; background: var(--bg-tertiary); color: var(--text-secondary); border: 1px solid var(--border); border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 0.75rem; z-index: 10; transition: all .2s; }
    .copy-btn:hover { background: var(--accent); color: #fff; }
    .full-code { margin-top: 32px; }
    .full-code pre { max-height: 600px; overflow-y: auto; }
    .cta-box { background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary)); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center; }
    .cta-box h3 { font-size: 1.25rem; margin-bottom: 8px; color: var(--text-primary); }
    .cta-box p { color: var(--text-secondary); margin-bottom: 16px; }
    .cta-box a { display: inline-block; padding: 12px 24px; background: var(--accent); color: #fff; border-radius: 9999px; text-decoration: none; font-weight: 700; transition: background .2s; }
    .cta-box a:hover { background: var(--accent-hover); }
    .sidebar-right { width: 350px; padding: 16px 24px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
    .sidebar-card { background: var(--bg-secondary); border-radius: 16px; padding: 16px; margin-bottom: 16px; }
    .sidebar-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 12px; }
    .sidebar-card a { display: block; color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; padding: 6px 0; border-bottom: 1px solid var(--border); transition: color .2s; }
    .sidebar-card a:last-child { border-bottom: none; }
    .sidebar-card a:hover { color: var(--accent); }
    .breadcrumb { font-size: 0.8125rem; color: var(--text-secondary); margin-top: 4px; }
    .breadcrumb a { color: var(--accent); text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .source-badge { display: inline-block; background: var(--bg-tertiary); color: var(--text-secondary); padding: 2px 8px; border-radius: 6px; font-size: 0.6875rem; margin-left: 8px; }
    @media (max-width: 1024px) { .sidebar-right { display: none; } }
    @media (max-width: 768px) {
      .article pre { font-size: 0.75rem; }
      .meta-row { flex-direction: column; gap: 4px; }
    }
  </style>
</head>
<body>
  <a href="#main-content" class="skip-nav">Skip to main content</a>
  <div class="layout">
    <aside class="sidebar-left" aria-label="Main navigation"></aside>
    <script src="/js/sidebar.js"></script>

    <main class="main-content" id="main-content">
      <header class="main-header">
        <h1>${icon} ${escapeHtml(title)}</h1>
        <div class="breadcrumb">
          <a href="/">Home</a> › <a href="/scripts">Scripts</a> › <a href="/scripts#${slugify(category)}">${escapeHtml(category)}</a> › ${escapeHtml(title)}
        </div>
      </header>

      <article class="article">
        <span class="cat-badge">${escapeHtml(category)}</span>
        <span class="source-badge">${escapeHtml(sourceDir)}</span>

        <div class="meta-row">
          ${parsed.version ? `<span>v${escapeHtml(parsed.version)}</span>` : ''}
          ${parsed.date ? `<span>Updated: ${escapeHtml(parsed.date)}</span>` : ''}
          <span>${parsed.lineCount} lines</span>
          <span>by <a href="https://x.com/nichxbt" rel="noopener">@nichxbt</a></span>
        </div>

        <p>${escapeHtml(description || `${title} — a free, open-source browser console script for X/Twitter automation. No API keys or fees required.`)}</p>

        ${warningsHtml}

        <h2>How to Use</h2>
        ${usageHtml}
        ${requiresCore ? '<p><strong>Note:</strong> This script requires pasting <code>src/automation/core.js</code> first for shared utilities.</p>' : ''}

        ${controlsHtml}
        ${configHtml}
        ${configBlockHtml}

        <section class="full-code">
          <h2>Full Script</h2>
          <p>Copy and paste this entire script into your browser DevTools console on <a href="https://x.com" rel="noopener">x.com</a>.</p>
          <div class="code-block">
            <button class="copy-btn" onclick="navigator.clipboard.writeText(this.nextElementSibling.querySelector('code').textContent).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy Script',2000)})">Copy Script</button>
            <pre><code>${escapeHtml(parsed.fullCode)}</code></pre>
          </div>
        </section>

        <div class="cta-box">
          <h3>⚡ More XActions Scripts</h3>
          <p>Browse 300+ free browser scripts for X/Twitter automation. No API keys, no fees.</p>
          <a href="/scripts">Browse All Scripts</a>
        </div>
      </article>
    </main>

    <aside class="sidebar-right">
      <div class="sidebar-card">
        <h3>${icon} ${escapeHtml(category)}</h3>
        ${relatedHtml || '<a href="/scripts">Browse all scripts</a>'}
      </div>
      <div class="sidebar-card">
        <h3>🔗 Quick Links</h3>
        <a href="/scripts">All Scripts</a>
        <a href="/features">Features</a>
        <a href="/docs">Documentation</a>
        <a href="/tutorials">Tutorials</a>
        <a href="/mcp">MCP Server</a>
        <a href="https://github.com/nirholas/XActions" rel="noopener">GitHub</a>
      </div>
    </aside>
  </div>
</body>
</html>`;
}

// ─── Index Page Generator ───────────────────────────────────────────

function generateIndexPage(allPages) {
  const byCategory = {};
  for (const page of allPages) {
    if (!byCategory[page.category]) byCategory[page.category] = [];
    byCategory[page.category].push(page);
  }

  // Sort categories
  const catOrder = [
    'Command Center',
    'Unfollow Tools', 'Follower Monitoring', 'Engagement', 'Growth',
    'Scrapers', 'Content Tools', 'Posting', 'Messaging', 'Analytics',
    'Safety & Privacy', 'Account Management', 'Lists & Communities',
    'Automation', 'AI & Developer', 'Spaces & Live', 'Premium',
    'Business', 'Discovery', 'Other Tools'
  ];

  const sortedCats = catOrder.filter(c => byCategory[c]);
  // Add any missing categories
  for (const c of Object.keys(byCategory)) {
    if (!sortedCats.includes(c)) sortedCats.push(c);
  }

  const categoryCardsHtml = sortedCats.map(cat => {
    const pages = byCategory[cat].sort((a, b) => a.title.localeCompare(b.title));
    const catSlug = slugify(cat);
    return `
        <section class="cat-section" id="${catSlug}">
          <h2>${pages[0].icon} ${escapeHtml(cat)} <span class="count">(${pages.length})</span></h2>
          <div class="script-grid">
            ${pages.map(p => `
            <a href="/scripts/${p.slug}" class="script-card" data-cat="${catSlug}" data-name="${escapeHtml(p.title.toLowerCase())}">
              <span class="script-icon">${p.icon}</span>
              <div class="script-info">
                <strong>${escapeHtml(p.title)}</strong>
                <span>${escapeHtml((p.description || '').slice(0, 80))}</span>
              </div>
            </a>`).join('')}
          </div>
        </section>`;
  }).join('\n');

  const catNavHtml = sortedCats.map(cat => {
    const pages = byCategory[cat];
    return `<a href="#${slugify(cat)}">${pages[0].icon} ${escapeHtml(cat)} (${pages.length})</a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>All ${allPages.length} Scripts — Free X/Twitter Automation | XActions</title>
  <meta name="description" content="Browse ${allPages.length}+ free browser console scripts for X/Twitter automation. Unfollow, scrape, engage, grow, and more. No API keys needed.">
  <meta name="keywords" content="xactions, twitter automation, x automation, browser scripts, devtools console, free, open source, unfollow, scraper, engagement">
  <meta name="author" content="nich (@nichxbt)">
  <meta name="robots" content="index, follow">

  <meta property="og:type" content="website">
  <meta property="og:title" content="All ${allPages.length} Scripts — XActions">
  <meta property="og:description" content="${allPages.length}+ free browser scripts for X/Twitter automation.">
  <meta property="og:url" content="${SITE_URL}/scripts">
  <meta property="og:site_name" content="XActions">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@nichxbt">
  <meta name="twitter:title" content="All ${allPages.length} Scripts — XActions">

  <link rel="canonical" href="${SITE_URL}/scripts">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "XActions Scripts — ${allPages.length}+ Free X/Twitter Automation Scripts",
    "description": "Complete collection of free browser console scripts for X/Twitter automation.",
    "url": "${SITE_URL}/scripts",
    "author": { "@type": "Person", "name": "nich", "url": "https://x.com/nichxbt" },
    "publisher": { "@type": "Organization", "name": "XActions", "url": "${SITE_URL}" }
  }
  </script>

  <link rel="stylesheet" href="/css/common.css">
  <style>
    .hero { padding: 32px 20px; border-bottom: 1px solid var(--border); }
    .hero h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 8px; }
    .hero p { color: var(--text-secondary); font-size: 0.9375rem; }
    .search-box { margin: 16px 20px; position: sticky; top: 60px; z-index: 50; background: var(--bg-primary); padding: 8px 0; }
    .search-box input { width: 100%; padding: 12px 16px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 9999px; color: var(--text-primary); font-size: 0.9375rem; outline: none; transition: border-color .2s; }
    .search-box input:focus { border-color: var(--accent); }
    .search-box input::placeholder { color: var(--text-secondary); }
    .cat-section { padding: 0 20px; margin-bottom: 32px; }
    .cat-section h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
    .cat-section h2 .count { color: var(--text-secondary); font-weight: 400; font-size: 0.875rem; }
    .script-grid { display: grid; gap: 8px; }
    .script-card { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; text-decoration: none; color: var(--text-primary); transition: background .2s; }
    .script-card:hover { background: var(--bg-secondary); }
    .script-icon { font-size: 1.5rem; width: 36px; text-align: center; flex-shrink: 0; }
    .script-info { display: flex; flex-direction: column; min-width: 0; }
    .script-info strong { font-size: 0.9375rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .script-info span { font-size: 0.8125rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .stats-bar { display: flex; gap: 24px; padding: 16px 20px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-num { font-size: 1.5rem; font-weight: 800; color: var(--accent); display: block; }
    .stat-label { font-size: 0.75rem; color: var(--text-secondary); }
    .sidebar-right { width: 350px; padding: 16px 24px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
    .sidebar-card { background: var(--bg-secondary); border-radius: 16px; padding: 16px; margin-bottom: 16px; }
    .sidebar-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 12px; }
    .sidebar-card a { display: block; color: var(--text-secondary); text-decoration: none; font-size: 0.8125rem; padding: 4px 0; border-bottom: 1px solid var(--border); transition: color .2s; }
    .sidebar-card a:last-child { border-bottom: none; }
    .sidebar-card a:hover { color: var(--accent); }
    .no-results { display: none; padding: 48px 20px; text-align: center; color: var(--text-secondary); }
    .no-results.visible { display: block; }
    @media (max-width: 1024px) { .sidebar-right { display: none; } }
    @media (max-width: 768px) {
      .stats-bar { gap: 16px; }
      .stat-num { font-size: 1.25rem; }
    }
  </style>
</head>
<body>
  <a href="#main-content" class="skip-nav">Skip to main content</a>
  <div class="layout">
    <aside class="sidebar-left" aria-label="Main navigation"></aside>
    <script src="/js/sidebar.js"></script>

    <main class="main-content" id="main-content">
      <header class="main-header">
        <h1>⚡ All Scripts</h1>
      </header>

      <div class="hero">
        <h1>⚡ ${allPages.length} Free X/Twitter Scripts</h1>
        <p>Browser console scripts for X/Twitter automation. No API keys, no fees, no signup. Just paste and run.</p>
      </div>

      <div class="stats-bar">
        <div class="stat"><span class="stat-num">${allPages.length}</span><span class="stat-label">Total Scripts</span></div>
        <div class="stat"><span class="stat-num">${sortedCats.length}</span><span class="stat-label">Categories</span></div>
        <div class="stat"><span class="stat-num">100%</span><span class="stat-label">Free</span></div>
        <div class="stat"><span class="stat-num">0</span><span class="stat-label">API Keys Needed</span></div>
      </div>

      <div class="search-box">
        <input type="text" id="scriptSearch" placeholder="Search ${allPages.length} scripts..." autocomplete="off">
      </div>

      <div id="scriptResults">
        ${categoryCardsHtml}
      </div>
      <div class="no-results" id="noResults">
        <h2>No scripts found</h2>
        <p>Try a different search term</p>
      </div>
    </main>

    <aside class="sidebar-right">
      <div class="sidebar-card">
        <h3>📂 Categories</h3>
        ${catNavHtml}
      </div>
      <div class="sidebar-card">
        <h3>🔗 Quick Links</h3>
        <a href="/features">Features Overview</a>
        <a href="/docs">Documentation</a>
        <a href="/tutorials">Tutorials</a>
        <a href="/mcp">MCP Server</a>
        <a href="https://github.com/nirholas/XActions" rel="noopener">GitHub</a>
      </div>
    </aside>
  </div>

  <script>
    const search = document.getElementById('scriptSearch');
    const results = document.getElementById('scriptResults');
    const noResults = document.getElementById('noResults');
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase().trim();
      const cards = results.querySelectorAll('.script-card');
      const sections = results.querySelectorAll('.cat-section');
      let visible = 0;
      cards.forEach(card => {
        const match = !q || card.dataset.name.includes(q) || card.dataset.cat.includes(q);
        card.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      sections.forEach(section => {
        const hasVisible = [...section.querySelectorAll('.script-card')].some(c => c.style.display !== 'none');
        section.style.display = hasVisible ? '' : 'none';
      });
      noResults.classList.toggle('visible', visible === 0);
    });
  </script>
</body>
</html>`;
}

// ─── Main Build ─────────────────────────────────────────────────────

function build() {
  console.log('⚡ Building script pages...\n');

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const allPages = [];
  const seen = new Set(); // Deduplicate by slug

  for (const source of SCRIPT_DIRS) {
    const dir = path.join(ROOT, source.dir);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => {
      if (!f.endsWith('.js')) return false;
      if (SKIP_FILES.has(f)) return false;
      // For src/, skip subdirectories' files
      if (source.dir === 'src') {
        const stat = fs.statSync(path.join(dir, f));
        if (!stat.isFile()) return false;
      }
      return true;
    });

    console.log(`📂 ${source.label} (${source.dir}/) — ${files.length} files`);

    for (const file of files) {
      const slug = slugify(file);
      if (seen.has(slug)) continue; // Skip duplicates (prefer first source = src/)
      seen.add(slug);

      const filePath = path.join(dir, file);
      const parsed = parseScriptFile(filePath);
      const catInfo = getCategoryInfo(slug);

      const title = parsed.name || slugToTitle(slug);

      allPages.push({
        slug,
        title,
        description: parsed.description,
        category: catInfo.cat,
        icon: catInfo.icon,
        priority: catInfo.priority,
        sourceDir: source.dir,
        requiresCore: source.requiresCore || false,
        parsed,
      });
    }
  }

  // Sort within categories
  allPages.sort((a, b) => a.title.localeCompare(b.title));

  // Group by category for related links
  const byCategory = {};
  for (const page of allPages) {
    if (!byCategory[page.category]) byCategory[page.category] = [];
    byCategory[page.category].push(page);
  }

  // Generate individual pages
  let count = 0;
  for (const page of allPages) {
    const html = generateScriptPage({
      ...page,
      relatedPages: byCategory[page.category] || [],
    });
    const outFile = path.join(OUT_DIR, `${page.slug}.html`);
    fs.writeFileSync(outFile, html);
    count++;
  }

  // Generate index page
  const indexHtml = generateIndexPage(allPages);
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexHtml);
  count++;

  // Generate sitemap entries
  const sitemapXml = allPages.map(p => `  <url>
    <loc>${SITE_URL}/scripts/${p.slug}</loc>
    <lastmod>2026-03-30</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');
  fs.writeFileSync(path.join(OUT_DIR, '_sitemap-entries.xml'), sitemapXml);

  // Generate manifest
  const manifest = allPages.map(p => ({
    slug: p.slug, title: p.title, description: p.description,
    category: p.category, icon: p.icon, sourceDir: p.sourceDir,
  }));
  fs.writeFileSync(path.join(OUT_DIR, '_manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\n✅ Generated ${count} pages (${allPages.length} scripts + 1 index)`);
  console.log(`📋 Sitemap → dashboard/scripts/_sitemap-entries.xml`);
  console.log(`📋 Manifest → dashboard/scripts/_manifest.json`);

  // Category breakdown
  console.log('\n📊 Categories:');
  for (const [cat, pages] of Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${pages[0].icon} ${cat}: ${pages.length}`);
  }
}

build();
