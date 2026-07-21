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
  { id: 'scrape', label: 'Scrape & Export', emoji: '📥' },
  { id: 'analyze', label: 'Analytics', emoji: '📊' },
  { id: 'grow', label: 'Grow', emoji: '🌱' },
  { id: 'engage', label: 'Engage', emoji: '💬' },
  { id: 'cleanup', label: 'Clean Up', emoji: '🧹' },
  { id: 'moderate', label: 'Moderate', emoji: '🛡️' },
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
  communities: { label: 'Your Communities', url: 'https://x.com/i/communities', match: ['communities'] }
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
  'rate-limiter': { title: 'Rate Limiter', emoji: '⏱️', category: 'utility', danger: 'safe', where: W.any, desc: 'Tune the pacing/quota helper shared by the action tools.' }
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
shell = shell.replace('/* __XA_INJECT_DATA__ */', dataBlock).replace(/__XA_VERSION__/g, VERSION);

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
